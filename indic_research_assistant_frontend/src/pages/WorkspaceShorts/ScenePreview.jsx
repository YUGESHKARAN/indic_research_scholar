import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiClock, FiPlay } from 'react-icons/fi';
import api from '../../instances/axiosInstance';
import { displayDuration } from './shortsUtils';

const LANGUAGES = [
  ['english', 'English'],
  ['hindi', 'Hindi'],
  ['tamil', 'Tamil'],
  ['telugu', 'Telugu'],
  ['kannada', 'Kannada'],
  ['malayalam', 'Malayalam'],
  ['bengali', 'Bengali'],
  ['marathi', 'Marathi'],
  ['gujarati', 'Gujarati'],
];

const SPEAKERS = {
  english: [
    ['girish_en_documentary', 'Girish · documentary'],
    ['shubh_en_narration', 'Shubh · narration'],
    ['simran_en_narration', 'Simran · narration'],
  ],
  hindi: [
    ['simran_hi_narration', 'Simran · narration'],
    ['anand_hi_documentary', 'Anand · documentary'],
    ['roopa_hi_narration', 'Roopa · narration'],
  ],
  tamil: [
    ['gokul_ta_narration', 'Gokul · narration'],
    ['vijay_ta_narration', 'Vijay · narration'],
  ],
  telugu: [
    ['kavitha_te_narration', 'Kavitha · narration'],
    ['pooja_te_conversation', 'Pooja · conversation'],
    ['tarun_te_narration', 'Tarun · narration'],
  ],
  kannada: [
    ['chaitra_kn_narration', 'Chaitra · narration'],
    ['chetan_kn_conversation', 'Chetan · conversation'],
    ['suchitra_kn_narration', 'Suchitra · narration'],
  ],
  malayalam: [
    ['shubh', 'Shubh'],
    ['aditya', 'Aditya'],
    ['ritu', 'Ritu'],
    ['priya', 'Priya'],
  ],
  bengali: [
    ['roopa_bn_conversational', 'Roopa · conversational'],
    ['arnab_bn_conversation', 'Arnab · conversation'],
    ['bimal_bn_suspense', 'Bimal · suspense'],
  ],
  marathi: [
    ['mrunal_mr_narration', 'Mrunal · narration'],
    ['neha_mr_narration', 'Neha · narration'],
    ['soham_mr_narration', 'Soham · narration'],
  ],
  gujarati: [
    ['bhavik_gu_conversation', 'Bhavik · conversation'],
    ['pooja_gu_conversational', 'Pooja · conversational'],
    ['pooja_gu_customer', 'Pooja · customer'],
  ],
};

const PLATFORMS = ['youtube', 'reels', 'tiktok'];
const RESOLUTIONS = ['720p', '1080p', 'mobile'];

