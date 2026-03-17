import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../app/store'
import { useCreateSchedule } from '../hooks/useCreateSchedule'
import { useLockSchedule } from '../hooks/useLockSchedule'
import { usePublishSchedule } from '../hooks/usePublishSchedule'
import { useSchedules } from '../hooks/useSchedules'
import { downloadAttendanceCsv } from '../api/downloadAttendanceCsv'

export function SchedulesPage() {
  const navigate = useNavigate()
  const activeScheduleId = useAuthStore((s) => s.session.defaultScheduleId)
  const setDefaultScheduleId = useAuthStore((s) => s.setDefaultScheduleId)
  const schedulesQuery = useSchedules()
  const createScheduleMutation = useCreateSchedule()
  const publishScheduleMutation = usePublishSchedule()
  const lockScheduleMutation = useLockSchedule()

  return (
    <div style={{ maxWidth: 960, margin: '32px auto', padding: 16 }}>
      <h1>Escalas</h1>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Link to="/dashboard">Voltar</Link>
      </div>

      <div style={{ marginTop: 16 }}>
        <h2>Criar escala</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.currentTarget
            const month = (form.elements.namedItem('month') as HTMLInputElement).value
            if (!month) return
            createScheduleMutation.mutate({ monthReference: `${month}-01` })
          }}
          style={{ display: 'grid', gap: 12, maxWidth: 420 }}
        >
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Mês</span>
            <input name="month" type="month" required />
          </label>
          <button type="submit" disabled={createScheduleMutation.isPending}>
            {createScheduleMutation.isPending ? 'Criando...' : 'Criar'}
          </button>
          {createScheduleMutation.error ? (
            <div>Erro ao criar: {(createScheduleMutation.error as { message?: string }).message ?? 'erro'}</div>
          ) : null}
        </form>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>Lista</h2>
        {schedulesQuery.isLoading ? <div>Carregando...</div> : null}
        {schedulesQuery.error ? (
          <div>Erro ao carregar: {(schedulesQuery.error as { message?: string }).message ?? 'erro'}</div>
        ) : null}
        {schedulesQuery.data ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {schedulesQuery.data.length === 0 ? <div>Nenhuma escala.</div> : null}
            {schedulesQuery.data.map((s) => {
              const isActive = s.id === activeScheduleId
              return (
                <div key={s.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                  <div>
                    {s.monthReference} — {s.status}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      disabled={isActive}
                      onClick={() => {
                        setDefaultScheduleId(s.id)
                        navigate('/shifts')
                      }}
                    >
                      {isActive ? 'Em uso' : 'Usar'}
                    </button>
                    <button
                      type="button"
                      disabled={publishScheduleMutation.isPending || s.status !== 'DRAFT'}
                      onClick={() => publishScheduleMutation.mutate({ scheduleId: s.id })}
                    >
                      Publicar
                    </button>
                    <button
                      type="button"
                      disabled={lockScheduleMutation.isPending || s.status !== 'PUBLISHED'}
                      onClick={() => lockScheduleMutation.mutate(s.id)}
                    >
                      Bloquear
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const blob = await downloadAttendanceCsv({ scheduleId: s.id })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `attendance-${s.monthReference}.csv`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      Exportar CSV
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
