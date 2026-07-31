// import React, { useState } from 'react'
// import { Link, useNavigate } from 'react-router-dom'
// import { FontImports, Header } from '../components/Shell'
// import { useAuth } from '../AuthContext'
// import ForgotPassword from '../components/ForgotPassword'

// const NODE_BASE_URL = import.meta.env.VITE_NODE_BASE_URL || 'http://127.0.0.1:3000'

// function GoogleIcon() {
//   return (
//     <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
//       <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" fill="#4285F4"/>
//       <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18z" fill="#34A853"/>
//       <path d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03l3.01-2.33z" fill="#FBBC05"/>
//       <path d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58z" fill="#EA4335"/>
//     </svg>
//   )
// }

// function Login() {
//   const { login } = useAuth()
//   const navigate = useNavigate()

//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const [status, setStatus] = useState('idle')
//   const [message, setMessage] = useState('')
//   const [forgotOpen, setForgotOpen] = useState(false)

//   const handleSubmit = async (e) => {
//     e.preventDefault()
//     setStatus('loading')
//     setMessage('')

//     try {
//       await login(email, password)
//       navigate('/')
//     } catch (err) {
//       setStatus('error')
//       setMessage(err.response?.data?.error || 'Login failed. Please try again.')
//     }
//   }

//   const handleGoogleLogin = () => {
//     // full page redirect — this leaves the SPA, Google needs a real navigation
//     window.location.href = `${NODE_BASE_URL}/api/scholar/google`
//   }

//   return (
//     <div className="min-h-screen bg-[#10101B] text-[#F1EEE4] font-body">
//       <FontImports />
//       <Header variant="back" />

//       <div className="flex items-center justify-center px-4 py-16">
//         <div className="w-full max-w-sm">
//           <div className="mb-8">
//             <p className="font-mono text-xs tracking-[0.2em] text-[#E8A33D] uppercase mb-2">
//               Welcome back
//             </p>
//             <h1 className="font-display text-3xl font-semibold">Log in</h1>
//             <p className="text-sm text-[#F1EEE4]/50 mt-2">
//               Continue exploring your research library
//             </p>
//           </div>

//           <button
//             type="button"
//             onClick={handleGoogleLogin}
//             className="w-full flex items-center justify-center gap-2.5 rounded-md border border-[#2A2A3D]
//                        bg-[#181826] py-2.5 text-sm text-[#F1EEE4] hover:border-[#E8A33D]/40
//                        hover:bg-[#20202f] transition-colors mb-5"
//           >
//             <GoogleIcon />
//             Continue with Google
//           </button>

//           <div className="flex items-center gap-3 mb-5">
//             <div className="h-px flex-1 bg-[#2A2A3D]" />
//             <span className="text-xs text-[#F1EEE4]/30 font-mono">or</span>
//             <div className="h-px flex-1 bg-[#2A2A3D]" />
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <label htmlFor="email" className="block text-sm text-[#F1EEE4]/70 mb-1">
//                 Email
//               </label>
//               <input
//                 id="email"
//                 type="email"
//                 required
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 placeholder="you@university.edu"
//                 className="w-full rounded-md border border-[#2A2A3D] bg-[#181826]
//                            px-3 py-2 text-sm outline-none focus:border-[#E8A33D]/60
//                            placeholder:text-[#F1EEE4]/30"
//               />
//             </div>

//             <div>
//               <div className="flex items-center justify-between mb-1">
//                 <label htmlFor="password" className="block text-sm text-[#F1EEE4]/70">
//                   Password
//                 </label>
//                 <button
//                   type="button"
//                   onClick={() => setForgotOpen(true)}
//                   className="text-xs text-[#E8A33D] hover:text-[#f0b158] transition-colors"
//                 >
//                   Forgot password?
//                 </button>
//               </div>
//               <input
//                 id="password"
//                 type="password"
//                 required
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 placeholder="••••••••"
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
//               {status === 'loading' ? 'Logging in…' : 'Log in'}
//             </button>
//           </form>

//           {status === 'error' && (
//             <div className="mt-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
//               {message}
//             </div>
//           )}

//           <p className="text-sm text-[#F1EEE4]/50 mt-6 text-center">
//             Don't have an account?{' '}
//             <Link to="/register" className="text-[#E8A33D] hover:text-[#f0b158] transition-colors">
//               Register
//             </Link>
//           </p>
//         </div>
//       </div>

//       {forgotOpen && <ForgotPassword onClose={() => setForgotOpen(false)} />}
//     </div>
//   )
// }

// export default Login


import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FontImports, Header } from '../components/Shell'
import { useAuth } from '../AuthContext'
import ForgotPassword from '../components/ForgotPassword'

const NODE_BASE_URL = import.meta.env.VITE_NODE_BASE_URL || 'http:/localhost:3000'
// const NODE_BASE_URL = 'http://localhost:3000'

const OAUTH_ERROR_MESSAGES = {
  no_email:
    'Your GitHub email is private. Please make it public on GitHub, or register with email/password instead.',
  github_auth_failed: 'GitHub sign-in failed. Please try again.',
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
        0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
        -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07
        -1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82
        a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
        .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2
        0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
    </svg>
  )
}

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const oauthError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [forgotOpen, setForgotOpen] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.error || 'Login failed. Please try again.')
    }
  }

  const handleGitHubLogin = () => {
    // full page redirect — this leaves the SPA, GitHub needs a real navigation
    window.location.href = `${NODE_BASE_URL}/api/scholar/github`
  }

  return (
    <div className="min-h-screen bg-[#10101B] text-[#F1EEE4] font-body">
      <FontImports />
      <Header variant="back" />

      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="font-mono text-xs tracking-[0.2em] text-[#E8A33D] uppercase mb-2">
              Welcome back
            </p>
            <h1 className="font-display text-3xl font-semibold">Log in</h1>
            <p className="text-sm text-[#F1EEE4]/50 mt-2">
              Continue exploring your research library
            </p>
          </div>

          {oauthError && (
            <div className="mb-5 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
              {OAUTH_ERROR_MESSAGES[oauthError] || 'Sign-in failed. Please try again.'}
            </div>
          )}

          {/* <button
            type="button"
            onClick={handleGitHubLogin}
            className="w-full flex items-center justify-center gap-2.5 rounded-md border border-[#2A2A3D]
                       bg-[#181826] py-2.5 text-sm text-[#F1EEE4] hover:border-[#E8A33D]/40
                       hover:bg-[#20202f] transition-colors mb-5"
          >
            <GitHubIcon />
            Continue with GitHub
          </button> */}

          {/* <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-[#2A2A3D]" />
            <span className="text-xs text-[#F1EEE4]/30 font-mono">or</span>
            <div className="h-px flex-1 bg-[#2A2A3D]" />
          </div> */}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-[#F1EEE4]/70 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full rounded-md border border-[#2A2A3D] bg-[#181826]
                           px-3 py-2 text-sm outline-none focus:border-[#E8A33D]/60
                           placeholder:text-[#F1EEE4]/30"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm text-[#F1EEE4]/70">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs text-[#E8A33D] hover:text-[#f0b158] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
              {status === 'loading' ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          {status === 'error' && (
            <div className="mt-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
              {message}
            </div>
          )}

          <p className="text-sm text-[#F1EEE4]/50 mt-6 text-center">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#E8A33D] hover:text-[#f0b158] transition-colors">
              Register
            </Link>
          </p>
        </div>
      </div>

      {forgotOpen && <ForgotPassword onClose={() => setForgotOpen(false)} />}
    </div>
  )
}

export default Login