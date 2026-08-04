import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../AuthContext'
import { BsGithub } from 'react-icons/bs'

export function FontImports() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
      .font-display { font-family: 'Fraunces', serif; }
      .font-body { font-family: 'Inter', sans-serif; }
      .font-mono { font-family: 'IBM Plex Mono', monospace; }
    `}</style>
  )
}

export function Header({ variant = 'default' }) {
  const { user, loading, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    setMenuOpen(false)
    navigate('/')
  }

  return (
    <header className="border-b border-[#2A2A3D] bg-[#10101B]/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <span className="md:w-8 md:h-8 w-6 h-6 rounded-md bg-[#E8A33D] text-[#10101B] font-display font-semibold
                           flex items-center justify-center text-sm md:text-lg">
            अ
          </span>
          <span className="font-body text-xs md:text-sm text-[#F1EEE4] tracking-wide">
            Indic Research <br className='block md:hidden'/> Assistant
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {variant === 'default' && user && (
            <nav className="flex items-center gap-0.5 md:gap-2">
              <Link
                to="/ingest"
                className="font-body text-xs md:text-sm px-2 ppy-0.5 md:px-4 md:py-2 rounded-md text-[#F1EEE4]/80 hover:text-[#F1EEE4]
                           hover:bg-[#181826] transition-colors"
              >
                Ingest
              </Link>
              <Link
                to="/ask"
                className="font-body text-xs md:text-sm px-2 ppy-0.5 md:px-4 md:py-2 rounded-md text-[#F1EEE4]/80 hover:text-[#F1EEE4]
                           hover:bg-[#181826] transition-colors"
              >
                Ask
              </Link>
            </nav>
          )}

          

          {variant === 'back' && (
            <Link
              to="/"
              className="font-body hidden md:block text-sm text-[#F1EEE4]/60 hover:text-[#F1EEE4] transition-colors mr-1"
            >
              ← Home
            </Link>
          )}

           <a href="https://github.com/YUGESHKARAN/indic_research_scholar.git" aria-label="GitHub" className="h-6 w-6 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground transition">
              {/* <Github className="h-4 w-4 text-black" /> */}

              <BsGithub className="h-5 w-5 text-white" />

            </a>

          {loading ? (
            <div className="w-24 h-8 rounded-md bg-[#181826] animate-pulse" />
          ) : user ? (
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 px-1 md:px-3 py-0.5 md:py-1.5 rounded-md border border-[#2A2A3D]
                           hover:border-[#E8A33D]/50 hover:bg-[#181826] transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-[#2A2A3D] text-[#E8A33D] text-xs font-mono
                                 flex items-center justify-center uppercase">
                  {user.name?.[0] || '?'}
                </span>
                <span className="font-body text-sm hidden md:block text-[#F1EEE4]">{user.name}</span>
              </motion.button>

              <AnimatePresence>
                {menuOpen && (
                  <>
                    {/* click-away catcher */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 rounded-md border border-[#2A2A3D]
                                   bg-[#181826] shadow-xl overflow-hidden z-50"
                    >
                      <div className="px-3 py-2.5 border-b border-[#2A2A3D]">
                        <p className="text-xs text-[#F1EEE4]/40 truncate font-mono">{user.email}</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2.5 text-sm text-[#F1EEE4]/80
                                   hover:bg-[#10101B] hover:text-[#F1EEE4] transition-colors"
                      >
                        Log out
                      </motion.button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="font-body text-xs  md:text-sm md:px-4 px-2 py-1.5 md:py-2 rounded-md text-[#F1EEE4]/80 hover:text-[#F1EEE4]
                           hover:bg-[#181826] transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="font-body text-xs  md:text-sm md:px-4 px-2 py-1.5 md:py-2 rounded-md bg-[#E8A33D] text-[#10101B] font-medium
                           hover:bg-[#f0b158] transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}