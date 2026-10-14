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

export default function VoiceInput({ selectedDoc, targetLang, selectedSpeaker, onResult, onVoiceStart }) {
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

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const supportedMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ]
      const mimeType = supportedMimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      )
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const recordedBlob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || chunksRef.current[0]?.type || 'application/octet-stream',
        })
        sendToBackend(recordedBlob)
      }

      mediaRecorder.start()
      setRecording(true)
      setStatus('recording')
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop())
      setStatus('error')
      setErrorMsg('Mic access denied: ' + err.message)
    }
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return
    mediaRecorderRef.current.stop()
    setRecording(false)
    setStatus('transcribing')
  }

  const sendToBackend = async (blob) => {
    try {
      if (!blob.size) {
        throw new Error('No audio was captured. Please try recording again.')
      }

      const extension = blob.type.includes('webm')
        ? 'webm'
        : blob.type.includes('ogg')
          ? 'ogg'
          : blob.type.includes('mp4')
            ? 'mp4'
            : 'webm'
      const formData = new FormData()
      formData.append('audio', blob, `recording.${extension}`)
      formData.append('doc_id', selectedDoc.doc_id)
      formData.append('language', targetLang || 'unknown')
      formData.append('speaker', selectedSpeaker || 'Shubh')

      const res = await axios.post(`${FLASK_BASE_URL}/transcribe`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (!res.data || typeof res.data !== 'object' || !res.data.transcript) {
        throw new Error('Speech was processed, but no transcript was returned. Please try again.')
      }

      setStatus('done')
      onResult(res.data)

      if (res.data.audio) playBase64Audio(res.data.audio)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.response?.data?.error || err.message)
    }
  }

  return (
    <div className="flex relative  flex-wrap items-center gap-3">
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
        className={`rounded-full px-3 py-1.5 text-xs md:font-semibold transition ${
          recording
            ? ' text-white hover:bg-rose-400'
            : ' text-white hover:bg-white/20'
        }`}
      >
        {recording ? '⏹ Stop' : '🎙 Voice'}
      </button>
   <p className='absolute xl:static bottom-9 max-w-40'>
      {status === 'recording' && <span className="text-[10px] md:text-sm text-rose-300">● Recording…</span>}
      {status === 'transcribing' && <span className="text-[10px] md:text-sm text-amber-300">⏳ Transcribing…</span>}
      {status === 'done' && <span className="text-[10px] md:text-sm text-emerald-300">✓ Done</span>}
      {status === 'error' && <span className="text-[10px] md:text-sm text-rose-300">✗ {errorMsg}</span>}
      </p>
    </div>
  )
}
