const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const ffmpegStatic = require('ffmpeg-static');
const { getDimensions } = require('./visualGenerator');

const MAX_SCENES = 50;
const MAX_SCENE_DURATION_SECONDS = 60;
const MAX_VIDEO_DURATION_SECONDS = 300;
const MAX_OUTPUT_BYTES = 500 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 60_000;
const VIDEO_FPS = 30;

class VideoComposerError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'VideoComposerError';
  }
}

function resolveScenePath(scene, index, shortId, scenesDirectory) {
  const fileName = path.basename(scene.visual.imagePath || '');
  const expectedName = `${shortId}_scene_${scene.id}.png`;

  if (
    !Number.isInteger(scene.id) ||
    scene.id < 0 ||
    fileName !== expectedName ||
    path.extname(fileName).toLowerCase() !== '.png'
  ) {
    throw new VideoComposerError(`Scene ${index + 1} has an invalid image path.`);
  }

  return path.join(scenesDirectory, expectedName);
}

function buildFilterGraph(scenes, dimensions, targetDuration) {
  const originalDuration = scenes.reduce((total, scene) => total + scene.duration, 0);
  const durationScale = targetDuration / originalDuration;
  let elapsedDuration = 0;
  const filters = scenes.map((scene, index) => {
    const duration = index === scenes.length - 1
      ? Number((targetDuration - elapsedDuration).toFixed(3))
      : Number((scene.duration * durationScale).toFixed(3));
    elapsedDuration += duration;
    return `[${index}:v]scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=decrease,pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2:color=0x0f1117,setsar=1,fps=${VIDEO_FPS},format=yuv420p,trim=duration=${duration},setpts=PTS-STARTPTS[v${index}]`;
  });
  const inputs = scenes.map((_scene, index) => `[v${index}]`).join('');
  filters.push(`${inputs}concat=n=${scenes.length}:v=1:a=0[outv]`);
  return filters.join(';');
}

function runFfmpeg(binary, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true });
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-16_384);
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(
        new VideoComposerError('Could not start the FFmpeg video renderer.', {
          cause: error,
        })
      );
    });
    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (timedOut) {
        reject(new VideoComposerError('Video rendering timed out. Please try again.'));
        return;
      }
      if (code !== 0) {
        const reason = signal
          ? `FFmpeg was terminated (${signal}).`
          : `FFmpeg exited with code ${code}.`;
        reject(
          new VideoComposerError(
            `${reason}${stderr ? ` ${stderr.trim()}` : ''}`
          )
        );
        return;
      }
      resolve();
    });
  });
}

