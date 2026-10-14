import base64
import binascii
import hmac
import io
import os
import re
import tempfile
import uuid
import wave
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request

from utils.config import INTERNAL_API_KEY, sarvam_client


shorts_audio_bp = Blueprint("shorts_audio", __name__)

LANGUAGE_CODES = {
    "english": "en-IN",
    "hindi": "hi-IN",
    "tamil": "ta-IN",
    "telugu": "te-IN",
    "kannada": "kn-IN",
    "malayalam": "ml-IN",
    "bengali": "bn-IN",
    "marathi": "mr-IN",
    "gujarati": "gu-IN",
}
TTS_VOICES = {
    "english": ("bulbul:v4-flash", "girish_en_documentary"),
    "hindi": ("bulbul:v4-flash", "simran_hi_narration"),
    "tamil": ("bulbul:v4-flash", "gokul_ta_narration"),
    "telugu": ("bulbul:v4-flash", "kavitha_te_narration"),
    "kannada": ("bulbul:v4-flash", "chaitra_kn_narration"),
    "malayalam": ("bulbul:v3", "shubh"),
    "bengali": ("bulbul:v4-flash", "roopa_bn_conversational"),
    "marathi": ("bulbul:v4-flash", "mrunal_mr_narration"),
    "gujarati": ("bulbul:v4-flash", "bhavik_gu_conversation"),
}
MIN_SCRIPT_CHARACTERS = 10
MAX_SCRIPT_CHARACTERS = 3500
MAX_TTS_REQUEST_CHARACTERS = 2500
MAX_AUDIO_DURATION_SECONDS = 300


def _audio_storage_root() -> Path:
    configured_root = os.environ.get("SHORTS_STORAGE_PATH")
    if configured_root:
        return Path(configured_root)
    return (
        Path(__file__).resolve().parents[2]
        / "nodejs_service"
        / "public"
        / "videos"
    )


def _decode_wav(encoded_audio: str) -> tuple[bytes, float]:
    try:
        audio_bytes = base64.b64decode(encoded_audio, validate=True)
        with wave.open(io.BytesIO(audio_bytes), "rb") as audio:
            sample_rate = audio.getframerate()
            frame_count = audio.getnframes()
            if sample_rate <= 0 or frame_count <= 0:
                raise ValueError("Audio has no playable samples.")
            duration = frame_count / sample_rate
    except (binascii.Error, EOFError, wave.Error) as error:
        raise ValueError("Sarvam returned an invalid WAV file.") from error

    if duration <= 0 or duration > MAX_AUDIO_DURATION_SECONDS:
        raise ValueError("Generated audio duration is outside the supported range.")
    return audio_bytes, duration


def _split_tts_script(script: str) -> list[str]:
    chunks = []
    remaining = script
    while len(remaining) > MAX_TTS_REQUEST_CHARACTERS:
        limit = MAX_TTS_REQUEST_CHARACTERS
        lower_bound = limit // 2
        paragraph_end = remaining.rfind("\n\n", lower_bound, limit + 1)
        sentence_ends = [
            match.end()
            for match in re.finditer(r"""[.!?]["')\]]?(?=\s)""", remaining[:limit])
            if match.end() >= lower_bound
        ]
        split_at = paragraph_end if paragraph_end >= lower_bound else 0
        if sentence_ends and sentence_ends[-1] > split_at:
            split_at = sentence_ends[-1]
        if split_at < lower_bound:
            split_at = remaining.rfind(" ", lower_bound, limit + 1)
        if split_at < lower_bound:
            split_at = limit

        chunk = remaining[:split_at].strip()
        if chunk:
            chunks.append(chunk)
        remaining = remaining[split_at:].strip()

    if remaining:
        chunks.append(remaining)
    return chunks


def _combine_wav_chunks(audio_chunks: list[bytes]) -> tuple[bytes, float]:
    if len(audio_chunks) == 1:
        with wave.open(io.BytesIO(audio_chunks[0]), "rb") as audio:
            return audio_chunks[0], audio.getnframes() / audio.getframerate()

    params = None
    frames = []
    duration = 0.0
    for audio_bytes in audio_chunks:
        with wave.open(io.BytesIO(audio_bytes), "rb") as audio:
            current_params = audio.getparams()
            if params is None:
                params = current_params
            elif (
                current_params.nchannels != params.nchannels
                or current_params.sampwidth != params.sampwidth
                or current_params.framerate != params.framerate
                or current_params.comptype != params.comptype
            ):
                raise ValueError("Sarvam returned WAV chunks with incompatible formats.")
            frame_count = audio.getnframes()
            frames.append(audio.readframes(frame_count))
            duration += frame_count / current_params.framerate

    if duration <= 0 or duration > MAX_AUDIO_DURATION_SECONDS:
        raise ValueError("Generated audio duration is outside the supported range.")

    combined = io.BytesIO()
    with wave.open(combined, "wb") as audio:
        audio.setparams(params)
        audio.writeframes(b"".join(frames))
    return combined.getvalue(), duration


