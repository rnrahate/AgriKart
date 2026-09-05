'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FiMail, FiArrowLeft } from 'react-icons/fi'
import { sanitizeError } from '@/lib/errorUtils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to send OTP')
      }

      setSent(true)
    } catch (err: any) {
      setError(sanitizeError(err, 'Unable to send OTP. Please verify your email and try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative animate-fade-in">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">
          {/* Back link */}
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 font-medium mb-6 transition-colors"
          >
            <FiArrowLeft size={14} />
            Back to Login
          </Link>

          {!sent ? (
            <>
              {/* Header */}
              <div className="mb-6">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                  <FiLock className="text-green-600" size={24} />
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900">Forgot Password?</h1>
                <p className="text-gray-500 text-sm mt-2">
                  No worries! Enter your email address and we&apos;ll send you a verification code to reset your password.
                </p>
              </div>

              <form onSubmit={handleSendOTP} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-modern pl-10"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm shadow-green-600/20"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Sending Code...
                    </span>
                  ) : (
                    'Send Verification Code'
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📧</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-500 text-sm mb-6">
                We&apos;ve sent a 6-digit verification code to{' '}
                <span className="font-semibold text-gray-700">{email}</span>. 
                The code expires in 5 minutes.
              </p>
              <Link
                href={`/auth/reset-password?email=${encodeURIComponent(email)}`}
                className="inline-block w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all active:scale-[0.98] shadow-sm text-center"
              >
                Enter Verification Code
              </Link>
              <button
                onClick={() => { setSent(false); setError('') }}
                className="mt-3 text-sm text-gray-500 hover:text-green-600 font-medium transition-colors"
              >
                Didn&apos;t receive it? Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FiLock(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  )
}
