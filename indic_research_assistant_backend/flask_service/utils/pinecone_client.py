from pinecone import Pinecone
from utils.config import PINECONE_API_KEY, PINECONE_INDEX

pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX)


def query_chunks(doc_id: str, query_embedding: list[float], top_k: int = 5):
    """Vector search restricted to a single doc via metadata filter (no namespaces used)."""
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        filter={"doc_id": {"$eq": doc_id}},
        include_metadata=True,
    )
    return results.get("matches", [])