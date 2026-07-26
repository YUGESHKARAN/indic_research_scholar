
from dataclasses import dataclass, field
# from typing import Optional
import uuid
from datetime import datetime, timezone


@dataclass
class DocChunk:
    doc_id: str
    chunk_index: int
    text: str
    title: str
    email: str
    source_language: str = "en"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_record(self):
        return {
            "_id": f"{self.doc_id}_{self.chunk_index}",
            "chunk_index": self.chunk_index,
            "email":self.email,
            "text": self.text,
            "title": self.title,
            "doc_id": self.doc_id,
            "source_language": self.source_language,
            "created_at": self.created_at,
        }


def new_doc_id() -> str:
    return str(uuid.uuid4())


@dataclass
class QueryRequest:
    doc_id: str
    query: str
    target_language: str   # e.g. "hi-IN", "ta-IN", "te-IN"