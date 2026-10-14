const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const zlib = require('node:zlib');
const ffmpeg = require('ffmpeg-static');
const { composeVideo } = require('../services/videoComposer');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function makePng() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(Buffer.from([0, 255, 0, 0]))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeWav(durationSeconds) {
  const sampleRate = 8000;
  const frameCount = sampleRate * durationSeconds;
  const wav = Buffer.alloc(44 + frameCount * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(frameCount * 2, 40);
  return wav;
}

test('muxes narration into MP4 and matches its duration', async () => {
  const storagePath = await fs.mkdtemp(path.join(os.tmpdir(), 'shorts-video-test-'));
  try {
    const shortId = '123e4567-e89b-12d3-a456-426614174000';
    const scenePath = path.join('scenes', `${shortId}_scene_0.png`);
    const absoluteScenePath = path.join(storagePath, scenePath);
    const audioPath = path.join(storagePath, 'audio', `${shortId}_hindi.wav`);
    await fs.mkdir(path.dirname(absoluteScenePath), { recursive: true });
    await fs.mkdir(path.dirname(audioPath), { recursive: true });
    await fs.writeFile(absoluteScenePath, makePng());
    await fs.writeFile(audioPath, makeWav(2));

    const result = await composeVideo(
      [{
        id: 0,
        duration: 1,
        visual: { imagePath: scenePath },
      }],
      shortId,
      'youtube',
      '720p',
      {
        storagePath,
        audioPath,
        audioDuration: 2,
        language: 'hindi',
      }
    );

    assert.equal(result.duration, 2);
    assert.equal(result.hasAudio, true);
    const outputPath = path.join(storagePath, 'final', path.basename(result.videoFile));
    const probe = spawnSync(ffmpeg, ['-hide_banner', '-i', outputPath], {
      encoding: 'utf8',
    });

    const report = probe.stderr || '';
    assert.match(report, /Video: h264/);
    assert.match(report, /Audio: aac/);
    const durationMatch = report.match(/Duration: (\d+):(\d+):([\d.]+)/);
    assert.ok(durationMatch, 'FFmpeg should report the output duration.');
    const outputDuration = Number(durationMatch[1]) * 3600
      + Number(durationMatch[2]) * 60
      + Number(durationMatch[3]);
    assert.ok(
      Math.abs(outputDuration - result.duration) <= 0.1,
      `Expected output duration ${result.duration}s, got ${outputDuration}s.`
    );
  } finally {
    await fs.rm(storagePath, { recursive: true, force: true });
  }
});

test('fits a longer requested scene timeline to shorter narration', async () => {
  const storagePath = await fs.mkdtemp(path.join(os.tmpdir(), 'shorts-video-padding-test-'));
  try {
    const shortId = '123e4567-e89b-12d3-a456-426614174001';
    const scenePath = path.join('scenes', `${shortId}_scene_0.png`);
    const absoluteScenePath = path.join(storagePath, scenePath);
    const audioPath = path.join(storagePath, 'audio', `${shortId}_tamil.wav`);
    await fs.mkdir(path.dirname(absoluteScenePath), { recursive: true });
    await fs.mkdir(path.dirname(audioPath), { recursive: true });
    await fs.writeFile(absoluteScenePath, makePng());
    await fs.writeFile(audioPath, makeWav(1.5));

    const result = await composeVideo(
      [{ id: 0, duration: 2, visual: { imagePath: scenePath } }],
      shortId,
      'youtube',
      '720p',
      { storagePath, audioPath, audioDuration: 1.5, language: 'tamil' }
    );

    assert.equal(result.duration, 1.5);
    assert.equal(result.hasAudio, true);
    const outputPath = path.join(storagePath, 'final', path.basename(result.videoFile));
    const probe = spawnSync(ffmpeg, ['-hide_banner', '-i', outputPath], {
      encoding: 'utf8',
    });
    const report = probe.stderr || '';
    assert.match(report, /Video: h264/);
    assert.match(report, /Audio: aac/);
    const durationMatch = report.match(/Duration: (\d+):(\d+):([\d.]+)/);
    assert.ok(durationMatch, 'FFmpeg should report the output duration.');
    const outputDuration = Number(durationMatch[1]) * 3600
      + Number(durationMatch[2]) * 60
      + Number(durationMatch[3]);
    assert.ok(Math.abs(outputDuration - 1.5) <= 0.1);
  } finally {
    await fs.rm(storagePath, { recursive: true, force: true });
  }
});

test('renders the full scene sequence at the narration duration without a silent tail', async () => {
  const storagePath = await fs.mkdtemp(path.join(os.tmpdir(), 'shorts-video-short-audio-test-'));
  try {
    const shortId = '123e4567-e89b-12d3-a456-426614174002';
    const scenePath = path.join('scenes', `${shortId}_scene_0.png`);
    const absoluteScenePath = path.join(storagePath, scenePath);
    const audioPath = path.join(storagePath, 'audio', `${shortId}_tamil.wav`);
    await fs.mkdir(path.dirname(absoluteScenePath), { recursive: true });
    await fs.mkdir(path.dirname(audioPath), { recursive: true });
    await fs.writeFile(absoluteScenePath, makePng());
    await fs.writeFile(audioPath, makeWav(0.5));

    const result = await composeVideo(
      [{ id: 0, duration: 2, visual: { imagePath: scenePath } }],
      shortId,
      'youtube',
      '720p',
      { storagePath, audioPath, audioDuration: 0.5, language: 'tamil' }
    );

    assert.equal(result.duration, 0.5);
    assert.equal(result.hasAudio, true);
  } finally {
    await fs.rm(storagePath, { recursive: true, force: true });
  }
});
