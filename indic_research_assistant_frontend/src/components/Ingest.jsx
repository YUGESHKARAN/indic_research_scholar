// import React, { useState } from 'react'
// import axios from 'axios'
// import { FontImports, Header } from './Shell'
// import { useAuth } from '../AuthContext'
// import { useNavigate } from 'react-router-dom'

// // const FLASK_BASE_URL = 'http://127.0.0.1:5000'
// const FLASK_BASE_URL = 'https://indic-research-scholar.onrender.com'

// function Ingest() {
//   const { user } = useAuth() // guaranteed non-null — this route is behind ProtectedRoute
//   const [file, setFile] = useState(null)
//   const [title, setTitle] = useState('')
//   const [status, setStatus] = useState('idle')
//   const [message, setMessage] = useState('')
//   const [result, setResult] = useState(null)
//   const navigate = useNavigate()

//   const handleFileChange = (e) => {
//     const selected = e.target.files[0]
//     setFile(selected || null)
//     if (selected && !title) {
//       setTitle(selected.name.replace(/\.[^/.]+$/, ''))
//     }
//   }

//   const handleSubmit = async (e) => {
//     e.preventDefault()

//     if (!file) {
//       setStatus('error')
//       setMessage('Choose a document to upload.')
//       return
//     }

//     const formData = new FormData()
//     formData.append('file', file)
//     formData.append('email', user.email)
//     if (title) formData.append('title', title)

//     setStatus('loading')
//     setMessage('')
//     setResult(null)

//     try {
//       const res = await axios.post(`${FLASK_BASE_URL}/ingest`, formData, {
//         headers: { 'Content-Type': 'multipart/form-data' },
//       })
//       setStatus('success')
//       setResult(res.data)
//       setMessage(`Ingested "${res.data.title}" — ${res.data.num_chunks} chunks stored.`)

//       // FIXED: Changed setTimeout syntax to a proper callback function
//       setTimeout(() => {
//         navigate("/ask")
//       }, 2000)

//     } catch (err) {
//       setStatus('error')
//       const apiError =
//         err.response?.data?.error || err.response?.data?.details || err.message
//       setMessage(apiError)
//     }
//   }

//   return (
//     <div className="min-h-screen bg-[#10101B] text-[#F1EEE4] font-body">
//       <FontImports />
//       <Header variant="back" />

//       <div className="flex items-center justify-center px-6 py-16">
//         <div className="w-full max-w-md">
//           <div className="mb-8">
//             <p className="font-mono text-xs tracking-[0.2em] text-[#E8A33D] uppercase mb-2">
//               Step 01
//             </p>
//             <h1 className="font-display text-3xl font-semibold">Upload a document</h1>
//             <p className="text-sm text-[#F1EEE4]/50 mt-2">
//               PDF, PNG, JPEG or ZIP · max 10 pages for now
//             </p>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-10 md:space-y-10">
//             <div>
//               <label htmlFor="file" className="block text-sm text-[#F1EEE4]/70 mb-1">
//                 Document
//               </label>
//               <input
//                 id="file"
//                 type="file"
//                 accept=".pdf,.png,.jpg,.jpeg,.zip"
//                 onChange={handleFileChange}
//                 className="w-full text-sm text-[#F1EEE4]/70 file:mr-3 file:py-2 file:px-3
//                            file:rounded-md file:border-0 file:bg-[#2A2A3D] file:text-[#F1EEE4]
//                            hover:file:bg-[#33334a] file:cursor-pointer cursor-pointer
//                            border border-[#2A2A3D] rounded-md bg-[#181826] p-2"
//               />
//               {file && <p className="text-xs text-[#F1EEE4]/40 mt-1 font-mono">{file.name}</p>}
//             </div>

//             <div className="flex items-center gap-2 rounded-md border border-[#2A2A3D] bg-[#181826] px-3 py-2">
//               <span className="w-5 h-5 rounded-full bg-[#2A2A3D] text-[#E8A33D] text-[10px] font-mono
//                                flex items-center justify-center uppercase">
//                 {user.name?.[0] || '?'}
//               </span>
//               <p className="text-xs text-[#F1EEE4]/60 font-mono truncate">
//                 Uploading as {user.email}
//               </p>
//             </div>

//             <div>
//               <label htmlFor="title" className="block text-sm text-[#F1EEE4]/70 mb-1">
//                 Title
//               </label>
//               <input
//                 id="title"
//                 type="text"
//                 value={title}
//                 onChange={(e) => setTitle(e.target.value)}
//                 placeholder="Defaults to filename"
//                 className="w-full rounded-md border border-[#2A2A3D] bg-[#181826]
//                            px-3 py-2 text-sm outline-none focus:border-[#E8A33D]/60
//                            placeholder:text-[#F1EEE4]/30"
//               />
//             </div>

