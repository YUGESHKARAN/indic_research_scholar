<div
  align="center">
  <img src="./assets/indic_resesrch_assistant_logo.png" width="190" height="100" alt="indic_research_assistant"> 
</div>



<div align="center">
  
![Sarvam AI](https://img.shields.io/badge/Sarvam_AI-OCR_·_LLM_·_TTS-E8A33D?style=flat-square)
![Flask](https://img.shields.io/badge/Flask-000000?style=flat-square&logo=flask&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Pinecone](https://img.shields.io/badge/Pinecone-Vector_DB-1C1C1C?style=flat-square)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)


</div>

<div align="center">
  <h3> Indic Research Assistant</h3>
</div>


Upload a research paper, ask questions about it, get answers in your own Indic language — grounded only in that document, with key metrics surfaced alongside the answer.

Built for students, scholars, and researchers who understand dense academic English better in Hindi, Tamil, Telugu, or one of 8+ other Indian languages.

---

## Key Features

- Explore findings in your native language.
- OCR that reliably parses data even from blurred or low-quality scans 💪🏻.
- Do deep, focused research on any topic.
- Upload once, explore for a lifetime — manage your docs and findings anytime.

---

## How it works


`flask_service` and `nodejs_service` are independent services that talk to each other over HTTP — Flask calls Node's internal API to register a doc in the uploader's library right after ingestion succeeds.

## Tech stack

| Service | Stack |
|---|---|
| `flask_service` | Flask, Pinecone (vector search + embeddings), Sarvam AI (OCR, LLM, translation, TTS) |
| `nodejs_service` | Express, MongoDB/Mongoose, JWT (httpOnly cookies), bcrypt |
| `frontend` | React, Tailwind CSS, react-router-dom, axios *(separate repo)* |

## Project structure

```
indic_research_assistant_fronotend
 -> (React, Tailwind CSS, react-router-dom, axios)

```

```

indic_research_assistant_backend/
├── flask_service/
│   ├── pipeline/
│   │   ├── ingestion.py       # chunk → embed → upsert (pure, no I/O concerns)
│   │   ├── retrieval.py       # embed query → search → answer → translate
│   │   └── document_service.py # upload validation + Sarvam OCR job
│   ├── utils/
│   │   ├── config.py          # env vars, Pinecone/Sarvam clients
│   │   ├── embeder.py         # chunking + embedding
│   │   ├── pinecone_client.py
│   │   ├── prompt.py          # RAG prompt template
│   │   ├── node_client.py     # calls Node's internal doc-registration endpoint
│   │   └── tts_service.py     # Sarvam TTS
│   ├── app.py
│   └── requirements.txt
│
└── nodejs_service/
    ├── config/                # db.js, jwt.js
    ├── middleware/            # auth.js (JWT), internalAuth.js (service key)
    ├── controllers/           # authController.js, docController.js
    ├── models/                # User.js
    ├── routes/                # authRoutes.js, docRoutes.js
    └── app.js
```

## API reference

**Flask** (`flask_service`, default `:5000`)

| Route | Method | Body | Purpose |
|---|---|---|---|
| `/ingest` | POST | `multipart/form-data`: `file`, `email`, `title?` | OCR + chunk + embed a document, max 10 pages |
| `/ask` | POST | JSON: `doc_id`, `query`, `target_lang` | Retrieve + answer, translated to `target_lang` |
| `/tts` | POST | JSON: `text`, `target_lang` | Returns base64 WAV audio chunk(s) |

**Node** (`nodejs_service`, default `:3000`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/scholar/register` | POST | — | Create account |
| `/api/scholar/login` | POST | — | Sets JWT cookie |
| `/api/scholar/logout` | POST | — | Clears cookie |
| `/api/scholar/me` | GET | JWT | Current session |
| `/api/docs` | GET | JWT | Logged-in user's doc library |
| `/api/internal/docs` | POST | `x-internal-key` | Flask → Node hand-off after ingest |

## Getting started

### Prerequisites
- Python 3.10+, Node 18+, MongoDB (local or Atlas), a Pinecone index, a Sarvam AI API key

### 1. `flask_service`
```bash
cd flask_service
pip install -r requirements.txt
```
Create `.env`:
```
PINECONE_API_KEY=
PINECONE_INDEX=
SARVAM_API_KEY=
NODE_BASE_URL=http://127.0.0.1:3000
NODE_INTERNAL_DOCS_PATH=/api/internal/docs
INTERNAL_API_KEY=            # must match nodejs_service's value exactly
```
```bash
python app.py
```

### 2. `nodejs_service`
```bash
cd nodejs_service
npm install
```
Create `.env`:
```
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
INTERNAL_API_KEY=            # must match flask_service's value exactly
CLIENT_ORIGIN=http://localhost:5173
PORT=3000
NODE_ENV=development
```
```bash
node app.js
```

### 3. Frontend

```bash
cd indic_research_assistant_fronotend
npm install
```

 `VITE_NODE_BASE_URL=http://127.0.0.1:3000` in its `.env`.

## Known limitations

- Documents are capped at **10 pages** (Sarvam Document Intelligence's per-job limit)
- `/ingest` and `/ask` run synchronously — large documents or long answers will hold the request open rather than streaming
- No rate limiting yet on auth routes

## Contributing

Issues and PRs welcome. For anything non-trivial, please open an issue first to discuss the approach before submitting a PR.

## License

MIT — see [LICENSE](./LICENSE).
