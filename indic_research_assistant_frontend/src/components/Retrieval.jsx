import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiCopy, FiMenu, FiSend, FiX } from "react-icons/fi";
import { PageTransition } from "./PageTransition";
import { FontImports, Header } from "./Shell";
// Assumption: matches the shared Node axios client set up earlier.
// Adjust this import path if your project uses a different location.
import api from "../instances/axiosInstance";
import VoiceInput from "./VoiceInput";
import SpeakerSelect from "./SpeakerSelect";
// import { motion } from "framer-motion";

// const FLASK_BASE_URL = 'http://127.0.0.1:5000'
const FLASK_BASE_URL = "https://indic-research-scholar.onrender.com";

const LANGUAGES = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "bn-IN", label: "Bengali" },
  { code: "mr-IN", label: "Marathi" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "pa-IN", label: "Punjabi" },
  { code: "od-IN", label: "Odia" },
];

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

function renderInlineMarkdown(text, keyPrefix) {
  const tokenPattern =
    /(\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)|\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|`([^`]+)`|\*(?!\s)(.+?)\*|_(?!\s)(.+?)_)/g;
  const nodes = [];
  let lastIndex = 0;
  let match;
  let tokenIndex = 0;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const key = `${keyPrefix}-${tokenIndex++}`;
    if (match[2]) {
      nodes.push(
        <a
          key={key}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="text-amber-300 underline decoration-amber-300/40 underline-offset-4 hover:text-amber-200"
        >
          {match[2]}
        </a>,
      );
    } else if (match[4] || match[5]) {
      nodes.push(<strong key={key} className="font-semibold text-slate-100">{match[4] || match[5]}</strong>);
    } else if (match[6]) {
      nodes.push(<del key={key}>{match[6]}</del>);
    } else if (match[7]) {
      nodes.push(
        <code key={key} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-amber-200">
          {match[7]}
        </code>,
      );
    } else {
      nodes.push(<em key={key}>{match[8] || match[9]}</em>);
    }
    lastIndex = tokenPattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function MarkdownContent({ content }) {
  const lines = String(content || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;
  let key = 0;

  const isBlockStart = (line) =>
    /^```/.test(line) ||
    /^#{1,6}\s/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+[.)]\s+/.test(line) ||
    /^\s*(\*\s*){3,}$/.test(line) ||
    (line.includes("|") && index + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[index + 1]));

  while (index < lines.length) {
    const line = lines[index];
    const blockKey = `markdown-${key++}`;

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^```/.test(line)) {
      const language = line.slice(3).trim();
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <pre key={blockKey} className="my-3 overflow-x-auto rounded-lg border border-white/10 bg-[#080d17] p-3 font-mono text-xs leading-5 text-slate-100">
          {language && <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-slate-400">{language}</span>}
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const sizeClass = {
        1: "mt-4 mb-2 text-xl font-semibold",
        2: "mt-3.5 mb-2 text-lg font-semibold",
        3: "mt-3 mb-1.5 text-base font-semibold",
        4: "mt-2.5 mb-1.5 text-sm font-semibold",
        5: "mt-2 mb-1 text-sm font-semibold",
        6: "mt-2 mb-1 text-xs font-semibold",
      }[heading[1].length];
      const Heading = `h${heading[1].length}`;
      blocks.push(
        <Heading key={blockKey} className={`${sizeClass} text-slate-100`}>
          {renderInlineMarkdown(heading[2], blockKey)}
        </Heading>,
      );
      index += 1;
      continue;
    }

    if (/^\s*(\*\s*){3,}$/.test(line)) {
      blocks.push(<hr key={blockKey} className="my-3 border-white/10" />);
      index += 1;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={blockKey} className="my-3 border-l-2 border-amber-300/50 pl-3 text-slate-200">
          {quoteLines.map((quoteLine, quoteIndex) => (
            <p key={`${blockKey}-${quoteIndex}`} className="leading-6">
              {renderInlineMarkdown(quoteLine, `${blockKey}-quote-${quoteIndex}`)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    const isUnordered = /^\s*[-*+]\s+/.test(line);
    const isOrdered = /^\s*\d+[.)]\s+/.test(line);
    if (isUnordered || isOrdered) {
      const items = [];
      const listPattern = isOrdered ? /^\s*\d+[.)]\s+(.*)$/ : /^\s*[-*+]\s+(.*)$/;
      while (index < lines.length && listPattern.test(lines[index])) {
        items.push(lines[index].match(listPattern)[1]);
        index += 1;
      }
      const List = isOrdered ? "ol" : "ul";
      blocks.push(
        <List
          key={blockKey}
          className={`${isOrdered ? "list-decimal" : "list-disc"} my-2 space-y-1 pl-5 marker:text-amber-300`}
        >
          {items.map((item, itemIndex) => (
            <li key={`${blockKey}-${itemIndex}`} className="pl-1 leading-6">
              {renderInlineMarkdown(item, `${blockKey}-item-${itemIndex}`)}
            </li>
          ))}
        </List>,
      );
      continue;
    }

    const tableHeader = line.includes("|") && index + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[index + 1]);
    if (tableHeader) {
      const cells = (row) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
      const headers = cells(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(cells(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={blockKey} className="studio-scrollbar my-3 overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-white/5 text-slate-100">
              <tr>
                {headers.map((cell, cellIndex) => (
                  <th key={`${blockKey}-head-${cellIndex}`} className="border-b border-white/10 px-2.5 py-2 font-semibold">
                    {renderInlineMarkdown(cell, `${blockKey}-head-cell-${cellIndex}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${blockKey}-row-${rowIndex}`} className="border-b border-white/5 last:border-0">
                  {headers.map((_, cellIndex) => (
                    <td key={`${blockKey}-row-${rowIndex}-cell-${cellIndex}`} className="px-2.5 py-2 text-slate-200">
                      {renderInlineMarkdown(row[cellIndex] || "", `${blockKey}-row-${rowIndex}-cell-${cellIndex}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={blockKey} className="my-2 whitespace-pre-wrap leading-6 text-slate-200">
        {paragraph.map((paragraphLine, lineIndex) => (
          <React.Fragment key={`${blockKey}-line-${lineIndex}`}>
            {lineIndex > 0 && <br />}
            {renderInlineMarkdown(paragraphLine, `${blockKey}-line-${lineIndex}`)}
          </React.Fragment>
        ))}
      </p>,
    );
  }

  return <div className="text-sm leading-6 md:text-[14px]">{blocks}</div>;
}

