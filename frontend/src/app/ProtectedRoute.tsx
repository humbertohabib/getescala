import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const session = useAuthStore((s) => s.session)
  const clearSession = useAuthStore((s) => s.clearSession)

  const isAuthenticated = Boolean(session.accessToken && session.tenantId && session.userId)

  useEffect(() => {
    if (isAuthenticated) return
    if (!session.accessToken && !session.tenantId && !session.userId && !session.defaultScheduleId) return
    clearSession()
  }, [clearSession, isAuthenticated, session.accessToken, session.defaultScheduleId, session.tenantId, session.userId])

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
