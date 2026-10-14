# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- Workspace-first product flow is being implemented — the app is being migrated from standalone pages to a premium studio experience with Q&A embedded inside the workspace shell

## Current Goal

- Add a dedicated authenticated workspace studio shell, route it into the app, and update navigation to direct users into the new workspace-first experience while preserving the existing Q&A implementation

## Completed

- Product foundation and multi-service structure are in place across frontend, Node.js backend, and Flask backend
- Landing page and research-assistant onboarding flow are implemented with CTA paths for document ingestion and Q&A
- Authentication flow has been implemented: register, login, logout, JWT session handling, GitHub OAuth callback, and protected routes
- Document ingest flow is implemented on the frontend and backend: file upload, metadata capture, and integration with the Flask ingestion endpoint
- Retrieval / Q&A flow is implemented: document selection, prompt submission, multilingual answer output, copy actions, and optional voice playback
- Node.js document library APIs are implemented for fetching the logged-in user's documents and registering docs that are ingested by Flask
- Flask-side workflow scaffolding is present for OCR, chunking, embeddings, retrieval, translation, and TTS usage
- Shared UI shell and theme styling are in place for the application experience
- Workspace studio shell has been created with a premium floating/fixed sidebar and route-based layout handling
- Navbar navigation now includes a direct Workspace entry and landing CTAs point into the studio experience
- The workspace sidebar icon import issue was fixed by replacing the unavailable `FiSparkles` export with a supported icon from the `react-icons/fi` set
- Q&A document, response-language, and voice controls now appear as a nested module below the active Q&A Studio item in the main studio sidebar
- The Research Studio "+" action and sidebar upload action now navigate to the document upload page
- Q&A controls use the full available sidebar width with typography and a subtle divider to indicate nesting, without a separate panel background
- Q&A Studio controls can be independently expanded or collapsed with a rotating chevron; they appear slightly indented on a subtle theme-matched background
- Voice response control uses the animated toggle style from the original Q&A controls
- Removed the redundant bottom sidebar upload button; the Research Studio "+" remains the upload shortcut
- Added a light, theme-aware scrollbar style to workspace scrolling areas and the embedded Q&A conversation/speaker list
- Updated Q&A document and language dropdowns and speaker selector surfaces for consistent dark-theme backgrounds, readable text, and amber focus/selection states
- Improved the voice-response switch contrast and keyboard focus styling to match the studio theme
- Redesigned Q&A messages into distinct user and assistant conversation layouts with readable long-form response typography, metadata, and response actions
- Assistant answers now render common Markdown structures, including headings, emphasis, links, lists, code blocks, blockquotes, tables, and horizontal rules
- New prompts and generated answers smoothly scroll the conversation viewport back to the latest user question
- Compactened Q&A conversation spacing, response typography, message padding, and composer dimensions for a denser premium layout while keeping the embedded chat at full available viewport height
- Improved visibility of chat content, metadata, composer labels, and error messages while retaining clear visual hierarchy
- Fixed the voice transcription response contract: Flask `/transcribe` now returns the full JSON result (transcript, answer, and audio) instead of only the answer string
- Voice capture now selects a browser-supported recording MIME type, uploads a filename matching the captured format, and shows an explicit error if no transcript is returned
- Workspace top navigation now keeps the authenticated user profile at the top-right with a profile dropdown and logout action; the header upload button and `CMD /workspace` indicator have been removed
- Moved account identity and logout access from the bottom of the studio sidebar into the top-right profile menu to avoid duplicate account controls

## In Progress

- Finalizing the workspace studio experience as the new primary authenticated entry point
- Binding Q&A into the workspace shell without disrupting the existing standalone Q&A route
- Validating layout behavior and route handling for desktop/mobile sidebar experience

## Next Up

- Finalize the actual workspace task modules for Q&A, documents, presentation, and settings states
- Decide whether to keep the legacy `/ask` and `/ingest` pages as fallback entry points or retire them in favor of the studio shell
- Validate the app in a real browser session with the workspace shell and Q&A flow working together
- Expand the workspace into future mock tests and presentation builder modules upon approval

