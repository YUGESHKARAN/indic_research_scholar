import json

from utils.config import sarvam_client, LLM_MODEL, build_response
from utils.embeder import generate_embedding
from utils.pinecone_client import query_chunks
from utils.prompt import build_rag_prompt

LANG_NAMES = {
    "hi-IN": "Hindi", "ta-IN": "Tamil", "te-IN": "Telugu",
    "kn-IN": "Kannada", "ml-IN": "Malayalam", "bn-IN": "Bengali",
    "mr-IN": "Marathi", "gu-IN": "Gujarati", "pa-IN": "Punjabi",
    "od-IN": "Odia", "en-IN": "English",
}


def _translate_to_english(query: str, source_lang: str) -> str:
    if source_lang == "en-IN":
        return query
    result = sarvam_client.text.translate(
        input=query,
        source_language_code=source_lang,
        target_language_code="en-IN",
    )
    return result.translated_text


def _parse_llm_json(raw_text: str):
    """Sarvam is instructed to return raw JSON, but strip fences defensively
    in case the model wraps it in ```json anyway."""
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned.split("\n", 1)[-1]

    try:
        data = json.loads(cleaned)
        return data.get("content", raw_text), data.get("key_workds", [])
    except (json.JSONDecodeError, AttributeError):
        # Model didn't return valid JSON — fail soft with the raw text as content
        return raw_text, []


def ask(doc_id: str, query: str, target_language: str) -> dict:
    english_query = _translate_to_english(query, target_language)
    query_embedding = generate_embedding(english_query, input_type="query")

    matches = query_chunks(doc_id, query_embedding)
    if not matches:
        return build_response(
            content="This document could not be found. Please check the doc_id or re-upload it.",
            doc_title="",
            key_workds=[],
        )

    doc_title = matches[0]["metadata"].get("title", "Untitled Document")
    context_chunks = [m["metadata"].get("text", "") for m in matches]
    lang_name = LANG_NAMES.get(target_language, target_language)

    messages = build_rag_prompt(query, context_chunks, lang_name)
    response = sarvam_client.chat.completions(
        model=LLM_MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=1200,
    )

    raw = response.choices[0].message.content
    content, key_workds = _parse_llm_json(raw)

    return build_response(content=content, doc_title=doc_title, key_workds=key_workds)