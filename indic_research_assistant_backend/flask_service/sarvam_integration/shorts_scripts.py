import hmac
import json
import math
import re

from flask import Blueprint, current_app, jsonify, request

from pipeline.document_service import (
    MAX_SHORT_SCRIPT_BYTES,
    DocumentValidationError,
    extract_short_script_text,
)
from utils.config import INTERNAL_API_KEY
from utils.config import LLM_MODEL, sarvam_client


shorts_scripts_bp = Blueprint("shorts_scripts", __name__)
MAX_PREPARATION_SOURCE_CHARACTERS = 30000
MAX_USER_DESCRIPTION_CHARACTERS = 2000
MIN_NARRATION_WORDS_PER_SECOND = 1.5


@shorts_scripts_bp.route("/api/shorts/scripts/extract", methods=["POST"])
def extract_script():
    if not INTERNAL_API_KEY:
        current_app.logger.error("INTERNAL_API_KEY is not configured")
        return jsonify({"error": "Shorts script extraction is unavailable"}), 503

    supplied_key = request.headers.get("x-internal-key", "")
    if not hmac.compare_digest(supplied_key, INTERNAL_API_KEY):
        return jsonify({"error": "Unauthorized"}), 401

    if (
        request.content_length is not None
        and request.content_length > MAX_SHORT_SCRIPT_BYTES + 64 * 1024
    ):
        return jsonify({"error": "File exceeds the 10 MB size limit."}), 413

    try:
        text = extract_short_script_text(request.files.get("file"))
        return jsonify({"text": text}), 200
    except DocumentValidationError as error:
        return jsonify({"error": str(error)}), 400
    except Exception:
        current_app.logger.exception("Shorts script text extraction failed")
        return jsonify({"error": "Failed to extract script text"}), 502


def _completion_text(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts = [
            part["text"]
            for part in content
            if isinstance(part, dict)
            and part.get("type") == "text"
            and isinstance(part.get("text"), str)
        ]
        return "\n".join(text_parts)
    return ""


def _decode_completion_json(raw_content):
    content = raw_content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content, count=1, flags=re.IGNORECASE)
        content = re.sub(r"\s*```$", "", content, count=1)
    try:
        return json.loads(content)
    except json.JSONDecodeError as direct_error:
        decoder = json.JSONDecoder()
        for match in re.finditer(r"\{", content):
            try:
                result, _ = decoder.raw_decode(content[match.start():])
            except json.JSONDecodeError:
                continue
            return result
        raise ValueError("Sarvam returned invalid Shorts scene JSON.") from direct_error


