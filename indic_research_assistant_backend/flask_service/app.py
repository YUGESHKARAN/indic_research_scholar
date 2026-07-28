import os
from flask import Flask, request, jsonify
from flask_cors import CORS
# from pipeline.ingestion import ingest_document
from pipeline.retrieval import ask
from pipeline.document_service import process_and_ingest, DocumentValidationError
from pipeline.retrieval import ask as get_answer
from pipeline.tts_service import get_audio
app = Flask(__name__)

CORS(app, resources={
    r"/ask": {"origins":["https://indic-research-scholar.vercel.app", "http://localhost:5173"]},
    r"/ingest": {"origins":["https://indic-research-scholar.vercel.app", "http://localhost:5173"]}
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
        
        print("\nresult",jsonify(result))
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to process query", "details": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0",debug=True)