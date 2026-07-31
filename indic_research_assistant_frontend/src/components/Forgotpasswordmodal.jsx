import React, { useState } from 'react'
import axiosInstance, { setUnauthorizedHandler } from '../instances/axiosInstance';

const OTP_BASE = '/api/scholar'

function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState('email') // email | otp | success
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [message, setMessage] = useState('')

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const response = await axiosInstance.post(`${OTP_BASE}/send-otp`, { email: email.trim() })

      if(response.status==200)
      {
        setStep('otp')
        setStatus('idle')
      }
   
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.message || 'Could not send OTP. Please try again.')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()

    if (newPassword.length < 8) {
      setStatus('error')
      setMessage('Password must be at least 8 characters.')
      return
    }

    setStatus('loading')
    setMessage('')
    try {
     const response =  await axiosInstance.post(`${OTP_BASE}/reset-password`, {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      })
    if (response.status===200){
        setStep('success')
        setStatus('idle')
    }
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.message || 'Reset failed. Check your OTP and try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-[#2A2A3D] bg-[#181826] p-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#F1EEE4]/40 hover:text-[#F1EEE4] transition-colors text-sm"
          aria-label="Close"
        >
          ✕
        </button>

        {step === 'email' && (
          <>
            <p className="font-mono text-xs tracking-[0.2em] text-[#E8A33D] uppercase mb-2">
              Reset password
            </p>
            <h2 className="font-display text-xl font-semibold mb-1">Forgot your password?</h2>
            <p className="text-sm text-[#F1EEE4]/50 mb-5">
              We'll send a one-time code to your email.
            </p>

            <form onSubmit={handleSendOtp} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full rounded-md border border-[#2A2A3D] bg-[#10101B]
                           px-3 py-2 text-sm outline-none focus:border-[#E8A33D]/60
                           placeholder:text-[#F1EEE4]/30"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-md bg-[#E8A33D] text-[#10101B] py-2.5 text-sm
                           font-medium hover:bg-[#f0b158] transition-colors disabled:opacity-50"
              >
                {status === 'loading' ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <p className="font-mono text-xs tracking-[0.2em] text-[#E8A33D] uppercase mb-2">
              Check your email
            </p>
            <h2 className="font-display text-xl font-semibold mb-1">Enter the code</h2>
            <p className="text-sm text-[#F1EEE4]/50 mb-5">
              Sent to <span className="text-[#F1EEE4]/80">{email}</span> — valid for 15 minutes.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                className="w-full rounded-md border border-[#2A2A3D] bg-[#10101B]
                           px-3 py-2 text-sm outline-none focus:border-[#E8A33D]/60
                           placeholder:text-[#F1EEE4]/30 font-mono tracking-widest text-center"
              />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min. 8 characters)"
                className="w-full rounded-md border border-[#2A2A3D] bg-[#10101B]
                           px-3 py-2 text-sm outline-none focus:border-[#E8A33D]/60
                           placeholder:text-[#F1EEE4]/30"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-md bg-[#E8A33D] text-[#10101B] py-2.5 text-sm
                           font-medium hover:bg-[#f0b158] transition-colors disabled:opacity-50"
              >
                {status === 'loading' ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          </>
        )}

        {step === 'success' && (
          <>
            <p className="font-mono text-xs tracking-[0.2em] text-emerald-400 uppercase mb-2">
              Done
            </p>
            <h2 className="font-display text-xl font-semibold mb-1">Password reset</h2>
            <p className="text-sm text-[#F1EEE4]/50 mb-5">
              You can now log in with your new password.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-md bg-[#E8A33D] text-[#10101B] py-2.5 text-sm
                         font-medium hover:bg-[#f0b158] transition-colors"
            >
              Back to log in
            </button>
          </>
        )}

        {status === 'error' && (
          <div className="mt-3 rounded-md border border-red-900 bg-red-950/40 p-2.5 text-xs text-red-300">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordModal