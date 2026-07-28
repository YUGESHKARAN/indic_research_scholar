import requests
from utils.config import NODE_BASE_URL, NODE_INTERNAL_DOCS_PATH, INTERNAL_API_KEY


def register_doc_with_node(email: str, doc_id: str, title: str, timeout: int = 5) -> dict:
    """
    Pushes {email, doc_id, title} to the Node backend so it shows up in the
    user's doc library. This is a soft dependency — if Node is down or the
    user isn't registered yet, the Pinecone ingest has ALREADY succeeded and
    should not be rolled back. Failures here are returned as a status dict,
    not raised, so the caller can decide how to surface it.
    """
    url = f"{NODE_BASE_URL}{NODE_INTERNAL_DOCS_PATH}"

    try:
        response = requests.post(
            url,
            json={"email": email, "doc_id": doc_id, "title": title},
            headers={"x-internal-key": INTERNAL_API_KEY},
            timeout=timeout,
        )
    except requests.exceptions.RequestException as e:
        return {"synced": False, "reason": f"Node unreachable: {str(e)}"}

    if response.status_code == 200:
        return {"synced": True}

    # 404 = email not registered on Node yet; anything else = unexpected
    try:
        error_detail = response.json().get("error", response.text)
    except ValueError:
        error_detail = response.text

    return {"synced": False, "reason": error_detail, "status_code": response.status_code}