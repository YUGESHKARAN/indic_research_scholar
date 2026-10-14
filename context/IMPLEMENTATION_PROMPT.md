# Indic Shorts Implementation — End-to-End Workflow

## Overview

Build the Indic Shorts video creation feature (60s–2min short videos from academic docs) using existing Q&A infrastructure. Implementation in two sequential phases: **Backend First** (schema, APIs, services) → **Frontend Second** (workspace studio UI).

**Reference Docs**:
- `PROJECT_OVERVIEW.md` — Feature specs + success criteria
- `ARCHITECTURE_UPDATED.md` — System design, invariants, service boundaries
- `SHORTS_STACK_FINAL.md` — Tech stack, APIs, dependencies
- `CODE_STANDARDS.md` — File organization, Shorts-specific conventions
- `AI_WORKFLOW_RULES.md` — Spec-driven, incremental workflow

---

## Phase 1: Backend Implementation (Flask + Node.js)

**Goal**: Build all workflows, APIs, storage, and schema. No UI. Fully testable via curl/Postman.

### Step 1.1: MongoDB Schema & Storage Structure

**Owner**: Node.js  
**Scope**: Single file, no API routes yet

**Deliverables**:
- [ ] `./indic_research_assistant_backend/nodejs_service/models/Short.js`
  - Schema: `{ userId, originalFile, userPrompt, title, platform, resolution, scenes[], audioFiles[], videoFile, status, createdAt, updatedAt }`
  - Validation: userId + shortId unique, status enum, platform enum, resolution enum
  - No business logic; pure schema definition

- [ ] Create directory structure:
  ```
  ./indic_research_assistant_backend/nodejs_service/
  ├── routes/shorts.js                          (empty, will fill in Step 1.3)
  ├── services/
  │   ├── scriptParser.js                       (empty, will fill in Step 1.2)
  │   ├── visualGenerator.js                    (empty, will fill in Step 1.2)
  │   ├── videoComposer.js                      (empty, will fill in Step 1.2)
  │   └── falaiService.js                       (empty, Phase 2)
  ├── middleware/shortsAuth.js                  (new, protect routes)
  └── public/videos/
      ├── scenes/                               (empty, runtime storage)
      ├── audio/                                (empty, runtime storage)
      └── final/                                (empty, runtime storage)
  ```

**Verification**:
- `npm run build` passes
- Short model exports successfully
- Directory structure matches CODE_STANDARDS.md

---

### Step 1.2: Scene Generation Services (Node.js)

**Owner**: Node.js  
**Scope**: Three independent services; no routes, no database writes yet

#### 1.2.1: scriptParser.js

**Input**: Markdown/PDF/DOCX file + optional userPrompt; legacy DOC is unsupported in v1  
**Output**: Scenes array with type, content, visual prompts

```javascript
async function parseScript(file, userPrompt) {
  // 1. Extract text from Markdown/DOCX locally and PDF through Flask OCR
  // 2. Split into logical scenes (paragraphs/sections)
  // 3. Classify each scene: "title" | "diagram" | "code" | "concept"
  // 4. Estimate duration per scene (words × 0.3s rule)
  // 5. Generate visual prompts based on content
  // Return: scenes[] with { id, duration, type, content, visual.prompt }
}
```

**Validation**:
- Handles Markdown, PDF (through the internal Flask OCR endpoint), and DOCX; rejects legacy DOC
- Returns valid scene objects
- Duration > 0, < 60s per scene
- Type in enum ["title", "diagram", "code", "concept"]

---

#### 1.2.2: visualGenerator.js

**Input**: Scenes array  
**Output**: Scenes + imagePath for each (PNG/SVG on disk)

