
import os
from dotenv import load_dotenv
from sarvamai import SarvamAI
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX")

EMBED_MODEL = "text-embedding-3-small"

LLM_MODEL = "sarvam-105b"

SARVAM_API_KEY = os.getenv('SARVAM_API_KEY')  # LLM_MODEL e.g. "sarvam-30b"
sarvam_client = SarvamAI(api_subscription_key=SARVAM_API_KEY)
def build_response(
    content: str,
    doc_title: str,
    key_workds: list[str]
):
    return {
        "content": content,
        "doc_title": doc_title,
        "key_workds": key_workds
    }

