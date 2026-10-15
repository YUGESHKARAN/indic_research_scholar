process.env.JWT_SECRET = 'shorts-route-tests-only';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const Short = require('../models/Short');
const videoComposer = require('../services/videoComposer');

const userId = '507f1f77bcf86cd799439011';
const shortId = '123e4567-e89b-12d3-a456-426614174000';
const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);
const defaultSpeakers = {
  english: 'girish_en_documentary',
  hindi: 'simran_hi_narration',
  tamil: 'gokul_ta_narration',
  telugu: 'kavitha_te_narration',
  kannada: 'chaitra_kn_narration',
  malayalam: 'shubh',
  bengali: 'roopa_bn_conversational',
  marathi: 'mrunal_mr_narration',
  gujarati: 'bhavik_gu_conversation',
};
let storageRoot;
let apiServer;
let flaskServer;
let apiUrl;
let flaskUrl;
let shortDocument;
let lookupQuery;
let audioServiceStatus = 200;
let audioServiceDuration = 3.25;
let audioServiceCalls = 0;
let translationServiceCalls = 0;
let lastAudioPayload;
let lastTranslationPayload;
let composeCalls = 0;
let savedDocuments = 0;
let composeImplementation;
let lastComposeArguments;

function makeShort() {
  return {
    shortId,
    userId,
    platform: 'youtube',
    resolution: '1080p',
    narrationLanguage: 'hindi',
    scenes: [
      {
        id: 0,
        sequenceNumber: 1,
        duration: 5,
        type: 'concept',
        content: 'Narration for the short.',
        visual: { type: 'slide', imagePath: `scenes/${shortId}_scene_0.png` },
      },
    ],
    audioFiles: [],
    status: 'draft',
    async save() {
      savedDocuments += 1;
    },
  };
}

before(async () => {
  storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'shorts-render-test-'));
  process.env.SHORTS_STORAGE_PATH = storageRoot;
  process.env.INTERNAL_API_KEY = 'shorts-internal-test-key';

  flaskServer = http.createServer(async (request, response) => {
    let requestBody = '';
    for await (const chunk of request) requestBody += chunk;
    const payload = JSON.parse(requestBody);
    response.setHeader('content-type', 'application/json');
    if (request.url === '/api/shorts/scripts/translate') {
      translationServiceCalls += 1;
      lastTranslationPayload = payload;
      response.end(JSON.stringify({
        translations: payload.texts.map((text) => `translated: ${text}`),
      }));
      return;
    }

    audioServiceCalls += 1;
    lastAudioPayload = payload;
    if (audioServiceStatus !== 200) {
      response.statusCode = audioServiceStatus;
      response.end(JSON.stringify({ error: 'Mock TTS failure.' }));
      return;
    }
    const audioPath = path.join(
      storageRoot,
      'audio',
      `${payload.shortId}_${payload.language}.wav`
    );
    await fs.mkdir(path.dirname(audioPath), { recursive: true });
    await fs.writeFile(audioPath, 'mock wav');
    response.end(JSON.stringify({
      success: true,
      audioFile: `audio/${payload.shortId}_${payload.language}.wav`,
      sourceLanguage: payload.sourceLanguage,
      language: payload.language,
      speaker: payload.speaker || defaultSpeakers[payload.language],
      duration: audioServiceDuration,
    }));
  });
  await new Promise((resolve) => flaskServer.listen(0, '127.0.0.1', resolve));
  flaskUrl = `http://127.0.0.1:${flaskServer.address().port}`;
  process.env.FLASK_SERVICE_URL = flaskUrl;

  composeImplementation = async (scenes, _id, platform, resolution, options) => {
    const sceneDuration = scenes.reduce((total, scene) => total + scene.duration, 0);
    return {
      videoFile: `public/videos/final/${shortId}_${platform}_${resolution}_${options.language}.mp4`,
      duration: options.audioDuration,
      width: 1920,
      height: 1080,
      hasAudio: true,
      fileSize: 1024,
    };
  };
  videoComposer.composeVideo = async (...args) => {
    composeCalls += 1;
    lastComposeArguments = args;
    return composeImplementation(...args);
  };

  Short.findOne = async (query) => {
    lookupQuery = query;
    return shortDocument;
  };

  const app = express();
  app.use(express.json());
  app.use('/api/shorts', require('../routes/shorts'));
  apiServer = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => apiServer.once('listening', resolve));
  apiUrl = `http://127.0.0.1:${apiServer.address().port}`;
});

