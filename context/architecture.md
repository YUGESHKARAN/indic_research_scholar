# Architecture Context — Indic Research Assistant

## Stack

| Layer           | Technology                        | Role                                           |
| --------------- | --------------------------------- | ---------------------------------------------- |
| **Frontend**    | React 18 + Tailwind CSS           | UI, routing, session management, workspace studio |
| **API Gateway** | Node.js / Express                 | Auth, user management, doc library, shorts orchestration, webhooks |
| **Processing** | Flask + Python                     | OCR, RAG pipeline, embeddings, translations, TTS (Bulbul) |
| **Video Gen**   | Node.js services                   | Scene parsing, Mermaid/Shiki rendering, FFmpeg composition |
| **Auth**        | JWT (httpOnly cookies) + GitHub OAuth + Email/OTP | Identity, session, password recovery    |
| **Database**    | MongoDB + Mongoose                | User accounts, doc metadata, auth tokens, shorts metadata |
| **Vector DB**   | Pinecone                          | Document embeddings, semantic search           |
| **LLM / Speech**| Sarvam AI (105B + Saaras + Bulbul + Vision) | Chat, translation, TTS, STT, OCR        |
| **Image Gen** | Fal.ai (Phase 2)                   | AI-generated concept images (deferred)       |
| **Deployment** | Vercel (frontend) + Self-hosted/Cloud (backend) | CDN, serverless, containerized services |

---

## System Boundaries

### Frontend (`src/`)
Owns: Page routing, UI rendering, client-side session state, form validation, audio playback, workspace tabs.
Responsible for: Maintaining auth context, initiating queries to backend APIs, handling OAuth redirects, managing document selection state, workspace studio navigation.
Does NOT own: Authentication verification, data persistence, background processing, video rendering.

**Workspace Studio Components**:
- `WorkspaceSidebar.jsx`: Fixed/floating sidebar (Vercel-style, no content push)
- `WorkspaceQA.jsx`: Q&A task execution (delegates to Retrieval logic)
- `WorkspaceShorts.jsx`: Shorts creation interface
  - `ShortsCreator.jsx`: Upload script, select platform/resolution
  - `ScenePreview.jsx`: Timeline editor for scene customization
  - `VideoPlayer.jsx`: Preview and download rendered shorts

### Node.js Service (`nodejs_service/`)
Owns: User authentication, JWT token issuance, doc library management, internal service orchestration, shorts metadata management.
Responsible for: Verifying credentials, managing user-doc relationships in MongoDB, validating requests from frontend and Flask, maintaining the source of truth for which docs belong to which user, shorts creation workflow orchestration.
Does NOT own: Document processing, vector embeddings, LLM inference, video rendering, audio generation.

**New Shorts Routes** (`routes/shorts.js`):
- `POST /api/shorts/create`: Parse script → generate scenes → return preview
- `PATCH /api/shorts/:shortId/scenes`: Update scene configuration
- `POST /api/shorts/:shortId/render`: Generate the requested language WAV + render silent video
- `GET /api/shorts/:shortId/audio/:language`: Fetch audio for language swap
- `GET /api/shorts/list`: Fetch user's shorts library

### Flask Service (`flask_service/`)
Owns: Document ingestion, OCR, embedding, RAG retrieval, text generation, translation, TTS/STT, audio file generation for shorts.
Responsible for: Coordinating Sarvam API calls, managing Pinecone index operations, chunking and embedding documents, retrieving context and generating answers, generating separate audio files for each Indic language (Bulbul v4-flash).
Does NOT own: User authentication, doc ownership enforcement (trusts Node to validate), video rendering, scene generation.

**New Shorts Audio Endpoint** (`sarvam_integration/shorts_audio.py`):
- `POST /api/shorts/audio/generate`: Generate WAV file for script + language via Bulbul v4-flash
- `POST /api/shorts/scripts/extract`: Internal, API-key-protected PDF OCR returning extracted text only; it does not ingest or persist vectors

### Node.js Video Generation Service (`nodejs_service/services/`)
Owns: Script parsing, visual generation (Mermaid, Shiki, slides), video composition via FFmpeg.
Responsible for: Extracting scenes from scripts, rendering diagrams/code/slides to PNG/SVG, sequencing scenes with FFmpeg, managing local video storage.
Does NOT own: Audio generation (delegates to Flask), storage beyond local filesystem (Phase 2 adds S3).

