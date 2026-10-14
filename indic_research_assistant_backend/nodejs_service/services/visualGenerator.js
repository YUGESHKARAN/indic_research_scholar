const fs = require('fs/promises');
const path = require('path');
const { chromium } = require('playwright');

const PLATFORMS = new Set(['youtube', 'reels', 'tiktok']);
const RESOLUTIONS = new Set(['720p', '1080p', 'mobile']);
const SCENE_TYPES = new Set(['title', 'diagram', 'code', 'concept']);
const MAX_DIAGRAM_NODES = 8;
const THEMES = {
  background: '#0f1117',
  surface: '#161b22',
  border: '#30363d',
  text: '#e6edf3',
  muted: '#8b949e',
  accent: '#1f6feb',
};

class VisualGeneratorError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'VisualGeneratorError';
  }
}

function getDimensions(platform, resolution) {
  if (!PLATFORMS.has(platform)) {
    throw new VisualGeneratorError(`Unsupported video platform: ${platform}`);
  }
  if (!RESOLUTIONS.has(resolution)) {
    throw new VisualGeneratorError(`Unsupported video resolution: ${resolution}`);
  }

  if (resolution === 'mobile') return { width: 1080, height: 1080 };

  const longSide = resolution === '1080p' ? 1920 : 1280;
  const shortSide = resolution === '1080p' ? 1080 : 720;
  return platform === 'youtube'
    ? { width: longSide, height: shortSide }
    : { width: shortSide, height: longSide };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function buildConceptDiagram(content) {
  const labels = content
    .split(/(?:\s*(?:->|→|➜|⇒)\s*|\s+(?:then|next|followed by)\s+|(?<=[.!?;])\s+)/i)
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, MAX_DIAGRAM_NODES);

  if (labels.length < 2) labels.push('Key idea');

  const nodes = labels.map((label, index) => {
    const safeLabel = label
      .replace(/["\\\r\n[\]{}()<>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 100);
    return `  node${index}["${safeLabel}"]`;
  });
  const links = labels
    .slice(1)
    .map((_label, index) => `  node${index} --> node${index + 1}`);
  return ['flowchart TD', ...nodes, ...links].join('\n');
}

function slideHtml(scene, dimensions) {
  const heading =
    scene.type === 'title'
      ? scene.content
      : scene.content.split(/\s+/).slice(0, 7).join(' ');
  const body = scene.type === 'title' ? '' : scene.content;
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:${dimensions.width}px;height:${dimensions.height}px;background:${THEMES.background};color:${THEMES.text};font-family:Inter,"Segoe UI",Arial,sans-serif}
.slide{width:100%;height:100%;padding:9%;display:flex;flex-direction:column;justify-content:center;gap:3.5%;background:${THEMES.background}}
.eyebrow{color:${THEMES.accent};font-size:${Math.round(dimensions.width * 0.018)}px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
h1{margin:0;max-width:92%;font-size:${Math.round(dimensions.width * (scene.type === 'title' ? 0.064 : 0.047))}px;line-height:1.12;font-weight:700;overflow-wrap:anywhere}
.rule{width:12%;height:6px;border-radius:9px;background:${THEMES.accent}}
p{margin:0;max-width:92%;color:${THEMES.muted};font-size:${Math.round(dimensions.width * 0.026)}px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
.footer{position:absolute;left:9%;bottom:5%;color:${THEMES.muted};font-size:${Math.round(dimensions.width * 0.014)}px;letter-spacing:.08em}
</style></head><body><main class="slide"><div class="eyebrow">${escapeHtml(scene.type === 'title' ? 'Indic Shorts' : scene.type)}</div><h1>${escapeHtml(heading)}</h1><div class="rule"></div>${body ? `<p>${escapeHtml(body)}</p>` : ''}<div class="footer">RESEARCH | IDEAS | EXPLAINED</div></main></body></html>`;
}

function diagramHtml(dimensions) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body,#diagram{margin:0;width:${dimensions.width}px;height:${dimensions.height}px;background:${THEMES.background}}
body{display:flex;align-items:center;justify-content:center;padding:6%;box-sizing:border-box}
#diagram{display:flex;align-items:center;justify-content:center}
svg{max-width:100%;max-height:100%;font-family:Arial,sans-serif!important}
</style></head><body><main id="diagram"></main></body></html>`;
}

function codeHtml(highlightedCode, language, dimensions) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:${dimensions.width}px;height:${dimensions.height}px;background:${THEMES.background};color:${THEMES.text};font-family:Arial,sans-serif}
main{width:100%;height:100%;padding:8%;display:flex;flex-direction:column;justify-content:center;gap:24px}
.window{overflow:hidden;border:1px solid ${THEMES.border};border-radius:18px;background:${THEMES.surface};box-shadow:0 24px 80px #0005}
.bar{height:58px;padding:0 22px;display:flex;align-items:center;gap:9px;border-bottom:1px solid ${THEMES.border};color:${THEMES.muted};font-size:18px}
.dot{width:12px;height:12px;border-radius:50%;background:#f85149}.dot:nth-child(2){background:#d29922}.dot:nth-child(3){background:#3fb950}
.language{margin-left:auto}
pre{margin:0;padding:42px;overflow:hidden;font-size:${Math.round(dimensions.width * 0.021)}px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}
pre code{font-family:"Cascadia Code","Consolas",monospace}
</style></head><body><main><section class="window"><header class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="language">${escapeHtml(language)}</span></header>${highlightedCode}</section></main></body></html>`;
}

async function loadShiki() {
  const { createHighlighter, bundledLanguagesInfo } = await import('shiki');
  const highlighter = await createHighlighter({
    themes: ['github-dark'],
    langs: ['text'],
  });
  const languageNames = new Set();
  for (const language of bundledLanguagesInfo) {
    languageNames.add(language.id);
    for (const alias of language.aliases || []) languageNames.add(alias);
  }
  return { highlighter, languageNames };
}

async function renderScene(page, scene, dimensions, mermaidBundlePath, shiki) {
  if (scene.type === 'diagram') {
    const code =
      typeof scene.visual.code === 'string' && scene.visual.code.trim()
        ? scene.visual.code
        : buildConceptDiagram(scene.content);

    await page.setContent(diagramHtml(dimensions));
    await page.addScriptTag({ path: mermaidBundlePath });
    await page.evaluate(async (diagramCode) => {
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'dark',
        flowchart: { htmlLabels: false, curve: 'basis' },
      });
      const { svg } = await window.mermaid.render('shorts-diagram', diagramCode);
      document.querySelector('#diagram').innerHTML = svg;
    }, code);
    const diagram = page.locator('#diagram svg');
    if ((await diagram.count()) !== 1) {
      throw new VisualGeneratorError('Mermaid did not render a diagram.');
    }
    return {
      type: 'diagram',
      code,
      imageType: 'diagram',
    };
  }

  if (scene.type === 'code') {
    const sourceCode = scene.visual.code || scene.content;
    const requestedLanguage = scene.visual.language || 'text';
    const normalizedLanguage = requestedLanguage.toLowerCase();
    const language = shiki.languageNames.has(normalizedLanguage)
      ? normalizedLanguage
      : 'text';
    if (!shiki.highlighter.getLoadedLanguages().includes(language)) {
      await shiki.highlighter.loadLanguage(language);
    }
    const highlightedCode = shiki.highlighter.codeToHtml(sourceCode, {
      lang: language,
      theme: 'github-dark',
    });
    await page.setContent(codeHtml(highlightedCode, requestedLanguage, dimensions));
    return {
      type: 'code',
      code: sourceCode,
      language: requestedLanguage,
      imageType: 'code',
    };
  }

  if (scene.type === 'title' || scene.type === 'concept') {
    await page.setContent(slideHtml(scene, dimensions));
    return { type: 'slide', imageType: 'slide' };
  }

  throw new VisualGeneratorError(`Unsupported scene type: ${scene.type}`);
}

async function generateVisuals(scenes, shortId, options = {}) {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new VisualGeneratorError('At least one scene is required.');
  }
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(shortId || '')) {
    throw new VisualGeneratorError('A valid short ID is required.');
  }
  if (scenes.length > 50) {
    throw new VisualGeneratorError('A short cannot contain more than 50 scenes.');
  }

  const platform = options.platform || 'youtube';
  const resolution = options.resolution || '1080p';
  const dimensions = getDimensions(platform, resolution);
  const storageRoot = path.resolve(
    options.storagePath || process.env.SHORTS_STORAGE_PATH || path.join(__dirname, '..', 'public', 'videos')
  );
  const scenesDirectory = path.join(storageRoot, 'scenes');
  const browserOptions = options.browserOptions || {};
  const mermaidBundlePath = path.join(
    path.dirname(require.resolve('mermaid')),
    'mermaid.min.js'
  );

  for (const [index, scene] of scenes.entries()) {
    if (
      !scene ||
      !SCENE_TYPES.has(scene.type) ||
      typeof scene.content !== 'string' ||
      !scene.visual ||
      typeof scene.visual !== 'object'
    ) {
      throw new VisualGeneratorError(`Scene ${index} has an invalid structure.`);
    }
    const expectedVisualType =
      scene.type === 'diagram'
        ? 'diagram'
        : scene.type === 'code'
          ? 'code'
          : 'slide';
    if (scene.visual.type !== expectedVisualType) {
      throw new VisualGeneratorError(`Scene ${index} has an invalid visual type.`);
    }
  }

  await fs.mkdir(scenesDirectory, { recursive: true });
  const stagingDirectory = await fs.mkdtemp(
    path.join(scenesDirectory, `.${shortId}-`)
  );
  let browser;
  let shiki;
  const committedPaths = [];
  try {
    browser = await chromium.launch({ headless: true, ...browserOptions });
    shiki = await loadShiki();
    const page = await browser.newPage({
      viewport: { width: dimensions.width, height: dimensions.height },
      deviceScaleFactor: 1,
    });
    const thumbnailPage = await browser.newPage({
      viewport: { width: 320, height: 180 },
      deviceScaleFactor: 1,
    });
    const generatedScenes = [];
    for (const [index, scene] of scenes.entries()) {
      const fileName = `${shortId}_scene_${index}.png`;
      const filePath = path.join(stagingDirectory, fileName);
      const relativePath = path.join('public', 'videos', 'scenes', fileName);
      try {
        const rendered = await renderScene(
          page,
          scene,
          dimensions,
          mermaidBundlePath,
          shiki
        );
        await page.screenshot({
          path: filePath,
          type: 'png',
          fullPage: false,
        });
        const image = await fs.readFile(filePath);
        await thumbnailPage.setContent(
          `<!doctype html><html><body style="margin:0;width:320px;height:180px;background:${THEMES.background}"><img src="data:image/png;base64,${image.toString('base64')}" alt="" style="width:100%;height:100%;object-fit:contain"></body></html>`
        );
        await thumbnailPage.locator('img').evaluate((element) => element.decode());
        const thumbnail = await thumbnailPage.screenshot({ type: 'png' });
        generatedScenes.push({
          ...scene,
          visual: {
            ...(scene.visual || {}),
            ...rendered,
            width: dimensions.width,
            height: dimensions.height,
            imagePath: relativePath,
            thumbnail: `data:image/png;base64,${thumbnail.toString('base64')}`,
          },
        });
      } catch (error) {
        throw new VisualGeneratorError(
          `Failed to render scene ${index + 1}: ${error.message}`,
          { cause: error }
        );
      }
    }
    for (const [index] of generatedScenes.entries()) {
      const fileName = `${shortId}_scene_${index}.png`;
      const finalPath = path.join(scenesDirectory, fileName);
      await fs.rename(path.join(stagingDirectory, fileName), finalPath);
      committedPaths.push(finalPath);
    }
    await page.close();
    await thumbnailPage.close();
    return generatedScenes;
  } catch (error) {
    await Promise.all(
      committedPaths.map((filePath) => fs.rm(filePath, { force: true }))
    );
    if (error instanceof VisualGeneratorError) throw error;
    throw new VisualGeneratorError('Failed to initialize Shorts visual rendering.', {
      cause: error,
    });
  } finally {
    if (shiki) shiki.highlighter.dispose();
    if (browser) await browser.close();
    await fs.rm(stagingDirectory, { recursive: true, force: true });
  }
}

module.exports = { generateVisuals, VisualGeneratorError, getDimensions };
