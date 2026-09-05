/**
 * AgriKart Frontend Error Sanitization Utility
 * Ensures no raw database, PostgreSQL, Supabase RLS, or system-level error messages
 * are leaked to the user-facing UI, while preserving detailed diagnostic logs in the
 * terminal / browser CLI console.
 */

export function sanitizeError(error: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): string {
  // Always log full system/diagnostic error to CLI terminal / browser console
  console.error('[AgriKart CLI Error Log]:', error);

  if (!error) return fallbackMessage;

  const rawMessage = (
    typeof error === 'string'
      ? error
      : (error as any)?.message || (error as any)?.error_description || (error as any)?.details || ''
  ).trim();

  if (!rawMessage) return fallbackMessage;

  const lower = rawMessage.toLowerCase();

  // 1. Check for system / database / RLS / internal errors
  const isSystemError =
    lower.includes('row-level security') ||
    lower.includes('violates') ||
    lower.includes('policy') ||
    lower.includes('relation') ||
    lower.includes('column') ||
    lower.includes('table') ||
    lower.includes('foreign key') ||
    lower.includes('syntax error') ||
    lower.includes('pgrst') ||
    lower.includes('postgrest') ||
    lower.includes('jwt') ||
    lower.includes('internal server error') ||
    lower.includes('status code 500') ||
    lower.includes('database error') ||
    lower.includes('deadlock') ||
    lower.includes('schema') ||
    lower.includes('permission denied');

  if (isSystemError) {
    // Return friendly, non-technical message
    return 'We were unable to process your request. Please try again or contact support if the issue persists.';
  }

  // 2. Check for network / connection errors
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('econnrefused')) {
    return 'Unable to connect to our servers. Please check your internet connection and try again.';
  }

  // 3. User-friendly mappings for known auth conditions
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'Invalid email or password. Please verify your credentials and try again.';
  }

  if (lower.includes('user already registered') || lower.includes('already exists') || lower.includes('unique constraint')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in. Check your inbox for the verification link.';
  }

  if (lower.includes('password should be at least') || lower.includes('password is too short')) {
    return 'Password must be at least 6 characters long.';
  }

  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }

  // If the message is already clean, user-friendly, and contains no system technicalities
  if (rawMessage.length < 120 && !/[_{}\[\]<>;\\\/]/.test(rawMessage)) {
    return rawMessage;
  }

  return fallbackMessage;
}
