/**
 * Clerk Authentication Middleware
 * Validates incoming Clerk Bearer JWT tokens, handles JIT profile synchronization
 * with Supabase PostgreSQL, and provides role-based access control.
 */

import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '@clerk/backend'
import { clerkClient } from './clerkClient'
import { getSupabaseAdminClient } from '../../config/supabase'
import { AuthenticationError, AuthorizationError, ErrorCode } from '../../utils/errors'
import { AuthContext, UserRole } from '../../types/auth'

export interface ClerkAuthUser extends AuthContext {
  fullName?: string
  phone?: string
}

/**
 * Helper: Extract token from Authorization header or cookies
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim()
  }

  // Check cookies as fallback
  if (req.cookies && req.cookies['__session']) {
    return req.cookies['__session']
  }

  return null
}

/**
 * JIT (Just-In-Time) Sync: Ensures Clerk user exists in Supabase public.profiles
 */
async function syncClerkUserToProfile(clerkUser: any): Promise<ClerkAuthUser> {
  const primaryEmail =
    clerkUser.emailAddresses?.find((e: any) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
    clerkUser.emailAddresses?.[0]?.emailAddress ||
    ''

  const fullName =
    `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
    clerkUser.username ||
    primaryEmail.split('@')[0] ||
    'AgriKart User'

  const role = (clerkUser.publicMetadata?.role || clerkUser.unsafeMetadata?.role || 'farmer') as UserRole
  const phone = clerkUser.phoneNumbers?.[0]?.phoneNumber || clerkUser.unsafeMetadata?.phone || null

  try {
    const supabase = getSupabaseAdminClient()
    await supabase.from('profiles').upsert(
      {
        id: clerkUser.id,
        email: primaryEmail,
        full_name: fullName,
        phone: phone,
        role: role,
        email_verified: true,
        verification_status: 'approved',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (role === 'vendor') {
      const businessName = clerkUser.unsafeMetadata?.businessName || `${fullName}'s Store`
      await supabase.from('vendors').upsert(
        {
          id: clerkUser.id,
          user_id: clerkUser.id,
          company_name: businessName,
          business_name: businessName,
          owner_name: fullName,
          business_phone: phone,
          is_active: true,
        },
        { onConflict: 'id' }
      )
    }
  } catch (err) {
    console.error('[AgriKart Clerk Sync Notice]:', err)
  }

  return {
    userId: clerkUser.id,
    email: primaryEmail,
    fullName,
    role,
    phone: phone || undefined,
    emailVerified: true,
    phoneVerified: Boolean(clerkUser.phoneNumbers?.[0]?.verification?.status === 'verified'),
  }
}

/**
 * Strict Middleware: Requires valid Clerk authentication
 */
export async function requireClerkAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req)

    if (!token) {
      throw new AuthenticationError('Authentication required. Missing Bearer token.', ErrorCode.UNAUTHORIZED)
    }

    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      throw new AuthenticationError('Clerk server secret key is not configured.', ErrorCode.INTERNAL_SERVER_ERROR)
    }

    // Verify Clerk JWT token
    const verifiedClaims: any = await verifyToken(token, {
      secretKey,
    })

    if (!verifiedClaims || !verifiedClaims.sub) {
      throw new AuthenticationError('Invalid or expired Clerk token.', ErrorCode.INVALID_TOKEN)
    }

    // Fetch full Clerk user details to resolve role and profile
    const clerkUser = await clerkClient.users.getUser(verifiedClaims.sub)
    if (!clerkUser) {
      throw new AuthenticationError('Clerk user record not found.', ErrorCode.ACCOUNT_NOT_FOUND)
    }

    req.auth = await syncClerkUserToProfile(clerkUser)
    next()
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      next(error)
      return
    }
    console.error('[Clerk Auth Error]:', error.message || error)
    next(new AuthenticationError('Authentication failed. Invalid session.', ErrorCode.INVALID_TOKEN))
  }
}

/**
 * Optional Middleware: Populates req.auth if Clerk token is present, continues otherwise
 */
export async function optionalClerkAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req)
    if (!token) {
      return next()
    }

    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) return next()

    const verifiedClaims: any = await verifyToken(token, { secretKey })
    if (verifiedClaims?.sub) {
      const clerkUser = await clerkClient.users.getUser(verifiedClaims.sub)
      if (clerkUser) {
        req.auth = await syncClerkUserToProfile(clerkUser)
      }
    }
  } catch {
    // Non-blocking for optional auth
  }
  next()
}

/**
 * Role-Based Access Control Middleware
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new AuthenticationError('Authentication required.', ErrorCode.UNAUTHORIZED))
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return next(
        new AuthorizationError(`Access denied. Requires one of roles: ${allowedRoles.join(', ')}`)
      )
    }

    next()
  }
}
