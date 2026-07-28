import React from 'react'
import { Link } from 'react-router-dom'
import { FontImports, Header } from './Shell'

const SCRIPT_PARADE = [
  { word: 'अनुसंधान', lang: 'Hindi', font: "'Noto Sans Devanagari', sans-serif" },
  { word: 'ஆராய்ச்சி', lang: 'Tamil', font: "'Noto Sans Tamil', sans-serif" },
  { word: 'పరిశోధన', lang: 'Telugu', font: "'Noto Sans Telugu', sans-serif" },
  { word: 'গবেষণা', lang: 'Bengali', font: "'Noto Sans Bengali', sans-serif" },
  { word: 'ಸಂಶೋಧನೆ', lang: 'Kannada', font: "'Noto Sans Kannada', sans-serif" },
  { word: 'ഗവേഷണം', lang: 'Malayalam', font: "'Noto Sans Malayalam', sans-serif" },
]

const STEPS = [
  {
    number: '01',
    title: 'Upload the paper',
    body: 'Drop in a PDF, scan, or image. Sarvam Vision reads it — tables, layout, and all — and every page becomes searchable.',
    cta: 'Ingest a document',
    to: '/ingest',
  },
  {
    number: '02',
    title: 'Ask, in your language',
    body: 'Type your question in Hindi, Tamil, Telugu, or any of 22 Indian languages. Get back a grounded answer, with the key figures pulled out.',
    cta: 'Ask a document',
    to: '/ask',
  },
]

const FEATURES = [
  {
    title: 'Scoped to your document',
    body: "Every answer is retrieved from the paper you uploaded — nothing borrowed, nothing invented from outside the source.",
  },
  {
    title: 'Key metrics, surfaced',
    body: 'Numbers, findings, and datasets buried in dense papers come back as short, scannable keywords alongside the answer.',
  },
  {
    title: '11+ Indian languages',
    body: 'Ask and read in Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Odia, or English.',
  },
]

function Landing() {
  return (
    <div className="min-h-screen bg-[#10101B]  text-[#F1EEE4] font-body">
      <FontImports />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@500&family=Noto+Sans+Tamil:wght@500&family=Noto+Sans+Telugu:wght@500&family=Noto+Sans+Bengali:wght@500&family=Noto+Sans+Kannada:wght@500&family=Noto+Sans+Malayalam:wght@500&display=swap');
      `}</style>

      <Header />

      {/* Hero */}
      <section className="max-w-6xl overflow-x-hidden  mx-auto px-6 pt-10 md:pt-20 pb-12 md:pb-24">
        <p className="font-mono text-[10px] md:text-xs tracking-[0.2em] text-[#E8A33D] uppercase mb-6">
          For students, scholars &amp; researchers
        </p>

        <h1 className="font-display text-4xl md:text-7xl font-semibold leading-[1.05] max-w-3xl">
          Research, in your own language.
        </h1>

        <p className="font-body text-sm md:text-lg text-[#F1EEE4]/70 max-w-xl mt-6 leading-relaxed">
          Upload an advanced research document. Walk through it, question it, and understand
          it — entirely in the Indic language you think in.
        </p>

        {/* Signature: the same idea, in six scripts */}
        <div className="mt-9 md:mt-12 flex flex-wrap items-baseline gap-x-3 md:gap-x-5 gap-y-3">
          {SCRIPT_PARADE.map((s, i) => (
            <React.Fragment key={s.word}>
              <span
                className="text-xl md:text-3xl text-[#F1EEE4]/90"
                style={{ fontFamily: s.font }}
                title={s.lang}
              >
                {s.word}
              </span>
              {i < SCRIPT_PARADE.length - 1 && (
                <span className="text-[#E8A33D]/50 text-sm">·</span>
              )}
            </React.Fragment>
          ))}
        </div>
        <p className="font-mono text-xs text-[#F1EEE4]/40 mt-3">
          the same word, "research," across six scripts — one document, read in all of them
        </p>

        <div className="flex flex-wrap gap-3 mt-10">
          <Link
            to="/ingest"
            className="px-3 md:px-6 py-1.5 text-sm md:text-base md:py-3 rounded-md bg-[#E8A33D] text-[#10101B] font-medium
                       hover:bg-[#f0b158] transition-colors"
          >
            Ingest a document
          </Link>
          <Link
            to="/ask"
            className="px-3 md:px-6 py-1.5 text-sm md:text-base md:py-3 rounded-md border border-[#2A2A3D] text-[#F1EEE4]
                       hover:border-[#E8A33D]/50 hover:bg-[#181826] transition-colors"
          >
            Ask a document
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t overflow-x-hidden border-[#2A2A3D] bg-[#0D0D16]">
        <div className="max-w-6xl mx-auto px-6 py-10 md:py-20">
          <p className="font-mono text-xs tracking-[0.2em] text-[#E8A33D] uppercase mb-3">
            How it works
          </p>
          <h2 className="font-display text-xl md:text-4xl font-semibold mb-14">
            Two steps. Any paper. Any language.
          </h2>

          <div className="grid md:grid-cols-2 gap-8 relative">
            <div className="hidden md:block absolute left-1/2 top-10 -translate-x-1/2 text-[#2A2A3D] text-3xl">
              →
            </div>
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="bg-[#181826] border border-[#2A2A3D] rounded-xl p-6 md:p-8 flex flex-col"
              >
                <span className="font-mono text-xs md:text-sm text-[#E8A33D] mb-4">{step.number}</span>
                <h3 className="font-display text-xl md:text-2xl font-semibold mb-3">{step.title}</h3>
                <p className="text-[#F1EEE4]/60 leading-relaxed mb-3 md:mb-6 flex-1">{step.body}</p>
                <Link
                  to={step.to}
                  className="font-body text-xs md:text-sm font-medium text-[#E8A33D] hover:text-[#f0b158]
                             inline-flex items-center gap-1 transition-colors"
                >
                  {step.cta} <span aria-hidden>→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl overflow-x-hidden mx-auto px-6 pb-10 pt-5 md:py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="border-t border-[#2A2A3D] pt-6">
              <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-[#F1EEE4]/60 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t overflow-x-hidden border-[#2A2A3D]">
        <div className="max-w-6xl mx-auto px-6  pb-10 pt-8 md:py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-semibold mb-1">Start with a paper.</h2>
            <p className="text-[#F1EEE4]/50 text-sm">PDF, PNG, JPEG, or ZIP — up to 10 pages for now.</p>
          </div>
          <Link
            to="/ingest"
            className="px-3 md:px-6 py-1.5 text-sm md:text-base md:py-3 rounded-md bg-[#E8A33D] text-[#10101B] font-medium
                       hover:bg-[#f0b158] transition-colors whitespace-nowrap"
          >
            Upload your first document
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Landing