**New Shorts Services**:
- `scriptParser.js`: Parse Markdown/DOCX locally or PDF through Flask OCR → extract scenes → classify type (legacy DOC is unsupported in v1)
- `visualGenerator.js`: Render Mermaid/Shiki/slides with Playwright → per-scene PNG and compact preview thumbnail
- `videoComposer.js`: Sequence scene visuals → silent FFmpeg MP4; WAV voice tracks are stored separately for language swapping
- `falaiService.js`: Call Fal.ai for concept images (Phase 2)

### Data Layer
**MongoDB**: 
- User accounts (name, email, password hash, githubId, otpToken), doc references (doc_id, title, createdAt per user)
- **NEW**: Shorts metadata (shortId, userId, title, platform, resolution, scenes array, audioFiles array, status, createdAt/updatedAt)

**Pinecone**: Document chunks with embeddings and metadata (doc_id, email, text, chunk_index, source_language, created_at).

**File Storage** (local, Phase 1): 
- OCR outputs (temporary)
- Audio responses (TTS for Q&A, returned in `/ask` response)
- **NEW**: Shorts scenes (PNG/SVG), audio files per language (WAV), final videos (MP4)

---

## Storage Model

- **MongoDB (Relational)**: 
  - User accounts with auth credentials and OAuth identifiers
  - Per-user doc library (array of doc_id + title + timestamp)
  - **NEW**: Per-user shorts library (array of shortId + title + platform + status + timestamp)
  - OTP tokens for password reset (15-minute expiry)
  - Isolation by email (unique index)

- **Pinecone (Vector DB)**:
  - Document chunks indexed by embedding vector
  - Metadata: doc_id (filter isolation), email (audit), chunk text, source language, created_at
  - No namespace isolation; doc_id filtering enforces per-user boundaries

- **Local Filesystem** (Phase 1, future S3 in Phase 3):
  - `./public/videos/scenes/`: Generated PNG/SVG images per scene
  - `./public/videos/audio/`: WAV files per short + language (NOT baked into video)
  - `./public/videos/final/`: Rendered MP4 videos per platform/resolution

- **Transient Storage** (not persisted):
  - Sarvam OCR temporary output (unzipped in /tmp, discarded after extraction)
  - TTS audio chunks for Q&A (base64-encoded WAV, returned in API response, no disk persistence)

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

3. **Protected Routes**: Frontend wraps `/ingest`, `/ask`, and `/workspace` in `ProtectedRoute`
   - Checks `useAuth().user` is not null; shows "Checking session…" while loading