after(async () => {
  if (apiServer) await new Promise((resolve) => apiServer.close(resolve));
  if (flaskServer) await new Promise((resolve) => flaskServer.close(resolve));
  await fs.rm(storageRoot, { recursive: true, force: true });
});

test('render fits requested scenes to selected-language audio and embeds it', async () => {
  shortDocument = makeShort();
  audioServiceStatus = 200;
  audioServiceDuration = 5;
  audioServiceCalls = 0;
  composeCalls = 0;
  lastComposeArguments = undefined;
  savedDocuments = 0;
  const response = await fetch(`${apiUrl}/api/shorts/${shortId}/render`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ language: 'tamil', speaker: 'vijay_ta_narration' }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.videoUrl, `/api/shorts/${shortId}/video?language=tamil`);
  assert.equal(payload.audioUrl, `/api/shorts/${shortId}/audio/tamil/file`);
  assert.equal(payload.audioFile, `audio/${shortId}_tamil.wav`);
  assert.equal(payload.duration, 5);
  assert.equal(payload.requestedSceneDurationSeconds, 5);
  assert.equal(payload.audioDuration, 5);
  assert.deepEqual(lookupQuery, { shortId, userId });
  assert.equal(audioServiceCalls, 1);
  assert.equal(composeCalls, 1);
  assert.equal(savedDocuments, 2);
  assert.equal(shortDocument.status, 'ready');
  assert.equal(shortDocument.audioFiles[0].language, 'tamil');
  assert.equal(shortDocument.audioFiles[0].sourceLanguage, 'hindi');
  assert.equal(shortDocument.audioFiles[0].speaker, 'vijay_ta_narration');
  assert.equal(lastAudioPayload.sourceLanguage, 'hindi');
  assert.equal(lastAudioPayload.language, 'tamil');
  assert.equal(lastAudioPayload.speaker, 'vijay_ta_narration');
  assert.equal(payload.speaker, 'vijay_ta_narration');
  assert.equal(
    shortDocument.videoFile,
    `public/videos/final/${shortId}_youtube_1080p_tamil.mp4`
  );
  assert.equal(shortDocument.videoLanguage, 'tamil');
  assert.equal(shortDocument.audioFiles[0].videoFile, shortDocument.videoFile);
  assert.equal(lastComposeArguments[4].audioDuration, 5);
  assert.equal(lastComposeArguments[4].language, 'tamil');
  assert.equal(
    lastComposeArguments[4].audioPath,
    path.join(storageRoot, 'audio', `${shortId}_tamil.wav`)
  );
});

test('renders an English voice track through the API', async () => {
  shortDocument = makeShort();
  audioServiceStatus = 200;
  audioServiceDuration = 5;
  audioServiceCalls = 0;
  composeCalls = 0;

  const response = await fetch(`${apiUrl}/api/shorts/${shortId}/render`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ language: 'english' }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.language, 'english');
  assert.equal(payload.audioFile, `audio/${shortId}_english.wav`);
  assert.equal(payload.audioUrl, `/api/shorts/${shortId}/audio/english/file`);
  assert.equal(payload.videoUrl, `/api/shorts/${shortId}/video?language=english`);
  assert.equal(shortDocument.audioFiles[0].language, 'english');
  assert.equal(shortDocument.videoLanguage, 'english');
  assert.equal(audioServiceCalls, 1);
  assert.equal(composeCalls, 1);
  assert.equal(lastComposeArguments[4].language, 'english');
});