//             <button
//               type="submit"
//               disabled={status === 'loading'}
//               className="w-full rounded-md bg-[#E8A33D] text-[#10101B] py-2.5 text-sm
//                          font-medium hover:bg-[#f0b158] transition-colors disabled:opacity-50
//                          disabled:cursor-not-allowed"
//             >
//               {status === 'loading' ? 'Processing document…' : 'Ingest document'}
//             </button>
//           </form>

//           {status === 'loading' && (
//             <p className="text-xs text-[#F1EEE4]/40  animate-pulse mt-3">
//               OCR + embedding runs synchronously — this can take a bit for image-heavy pages.
//               Mean time have a cup of coffee☕...
//             </p>
//           )}

//           {status === 'success' && (
//             <div className="mt-4 rounded-md border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">
//               {message}
//               {result && (
//                 <p className="text-xs text-emerald-500/80 mt-1 break-all font-mono">
//                   doc_id: {result.doc_id}
//                 </p>
//               )}
//             </div>
//           )}

//           {status === 'error' && (
//             <div className="mt-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
//               {message}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }

// export default Ingest
import React, { useState } from "react";
import axios from "axios";
import { motion } from 'framer-motion'
import { FontImports, Header } from "./Shell";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import { PageTransition } from './PageTransition'

// const FLASK_BASE_URL = 'http://127.0.0.1:5000'
const FLASK_BASE_URL = "https://indic-research-scholar.onrender.com";

const PIPELINE_STEPS = [
  {
    n: "01",
    title: "Sarvam Vision reads every page",
    body: "OCR extracts text, tables, and layout — even from blurred or low-quality scans.",
  },
  {
    n: "02",
    title: "Content is embedded",
    body: "Your document is chunked and indexed so it can be searched by meaning, not just keywords.",
  },
  {
    n: "03",
    title: "Ask, right after",
    body: "Once processing finishes, it's ready to query — in any of your supported languages.",
  },
];

const SCRIPT_PARADE = [
  { word: "अनुसंधान", font: "'Noto Sans Devanagari', sans-serif" },
  { word: "ஆராய்ச்சி", font: "'Noto Sans Tamil', sans-serif" },
  { word: "పరిశోధన", font: "'Noto Sans Telugu', sans-serif" },
  { word: "গবেষণা", font: "'Noto Sans Bengali', sans-serif" },
  { word: "ಸಂಶೋಧನೆ", font: "'Noto Sans Kannada', sans-serif" },
];

