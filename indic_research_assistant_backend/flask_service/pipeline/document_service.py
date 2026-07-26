
import os
import zipfile
import tempfile

from utils.config import sarvam_client
from pipeline.ingestion import ingest_document

MAX_PAGES = 10
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".zip"}


class DocumentValidationError(Exception):
    """Raised for any bad input — caught in app.py and returned as a 400."""
    pass


def _validate_upload(file_storage, email, title):
    if not email:
        raise DocumentValidationError("email is required")
    if not file_storage or not file_storage.filename:
        raise DocumentValidationError("file is required")

    ext = os.path.splitext(file_storage.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise DocumentValidationError(
            f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}"
        )

    if not title:
        title = os.path.splitext(file_storage.filename)[0]

    return ext, title


def _check_page_count(local_path: str, ext: str):
    """Fail fast locally instead of burning a Sarvam job on an oversized PDF."""
    if ext != ".pdf":
        return
    try:
        from pypdf import PdfReader
    except ImportError:
        raise RuntimeError("pypdf is required: pip install pypdf")

    num_pages = len(PdfReader(local_path).pages)
    if num_pages > MAX_PAGES:
        raise DocumentValidationError(
            f"Document has {num_pages} pages; MVP supports a max of {MAX_PAGES} pages. "
            "Please split it and upload separately."
        )


def _extract_text_from_output(zip_path: str) -> str:
    """Sarvam returns a ZIP with one .md file per page (+ a JSON with page data).
    Concatenate markdown files in page order to get the full doc text."""
    text_parts = []
    with zipfile.ZipFile(zip_path) as zf:
        md_files = sorted(n for n in zf.namelist() if n.endswith(".md"))
        for name in md_files:
            with zf.open(name) as f:
                text_parts.append(f.read().decode("utf-8"))
    return "\n\n".join(text_parts)


def process_and_ingest(file_storage, email: str, title: str = None) -> dict:
    """
    Entry point for app.py's /ingest route.
    Owns: input validation, page-count check, Sarvam OCR job, text extraction.
    Hands off cleanly to ingest_document() for chunk + embed + upsert only.
    """
    ext, title = _validate_upload(file_storage, email, title)

    with tempfile.TemporaryDirectory() as tmp_dir:
        local_path = os.path.join(tmp_dir, file_storage.filename)
        file_storage.save(local_path)

        _check_page_count(local_path, ext)

        job = sarvam_client.document_intelligence.create_job(
            language="en-IN",
            output_format="md",
        )
        job.upload_file(local_path)
        job.start()
        status = job.wait_until_complete()

        if status.job_state not in ("Completed", "PartiallyCompleted"):
            raise RuntimeError(f"Document Intelligence job failed: {status.job_state}")

        output_zip_path = os.path.join(tmp_dir, "output.zip")
        job.download_output(output_zip_path)

        extracted_text = _extract_text_from_output(output_zip_path)

    if not extracted_text.strip():
        raise RuntimeError("No text could be extracted from the document.")

    # ingest_document() is pure: chunk -> embed -> upsert. No file/OCR logic in it.
    return ingest_document(title=title, content=extracted_text, email=email)