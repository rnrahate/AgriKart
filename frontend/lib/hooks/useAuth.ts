'use client'

import { useEffect, useState } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { supabase } from '../supabase'
import { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  phone: string
  role: 'farmer' | 'vendor' | 'expert' | 'admin'
  verified: boolean
  created_at?: string
  location?: string
  state?: string
  bio?: string
  language?: string
  metadata?: any
}

/**
 * Clerk Authentication Implementation
 */
function useClerkAuthHandler() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const clerk = useClerk()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn || !clerkUser) {
      setProfile(null)
      setLoading(false)
      return
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || ''
    const fullName = clerkUser.fullName || clerkUser.username || email.split('@')[0] || 'User'

    // Check if user chose a specific role during signup via local storage
    const storedRole = typeof window !== 'undefined' ? localStorage.getItem('agrikart_signup_role') : null
    const role = ((storedRole as any) || clerkUser.publicMetadata?.role || clerkUser.unsafeMetadata?.role || 'farmer') as
      | 'farmer'
      | 'vendor'
      | 'expert'
      | 'admin'
    const phone = clerkUser.phoneNumbers?.[0]?.phoneNumber || (clerkUser.unsafeMetadata?.phone as string) || ''

    const initialProfile: UserProfile = {
      id: clerkUser.id,
      email,
      full_name: fullName,
      phone,
      role,
      verified: Boolean(clerkUser.primaryEmailAddress?.verification?.status === 'verified'),
      created_at: clerkUser.createdAt ? new Date(clerkUser.createdAt).toISOString() : new Date().toISOString(),
    }

    // JIT: Fetch or sync additional profile details from Supabase public.profiles
    const fetchSupabaseProfile = async () => {
      try {
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', clerkUser.id)
          .maybeSingle()

        if (dbProfile) {
          // If a pending role from signup exists and differs, update it
          let activeRole = dbProfile.role || role
          if (storedRole && storedRole !== dbProfile.role) {
            activeRole = storedRole as any
            await supabase.from('profiles').update({ role: activeRole }).eq('id', clerkUser.id)
            if (activeRole === 'vendor') {
              await supabase.from('vendors').upsert({
                id: clerkUser.id,
                user_id: clerkUser.id,
                company_name: dbProfile.full_name || fullName,
                business_name: dbProfile.full_name || fullName,
                owner_name: dbProfile.full_name || fullName,
                business_phone: dbProfile.phone || phone || null,
                business_email: email,
                is_active: true,
              }, { onConflict: 'id' })
            }
          }

          if (storedRole && typeof window !== 'undefined') {
            localStorage.removeItem('agrikart_signup_role')
          }

          setProfile({
            ...initialProfile,
            ...dbProfile,
            role: activeRole,
            full_name: dbProfile.full_name || initialProfile.full_name,
            phone: dbProfile.phone || initialProfile.phone,
          })
        } else {
          // If not in profiles yet, upsert so foreign keys and dependencies work
          await supabase.from('profiles').upsert({
            id: clerkUser.id,
            email,
            full_name: fullName,
            phone: phone || null,
            role,
            email_verified: true,
            verification_status: 'approved',
          }, { onConflict: 'id' })

          if (role === 'vendor') {
            await supabase.from('vendors').upsert({
              id: clerkUser.id,
              user_id: clerkUser.id,
              company_name: fullName || 'Vendor Store',
              business_name: fullName || 'Vendor Store',
              owner_name: fullName,
              business_phone: phone || null,
              business_email: email,
              is_active: true,
            }, { onConflict: 'id' })
          }

          if (storedRole && typeof window !== 'undefined') {
            localStorage.removeItem('agrikart_signup_role')
          }

          setProfile({ ...initialProfile, role })
        }
      } catch (e) {
        console.warn('[AgriKart Clerk Profile Sync]:', e)
        setProfile(initialProfile)
      } finally {
        setLoading(false)
      }
    }

    fetchSupabaseProfile()
  }, [isLoaded, isSignedIn, clerkUser])

  const logout = async () => {
    try {
      await clerk.signOut()
    } catch {}
    try {
      await supabase.auth.signOut()
    } catch {}
    setProfile(null)
  }

  return {
    user: profile,
    loading: !isLoaded || loading,
    logout,
    openUserProfile: clerk.openUserProfile,
    isClerk: true,
  }
}

/**
 * Supabase Authentication Fallback Implementation
 */
function useSupabaseAuthHandler() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async (authUser: User) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      return {
        id: authUser.id,
        email: authUser.email || '',
        full_name: profile?.full_name || authUser.user_metadata?.full_name || 'User',
        phone: profile?.phone || authUser.phone || '',
        role: profile?.role || (authUser.user_metadata?.role as any) || 'farmer',
        location: profile?.location || '',
        bio: profile?.bio || '',
        verified: Boolean(authUser.email_confirmed_at),
        created_at: authUser.created_at,
      }
    }

    const getSession = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const prof = await fetchProfile(session.user)
          setUser(prof)
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const prof = await fetchProfile(session.user)
        setUser(prof)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return { user, loading, logout, isClerk: false, openUserProfile: undefined }
}

/**
 * Universal useAuth hook:
 * Automatically uses Clerk when configured, or smoothly falls back to Supabase.
 */
export function useAuth() {
  const isClerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('YOUR_CLERK')
  )

  if (isClerkConfigured) {
    return useClerkAuthHandler()
  }

  return useSupabaseAuthHandler()
}