## Open Questions

- Should the legacy `/ask` and `/ingest` pages remain as fallback routes or be retired once the workspace is fully adopted?
- Is the workspace studio intended to replace the current standalone screens completely in the next release?
- Are mock tests and presentation formatting still required in the current roadmap before the workspace is considered feature-complete?

## Architecture Decisions

- Frontend auth is handled through protected routes backed by JWT sessions issued by the Node.js service
- The Flask service owns OCR, chunking, embeddings, retrieval, translation, and TTS orchestration while Node.js owns user identity and doc ownership metadata
- Document ownership is enforced by combining user identity and document ID metadata during Pinecone-based retrieval
- Flask registers ingested documents with Node via an internal API key after successful processing
- Conversation history remains client-side/local for now; a dedicated database-backed history flow is still a future enhancement
- A workspace-first layout is now the primary UI model: desktop uses a fixed left sidebar and mobile uses a slide-over overlay without pushing the content area
- The Q&A feature is the first feature being embedded inside the workspace, with future modules mounted into the same shell

## Session Notes

- The project is no longer limited to standalone feature pages; the workspace studio is now being introduced as the default premium interaction surface
- The Q&A flow is already implemented and has been integrated into the workspace shell, while the route structure is updated to support future studio sections
- The embedded Q&A view no longer renders its own duplicate controls sidebar; its control state is surfaced to the shared studio navigation sidebar
- Q&A controls remain connected to retrieval state, so document/language/voice selections affect the existing Q&A request flow
- Q&A Studio navigation and expansion are separate interactions: the label navigates to Q&A, while its chevron toggles the child controls
- Q&A scroll anchoring targets the newest user message and runs within the conversation viewport, both after prompt submission and after the assistant response arrives
- Markdown response rendering uses safe React elements rather than interpreting raw HTML or adding a new runtime package
- Q&A conversation rendering and scrolling updates were validated with editor diagnostics; no errors reported in the changed component
- Workspace-only scrollbar styling uses a subtle light thumb with an amber hover state
- Workspace dropdown menus use slate surfaces with high-contrast text; the voice switch has distinct on/off track colors and a visible focus ring
- Editor diagnostics report no errors in the modified workspace, Q&A, speaker selector, and stylesheet files
- Build execution remains unavailable in the current Windows sandbox; editor diagnostics report no errors in the changed frontend files
- Navigation and landing-page CTAs now push users toward the workspace rather than forcing them to start in the legacy pages
- Validation is constrained by environment sandboxing, so front-end build verification is limited to static review unless a supported build environment is available
- A runtime import issue was resolved by changing the unsupported `FiSparkles` icon to a valid `react-icons/fi` export (`FiZap`)

## Indic Shorts Implementation

