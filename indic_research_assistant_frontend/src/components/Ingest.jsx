
import React, { useState } from 'react'
import axios from 'axios'
import { FontImports, Header } from './Shell'
import { useAuth } from '../AuthContext'

// const FLASK_BASE_URL = 'http://127.0.0.1:5000'
const FLASK_BASE_URL = 'https://indic-research-scholar.onrender.com'

function Ingest() {
  const { user } = useAuth() // guaranteed non-null — this route is behind ProtectedRoute
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    setFile(selected || null)
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

    const formData = new FormData()
    formData.append('file', file)
    formData.append('email', user.email)
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
    <div className="min-h-screen bg-[#10101B] text-[#F1EEE4] font-body">
      <FontImports />
      <Header variant="back" />

      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="font-mono text-xs tracking-[0.2em] text-[#E8A33D] uppercase mb-2">
              Step 01
            </p>
            <h1 className="font-display text-3xl font-semibold">Upload a document</h1>
            <p className="text-sm text-[#F1EEE4]/50 mt-2">
              PDF, PNG, JPEG or ZIP · max 10 pages for now
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="file" className="block text-sm text-[#F1EEE4]/70 mb-1">
                Document
              </label>
              <input
                id="file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.zip"
                onChange={handleFileChange}
                className="w-full text-sm text-[#F1EEE4]/70 file:mr-3 file:py-2 file:px-3
                           file:rounded-md file:border-0 file:bg-[#2A2A3D] file:text-[#F1EEE4]
                           hover:file:bg-[#33334a] file:cursor-pointer cursor-pointer
                           border border-[#2A2A3D] rounded-md bg-[#181826] p-2"
              />
              {file && <p className="text-xs text-[#F1EEE4]/40 mt-1 font-mono">{file.name}</p>}
            </div>

            <div className="flex items-center gap-2 rounded-md border border-[#2A2A3D] bg-[#181826] px-3 py-2">
              <span className="w-5 h-5 rounded-full bg-[#2A2A3D] text-[#E8A33D] text-[10px] font-mono
                               flex items-center justify-center uppercase">
                {user.name?.[0] || '?'}
              </span>
              <p className="text-xs text-[#F1EEE4]/60 font-mono truncate">
                Uploading as {user.email}
              </p>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm text-[#F1EEE4]/70 mb-1">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Defaults to filename"
                className="w-full rounded-md border border-[#2A2A3D] bg-[#181826]
                           px-3 py-2 text-sm outline-none focus:border-[#E8A33D]/60
                           placeholder:text-[#F1EEE4]/30"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-md bg-[#E8A33D] text-[#10101B] py-2.5 text-sm
                         font-medium hover:bg-[#f0b158] transition-colors disabled:opacity-50
                         disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Processing document…' : 'Ingest document'}
            </button>
          </form>

          {status === 'loading' && (
            <p className="text-xs text-[#F1EEE4]/40 mt-3">
              OCR + embedding runs synchronously — this can take a bit for image-heavy pages.
            </p>
          )}

          {status === 'success' && (
            <div className="mt-4 rounded-md border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">
              {message}
              {result && (
                <p className="text-xs text-emerald-500/80 mt-1 break-all font-mono">
                  doc_id: {result.doc_id}
                </p>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Ingest