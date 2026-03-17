import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false
  if (!error || typeof error !== 'object') return true
  if (!('status' in error)) return true
  const status = (error as { status?: unknown }).status
  if (typeof status !== 'number') return true
  return status >= 500
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
    },
  },
})

export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
