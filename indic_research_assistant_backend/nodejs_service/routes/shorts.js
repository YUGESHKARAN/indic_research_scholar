const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs/promises');
const authenticate = require('../middleware/authMiddleware');
const Short = require('../models/Short');
const { parseScript, ScriptParserError } = require('../services/scriptParser');
const {
  generateVisuals,
  VisualGeneratorError,
  getDimensions,
} = require('../services/visualGenerator');
const { composeVideo, VideoComposerError } = require('../services/videoComposer');

const MAX_SCRIPT_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.md', '.markdown', '.pdf', '.docx']);
const PLATFORMS = new Set(Short.schema.path('platform').enumValues);
const RESOLUTIONS = new Set(Short.schema.path('resolution').enumValues);
const LANGUAGES = new Set(
  Short.schema.path('audioFiles').schema.path('language').enumValues
);
const MAX_VIDEO_DURATION_SECONDS = 300;
const MAX_NARRATION_CHARACTERS = 3500;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SCRIPT_BYTES, fields: 8, parts: 10, fieldSize: 4096 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (extension === '.doc') {
      callback(
        new ScriptParserError(
          'Legacy .doc files are not supported. Save the script as .docx.'
        )
      );
      return;
    }
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      callback(
        new ScriptParserError(
          'Unsupported script type. Upload a Markdown, PDF, or DOCX file.'
        )
      );
      return;
    }
    callback(null, true);
  },
});

const router = express.Router();

function handleScriptUpload(req, res, next) {
  upload.single('scriptFile')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      res.status(statusCode).json({ error: error.message });
      return;
    }
    if (error instanceof ScriptParserError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    next(error);
  });
}

function isValidShortId(shortId) {
  return /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(shortId || '');
}

function getStorageRoot() {
  return path.resolve(
    process.env.SHORTS_STORAGE_PATH || path.join(__dirname, '..', 'public', 'videos')
  );
}

function isWithinDirectory(directory, filePath) {
  return filePath.startsWith(`${directory}${path.sep}`);
}

async function requestShortsAudio(
  script,
  shortId,
  sourceLanguage,
  language,
  speaker
) {
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    const error = new Error('Shorts audio generation is not configured.');
    error.statusCode = 503;
    throw error;
  }

  let endpoint;
  try {
    endpoint = new URL(
      '/api/shorts/audio/generate',
      process.env.FLASK_SERVICE_URL || 'http://localhost:5000'
    );
  } catch (error) {
    const serviceError = new Error('The Flask service URL is invalid.', { cause: error });
    serviceError.statusCode = 500;
    throw serviceError;
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-key': internalKey,
      },
      body: JSON.stringify({ script, shortId, sourceLanguage, language, speaker }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    const serviceError = new Error('Unable to reach the Shorts audio service.', {
      cause: error,
    });
    serviceError.statusCode = 502;
    throw serviceError;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    const serviceError = new Error('The Shorts audio service returned an invalid response.', {
      cause: error,
    });
    serviceError.statusCode = 502;
    throw serviceError;
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    const serviceError = new Error('The Shorts audio service returned an invalid response.');
    serviceError.statusCode = 502;
    throw serviceError;
  }
  if (!response.ok) {
    const serviceError = new Error(
      typeof payload.error === 'string'
        ? payload.error
        : 'Shorts audio generation failed.'
    );
    serviceError.statusCode = response.status >= 400 && response.status < 600
      ? response.status
      : 502;
    throw serviceError;
  }

  const expectedAudioFile = `audio/${shortId}_${language}.wav`;
  if (
    payload.success !== true ||
    payload.audioFile !== expectedAudioFile ||
    payload.sourceLanguage !== sourceLanguage ||
    payload.language !== language ||
    typeof payload.speaker !== 'string' ||
    !payload.speaker ||
    (speaker !== undefined && payload.speaker !== speaker) ||
    !Number.isFinite(payload.duration) ||
    payload.duration <= 0 ||
    payload.duration > 300
  ) {
    const serviceError = new Error('The Shorts audio service returned invalid audio metadata.');
    serviceError.statusCode = 502;
    throw serviceError;
  }
  return payload;
}

