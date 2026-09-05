'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SignUp } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { sanitizeError } from '@/lib/errorUtils'
import { FiMail, FiLock, FiUser, FiPhone, FiEye, FiEyeOff } from 'react-icons/fi'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function SignupPage() {
  const isClerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('YOUR_CLERK')
  )

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    userType: 'farmer',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      // 1. Create account via backend admin API (automatically sets email_confirm: true)
      try {
        const res = await fetch(`${API_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            phone: formData.phone,
            role: formData.userType,
          }),
        })

        const result = await res.json()
        if (!res.ok) {
          if (result.error?.code === 'CONFLICT' || result.error?.message?.toLowerCase().includes('already')) {
            throw new Error('An account with this email address already exists. Please sign in instead.')
          }
          throw new Error(result.error?.message || 'Unable to create account. Please check your details.')
        }
      } catch (backendErr: any) {
        if (backendErr.message?.includes('already exists')) {
          throw backendErr
        }
        console.warn('[AgriKart Auth]: Backend signup notice, falling back to direct client creation:', backendErr)
        // Fallback to Supabase client signup if backend is unreachable
        const { error: clientErr } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              role: formData.userType,
              phone: formData.phone,
            },
          },
        })
        if (clientErr) throw clientErr
      }

      // 2. Immediately establish client session in Supabase Auth
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (loginError) {
        console.warn('[AgriKart Auth]: Auto-login notice, redirecting to login:', loginError)
        router.push('/auth/login')
        return
      }

      // 3. Authenticated successfully! Navigate to destination immediately
      const destination = formData.userType === 'vendor' ? '/vendor' : '/products'
      router.push(destination)
    } catch (err: any) {
      setError(sanitizeError(err, 'Unable to complete signup. Please verify your details and try again.'))
    } finally {
      setLoading(false)
    }
  }

  // If Clerk is configured with real API keys, render themed Clerk Sign Up
  if (isClerkConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl"></div>
        </div>

        <div className="relative animate-fade-in flex flex-col items-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl">🌾</span>
            <span className="text-2xl font-extrabold text-gray-900">AgriKart</span>
          </div>

          {/* Account Type Selector for Clerk */}
          <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-1 mb-5 w-full max-w-[400px]">
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, userType: 'farmer' }))
                if (typeof window !== 'undefined') localStorage.setItem('agrikart_signup_role', 'farmer')
              }}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                formData.userType === 'farmer'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
              }`}
            >
              🌾 Farmer Account
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, userType: 'vendor' }))
                if (typeof window !== 'undefined') localStorage.setItem('agrikart_signup_role', 'vendor')
              }}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                formData.userType === 'vendor'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'
              }`}
            >
              🏪 Vendor Account
            </button>
          </div>

          <SignUp
            routing="hash"
            afterSignUpUrl="/profile?welcome=true"
            signInUrl="/auth/login"
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-8">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative animate-fade-in">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="text-3xl">🌾</span>
              <h1 className="text-2xl font-extrabold text-gray-900">AgriKart</h1>
            </div>
            <p className="text-gray-500 text-sm">Create your account to get started.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* User Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sign up as</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, userType: 'farmer' }))}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    formData.userType === 'farmer'
                      ? 'bg-white text-green-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🌱 Farmer
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, userType: 'vendor' }))}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    formData.userType === 'vendor'
                      ? 'bg-white text-green-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🏪 Vendor
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="input-modern pl-10"
                  placeholder="Ramesh Kumar"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-modern pl-10"
                  placeholder="ramesh@example.com"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="relative">
                <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-modern pl-10"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-modern pl-10 pr-10"
                  placeholder="Min. 6 characters"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-modern pl-10 pr-10"
                  placeholder="Re-enter password"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm shadow-green-600/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-green-600 font-semibold hover:text-green-700 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
