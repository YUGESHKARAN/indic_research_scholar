import React from 'react'
import { Link } from 'react-router-dom'

export function FontImports() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
      .font-display { font-family: 'Fraunces', serif; }
      .font-body { font-family: 'Inter', sans-serif; }
      .font-mono { font-family: 'IBM Plex Mono', monospace; }
    `}</style>
  )
}

export function Header({ variant = 'default' }) {
  return (
    <header className="border-b border-[#2A2A3D] bg-[#10101B]/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <span className="w-8 h-8 rounded-md bg-[#E8A33D] text-[#10101B] font-display font-semibold
                           flex items-center justify-center text-lg">
            अ
          </span>
          <span className="font-body text-sm text-[#F1EEE4] tracking-wide">
            Indic Research Assistant
          </span>
        </Link>

        {variant === 'default' && (
          <nav className="flex items-center gap-2">
            <Link
              to="/ingest"
              className="font-body text-sm px-4 py-2 rounded-md text-[#F1EEE4]/80 hover:text-[#F1EEE4]
                         hover:bg-[#181826] transition-colors"
            >
              Ingest
            </Link>
            <Link
              to="/ask"
              className="font-body text-sm px-4 py-2 rounded-md bg-[#E8A33D] text-[#10101B] font-medium
                         hover:bg-[#f0b158] transition-colors"
            >
              Ask a document
            </Link>
          </nav>
        )}

        {variant === 'back' && (
          <Link
            to="/"
            className="font-body text-sm text-[#F1EEE4]/60 hover:text-[#F1EEE4] transition-colors"
          >
            ← Home
          </Link>
        )}
      </div>
    </header>
  )
}