async function requestShortsTranslations(texts, sourceLanguage, targetLanguage) {
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    const error = new Error('Shorts translation is not configured.');
    error.statusCode = 503;
    throw error;
  }

  let endpoint;
  try {
    endpoint = new URL(
      '/api/shorts/scripts/translate',
      process.env.FLASK_SERVICE_URL || 'http://localhost:5000'
    );
  } catch (error) {
    const serviceError = new Error('The Flask service URL is invalid.', { cause: error });
    serviceError.statusCode = 500;
    throw serviceError;
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-key': internalKey,
      },
      body: JSON.stringify({ texts, sourceLanguage, targetLanguage }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    const serviceError = new Error('Unable to reach the Shorts translation service.', {
      cause: error,
    });
    serviceError.statusCode = 502;
    throw serviceError;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    const serviceError = new Error('The Shorts translation service returned an invalid response.', {
      cause: error,
    });
    serviceError.statusCode = 502;
    throw serviceError;
  }
  if (!response.ok) {
    const serviceError = new Error(
      typeof payload?.error === 'string'
        ? payload.error
        : 'Shorts narration translation failed.'
    );
    serviceError.statusCode = response.status >= 400 && response.status < 600
      ? response.status
      : 502;
    throw serviceError;
  }
  if (
    !Array.isArray(payload?.translations) ||
    payload.translations.length !== texts.length ||
    payload.translations.some(
      (translation) => typeof translation !== 'string' || !translation.trim()
    )
  ) {
    const serviceError = new Error('The Shorts translation service returned invalid translations.');
    serviceError.statusCode = 502;
    throw serviceError;
  }
  return payload.translations.map((translation) => translation.trim());
}

function getNarrationTranslation(scene, language) {
  if (scene.narrationTranslations instanceof Map) {
    return scene.narrationTranslations.get(language);
  }
  return scene.narrationTranslations?.[language];
}

function getNarrationTranslations(scene) {
  if (scene.narrationTranslations instanceof Map) {
    return Object.fromEntries(scene.narrationTranslations);
  }
  return { ...(scene.narrationTranslations || {}) };
}

