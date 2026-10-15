const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const SHORT_PLATFORMS = ['youtube', 'reels', 'tiktok'];
const SHORT_RESOLUTIONS = ['720p', '1080p', 'mobile'];
const SCENE_TYPES = ['title', 'diagram', 'code', 'concept'];
const VISUAL_TYPES = ['slide', 'diagram', 'ai_image', 'code'];
const INDIC_LANGUAGES = [
  'english',
  'hindi',
  'tamil',
  'telugu',
  'kannada',
  'malayalam',
  'bengali',
  'marathi',
  'gujarati',
];

const visualSchema = new mongoose.Schema(
  {
    type: { type: String, enum: VISUAL_TYPES, required: true },
    diagramType: String,
    code: String,
    language: String,
    prompt: String,
    imagePath: String,
    thumbnail: String,
    width: Number,
    height: Number,
    background: String,
    textColor: String,
    fontSize: Number,
  },
  { _id: false }
);

const sceneSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, min: 0 },
    sequenceNumber: { type: Number, required: true, min: 1 },
    duration: { type: Number, required: true, min: 1, max: 60 },
    type: { type: String, enum: SCENE_TYPES, required: true },
    content: { type: String, required: true, trim: true },
    narration: { type: String, trim: true },
    narrationTranslations: { type: Map, of: String, default: {} },
    visual: { type: visualSchema, required: true },
  },
  { _id: false }
);

const audioFileSchema = new mongoose.Schema(
  {
    language: { type: String, enum: INDIC_LANGUAGES, required: true },
    sourceLanguage: { type: String, enum: INDIC_LANGUAGES },
    speaker: { type: String, trim: true },
    file: { type: String, required: true },
    duration: { type: Number, min: 0 },
    videoFile: String,
  },
  { _id: false }
);

const shortSchema = new mongoose.Schema(
  {
    shortId: {
      type: String,
      default: randomUUID,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scholar',
      required: true,
    },
    originalFile: String,
    userPrompt: { type: String, trim: true },
    title: { type: String, trim: true },
    platform: {
      type: String,
      enum: SHORT_PLATFORMS,
      default: 'youtube',
      required: true,
    },
    resolution: {
      type: String,
      enum: SHORT_RESOLUTIONS,
      default: '1080p',
      required: true,
    },
    scenes: { type: [sceneSchema], default: [] },
    audioFiles: { type: [audioFileSchema], default: [] },
    narrationLanguage: { type: String, enum: INDIC_LANGUAGES, default: 'hindi' },
    videoFile: String,
    videoUrl: String,
    duration: { type: Number, min: 0 },
    videoLanguage: { type: String, enum: INDIC_LANGUAGES },
    status: {
      type: String,
      enum: ['draft', 'ready', 'archived'],
      default: 'draft',
      required: true,
    },
  },
  { timestamps: true }
);

shortSchema.index({ userId: 1, shortId: 1 }, { unique: true });

module.exports =
  mongoose.models.Short || mongoose.model('Short', shortSchema);
