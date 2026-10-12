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
