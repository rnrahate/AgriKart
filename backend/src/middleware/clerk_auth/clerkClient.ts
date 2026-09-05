/**
 * Clerk Backend Client Configuration
 * Initializes Clerk SDK with environment credentials
 */

import { createClerkClient } from '@clerk/backend'

const secretKey = process.env.CLERK_SECRET_KEY || ''
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || ''

export const clerkClient = createClerkClient({
  secretKey,
  publishableKey,
})