async function ensureShortAudio(shortDocument, shortId, language, speaker) {
  const originalLanguage = shortDocument.narrationLanguage || 'hindi';
  const hasTranslation = language !== originalLanguage &&
    shortDocument.scenes.length > 0 &&
    shortDocument.scenes.every(
      (scene) => getNarrationTranslation(scene, language)
    );
  const sourceLanguage = hasTranslation ? language : originalLanguage;
  if (!LANGUAGES.has(sourceLanguage)) {
    throw new Error('Shorts narration language is not supported for translation.');
  }
  const existingAudio = shortDocument.audioFiles.find(
    (item) => item.language === language
  );
  const selectedSpeaker = speaker || existingAudio?.speaker;
  const expectedAudioFile = `audio/${shortId}_${language}.wav`;
  const storageRoot = getStorageRoot();
  const audioPath = path.resolve(storageRoot, expectedAudioFile);
  if (!isWithinDirectory(storageRoot, audioPath)) {
    throw new Error('Resolved Shorts audio path is outside the storage directory.');
  }

  const cacheableAudio = shortDocument.audioFiles.find(
    (item) =>
      item.language === language &&
      item.file === expectedAudioFile &&
      selectedSpeaker &&
      item.speaker === selectedSpeaker &&
      (item.sourceLanguage === sourceLanguage ||
        (!item.sourceLanguage && sourceLanguage === language))
  );
  if (cacheableAudio) {
    try {
      const audioStats = await fs.stat(audioPath);
      if (audioStats.isFile()) {
        console.info('[shorts:audio-cache]', JSON.stringify({
          shortId,
          sourceLanguage,
          language,
          cacheHit: true,
          speaker: cacheableAudio.speaker,
          audioDurationSeconds: cacheableAudio.duration,
          sceneDurationSeconds: shortDocument.scenes.reduce(
            (total, scene) => total + scene.duration,
            0
          ),
          sceneDurationsSeconds: shortDocument.scenes.map((scene) => scene.duration),
        }));
        return cacheableAudio;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  const script = shortDocument.scenes
    .map((scene) => (
      hasTranslation
        ? getNarrationTranslation(scene, language)
        : scene.narration || scene.content
    ))
    .join('\n\n')
    .trim();
  const audioResult = await requestShortsAudio(
    script,
    shortId,
    sourceLanguage,
    language,
    selectedSpeaker
  );
  console.info('[shorts:audio-generated]', JSON.stringify({
    shortId,
    sourceLanguage,
    speaker: audioResult.speaker,
    language,
    cacheHit: false,
    narrationCharacterCount: script.length,
    narrationWordCount: script.split(/\s+/).filter(Boolean).length,
    sceneDurationSeconds: shortDocument.scenes.reduce(
      (total, scene) => total + scene.duration,
      0
    ),
    sceneDurationsSeconds: shortDocument.scenes.map((scene) => scene.duration),
    audioDurationSeconds: audioResult.duration,
  }));
  const audioStats = await fs.stat(audioPath);
  if (!audioStats.isFile()) {
    throw new Error('Generated Shorts audio file is missing.');
  }

  const audioFile = {
    language,
    sourceLanguage,
    speaker: audioResult.speaker,
    file: audioResult.audioFile,
    duration: audioResult.duration,
  };
  shortDocument.audioFiles = shortDocument.audioFiles
    .filter((item) => item.language !== language)
    .concat(audioFile);
  await shortDocument.save();
  return audioFile;
}

async function removeGeneratedVisuals(shortId, scenes) {
  const storageRoot = getStorageRoot();
  const scenesDirectory = path.join(storageRoot, 'scenes');
  const paths = scenes.map((scene) =>
    path.join(scenesDirectory, `${shortId}_scene_${scene.id}.png`)
  );
  await Promise.all(paths.map((filePath) => fs.rm(filePath, { force: true })));
}

async function removeShortAssets(shortDocument, shortId) {
  const storageRoot = getStorageRoot();
  const assetPaths = [];

  for (const scene of shortDocument.scenes || []) {
    if (Number.isInteger(scene.id) && scene.id >= 0) {
      assetPaths.push(path.join(
        storageRoot,
        'scenes',
        `${shortId}_scene_${scene.id}.png`
      ));
    }
  }

  for (const language of LANGUAGES) {
    assetPaths.push(path.join(storageRoot, 'audio', `${shortId}_${language}.wav`));
  }

  for (const platform of PLATFORMS) {
    for (const resolution of RESOLUTIONS) {
      assetPaths.push(path.join(
        storageRoot,
        'final',
        `${shortId}_${platform}_${resolution}.mp4`
      ));
      for (const language of LANGUAGES) {
        assetPaths.push(path.join(
          storageRoot,
          'final',
          `${shortId}_${platform}_${resolution}_${language}.mp4`
        ));
      }
    }
  }

  await Promise.all(assetPaths.map(async (assetPath) => {
    const directory = path.dirname(assetPath);
    if (
      !['scenes', 'audio', 'final'].some(
        (folder) => directory === path.join(storageRoot, folder)
      ) ||
      !isWithinDirectory(directory, path.resolve(assetPath))
    ) {
      throw new Error('Resolved Shorts asset path is outside the storage directory.');
    }
    await fs.rm(assetPath, { force: true });
  }));
}

router.post('/create', authenticate, handleScriptUpload, async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'A script file is required.' });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(req.user?.id)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const platform = req.body.platform || 'youtube';
  const resolution = req.body.resolution || '1080p';
  const userPrompt = req.body.userPrompt || '';
  if (!PLATFORMS.has(platform)) {
    res.status(400).json({ error: 'Unsupported video platform.' });
    return;
  }
  if (!RESOLUTIONS.has(resolution)) {
    res.status(400).json({ error: 'Unsupported video resolution.' });
    return;
  }
  if (typeof userPrompt !== 'string') {
    res.status(400).json({ error: 'Additional context must be text.' });
    return;
  }
  const targetDurationSeconds = Number(req.body.targetDurationSeconds);
  if (
    !Number.isInteger(targetDurationSeconds) ||
    targetDurationSeconds < 30 ||
    targetDurationSeconds > 60
  ) {
    res.status(400).json({
      error: 'Choose a target runtime between 30 and 60 seconds.',
    });
    return;
  }

  let generatedScenes = [];
  let shortDocument;
  try {
    const preparedScript = await parseScript(req.file, userPrompt, {
      targetDurationSeconds,
    });
    const parsedScenes = preparedScript.scenes;
    const title = preparedScript.title
      || parsedScenes.find((scene) => scene.type === 'title')?.content
      || path.basename(req.file.originalname, path.extname(req.file.originalname));
    shortDocument = new Short({
      userId: req.user.id,
      originalFile: path.basename(req.file.originalname.replace(/\\/g, '/')),
      userPrompt: userPrompt.trim(),
      title,
      platform,
      resolution,
      narrationLanguage: preparedScript.narrationLanguage,
      scenes: parsedScenes,
    });
    await shortDocument.validate();
    getDimensions(platform, resolution);
    generatedScenes = await generateVisuals(parsedScenes, shortDocument.shortId, {
      platform,
      resolution,
    });
    shortDocument.scenes = generatedScenes;
    shortDocument.duration = generatedScenes.reduce(
      (total, scene) => total + scene.duration,
      0
    );
    await shortDocument.save();

    res.status(201).json({
      shortId: shortDocument.shortId,
      title: shortDocument.title,
      narrationLanguage: shortDocument.narrationLanguage,
      scenes: shortDocument.scenes.map((scene) => ({
        ...scene,
        narrationTranslations: getNarrationTranslations(scene),
      })),
      totalDuration: shortDocument.duration,
      targetDurationSeconds: preparedScript.targetDurationSeconds,
      requestedTargetDurationSeconds: targetDurationSeconds,
      platform: shortDocument.platform,
      resolution: shortDocument.resolution,
    });
  } catch (error) {
    if (generatedScenes.length > 0 && shortDocument) {
      try {
        await removeGeneratedVisuals(shortDocument.shortId, generatedScenes);
      } catch (cleanupError) {
        console.error('Failed to clean up Shorts scene visuals:', cleanupError);
      }
    }
    if (error instanceof ScriptParserError || error instanceof VisualGeneratorError) {
      res.status(error.statusCode || 500).json({ error: error.message });
      return;
    }
    console.error('Short creation failed:', error);
    res.status(500).json({ error: 'Failed to create short.' });
  }
});

