'use client'

import { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'

export function Providers({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  // If publishable key is not set yet, render children cleanly until key is configured
  if (!publishableKey || publishableKey.includes('YOUR_CLERK')) {
    return <>{children}</>
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        variables: {
          colorPrimary: '#16a34a',
          colorText: '#1f2937',
          colorBackground: '#ffffff',
          borderRadius: '0.75rem',
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