```javascript
async function generateVisuals(scenes, shortsId) {
  for each scene {
    if scene.type === "slide" → renderSlide(scene) → PNG
    if scene.type === "diagram" → renderMermaidDiagram(scene) → SVG
    if scene.type === "code" → renderCodeBlock(scene) → PNG
    if scene.type === "concept" → placeholder OR callFalai (Phase 2)
    
    Save to: ./public/videos/scenes/{shortsId}_scene_{index}.{png|svg}
    Return: scene + imagePath + thumbnail (base64)
  }
}
```

**Sub-service: Mermaid Rendering** (via Playwright)
```javascript
async function renderMermaidDiagram(mermaidCode) {
  // Launch Playwright chromium
  // Render mermaid.js in page
  // Screenshot to SVG/PNG
  // Return file path
}
```

**Sub-service: Shiki Code Rendering** (via Playwright)
```javascript
async function renderCodeBlock(code, language) {
  // Use Shiki to highlight
  // Render HTML in Playwright
  // Screenshot to PNG
  // Return file path
}
```

**Validation**:
- All files saved to disk
- File paths match CODE_STANDARDS.md naming
- Dimensions match platform (1920×1080 for YouTube, etc.)
- No missing files on disk

---

#### 1.2.3: videoComposer.js

**Input**: Scenes (with imagePaths) + shortId + platform + resolution  
**Output**: MP4 file saved to disk

```javascript
async function composeVideo(scenes, shortId, platform, resolution, audio) {
  // 1. Load all scene images from disk
  // 2. Determine output dimensions (YouTube 1920×1080, Reels 1080×1920, etc.)
  // 3. Scale scene timings proportionally to the selected WAV duration
  // 4. Build FFmpeg filter complex:
  //    - Scale each image to target resolution
  //    - Add transitions (fade, crossfade)
  //    - Concatenate scenes using their configured durations
  // 5. Run FFmpeg encode (libx264 video, AAC audio, 30fps)
  // 6. Save a language-specific MP4 to ./public/videos/final/
  // 7. Return videoPath + synchronized duration (up to five minutes)
}
```

**FFmpeg Command Template**:
```bash
ffmpeg \
  -loop 1 -framerate 30 -t 5 -i ./public/videos/scenes/short_123_scene_0.png \
  -loop 1 -framerate 30 -t 8 -i ./public/videos/scenes/short_123_scene_1.png \
  -i ./public/videos/audio/short_123_hindi.wav \
  -i ./public/videos/audio/short_123_hindi.wav \
  -c:v libx264 -c:a aac -pix_fmt yuv420p \
  -t {audioDuration} \
  ./public/videos/final/short_123_youtube_1080p_hindi.mp4
```

**Validation**:
- MP4 file exists on disk
- Duration matches the selected language audio
- Codec is H.264/AAC, with the selected narration embedded
- Source language WAV files remain available separately
- File size < 500MB

---

### Step 1.3: MongoDB Schema Integration

**Owner**: Node.js  
**Scope**: Update Short.js to store parsed/generated data

**Schema Fields**:
```javascript
{
  userId: ObjectId (ref Scholar),
  originalFile: String,
  userPrompt: String,
  title: String,
  platform: enum ["youtube", "reels", "tiktok"],
  resolution: enum ["720p", "1080p", "mobile"],
  
  scenes: [{
    id: Number,
    sequenceNumber: Number,
    duration: Number,
    type: enum ["title", "diagram", "code", "concept"],
    content: String,
    visual: {
      type: String,
      imagePath: String,                    // e.g., ./public/videos/scenes/short_123_scene_0.png
      thumbnail: String                     // Base64 preview
    }
  }],
  
  audioFiles: [{
    language: enum [hindi, tamil, telugu, ...],
    file: String,                           // e.g., ./public/videos/audio/short_123_hindi.wav
    duration: Number
  }],
  
  videoFile: String,                        // e.g., ./public/videos/final/short_123_youtube_1080p.mp4
  videoUrl: String,                         // Download URL (Phase 2: S3 URL)
  duration: Number,
  status: enum ["draft", "ready", "archived"],
  createdAt: Date,
  updatedAt: Date
}
```

