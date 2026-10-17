import { useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiDownload, FiLoader, FiRefreshCw, FiVolume2 } from 'react-icons/fi';
import { apiUrl, displayDuration } from './shortsUtils';

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

export default function VideoPlayer({
  short,
  selectedLanguage,
  rendering,
  error,
  onBack,
  onRetry,
  onRenderLanguage,
}) {
  const [language, setLanguage] = useState(selectedLanguage);
  const [readyVideoKey, setReadyVideoKey] = useState(null);
  const [errorVideoKey, setErrorVideoKey] = useState(null);
    const [attempt, setAttempt] = useState(0);
  
  const videoRef = useRef(null);
  // const videoKey = `${short.videoUrl}-${short.videoLanguage || 'silent'}-${rendering ? 'rendering' : 'idle'}`;
  //  const videoKey = `${short.videoUrl}-${short.videoLanguage || 'silent'}`;
   const videoKey = `${short.videoUrl}-${short.videoLanguage || 'silent'}-${attempt}`;
  const videoReady = readyVideoKey === videoKey;
  const videoLoadError = errorVideoKey === videoKey;

  useEffect(() => {
    if (rendering) videoRef.current?.pause();
  }, [rendering]);

  const selectLanguage = async (nextLanguage) => {
    if (nextLanguage === language && short.videoLanguage === nextLanguage) return;
    setLanguage(nextLanguage);
    const rendered = await onRenderLanguage(nextLanguage);
    if (!rendered) setLanguage(selectedLanguage);
  };

  const downloadUrl = short.videoUrl ? (() => {
    const url = new URL(apiUrl(short.videoUrl));
    url.searchParams.set('download', '1');
    return url.toString();
  })() : '';

  const renderSelectedLanguage = () => onRenderLanguage(language);
    const markReady = () => {
    setReadyVideoKey(videoKey);
    setErrorVideoKey(null);
  };

    const videoSrc = short.videoUrl
    ? `${apiUrl(short.videoUrl)}${short.videoUrl.includes('?') ? '&' : '?'}attempt=${attempt}`
    : '';

  // console.log("videoLoadError", videoLoadError)
  // console.log("downloadUrl", downloadUrl)
  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-300">Render studio</p>
          <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">{short.title || 'Your Short'}</h2>
          <p className="mt-2 text-sm text-slate-400">
            {short.platform} · {short.resolution} · {displayDuration(short.duration)} ·
            {' '}MP4 audio: {short.videoLanguage || 'not synced'}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white sm:self-auto"
        >
          <FiArrowLeft size={15} />
          Edit scenes
        </button>
      </div>

      {error && (
        <div role="alert" className="flex flex-col justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 sm:flex-row sm:items-center">
          <span>{error}</span>
          {!rendering && (
            <button
              type="button"
              // onClick={onRetry}
              onClick={renderSelectedLanguage}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-300/20 px-3 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-300/10"
            >
              <FiRefreshCw size={13} />
              Retry render
            </button>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <div className="relative aspect-video">
            {short.videoUrl ? (
              // <video
              //   ref={videoRef}
              //   key={videoKey}
              //   controls
              //   playsInline
              //   preload="auto"
              //   crossOrigin="use-credentials"
              //   // src={apiUrl(short.videoUrl)}
              //   src={videoSrc}
              //   // onCanPlay={() => {
              //   //   setReadyVideoKey(videoKey);
              //   //   setErrorVideoKey(null);
              //   // }}
              //   onLoadedData={markReady}
              //   onPlay={markReady}
              //   onError={() => setErrorVideoKey(videoKey)}
              //   className="h-full w-full bg-black"
              // >
              //   Your browser does not support video playback.
              // </video>
              <video
                ref={videoRef}
                key={videoKey}
                controls
                playsInline
                preload="auto"
                crossOrigin="use-credentials"
                src={videoSrc}
                onLoadedData={markReady}
                onCanPlay={markReady}
                onError={(event) => {
                  console.warn('video error', event.currentTarget.error);
                  setErrorVideoKey(videoKey);
                }}
                className="h-full w-full bg-black"
              ></video>
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                {rendering ? (
                  <>
                    <FiLoader className="animate-spin text-amber-200" size={27} />
                    <p className="mt-4 font-medium text-white">Rendering your Short…</p>
                    <p className="mt-1 text-xs text-slate-400">This may take a minute. Keep this page open.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-300">Your video is not rendered yet.</p>
                    <button
                      type="button"
                      // onClick={onRetry}
                      onClick={renderSelectedLanguage}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#f6c76e] px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                    >
                      <FiRefreshCw size={14} />
                      Render video
                    </button>
                  </>
                )}
              </div>
            )}
            {short.videoUrl && (rendering || (!videoReady && !videoLoadError)) && (
              // <div
              //   role="status"
              //   className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 px-6 text-center"
              // >
             <div
                role="status"
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 px-6 text-center"
              >
                <FiLoader className="animate-spin text-amber-200" size={30} />
                <p className="mt-4 font-medium text-white">
                  {rendering ? 'Rendering your Short…' : 'Preparing video for playback…'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {rendering
                    ? 'Your selected voice track is being added to the video.'
                    : 'The video will be ready to play as soon as it is buffered.'}
                </p>
              </div>
            )}
            {short.videoUrl && videoLoadError && !rendering && (
              <div
                role="alert"
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 px-6 text-center"
              >
                <p className="text-sm text-rose-200">The video could not be loaded.</p>
                {/* <button
                  type="button"
                  onClick={() => {
                    setErrorVideoKey(null);
                    setReadyVideoKey(null);
                    if (videoRef.current) videoRef.current.load();
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#f6c76e] px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                > */}
                                <button
                  type="button"
                  onClick={() => {
                    setErrorVideoKey(null);
                    setReadyVideoKey(null);
                    setAttempt((n) => n + 1);
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#f6c76e] px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  <FiRefreshCw size={14} />
                  Try loading again
                </button>
              </div>
            )}
          </div>
          {short.videoUrl && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
              <p className="text-xs text-slate-400">
                {short.videoLanguage
                  ? `The ${short.videoLanguage} narration is synchronized and embedded in this MP4.`
                  : 'Choose a language to render a synchronized MP4 with its narration embedded.'}
              </p>
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-medium text-amber-100 transition hover:bg-amber-300/15"
              >
                <FiDownload size={14} />
                Download MP4
              </a>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-white/10 bg-slate-950/55 p-5">
          <div className="flex items-center gap-2">
            <FiVolume2 className="text-amber-200" size={16} />
            <h3 className="font-semibold text-white">Voice track</h3>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Choose a language to generate its narration and render a synchronized MP4. The selected narration is included in the download.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {LANGUAGES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={language === value}
                disabled={rendering}
                onClick={() => selectLanguage(value)}
                className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition disabled:opacity-50 ${
                  language === value
                    ? 'border-amber-300/35 bg-amber-300/10 text-amber-100'
                    : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {rendering && (
            <p role="status" className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <FiLoader className="animate-spin" size={13} />
              Rendering synchronized {language} video and audio…
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
