from utils.pinecone_client import index
from utils.embeder import generate_embedding, chunk_text
from utils.schema import DocChunk, new_doc_id


def build_text(title, content):
    return f"Title: {title}\nContent: {content}"


def upsert_post(chunk: DocChunk):
    text_for_embedding = build_text(chunk.title, chunk.text)
    embedding = generate_embedding(text_for_embedding, input_type="passage")
    record = chunk.to_record()

    index.upsert(vectors=[{
        "id": record["_id"],
        "values": embedding,
        "metadata": record,
    }])


def ingest_document(title: str, content: str, email: str) -> dict:
    """Entry point for app.py's /ingest route."""
    doc_id = new_doc_id()
    pieces = chunk_text(content)

    for i, piece in enumerate(pieces):
        chunk = DocChunk(
            doc_id=doc_id,
            chunk_index=i,
            text=piece,
            title=title,
            email=email,
        )
        upsert_post(chunk)

    return {"doc_id": doc_id, "title": title, "num_chunks": len(pieces)}