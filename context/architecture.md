# Architecture Context — Indic Research Assistant

## Stack

| Layer           | Technology                        | Role                                           |
| --------------- | --------------------------------- | ---------------------------------------------- |
| **Frontend**    | React 18 + Tailwind CSS           | UI, routing, session management                |
| **API Gateway** | Node.js / Express                 | Auth, user management, doc library, webhooks   |
| **Processing** | Flask + Python                     | OCR, RAG pipeline, embeddings, translations    |
| **Auth**        | JWT (httpOnly cookies) + GitHub OAuth + Email/OTP | Identity, session, password recovery    |
| **Database**    | MongoDB + Mongoose                | User accounts, doc metadata, auth tokens       |
| **Vector DB**   | Pinecone                          | Document embeddings, semantic search           |
| **LLM / Speech**| Sarvam AI (105B + Saaras + Bulbul + Vision) | Chat, translation, TTS, STT, OCR        |
| **Deployment** | Vercel (frontend) + Self-hosted/Cloud (backend) | CDN, serverless, containerized services |

---

## System Boundaries

### Frontend (`src/`)
Owns: Page routing, UI rendering, client-side session state, form validation, audio playback.
Responsible for: Maintaining auth context, initiating queries to backend APIs, handling OAuth redirects, managing document selection state.
Does NOT own: Authentication verification, data persistence, background processing.

### Node.js Service (`nodejs_service/`)
Owns: User authentication, JWT token issuance, doc library management, internal service orchestration.
Responsible for: Verifying credentials, managing user-doc relationships in MongoDB, validating requests from frontend and Flask, maintaining the source of truth for which docs belong to which user.
Does NOT own: Document processing, vector embeddings, LLM inference.

### Flask Service (`flask_service/`)
Owns: Document ingestion, OCR, embedding, RAG retrieval, text generation, translation, TTS/STT.
Responsible for: Coordinating Sarvam API calls, managing Pinecone index operations, chunking and embedding documents, retrieving context and generating answers.
Does NOT own: User authentication, doc ownership enforcement (trusts Node to validate).

### Data Layer
**MongoDB**: User accounts (name, email, password hash, githubId, otpToken), doc references (doc_id, title, createdAt per user).
**Pinecone**: Document chunks with embeddings and metadata (doc_id, email, text, chunk_index, source_language, created_at).
**File Storage** (implicit): OCR outputs (temporary), audio responses (returned in `/ask` response).

---

## Storage Model

- **MongoDB (Relational)**: 
  - User accounts with auth credentials and OAuth identifiers
  - Per-user doc library (array of doc_id + title + timestamp)
  - OTP tokens for password reset (15-minute expiry)
  - Isolation by email (unique index)

- **Pinecone (Vector DB)**:
  - Document chunks indexed by embedding vector
  - Metadata: doc_id (filter isolation), email (audit), chunk text, source language, created_at
  - No namespace isolation; doc_id filtering enforces per-user boundaries

- **Transient Storage** (not persisted):
  - Sarvam OCR temporary output (unzipped in /tmp, discarded after extraction)
  - TTS audio chunks (base64-encoded WAV, returned in API response, no disk persistence)

---

## Auth and Access Model

### Authentication Flow
1. **Email/Password or GitHub OAuth**: User signs in at frontend (`/login`)
   - Email/Password: Node validates credentials, hashes password with bcrypt
   - GitHub OAuth: Passport.js strategy exchanges auth code, auto-links by email
   - Both: Node issues JWT, sets in httpOnly cookie (7-day expiry)

2. **Session Check**: Frontend calls `GET /api/scholar/me` on app load
   - Node reads JWT from cookie, verifies signature, returns user object
   - Frontend hydrates auth context; if 401, redirects to login

3. **Protected Routes**: Frontend wraps `/ingest` and `/ask` in `ProtectedRoute`
   - Checks `useAuth().user` is not null; shows "Checking session…" while loading