def _write_audio(audio_bytes: bytes, short_id: str, language: str) -> str:
    storage_root = _audio_storage_root()
    audio_directory = storage_root / "audio"
    audio_directory.mkdir(parents=True, exist_ok=True)

    resolved_root = storage_root.resolve()
    resolved_audio_directory = audio_directory.resolve()
    if not resolved_audio_directory.is_relative_to(resolved_root):
        raise OSError("Shorts audio directory must be inside the storage root.")

    audio_name = f"{short_id}_{language}.wav"
    destination = resolved_audio_directory / audio_name
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            prefix=".shorts-audio-",
            suffix=".tmp",
            dir=resolved_audio_directory,
            delete=False,
        ) as temporary_file:
            temporary_file.write(audio_bytes)
            temporary_path = Path(temporary_file.name)
        os.replace(temporary_path, destination)
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)

    return f"audio/{audio_name}"


@shorts_audio_bp.route("/api/shorts/audio/generate", methods=["POST"])
def generate_shorts_audio():
    if not INTERNAL_API_KEY:
        current_app.logger.error("INTERNAL_API_KEY is not configured")
        return jsonify({"error": "Shorts audio generation is unavailable"}), 503

    supplied_key = request.headers.get("x-internal-key", "")
    if not hmac.compare_digest(supplied_key, INTERNAL_API_KEY):
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400

    script = data.get("script")
    if not isinstance(script, str):
        return jsonify({"error": "script must be text."}), 400
    script = script.strip()
    if len(script) < MIN_SCRIPT_CHARACTERS:
        return jsonify({"error": "Script must contain at least 10 characters."}), 400
    if len(script) > MAX_SCRIPT_CHARACTERS:
        return jsonify({
            "error": "Shorts narration exceeds the 3,500-character input limit."
        }), 413

    language = data.get("language")
    if not isinstance(language, str) or language not in LANGUAGE_CODES:
        return jsonify({"error": "Unsupported Shorts audio language."}), 400

    supplied_short_id = data.get("shortId")
    if not isinstance(supplied_short_id, str):
        return jsonify({"error": "shortId must be a UUID."}), 400
    try:
        short_id = str(uuid.UUID(supplied_short_id))
    except (ValueError, AttributeError):
        return jsonify({"error": "shortId must be a UUID."}), 400

    audio_chunks = []
    model, speaker = TTS_VOICES[language]
    try:
        for text_chunk in _split_tts_script(script):
            response = sarvam_client.text_to_speech.convert(
                text=text_chunk,
                language_code=LANGUAGE_CODES[language],
                speaker=speaker,
                model=model,
                output_audio_codec="wav",
            )
            audio_outputs = getattr(response, "audios", None)
            if not isinstance(audio_outputs, list) or len(audio_outputs) != 1:
                current_app.logger.error(
                    "Sarvam Shorts TTS returned an unexpected response"
                )
                return jsonify({
                    "error": "Sarvam returned an invalid audio response."
                }), 502
            if not isinstance(audio_outputs[0], str) or not audio_outputs[0]:
                current_app.logger.error("Sarvam Shorts TTS returned empty audio")
                return jsonify({
                    "error": "Sarvam returned an invalid audio response."
                }), 502
            audio_bytes, _ = _decode_wav(audio_outputs[0])
            audio_chunks.append(audio_bytes)
        audio_bytes, duration = _combine_wav_chunks(audio_chunks)
    except ValueError as error:
        current_app.logger.warning("Invalid Shorts audio response: %s", error)
        return jsonify({"error": str(error)}), 502
    except Exception as error:
        if (
            getattr(error, "status_code", None) == 400
            and "at most 2500 characters" in str(error)
        ):
            current_app.logger.warning(
                "Sarvam rejected a Shorts TTS chunk for exceeding its character limit"
            )
            return jsonify({
                "error": "Sarvam rejected a narration chunk as too long. Shorten the scene text and try again."
            }), 413
        if getattr(error, "status_code", None) == 400:
            current_app.logger.warning(
                "Sarvam rejected Shorts TTS request for language %s using %s",
                language,
                speaker,
            )
            return jsonify({
                "error": f"Sarvam rejected the {language} voice configuration. Please retry or select another language."
            }), 502
        current_app.logger.exception("Sarvam Shorts TTS request failed")
        return jsonify({"error": "Sarvam could not generate Shorts audio."}), 502

    try:
        audio_file = _write_audio(audio_bytes, short_id, language)
    except OSError:
        current_app.logger.exception("Failed to save Shorts audio")
        return jsonify({"error": "Generated audio could not be saved."}), 500

    return jsonify({
        "success": True,
        "audioFile": audio_file,
        "language": language,
        "duration": duration,
    }), 200
