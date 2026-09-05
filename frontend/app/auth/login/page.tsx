'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SignIn } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { sanitizeError } from '@/lib/errorUtils'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function LoginPage() {
  const isClerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('YOUR_CLERK')
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setUserType] = useState('farmer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let authUser: any = null

      // 1. Attempt Supabase client login
      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!supabaseError && data?.user) {
        authUser = data.user
      } else {
        // 2. Fallback to backend /auth/login which auto-confirms
        console.warn('[AgriKart Auth]: Client login failed, attempting backend auto-confirmation...', supabaseError?.message)
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        const backendResult = await res.json()
        if (!res.ok || !backendResult.success) {
          throw new Error(backendResult.error?.message || 'Invalid email or password')
        }

        const retry = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        authUser = retry.data?.user || backendResult.user
      }

      if (!authUser?.id) {
        throw new Error('Unable to authenticate account')
      }

      const { data: usersProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .maybeSingle()

      const { data: appProfile } = usersProfile
        ? { data: null }
        : await supabase
            .from('profiles')
            .select('role')
            .eq('id', authUser.id)
            .maybeSingle()

      const actualRole = usersProfile?.role || appProfile?.role || authUser.role || userType
      const redirect = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect')
        : null

      router.push(redirect || (actualRole === 'vendor' ? '/vendor' : '/products'))
    } catch (err: any) {
      setError(sanitizeError(err, 'Unable to sign in. Please verify your credentials and try again.'))
    } finally {
      setLoading(false)
    }
  }

  // If Clerk is configured with real API keys, render themed Clerk Sign In
  if (isClerkConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl"></div>
        </div>

        <div className="relative animate-fade-in flex flex-col items-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-3xl">🌾</span>
            <span className="text-2xl font-extrabold text-gray-900">AgriKart</span>
          </div>

          <SignIn
            routing="hash"
            afterSignInUrl="/products"
            signUpUrl="/auth/signup"
            appearance={{
              elements: {
                card: 'bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6',
                formButtonPrimary: 'bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-3 shadow-md shadow-green-600/20 transition-all',
                formFieldInput: 'rounded-xl border border-gray-200 focus:border-green-500 focus:ring-green-500',
                headerTitle: 'text-2xl font-extrabold text-gray-900',
                headerSubtitle: 'text-gray-500 text-sm',
                socialButtonsBlockButton: 'rounded-xl border-gray-200 hover:bg-gray-50',
                footerActionLink: 'text-green-600 hover:text-green-700 font-semibold',
              },
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative animate-fade-in">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="text-3xl">🌾</span>
              <h1 className="text-2xl font-extrabold text-gray-900">AgriKart</h1>
            </div>
            <p className="text-gray-500 text-sm">Welcome back! Sign in to your account.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* User Type Toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Login as</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setUserType('farmer')}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    userType === 'farmer'
                      ? 'bg-white text-green-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🌱 Farmer
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('vendor')}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    userType === 'vendor'
                      ? 'bg-white text-green-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🏪 Vendor
                </button>
              </div>
            </div>

            {/* Email */}
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

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-modern pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm shadow-green-600/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-green-600 font-semibold hover:text-green-700 transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
