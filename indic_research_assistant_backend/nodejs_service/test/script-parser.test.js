const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  extractExplicitDuration,
  extractSceneDurationList,
  extractSceneDurations,
  parseScript,
} = require('../services/scriptParser');

const preparedResponse = {
  title: 'Microservices, explained',
  targetDurationSeconds: 90,
  scenes: [
    {
      type: 'title',
      visualTitle: 'Microservices architecture',
      visualDescription: 'Introduce independent services as building blocks.',
      narration: 'Let us see why teams split a large application into services.',
    },
    {
      type: 'diagram',
      visualTitle: 'The monolith bottleneck',
      visualDescription: 'One application connects every feature to one database.',
      narration: 'In a monolith, every feature ships together, so one failure can affect the whole application.',
      mermaidCode: 'flowchart LR\n  Client --> Monolith\n  Monolith --> Database',
    },
    {
      type: 'diagram',
      visualTitle: 'Independent services',
      visualDescription: 'A gateway routes requests to separately deployed services.',
      narration: 'Microservices separate capabilities behind a gateway, allowing each team to deploy and scale independently.',
      mermaidCode: 'flowchart LR\n  Client --> Gateway\n  Gateway --> Auth\n  Gateway --> Payments',
    },
    {
      type: 'concept',
      visualTitle: 'Scale with care',
      visualDescription: 'Highlight independent scaling alongside operational tradeoffs.',
      narration: 'This flexibility brings a tradeoff: teams must carefully handle monitoring, network failures, and data consistency.',
    },
  ],
};

const sourceDocument = `# Microservices Architecture — 90 Seconds (Tamil Version)

## Overview
- **Duration**: 90 seconds (1.5 minutes)
- **Target Language**: Tamil
- **Scenes**: 4 (minimal, focused)
- **Narration Length**: ~280 words

## Scene 1: Title (5 seconds)
**Visual**: Simple title slide
**Narration** (Tamil - 15 words): "வணக்கம்! மைக்ரோசர்வீசஸ் ஆர்க்கிடெக்சர் பற்றி கற்றுக்கொள்வோம்."
**Duration**: 5 seconds

## Scene 2: Problem (20 seconds)
**Visual**: Mermaid diagram - Monolith
\`\`\`mermaid
graph LR
 Client --> Monolith
 Monolith --> DB
\`\`\`
**Narration** (Tamil - 40 words): Monoliths package all features into one application.
**Duration**: 20 seconds

## Scene 3: Solution (35 seconds)
**Visual**: Mermaid diagram - Microservices
**Narration** (Tamil - 65 words): Each service owns a separate capability.
**Duration**: 35 seconds

## Scene 4: Benefits (30 seconds)
**Visual**: Text slide with benefits
**Narration** (Tamil - 45 words): Scale only the services that need more capacity.
**Duration**: 30 seconds
`;

test('finds explicit runtime in metadata and prompt phrases', () => {
  assert.equal(extractExplicitDuration(['- **Duration**: 90 seconds']), 90);
  assert.equal(extractExplicitDuration(['Overview: Duration is 1.5 minutes']), 90);
  assert.equal(extractExplicitDuration(['Make this a 2 minute explainer']), 120);
  assert.equal(extractSceneDurations(sourceDocument), 90);
  assert.deepEqual(extractSceneDurationList(sourceDocument), [5, 20, 35, 30]);
});

