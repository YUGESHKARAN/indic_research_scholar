
# from pinecone import Pinecone
# from utils.config import PINECONE_API_KEY

# pc = Pinecone(api_key=PINECONE_API_KEY)

# def generate_embedding(text: str):
#     embeddings = pc.inference.embed(
#         model="llama-text-embed-v2",
#         inputs=[{"text": text}],
#         parameters={
#             "input_type": "passage",
#             "truncate": "END",
#             "dimension": 512
#         }
#     )
#     return embeddings[0]["values"]

from pinecone import Pinecone
from utils.config import PINECONE_API_KEY

pc = Pinecone(api_key=PINECONE_API_KEY)

CHUNK_SIZE = 1200
CHUNK_OVERLAP = 100


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    text = " ".join(text.split())
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return [c for c in chunks if c.strip()]


def generate_embedding(text: str, input_type: str = "passage"):
    """input_type: 'passage' when embedding doc chunks, 'query' when embedding a search query."""
    embeddings = pc.inference.embed(
        model="llama-text-embed-v2",
        inputs=[{"text": text}],
        parameters={
            "input_type": input_type,
            "truncate": "END",
            "dimension": 512
        }
    )
    return embeddings[0]["values"]