import { useState } from 'react';
import { FiFileText, FiLoader, FiUpload } from 'react-icons/fi';
import api from '../../instances/axiosInstance';

const ALLOWED_EXTENSIONS = new Set(['.md', '.markdown', '.pdf', '.docx']);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function errorMessage(error) {
  return error.response?.data?.error || 'Failed to generate scenes.';
}

export default function ShortsCreator({ onCreated, onCancel }) {
  const [file, setFile] = useState(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [targetDurationSeconds, setTargetDurationSeconds] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [resolution, setResolution] = useState('1080p');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!file) {
      setError('Choose a Markdown, PDF, or DOCX script to continue.');
      return;
    }
    const extension = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      setError('Unsupported file type. Upload Markdown, PDF, or DOCX.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('The script file must be 10 MB or smaller.');
      return;
    }

    const formData = new FormData();
    formData.append('scriptFile', file);
    formData.append('userPrompt', userPrompt);
    formData.append('targetDurationSeconds', targetDurationSeconds);
    formData.append('platform', platform);
    formData.append('resolution', resolution);
    setLoading(true);
    try {
      const { data } = await api.post('/api/shorts/create', formData);
      onCreated({ ...data, audioFiles: [], status: 'draft' });
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-300">New project</p>
        <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Create a Short</h2>
        <p className="mt-2 text-sm text-slate-400">Start with a script. Your scenes stay editable before rendering.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-xl md:grid-cols-[1.15fr_0.85fr] md:p-7"
      >
        <div className="space-y-5">
          <div>
            <label htmlFor="short-script" className="mb-2 block text-sm font-medium text-slate-200">
              Script file
            </label>
            <label
              htmlFor="short-script"
              className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.025] px-5 py-7 text-center transition hover:border-amber-300/40 hover:bg-amber-300/[0.04]"
            >
              {file ? (
                <>
                  <FiFileText size={25} className="text-amber-200" />
                  <span className="mt-3 max-w-full truncate text-sm font-medium text-white">{file.name}</span>
                  <span className="mt-1 text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </>
              ) : (
                <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200">
                    <FiUpload size={18} />
                  </span>
                  <span className="mt-3 text-sm font-medium text-slate-200">Choose a script to upload</span>
                  <span className="mt-1 text-xs text-slate-500">Markdown, PDF, or DOCX · up to 10 MB</span>
                </>
              )}
            </label>
            <input
              id="short-script"
              type="file"
              accept=".md,.markdown,.pdf,.docx"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="sr-only"
            />
          </div>

          <div>
            <label htmlFor="short-context" className="mb-2 block text-sm font-medium text-slate-200">
              Explainer brief <span className="font-normal text-slate-500">· optional</span>
            </label>
            <textarea
              id="short-context"
              value={userPrompt}
              onChange={(event) => setUserPrompt(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Describe the topic, audience, or language. The AI will turn this into spoken narration and matching visuals."
              className="w-full resize-y rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/10"
            />
          </div>

          <div>
            <label htmlFor="short-duration" className="mb-2 block text-sm font-medium text-slate-200">
              Target runtime
            </label>
            <div className="flex items-center gap-3">
              <input
                id="short-duration"
                type="number"
                min="30"
                max="60"
                step="1"
                required
                value={targetDurationSeconds}
                onChange={(event) => setTargetDurationSeconds(event.target.value)}
                className="w-28 rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/10"
              />
              <span className="text-sm text-slate-400">seconds (30–60)</span>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              If narration cannot fit after retrying, generation may extend the Short up to 90 seconds.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-200">Publish format</legend>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['youtube', 'YouTube'],
                ['reels', 'Reels'],
                ['tiktok', 'TikTok'],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={platform === value}
                  onClick={() => setPlatform(value)}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-medium transition ${
                    platform === value
                      ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
                      : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-200">Resolution</legend>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['720p', '720p'],
                ['1080p', '1080p'],
                ['mobile', 'Square'],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={resolution === value}
                  onClick={() => setResolution(value)}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-medium transition ${
                    resolution === value
                      ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
                      : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-auto space-y-3">
            {error && (
              <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f6c76e] px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? <FiLoader className="animate-spin" size={16} /> : <FiFileText size={16} />}
              {loading ? 'Generating scenes…' : 'Generate scenes'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-slate-400 transition hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