test('uses Sarvam-prepared narration and visual summaries at the requested runtime', async (context) => {
  const previousInternalKey = process.env.INTERNAL_API_KEY;
  const previousFlaskUrl = process.env.FLASK_SERVICE_URL;
  process.env.INTERNAL_API_KEY = 'test-internal-key';
  process.env.FLASK_SERVICE_URL = 'http://localhost:5000';
  context.after(() => {
    if (previousInternalKey === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = previousInternalKey;
    if (previousFlaskUrl === undefined) delete process.env.FLASK_SERVICE_URL;
    else process.env.FLASK_SERVICE_URL = previousFlaskUrl;
  });

  let requestBody;
  context.mock.method(global, 'fetch', async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify(preparedResponse), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  const prepared = await parseScript({
    originalname: 'microservices.md',
    buffer: Buffer.from(sourceDocument),
  }, 'Create a clear Tamil explainer for a broad technical audience.');

  assert.equal(requestBody.targetDurationSeconds, 90);
  assert.equal(requestBody.requestedSceneCount, 4);
  assert.deepEqual(requestBody.requestedSceneDurations, [5, 20, 35, 30]);
  assert.match(requestBody.sourceText, /Narration Length/);
  assert.equal(prepared.title, preparedResponse.title);
  assert.equal(prepared.narrationLanguage, 'tamil');
  assert.equal(prepared.targetDurationSeconds, 90);
  assert.equal(prepared.scenes.length, 4);
  assert.deepEqual(prepared.scenes.map((scene) => scene.duration), [5, 20, 35, 30]);
  assert.equal(
    prepared.scenes.reduce((total, scene) => total + scene.duration, 0),
    90
  );
  assert.ok(prepared.scenes.every((scene) => scene.duration <= 60));
  assert.equal(prepared.scenes[0].narration, preparedResponse.scenes[0].narration);
  assert.equal(
    prepared.scenes[1].content,
    'The monolith bottleneck\nOne application connects every feature to one database.'
  );
  assert.equal(prepared.scenes[1].visual.code, preparedResponse.scenes[1].mermaidCode);
  assert.doesNotMatch(
    prepared.scenes.map((scene) => scene.narration).join(' '),
    /Narration Length|Character Count|Ready for Shorts/
  );
});

test('uses the user brief language before the document target language', async (context) => {
  const previousInternalKey = process.env.INTERNAL_API_KEY;
  process.env.INTERNAL_API_KEY = 'test-internal-key';
  context.after(() => {
    if (previousInternalKey === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = previousInternalKey;
  });
  context.mock.method(global, 'fetch', async () => new Response(
    JSON.stringify(preparedResponse),
    { status: 200, headers: { 'content-type': 'application/json' } }
  ));

  const prepared = await parseScript({
    originalname: 'microservices.md',
    buffer: Buffer.from(sourceDocument),
  }, 'Create this explainer in Hindi for beginners.');

  assert.equal(prepared.narrationLanguage, 'hindi');
});

test('supports English narration from the user brief and source metadata', async (context) => {
  const previousInternalKey = process.env.INTERNAL_API_KEY;
  process.env.INTERNAL_API_KEY = 'test-internal-key';
  context.after(() => {
    if (previousInternalKey === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = previousInternalKey;
  });
  context.mock.method(global, 'fetch', async () => new Response(
    JSON.stringify(preparedResponse),
    { status: 200, headers: { 'content-type': 'application/json' } }
  ));

  const fromBrief = await parseScript({
    originalname: 'microservices.md',
    buffer: Buffer.from(sourceDocument),
  }, 'Create this explainer in English for beginners.');
  const fromMetadata = await parseScript({
    originalname: 'english-script.md',
    buffer: Buffer.from('Target Language: English\n\nExplain the topic.'),
  });

  assert.equal(fromBrief.narrationLanguage, 'english');
  assert.equal(fromMetadata.narrationLanguage, 'english');
});

test('prioritizes an explicit runtime in the user description', async (context) => {
  const previousInternalKey = process.env.INTERNAL_API_KEY;
  process.env.INTERNAL_API_KEY = 'test-internal-key';
  context.after(() => {
    if (previousInternalKey === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = previousInternalKey;
  });

  let requestBody;
  context.mock.method(global, 'fetch', async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      ...preparedResponse,
      targetDurationSeconds: 120,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  const prepared = await parseScript({
    originalname: 'microservices.md',
    buffer: Buffer.from(sourceDocument),
  }, 'Create a 2 minute explainer in Tamil.');

  assert.equal(requestBody.targetDurationSeconds, 120);
  assert.equal(requestBody.requestedSceneDurations, undefined);
  assert.equal(prepared.targetDurationSeconds, 120);
  assert.equal(
    prepared.scenes.reduce((total, scene) => total + scene.duration, 0),
    120
  );
});

test('rejects narration that cannot reasonably fit the requested runtime', async (context) => {
  const previousInternalKey = process.env.INTERNAL_API_KEY;
  process.env.INTERNAL_API_KEY = 'test-internal-key';
  context.after(() => {
    if (previousInternalKey === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = previousInternalKey;
  });

  const tooLongNarration = Array(271).fill('word').join(' ');
  context.mock.method(global, 'fetch', async () => new Response(JSON.stringify({
    ...preparedResponse,
    targetDurationSeconds: 90,
    scenes: [
      {
        ...preparedResponse.scenes[0],
        narration: tooLongNarration,
      },
      {
        ...preparedResponse.scenes[1],
        narration: tooLongNarration,
      },
    ],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }));

  await assert.rejects(
    parseScript({
      originalname: 'microservices.md',
      buffer: Buffer.from('Duration: 90 seconds.'),
    }),
    /too much narration for the requested 90-second runtime/
  );
});