function formatBytes(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function Ingest() {
  const { user } = useAuth(); // guaranteed non-null — this route is behind ProtectedRoute
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected || null);
    if (selected && !title) {
      setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setStatus("error");
      setMessage("Choose a document to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("email", user.email);
    if (title) formData.append("title", title);

    setStatus("loading");
    setMessage("");
    setResult(null);

    try {
      const res = await axios.post(`${FLASK_BASE_URL}/ingest`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus("success");
      setResult(res.data);
      setMessage(
        `Ingested "${res.data.title}" — ${res.data.num_chunks} chunks stored.`,
      );
      setTimeout(() => {
        navigate("/ask");
      }, 2000);
    } catch (err) {
      setStatus("error");
      const apiError =
        err.response?.data?.error || err.response?.data?.details || err.message;
      setMessage(apiError);
    }
  };

  return (
    <div className="min-h-screen bg-[#10101B] text-[#F1EEE4] font-body">
      <FontImports />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@500&family=Noto+Sans+Tamil:wght@500&family=Noto+Sans+Telugu:wght@500&family=Noto+Sans+Bengali:wght@500&family=Noto+Sans+Kannada:wght@500&display=swap');
      `}</style>
      <Header variant="back" />

      <PageTransition className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <p className="font-mono text-xs tracking-[0.2em] text-[#E8A33D] uppercase mb-2">
              Step 01
            </p>
            <h1 className="font-display text-3xl font-semibold">
              Upload a document
            </h1>
            <p className="text-sm text-[#F1EEE4]/50 mt-2">
              PDF, PNG, JPEG or ZIP · max 10 pages for now
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 items-start">
            {/* LEFT: form */}
            <div className="lg:sticky lg:top-24">
              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06, duration: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-6 md:space-y-8 rounded-2xl border border-[#2A2A3D] bg-[#181826] p-6"
              >
                <div>
                  <label
                    htmlFor="file"
                    className="block text-sm text-[#F1EEE4]/70 mb-1"
                  >
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
                               border border-[#2A2A3D] rounded-md bg-[#10101B] p-2"
                  />
                </div>

                <div className="flex items-center gap-2 rounded-md border border-[#2A2A3D] bg-[#10101B] px-3 py-2">
                  <span
                    className="w-5 h-5 rounded-full bg-[#2A2A3D] text-[#E8A33D] text-[10px] font-mono
                                   flex items-center justify-center uppercase"
                  >
                    {user.name?.[0] || "?"}
                  </span>
                  <p className="text-xs text-[#F1EEE4]/60 font-mono truncate">
                    Uploading as {user.email}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm text-[#F1EEE4]/70 mb-1"
                  >
                    Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Defaults to filename"
                    className="w-full rounded-md border border-[#2A2A3D] bg-[#10101B]
                               px-3 py-2 text-sm outline-none focus:border-[#E8A33D]/60
                               placeholder:text-[#F1EEE4]/30"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full rounded-md bg-[#E8A33D] text-[#10101B] py-2.5 text-sm
                             font-medium hover:bg-[#f0b158] transition-colors disabled:opacity-50
                             disabled:cursor-not-allowed"
                >
                  {status === "loading"
                    ? "Processing document…"
                    : "Ingest document"}
                </motion.button>
              </motion.form>

              {status === "loading" && (
                <p className="text-xs text-[#F1EEE4]/40 animate-pulse mt-3">
                  OCR + embedding runs synchronously — this can take a bit for
                  image-heavy pages. Meantime, have a cup of coffee ☕...
                </p>
              )}

              {status === "success" && (
                <div className="mt-4 rounded-md border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">
                  {message}
                  {result && (
                    <p className="text-xs text-emerald-500/80 mt-1 break-all font-mono">
                      doc_id: {result.doc_id}
                    </p>
                  )}
                </div>
              )}

              {status === "error" && (
                <div className="mt-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
                  {message}
                </div>
              )}
            </div>

            {/* RIGHT: file preview + pipeline walkthrough + brand motif */}
            <div className="space-y-6">
              {/* Live file preview */}
              <div className="rounded-2xl border border-[#2A2A3D] bg-[#181826] p-6 min-h-[120px] flex items-center">
                {file ? (
                  <div className="flex items-center gap-4 w-full">
                    <span
                      className="w-12 h-12 rounded-xl bg-[#E8A33D]/10 border border-[#E8A33D]/30
                                     flex items-center justify-center text-2xl shrink-0"
                    >
                      📄
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-[#F1EEE4] truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-[#F1EEE4]/40 font-mono mt-0.5">
                        {formatBytes(file.size)} · {file.type || "unknown type"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 w-full">
                    <span
                      className="w-12 h-12 rounded-xl bg-[#2A2A3D] flex items-center justify-center
                                     text-2xl shrink-0 opacity-40"
                    >
                      📄
                    </span>
                    <p className="text-sm text-[#F1EEE4]/30">
                      No file selected yet
                    </p>
                  </div>
                )}
              </div>

              {/* Pipeline walkthrough */}
              <div className="rounded-2xl border border-[#2A2A3D] bg-[#181826] p-6">
                <p className="font-mono text-xs tracking-[0.2em] text-[#E8A33D]/70 uppercase mb-5">
                  What happens next
                </p>
                <div className="space-y-5">
                  {PIPELINE_STEPS.map((step) => (
                    <div key={step.n} className="flex gap-4">
                      <span className="font-mono text-sm text-[#E8A33D]/60 shrink-0 w-6">
                        {step.n}
                      </span>
                      <div>
                        <p className="font-display text-base font-semibold text-[#F1EEE4]">
                          {step.title}
                        </p>
                        <p className="text-sm text-[#F1EEE4]/50 mt-0.5 leading-relaxed">
                          {step.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brand motif — consistent with landing page */}
              {/* <div className="rounded-2xl border border-[#2A2A3D] bg-[#0D0D16] p-6">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  {SCRIPT_PARADE.map((s, i) => (
                    <React.Fragment key={s.word}>
                      <span className="text-xl text-[#F1EEE4]/70" style={{ fontFamily: s.font }}>
                        {s.word}
                      </span>
                      {i < SCRIPT_PARADE.length - 1 && (
                        <span className="text-[#E8A33D]/40 text-sm">·</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <p className="font-mono text-[11px] text-[#F1EEE4]/30 mt-3">
                  "research," across scripts — one document, read in all of them
                </p>
              </div> */}
            </div>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}

export default Ingest;