export default function ScenePreview({
  short,
  selectedLanguage,
  error,
  onBack,
  onRender,
}) {
  const [scenes, setScenes] = useState(short.scenes || []);
  const [activeSceneId, setActiveSceneId] = useState(short.scenes?.[0]?.id);
  const [language, setLanguage] = useState(selectedLanguage);
  const [platform, setPlatform] = useState(short.platform);
  const [resolution, setResolution] = useState(short.resolution);
  const [speakerByLanguage, setSpeakerByLanguage] = useState(() => (
    Object.fromEntries(
      (short.audioFiles || [])
        .filter((audio) => audio.speaker)
        .map((audio) => [audio.language, audio.speaker])
    )
  ));
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [sceneError, setSceneError] = useState('');
  const initialTranslationRequested = useRef(false);
  const activeScene = scenes.find((scene) => scene.id === activeSceneId) || scenes[0];
  const totalDuration = useMemo(
    () => scenes.reduce((total, scene) => total + Number(scene.duration || 0), 0),
    [scenes],
  );
  const durationInvalid = scenes.some(
    (scene) => !Number.isFinite(Number(scene.duration)) ||
      Number(scene.duration) < 1 ||
      Number(scene.duration) > 60,
  );
  const overDurationLimit = totalDuration > 300;

  const changeDuration = (sceneId, value) => {
    setScenes((current) => current.map((scene) => (
      scene.id === sceneId ? { ...scene, duration: Number(value) } : scene
    )));
  };

  const changeNarration = (sceneId, value) => {
    setScenes((current) => current.map((scene) => (
      scene.id !== sceneId
        ? scene
        : language === short.narrationLanguage
          ? { ...scene, narration: value, narrationTranslations: {} }
          : {
            ...scene,
            narrationTranslations: {
              ...(scene.narrationTranslations || {}),
              [language]: value,
            },
          }
    )));
  };

  const changeLanguage = useCallback(async (nextLanguage) => {
    console.log("nextLanguage", nextLanguage)
    const previousLanguage = language;
    setLanguage(nextLanguage);
    setSceneError('');
    if (nextLanguage === short.narrationLanguage) return;

    setTranslating(true);
    try {
      const { data } = await api.post(
        `/api/shorts/${short.shortId}/translate/${nextLanguage}`,
      );
      const translatedById = new Map(
        data.scenes.map((scene) => [scene.id, scene.narration])
      );
      setScenes((current) => current.map((scene) => {
        const narration = translatedById.get(scene.id);
        return narration === undefined ||
          scene.narrationTranslations?.[nextLanguage]
          ? scene
          : {
            ...scene,
            narrationTranslations: {
              ...(scene.narrationTranslations || {}),
              [nextLanguage]: narration,
            },
          };
      }));
    } catch (requestError) {
      setLanguage(previousLanguage);
      setSceneError(
        requestError.response?.data?.error
          || 'Could not translate the narration to the selected language.'
      );
    } finally {
      setTranslating(false);
    }
  }, [language, short.narrationLanguage, short.shortId]);

  useEffect(() => {
    if (initialTranslationRequested.current) return;
    initialTranslationRequested.current = true;
    if (
      selectedLanguage !== short.narrationLanguage &&
      scenes.some((scene) => !scene.narrationTranslations?.[selectedLanguage])
    ) {
      const translationTimer = setTimeout(
        () => changeLanguage(selectedLanguage),
        0
      );
      return () => clearTimeout(translationTimer);
    }
    return undefined;
  }, [
    changeLanguage,
    scenes,
    selectedLanguage,
    short.narrationLanguage,
    short.shortId,
  ]);

  const moveScene = (sceneIndex, direction) => {
    const targetIndex = sceneIndex + direction;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;
    setScenes((current) => {
      const reordered = [...current];
      const [movedScene] = reordered.splice(sceneIndex, 1);
      reordered.splice(targetIndex, 0, movedScene);
      return reordered.map((scene, index) => ({
        ...scene,
        sequenceNumber: index + 1,
      }));
    });
  };

  const handleRender = async () => {
    setSceneError('');
    if (translating) return;
    if (scenes.length === 0) {
      setSceneError('This Short does not have any scenes to render.');
      return;
    }
    if (durationInvalid) {
      setSceneError('Scene durations must be between 1 and 60 seconds.');
      return;
    }
    if (overDurationLimit) {
      setSceneError('Keep the total Short duration to 300 seconds or less.');
      return;
    }

    setSaving(true);
    try {
      const rememberedSpeaker = short.audioFiles?.find(
        (audio) => audio.language === language
      )?.speaker;
      const speaker = speakerByLanguage[language]
        || rememberedSpeaker
        || SPEAKERS[language][0][0];
      await onRender(scenes, language, speaker, platform, resolution);
    } catch (requestError) {
      setSceneError(requestError.message || 'Could not save the scene edits.');
    } finally {
      setSaving(false);
    }
  };
  const selectedSpeaker = speakerByLanguage[language]
    || short.audioFiles?.find((audio) => audio.language === language)?.speaker
    || SPEAKERS[language][0][0];
  const selectedSpeakerLabel = SPEAKERS[language].find(
    ([value]) => value === selectedSpeaker
  )?.[1] || selectedSpeaker;

  console.log("language", language)

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-300">Scene editor</p>
          <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">{short.title || 'Untitled Short'}</h2>
          <p className="mt-2 text-sm text-slate-400">Edit spoken narration, reorder scenes, and adjust timing. Generated visuals stay locked.</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 sm:self-auto">
          <FiClock className="text-amber-200" size={15} />
          <span>{displayDuration(totalDuration)}</span>
          <span className="text-slate-600">/ 2:00 max</span>
        </div>
      </div>

      {(sceneError || error) && (
        <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {sceneError || error}
        </div>
      )}
      {short.requestedTargetDurationSeconds &&
        short.targetDurationSeconds > short.requestedTargetDurationSeconds && (
          <p role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100">
            Narration needed more room than the selected {short.requestedTargetDurationSeconds} seconds. This draft uses the allowed {short.targetDurationSeconds}-second fallback.
          </p>
        )}

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="min-w-0 space-y-4">
          <div className="studio-scrollbar flex gap-3 overflow-x-auto pb-2">
            {scenes.map((scene, index) => (
              <div
                key={scene.id}
                className={`w-56 shrink-0 overflow-hidden rounded-2xl border bg-slate-950/55 transition ${
                  activeScene?.id === scene.id
                    ? 'border-amber-300/40 shadow-[0_0_0_1px_rgba(246,199,110,0.12)]'
                    : 'border-white/10'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveSceneId(scene.id)}
                  className="block w-full text-left"
                  aria-label={`Select scene ${index + 1}`}
                >
                  <div className="aspect-video bg-slate-900">
                    {scene.visual?.thumbnail ? (
                      <img src={scene.visual.thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs uppercase tracking-widest text-slate-600">
                        {scene.type}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium capitalize text-slate-200">
                        {String(index + 1).padStart(2, '0')} · {scene.type}
                      </span>
                      <span className="text-xs text-slate-400">{scene.duration}s</span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">
                      <span className="text-slate-400">Visual: </span>{scene.content}
                    </p>
                    {(language === short.narrationLanguage
                      ? scene.narration
                      : scene.narrationTranslations?.[language] || scene.narration) && (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        <span className="text-slate-400">Narration: </span>
                        {language === short.narrationLanguage
                          ? scene.narration
                          : scene.narrationTranslations?.[language] || scene.narration}
                      </p>
                    )}
                  </div>
                </button>
                <div className="flex justify-end gap-1 border-t border-white/5 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => moveScene(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move scene ${index + 1} earlier`}
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-25"
                  >
                    <FiChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveScene(index, 1)}
                    disabled={index === scenes.length - 1}
                    aria-label={`Move scene ${index + 1} later`}
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-25"
                  >
                    <FiChevronDown size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {activeScene && (
            <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  Scene {scenes.findIndex((scene) => scene.id === activeScene.id) + 1} · {activeScene.type}
                </p>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-4">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">On-screen visual</p>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{activeScene.content}</p>
                  </div>
                  <div>
                    <label
                      htmlFor="scene-narration"
                      className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500"
                    >
                      Spoken narration
                    </label>
                    <textarea
                      id="scene-narration"
                      value={language === short.narrationLanguage
                        ? activeScene.narration ?? activeScene.content
                        : activeScene.narrationTranslations?.[language] ?? ''}
                      onChange={(event) => changeNarration(activeScene.id, event.target.value)}
                      maxLength={3500}
                      rows={6}
                      disabled={translating || saving}
                      className="w-full resize-y rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm leading-6 text-slate-200 outline-none transition focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/10"
                    />
                    <p className="mt-1 text-right text-[11px] text-slate-500">
                      {(language === short.narrationLanguage
                        ? activeScene.narration ?? activeScene.content
                        : activeScene.narrationTranslations?.[language] || '').length} characters
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Total narration across scenes is limited to 3,500 characters.
                    </p>
                  </div>
                </div>
                {activeScene.visual?.thumbnail && (
                  <img
                    src={activeScene.visual.thumbnail}
                    alt={`Preview for scene ${activeScene.id + 1}`}
                    className="aspect-video w-full rounded-xl border border-white/10 object-cover"
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                <label htmlFor="scene-duration" className="text-sm text-slate-300">Duration</label>
                <div className="flex items-center gap-2">
                  <input
                    id="scene-duration"
                    type="number"
                    min="1"
                    max="60"
                    step="1"
                    value={activeScene.duration}
                    onChange={(event) => changeDuration(activeScene.id, event.target.value)}
                    className="w-24 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-300/40"
                  />
                  <span className="text-sm text-slate-500">seconds</span>
                </div>
              </div>
            </article>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-slate-400">
              Platform
              <select
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm capitalize text-white outline-none focus:border-amber-300/40"
              >
                {PLATFORMS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Resolution
              <select
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/40"
              >
                {RESOLUTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Voice language
              <select
                value={language}
                onChange={(event) => changeLanguage(event.target.value)}
                disabled={translating || saving}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/40"
              >
                {LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {translating && (
                <span role="status" className="mt-1 block text-[11px] text-amber-200">
                  Translating spoken narration…
                </span>
              )}
            </label>
            <label className="text-xs text-slate-400">
              Speaker voice
              <select
                value={selectedSpeaker}
                onChange={(event) => setSpeakerByLanguage((current) => ({
                  ...current,
                  [language]: event.target.value,
                }))}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/40"
              >
                {SPEAKERS[language].map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-slate-500">
                Your choice is saved when you render.
              </span>
            </label>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-white/10 bg-slate-950/55 p-5 xl:sticky xl:top-24">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Ready to render</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Review your sequence</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between text-slate-400"><span>Scenes</span><span className="text-slate-200">{scenes.length}</span></div>
            <div className="flex justify-between text-slate-400"><span>Duration</span><span className="text-slate-200">{displayDuration(totalDuration)}</span></div>
            <div className="flex justify-between gap-2 text-slate-400"><span>Voice track</span><span className="text-right capitalize text-slate-200">{language} · {selectedSpeakerLabel}</span></div>
            <div className="flex justify-between text-slate-400"><span>Video</span><span className="text-slate-200">Silent MP4</span></div>
          </div>
          {(durationInvalid || overDurationLimit) && (
            <p className="mt-4 text-xs leading-5 text-rose-200">
              {durationInvalid ? 'Every scene must be between 1 and 60 seconds.' : 'The total duration cannot exceed 300 seconds.'}
            </p>
          )}
          <button
            type="button"
            onClick={handleRender}
            disabled={saving || translating || scenes.length === 0 || durationInvalid || overDurationLimit}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f6c76e] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiPlay size={15} />
            {translating ? 'Translating narration…' : saving ? 'Saving and rendering…' : 'Save scenes & render'}
          </button>
          <button
            type="button"
            onClick={onBack}
            disabled={saving || translating}
            className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm text-slate-400 transition hover:text-white disabled:opacity-50"
          >
            Back to Shorts
          </button>
        </aside>
      </div>
    </section>
  );
}