router.post('/:shortId/translate/:language', authenticate, async (req, res) => {
  const { shortId, language } = req.params;
  if (!isValidShortId(shortId)) {
    res.status(400).json({ error: 'Invalid short ID.' });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(req.user?.id)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (!LANGUAGES.has(language)) {
    res.status(400).json({ error: 'Unsupported Shorts narration language.' });
    return;
  }

  try {
    const shortDocument = await Short.findOne({
      shortId,
      userId: req.user.id,
    });
    if (!shortDocument) {
      res.status(404).json({ error: 'Short not found.' });
      return;
    }

    const sourceLanguage = shortDocument.narrationLanguage || 'hindi';
    if (!LANGUAGES.has(sourceLanguage)) {
      res.status(400).json({ error: 'Unsupported source narration language.' });
      return;
    }

    const scenesNeedingTranslation = sourceLanguage === language
      ? []
      : shortDocument.scenes.filter(
        (scene) => !getNarrationTranslation(scene, language)
      );
    if (scenesNeedingTranslation.length > 0) {
      const sourceTexts = scenesNeedingTranslation.map(
        (scene) => scene.narration || scene.content
      );
      if (sourceTexts.some((text) => typeof text !== 'string' || !text.trim())) {
        res.status(400).json({
          error: 'Every scene needs narration before translation.',
        });
        return;
      }
      const translations = await requestShortsTranslations(
        sourceTexts,
        sourceLanguage,
        language
      );
      scenesNeedingTranslation.forEach((scene, index) => {
        const narrationTranslations = getNarrationTranslations(scene);
        narrationTranslations[language] = translations[index];
        scene.narrationTranslations = narrationTranslations;
      });
      shortDocument.audioFiles = shortDocument.audioFiles.filter(
        (audio) => audio.language !== language
      );
      if (shortDocument.videoLanguage === language) {
        shortDocument.videoFile = undefined;
        shortDocument.videoUrl = undefined;
        shortDocument.videoLanguage = undefined;
        shortDocument.status = 'draft';
      }
      await shortDocument.save();
    }

    res.json({
      language,
      scenes: shortDocument.scenes.map((scene) => ({
        id: scene.id,
        narration: language === sourceLanguage
          ? scene.narration || scene.content
          : getNarrationTranslation(scene, language) || scene.narration || scene.content,
      })),
    });
  } catch (error) {
    if (Number.isInteger(error.statusCode)) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Short narration translation failed:', error);
    res.status(500).json({ error: 'Failed to translate the narration.' });
  }
});

router.patch('/:shortId/scenes', authenticate, async (req, res) => {
  const { shortId } = req.params;
  if (!isValidShortId(shortId)) {
    res.status(400).json({ error: 'Invalid short ID.' });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(req.user?.id)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (!Array.isArray(req.body?.scenes) || req.body.scenes.length === 0) {
    res.status(400).json({ error: 'At least one scene is required.' });
    return;
  }

  try {
    const shortDocument = await Short.findOne({
      shortId,
      userId: req.user.id,
    });
    if (!shortDocument) {
      res.status(404).json({ error: 'Short not found.' });
      return;
    }
    if (req.body.scenes.length !== shortDocument.scenes.length) {
      res.status(400).json({ error: 'Scenes cannot be added or removed.' });
      return;
    }

    const existingById = new Map(
      shortDocument.scenes.map((scene) => [scene.id, scene])
    );
    const orderedScenes = [];
    let totalDuration = 0;
    for (const [index, requestedScene] of req.body.scenes.entries()) {
      if (
        !requestedScene ||
        !Number.isInteger(requestedScene.id) ||
        !Number.isFinite(requestedScene.duration) ||
        requestedScene.duration < 1 ||
        requestedScene.duration > 60
      ) {
        res.status(400).json({
          error: `Scene ${index + 1} has an invalid ID or duration.`,
        });
        return;
      }
      const existingScene = existingById.get(requestedScene.id);
      if (!existingScene) {
        res.status(400).json({ error: 'Scene IDs cannot be added or changed.' });
        return;
      }
      if (requestedScene.type && requestedScene.type !== existingScene.type) {
        res.status(400).json({ error: 'Scene types cannot be changed.' });
        return;
      }
      if (
        requestedScene.content !== undefined &&
        requestedScene.content !== existingScene.content
      ) {
        res.status(400).json({ error: 'Scene content cannot be changed.' });
        return;
      }
      if (
        requestedScene.narration !== undefined &&
        (typeof requestedScene.narration !== 'string' ||
          !requestedScene.narration.trim() ||
          requestedScene.narration.length > MAX_NARRATION_CHARACTERS)
      ) {
        res.status(400).json({
          error: `Scene ${index + 1} narration must contain 1 to ${MAX_NARRATION_CHARACTERS} characters.`,
        });
        return;
      }
      const requestedTranslations = requestedScene.narrationTranslations;
      if (
        requestedTranslations !== undefined &&
        (!requestedTranslations ||
          typeof requestedTranslations !== 'object' ||
          Array.isArray(requestedTranslations) ||
          Object.entries(requestedTranslations).some(
            ([language, narration]) =>
              !LANGUAGES.has(language) ||
              typeof narration !== 'string' ||
              !narration.trim() ||
              narration.length > MAX_NARRATION_CHARACTERS
          ))
      ) {
        res.status(400).json({
          error: `Scene ${index + 1} has invalid translated narration.`,
        });
        return;
      }
      if (
        requestedScene.visual &&
        (requestedScene.visual.type !== existingScene.visual.type ||
          requestedScene.visual.imagePath !== existingScene.visual.imagePath)
      ) {
        res.status(400).json({ error: 'Rendered scene visuals cannot be changed.' });
        return;
      }
      totalDuration += requestedScene.duration;
      orderedScenes.push({
        scene: existingScene,
        duration: requestedScene.duration,
        narration: requestedScene.narration === undefined
          ? existingScene.narration
          : requestedScene.narration.trim(),
        narrationTranslations: {
          ...(requestedScene.narration !== undefined
            ? {}
            : getNarrationTranslations(existingScene)),
          ...(requestedTranslations || {}),
        },
      });
    }

    for (const language of LANGUAGES) {
      const narrationCharacterCount = orderedScenes
        .map(({ narration, narrationTranslations, scene }) => (
          language === shortDocument.narrationLanguage
            ? narration
            : narrationTranslations[language] || ''
        ))
        .filter(Boolean)
        .join('\n\n')
        .length;
      if (narrationCharacterCount > MAX_NARRATION_CHARACTERS) {
        res.status(400).json({
          error: `Short narration in ${language} cannot exceed ${MAX_NARRATION_CHARACTERS} characters.`,
        });
        return;
      }
    }

    if (totalDuration > MAX_VIDEO_DURATION_SECONDS) {
      res.status(400).json({
        error: `Shorts cannot exceed ${MAX_VIDEO_DURATION_SECONDS} seconds. Shorten the scene durations.`,
      });
      return;
    }

    const orderChanged = orderedScenes.some(
      ({ scene }, index) => scene.sequenceNumber !== index + 1
    );
    const changed = orderedScenes.some(
      ({ scene, duration, narration, narrationTranslations }, index) =>
        scene.sequenceNumber !== index + 1 ||
        scene.duration !== duration ||
        scene.narration !== narration ||
        JSON.stringify(getNarrationTranslations(scene)) !==
          JSON.stringify(narrationTranslations)
    );
    const narrationChanged = orderedScenes.some(
      ({ scene, narration, narrationTranslations }) =>
        scene.narration !== narration ||
        JSON.stringify(getNarrationTranslations(scene)) !==
          JSON.stringify(narrationTranslations)
    );
    shortDocument.scenes = orderedScenes.map(
      ({ scene, duration, narration, narrationTranslations }, index) => {
        scene.sequenceNumber = index + 1;
        scene.duration = duration;
        scene.narration = narration;
        scene.narrationTranslations = narrationTranslations;
        return scene;
      }
    );
    shortDocument.duration = totalDuration;
    if (changed) {
      shortDocument.videoFile = undefined;
      shortDocument.videoUrl = undefined;
      shortDocument.videoLanguage = undefined;
      shortDocument.status = 'draft';
      shortDocument.audioFiles.forEach((audioFile) => {
        audioFile.videoFile = undefined;
      });
    }
    if (orderChanged || narrationChanged) {
      shortDocument.audioFiles = [];
    }
    await shortDocument.save();

    res.json({
      success: true,
      shortId: shortDocument.shortId,
      totalDuration: shortDocument.duration,
    });
  } catch (error) {
    console.error('Short scene update failed:', error);
    res.status(500).json({ error: 'Failed to update short scenes.' });
  }
});

router.get('/list', authenticate, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.user?.id)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    const shorts = await Short.find({ userId: req.user.id })
      .select('shortId title scenes duration platform createdAt status')
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      shorts: shorts.map((shortDocument) => ({
        id: shortDocument.shortId,
        title: shortDocument.title,
        thumbnail: shortDocument.scenes?.[0]?.visual?.thumbnail || null,
        duration: shortDocument.duration,
        platform: shortDocument.platform,
        createdAt: shortDocument.createdAt,
        status: shortDocument.status,
      })),
    });
  } catch (error) {
    console.error('Short list retrieval failed:', error);
    res.status(500).json({ error: 'Failed to fetch shorts.' });
  }
});

