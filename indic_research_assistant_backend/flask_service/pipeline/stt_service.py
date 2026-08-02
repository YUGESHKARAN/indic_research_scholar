from sarvamai import SarvamAI
from flask import Flask, request, jsonify
import tempfile, os

SARVAM_API_KEY = os.getenv('SARVAM_API_KEY')
client = SarvamAI(api_subscription_key=SARVAM_API_KEY)


def transcribe():
    if "audio" not in request.files:
        return jsonify({"error": "audio file required"}), 400

    audio_file = request.files["audio"]
    language = request.form.get("language", "unknown")  # auto-detect by default

    # Save to temp file — Sarvam SDK expects a file path or file-like object
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            response = client.speech_to_text.transcribe(
                file=f,
                model="saaras:v3",
                language_code=language,   # "unknown" = auto-detect
                mode="transcribe",        # or "translate" for speech-to-English
            )
        return jsonify({"transcript": response.transcript}), 200

    except Exception as e:
        print("STT error:", str(e))
        return jsonify({"error": str(e)}), 500

    finally:
        os.unlink(tmp_path)  # clean up temp file
