# Indic Shorts Feature - Final Tech Stack Specification

## Recommended Stack (FINAL)

| Component | Technology | Version | Cost |
|-----------|-----------|---------|------|
| AI Image Generation | Fal.ai (Stable Diffusion 3) | Latest | Free tier testing |
| Diagram Rendering | Mermaid + Playwright | Latest | Free |
| Code Visualization | Shiki + Playwright | Latest | Free |
| Slide Generation | Custom Node + Playwright | Custom | Free |
| Video Composition | FFmpeg (`ffmpeg-static`) | Latest | Free |
| Text-to-Speech | Bulbul v4-flash (Sarvam) | v4-flash | Paid (existing contract) |
| Frontend UI | React 18+ | Latest | Free |
| Storage | Local filesystem (Phase 1) | N/A | Free |

---

## Project Structure

```
indic_research_assistant_backend/
├── flask_service/
│   ├── app.py
│   └── sarvam_integration/
│       ├── __init__.py
│       └── shorts_audio.py                 # NEW: Bulbul TTS for shorts
│
├── nodejs_service/
│   ├── package.json                        # Add: playwright, mermaid, shiki, ffmpeg-static, fal-ai
│   ├── routes/
│   │   └── shorts.js                       # NEW: /api/shorts/* endpoints
│   │
│   ├── services/
│   │   ├── scriptParser.js                 # NEW: Parse MD/PDF/Doc → scenes
│   │   ├── visualGenerator.js              # NEW: Mermaid + Shiki + Slide rendering
│   │   ├── videoComposer.js                # NEW: FFmpeg orchestration
│   │   └── falaiService.js                 # NEW: Fal.ai API integration
│   │
│   ├── middleware/
│   │   └── shortsAuth.js                   # NEW: Protected shorts endpoints (JWT)
│   │
│   ├── models/
│   │   └── Short.js                        # NEW: MongoDB schema for shorts metadata
│   │
│   └── public/
│       └── videos/
│           ├── scenes/                     # Generated PNG/SVG images
│           ├── audio/                      # WAV files per language
│           └── final/                      # Rendered MP4 videos
│
└── indic_research_assistant_frontend/
    └── src/
        └── pages/
            └── WorkspaceShorts/            # NEW: Shorts workspace
                ├── ShortsCreator.jsx       # Upload + scene generation
                ├── ScenePreview.jsx        # Timeline editor
                ├── VideoPlayer.jsx         # Preview final shorts
                └── index.jsx
```

---

## API Endpoints

### **Node.js Shorts API**

#### **POST /api/shorts/create**
Generate scenes from uploaded script
```javascript
Request Body:
{
  "scriptFile": File (Markdown/PDF/DOCX),    // multipart/form-data; legacy DOC is unsupported in v1
  "userPrompt": string,                      // Optional topic, audience, and language hints
  "targetDurationSeconds": number,           // Required; 30–60 seconds, overrides document duration metadata
  "language": string,                        // hindi, tamil, telugu, etc.
  "platform": string,                        // "youtube" | "reels" | "tiktok"
  "resolution": string                       // "720p" | "1080p" | "mobile"
}

Response:
{
  "shortId": string,
  "scenes": [
    {
      "id": number,
      "duration": number,                    // seconds
      "type": string,                        // "title" | "diagram" | "concept" | "code"
      "content": string,
      "visual": {
        "type": string,
        "imagePath": string,                 // Generated PNG/SVG path
        "thumbnail": string                  // Base64 preview
      }
    }
  ],
  "totalDuration": number,
  "targetDurationSeconds": number,           // Final duration; may be 90 after the narration fallback
  "requestedTargetDurationSeconds": number,
  "platform": string,
  "resolution": string
}
```

The user chooses the authoritative 30–60 second target in the creator. If narration remains too short after a retry at that duration, script preparation may make one final attempt at 90 seconds; the response and scene durations report that fallback.