test('saves edited narration and invalidates generated audio and video', async () => {
  shortDocument = makeShort();
  shortDocument.scenes[0].narration = 'The original narration.';
  shortDocument.scenes[0].narrationTranslations = { tamil: 'Stale translation.' };
  shortDocument.audioFiles = [{
    language: 'hindi',
    speaker: 'simran_hi_narration',
    file: `audio/${shortId}_hindi.wav`,
    duration: 5,
    videoFile: `public/videos/final/${shortId}_youtube_1080p_hindi.mp4`,
  }];
  shortDocument.videoFile = `public/videos/final/${shortId}_youtube_1080p_hindi.mp4`;
  shortDocument.videoUrl = `/api/shorts/${shortId}/video?language=hindi`;
  shortDocument.videoLanguage = 'hindi';
  shortDocument.status = 'ready';
  savedDocuments = 0;

  const response = await fetch(`${apiUrl}/api/shorts/${shortId}/scenes`, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      scenes: [{
        id: 0,
        duration: 5,
        narration: '  The revised narration.  ',
      }],
    }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(shortDocument.scenes[0].narration, 'The revised narration.');
  assert.deepEqual(shortDocument.scenes[0].narrationTranslations, {});
  assert.equal(shortDocument.audioFiles.length, 0);
  assert.equal(shortDocument.videoFile, undefined);
  assert.equal(shortDocument.videoUrl, undefined);
  assert.equal(shortDocument.videoLanguage, undefined);
  assert.equal(shortDocument.status, 'draft');
  assert.equal(savedDocuments, 1);
});

test('saves edited translated narration without changing the source narration', async () => {
  shortDocument = makeShort();
  shortDocument.scenes[0].narration = 'Original narration.';
  shortDocument.scenes[0].narrationTranslations = { tamil: 'Old translation.' };
  shortDocument.audioFiles = [{
    language: 'tamil',
    file: `audio/${shortId}_tamil.wav`,
    duration: 5,
  }];
  shortDocument.videoFile = `public/videos/final/${shortId}_youtube_1080p_tamil.mp4`;
  shortDocument.videoUrl = `/api/shorts/${shortId}/video?language=tamil`;
  shortDocument.videoLanguage = 'tamil';
  savedDocuments = 0;

  const response = await fetch(`${apiUrl}/api/shorts/${shortId}/scenes`, {
    method: 'PATCH',
    headers: {
      authorization: 'Bearer ' + token,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      scenes: [{
        id: 0,
        duration: 5,
        narration: 'Original narration.',
        narrationTranslations: { tamil: 'Updated Tamil narration.' },
      }],
    }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(shortDocument.scenes[0].narration, 'Original narration.');
  assert.deepEqual(shortDocument.scenes[0].narrationTranslations, {
    tamil: 'Updated Tamil narration.',
  });
  assert.equal(shortDocument.audioFiles.length, 0);
  assert.equal(shortDocument.videoFile, undefined);
  assert.equal(savedDocuments, 1);
});

test('translates and persists narration for a selected language', async () => {
  shortDocument = makeShort();
  translationServiceCalls = 0;
  savedDocuments = 0;

  const response = await fetch(
    `${apiUrl}/api/shorts/${shortId}/translate/tamil`,
    {
      method: 'POST',
      headers: { authorization: 'Bearer ' + token },
    }
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload, {
    language: 'tamil',
    scenes: [{ id: 0, narration: 'translated: Narration for the short.' }],
  });
  assert.equal(translationServiceCalls, 1);
  assert.equal(lastTranslationPayload.sourceLanguage, 'hindi');
  assert.equal(lastTranslationPayload.targetLanguage, 'tamil');
  assert.deepEqual(
    shortDocument.scenes[0].narrationTranslations,
    { tamil: 'translated: Narration for the short.' }
  );
  assert.equal(savedDocuments, 1);

  const cachedResponse = await fetch(
    `${apiUrl}/api/shorts/${shortId}/translate/tamil`,
    {
      method: 'POST',
      headers: { authorization: 'Bearer ' + token },
    }
  );
  assert.equal(cachedResponse.status, 200);
  assert.equal(translationServiceCalls, 1);
  assert.equal(savedDocuments, 1);
});

test('uses saved translated narration as the audio source without retranslating', async () => {
  shortDocument = makeShort();
  shortDocument.scenes[0].narrationTranslations = {
    tamil: 'தமிழில் மொழிபெயர்க்கப்பட்ட உரை.',
  };
  audioServiceCalls = 0;
  translationServiceCalls = 0;

  const response = await fetch(`${apiUrl}/api/shorts/${shortId}/render`, {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + token,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ language: 'tamil' }),
  });

  assert.equal(response.status, 200);
  assert.equal(audioServiceCalls, 1);
  assert.equal(translationServiceCalls, 0);
  assert.equal(lastAudioPayload.script, 'தமிழில் மொழிபெயர்க்கப்பட்ட உரை.');
  assert.equal(lastAudioPayload.sourceLanguage, 'tamil');
});

