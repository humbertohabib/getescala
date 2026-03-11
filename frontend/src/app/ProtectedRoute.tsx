import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from './store'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.session.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}