### Access Control
- **Frontend → Node**: All requests include httpOnly cookie (automatic browser behavior)
- **Frontend → Flask**: Direct axios calls; doc_id is user-provided (trusted from Node's doc library)
- **Frontend → Node (Shorts)**: Create, update, render, list shorts (requires auth)
- **Flask → Node**: Internal `/api/internal/docs` call with `x-internal-key` header (validates doc registration)
- **Doc Ownership**: Enforced by email + doc_id matching in Pinecone queries
  - User can only query doc_id if Flask finds it in their Pinecone metadata (email filter)
  - Flask never returns chunks from a doc the user doesn't own
- **Shorts Ownership**: Enforced by userId + shortId matching in MongoDB
  - User can only access/edit/render shorts they created
  - Node validates `req.user._id` matches `short.userId` before any operation

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
- Endpoints: `/api/scholar/*` (auth), `/api/docs` (library), `/api/shorts/*` (shorts)

### Frontend ↔ Flask (synchronous, REST)
- No auth header (Flask trusts doc_id as user-provided from their Node library)
- Endpoints: `/ingest`, `/ask`, `/tts`
- Base URL from frontend env: `VITE_FLASK_BASE_URL`

### Frontend → Node (Shorts Pipeline)
- `POST /api/shorts/create`: Upload script + platform/resolution → return scenes preview
- `PATCH /api/shorts/:shortId/scenes`: User customizes scenes → save to MongoDB
- `POST /api/shorts/:shortId/render`: Generate the requested language WAV via Flask and compose a silent MP4 via Node FFmpeg

### Node → Flask (Shorts Audio)
- `POST /api/shorts/audio/generate`: Script + language → Bulbul TTS → WAV file saved locally
- Request: `{ "script": string, "language": string, "shortId": string }`
- Response: `{ "audioFile": string, "duration": number }`

### Flask ↔ Node (synchronous, HTTP)
- After successful `/ingest`: Flask calls `POST /api/internal/docs`
- Auth: `x-internal-key` header (shared secret in env)
- Soft-fail: If Node unreachable, doc still ingested in Pinecone; user syncs manually later
- Endpoint: `NODE_INTERNAL_DOCS_PATH` env var (default `/api/internal/docs`)

### All ↔ External APIs
- **Sarvam AI**: Synchronous calls; implemented as Python SDK (OCR, LLM, TTS/STT, embeddings)
- **Fal.ai**: Synchronous calls for AI images (Phase 2, optional)
- **Pinecone**: Synchronous queries + upserts; Python SDK
- **MongoDB**: Mongoose (Node) synchronously; no async backlog queue

---

## Invariants

1. **Every user request must carry proof of identity**: Frontend requests have httpOnly JWT cookie (automatic); Flask requests include user email in doc metadata; internal requests have `x-internal-key`; shorts requests must have authenticated user.

2. **Doc ownership is enforced at query time, not ingestion**: Flask never validates "does this email own this doc?" at `/ingest`; it trusts Node to register. At `/ask`, Flask filters Pinecone by doc_id + email; if no match, returns empty results (safe).

3. **Shorts ownership is enforced by userId matching**: Node verifies `req.user._id === short.userId` before returning, updating, or rendering any short. User cannot access shorts they don't own.

4. **No long-lived background jobs**: All requests (OCR, embedding, retrieval, TTS, video rendering) are synchronous and bounded by timeout. If a request takes >10s (OCR/video), it fails; user retries. (Note: Phase 2 may add async job queue for long video renders.)

5. **Passwords are never logged or transmitted plaintext**: Pre-save hook bcrypts on every hash call; toJSON strips password + OTP from all responses; password only exists in Node memory during auth.

6. **OTP has hard 15-minute expiry**: Created with `new Date(Date.now() + 15 * 60 * 1000)`; reset endpoint compares current time. No refresh or re-use.

7. **GitHub OAuth auto-links by email; no provider switching**: If a user signs up with email/password, then signs in with GitHub using the same email, they get the same account with githubId added (authProvider stays 'local'). They can still log in both ways.

8. **Pinecone is the source of truth for doc content; MongoDB is the source of truth for ownership**:
   - Node's doc library says "user owns doc_id X with title Y"
   - Pinecone's chunks say "doc_id X has 50 chunks with embedding vectors"
   - If Pinecone is cleared, user still sees the doc in their library but can't query it (empty results)
   - MongoDB shorts collection says "user owns shortId Z with title and platform"; local filesystem has rendered videos

9. **Shorts audio files are separate from video, not baked in**: Each language generates an independent WAV file. The MP4 is silent, so users can swap audio without re-rendering the video. Video must be re-rendered if scenes change, but audio can be regenerated independently.

10. **Cross-origin requests require explicit CORS headers**: Frontend running on `https://indic-research-scholar.vercel.app` sends `Origin` header; Node must allow it in CORS config or request fails at browser level (not a server-side decision).

11. **All external API failures are user-facing**: If Sarvam returns 500, user sees the error; no retry queue, no fallback. The app is synchronous by design.

12. **Doc metadata in Pinecone is immutable after ingestion**: Chunk text, doc_id, email, source_language are set once and never updated. Deleting a doc requires manual Pinecone index manipulation (not exposed in UI).

13. **Scene visuals are immutable once rendered**: Mermaid diagrams, Shiki code blocks, and slides PNG/SVG files are saved to disk per scene. User can reorder/retiming scenes but cannot modify visual content (only swap with different visual type in Phase 2).

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
- Additional dependencies for Shorts: `playwright`, `mermaid`, `shiki`, `fluent-ffmpeg`, `fal-ai`
- Deployment: Render, Railway, or self-hosted VPS
- Environment: `MONGO_URI`, `JWT_SECRET`, `GITHUB_CLIENT_ID/SECRET`, `EMAIL_USER/PASS`, `INTERNAL_API_KEY`, `CLIENT_ORIGIN`, `SARVAM_API_KEY`, `FAL_AI_API_KEY` (Phase 2), `SHORTS_STORAGE_PATH`
- Port: 3000 (local) → 3000 (production, behind reverse proxy)
- Storage: `./public/videos/` for scenes, audio, final videos (Phase 1) → AWS S3 (Phase 3)

### Flask Service
- Python 3.10+, Flask
- Dependencies: pinecone, sarvamai, python-dotenv, requests, pypdf, nodemailer
- Deployment: Render, Railway, or self-hosted VPS
- Environment: `PINECONE_API_KEY`, `PINECONE_INDEX`, `SARVAM_API_KEY`, `NODE_BASE_URL`, `INTERNAL_API_KEY`
- Port: 5000 (local) → 5000 (production, behind reverse proxy)

### System Dependencies
- **FFmpeg**: Bundled through `ffmpeg-static`; `FFMPEG_PATH` can override the binary path
- **Playwright**: Installs Chromium binary on first use (`npx playwright install chromium`)

### External Services
- **MongoDB Atlas**: Fully managed, no ops overhead
- **Pinecone**: Fully managed vector DB
- **Sarvam AI**: Hosted API; bills per API call (OCR, LLM, embeddings, TTS)
- **GitHub OAuth**: Configured OAuth App (public)
- **Email**: SMTP (e.g. Gmail App Password via nodemailer)
- **Fal.ai**: Optional Phase 2, hosted API for AI image generation

---

## Scaling Considerations

### Current State (MVP)
- Single Flask instance (synchronous, timeout-bound)
- Single Node instance
- No load balancer
- All requests block (OCR, embedding, LLM, video rendering can take 10–60s per request)
- Video files stored locally; no cloud replication

### Bottlenecks
1. **Synchronous OCR**: Sarvam Document Intelligence can take 10–20s for a multi-page PDF
2. **Embedding latency**: Pinecone inference + storage can add 2–5s
3. **LLM inference**: Sarvam chat 30B can take 5–15s per response
4. **TTS latency**: Bulbul v4-flash can add 3–5s per response
5. **Video rendering**: FFmpeg composition can take 15–60s depending on scene count and resolution
6. **Diagram rendering**: Playwright browser automation for Mermaid can add 2–5s per diagram
7. **Disk space**: Storing scenes + audio + videos for all users on single server

### Future (if scaling is needed)
- **Async pipeline**: Queue video render jobs (e.g. Redis + Bull, or Cloud Tasks) → notify user when ready
- **Load balancing**: NGINX or cloud load balancer in front of Node + Flask replicas
- **Caching**: Redis for session tokens, recent queries, frequently accessed chunks, rendered scenes
- **Database indexing**: Add indexes on `(email, doc_id)` in Pinecone queries, `(userId, status)` in shorts collection
- **Rate limiting**: Add `express-rate-limit` on auth routes; per-user rate limits on `/ask` and `/api/shorts/create`
- **Observability**: Logging (e.g. Winston), tracing (e.g. OpenTelemetry), metrics (e.g. Prometheus)
- **Cloud storage**: Migrate `./public/videos/` to AWS S3 with CDN; delete local files after upload
- **Self-hosted SDXL**: Replace Fal.ai with local Stable Diffusion for cost savings (requires GPU)

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
SARVAM_API_KEY=<from-Sarvam-console>
FAL_AI_API_KEY=<from-Fal.ai-console>          # Phase 2
SHORTS_STORAGE_PATH=./public/videos
FLASK_SERVICE_URL=http://localhost:5000
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
- Shorts file URLs are not publicly exposed; only authenticated users can download

### Data at Rest
- Passwords are bcrypt-hashed, never stored plaintext
- OTP tokens are not hashed (acceptable for 15-min expiry)
- Pinecone metadata (email, doc_id) is encrypted at rest (Pinecone's responsibility)
- MongoDB encryption is cloud provider's responsibility (Atlas offers encryption by default)
- Shorts files stored locally with user directory isolation (future: S3 bucket policies)

### Access Control
- User isolation via email + doc_id matching (docs) and userId + shortId matching (shorts)
- GitHub OAuth secrets are environment-only (never in code)
- Internal API key is environment-only
- Shorts files are served only to authenticated owner; no direct file URL exposure

---

## Testing Strategy

### Unit Tests
- Auth service: bcrypt, JWT signing/verification
- Embedding service: chunking logic, embedding generation
- Retrieval service: prompt building, response parsing
- **NEW**: Scene parsing, visual generation (Mermaid, Shiki), video composition

### Integration Tests
- Full auth flow: register → login → GitHub OAuth → logout
- End-to-end ingest: upload → OCR → embed → library sync
- End-to-end query: select doc → ask → response + TTS
- **NEW**: End-to-end shorts: upload script → generate scenes → preview → render → download

### Load Tests
- Concurrent `/ask` requests (10–100 users)
- Concurrent `/ingest` requests (5–10 users)
- Concurrent `/api/shorts/create` requests (5–10 users)
- Monitor timeout behavior, error rates, disk usage

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
- **NEW**: FFmpeg rendering failures → notify ops
- **NEW**: Disk space usage > 80% → notify ops

### Metrics
- Request latency per endpoint (p50, p95, p99)
- Document ingestion success rate
- Vector search latency
- Auth token refresh rate
- **NEW**: Video rendering latency per platform
- **NEW**: Scene generation latency per type
- **NEW**: Disk usage per user (shorts storage)