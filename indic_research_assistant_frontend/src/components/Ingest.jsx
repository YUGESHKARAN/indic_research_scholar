import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
const FLASK_BASE_URL = 'http://127.0.0.1:5000'

function Ingest() {
  const [file, setFile] = useState(null)
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const navigate = useNavigate()

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    setFile(selected || null)
    // convenience: prefill title from filename if user hasn't typed one
    if (selected && !title) {
      setTitle(selected.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!file) {
      setStatus('error')
      setMessage('Choose a document to upload.')
      return
    }
    if (!email) {
      setStatus('error')
      setMessage('Email is required.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('email', email)
    if (title) formData.append('title', title)

    setStatus('loading')
    setMessage('')
    setResult(null)

    try {
      const res = await axios.post(`${FLASK_BASE_URL}/ingest`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setStatus('success')
      setResult(res.data)
      setMessage(`Ingested "${res.data.title}" — ${res.data.num_chunks} chunks stored.`)
    } catch (err) {
      setStatus('error')
      const apiError =
        err.response?.data?.error || err.response?.data?.details || err.message
      setMessage(apiError)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
        
      <div className="w-full max-w-md">
        <div className='flex items-center justify-between'>
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-neutral-500 mb-1">
            Indic Research Assistant
          </p>
          <h1 className="text-2xl font-semibold">Upload a document</h1>
          <p className="text-sm text-neutral-400 mt-1">
            PDF, PNG, JPEG or ZIP · max 10 pages for now
          </p>
        </div>
        <button 
        onClick={()=>{navigate("/")}}
        className='text-sm rounded-lg px-3 py-0.5 border border-gray-800 '>
            back
        </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="file" className="block text-sm text-neutral-300 mb-1">
              Document
            </label>
            <input
              id="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.zip"
              onChange={handleFileChange}
              className="w-full text-sm text-neutral-300 file:mr-3 file:py-2 file:px-3
                         file:rounded-md file:border-0 file:bg-neutral-800 file:text-neutral-200
                         hover:file:bg-neutral-700 file:cursor-pointer cursor-pointer
                         border border-neutral-800 rounded-md bg-neutral-900"
            />
            {file && (
              <p className="text-xs text-neutral-500 mt-1">{file.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-neutral-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900
                         px-3 py-2 text-sm outline-none focus:border-neutral-500
                         placeholder:text-neutral-600"
            />
          </div>

          <div>
            <label htmlFor="title" className="block text-sm text-neutral-300 mb-1">
              Title <span className="text-neutral-600">(optional)</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Defaults to filename"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900
                         px-3 py-2 text-sm outline-none focus:border-neutral-500
                         placeholder:text-neutral-600"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded-md bg-neutral-100 text-neutral-900 py-2 text-sm
                       font-medium hover:bg-white transition-colors disabled:opacity-50
                       disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Processing document…' : 'Ingest document'}
          </button>
        </form>

        {status === 'loading' && (
          <p className="text-xs text-neutral-500 mt-3">
            OCR + embedding runs synchronously — this can take a bit for image-heavy pages.
          </p>
        )}

        {status === 'success' && (
          <div className="mt-4 rounded-md border border-emerald-900 bg-emerald-950/50 p-3 text-sm text-emerald-300">
            {message}
            {result && (
              <p className="text-xs text-emerald-500 mt-1 break-all">doc_id: {result.doc_id}</p>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="mt-4 rounded-md border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default Ingest