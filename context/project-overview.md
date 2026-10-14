# Indic Scholar Assistant

## Overview

Indic Assistant for personalized learning guide, It is a AI applications which allow users to upload their knowledege base such as docs, pdfs and other documents. To perfrom personalized academic tasks like q&a, exams preparation with MCQs, to prepare presentation or seminar, all supported with indic language support. which should be the ultimate prepartaion bundle in one place.

## Goals

1. Authenticate users to manage their data as separate entities.
2. Should allow users to upload docx, pdfs or other academic documents.   
3. Studio interface with seperate section to perform:
    - Q&A task with markdown supported response along with text + voice input/output support, with copy to click board
    - Mock test, should conduct industry standard MCQs, short answer type (25- max 50) test based on the selected one or more 
      document(s) knowledge, with score, validation and proper voice supported feedback feature upon submitting the test. level should easy, medium and hard level which should be selected by users.
    - Prepare for presentation/formatted document, users can simply select the documents or input their raw formated doc and 
      describe the task context, then should get clear content from the user with follow up queries and provide the proper industry standard presentation doc by transorming the raw knowledge base to structured format. along with edit feature up-on save it should be exported as a .ppt or other presenation formated doc.
    - Create short videos (Indic Shorts) from uploaded documents or custom scripts, with automatic visual generation (diagrams, code snippets, slides), Indic language voiceover support, and multi-platform export (YouTube, Instagram Reels, TikTok).

## Core User Flow

1. User signin
2. Should redirect to login/signup page on entering into workspace without authentication.
3. Upload documents (login required)
4. Enters the studio workspace (login required): 
   - Do Q&A task
   - Take up mock tests
   - Do presentation / formatting document
   - Create Indic Shorts

## Features

### Performing Q&A with knowledge base

- User first select the one or more uploaded document, and should enable/disable, then provide the query prompt and recieve the  
  markdown supported response with copy feature.
- should have the config setting to enable or diable the voice mode.
- can select the specific voice from the listed voices.
- can select the specific indic language from the listed language.   

### Performing Mock tests

- selected one or more document(s) knowledge, from the knowledge base, conduct industry standard MCQs, short answer type (25- 
  max 50).
- should provide validated scores and voice supported feedback upon submitting the test. 
- Contains different levels -  easy, medium and hard. which should be selected by users.

### Performing Presentation/formatting document

- for presentation taranform the raw context into industry standard presentation slides, with edit save and export feature.
- for format document, should transform uploaded or selected document into specific format, the target format can be given as 
  prompt as user or they can upload a new demo reference document/template. (e.g: I have done reserach on my new publication but having it as a raw unformatted document need to convert it into IEEE format without any mismatch)   
  note: before proceed either task, get a clear context asking follow up queries from the user.

### Creating Indic Shorts

- User uploads a script document (Markdown/PDF/DOCX; legacy DOC is unsupported in v1) or describes the topic from a selected document.
- System automatically extracts key concepts and generates scenes with visual representations:
  - **Diagrams**: Mermaid-based architecture/flow diagrams (for system design, tech concepts)
  - **Code Visuals**: Syntax-highlighted code snippets with Shiki
  - **Slides**: Auto-generated title and concept slides with premium design
  - **AI Images**: Optional concept illustrations via Fal.ai (Phase 2)
- User can preview scenes in a timeline editor and customize:
  - Scene duration per visual
  - Scene order and content
  - Visual elements (swap, edit, remove)
- System generates separate audio files (WAV) for each Indic language using Bulbul v4-flash TTS.
- Final video rendered with FFmpeg, supporting multiple formats:
  - YouTube (16:9, 1920×1080)
  - Instagram Reels / TikTok (9:16, 1080×1920)
  - Mobile optimized (1:1, 1080×1080)
- User can swap audio tracks between languages without re-rendering video.
- Exported shorts stored locally, with future cloud storage (AWS S3) support.
- All 8 Indic languages supported: Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati.

## Scope

### In Scope

- Authentication and route protection
- Knowledge base upload, manage and delete - documents with OCR + vector store 
- Workspace:
   - AI powered Q&A task with all the specs.
   - AI powered Presentation/formatting doc with all the specs.
   - Indic Shorts creation with all the specs.

### Out of Scope

- Workspace:
   - AI powered Mock test with all the specs.
- Indic Shorts Phase 2+:
   - AI image generation (Fal.ai) - deferred to Phase 2
   - Async video rendering with job queue - deferred to Phase 2
   - AWS S3 cloud storage - deferred to Phase 2
   - Self-hosted Stable Diffusion - deferred to Phase 3

## Success Criteria

1. User Authentication
2. Knowledge base manage section with upload, delete document with OCR + vector store 
3. Workspace with working sections:
   - AI powered Q&A
   - AI powered Presentation/formatting doc
   - Indic Shorts creation and rendering
4. Managing users data separately - maintaining the knowledge base without interference with others data.
5. Indic Shorts feature:
   - Automatic scene generation from uploaded scripts
   - Visual generation (Mermaid, Shiki, slides)
   - Preview and edit interface for scenes
   - Multi-language audio generation (all 8 Indic languages)
   - Multi-platform video export (YouTube, Reels, TikTok, Mobile)
   - Local storage with download capability

## Tech Stack

### Frontend
- React 18+ with premium design system (Inter typography, GitHub-inspired blue accent)
- Tailwind CSS for responsive styling
- Workspace studio with sidebar navigation

### Backend
- Node.js + Express for API orchestration
- Flask for Sarvam integrations (Bulbul TTS, embeddings)
- MongoDB for document metadata and shorts tracking
- Pinecone for vector embeddings with metadata filtering

### Indic Shorts Specific
- **Visual Generation**: Mermaid + Playwright (diagrams), Shiki + Playwright (code), custom Node slide rendering
- **Video Composition**: FFmpeg + fluent-ffmpeg
- **Text-to-Speech**: Bulbul v4-flash (Sarvam)
- **AI Images**: Fal.ai (Phase 2, optional)
- **Storage**: Local filesystem (Phase 1) → AWS S3 (Phase 3)

### Authentication
- JWT in httpOnly cookies
- GitHub OAuth with auto-linking by email
- OTP-based password reset (15-min expiry)

## Deployment

- Frontend: Vercel (with future alternative support)
- Backend: Self-hosted Node.js + Flask infrastructure
- Database: MongoDB (self-hosted or Atlas)
- Storage: Local filesystem expanding to AWS S3