def _parse_generated_scenes(raw_content, source_text):
    if not isinstance(raw_content, str) or not raw_content.strip():
        raise ValueError("Sarvam returned an empty Shorts scene response.")
    result = _decode_completion_json(raw_content)
    if not isinstance(result, dict):
        raise ValueError("Sarvam returned an invalid Shorts scene document.")
    source_diagrams_by_scene = {}
    scene_headings = list(re.finditer(
        r"^#{1,6}\s*scene\s+(\d+)\b[^\r\n]*$",
        source_text,
        flags=re.IGNORECASE | re.MULTILINE,
    ))
    for index, heading in enumerate(scene_headings):
        section_end = (
            scene_headings[index + 1].start()
            if index + 1 < len(scene_headings)
            else len(source_text)
        )
        diagrams = re.findall(
            r"```mermaid\s*(.*?)```",
            source_text[heading.end():section_end],
            flags=re.IGNORECASE | re.DOTALL,
        )
        if diagrams:
            source_diagrams_by_scene[int(heading.group(1)) - 1] = diagrams[0].strip()
    source_diagrams = re.findall(
        r"```mermaid\s*(.*?)```",
        source_text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    diagram_index = 0
    title = result.get("title")
    scenes = result.get("scenes")
    target_duration = result.get("targetDurationSeconds")
    if (
        not isinstance(title, str)
        or not title.strip()
        or not isinstance(target_duration, int)
        or isinstance(target_duration, bool)
        or not 1 <= target_duration <= 300
        or not isinstance(scenes, list)
        or not 1 <= len(scenes) <= 50
    ):
        raise ValueError("Sarvam returned incomplete Shorts scene metadata.")
    for scene_index, scene in enumerate(scenes):
        if (
            not isinstance(scene, dict)
            or scene.get("type") not in {"title", "concept", "diagram"}
            or not isinstance(scene.get("narration"), str)
            or not scene["narration"].strip()
            or not isinstance(scene.get("visualTitle"), str)
            or not scene["visualTitle"].strip()
            or not isinstance(scene.get("visualDescription"), str)
            or not scene["visualDescription"].strip()
        ):
            raise ValueError("Sarvam returned an invalid Shorts scene.")
        if scene["type"] == "diagram":
            mermaid_code = scene.get("mermaidCode")
            if not isinstance(mermaid_code, str) or not mermaid_code.strip():
                source_diagram = source_diagrams_by_scene.get(scene_index)
                if source_diagram is None and diagram_index < len(source_diagrams):
                    source_diagram = source_diagrams[diagram_index].strip()
                if source_diagram:
                    scene["mermaidCode"] = source_diagram
                    current_app.logger.warning(
                        "Sarvam omitted diagram code for Shorts scene %d; "
                        "reusing the corresponding source diagram.",
                        diagram_index + 1,
                    )
                else:
                    scene["type"] = "concept"
                    current_app.logger.warning(
                        "Sarvam omitted diagram code for Shorts scene %d; "
                        "rendering it as an explainer slide.",
                        diagram_index + 1,
                    )
            diagram_index += 1
    return result


def _narration_word_count(result):
    return sum(
        len(scene["narration"].split())
        for scene in result["scenes"]
    )


@shorts_scripts_bp.route("/api/shorts/scripts/prepare", methods=["POST"])
def prepare_script():
    if not INTERNAL_API_KEY:
        current_app.logger.error("INTERNAL_API_KEY is not configured")
        return jsonify({"error": "Shorts script preparation is unavailable"}), 503

    supplied_key = request.headers.get("x-internal-key", "")
    if not hmac.compare_digest(supplied_key, INTERNAL_API_KEY):
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400
    source_text = data.get("sourceText")
    user_description = data.get("userDescription", "")
    target_duration = data.get("targetDurationSeconds")
    requested_scene_count = data.get("requestedSceneCount")
    requested_scene_durations = data.get("requestedSceneDurations")
    if not isinstance(source_text, str) or not source_text.strip():
        return jsonify({"error": "sourceText must contain the uploaded script text."}), 400
    if len(source_text) > MAX_PREPARATION_SOURCE_CHARACTERS:
        return jsonify({
            "error": "The extracted script is too long for Shorts script preparation."
        }), 413
    if (
        not isinstance(user_description, str)
        or len(user_description) > MAX_USER_DESCRIPTION_CHARACTERS
    ):
        return jsonify({"error": "userDescription must be 2,000 characters or fewer."}), 400
    if target_duration is not None and (
        not isinstance(target_duration, int)
        or isinstance(target_duration, bool)
        or not 1 <= target_duration <= 300
    ):
        return jsonify({"error": "targetDurationSeconds must be between 1 and 300."}), 400
    if requested_scene_count is not None and (
        not isinstance(requested_scene_count, int)
        or isinstance(requested_scene_count, bool)
        or not 1 <= requested_scene_count <= 50
    ):
        return jsonify({"error": "requestedSceneCount must be between 1 and 50."}), 400
    if requested_scene_durations is not None and (
        not isinstance(requested_scene_durations, list)
        or not requested_scene_durations
        or len(requested_scene_durations) > 50
        or any(
            not isinstance(duration, int)
            or isinstance(duration, bool)
            or not 1 <= duration <= 60
            for duration in requested_scene_durations
        )
        or (
            requested_scene_count is not None
            and len(requested_scene_durations) != requested_scene_count
        )
        or (
            target_duration is not None
            and sum(requested_scene_durations) != target_duration
        )
    ):
        return jsonify({
            "error": "requestedSceneDurations must be valid scene timings that sum to targetDurationSeconds."
        }), 400

    system_prompt = """You are an expert short-form educational, entertainment, GTM (go to market) video scriptwriter.
    Create a clear, engaging explainer, not a reading of the source document.
    Use the uploaded document as factual reference and the user's description as the
    requested topic, audience, angle, and language. If the source contains a target
    language, use it; otherwise use the language of the user's description, or English.
    The runtime stated in the runtime instruction is authoritative. Ignore runtime
    and scene-duration values in the uploaded document or user description.
    Ignore headings, metadata, duration/word-count tables, visual instructions, and
    labels such as "Narration", "English", "Character Count", or "Ready for Shorts".
    Never narrate those labels or read metadata. Use actual narration text in each
    scene, with spoken transitions and concrete explanations of the concepts.
    Each scene must have short on-screen text that summarizes its idea, and a visual
    description that illustrates the explanation rather than displaying the narration.
    Use a diagram only for a real process, architecture, or relationship; diagram scenes
    must include valid Mermaid flowchart code. Keep all spoken narration within the
    requested runtime at a natural pace (about 1.5 spoken words per second; for
    languages without whitespace word boundaries, keep the narration concise).
    Return only JSON with this schema:
    {"title":"...","targetDurationSeconds":90,"scenes":[{"type":"title|concept|diagram","visualTitle":"short headline","visualDescription":"concise on-screen explainer copy and visual direction","narration":"spoken narration only","mermaidCode":"required only for diagram"}]}
    Avoid repeating facts. Do not include markdown fences."""
    def build_user_content(duration, minimum_words, scene_durations):
        runtime_instruction = (
            f"Use exactly {duration} seconds for the complete narration. "
            f"Include at least {minimum_words} spoken words across all scenes."
            if duration
            else "Infer a concise runtime of 30 to 120 seconds from the request."
        )
        scene_instruction = (
            f"Preserve exactly {requested_scene_count} "
            f"scene{'s' if requested_scene_count != 1 else ''}."
            if requested_scene_count
            and (duration is None or duration >= requested_scene_count)
            else "Use enough scenes to cover the explanation concisely."
        )
        timing_instruction = (
            "Use these exact scene durations in order: "
            f"{', '.join(str(value) for value in scene_durations)} seconds. "
            "Give each scene enough distinct spoken explanation to use its allotted time "
            "naturally; never pad by repeating the same idea."
            if scene_durations
            else ""
        )
        return (
            f"{runtime_instruction}\n{scene_instruction}\n{timing_instruction}\n\n"
            f"User description:\n{user_description.strip() or '(not provided)'}\n\n"
            f"Uploaded source document:\n{source_text.strip()}"
        )

    try:
        minimum_word_count = (
            math.ceil(target_duration * MIN_NARRATION_WORDS_PER_SECOND)
            if target_duration is not None
            else None
        )
        requested_target_duration = target_duration
        user_content = build_user_content(
            target_duration,
            minimum_word_count,
            requested_scene_durations,
        )
        result = None
        for attempt in range(3):
            response = sarvam_client.chat.completions(
                model=LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.5,
                reasoning_effort=None,
                max_tokens=2500,
            )
            choices = getattr(response, "choices", None)
            choice = choices[0] if choices else None
            message = getattr(choice, "message", None)
            raw_content = getattr(message, "content", None)
            content = _completion_text(raw_content)
            finish_reason = getattr(choice, "finish_reason", "unknown")
            response_issue = None
            narration_word_count = None
            if not choices:
                response_issue = "missing_choices"
            elif not content.strip():
                response_issue = "empty_content"
            else:
                try:
                    result = _parse_generated_scenes(content, source_text)
                except (ValueError, TypeError, AttributeError, IndexError) as error:
                    response_issue = str(error)
                else:
                    narration_word_count = _narration_word_count(result)
                    if (
                        minimum_word_count is not None
                        and narration_word_count < minimum_word_count
                    ):
                        response_issue = (
                            f"narration_too_short:"
                            f"{narration_word_count}/{minimum_word_count}"
                        )
                    else:
                        break

            current_app.logger.warning(
                "Sarvam Shorts completion unusable "
                "(attempt=%d, issue=%s, finish_reason=%s, "
                "response_id=%s, content_type=%s, content_characters=%d)",
                attempt + 1,
                response_issue,
                finish_reason,
                getattr(response, "id", "unknown"),
                type(raw_content).__name__,
                len(content),
            )
            if attempt == 1 and (
                response_issue
                and response_issue.startswith("narration_too_short:")
                and requested_target_duration is not None
                and 30 <= requested_target_duration <= 60
            ):
                target_duration = 90
                minimum_word_count = math.ceil(
                    target_duration * MIN_NARRATION_WORDS_PER_SECOND
                )
                requested_scene_durations = None
                user_content = build_user_content(
                    target_duration,
                    minimum_word_count,
                    requested_scene_durations,
                )
                current_app.logger.warning(
                    "Retrying Shorts narration with the 90-second fallback "
                    "(requested_seconds=%s, generated_words=%s)",
                    requested_target_duration,
                    narration_word_count,
                )
                continue
            if attempt == 0:
                narration_retry_instruction = (
                    "The narration has "
                    f"{narration_word_count} spoken words, but needs at least "
                    f"{minimum_word_count}. Expand the existing scene narration "
                    "with useful explanations, not repetition."
                    if response_issue
                    and response_issue.startswith("narration_too_short:")
                    else (
                        "Your previous response could not be used. Return one complete, "
                        "valid JSON object matching the required schema, with every scene "
                        "field populated. Do not use markdown fences or add commentary."
                    )
                )
            else:
                current_app.logger.error(
                    "Sarvam Shorts scene preparation failed after retry "
                    "(target_seconds=%s, issue=%s)",
                    target_duration,
                    response_issue,
                )
                if response_issue.startswith("narration_too_short:"):
                    return jsonify({
                        "error": (
                            "Sarvam could not generate enough narration after retrying "
                            "with the 90-second maximum. Please try another script."
                        )
                    }), 502
                return jsonify({
                    "error": (
                        "Sarvam returned an invalid explainer response after retrying. "
                        "Please try again."
                    )
                }), 502
            user_content = (
                f"{user_content}\n\n{narration_retry_instruction} "
                + (
                    f"Include at least {minimum_word_count} spoken words total."
                    if minimum_word_count is not None
                    else "Keep the explanation concise and complete."
                )
            )

        result["targetDurationSeconds"] = target_duration
        current_app.logger.info(
            "Prepared Shorts scenes "
            "(response_id=%s, target_seconds=%s, scene_count=%d, "
            "narration_words=%d, source_characters=%d)",
            getattr(response, "id", "unknown"),
            result["targetDurationSeconds"],
            len(result["scenes"]),
            _narration_word_count(result),
            len(source_text),
        )
        return jsonify(result), 200
    except (ValueError, AttributeError, IndexError, TypeError) as error:
        current_app.logger.warning("Invalid Sarvam Shorts script response: %s", error)
        return jsonify({
            "error": "Sarvam returned an empty or invalid explainer response. Please try again."
        }), 502
    except Exception:
        current_app.logger.exception("Sarvam Shorts script generation failed")
        return jsonify({"error": "Sarvam could not prepare the explainer script."}), 502
