import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FiCheck, FiCopy, FiMenu, FiSend, FiX } from 'react-icons/fi'
import { PageTransition } from './PageTransition'
import { FontImports, Header } from './Shell'
// Assumption: matches the shared Node axios client set up earlier.
// Adjust this import path if your project uses a different location.
import api from '../instances/axiosInstance'
import VoiceInput from './VoiceInput'
import SpeakerSelect from './SpeakerSelect'

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



const speakers = [
  "shubh", // default
  "aditya",
  "ritu",
  "priya",
  "neha",
  "rahul",
  "pooja",
  "rohan",
  "simran",
  "kavya",
  "amit",
  "dev",
  "ishita",
  "shreya",
  "ratan",
  "varun",
  "manan",
  "sumit",
  "roopa",
  "kabir",
  "aayan",
  "ashutosh",
  "advait",
  "anand",
  "tanya",
  "tarun",
  "sunny",
  "mani",
  "gokul",
  "vijay",
  "shruti",
  "suhani",
  "mohit",
  "kavitha",
  "rehan",
  "soham",
  "rupali",
];

const defaultSpeaker = speakers[0]; // "Shubh"

function Retrieval() {
  const navigate = useNavigate()

  const [docs, setDocs] = useState([])
  const [docsStatus, setDocsStatus] = useState('loading')
  const [selectedDoc, setSelectedDoc] = useState(null)

  const [query, setQuery] = useState('')
  const [targetLang, setTargetLang] = useState('hi-IN')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [copiedEntryId, setCopiedEntryId] = useState(null)
  const [conversation, setConversation] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [selectedSpeaker, setSelectedSpeaker] = useState(defaultSpeaker)

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get('/api/docs')
        setDocs(res.data.docs || [])
        setDocsStatus('ready')
      } catch (err) {
        console.log('DOCS ERROR:', err)
        console.log('Status:', err.response?.status)
        console.log('Data:', err.response?.data)
        setDocsStatus('error')
      }
    }
    fetchDocs()
  }, [])

  const targetLabel = useMemo(() => {
    return LANGUAGES.find((lang) => lang.code === targetLang)?.label || targetLang
  }, [targetLang])

  const handleSelectDoc = (doc) => {
    setSelectedDoc(doc)
  }

  const appendMessage = (role, content, meta = {}) => {
    setConversation((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        content,
        createdAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        ...meta,
      },
    ])
  }

  const handleCopy = () => {
    const answerText = result?.content || conversation[conversation.length - 1]?.content || ''
    if (!answerText) return
    navigator.clipboard.writeText(answerText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleCopyEntry = async (text, entryId) => {
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      setCopiedEntryId(entryId)
      setTimeout(() => setCopiedEntryId((current) => (current === entryId ? null : current)), 1500)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const trimmedQuery = query.trim()
    if (!selectedDoc) {
      setStatus('error')
      setMessage('Select a document from your library first.')
      return
    }
    if (!trimmedQuery) {
      setStatus('error')
      setMessage('Enter a question or prompt.')
      return
    }

    setStatus('loading')
    setMessage('')
    setResult(null)
    appendMessage('user', trimmedQuery, {
      docTitle: selectedDoc.title,
      targetLabel,
      source: 'text',
    })
    setQuery('')

    try {
      const res = await axios.post(`${FLASK_BASE_URL}/ask`, {
        doc_id: selectedDoc.doc_id,
        query: trimmedQuery,
        target_lang: targetLang,
        speaker:selectedSpeaker,
      })

      setStatus('success')
      setResult(res.data)
      appendMessage('assistant', res.data.content || res.data.answer || 'No answer returned.', {
        docTitle: res.data.doc_title || selectedDoc.title,
        targetLabel,
        keyWords: res.data.key_workds || [],
        source: 'text',
      })

      if (voiceEnabled && res.data.audio) {
        const audioBytes = Uint8Array.from(atob(res.data.audio), (char) => char.charCodeAt(0))
        const blob = new Blob([audioBytes], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.play()
      }
    } catch (err) {
      setStatus('error')
      const apiError = err.response?.data?.error || err.response?.data?.details || err.message
      setMessage(apiError)
      appendMessage('assistant', 'I could not complete that request. Please try again.', {
        isError: true,
      })
    }
  }

  const handleVoiceResult = (data) => {
    const transcript = data.transcript || ''
    const answerText = data.content || data.answer || ''

    if (transcript) {
      appendMessage('user', transcript, {
        docTitle: selectedDoc?.title,
        targetLabel,
        source: 'voice',
      })
    }
    setQuery('')

    if (answerText) {
      setStatus('success')
      setResult(data)
      appendMessage('assistant', answerText, {
        docTitle: data.doc_title || selectedDoc?.title,
        targetLabel,
        keyWords: data.key_workds || [],
        source: 'voice',
      })
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  console.log("selectedSpeaker", selectedSpeaker)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(248,190,80,0.16),_transparent_28%),linear-gradient(135deg,_#060816_0%,_#12172a_45%,_#0b1020_100%)] text-slate-100 font-body">
      <FontImports />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500&display=swap');
        .font-reading { font-family: 'Source Serif 4', Georgia, serif; }
      `}</style>
      <Header variant="back" />

      <PageTransition className="px-4 py-4 md:py-8 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* <div className="mb-6 rounded-[28px] border border-white/10 bg-white/10 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-400">
                  Enterprise research copilot
                </p>
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                  Conversation-grade document intelligence
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                  Ground every question in the document you select, switch languages instantly, and keep the exchange flowing in a premium workspace.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-400/20 bg-slate-950/70 px-4 py-3 text-sm shadow-inner">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Active context</p>
                <p className="mt-1 font-medium text-white">
                  {selectedDoc?.title || 'No document selected'}
                </p>
                <p className="text-slate-400">{targetLabel}</p>
              </div>
            </div>
          </div> */}

          <div className="grid md:gap-6  lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="lg:hidden">
              <div className="mb-4 flex items-center gap-4 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 shadow-[0_10px_35px_rgba(0,0,0,0.2)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:border-amber-400/40 hover:text-white"
                >
                  {sidebarOpen ? <FiX size={16} /> : <FiMenu size={16} />}
                </button>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400">Context</p>
                  <p className="text-sm text-white">Open the document workspace</p>
                </div>
                
              </div>
            </div>

            <div className="lg:hidden">
              {sidebarOpen && (
                <button
                  type="button"
                  className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                />
              )}
            </div>

            <aside className={`fixed left-0 top-0 z-50 h-full space-y-12 md:space-y-0 md:flex flex-col justify-between w-[88vw] max-w-[320px] rounded-r-[28px] lg:rounded-md border-r border-white/10 bg-slate-950/90 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:sticky lg:top-24 lg:h-auto lg:w-full lg:translate-x-0  lg:border lg:bg-slate-950/70 lg:shadow-[0_20px_70px_rgba(0,0,0,0.25)]`}>
              <div className=" md:mt-0  mt-5 flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-400">
                    Workspace controls
                  </p>
                  <h2 className="md:mt-2 mt-1 text-lg md:text-xl font-semibold md:hidden text-white">Set the context</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:border-amber-400/40 hover:text-white lg:hidden"
                >
                  <FiX size={12} />
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    {/* <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Voice output</p> */}
                    <p className="mt-1 text-xs text-slate-300">Enable audio playback for assistant replies</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVoiceEnabled((prev) => !prev)}
                    className={`relative h-6 w-11 rounded-full transition ${voiceEnabled ? 'bg-amber-400' : 'bg-white/15'}`}
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${voiceEnabled ? 'left-4' : 'left-1'}`} />
                  </button>
                </div>

                <div className="mt-2 ">
            
                  <SpeakerSelect
                    speakers={speakers}
                    selectedSpeaker={selectedSpeaker}
                    setSelectedSpeaker={setSelectedSpeaker}
                  />
                </div>
              </div>

              <div className="mb-">
                <label className="mb-2 block text-[11px] font-semibold tracking-[0.1em] uppercase md:tracking-[0.2em] text-slate-400">
                  Select document
                </label>

                {docsStatus === 'loading' && (
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3 text-sm text-slate-400">
                    Loading your documents…
                  </div>
                )}

                {docsStatus === 'error' && (
                  <p className="mb-2 text-xs text-rose-300">Couldn’t load your document library. Please refresh and try again.</p>
                )}

                {docsStatus === 'ready' && (
                  <div className="flex flex-wrap gap-2">
                    {docs.length === 0 ? (
                      <div className="w-full rounded-2xl border border-dashed border-white/10 bg-slate-900/50 px-3 py-4 text-sm text-slate-400">
                        No documents yet.
                        <button
                          type="button"
                          onClick={() => navigate('/ingest')}
                          className="mt-2 block text-amber-400 transition hover:text-amber-300"
                        >
                          Upload your first document →
                        </button>
                      </div>
                    ) : (
                      docs.map((doc) => {
                        const active = selectedDoc?.doc_id === doc.doc_id
                        return (
                          <button
                            key={doc.doc_id}
                            type="button"
                            onClick={() => handleSelectDoc(doc)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              active
                                ? 'border-amber-400 bg-amber-400 text-slate-950'
                                : 'border-white/10 bg-white/5 text-slate-300 hover:border-amber-400/40 hover:text-white'
                            }`}
                          >
                            {doc.title}
                          </button>
                        )
                      })
                    )}
                  </div>
                )}

                {selectedDoc && (
                  <p className="mt-2 text-xs text-slate-400">Selected: {selectedDoc.title}</p>
                )}
              </div>

              <div className="mb-">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] md:tracking-[0.2em] text-slate-400">
                  Select target language
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => {
                    const active = targetLang === lang.code
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setTargetLang(lang.code)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          active
                            ? 'border-amber-400 bg-amber-400 text-slate-950'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-amber-400/40 hover:text-white'
                        }`}
                      >
                        {lang.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              

               <div className=" rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-3">
                
                
                <ul className=" space-y-1.5 text-xs text-slate-300">
                  <li>• Conversational thread with contextual memory</li>
                  <li className='md:hidden'>• Voice and text working side by side</li>
                  <li className='md:hidden'>• Clean, enterprise-grade visual hierarchy</li>
                </ul>
              </div>

             
            </aside>

            <motion.main
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.22 }}
              className="overflow-hidden md:h-[600px] rounded-md flex flex-col justify-between  border border-white/10 bg-slate-950/70 shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-xl"
            >
              <div className="flex flex-wrap items-center justify-between border-b border-white/10 px-3 md:px-5 py-4">
                <div>
                  <p className="md:text-[11px] text-[9px] uppercase tracking-[0.35em] text-amber-400">Conversation agent</p>
                  <h3 className="md:text-lg text-sm font-semibold text-white">Ask, review, and iterate</h3>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 truncate text-[9px] md:text-sm text-slate-300">
                  {selectedDoc ? `Context: ${selectedDoc.title}` : 'Select a document to begin'}
                </div>
              </div>

              <div className="h-[350px] xl:h-[300px] overflow-x-hidden overflow-y-auto scrollbar-hide px-4 py-4 sm:px-5">
                {conversation.length === 0 && status === 'idle' && (
                  <div className="flex h-full h-[250px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-gradient-to-br from-white/5 to-transparent px-6 py-10 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/12 text-3xl text-amber-400">
                      ✦
                    </div>
                    <h4 className="text-xl font-semibold text-white">Your next insight is one prompt away</h4>
                    <p className="mt-2 max-w-md text-sm leading-7 text-slate-400">
                      Choose a document, set your language, and start a grounded conversation with your knowledge base.
                    </p>
                  </div>
                )}

                <AnimatePresence initial={false}>
                {conversation.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    className={`mb-3 flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[92%] rounded-[22px] border px-3 md:px-4 py-1 md:py-2 shadow-sm sm:max-w-[80%] ${
                      entry.role === 'user'
                        ? 'border-amber-400/20 bg-amber-400/10 text-white'
                        : entry.isError
                          ? 'border-rose-400/20 bg-rose-500/10 text-rose-100'
                          : 'border-white/10 bg-slate-900/90 text-slate-100'
                    }`}>
                      <div className="md:mb-2 text-[10px] uppercase tracking-[0.1em] text-slate-400">
                        {entry.role === 'user' ? 'You' : 'Assistant'}
                      </div>
                      <p className="whitespace-pre-wrap text-xs md:text-sm leading-[2rem]">{entry.content}</p>
                      {entry.role === 'assistant' && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          {entry.keyWords?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {entry.keyWords.map((keyword, index) => (
                                <span key={`${keyword}-${index}`} className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] text-amber-300">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyEntry(entry.content, entry.id)}
                            className="rounded-full border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-amber-400/40 hover:text-white"
                          >
                            {copiedEntryId === entry.id ? <FiCheck size={12} /> : <FiCopy size={12} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                </AnimatePresence>

                {status === 'loading' && (
                  <div className="flex justify-start">
                    <div className="rounded-[22px] border border-white/10 bg-slate-900/90 px-4 py-3">
                      <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-slate-400">Assistant</div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                        <span>Thinking through the document context…</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {message && (
                <div className="md:mx-4 mx-2 mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 sm:mx-5">
                  {message}
                </div>
              )}

              <motion.form
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.2 }}
                onSubmit={handleSubmit}
                className="bg-slate-950/70 px-2 md:px-4 py-4 sm:px-5"
              >
                <div className="rounded-[24px] border border-white/10  bg-slate-950/70 p-3 md:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <label className="mb-2 block px-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Ask a question
                  </label>
                  <textarea
                    id="query"
                    rows={4}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask in natural language, then let the agent synthesize the answer."
                    className="h-14 w-full resize-none border-0 bg-transparent px-2 pb-2 text-sm text-white outline-none placeholder:text-slate-500"
                  />

                  <div className="mt-2 flex  justify-between md:justify-none gap-1.5 md:gap-3 rounded-[18px] border border-white/10  bg-slate-900/80 px-1 md:px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-[10px] md:text-xs text-slate-400">
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-300">
                        Grounded answer
                      </span>
                      <span className='md:block hidden'>Shift + Enter for a new line</span>
                    </div>

                    <div className="flex  items-center gap-2">
                      <VoiceInput
                        selectedDoc={selectedDoc}
                        targetLang={targetLang}
                        selectedSpeaker={selectedSpeaker}
                        onResult={handleVoiceResult}
                        onVoiceStart={() => setQuery('')}
                      />
                      {/* {result?.content && (
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-amber-400/40 hover:text-white"
                        >
                          {copied ? '✓ Copied' : 'Copy'}
                        </button>
                      )} */}
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={status === 'loading'}
                        className="flex items-center gap-2 rounded-full bg-amber-400  px-3 py-1.5 text-xs md:font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FiSend size={12} />
                        {status === 'loading' ? 'Thinking…' : 'Send'}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.form>
            </motion.main>
          </div>
        </div>
      </PageTransition>
    </div>
  )
}

export default Retrieval






