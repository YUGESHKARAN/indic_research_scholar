import { useCallback, useEffect, useState } from 'react';
import { FiArrowLeft, FiPlus, FiTrash2, FiVideo } from 'react-icons/fi';
import api from '../../instances/axiosInstance';
import ShortsCreator from './ShortsCreator';
import ScenePreview from './ScenePreview';
import VideoPlayer from './VideoPlayer';
import { displayDuration, getErrorMessage } from './shortsUtils';

function ShortsLibrary({
  shorts,
  loading,
  error,
  deletingShortId,
  onCreate,
  onOpen,
  onDelete,
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-300">
            Video studio
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
            Indic Shorts
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Turn a script into visual scenes and render a video with synchronized, swappable Indic narration.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f6c76e] px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
        >
          <FiPlus size={16} />
          Create a Short
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-8 text-sm text-slate-400">
          Loading your Shorts…
        </div>
      ) : shorts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/30 px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200">
            <FiVideo size={21} />
          </span>
          <h3 className="mt-4 text-lg font-semibold text-white">Your video workspace is ready</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            Upload a Markdown, PDF, or DOCX script to generate your first scene sequence.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-300/15"
          >
            Start creating
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shorts.map((short) => (
            <article
              key={short.id}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 transition hover:border-amber-300/30 hover:bg-slate-900/70"
            >
              <button
                type="button"
                onClick={() => onOpen(short.id)}
                className="block w-full text-left"
              >
                <div className="aspect-video overflow-hidden bg-slate-900">
                  {short.thumbnail ? (
                    <img
                      src={short.thumbnail}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-600">
                      <FiVideo size={28} />
                    </div>
                  )}
                </div>
                <div className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 font-medium text-white">
                      {short.title || 'Untitled Short'}
                    </h3>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] uppercase tracking-wide ${
                      short.status === 'ready'
                        ? 'bg-emerald-400/10 text-emerald-200'
                        : 'bg-amber-300/10 text-amber-100'
                    }`}>
                      {short.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{short.platform} · {displayDuration(short.duration)}</span>
                    <span>{short.createdAt ? new Date(short.createdAt).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              </button>
              <div className="flex justify-end px-4 pb-3">
                <button
                  type="button"
                  aria-label={`Delete ${short.title || 'Untitled Short'}`}
                  disabled={deletingShortId === short.id}
                  onClick={() => onDelete(short)}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-400/20 px-3 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-wait disabled:opacity-50"
                >
                  <FiTrash2 size={13} />
                  {deletingShortId === short.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function WorkspaceShorts() {
  const [shorts, setShorts] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState('');
  const [view, setView] = useState('library');
  const [short, setShort] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('hindi');
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState('');
  const [openingShort, setOpeningShort] = useState(false);
  const [deletingShortId, setDeletingShortId] = useState('');

  const loadShorts = useCallback(async () => {
    const { data } = await api.get('/api/shorts/list');
    return data.shorts || [];
  }, []);

  const refreshShorts = useCallback(async () => {
    setLibraryLoading(true);
    setLibraryError('');
    try {
      setShorts(await loadShorts());
    } catch (error) {
      setLibraryError(getErrorMessage(error, 'Could not load your Shorts.'));
    } finally {
      setLibraryLoading(false);
    }
  }, [loadShorts]);

  useEffect(() => {
    let active = true;
    loadShorts()
      .then((items) => {
        if (active) setShorts(items);
      })
      .catch((error) => {
        if (active) setLibraryError(getErrorMessage(error, 'Could not load your Shorts.'));
      })
      .finally(() => {
        if (active) setLibraryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadShorts]);

  const startNewShort = () => {
    setShort(null);
    setRenderError('');
    setView('creator');
  };

  const handleCreated = (createdShort) => {
    setShort(createdShort);
    setSelectedLanguage(createdShort.narrationLanguage || 'hindi');
    setView('preview');
  };

  const openShort = async (shortId) => {
    setOpeningShort(true);
    setLibraryError('');
    try {
      const { data } = await api.get(`/api/shorts/${shortId}`);
      setShort(data);
      setSelectedLanguage(
        data.videoLanguage
          || data.narrationLanguage
          || data.audioFiles?.[0]?.language
          || 'hindi',
      );
      setRenderError('');
      setView(data.status === 'ready' && data.videoUrl ? 'player' : 'preview');
    } catch (error) {
      setLibraryError(getErrorMessage(error, 'Could not open this Short.'));
    } finally {
      setOpeningShort(false);
    }
  };

  const deleteShort = async (shortToDelete) => {
    const title = shortToDelete.title || 'Untitled Short';
    if (!window.confirm(`Delete "${title}" and all of its generated files? This cannot be undone.`)) {
      return;
    }

    setDeletingShortId(shortToDelete.id);
    setLibraryError('');
    try {
      await api.delete(`/api/shorts/${shortToDelete.id}`);
      setShorts((current) => current.filter((item) => item.id !== shortToDelete.id));
    } catch (error) {
      setLibraryError(getErrorMessage(error, 'Could not delete this Short.'));
    } finally {
      setDeletingShortId('');
    }
  };

  // const startRender = async (
  //   shortData,
  //   language,
  //   speaker,
  //   platform,
  //   resolution
  // ) => {
  //   setRendering(true);
  //   setRenderError('');
  //   try {
  //     const { data } = await api.post(
  //       `/api/shorts/${shortData.shortId}/render`,
  //       { language, speaker, platform, resolution },
  //     );
  //     setShort((current) => {
  //       if (!current || current.shortId !== shortData.shortId) return current;
  //       const audioFiles = (current.audioFiles || []).filter(
  //         (audio) => audio.language !== language,
  //       );
  //       audioFiles.push({
  //         language,
  //         speaker: data.speaker,
  //         file: data.audioFile,
  //         duration: data.audioDuration,
  //       });
  //       return {
  //         ...current,
  //         audioFiles,
  //         platform: data.platform,
  //         resolution: data.resolution,
  //         duration: data.duration,
  //         videoUrl: data.videoUrl,
  //         videoLanguage: language,
  //         status: 'ready',
  //       };
  //     });
  //     setSelectedLanguage(language);
  //     await refreshShorts();
  //     return true;
  //   } catch (error) {
  //     setRenderError(getErrorMessage(error, 'Video rendering failed.'));
  //     return false;
  //   } finally {
  //     setRendering(false);
  //   }
  // };
  const startRender = async (
    shortData,
    language,
    speaker,
    platform,
    resolution
  ) => {
    setRendering(true);
    setRenderError('');
    try {
      const { data } = await api.post(
        `/api/shorts/${shortData.shortId}/render`,
        { language, speaker, platform, resolution },
      );

      // Cache-bust so the player reloads when the same language is re-rendered
      const videoUrl = `${data.videoUrl}&v=${Date.now()}`;

      setShort((current) => {
        if (!current || current.shortId !== shortData.shortId) return current;
        const audioFiles = [
          ...(current.audioFiles || []).filter(
            (audio) => audio.language !== language,
          ),
          {
            language,
            speaker: data.speaker,
            file: data.audioFile,
            duration: data.audioDuration,
          },
        ];
        return {
          ...current,
          audioFiles,
          platform: data.platform,
          resolution: data.resolution,
          duration: data.duration,
          videoUrl,
          videoLanguage: language,
          status: 'ready',
        };
      });
      setSelectedLanguage(language);
      return true;
    } catch (error) {
      setRenderError(getErrorMessage(error, 'Video rendering failed.'));
      return false;
    } finally {
      setRendering(false);
    }
  };
  const saveScenesAndRender = async (
    scenes,
    language,
    speaker,
    platform,
    resolution
  ) => {
    if (!short) return;
    setRenderError('');
    try {
      await api.patch(`/api/shorts/${short.shortId}/scenes`, {
        scenes: scenes.map(({
          id,
          duration,
          narration,
          narrationTranslations,
        }) => ({
          id,
          duration,
          narration,
          narrationTranslations: narrationTranslations || {},
        })),
      });
      const updatedShort = { ...short, scenes, platform, resolution };
      setShort(updatedShort);
      setView('player');
      await startRender(
        updatedShort,
        language,
        speaker,
        platform,
        resolution
      );
    } catch (error) {
      setRenderError(getErrorMessage(error, 'Could not save the scene edits.'));
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {view !== 'library' && (
        <button
          type="button"
          onClick={() => {
            setRenderError('');
            setView('library');
            refreshShorts();
          }}
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <FiArrowLeft size={15} />
          All Shorts
        </button>
      )}

      {openingShort && (
        <div role="status" className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
          Opening your Short…
        </div>
      )}

      {view === 'library' && (
        <ShortsLibrary
          shorts={shorts}
          loading={libraryLoading}
          error={libraryError}
          deletingShortId={deletingShortId}
          onCreate={startNewShort}
          onOpen={openShort}
          onDelete={deleteShort}
        />
      )}
      {view === 'creator' && (
        <ShortsCreator
          onCreated={handleCreated}
          onCancel={() => setView('library')}
        />
      )}
      {view === 'preview' && short && (
        <ScenePreview
          short={short}
          selectedLanguage={selectedLanguage}
          error={renderError}
          onBack={() => setView('library')}
          onRender={saveScenesAndRender}
        />
      )}
      {view === 'player' && short && (
        <VideoPlayer
          // key={`${short.shortId}-${selectedLanguage}-${short.audioFiles?.length || 0}-${short.videoUrl || 'pending'}`}
          key={short.shortId}
          short={short}
          selectedLanguage={selectedLanguage}
          rendering={rendering}
          error={renderError}
          onBack={() => setView('preview')}
          onRetry={() => startRender(
            short,
            selectedLanguage,
            undefined,
            short.platform,
            short.resolution,
          )}
          onRenderLanguage={(language) => startRender(
            short,
            language,
            undefined,
            short.platform,
            short.resolution,
          )}
        />
      )}
    </div>
  );
}
