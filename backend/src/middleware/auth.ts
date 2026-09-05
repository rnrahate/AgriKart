/**
 * Authentication Middleware
 * Validates JWT tokens cryptographically via Supabase and authorizes requests
 */

import type { Request, Response, NextFunction } from 'express'
import type { AuthContext, UserRole } from '../types/auth'
import {
  AuthenticationError,
  AuthorizationError,
  ErrorCode,
} from '../utils/errors'
import { roleService } from '../services/auth/roleService'
import { createSupabaseAdminClient, verifyJWT } from '../config/supabase'

/**
 * Extend Express Request to include auth context
 */
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext
    }
  }
}

/**
 * Helper to fetch the application profile from DB
 */
async function getApplicationProfile(userId?: string, email?: string): Promise<any | null> {
  if (!userId && !email) return null

  const supabase = createSupabaseAdminClient()
  const selectors = [
    { table: 'profiles', column: userId ? 'id' : 'email', value: userId || email },
    { table: 'users', column: userId ? 'id' : 'email', value: userId || email },
  ]

  for (const selector of selectors) {
    const { data, error } = await supabase
      .from(selector.table)
      .select('*')
      .eq(selector.column, selector.value)
      .maybeSingle()

    if (!error && data) return data
  }

  return null
}

/**
 * JWT authentication middleware
 * Extracts and cryptographically validates JWT token from request
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | null = null

    // Try Authorization header first
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    // Fall back to HttpOnly cookie
    if (!token && req.cookies) {
      token = req.cookies['sb-auth-token'] || req.cookies['auth-token']
    }

    if (!token) {
      throw new AuthenticationError(
        'Missing authentication token',
        ErrorCode.MISSING_TOKEN
      )
    }

    // Cryptographically verify token with Supabase Auth
    const user = await verifyJWT(token)
    const profile = await getApplicationProfile(user.id, user.email)

    // Attach verified auth context to request
    req.auth = {
      userId: user.id,
      email: profile?.email || user.email || '',
      role: (profile?.role || user.user_metadata?.role || user.app_metadata?.role || 'farmer') as UserRole,
      emailVerified: profile?.email_verified ?? profile?.verified ?? Boolean(user.email_confirmed_at),
      phoneVerified: profile?.phone_verified ?? Boolean(user.phone_confirmed_at),
    }

    next()
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(error.statusCode).json(error.toJSON())
      return
    }

    res.status(401).json({
      error: {
        message: 'Invalid or expired authentication token',
        code: ErrorCode.INVALID_TOKEN,
      },
    })
  }
}

/**
 * Optional authentication middleware
 * Does not throw if token is missing, but verifies if present
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token: string | null = null

  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  }

  if (!token && req.cookies) {
    token = req.cookies['sb-auth-token'] || req.cookies['auth-token']
  }

  if (!token) {
    return next()
  }

  try {
    const user = await verifyJWT(token)
    const profile = await getApplicationProfile(user.id, user.email)

    req.auth = {
      userId: user.id,
      email: profile?.email || user.email || '',
      role: (profile?.role || user.user_metadata?.role || user.app_metadata?.role || 'farmer') as UserRole,
      emailVerified: profile?.email_verified ?? profile?.verified ?? Boolean(user.email_confirmed_at),
      phoneVerified: profile?.phone_verified ?? Boolean(user.phone_confirmed_at),
    }
  } catch {
    // Continue without auth context if token is invalid or expired
  }

  next()
}

/**
 * Require specific role(s)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw new AuthenticationError(
        'Authentication required',
        ErrorCode.UNAUTHORIZED
      )
    }

    if (!allowedRoles.includes(req.auth.role)) {
      throw new AuthorizationError(
        `This action requires one of these roles: ${allowedRoles.join(', ')}`,
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        {
          userRole: req.auth.role,
          requiredRoles: allowedRoles,
        }
      )
    }

    next()
  }
}

/**
 * Require email verification
 */
export function requireEmailVerified(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.auth) {
    throw new AuthenticationError(
      'Authentication required',
      ErrorCode.UNAUTHORIZED
    )
  }

  if (!req.auth.emailVerified) {
    throw new AuthenticationError(
      'Email verification required',
      ErrorCode.EMAIL_NOT_VERIFIED,
      {
        userId: req.auth.userId,
        email: req.auth.email,
      }
    )
  }

  next()
}

/**
 * Require specific permission
 */
export function requirePermission(resource: string, action: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.auth) {
      throw new AuthenticationError(
        'Authentication required',
        ErrorCode.UNAUTHORIZED
      )
    }

    const hasPermission = roleService.hasPermission(
      req.auth.role,
      resource,
      action
    )

    if (!hasPermission) {
      throw new AuthorizationError(
        `You do not have permission to ${action} ${resource}`,
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        {
          resource,
          action,
          userRole: req.auth.role,
        }
      )
    }

    next()
  }
}

/**
 * Export middleware
 */
export const authMiddlewares = {
  auth: authMiddleware,
  optionalAuth: optionalAuthMiddleware,
  requireRole,
  requireEmailVerified,
  requirePermission,
}
