import { createBrowserRouter, redirect } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuthStore, type AuthSession } from './store'
import { LoginPage } from '../modules/auth/pages/LoginPage'
import DashboardPage from '../modules/dashboard/pages/DashboardPage'
import { AttendancePage } from '../modules/attendance/pages/AttendancePage'
import { SchedulesPage } from '../modules/scheduling/pages/SchedulesPage'
import { ShiftsPage } from '../modules/shifts/pages/ShiftsPage'
import { ProfessionalsPage } from '../modules/workforce/pages/ProfessionalsPage'
import { HomePage } from '../modules/marketing/pages/HomePage'
import { TermsOfUsePage } from '../modules/marketing/pages/TermsOfUsePage'
import { PrivacyPolicyPage } from '../modules/marketing/pages/PrivacyPolicyPage'
import { CompanySignupPage } from '../modules/marketing/pages/CompanySignupPage'
import { PlansPage } from '../modules/marketing/pages/PlansPage'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

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

function readPersistedSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem('getescala-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const root = parsed as Record<string, unknown>
    const state = root.state
    if (!state || typeof state !== 'object') return null
    const session = (state as Record<string, unknown>).session
    if (!session || typeof session !== 'object') return null
    const s = session as Record<string, unknown>
    return {
      accessToken: typeof s.accessToken === 'string' || s.accessToken === null ? (s.accessToken as string | null) : null,
      tenantId: typeof s.tenantId === 'string' || s.tenantId === null ? (s.tenantId as string | null) : null,
      userId: typeof s.userId === 'string' || s.userId === null ? (s.userId as string | null) : null,
      defaultScheduleId:
        typeof s.defaultScheduleId === 'string' || s.defaultScheduleId === null ? (s.defaultScheduleId as string | null) : null,
    }
  } catch {
    return null
  }
}

async function requireAuthLoader() {
  const session = readPersistedSession()
  const isAuthenticated = Boolean(session?.accessToken && session.tenantId && session.userId && !isJwtExpired(session.accessToken))

  if (!isAuthenticated) {
    useAuthStore.getState().clearSession()
    throw redirect('/login')
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session!.accessToken}`,
        'X-Tenant-Id': session!.tenantId!,
      },
    })
    if (response.status === 401 || response.status === 403) {
      useAuthStore.getState().clearSession()
      throw redirect('/login')
    }
  } catch {
    return null
  }

  return null
}

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/termos-de-uso',
    element: <TermsOfUsePage />,
  },
  {
    path: '/politica-de-privacidade',
    element: <PrivacyPolicyPage />,
  },
  {
    path: '/cadastro',
    element: <CompanySignupPage />,
  },
  {
    path: '/planos',
    element: <PlansPage />,
  },
  {
    path: '/dashboard',
    loader: requireAuthLoader,
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/schedules',
    loader: requireAuthLoader,
    element: (
      <ProtectedRoute>
        <SchedulesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/attendance',
    loader: requireAuthLoader,
    element: (
      <ProtectedRoute>
        <AttendancePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/shifts',
    loader: requireAuthLoader,
    element: (
      <ProtectedRoute>
        <ShiftsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/professionals',
    loader: requireAuthLoader,
    element: (
      <ProtectedRoute>
        <ProfessionalsPage />
      </ProtectedRoute>
    ),
  },
])
