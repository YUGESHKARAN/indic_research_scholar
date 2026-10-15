const path = require('path');
const mammoth = require('mammoth');

const MAX_SCRIPT_BYTES = 10 * 1024 * 1024;
const MAX_SCENES = 50;
const MAX_SCENE_DURATION_SECONDS = 60;
const MAX_NARRATION_WORDS_PER_SECOND = 3;
const MAX_PREPARATION_SOURCE_CHARACTERS = 30000;
const SUPPORTED_NARRATION_LANGUAGES = [
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

class ScriptParserError extends Error {
  constructor(message, statusCode = 400, options = {}) {
    super(message, options);
    this.name = 'ScriptParserError';
    this.statusCode = statusCode;
  }
}

function getFileExtension(fileName) {
  return path.extname(fileName).toLowerCase();
}

function parseDurationSeconds(value, unit) {
  const duration = Number(value) * (/^min/i.test(unit) ? 60 : 1);
  return Number.isFinite(duration) ? Math.round(duration) : null;
}

function extractExplicitDuration(text) {
  const durationPattern =
    /\b(?:target|total|requested|video|short)?\s*(?:duration|runtime|length)\s*(?:is|of|should\s+be|:|=|-)?\s*(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?)\b/i;
  const promptPattern =
    /\b(?:make(?:\s+this)?|create|keep|target(?:ing)?|within|for)\s+(?:a\s+)?(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?)\b/i;
  const shortenPattern =
    /\b(?:shorten|reduce|trim|cut)\b[\s\S]{0,80}?\b(?:down\s+to|to)\s+(?:a\s+)?(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?)\b/i;

  for (const candidate of text) {
    const normalized = candidate.replace(/\*/g, '');
    const match = normalized.match(durationPattern)
      || normalized.match(shortenPattern)
      || normalized.match(promptPattern);
    if (match) return parseDurationSeconds(match[1], match[2]);
  }
  return null;
}

function extractSceneDurationList(text) {
  const sceneSections = text.split(/^#{1,6}\s*scene\s+\d+\b.*$/im).slice(1);
  if (sceneSections.length === 0) return null;
  const durations = sceneSections.map((section) => {
    const match = section.replace(/\*/g, '').match(
      /^\s*(?:[-*]\s*)?(?:\*\*)?duration(?:\*\*)?\s*:\s*(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?)\b/im
    );
    return match ? parseDurationSeconds(match[1], match[2]) : null;
  });
  if (durations.some((duration) => duration === null)) return null;
  return durations;
}

function extractSceneDurations(text) {
  const durations = extractSceneDurationList(text);
  return durations
    ? durations.reduce((total, duration) => total + duration, 0)
    : null;
}

function extractNarrationLanguage(userPrompt, sourceText) {
  const promptLanguage = SUPPORTED_NARRATION_LANGUAGES.find((language) =>
    new RegExp(`\\b${language}\\b`, 'i').test(userPrompt)
  );
  if (promptLanguage) return promptLanguage;

  const normalizedSource = sourceText.replace(/\*/g, '');
  const match = normalizedSource.match(
    /\btarget\s+language\b\s*[:=-]\s*(english|hindi|tamil|telugu|kannada|malayalam|bengali|marathi|gujarati)\b/i
  );
  return match ? match[1].toLowerCase() : 'hindi';
}

function allocateSceneDurations(scenes, targetDuration) {
  if (targetDuration < scenes.length || targetDuration > scenes.length * MAX_SCENE_DURATION_SECONDS) {
    throw new ScriptParserError(
      'The requested runtime cannot fit the generated scenes. Choose a runtime between the scene count and 60 seconds per scene.'
    );
  }
  const weights = scenes.map((scene) => Math.max(
    1,
    scene.narration.trim().split(/\s+/).length
  ));
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  const durations = weights.map((weight) => Math.max(
    1,
    Math.floor((targetDuration * weight) / totalWeight)
  ));

  while (durations.reduce((total, duration) => total + duration, 0) > targetDuration) {
    const candidate = durations
      .map((duration, index) => ({ duration, index }))
      .filter(({ duration }) => duration > 1)
      .sort((left, right) => right.duration - left.duration)[0];
    if (!candidate) break;
    durations[candidate.index] -= 1;
  }
  while (durations.reduce((total, duration) => total + duration, 0) < targetDuration) {
    const candidate = durations
      .map((duration, index) => ({ duration, weight: weights[index], index }))
      .filter(({ duration }) => duration < MAX_SCENE_DURATION_SECONDS)
      .sort((left, right) => right.weight - left.weight)[0];
    if (!candidate) {
      throw new ScriptParserError(
        'The requested runtime exceeds the maximum duration for the generated scene count.'
      );
    }
    durations[candidate.index] += 1;
  }
  return durations;
}

async function generateExplainerScenes(
  sourceText,
  userPrompt,
  targetDurationSeconds,
  sceneCount,
  sceneDurations
) {
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    throw new ScriptParserError(
      'Shorts script generation is not configured on the Node service.',
      503
    );
  }
  let endpoint;
  try {
    endpoint = new URL(
      '/api/shorts/scripts/prepare',
      process.env.FLASK_SERVICE_URL || 'http://localhost:5000'
    );
  } catch (error) {
    throw new ScriptParserError(
      'The Flask service URL is invalid.',
      500,
      { cause: error }
    );
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-key': internalKey,
      },
      body: JSON.stringify({
        sourceText,
        userDescription: userPrompt.trim(),
        ...(targetDurationSeconds ? { targetDurationSeconds } : {}),
        ...(sceneCount ? { requestedSceneCount: sceneCount } : {}),
        ...(sceneDurations ? { requestedSceneDurations: sceneDurations } : {}),
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    throw new ScriptParserError(
      'Unable to reach the Sarvam Shorts script-generation service.',
      502,
      { cause: error }
    );
  }
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new ScriptParserError(
      'The Sarvam script-generation service returned an invalid response.',
      502,
      { cause: error }
    );
  }
  if (!response.ok) {
    throw new ScriptParserError(
      typeof payload.error === 'string'
        ? payload.error
        : 'Sarvam could not prepare the explainer scenes.',
      response.status
    );
  }
  if (
    !payload ||
    typeof payload.title !== 'string' ||
    !payload.title.trim() ||
    !Number.isInteger(payload.targetDurationSeconds) ||
    payload.targetDurationSeconds < 1 ||
    payload.targetDurationSeconds > 300 ||
    !Array.isArray(payload.scenes) ||
    payload.scenes.length === 0 ||
    payload.scenes.length > MAX_SCENES
  ) {
    throw new ScriptParserError(
      'Sarvam returned incomplete explainer scene data.',
      502
    );
  }
  if (
    targetDurationSeconds &&
    payload.targetDurationSeconds !== targetDurationSeconds &&
    payload.targetDurationSeconds !== 90
  ) {
    throw new ScriptParserError(
      'Sarvam returned a runtime outside the requested target and 90-second fallback.',
      502
    );
  }

  const generatedScenes = payload.scenes.map((scene, index) => {
    if (
      !scene ||
      !['title', 'concept', 'diagram'].includes(scene.type) ||
      typeof scene.narration !== 'string' ||
      !scene.narration.trim() ||
      typeof scene.visualTitle !== 'string' ||
      !scene.visualTitle.trim() ||
      typeof scene.visualDescription !== 'string' ||
      !scene.visualDescription.trim() ||
      (scene.type === 'diagram' &&
        (typeof scene.mermaidCode !== 'string' || !scene.mermaidCode.trim()))
    ) {
      throw new ScriptParserError(
        `Sarvam returned an invalid explainer scene at position ${index + 1}.`,
        502
      );
    }
    const content = scene.type === 'title'
      ? scene.visualTitle.trim()
      : `${scene.visualTitle.trim()}\n${scene.visualDescription.trim()}`;
    return {
      id: index,
      sequenceNumber: index + 1,
      type: scene.type,
      content,
      narration: scene.narration.trim(),
      visual: {
        type: scene.type === 'diagram' ? 'diagram' : 'slide',
        prompt: scene.visualDescription.trim(),
        ...(scene.type === 'diagram'
          ? { code: scene.mermaidCode.trim(), diagramType: 'mermaid' }
          : {}),
      },
    };
  });
  const targetDuration = payload.targetDurationSeconds;
  const narrationWordCount = generatedScenes.reduce(
    (total, scene) => total + scene.narration.split(/\s+/).length,
    0
  );
  if (narrationWordCount > targetDuration * MAX_NARRATION_WORDS_PER_SECOND) {
    throw new ScriptParserError(
      `Sarvam generated too much narration for the requested ${targetDuration}-second runtime. Shorten the brief and try again.`,
      502
    );
  }
  const hasMatchingRequestedDurations = sceneDurations &&
    sceneDurations.length === generatedScenes.length &&
    sceneDurations.reduce((total, duration) => total + duration, 0) === targetDuration;
  const durations = hasMatchingRequestedDurations
    ? sceneDurations
    : allocateSceneDurations(generatedScenes, targetDuration);
  return {
    title: payload.title.trim(),
    narrationLanguage: extractNarrationLanguage(userPrompt, sourceText),
    targetDurationSeconds: targetDuration,
    scenes: generatedScenes.map((scene, index) => ({
      ...scene,
      duration: durations[index],
    })),
  };
}

async function extractPdfText(file) {
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    throw new ScriptParserError(
      'PDF script extraction is not configured on the Node service.',
      503
    );
  }

  const flaskServiceUrl =
    process.env.FLASK_SERVICE_URL || 'http://localhost:5000';
  let endpoint;

  try {
    endpoint = new URL('/api/shorts/scripts/extract', flaskServiceUrl);
  } catch (error) {
    throw new ScriptParserError(
      'The Flask service URL is invalid.',
      500,
      { cause: error }
    );
  }

  const formData = new FormData();
  formData.append(
    'file',
    new Blob([file.buffer], { type: 'application/pdf' }),
    file.originalname
  );

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'x-internal-key': internalKey },
      body: formData,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new ScriptParserError(
      'Unable to reach the PDF text extraction service.',
      502,
      { cause: error }
    );
  }

  const responseText = await response.text();
  let payload;
  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    if (response.ok) {
      throw new ScriptParserError(
        'The PDF text extraction service returned an invalid response.',
        502,
        { cause: error }
      );
    }
    payload = {};
  }

  if (!response.ok) {
    throw new ScriptParserError(
      payload.error || `PDF text extraction failed (${response.status}).`,
      response.status
    );
  }

  if (typeof payload.text !== 'string' || !payload.text.trim()) {
    throw new ScriptParserError(
      'No text could be extracted from the PDF.',
      422
    );
  }

  return payload.text;
}

