import { Link } from 'react-router-dom'
import { useAuthStore } from '../../../app/store'

export function DashboardPage() {
  const session = useAuthStore((s) => s.session)
  const clearSession = useAuthStore((s) => s.clearSession)

  return (
    <div style={{ maxWidth: 960, margin: '32px auto', padding: 16 }}>
      <h1>Dashboard</h1>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Link to="/schedules">Escalas</Link>
        <Link to="/attendance">Apontamentos</Link>
        <Link to="/shifts">Turnos</Link>
        <Link to="/professionals">Profissionais</Link>
        <Link
          to="/login"
          onClick={() => {
            clearSession()
          }}
        >
          Sair
        </Link>
      </div>
      <div style={{ marginTop: 16 }}>
        <div>Tenant: {session.tenantId ?? '-'}</div>
        <div>Schedule: {session.defaultScheduleId ?? '-'}</div>
        <div>User: {session.userId ?? '-'}</div>
      </div>
    </div>
  )
}
