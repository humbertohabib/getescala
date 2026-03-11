import { Link } from 'react-router-dom'
import { useAuthStore } from '../../../app/store'
import { useCreateShift } from '../hooks/useCreateShift'
import { useShifts } from '../hooks/useShifts'
import { useState } from 'react'
import { useProfessionals } from '../../workforce/hooks/useProfessionals'
import { useSchedules } from '../../scheduling/hooks/useSchedules'
import { useCancelShift } from '../hooks/useCancelShift'
import { useCheckInShift } from '../hooks/useCheckInShift'
import { useCheckOutShift } from '../hooks/useCheckOutShift'
import { useUpdateShift } from '../hooks/useUpdateShift'

export function ShiftsPage() {
  const scheduleId = useAuthStore((s) => s.session.defaultScheduleId)
  const tenantId = useAuthStore((s) => s.session.tenantId)
  const setDefaultScheduleId = useAuthStore((s) => s.setDefaultScheduleId)
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [filterProfessionalId, setFilterProfessionalId] = useState<string>('')
  const [range] = useState(() => {
    const now = Date.now()
    return {
      from: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
  })

  const shiftsQuery = useShifts({
    ...range,
    scheduleId: scheduleId ?? undefined,
    professionalId: filterProfessionalId || undefined,
  })
  const createShiftMutation = useCreateShift()
  const cancelShiftMutation = useCancelShift()
  const checkInShiftMutation = useCheckInShift()
  const checkOutShiftMutation = useCheckOutShift()
  const updateShiftMutation = useUpdateShift()
  const professionalsQuery = useProfessionals()
  const schedulesQuery = useSchedules()
  const selectedScheduleStatus =
    (scheduleId ? schedulesQuery.data?.find((s) => s.id === scheduleId)?.status : null) ?? null
  const scheduleEditable = selectedScheduleStatus == null ? true : selectedScheduleStatus === 'DRAFT'
  const scheduleOperational = selectedScheduleStatus == null ? true : selectedScheduleStatus !== 'DRAFT'

  const toDateTimeLocalValue = (iso: string) => {
    const date = new Date(iso)
    const pad2 = (v: number) => String(v).padStart(2, '0')
    const yyyy = date.getFullYear()
    const mm = pad2(date.getMonth() + 1)
    const dd = pad2(date.getDate())
    const hh = pad2(date.getHours())
    const min = pad2(date.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  }

  return (
    <div style={{ maxWidth: 960, margin: '32px auto', padding: 16 }}>
      <h1>Turnos</h1>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Link to="/dashboard">Voltar</Link>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div>Tenant: {tenantId ?? '-'}</div>
            <div>
              Schedule: {scheduleId ?? '-'} {selectedScheduleStatus ? `(${selectedScheduleStatus})` : ''}
            </div>
        </div>
        {!scheduleOperational ? <div style={{ marginTop: 8 }}>Escala em DRAFT: check-in/check-out indisponíveis.</div> : null}

        <div style={{ marginTop: 16 }}>
          <h2>Novo turno</h2>
          {!scheduleId ? (
            <div>Faça login novamente para obter um schedule padrão.</div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                  if (!scheduleEditable) return
                const form = e.currentTarget
                const start = (form.elements.namedItem('start') as HTMLInputElement).value
                const end = (form.elements.namedItem('end') as HTMLInputElement).value
                const professionalId = (form.elements.namedItem('professionalId') as HTMLSelectElement).value
                const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
                const currency = (form.elements.namedItem('currency') as HTMLInputElement).value

                createShiftMutation.mutate({
                  scheduleId,
                  professionalId: professionalId ? professionalId : null,
                  startTime: new Date(start).toISOString(),
                  endTime: new Date(end).toISOString(),
                  valueCents: valueCentsRaw ? Number(valueCentsRaw) : null,
                  currency: currency || null,
                })
              }}
              style={{ display: 'grid', gap: 12, maxWidth: 420 }}
            >
              <label style={{ display: 'grid', gap: 6 }}>
                <span>Escala</span>
                <select
                  name="scheduleId"
                  value={scheduleId}
                  onChange={(e) => {
                    setDefaultScheduleId(e.target.value)
                  }}
                >
                  {schedulesQuery.data?.some((s) => s.id === scheduleId) ? null : (
                    <option value={scheduleId}>{scheduleId}</option>
                  )}
                  {(schedulesQuery.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.monthReference} — {s.status}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span>Profissional</span>
                <select name="professionalId" defaultValue="">
                  <option value="">(Sem profissional)</option>
                  {professionalsQuery.data?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  )) ?? null}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span>Início</span>
                <input name="start" type="datetime-local" required />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span>Fim</span>
                <input name="end" type="datetime-local" required />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span>Valor (centavos)</span>
                <input name="valueCents" type="number" min={0} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span>Moeda</span>
                <input name="currency" type="text" defaultValue="BRL" />
              </label>
                <button type="submit" disabled={createShiftMutation.isPending || !scheduleEditable}>
                {createShiftMutation.isPending ? 'Criando...' : 'Criar turno'}
              </button>
                {!scheduleEditable ? <div>Esta escala não pode mais ser editada.</div> : null}
              {createShiftMutation.error ? (
                <div>Erro ao criar: {(createShiftMutation.error as { message?: string }).message ?? 'erro'}</div>
              ) : null}
            </form>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <h2>Lista</h2>
          <div style={{ marginTop: 8, display: 'grid', gap: 8, maxWidth: 420 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Filtrar por profissional</span>
              <select
                value={filterProfessionalId}
                onChange={(e) => setFilterProfessionalId(e.target.value)}
              >
                <option value="">(Todos)</option>
                {professionalsQuery.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                )) ?? null}
              </select>
            </label>
          </div>
          {shiftsQuery.isLoading ? <div>Carregando...</div> : null}
          {shiftsQuery.error ? (
            <div>Erro ao carregar: {(shiftsQuery.error as { message?: string }).message ?? 'erro'}</div>
          ) : null}
          {shiftsQuery.data ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {shiftsQuery.data.length === 0 ? <div>Nenhum turno no período.</div> : null}
              {shiftsQuery.data.map((s) => (
                <div key={s.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                  <div>
                    {new Date(s.startTime).toLocaleString()} → {new Date(s.endTime).toLocaleString()}
                  </div>
                  <div>Status: {s.status}</div>
                  <div>
                    Valor: {s.valueCents ?? '-'} {s.currency ?? ''}
                  </div>
                  <div>
                    Profissional:{' '}
                    {s.professionalId
                      ? professionalsQuery.data?.find((p) => p.id === s.professionalId)?.fullName ?? s.professionalId
                      : '-'}
                  </div>
                  <div>
                    Check-in: {s.checkInAt ? new Date(s.checkInAt).toLocaleString() : '-'}
                  </div>
                  <div>
                    Check-out: {s.checkOutAt ? new Date(s.checkOutAt).toLocaleString() : '-'}
                  </div>
                  {editingShiftId === s.id ? (
                    <div style={{ marginTop: 12 }}>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          if (!scheduleEditable) return
                          const form = e.currentTarget
                          const start = (form.elements.namedItem('start') as HTMLInputElement).value
                          const end = (form.elements.namedItem('end') as HTMLInputElement).value
                          const professionalId = (form.elements.namedItem('professionalId') as HTMLSelectElement).value
                          const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
                          const currency = (form.elements.namedItem('currency') as HTMLInputElement).value

                          updateShiftMutation.mutate({
                            shiftId: s.id,
                            input: {
                              professionalId,
                              startTime: new Date(start).toISOString(),
                              endTime: new Date(end).toISOString(),
                              valueCents: valueCentsRaw ? Number(valueCentsRaw) : null,
                              currency: currency || null,
                            },
                          })
                          setEditingShiftId(null)
                        }}
                        style={{ display: 'grid', gap: 12, maxWidth: 420 }}
                      >
                        <label style={{ display: 'grid', gap: 6 }}>
                          <span>Profissional</span>
                          <select name="professionalId" defaultValue={s.professionalId ?? ''}>
                            <option value="">(Sem profissional)</option>
                            {professionalsQuery.data?.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.fullName}
                              </option>
                            )) ?? null}
                          </select>
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                          <span>Início</span>
                          <input name="start" type="datetime-local" required defaultValue={toDateTimeLocalValue(s.startTime)} />
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                          <span>Fim</span>
                          <input name="end" type="datetime-local" required defaultValue={toDateTimeLocalValue(s.endTime)} />
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                          <span>Valor (centavos)</span>
                          <input name="valueCents" type="number" min={0} defaultValue={s.valueCents ?? ''} />
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                          <span>Moeda</span>
                          <input name="currency" type="text" defaultValue={s.currency ?? 'BRL'} />
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="submit" disabled={updateShiftMutation.isPending || !scheduleEditable}>
                            Salvar
                          </button>
                          <button type="button" onClick={() => setEditingShiftId(null)}>
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : null}
                  {s.status !== 'CANCELLED' ? (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        disabled={cancelShiftMutation.isPending || !scheduleEditable}
                        onClick={() => cancelShiftMutation.mutate(s.id)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!scheduleEditable}
                        onClick={() => setEditingShiftId(s.id)}
                        style={{ marginLeft: 8 }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={
                          !scheduleOperational || checkInShiftMutation.isPending || !s.professionalId || Boolean(s.checkInAt)
                        }
                        onClick={() => checkInShiftMutation.mutate(s.id)}
                        style={{ marginLeft: 8 }}
                      >
                        Check-in
                      </button>
                      <button
                        type="button"
                        disabled={
                          !scheduleOperational ||
                          checkOutShiftMutation.isPending ||
                          !s.professionalId ||
                          !s.checkInAt ||
                          Boolean(s.checkOutAt)
                        }
                        onClick={() => checkOutShiftMutation.mutate(s.id)}
                        style={{ marginLeft: 8 }}
                      >
                        Check-out
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
