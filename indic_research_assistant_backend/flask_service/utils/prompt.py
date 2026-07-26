def build_rag_prompt(question: str, context_chunks: list[str], target_language_name: str) -> list[dict]:
    context = "\n\n---\n\n".join(context_chunks)

    system = (
        "You are an academic research assistant that helps students and researchers "
        "understand advanced research documents. Answer ONLY using the provided context. "
        "If the answer isn't in the context, say so honestly instead of guessing. "
        "Where relevant, surface key metrics, numbers, or findings from the context explicitly. "
        "Respond with ONLY a raw JSON object — no markdown fences, no preamble, no trailing text — "
        "in exactly this shape: "
        '{"content": "<full answer, written entirely in ' + target_language_name + '>", '
        '"key_workds": ["<3-6 short topic keywords describing the question and answer, '
        f'written in {target_language_name}>"]'
    )

    user = f"Context:\n{context}\n\nQuestion: {question}"

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


