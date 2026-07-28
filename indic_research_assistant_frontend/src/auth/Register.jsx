import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FontImports, Header } from '../components/Shell'
import { useAuth } from '../AuthContext'

function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password.length < 8) {
      setStatus('error')
      setMessage('Password must be at least 8 characters.')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      await register(name, email, password)
      navigate('/')
    } catch (err) {
      setStatus('error')
      console.log("error", err.message)
      setMessage(err.response?.data?.error || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#10101B] text-[#F1EEE4] font-body">
      <FontImports />
      <Header variant="back" />

      <div className="flex items-center mt-12 justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="font-mono text-xs tracking-[0.2em] text-[#E8A33D] uppercase mb-2">
              Get started
            </p>
            <h1 className="font-display text-3xl font-semibold">Create an account</h1>
            <p className="text-sm text-[#F1EEE4]/50 mt-2">
              Build your own research library, in your own language
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm text-[#F1EEE4]/70 mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Yugesh Karan"
                className="w-full rounded-md border border-[#2A2A3D] bg-[#181826]
                           px-3 py-2 text-sm outline-none focus:border-[#E8A33D]/60
                           placeholder:text-[#F1EEE4]/30"
              />
            </div>

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
              <label htmlFor="password" className="block text-sm text-[#F1EEE4]/70 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
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
              {status === 'loading' ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          {status === 'error' && (
            <div className="mt-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
              {message}
            </div>
          )}

          <p className="text-sm text-[#F1EEE4]/50 mt-6 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-[#E8A33D] hover:text-[#f0b158] transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register