#### **PATCH /api/shorts/:shortId/scenes**
Update scene configuration before rendering
```javascript
Request Body:
{
  "scenes": [
    {
      "id": number,
      "duration": number,                    // Editable scene timing
      "narration": string,                   // Original/source spoken narration
      "narrationTranslations": {              // Editable target-language text by language
        "tamil": string
      }
    }
  ]
}

Response:
{ "success": true, "shortId": string }
```

Edited narration is trimmed and saved before rendering. Empty narration is rejected, and the combined narration for each language across all scenes is limited to 3,500 characters. Changing source or translated narration invalidates saved language audio and rendered video. Source narration edits clear stale translations.

#### **POST /api/shorts/:shortId/translate/:language**
Translate source narration for the scene editor and return one editable narration per scene.
```javascript
Response:
{
  "language": string,
  "scenes": [{ "id": number, "narration": string }]
}
```

Translations are stored per scene and language while the original `narration` remains unchanged. Editing translated narration persists it in `narrationTranslations`; rendering uses a complete saved translation directly, avoiding a second translation pass.

#### **POST /api/shorts/:shortId/render**
Synthesize or reuse the selected language WAV, then render a synchronized MP4 with the selected-language narration embedded. If a complete editor translation is not stored, the audio service translates the source narration before synthesis.
```javascript
Request Body:
{
  "language": string,                        // Target language
  "speaker": string,                         // Optional Sarvam speaker ID for the selected language
  "platform": string,                        // Output format
  "resolution": string
}

Response:
{
  "videoId": string,
  "videoUrl": string,                        // Download path
  "duration": number,
  "audioFile": string,                       // Source WAV retained for this language
  "audioDuration": number,
  "speaker": string                          // Selected voice; remembered with the language track
}
```

Scene timings are proportionally extended or shortened to match the selected narration, up to five minutes. Each language has its own rendered MP4; selecting another language displays its saved or newly translated narration, then renders or reuses the selected speaker's synchronized voice and video. Speaker choice is remembered per language on the Short; selecting a different speaker regenerates that language's WAV.

#### **POST /api/shorts/:shortId/audio/:language**
Translate the narration from the Short's `narrationLanguage` to the requested language and generate or reuse that language WAV without rendering a video. The workspace uses the render endpoint when a language is selected so preview and download share the same embedded track.

#### **GET /api/shorts/:shortId/audio/:language**
Fetch audio for specific language
```javascript
Response:
{
  "audioFile": string,
  "audioUrl": string,
  "language": string,
  "duration": number
}
```

The returned `audioUrl` and render response `videoUrl` point to authenticated streaming routes. `/api/shorts/:shortId` returns owner-scoped scene data for reopening a draft or completed Short.

#### **GET /api/shorts/list**
Fetch user's shorts list
```javascript
Response:
{
  "shorts": [
    {
      "id": string,
      "title": string,
      "thumbnail": string,
      "duration": number,
      "platform": string,
      "createdAt": ISO date,
      "status": "draft" | "ready" | "archived"
    }
  ]
}
```

---

## Implementation Specifications

### **1. Scene Schema (JSON)**

