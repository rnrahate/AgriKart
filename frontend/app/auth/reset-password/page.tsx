'use client'

import { useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiLock, FiEye, FiEyeOff, FiCheck } from 'react-icons/fi'
import { sanitizeError } from '@/lib/errorUtils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromParam = searchParams.get('email') || ''

  const [email, setEmail] = useState(emailFromParam)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'verify' | 'reset' | 'done'>('verify')
  const [verifiedOtp, setVerifiedOtp] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('')
      const newOtp = [...otp]
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d
      })
      setOtp(newOtp)
      const nextIdx = Math.min(index + digits.length, 5)
      inputRefs.current[nextIdx]?.focus()
      return
    }
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) {
      setError('Please enter the full 6-digit code')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Invalid or expired code')

      setVerifiedOtp(code)
      setStep('reset')
    } catch (err: any) {
      setError(sanitizeError(err, 'Invalid or expired code. Please request a new OTP.'))
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: verifiedOtp, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to reset password')

      setStep('done')
    } catch (err: any) {
      setError(sanitizeError(err, 'Unable to reset password. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative animate-fade-in">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">

          {step === 'verify' && (
            <>
              <Link href="/auth/forgot-password" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 font-medium mb-6 transition-colors">
                <FiArrowLeft size={14} /> Back
              </Link>

              <div className="mb-6">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-2xl">🔐</span>
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900">Enter Verification Code</h1>
                <p className="text-gray-500 text-sm mt-2">
                  We sent a 6-digit code to <span className="font-semibold text-gray-700">{email || 'your email'}</span>. It expires in 5 minutes.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {!emailFromParam && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-modern"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                )}

                {/* OTP Input Boxes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Verification Code</label>
                  <div className="flex gap-2.5 justify-between">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                      />
                    ))}
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
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Verifying...
                    </span>
                  ) : 'Verify Code'}
                </button>
              </form>
            </>
          )}

          {step === 'reset' && (
            <>
              <div className="mb-6">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                  <FiLock className="text-green-600" size={24} />
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900">Set New Password</h1>
                <p className="text-gray-500 text-sm mt-2">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input-modern pl-10 pr-10"
                      placeholder="Min 6 characters"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-modern pl-10"
                      placeholder="Repeat password"
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
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Resetting...
                    </span>
                  ) : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          {step === 'done' && (
            <div className="text-center animate-fade-in py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheck className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h2>
              <p className="text-gray-500 text-sm mb-8">
                Your password has been updated successfully. You can now sign in with your new password.
              </p>
              <Link
                href="/auth/login"
                className="inline-block w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all active:scale-[0.98] shadow-sm text-center"
              >
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600/30 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