router.get('/:shortId', authenticate, async (req, res) => {
  const { shortId } = req.params;
  if (!isValidShortId(shortId)) {
    res.status(400).json({ error: 'Invalid short ID.' });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(req.user?.id)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const shortDocument = await Short.findOne({
      shortId,
      userId: req.user.id,
    }).lean();
    if (!shortDocument) {
      res.status(404).json({ error: 'Short not found.' });
      return;
    }
    res.json({
      shortId: shortDocument.shortId,
      title: shortDocument.title,
      platform: shortDocument.platform,
      resolution: shortDocument.resolution,
      scenes: shortDocument.scenes,
      audioFiles: shortDocument.audioFiles.map((audioFile) => ({
        language: audioFile.language,
        speaker: audioFile.speaker,
        file: audioFile.file,
        duration: audioFile.duration,
      })),
      videoFile: shortDocument.videoFile,
      videoUrl: shortDocument.videoUrl || (
        shortDocument.videoFile
          ? `/api/shorts/${shortDocument.shortId}/video`
          : undefined
      ),
      videoLanguage: shortDocument.videoLanguage,
      narrationLanguage: shortDocument.narrationLanguage
        || shortDocument.videoLanguage
        || shortDocument.audioFiles?.[0]?.language
        || 'hindi',
      duration: shortDocument.duration,
      status: shortDocument.status,
    });
  } catch (error) {
    console.error('Short retrieval failed:', error);
    res.status(500).json({ error: 'Failed to fetch short.' });
  }
});