```json
{
  "shortId": "short_abc123",
  "originalFile": "script.md",
  "userPrompt": "Show microservices architecture",
  "platform": "youtube",
  "resolution": "1080p",
  "scenes": [
    {
      "id": 0,
      "sequenceNumber": 1,
      "duration": 5,
      "type": "title",
      "content": "What is Microservices?",
      "visual": {
        "type": "slide",
        "width": 1920,
        "height": 1080,
        "background": "#0f1117",
        "textColor": "#e6edf3",
        "fontSize": 72,
        "imagePath": "public/videos/scenes/short_abc123_scene_0.png",
        "thumbnail": "data:image/png;base64,..."
      }
    },
    {
      "id": 1,
      "sequenceNumber": 2,
      "duration": 8,
      "type": "diagram",
      "content": "System Architecture",
      "visual": {
        "type": "diagram",
        "diagramType": "mermaid",
        "code": "graph TD\n  A[Client]...",
        "imagePath": "public/videos/scenes/short_abc123_scene_1.svg",
        "thumbnail": "data:image/png;base64,..."
      }
    },
    {
      "id": 2,
      "sequenceNumber": 3,
      "duration": 6,
      "type": "concept",
      "content": "Key Benefits",
      "visual": {
        "type": "ai_image",
        "prompt": "Professional technical illustration of microservices architecture with clean lines",
        "imagePath": "public/videos/scenes/short_abc123_scene_2.png",
        "thumbnail": "data:image/png;base64,..."
      }
    },
    {
      "id": 3,
      "sequenceNumber": 4,
      "duration": 5,
      "type": "code",
      "content": "Example Implementation",
      "visual": {
        "type": "code",
        "language": "python",
        "code": "def create_microservice():\n    return Service()",
        "imagePath": "public/videos/scenes/short_abc123_scene_3.png",
        "thumbnail": "data:image/png;base64,..."
      }
    }
  ],
  "audio": {
    "language": "hindi",
    "script": "माइक्रोसर्विसेज क्या है...",
    "file": "public/videos/audio/short_abc123_hindi.wav",
    "duration": 24
  },
  "metadata": {
    "title": "What is Microservices",
    "totalDuration": 24,
    "createdAt": "2026-10-14T08:37:00Z",
    "updatedAt": "2026-10-14T08:37:00Z",
    "status": "draft"
  }
}
```

---

### **2. Service Implementation**

#### **scriptParser.js** - Extract scenes from document
```javascript
async function parseScript(file, userPrompt) {
  // 1. Extract text from Markdown/DOCX locally and PDF through Flask OCR
  // 2. Parse into logical scenes (paragraphs/sections)
  // 3. Classify scene type (title, diagram, concept, code)
  // 4. Estimate duration per scene
  // 5. Generate visual prompts for each scene
  
  return scenes;
}
```

#### **visualGenerator.js** - Generate PNG/SVG visuals
```javascript
async function generateVisuals(scenes) {
  // For each scene, call appropriate generator:
  
  // Type: slide → renderSlide(scene)
  // Type: diagram → renderMermaidDiagram(scene)
  // Type: code → renderCodeBlock(scene)
  // Type: concept → callFalai(scene)
  
  return updatedScenes;
}
```

#### **videoComposer.js** - Compose scene visuals and the selected narration into an MP4 with FFmpeg
```javascript
async function composeVideo(scenes, shortId, platform, resolution, audio) {
  // 1. Load validated scene PNGs and scale/pad them to platform dimensions
  // 2. Scale scene timings proportionally to the selected WAV duration
  // 3. Encode H.264 video and mux the selected WAV as AAC
  // 4. Return the language-specific video path and synchronized duration
  return videoPath;
}
```

#### **falaiService.js** - Call Fal.ai for concept images
```javascript
async function generateConceptImage(prompt) {
  const response = await fetch('https://api.fal.ai/v1/stable-diffusion-3', {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_API_KEY}` },
    body: JSON.stringify({
      prompt: prompt,
      image_size: 'landscape_16_9',
      num_outputs: 1,
      guidance_scale: 7.5
    })
  });
  
  return response.json();
}
```

---

### **3. Flask Audio Generation**

#### **sarvam_integration/shorts_audio.py**

```python
@app.route('/api/shorts/audio/generate', methods=['POST'])
def generate_shorts_audio():
    data = request.json
    script = data['script']
    language = data['language']
    
    # Call Sarvam Bulbul v4-flash
    audio_response = requests.post(
        'https://api.sarvam.ai/v1/text-to-speech',
        json={
            'model': 'bulbul:v4-flash',
            'text': script,
            'language': language,
            'voice_name': 'default'
        },
        headers={'api-key': os.environ['SARVAM_API_KEY']}
    )
    
    audio_data = audio_response.json()
    audio_base64 = audio_data['audio']
    audio_bytes = base64.b64decode(audio_base64)
    
    # Save to local storage
    short_id = data['shortId']
    audio_file = f"public/videos/audio/{short_id}_{language}.wav"
    os.makedirs(os.path.dirname(audio_file), exist_ok=True)
    
    with open(audio_file, 'wb') as f:
        f.write(audio_bytes)
    
    return {
        'success': True,
        'audioFile': audio_file,
        'language': language,
        'duration': audio_data.get('duration', None)
    }