- Current unit: Verifying the completed Shorts creator, editor, renderer, and language-audio workflow
- Completed: Added the Mongoose `Short` schema; added an internal PDF-only Flask extraction endpoint that reuses Sarvam OCR without Pinecone side effects; added Node parsing for Markdown, DOCX, and PDF handoff, including scene classification, duration estimates, and input limits; added Playwright visual generation for title/concept slides, Mermaid diagrams, and Shiki-highlighted code; added FFmpeg composition of platform-sized H.264 videos with synchronized selected-language narration
- Completed: Added authenticated Node `POST /api/shorts/create` and `PATCH /api/shorts/:shortId/scenes` routes; mocked-persistence smoke checks covered authentication, scene reorder/retiming, immutable visuals, ownership isolation, video invalidation, and audio preservation
- Completed: Added the internal Flask Bulbul WAV endpoint with language-compatible voice/model mappings, UUID/script validation, 300-second WAV validation, atomic writes to shared Shorts storage, and explicit Sarvam/storage errors; Malayalam uses Bulbul v3 because v4-flash has no Malayalam persona
- Completed: Added authenticated Node render orchestration, language WAV reuse, owner-scoped audio metadata and streaming, protected language-specific MP4 streaming, short details, and an owner-scoped Shorts list
- Completed: Added confirmed library deletion with an owner-scoped API and cleanup of that Short's generated scene images, language WAVs, and rendered MP4s; cleanup failures keep the record so deletion can be safely retried
- Completed: Added the authenticated Shorts workspace creator, scene editor, render/player view, language selection with on-demand WAV generation, and Shorts navigation
- Fixed: Shorts narration now splits longer scripts into Sarvam-compliant 2,500-character TTS requests and combines compatible WAV chunks, while preserving the existing 3,500-character overall input limit
- Fixed: Shorts TTS no longer sends the legacy `shubh` speaker to Bulbul v4-flash; each supported language now selects a compatible V4 persona, with explicit V3 fallback for Malayalam, and provider validation failures return a clear configuration error
- Completed: Replaced raw Markdown-block scene creation with Sarvam LLM preparation that uses the uploaded document as factual reference and the user's brief as the topic/audience/language/runtime direction; generated spoken narration is kept separate from on-screen copy and visuals, so metadata and visual instructions are not read aloud
- Fixed: Explicit runtimes in the document or user brief (including “make this a 2 minute explainer”) are passed to Sarvam, and generated scene durations are allocated to sum exactly to the requested runtime; requested source scene counts are preserved when feasible, including when the runtime must be inferred
- Fixed: Empty or missing Sarvam chat completion content is validated before parsing, avoiding a `None.strip()` exception and returning a clear 502 response that asks the caller to retry
- Improved: Shorts LLM generation disables Sarvam's reasoning mode (`reasoning_effort=None`) and caps the concise scene-JSON response at 2,500 tokens; empty completions log only safe response metadata (`finish_reason` and whether reasoning content exists), without exposing the submitted document
- Improved: Shorts scene review now labels and previews on-screen content separately from spoken narration; the creator brief invites users to state the topic, audience, language, and target runtime
- Completed: Added `shorts-test-assets/Bulbul_V4_Flash_Launch.md`, a developer-focused launch explainer script with Sarvam performance claims clearly attributed and an automatically classified speech-workflow diagram scene
- Draft shorts may have an empty `scenes` array; generation/render endpoints must validate that scenes exist before attempting video composition
- Input decision: Markdown and DOCX will be parsed in Node; legacy DOC is unsupported in v1
- Audio/video decision: Source WAVs are retained per language; each selected language renders a matching MP4 with its narration embedded and scene timings scaled to the audio duration (maximum five minutes)
- Validation (initial silent-video prototype): Parser/schema checks passed; mocked Flask script-extraction and audio-route checks passed; browser rendering produced expected PNG scenes and compact thumbnails; FFmpeg composed and decoded an H.264 MP4 with the expected dimensions/duration; authenticated create/scene-update route checks passed with Mongo persistence mocked. A live Sarvam API request was not made
- Validation: Flask audio tests (8), Node Shorts render API tests (12), and the FFmpeg media composer regression test pass; coverage includes per-language locale/voice/model selection, long-script splitting at 2,500 characters, WAV combination, synchronized durations beyond 120 seconds, language-specific downloads, and an actual MP4 with H.264/AAC streams whose duration matches its WAV. Shorts-focused ESLint and frontend production build pass. Full frontend ESLint still reports 17 existing errors and one warning outside the Shorts page components; the build reports the existing >500 KB chunk warning
- Validation: The Bulbul V4 Flash script parsed into nine scenes; all nine visuals generated and FFmpeg produced a verified 1280x720 H.264 MP4. Audio muxing and duration matching are now covered by the updated focused render tests; live Sarvam/MongoDB playback remains unverified
- Not yet verified: The Shorts empty state rendered with mocked authentication, but the browser create/edit/render/language-swap flow did not complete. A live Sarvam/Mongo-backed run also remains unverified because service credentials, shared storage, and database configuration were not exercised
- Not yet verified: A live authenticated Sarvam/MongoDB Shorts workflow remains untested; the previous browser session returned 401 without an authenticated session and a live Sarvam request was avoided
- Fixed: The Shorts renderer now scales scene timings to the selected WAV (up to 300 seconds), embeds that narration in a language-specific MP4, and updates playback/download to use that synchronized file
- Validation: Node Shorts render tests (13 total, including actual FFmpeg composition) and Shorts-focused ESLint/frontend build pass; a 202-second audio regression verifies the render timeline is extended beyond the old 120-second cap. A live Sarvam request remains unverified
- Validation: Node API tests (15) pass, including successful media cleanup, preservation of unrelated assets, unauthenticated rejection, and owner-filtered not-found behavior; Shorts-focused ESLint passes
- Validation: A local FFmpeg composition probe confirmed the generated MP4 contains H.264 video and AAC audio at the selected two-second target duration
- Validation: Latest focused Node parser/render/media tests (19) and Flask Shorts audio/script tests (13) pass; Shorts-only ESLint and the frontend production build pass (with the existing large-chunk warning). The new tests cover the 90-second/four-scene example, prompt-over-document runtime precedence, separate narration/visual output, explicit “make this a 2 minute” duration parsing, overlong narration rejection, and scene-count preservation when no total runtime is supplied. Pylance found no errors in the changed Flask files; the only workspace diagnostics are pre-existing unused imports in `app.py` and `stt_service.py`
- Validation: Flask Shorts audio/script tests (14) pass, including a Sarvam completion with `message.content=None`; the malformed response now logs a specific validation warning and returns the expected 502 without an AttributeError. Pylance reports no syntax errors in the updated endpoint
- Validation: All 15 Flask Shorts audio/script tests passed after the initial low-reasoning change and empty/missing completion guards; changed endpoint had no Pylance diagnostics or syntax errors. Live Sarvam output remained unverified at that stage
- Validation: After disabling reasoning and reducing the response cap, all 15 Flask Shorts tests and all 19 Node script-parser/render/FFmpeg tests pass; the real media test confirms MP4 composition and the mock-backed render route confirms audio-to-video handoff and persisted ready metadata. A live Sarvam-backed render was not run
- Not yet verified: Live Sarvam LLM/TTS and authenticated database-backed Shorts generation remain untested; mocked tests verify the service contract and runtime allocation, not provider speech timing. Narration is checked against a three-words-per-second upper bound before a Short is created, but actual generated audio duration depends on live voice delivery
- Fixed: Video composition no longer fails when actual narration is shorter than the planned scene timeline; it scales the scene sequence to the WAV duration so the final MP4 ends with the selected narration instead of a silent tail. Render responses expose both actual and planned durations
- Improved: Added structured Node logs for cached/generated WAV duration, narration character/word counts, per-scene planned timings, render start/completion durations, and render errors; logs exclude narration text
- Validation: 23 focused Node Shorts parser/render/FFmpeg tests pass, including real MP4 composition when audio is shorter than the scene timeline; 20 Flask Shorts audio/script tests pass. Live Sarvam speech timing remains unverified
- Fixed: Shorts scene preparation now retries once for empty, malformed/truncated, or schema-invalid Sarvam output; JSON parsing accepts fenced/annotated JSON and text-block responses. Structured logs include safe response metadata and validation issue, never source or generated text
- Validation: All 23 Flask Shorts audio/script tests pass, including recovery from empty and malformed model completions; Pylance reports no syntax errors or diagnostics for the changed preparation endpoint
- Next: Complete an authenticated browser/API workflow with configured shared storage, `INTERNAL_API_KEY`, `FLASK_SERVICE_URL`, Sarvam credentials, and MongoDB
- Added English to Shorts scene/render voice selectors, script language detection, the Short model's accepted language list, and Bulbul v4-flash narration mapping (`girish_en_documentary` / `en-IN`).
- Added English API render coverage that verifies the voice language, language-specific WAV and MP4 URLs, and embedded audio metadata.
- Added playback readiness/error state keyed to the active video source. The loading overlay remains until `canplay`, while a failed render no longer resets readiness for the previous playable video.
- Validation: 25 focused Node Shorts parser/render/composer tests and 23 Flask Shorts audio/script tests pass; Shorts frontend ESLint and production build pass (with the existing large-chunk warning). Provider behavior is mock-tested; no live Sarvam request was made.