test('rejects empty edited narration without saving scene changes', async () => {
  shortDocument = makeShort();
  shortDocument.scenes[0].narration = 'The original narration.';
  savedDocuments = 0;

  const response = await fetch(`${apiUrl}/api/shorts/${shortId}/scenes`, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      scenes: [{ id: 0, duration: 5, narration: '   ' }],
    }),
  });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.match(payload.error, /narration must contain/);
  assert.equal(shortDocument.scenes[0].narration, 'The original narration.');
  assert.equal(savedDocuments, 0);
});

test('renders successfully when narration is shorter than the requested scene timeline', async () => {
  shortDocument = makeShort();
  audioServiceDuration = 3.25;
  composeCalls = 0;
  savedDocuments = 0;

  const response = await fetch(`${apiUrl}/api/shorts/${shortId}/render`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ language: 'tamil' }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.duration, 3.25);
  assert.equal(payload.requestedSceneDurationSeconds, 5);
  assert.equal(payload.audioDuration, 3.25);
  assert.equal(composeCalls, 1);
  assert.equal(shortDocument.status, 'ready');
  assert.equal(shortDocument.duration, 3.25);
  assert.equal(shortDocument.videoFile, `public/videos/final/${shortId}_youtube_1080p_tamil.mp4`);
  audioServiceDuration = 5;
});

test('extends the visual timeline to preserve narration longer than two minutes', async () => {
  shortDocument = makeShort();
  audioServiceDuration = 202;
  composeCalls = 0;
  const response = await fetch(`${apiUrl}/api/shorts/${shortId}/render`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ language: 'hindi' }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.duration, 202);
  assert.equal(payload.audioDuration, 202);
  assert.equal(lastComposeArguments[4].audioDuration, 202);
  assert.equal(
    shortDocument.videoFile,
    `public/videos/final/${shortId}_youtube_1080p_hindi.mp4`
  );
  audioServiceDuration = 5;
});

test('rejects unauthenticated render requests without looking up a short', async () => {
  lookupQuery = undefined;
  const response = await fetch(`${apiUrl}/api/shorts/${shortId}/render`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ language: 'hindi' }),
  });
  assert.equal(response.status, 401);
  assert.equal(lookupQuery, undefined);
});

test('does not compose or persist when the audio service fails', async () => {
  shortDocument = makeShort();
  audioServiceStatus = 502;
  composeCalls = 0;
  savedDocuments = 0;
  const response = await fetch(`${apiUrl}/api/shorts/${shortId}/render`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ language: 'hindi' }),
  });
  const payload = await response.json();

  assert.equal(response.status, 502);
  assert.match(payload.error, /Mock TTS failure/);
  assert.equal(composeCalls, 0);
  assert.equal(savedDocuments, 0);
});