**Validation**:
- userId required, unique with status check
- Scenes array non-empty
- audioFiles array populated after audio generation
- videoFile set only after rendering succeeds

---

### Step 1.4: Node.js Shorts API Routes

**Owner**: Node.js  
**File**: `./indic_research_assistant_backend/nodejs_service/routes/shorts.js`

**Route 1**: `POST /api/shorts/create`
```javascript
// Input: multipart/form-data { scriptFile, userPrompt, platform, resolution }
// 1. Verify user auth (req.user.id)
// 2. Parse the file and create a draft Short with a generated shortId
// 3. Generate scene visuals, then save the completed draft in MongoDB
// 4. Return { shortId, title, scenes, totalDuration, platform, resolution }
```

**Route 2**: `PATCH /api/shorts/:shortId/scenes`
```javascript
// Input: { scenes: [{id, duration, visual: {...}}] }
// 1. Verify user owns short (req.user.id === short.userId)
// 2. Validate scene structure (no type changes, only duration/reorder)
// 3. Update MongoDB short.scenes
// 4. Return { success: true, shortId }
```

**Route 3**: `POST /api/shorts/:shortId/render`
```javascript
// Input: { language, platform, resolution }
// 1. Verify user owns short
// 2. Call Flask audio generation → save WAV file
// 3. Update MongoDB audioFiles array
// 4. Call videoComposer(scenes, audioFile, platform, resolution)
// 5. Update MongoDB videoFile, status: "ready"
// 6. Return { videoUrl, duration, audioFile }
```

**Route 4**: `GET /api/shorts/:shortId/audio/:language`
```javascript
// 1. Verify user owns short
// 2. Find audioFile by language
// 3. Return file download (audio/{shortId}_{language}.wav)
```

**Route 5**: `GET /api/shorts/list`
```javascript
// 1. Verify user auth
// 2. Query MongoDB: { userId: req.user._id }
// 3. Return array of shorts (minimal fields: id, title, platform, status, createdAt)
```

**Validation**:
- All routes return correct status codes (200, 201, 400, 401, 404)
- Error messages include user-friendly context
- No unhandled exceptions
- Database queries include userId filter (security)

---

### Step 1.5: Flask Audio Generation Endpoint

**Owner**: Flask  
**File**: `./indic_research_assistant_backend/flask_service/sarvam_integration/shorts_audio.py`

**Endpoint**: `POST /api/shorts/audio/generate`

```python
@app.route('/api/shorts/audio/generate', methods=['POST'])
def generate_shorts_audio():
    data = request.json
    script = data['script']
    language = data['language']      # hindi, tamil, telugu, etc.
    short_id = data['shortId']
    
    # 1. Validate inputs
    if not script or len(script) < 10:
        return {"error": "Script too short"}, 400
    
    # 2. Call Sarvam Bulbul v4-flash TTS
    audio_response = requests.post(
        'https://api.sarvam.ai/v1/text-to-speech',
        json={
            'model': 'bulbul:v4-flash',
            'text': script,
            'language': language,
            'voice_name': 'default'
        },
        headers={'api-key': SARVAM_API_KEY}
    )
    
    if audio_response.status_code != 200:
        return {"error": f"Sarvam API failed: {audio_response.text}"}, 500
    
    # 3. Decode audio and save to disk
    audio_data = audio_response.json()
    audio_base64 = audio_data['audio']
    audio_bytes = base64.b64decode(audio_base64)
    
    audio_file = f"public/videos/audio/{short_id}_{language}.wav"
    os.makedirs(os.path.dirname(audio_file), exist_ok=True)
    
    with open(audio_file, 'wb') as f:
        f.write(audio_bytes)
    
    # 4. Calculate duration
    duration = librosa.get_duration(filename=audio_file)  # or scipy.io.wavfile
    
    # 5. Return response
    return {
        'success': True,
        'audioFile': audio_file,
        'language': language,
        'duration': duration
    }
```