function Retrieval({ embedded = false, onControlsChange }) {
  const navigate = useNavigate();

  const [docs, setDocs] = useState([]);
  const [docsStatus, setDocsStatus] = useState("loading");
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [query, setQuery] = useState("");
  const [targetLang, setTargetLang] = useState("hi-IN");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedEntryId, setCopiedEntryId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState(defaultSpeaker);
  const conversationViewportRef = useRef(null);
  const latestQuestionIdRef = useRef(null);
  const latestQuestionElementRef = useRef(null);

  useEffect(() => {
    const viewport = conversationViewportRef.current;
    const question = latestQuestionElementRef.current;
    if (!viewport || !question || !latestQuestionIdRef.current) return;

    const viewportTop = viewport.getBoundingClientRect().top;
    const questionTop = question.getBoundingClientRect().top;
    viewport.scrollTo({
      top: viewport.scrollTop + questionTop - viewportTop - 12,
      behavior: "smooth",
    });
  }, [conversation]);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get("/api/docs");
        setDocs(res.data.docs || []);
        setDocsStatus("ready");
      } catch (err) {
        console.log("DOCS ERROR:", err);
        console.log("Status:", err.response?.status);
        console.log("Data:", err.response?.data);
        setDocsStatus("error");
      }
    };
    fetchDocs();
  }, []);

  const targetLabel = useMemo(() => {
    return (
      LANGUAGES.find((lang) => lang.code === targetLang)?.label || targetLang
    );
  }, [targetLang]);

  const handleSelectDoc = useCallback((doc) => {
    setSelectedDoc(doc);
  }, []);

  useEffect(() => {
    if (!embedded || !onControlsChange) return;

    onControlsChange({
      docs,
      docsStatus,
      selectedDoc,
      targetLang,
      setTargetLang,
      voiceEnabled,
      setVoiceEnabled,
      selectedSpeaker,
      setSelectedSpeaker,
      handleSelectDoc,
      languages: LANGUAGES,
      speakers,
    });
  }, [
    embedded,
    onControlsChange,
    docs,
    docsStatus,
    selectedDoc,
    targetLang,
    voiceEnabled,
    selectedSpeaker,
    handleSelectDoc,
  ]);

  useEffect(() => {
    if (!embedded || !onControlsChange) return undefined;
    return () => onControlsChange(null);
  }, [embedded, onControlsChange]);

  const appendMessage = (role, content, meta = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setConversation((prev) => [
      ...prev,
      {
        id,
        role,
        content,
        createdAt: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
        ...meta,
      },
    ]);
    return id;
  };

  const handleCopy = () => {
    const answerText =
      result?.content || conversation[conversation.length - 1]?.content || "";
    if (!answerText) return;
    navigator.clipboard.writeText(answerText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyEntry = async (text, entryId) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedEntryId(entryId);
      setTimeout(
        () =>
          setCopiedEntryId((current) => (current === entryId ? null : current)),
        1500,
      );
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedQuery = query.trim();
    if (!selectedDoc) {
      setStatus("error");
      setMessage("Select a document from your library first.");
      return;
    }
    if (!trimmedQuery) {
      setStatus("error");
      setMessage("Enter a question or prompt.");
      return;
    }

    setStatus("loading");
    setMessage("");
    setResult(null);
    const questionId = appendMessage("user", trimmedQuery, {
      docTitle: selectedDoc.title,
      targetLabel,
      source: "text",
    });
    latestQuestionIdRef.current = questionId;
    setQuery("");

    try {
      const res = await axios.post(`${FLASK_BASE_URL}/ask`, {
        doc_id: selectedDoc.doc_id,
        query: trimmedQuery,
        target_lang: targetLang,
        speaker: selectedSpeaker,
      });

      setStatus("success");
      setResult(res.data);
      appendMessage(
        "assistant",
        res.data.content || res.data.answer || "No answer returned.",
        {
          docTitle: res.data.doc_title || selectedDoc.title,
          targetLabel,
          keyWords: res.data.key_workds || [],
          source: "text",
        },
      );

      if (voiceEnabled && res.data.audio) {
        const audioBytes = Uint8Array.from(atob(res.data.audio), (char) =>
          char.charCodeAt(0),
        );
        const blob = new Blob([audioBytes], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      }
    } catch (err) {
      setStatus("error");
      const apiError =
        err.response?.data?.error || err.response?.data?.details || err.message;
      setMessage(apiError);
      appendMessage(
        "assistant",
        "I could not complete that request. Please try again.",
        {
          isError: true,
        },
      );
    }
  };

  const handleVoiceResult = (data) => {
    const transcript = data.transcript || "";
    const answerText = data.content || data.answer || "";

    if (transcript) {
      latestQuestionIdRef.current = appendMessage("user", transcript, {
        docTitle: selectedDoc?.title,
        targetLabel,
        source: "voice",
      });
    }
    setQuery("");

    if (answerText) {
      setStatus("success");
      setResult(data);
      appendMessage("assistant", answerText, {
        docTitle: data.doc_title || selectedDoc?.title,
        targetLabel,
        keyWords: data.key_workds || [],
        source: "voice",
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // console.log("selectedSpeaker", selectedSpeaker)

  return (
    <div className={`${embedded ? 'min-h-[70vh]' : 'min-h-screen'} bg-[radial-gradient(circle_at_top_left,_rgba(248,190,80,0.16),_transparent_28%),linear-gradient(135deg,_#060816_0%,_#12172a_45%,_#0b1020_100%)] text-slate-100 font-body` }>
      <FontImports />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500&display=swap');
        .font-reading { font-family: 'Source Serif 4', Georgia, serif; }
      `}</style>
      {!embedded && <Header variant="back" />}

      <PageTransition className={`${embedded ? 'px-0 py-0' : 'px-4 py-4 md:py-8 md:px-6 lg:px-8'}`}>
        <div className="mx-auto max-w-7xl">
          <div className="grid md:gap-6  lg:grid-cols-[320px_minmax(0,1fr)]">
            {!embedded && <div className="lg:hidden">
              <div className="mb-4 flex items-center gap-4 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 shadow-[0_10px_35px_rgba(0,0,0,0.2)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:border-amber-400/40 hover:text-white"
                >
                  {sidebarOpen ? <FiX size={16} /> : <FiMenu size={16} />}
                </button>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400">
                    Context
                  </p>
                  <p className="text-sm text-white">
                    Open the document workspace
                  </p>
                </div>
              </div>
            </div>}

            {!embedded && <div className="lg:hidden">
              {sidebarOpen && (
                <button
                  type="button"
                  className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                />
              )}
            </div>}

            {!embedded && <aside
              className={`fixed left-0 top-0 z-50 h-full space-y-12 md:space-y-0 md:flex flex-col justify-between w-[88vw] max-w-[320px] rounded-r-[28px] lg:rounded-md border-r border-white/10 bg-slate-950/90 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl transition-transform duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:sticky lg:top-24 lg:h-auto lg:w-full lg:translate-x-0  lg:border lg:bg-slate-950/70 lg:shadow-[0_20px_70px_rgba(0,0,0,0.25)]`}
            >
              <div className=" md:mt-0  mt-5 flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-400">
                    Workspace controls
                  </p>
                  <h2 className="md:mt-2 mt-1 text-lg md:text-xl font-semibold md:hidden text-white">
                    Set the context
                  </h2>
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
                    <p className="mt-1 text-xs text-slate-300">
                      Enable audio playback for assistant replies
                    </p>
                  </div>
                  {/* <button
                    type="button"
                    onClick={() => setVoiceEnabled((prev) => !prev)}
                    className={`relative h-6 w-11 rounded-full transition ${voiceEnabled ? 'bg-amber-400' : 'bg-white/15'}`}
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${voiceEnabled ? 'left-4' : 'left-1'}`} />
                  </button> */}

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setVoiceEnabled((prev) => !prev)}
                    animate={{
                      backgroundColor: voiceEnabled
                        ? "rgb(251 191 36)" // amber-400
                        : "rgba(255,255,255,0.15)",
                    }}
                    transition={{
                      duration: 0.25,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="relative h-6 w-11 rounded-full"
                  >
                    <motion.span
                      layout
                      transition={{
                        type: "spring",
                        stiffness: 600,
                        damping: 35,
                      }}
                      className={`
                        absolute top-1 left-1
                        h-4 w-4
                        rounded-full
                        bg-white
                        shadow-md
                      `}
                      animate={{
                        x: voiceEnabled ? 12 : 0,
                      }}
                    />
                  </motion.button>
                </div>

                <div className="mt-2">
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

                {docsStatus === "loading" && (
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3 text-sm text-slate-400">
                    Loading your documents…
                  </div>
                )}

                {docsStatus === "error" && (
                  <p className="mb-2 text-xs text-rose-300">
                    Couldn’t load your document library. Please refresh and try
                    again.
                  </p>
                )}

                {docsStatus === "ready" && (
                  <div className="flex flex-wrap gap-2">
                    {docs.length === 0 ? (
                      <div className="w-full rounded-2xl border border-dashed border-white/10 bg-slate-900/50 px-3 py-4 text-sm text-slate-400">
                        No documents yet.
                        <button
                          type="button"
                          onClick={() => navigate("/ingest")}
                          className="mt-2 block text-amber-400 transition hover:text-amber-300"
                        >
                          Upload your first document →
                        </button>
                      </div>
                    ) : (
                      docs.map((doc) => {
                        const active = selectedDoc?.doc_id === doc.doc_id;
                        return (
                          <button
                            key={doc.doc_id}
                            type="button"
                            onClick={() => handleSelectDoc(doc)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              active
                                ? "border-amber-400 bg-amber-400 text-slate-950"
                                : "border-white/10 bg-white/5 text-slate-300 hover:border-amber-400/40 hover:text-white"
                            }`}
                          >
                            {doc.title}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {selectedDoc && (
                  <p className="mt-2 text-xs text-slate-400">
                    Selected: {selectedDoc.title}
                  </p>
                )}
              </div>

              <div className="mb-">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] md:tracking-[0.2em] text-slate-400">
                  Select target language
                </label>
                {/* <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => {
                    const active = targetLang === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setTargetLang(lang.code)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          active
                            ? "border-amber-400 bg-amber-400 text-slate-950"
                            : "border-white/10 bg-white/5 text-slate-300 hover:border-amber-400/40 hover:text-white"
                        }`}
                      >
                        {lang.label}
                      </button>
                    );
                  })}
                </div> */}

                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => {
                    const active = targetLang === lang.code;

                    return (
                      <motion.button
                        key={lang.code}
                        type="button"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setTargetLang(lang.code)}
                        className={`
                          relative overflow-hidden
                          rounded-full border px-3 py-1.5
                          text-xs font-medium
                          transition-colors duration-300
                          ${
                            active
                              ? "border-amber-400 text-slate-950"
                              : "border-white/10 bg-white/5 text-slate-300 hover:border-amber-400/40 hover:text-white"
                          }
                        `}
                      >
                        {active && (
                          <motion.div
                            layoutId="language-pill"
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 35,
                            }}
                            className="absolute inset-0 rounded-full bg-amber-400"
                          />
                        )}

                        <motion.span
                          animate={{
                            scale: active ? 1.02 : 1,
                          }}
                          transition={{
                            duration: 0.2,
                          }}
                          className="relative z-10"
                        >
                          {lang.label}
                        </motion.span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className=" rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-3">
                <ul className=" space-y-1.5 text-xs text-slate-300">
                  <li>• Conversational thread with contextual memory</li>
                  <li className="md:hidden">
                    • Voice and text working side by side
                  </li>
                  <li className="md:hidden">
                    • Clean, enterprise-grade visual hierarchy
                  </li>
                </ul>
              </div>
            </aside>}

            <motion.main
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.22 }}
              className={`flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-xl ${embedded ? 'min-h-[calc(100dvh-6rem)] md:min-h-0 md:h-[calc(100dvh-7rem)] lg:col-span-2' : 'min-h-[500px] md:h-[min(70vh,760px)]'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-3 md:px-4">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-amber-300">
                    Conversation agent
                  </p>
                  <h3 className="text-sm font-semibold text-white md:text-base">
                    Ask, review, and iterate
                  </h3>
                </div>
                <div className="max-w-full truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 md:max-w-[45%]">
                  {selectedDoc
                    ? `Context: ${selectedDoc.title}`
                    : "Select a document to begin"}
                </div>
              </div>

              <div
                ref={conversationViewportRef}
                className={`studio-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-4 ${embedded ? '' : 'scrollbar-hide'}`}
              >
                {conversation.length === 0 && status === "idle" && (
                  <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent px-5 py-6 text-center">
                    <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/12 text-2xl text-amber-300">
                      ✦
                    </div>
                    <h4 className="text-base font-semibold text-white">
                      Your next insight is one prompt away
                    </h4>
                    <p className="mt-1.5 max-w-md text-xs leading-5 text-slate-300">
                      Choose a document, set your language, and start a grounded
                      conversation with your knowledge base.
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
                      ref={
                        entry.role === "user" && entry.id === latestQuestionIdRef.current
                          ? (node) => { latestQuestionElementRef.current = node; }
                          : undefined
                      }
                      className={`mb-4 flex gap-2.5 ${
                        entry.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {entry.role === "assistant" && (
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10 text-xs text-amber-200">
                          ✦
                        </div>
                      )}
                      <div className={`min-w-0 ${entry.role === "user" ? "max-w-[88%] sm:max-w-[76%]" : "w-full max-w-4xl"}`}>
                        <div className={`mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] ${
                          entry.role === "user" ? "justify-end text-slate-400" : "text-slate-300"
                        }`}>
                          <span className={entry.role === "assistant" ? "text-amber-200" : ""}>
                            {entry.role === "user" ? "You" : "Research assistant"}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <time>{entry.createdAt}</time>
                          {entry.docTitle && entry.role === "assistant" && (
                            <>
                              <span aria-hidden="true" className="text-slate-600">·</span>
                              <span className="max-w-[180px] truncate normal-case tracking-normal text-slate-500">
                                {entry.docTitle}
                              </span>
                            </>
                          )}
                        </div>

                        {entry.role === "user" ? (
                          <div className="rounded-xl rounded-tr-md border border-amber-300/25 bg-amber-300/[0.10] px-3.5 py-2.5 text-sm leading-6 text-white shadow-[0_6px_20px_rgba(0,0,0,0.14)] whitespace-pre-wrap break-words">
                            {entry.content}
                          </div>
                        ) : (
                          <div className={`rounded-xl border px-3.5 py-3 sm:px-4 ${
                            entry.isError
                              ? "border-rose-400/30 bg-rose-500/[0.09] text-rose-100"
                              : "border-white/[0.10] bg-white/[0.035] text-slate-100"
                          }`}>
                            <MarkdownContent content={entry.content} />
                            {(entry.keyWords?.length > 0 || !entry.isError) && (
                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.09] pt-2">
                                {entry.keyWords?.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {entry.keyWords.map((keyword, index) => (
                                      <span
                                        key={`${keyword}-${index}`}
                                        className="rounded-full border border-amber-300/15 bg-amber-300/[0.07] px-2.5 py-1 text-[10px] text-amber-200"
                                      >
                                        {keyword}
                                      </span>
                                    ))}
                                  </div>
                                ) : <span />}
                                {!entry.isError && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyEntry(entry.content, entry.id)}
                                    aria-label="Copy assistant response"
                                    title="Copy response"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 text-slate-300 transition hover:border-amber-300/40 hover:text-amber-100"
                                  >
                                    {copiedEntryId === entry.id ? (
                                      <FiCheck size={14} />
                                    ) : (
                                      <FiCopy size={14} />
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {status === "loading" && (
                  <div className="mb-3 flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10 text-xs text-amber-200">✦</div>
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                        <span>Thinking through the document context…</span>
                    </div>
                  </div>
                )}
              </div>

              {message && (
                <div className="mx-3 mb-2 rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100 sm:mx-4">
                  {message}
                </div>
              )}

              <motion.form
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.2 }}
                onSubmit={handleSubmit}
                className="border-t border-white/[0.08] bg-slate-950/70 px-3 py-3 sm:px-4"
              >
                <div className="rounded-xl border border-white/15 bg-slate-900/80 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-3">
                  <label className="mb-1 block px-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                    Ask a question
                  </label>
                  <textarea
                    id="query"
                    rows={4}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask in natural language, then let the agent synthesize the answer."
                    className="h-11 w-full resize-none border-0 bg-transparent px-1.5 pb-1 text-[13px] leading-5 text-white outline-none placeholder:text-slate-400"
                  />

                  <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1.5 sm:px-2.5">
                    <div className="flex items-center gap-2 text-[10px] text-slate-300">
                      <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-amber-200">
                        Grounded answer
                      </span>
                      <span className="hidden text-slate-400 md:block">
                        Shift + Enter for a new line
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <VoiceInput
                        selectedDoc={selectedDoc}
                        targetLang={targetLang}
                        selectedSpeaker={selectedSpeaker}
                        onResult={handleVoiceResult}
                        onVoiceStart={() => setQuery("")}
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
                        disabled={status === "loading"}
                        className="flex items-center gap-1.5 rounded-full bg-amber-300 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FiSend size={12} />
                        {status === "loading" ? "Thinking…" : "Send"}
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
  );
}

export default Retrieval;