test('reuses an existing valid language WAV instead of calling Sarvam again', async () => {
  shortDocument = makeShort();
  shortDocument.audioFiles = [{
    language: 'hindi',
    speaker: 'simran_hi_narration',
    file: `audio/${shortId}_hindi.wav`,
    duration: 5,
  }];
  const existingAudioPath = path.join(
    storageRoot,
    'audio',
    `${shortId}_hindi.wav`
  );
  await fs.mkdir(path.dirname(existingAudioPath), { recursive: true });
  await fs.writeFile(existingAudioPath, 'cached wav');
  audioServiceStatus = 200;
  audioServiceCalls = 0;
  savedDocuments = 0;
  const response = await fetch(`${apiUrl}/api/shorts/${shortId}/render`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ language: 'hindi' }),
  });

  assert.equal(response.status, 200);
  assert.equal(audioServiceCalls, 0);
  assert.equal(savedDocuments, 1);
});

test('regenerates cached audio when a different speaker is selected', async () => {
  shortDocument = makeShort();
  shortDocument.audioFiles = [{
    language: 'hindi',
    speaker: 'simran_hi_narration',
    file: `audio/${shortId}_hindi.wav`,
    duration: 5,
  }];
  const existingAudioPath = path.join(
    storageRoot,
    'audio',
    `${shortId}_hindi.wav`
  );
  await fs.mkdir(path.dirname(existingAudioPath), { recursive: true });
  await fs.writeFile(existingAudioPath, 'cached wav');
  audioServiceStatus = 200;
  audioServiceCalls = 0;
  const response = await fetch(`${apiUrl}/api/shorts/${shortId}/render`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      language: 'hindi',
      speaker: 'anand_hi_documentary',
    }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(audioServiceCalls, 1);
  assert.equal(lastAudioPayload.speaker, 'anand_hi_documentary');
  assert.equal(shortDocument.audioFiles[0].speaker, 'anand_hi_documentary');
  assert.equal(payload.speaker, 'anand_hi_documentary');
});

