import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiBookOpen,
  FiChevronRight,
  FiFileText,
  FiLogOut,
  FiMenu,
  FiPlus,
  FiSettings,
  FiVideo,
  FiZap,
  FiX,
} from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../AuthContext';
import Retrieval from './Retrieval';
import SpeakerSelect from './SpeakerSelect';
import { FontImports } from './Shell';
import WorkspaceShorts from '../pages/WorkspaceShorts';

const navItems = [
  { id: 'overview', label: 'Overview', icon: FiBookOpen, to: '/workspace' },
  { id: 'qa', label: 'Q&A Studio', icon: FiZap, to: '/workspace/qa' },
  // { id: 'documents', label: 'Documents', icon: FiFileText, to: '/workspace/documents' },
  { id: 'shorts', label: 'Shorts Studio', icon: FiVideo, to: '/workspace/shorts' },
  // { id: 'presentation', label: 'Presentation', icon: FiFileText, to: '/workspace/presentation' },
  // { id: 'settings', label: 'Settings', icon: FiSettings, to: '/workspace/settings' },
];

function QATaskControls({ controls, onUpload }) {
  if (!controls) {
    return (
      <div className="ml-2 mt-1 rounded-r-lg border-l border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-body text-slate-400">
        Loading Q&amp;A controls…
      </div>
    );
  }

  return (
    <div className="ml-2 mt-1 space-y-3 rounded-r-lg border-l border-white/10 bg-white/[0.035] py-3 pl-3 pr-2">
      <div>
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Knowledge source
        </p>
        {controls.docsStatus === 'loading' && (
          <p className="text-xs font-body text-slate-400">Loading documents…</p>
        )}
        {controls.docsStatus === 'error' && (
          <p className="text-xs text-rose-300">Couldn’t load your document library. Try again.</p>
        )}
        {controls.docsStatus === 'ready' && controls.docs.length === 0 && (
          <div className="text-xs leading-relaxed text-slate-400">
            No documents uploaded.
            <button
              type="button"
              onClick={onUpload}
              className="mt-1 block font-medium text-amber-300 transition hover:text-amber-200"
            >
              Upload a document
            </button>
          </div>
        )}
        {controls.docsStatus === 'ready' && controls.docs.length > 0 && (
          <select
            value={controls.selectedDoc?.doc_id || ''}
            onChange={(event) => {
              const selectedDoc = controls.docs.find(
                (doc) => doc.doc_id === event.target.value,
              );
              if (selectedDoc) controls.handleSelectDoc(selectedDoc);
            }}
            className="w-full rounded-md border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15"
            aria-label="Select a document for Q&A"
          >
            <option value="" disabled className="bg-slate-900 text-slate-400">Select a document</option>
            {controls.docs.map((doc) => (
              <option key={doc.doc_id} value={doc.doc_id} className="bg-slate-900 text-slate-100">{doc.title}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-body text-slate-300">Voice responses</span>
        <motion.button
          type="button"
          role="switch"
          aria-checked={controls.voiceEnabled}
          aria-label="Enable voice responses"
          whileTap={{ scale: 0.96 }}
          onClick={() => controls.setVoiceEnabled((enabled) => !enabled)}
          animate={{
            backgroundColor: controls.voiceEnabled
              ? 'rgb(246 199 110)'
              : 'rgb(51 65 85)',
          }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-6 w-11 shrink-0 rounded-full border border-white/15 outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 600, damping: 35 }}
            animate={{ x: controls.voiceEnabled ? 12 : 0 }}
            className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
          />
        </motion.button>
      </div>

      <div>
        <label
          htmlFor="workspace-qa-language"
          className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500"
        >
          Response language
        </label>
        <select
          id="workspace-qa-language"
          value={controls.targetLang}
          onChange={(event) => controls.setTargetLang(event.target.value)}
          className="w-full rounded-md border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15"
        >
          {controls.languages.map((language) => (
            <option key={language.code} value={language.code} className="bg-slate-900 text-slate-100">{language.label}</option>
          ))}
        </select>
      </div>

      {controls.voiceEnabled && (
        <SpeakerSelect
          speakers={controls.speakers}
          selectedSpeaker={controls.selectedSpeaker}
          setSelectedSpeaker={controls.setSelectedSpeaker}
          scrollbarClassName="studio-scrollbar"
        />
      )}
    </div>
  );
}

function WorkspaceSidebar({ isOpen, onClose, activeId, qaControls, onUpload }) {
  const [qaExpanded, setQAExpanded] = useState(activeId === 'qa');

  useEffect(() => {
    if (activeId === 'qa') setQAExpanded(true);
  }, [activeId]);

  const content = (
    <div className="flex h-full flex-col bg-[#0f172a]/95 text-slate-100 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <Link 
        to={'/'}
        className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6c76e] text-sm font-semibold text-slate-900">
            अ
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-amber-400/80">
              Workspace
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white">Indic Scholar</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-amber-400/40 hover:text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <FiX size={15} />
        </button>
      </div>

      <div className="studio-scrollbar flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Project</p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Research Studio</p>
              <p className="text-xs text-slate-400">Personal workspace</p>
            </div>
            <button
              type="button"
              onClick={onUpload}
              className="rounded-lg border border-white/10 bg-slate-900/80 p-2 text-slate-300 transition hover:border-amber-400/40 hover:text-white"
              aria-label="Upload documents"
              title="Upload documents"
            >
              <FiPlus size={14} />
            </button>
          </div>
        </div>

        <nav className="space-y-1.5">
          {navItems.map(({ id, label, icon: Icon, to }) => {
            const isActive = activeId === id;
            return (
              <React.Fragment key={id}>
                <div className="flex items-center">
                  <Link
                    to={to}
                    className={`group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      isActive
                        ? 'border border-amber-400/20 bg-amber-400/10 text-amber-200 shadow-[0_0_0_1px_rgba(251,191,36,0.12)]'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                    onClick={onClose}
                  >
                    <Icon size={15} className={isActive ? 'text-amber-300' : 'text-slate-400'} />
                    {label}
                  </Link>
                  {id === 'qa' ? (
                    <button
                      type="button"
                      onClick={() => setQAExpanded((expanded) => !expanded)}
                      aria-expanded={qaExpanded}
                      aria-label={`${qaExpanded ? 'Collapse' : 'Expand'} Q&A Studio options`}
                      className={`ml-1 flex h-9 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-amber-200 ${
                        isActive ? 'text-amber-300' : ''
                      }`}
                    >
                      <FiChevronRight
                        size={15}
                        className={`transition-transform duration-200 ${qaExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>
                  ) : (
                    <FiChevronRight size={14} className="mr-2 text-slate-500 opacity-70" />
                  )}
                </div>
                {id === 'qa' && qaExpanded && (
                  <QATaskControls controls={qaControls} onUpload={onUpload} />
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

    </div>
  );

  return (
    <>
      <div className="fixed inset-y-0 left-0 hidden w-[260px] overflow-hidden lg:block">
        {content}
      </div>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="fixed inset-y-0 left-0 z-50 w-[84vw] max-w-[280px] overflow-hidden border-r border-white/10 bg-[#0f172a]/95 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl lg:hidden"
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(-110%)' }}
      >
        {content}
      </motion.aside>
    </>
  );
}

function WorkspaceShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [qaControls, setQAControls] = useState(null);

  const handleQAControlsChange = useCallback((controls) => {
    setQAControls(controls);
  }, []);

  const handleUpload = useCallback(() => {
    setSidebarOpen(false);
    navigate('/ingest');
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const activeId = useMemo(() => {
    if (location.pathname.includes('/workspace/qa')) return 'qa';
    if (location.pathname.includes('/workspace/documents')) return 'documents';
    if (location.pathname.includes('/workspace/shorts')) return 'shorts';
    if (location.pathname.includes('/workspace/presentation')) return 'presentation';
    if (location.pathname.includes('/workspace/settings')) return 'settings';
    return 'overview';
  }, [location.pathname]);

  return (
    <div className="workspace-studio min-h-screen bg-[#0a0f1c] text-slate-100">
      <FontImports />

      <div className="flex min-h-screen lg:pl-[260px]">
        <WorkspaceSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeId={activeId}
          qaControls={qaControls}
          onUpload={handleUpload}
        />

        <div className="flex min-h-screen flex-1 flex-col bg-[radial-gradient(circle_at_top_left,_rgba(246,199,110,0.12),_transparent_22%),linear-gradient(135deg,_#09101b_0%,_#0f172a_44%,_#111827_100%)]">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0d1524]/80 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-amber-400/40 hover:text-white lg:hidden"
                >
                  {sidebarOpen ? <FiX size={16} /> : <FiMenu size={16} />}
                </button>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-amber-400/80">Research Studio</p>
                  <h1 className="text-base font-semibold text-white md:text-lg">
                    {activeId === 'qa'
                      ? 'Q&A Studio'
                      : activeId === 'shorts'
                        ? 'Shorts Studio'
                        : activeId === 'overview'
                          ? 'Overview'
                          : 'Workspace'}
                  </h1>
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  aria-expanded={profileMenuOpen}
                  aria-label="Open user profile menu"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-2.5 transition hover:border-amber-300/30 hover:bg-white/[0.07] md:gap-2.5 md:pr-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f6c76e] text-xs font-semibold uppercase text-slate-900">
                    {user?.name?.[0] || '?'}
                  </span>
                  <span className="hidden max-w-[160px] truncate text-sm font-medium text-slate-100 sm:block">
                    {user?.name || 'Researcher'}
                  </span>
                  <FiChevronRight
                    size={14}
                    className={`rotate-90 text-slate-400 transition-transform ${profileMenuOpen ? '-rotate-90' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {profileMenuOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Close profile menu"
                        onClick={() => setProfileMenuOpen(false)}
                        className="fixed inset-0 z-40 cursor-default"
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.14 }}
                        className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#111a2a] shadow-xl"
                      >
                        <div className="border-b border-white/10 px-4 py-3">
                          <p className="truncate text-sm font-medium text-white">{user?.name || 'Researcher'}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-400">{user?.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-rose-200"
                        >
                          <FiLogOut size={15} />
                          Log out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            {activeId === 'qa' ? (
              <Retrieval embedded onControlsChange={handleQAControlsChange} />
            ) : activeId === 'shorts' ? (
              <WorkspaceShorts />
            ) : (
              <div className="mx-auto max-w-6xl space-y-6">
                <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.45)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.26em] text-amber-400">Workspace overview</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Your research command center</h2>
                    </div>
                    <Link
                      to="/workspace/qa"
                      className="inline-flex items-center justify-center rounded-xl bg-[#f6c76e] px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-[#f7d27d]"
                    >
                      Open Q&A studio
                    </Link>
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                  {[
                    { title: 'Documents', value: '12', text: 'Active in your workspace' },
                    { title: 'Q&A tasks', value: '8', text: 'Grounded conversations this week' },
                    { title: 'Presentation', value: '2', text: 'Drafts in progress' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{item.title}</p>
                      <p className="mt-4 text-3xl font-semibold text-white">{item.value}</p>
                      <p className="mt-2 text-sm text-slate-400">{item.text}</p>
                    </div>
                  ))}
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceShell;
