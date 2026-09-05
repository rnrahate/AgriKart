/**
 * Supabase Configuration
 * Initializes Supabase client with proper authentication and provides typed helper methods.
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Validate required environment variables
 */
export function validateEnvironment(): void {
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY']

  const missing = requiredVars.filter((varName) => !process.env[varName])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file'
    )
  }
}

/**
 * Initialize Supabase client with anon key
 * Used for client-side and unprivileged operations
 */
export function createSupabaseAnonClient(): SupabaseClient {
  validateEnvironment()

  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  )
}

/**
 * Initialize Supabase admin client with service role key
 * Used for backend admin operations (never expose to the frontend)
 */
export function createSupabaseAdminClient(): SupabaseClient {
  validateEnvironment()

  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  )
}

/**
 * Singleton instance caching
 */
let supabaseAnonClient: SupabaseClient | null = null
let supabaseAdminClient: SupabaseClient | null = null

export function getSupabaseAnonClient(): SupabaseClient {
  if (!supabaseAnonClient) {
    supabaseAnonClient = createSupabaseAnonClient()
  }
  return supabaseAnonClient
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createSupabaseAdminClient()
  }
  return supabaseAdminClient
}

/**
 * Cryptographically verify JWT token using Supabase Auth
 */
export async function verifyJWT(token: string): Promise<any> {
  const client = getSupabaseAdminClient()
  const { data, error } = await client.auth.getUser(token)

  if (error || !data.user) {
    throw new Error('Invalid or expired authentication token')
  }

  return data.user
}

/**
 * Fetch profile by user ID from profiles table
 */
export async function getUserById(userId: string): Promise<any> {
  const client = getSupabaseAdminClient()

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch user: ${error.message}`)
  }

  return data
}

/**
 * Fetch profile by email from profiles table
 */
export async function getUserByEmail(email: string): Promise<any> {
  const client = getSupabaseAdminClient()

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch user: ${error.message}`)
  }

  return data || null
}

/**
 * Create user in Supabase Auth
 */
export async function createAuthUser(
  email: string,
  password: string,
  metadata: Record<string, any> = {}
): Promise<{ userId: string; user: any }> {
  const client = getSupabaseAdminClient()

  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`)
  }

  if (!data.user) {
    throw new Error('User creation failed')
  }

  return {
    userId: data.user.id,
    user: data.user,
  }
}

/**
 * Delete user from Supabase Auth
 */
export async function deleteAuthUser(userId: string): Promise<void> {
  const client = getSupabaseAdminClient()
  const { error } = await client.auth.admin.deleteUser(userId)

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`)
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const client = getSupabaseAnonClient()

  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password`,
  })

  if (error) {
    throw new Error(`Failed to send reset email: ${error.message}`)
  }
}

/**
 * Reset password for a user
 */
export async function resetPassword(userIdOrToken: string, newPassword: string): Promise<void> {
  const client = getSupabaseAdminClient()

  const { error } = await client.auth.admin.updateUserById(userIdOrToken, {
    password: newPassword,
  })

  if (error) {
    throw new Error(`Failed to reset password: ${error.message}`)
  }
}

/**
 * Verify email with token hash
 */
export async function verifyEmail(token: string): Promise<void> {
  const client = getSupabaseAnonClient()

  const { error } = await client.auth.verifyOtp({
    token_hash: token,
    type: 'email',
  })

  if (error) {
    throw new Error(`Failed to verify email: ${error.message}`)
  }
}

/**
 * Export bundle for use in other modules
 */
export const supabaseConfig = {
  getSupabaseAnonClient,
  getSupabaseAdminClient,
  createSupabaseAnonClient,
  createSupabaseAdminClient,
  verifyJWT,
  getUserById,
  getUserByEmail,
  createAuthUser,
  deleteAuthUser,
  sendPasswordResetEmail,
  resetPassword,
  verifyEmail,
}
