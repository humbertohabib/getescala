import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '../modules/auth/pages/LoginPage'
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage'
import { AttendancePage } from '../modules/attendance/pages/AttendancePage'
import { SchedulesPage } from '../modules/scheduling/pages/SchedulesPage'
import { ShiftsPage } from '../modules/shifts/pages/ShiftsPage'
import { ProfessionalsPage } from '../modules/workforce/pages/ProfessionalsPage'
import { HomePage } from '../modules/marketing/pages/HomePage'
import { TermsOfUsePage } from '../modules/marketing/pages/TermsOfUsePage'
import { PrivacyPolicyPage } from '../modules/marketing/pages/PrivacyPolicyPage'

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
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/schedules',
    element: (
      <ProtectedRoute>
        <SchedulesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/attendance',
    element: (
      <ProtectedRoute>
        <AttendancePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/shifts',
    element: (
      <ProtectedRoute>
        <ShiftsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/professionals',
    element: (
      <ProtectedRoute>
        <ProfessionalsPage />
      </ProtectedRoute>
    ),
  },
])
