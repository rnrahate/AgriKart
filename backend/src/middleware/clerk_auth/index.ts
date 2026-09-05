/**
 * Clerk Authentication Module Exports
 */

export { clerkClient } from './clerkClient'
export {
  requireClerkAuth,
  optionalClerkAuth,
  requireRole,
  type ClerkAuthUser,
} from './clerkMiddleware'
