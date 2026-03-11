import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '../modules/auth/pages/LoginPage'
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage'
import { AttendancePage } from '../modules/attendance/pages/AttendancePage'
import { SchedulesPage } from '../modules/scheduling/pages/SchedulesPage'
import { ShiftsPage } from '../modules/shifts/pages/ShiftsPage'
import { ProfessionalsPage } from '../modules/workforce/pages/ProfessionalsPage'
import { HomePage } from '../modules/marketing/pages/HomePage'

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
