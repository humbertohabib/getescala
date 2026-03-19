import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useProfessionals } from '../../workforce/hooks/useProfessionals'
import { useSchedules } from '../../scheduling/hooks/useSchedules'
import { downloadAttendanceCsv } from '../../scheduling/api/downloadAttendanceCsv'
import { useAttendance } from '../hooks/useAttendance'
import { apiFetch } from '../../../core/api/client'

function toIsoFromDateTimeLocal(value: string) {
  if (!value) return ''
  return new Date(value).toISOString()
}

function toDateTimeLocalValue(iso: string) {
  const date = new Date(iso)
  const pad2 = (v: number) => String(v).padStart(2, '0')
  const yyyy = date.getFullYear()
  const mm = pad2(date.getMonth() + 1)
  const dd = pad2(date.getDate())
  const hh = pad2(date.getHours())
  const min = pad2(date.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

function formatMinutes(minutes: number) {
  const sign = minutes < 0 ? '-' : ''
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h}h${String(m).padStart(2, '0')}`
}

export function AttendancePage() {
  const [filters, setFilters] = useState(() => {
    const now = Date.now()
    return {
      from: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
      scheduleId: '',
      professionalId: '',
      kind: '',
    }
  })

  const shiftTypesQuery = useQuery({
    queryKey: ['shiftTypes'],
    queryFn: () =>
      apiFetch<Array<{ id: string; code: string; name: string; color: string | null; system: boolean }>>('/api/shift-types'),
  })

  const schedulesQuery = useSchedules()
  const professionalsQuery = useProfessionals()
  const attendanceQuery = useAttendance({
    from: filters.from,
    to: filters.to,
    scheduleId: filters.scheduleId || undefined,
    professionalId: filters.professionalId || undefined,
    kind: filters.kind || undefined,
  })

  const filteredScheduleOptions = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data])
  const filteredProfessionalOptions = useMemo(() => professionalsQuery.data ?? [], [professionalsQuery.data])
  const shiftTypeLabelByCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of shiftTypesQuery.data ?? []) map[t.code] = t.name
    return map
  }, [shiftTypesQuery.data])
  const summary = useMemo(() => {
    const rows = attendanceQuery.data ?? []
    const totalScheduledMinutes = rows.reduce((acc, r) => acc + r.scheduledMinutes, 0)
    const totalWorkedMinutes = rows.reduce((acc, r) => acc + (r.workedMinutes ?? 0), 0)
    const workedCount = rows.filter((r) => r.workedMinutes != null).length
    const missingCheckInCount = rows.filter((r) => r.checkInAt == null).length
    const missingCheckOutCount = rows.filter((r) => r.checkInAt != null && r.checkOutAt == null).length
    const totalDeltaMinutes = rows.reduce((acc, r) => acc + (r.deltaMinutes ?? 0), 0)
    return {
      totalScheduledMinutes,
      totalWorkedMinutes,
      workedCount,
      missingCheckInCount,
      missingCheckOutCount,
      totalDeltaMinutes,
      totalCount: rows.length,
    }
  }, [attendanceQuery.data])

  return (
    <div style={{ maxWidth: 960, margin: '32px auto', padding: 16 }}>
      <h1>Apontamentos</h1>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Link to="/dashboard">Voltar</Link>
      </div>

      <div style={{ marginTop: 16 }}>
        <h2>Filtros</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.currentTarget
            const fromLocal = (form.elements.namedItem('from') as HTMLInputElement).value
            const toLocal = (form.elements.namedItem('to') as HTMLInputElement).value
            const scheduleId = (form.elements.namedItem('scheduleId') as HTMLSelectElement).value
            const professionalId = (form.elements.namedItem('professionalId') as HTMLSelectElement).value
            const kind = (form.elements.namedItem('kind') as HTMLSelectElement).value

            setFilters((prev) => ({
              ...prev,
              from: toIsoFromDateTimeLocal(fromLocal) || prev.from,
              to: toIsoFromDateTimeLocal(toLocal) || prev.to,
              scheduleId,
              professionalId,
              kind,
            }))
          }}
          style={{ display: 'grid', gap: 12, maxWidth: 640 }}
        >
          <label style={{ display: 'grid', gap: 6 }}>
            <span>De</span>
            <input name="from" type="datetime-local" defaultValue={toDateTimeLocalValue(filters.from)} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Até</span>
            <input name="to" type="datetime-local" defaultValue={toDateTimeLocalValue(filters.to)} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Escala</span>
            <select name="scheduleId" defaultValue={filters.scheduleId}>
              <option value="">(Todas)</option>
              {filteredScheduleOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.monthReference} — {s.status}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Profissional</span>
            <select name="professionalId" defaultValue={filters.professionalId}>
              <option value="">(Todos)</option>
              {filteredProfessionalOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Tipo de plantão</span>
            <select name="kind" defaultValue={filters.kind}>
              <option value="">(Todos)</option>
              {(shiftTypesQuery.data ?? []).map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit">Aplicar</button>
            <button
              type="button"
              onClick={async () => {
                const blob = await downloadAttendanceCsv({
                  from: filters.from,
                  to: filters.to,
                  scheduleId: filters.scheduleId || undefined,
                  professionalId: filters.professionalId || undefined,
                  kind: filters.kind || undefined,
                })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'attendance.csv'
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              Exportar CSV
            </button>
          </div>
        </form>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>Lista</h2>
        {attendanceQuery.data ? (
          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            <div>Total registros: {summary.totalCount}</div>
            <div>Total previsto: {formatMinutes(summary.totalScheduledMinutes)}</div>
            <div>Total realizado: {formatMinutes(summary.totalWorkedMinutes)} ({summary.workedCount} com check-out)</div>
            <div>Delta total: {formatMinutes(summary.totalDeltaMinutes)}</div>
            <div>Sem check-in: {summary.missingCheckInCount}</div>
            <div>Sem check-out: {summary.missingCheckOutCount}</div>
          </div>
        ) : null}
        {attendanceQuery.isLoading ? <div>Carregando...</div> : null}
        {attendanceQuery.error ? (
          <div>Erro ao carregar: {(attendanceQuery.error as { message?: string }).message ?? 'erro'}</div>
        ) : null}
        {attendanceQuery.data ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {attendanceQuery.data.length === 0 ? <div>Nenhum registro no período.</div> : null}
            {attendanceQuery.data.map((r) => (
              <div key={r.shiftId} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <div>
                  {new Date(r.startTime).toLocaleString()} → {new Date(r.endTime).toLocaleString()}
                </div>
                <div>Tipo: {shiftTypeLabelByCode[r.kind] ?? r.kind}</div>
                <div>Status: {r.status}</div>
                <div>Profissional: {r.professionalName ?? r.professionalId ?? '-'}</div>
                <div>Previsto: {formatMinutes(r.scheduledMinutes)}</div>
                <div>
                  Realizado:{' '}
                  {r.workedMinutes == null ? '-' : `${formatMinutes(r.workedMinutes)} (Δ ${formatMinutes(r.deltaMinutes ?? 0)})`}
                </div>
                <div>Check-in: {r.checkInAt ? new Date(r.checkInAt).toLocaleString() : '-'}</div>
                <div>Check-out: {r.checkOutAt ? new Date(r.checkOutAt).toLocaleString() : '-'}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
