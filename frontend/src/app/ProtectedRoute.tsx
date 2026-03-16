import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store'

function isJwtExpired(accessToken: string | null): boolean {
  if (!accessToken) return true
  const parts = accessToken.split('.')
  if (parts.length < 2) return true
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = atob(padded)
    const payload = JSON.parse(json) as unknown
    if (typeof payload !== 'object' || payload == null) return true
    const exp = (payload as Record<string, unknown>).exp
    if (typeof exp !== 'number' && typeof exp !== 'string') return true
    const expNumber = typeof exp === 'number' ? exp : Number(exp)
    if (!Number.isFinite(expNumber)) return true
    const expMs = expNumber > 1e12 ? expNumber : expNumber * 1000
    return Date.now() >= expMs - 30_000
  } catch {
    return true
  }
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const session = useAuthStore((s) => s.session)
  const clearSession = useAuthStore((s) => s.clearSession)

  const isAuthenticated = Boolean(
    session.accessToken &&
      session.tenantId &&
      session.userId &&
      !isJwtExpired(session.accessToken),
  )

  useEffect(() => {
    if (isAuthenticated) return
    if (!session.accessToken && !session.tenantId && !session.userId && !session.defaultScheduleId) return
    clearSession()
  }, [clearSession, isAuthenticated, session.accessToken, session.defaultScheduleId, session.tenantId, session.userId])

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
