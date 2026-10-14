# Code Standards

## General

- Keep modules small and single-purpose
- Fix root causes, do not layer workarounds
- Do not mix unrelated concerns in one
  component or route

## JavaScript

- Follow Existing Architecture and Coding Conventions
- Write Modular, Readable and Maintainable Code
- Enforce Security and Robust Input Validation
- Preserve Existing Functionality and Minimize Changes
- Verify Every Change Before Completion

## Reactjs-vite

- Component Architecture and Code Reusability
- Correct React State Management and Rendering
- Performance, Responsive UI, and User Experience
- API Integration, Security, and Error Handling
- Testing, Build Verification, and Minimal Changes

## Styling

- Follow Existing Design System and Tailwind Conventions
- Build Reusable, Maintainable UI Components
- Enforce Responsive Design and Accessibility
- Maintain Consistent Visual States and UI Polish
- Validate Styling and Prevent Regressions

## API Routes

- Centralize Axios Configuration and API Clients
- Keep API Routes and Request Logic Separate from UI Components
- Handle Authentication and Interceptors Securely
- Implement Reliable Loading, Error, and Request Handling
- Verify API Contracts and Protect Existing Functionality

## Data and Storage

- User data belongs in the MongoDB database
- Uploaded document vectors and its metadata belongs to pinecone vectorDB
- For Q&A chat conversation history currently stores in localStorage, 
  should be replaced to dedicated database in future
- Shorts metadata (shortId, scenes, audioFiles, status) belongs in MongoDB
- Rendered shorts files (PNG/SVG scenes, WAV audio, MP4 video) stored in local filesystem (`./public/videos/`)
  - Future: migrate to AWS S3 in Phase 3

## File Organization

- `./indic_research_assistant_frontend/` — all the frontend files belong to this folder.
  - `./src/pages/WorkspaceShorts/` — Shorts creation UI (ShortsCreator, ScenePreview, VideoPlayer)

- `./indic_research_assistant_backend/` — both nodejs and flask backend belongs to this folder 

- `./indic_research_assistant_backend/nodejs_service/` — primary service where all the users routes, services and controllers 
  belongs to this folder.
  - `./routes/shorts.js` — All shorts API endpoints (create, update, render, list, audio)
  - `./services/scriptParser.js` — Parse MD/PDF/Doc → extract scenes
  - `./services/visualGenerator.js` — Render Mermaid/Shiki/slides → PNG/SVG
  - `./services/videoComposer.js` — Compose scene visuals → silent FFmpeg MP4; retain language WAVs separately
  - `./services/falaiService.js` — Call Fal.ai API for AI images (Phase 2)
  - `./models/Short.js` — MongoDB schema for shorts metadata
  - `./public/videos/` — Shorts file storage (scenes/, audio/, final/)

- `./indic_research_assistant_backend/flask_service/` — all the AI services, controllers and workflows belongs to this folder.
  - `./sarvam_integration/shorts_audio.py` — Generate audio WAV files via Bulbul v4-flash TTS

## Indic Shorts Specific Standards

### Scene Management
- Script inputs: Markdown and DOCX are parsed in Node; PDF text is extracted by the internal Flask OCR endpoint; legacy DOC is unsupported in v1
- Each scene is immutable once rendered to disk (PNG/SVG file)
- Phase 1 visual renderers generate platform-sized PNG scene files and compact PNG thumbnails; Mermaid code fences are rendered as diagrams
- Scene duration is user-configurable post-generation
- Scene reordering is allowed; scene type cannot change
- Scenes stored in MongoDB document with imagePath reference

### Audio Generation
- Audio files are generated separately per language
- Audio files NOT baked into video (stored as separate WAV)
- Audio can be regenerated independently without re-rendering video
- All 8 Indic languages: Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati

### Video Rendering
- FFmpeg handles all video composition (local, synchronous)
- Output formats: YouTube (16:9), Reels (9:16), TikTok, Mobile (1:1)
- Resolution options: 720p, 1080p, Mobile-optimized
- Video rendering is synchronous (Phase 2 may add async jobs)

### File Paths
- Scenes: `./public/videos/scenes/{shortId}_scene_{sceneIndex}.{png|svg}`
- Audio: `./public/videos/audio/{shortId}_{language}.wav`
- Videos: `./public/videos/final/{shortId}_{platform}_{resolution}.mp4`

### API Contracts
- All shorts endpoints require authenticated user (JWT)
- Shorts ownership enforced: `req.user._id === short.userId`
- Audio endpoint expects: `{ script, language, shortId }`
- Flask Shorts PDF extraction is internal-only (`x-internal-key`), accepts a `file` upload up to 10 MB, and returns `{ text }` without ingesting it into Pinecone
- Video endpoint supports platform/resolution selection

### Error Handling
- Script parsing errors: Return user-friendly message with line number
- Visual generation errors: Fallback to placeholder (Phase 2)
- Audio generation errors: User retries or regenerates
- Video rendering errors: Timeout after 60s, user can retry

## Testing Standards

### Shorts Feature Tests
- Unit: Scene parsing, visual generation timing, video composition
- Integration: Upload → parse → generate → render → download
- Validation: File existence, metadata consistency, format compliance

## Performance Standards

### Acceptable Latencies
- Scene generation: < 10s per script
- Visual rendering: < 2-5s per scene (Mermaid/Shiki), < 15s per AI image
- Audio generation: < 5s per language
- Video composition: 15-60s depending on scene count and resolution

### Resource Limits
- Maximum script file size: 10MB
- Maximum scenes per short: 50
- Maximum languages per short: 8
- Disk storage per user: Monitor, set quota in Phase 2