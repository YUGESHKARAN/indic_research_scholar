import React, { useState, useMemo } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const FLASK_BASE_URL = 'http://127.0.0.1:5000'

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
  const [docId, setDocId] = useState('')
  const [query, setQuery] = useState('')
  const [targetLang, setTargetLang] = useState('hi-IN')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)   // <- must be here, inside the component, with the rest

  const handleCopy = () => {
    if (!result?.content) return
    navigator.clipboard.writeText(result.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!docId.trim()) {
      setStatus('error')
      setMessage('doc_id is required.')
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
        doc_id: docId.trim(),
        query: query.trim(),
        target_lang: targetLang,
      })
      setStatus('success')
      setResult(res.data)
      // setResult(res.data.result)
    } catch (err) {
      setStatus('error')
      const apiError =
        err.response?.data?.error || err.response?.data?.details || err.message
      setMessage(apiError)
      console.log("error", err)
    }
  }



  return (
    // <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
    //   <div className="w-full max-w-xl">
    //     <div className='flex items-center justify-between'>

    //     <div className="mb-6">
    //       <p className="text-xs uppercase tracking-widest text-neutral-500 mb-1">
    //         Indic Research Assistant
    //       </p>
    //       <h1 className="text-2xl font-semibold">Ask a document</h1>
    //       <p className="text-sm text-neutral-400 mt-1">
    //         Query a previously ingested document in your language of choice
    //       </p>
    //     </div>

    //        <button 
    //     onClick={()=>{navigate(-1)}}
    //     className='text-sm rounded-lg px-3 py-0.5 border border-gray-800 '>
    //         back
    //     </button>
    //      </div>

    //     <form onSubmit={handleSubmit} className="space-y-4">
    //       <div>
    //         <label htmlFor="docId" className="block text-sm text-neutral-300 mb-1">
    //           Document ID
    //         </label>
    //         <input
    //           id="docId"
    //           type="text"
    //           value={docId}
    //           onChange={(e) => setDocId(e.target.value)}
    //           placeholder="paste the doc_id returned from ingest"
    //           className="w-full rounded-md border border-neutral-800 bg-neutral-900
    //                      px-3 py-2 text-sm outline-none focus:border-neutral-500
    //                      placeholder:text-neutral-600 font-mono"
    //         />
    //       </div>

    //       <div>
    //         <label htmlFor="targetLang" className="block text-sm text-neutral-300 mb-1">
    //           Answer in
    //         </label>
    //         <select
    //           id="targetLang"
    //           value={targetLang}
    //           onChange={(e) => setTargetLang(e.target.value)}
    //           className="w-full rounded-md border border-neutral-800 bg-neutral-900
    //                      px-3 py-2 text-sm outline-none focus:border-neutral-500"
    //         >
    //           {LANGUAGES.map((lang) => (
    //             <option key={lang.code} value={lang.code}>
    //               {lang.label}
    //             </option>
    //           ))}
    //         </select>
    //       </div>

    //       <div>
    //         <label htmlFor="query" className="block text-sm text-neutral-300 mb-1">
    //           Question
    //         </label>
    //         <textarea
    //           id="query"
    //           rows={3}
    //           value={query}
    //           onChange={(e) => setQuery(e.target.value)}
    //           placeholder="e.g. What dataset did the authors use, and what was the accuracy?"
    //           className="w-full rounded-md border border-neutral-800 bg-neutral-900
    //                      px-3 py-2 text-sm outline-none focus:border-neutral-500
    //                      placeholder:text-neutral-600 resize-none"
    //         />
    //       </div>

    //       <button
    //         type="submit"
    //         disabled={status === 'loading'}
    //         className="w-full rounded-md bg-neutral-100 text-neutral-900 py-2 text-sm
    //                    font-medium hover:bg-white transition-colors disabled:opacity-50
    //                    disabled:cursor-not-allowed"
    //       >
    //         {status === 'loading' ? 'Thinking…' : 'Ask'}
    //       </button>
    //     </form>

    //     {status === 'error' && (
    //       <div className="mt-4 rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">
    //         {message}
    //       </div>
    //     )}

    //     {status === 'success' && result && (
    //       <div className="mt-4 rounded-md border border-neutral-800 bg-neutral-900 p-4 space-y-3">
    //         {result.doc_title && (
    //           <p className="text-xs uppercase tracking-widest text-neutral-500">
    //             {result.doc_title}
    //           </p>
    //         )}

    //         <p className="text-sm leading-relaxed whitespace-pre-wrap">
    //           {result.content}
    //         </p>

    //         {Array.isArray(result.key_workds) && result.key_workds.length > 0 && (
    //           <div className="flex flex-wrap gap-2 pt-1">
    //             {result.key_workds.map((kw, i) => (
    //               <span
    //                 key={i}
    //                 className="text-xs px-2 py-1 rounded-full border border-neutral-700
    //                            text-neutral-300 bg-neutral-800"
    //               >
    //                 {kw}
    //               </span>
    //             ))}
    //           </div>
    //         )}
    //       </div>
    //     )}
    //   </div>
    // </div>
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4 py-12">
  <div className="w-full max-w-2xl">
    <div className="flex items-start justify-between mb-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-1">
          Indic Research Assistant
        </p>
        <h1 className="text-2xl font-semibold">Ask a document</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Query a previously ingested document in your language of choice
        </p>
      </div>

      <button
        onClick={() => { navigate("/") }}
        className="flex items-center gap-1 text-sm rounded-lg px-3 py-1.5 border border-neutral-800
                   text-neutral-400 hover:text-neutral-100 hover:border-neutral-600 transition-colors"
      >
        ← back
      </button>
    </div>

    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="docId" className="block text-sm text-neutral-300 mb-1">
          Document ID
        </label>
        <input
          id="docId"
          type="text"
          value={docId}
          onChange={(e) => setDocId(e.target.value)}
          placeholder="paste the doc_id returned from ingest"
          className="w-full rounded-md border border-neutral-800 bg-neutral-900
                     px-3 py-2 text-sm outline-none focus:border-neutral-500
                     placeholder:text-neutral-600 font-mono"
        />
      </div>

      <div>
        <label htmlFor="targetLang" className="block text-sm text-neutral-300 mb-1">
          Answer in
        </label>
        <select
          id="targetLang"
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="w-full rounded-md border border-neutral-800 bg-neutral-900
                     px-3 py-2 text-sm outline-none focus:border-neutral-500"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="query" className="block text-sm text-neutral-300 mb-1">
          Question
        </label>
        <textarea
          id="query"
          rows={3}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. What dataset did the authors use, and what was the accuracy?"
          className="w-full rounded-md border border-neutral-800 bg-neutral-900
                     px-3 py-2 text-sm outline-none focus:border-neutral-500
                     placeholder:text-neutral-600 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-md bg-neutral-100 text-neutral-900 py-2 text-sm
                   font-medium hover:bg-white transition-colors disabled:opacity-50
                   disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Thinking…' : 'Ask'}
      </button>
    </form>

    {status === 'loading' && (
      <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5 animate-pulse space-y-3">
        <div className="h-3 w-24 bg-neutral-800 rounded" />
        <div className="h-4 w-full bg-neutral-800 rounded" />
        <div className="h-4 w-5/6 bg-neutral-800 rounded" />
        <div className="h-4 w-3/4 bg-neutral-800 rounded" />
      </div>
    )}

    {status === 'error' && (
      <div className="mt-6 rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">
        {message}
      </div>
    )}

    {status === 'success' && result && (
      <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
        {/* Header strip: doc title + language answered in */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-900/60">
          <p className="text-xs uppercase tracking-widest text-neutral-500 truncate">
            {result.doc_title || 'Document'}
          </p>
          <span className="text-xs px-2 py-0.5 rounded-full border border-neutral-700 text-neutral-400 whitespace-nowrap ml-3">
            {LANGUAGES.find((l) => l.code === targetLang)?.label || targetLang}
          </span>
        </div>

        {/* The question that was asked, for context when scrolling back later */}
        <div className="px-5 pt-4">
          <p className="text-xs text-neutral-500">Q</p>
          <p className="text-sm text-neutral-400 mt-0.5">{query}</p>
        </div>

        {/* Answer — serif, larger, generous line-height: built for sustained reading */}
        <div className="px-5 py-5">
          <p className="font-serif text-lg leading-8 text-neutral-100 whitespace-pre-wrap">
            {result.content}
          </p>

          <button
            onClick={handleCopy}
            className="mt-4 text-xs text-neutral-500 hover:text-neutral-300 transition-colors
                       flex items-center gap-1"
          >
            {copied ? '✓ copied' : 'copy answer'}
          </button>
        </div>

        {/* Key metrics — labeled, not just bare chips */}
        {Array.isArray(result.key_workds) && result.key_workds.length > 0 && (
          <div className="px-5 pb-5 pt-2 border-t border-neutral-800">
            <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
              Key metrics &amp; keywords
            </p>
            <div className="flex flex-wrap gap-2">
              {result.key_workds.map((kw, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-full border border-neutral-700
                             text-neutral-300 bg-neutral-800"
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
  )
}

export default Retrieval