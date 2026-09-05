'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { sanitizeError } from '@/lib/errorUtils'

function VerifyContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [resending, setResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleResend = async () => {
    if (!email) return
    setResending(true)
    setResendStatus('idle')
    setErrorMessage('')

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (error) throw error
      setResendStatus('success')
    } catch (err: any) {
      setResendStatus('error')
      setErrorMessage(sanitizeError(err, 'Unable to resend verification email. Please try again later.'))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl">
          ✉️
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Check Your Email</h1>
        <p className="text-gray-600 text-sm mb-4">
          {email ? (
            <>
              We sent a verification link to <span className="font-semibold text-gray-800">{email}</span>. Please click the link to activate your account.
            </>
          ) : (
            'We sent a verification link to your email address. Please click the link to activate your account.'
          )}
        </p>

        {resendStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg">
            Verification link resent! Please check your spam or inbox folder.
          </div>
        )}

        {resendStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/auth/login"
            className="w-full bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700 transition block text-center shadow-md shadow-green-600/20"
          >
            Go to Login
          </Link>

          {email && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition block text-center text-sm disabled:opacity-50"
            >
              {resending ? 'Resending...' : 'Resend Verification Email'}
            </button>
          )}

          <Link
            href="/"
            className="w-full text-gray-500 hover:text-gray-700 py-2 block text-center text-xs transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