async function composeVideo(scenes, shortId, platform, resolution, options = {}) {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new VideoComposerError('At least one scene is required to render a video.');
  }
  if (scenes.length > MAX_SCENES) {
    throw new VideoComposerError(`A short cannot contain more than ${MAX_SCENES} scenes.`);
  }
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(shortId || '')) {
    throw new VideoComposerError('A valid short ID is required.');
  }

  const dimensions = getDimensions(platform, resolution);
  let totalDuration = 0;
  for (const [index, scene] of scenes.entries()) {
    if (
      !scene ||
      !Number.isFinite(scene.duration) ||
      scene.duration <= 0 ||
      scene.duration > MAX_SCENE_DURATION_SECONDS
    ) {
      throw new VideoComposerError(`Scene ${index + 1} has an invalid duration.`);
    }
    if (!scene.visual || typeof scene.visual.imagePath !== 'string') {
      throw new VideoComposerError(`Scene ${index + 1} has no rendered visual.`);
    }
    totalDuration += scene.duration;
  }

  const audioDuration = options.audioDuration;
  const targetDuration = options.audioPath ? audioDuration : totalDuration;
  if (!Number.isFinite(targetDuration) || targetDuration <= 0) {
    throw new VideoComposerError('A valid audio duration is required to synchronize the video.');
  }
  if (targetDuration > MAX_VIDEO_DURATION_SECONDS) {
    throw new VideoComposerError(
      `Synchronized video exceeds ${MAX_VIDEO_DURATION_SECONDS} seconds. Shorten the narration and try again.`
    );
  }

  const storageRoot = path.resolve(
    options.storagePath ||
      process.env.SHORTS_STORAGE_PATH ||
      path.join(__dirname, '..', 'public', 'videos')
  );
  const scenesDirectory = path.join(storageRoot, 'scenes');
  const audioDirectory = path.join(storageRoot, 'audio');
  const outputDirectory = path.join(storageRoot, 'final');
  const audioPath = options.audioPath
    ? path.resolve(options.audioPath)
    : null;
  if (audioPath && path.relative(audioDirectory, audioPath).startsWith('..')) {
    throw new VideoComposerError('Audio file is outside the Shorts storage directory.');
  }
  if (audioPath && path.dirname(audioPath) !== audioDirectory) {
    throw new VideoComposerError('Audio file is outside the Shorts storage directory.');
  }
  if (audioPath && !/^[a-z]{2,20}$/.test(options.language || '')) {
    throw new VideoComposerError('A valid audio language is required to render the video.');
  }

  const outputSuffix = options.language ? `_${options.language}` : '';
  const outputName = `${shortId}_${platform}_${resolution}${outputSuffix}.mp4`;
  const outputPath = path.join(outputDirectory, outputName);
  const temporaryPath = path.join(
    outputDirectory,
    `${shortId}_${crypto.randomUUID()}.tmp.mp4`
  );
  const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic;

  if (!ffmpegPath) {
    throw new VideoComposerError(
      'FFmpeg is unavailable. Configure FFMPEG_PATH or install the bundled renderer.'
    );
  }

  const inputPaths = [];
  for (const [index, scene] of scenes.entries()) {
    const scenePath = resolveScenePath(scene, index, shortId, scenesDirectory);
    try {
      const stats = await fs.stat(scenePath);
      if (!stats.isFile()) throw new Error('not a file');
    } catch (error) {
      throw new VideoComposerError(
        `Rendered visual for scene ${index + 1} is missing.`,
        { cause: error }
      );
    }
    inputPaths.push(scenePath);
  }

  await fs.mkdir(outputDirectory, { recursive: true });
  const args = ['-hide_banner', '-loglevel', 'error', '-y'];
  for (const inputPath of inputPaths) {
    args.push('-loop', '1', '-framerate', String(VIDEO_FPS), '-i', inputPath);
  }
  if (audioPath) {
    try {
      const audioStats = await fs.stat(audioPath);
      if (!audioStats.isFile()) throw new Error('not a file');
    } catch (error) {
      throw new VideoComposerError('Generated narration audio is missing.', {
        cause: error,
      });
    }
    args.push('-i', audioPath);
  }
  args.push(
    '-filter_complex',
    buildFilterGraph(scenes, dimensions, targetDuration),
    '-map',
    '[outv]',
  );
  if (audioPath) {
    args.push(
      '-map',
      `${scenes.length}:a:0`,
      '-af',
      'apad',
      '-c:a',
      'aac',
      '-b:a',
      '192k'
    );
  } else {
    args.push('-an');
  }
  args.push(
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-r',
    String(VIDEO_FPS),
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-t',
    targetDuration.toFixed(3),
    temporaryPath
  );

  try {
    await runFfmpeg(
      ffmpegPath,
      args,
      options.timeoutMs || Math.max(DEFAULT_TIMEOUT_MS, targetDuration * 2000)
    );
    const outputStats = await fs.stat(temporaryPath);
    if (!outputStats.isFile() || outputStats.size === 0) {
      throw new VideoComposerError('FFmpeg did not produce a video file.');
    }
    if (outputStats.size > MAX_OUTPUT_BYTES) {
      throw new VideoComposerError('Rendered video exceeds the 500 MB size limit.');
    }
    await fs.rename(temporaryPath, outputPath);
    return {
      videoFile: path.join('public', 'videos', 'final', outputName),
      duration: targetDuration,
      width: dimensions.width,
      height: dimensions.height,
      hasAudio: Boolean(audioPath),
      fileSize: outputStats.size,
    };
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    if (error instanceof VideoComposerError) throw error;
    throw new VideoComposerError('Failed to render video.', { cause: error });
  }
}

module.exports = { composeVideo, VideoComposerError };