**Validation**:
- WAV file exists on disk at correct path
- Audio duration > 0 and < 300s
- Sarvam API errors handled gracefully

---

### Step 1.6: Integration Testing (Backend)

**Scope**: All services wired together; test via curl/Postman

**Test Scenarios**:
1. Upload script → parse → generate scenes → return preview
   - curl: `POST /api/shorts/create -F scriptFile=@test.md`
   - Verify: scenes array, imagePaths exist on disk

2. User edits scenes → save configuration
   - curl: `PATCH /api/shorts/{id}/scenes -d '{...}'`
   - Verify: MongoDB updated, imagePaths unchanged

3. Generate audio for all 8 languages
   - curl: `POST /api/shorts/{id}/render -d '{"language":"hindi"}'`
   - Verify: WAV file on disk, duration > 0

4. Render video → MP4 file on disk
   - curl: `POST /api/shorts/{id}/render -d '{"platform":"youtube","resolution":"1080p"}'`
   - Verify: MP4 file exists, playable in browser

5. Fetch shorts list
   - curl: `GET /api/shorts/list`
   - Verify: Array of user's shorts, no data leakage

**Definition of Done** (Backend):
- [ ] All 5 API routes respond correctly
- [ ] No unhandled exceptions in Node or Flask logs
- [ ] All files (PNG/SVG, WAV, MP4) exist on disk
- [ ] MongoDB schema stores all fields
- [ ] Audio can be swapped without re-rendering video
- [ ] `npm run build` passes
- [ ] No violations of ARCHITECTURE_UPDATED.md invariants (esp. #3, #9, #13)

---

## Phase 2: Frontend Implementation (React + Tailwind)

**Goal**: Build workspace studio UI for shorts creation. Wire to backend APIs. Full end-to-end feature.

### Step 2.1: WorkspaceShorts Component Structure

**File**: `./indic_research_assistant_frontend/src/pages/WorkspaceShorts/index.jsx`

```jsx
function WorkspaceShorts() {
  const [activeTab, setActiveTab] = useState('creator'); // creator | preview | player
  
  return (
    <div className="workspace-shorts">
      {activeTab === 'creator' && <ShortsCreator onComplete={setActiveTab} />}
      {activeTab === 'preview' && <ScenePreview onConfirm={setActiveTab} />}
      {activeTab === 'player' && <VideoPlayer onBack={setActiveTab} />}
    </div>
  );
}
```

---

### Step 2.2: ShortsCreator Component

**File**: `./indic_research_assistant_frontend/src/pages/WorkspaceShorts/ShortsCreator.jsx`

**UI**:
- File upload input (Markdown/PDF/DOCX)
- Optional "Additional context" text area
- Platform selector (YouTube, Reels, TikTok) — radio buttons or pills
- Resolution selector (720p, 1080p, Mobile) — dropdown or pills
- "Generate Scenes" button (disabled while uploading)
- Loading state with progress message

**Logic**:
```javascript
async function handleGenerate() {
  const formData = new FormData();
  formData.append('scriptFile', file);
  formData.append('userPrompt', userPrompt);
  formData.append('platform', platform);
  formData.append('resolution', resolution);
  formData.append('language', language);
  
  setLoading(true);
  try {
    const { data } = await api.post('/api/shorts/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    setShortId(data.shortId);
    setScenes(data.scenes);
    onComplete('preview');  // Switch to preview tab
  } catch (error) {
    setError(error.response?.data?.error || 'Failed to generate scenes');
  } finally {
    setLoading(false);
  }
}
```

**Styling**:
- Follow CODE_STANDARDS.md + existing design system
- Two-column layout (form left, preview right on desktop)
- Mobile: single column, form first
- Use Tailwind + premium design tokens (GitHub blue accent, Inter typography)

**Validation**:
- File required (Markdown/PDF/DOCX only)
- Platform required
- Resolution required
- Error messages display correctly
- Loading spinner shows during API call

---

### Step 2.3: ScenePreview Component (Timeline Editor)

**File**: `./indic_research_assistant_frontend/src/pages/WorkspaceShorts/ScenePreview.jsx`

**UI**:
- Timeline view: horizontal list of scenes (left to right)
  - Each scene shows: thumbnail, type icon, duration, sequence number
  - Draggable to reorder
  - Click to expand details
- Scene detail panel (right side, sticky)
  - Thumbnail preview
  - Type, duration (editable), content
  - "Duration" input (user can adjust 1–60s per scene)
  - "Render Video" button (disabled until user confirms all scenes)
- Total duration indicator (sums all scenes)

**Logic**:
```javascript
async function handleConfirm() {
  // Validate scenes
  if (scenes.length === 0) return setError('No scenes to render');
  
  // Save scene configuration
  setLoading(true);
  try {
    await api.patch(`/api/shorts/${shortId}/scenes`, { scenes });
    onConfirm('player');  // Move to video player
  } catch (error) {
    setError(error.response?.data?.error || 'Failed to save scenes');
  } finally {
    setLoading(false);
  }
}
```

**Drag & Drop** (using react-beautiful-dnd or native):
```javascript
function handleDragEnd(result) {
  const { source, destination } = result;
  if (!destination) return;
  
  const newScenes = Array.from(scenes);
  const [moved] = newScenes.splice(source.index, 1);
  newScenes.splice(destination.index, 0, moved);
  
  // Update sequenceNumber for each
  newScenes = newScenes.map((s, i) => ({ ...s, sequenceNumber: i + 1 }));
  setScenes(newScenes);
}
```

**Styling**:
- Scene cards: rounded, subtle shadow, hover effect
- Timeline: horizontal scroll on mobile, full width on desktop
- Duration input: number field with +/– buttons
- Total duration badge: sticky, top-right corner

**Validation**:
- Drag reordering reflects in UI
- Duration changes save to state
- Confirm button enables only when scenes modified
- No type changes allowed (UI should show immutable type)

---

### Step 2.4: VideoRender & AudioGeneration Flow

**File**: `./indic_research_assistant_frontend/src/pages/WorkspaceShorts/VideoPlayer.jsx`

**UI**:
- Video preview player (or placeholder while rendering)
- "Rendering video…" progress indicator (15–60s)
- Language selector (8 Indic languages as pills)
- Language selector (render the matching synchronized MP4)
- "Download" button (MP4 file)
- "Back to Preview" button (to edit scenes)

**Logic** (Trigger Render):
```javascript
useEffect(() => {
  if (shortId && !videoUrl) {
    handleRender();
  }
}, [shortId]);

async function handleRender() {
  setRendering(true);
  try {
    // Generate/reuse the selected voice track and mux it into the rendered video.
    const { data } = await api.post(`/api/shorts/${shortId}/render`, {
      language: selectedLanguage,
      platform,
      resolution
    });
    
    setVideoUrl(data.videoUrl);
    setDuration(data.duration);
    setAudioFile(data.audioFile);
  } catch (error) {
    setError(error.response?.data?.error || 'Video rendering failed');
  } finally {
    setRendering(false);
  }
}

async function handleSwapAudio(language) {
  let data;
  try {
    ({ data } = await api.get(`/api/shorts/${shortId}/audio/${language}`));
  } catch (error) {
    if (error.response?.status !== 404) throw error;
    ({ data } = await api.post(`/api/shorts/${shortId}/audio/${language}`));
  }
  // Render a language-specific MP4 with this WAV embedded.
  const { data } = await api.post(`/api/shorts/${shortId}/render`, {
    language,
    platform,
    resolution
  });
  setVideoUrl(data.videoUrl);
  setSelectedLanguage(language);
}
```

**Styling**:
- Video player: responsive (full width on mobile, centered on desktop)
- Progress bar: animated, shows rendering status
- Language pills: active state (blue accent), hover effect
- Download button: prominent (primary color)

**Validation**:
- Video plays without errors
- Audio swaps without page reload
- Download works (file saves locally)
- Progress indicator updates during rendering
- Error messages display if rendering fails

---

### Step 2.5: Integration with WorkspaceSidebar

**File**: `./indic_research_assistant_frontend/src/pages/Workspace.jsx` (update existing)

Add "Shorts" tab to sidebar:
```javascript
const WORKSPACE_ITEMS = [
  { id: 'qa', name: 'Q&A', ... },
  { id: 'document', name: 'Document', ... },
  { id: 'shorts', name: 'Shorts', icon: '🎬', description: 'Create short videos' },
  { id: 'test', name: 'Mock Test', ... }
];

// In Workspace.jsx:
{activeTab === 'shorts' && <WorkspaceShorts />}
```

**Styling**:
- Sidebar icon: 🎬 or video camera emoji
- Active state: blue highlight, matching Q&A/Document styles

---

### Step 2.6: Full End-to-End Testing

**Test Scenarios**:
1. Upload markdown script → scenes generate → preview shows thumbnails
   - Verify: thumbnails loaded, types correct, sequenceNumbers correct

2. Drag scene to reorder → click confirm → API updates
   - Verify: order changes in UI, API called with correct payload

3. Edit scene duration → save
   - Verify: duration in state updates, reflects in total duration

4. Render video → wait 30–60s → video plays
   - Verify: progress indicator shows, video player appears, playback works

5. Swap audio (language selector) → new audio loads
   - Verify: the matching language-specific MP4 is rendered with audio embedded and synchronized

6. Download video → file appears locally
   - Verify: MP4 file saved to Downloads folder, playable

**Definition of Done** (Frontend):
- [ ] All 3 components render without errors
- [ ] File upload works (Markdown/PDF/DOCX recognized; legacy DOC rejected)
- [ ] Scenes generate and thumbnails display
- [ ] Drag-to-reorder works
- [ ] Duration editing works
- [ ] Video rendering shows progress
- [ ] Selecting a language renders a matching MP4 with synchronized embedded narration
- [ ] Download works
- [ ] Mobile responsive (single column, readable on 375px width)
- [ ] Styling matches existing design system (Inter, GitHub blue, neutral palette)
- [ ] All error states handled (file too large, API timeout, Sarvam error, etc.)
- [ ] `npm run build` passes
- [ ] No console errors or warnings

---

## Phase 3: Production Readiness (Deferred)

- [ ] Async job queue for long video renders (Bull/BullMQ)
- [ ] AWS S3 storage (migrate from local filesystem)
- [ ] Fal.ai integration for AI concept images
- [ ] Progress email notifications
- [ ] Rate limiting (`express-rate-limit`)
- [ ] Monitoring & alerts (disk space, render failures)

---

## Success Criteria (Full Feature)

1. **Backend**:
   - All 5 API routes functional and tested
   - Scenes, audio, and video files stored correctly
   - Audio swap works without re-render
   - No data leakage (userId isolation enforced)

2. **Frontend**:
   - ShortsCreator: Upload → generate scenes preview
   - ScenePreview: Drag-to-reorder, duration editing
   - VideoPlayer: Render → audio swap → download
   - Mobile responsive, premium UI design

3. **End-to-End**:
   - User uploads script → sees scenes → edits timing → renders video → downloads MP4
   - All 8 Indic languages supported
   - Feature integrates seamlessly with existing Q&A workspace

---

## Commit & Documentation

After each phase completes:
1. Commit code with attribution (see system reminder)
2. Update `progress-tracker.md` with completed items
3. Update `ARCHITECTURE_UPDATED.md` if any design changes discovered