async function extractScriptText(file) {
  if (!file || !file.originalname || !Buffer.isBuffer(file.buffer)) {
    throw new ScriptParserError('A script file is required.');
  }

  if (file.buffer.length === 0) {
    throw new ScriptParserError('The script file is empty.');
  }

  if (file.buffer.length > MAX_SCRIPT_BYTES) {
    throw new ScriptParserError('Script files must be 10 MB or smaller.');
  }

  const extension = getFileExtension(file.originalname);
  if (extension === '.md' || extension === '.markdown') {
    return file.buffer.toString('utf8');
  }

  if (extension === '.docx') {
    let result;
    try {
      result = await mammoth.extractRawText({ buffer: file.buffer });
    } catch (error) {
      throw new ScriptParserError(
        'Could not read the DOCX file. Make sure it is a valid Word document.',
        400,
        { cause: error }
      );
    }

    if (!result.value.trim()) {
      throw new ScriptParserError(
        'No text could be extracted from the DOCX file.',
        422
      );
    }
    return result.value;
  }

  if (extension === '.pdf') {
    return extractPdfText(file);
  }

  if (extension === '.doc') {
    throw new ScriptParserError(
      'Legacy .doc files are not supported. Save the script as .docx.'
    );
  }

  throw new ScriptParserError(
    'Unsupported script type. Upload a Markdown, PDF, or DOCX file.'
  );
}