router.delete('/:shortId', authenticate, async (req, res) => {
  const { shortId } = req.params;
  if (!isValidShortId(shortId)) {
    res.status(400).json({ error: 'Invalid short ID.' });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(req.user?.id)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const shortDocument = await Short.findOne({
      shortId,
      userId: req.user.id,
    });
    if (!shortDocument) {
      res.status(404).json({ error: 'Short not found.' });
      return;
    }

    await removeShortAssets(shortDocument, shortId);
    await Short.deleteOne({ shortId, userId: req.user.id });
    res.json({ success: true, shortId });
  } catch (error) {
    console.error('Short deletion failed:', error);
    res.status(500).json({
      error: 'Could not delete this Short and its generated files. Please retry.',
    });
  }
});

router.post('/:shortId/audio/:language', authenticate, async (req, res) => {
  const { shortId, language } = req.params;
  if (!isValidShortId(shortId)) {
    res.status(400).json({ error: 'Invalid short ID.' });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(req.user?.id)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (!LANGUAGES.has(language)) {
    res.status(400).json({ error: 'Unsupported Shorts audio language.' });
    return;
  }
  const requestBody = req.body || {};
  if (
    requestBody.speaker !== undefined &&
    (typeof requestBody.speaker !== 'string' || !requestBody.speaker.trim())
  ) {
    res.status(400).json({ error: 'Speaker must be a non-empty text value.' });
    return;
  }

  try {
    const shortDocument = await Short.findOne({
      shortId,
      userId: req.user.id,
    });
    if (!shortDocument) {
      res.status(404).json({ error: 'Short not found.' });
      return;
    }
    if (!Array.isArray(shortDocument.scenes) || shortDocument.scenes.length === 0) {
      res.status(400).json({ error: 'Add at least one scene before generating audio.' });
      return;
    }

    const audioFile = await ensureShortAudio(
      shortDocument,
      shortId,
      language,
      requestBody.speaker
    );
    res.json({
      audioFile: audioFile.file,
      audioUrl: `/api/shorts/${shortId}/audio/${language}/file`,
      language,
      speaker: audioFile.speaker,
      duration: audioFile.duration,
    });
  } catch (error) {
    if (Number.isInteger(error.statusCode)) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Short audio generation failed:', error);
    res.status(500).json({ error: 'Failed to generate short audio.' });
  }
});

router.get('/:shortId/audio/:language', authenticate, async (req, res) => {
  const { shortId, language } = req.params;
  if (!isValidShortId(shortId)) {
    res.status(400).json({ error: 'Invalid short ID.' });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(req.user?.id)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (!LANGUAGES.has(language)) {
    res.status(400).json({ error: 'Unsupported Shorts audio language.' });
    return;
  }

  try {
    const shortDocument = await Short.findOne({
      shortId,
      userId: req.user.id,
    });
    if (!shortDocument) {
      res.status(404).json({ error: 'Short not found.' });
      return;
    }
    const audioFile = shortDocument.audioFiles.find(
      (item) => item.language === language
    );
    const expectedAudioFile = `audio/${shortId}_${language}.wav`;
    if (!audioFile || audioFile.file !== expectedAudioFile) {
      res.status(404).json({ error: 'Audio is not available for this language.' });
      return;
    }
    const audioPath = path.resolve(getStorageRoot(), expectedAudioFile);
    if (!isWithinDirectory(getStorageRoot(), audioPath)) {
      throw new Error('Resolved Shorts audio path is outside the storage directory.');
    }
    const audioStats = await fs.stat(audioPath);
    if (!audioStats.isFile()) {
      res.status(404).json({ error: 'Audio file is not available.' });
      return;
    }

    res.json({
      audioFile: audioFile.file,
      audioUrl: `/api/shorts/${shortId}/audio/${language}/file`,
      language,
      speaker: audioFile.speaker,
      duration: audioFile.duration,
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Audio file is not available.' });
      return;
    }
    console.error('Short audio lookup failed:', error);
    res.status(500).json({ error: 'Failed to fetch short audio.' });
  }
});

router.get('/:shortId/audio/:language/file', authenticate, async (req, res) => {
  const { shortId, language } = req.params;
  if (!isValidShortId(shortId)) {
    res.status(400).json({ error: 'Invalid short ID.' });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(req.user?.id)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (!LANGUAGES.has(language)) {
    res.status(400).json({ error: 'Unsupported Shorts audio language.' });
    return;
  }

  try {
    const shortDocument = await Short.findOne({
      shortId,
      userId: req.user.id,
    });
    if (!shortDocument) {
      res.status(404).json({ error: 'Short not found.' });
      return;
    }
    const audioFile = shortDocument.audioFiles.find(
      (item) => item.language === language
    );
    const expectedAudioFile = `audio/${shortId}_${language}.wav`;
    if (!audioFile || audioFile.file !== expectedAudioFile) {
      res.status(404).json({ error: 'Audio is not available for this language.' });
      return;
    }
    const storageRoot = getStorageRoot();
    const audioPath = path.resolve(storageRoot, expectedAudioFile);
    if (!isWithinDirectory(storageRoot, audioPath)) {
      throw new Error('Resolved Shorts audio path is outside the storage directory.');
    }
    const audioStats = await fs.stat(audioPath);
    if (!audioStats.isFile()) {
      res.status(404).json({ error: 'Audio file is not available.' });
      return;
    }
    res.set('Cache-Control', 'private, no-store');
    res.type('audio/wav').sendFile(audioPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Audio file is not available.' });
      return;
    }
    console.error('Short audio download failed:', error);
    res.status(500).json({ error: 'Failed to download short audio.' });
  }
});

router.get('/:shortId/video', authenticate, async (req, res) => {
  const { shortId } = req.params;
  if (!isValidShortId(shortId)) {
    res.status(400).json({ error: 'Invalid short ID.' });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(req.user?.id)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const shortDocument = await Short.findOne({
      shortId,
      userId: req.user.id,
    });
    if (!shortDocument) {
      res.status(404).json({ error: 'Short not found.' });
      return;
    }
    const requestedLanguage = req.query.language;
    const selectedAudio = requestedLanguage && LANGUAGES.has(requestedLanguage)
      ? shortDocument.audioFiles.find((audio) => audio.language === requestedLanguage)
      : null;
    const expectedVideoName = requestedLanguage
      ? `${shortId}_${shortDocument.platform}_${shortDocument.resolution}_${requestedLanguage}.mp4`
      : `${shortId}_${shortDocument.platform}_${shortDocument.resolution}.mp4`;
    const selectedVideoFile = requestedLanguage
      ? selectedAudio?.videoFile
      : shortDocument.videoFile;
    if (
      (requestedLanguage && !LANGUAGES.has(requestedLanguage)) ||
      path.basename(selectedVideoFile || '') !== expectedVideoName
    ) {
      res.status(404).json({ error: 'Rendered video is not available.' });
      return;
    }
    const storageRoot = getStorageRoot();
    const videoPath = path.resolve(storageRoot, 'final', expectedVideoName);
    if (!isWithinDirectory(path.join(storageRoot, 'final'), videoPath)) {
      throw new Error('Resolved Shorts video path is outside the storage directory.');
    }
    const videoStats = await fs.stat(videoPath);
    if (!videoStats.isFile()) {
      res.status(404).json({ error: 'Rendered video is not available.' });
      return;
    }
    res.set('Cache-Control', 'private, no-store');
    if (req.query.download === '1') {
      const downloadSuffix = requestedLanguage ? `_${requestedLanguage}` : '';
      res.download(videoPath, `${shortId}${downloadSuffix}.mp4`);
      return;
    }
    res.type('video/mp4').sendFile(videoPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Rendered video is not available.' });
      return;
    }
    console.error('Short video download failed:', error);
    res.status(500).json({ error: 'Failed to download short video.' });
  }
});

router.post('/:shortId/render', authenticate, async (req, res) => {
  const { shortId } = req.params;
  if (!isValidShortId(shortId)) {
    res.status(400).json({ error: 'Invalid short ID.' });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(req.user?.id)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const requestBody = req.body || {};
  const language = requestBody.language;
  if (typeof language !== 'string' || !LANGUAGES.has(language)) {
    res.status(400).json({ error: 'Unsupported Shorts audio language.' });
    return;
  }
  if (
    (requestBody.platform !== undefined && typeof requestBody.platform !== 'string') ||
    (requestBody.resolution !== undefined && typeof requestBody.resolution !== 'string')
  ) {
    res.status(400).json({ error: 'Platform and resolution must be text values.' });
    return;
  }
  if (
    requestBody.speaker !== undefined &&
    (typeof requestBody.speaker !== 'string' || !requestBody.speaker.trim())
  ) {
    res.status(400).json({ error: 'Speaker must be a non-empty text value.' });
    return;
  }

  let shortDocument;
  try {
    shortDocument = await Short.findOne({
      shortId,
      userId: req.user.id,
    });
    if (!shortDocument) {
      res.status(404).json({ error: 'Short not found.' });
      return;
    }
    if (!Array.isArray(shortDocument.scenes) || shortDocument.scenes.length === 0) {
      res.status(400).json({ error: 'Add at least one scene before rendering.' });
      return;
    }

    const platform = requestBody.platform === undefined
      ? shortDocument.platform
      : requestBody.platform;
    const resolution = requestBody.resolution === undefined
      ? shortDocument.resolution
      : requestBody.resolution;
    if (!PLATFORMS.has(platform)) {
      res.status(400).json({ error: 'Unsupported video platform.' });
      return;
    }
    if (!RESOLUTIONS.has(resolution)) {
      res.status(400).json({ error: 'Unsupported video resolution.' });
      return;
    }

    const audioFile = await ensureShortAudio(
      shortDocument,
      shortId,
      language,
      requestBody.speaker
    );
    const sceneDuration = shortDocument.scenes.reduce(
      (total, scene) => total + scene.duration,
      0
    );
    const storageRoot = getStorageRoot();
    const audioPath = path.resolve(storageRoot, audioFile.file);
    if (!isWithinDirectory(path.join(storageRoot, 'audio'), audioPath)) {
      throw new Error('Resolved Shorts audio path is outside the storage directory.');
    }

    console.info('[shorts:render-start]', JSON.stringify({
      shortId,
      language,
      sceneCount: shortDocument.scenes.length,
      requestedSceneDurationSeconds: sceneDuration,
      sceneDurationsSeconds: shortDocument.scenes.map((scene) => scene.duration),
      narrationDurationSeconds: audioFile.duration,
    }));
    const videoResult = await composeVideo(
      shortDocument.scenes,
      shortId,
      platform,
      resolution,
      {
        storagePath: storageRoot,
        audioPath,
        audioDuration: audioFile.duration,
        language,
      }
    );
    console.info('[shorts:render-timing]', JSON.stringify({
      shortId,
      language,
      sceneCount: shortDocument.scenes.length,
      requestedSceneDurationSeconds: sceneDuration,
      sceneDurationsSeconds: shortDocument.scenes.map((scene) => scene.duration),
      narrationDurationSeconds: audioFile.duration,
      renderedVideoDurationSeconds: videoResult.duration,
      durationDifferenceSeconds: Number(
        (videoResult.duration - sceneDuration).toFixed(3)
      ),
    }));
    audioFile.videoFile = videoResult.videoFile;
    shortDocument.platform = platform;
    shortDocument.resolution = resolution;
    shortDocument.duration = videoResult.duration;
    shortDocument.videoFile = videoResult.videoFile;
    shortDocument.videoLanguage = language;
    shortDocument.videoUrl = `/api/shorts/${shortId}/video?language=${language}`;
    shortDocument.status = 'ready';
    await shortDocument.save();

    res.json({
      videoId: `${shortId}_${platform}_${resolution}_${language}`,
      videoUrl: shortDocument.videoUrl,
      duration: videoResult.duration,
      requestedSceneDurationSeconds: sceneDuration,
      audioFile: audioFile.file,
      audioDuration: audioFile.duration,
      audioUrl: `/api/shorts/${shortId}/audio/${language}/file`,
      language,
      speaker: audioFile.speaker,
      platform,
      resolution,
    });
  } catch (error) {
    if (error instanceof VideoComposerError) {
      console.error('[shorts:render-failed]', JSON.stringify({
        shortId,
        language,
        error: error.message,
      }));
      res.status(500).json({ error: error.message });
      return;
    }
    if (Number.isInteger(error.statusCode)) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Short render failed:', error);
    res.status(500).json({ error: 'Failed to render short.' });
  }
});

module.exports = router;
