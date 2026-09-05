/**
 * Authentication Service
 * Handles all authentication business logic
 * Delegates password handling to Supabase Auth
 */

import type { LoginRequest, SignUpRequest, AuthResponse } from '../../types/auth'
import type { UserProfile } from '../../types/user'
import { 
  getUserByEmail, 
  sendPasswordResetEmail,
  resetPassword,
  verifyEmail,
  getSupabaseAdminClient,
  getSupabaseAnonClient,
} from '../../config/supabase'
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ErrorCode,
} from '../../utils/errors'
import {
  loginSchema,
  signUpSchema,
  validateEmail,
} from '../../utils/validators'

/**
 * Login user with email and password using Supabase Auth
 */
export async function login(
  credentials: LoginRequest
): Promise<AuthResponse> {
  // Validate input
  const validation = loginSchema.safeParse(credentials)
  if (!validation.success) {
    throw new AuthenticationError(
      'Invalid email or password',
      ErrorCode.INVALID_CREDENTIALS,
      {
        details: validation.error.errors,
      }
    )
  }

  const { email, password } = validation.data

  // Supabase Auth handles password verification securely
  const anon = getSupabaseAnonClient()
  let { data, error } = await anon.auth.signInWithPassword({
    email,
    password,
  })

  // If login failed, check if the user is unconfirmed in Supabase Auth and auto-confirm them
  if (error) {
    try {
      const admin = getSupabaseAdminClient()
      const { data: userList } = await admin.auth.admin.listUsers()
      const targetUser = userList?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      )

      if (targetUser && !targetUser.email_confirmed_at) {
        await admin.auth.admin.updateUserById(targetUser.id, {
          email_confirm: true,
        })
        await admin.from('profiles').update({ email_verified: true }).eq('id', targetUser.id)

        const retry = await anon.auth.signInWithPassword({
          email,
          password,
        })
        if (!retry.error && retry.data.user && retry.data.session) {
          data = retry.data
          error = null
        }
      }
    } catch (autoConfirmErr) {
      console.error('[AgriKart Auth]: Auto-confirm recovery notice:', autoConfirmErr)
    }
  }

  if (error || !data?.user || !data?.session) {
    throw new AuthenticationError(
      'Invalid email or password',
      ErrorCode.INVALID_CREDENTIALS
    )
  }

  // Fetch application profile for role and details
  const admin = getSupabaseAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, role')
    .eq('id', data.user.id)
    .maybeSingle()

  return {
    success: true,
    message: 'Login successful',
    token: data.session.access_token,
    user: {
      id: data.user.id,
      email: data.user.email || email,
      role: profile?.role || 'farmer',
    },
  }
}

/**
 * Sign up new user
 */
export async function signup(
  signupData: SignUpRequest
): Promise<AuthResponse> {
  // Validate input
  const validation = signUpSchema.safeParse(signupData)
  if (!validation.success) {
    throw new AuthenticationError(
      'Validation failed',
      ErrorCode.VALIDATION_ERROR,
      {
        details: validation.error.errors,
      }
    )
  }

  const {
    email,
    password,
    fullName,
    phone,
    role,
    location,
  } = validation.data

  // Check if user already exists
  const admin = getSupabaseAdminClient()
  const existingUser = await getUserByEmail(email)

  if (existingUser) {
    // If the account was previously created with unconfirmed email, recover it!
    try {
      const { data: userList } = await admin.auth.admin.listUsers()
      const unconfirmedUser = userList?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase() && !u.email_confirmed_at
      )

      if (unconfirmedUser) {
        await admin.auth.admin.updateUserById(unconfirmedUser.id, {
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, role, phone },
        })

        await admin.from('profiles').upsert({
          id: unconfirmedUser.id,
          email,
          full_name: fullName,
          phone: phone || null,
          role,
          email_verified: true,
          updated_at: new Date().toISOString(),
        })

        return {
          success: true,
          message: 'Account created and activated successfully',
          user: {
            id: unconfirmedUser.id,
            email,
            role,
          },
        }
      }
    } catch (recoverErr) {
      console.error('[AgriKart Auth]: Unconfirmed user recovery notice:', recoverErr)
    }

    throw new ConflictError(
      'Email address is already registered',
      {
        field: 'email',
      }
    )
  }

  // Create auth user in Supabase Auth (with email_confirm: true)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
  })

  if (authError || !authData.user) {
    if (authError?.message?.toLowerCase().includes('already')) {
      // Attempt recovery for unconfirmed user in auth.users
      try {
        const { data: userList } = await admin.auth.admin.listUsers()
        const unconfirmedUser = userList?.users?.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase() && !u.email_confirmed_at
        )

        if (unconfirmedUser) {
          await admin.auth.admin.updateUserById(unconfirmedUser.id, {
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, role, phone },
          })

          await admin.from('profiles').upsert({
            id: unconfirmedUser.id,
            email,
            full_name: fullName,
            phone: phone || null,
            role,
            email_verified: true,
            updated_at: new Date().toISOString(),
          })

          return {
            success: true,
            message: 'Account created and activated successfully',
            user: {
              id: unconfirmedUser.id,
              email,
              role,
            },
          }
        }
      } catch (recoverErr) {
        console.error('[AgriKart Auth]: User recovery notice:', recoverErr)
      }

      throw new ConflictError('Email address is already registered')
    }
    throw new AuthenticationError(
      authError?.message || 'User creation failed',
      ErrorCode.VALIDATION_ERROR
    )
  }

  const userId = authData.user.id

  // Update profile details created by trigger
  await admin.from('profiles').upsert({
    id: userId,
    email,
    full_name: fullName,
    phone: phone || null,
    role,
    language: 'en',
    location: location ? `${location.district || ''}, ${location.state}` : null,
    state: location?.state || null,
    verification_status: 'pending',
    updated_at: new Date().toISOString(),
  })

  return {
    success: true,
    message: 'Account created successfully',
    user: {
      id: userId,
      email,
      role,
    },
  }
}