test('regenerates legacy translated audio that has no source-language metadata', async () => {
  shortDocument = makeShort();
  shortDocument.audioFiles = [{
    language: 'tamil',
    file: `audio/${shortId}_tamil.wav`,
    duration: 5,
  }];
  const oldAudioPath = path.join(
    storageRoot,
    'audio',
    `${shortId}_tamil.wav`
  );
  await fs.mkdir(path.dirname(oldAudioPath), { recursive: true });
  await fs.writeFile(oldAudioPath, 'legacy untranslated wav');
  audioServiceCalls = 0;
  savedDocuments = 0;

  const response = await fetch(`${apiUrl}/api/shorts/${shortId}/audio/tamil`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  assert.equal(audioServiceCalls, 1);
  assert.equal(lastAudioPayload.sourceLanguage, 'hindi');
  assert.equal(shortDocument.audioFiles[0].sourceLanguage, 'hindi');
  assert.equal(savedDocuments, 1);
});

test('returns owner-scoped audio metadata and streams its WAV file', async () => {
  shortDocument = makeShort();
  shortDocument.audioFiles = [{
    language: 'tamil',
    file: `audio/${shortId}_tamil.wav`,
    duration: 3.25,
  }];
  const audioPath = path.join(storageRoot, 'audio', `${shortId}_tamil.wav`);
  await fs.mkdir(path.dirname(audioPath), { recursive: true });
  await fs.writeFile(audioPath, 'test wav bytes');

  const metadataResponse = await fetch(
    `${apiUrl}/api/shorts/${shortId}/audio/tamil`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  const metadata = await metadataResponse.json();
  assert.equal(metadataResponse.status, 200);
  assert.equal(metadata.audioUrl, `/api/shorts/${shortId}/audio/tamil/file`);
  assert.equal(metadata.duration, 3.25);

  const fileResponse = await fetch(
    `${apiUrl}/api/shorts/${shortId}/audio/tamil/file`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  assert.equal(fileResponse.status, 200);
  assert.match(fileResponse.headers.get('content-type'), /audio\/wav/);
  assert.equal(await fileResponse.text(), 'test wav bytes');
  assert.deepEqual(lookupQuery, { shortId, userId });
});

test('streams the rendered MP4 through an authenticated owner lookup', async () => {
  shortDocument = makeShort();
  shortDocument.videoFile = `public/videos/final/${shortId}_youtube_1080p.mp4`;
  const videoPath = path.join(
    storageRoot,
    'final',
    `${shortId}_youtube_1080p.mp4`
  );
  await fs.mkdir(path.dirname(videoPath), { recursive: true });
  await fs.writeFile(videoPath, 'test mp4 bytes');

  const response = await fetch(`${apiUrl}/api/shorts/${shortId}/video`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /video\/mp4/);
  assert.equal(await response.text(), 'test mp4 bytes');
  assert.deepEqual(lookupQuery, { shortId, userId });

  const downloadResponse = await fetch(
    `${apiUrl}/api/shorts/${shortId}/video?download=1`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  assert.equal(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
  assert.equal(await downloadResponse.text(), 'test mp4 bytes');
});

test('streams the selected language video containing its embedded audio', async () => {
  shortDocument = makeShort();
  const videoFile = `public/videos/final/${shortId}_youtube_1080p_tamil.mp4`;
  shortDocument.videoFile = videoFile;
  shortDocument.videoLanguage = 'tamil';
  shortDocument.audioFiles = [{
    language: 'tamil',
    file: `audio/${shortId}_tamil.wav`,
    duration: 202,
    videoFile,
  }];
  const videoPath = path.join(
    storageRoot,
    'final',
    `${shortId}_youtube_1080p_tamil.mp4`
  );
  await fs.mkdir(path.dirname(videoPath), { recursive: true });
  await fs.writeFile(videoPath, 'video with tamil audio');

  const response = await fetch(
    `${apiUrl}/api/shorts/${shortId}/video?language=tamil`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'video with tamil audio');

  const downloadResponse = await fetch(
    `${apiUrl}/api/shorts/${shortId}/video?language=tamil&download=1`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  assert.equal(downloadResponse.status, 200);
  assert.match(
    downloadResponse.headers.get('content-disposition'),
    new RegExp(`${shortId}_tamil\\.mp4`)
  );
});

test("lists only the authenticated user's shorts with compact card data", async () => {
  const originalFind = Short.find;
  const createdAt = new Date('2026-01-02T03:04:05.000Z');
  Short.find = (query) => {
    assert.deepEqual(query, { userId });
    return {
      select(fields) {
        assert.equal(fields, 'shortId title scenes duration platform createdAt status');
        return this;
      },
      sort(order) {
        assert.deepEqual(order, { createdAt: -1 });
        return this;
      },
      async lean() {
        return [{
          shortId,
          title: 'Test short',
          scenes: [{ visual: { thumbnail: 'data:image/png;base64,preview' } }],
          duration: 5,
          platform: 'youtube',
          createdAt,
          status: 'ready',
        }];
      },
    };
  };
  try {
    const response = await fetch(`${apiUrl}/api/shorts/list`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(payload.shorts, [{
      id: shortId,
      title: 'Test short',
      thumbnail: 'data:image/png;base64,preview',
      duration: 5,
      platform: 'youtube',
      createdAt: createdAt.toISOString(),
      status: 'ready',
    }]);
  } finally {
    Short.find = originalFind;
  }
});

test('does not reveal audio or video for shorts not owned by the caller', async () => {
  shortDocument = null;
  for (const url of [
    `${apiUrl}/api/shorts/${shortId}/audio/tamil`,
    `${apiUrl}/api/shorts/${shortId}/video`,
  ]) {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 404);
  }
  assert.deepEqual(lookupQuery, { shortId, userId });
});

test('generates another language WAV without rerendering the video', async () => {
  shortDocument = makeShort();
  audioServiceStatus = 200;
  audioServiceCalls = 0;
  composeCalls = 0;
  savedDocuments = 0;
  const response = await fetch(
    `${apiUrl}/api/shorts/${shortId}/audio/marathi`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    }
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.language, 'marathi');
  assert.equal(payload.audioUrl, `/api/shorts/${shortId}/audio/marathi/file`);
  assert.equal(audioServiceCalls, 1);
  assert.equal(composeCalls, 0);
  assert.equal(savedDocuments, 1);
  assert.equal(shortDocument.audioFiles[0].file, `audio/${shortId}_marathi.wav`);
  assert.equal(shortDocument.audioFiles[0].sourceLanguage, 'hindi');
  assert.equal(lastAudioPayload.sourceLanguage, 'hindi');
});

test('returns an owner-filtered short detail for resuming the editor', async () => {
  shortDocument = makeShort();
  shortDocument.scenes[0].narrationTranslations = {
    tamil: 'தமிழில் பேசப்படும் உரை.',
  };
  shortDocument.audioFiles = [{
    language: 'tamil',
    speaker: 'vijay_ta_narration',
    file: `audio/${shortId}_tamil.wav`,
    duration: 5,
  }];
  const originalFindOne = Short.findOne;
  Short.findOne = (query) => {
    lookupQuery = query;
    return { lean: async () => shortDocument };
  };
  try {
    const response = await fetch(`${apiUrl}/api/shorts/${shortId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.shortId, shortId);
    assert.equal(payload.scenes[0].content, 'Narration for the short.');
    assert.deepEqual(payload.scenes[0].narrationTranslations, {
      tamil: 'தமிழில் பேசப்படும் உரை.',
    });
    assert.equal(payload.audioFiles[0].speaker, 'vijay_ta_narration');
    assert.deepEqual(lookupQuery, { shortId, userId });
  } finally {
    Short.findOne = originalFindOne;
  }
});

test('deletes an owned Short and only its generated media', async () => {
  shortDocument = makeShort();
  shortDocument.audioFiles = [{
    language: 'tamil',
    file: `audio/${shortId}_tamil.wav`,
    duration: 12,
    videoFile: `public/videos/final/${shortId}_youtube_1080p_tamil.mp4`,
  }];
  const ownedAssets = [
    path.join(storageRoot, 'scenes', `${shortId}_scene_0.png`),
    path.join(storageRoot, 'audio', `${shortId}_tamil.wav`),
    path.join(storageRoot, 'final', `${shortId}_youtube_1080p_tamil.mp4`),
    path.join(storageRoot, 'final', `${shortId}_youtube_1080p.mp4`),
  ];
  const unrelatedAsset = path.join(storageRoot, 'audio', 'another-short_hindi.wav');
  await Promise.all(
    [...ownedAssets, unrelatedAsset].map(async (filePath) => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, 'generated asset');
    })
  );

  const originalDeleteOne = Short.deleteOne;
  Short.deleteOne = async (query) => {
    assert.deepEqual(query, { shortId, userId });
    shortDocument = null;
    return { deletedCount: 1 };
  };
  try {
    const response = await fetch(`${apiUrl}/api/shorts/${shortId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, shortId });
    assert.deepEqual(lookupQuery, { shortId, userId });
    for (const assetPath of ownedAssets) {
      await assert.rejects(fs.access(assetPath), { code: 'ENOENT' });
    }
    await fs.access(unrelatedAsset);
  } finally {
    Short.deleteOne = originalDeleteOne;
  }
});

test('does not delete a Short when the caller is unauthenticated or does not own it', async () => {
  let deleteCalls = 0;
  const originalDeleteOne = Short.deleteOne;
  Short.deleteOne = async () => {
    deleteCalls += 1;
    return { deletedCount: 1 };
  };
  try {
    const unauthenticated = await fetch(`${apiUrl}/api/shorts/${shortId}`, {
      method: 'DELETE',
    });
    assert.equal(unauthenticated.status, 401);

    shortDocument = null;
    const notOwned = await fetch(`${apiUrl}/api/shorts/${shortId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(notOwned.status, 404);
    assert.deepEqual(lookupQuery, { shortId, userId });
    assert.equal(deleteCalls, 0);
  } finally {
    Short.deleteOne = originalDeleteOne;
  }
});
