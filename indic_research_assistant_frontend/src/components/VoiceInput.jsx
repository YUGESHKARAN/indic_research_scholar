import { useState, useRef } from 'react'
import axios from 'axios'

// const FLASK_BASE_URL = 'http://localhost:5000'
const FLASK_BASE_URL = 'https://indic-research-scholar.onrender.com'
function playBase64Audio(b64) {
  const bytes = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'audio/mpeg' })
  const url = URL.createObjectURL(blob)
  new Audio(url).play()
}

export default function VoiceInput({ selectedDoc, targetLang, onResult, onVoiceStart }) {
  const [recording, setRecording] = useState(false)
  const [status, setStatus] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const startRecording = async () => {
    setErrorMsg('')
    setStatus('')

    onVoiceStart?.()

    if (!selectedDoc) {
      setStatus('error')
      setErrorMsg('Select a document before using voice.')
      return
    }

    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setErrorMsg('Voice capture is not available in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        sendToBackend()
      }

      mediaRecorder.start()
      setRecording(true)
      setStatus('recording')
    } catch (err) {
      setStatus('error')
      setErrorMsg('Mic access denied: ' + err.message)
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    setStatus('transcribing')
  }

  const sendToBackend = async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      formData.append('doc_id', selectedDoc.doc_id)
      formData.append('language', targetLang || 'unknown')

      const res = await axios.post(`${FLASK_BASE_URL}/transcribe`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setStatus('done')
      onResult(res.data)

      if (res.data.audio) playBase64Audio(res.data.audio)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.response?.data?.error || err.message)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (recording) {
            stopRecording()
          } else {
            startRecording()
          }
        }}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          recording
            ? 'bg-rose-500 text-white hover:bg-rose-400'
            : 'bg-white/10 text-white hover:bg-white/20'
        }`}
      >
        {recording ? '⏹ Stop' : '🎙 Voice'}
      </button>

      {status === 'recording' && <span className="text-sm text-rose-300">● Recording…</span>}
      {status === 'transcribing' && <span className="text-sm text-amber-300">⏳ Transcribing…</span>}
      {status === 'done' && <span className="text-sm text-emerald-300">✓ Done</span>}
      {status === 'error' && <span className="text-sm text-rose-300">✗ {errorMsg}</span>}
    </div>
  )
}