/**
 * Change user password
 */
export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const admin = getSupabaseAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) {
    throw new AuthenticationError(`Failed to update password: ${error.message}`)
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<AuthResponse> {
  if (!validateEmail(email)) {
    throw new AuthenticationError(
      'Invalid email address',
      ErrorCode.INVALID_EMAIL
    )
  }

  const user = await getUserByEmail(email)
  if (!user) {
    return {
      success: true,
      message: 'If an account exists, you will receive a password reset email',
    }
  }

  try {
    await sendPasswordResetEmail(email)
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    throw new Error('Failed to send password reset email')
  }

  return {
    success: true,
    message: 'If an account exists, you will receive a password reset email',
  }
}

/**
 * Confirm password reset
 */
export async function confirmPasswordReset(
  token: string,
  newPassword: string
): Promise<AuthResponse> {
  if (!token) {
    throw new AuthenticationError(
      'Invalid reset token',
      ErrorCode.INVALID_TOKEN
    )
  }

  try {
    await resetPassword(token, newPassword)
  } catch (error) {
    throw new AuthenticationError(
      'Failed to reset password',
      ErrorCode.INVALID_TOKEN,
      {
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    )
  }

  return {
    success: true,
    message: 'Password reset successfully',
  }
}

/**
 * Verify email with token
 */
export async function confirmEmailVerification(token: string): Promise<AuthResponse> {
  if (!token) {
    throw new AuthenticationError(
      'Invalid verification token',
      ErrorCode.INVALID_TOKEN
    )
  }

  try {
    await verifyEmail(token)
  } catch (error) {
    throw new AuthenticationError(
      'Failed to verify email',
      ErrorCode.INVALID_TOKEN,
      {
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    )
  }

  return {
    success: true,
    message: 'Email verified successfully',
  }
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const supabase = getSupabaseAdminClient()
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    throw new NotFoundError('User not found', { userId })
  }

  return mapProfileData(profile)
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const supabase = getSupabaseAdminClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({
      full_name: updates.fullName,
      phone: updates.phone,
      language: updates.language,
      location: updates.location,
      bio: updates.bio,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }

  return mapProfileData(profile)
}

/**
 * Map database profile to UserProfile type
 */
function mapProfileData(dbProfile: any): UserProfile {
  return {
    id: dbProfile.id,
    email: dbProfile.email,
    fullName: dbProfile.full_name,
    phone: dbProfile.phone,
    role: dbProfile.role,
    language: dbProfile.language,
    location: dbProfile.location,
    bio: dbProfile.bio,
    emailVerified: dbProfile.email_verified,
    phoneVerified: dbProfile.phone_verified,
    verificationStatus: dbProfile.verification_status,
    notificationPreferences: dbProfile.notification_preferences,
    lastLogin: dbProfile.last_login,
    createdAt: dbProfile.created_at,
    updatedAt: dbProfile.updated_at,
  }
}

export const authService = {
  login,
  signup,
  changePassword,
  requestPasswordReset,
  confirmPasswordReset,
  confirmEmailVerification,
  getUserProfile,
  updateUserProfile,
}
