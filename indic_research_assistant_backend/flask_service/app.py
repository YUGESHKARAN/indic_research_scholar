import os
from flask import Flask, request, jsonify
from flask_cors import CORS
# from pipeline.ingestion import ingest_document
from pipeline.retrieval import ask
from pipeline.document_service import process_and_ingest, DocumentValidationError
from pipeline.retrieval import ask as get_answer
from pipeline.tts_service import get_audio
import tempfile, os

from sarvamai import SarvamAI
SARVAM_API_KEY = os.getenv('SARVAM_API_KEY')
client = SarvamAI(api_subscription_key=SARVAM_API_KEY)
app = Flask(__name__)

CORS(app, resources={
    r"/ask": {"origins":["https://indic-research-scholar.vercel.app", "http://localhost:5173"]},
    r"/ingest": {"origins":["https://indic-research-scholar.vercel.app", "http://localhost:5173"]},
    r"/transcribe": {"origins":["https://indic-research-scholar.vercel.app", "http://localhost:5173"]},
})


@app.route("/")
def welcome():
    return jsonify({"message":"Welcome to the Indic Research assistant!"})


@app.route("/ingest", methods=["POST"])
def ingest_doc():
    file_storage = request.files.get("file")
    email = request.form.get("email")
    title = request.form.get("title")  # optional — falls back to filename

    try:
        result = process_and_ingest(file_storage, email, title)
        return jsonify(result), 201
    except DocumentValidationError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Failed to process document", "details": str(e)}), 500


@app.route("/transcribe", methods=["POST"])
def transcribe():
    if "audio" not in request.files:
        return jsonify({"error": "audio file required"}), 400

    audio_file = request.files["audio"]
    language = request.form.get("language", "unknown")
    doc_id = request.form.get("doc_id", "")

    # ✅ Validate doc_id early
    if not doc_id:
        return jsonify({"error": "doc_id is required"}), 400

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        # ✅ Step 1: STT — close file before doing anything else
        with open(tmp_path, "rb") as f:
            stt_response = client.speech_to_text.transcribe(
                file=f,
                model="saaras:v3",
                language_code=language,   # "unknown" = auto-detect
                mode="transcribe",
            )

        transcript = stt_response.transcript

        # ✅ Step 2: Guard against empty transcript
        if not transcript or not transcript.strip():
            return jsonify({"error": "Could not detect speech. Please try again."}), 422

        # ✅ Step 3: Resolve detected language for TTS
        # If user passed "unknown", use the detected language from STT response
        # stt_response.language_code returns the detected BCP-47 code e.g. "hi-IN"
        detected_language = stt_response.language_code or "hi-IN"
        target_language = language if language != "unknown" else detected_language

        print(f"Transcript: {transcript}")
        print(f"Detected language: {detected_language}, Target: {target_language}")

        # ✅ Step 4: RAG answer
        result = get_answer(doc_id, transcript, target_language)

        # ✅ Step 5: TTS
        audio_b64 = get_audio(result["content"], language_code=target_language)
        result["audio"] = audio_b64 or None
        result["transcript"] = transcript          # ✅ return transcript so UI can show it
        result["detected_language"] = detected_language
        print("\nresponse: ", jsonify(result))

        return jsonify(result), 200

    except Exception as e:
        print("transcribe error:", str(e))
        return jsonify({"error": str(e)}), 500

    finally:
        os.unlink(tmp_path)  # always clean up


@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    doc_id = data.get("doc_id")
    query = data.get("query")
    target_language = data.get("target_lang", "en-IN")
    print("target_language", target_language)

    if not doc_id or not query:
        return jsonify({"error": "doc_id and query are required"}), 400

    try:
        result = get_answer(doc_id, query, target_language)
        audio_b64 = get_audio(result['content'], language_code=target_language)  # ✅ pass language

        if audio_b64:
            result['audio'] = audio_b64  # ✅ base64 string, JSON-safe
        else:
            result['audio'] = None

        
        print("\nresult",jsonify(result))
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to process query", "details": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0",debug=True)