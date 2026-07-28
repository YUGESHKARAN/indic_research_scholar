import React, { useState, useEffect, useMemo, useRef } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { FontImports, Header } from './Shell'
// Assumption: matches the shared Node axios client set up earlier.
// Adjust this import path if your project uses a different location.
import api from '../instances/axiosInstance'

// const FLASK_BASE_URL = 'http://127.0.0.1:5000'
const FLASK_BASE_URL = 'https://indic-research-scholar.onrender.com'

const LANGUAGES = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'kn-IN', label: 'Kannada' },
  { code: 'ml-IN', label: 'Malayalam' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'mr-IN', label: 'Marathi' },
  { code: 'gu-IN', label: 'Gujarati' },
  { code: 'pa-IN', label: 'Punjabi' },
  { code: 'od-IN', label: 'Odia' },
]

function Retrieval() {
  const navigate = useNavigate()

  // --- Doc library (fetched from Node) ---
  const [docs, setDocs] = useState([])
  const [docsStatus, setDocsStatus] = useState('loading') // loading | ready | error
  const [selectedDoc, setSelectedDoc] = useState(null)     // { doc_id, title }
  const [searchTerm, setSearchTerm] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const comboRef = useRef(null)

  // --- Query form ---
  const [query, setQuery] = useState('')
  const [targetLang, setTargetLang] = useState('hi-IN')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get('/api/docs')
        setDocs(res.data.docs || [])
        setDocsStatus('ready')
      } catch (err) {
  console.log("DOCS ERROR:", err);
  console.log("Status:", err.response?.status);
  console.log("Data:", err.response?.data);

  setDocsStatus("error");
}
    }
    fetchDocs()
  }, [])

  // close dropdown on click-away
  useEffect(() => {
    const handleClickAway = (e) => {
      if (comboRef.current && !comboRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickAway)
    return () => document.removeEventListener('mousedown', handleClickAway)
  }, [])

  const filteredDocs = useMemo(() => {
    if (!searchTerm.trim()) return docs
    const q = searchTerm.toLowerCase()
    return docs.filter((d) => d.title.toLowerCase().includes(q))
  }, [docs, searchTerm])

  const handleSelectDoc = (doc) => {
    setSelectedDoc(doc)
    setSearchTerm(doc.title)
    setDropdownOpen(false)
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setDropdownOpen(true)
    if (selectedDoc && e.target.value !== selectedDoc.title) {
      setSelectedDoc(null) // typing again invalidates the previous selection
    }
  }

  const handleCopy = () => {
    if (!result?.content) return
    navigator.clipboard.writeText(result.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedDoc) {
      setStatus('error')
      setMessage('Select a document from your library first.')
      return
    }
    if (!query.trim()) {
      setStatus('error')
      setMessage('Enter a question.')
      return
    }

    setStatus('loading')
    setMessage('')
    setResult(null)

    try {
      const res = await axios.post(`${FLASK_BASE_URL}/ask`, {
        doc_id: selectedDoc.doc_id,
        query: query.trim(),
        target_lang: targetLang,
      })
      setStatus('success')
      setResult(res.data)
    } catch (err) {
      setStatus('error')
      const apiError =
        err.response?.data?.error || err.response?.data?.details || err.message
      setMessage(apiError)
    }
  }


  console.log("docs", docs)
  return (
    <div className="min-h-screen bg-[#10101B] text-[#F1EEE4] font-body">
      <FontImports />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500&display=swap');
        .font-reading { font-family: 'Source Serif 4', Georgia, serif; }
      `}</style>
      <Header variant="back" />

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <p className="font-mono text-xs tracking-[0.2em] text-[#E8A33D] uppercase mb-2">
              Step 02
            </p>
            <h1 className="font-display text-3xl font-semibold">Ask a document</h1>
            <p className="text-sm text-[#F1EEE4]/50 mt-2">
              Search your library, then ask in the language you think in
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Document combobox */}
            <div ref={comboRef} className="relative">
              <label htmlFor="docSearch" className="block text-sm text-[#F1EEE4]/70 mb-1">
                Document
              </label>
              <div className="relative">
                <input
                  id="docSearch"
                  type="text"
                  value={searchTerm}
                  onFocus={() => setDropdownOpen(true)}
                  onChange={handleSearchChange}
                  placeholder={
                    docsStatus === 'loading' ? 'Loading your library…' : 'Search your documents…'
                  }
                  disabled={docsStatus === 'loading'}
                  className="w-full rounded-md border border-[#2A2A3D] bg-[#181826]
                             px-3 py-2.5 text-sm outline-none focus:border-[#E8A33D]/60
                             placeholder:text-[#F1EEE4]/30 disabled:opacity-50"
                />
                {selectedDoc && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E8A33D] text-xs">
                    ✓
                  </span>
                )}
              </div>

              {selectedDoc && (
                <p className="text-xs text-[#F1EEE4]/30 font-mono mt-1 truncate">
                  doc_id: {selectedDoc.doc_id}
                </p>
              )}

              {dropdownOpen && docsStatus === 'ready' && (
                <div className="absolute z-30 mt-1 w-full rounded-md border border-[#2A2A3D]
                                 bg-[#181826] shadow-xl max-h-64 overflow-y-auto">
                  {filteredDocs.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-[#F1EEE4]/50">
                        {docs.length === 0
                          ? "You haven't uploaded any documents yet."
                          : 'No documents match that search.'}
                      </p>
                      {docs.length === 0 && (
                        <button
                          type="button"
                          onClick={() => navigate('/ingest')}
                          className="text-sm text-[#E8A33D] hover:text-[#f0b158] mt-2 transition-colors"
                        >
                          Upload your first document →
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredDocs.map((doc) => (
                      <button
                        type="button"
                        key={doc.doc_id}
                        onClick={() => handleSelectDoc(doc)}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#10101B] transition-colors
                                   border-b border-[#2A2A3D] last:border-b-0 flex items-center gap-2.5"
                      >
                        <span className="w-6 h-6 rounded bg-[#2A2A3D] text-[#E8A33D] text-xs
                                         flex items-center justify-center shrink-0">
                          📄
                        </span>
                        <span className="text-sm text-[#F1EEE4] truncate">{doc.title}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {docsStatus === 'error' && (
                <p className="text-xs text-red-400 mt-1">
                  Couldn't load your document library. Try refreshing.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="targetLang" className="block text-sm text-[#F1EEE4]/70 mb-1">
                Answer in
              </label>
              <select
                id="targetLang"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full rounded-md border border-[#2A2A3D] bg-[#181826]
                           px-3 py-2.5 text-sm outline-none focus:border-[#E8A33D]/60"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="query" className="block text-sm text-[#F1EEE4]/70 mb-1">
                Question
              </label>
              <textarea
                id="query"
                rows={3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. What dataset did the authors use, and what was the accuracy?"
                className="w-full rounded-md border border-[#2A2A3D] bg-[#181826]
                           px-3 py-2.5 text-sm outline-none focus:border-[#E8A33D]/60
                           placeholder:text-[#F1EEE4]/30 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-md bg-[#E8A33D] text-[#10101B] py-2.5 text-sm
                         font-medium hover:bg-[#f0b158] transition-colors disabled:opacity-50
                         disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Thinking…' : 'Ask'}
            </button>
          </form>

          {status === 'loading' && (
            <div className="mt-6 rounded-lg border border-[#2A2A3D] bg-[#181826] p-5 animate-pulse space-y-3">
              <div className="h-3 w-24 bg-[#2A2A3D] rounded" />
              <div className="h-4 w-full bg-[#2A2A3D] rounded" />
              <div className="h-4 w-5/6 bg-[#2A2A3D] rounded" />
              <div className="h-4 w-3/4 bg-[#2A2A3D] rounded" />
            </div>
          )}

          {status === 'error' && (
            <div className="mt-6 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
              {message}
            </div>
          )}

          {status === 'success' && result && (
            <div className="mt-6 rounded-lg border border-[#2A2A3D] bg-[#181826] overflow-hidden">
              {/* Header strip: doc title + language answered in */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A2A3D] bg-[#10101B]/40">
                <p className="font-mono text-xs uppercase tracking-widest text-[#E8A33D] truncate">
                  {result.doc_title || 'Document'}
                </p>
                <span className="text-xs px-2.5 py-0.5 rounded-full border border-[#2A2A3D] text-[#F1EEE4]/60 whitespace-nowrap ml-3">
                  {LANGUAGES.find((l) => l.code === targetLang)?.label || targetLang}
                </span>
              </div>

              {/* The question that was asked, for context when scrolling back later */}
              <div className="px-5 pt-4">
                <p className="font-mono text-xs text-[#F1EEE4]/40">Q</p>
                <p className="text-sm text-[#F1EEE4]/60 mt-0.5">{query}</p>
              </div>

              {/* Answer — dedicated reading serif, generous line-height, accent rule */}
              <div className="px-5 py-5 border-l-2 border-[#E8A33D]/40 ml-5 mt-3 mr-5">
                <p className="font-reading text-lg leading-8 text-[#F1EEE4] whitespace-pre-wrap">
                  {result.content}
                </p>

                <div className="flex items-center gap-4 mt-4">
                  <button
                    onClick={handleCopy}
                    className="text-xs text-[#F1EEE4]/40 hover:text-[#F1EEE4]/80 transition-colors"
                  >
                    {copied ? '✓ copied' : 'copy answer'}
                  </button>
                  <span className="text-xs text-[#F1EEE4]/25">
                    Generated from your document — verify against the source for critical use
                  </span>
                </div>
              </div>

              {/* Key metrics — labeled, distinct from UI chrome */}
              {Array.isArray(result.key_workds) && result.key_workds.length > 0 && (
                <div className="px-5 pb-5 pt-3 border-t border-[#2A2A3D] mt-2">
                  <p className="font-mono text-xs uppercase tracking-widest text-[#F1EEE4]/40 mb-2">
                    Key metrics &amp; keywords
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.key_workds.map((kw, i) => (
                      <span
                        key={i}
                        className="text-xs px-2.5 py-1 rounded-full border border-[#E8A33D]/30
                                   text-[#E8A33D] bg-[#E8A33D]/10"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Retrieval