```

---

### **4. MongoDB Schema**

#### **Short.js**
```javascript
const shortSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'Scholar', required: true },
  originalFile: String,
  userPrompt: String,
  title: String,
  
  // Platform config
  platform: { type: String, enum: ['youtube', 'reels', 'tiktok'], default: 'youtube' },
  resolution: { type: String, enum: ['720p', '1080p', 'mobile'], default: '1080p' },
  
  // Scene data
  scenes: [{
    id: Number,
    sequenceNumber: Number,
    duration: Number,
    type: String,  // title, diagram, code, concept
    content: String,
    visual: {
      type: String,  // slide, diagram, ai_image, code
      diagramCode: String,
      codeLanguage: String,
      imagePath: String
    }
  }],
  
  // Audio files (per language)
  audioFiles: [{
    language: String,  // Target narration language
    sourceLanguage: String,
    file: String,
    duration: Number
  }],
  
  // Video output
  videoFile: String,
  videoUrl: String,
  duration: Number,
  
  // Status
  status: { type: String, enum: ['draft', 'ready', 'archived'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = Schema('Short', shortSchema);
```

---

## Dependencies to Install

### **Node.js**
```bash
npm install playwright mermaid shiki ffmpeg-static fal-ai axios multer
```

### **Python**
```bash
pip install requests python-dotenv
```

### **System**
```bash
# Install Playwright browsers
npx playwright install chromium
```

---

## Environment Variables

### **Node.js (.env)**
```
SARVAM_API_KEY=your_sarvam_key
FAL_AI_API_KEY=your_fal_key
SHORTS_STORAGE_PATH=./public/videos
FLASK_SERVICE_URL=http://localhost:5000
```

### **Flask (.env)**
```
SARVAM_API_KEY=your_sarvam_key
```

---

## Phase 1 Deliverables

- [x] WorkspaceSidebar component (created)
- [ ] scriptParser.js (parse MD/PDF/Doc → scenes)
- [ ] visualGenerator.js (Mermaid, Shiki, slides)
- [ ] videoComposer.js (FFmpeg)
- [ ] falaiService.js (optional, Phase 2)
- [ ] ShortsCreator.jsx (upload UI)
- [ ] ScenePreview.jsx (timeline editor)
- [ ] VideoPlayer.jsx (preview/download)
- [ ] shorts.js routes (all 5 endpoints)
- [ ] Flask audio endpoint
- [ ] Short.js Mongoose schema

---

## Rendering Dimensions

### **YouTube (16:9)**
- Width: 1920px
- Height: 1080px

### **Instagram Reels / TikTok (9:16)**
- Width: 1080px
- Height: 1920px

### **Mobile (1:1)**
- Width: 1080px
- Height: 1080px

---

## Notes

1. **Synchronized Voice Tracks**: Keep source WAVs per language and render a matching MP4 with the selected narration embedded; scene timings match the audio up to five minutes
2. **Fal.ai Free Tier**: 100 credits/month → ~10-20 concept images → Upgrade to paid after testing
3. **FFmpeg Local**: All video encoding happens on server (no cloud dependency)
4. **Preview Before Render**: Scenes shown to user with thumbnails → allow edits before video generation
5. **Real-time Processing**: Phase 1 uses synchronous generation → consider async queue (Bull) in Phase 2

---

## Reference

**Full guide**: See SHORTS_TECH_STACK.md for detailed explanations and alternatives