### Access Control
- **Frontend → Node**: All requests include httpOnly cookie (automatic browser behavior)
- **Frontend → Flask**: Direct axios calls; doc_id is user-provided (trusted from Node's doc library)
- **Flask → Node**: Internal `/api/internal/docs` call with `x-internal-key` header (validates doc registration)
- **Doc Ownership**: Enforced by email + doc_id matching in Pinecone queries
  - User can only query doc_id if Flask finds it in their Pinecone metadata (email filter)
  - Flask never returns chunks from a doc the user doesn't own

### Password Reset
1. User clicks "Forgot password?" → `POST /api/scholar/send-otp`
2. Node generates 6-digit OTP, stores hashed in MongoDB with 15-min expiry
3. Sends OTP via email (nodemailer + SMTP)
4. User enters OTP + new password → `POST /api/scholar/reset-password`
5. Node verifies OTP, hashes new password, clears OTP fields

---

## Service Communication

### Frontend ↔ Node (synchronous, REST)
- Cookie-based auth (httpOnly, `withCredentials: true` on axios)
- CORS: `origin: CLIENT_ORIGIN`, `credentials: true`
- Endpoints: `/api/scholar/*` (auth), `/api/docs` (library)

### Frontend ↔ Flask (synchronous, REST)
- No auth header (Flask trusts doc_id as user-provided from their Node library)
- Endpoints: `/ingest`, `/ask`, `/tts`
- Base URL from frontend env: `VITE_FLASK_BASE_URL`

### Flask ↔ Node (synchronous, HTTP)
- After successful `/ingest`: Flask calls `POST /api/internal/docs`
- Auth: `x-internal-key` header (shared secret in env)
- Soft-fail: If Node unreachable, doc still ingested in Pinecone; user syncs manually later
- Endpoint: `NODE_INTERNAL_DOCS_PATH` env var (default `/api/internal/docs`)

### All ↔ External APIs
- **Sarvam AI**: Synchronous calls; implemented as Python SDK
- **Pinecone**: Synchronous queries + upserts; Python SDK
- **MongoDB**: Mongoose (Node) synchronously; no async backlog queue

---

## Invariants

1. **Every user request must carry proof of identity**: Frontend requests have httpOnly JWT cookie (automatic); Flask requests include user email in doc metadata; internal requests have `x-internal-key`.

2. **Doc ownership is enforced at query time, not ingestion**: Flask never validates "does this email own this doc?" at `/ingest`; it trusts Node to register. At `/ask`, Flask filters Pinecone by doc_id + email; if no match, returns empty results (safe).

3. **No long-lived background jobs**: All requests (OCR, embedding, retrieval, TTS) are synchronous and bounded by timeout. If a request takes >10s, it fails; user retries.

4. **Passwords are never logged or transmitted plaintext**: Pre-save hook bcrypts on every hash call; toJSON strips password + OTP from all responses; password only exists in Node memory during auth.

5. **OTP has hard 15-minute expiry**: Created with `new Date(Date.now() + 15 * 60 * 1000)`; reset endpoint compares current time. No refresh or re-use.

6. **GitHub OAuth auto-links by email; no provider switching**: If a user signs up with email/password, then signs in with GitHub using the same email, they get the same account with githubId added (authProvider stays 'local'). They can still log in both ways.

7. **Pinecone is the source of truth for doc content; MongoDB is the source of truth for ownership**:
   - Node's doc library says "user owns doc_id X with title Y"
   - Pinecone's chunks say "doc_id X has 50 chunks with embedding vectors"
   - If Pinecone is cleared, user still sees the doc in their library but can't query it (empty results)

8. **Cross-origin requests require explicit CORS headers**: Frontend running on `https://indic-research-scholar.vercel.app` sends `Origin` header; Node must allow it in CORS config or request fails at browser level (not a server-side decision).

9. **All external API failures are user-facing**: If Sarvam returns 500, user sees the error; no retry queue, no fallback. The app is synchronous by design.

10. **Doc metadata in Pinecone is immutable after ingestion**: Chunk text, doc_id, email, source_language are set once and never updated. Deleting a doc requires manual Pinecone index manipulation (not exposed in UI).

---

## Deployment Model

### Frontend (Vercel)
- Static React build; deployed on each git push
- Environment: `VITE_NODE_BASE_URL` (Node API URL), `VITE_FLASK_BASE_URL` (Flask API URL)
- CDN: Vercel's global edge network
- Domains: `https://indic-research-scholar.vercel.app` (primary)

### Node Service
- Node.js 18+, Express.js
- Database: MongoDB Atlas (cloud) or self-hosted
- Deployment: Render, Railway, or self-hosted VPS
- Environment: `MONGO_URI`, `JWT_SECRET`, `GITHUB_CLIENT_ID/SECRET`, `EMAIL_USER/PASS`, `INTERNAL_API_KEY`, `CLIENT_ORIGIN`
- Port: 3000 (local) → 3000 (production, behind reverse proxy)

### Flask Service
- Python 3.10+, Flask
- Dependencies: pinecone, sarvamai, python-dotenv, requests, pypdf, nodemailer
- Deployment: Render, Railway, or self-hosted VPS
- Environment: `PINECONE_API_KEY`, `PINECONE_INDEX`, `SARVAM_API_KEY`, `NODE_BASE_URL`, `INTERNAL_API_KEY`
- Port: 5000 (local) → 5000 (production, behind reverse proxy)

### External Services
- **MongoDB Atlas**: Fully managed, no ops overhead
- **Pinecone**: Fully managed vector DB
- **Sarvam AI**: Hosted API; bills per API call
- **GitHub OAuth**: Configured OAuth App (public)
- **Email**: SMTP (e.g. Gmail App Password via nodemailer)

---

## Scaling Considerations

### Current State (MVP)
- Single Flask instance (synchronous, timeout-bound)
- Single Node instance
- No load balancer
- All requests block (OCR, embedding, LLM can take 5–30s per request)

### Bottlenecks
1. **Synchronous OCR**: Sarvam Document Intelligence can take 10–20s for a multi-page PDF
2. **Embedding latency**: Pinecone inference + storage can add 2–5s
3. **LLM inference**: Sarvam chat 30B can take 5–15s per response
4. **TTS latency**: Bulbul v3 can add 3–5s per response

### Future (if scaling is needed)
- **Async pipeline**: Queue OCR/embedding jobs (e.g. Redis + Bull, or Cloud Tasks)
- **Load balancing**: NGINX or cloud load balancer in front of Node + Flask replicas
- **Caching**: Redis for session tokens, recent queries, frequently accessed chunks
- **Database indexing**: Add indexes on `(email, doc_id)` in Pinecone queries
- **Rate limiting**: Add `express-rate-limit` on auth routes; per-user rate limits on `/ask`
- **Observability**: Logging (e.g. Winston), tracing (e.g. OpenTelemetry), metrics (e.g. Prometheus)

---

## Configuration

### Environment Variables

**Node Service (.env)**
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=7d
INTERNAL_API_KEY=<shared-secret>
CLIENT_ORIGIN=https://indic-research-scholar.vercel.app
GITHUB_CLIENT_ID=<from-OAuth-app>
GITHUB_CLIENT_SECRET=<from-OAuth-app>
GITHUB_CALLBACK_URL=https://<node-domain>/api/scholar/github/callback
EMAIL_PROVIDER=gmail
EMAIL_USER=<gmail-address>
EMAIL_PASS=<app-password>
PORT=3000
NODE_ENV=production
```

**Flask Service (.env)**
```
PINECONE_API_KEY=<from-Pinecone-dashboard>
PINECONE_INDEX=indic-research-scholar
SARVAM_API_KEY=<from-Sarvam-console>
NODE_BASE_URL=https://<node-domain>
NODE_INTERNAL_DOCS_PATH=/api/internal/docs
INTERNAL_API_KEY=<shared-secret>
FLASK_ENV=production
```

**Frontend (.env.production)**
```
VITE_NODE_BASE_URL=https://<node-domain>
VITE_FLASK_BASE_URL=https://<flask-domain>
```

---

## Security

### Data in Transit
- All services run over HTTPS in production
- Cookies are `httpOnly` + `secure` + `sameSite=strict`
- Internal service calls use `x-internal-key` header (not ideal; prefer mTLS in future)

### Data at Rest
- Passwords are bcrypt-hashed, never stored plaintext
- OTP tokens are not hashed (acceptable for 15-min expiry)
- Pinecone metadata (email, doc_id) is encrypted at rest (Pinecone's responsibility)
- MongoDB encryption is cloud provider's responsibility (Atlas offers encryption by default)

### Access Control
- User isolation via email + doc_id matching
- GitHub OAuth secrets are environment-only (never in code)
- Internal API key is environment-only

---

## Testing Strategy

### Unit Tests
- Auth service: bcrypt, JWT signing/verification
- Embedding service: chunking logic, embedding generation
- Retrieval service: prompt building, response parsing

### Integration Tests
- Full auth flow: register → login → GitHub OAuth → logout
- End-to-end ingest: upload → OCR → embed → library sync
- End-to-end query: select doc → ask → response + TTS

### Load Tests
- Concurrent `/ask` requests (10–100 users)
- Concurrent `/ingest` requests (5–10 users)
- Monitor timeout behavior, error rates

---

## Monitoring & Ops

### Logging
- Node: Winston or native `console.log` → `/var/log/nodejs.log`
- Flask: Flask logging → `/var/log/flask.log`
- Aggregate: Cloudflare Logs (if behind Cloudflare), or third-party (e.g. Papertrail)

### Alerts
- Sarvam API error rate > 5% → notify ops
- Node/Flask restart count > 3 in 1h → notify ops
- MongoDB connection errors → notify ops

### Metrics
- Request latency per endpoint (p50, p95, p99)
- Document ingestion success rate
- Vector search latency
- Auth token refresh rate