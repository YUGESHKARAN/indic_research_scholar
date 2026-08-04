import React, { useEffect, useRef, useState } from "react";

function SpeakerSelect({
  speakers,
  selectedSpeaker,
  setSelectedSpeaker,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Label */}
      <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
        Speaker Voice
      </label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/80 px-3 py-1.5 text-sm text-slate-100 transition-all hover:border-indigo-500/40  focus:outline-none "
      >
        <span className="text-xs">{selectedSpeaker}</span>

        <svg
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.18l3.71-3.95a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="max-h-96 overflow-y-auto scrollbar-hide py-2">
            {speakers.map((speaker) => (
              <button
                key={speaker}
                type="button"
                onClick={() => {
                  setSelectedSpeaker(speaker);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-xs transition-colors ${
                  selectedSpeaker === speaker
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span>{speaker}</span>

                {selectedSpeaker === speaker && (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SpeakerSelect