async function parseScript(file, userPrompt = '', options = {}) {
  if (typeof userPrompt !== 'string') {
    throw new ScriptParserError('Additional context must be text.');
  }

  const text = await extractScriptText(file);
  if (!text.trim()) {
    throw new ScriptParserError('No text could be extracted from the script.', 422);
  }
  if (text.length > MAX_PREPARATION_SOURCE_CHARACTERS) {
    throw new ScriptParserError(
      'The extracted script is too long for AI scene preparation. Shorten the document and try again.',
      413
    );
  }
  if (userPrompt.length > 2000) {
    throw new ScriptParserError(
      'The additional description must be 2,000 characters or fewer.'
    );
  }

  const sceneDurations = extractSceneDurations(text);
  const sceneDurationList = extractSceneDurationList(text);
  const sceneCount = (
    text.match(/^#{1,6}\s*scene\s+\d+\b/gim) || []
  ).length;
  const intro = text.split(/^#{1,6}\s*scene\s+\d+\b/im, 1)[0];
  const requestedDuration = options.targetDurationSeconds;
  if (
    requestedDuration !== undefined &&
    (!Number.isInteger(requestedDuration) ||
      requestedDuration < 30 ||
      requestedDuration > 60)
  ) {
    throw new ScriptParserError(
      'Choose a target runtime between 30 and 60 seconds.'
    );
  }
  const promptDuration = extractExplicitDuration([userPrompt]);
  const documentDuration = extractExplicitDuration([intro]) ?? sceneDurations;
  const targetDurationSeconds = requestedDuration
    ?? promptDuration
    ?? documentDuration;
  const requestedSceneCount = requestedDuration === undefined ? sceneCount : null;
  if (
    targetDurationSeconds !== null &&
    (targetDurationSeconds < 1 || targetDurationSeconds > 300)
  ) {
    throw new ScriptParserError(
      'Shorts runtime must be between 1 second and 5 minutes.'
    );
  }

  const requestedSceneDurations = requestedDuration === undefined &&
    sceneDurationList &&
    (targetDurationSeconds === null ||
      sceneDurationList.reduce((total, duration) => total + duration, 0) === targetDurationSeconds)
    ? sceneDurationList
    : null;

  const prepared = await generateExplainerScenes(
    text,
    userPrompt,
    targetDurationSeconds,
    requestedSceneCount,
    requestedSceneDurations
  );
  if (
    targetDurationSeconds &&
    prepared.targetDurationSeconds !== targetDurationSeconds &&
    !(requestedDuration !== undefined && prepared.targetDurationSeconds === 90)
  ) {
    throw new ScriptParserError(
      'Sarvam did not honor the requested Shorts runtime.',
      502
    );
  }
  if (
    requestedSceneCount > 0 &&
    prepared.targetDurationSeconds >= requestedSceneCount &&
    prepared.scenes.length !== requestedSceneCount
  ) {
    throw new ScriptParserError(
      'Sarvam did not preserve the scene count specified in the source document.',
      502
    );
  }
  return prepared;
}

module.exports = {
  allocateSceneDurations,
  extractExplicitDuration,
  extractNarrationLanguage,
  extractSceneDurationList,
  extractSceneDurations,
  parseScript,
  ScriptParserError,
};
