import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../app/store'
import { apiFetch } from '../../../core/api/client'
import { useScheduleTemplates } from '../../scheduling/hooks/useScheduleTemplates'
import {
  applyScheduleTemplate,
  clearScheduleTemplate,
  createScheduleTemplate,
  createScheduleTemplateShift,
  deleteScheduleTemplate,
  deleteScheduleTemplateShift,
  duplicateScheduleTemplate,
  exportScheduleTemplateCsv,
  listScheduleTemplateShifts,
  updateScheduleTemplate,
  updateScheduleTemplateShift,
} from '../../scheduling/api/scheduleTemplates'
import { cancelShift } from '../../shifts/api/cancelShift'
import { useCreateShift } from '../../shifts/hooks/useCreateShift'
import { useShifts } from '../../shifts/hooks/useShifts'
import { useUpdateShift } from '../../shifts/hooks/useUpdateShift'
import type { Shift } from '../../shifts/types/shift'
import type { Schedule } from '../../scheduling/types/schedule'
import type { ScheduleTemplate, ScheduleTemplateShift } from '../../scheduling/types/scheduleTemplate'
import { useProfessionals } from '../../workforce/hooks/useProfessionals'
import type { Professional } from '../../workforce/types/professional'
import { IconButton, SvgIcon, type IconName } from '../components/DashboardIcons'
import { AddProfessionalDialog } from '../components/AddProfessionalDialog'
import type { MonthlyLocation, MonthlySector } from '../types'
import { MonthlySchedulePanel } from './MonthlySchedulePanel'
import {
  dateIso,
  dateKeyLocal,
  formatTimeHHMM,
  startOfWeekMonday,
  toDateTimeLocalValue,
  toIsoUtcStartOfDayLocal,
} from '../utils/dateTime'
import { downloadLocalFile, formatBrlFromCents, formatPercentFromBps, parseBrlToCents, parsePercentToBps } from '../utils/format'

function parseJwtRoles(accessToken: string | null): string[] {
  if (!accessToken) return []
  const parts = accessToken.split('.')
  if (parts.length < 2) return []
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = atob(padded)
    const payload = JSON.parse(json) as unknown
    if (typeof payload !== 'object' || payload == null) return []
    const roles = (payload as Record<string, unknown>).roles
    if (!Array.isArray(roles)) return []
    return roles.filter((r) => typeof r === 'string') as string[]
  } catch {
    return []
  }
}

function parseJwtPermissions(accessToken: string | null): string[] {
  if (!accessToken) return []
  const parts = accessToken.split('.')
  if (parts.length < 2) return []
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = atob(padded)
    const payload = JSON.parse(json) as unknown
    if (typeof payload !== 'object' || payload == null) return []
    const permissions = (payload as Record<string, unknown>).permissions
    if (!Array.isArray(permissions)) return []
    return permissions.filter((p) => typeof p === 'string') as string[]
  } catch {
    return []
  }
}

function extractLatLngFromGoogleMapsUrl(url: string): { latitude: string; longitude: string } | null {
  const input = url.trim()
  if (!input) return null

  const atMatch = input.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (atMatch) return { latitude: atMatch[1], longitude: atMatch[2] }

  const bangMatch = input.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (bangMatch) return { latitude: bangMatch[1], longitude: bangMatch[2] }

  try {
    const u = new URL(input)
    const candidates = [u.searchParams.get('q'), u.searchParams.get('query'), u.searchParams.get('ll')]
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .map((v) => v.trim())

    for (const c of candidates) {
      const m = c.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
      if (m) return { latitude: m[1], longitude: m[2] }
    }
  } catch {
    void 0
  }

  return null
}

function WeeklySchedulePanel({
  scope,
  sectors,
}: {
  scope: { kind: 'loc' | 'sec'; id: string }
  sectors: MonthlySector[]
}) {
  const queryClient = useQueryClient()
  const professionalsQuery = useProfessionals()
  const createShiftMutation = useCreateShift()
  const updateShiftMutation = useUpdateShift()
  const shiftTypesQuery = useQuery({
    queryKey: ['shiftTypes'],
    queryFn: () =>
      apiFetch<Array<{ id: string; code: string; name: string; color: string | null; system: boolean }>>('/api/shift-types'),
  })

  const shiftSituationsQuery = useQuery({
    queryKey: ['shiftSituations'],
    queryFn: () =>
      apiFetch<Array<{ id: string; code: string; name: string; requiresCoverage: boolean; system: boolean }>>('/api/shift-situations'),
  })

  const [weekStart, setWeekStart] = useState<Date>(() => {
    try {
      const raw = window.localStorage.getItem('ge.scheduling.weekly.weekStart')
      if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [yyyy, mm, dd] = raw.split('-').map((v) => Number(v))
        if (Number.isFinite(yyyy) && Number.isFinite(mm) && Number.isFinite(dd)) return startOfWeekMonday(new Date(yyyy, mm - 1, dd, 12, 0, 0))
      }
    } catch {
      void 0
    }
    return startOfWeekMonday(new Date())
  })

  useEffect(() => {
    try {
      window.localStorage.setItem('ge.scheduling.weekly.weekStart', dateIso(weekStart))
    } catch {
      void 0
    }
  }, [weekStart])

  const weekEndExclusive = useMemo(
    () => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7, 12, 0, 0),
    [weekStart],
  )
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i, 12, 0, 0)),
    [weekStart],
  )

  const fromIso = useMemo(() => toIsoUtcStartOfDayLocal(weekStart), [weekStart])
  const toIso = useMemo(() => toIsoUtcStartOfDayLocal(weekEndExclusive), [weekEndExclusive])

  const monthFrom = useMemo(() => new Date(weekStart.getFullYear(), weekStart.getMonth(), 1, 12, 0, 0), [weekStart])
  const monthTo = useMemo(() => {
    const lastDay = new Date(weekEndExclusive.getFullYear(), weekEndExclusive.getMonth(), 0, 12, 0, 0)
    return new Date(lastDay.getFullYear(), lastDay.getMonth(), 1, 12, 0, 0)
  }, [weekEndExclusive])

  const schedulesFrom = useMemo(() => dateIso(monthFrom), [monthFrom])
  const schedulesTo = useMemo(() => dateIso(monthTo), [monthTo])

  const selectedSector = useMemo(() => {
    if (scope.kind !== 'sec') return null
    return sectors.find((s) => s.id === scope.id) ?? null
  }, [scope.id, scope.kind, sectors])

  const locationIdForSchedules = scope.kind === 'loc' ? scope.id : null
  const sectorIdForSchedules = scope.kind === 'sec' ? scope.id : null

  const locationIdForOperations = useMemo(() => {
    if (scope.kind === 'loc') return scope.id
    return selectedSector?.locationId ?? null
  }, [scope.id, scope.kind, selectedSector?.locationId])

  const sectorsInScope = useMemo(() => {
    if (scope.kind === 'sec') return selectedSector ? [selectedSector] : []
    return sectors.filter((s) => s.locationId === scope.id)
  }, [scope.id, scope.kind, sectors, selectedSector])

  const schedulesQuery = useQuery({
    queryKey: ['weeklySchedules', schedulesFrom, schedulesTo, locationIdForSchedules, sectorIdForSchedules],
    queryFn: () => {
      const qs = new URLSearchParams()
      qs.set('from', schedulesFrom)
      qs.set('to', schedulesTo)
      if (locationIdForSchedules) qs.set('locationId', locationIdForSchedules)
      if (sectorIdForSchedules) qs.set('sectorId', sectorIdForSchedules)
      return apiFetch<Schedule[]>(`/api/schedules?${qs.toString()}`)
    },
    enabled: Boolean(scope.id),
  })

  const scheduleById = useMemo(() => {
    const map: Record<string, Schedule> = {}
    for (const s of schedulesQuery.data ?? []) map[s.id] = s
    return map
  }, [schedulesQuery.data])

  const scheduleIdToSectorId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of schedulesQuery.data ?? []) {
      if (s.sectorId) map[s.id] = s.sectorId
    }
    return map
  }, [schedulesQuery.data])

  const scheduleIdsInScope = useMemo(() => new Set(Object.keys(scheduleById)), [scheduleById])

  const shiftsQuery = useShifts(
    { from: fromIso, to: toIso },
    { enabled: Boolean(scope.id) },
  )

  const shiftsInScope = useMemo(() => {
    const list = shiftsQuery.data ?? []
    if (!scheduleIdsInScope.size) return []
    return list.filter((s) => scheduleIdsInScope.has(s.scheduleId))
  }, [scheduleIdsInScope, shiftsQuery.data])

  const shiftsBySectorAndDay = useMemo(() => {
    const by: Record<string, Record<string, Shift[]>> = {}
    for (const s of shiftsInScope) {
      const sectorId = scheduleIdToSectorId[s.scheduleId]
      if (!sectorId) continue
      const dayKey = dateKeyLocal(new Date(s.startTime))
      if (!by[sectorId]) by[sectorId] = {}
      if (!by[sectorId][dayKey]) by[sectorId][dayKey] = []
      by[sectorId][dayKey].push(s)
    }
    for (const sectorId of Object.keys(by)) {
      for (const dayKey of Object.keys(by[sectorId])) {
        by[sectorId][dayKey].sort((a, b) => a.startTime.localeCompare(b.startTime))
      }
    }
    return by
  }, [scheduleIdToSectorId, shiftsInScope])

  const professionalNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of professionalsQuery.data ?? []) map[p.id] = p.fullName
    return map
  }, [professionalsQuery.data])

  const shiftTypeLabelByCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of shiftTypesQuery.data ?? []) map[t.code] = t.name
    return map
  }, [shiftTypesQuery.data])

  const shiftTypeColorByCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of shiftTypesQuery.data ?? []) {
      if (t.color) map[t.code] = t.color
    }
    return map
  }, [shiftTypesQuery.data])

  const shiftSituationByCode = useMemo(() => {
    const map: Record<string, { name: string; requiresCoverage: boolean }> = {}
    for (const s of shiftSituationsQuery.data ?? []) map[s.code] = { name: s.name, requiresCoverage: s.requiresCoverage }
    return map
  }, [shiftSituationsQuery.data])

  const weekLabel = useMemo(() => {
    try {
      const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(weekStart)
      return label.toUpperCase().replace(' DE ', '/')
    } catch {
      const yyyy = weekStart.getFullYear()
      const mm = String(weekStart.getMonth() + 1).padStart(2, '0')
      return `${mm}/${yyyy}`
    }
  }, [weekStart])

  const weekdayLabels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']
  const datePickerRef = useRef<HTMLInputElement | null>(null)

  function moveWeek(deltaWeeks: number) {
    const next = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + deltaWeeks * 7, 12, 0, 0)
    setWeekStart(startOfWeekMonday(next))
  }

  const replicateMutation = useMutation({
    mutationFn: async ({ sectorId }: { sectorId: string }) => {
      const qs = new URLSearchParams()
      qs.set('weekStart', dateIso(weekStart))
      if (locationIdForOperations) qs.set('locationId', locationIdForOperations)
      qs.set('sectorId', sectorId)
      return apiFetch<{ created: number; skipped: number }>(`/api/schedules/replicate-previous-week?${qs.toString()}`, { method: 'POST' })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })

  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(id)
  }, [toast])

  const [modal, setModal] = useState<
    | { open: false }
    | { open: true; mode: 'create'; dayKey: string; sectorId: string }
    | { open: true; mode: 'edit'; shiftId: string }
  >({ open: false })

  const shiftBeingEdited = useMemo(() => {
    if (!modal.open || modal.mode !== 'edit') return null
    const list = shiftsInScope ?? []
    return list.find((s) => s.id === modal.shiftId) ?? null
  }, [modal, shiftsInScope])

  const editableForShift = useMemo(() => {
    if (!shiftBeingEdited) return true
    const schedule = scheduleById[shiftBeingEdited.scheduleId]
    return schedule ? schedule.status === 'DRAFT' : true
  }, [scheduleById, shiftBeingEdited])

  const defaultCreateTimes = useMemo(() => {
    if (!modal.open || modal.mode !== 'create') return null
    const [yyyy, mm, dd] = modal.dayKey.split('-').map((v) => Number(v))
    if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null
    const start = new Date(yyyy, mm - 1, dd, 7, 0, 0)
    const end = new Date(yyyy, mm - 1, dd, 13, 0, 0)
    return { start: toDateTimeLocalValue(start.toISOString()), end: toDateTimeLocalValue(end.toISOString()) }
  }, [modal])

  async function ensureScheduleForDate(sectorId: string, dateTimeIso: string): Promise<Schedule> {
    const d = new Date(dateTimeIso)
    const monthReference = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const schedule = await apiFetch<Schedule>('/api/schedules', {
      method: 'POST',
      body: JSON.stringify({ monthReference, locationId: locationIdForOperations, sectorId }),
    })
    await queryClient.invalidateQueries({ queryKey: ['weeklySchedules'] })
    return schedule
  }

  async function submitCreateShift(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!modal.open || modal.mode !== 'create') return

    const form = e.currentTarget
    const start = (form.elements.namedItem('start') as HTMLInputElement).value
    const end = (form.elements.namedItem('end') as HTMLInputElement).value
    const professionalId = (form.elements.namedItem('professionalId') as HTMLSelectElement).value
    const fixedProfessionalId = (form.elements.namedItem('fixedProfessionalId') as HTMLSelectElement | null)?.value ?? ''
    const kind = (form.elements.namedItem('kind') as HTMLSelectElement | null)?.value ?? 'NORMAL'
    const situationCode = (form.elements.namedItem('situationCode') as HTMLSelectElement | null)?.value ?? 'DESIGNADO'
    const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
    const currency = (form.elements.namedItem('currency') as HTMLInputElement).value

    const startIso = new Date(start).toISOString()
    const endIso = new Date(end).toISOString()

    try {
      const requiresCoverage = shiftSituationByCode[situationCode]?.requiresCoverage ?? false
      if (requiresCoverage) {
        if (!professionalId || !fixedProfessionalId) {
          setToast('Selecione profissionais diferentes (fixo e de plantão).')
          return
        }
        if (professionalId === fixedProfessionalId) {
          setToast('Profissional fixo e de plantão precisam ser diferentes.')
          return
        }
      }
      const schedule = await ensureScheduleForDate(modal.sectorId, startIso)
      if (schedule.status !== 'DRAFT') {
        setToast('Esta escala não pode mais ser editada.')
        return
      }
      await createShiftMutation.mutateAsync({
        scheduleId: schedule.id,
        professionalId: professionalId ? professionalId : null,
        fixedProfessionalId: fixedProfessionalId ? fixedProfessionalId : null,
        kind,
        situationCode,
        startTime: startIso,
        endTime: endIso,
        valueCents: valueCentsRaw ? Number(valueCentsRaw) : null,
        currency: currency || null,
      })
      setModal({ open: false })
      setToast('Plantão criado.')
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setToast(message || 'Não foi possível criar o plantão.')
    }
  }

  async function submitEditShift(e: React.FormEvent<HTMLFormElement>, shiftId: string) {
    e.preventDefault()
    if (!shiftBeingEdited) return
    const form = e.currentTarget
    const start = (form.elements.namedItem('start') as HTMLInputElement).value
    const end = (form.elements.namedItem('end') as HTMLInputElement).value
    const professionalId = (form.elements.namedItem('professionalId') as HTMLSelectElement).value
    const fixedProfessionalId = (form.elements.namedItem('fixedProfessionalId') as HTMLSelectElement | null)?.value ?? ''
    const kind = (form.elements.namedItem('kind') as HTMLSelectElement | null)?.value ?? 'NORMAL'
    const situationCode = (form.elements.namedItem('situationCode') as HTMLSelectElement | null)?.value ?? shiftBeingEdited.situationCode ?? 'DESIGNADO'
    const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
    const currency = (form.elements.namedItem('currency') as HTMLInputElement).value

    try {
      const requiresCoverage = shiftSituationByCode[situationCode]?.requiresCoverage ?? false
      if (requiresCoverage) {
        if (!professionalId || !fixedProfessionalId) {
          setToast('Selecione profissionais diferentes (fixo e de plantão).')
          return
        }
        if (professionalId === fixedProfessionalId) {
          setToast('Profissional fixo e de plantão precisam ser diferentes.')
          return
        }
      }
      await updateShiftMutation.mutateAsync({
        shiftId,
        input: {
          professionalId: professionalId ? professionalId : null,
          fixedProfessionalId: fixedProfessionalId ? fixedProfessionalId : null,
          kind,
          situationCode,
          startTime: new Date(start).toISOString(),
          endTime: new Date(end).toISOString(),
          valueCents: valueCentsRaw ? Number(valueCentsRaw) : null,
          currency: currency || null,
        },
      })
      setModal({ open: false })
      setToast('Plantão atualizado.')
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setToast(message || 'Não foi possível salvar o plantão.')
    }
  }

  return (
    <section className="ge-weekly">
      <div className="ge-weeklyToolbar">
        <div className="ge-weeklyToolbarLeft">
          <button
            type="button"
            className="ge-iconButton ge-weeklyCalendarButton"
            aria-label="Selecionar semana"
            onClick={() => {
              const el = datePickerRef.current as (HTMLInputElement & { showPicker?: () => void }) | null
              if (!el) return
              if (typeof el.showPicker === 'function') el.showPicker()
              else el.click()
            }}
          >
            <span className="ge-iconButtonIcon">
              <SvgIcon name="calendar" />
            </span>
            <span className="ge-weeklyMonthLabel">{weekLabel}</span>
          </button>
          <input
            ref={datePickerRef}
            className="ge-weeklyDatePicker"
            type="date"
            value={dateIso(weekStart)}
            onChange={(e) => {
              const raw = e.target.value
              if (!raw) return
              const [yyyy, mm, dd] = raw.split('-').map((v) => Number(v))
              if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return
              setWeekStart(startOfWeekMonday(new Date(yyyy, mm - 1, dd, 12, 0, 0)))
            }}
            aria-label="Semana"
          />
          <button type="button" className="ge-weekNavButton" onClick={() => moveWeek(-1)} aria-label="Semana anterior">
            ‹
          </button>
        </div>

        <div className="ge-weeklyToolbarRight">
          <button type="button" className="ge-weekNavButton" onClick={() => moveWeek(1)} aria-label="Próxima semana">
            ›
          </button>
        </div>
      </div>

      <div className="ge-weeklyGrid">
        <div className="ge-weeklyHeaderRow">
          <div className="ge-weeklySectorHeader">Setor</div>
          {weekDays.map((d, idx) => (
            <div key={dateIso(d)} className="ge-weeklyDayHeader">
              <div className="ge-weeklyDayNumber">{String(d.getDate()).padStart(2, '0')}</div>
              <div className="ge-weeklyDayLabel">{weekdayLabels[idx]}</div>
            </div>
          ))}
        </div>

        {sectorsInScope.map((sector) => {
            const row = shiftsBySectorAndDay[sector.id] ?? {}
            const canReplicate = !replicateMutation.isPending
            return (
              <div key={sector.id} className="ge-weeklySectorRow">
                <div className="ge-weeklySectorCell">
                  <div className="ge-weeklySectorName">{sector.name}</div>
                  <button
                    type="button"
                    className="ge-buttonSecondary ge-weeklyReplicateButton"
                    disabled={!canReplicate}
                    onClick={async () => {
                      try {
                        const result = await replicateMutation.mutateAsync({ sectorId: sector.id })
                        setToast(`Replicado: ${result.created} | Ignorados: ${result.skipped}`)
                      } catch (err) {
                        const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                        setToast(message || 'Não foi possível replicar a semana.')
                      }
                    }}
                  >
                    Replicar Semana
                  </button>
                </div>

                {weekDays.map((d) => {
                  const dayKey = dateIso(d)
                  const shifts = row[dayKey] ?? []
                  return (
                    <div key={`${sector.id}:${dayKey}`} className="ge-weeklyDayCell">
                      <div className="ge-weeklyDayCellBody">
                        {shifts.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            className={`ge-shiftCard ${s.status === 'CANCELLED' ? 'ge-shiftCardCancelled' : ''}`}
                            onClick={() => setModal({ open: true, mode: 'edit', shiftId: s.id })}
                            style={
                              s.status === 'CANCELLED'
                                ? undefined
                                : shiftTypeColorByCode[s.kind ?? 'NORMAL']
                                  ? { borderLeftColor: shiftTypeColorByCode[s.kind ?? 'NORMAL'] }
                                  : undefined
                            }
                          >
                            <div style={{ minWidth: 0 }}>
                              <div className="ge-shiftCardName">
                                {s.professionalId ? professionalNameById[s.professionalId] ?? s.professionalId : '(Sem profissional)'}
                              </div>
                              <div style={{ fontWeight: 800, fontSize: 12, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {shiftTypeLabelByCode[s.kind ?? 'NORMAL'] ?? shiftKindLabel(s.kind ?? 'NORMAL')}
                              </div>
                            </div>
                            <div className="ge-shiftCardTime">
                              {formatTimeHHMM(s.startTime)}-{formatTimeHHMM(s.endTime)}
                            </div>
                          </button>
                        ))}
                        <button
                          type="button"
                          className="ge-weeklyAddShift"
                          onClick={() => setModal({ open: true, mode: 'create', dayKey, sectorId: sector.id })}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
      </div>

      {toast ? <div className="ge-toast">{toast}</div> : null}

      {modal.open ? (
        <div className="ge-modalOverlay" onClick={() => setModal({ open: false })}>
          <div className="ge-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ge-modalHeader">
              <div className="ge-modalTitle">
                {modal.mode === 'create'
                  ? `Novo plantão — ${modal.dayKey.split('-').reverse().join('/')}`
                  : `Editar plantão`}
              </div>
              <button type="button" className="ge-modalClose" onClick={() => setModal({ open: false })} aria-label="Fechar">
                ×
              </button>
            </div>

            <div className="ge-modalBody">
              {modal.mode === 'create' ? (
                <form className="ge-modalForm" onSubmit={(e) => void submitCreateShift(e)}>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Profissional de plantão</div>
                    <select className="ge-select" name="professionalId" defaultValue="">
                      <option value="">(Sem profissional)</option>
                      {(professionalsQuery.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Profissional fixo</div>
                    <select className="ge-select" name="fixedProfessionalId" defaultValue="">
                      <option value="">(Mesmo / não aplicável)</option>
                      {(professionalsQuery.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Tipo de Plantão</div>
                    <select className="ge-select" name="kind" defaultValue="NORMAL">
                      {(shiftTypesQuery.data ?? []).length ? (
                        (shiftTypesQuery.data ?? []).map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="NORMAL">Normal</option>
                          <option value="NOTURNO">Noturno</option>
                          <option value="FIM_DE_SEMANA">Fim de Semana</option>
                          <option value="FERIADO">Feriado</option>
                          <option value="OUTRO">Outro</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Situação do Plantão</div>
                    <select className="ge-select" name="situationCode" defaultValue="DESIGNADO">
                      {(shiftSituationsQuery.data ?? []).length ? (
                        (shiftSituationsQuery.data ?? []).map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="DESIGNADO">Designado</option>
                          <option value="FALTA_JUSTIFICADA">Falta Justificada</option>
                          <option value="FALTA_NAO_JUSTIFICADA">Falta Não Justificada</option>
                          <option value="FERIADO">Feriado</option>
                          <option value="FERIAS">Férias</option>
                          <option value="FOLGA">Folga</option>
                          <option value="TROCADO">Trocado</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Início</div>
                    <input className="ge-input" name="start" type="datetime-local" defaultValue={defaultCreateTimes?.start ?? ''} required />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Fim</div>
                    <input className="ge-input" name="end" type="datetime-local" defaultValue={defaultCreateTimes?.end ?? ''} required />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Valor (centavos)</div>
                    <input className="ge-input" name="valueCents" type="number" min={0} />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Moeda</div>
                    <input className="ge-input" name="currency" type="text" defaultValue="BRL" />
                  </label>
                  <div className="ge-modalActions">
                    <button type="button" className="ge-buttonSecondary" onClick={() => setModal({ open: false })}>
                      Cancelar
                    </button>
                    <button type="submit" className="ge-buttonPrimary" disabled={createShiftMutation.isPending}>
                      Criar
                    </button>
                  </div>
                </form>
              ) : (
                <form className="ge-modalForm" onSubmit={(e) => void submitEditShift(e, modal.shiftId)}>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Profissional de plantão</div>
                    <select className="ge-select" name="professionalId" defaultValue={shiftBeingEdited?.professionalId ?? ''} disabled={!editableForShift}>
                      <option value="">(Sem profissional)</option>
                      {(professionalsQuery.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Profissional fixo</div>
                    <select
                      className="ge-select"
                      name="fixedProfessionalId"
                      defaultValue={shiftBeingEdited?.fixedProfessionalId ?? shiftBeingEdited?.professionalId ?? ''}
                      disabled={!editableForShift}
                    >
                      <option value="">(Mesmo / não aplicável)</option>
                      {(professionalsQuery.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Tipo de Plantão</div>
                    <select className="ge-select" name="kind" defaultValue={shiftBeingEdited?.kind ?? 'NORMAL'} disabled={!editableForShift}>
                      {(shiftTypesQuery.data ?? []).length ? (
                        (shiftTypesQuery.data ?? []).map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="NORMAL">Normal</option>
                          <option value="NOTURNO">Noturno</option>
                          <option value="FIM_DE_SEMANA">Fim de Semana</option>
                          <option value="FERIADO">Feriado</option>
                          <option value="OUTRO">Outro</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Situação do Plantão</div>
                    <select className="ge-select" name="situationCode" defaultValue={shiftBeingEdited?.situationCode ?? 'DESIGNADO'} disabled={!editableForShift}>
                      {(shiftSituationsQuery.data ?? []).length ? (
                        (shiftSituationsQuery.data ?? []).map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="DESIGNADO">Designado</option>
                          <option value="FALTA_JUSTIFICADA">Falta Justificada</option>
                          <option value="FALTA_NAO_JUSTIFICADA">Falta Não Justificada</option>
                          <option value="FERIADO">Feriado</option>
                          <option value="FERIAS">Férias</option>
                          <option value="FOLGA">Folga</option>
                          <option value="TROCADO">Trocado</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Início</div>
                    <input className="ge-input" name="start" type="datetime-local" defaultValue={shiftBeingEdited ? toDateTimeLocalValue(shiftBeingEdited.startTime) : ''} required disabled={!editableForShift} />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Fim</div>
                    <input className="ge-input" name="end" type="datetime-local" defaultValue={shiftBeingEdited ? toDateTimeLocalValue(shiftBeingEdited.endTime) : ''} required disabled={!editableForShift} />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Valor (centavos)</div>
                    <input className="ge-input" name="valueCents" type="number" min={0} defaultValue={shiftBeingEdited?.valueCents ?? ''} disabled={!editableForShift} />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Moeda</div>
                    <input className="ge-input" name="currency" type="text" defaultValue={shiftBeingEdited?.currency ?? 'BRL'} disabled={!editableForShift} />
                  </label>
                  <div className="ge-modalActions">
                    <button type="button" className="ge-buttonSecondary" onClick={() => setModal({ open: false })}>
                      Fechar
                    </button>
                    <button type="submit" className="ge-buttonPrimary" disabled={updateShiftMutation.isPending || !editableForShift}>
                      Salvar
                    </button>
                  </div>
                  {!editableForShift ? <div className="ge-weeklyHint">Esta escala não pode mais ser editada.</div> : null}
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function isoMinutesDiff(startIso: string, endIso: string): number {
  const start = Date.parse(startIso)
  const end = Date.parse(endIso)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  return Math.max(0, Math.round((end - start) / 60000))
}

function formatHoursFromMinutes(totalMinutes: number): string {
  const hours = totalMinutes / 60
  try {
    const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(hours)
    return `${formatted}h`
  } catch {
    return `${hours.toFixed(1)}h`
  }
}

function ProfessionalSchedulePanel({
  locations,
  sectors,
  scopeValue,
  search,
}: {
  locations: MonthlyLocation[]
  sectors: MonthlySector[]
  scopeValue: string
  search: string
}) {
  const queryClient = useQueryClient()
  const professionalsQuery = useProfessionals()
  const createShiftMutation = useCreateShift()
  const updateShiftMutation = useUpdateShift()
  const shiftTypesQuery = useQuery({
    queryKey: ['shiftTypes'],
    queryFn: () =>
      apiFetch<Array<{ id: string; code: string; name: string; color: string | null; system: boolean }>>('/api/shift-types'),
  })

  const shiftSituationsQuery = useQuery({
    queryKey: ['shiftSituations'],
    queryFn: () =>
      apiFetch<Array<{ id: string; code: string; name: string; requiresCoverage: boolean; system: boolean }>>('/api/shift-situations'),
  })

  const [weekStart, setWeekStart] = useState<Date>(() => {
    try {
      const raw = window.localStorage.getItem('ge.scheduling.professional.weekStart')
      if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [yyyy, mm, dd] = raw.split('-').map((v) => Number(v))
        if (Number.isFinite(yyyy) && Number.isFinite(mm) && Number.isFinite(dd)) return startOfWeekMonday(new Date(yyyy, mm - 1, dd, 12, 0, 0))
      }
    } catch {
      void 0
    }
    return startOfWeekMonday(new Date())
  })

  useEffect(() => {
    try {
      window.localStorage.setItem('ge.scheduling.professional.weekStart', dateIso(weekStart))
    } catch {
      void 0
    }
  }, [weekStart])

  const effectiveScopeValue = scopeValue || 'all'

  const scope = useMemo(() => {
    if (effectiveScopeValue.startsWith('loc:')) {
      const id = effectiveScopeValue.slice(4)
      if (locations.some((l) => l.id === id)) return { kind: 'loc' as const, id }
    }
    if (effectiveScopeValue.startsWith('sec:')) {
      const id = effectiveScopeValue.slice(4)
      if (sectors.some((s) => s.id === id)) return { kind: 'sec' as const, id }
    }
    return { kind: 'all' as const }
  }, [effectiveScopeValue, locations, sectors])

  const selectedSector = useMemo(() => {
    if (scope.kind !== 'sec') return null
    return sectors.find((s) => s.id === scope.id) ?? null
  }, [scope, sectors])

  const sectorsInScope = useMemo(() => {
    if (scope.kind === 'sec') return selectedSector ? [selectedSector] : []
    if (scope.kind === 'loc') return sectors.filter((s) => s.locationId === scope.id)
    return sectors
  }, [scope, sectors, selectedSector])

  const sectorNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of sectors) map[s.id] = s.name
    return map
  }, [sectors])

  const weekEndExclusive = useMemo(
    () => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7, 12, 0, 0),
    [weekStart],
  )
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i, 12, 0, 0)),
    [weekStart],
  )

  const fromIso = useMemo(() => toIsoUtcStartOfDayLocal(weekStart), [weekStart])
  const toIso = useMemo(() => toIsoUtcStartOfDayLocal(weekEndExclusive), [weekEndExclusive])

  const monthFrom = useMemo(() => new Date(weekStart.getFullYear(), weekStart.getMonth(), 1, 12, 0, 0), [weekStart])
  const monthTo = useMemo(() => {
    const lastWeekDay = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 12, 0, 0)
    return new Date(lastWeekDay.getFullYear(), lastWeekDay.getMonth(), 1, 12, 0, 0)
  }, [weekStart])

  const schedulesFrom = useMemo(() => dateIso(monthFrom), [monthFrom])
  const schedulesTo = useMemo(() => dateIso(monthTo), [monthTo])

  const locationIdForSchedules = scope.kind === 'loc' ? scope.id : null
  const sectorIdForSchedules = scope.kind === 'sec' ? scope.id : null

  const schedulesQuery = useQuery({
    queryKey: ['professionalSchedules', schedulesFrom, schedulesTo, locationIdForSchedules, sectorIdForSchedules],
    queryFn: () => {
      const qs = new URLSearchParams()
      qs.set('from', schedulesFrom)
      qs.set('to', schedulesTo)
      if (locationIdForSchedules) qs.set('locationId', locationIdForSchedules)
      if (sectorIdForSchedules) qs.set('sectorId', sectorIdForSchedules)
      return apiFetch<Schedule[]>(`/api/schedules?${qs.toString()}`)
    },
  })

  const scheduleById = useMemo(() => {
    const map: Record<string, Schedule> = {}
    for (const s of schedulesQuery.data ?? []) map[s.id] = s
    return map
  }, [schedulesQuery.data])

  const scheduleIdToSectorId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of schedulesQuery.data ?? []) {
      if (s.sectorId) map[s.id] = s.sectorId
    }
    return map
  }, [schedulesQuery.data])

  const scheduleIdsInScope = useMemo(() => new Set(Object.keys(scheduleById)), [scheduleById])

  const shiftsQuery = useShifts({ from: fromIso, to: toIso })

  const shiftsInScope = useMemo(() => {
    const list = shiftsQuery.data ?? []
    if (!scheduleIdsInScope.size) return []
    return list.filter((s) => scheduleIdsInScope.has(s.scheduleId))
  }, [scheduleIdsInScope, shiftsQuery.data])

  const professionalNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of professionalsQuery.data ?? []) map[p.id] = p.fullName
    return map
  }, [professionalsQuery.data])

  const shiftTypeLabelByCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of shiftTypesQuery.data ?? []) map[t.code] = t.name
    return map
  }, [shiftTypesQuery.data])

  const shiftTypeColorByCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of shiftTypesQuery.data ?? []) {
      if (t.color) map[t.code] = t.color
    }
    return map
  }, [shiftTypesQuery.data])

  const shiftSituationByCode = useMemo(() => {
    const map: Record<string, { name: string; requiresCoverage: boolean }> = {}
    for (const s of shiftSituationsQuery.data ?? []) map[s.code] = { name: s.name, requiresCoverage: s.requiresCoverage }
    return map
  }, [shiftSituationsQuery.data])

  const shiftsByProfessionalAndDay = useMemo(() => {
    const by: Record<string, Record<string, Shift[]>> = {}
    for (const s of shiftsInScope) {
      if (!s.professionalId) continue
      const dayKey = dateKeyLocal(new Date(s.startTime))
      if (!by[s.professionalId]) by[s.professionalId] = {}
      if (!by[s.professionalId][dayKey]) by[s.professionalId][dayKey] = []
      by[s.professionalId][dayKey].push(s)
    }
    for (const professionalId of Object.keys(by)) {
      for (const dayKey of Object.keys(by[professionalId])) {
        by[professionalId][dayKey].sort((a, b) => a.startTime.localeCompare(b.startTime))
      }
    }
    return by
  }, [shiftsInScope])

  const weeklyMinutesByProfessionalId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of shiftsInScope) {
      if (!s.professionalId) continue
      map[s.professionalId] = (map[s.professionalId] ?? 0) + isoMinutesDiff(s.startTime, s.endTime)
    }
    return map
  }, [shiftsInScope])

  const professionalIdsInScope = useMemo(() => {
    const set = new Set<string>()
    for (const s of shiftsInScope) {
      if (s.professionalId) set.add(s.professionalId)
    }
    return set
  }, [shiftsInScope])

  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search])

  const professionalsForRows = useMemo(() => {
    const base = (professionalsQuery.data ?? []).map((p) => ({ id: p.id, fullName: p.fullName }))
    const missingIds: string[] = []
    for (const id of professionalIdsInScope) {
      if (!professionalNameById[id]) missingIds.push(id)
    }
    missingIds.sort((a, b) => a.localeCompare(b))
    for (const id of missingIds) base.push({ id, fullName: id })
    base.sort((a, b) => a.fullName.localeCompare(b.fullName))
    if (normalizedSearch) return base.filter((p) => p.fullName.toLowerCase().includes(normalizedSearch) || p.id.toLowerCase().includes(normalizedSearch))
    return base.filter((p) => professionalIdsInScope.has(p.id))
  }, [normalizedSearch, professionalIdsInScope, professionalNameById, professionalsQuery.data])

  const weekLabel = useMemo(() => {
    try {
      const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(weekStart)
      return label.toUpperCase().replace(' DE ', '/')
    } catch {
      const yyyy = weekStart.getFullYear()
      const mm = String(weekStart.getMonth() + 1).padStart(2, '0')
      return `${mm}/${yyyy}`
    }
  }, [weekStart])

  const weekdayLabels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']
  const datePickerRef = useRef<HTMLInputElement | null>(null)

  function moveWeek(deltaWeeks: number) {
    const next = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + deltaWeeks * 7, 12, 0, 0)
    setWeekStart(startOfWeekMonday(next))
  }

  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(id)
  }, [toast])

  const [modal, setModal] = useState<
    | { open: false }
    | { open: true; mode: 'create'; professionalId: string | null }
    | { open: true; mode: 'edit'; shiftId: string }
  >({ open: false })

  const shiftBeingEdited = useMemo(() => {
    if (!modal.open || modal.mode !== 'edit') return null
    const list = shiftsInScope ?? []
    return list.find((s) => s.id === modal.shiftId) ?? null
  }, [modal, shiftsInScope])

  const editableForShift = useMemo(() => {
    if (!shiftBeingEdited) return true
    const schedule = scheduleById[shiftBeingEdited.scheduleId]
    return schedule ? schedule.status === 'DRAFT' : true
  }, [scheduleById, shiftBeingEdited])

  const defaultCreateTimes = useMemo(() => {
    if (!modal.open || modal.mode !== 'create') return null
    const start = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 7, 0, 0)
    const end = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 13, 0, 0)
    return { start: toDateTimeLocalValue(start.toISOString()), end: toDateTimeLocalValue(end.toISOString()) }
  }, [modal, weekStart])

  async function ensureScheduleForDate(sectorId: string, dateTimeIso: string): Promise<Schedule> {
    const d = new Date(dateTimeIso)
    const monthReference = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const sector = sectors.find((s) => s.id === sectorId) ?? null
    const locationId = scope.kind === 'loc' ? scope.id : sector?.locationId ?? null
    const schedule = await apiFetch<Schedule>('/api/schedules', {
      method: 'POST',
      body: JSON.stringify({ monthReference, locationId, sectorId }),
    })
    await queryClient.invalidateQueries({ queryKey: ['professionalSchedules'] })
    return schedule
  }

  async function submitCreateShift(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!modal.open || modal.mode !== 'create') return

    const form = e.currentTarget
    const sectorId = (form.elements.namedItem('sectorId') as HTMLSelectElement).value
    const start = (form.elements.namedItem('start') as HTMLInputElement).value
    const end = (form.elements.namedItem('end') as HTMLInputElement).value
    const professionalId = (form.elements.namedItem('professionalId') as HTMLSelectElement).value
    const fixedProfessionalId = (form.elements.namedItem('fixedProfessionalId') as HTMLSelectElement | null)?.value ?? ''
    const kind = (form.elements.namedItem('kind') as HTMLSelectElement | null)?.value ?? 'NORMAL'
    const situationCode = (form.elements.namedItem('situationCode') as HTMLSelectElement | null)?.value ?? 'DESIGNADO'
    const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
    const currency = (form.elements.namedItem('currency') as HTMLInputElement).value

    if (!sectorId) {
      setToast('Selecione um setor.')
      return
    }

    const startIso = new Date(start).toISOString()
    const endIso = new Date(end).toISOString()

    try {
      const requiresCoverage = shiftSituationByCode[situationCode]?.requiresCoverage ?? false
      if (requiresCoverage) {
        if (!professionalId || !fixedProfessionalId) {
          setToast('Selecione profissionais diferentes (fixo e de plantão).')
          return
        }
        if (professionalId === fixedProfessionalId) {
          setToast('Profissional fixo e de plantão precisam ser diferentes.')
          return
        }
      }
      const schedule = await ensureScheduleForDate(sectorId, startIso)
      if (schedule.status !== 'DRAFT') {
        setToast('Esta escala não pode mais ser editada.')
        return
      }
      await createShiftMutation.mutateAsync({
        scheduleId: schedule.id,
        professionalId: professionalId ? professionalId : null,
        fixedProfessionalId: fixedProfessionalId ? fixedProfessionalId : null,
        kind,
        situationCode,
        startTime: startIso,
        endTime: endIso,
        valueCents: valueCentsRaw ? Number(valueCentsRaw) : null,
        currency: currency || null,
      })
      setModal({ open: false })
      setToast('Plantão criado.')
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setToast(message || 'Não foi possível criar o plantão.')
    }
  }

  async function submitEditShift(e: React.FormEvent<HTMLFormElement>, shiftId: string) {
    e.preventDefault()
    if (!shiftBeingEdited) return
    const form = e.currentTarget
    const start = (form.elements.namedItem('start') as HTMLInputElement).value
    const end = (form.elements.namedItem('end') as HTMLInputElement).value
    const professionalId = (form.elements.namedItem('professionalId') as HTMLSelectElement).value
    const fixedProfessionalId = (form.elements.namedItem('fixedProfessionalId') as HTMLSelectElement | null)?.value ?? ''
    const kind = (form.elements.namedItem('kind') as HTMLSelectElement | null)?.value ?? 'NORMAL'
    const situationCode = (form.elements.namedItem('situationCode') as HTMLSelectElement | null)?.value ?? shiftBeingEdited.situationCode ?? 'DESIGNADO'
    const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
    const currency = (form.elements.namedItem('currency') as HTMLInputElement).value

    try {
      const requiresCoverage = shiftSituationByCode[situationCode]?.requiresCoverage ?? false
      if (requiresCoverage) {
        if (!professionalId || !fixedProfessionalId) {
          setToast('Selecione profissionais diferentes (fixo e de plantão).')
          return
        }
        if (professionalId === fixedProfessionalId) {
          setToast('Profissional fixo e de plantão precisam ser diferentes.')
          return
        }
      }
      await updateShiftMutation.mutateAsync({
        shiftId,
        input: {
          professionalId: professionalId ? professionalId : null,
          fixedProfessionalId: fixedProfessionalId ? fixedProfessionalId : null,
          kind,
          situationCode,
          startTime: new Date(start).toISOString(),
          endTime: new Date(end).toISOString(),
          valueCents: valueCentsRaw ? Number(valueCentsRaw) : null,
          currency: currency || null,
        },
      })
      setModal({ open: false })
      setToast('Plantão atualizado.')
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setToast(message || 'Não foi possível salvar o plantão.')
    }
  }

  const scheduleError = useMemo(() => {
    if (!schedulesQuery.error) return null
    const err = schedulesQuery.error as unknown
    const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : ''
    return message || 'Não foi possível carregar as escalas.'
  }, [schedulesQuery.error])

  const shiftsError = useMemo(() => {
    if (!shiftsQuery.error) return null
    const err = shiftsQuery.error as unknown
    const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : ''
    return message || 'Não foi possível carregar os plantões.'
  }, [shiftsQuery.error])

  return (
    <section className="ge-professional">
      <div className="ge-professionalToolbar">
        <div className="ge-professionalToolbarLeft">
          <button type="button" className="ge-weekNavButton" onClick={() => moveWeek(-1)} aria-label="Semana anterior">
            ‹
          </button>
        </div>

        <div className="ge-professionalToolbarCenter">
          <button
            type="button"
            className="ge-iconButton ge-weeklyCalendarButton"
            aria-label="Selecionar semana"
            onClick={() => {
              const el = datePickerRef.current as (HTMLInputElement & { showPicker?: () => void }) | null
              if (!el) return
              if (typeof el.showPicker === 'function') el.showPicker()
              else el.click()
            }}
          >
            <span className="ge-iconButtonIcon">
              <SvgIcon name="calendar" />
            </span>
            <span className="ge-weeklyMonthLabel">{weekLabel}</span>
          </button>
          <input
            ref={datePickerRef}
            className="ge-weeklyDatePicker"
            type="date"
            value={dateIso(weekStart)}
            onChange={(e) => {
              const raw = e.target.value
              if (!raw) return
              const [yyyy, mm, dd] = raw.split('-').map((v) => Number(v))
              if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return
              setWeekStart(startOfWeekMonday(new Date(yyyy, mm - 1, dd, 12, 0, 0)))
            }}
            aria-label="Semana"
          />
        </div>

        <div className="ge-professionalToolbarRight">
          <button type="button" className="ge-weekNavButton" onClick={() => moveWeek(1)} aria-label="Próxima semana">
            ›
          </button>
        </div>
      </div>

      {scheduleError ? <div className="ge-monthlyError">{scheduleError}</div> : null}
      {shiftsError ? <div className="ge-monthlyError">{shiftsError}</div> : null}

      <div className="ge-professionalGrid">
        <div className="ge-professionalHeaderRow">
          <div className="ge-professionalProfessionalHeader">Profissional</div>
          {weekDays.map((d, idx) => (
            <div key={dateIso(d)} className="ge-professionalDayHeader">
              <div className="ge-professionalDayNumber">{String(d.getDate()).padStart(2, '0')}</div>
              <div className="ge-professionalDayLabel">{weekdayLabels[idx]}</div>
            </div>
          ))}
        </div>

        {professionalsForRows.length ? (
          professionalsForRows.map((p) => {
            const row = shiftsByProfessionalAndDay[p.id] ?? {}
            const weeklyMinutes = weeklyMinutesByProfessionalId[p.id] ?? 0
            return (
              <div key={p.id} className="ge-professionalRow">
                <div className="ge-professionalProfessionalCell">
                  <div className="ge-professionalProfessionalTop">
                    <div className="ge-professionalName">{p.fullName}</div>
                    <div className="ge-professionalHours">{formatHoursFromMinutes(weeklyMinutes)}</div>
                  </div>
                  <button
                    type="button"
                    className="ge-buttonSecondary ge-professionalCreateButton"
                    onClick={() => setModal({ open: true, mode: 'create', professionalId: p.id })}
                  >
                    Criar Plantão
                  </button>
                </div>

                {weekDays.map((d) => {
                  const dayKey = dateIso(d)
                  const shifts = row[dayKey] ?? []
                  return (
                    <div key={`${p.id}:${dayKey}`} className="ge-professionalDayCell">
                      <div className="ge-professionalDayCellBody">
                        {shifts.map((s) => {
                          const sectorId = scheduleIdToSectorId[s.scheduleId]
                          const sectorName = sectorId ? sectorNameById[sectorId] ?? sectorId : s.scheduleId
                          return (
                            <button
                              key={s.id}
                              type="button"
                              className={`ge-shiftCard ${s.status === 'CANCELLED' ? 'ge-shiftCardCancelled' : ''}`}
                              onClick={() => setModal({ open: true, mode: 'edit', shiftId: s.id })}
                              style={
                                s.status === 'CANCELLED'
                                  ? undefined
                                  : shiftTypeColorByCode[s.kind ?? 'NORMAL']
                                    ? { borderLeftColor: shiftTypeColorByCode[s.kind ?? 'NORMAL'] }
                                    : undefined
                              }
                            >
                              <div style={{ minWidth: 0 }}>
                                <div className="ge-shiftCardName">{sectorName}</div>
                                <div style={{ fontWeight: 800, fontSize: 12, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {shiftTypeLabelByCode[s.kind ?? 'NORMAL'] ?? shiftKindLabel(s.kind ?? 'NORMAL')}
                                </div>
                              </div>
                              <div className="ge-shiftCardTime">
                                {formatTimeHHMM(s.startTime)}-{formatTimeHHMM(s.endTime)}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        ) : (
          <div className="ge-professionalEmpty">Nenhum profissional encontrado.</div>
        )}
      </div>

      {toast ? <div className="ge-toast">{toast}</div> : null}

      {modal.open ? (
        <div className="ge-modalOverlay" onClick={() => setModal({ open: false })}>
          <div className="ge-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ge-modalHeader">
              <div className="ge-modalTitle">{modal.mode === 'create' ? 'Novo plantão' : 'Editar plantão'}</div>
              <button type="button" className="ge-modalClose" onClick={() => setModal({ open: false })} aria-label="Fechar">
                ×
              </button>
            </div>

            <div className="ge-modalBody">
              {modal.mode === 'create' ? (
                <form className="ge-modalForm" onSubmit={(e) => void submitCreateShift(e)}>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Setor</div>
                    <select className="ge-select" name="sectorId" defaultValue={scope.kind === 'sec' ? scope.id : ''} disabled={scope.kind === 'sec'}>
                      <option value="">Selecione</option>
                      {sectorsInScope.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Profissional de plantão</div>
                    <select className="ge-select" name="professionalId" defaultValue={modal.professionalId ?? ''}>
                      <option value="">(Sem profissional)</option>
                      {(professionalsQuery.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Profissional fixo</div>
                    <select className="ge-select" name="fixedProfessionalId" defaultValue="">
                      <option value="">(Mesmo / não aplicável)</option>
                      {(professionalsQuery.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Tipo de Plantão</div>
                    <select className="ge-select" name="kind" defaultValue="NORMAL">
                      {(shiftTypesQuery.data ?? []).length ? (
                        (shiftTypesQuery.data ?? []).map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="NORMAL">Normal</option>
                          <option value="NOTURNO">Noturno</option>
                          <option value="FIM_DE_SEMANA">Fim de Semana</option>
                          <option value="FERIADO">Feriado</option>
                          <option value="OUTRO">Outro</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Situação do Plantão</div>
                    <select className="ge-select" name="situationCode" defaultValue="DESIGNADO">
                      {(shiftSituationsQuery.data ?? []).length ? (
                        (shiftSituationsQuery.data ?? []).map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="DESIGNADO">Designado</option>
                          <option value="FALTA_JUSTIFICADA">Falta Justificada</option>
                          <option value="FALTA_NAO_JUSTIFICADA">Falta Não Justificada</option>
                          <option value="FERIADO">Feriado</option>
                          <option value="FERIAS">Férias</option>
                          <option value="FOLGA">Folga</option>
                          <option value="TROCADO">Trocado</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Início</div>
                    <input className="ge-input" name="start" type="datetime-local" defaultValue={defaultCreateTimes?.start ?? ''} required />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Fim</div>
                    <input className="ge-input" name="end" type="datetime-local" defaultValue={defaultCreateTimes?.end ?? ''} required />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Valor (centavos)</div>
                    <input className="ge-input" name="valueCents" type="number" min={0} />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Moeda</div>
                    <input className="ge-input" name="currency" type="text" defaultValue="BRL" />
                  </label>
                  <div className="ge-modalActions">
                    <button type="button" className="ge-buttonSecondary" onClick={() => setModal({ open: false })}>
                      Cancelar
                    </button>
                    <button type="submit" className="ge-buttonPrimary" disabled={createShiftMutation.isPending}>
                      Criar
                    </button>
                  </div>
                </form>
              ) : (
                <form className="ge-modalForm" onSubmit={(e) => void submitEditShift(e, modal.shiftId)}>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Setor</div>
                    <input
                      className="ge-input"
                      type="text"
                      value={(() => {
                        const sectorId = shiftBeingEdited ? scheduleIdToSectorId[shiftBeingEdited.scheduleId] : ''
                        if (!sectorId) return ''
                        return sectorNameById[sectorId] ?? sectorId
                      })()}
                      readOnly
                    />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Profissional de plantão</div>
                    <select className="ge-select" name="professionalId" defaultValue={shiftBeingEdited?.professionalId ?? ''} disabled={!editableForShift}>
                      <option value="">(Sem profissional)</option>
                      {(professionalsQuery.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Profissional fixo</div>
                    <select
                      className="ge-select"
                      name="fixedProfessionalId"
                      defaultValue={shiftBeingEdited?.fixedProfessionalId ?? shiftBeingEdited?.professionalId ?? ''}
                      disabled={!editableForShift}
                    >
                      <option value="">(Mesmo / não aplicável)</option>
                      {(professionalsQuery.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Tipo de Plantão</div>
                    <select className="ge-select" name="kind" defaultValue={shiftBeingEdited?.kind ?? 'NORMAL'} disabled={!editableForShift}>
                      {(shiftTypesQuery.data ?? []).length ? (
                        (shiftTypesQuery.data ?? []).map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="NORMAL">Normal</option>
                          <option value="NOTURNO">Noturno</option>
                          <option value="FIM_DE_SEMANA">Fim de Semana</option>
                          <option value="FERIADO">Feriado</option>
                          <option value="OUTRO">Outro</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Situação do Plantão</div>
                    <select className="ge-select" name="situationCode" defaultValue={shiftBeingEdited?.situationCode ?? 'DESIGNADO'} disabled={!editableForShift}>
                      {(shiftSituationsQuery.data ?? []).length ? (
                        (shiftSituationsQuery.data ?? []).map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="DESIGNADO">Designado</option>
                          <option value="FALTA_JUSTIFICADA">Falta Justificada</option>
                          <option value="FALTA_NAO_JUSTIFICADA">Falta Não Justificada</option>
                          <option value="FERIADO">Feriado</option>
                          <option value="FERIAS">Férias</option>
                          <option value="FOLGA">Folga</option>
                          <option value="TROCADO">Trocado</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Início</div>
                    <input className="ge-input" name="start" type="datetime-local" defaultValue={shiftBeingEdited ? toDateTimeLocalValue(shiftBeingEdited.startTime) : ''} required disabled={!editableForShift} />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Fim</div>
                    <input className="ge-input" name="end" type="datetime-local" defaultValue={shiftBeingEdited ? toDateTimeLocalValue(shiftBeingEdited.endTime) : ''} required disabled={!editableForShift} />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Valor (centavos)</div>
                    <input className="ge-input" name="valueCents" type="number" min={0} defaultValue={shiftBeingEdited?.valueCents ?? ''} disabled={!editableForShift} />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Moeda</div>
                    <input className="ge-input" name="currency" type="text" defaultValue={shiftBeingEdited?.currency ?? 'BRL'} disabled={!editableForShift} />
                  </label>
                  <div className="ge-modalActions">
                    <button type="button" className="ge-buttonSecondary" onClick={() => setModal({ open: false })}>
                      Fechar
                    </button>
                    <button type="submit" className="ge-buttonPrimary" disabled={updateShiftMutation.isPending || !editableForShift}>
                      Salvar
                    </button>
                  </div>
                  {!editableForShift ? <div className="ge-weeklyHint">Esta escala não pode mais ser editada.</div> : null}
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function timeToInputValue(value: string | null | undefined): string {
  if (!value) return ''
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value.slice(0, 5)
  if (/^\d{2}:\d{2}$/.test(value)) return value
  return ''
}

function timeToPayloadValue(value: string): string {
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`
  return value
}

function timeToMinutes(value: string): number {
  if (!/^\d{2}:\d{2}$/.test(value)) return 0
  const [hh, mm] = value.split(':').map((v) => Number(v))
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0
  return hh * 60 + mm
}

function minutesToTime(value: number): string {
  const normalized = ((value % 1440) + 1440) % 1440
  const hh = String(Math.floor(normalized / 60)).padStart(2, '0')
  const mm = String(normalized % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

function minutesToDuration(value: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, value))
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0')
  const mm = String(clamped % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

function shiftKindLabel(kind: string | null | undefined): string {
  if (!kind) return 'Normal'
  if (kind === 'NORMAL') return 'Normal'
  if (kind === 'NOTURNO') return 'Noturno'
  if (kind === 'FIM_DE_SEMANA') return 'Fim de Semana'
  if (kind === 'FERIADO') return 'Feriado'
  if (kind === 'OUTRO') return 'Outro'
  return kind
}

function ScheduleTemplatePanel({ sectors }: { sectors: MonthlySector[] }) {
  const queryClient = useQueryClient()
  const allProfessionalsQuery = useProfessionals()
  const [listAllProfessionals, setListAllProfessionals] = useState(false)

  const [sectorId, setSectorId] = useState<string>(() => {
    try {
      const raw = window.localStorage.getItem('ge.scheduling.template.sectorId') ?? ''
      if (raw) return raw
    } catch {
      void 0
    }
    return ''
  })

  const effectiveSectorId = sectorId || sectors[0]?.id || ''

  useEffect(() => {
    if (!effectiveSectorId) return
    try {
      window.localStorage.setItem('ge.scheduling.template.sectorId', effectiveSectorId)
    } catch {
      void 0
    }
  }, [effectiveSectorId])

  const templatesQuery = useScheduleTemplates(effectiveSectorId ? { sectorId: effectiveSectorId } : null)

  const shiftTypesQuery = useQuery({
    queryKey: ['shiftTypes'],
    queryFn: () =>
      apiFetch<Array<{ id: string; code: string; name: string; color: string | null; system: boolean }>>('/api/shift-types'),
  })

  const shiftTypeLabelByCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of shiftTypesQuery.data ?? []) map[t.code] = t.name
    return map
  }, [shiftTypesQuery.data])

  const shiftTypeColorByCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of shiftTypesQuery.data ?? []) {
      if (t.color) map[t.code] = t.color
    }
    return map
  }, [shiftTypesQuery.data])

  const sectorProfessionalsQuery = useQuery({
    queryKey: ['sectorProfessionals', effectiveSectorId],
    queryFn: () => apiFetch<Professional[]>(`/api/sectors/${effectiveSectorId}/professionals`),
    enabled: Boolean(effectiveSectorId),
  })

  const [templateId, setTemplateId] = useState<string>(() => {
    try {
      return window.localStorage.getItem('ge.scheduling.template.templateId') ?? ''
    } catch {
      return ''
    }
  })

  const effectiveTemplateId = useMemo(() => {
    const list = templatesQuery.data ?? []
    if (!list.length) return ''
    if (templateId && list.some((t) => t.id === templateId)) return templateId
    return list[0].id
  }, [templateId, templatesQuery.data])

  useEffect(() => {
    try {
      window.localStorage.setItem('ge.scheduling.template.templateId', effectiveTemplateId)
    } catch {
      void 0
    }
  }, [effectiveTemplateId])

  const selectedTemplate: ScheduleTemplate | null = useMemo(() => {
    return (templatesQuery.data ?? []).find((t) => t.id === effectiveTemplateId) ?? null
  }, [effectiveTemplateId, templatesQuery.data])

  const shiftsQuery = useQuery({
    queryKey: ['scheduleTemplateShifts', effectiveTemplateId],
    queryFn: () => {
      if (!effectiveTemplateId) return Promise.resolve([] as ScheduleTemplateShift[])
      return listScheduleTemplateShifts(effectiveTemplateId)
    },
    enabled: Boolean(effectiveTemplateId),
  })

  const professionalNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of allProfessionalsQuery.data ?? []) map[p.id] = p.fullName
    return map
  }, [allProfessionalsQuery.data])

  const shiftsByCell = useMemo(() => {
    const by: Record<string, ScheduleTemplateShift[]> = {}
    for (const s of shiftsQuery.data ?? []) {
      const key = `${s.weekIndex}:${s.dayOfWeek}`
      if (!by[key]) by[key] = []
      by[key].push(s)
    }
    for (const key of Object.keys(by)) {
      by[key].sort((a, b) => a.startTime.localeCompare(b.startTime))
    }
    return by
  }, [shiftsQuery.data])

  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(id)
  }, [toast])

  const createTemplateMutation = useMutation({
    mutationFn: (payload: { sectorId: string; name: string; weeksCount?: number }) => createScheduleTemplate(payload),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['scheduleTemplates'] })
      setTemplateId(created.id)
    },
  })

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string; weeksCount?: number } }) =>
      updateScheduleTemplate(id, payload),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['scheduleTemplates'] })
      if (updated.id === effectiveTemplateId) {
        await queryClient.invalidateQueries({ queryKey: ['scheduleTemplateShifts', effectiveTemplateId] })
      }
    },
  })

  const duplicateTemplateMutation = useMutation({
    mutationFn: (id: string) => duplicateScheduleTemplate(id),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['scheduleTemplates'] })
      setTemplateId(created.id)
    },
  })

  const clearTemplateMutation = useMutation({
    mutationFn: (id: string) => clearScheduleTemplate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scheduleTemplateShifts', effectiveTemplateId] })
    },
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => deleteScheduleTemplate(id),
    onSuccess: async () => {
      setTemplateId('')
      await queryClient.invalidateQueries({ queryKey: ['scheduleTemplates'] })
    },
  })

  const createTemplateShiftMutation = useMutation({
    mutationFn: ({
      templateId,
      payload,
    }: {
      templateId: string
      payload: {
        weekIndex: number
        dayOfWeek: number
        startTime: string
        endTime: string
        endDayOffset?: number
        kind?: string
        professionalId?: string | null
        valueCents?: number | null
        currency?: string | null
      }
    }) => createScheduleTemplateShift(templateId, payload),
    onSuccess: async (_created, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['scheduleTemplateShifts', variables.templateId] })
    },
  })

  const updateTemplateShiftMutation = useMutation({
    mutationFn: ({ shiftId, payload }: { shiftId: string; payload: Record<string, unknown> }) =>
      updateScheduleTemplateShift(shiftId, payload as never),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scheduleTemplateShifts', effectiveTemplateId] })
    },
  })

  const deleteTemplateShiftMutation = useMutation({
    mutationFn: (shiftId: string) => deleteScheduleTemplateShift(shiftId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scheduleTemplateShifts', effectiveTemplateId] })
    },
  })

  const applyTemplateMutation = useMutation({
    mutationFn: (payload: { fromMonth: string; monthsCount?: number; startDate?: string | null; endDate?: string | null; mode?: string; startWeekIndex?: number }) => {
      if (!effectiveTemplateId) return Promise.reject(new Error('Selecione um modelo.'))
      return applyScheduleTemplate(effectiveTemplateId, payload)
    },
  })

  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [templateModalName, setTemplateModalName] = useState('')
  const [templateModalWeeksCount, setTemplateModalWeeksCount] = useState(1)

  const [shiftModal, setShiftModal] = useState<
    | { open: false }
    | { open: true; mode: 'create'; weekIndex: number; dayOfWeek: number }
    | { open: true; mode: 'edit'; shiftId: string }
  >({ open: false })

  const shiftBeingEdited = useMemo(() => {
    if (!shiftModal.open || shiftModal.mode !== 'edit') return null
    return (shiftsQuery.data ?? []).find((s) => s.id === shiftModal.shiftId) ?? null
  }, [shiftModal, shiftsQuery.data])

  const [shiftStartTime, setShiftStartTime] = useState<string>('07:00')
  const [shiftDurationMinutes, setShiftDurationMinutes] = useState<number>(12 * 60)
  const [shiftKind, setShiftKind] = useState<string>('NORMAL')
  const [shiftMultipleDates, setShiftMultipleDates] = useState<boolean>(false)
  const [shiftSelectedCells, setShiftSelectedCells] = useState<Record<string, boolean>>({})

  const openCreateShiftModal = (weekIndex: number, dayOfWeek: number) => {
    const cellKey = `${weekIndex}:${dayOfWeek}`
    setShiftStartTime('07:00')
    setShiftDurationMinutes(12 * 60)
    setShiftKind('NORMAL')
    setShiftMultipleDates(false)
    setShiftSelectedCells({ [cellKey]: true })
    setShiftModal({ open: true, mode: 'create', weekIndex, dayOfWeek })
  }

  const openEditShiftModal = (shift: ScheduleTemplateShift) => {
    const start = timeToInputValue(shift.startTime)
    const startMinutes = timeToMinutes(start)
    const endMinutes = timeToMinutes(timeToInputValue(shift.endTime))
    const duration = Math.max(0, endMinutes - startMinutes + (shift.endDayOffset ? 1440 : 0))
    const cellKey = `${shift.weekIndex}:${shift.dayOfWeek}`
    setShiftStartTime(start || '07:00')
    setShiftDurationMinutes(duration || 12 * 60)
    setShiftKind(shift.kind || 'NORMAL')
    setShiftMultipleDates(false)
    setShiftSelectedCells({ [cellKey]: true })
    setShiftModal({ open: true, mode: 'edit', shiftId: shift.id })
  }

  const shiftEndTimeComputed = useMemo(() => {
    const startMinutes = timeToMinutes(shiftStartTime)
    return minutesToTime(startMinutes + shiftDurationMinutes)
  }, [shiftDurationMinutes, shiftStartTime])

  const shiftEndDayOffsetComputed = useMemo(() => {
    const startMinutes = timeToMinutes(shiftStartTime)
    const endAbsolute = startMinutes + shiftDurationMinutes
    return endAbsolute >= 1440 ? 1 : 0
  }, [shiftDurationMinutes, shiftStartTime])

  const professionalsForSelect = useMemo(() => {
    if (listAllProfessionals) return allProfessionalsQuery.data ?? []
    return sectorProfessionalsQuery.data ?? []
  }, [allProfessionalsQuery.data, listAllProfessionals, sectorProfessionalsQuery.data])

  const professionalsLoading = Boolean(allProfessionalsQuery.isLoading) || Boolean(sectorProfessionalsQuery.isLoading)

  const [applyMode, setApplyMode] = useState<string>('CIRCULAR')
  const [applyStartWeekIndex, setApplyStartWeekIndex] = useState<number>(1)
  const [applyStartDate, setApplyStartDate] = useState<string>('')
  const [applyEndDate, setApplyEndDate] = useState<string>('')
  const effectiveApplyStartWeekIndex = useMemo(() => {
    const max = selectedTemplate?.weeksCount ?? 1
    if (applyStartWeekIndex < 1 || applyStartWeekIndex > max) return 1
    return applyStartWeekIndex
  }, [applyStartWeekIndex, selectedTemplate?.weeksCount])

  const weekLabels = useMemo(() => {
    const maxWeeks = selectedTemplate?.weeksCount ?? 0
    return Array.from({ length: maxWeeks }, (_, i) => i + 1)
  }, [selectedTemplate?.weeksCount])

  const weekdayLabels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']

  const canEditTemplate = Boolean(selectedTemplate) && !updateTemplateMutation.isPending

  return (
    <section className="ge-card">
      <div className="ge-cardTitle">Escala Modelo</div>
      <div className="ge-cardBody">
        {toast ? <div className="ge-toast">{toast}</div> : null}

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr auto auto auto', alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontWeight: 900, opacity: 0.85 }}>Setor</div>
              <select
                className="ge-select"
                value={effectiveSectorId}
                onChange={(e) => {
                  setSectorId(e.target.value)
                  setTemplateId('')
                }}
                disabled={sectors.length === 0}
              >
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontWeight: 900, opacity: 0.85 }}>Modelos</div>
              <select
                className="ge-select"
                value={effectiveTemplateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={templatesQuery.isLoading || (templatesQuery.data?.length ?? 0) === 0}
              >
                {(templatesQuery.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'grid', gap: 6, justifyItems: 'start' }}>
              <div style={{ fontWeight: 900, opacity: 0.85 }}>Quantidade de Semanas</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="ge-buttonSecondary"
                  disabled={!selectedTemplate || !canEditTemplate || selectedTemplate.weeksCount <= 1}
                  onClick={async () => {
                    if (!selectedTemplate) return
                    try {
                      await updateTemplateMutation.mutateAsync({ id: selectedTemplate.id, payload: { weeksCount: selectedTemplate.weeksCount - 1 } })
                    } catch (err) {
                      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                      setToast(message || 'Não foi possível atualizar a quantidade de semanas.')
                    }
                  }}
                >
                  −
                </button>
                <input className="ge-input" style={{ width: 60, textAlign: 'center' }} value={selectedTemplate?.weeksCount ?? 0} readOnly />
                <button
                  type="button"
                  className="ge-buttonSecondary"
                  disabled={!selectedTemplate || !canEditTemplate || selectedTemplate.weeksCount >= 12}
                  onClick={async () => {
                    if (!selectedTemplate) return
                    try {
                      await updateTemplateMutation.mutateAsync({ id: selectedTemplate.id, payload: { weeksCount: selectedTemplate.weeksCount + 1 } })
                    } catch (err) {
                      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                      setToast(message || 'Não foi possível atualizar a quantidade de semanas.')
                    }
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              className="ge-buttonPrimary"
              onClick={() => {
                setTemplateModalName('')
                setTemplateModalWeeksCount(1)
                setTemplateModalOpen(true)
              }}
            >
              + Novo Modelo
            </button>

            <div />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="ge-buttonSecondary"
              disabled={!selectedTemplate}
              onClick={async () => {
                if (!selectedTemplate) return
                try {
                  const blob = await exportScheduleTemplateCsv(selectedTemplate.id)
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `schedule-template-${selectedTemplate.name}.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (err) {
                  const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                  setToast(message || 'Não foi possível exportar.')
                }
              }}
            >
              Exportar Escala
            </button>
            <button
              type="button"
              className="ge-buttonSecondary"
              disabled={!selectedTemplate || duplicateTemplateMutation.isPending}
              onClick={async () => {
                if (!selectedTemplate) return
                try {
                  const created = await duplicateTemplateMutation.mutateAsync(selectedTemplate.id)
                  setToast(`Modelo duplicado: ${created.name}`)
                } catch (err) {
                  const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                  setToast(message || 'Não foi possível duplicar o modelo.')
                }
              }}
            >
              Duplicar Modelo
            </button>
            <button
              type="button"
              className="ge-buttonSecondary"
              disabled={!selectedTemplate || clearTemplateMutation.isPending}
              onClick={async () => {
                if (!selectedTemplate) return
                try {
                  await clearTemplateMutation.mutateAsync(selectedTemplate.id)
                  setToast('Modelo limpo.')
                } catch (err) {
                  const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                  setToast(message || 'Não foi possível limpar o modelo.')
                }
              }}
            >
              Limpar Modelo
            </button>
            <button
              type="button"
              className="ge-buttonDanger"
              disabled={!selectedTemplate || deleteTemplateMutation.isPending}
              onClick={async () => {
                if (!selectedTemplate) return
                try {
                  await deleteTemplateMutation.mutateAsync(selectedTemplate.id)
                  setToast('Modelo apagado.')
                } catch (err) {
                  const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                  setToast(message || 'Não foi possível apagar o modelo.')
                }
              }}
            >
              Apagar Modelo
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
            {selectedTemplate ? (
              <div style={{ overflowX: 'auto', border: '1px solid rgba(127,127,127,0.2)', borderRadius: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(127,127,127,0.2)' }}>Semana</th>
                    {weekdayLabels.map((l) => (
                      <th key={l} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid rgba(127,127,127,0.2)' }}>
                        {l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekLabels.map((w) => (
                    <tr key={w}>
                      <td style={{ padding: 10, borderBottom: '1px solid rgba(127,127,127,0.14)', fontWeight: 900, width: 90 }}>
                        {w}ª
                      </td>
                      {weekdayLabels.map((_, idx) => {
                        const dayOfWeek = idx + 1
                        const key = `${w}:${dayOfWeek}`
                        const items = shiftsByCell[key] ?? []
                        return (
                          <td key={key} style={{ padding: 8, borderBottom: '1px solid rgba(127,127,127,0.14)', verticalAlign: 'top' }}>
                            <div style={{ display: 'grid', gap: 6 }}>
                              <button
                                type="button"
                                className="ge-buttonSecondary"
                                style={{ justifySelf: 'start' }}
                                onClick={() => openCreateShiftModal(w, dayOfWeek)}
                              >
                                +
                              </button>
                              {items.length === 0 ? (
                                <div style={{ fontSize: 12, opacity: 0.6 }}>Sem plantões</div>
                              ) : (
                                items.map((s) => (
                                  <button
                                    type="button"
                                    key={s.id}
                                    className="ge-weeklyShift"
                                    onClick={() => openEditShiftModal(s)}
                                    style={{
                                      textAlign: 'left',
                                      ...(shiftTypeColorByCode[s.kind ?? 'NORMAL'] ? { borderLeft: `4px solid ${shiftTypeColorByCode[s.kind ?? 'NORMAL']}` } : null),
                                    }}
                                  >
                                    <div className="ge-weeklyShiftTime">
                                      {timeToInputValue(s.startTime)}–{timeToInputValue(s.endTime)}
                                      {s.endDayOffset ? ' (+1)' : ''}
                                    </div>
                                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                                      {shiftTypeLabelByCode[s.kind ?? 'NORMAL'] ?? shiftKindLabel(s.kind)}
                                    </div>
                                    <div className="ge-weeklyShiftPro">
                                      {s.professionalId ? professionalNameById[s.professionalId] ?? s.professionalId : '(Sem profissional)'}
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ) : (
              <div style={{ fontSize: 13, opacity: 0.75 }}>Selecione um setor e crie um modelo para começar.</div>
            )}

            <div
              style={{
                border: '1px solid rgba(127,127,127,0.2)',
                borderRadius: 12,
                padding: 12,
                display: 'grid',
                gap: 12,
                alignContent: 'start',
              }}
            >
              <div style={{ fontWeight: 900, opacity: 0.9 }}>Aplicar modelo</div>
              <label style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 900, opacity: 0.85 }}>Data de início</div>
                <input
                  className="ge-input"
                  type="date"
                  value={applyStartDate}
                  onChange={(e) => setApplyStartDate(e.target.value)}
                  disabled={!selectedTemplate}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 900, opacity: 0.85 }}>Data fim</div>
                <input
                  className="ge-input"
                  type="date"
                  value={applyEndDate}
                  onChange={(e) => setApplyEndDate(e.target.value)}
                  disabled={!selectedTemplate}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 900, opacity: 0.85 }}>Iniciar a partir da</div>
                <select
                  className="ge-select"
                  value={effectiveApplyStartWeekIndex}
                  onChange={(e) => setApplyStartWeekIndex(Number(e.target.value))}
                  disabled={!selectedTemplate || applyMode === 'KEEP_WEEKDAYS'}
                >
                  {weekLabels.map((w) => (
                    <option key={w} value={w}>
                      {w}ª Semana
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 900, opacity: 0.85 }}>Padrões de aplicação</div>
                <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="applyMode"
                    value="KEEP_WEEKDAYS"
                    checked={applyMode === 'KEEP_WEEKDAYS'}
                    onChange={() => setApplyMode('KEEP_WEEKDAYS')}
                    disabled={!selectedTemplate || (selectedTemplate?.weeksCount ?? 0) !== 5}
                  />
                  <span>Manter dias da semana</span>
                </label>
                <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="applyMode"
                    value="CIRCULAR"
                    checked={applyMode === 'CIRCULAR'}
                    onChange={() => setApplyMode('CIRCULAR')}
                    disabled={!selectedTemplate}
                  />
                  <span>Circular</span>
                </label>
              </div>
              <button
                type="button"
                className="ge-buttonPrimary"
                disabled={!selectedTemplate || applyTemplateMutation.isPending || !applyStartDate}
                onClick={async () => {
                  if (!selectedTemplate) return
                  if (!applyStartDate) {
                    setToast('Selecione a data de início.')
                    return
                  }
                  if (applyEndDate && applyEndDate < applyStartDate) {
                    setToast('A data fim deve ser maior ou igual à data de início.')
                    return
                  }
                  if (applyMode === 'KEEP_WEEKDAYS' && selectedTemplate.weeksCount !== 5) {
                    setToast('Para "Manter dias da semana", o modelo precisa ter exatamente 5 semanas.')
                    return
                  }

                  const startMonth = applyStartDate.slice(0, 7)
                  if (!/^\d{4}-\d{2}$/.test(startMonth)) {
                    setToast('Data de início inválida.')
                    return
                  }
                  const fromMonth = `${startMonth}-01`

                  let monthsCount = 1
                  if (applyEndDate) {
                    const endMonth = applyEndDate.slice(0, 7)
                    const startYear = Number(startMonth.slice(0, 4))
                    const startM = Number(startMonth.slice(5, 7))
                    const endYear = Number(endMonth.slice(0, 4))
                    const endM = Number(endMonth.slice(5, 7))
                    monthsCount = (endYear - startYear) * 12 + (endM - startM) + 1
                    if (monthsCount < 1) monthsCount = 1
                    if (monthsCount > 24) {
                      setToast('O período máximo para aplicar é de 24 meses.')
                      return
                    }
                  }

                  try {
                    const result = await applyTemplateMutation.mutateAsync({
                      fromMonth,
                      monthsCount,
                      startDate: applyStartDate || null,
                      endDate: applyEndDate || null,
                      mode: applyMode,
                      startWeekIndex: effectiveApplyStartWeekIndex,
                    })
                    setToast(`Aplicado: ${result.created} | Ignorados: ${result.skipped}`)
                  } catch (err) {
                    const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                    setToast(message || 'Não foi possível aplicar o modelo.')
                  }
                }}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>

      {templateModalOpen ? (
        <div className="ge-modalOverlay" role="dialog" aria-modal="true">
          <div className="ge-modal">
            <div className="ge-modalHeader">
              <div className="ge-modalTitle">Novo Modelo</div>
              <button type="button" className="ge-modalClose" aria-label="Fechar" onClick={() => setTemplateModalOpen(false)}>
                ×
              </button>
            </div>
            <div className="ge-modalBody">
              <form
                className="ge-modalForm"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!sectorId) return
                  try {
                    const created = await createTemplateMutation.mutateAsync({
                      sectorId,
                      name: templateModalName || 'Modelo de Escala',
                      weeksCount: templateModalWeeksCount,
                    })
                    setTemplateModalOpen(false)
                    setToast(`Modelo criado: ${created.name}`)
                  } catch (err) {
                    const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                    setToast(message || 'Não foi possível criar o modelo.')
                  }
                }}
              >
                <label className="ge-modalField">
                  <div className="ge-modalLabel">Nome</div>
                  <input className="ge-input" value={templateModalName} onChange={(e) => setTemplateModalName(e.target.value)} required />
                </label>
                <label className="ge-modalField">
                  <div className="ge-modalLabel">Quantidade de semanas</div>
                  <input
                    className="ge-input"
                    type="number"
                    min={1}
                    max={12}
                    value={templateModalWeeksCount}
                    onChange={(e) => setTemplateModalWeeksCount(Number(e.target.value || '1'))}
                    required
                  />
                </label>
                <div className="ge-modalActions">
                  <button type="button" className="ge-buttonSecondary" onClick={() => setTemplateModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="ge-buttonPrimary" disabled={createTemplateMutation.isPending}>
                    Criar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {shiftModal.open ? (
        <div className="ge-modalOverlay" role="dialog" aria-modal="true">
          <div className="ge-modal">
            <div className="ge-modalHeader">
              <div className="ge-modalTitle">{shiftModal.mode === 'create' ? 'Adicionar Plantão' : 'Editar Plantão'}</div>
              <button type="button" className="ge-modalClose" aria-label="Fechar" onClick={() => setShiftModal({ open: false })}>
                ×
              </button>
            </div>
            <div className="ge-modalBody">
              <form
                className="ge-modalForm"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!selectedTemplate) return
                  const form = e.currentTarget
                  const professionalIdRaw = (form.elements.namedItem('professionalId') as HTMLSelectElement).value
                  try {
                    if (shiftModal.mode === 'create') {
                      const selectedKeys = Object.keys(shiftSelectedCells).filter((k) => Boolean(shiftSelectedCells[k]))
                      const keysToCreate = shiftMultipleDates ? selectedKeys : [`${shiftModal.weekIndex}:${shiftModal.dayOfWeek}`]
                      if (keysToCreate.length === 0) {
                        setToast('Selecione pelo menos um dia.')
                        return
                      }

                      let createdCount = 0
                      for (const key of keysToCreate) {
                        const [wRaw, dRaw] = key.split(':')
                        const weekIndex = Number(wRaw)
                        const dayOfWeek = Number(dRaw)
                        await createTemplateShiftMutation.mutateAsync({
                          templateId: selectedTemplate.id,
                          payload: {
                            weekIndex,
                            dayOfWeek,
                            startTime: timeToPayloadValue(shiftStartTime),
                            endTime: timeToPayloadValue(shiftEndTimeComputed),
                            endDayOffset: shiftEndDayOffsetComputed,
                            kind: shiftKind,
                            professionalId: professionalIdRaw ? professionalIdRaw : null,
                            valueCents: null,
                            currency: null,
                          },
                        })
                        createdCount += 1
                      }

                      setToast(createdCount > 1 ? `Plantões criados: ${createdCount}` : 'Plantão criado.')
                      setShiftModal({ open: false })
                      return
                    }

                    const shiftId = shiftModal.shiftId
                    await updateTemplateShiftMutation.mutateAsync({
                      shiftId,
                      payload: {
                        startTime: timeToPayloadValue(shiftStartTime),
                        endTime: timeToPayloadValue(shiftEndTimeComputed),
                        endDayOffset: shiftEndDayOffsetComputed,
                        kind: shiftKind,
                        professionalId: professionalIdRaw ? professionalIdRaw : null,
                        valueCents: null,
                        currency: null,
                      },
                    })
                    setShiftModal({ open: false })
                  } catch (err) {
                    const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                    setToast(message || 'Não foi possível salvar o plantão.')
                  }
                }}
              >
                {shiftModal.mode === 'create' ? (
                  <div style={{ fontSize: 13, opacity: 0.75 }}>
                    Semana {shiftModal.weekIndex} · {weekdayLabels[shiftModal.dayOfWeek - 1] ?? ''}
                  </div>
                ) : null}
                <label className="ge-modalField">
                  <div className="ge-modalLabel">Duração</div>
                  <input
                    className="ge-input"
                    type="time"
                    value={minutesToDuration(shiftDurationMinutes)}
                    onChange={(e) => setShiftDurationMinutes(timeToMinutes(e.target.value))}
                    required
                  />
                </label>
                <label className="ge-modalField">
                  <div className="ge-modalLabel">Início</div>
                  <input className="ge-input" type="time" value={shiftStartTime} onChange={(e) => setShiftStartTime(e.target.value)} required />
                </label>
                <label className="ge-modalField">
                  <div className="ge-modalLabel">Fim</div>
                  <input className="ge-input" type="time" value={shiftEndTimeComputed} readOnly />
                  {shiftEndDayOffsetComputed ? <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>+1 dia</div> : null}
                </label>
                <label className="ge-modalField">
                  <div className="ge-modalLabel">Tipo</div>
                  <select className="ge-select" value={shiftKind} onChange={(e) => setShiftKind(e.target.value)}>
                    {(shiftTypesQuery.data ?? []).length ? (
                      (shiftTypesQuery.data ?? []).map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="NORMAL">Normal</option>
                        <option value="NOTURNO">Noturno</option>
                        <option value="FIM_DE_SEMANA">Fim de Semana</option>
                        <option value="FERIADO">Feriado</option>
                        <option value="OUTRO">Outro</option>
                      </>
                    )}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 4,
                        border: '1px solid rgba(0,0,0,0.12)',
                        background: shiftTypeColorByCode[shiftKind] || '#e2e8f0',
                        flex: '0 0 auto',
                      }}
                    />
                    <span>{shiftTypeLabelByCode[shiftKind] ?? shiftKindLabel(shiftKind)}</span>
                  </div>
                </label>
                <label className="ge-modalField">
                  <div className="ge-modalLabel">Profissional</div>
                  <select className="ge-select" name="professionalId" defaultValue={shiftBeingEdited?.professionalId ?? ''}>
                    <option value="">-- SEM PROFISSIONAL --</option>
                    {professionalsForSelect.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, fontSize: 13 }}>
                    <input type="checkbox" checked={listAllProfessionals} onChange={(e) => setListAllProfessionals(e.target.checked)} />
                    <span>Listar todos os profissionais</span>
                  </label>
                </label>
                {shiftModal.mode === 'create' ? (
                  <label className="ge-modalField" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" checked={shiftMultipleDates} onChange={(e) => setShiftMultipleDates(e.target.checked)} />
                    <div className="ge-modalLabel" style={{ margin: 0 }}>
                      Várias datas
                    </div>
                  </label>
                ) : null}

                {shiftModal.mode === 'create' && shiftMultipleDates ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ fontWeight: 900, opacity: 0.85 }}>Selecione os dias</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: 8, alignItems: 'center' }}>
                      <div />
                      {weekdayLabels.map((l) => (
                        <div key={l} style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>
                          {l}
                        </div>
                      ))}
                      {weekLabels.map((w) => (
                        <div key={w} style={{ display: 'contents' }}>
                          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>{w}ª</div>
                          {weekdayLabels.map((_, idx) => {
                            const dayOfWeek = idx + 1
                            const key = `${w}:${dayOfWeek}`
                            return (
                              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(shiftSelectedCells[key])}
                                  onChange={(e) =>
                                    setShiftSelectedCells((prev) => ({
                                      ...prev,
                                      [key]: e.target.checked,
                                    }))
                                  }
                                />
                              </label>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="ge-modalActions">
                  {shiftModal.mode === 'edit' ? (
                    <button
                      type="button"
                      className="ge-buttonDanger"
                      disabled={deleteTemplateShiftMutation.isPending}
                      onClick={async () => {
                        try {
                          await deleteTemplateShiftMutation.mutateAsync(shiftModal.shiftId)
                          setShiftModal({ open: false })
                        } catch (err) {
                          const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                          setToast(message || 'Não foi possível apagar o plantão.')
                        }
                      }}
                    >
                      Apagar
                    </button>
                  ) : null}
                  <button type="button" className="ge-buttonSecondary" onClick={() => setShiftModal({ open: false })}>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="ge-buttonPrimary"
                    disabled={
                      createTemplateShiftMutation.isPending || updateTemplateShiftMutation.isPending || professionalsLoading
                    }
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function SearchShiftsPanel({ sectors }: { sectors: MonthlySector[] }) {
  const queryClient = useQueryClient()
  const professionalsQuery = useProfessionals()
  const updateShiftMutation = useUpdateShift()
  const shiftTypesQuery = useQuery({
    queryKey: ['shiftTypes'],
    queryFn: () =>
      apiFetch<Array<{ id: string; code: string; name: string; color: string | null; system: boolean }>>('/api/shift-types'),
  })

  const defaultRange = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12, 0, 0)
    return { startDate: dateKeyLocal(start), endDate: dateKeyLocal(end) }
  }, [])

  const weekdayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const

  const [draft, setDraft] = useState(() => ({
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
    hour: '',
    duration: '',
    weekdayEnabled: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true } as Record<number, boolean>,
    sectorIds: [] as string[],
    professionalIds: [] as string[],
    professionalKind: 'onDuty' as 'onDuty' | 'fixed',
    conditions: [] as Array<'preenchidos' | 'furos' | 'anuncios' | 'coberturas'>,
    typeText: '',
    kind: '',
  }))

  const [applied, setApplied] = useState(draft)
  const [pageIndex, setPageIndex] = useState(1)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(id)
  }, [toast])

  const normalizedRange = useMemo(() => {
    const parse = (ymd: string): Date | null => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
      const [yyyy, mm, dd] = ymd.split('-').map((v) => Number(v))
      if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null
      return new Date(yyyy, mm - 1, dd, 12, 0, 0)
    }

    const start = parse(applied.startDate)
    const end = parse(applied.endDate)
    if (!start || !end) return null

    const startKey = dateKeyLocal(start)
    const endKey = dateKeyLocal(end)
    const from = startKey <= endKey ? start : end
    const to = startKey <= endKey ? end : start

    const endExclusive = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1, 12, 0, 0)
    const fromIso = toIsoUtcStartOfDayLocal(from)
    const toIso = toIsoUtcStartOfDayLocal(endExclusive)

    const schedulesFrom = dateIso(new Date(from.getFullYear(), from.getMonth(), 1, 12, 0, 0))
    const schedulesTo = dateIso(new Date(to.getFullYear(), to.getMonth(), 1, 12, 0, 0))

    return { fromIso, toIso, schedulesFrom, schedulesTo }
  }, [applied.endDate, applied.startDate])

  const schedulesQuery = useQuery({
    queryKey: ['shiftSearchSchedules', normalizedRange?.schedulesFrom, normalizedRange?.schedulesTo],
    queryFn: async () => {
      const qs = new URLSearchParams()
      qs.set('from', normalizedRange!.schedulesFrom)
      qs.set('to', normalizedRange!.schedulesTo)
      return apiFetch<Schedule[]>(`/api/schedules?${qs.toString()}`)
    },
    enabled: Boolean(normalizedRange?.schedulesFrom && normalizedRange?.schedulesTo),
  })

  const shiftsQuery = useShifts(
    { from: normalizedRange?.fromIso, to: normalizedRange?.toIso },
    { enabled: Boolean(normalizedRange?.fromIso && normalizedRange?.toIso) },
  )

  const professionalNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of professionalsQuery.data ?? []) map[p.id] = p.fullName
    return map
  }, [professionalsQuery.data])

  const sectorNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of sectors) map[s.id] = s.name
    return map
  }, [sectors])

  const scheduleIdToSectorId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of schedulesQuery.data ?? []) {
      if (s.sectorId) map[s.id] = s.sectorId
    }
    return map
  }, [schedulesQuery.data])

  const sectorOptions = useMemo(() => {
    const list = [...sectors]
    list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [sectors])

  const professionalOptions = useMemo(() => {
    const list = [...(professionalsQuery.data ?? [])]
    list.sort((a, b) => a.fullName.localeCompare(b.fullName))
    return list
  }, [professionalsQuery.data])

  const filteredShifts = useMemo(() => {
    const list = shiftsQuery.data ?? []
    if (!list.length) return []

    const parseTime = (value: string): { hh: number; mm: number } | null => {
      const raw = value.trim()
      if (!/^\d{2}:\d{2}$/.test(raw)) return null
      const hh = Number(raw.slice(0, 2))
      const mm = Number(raw.slice(3, 5))
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
      if (hh < 0 || hh > 23) return null
      if (mm < 0 || mm > 59) return null
      return { hh, mm }
    }

    const selectedSectorIds = new Set(applied.sectorIds)
    const filterBySectors = selectedSectorIds.size > 0

    const selectedProfessionalIds = new Set(applied.professionalIds)
    const filterByProfessionals = selectedProfessionalIds.size > 0

    const hourParsed = parseTime(applied.hour)
    const filterByHour = Boolean(hourParsed)

    const durationParsed = parseTime(applied.duration)
    const filterByDuration = Boolean(durationParsed)
    const durationMinutes = durationParsed ? durationParsed.hh * 60 + durationParsed.mm : null

    const conditions = new Set(applied.conditions)
    const filterByConditions = conditions.size > 0
    const onlyPreenchidos = filterByConditions && conditions.has('preenchidos') && !conditions.has('furos')
    const onlyFuros = filterByConditions && conditions.has('furos') && !conditions.has('preenchidos')

    const weekdayEnabled = applied.weekdayEnabled

    return list.filter((s) => {
      if (applied.kind) {
        const shiftKind = s.kind ?? 'NORMAL'
        if (shiftKind !== applied.kind) return false
      }
      const sectorId = scheduleIdToSectorId[s.scheduleId] ?? null
      if (filterBySectors) {
        if (!sectorId) return false
        if (!selectedSectorIds.has(sectorId)) return false
      }

      if (filterByProfessionals) {
        if (!s.professionalId) return false
        if (!selectedProfessionalIds.has(s.professionalId)) return false
      }

      const start = new Date(s.startTime)
      const dow = start.getDay()
      if (!weekdayEnabled[dow]) return false

      if (filterByHour && hourParsed) {
        if (start.getHours() !== hourParsed.hh || start.getMinutes() !== hourParsed.mm) return false
      }

      if (filterByDuration && durationMinutes != null) {
        const end = new Date(s.endTime)
        const minutes = Math.round((end.getTime() - start.getTime()) / 60000)
        if (minutes !== durationMinutes) return false
      }

      if (onlyPreenchidos && !s.professionalId) return false
      if (onlyFuros && s.professionalId) return false

      return true
    })
  }, [applied.conditions, applied.duration, applied.hour, applied.kind, applied.professionalIds, applied.sectorIds, applied.weekdayEnabled, scheduleIdToSectorId, shiftsQuery.data])

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})

  const selectedShiftIds = useMemo(() => Object.keys(selectedIds), [selectedIds])

  const selectedCount = useMemo(() => {
    return selectedShiftIds.length
  }, [selectedShiftIds.length])

  const pageSize = 20
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredShifts.length / pageSize)), [filteredShifts.length])
  const effectivePage = Math.min(Math.max(pageIndex, 1), totalPages)
  const pageShifts = useMemo(() => {
    const start = (effectivePage - 1) * pageSize
    return filteredShifts.slice(start, start + pageSize)
  }, [effectivePage, filteredShifts])

  const bulkCancelMutation = useMutation({
    mutationFn: async (shiftIds: string[]) => {
      for (const id of shiftIds) await cancelShift(id)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })

  const [modal, setModal] = useState<{ open: false } | { open: true; mode: 'edit'; shiftId: string }>({ open: false })

  const shiftById = useMemo(() => {
    const map: Record<string, Shift> = {}
    for (const s of shiftsQuery.data ?? []) map[s.id] = s
    return map
  }, [shiftsQuery.data])

  const shiftBeingEdited = useMemo(() => {
    if (!modal.open) return null
    return shiftById[modal.shiftId] ?? null
  }, [modal, shiftById])

  async function bulkCancelSelected() {
    if (bulkCancelMutation.isPending) return
    if (selectedShiftIds.length === 0) return
    const ok = window.confirm(`Apagar ${selectedShiftIds.length} plantão(ões)?`)
    if (!ok) return
    try {
      await bulkCancelMutation.mutateAsync(selectedShiftIds)
      setSelectedIds({})
      setToast('Plantões apagados.')
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setToast(message || 'Não foi possível apagar os plantões.')
    }
  }


  function formatMoney(valueCents: number | null, currency: string | null): string {
    if (valueCents == null) return '-'
    const cur = currency || 'BRL'
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: cur }).format(valueCents / 100)
    } catch {
      return `${cur} ${(valueCents / 100).toFixed(2)}`
    }
  }

  return (
    <section className="ge-searchPanel">
      <div className="ge-searchFilters">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setApplied(draft)
            setSelectedIds({})
            setPageIndex(1)
          }}
          className="ge-searchFiltersRow"
        >
          <label className="ge-searchField">
            <div className="ge-searchFieldLabel">Início</div>
            <input className="ge-input" type="date" value={draft.startDate} onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))} />
          </label>

          <label className="ge-searchField">
            <div className="ge-searchFieldLabel">Fim</div>
            <input className="ge-input" type="date" value={draft.endDate} onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))} />
          </label>

          <label className="ge-searchField">
            <div className="ge-searchFieldLabel">Hora</div>
            <input className="ge-input" type="time" value={draft.hour} onChange={(e) => setDraft((p) => ({ ...p, hour: e.target.value }))} />
          </label>

          <label className="ge-searchField">
            <div className="ge-searchFieldLabel">Duração</div>
            <input className="ge-input" type="time" value={draft.duration} onChange={(e) => setDraft((p) => ({ ...p, duration: e.target.value }))} />
          </label>

          <div className="ge-searchField">
            <div className="ge-searchFieldLabel">Dias da semana</div>
            <div className="ge-searchDays">
              {weekdayLabels.map((label, idx) => (
                <label key={label + String(idx)} className="ge-searchDay">
                  <div className="ge-searchDayLabel">{label}</div>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.weekdayEnabled[idx])}
                    onChange={(e) => setDraft((p) => ({ ...p, weekdayEnabled: { ...p.weekdayEnabled, [idx]: e.target.checked } }))}
                  />
                </label>
              ))}
            </div>
          </div>

          <label className="ge-searchField">
            <div className="ge-searchFieldLabel">Setor(es)</div>
            <select
              className="ge-select ge-searchSelectMultiple"
              multiple
              value={draft.sectorIds}
              onChange={(e) => setDraft((p) => ({ ...p, sectorIds: Array.from(e.currentTarget.selectedOptions).map((o) => o.value) }))}
              disabled={sectors.length === 0}
            >
              {sectorOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="ge-searchField">
            <div className="ge-searchFieldLabel">Profissional(is)</div>
            <select
              className="ge-select ge-searchSelectMultiple"
              multiple
              value={draft.professionalIds}
              onChange={(e) => setDraft((p) => ({ ...p, professionalIds: Array.from(e.currentTarget.selectedOptions).map((o) => o.value) }))}
              disabled={professionalsQuery.isLoading}
            >
              {professionalOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </label>

          <label className="ge-searchField">
            <div className="ge-searchFieldLabel">Profissional</div>
            <select
              className="ge-select"
              value={draft.professionalKind}
              onChange={(e) => setDraft((p) => ({ ...p, professionalKind: e.target.value === 'fixed' ? 'fixed' : 'onDuty' }))}
            >
              <option value="onDuty">de Plantão</option>
              <option value="fixed">Fixo</option>
            </select>
          </label>

          <label className="ge-searchField">
            <div className="ge-searchFieldLabel">Condição</div>
            <select
              className="ge-select ge-searchSelectMultiple"
              multiple
              value={draft.conditions}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  conditions: Array.from(e.currentTarget.selectedOptions).map((o) => o.value as 'preenchidos' | 'furos' | 'anuncios' | 'coberturas'),
                }))
              }
            >
              <option value="preenchidos">Preenchidos</option>
              <option value="furos">Furos</option>
              <option value="anuncios">Anúncios</option>
              <option value="coberturas">Coberturas</option>
            </select>
          </label>

          <label className="ge-searchField">
            <div className="ge-searchFieldLabel">Tipo</div>
            <input className="ge-input" value={draft.typeText} onChange={(e) => setDraft((p) => ({ ...p, typeText: e.target.value }))} />
          </label>

          <label className="ge-searchField">
            <div className="ge-searchFieldLabel">Tipo de Plantão</div>
            <select className="ge-select" value={draft.kind} onChange={(e) => setDraft((p) => ({ ...p, kind: e.target.value }))}>
              <option value="">(Todos)</option>
              {(shiftTypesQuery.data ?? []).map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <div className="ge-searchSubmit">
            <button type="submit" className="ge-buttonPrimary">
              Filtrar
            </button>
          </div>
        </form>

        <div className="ge-searchHints">
          <div className="ge-searchHint">
            - Anúncios, Coberturas, Tipo e Profissional Fixo dependem de dados do backend e ainda não afetam o resultado.
          </div>
        </div>
      </div>

      <div className="ge-searchToolbar">
        <div className="ge-searchSummary">
          {shiftsQuery.isLoading || schedulesQuery.isLoading
            ? 'Carregando...'
            : `Encontrados: ${filteredShifts.length} • Página ${effectivePage}/${totalPages}`}
          {selectedCount ? ` • Selecionados: ${selectedCount}` : ''}
        </div>
        <div className="ge-searchActions">
          <button type="button" className="ge-buttonSecondary" disabled={selectedCount === 0 || bulkCancelMutation.isPending} onClick={bulkCancelSelected}>
            Apagar
          </button>
          <button
            type="button"
            className="ge-buttonSecondary"
            disabled={selectedCount !== 1}
            onClick={() => {
              if (selectedShiftIds.length !== 1) return
              setModal({ open: true, mode: 'edit', shiftId: selectedShiftIds[0] })
            }}
          >
            Alterar
          </button>
          <button
            type="button"
            className="ge-buttonSecondary"
            disabled={selectedCount === 0}
            onClick={() => setToast('Alterar anúncio: em breve.')}
          >
            Alterar Anúncio
          </button>
        </div>
      </div>

      {shiftsQuery.error ? (
        <div className="ge-errorText">Erro ao carregar plantões.</div>
      ) : (
        <div className="ge-searchTableWrap">
          <table className="ge-searchTable">
            <thead>
              <tr>
                <th style={{ width: 46 }}>
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos"
                    checked={pageShifts.length > 0 && pageShifts.every((s) => Boolean(selectedIds[s.id]))}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setSelectedIds((prev) => {
                        const next = { ...prev }
                        for (const s of pageShifts) {
                          if (checked) next[s.id] = true
                          else delete next[s.id]
                        }
                        return next
                      })
                    }}
                  />
                </th>
                <th>DATA</th>
                <th>PROFISSIONAL DE PLANTÃO</th>
                <th>VALOR</th>
                <th>SETOR</th>
              </tr>
            </thead>
            <tbody>
              {pageShifts.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 14, opacity: 0.75 }}>
                    Nenhum plantão encontrado.
                  </td>
                </tr>
              ) : (
                pageShifts.map((s) => {
                  const start = new Date(s.startTime)
                  const sectorId = scheduleIdToSectorId[s.scheduleId] ?? null
                  const sectorName = sectorId ? sectorNameById[sectorId] ?? sectorId : s.scheduleId
                  const professionalLabel = s.professionalId ? professionalNameById[s.professionalId] ?? s.professionalId : '(Sem profissional)'
                  return (
                    <tr key={s.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label="Selecionar"
                          checked={Boolean(selectedIds[s.id])}
                          onChange={(e) =>
                            setSelectedIds((prev) => {
                              const next = { ...prev }
                              if (e.target.checked) next[s.id] = true
                              else delete next[s.id]
                              return next
                            })
                          }
                        />
                      </td>
                      <td>{start.toLocaleDateString('pt-BR')}</td>
                      <td>{professionalLabel}</td>
                      <td>{formatMoney(s.valueCents, s.currency)}</td>
                      <td>{sectorName}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          <div className="ge-searchPagination">
            <button
              type="button"
              className="ge-buttonSecondary"
              disabled={effectivePage <= 1}
              onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="ge-buttonSecondary"
              disabled={effectivePage >= totalPages}
              onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {modal.open && shiftBeingEdited ? (
        <div className="ge-modalOverlay" role="dialog" aria-modal="true" onClick={() => setModal({ open: false })}>
          <div className="ge-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ge-modalHeader">
              <div className="ge-modalTitle">Alterar plantão</div>
              <button type="button" className="ge-modalClose" onClick={() => setModal({ open: false })} aria-label="Fechar">
                ×
              </button>
            </div>
            <div className="ge-modalBody">
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const form = e.currentTarget
                  const professionalId = (form.elements.namedItem('professionalId') as HTMLSelectElement).value
                  const startLocal = (form.elements.namedItem('start') as HTMLInputElement).value
                  const endLocal = (form.elements.namedItem('end') as HTMLInputElement).value
                  const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
                  const currency = (form.elements.namedItem('currency') as HTMLInputElement).value
                  try {
                    await updateShiftMutation.mutateAsync({
                      shiftId: shiftBeingEdited.id,
                      input: {
                        professionalId: professionalId ? professionalId : null,
                        startTime: new Date(startLocal).toISOString(),
                        endTime: new Date(endLocal).toISOString(),
                        valueCents: valueCentsRaw ? Number(valueCentsRaw) : null,
                        currency: currency || null,
                      },
                    })
                    setToast('Plantão atualizado.')
                    setModal({ open: false })
                    setSelectedIds({})
                  } catch (err) {
                    const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                    setToast(message || 'Não foi possível atualizar o plantão.')
                  }
                }}
                style={{ display: 'grid', gap: 10 }}
              >
                <label className="ge-modalField">
                  <div className="ge-modalLabel">Início</div>
                  <input className="ge-input" name="start" type="datetime-local" defaultValue={toDateTimeLocalValue(shiftBeingEdited.startTime)} required />
                </label>
                <label className="ge-modalField">
                  <div className="ge-modalLabel">Fim</div>
                  <input className="ge-input" name="end" type="datetime-local" defaultValue={toDateTimeLocalValue(shiftBeingEdited.endTime)} required />
                </label>
                <label className="ge-modalField">
                  <div className="ge-modalLabel">Profissional</div>
                  <select className="ge-select" name="professionalId" defaultValue={shiftBeingEdited.professionalId ?? ''}>
                    <option value="">-- SEM PROFISSIONAL --</option>
                    {professionalOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ge-modalField">
                  <div className="ge-modalLabel">Valor (centavos)</div>
                  <input className="ge-input" name="valueCents" type="number" min={0} defaultValue={shiftBeingEdited.valueCents ?? ''} />
                </label>
                <label className="ge-modalField">
                  <div className="ge-modalLabel">Moeda</div>
                  <input className="ge-input" name="currency" type="text" defaultValue={shiftBeingEdited.currency ?? 'BRL'} />
                </label>
                <div className="ge-modalActions">
                  <button type="button" className="ge-buttonSecondary" onClick={() => setModal({ open: false })}>
                    Cancelar
                  </button>
                  <button type="submit" className="ge-buttonPrimary" disabled={updateShiftMutation.isPending}>
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="ge-toast">{toast}</div> : null}
    </section>
  )
}

export function DashboardPage() {
  const session = useAuthStore((s) => s.session)
  const clearSession = useAuthStore((s) => s.clearSession)
  const roles = useMemo(() => parseJwtRoles(session.accessToken), [session.accessToken])
  const permissions = useMemo(() => parseJwtPermissions(session.accessToken), [session.accessToken])
  const isAdmin = roles.includes('ADMIN')
  const isSuperAdmin = roles.includes('SUPER_ADMIN')
  const canManageProfessionals = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN') || roles.includes('COORDINATOR')
  const canManageProfessionalProfileCatalog = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')
  const canManageGroups = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')
  const canManageLocationsAndSectors = roles.includes('ADMIN')
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const sidebarCollapsed = true

  type WorkspaceSectionId = 'dashboard' | 'scheduling' | 'users' | 'settings'

  type WorkspaceItemId =
    | 'resumo'
    | 'relatorio'
    | 'carga-horaria'
    | 'semanal'
    | 'mensal'
    | 'profissional'
    | '12x36'
    | 'busca'
    | 'modelo'
    | 'justificativas'
    | 'profissionais'
    | 'coordenadores'
    | 'locais-setores'
    | 'grupos'
    | 'tipos-plantao'
    | 'situacoes-plantao'
    | 'valores'
    | 'bonificacoes'
    | 'contas-bancarias'
    | 'produtividades'
    | 'profissionais-config'

  type WorkspaceItem = { id: WorkspaceItemId; label: string; icon?: IconName; enabled?: boolean }
  type WorkspaceSection = { id: WorkspaceSectionId; label: string; icon: IconName; items: WorkspaceItem[] }

  const [companyMenuOpen, setCompanyMenuOpen] = useState(false)
  const companyMenuRef = useRef<HTMLDivElement | null>(null)

  const [navFlyoutSectionId, setNavFlyoutSectionId] = useState<WorkspaceSectionId | null>(null)
  const sidebarRef = useRef<HTMLElement | null>(null)

  type AddProfessionalDialogTabId =
    | 'informacoes'
    | 'grupos'
    | 'dados-bancarios'
    | 'contratacao'
    | 'afastamentos'
    | 'bonificacao'
    | 'pendencias'
    | 'documentos'

  const addProfessionalDialogTabs = useMemo(
    () =>
      [
        { id: 'informacoes' as const, label: 'Informações', icon: 'info' as const },
        { id: 'grupos' as const, label: 'Grupos', icon: 'users' as const },
        { id: 'dados-bancarios' as const, label: 'Dados Bancários', icon: 'bank' as const },
        { id: 'contratacao' as const, label: 'Contratação', icon: 'briefcase' as const },
        { id: 'afastamentos' as const, label: 'Disponibilidades', icon: 'calendar' as const },
        { id: 'bonificacao' as const, label: 'Bonificação', icon: 'gift' as const },
        { id: 'pendencias' as const, label: 'Pendências', icon: 'flag' as const },
        { id: 'documentos' as const, label: 'Documentos', icon: 'paperclip' as const },
      ] satisfies Array<{ id: AddProfessionalDialogTabId; label: string; icon: IconName }>,
    [],
  )

  const [addProfessionalDialog, setAddProfessionalDialog] = useState<{ open: boolean; tabId: AddProfessionalDialogTabId }>({
    open: false,
    tabId: 'informacoes',
  })

  type AddProfessionalEmergencyContact = { id: string; name: string; phone: string }

  type AddProfessionalInfoForm = {
    photoFileName: string
    photoDataUrl: string
    fullName: string
    birthDate: string
    prefix: string
    email: string
    cpf: string
    phone: string
    profession: string
    specialties: string[]
    department: string
    registrationType: string
    professionalRegistration: string
    cep: string
    street: string
    addressNumber: string
    neighborhood: string
    complement: string
    state: string
    city: string
    country: string
    admissionDate: string
    code: string
    notes: string
    details: string
    emergencyContacts: AddProfessionalEmergencyContact[]
    sendInviteByEmail: boolean
  }

  const defaultAddProfessionalInfoForm = useMemo<AddProfessionalInfoForm>(
    () => ({
      photoFileName: '',
      photoDataUrl: '',
      fullName: '',
      birthDate: '',
      prefix: '',
      email: '',
      cpf: '',
      phone: '',
      profession: '',
      specialties: [],
      department: '',
      registrationType: '',
      professionalRegistration: '',
      cep: '',
      street: '',
      addressNumber: '',
      neighborhood: '',
      complement: '',
      state: '',
      city: '',
      country: 'Brasil',
      admissionDate: '',
      code: '',
      notes: '',
      details: '',
      emergencyContacts: [],
      sendInviteByEmail: false,
    }),
    [],
  )

  const [addProfessionalInfoForm, setAddProfessionalInfoForm] = useState<AddProfessionalInfoForm>(defaultAddProfessionalInfoForm)
  const addProfessionalPhotoInputRef = useRef<HTMLInputElement | null>(null)
  const [addProfessionalPhotoPreviewUrl, setAddProfessionalPhotoPreviewUrl] = useState<string | null>(null)
  const [addProfessionalSaveAttempted, setAddProfessionalSaveAttempted] = useState(false)

  useEffect(() => {
    return () => {
      if (addProfessionalPhotoPreviewUrl) URL.revokeObjectURL(addProfessionalPhotoPreviewUrl)
    }
  }, [addProfessionalPhotoPreviewUrl])

  const addProfessionalMutation = useMutation({
    mutationFn: async (form: AddProfessionalInfoForm) => {
      return apiFetch('/api/professionals', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim() ? form.email.trim() : null,
          phone: form.phone.trim() ? form.phone.trim() : null,
          sendInviteByEmail: form.sendInviteByEmail,
          birthDate: form.birthDate ? form.birthDate : null,
          cpf: form.cpf.trim() ? form.cpf.trim() : null,
          prefix: form.prefix.trim() ? form.prefix.trim() : null,
          profession: form.profession.trim() ? form.profession.trim() : null,
          specialties: form.specialties.length > 0 ? form.specialties.join(', ') : null,
          department: form.department.trim() ? form.department.trim() : null,
          admissionDate: form.admissionDate ? form.admissionDate : null,
          registrationType: form.registrationType.trim() ? form.registrationType.trim() : null,
          professionalRegistration: form.professionalRegistration.trim() ? form.professionalRegistration.trim() : null,
          cep: form.cep.trim() ? form.cep.trim() : null,
          street: form.street.trim() ? form.street.trim() : null,
          addressNumber: form.addressNumber.trim() ? form.addressNumber.trim() : null,
          neighborhood: form.neighborhood.trim() ? form.neighborhood.trim() : null,
          complement: form.complement.trim() ? form.complement.trim() : null,
          state: form.state.trim() ? form.state.trim() : null,
          city: form.city.trim() ? form.city.trim() : null,
          country: form.country.trim() ? form.country.trim() : null,
          code: form.code.trim() ? form.code.trim() : null,
          notes: form.notes.trim() ? form.notes.trim() : null,
          details: form.details.trim() ? form.details.trim() : null,
          photoFileName: form.photoFileName.trim() ? form.photoFileName.trim() : null,
          photoDataUrl: form.photoDataUrl.trim() ? form.photoDataUrl.trim() : null,
          emergencyContacts: form.emergencyContacts.map((c) => ({
            name: c.name.trim(),
            phone: c.phone.trim(),
          })),
          compensationValues: addProfessionalCompensationValues.items
            .map((v) => {
              if (!v.start) return null
              if (v.end && v.end < v.start) return null
              const valueCents = parseBrlToCents(v.value)
              if (valueCents == null) return null
              return { unit: v.unit, periodStart: v.start, periodEnd: v.end ? v.end : null, valueCents, currency: 'BRL' }
            })
            .filter((v): v is { unit: 'HOUR' | 'MONTH'; periodStart: string; periodEnd: string | null; valueCents: number; currency: string } => v != null),
        }),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['professionals'] })
    },
  })

  function openAddProfessionalDialog() {
    addProfessionalMutation.reset()
    setAddProfessionalSaveAttempted(false)
    setAddProfessionalInfoForm(defaultAddProfessionalInfoForm)
    setAddProfessionalPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setAddProfessionalGroupsQuery('')
    setAddProfessionalGroupsOnlySelected(false)
    setAddProfessionalSelectedLocationIds({})
    setAddProfessionalSelectedSectorIds({})
    setAddProfessionalBankAccount({ draft: defaultAddProfessionalBankAccountForm, saved: defaultAddProfessionalBankAccountForm, principal: true })
    setAddProfessionalHiring({ draft: defaultAddProfessionalHiringPeriodDraft, items: [] })
    setAddProfessionalCompensationValues({ draft: defaultAddProfessionalCompensationValueDraft, items: [] })
    setAddProfessionalAvailability({ draft: defaultAddProfessionalAvailabilityDraft, items: [] })
    setAddProfessionalBonuses({ draft: defaultAddProfessionalBonusDraft, items: [] })
    setAddProfessionalPendencies(defaultAddProfessionalPendencies)
    setAddProfessionalDocuments([])
    setAddProfessionalDialog({ open: true, tabId: 'informacoes' })
  }

  const cpfDigits = useMemo(() => addProfessionalInfoForm.cpf.replace(/\D/g, ''), [addProfessionalInfoForm.cpf])
  const hasCpf = cpfDigits.length > 0
  const cpfValid = cpfDigits.length === 11
  const emailValue = addProfessionalInfoForm.email.trim()
  const emailValid = !addProfessionalInfoForm.sendInviteByEmail || (emailValue.length > 0 && /^\S+@\S+\.\S+$/.test(emailValue))
  const requiredFieldsOk = Boolean(
    addProfessionalInfoForm.fullName.trim() &&
      (!addProfessionalInfoForm.sendInviteByEmail || emailValue) &&
      addProfessionalInfoForm.profession.trim(),
  )
  const addProfessionalFormValid = requiredFieldsOk && emailValid && (!hasCpf || cpfValid)
  const canSaveAddProfessional = canManageProfessionals && addProfessionalDialog.open && addProfessionalFormValid && !addProfessionalMutation.isPending

  const addProfessionalSpecialtyOptions = useMemo(
    () => [
      'Clínica Geral',
      'Cardiologia',
      'Dermatologia',
      'Ginecologia e Obstetrícia',
      'Neurologia',
      'Ortopedia',
      'Pediatria',
      'Psiquiatria',
      'Radiologia',
      'Urologia',
      'Enfermagem',
      'Fisioterapia',
    ],
    [],
  )

  const [addProfessionalGroupsQuery, setAddProfessionalGroupsQuery] = useState('')
  const [addProfessionalGroupsOnlySelected, setAddProfessionalGroupsOnlySelected] = useState(false)
  const [addProfessionalSelectedLocationIds, setAddProfessionalSelectedLocationIds] = useState<Record<string, boolean>>({})
  const [addProfessionalSelectedSectorIds, setAddProfessionalSelectedSectorIds] = useState<Record<string, boolean>>({})

  type AddProfessionalBankAccountForm = {
    alias: string
    transactionType: 'TED' | 'PIX'
    primary: boolean
    pixKey: string
    documentType: 'CPF' | 'CNPJ'
    documentNumber: string
    fullNameOrBusinessName: string
    observation: string
    bankCode: string
    agency: string
    accountNumber: string
    operation: '' | '001' | '013'
  }

  const defaultAddProfessionalBankAccountForm = useMemo<AddProfessionalBankAccountForm>(
    () => ({
      alias: 'Conta Pessoal',
      transactionType: 'TED',
      primary: true,
      pixKey: '',
      documentType: 'CPF',
      documentNumber: '',
      fullNameOrBusinessName: '',
      observation: '',
      bankCode: '',
      agency: '',
      accountNumber: '',
      operation: '',
    }),
    [],
  )

  const [addProfessionalBankAccount, setAddProfessionalBankAccount] = useState<{
    draft: AddProfessionalBankAccountForm
    saved: AddProfessionalBankAccountForm
    principal: boolean
  }>({
    draft: defaultAddProfessionalBankAccountForm,
    saved: defaultAddProfessionalBankAccountForm,
    principal: true,
  })

  type AddProfessionalHiringPeriod = {
    type: string
    start: string
    end: string
    comment: string
  }

  const defaultAddProfessionalHiringPeriodDraft = useMemo<AddProfessionalHiringPeriod>(
    () => ({
      type: 'CLT',
      start: '',
      end: '',
      comment: '',
    }),
    [],
  )

  const [addProfessionalHiring, setAddProfessionalHiring] = useState<{
    draft: AddProfessionalHiringPeriod
    items: AddProfessionalHiringPeriod[]
  }>({
    draft: defaultAddProfessionalHiringPeriodDraft,
    items: [],
  })

  type AddProfessionalCompensationUnit = 'HOUR' | 'MONTH'

  type AddProfessionalCompensationValueDraft = {
    unit: AddProfessionalCompensationUnit
    start: string
    end: string
    value: string
  }

  const defaultAddProfessionalCompensationValueDraft = useMemo<AddProfessionalCompensationValueDraft>(
    () => ({
      unit: 'HOUR',
      start: '',
      end: '',
      value: '',
    }),
    [],
  )

  const [addProfessionalCompensationValues, setAddProfessionalCompensationValues] = useState<{
    draft: AddProfessionalCompensationValueDraft
    items: AddProfessionalCompensationValueDraft[]
  }>({
    draft: defaultAddProfessionalCompensationValueDraft,
    items: [],
  })

  type AddProfessionalAvailabilityStatus = 'DISPONIVEL' | 'INDISPONIVEL'
  type AddProfessionalAvailabilityKind = 'DIA' | 'PERIODO' | 'DIAS_SEMANA'

  type AddProfessionalAvailabilityRule = {
    status: AddProfessionalAvailabilityStatus
    kind: AddProfessionalAvailabilityKind
    day: string
    start: string
    end: string
    weekdays: string[]
    comment: string
  }

  const defaultAddProfessionalAvailabilityDraft = useMemo<AddProfessionalAvailabilityRule>(
    () => ({
      status: 'DISPONIVEL',
      kind: 'DIA',
      day: '',
      start: '',
      end: '',
      weekdays: [],
      comment: '',
    }),
    [],
  )

  const [addProfessionalAvailability, setAddProfessionalAvailability] = useState<{
    draft: AddProfessionalAvailabilityRule
    items: AddProfessionalAvailabilityRule[]
  }>({
    draft: defaultAddProfessionalAvailabilityDraft,
    items: [],
  })

  type AddProfessionalBonusDraft = {
    bonusType: string
    sectorId: string
    start: string
    end: string
  }

  const defaultAddProfessionalBonusDraft = useMemo<AddProfessionalBonusDraft>(
    () => ({
      bonusType: 'Bonificação FIXA',
      sectorId: '',
      start: '',
      end: '',
    }),
    [],
  )

  const [addProfessionalBonuses, setAddProfessionalBonuses] = useState<{
    draft: AddProfessionalBonusDraft
    items: AddProfessionalBonusDraft[]
  }>({
    draft: defaultAddProfessionalBonusDraft,
    items: [],
  })

  type AddProfessionalPendencyItem = { id: string; text: string; done: boolean }

  type AddProfessionalPendenciesState = {
    draft: string
    items: AddProfessionalPendencyItem[]
  }

  const defaultAddProfessionalPendencies = useMemo<AddProfessionalPendenciesState>(
    () => ({
      draft: '',
      items: [
        { id: 'dados-pessoais', text: 'Completar dados pessoais', done: false },
        { id: 'dados-profissionais', text: 'Completar dados profissionais', done: false },
        { id: 'dados-contato', text: 'Completar dados de contato', done: false },
        { id: 'contatos-emergencia', text: 'Completar contatos de emergência', done: false },
        { id: 'grupo', text: 'Adicionar usuário em um grupo', done: false },
        { id: 'dados-bancarios', text: 'Adicionar dados bancários', done: false },
        { id: 'dados-contratacao', text: 'Adicionar dados de contratação', done: false },
        { id: 'disponibilidades', text: 'Adicionar disponibilidades', done: false },
        { id: 'bonificacao', text: 'Adicionar bonificação', done: false },
      ],
    }),
    [],
  )

  const [addProfessionalPendencies, setAddProfessionalPendencies] = useState<AddProfessionalPendenciesState>(defaultAddProfessionalPendencies)

  type AddProfessionalDocumentItem = {
    id: string
    name: string
    file: File
  }

  const addProfessionalDocumentsInputRef = useRef<HTMLInputElement | null>(null)
  const [addProfessionalDocuments, setAddProfessionalDocuments] = useState<AddProfessionalDocumentItem[]>([])

  useEffect(() => {
    if (!addProfessionalDialog.open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAddProfessionalDialog((prev) => ({ ...prev, open: false }))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [addProfessionalDialog.open])

  const [organizationTypes, setOrganizationTypes] = useState<
    Array<{ id: string; segmentId: string; name: string; userTerm: string; shiftTerm: string }>
  >([])
  const [tenantInfo, setTenantInfo] = useState<{
    id: string
    name: string
    organizationTypeId: string | null
    organizationTypeName: string | null
    userTerm: string | null
    shiftTerm: string | null
  } | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)

  const [segments, setSegments] = useState<Array<{ id: string; name: string }>>([])
  const [systemOrganizationTypes, setSystemOrganizationTypes] = useState<
    Array<{ id: string; segmentId: string; name: string; userTerm: string; shiftTerm: string }>
  >([])
  const [systemError, setSystemError] = useState<string | null>(null)
  const [newSegmentName, setNewSegmentName] = useState('')
  const [newType, setNewType] = useState<{ segmentId: string; name: string; userTerm: string; shiftTerm: string }>({
    segmentId: '',
    name: '',
    userTerm: '',
    shiftTerm: '',
  })

  type ProfessionalProfileCatalogItem = { id: string; name: string; sortOrder: number }
  type ProfessionalProfileCatalogResponse = {
    prefixes: ProfessionalProfileCatalogItem[]
    professions: ProfessionalProfileCatalogItem[]
    registrationTypes: ProfessionalProfileCatalogItem[]
    hiringTypes: ProfessionalProfileCatalogItem[]
    specialties: ProfessionalProfileCatalogItem[]
  }
  type ProfessionalProfileCatalogKind = 'prefixes' | 'professions' | 'registration-types' | 'hiring-types' | 'specialties'

  const [adminProfessionalProfileCatalog, setAdminProfessionalProfileCatalog] = useState<ProfessionalProfileCatalogResponse | null>(null)
  const [adminProfessionalProfileCatalogError, setAdminProfessionalProfileCatalogError] = useState<string | null>(null)

  const [systemProfessionalProfileCatalogOrganizationTypeId, setSystemProfessionalProfileCatalogOrganizationTypeId] = useState<string>('')
  const [systemProfessionalProfileCatalog, setSystemProfessionalProfileCatalog] = useState<ProfessionalProfileCatalogResponse | null>(null)
  const [systemProfessionalProfileCatalogError, setSystemProfessionalProfileCatalogError] = useState<string | null>(null)

  const [professionalProfileCatalogNewName, setProfessionalProfileCatalogNewName] = useState('')
  const [professionalProfileCatalogNewSortOrder, setProfessionalProfileCatalogNewSortOrder] = useState('0')
  const [professionalProfileCatalogActiveKind, setProfessionalProfileCatalogActiveKind] =
    useState<ProfessionalProfileCatalogKind>('prefixes')

  type SettingsGroup = { id: string; name: string }
  const [settingsGroups, setSettingsGroups] = useState<SettingsGroup[]>([])
  const [settingsGroupsError, setSettingsGroupsError] = useState<string | null>(null)
  const [settingsGroupsLoading, setSettingsGroupsLoading] = useState(false)
  const [settingsGroupsSearch, setSettingsGroupsSearch] = useState('')
  const [settingsGroupEditor, setSettingsGroupEditor] = useState<null | { mode: 'create' | 'edit'; id?: string; name: string }>(null)
  const [settingsGroupSaving, setSettingsGroupSaving] = useState(false)
  const filteredSettingsGroups = useMemo(() => {
    const q = settingsGroupsSearch.trim().toLowerCase()
    if (!q) return settingsGroups
    return settingsGroups.filter((g) => g.name.toLowerCase().includes(q))
  }, [settingsGroups, settingsGroupsSearch])

  type SettingsShiftType = { id: string; code: string; name: string; color: string | null; system: boolean }
  const [settingsShiftTypes, setSettingsShiftTypes] = useState<SettingsShiftType[]>([])
  const [settingsShiftTypesError, setSettingsShiftTypesError] = useState<string | null>(null)
  const [settingsShiftTypesLoading, setSettingsShiftTypesLoading] = useState(false)
  const [settingsShiftTypesSearch, setSettingsShiftTypesSearch] = useState('')
  const [settingsShiftTypeEditor, setSettingsShiftTypeEditor] = useState<null | { mode: 'create' | 'edit'; id?: string; name: string; color: string }>(null)
  const [settingsShiftTypesSaving, setSettingsShiftTypesSaving] = useState(false)

  type SettingsShiftSituation = { id: string; code: string; name: string; requiresCoverage: boolean; system: boolean }
  const [settingsShiftSituations, setSettingsShiftSituations] = useState<SettingsShiftSituation[]>([])
  const [settingsShiftSituationsError, setSettingsShiftSituationsError] = useState<string | null>(null)
  const [settingsShiftSituationsLoading, setSettingsShiftSituationsLoading] = useState(false)
  const [settingsShiftSituationsSearch, setSettingsShiftSituationsSearch] = useState('')
  const [settingsShiftSituationEditor, setSettingsShiftSituationEditor] = useState<
    null | { mode: 'create' | 'edit'; id?: string; name: string; requiresCoverage: boolean }
  >(null)
  const [settingsShiftSituationsSaving, setSettingsShiftSituationsSaving] = useState(false)

  type SettingsBonusRuleValueKind = 'CURRENCY' | 'PERCENT'
  type SettingsBonusRuleType =
    | 'PERCENT_PER_SHIFT'
    | 'ADDITIONAL_PER_SHIFT'
    | 'PERCENT_PER_MONTH'
    | 'ADDITIONAL_PER_MONTH'
    | 'FIXED_PER_MONTH'
  type SettingsBonusRule = {
    id: string
    name: string
    valueKind: SettingsBonusRuleValueKind
    valueCents: number | null
    valueBps: number | null
    bonusType: SettingsBonusRuleType
  }
  const [settingsBonusRules, setSettingsBonusRules] = useState<SettingsBonusRule[]>([])
  const [settingsBonusRulesError, setSettingsBonusRulesError] = useState<string | null>(null)
  const [settingsBonusRulesLoading, setSettingsBonusRulesLoading] = useState(false)
  const [settingsBonusRulesSaving, setSettingsBonusRulesSaving] = useState(false)
  const [settingsBonusRulesSearch, setSettingsBonusRulesSearch] = useState('')
  const [settingsBonusRuleEditor, setSettingsBonusRuleEditor] = useState<
    | null
    | {
        mode: 'create' | 'edit'
        id?: string
        name: string
        valueKind: SettingsBonusRuleValueKind
        value: string
        bonusType: SettingsBonusRuleType
      }
  >(null)
  const filteredSettingsBonusRules = useMemo(() => {
    const q = settingsBonusRulesSearch.trim().toLowerCase()
    if (!q) return settingsBonusRules
    return settingsBonusRules.filter((r) => r.name.toLowerCase().includes(q))
  }, [settingsBonusRules, settingsBonusRulesSearch])

  const settingsBonusRuleById = useMemo(() => {
    const map: Record<string, SettingsBonusRule> = {}
    for (const r of settingsBonusRules) map[r.id] = r
    return map
  }, [settingsBonusRules])

  const settingsBonusTypeLabel: Record<SettingsBonusRuleType, string> = useMemo(
    () => ({
      PERCENT_PER_SHIFT: 'Porcentagem por plantão',
      ADDITIONAL_PER_SHIFT: 'Adicional por plantão',
      PERCENT_PER_MONTH: 'Porcentagem por mês',
      ADDITIONAL_PER_MONTH: 'Adicional por mês',
      FIXED_PER_MONTH: 'Fixo por mês',
    }),
    [],
  )

  type SettingsValuesShiftTypeRow = { shiftTypeCode: string; value: string }
  type SettingsValuesBonusRow = { bonusRuleId: string; valueKind: SettingsBonusRuleValueKind; value: string }

  const [settingsValuesPeriodStart, setSettingsValuesPeriodStart] = useState(() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    return `${yyyy}-${mm}-01`
  })
  const [settingsValuesPeriodEnd, setSettingsValuesPeriodEnd] = useState(() => {
    const now = new Date()
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const yyyy = last.getFullYear()
    const mm = String(last.getMonth() + 1).padStart(2, '0')
    const dd = String(last.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })
  const [settingsValuesLocationId, setSettingsValuesLocationId] = useState<string>('')
  const [settingsValuesSectorId, setSettingsValuesSectorId] = useState<string>('')
  const [settingsValuesExpandedShiftTypes, setSettingsValuesExpandedShiftTypes] = useState(true)
  const [settingsValuesExpandedBonuses, setSettingsValuesExpandedBonuses] = useState(true)
  const [settingsValuesShiftTypes, setSettingsValuesShiftTypes] = useState<SettingsValuesShiftTypeRow[]>([])
  const [settingsValuesBonuses, setSettingsValuesBonuses] = useState<SettingsValuesBonusRow[]>([])
  const [settingsValuesShiftTypeToAdd, setSettingsValuesShiftTypeToAdd] = useState<string>('')
  const [settingsValuesBonusToAdd, setSettingsValuesBonusToAdd] = useState<string>('')
  const [settingsValuesLoading, setSettingsValuesLoading] = useState(false)
  const [settingsValuesSaving, setSettingsValuesSaving] = useState(false)
  const [settingsValuesError, setSettingsValuesError] = useState<string | null>(null)

  const settingsShiftTypeThemeColorColumns: string[][] = [
    ['#ffffff', '#f1f5f9', '#cbd5e1', '#94a3b8', '#475569', '#0f172a'],
    ['#ecfeff', '#a5f3fc', '#22d3ee', '#0891b2', '#155e75', '#083344'],
    ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e40af', '#172554'],
    ['#f5f3ff', '#ddd6fe', '#a78bfa', '#7c3aed', '#5b21b6', '#2e1065'],
    ['#fdf2f8', '#fbcfe8', '#f472b6', '#db2777', '#9d174d', '#500724'],
    ['#fff7ed', '#fed7aa', '#fb923c', '#ea580c', '#9a3412', '#431407'],
    ['#fef2f2', '#fecaca', '#f87171', '#dc2626', '#991b1b', '#450a0a'],
    ['#f0fdf4', '#bbf7d0', '#4ade80', '#16a34a', '#166534', '#052e16'],
    ['#f7fee7', '#d9f99d', '#a3e635', '#65a30d', '#3f6212', '#1a2e05'],
    ['#fffbeb', '#fde68a', '#fbbf24', '#d97706', '#92400e', '#451a03'],
  ]

  const settingsShiftTypeStandardColors: string[] = [
    '#b91c1c',
    '#ef4444',
    '#f59e0b',
    '#facc15',
    '#84cc16',
    '#22c55e',
    '#06b6d4',
    '#3b82f6',
    '#1e3a8a',
    '#7c3aed',
  ]

  const SettingsShiftTypeColorPicker = ({
    value,
    disabled,
    onChange,
  }: {
    value: string
    disabled: boolean
    onChange: (next: string) => void
  }) => {
    const normalized = value.trim().toLowerCase()
    return (
      <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <div style={{ padding: '8px 10px', fontWeight: 900, fontSize: 12 }}>Cores do Tema</div>
        <div
          style={{
            padding: 10,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          {settingsShiftTypeThemeColorColumns.map((col, colIndex) => (
            <div key={colIndex} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {col.map((color) => {
                const selected = normalized === color.toLowerCase()
                return (
                  <button
                    key={color}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(color)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 3,
                      border: '1px solid rgba(0,0,0,0.14)',
                      background: color,
                      boxShadow: selected ? '0 0 0 2px #f97316' : undefined,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      padding: 0,
                    }}
                    aria-label={`Selecionar cor ${color}`}
                    title={color}
                  />
                )
              })}
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid rgba(0,0,0,0.12)', padding: '8px 10px', fontWeight: 900, fontSize: 12 }}>
          Cores Padrão
        </div>
        <div style={{ padding: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {settingsShiftTypeStandardColors.map((color) => {
            const selected = normalized === color.toLowerCase()
            return (
              <button
                key={color}
                type="button"
                disabled={disabled}
                onClick={() => onChange(color)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 3,
                  border: '1px solid rgba(0,0,0,0.14)',
                  background: color,
                  boxShadow: selected ? '0 0 0 2px #f97316' : undefined,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  padding: 0,
                }}
                aria-label={`Selecionar cor ${color}`}
                title={color}
              />
            )
          })}
        </div>
      </div>
    )
  }

  const filteredSettingsShiftTypes = useMemo(() => {
    const q = settingsShiftTypesSearch.trim().toLowerCase()
    const base = q
      ? settingsShiftTypes.filter((t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
      : settingsShiftTypes
    return [...base].sort((a, b) => {
      const aNormal = a.code === 'NORMAL'
      const bNormal = b.code === 'NORMAL'
      if (aNormal && !bNormal) return -1
      if (!aNormal && bNormal) return 1
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    })
  }, [settingsShiftTypes, settingsShiftTypesSearch])

  const filteredSettingsShiftSituations = useMemo(() => {
    const q = settingsShiftSituationsSearch.trim().toLowerCase()
    const base = q
      ? settingsShiftSituations.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
      : settingsShiftSituations
    return [...base].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
  }, [settingsShiftSituations, settingsShiftSituationsSearch])

  type SettingsSector = { id: string; locationId: string | null; code: string | null; name: string; enabled: boolean }
  type SettingsLocation = {
    id: string
    code: string | null
    name: string
    enabled: boolean
    cep: string | null
    street: string | null
    streetNumber: string | null
    complement: string | null
    neighborhood: string | null
    city: string | null
    state: string | null
    notes: string | null
    latitude: number | null
    longitude: number | null
    timeZone: string | null
    sectors: SettingsSector[]
  }

  const [settingsLocations, setSettingsLocations] = useState<SettingsLocation[]>([])
  const [settingsLocationsError, setSettingsLocationsError] = useState<string | null>(null)
  const [settingsLocationsLoading, setSettingsLocationsLoading] = useState(false)
  const [settingsLocationsSearch, setSettingsLocationsSearch] = useState('')
  const [settingsLocationsSaving, setSettingsLocationsSaving] = useState(false)
  const [settingsLocationModal, setSettingsLocationModal] = useState<
    | null
    | {
        mode: 'create' | 'edit'
        locationId?: string
        form: {
          code: string
          name: string
          cep: string
          street: string
          streetNumber: string
          complement: string
          neighborhood: string
          city: string
          state: string
          notes: string
          googleMapsUrl: string
          latitude: string
          longitude: string
          timeZone: string
          sectors: Array<{ code: string; name: string }>
        }
      }
  >(null)
  const [settingsSectorModal, setSettingsSectorModal] = useState<
    | null
    | {
        mode: 'create' | 'edit'
        sectorId?: string
        locationId: string
        form: { code: string; name: string }
      }
  >(null)
  const filteredSettingsLocations = useMemo(() => {
    const q = settingsLocationsSearch.trim().toLowerCase()
    if (!q) return settingsLocations
    return settingsLocations.filter((l) => {
      const address = [l.street, l.streetNumber, l.city, l.state].filter(Boolean).join(' ').toLowerCase()
      return (
        l.name.toLowerCase().includes(q) ||
        (l.code ?? '').toLowerCase().includes(q) ||
        address.includes(q) ||
        l.sectors.some((s) => s.name.toLowerCase().includes(q) || (s.code ?? '').toLowerCase().includes(q))
      )
    })
  }, [settingsLocations, settingsLocationsSearch])

  const settingsValuesAvailableSectors = useMemo(() => {
    const location = settingsLocations.find((l) => l.id === settingsValuesLocationId)
    return (location?.sectors ?? []).filter((s) => s.enabled)
  }, [settingsLocations, settingsValuesLocationId])

  const settingsShiftTypeNameByCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of settingsShiftTypes) map[t.code] = t.name
    return map
  }, [settingsShiftTypes])

  const settingsValuesAvailableShiftTypes = useMemo(() => {
    const used = new Set(settingsValuesShiftTypes.map((s) => s.shiftTypeCode))
    return filteredSettingsShiftTypes.filter((t) => !used.has(t.code))
  }, [filteredSettingsShiftTypes, settingsValuesShiftTypes])

  const settingsValuesAvailableBonuses = useMemo(() => {
    const used = new Set(settingsValuesBonuses.map((b) => b.bonusRuleId))
    return settingsBonusRules.filter((r) => !used.has(r.id))
  }, [settingsBonusRules, settingsValuesBonuses])

  async function loadAdminData() {
    try {
      const [tenant, types] = await Promise.all([
        apiFetch<{
          id: string
          name: string
          organizationTypeId: string | null
          organizationTypeName: string | null
          userTerm: string | null
          shiftTerm: string | null
        }>('/api/admin/tenant'),
        apiFetch<Array<{ id: string; segmentId: string; name: string; userTerm: string; shiftTerm: string }>>('/api/public/organization-types'),
      ])
      setTenantInfo(tenant)
      setOrganizationTypes(types.slice().sort((a, b) => a.name.localeCompare(b.name)))
      setAdminError(null)
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setAdminError(message || 'Não foi possível carregar as configurações da organização.')
    }
  }

  async function loadSystemData() {
    try {
      const [segmentsResponse, typesResponse] = await Promise.all([
        apiFetch<Array<{ id: string; name: string }>>('/api/system/catalog/segments'),
        apiFetch<Array<{ id: string; segmentId: string; name: string; userTerm: string; shiftTerm: string }>>('/api/system/catalog/organization-types'),
      ])
      setSegments(segmentsResponse.slice().sort((a, b) => a.name.localeCompare(b.name)))
      setSystemOrganizationTypes(typesResponse.slice().sort((a, b) => a.name.localeCompare(b.name)))
      setSystemError(null)
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setSystemError(message || 'Não foi possível carregar o catálogo.')
    }
  }

  const loadAdminProfessionalProfileCatalog = useCallback(async () => {
    try {
      const data = await apiFetch<ProfessionalProfileCatalogResponse>('/api/admin/professional-profile-catalog')
      setAdminProfessionalProfileCatalog(data)
      setAdminProfessionalProfileCatalogError(null)
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setAdminProfessionalProfileCatalogError(message || 'Não foi possível carregar o catálogo de perfil profissional.')
    }
  }, [])

  const loadSystemProfessionalProfileCatalog = useCallback(async (organizationTypeId: string) => {
    try {
      const qs = new URLSearchParams()
      qs.set('organizationTypeId', organizationTypeId)
      const data = await apiFetch<ProfessionalProfileCatalogResponse>(`/api/system/professional-profile-catalog?${qs.toString()}`)
      setSystemProfessionalProfileCatalog(data)
      setSystemProfessionalProfileCatalogError(null)
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setSystemProfessionalProfileCatalogError(message || 'Não foi possível carregar o catálogo de perfil profissional.')
    }
  }, [])

  const loadSettingsGroups = useCallback(async () => {
    setSettingsGroupsLoading(true)
    try {
      const data = await apiFetch<SettingsGroup[]>('/api/groups')
      setSettingsGroups(data.slice().sort((a, b) => a.name.localeCompare(b.name)))
      setSettingsGroupsError(null)
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setSettingsGroupsError(message || 'Não foi possível carregar os grupos.')
    } finally {
      setSettingsGroupsLoading(false)
    }
  }, [])

  const loadSettingsShiftTypes = useCallback(async () => {
    setSettingsShiftTypesLoading(true)
    try {
      const data = await apiFetch<SettingsShiftType[]>('/api/settings/shift-types')
      setSettingsShiftTypes(data.slice().sort((a, b) => a.name.localeCompare(b.name)))
      setSettingsShiftTypesError(null)
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setSettingsShiftTypesError(message || 'Não foi possível carregar os tipos de plantão.')
    } finally {
      setSettingsShiftTypesLoading(false)
    }
  }, [])

  const loadSettingsShiftSituations = useCallback(async () => {
    setSettingsShiftSituationsLoading(true)
    try {
      const data = await apiFetch<SettingsShiftSituation[]>('/api/settings/shift-situations')
      setSettingsShiftSituations(data.slice().sort((a, b) => a.name.localeCompare(b.name)))
      setSettingsShiftSituationsError(null)
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setSettingsShiftSituationsError(message || 'Não foi possível carregar as situações do plantão.')
    } finally {
      setSettingsShiftSituationsLoading(false)
    }
  }, [])

  const loadSettingsLocations = useCallback(async () => {
    setSettingsLocationsLoading(true)
    try {
      const data = await apiFetch<SettingsLocation[]>('/api/settings/locations')
      const normalized = data
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((l) => ({
          ...l,
          sectors: (l.sectors ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
        }))
      setSettingsLocations(normalized)
      setSettingsLocationsError(null)
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setSettingsLocationsError(message || 'Não foi possível carregar os locais e setores.')
    } finally {
      setSettingsLocationsLoading(false)
    }
  }, [])

  const loadSettingsBonusRules = useCallback(async () => {
    setSettingsBonusRulesLoading(true)
    try {
      const data = await apiFetch<SettingsBonusRule[]>('/api/settings/bonuses')
      setSettingsBonusRules(data.slice().sort((a, b) => a.name.localeCompare(b.name)))
      setSettingsBonusRulesError(null)
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setSettingsBonusRulesError(message || 'Não foi possível carregar as bonificações.')
    } finally {
      setSettingsBonusRulesLoading(false)
    }
  }, [])

  type SettingsValuesResponse = {
    sectorId: string
    periodStart: string
    periodEnd: string
    shiftTypes: Array<{ shiftTypeCode: string; valueCents: number; currency: string }>
    bonuses: Array<{ bonusRuleId: string; valueKind: SettingsBonusRuleValueKind; valueCents: number | null; valueBps: number | null }>
  }
  const loadSettingsValues = useCallback(async (params: { sectorId: string; periodStart: string; periodEnd: string }) => {
    setSettingsValuesLoading(true)
    try {
      const q = new URLSearchParams({
        sectorId: params.sectorId,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
      })
      const data = await apiFetch<SettingsValuesResponse>(`/api/settings/values?${q.toString()}`)
      setSettingsValuesShiftTypes(
        (data.shiftTypes ?? []).map((v) => ({
          shiftTypeCode: v.shiftTypeCode,
          value: (v.valueCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        })),
      )
      setSettingsValuesBonuses(
        (data.bonuses ?? []).map((v) => ({
          bonusRuleId: v.bonusRuleId,
          valueKind: v.valueKind,
          value:
            v.valueKind === 'PERCENT' && v.valueBps != null
              ? String(v.valueBps / 100).replace(/\.0+$/, '')
              : v.valueKind === 'CURRENCY' && v.valueCents != null
                ? (v.valueCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '',
        })),
      )
      setSettingsValuesError(null)
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setSettingsValuesError(message || 'Não foi possível carregar os valores.')
    } finally {
      setSettingsValuesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!session.accessToken) return
    const timers: number[] = []
    if (isAdmin) {
      timers.push(window.setTimeout(() => void loadAdminData(), 0))
    }
    if (isSuperAdmin) {
      timers.push(window.setTimeout(() => void loadSystemData(), 0))
    }
    return () => {
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [session.accessToken, isAdmin, isSuperAdmin])

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node

      if (companyMenuRef.current && !companyMenuRef.current.contains(target)) {
        setCompanyMenuOpen(false)
      }

      if (sidebarCollapsed && navFlyoutSectionId && sidebarRef.current && !sidebarRef.current.contains(target)) {
        setNavFlyoutSectionId(null)
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [navFlyoutSectionId, sidebarCollapsed])

  useEffect(() => {
    if (!navFlyoutSectionId) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setNavFlyoutSectionId(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navFlyoutSectionId])

  const selectedCompanyName = tenantInfo?.name ?? 'Minha empresa'

  const timeJustificationsEnabled = useMemo(() => {
    try {
      return window.localStorage.getItem('ge.preferences.timeJustifications') === 'true'
    } catch {
      return false
    }
  }, [])

  const workspaceSections = useMemo<WorkspaceSection[]>(() => {
    return [
      {
        id: 'dashboard' as const,
        label: 'Painel de Controle',
        icon: 'barChart' as const,
        items: [
          { id: 'resumo' as const, label: 'Resumo' },
          { id: 'relatorio' as const, label: 'Relatório' },
          { id: 'carga-horaria' as const, label: 'Carga horária' },
        ],
      },
      {
        id: 'scheduling' as const,
        label: 'Escala',
        icon: 'calendar' as const,
        items: [
          { id: 'semanal' as const, label: 'Semanal', icon: 'calendarWeek' as const },
          { id: 'mensal' as const, label: 'Mensal', icon: 'calendarMonth' as const },
          { id: 'profissional' as const, label: 'Profissional', icon: 'person' as const },
          { id: '12x36' as const, label: '12x36', icon: 'shiftScale' as const },
          { id: 'busca' as const, label: 'Busca', icon: 'textSearch' as const },
          { id: 'modelo' as const, label: 'Modelo', icon: 'templatePlus' as const },
          {
            id: 'justificativas' as const,
            label: 'Justificativas de Horário',
            icon: 'search' as const,
            enabled: timeJustificationsEnabled,
          },
        ],
      },
      {
        id: 'users' as const,
        label: 'Usuários',
        icon: 'persons' as const,
        items: [
          { id: 'profissionais' as const, label: 'Profissionais', icon: 'persons' as const },
          { id: 'coordenadores' as const, label: 'Coordenadores', icon: 'person' as const },
        ],
      },
      {
        id: 'settings' as const,
        label: 'Configurações',
        icon: 'gear' as const,
        items: [
          { id: 'locais-setores' as const, label: 'Locais e Setores', icon: 'mapPin' as const },
          { id: 'grupos' as const, label: 'Grupos', icon: 'users' as const, enabled: canManageGroups },
          { id: 'tipos-plantao' as const, label: 'Tipos de Plantão', icon: 'tag' as const },
          { id: 'situacoes-plantao' as const, label: 'Situações do Plantão', icon: 'flag' as const },
          { id: 'valores' as const, label: 'Valores', icon: 'money' as const },
          { id: 'bonificacoes' as const, label: 'Bonificações', icon: 'gift' as const },
          { id: 'produtividades' as const, label: 'Produtividades', icon: 'barChart' as const },
          {
            id: 'profissionais-config' as const,
            label: 'Profissionais',
            icon: 'persons' as const,
            enabled: canManageProfessionalProfileCatalog,
          },
        ],
      },
    ]
  }, [canManageGroups, canManageProfessionalProfileCatalog, timeJustificationsEnabled])

  const normalizeWorkspaceHash = useCallback(
    (hash: string): { sectionId: WorkspaceSectionId; itemId: WorkspaceItemId } => {
      const normalized = hash.startsWith('#') ? hash.slice(1) : hash
      const [sectionRaw, itemRaw] = normalized.split('/')
      const sectionId = (sectionRaw || 'dashboard') as WorkspaceSectionId
      const section = workspaceSections.find((s) => s.id === sectionId) ?? workspaceSections[0]
      const itemIdFromHash = itemRaw as WorkspaceItemId | undefined
      const item = section.items.find((i) => i.id === itemIdFromHash) ?? section.items[0]
      return { sectionId: section.id, itemId: item.id }
    },
    [workspaceSections],
  )

  const normalizedHash = useMemo(() => normalizeWorkspaceHash(location.hash), [location.hash, normalizeWorkspaceHash])
  const activeSectionId = normalizedHash.sectionId
  const activeItemId = normalizedHash.itemId

  useEffect(() => {
    if (!session.accessToken) return
    if (activeSectionId !== 'settings') return
    if (activeItemId !== 'profissionais-config') return

    if (isSuperAdmin) {
      if (!systemProfessionalProfileCatalogOrganizationTypeId && systemOrganizationTypes.length) {
        setSystemProfessionalProfileCatalogOrganizationTypeId(systemOrganizationTypes[0].id)
      }
      return
    }
    if (isAdmin) {
      void loadAdminProfessionalProfileCatalog()
    }
  }, [
    activeItemId,
    activeSectionId,
    isAdmin,
    isSuperAdmin,
    loadAdminProfessionalProfileCatalog,
    session.accessToken,
    systemOrganizationTypes,
    systemProfessionalProfileCatalogOrganizationTypeId,
  ])

  useEffect(() => {
    if (!session.accessToken) return
    if (!isSuperAdmin) return
    if (activeSectionId !== 'settings') return
    if (activeItemId !== 'profissionais-config') return
    if (!systemProfessionalProfileCatalogOrganizationTypeId) return
    void loadSystemProfessionalProfileCatalog(systemProfessionalProfileCatalogOrganizationTypeId)
  }, [
    activeItemId,
    activeSectionId,
    isSuperAdmin,
    loadSystemProfessionalProfileCatalog,
    session.accessToken,
    systemProfessionalProfileCatalogOrganizationTypeId,
  ])

  useEffect(() => {
    if (!session.accessToken) return
    if (activeSectionId !== 'settings') return
    if (activeItemId !== 'grupos') return
    if (!isAdmin && !isSuperAdmin) return
    setSettingsGroupEditor(null)
    void loadSettingsGroups()
  }, [activeItemId, activeSectionId, isAdmin, isSuperAdmin, loadSettingsGroups, session.accessToken])

  useEffect(() => {
    if (!session.accessToken) return
    if (activeSectionId !== 'settings') return
    if (activeItemId !== 'tipos-plantao') return
    setSettingsShiftTypeEditor(null)
    void loadSettingsShiftTypes()
  }, [activeItemId, activeSectionId, loadSettingsShiftTypes, session.accessToken])

  useEffect(() => {
    if (!session.accessToken) return
    if (activeSectionId !== 'settings') return
    if (activeItemId !== 'situacoes-plantao') return
    setSettingsShiftSituationEditor(null)
    void loadSettingsShiftSituations()
  }, [activeItemId, activeSectionId, loadSettingsShiftSituations, session.accessToken])

  useEffect(() => {
    if (!session.accessToken) return
    if (activeSectionId !== 'settings') return
    if (activeItemId !== 'locais-setores') return
    setSettingsLocationModal(null)
    setSettingsSectorModal(null)
    void loadSettingsLocations()
  }, [activeItemId, activeSectionId, loadSettingsLocations, session.accessToken])

  useEffect(() => {
    if (!session.accessToken) return
    if (activeSectionId !== 'settings') return
    if (activeItemId !== 'valores') return
    setSettingsValuesError(null)
    void loadSettingsLocations()
    void loadSettingsShiftTypes()
    void loadSettingsBonusRules()
  }, [activeItemId, activeSectionId, loadSettingsBonusRules, loadSettingsLocations, loadSettingsShiftTypes, session.accessToken])

  useEffect(() => {
    if (activeSectionId !== 'settings') return
    if (activeItemId !== 'valores') return
    if (settingsValuesLocationId) return
    const first = settingsLocations[0]
    if (first) setSettingsValuesLocationId(first.id)
  }, [activeItemId, activeSectionId, settingsLocations, settingsValuesLocationId])

  useEffect(() => {
    if (activeSectionId !== 'settings') return
    if (activeItemId !== 'valores') return
    if (!settingsValuesLocationId) return
    const location = settingsLocations.find((l) => l.id === settingsValuesLocationId)
    const sectors = (location?.sectors ?? []).filter((s) => s.enabled)
    if (!sectors.length) return
    if (settingsValuesSectorId && sectors.some((s) => s.id === settingsValuesSectorId)) return
    setSettingsValuesSectorId(sectors[0].id)
  }, [activeItemId, activeSectionId, settingsLocations, settingsValuesLocationId, settingsValuesSectorId])

  useEffect(() => {
    if (!session.accessToken) return
    if (activeSectionId !== 'settings') return
    if (activeItemId !== 'bonificacoes') return
    setSettingsBonusRuleEditor(null)
    void loadSettingsBonusRules()
  }, [activeItemId, activeSectionId, loadSettingsBonusRules, session.accessToken])

  useEffect(() => {
    if (!session.accessToken) return
    if (activeSectionId !== 'settings') return
    if (activeItemId !== 'valores') return
    if (!settingsValuesSectorId) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(settingsValuesPeriodStart)) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(settingsValuesPeriodEnd)) return
    void loadSettingsValues({ sectorId: settingsValuesSectorId, periodStart: settingsValuesPeriodStart, periodEnd: settingsValuesPeriodEnd })
  }, [
    activeItemId,
    activeSectionId,
    loadSettingsValues,
    session.accessToken,
    settingsValuesPeriodEnd,
    settingsValuesPeriodStart,
    settingsValuesSectorId,
  ])

  useEffect(() => {
    if (activeSectionId !== 'settings') return
    if (activeItemId !== 'valores') return
    if (settingsValuesShiftTypeToAdd) return
    const first = settingsValuesAvailableShiftTypes[0]
    if (first) setSettingsValuesShiftTypeToAdd(first.code)
  }, [activeItemId, activeSectionId, settingsValuesAvailableShiftTypes, settingsValuesShiftTypeToAdd])

  useEffect(() => {
    if (activeSectionId !== 'settings') return
    if (activeItemId !== 'valores') return
    if (settingsValuesBonusToAdd) return
    const first = settingsValuesAvailableBonuses[0]
    if (first) setSettingsValuesBonusToAdd(first.id)
  }, [activeItemId, activeSectionId, settingsValuesAvailableBonuses, settingsValuesBonusToAdd])

  useEffect(() => {
    const desiredHash = `#${activeSectionId}/${activeItemId}`
    if (location.hash === desiredHash) return
    navigate({ pathname: '/dashboard', hash: desiredHash }, { replace: true })
  }, [activeItemId, activeSectionId, location.hash, navigate])

  const activeSection = workspaceSections.find((s) => s.id === activeSectionId) ?? workspaceSections[0]
  const activeItem = activeSection.items.find((i) => i.id === activeItemId) ?? activeSection.items[0]

  const weeklyHeaderEnabled = activeSectionId === 'scheduling' && activeItemId === 'semanal'
  const professionalHeaderEnabled = activeSectionId === 'scheduling' && activeItemId === 'profissional'
  const templateHeaderEnabled = activeSectionId === 'scheduling' && activeItemId === 'modelo'
  const searchHeaderEnabled = activeSectionId === 'scheduling' && activeItemId === 'busca'
  const groupsHeaderEnabled = activeSectionId === 'settings' && activeItemId === 'grupos'
  const locationsHeaderEnabled = activeSectionId === 'settings' && activeItemId === 'locais-setores'
  const shiftTypesHeaderEnabled = activeSectionId === 'settings' && activeItemId === 'tipos-plantao'
  const shiftSituationsHeaderEnabled = activeSectionId === 'settings' && activeItemId === 'situacoes-plantao'
  const addProfessionalGroupsDataEnabled = addProfessionalDialog.open && addProfessionalDialog.tabId === 'grupos'
  const addProfessionalBonusesDataEnabled = addProfessionalDialog.open && addProfessionalDialog.tabId === 'bonificacao'
  const schedulingScopeDataEnabled =
    weeklyHeaderEnabled ||
    professionalHeaderEnabled ||
    templateHeaderEnabled ||
    searchHeaderEnabled ||
    addProfessionalGroupsDataEnabled ||
    addProfessionalBonusesDataEnabled

  type CoordinatorScopeTag = { id: string; name: string }
  type Coordinator = {
    id: string
    fullName: string
    email: string
    locations: CoordinatorScopeTag[]
    sectors: CoordinatorScopeTag[]
    groups: CoordinatorScopeTag[]
  }

  const canManageCoordinators =
    isSuperAdmin || isAdmin || (roles.includes('COORDINATOR') && permissions.includes('MANAGE_COORDINATORS'))
  const coordinatorsPanelEnabled = activeSectionId === 'users' && activeItemId === 'coordenadores'

  type CoordinatorCreateTabId = 'informacoes' | 'permissoes' | 'grupos'
  type CoordinatorPermissionKey =
    | 'manageShifts'
    | 'manageShiftValue'
    | 'manageValueConfiguration'
    | 'manageProfessionals'
    | 'manageCoordinators'
    | 'manageViewers'
    | 'manageAlerts'
  type CoordinatorPermissionCode =
    | 'MANAGE_SHIFTS'
    | 'MANAGE_SHIFT_VALUE'
    | 'MANAGE_VALUE_CONFIGURATION'
    | 'MANAGE_PROFESSIONALS'
    | 'MANAGE_COORDINATORS'
    | 'MANAGE_VIEWERS'
    | 'MANAGE_ALERTS'
  type CoordinatorCreateForm = {
    fullName: string
    email: string
    phone1: string
    phone2: string
    cep: string
    street: string
    streetNumber: string
    neighborhood: string
    complement: string
    state: string
    city: string
    password: string
    passwordRepeat: string
    permissions: Record<CoordinatorPermissionKey, boolean>
    groupIds: string[]
  }

  const [coordinatorsSearch, setCoordinatorsSearch] = useState('')
  const [coordinatorsGroupId, setCoordinatorsGroupId] = useState<string>('all')
  const [selectedCoordinatorIds, setSelectedCoordinatorIds] = useState<Set<string>>(() => new Set())
  const [coordinatorModal, setCoordinatorModal] = useState<
    | { open: false }
    | {
        open: true
        tabId: CoordinatorCreateTabId
        form: CoordinatorCreateForm
        error: string | null
        groupsSearch: string
        groupsOnlySelected: boolean
      }
  >({ open: false })

  const coordinatorGroupsQuery = useQuery({
    queryKey: ['coordinatorGroups'],
    queryFn: () => apiFetch<Array<{ id: string; name: string }>>('/api/groups'),
    enabled: coordinatorsPanelEnabled && canManageCoordinators,
  })

  const coordinatorsQueryKey = useMemo(() => {
    const groupId = coordinatorsGroupId !== 'all' ? coordinatorsGroupId : ''
    return ['coordinators', coordinatorsSearch.trim(), groupId] as const
  }, [coordinatorsGroupId, coordinatorsSearch])

  const coordinatorsQuery = useQuery({
    queryKey: coordinatorsQueryKey,
    queryFn: () => {
      const params = new URLSearchParams()
      const q = coordinatorsSearch.trim()
      if (q) params.set('search', q)
      if (coordinatorsGroupId !== 'all') params.set('groupId', coordinatorsGroupId)
      const qs = params.toString()
      return apiFetch<Coordinator[]>(`/api/users/coordinators${qs ? `?${qs}` : ''}`)
    },
    enabled: coordinatorsPanelEnabled && canManageCoordinators,
  })

  const createCoordinatorMutation = useMutation({
    mutationFn: async (input: { fullName: string; email: string; password: string; permissions: string[] }) => {
      return apiFetch<Coordinator>('/api/users/coordinators', { method: 'POST', body: JSON.stringify(input) })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coordinators'] })
    },
  })

  const bulkAddCoordinatorGroupMutation = useMutation({
    mutationFn: async (input: { userIds: string[]; groupId: string }) => {
      return apiFetch<void>('/api/users/coordinators/groups:add', { method: 'POST', body: JSON.stringify(input) })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coordinators'] })
    },
  })

  const bulkRemoveCoordinatorGroupMutation = useMutation({
    mutationFn: async (input: { userIds: string[]; groupId: string }) => {
      return apiFetch<void>('/api/users/coordinators/groups:remove', { method: 'POST', body: JSON.stringify(input) })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coordinators'] })
    },
  })

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: () => apiFetch<MonthlyLocation[]>('/api/locations'),
    enabled: schedulingScopeDataEnabled,
  })
  const sectorsQuery = useQuery({
    queryKey: ['sectors'],
    queryFn: () => apiFetch<MonthlySector[]>('/api/sectors'),
    enabled: schedulingScopeDataEnabled,
  })

  const [weeklyScopeValue, setWeeklyScopeValue] = useState<string>(() => {
    try {
      return window.localStorage.getItem('ge.scheduling.weekly.scope') ?? ''
    } catch {
      void 0
    }
    return ''
  })

  const defaultWeeklyScopeValue = useMemo(() => {
    const locations = locationsQuery.data ?? []
    const sectors = sectorsQuery.data ?? []
    const firstLocation = locations[0]
    if (firstLocation) return `loc:${firstLocation.id}`
    const firstSector = sectors[0]
    if (firstSector) return `sec:${firstSector.id}`
    return ''
  }, [locationsQuery.data, sectorsQuery.data])

  const effectiveWeeklyScopeValue = weeklyScopeValue || defaultWeeklyScopeValue

  useEffect(() => {
    if (!weeklyHeaderEnabled) return
    if (!effectiveWeeklyScopeValue) return
    try {
      window.localStorage.setItem('ge.scheduling.weekly.scope', effectiveWeeklyScopeValue)
    } catch {
      void 0
    }
  }, [effectiveWeeklyScopeValue, weeklyHeaderEnabled])

  const weeklyScope = useMemo(() => {
    const locations = locationsQuery.data ?? []
    const sectors = sectorsQuery.data ?? []

    if (effectiveWeeklyScopeValue.startsWith('loc:')) {
      const id = effectiveWeeklyScopeValue.slice(4)
      if (locations.some((l) => l.id === id)) return { kind: 'loc' as const, id }
    }
    if (effectiveWeeklyScopeValue.startsWith('sec:')) {
      const id = effectiveWeeklyScopeValue.slice(4)
      if (sectors.some((s) => s.id === id)) return { kind: 'sec' as const, id }
    }
    const firstLocation = locations[0]
    if (firstLocation) return { kind: 'loc' as const, id: firstLocation.id }
    const firstSector = sectors[0]
    if (firstSector) return { kind: 'sec' as const, id: firstSector.id }
    return { kind: 'loc' as const, id: '' }
  }, [effectiveWeeklyScopeValue, locationsQuery.data, sectorsQuery.data])

  const weeklyScopeOptions = useMemo(() => {
    const locations = locationsQuery.data ?? []
    const sectors = sectorsQuery.data ?? []

    const nbsp = (count: number) => '\u00A0'.repeat(Math.max(0, count))
    const padRightNbsp = (text: string, width: number) => {
      if (text.length >= width) return `${text}${nbsp(2)}`
      return `${text}${nbsp(width - text.length)}`
    }
    const fmt = (name: string, type: 'Local' | 'Setor', indent: number) => `${padRightNbsp(`${nbsp(indent)}${name}`, 34)}${type}`

    const sectorsByLocation: Record<string, MonthlySector[]> = {}
    const sectorsWithoutLocation: MonthlySector[] = []
    for (const s of sectors) {
      if (!s.locationId) sectorsWithoutLocation.push(s)
      else {
        if (!sectorsByLocation[s.locationId]) sectorsByLocation[s.locationId] = []
        sectorsByLocation[s.locationId].push(s)
      }
    }

    for (const locId of Object.keys(sectorsByLocation)) {
      sectorsByLocation[locId].sort((a, b) => a.name.localeCompare(b.name))
    }
    sectorsWithoutLocation.sort((a, b) => a.name.localeCompare(b.name))

    const options: Array<{ value: string; label: string }> = []
    for (const l of locations) {
      options.push({ value: `loc:${l.id}`, label: fmt(l.name, 'Local', 0) })
      for (const s of sectorsByLocation[l.id] ?? []) {
        options.push({ value: `sec:${s.id}`, label: fmt(s.name, 'Setor', 2) })
      }
    }
    for (const s of sectorsWithoutLocation) {
      options.push({ value: `sec:${s.id}`, label: fmt(s.name, 'Setor', 0) })
    }
    return options
  }, [locationsQuery.data, sectorsQuery.data])

  const [professionalScopeValue, setProfessionalScopeValue] = useState<string>(() => {
    try {
      return window.localStorage.getItem('ge.scheduling.professional.scope') ?? 'all'
    } catch {
      return 'all'
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem('ge.scheduling.professional.scope', professionalScopeValue || 'all')
    } catch {
      void 0
    }
  }, [professionalScopeValue])

  const [professionalSearch, setProfessionalSearch] = useState<string>('')

  const professionalScopeOptions = useMemo(() => {
    const locations = locationsQuery.data ?? []
    const sectors = sectorsQuery.data ?? []

    const nbsp = (count: number) => '\u00A0'.repeat(Math.max(0, count))
    const padRightNbsp = (text: string, width: number) => {
      if (text.length >= width) return `${text}${nbsp(2)}`
      return `${text}${nbsp(width - text.length)}`
    }
    const fmt = (name: string, type: 'Local' | 'Setor', indent: number) => `${padRightNbsp(`${nbsp(indent)}${name}`, 34)}${type}`

    const sectorsByLocation: Record<string, MonthlySector[]> = {}
    const sectorsWithoutLocation: MonthlySector[] = []
    for (const s of sectors) {
      if (!s.locationId) sectorsWithoutLocation.push(s)
      else {
        if (!sectorsByLocation[s.locationId]) sectorsByLocation[s.locationId] = []
        sectorsByLocation[s.locationId].push(s)
      }
    }

    for (const locId of Object.keys(sectorsByLocation)) {
      sectorsByLocation[locId].sort((a, b) => a.name.localeCompare(b.name))
    }
    sectorsWithoutLocation.sort((a, b) => a.name.localeCompare(b.name))

    const options: Array<{ value: string; label: string }> = [{ value: 'all', label: 'Todos Locais/Grupos' }]
    for (const l of locations) {
      options.push({ value: `loc:${l.id}`, label: fmt(l.name, 'Local', 0) })
      for (const s of sectorsByLocation[l.id] ?? []) {
        options.push({ value: `sec:${s.id}`, label: fmt(s.name, 'Setor', 2) })
      }
    }
    for (const s of sectorsWithoutLocation) {
      options.push({ value: `sec:${s.id}`, label: fmt(s.name, 'Setor', 0) })
    }
    return options
  }, [locationsQuery.data, sectorsQuery.data])

  function selectSection(sectionId: WorkspaceSectionId) {
    const section = workspaceSections.find((s) => s.id === sectionId) ?? workspaceSections[0]
    const firstEnabled = section.items.find((i) => i.enabled !== false) ?? section.items[0]
    navigate({ pathname: '/dashboard', hash: `#${section.id}/${firstEnabled.id}` }, { replace: true })
  }

  function selectItem(itemId: WorkspaceItemId) {
    const item = activeSection.items.find((i) => i.id === itemId)
    if (!item) return
    if (item.enabled === false) return
    setNavFlyoutSectionId(null)
    navigate({ pathname: '/dashboard', hash: `#${activeSectionId}/${item.id}` }, { replace: true })
  }

  function selectItemFromSection(sectionId: WorkspaceSectionId, itemId: WorkspaceItemId) {
    const section = workspaceSections.find((s) => s.id === sectionId) ?? workspaceSections[0]
    const item = section.items.find((i) => i.id === itemId)
    if (!item) return
    if (item.enabled === false) return
    setNavFlyoutSectionId(null)
    navigate({ pathname: '/dashboard', hash: `#${section.id}/${item.id}` }, { replace: true })
  }

  function onNavSectionClick(sectionId: WorkspaceSectionId) {
    if (sidebarCollapsed) {
      setNavFlyoutSectionId((current) => (current === sectionId ? null : sectionId))
    }
    selectSection(sectionId)
  }

  function logout() {
    clearSession()
    navigate('/login')
  }

  return (
    <div className="ge-dashboardShell">
      <header className="ge-header">
        <div className="ge-headerLeft">
          <button
            type="button"
            className="ge-appName"
            aria-label="Ir para o GetEscala"
            title="GetEscala"
            onClick={() => navigate('/schedules')}
          >
            <img className="ge-appIcon" src="/icon.png" alt="" width={32} height={32} />
            <span className="ge-appNameText">GetEscala</span>
          </button>
        </div>
        <div className="ge-headerRight">
          <div className="ge-headerRightScroll">
            <IconButton icon="help" label="Ajuda" onClick={() => navigate('/schedules')} />
            <IconButton icon="envelope" label="Avisos" onClick={() => navigate('/schedules')} />
            <IconButton icon="warning" label="Alertas" badgeColor="yellow" onClick={() => navigate('/schedules')} />
            <IconButton icon="bell" label="Notificações" badgeColor="green" onClick={() => navigate('/schedules')} />
          </div>

          <div className="ge-companyMenu" ref={companyMenuRef}>
            <button
              type="button"
              className="ge-companyMenuButton"
              aria-haspopup="menu"
              aria-expanded={companyMenuOpen}
              onClick={() => setCompanyMenuOpen((v) => !v)}
            >
              <span className="ge-companyMenuIcon" aria-hidden="true">
                <SvgIcon name="building" size={18} />
              </span>
              <span className="ge-companyMenuLabel">{selectedCompanyName}</span>
              <span className="ge-companyMenuChevron">
                <SvgIcon name="chevronDown" size={18} />
              </span>
            </button>
            {companyMenuOpen ? (
              <div className="ge-companyMenuDropdown" role="menu">
                <button type="button" className="ge-menuItem" role="menuitem" onClick={() => setCompanyMenuOpen(false)}>
                  Meus dados
                </button>
                <button type="button" className="ge-menuItem" role="menuitem" onClick={() => setCompanyMenuOpen(false)}>
                  Preferências
                </button>
                <button type="button" className="ge-menuItem" role="menuitem" onClick={() => setCompanyMenuOpen(false)}>
                  Novidades
                </button>
                <button
                  type="button"
                  className="ge-menuItem ge-menuItemDanger"
                  role="menuitem"
                  onClick={() => {
                    setCompanyMenuOpen(false)
                    logout()
                  }}
                >
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className={`ge-dashboardBody ${sidebarCollapsed ? 'ge-dashboardBodyCollapsed' : ''}`}>
        <aside className={`ge-sidebar ${sidebarCollapsed ? 'ge-sidebarCollapsed' : ''}`} ref={sidebarRef}>
          <nav className="ge-nav">
            {workspaceSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`ge-navGroupHeader ${activeSectionId === section.id ? 'ge-navGroupHeaderActive' : ''}`}
                aria-label={section.label}
                title={section.label}
                onClick={() => onNavSectionClick(section.id)}
              >
                <span className="ge-navIcon">
                  <SvgIcon name={section.icon} />
                </span>
                <span className="ge-navText">{section.label}</span>
              </button>
            ))}
          </nav>

          {sidebarCollapsed && navFlyoutSectionId ? (
            <div className="ge-navFlyout" role="menu" aria-label="Submenu">
              {(() => {
                const section = workspaceSections.find((s) => s.id === navFlyoutSectionId) ?? workspaceSections[0]
                return (
                  <>
                    <div className="ge-navFlyoutTitle">{section.label}</div>
                    <div className="ge-navFlyoutItems">
                      {section.items.map((item) => {
                        const disabled = item.enabled === false
                        const active = activeSectionId === section.id && activeItemId === item.id
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`ge-workspaceNavItem ${active ? 'ge-workspaceNavItemActive' : ''} ${
                              disabled ? 'ge-navItemDisabled' : ''
                            }`}
                            role="menuitem"
                            disabled={disabled}
                            onClick={() => selectItemFromSection(section.id, item.id)}
                          >
                            {'icon' in item && item.icon ? (
                              <span className="ge-navIcon">
                                <SvgIcon name={item.icon} />
                              </span>
                            ) : null}
                            <span className="ge-workspaceNavItemText">{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )
              })()}
            </div>
          ) : null}
        </aside>

        <main className="ge-main">
          <div className="ge-workspaceHeader">
            <div className="ge-breadcrumb">
              {activeSection.label.toUpperCase()} / {activeItem.label.toUpperCase()}
            </div>
            {weeklyHeaderEnabled ||
            professionalHeaderEnabled ||
            groupsHeaderEnabled ||
            locationsHeaderEnabled ||
            shiftTypesHeaderEnabled ||
            shiftSituationsHeaderEnabled ? (
              <div className="ge-workspaceHeaderRight">
                {professionalHeaderEnabled ? (
                  <>
                    <input
                      className="ge-input ge-workspaceHeaderSearch"
                      type="search"
                      placeholder="Pesquisar por profissional..."
                      value={professionalSearch}
                      onChange={(e) => setProfessionalSearch(e.target.value)}
                      aria-label="Pesquisar por profissional"
                    />
                    <select
                      className="ge-select ge-workspaceHeaderSelect"
                      value={professionalScopeValue || 'all'}
                      onChange={(e) => setProfessionalScopeValue(e.target.value)}
                      aria-label="Locais e setores"
                      disabled={locationsQuery.isLoading || sectorsQuery.isLoading || professionalScopeOptions.length === 0}
                    >
                      {professionalScopeOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}

                {groupsHeaderEnabled ? (
                  <>
                    <div style={{ fontWeight: 800, opacity: 0.75 }}>FILTROS:</div>
                    <input
                      className="ge-input ge-workspaceHeaderSearch"
                      type="search"
                      placeholder="Pesquisar por grupo..."
                      value={settingsGroupsSearch}
                      onChange={(e) => setSettingsGroupsSearch(e.target.value)}
                      aria-label="Pesquisar por grupo"
                    />
                  </>
                ) : null}

                {locationsHeaderEnabled ? (
                  <>
                    <div style={{ fontWeight: 800, opacity: 0.75 }}>FILTROS:</div>
                    <input
                      className="ge-input ge-workspaceHeaderSearch"
                      type="search"
                      placeholder="Pesquisar por local..."
                      value={settingsLocationsSearch}
                      onChange={(e) => setSettingsLocationsSearch(e.target.value)}
                      aria-label="Pesquisar por local"
                    />
                  </>
                ) : null}

                {shiftTypesHeaderEnabled ? (
                  <>
                    <div style={{ fontWeight: 800, opacity: 0.75 }}>FILTROS:</div>
                    <input
                      className="ge-input ge-workspaceHeaderSearch"
                      type="search"
                      placeholder="Pesquisar por tipo..."
                      value={settingsShiftTypesSearch}
                      onChange={(e) => setSettingsShiftTypesSearch(e.target.value)}
                      aria-label="Pesquisar por tipo de plantão"
                    />
                  </>
                ) : null}

                {shiftSituationsHeaderEnabled ? (
                  <>
                    <div style={{ fontWeight: 800, opacity: 0.75 }}>FILTROS:</div>
                    <input
                      className="ge-input ge-workspaceHeaderSearch"
                      type="search"
                      placeholder="Pesquisar por situação..."
                      value={settingsShiftSituationsSearch}
                      onChange={(e) => setSettingsShiftSituationsSearch(e.target.value)}
                      aria-label="Pesquisar por situação do plantão"
                    />
                  </>
                ) : null}

                {weeklyHeaderEnabled ? (
                  <select
                    className="ge-select ge-workspaceHeaderSelect"
                    value={effectiveWeeklyScopeValue}
                    onChange={(e) => setWeeklyScopeValue(e.target.value)}
                    aria-label="Filtro (local ou setor)"
                    disabled={locationsQuery.isLoading || sectorsQuery.isLoading || weeklyScopeOptions.length === 0}
                  >
                    {weeklyScopeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className={`ge-workspace ${sidebarCollapsed ? 'ge-workspaceCollapsed' : ''}`}>
            {sidebarCollapsed ? null : (
              <aside className="ge-workspaceNav">
                <div className="ge-workspaceNavTitle">{activeSection.label}</div>
                <div className="ge-workspaceNavItems">
                  {activeSection.items.map((item) => {
                    const disabled = item.enabled === false
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`ge-workspaceNavItem ${activeItemId === item.id ? 'ge-workspaceNavItemActive' : ''} ${
                          disabled ? 'ge-navItemDisabled' : ''
                        }`}
                        disabled={disabled}
                        onClick={() => selectItem(item.id)}
                      >
                        {'icon' in item && item.icon ? (
                          <span className="ge-navIcon">
                            <SvgIcon name={item.icon} />
                          </span>
                        ) : null}
                        <span className="ge-workspaceNavItemText">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </aside>
            )}

            <section className="ge-workspaceContent">
              {activeSectionId === 'dashboard' ? (
                <>
                  {activeItemId === 'resumo' ? (
                    <section className="ge-card">
                      <div className="ge-cardTitle">Resumo</div>
                      <div className="ge-cardBody">
                        <div>Tenant: {session.tenantId ?? '-'}</div>
                        <div>Schedule: {session.defaultScheduleId ?? '-'}</div>
                        <div>User: {session.userId ?? '-'}</div>
                        <div>Roles: {roles.length ? roles.join(', ') : '-'}</div>
                        <div className="ge-quickLinks">
                          <Link className="ge-pillLink" to="/schedules">
                            Escalas
                          </Link>
                          <Link className="ge-pillLink" to="/attendance">
                            Apontamentos
                          </Link>
                          <Link className="ge-pillLink" to="/shifts">
                            Turnos
                          </Link>
                          <Link className="ge-pillLink" to="/professionals">
                            Profissionais
                          </Link>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  {activeItemId === 'relatorio' ? (
                    <section className="ge-card">
                      <div className="ge-cardTitle">Relatório</div>
                      <div className="ge-cardBody">Em breve</div>
                    </section>
                  ) : null}

                  {activeItemId === 'carga-horaria' ? (
                    <section className="ge-card">
                      <div className="ge-cardTitle">Carga horária</div>
                      <div className="ge-cardBody">Em breve</div>
                    </section>
                  ) : null}
                </>
              ) : (
                <>
                  {activeSectionId === 'scheduling' && activeItemId === 'mensal' ? <MonthlySchedulePanel /> : null}
                  {activeSectionId === 'scheduling' && activeItemId === 'semanal' ? (
                    weeklyScope.id ? (
                      <WeeklySchedulePanel scope={weeklyScope} sectors={sectorsQuery.data ?? []} />
                    ) : null
                  ) : null}
                  {activeSectionId === 'scheduling' && activeItemId === 'profissional' ? (
                    <ProfessionalSchedulePanel
                      locations={locationsQuery.data ?? []}
                      sectors={sectorsQuery.data ?? []}
                      scopeValue={professionalScopeValue || 'all'}
                      search={professionalSearch}
                    />
                  ) : null}
                  {activeSectionId === 'scheduling' && activeItemId === 'busca' ? <SearchShiftsPanel sectors={sectorsQuery.data ?? []} /> : null}
                  {activeSectionId === 'scheduling' && activeItemId === 'modelo' ? (
                    <ScheduleTemplatePanel sectors={sectorsQuery.data ?? []} />
                  ) : null}
                  {activeSectionId === 'scheduling' &&
                  activeItemId !== 'mensal' &&
                  activeItemId !== 'semanal' &&
                  activeItemId !== 'profissional' &&
                  activeItemId !== 'busca' &&
                  activeItemId !== 'modelo' ? (
                    <section className="ge-card">
                      <div className="ge-cardTitle">{activeItem.label}</div>
                      <div className="ge-cardBody">Em breve</div>
                    </section>
                  ) : null}
                  {activeSectionId === 'users' && activeItemId === 'profissionais' ? (
                    <section className="ge-card">
                      <div className="ge-cardTitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span>Profissionais</span>
                        {canManageProfessionals ? (
                          <button type="button" className="ge-buttonPrimary" onClick={openAddProfessionalDialog}>
                            Adicionar Profissional
                          </button>
                        ) : null}
                      </div>
                      <div className="ge-cardBody">
                        {!canManageProfessionals ? (
                          <div style={{ opacity: 0.85 }}>
                            Apenas usuários do tipo Administrador e Coordenador têm permissão para criar, alterar e excluir profissionais.
                          </div>
                        ) : null}
                        <div style={{ marginTop: 10, opacity: 0.75 }}>Selecione “Adicionar Profissional” para abrir o cadastro.</div>
                      </div>
                    </section>
                  ) : null}

                  {activeSectionId === 'users' && activeItemId === 'coordenadores' ? (
                    <section className="ge-card">
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ opacity: 0.75, fontWeight: 900 }}>Usuários / Coordenadores ({(coordinatorsQuery.data ?? []).length})</div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <input
                            className="ge-input"
                            placeholder="Pesquisar por coordenador..."
                            value={coordinatorsSearch}
                            onChange={(e) => setCoordinatorsSearch(e.target.value)}
                            style={{ maxWidth: 320 }}
                          />
                          {canManageCoordinators ? (
                            <button
                              type="button"
                              className="ge-buttonPrimary"
                              onClick={() =>
                                setCoordinatorModal({
                                  open: true,
                                  tabId: 'informacoes',
                                  form: {
                                    fullName: '',
                                    email: '',
                                    phone1: '',
                                    phone2: '',
                                    cep: '',
                                    street: '',
                                    streetNumber: '',
                                    neighborhood: '',
                                    complement: '',
                                    state: '',
                                    city: '',
                                    password: '',
                                    passwordRepeat: '',
                                    permissions: {
                                      manageShifts: false,
                                      manageShiftValue: false,
                                      manageValueConfiguration: false,
                                      manageProfessionals: false,
                                      manageCoordinators: false,
                                      manageViewers: false,
                                      manageAlerts: false,
                                    },
                                    groupIds: [],
                                  },
                                  error: null,
                                  groupsSearch: '',
                                  groupsOnlySelected: false,
                                })
                              }
                            >
                              Adicionar Coordenador
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {!canManageCoordinators ? (
                        <div style={{ marginTop: 10, opacity: 0.85 }}>
                          Apenas usuários do tipo Administrador e Super Admin têm permissão para gerenciar coordenadores.
                        </div>
                      ) : null}

                      <div
                        style={{
                          marginTop: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            className="ge-select"
                            value={coordinatorsGroupId}
                            onChange={(e) => {
                              setCoordinatorsGroupId(e.target.value)
                              setSelectedCoordinatorIds(new Set())
                            }}
                            style={{ width: 320 }}
                          >
                            <option value="all">Todos os locais, setores e grupos</option>
                            {(coordinatorGroupsQuery.data ?? []).map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="ge-pillButton"
                            disabled={
                              coordinatorsGroupId === 'all' ||
                              selectedCoordinatorIds.size === 0 ||
                              bulkRemoveCoordinatorGroupMutation.isPending ||
                              bulkAddCoordinatorGroupMutation.isPending
                            }
                            onClick={() => {
                              const ids = Array.from(selectedCoordinatorIds)
                              if (!ids.length) return
                              if (coordinatorsGroupId === 'all') return
                              void bulkRemoveCoordinatorGroupMutation.mutateAsync({ userIds: ids, groupId: coordinatorsGroupId }).then(() => {
                                setSelectedCoordinatorIds(new Set())
                              })
                            }}
                          >
                            Remover Selecionados de um Grupo
                          </button>
                          <button
                            type="button"
                            className="ge-pillButton"
                            disabled={
                              coordinatorsGroupId === 'all' ||
                              selectedCoordinatorIds.size === 0 ||
                              bulkAddCoordinatorGroupMutation.isPending ||
                              bulkRemoveCoordinatorGroupMutation.isPending
                            }
                            onClick={() => {
                              const ids = Array.from(selectedCoordinatorIds)
                              if (!ids.length) return
                              if (coordinatorsGroupId === 'all') return
                              void bulkAddCoordinatorGroupMutation.mutateAsync({ userIds: ids, groupId: coordinatorsGroupId }).then(() => {
                                setSelectedCoordinatorIds(new Set())
                              })
                            }}
                          >
                            Adicionar Selecionados a um Grupo
                          </button>
                        </div>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        {coordinatorsQuery.isLoading ? <div>Carregando...</div> : null}
                        {coordinatorsQuery.error ? (
                          <div className="ge-errorText">
                            Erro ao carregar: {(coordinatorsQuery.error as { message?: string }).message ?? 'erro'}
                          </div>
                        ) : null}

                        {coordinatorsQuery.data ? (
                          <div style={{ border: '1px solid rgba(127, 127, 127, 0.25)', borderRadius: 14, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                                <thead>
                                  <tr style={{ background: 'color-mix(in srgb, Canvas 96%, transparent)' }}>
                                    <th style={{ width: 44, padding: 12 }}>
                                      <input
                                        type="checkbox"
                                        checked={
                                          coordinatorsQuery.data.length > 0 &&
                                          coordinatorsQuery.data.every((c) => selectedCoordinatorIds.has(c.id))
                                        }
                                        onChange={(e) => {
                                          const next = new Set<string>()
                                          if (e.target.checked) {
                                            for (const c of coordinatorsQuery.data ?? []) next.add(c.id)
                                          }
                                          setSelectedCoordinatorIds(next)
                                        }}
                                      />
                                    </th>
                                    <th style={{ textAlign: 'left', padding: 12 }}>Nome</th>
                                    <th style={{ textAlign: 'right', padding: 12 }}>
                                      <span style={{ fontWeight: 900, opacity: 0.85 }}>
                                        <span className="ge-tagLabelLocal">Local</span> / <span className="ge-tagLabelSector">Setor</span> /{' '}
                                        <span className="ge-tagLabelGroup">Grupo</span>
                                      </span>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {coordinatorsQuery.data.length === 0 ? (
                                    <tr>
                                      <td colSpan={3} style={{ padding: 14, opacity: 0.75 }}>
                                        Nenhum coordenador encontrado.
                                      </td>
                                    </tr>
                                  ) : (
                                    coordinatorsQuery.data.map((c) => (
                                      <tr key={c.id} style={{ borderTop: '1px solid rgba(127, 127, 127, 0.18)' }}>
                                        <td style={{ width: 44, padding: 12 }}>
                                          <input
                                            type="checkbox"
                                            checked={selectedCoordinatorIds.has(c.id)}
                                            onChange={(e) => {
                                              const next = new Set(selectedCoordinatorIds)
                                              if (e.target.checked) next.add(c.id)
                                              else next.delete(c.id)
                                              setSelectedCoordinatorIds(next)
                                            }}
                                          />
                                        </td>
                                        <td style={{ padding: 12, fontWeight: 900 }}>{c.fullName}</td>
                                        <td style={{ padding: 12 }}>
                                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            {(c.locations ?? []).map((t) => (
                                              <span key={`loc:${t.id}`} className="ge-tag ge-tagLocal">
                                                {t.name}
                                              </span>
                                            ))}
                                            {(c.sectors ?? []).map((t) => (
                                              <span key={`sec:${t.id}`} className="ge-tag ge-tagSector">
                                                {t.name}
                                              </span>
                                            ))}
                                            {(c.groups ?? []).map((t) => (
                                              <span key={`grp:${t.id}`} className="ge-tag ge-tagGroup">
                                                {t.name}
                                              </span>
                                            ))}
                                          </div>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {coordinatorModal.open ? (
                        <div className="ge-modalOverlay" role="dialog" aria-modal="true">
                          <div className="ge-modal ge-modalWide ge-coordinatorDialogModal">
                            <div className="ge-modalHeader">
                              <div className="ge-modalTitle">Adicionar Coordenador</div>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <button
                                  type="submit"
                                  form="ge-coordinatorCreateForm"
                                  className="ge-buttonPrimary"
                                  disabled={createCoordinatorMutation.isPending || bulkAddCoordinatorGroupMutation.isPending}
                                >
                                  Salvar Alterações
                                </button>
                                <button type="button" className="ge-modalClose" onClick={() => setCoordinatorModal({ open: false })}>
                                  ×
                                </button>
                              </div>
                            </div>
                            <div className="ge-modalBody ge-coordinatorDialogBody">
                              <form
                                id="ge-coordinatorCreateForm"
                                className="ge-coordinatorDialogForm"
                                onSubmit={(e) => {
                                  e.preventDefault()
                                  if (!coordinatorModal.open) return
                                  setCoordinatorModal({ ...coordinatorModal, error: null })
                                  void (async () => {
                                    try {
                                      const trimmedFullName = coordinatorModal.form.fullName.trim()
                                      const trimmedEmail = coordinatorModal.form.email.trim()
                                      if (!trimmedEmail) {
                                        setCoordinatorModal({ ...coordinatorModal, error: 'Informe o e-mail.' })
                                        return
                                      }
                                      const password = coordinatorModal.form.password
                                      const passwordRepeat = coordinatorModal.form.passwordRepeat
                                      if (!password || password.length < 6) {
                                        setCoordinatorModal({ ...coordinatorModal, error: 'A senha deve ter no mínimo 6 caracteres.' })
                                        return
                                      }
                                      if (password !== passwordRepeat) {
                                        setCoordinatorModal({ ...coordinatorModal, error: 'As senhas não conferem.' })
                                        return
                                      }
                                      const permissionCodes: string[] = []
                                      const p = coordinatorModal.form.permissions
                                      if (p.manageShifts) permissionCodes.push('MANAGE_SHIFTS')
                                      if (p.manageShiftValue) permissionCodes.push('MANAGE_SHIFT_VALUE')
                                      if (p.manageValueConfiguration) permissionCodes.push('MANAGE_VALUE_CONFIGURATION')
                                      if (p.manageProfessionals) permissionCodes.push('MANAGE_PROFESSIONALS')
                                      if (p.manageCoordinators) permissionCodes.push('MANAGE_COORDINATORS')
                                      if (p.manageViewers) permissionCodes.push('MANAGE_VIEWERS')
                                      if (p.manageAlerts) permissionCodes.push('MANAGE_ALERTS')
                                      const created = await createCoordinatorMutation.mutateAsync({
                                        fullName: trimmedFullName,
                                        email: trimmedEmail,
                                        password,
                                        permissions: permissionCodes,
                                      })
                                      const groupIds = coordinatorModal.form.groupIds
                                      if (groupIds.length > 0) {
                                        for (const groupId of groupIds) {
                                          await bulkAddCoordinatorGroupMutation.mutateAsync({ userIds: [created.id], groupId })
                                        }
                                      }
                                      setCoordinatorModal({ open: false })
                                    } catch (err) {
                                      const message =
                                        err && typeof err === 'object' && 'message' in err
                                          ? String((err as { message?: unknown }).message ?? 'Erro ao salvar.')
                                          : 'Erro ao salvar.'
                                      setCoordinatorModal({ ...coordinatorModal, error: message })
                                    }
                                  })()
                                }}
                              >
                                <div className="ge-coordinatorDialogLayout">
                                  <div className="ge-coordinatorDialogTabs">
                                    <button
                                      type="button"
                                      className={
                                        coordinatorModal.tabId === 'informacoes'
                                          ? 'ge-coordinatorDialogTab ge-coordinatorDialogTabActive'
                                          : 'ge-coordinatorDialogTab'
                                      }
                                      onClick={() => setCoordinatorModal({ ...coordinatorModal, tabId: 'informacoes' })}
                                    >
                                      Informações
                                    </button>
                                    <button
                                      type="button"
                                      className={
                                        coordinatorModal.tabId === 'permissoes'
                                          ? 'ge-coordinatorDialogTab ge-coordinatorDialogTabActive'
                                          : 'ge-coordinatorDialogTab'
                                      }
                                      onClick={() => setCoordinatorModal({ ...coordinatorModal, tabId: 'permissoes' })}
                                    >
                                      Permissões
                                    </button>
                                    <button
                                      type="button"
                                      className={
                                        coordinatorModal.tabId === 'grupos'
                                          ? 'ge-coordinatorDialogTab ge-coordinatorDialogTabActive'
                                          : 'ge-coordinatorDialogTab'
                                      }
                                      onClick={() => setCoordinatorModal({ ...coordinatorModal, tabId: 'grupos' })}
                                    >
                                      Grupos
                                    </button>
                                  </div>

                                  <div className="ge-coordinatorDialogContent">
                                    {coordinatorModal.tabId === 'informacoes' ? (
                                      <div className="ge-coordinatorDialogInfoGrid">
                                        <div className="ge-coordinatorDialogInfoMain">
                                          <div className="ge-coordinatorDialogSectionTitle">Dados Pessoais</div>
                                          <div className="ge-coordinatorDialogGrid4">
                                            <label className="ge-modalField">
                                              <div className="ge-modalLabel">Nome completo *</div>
                                              <input
                                                className="ge-input"
                                                value={coordinatorModal.form.fullName}
                                                onChange={(e) =>
                                                  setCoordinatorModal({
                                                    ...coordinatorModal,
                                                    form: { ...coordinatorModal.form, fullName: e.target.value },
                                                  })
                                                }
                                                placeholder="Nome completo"
                                              />
                                            </label>
                                            <label className="ge-modalField">
                                              <div className="ge-modalLabel">E-mail *</div>
                                              <input
                                                className="ge-input"
                                                value={coordinatorModal.form.email}
                                                onChange={(e) =>
                                                  setCoordinatorModal({
                                                    ...coordinatorModal,
                                                    form: { ...coordinatorModal.form, email: e.target.value },
                                                  })
                                                }
                                                placeholder="email@exemplo.com"
                                                required
                                              />
                                            </label>
                                            <label className="ge-modalField">
                                              <div className="ge-modalLabel">Telefone 1</div>
                                              <input
                                                className="ge-input"
                                                value={coordinatorModal.form.phone1}
                                                onChange={(e) =>
                                                  setCoordinatorModal({
                                                    ...coordinatorModal,
                                                    form: { ...coordinatorModal.form, phone1: e.target.value },
                                                  })
                                                }
                                                placeholder="(00) 00000-0000"
                                              />
                                            </label>
                                            <label className="ge-modalField">
                                              <div className="ge-modalLabel">Telefone 2</div>
                                              <input
                                                className="ge-input"
                                                value={coordinatorModal.form.phone2}
                                                onChange={(e) =>
                                                  setCoordinatorModal({
                                                    ...coordinatorModal,
                                                    form: { ...coordinatorModal.form, phone2: e.target.value },
                                                  })
                                                }
                                                placeholder="(00) 00000-0000"
                                              />
                                            </label>
                                          </div>

                                          <div className="ge-coordinatorDialogSectionTitle" style={{ marginTop: 16 }}>
                                            Endereço
                                          </div>
                                          <div className="ge-coordinatorDialogGridAddressTop">
                                            <label className="ge-modalField">
                                              <div className="ge-modalLabel">CEP</div>
                                              <input
                                                className="ge-input"
                                                value={coordinatorModal.form.cep}
                                                onChange={(e) =>
                                                  setCoordinatorModal({
                                                    ...coordinatorModal,
                                                    form: { ...coordinatorModal.form, cep: e.target.value },
                                                  })
                                                }
                                                placeholder="00000-000"
                                              />
                                            </label>
                                            <label className="ge-modalField">
                                              <div className="ge-modalLabel">Rua</div>
                                              <input
                                                className="ge-input"
                                                value={coordinatorModal.form.street}
                                                onChange={(e) =>
                                                  setCoordinatorModal({
                                                    ...coordinatorModal,
                                                    form: { ...coordinatorModal.form, street: e.target.value },
                                                  })
                                                }
                                                placeholder="Rua"
                                              />
                                            </label>
                                            <label className="ge-modalField">
                                              <div className="ge-modalLabel">Número</div>
                                              <input
                                                className="ge-input"
                                                value={coordinatorModal.form.streetNumber}
                                                onChange={(e) =>
                                                  setCoordinatorModal({
                                                    ...coordinatorModal,
                                                    form: { ...coordinatorModal.form, streetNumber: e.target.value },
                                                  })
                                                }
                                                placeholder="Nº"
                                              />
                                            </label>
                                          </div>
                                          <div className="ge-coordinatorDialogGridAddressMid">
                                            <label className="ge-modalField">
                                              <div className="ge-modalLabel">Bairro</div>
                                              <input
                                                className="ge-input"
                                                value={coordinatorModal.form.neighborhood}
                                                onChange={(e) =>
                                                  setCoordinatorModal({
                                                    ...coordinatorModal,
                                                    form: { ...coordinatorModal.form, neighborhood: e.target.value },
                                                  })
                                                }
                                                placeholder="Bairro"
                                              />
                                            </label>
                                            <label className="ge-modalField">
                                              <div className="ge-modalLabel">Complemento</div>
                                              <input
                                                className="ge-input"
                                                value={coordinatorModal.form.complement}
                                                onChange={(e) =>
                                                  setCoordinatorModal({
                                                    ...coordinatorModal,
                                                    form: { ...coordinatorModal.form, complement: e.target.value },
                                                  })
                                                }
                                                placeholder="Complemento"
                                              />
                                            </label>
                                          </div>
                                          <div className="ge-coordinatorDialogGridAddressBottom">
                                            <label className="ge-modalField">
                                              <div className="ge-modalLabel">UF</div>
                                              <select
                                                className="ge-select"
                                                value={coordinatorModal.form.state}
                                                onChange={(e) =>
                                                  setCoordinatorModal({
                                                    ...coordinatorModal,
                                                    form: { ...coordinatorModal.form, state: e.target.value },
                                                  })
                                                }
                                              >
                                                <option value="">Selecione</option>
                                                {[
                                                  'AC',
                                                  'AL',
                                                  'AP',
                                                  'AM',
                                                  'BA',
                                                  'CE',
                                                  'DF',
                                                  'ES',
                                                  'GO',
                                                  'MA',
                                                  'MT',
                                                  'MS',
                                                  'MG',
                                                  'PA',
                                                  'PB',
                                                  'PR',
                                                  'PE',
                                                  'PI',
                                                  'RJ',
                                                  'RN',
                                                  'RS',
                                                  'RO',
                                                  'RR',
                                                  'SC',
                                                  'SP',
                                                  'SE',
                                                  'TO',
                                                ].map((uf) => (
                                                  <option key={uf} value={uf}>
                                                    {uf}
                                                  </option>
                                                ))}
                                              </select>
                                            </label>
                                            <label className="ge-modalField">
                                              <div className="ge-modalLabel">Cidade</div>
                                              <input
                                                className="ge-input"
                                                value={coordinatorModal.form.city}
                                                onChange={(e) =>
                                                  setCoordinatorModal({
                                                    ...coordinatorModal,
                                                    form: { ...coordinatorModal.form, city: e.target.value },
                                                  })
                                                }
                                                placeholder="Cidade"
                                              />
                                            </label>
                                          </div>
                                        </div>

                                        <div className="ge-coordinatorDialogPasswordCard">
                                          <div className="ge-coordinatorDialogSectionTitle">Senha</div>
                                          <div className="ge-modalForm" style={{ marginTop: 10 }}>
                                            <label className="ge-modalField">
                                              <div className="ge-modalLabel">Senha *</div>
                                              <input
                                                className="ge-input"
                                                type="password"
                                                value={coordinatorModal.form.password}
                                                onChange={(e) =>
                                                  setCoordinatorModal({
                                                    ...coordinatorModal,
                                                    form: { ...coordinatorModal.form, password: e.target.value },
                                                  })
                                                }
                                                placeholder="mínimo 6 caracteres"
                                                required
                                              />
                                            </label>
                                            <label className="ge-modalField">
                                              <div className="ge-modalLabel">Repetir senha *</div>
                                              <input
                                                className="ge-input"
                                                type="password"
                                                value={coordinatorModal.form.passwordRepeat}
                                                onChange={(e) =>
                                                  setCoordinatorModal({
                                                    ...coordinatorModal,
                                                    form: { ...coordinatorModal.form, passwordRepeat: e.target.value },
                                                  })
                                                }
                                                placeholder="repita a senha"
                                                required
                                              />
                                            </label>
                                            <div style={{ fontSize: 12, opacity: 0.75 }}>
                                              Digite a senha e clique em Salvar Alterações.
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : coordinatorModal.tabId === 'permissoes' ? (
                                      <div style={{ display: 'grid', gap: 12 }}>
                                        <div className="ge-coordinatorDialogSectionTitle">Este coordenador poderá gerenciar:</div>

                                        <div style={{ border: '1px solid rgba(127, 127, 127, 0.25)', borderRadius: 14, overflow: 'hidden' }}>
                                          {(
                                            [
                                              { key: 'manageShifts', code: 'MANAGE_SHIFTS', label: 'Plantões' },
                                              { key: 'manageShiftValue', code: 'MANAGE_SHIFT_VALUE', label: 'Valor do Plantão' },
                                              { key: 'manageValueConfiguration', code: 'MANAGE_VALUE_CONFIGURATION', label: 'Configuração de valores' },
                                              { key: 'manageProfessionals', code: 'MANAGE_PROFESSIONALS', label: 'Profissionais' },
                                              { key: 'manageCoordinators', code: 'MANAGE_COORDINATORS', label: 'Coordenadores' },
                                              { key: 'manageViewers', code: 'MANAGE_VIEWERS', label: 'Visualizadores' },
                                              { key: 'manageAlerts', code: 'MANAGE_ALERTS', label: 'Alertas' },
                                            ] satisfies Array<{
                                              key: CoordinatorPermissionKey
                                              code: CoordinatorPermissionCode
                                              label: string
                                            }>
                                          ).map((item) => {
                                            const canToggle =
                                              isSuperAdmin || isAdmin || (roles.includes('COORDINATOR') && permissions.includes(item.code))
                                            const checked = coordinatorModal.form.permissions[item.key]
                                            return (
                                              <label
                                                key={item.code}
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'space-between',
                                                  gap: 12,
                                                  padding: '12px 14px',
                                                  borderTop: '1px solid rgba(127, 127, 127, 0.18)',
                                                  cursor: canToggle ? 'pointer' : 'not-allowed',
                                                  opacity: canToggle ? 1 : 0.55,
                                                }}
                                              >
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 900 }}>
                                                  <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={!canToggle}
                                                    onChange={(e) =>
                                                      setCoordinatorModal({
                                                        ...coordinatorModal,
                                                        form: {
                                                          ...coordinatorModal.form,
                                                          permissions: {
                                                            ...coordinatorModal.form.permissions,
                                                            [item.key]: e.target.checked,
                                                          },
                                                        },
                                                      })
                                                    }
                                                  />
                                                  <span>{item.label}</span>
                                                </span>
                                              </label>
                                            )
                                          })}
                                        </div>

                                        <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.45 }}>
                                          <div>
                                            Apenas o usuário Master e os Coordenadores com permissão para Gerenciar Coordenadores poderão realizar o
                                            cadastro de novos Coordenadores e Visualizadores.
                                          </div>
                                          <div style={{ marginTop: 8 }}>
                                            No caso de um Coordenador com permissão para Gerenciar Coordenadores, ele só poderá conceder/alterar as
                                            permissões que ele possui em seu perfil.
                                          </div>
                                        </div>
                                      </div>
                                    ) : coordinatorModal.tabId === 'grupos' ? (
                                      <div style={{ display: 'grid', gap: 12 }}>
                                        <div className="ge-coordinatorDialogSectionTitle">
                                          Selecione os grupos ao qual o usuário irá pertencer.
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                          <input
                                            className="ge-input"
                                            value={coordinatorModal.groupsSearch}
                                            onChange={(e) => setCoordinatorModal({ ...coordinatorModal, groupsSearch: e.target.value })}
                                            placeholder="Busque por um grupo"
                                            style={{ flex: '1 1 320px', minWidth: 240 }}
                                          />
                                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, opacity: 0.9, cursor: 'pointer' }}>
                                            <input
                                              type="checkbox"
                                              checked={coordinatorModal.groupsOnlySelected}
                                              onChange={(e) => setCoordinatorModal({ ...coordinatorModal, groupsOnlySelected: e.target.checked })}
                                            />
                                            Exibir apenas grupos selecionados
                                          </label>
                                        </div>

                                        <div style={{ border: '1px solid rgba(127, 127, 127, 0.25)', borderRadius: 14, overflow: 'hidden' }}>
                                          {(() => {
                                            const allGroups = coordinatorGroupsQuery.data ?? []
                                            const q = coordinatorModal.groupsSearch.trim().toLowerCase()
                                            const selected = new Set(coordinatorModal.form.groupIds)
                                            const filtered = allGroups
                                              .filter((g) => {
                                                if (coordinatorModal.groupsOnlySelected && !selected.has(g.id)) return false
                                                if (!q) return true
                                                return g.name.toLowerCase().includes(q)
                                              })
                                              .sort((a, b) => a.name.localeCompare(b.name))

                                            if (coordinatorGroupsQuery.isLoading) {
                                              return <div style={{ padding: 14, opacity: 0.75 }}>Carregando...</div>
                                            }

                                            if (filtered.length === 0) {
                                              return <div style={{ padding: 14, opacity: 0.75 }}>Nenhum grupo encontrado.</div>
                                            }

                                            return filtered.map((g, idx) => {
                                              const checked = selected.has(g.id)
                                              return (
                                                <label
                                                  key={g.id}
                                                  style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 12,
                                                    padding: '12px 14px',
                                                    borderTop: idx === 0 ? 'none' : '1px solid rgba(127, 127, 127, 0.18)',
                                                    cursor: 'pointer',
                                                  }}
                                                >
                                                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 900 }}>
                                                    <input
                                                      type="checkbox"
                                                      checked={checked}
                                                      onChange={(e) => {
                                                        const next = new Set(coordinatorModal.form.groupIds)
                                                        if (e.target.checked) next.add(g.id)
                                                        else next.delete(g.id)
                                                        setCoordinatorModal({
                                                          ...coordinatorModal,
                                                          form: { ...coordinatorModal.form, groupIds: Array.from(next) },
                                                        })
                                                      }}
                                                    />
                                                    <span>{g.name}</span>
                                                  </span>
                                                  <span
                                                    style={{
                                                      fontSize: 12,
                                                      fontWeight: 900,
                                                      padding: '6px 10px',
                                                      borderRadius: 999,
                                                      background: 'rgba(127, 127, 127, 0.15)',
                                                      opacity: 0.9,
                                                    }}
                                                  >
                                                    Grupo
                                                  </span>
                                                </label>
                                              )
                                            })
                                          })()}
                                        </div>

                                        <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.45 }}>
                                          Os grupos selecionados serão vinculados ao coordenador após o cadastro.
                                        </div>
                                      </div>
                                    ) : null}

                                    {coordinatorModal.error ? <div className="ge-errorText" style={{ marginTop: 10 }}>{coordinatorModal.error}</div> : null}
                                  </div>
                                </div>
                              </form>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {activeSectionId === 'settings' && activeItemId === 'locais-setores' ? (
                    <section className="ge-card">
                      <div className="ge-cardTitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span>Locais e Setores</span>
                        {canManageLocationsAndSectors ? (
                          <button
                            type="button"
                            className="ge-buttonPrimary"
                            onClick={() =>
                              setSettingsLocationModal({
                                mode: 'create',
                                form: {
                                  code: '',
                                  name: '',
                                  cep: '',
                                  street: '',
                                  streetNumber: '',
                                  complement: '',
                                  neighborhood: '',
                                  city: '',
                                  state: 'SP',
                                  notes: '',
                                  googleMapsUrl: '',
                                  latitude: '',
                                  longitude: '',
                                  timeZone: 'America/Sao_Paulo',
                                  sectors: [{ code: '', name: '' }],
                                },
                              })
                            }
                            disabled={settingsLocationsSaving}
                          >
                            Novo Local
                          </button>
                        ) : null}
                      </div>

                      <div className="ge-cardBody">
                        {!canManageLocationsAndSectors ? (
                          <div style={{ opacity: 0.85 }}>
                            Apenas usuários do tipo Administrador têm permissão para criar, desabilitar, alterar e excluir um Local ou Setor.
                          </div>
                        ) : null}

                        {settingsLocationsError ? <div className="ge-errorText">{settingsLocationsError}</div> : null}

                        {settingsLocationsLoading ? (
                          <div>Carregando...</div>
                        ) : (
                          <div className="ge-list" style={{ marginTop: 10 }}>
                            {filteredSettingsLocations.length === 0 ? (
                              <div style={{ opacity: 0.75 }}>Nenhum local encontrado.</div>
                            ) : (
                              filteredSettingsLocations.map((loc) => {
                                const address = [loc.street, loc.streetNumber, loc.city && loc.state ? `${loc.city}/${loc.state}` : loc.city ?? loc.state]
                                  .filter(Boolean)
                                  .join(' - ')
                                return (
                                  <div key={loc.id} className="ge-listRow" style={{ display: 'grid', gap: 10 }}>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                                        <button
                                          type="button"
                                          className={`ge-toggle ${loc.enabled ? 'ge-toggleOn' : ''}`}
                                          aria-pressed={loc.enabled}
                                          onClick={() => {
                                            if (!canManageLocationsAndSectors) return
                                            void (async () => {
                                              setSettingsLocationsSaving(true)
                                              try {
                                                await apiFetch(`/api/settings/locations/${loc.id}/enabled`, {
                                                  method: 'PUT',
                                                  body: JSON.stringify({ enabled: !loc.enabled }),
                                                })
                                                await loadSettingsLocations()
                                              } catch (err) {
                                                const message =
                                                  err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                                setSettingsLocationsError(message || 'Não foi possível alterar o status do local.')
                                              } finally {
                                                setSettingsLocationsSaving(false)
                                              }
                                            })()
                                          }}
                                          disabled={!canManageLocationsAndSectors || settingsLocationsSaving}
                                          title={loc.enabled ? 'Desabilitar' : 'Habilitar'}
                                        >
                                          <span className="ge-toggleThumb" />
                                        </button>
                                        <div style={{ minWidth: 0 }}>
                                          <div style={{ fontWeight: 800, opacity: loc.enabled ? 1 : 0.55, textDecoration: loc.enabled ? 'none' : 'line-through' }}>
                                            {loc.name}
                                          </div>
                                          <div style={{ opacity: 0.75, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {address || '—'}
                                          </div>
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                          type="button"
                                          className="ge-buttonSecondary"
                                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                          onClick={() =>
                                            setSettingsSectorModal({
                                              mode: 'create',
                                              locationId: loc.id,
                                              form: { code: '', name: '' },
                                            })
                                          }
                                          disabled={!canManageLocationsAndSectors || settingsLocationsSaving}
                                          aria-label="Adicionar setor"
                                          title="Adicionar setor"
                                        >
                                          <SvgIcon name="plus" size={18} />
                                          <span>Setor</span>
                                        </button>
                                        <button
                                          type="button"
                                          className="ge-buttonSecondary"
                                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                          onClick={() => {
                                            const current = settingsLocations.find((l) => l.id === loc.id)
                                            if (!current) return
                                            setSettingsLocationModal({
                                              mode: 'edit',
                                              locationId: loc.id,
                                              form: {
                                                code: current.code ?? '',
                                                name: current.name ?? '',
                                                cep: current.cep ?? '',
                                                street: current.street ?? '',
                                                streetNumber: current.streetNumber ?? '',
                                                complement: current.complement ?? '',
                                                neighborhood: current.neighborhood ?? '',
                                                city: current.city ?? '',
                                                state: current.state ?? '',
                                                notes: current.notes ?? '',
                                                googleMapsUrl: '',
                                                latitude: current.latitude == null ? '' : String(current.latitude),
                                                longitude: current.longitude == null ? '' : String(current.longitude),
                                                timeZone: current.timeZone ?? 'America/Sao_Paulo',
                                                sectors: [{ code: '', name: '' }],
                                              },
                                            })
                                          }}
                                          disabled={!canManageLocationsAndSectors || settingsLocationsSaving}
                                          aria-label="Editar local"
                                          title="Editar local"
                                        >
                                          <SvgIcon name="pencil" size={18} />
                                          <span>Editar</span>
                                        </button>
                                        <button
                                          type="button"
                                          className="ge-buttonDanger"
                                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                          onClick={() => {
                                            if (!canManageLocationsAndSectors) return
                                            if (!window.confirm('Apagar este local? É necessário apagar todos os setores antes.')) return
                                            void (async () => {
                                              setSettingsLocationsSaving(true)
                                              try {
                                                await apiFetch(`/api/settings/locations/${loc.id}`, { method: 'DELETE' })
                                                await loadSettingsLocations()
                                              } catch (err) {
                                                const message =
                                                  err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                                setSettingsLocationsError(message || 'Não foi possível apagar o local.')
                                              } finally {
                                                setSettingsLocationsSaving(false)
                                              }
                                            })()
                                          }}
                                          disabled={!canManageLocationsAndSectors || settingsLocationsSaving}
                                          aria-label="Apagar local"
                                          title="Apagar"
                                        >
                                          <SvgIcon name="trash" size={18} />
                                          <span>Remover</span>
                                        </button>
                                      </div>
                                    </div>

                                    <div style={{ display: 'grid', gap: 6, paddingLeft: 44 }}>
                                      {(loc.sectors ?? []).length === 0 ? (
                                        <div style={{ opacity: 0.7, fontSize: 13 }}>Nenhum setor.</div>
                                      ) : (
                                        (loc.sectors ?? []).map((sec) => (
                                          <div key={sec.id} style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                                              <button
                                                type="button"
                                                className={`ge-toggle ${sec.enabled ? 'ge-toggleOn' : ''}`}
                                                aria-pressed={sec.enabled}
                                                onClick={() => {
                                                  if (!canManageLocationsAndSectors) return
                                                  void (async () => {
                                                    setSettingsLocationsSaving(true)
                                                    try {
                                                      await apiFetch(`/api/settings/sectors/${sec.id}/enabled`, {
                                                        method: 'PUT',
                                                        body: JSON.stringify({ enabled: !sec.enabled }),
                                                      })
                                                      await loadSettingsLocations()
                                                    } catch (err) {
                                                      const message =
                                                        err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                                      setSettingsLocationsError(message || 'Não foi possível alterar o status do setor.')
                                                    } finally {
                                                      setSettingsLocationsSaving(false)
                                                    }
                                                  })()
                                                }}
                                                disabled={!canManageLocationsAndSectors || settingsLocationsSaving}
                                                title={sec.enabled ? 'Desabilitar' : 'Habilitar'}
                                              >
                                                <span className="ge-toggleThumb" />
                                              </button>
                                              <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, opacity: sec.enabled ? 1 : 0.55, textDecoration: sec.enabled ? 'none' : 'line-through' }}>
                                                  {sec.name}
                                                </div>
                                              </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                              <button
                                                type="button"
                                                className="ge-iconButton"
                                                onClick={() =>
                                                  setSettingsSectorModal({
                                                    mode: 'edit',
                                                    sectorId: sec.id,
                                                    locationId: loc.id,
                                                    form: { code: sec.code ?? '', name: sec.name ?? '' },
                                                  })
                                                }
                                                disabled={!canManageLocationsAndSectors || settingsLocationsSaving}
                                                aria-label="Editar setor"
                                                title="Editar setor"
                                              >
                                                <span className="ge-iconButtonIcon">
                                                  <SvgIcon name="pencil" size={18} />
                                                </span>
                                              </button>
                                              <button
                                                type="button"
                                                className="ge-buttonDanger"
                                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                                onClick={() => {
                                                  if (!canManageLocationsAndSectors) return
                                                  if (!window.confirm('Apagar este setor?')) return
                                                  void (async () => {
                                                    setSettingsLocationsSaving(true)
                                                    try {
                                                      await apiFetch(`/api/settings/sectors/${sec.id}`, { method: 'DELETE' })
                                                      await loadSettingsLocations()
                                                    } catch (err) {
                                                      const message =
                                                        err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                                      setSettingsLocationsError(message || 'Não foi possível apagar o setor.')
                                                    } finally {
                                                      setSettingsLocationsSaving(false)
                                                    }
                                                  })()
                                                }}
                                                disabled={!canManageLocationsAndSectors || settingsLocationsSaving}
                                                aria-label="Apagar setor"
                                                title="Apagar setor"
                                              >
                                                <SvgIcon name="trash" size={18} />
                                                <span>Remover</span>
                                              </button>
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        )}

                        {settingsLocationModal ? (
                          <div className="ge-modalOverlay" role="dialog" aria-modal="true">
                            <div className="ge-modal ge-modalWide">
                              <div className="ge-modalHeader">
                                <div className="ge-modalTitle">
                                  {settingsLocationModal.mode === 'create' ? 'Novo Local' : 'Editar local'}
                                </div>
                                <button type="button" className="ge-modalClose" onClick={() => setSettingsLocationModal(null)} aria-label="Fechar">
                                  ×
                                </button>
                              </div>
                              <div className="ge-modalBody">
                                <form
                                  className="ge-modalForm"
                                  onSubmit={(e) => {
                                    e.preventDefault()
                                    if (!canManageLocationsAndSectors) return
                                    void (async () => {
                                      setSettingsLocationsSaving(true)
                                      try {
                                        setSettingsLocationsError(null)
                                        const f = settingsLocationModal.form
                                        const sectors = (f.sectors ?? []).filter((s) => s.name.trim())
                                        if (settingsLocationModal.mode === 'create' && sectors.length === 0) {
                                          setSettingsLocationsError('Adicione pelo menos um setor.')
                                          return
                                        }
                                        const latitudeText = f.latitude.trim()
                                        const longitudeText = f.longitude.trim()
                                        if ((latitudeText && !longitudeText) || (!latitudeText && longitudeText)) {
                                          setSettingsLocationsError('Informe latitude e longitude.')
                                          return
                                        }
                                        const latitude = latitudeText ? Number(latitudeText) : null
                                        const longitude = longitudeText ? Number(longitudeText) : null
                                        if ((latitudeText && Number.isNaN(latitude)) || (longitudeText && Number.isNaN(longitude))) {
                                          setSettingsLocationsError('Latitude e longitude devem ser números.')
                                          return
                                        }
                                        const payload =
                                          settingsLocationModal.mode === 'create'
                                            ? {
                                                code: f.code || null,
                                                name: f.name,
                                                cep: f.cep || null,
                                                street: f.street,
                                                streetNumber: f.streetNumber,
                                                complement: f.complement || null,
                                                neighborhood: f.neighborhood,
                                                city: f.city,
                                                state: f.state,
                                                notes: f.notes || null,
                                                latitude,
                                                longitude,
                                                timeZone: f.timeZone,
                                                sectors: sectors.map((s) => ({ code: s.code || null, name: s.name })),
                                              }
                                            : {
                                                code: f.code || null,
                                                name: f.name,
                                                cep: f.cep || null,
                                                street: f.street,
                                                streetNumber: f.streetNumber,
                                                complement: f.complement || null,
                                                neighborhood: f.neighborhood,
                                                city: f.city,
                                                state: f.state,
                                                notes: f.notes || null,
                                                latitude,
                                                longitude,
                                                timeZone: f.timeZone,
                                              }
                                        if (settingsLocationModal.mode === 'create') {
                                          await apiFetch('/api/settings/locations', { method: 'POST', body: JSON.stringify(payload) })
                                        } else {
                                          await apiFetch(`/api/settings/locations/${settingsLocationModal.locationId}`, {
                                            method: 'PUT',
                                            body: JSON.stringify(payload),
                                          })
                                        }
                                        setSettingsLocationModal(null)
                                        await loadSettingsLocations()
                                      } catch (err) {
                                        const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                        setSettingsLocationsError(message || 'Não foi possível salvar o local.')
                                      } finally {
                                        setSettingsLocationsSaving(false)
                                      }
                                    })()
                                  }}
                                  style={{ display: 'grid', gap: 10 }}
                                >
                                  <div className="ge-inlineForm" style={{ gap: 10 }}>
                                    <label className="ge-modalField" style={{ flex: 1 }}>
                                      <div className="ge-modalLabel">Código</div>
                                      <input
                                        className="ge-input"
                                        value={settingsLocationModal.form.code}
                                        onChange={(e) =>
                                          setSettingsLocationModal((prev) =>
                                            prev ? { ...prev, form: { ...prev.form, code: e.target.value } } : prev,
                                          )
                                        }
                                        disabled={settingsLocationsSaving}
                                      />
                                    </label>
                                    <label className="ge-modalField" style={{ flex: 2 }}>
                                      <div className="ge-modalLabel">Nome *</div>
                                      <input
                                        className="ge-input"
                                        required
                                        value={settingsLocationModal.form.name}
                                        onChange={(e) =>
                                          setSettingsLocationModal((prev) =>
                                            prev ? { ...prev, form: { ...prev.form, name: e.target.value } } : prev,
                                          )
                                        }
                                        disabled={settingsLocationsSaving}
                                      />
                                    </label>
                                  </div>

                                  <div className="ge-inlineForm" style={{ gap: 10 }}>
                                    <label className="ge-modalField" style={{ flex: 1 }}>
                                      <div className="ge-modalLabel">CEP</div>
                                      <input
                                        className="ge-input"
                                        value={settingsLocationModal.form.cep}
                                        onChange={(e) =>
                                          setSettingsLocationModal((prev) =>
                                            prev ? { ...prev, form: { ...prev.form, cep: e.target.value } } : prev,
                                          )
                                        }
                                        disabled={settingsLocationsSaving}
                                      />
                                    </label>
                                    <label className="ge-modalField" style={{ flex: 2 }}>
                                      <div className="ge-modalLabel">Rua *</div>
                                      <input
                                        className="ge-input"
                                        required
                                        value={settingsLocationModal.form.street}
                                        onChange={(e) =>
                                          setSettingsLocationModal((prev) =>
                                            prev ? { ...prev, form: { ...prev.form, street: e.target.value } } : prev,
                                          )
                                        }
                                        disabled={settingsLocationsSaving}
                                      />
                                    </label>
                                    <label className="ge-modalField" style={{ flex: 1 }}>
                                      <div className="ge-modalLabel">Número *</div>
                                      <input
                                        className="ge-input"
                                        required
                                        value={settingsLocationModal.form.streetNumber}
                                        onChange={(e) =>
                                          setSettingsLocationModal((prev) =>
                                            prev ? { ...prev, form: { ...prev.form, streetNumber: e.target.value } } : prev,
                                          )
                                        }
                                        disabled={settingsLocationsSaving}
                                      />
                                    </label>
                                    <label className="ge-modalField" style={{ flex: 1 }}>
                                      <div className="ge-modalLabel">Complemento</div>
                                      <input
                                        className="ge-input"
                                        value={settingsLocationModal.form.complement}
                                        onChange={(e) =>
                                          setSettingsLocationModal((prev) =>
                                            prev ? { ...prev, form: { ...prev.form, complement: e.target.value } } : prev,
                                          )
                                        }
                                        disabled={settingsLocationsSaving}
                                      />
                                    </label>
                                  </div>

                                  <div className="ge-inlineForm" style={{ gap: 10 }}>
                                    <label className="ge-modalField" style={{ flex: 1 }}>
                                      <div className="ge-modalLabel">Bairro *</div>
                                      <input
                                        className="ge-input"
                                        required
                                        value={settingsLocationModal.form.neighborhood}
                                        onChange={(e) =>
                                          setSettingsLocationModal((prev) =>
                                            prev ? { ...prev, form: { ...prev.form, neighborhood: e.target.value } } : prev,
                                          )
                                        }
                                        disabled={settingsLocationsSaving}
                                      />
                                    </label>
                                    <label className="ge-modalField" style={{ flex: 1 }}>
                                      <div className="ge-modalLabel">UF *</div>
                                      <input
                                        className="ge-input"
                                        required
                                        maxLength={2}
                                        value={settingsLocationModal.form.state}
                                        onChange={(e) =>
                                          setSettingsLocationModal((prev) =>
                                            prev ? { ...prev, form: { ...prev.form, state: e.target.value.toUpperCase() } } : prev,
                                          )
                                        }
                                        disabled={settingsLocationsSaving}
                                      />
                                    </label>
                                    <label className="ge-modalField" style={{ flex: 2 }}>
                                      <div className="ge-modalLabel">Cidade *</div>
                                      <input
                                        className="ge-input"
                                        required
                                        value={settingsLocationModal.form.city}
                                        onChange={(e) =>
                                          setSettingsLocationModal((prev) =>
                                            prev ? { ...prev, form: { ...prev.form, city: e.target.value } } : prev,
                                          )
                                        }
                                        disabled={settingsLocationsSaving}
                                      />
                                    </label>
                                  </div>

                                  <label className="ge-modalField">
                                    <div className="ge-modalLabel">Anotações</div>
                                    <input
                                      className="ge-input"
                                      value={settingsLocationModal.form.notes}
                                      onChange={(e) =>
                                        setSettingsLocationModal((prev) =>
                                          prev ? { ...prev, form: { ...prev.form, notes: e.target.value } } : prev,
                                        )
                                      }
                                      disabled={settingsLocationsSaving}
                                    />
                                  </label>

                                  <label className="ge-modalField">
                                    <div className="ge-modalLabel">Link do Google Maps</div>
                                    <input
                                      className="ge-input"
                                      value={settingsLocationModal.form.googleMapsUrl}
                                      onChange={(e) => {
                                        const value = e.target.value
                                        setSettingsLocationModal((prev) => {
                                          if (!prev) return prev
                                          const extracted = extractLatLngFromGoogleMapsUrl(value)
                                          return {
                                            ...prev,
                                            form: {
                                              ...prev.form,
                                              googleMapsUrl: value,
                                              latitude: extracted?.latitude ?? prev.form.latitude,
                                              longitude: extracted?.longitude ?? prev.form.longitude,
                                            },
                                          }
                                        })
                                      }}
                                      placeholder="Cole aqui o link"
                                      disabled={settingsLocationsSaving}
                                    />
                                  </label>

                                  <div className="ge-inlineForm" style={{ gap: 10 }}>
                                    <label className="ge-modalField" style={{ flex: 1 }}>
                                      <div className="ge-modalLabel">Latitude</div>
                                      <input
                                        className="ge-input"
                                        inputMode="decimal"
                                        value={settingsLocationModal.form.latitude}
                                        onChange={(e) =>
                                          setSettingsLocationModal((prev) =>
                                            prev ? { ...prev, form: { ...prev.form, latitude: e.target.value } } : prev,
                                          )
                                        }
                                        disabled={settingsLocationsSaving}
                                      />
                                    </label>
                                    <label className="ge-modalField" style={{ flex: 1 }}>
                                      <div className="ge-modalLabel">Longitude</div>
                                      <input
                                        className="ge-input"
                                        inputMode="decimal"
                                        value={settingsLocationModal.form.longitude}
                                        onChange={(e) =>
                                          setSettingsLocationModal((prev) =>
                                            prev ? { ...prev, form: { ...prev.form, longitude: e.target.value } } : prev,
                                          )
                                        }
                                        disabled={settingsLocationsSaving}
                                      />
                                    </label>
                                  </div>

                                  <label className="ge-modalField">
                                    <div className="ge-modalLabel">Fuso horário *</div>
                                    <select
                                      className="ge-select"
                                      required
                                      value={settingsLocationModal.form.timeZone}
                                      onChange={(e) =>
                                        setSettingsLocationModal((prev) =>
                                          prev ? { ...prev, form: { ...prev.form, timeZone: e.target.value } } : prev,
                                        )
                                      }
                                      disabled={settingsLocationsSaving}
                                    >
                                      {[
                                        'America/Sao_Paulo',
                                        'America/Campo_Grande',
                                        'America/Manaus',
                                        'America/Porto_Velho',
                                        'America/Rio_Branco',
                                        'America/Belem',
                                        'America/Fortaleza',
                                        'America/Recife',
                                      ].map((tz) => (
                                        <option key={tz} value={tz}>
                                          {tz}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  {settingsLocationModal.mode === 'create' ? (
                                    <div className="ge-subsection" style={{ marginTop: 10 }}>
                                      <div className="ge-subsectionTitle">Setores (obrigatório)</div>
                                      <div style={{ opacity: 0.75, fontSize: 13 }}>
                                        Adicione pelo menos um setor para poder criar o local.
                                      </div>
                                      <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
                                        {(settingsLocationModal.form.sectors ?? []).map((s, idx) => (
                                          <div key={idx} className="ge-inlineForm" style={{ gap: 10 }}>
                                            <input
                                              className="ge-input"
                                              placeholder="Código"
                                              style={{ flex: 1 }}
                                              value={s.code}
                                              onChange={(e) =>
                                                setSettingsLocationModal((prev) => {
                                                  if (!prev) return prev
                                                  const next = prev.form.sectors.slice()
                                                  next[idx] = { ...next[idx], code: e.target.value }
                                                  return { ...prev, form: { ...prev.form, sectors: next } }
                                                })
                                              }
                                              disabled={settingsLocationsSaving}
                                            />
                                            <input
                                              className="ge-input"
                                              placeholder="Nome do setor *"
                                              style={{ flex: 3 }}
                                              value={s.name}
                                              onChange={(e) =>
                                                setSettingsLocationModal((prev) => {
                                                  if (!prev) return prev
                                                  const next = prev.form.sectors.slice()
                                                  next[idx] = { ...next[idx], name: e.target.value }
                                                  return { ...prev, form: { ...prev.form, sectors: next } }
                                                })
                                              }
                                              disabled={settingsLocationsSaving}
                                            />
                                            <button
                                              type="button"
                                              className="ge-iconButton"
                                              onClick={() =>
                                                setSettingsLocationModal((prev) => {
                                                  if (!prev) return prev
                                                  const next = prev.form.sectors.slice()
                                                  next.splice(idx, 1)
                                                  return { ...prev, form: { ...prev.form, sectors: next.length ? next : [{ code: '', name: '' }] } }
                                                })
                                              }
                                              disabled={settingsLocationsSaving}
                                              aria-label="Remover setor"
                                              title="Remover"
                                            >
                                              <span className="ge-iconButtonIcon">
                                                <SvgIcon name="x" size={18} />
                                              </span>
                                            </button>
                                          </div>
                                        ))}
                                        <button
                                          type="button"
                                          className="ge-buttonSecondary"
                                          onClick={() =>
                                            setSettingsLocationModal((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    form: { ...prev.form, sectors: [...prev.form.sectors, { code: '', name: '' }] },
                                                  }
                                                : prev,
                                            )
                                          }
                                          disabled={settingsLocationsSaving}
                                        >
                                          Adicionar setor
                                        </button>
                                      </div>
                                    </div>
                                  ) : settingsLocationModal.mode === 'edit' ? (
                                    (() => {
                                      const current = settingsLocations.find((l) => l.id === settingsLocationModal.locationId)
                                      const sectors = current?.sectors ?? []
                                      return (
                                        <div className="ge-subsection" style={{ marginTop: 10 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                            <div className="ge-subsectionTitle">Setores</div>
                                            <button
                                              type="button"
                                              className="ge-buttonSecondary"
                                              onClick={() => {
                                                if (!current) return
                                                setSettingsSectorModal({
                                                  mode: 'create',
                                                  locationId: current.id,
                                                  form: { code: '', name: '' },
                                                })
                                              }}
                                              disabled={!canManageLocationsAndSectors || settingsLocationsSaving || !current}
                                            >
                                              + Adicionar setor
                                            </button>
                                          </div>

                                          {sectors.length === 0 ? (
                                            <div style={{ opacity: 0.75, marginTop: 8 }}>Nenhum setor.</div>
                                          ) : (
                                            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                                              {sectors.map((sec) => (
                                                <div
                                                  key={sec.id}
                                                  style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}
                                                >
                                                  <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, opacity: sec.enabled ? 1 : 0.55 }}>
                                                      {sec.name}
                                                    </div>
                                                    {sec.code ? (
                                                      <div style={{ opacity: 0.75, fontSize: 13 }}>Código: {sec.code}</div>
                                                    ) : null}
                                                  </div>
                                                  <div style={{ display: 'flex', gap: 8 }}>
                                                    <button
                                                      type="button"
                                                      className="ge-iconButton"
                                                      onClick={() => {
                                                        if (!current) return
                                                        setSettingsSectorModal({
                                                          mode: 'edit',
                                                          sectorId: sec.id,
                                                          locationId: current.id,
                                                          form: { code: sec.code ?? '', name: sec.name ?? '' },
                                                        })
                                                      }}
                                                      disabled={!canManageLocationsAndSectors || settingsLocationsSaving || !current}
                                                      aria-label="Editar setor"
                                                      title="Editar setor"
                                                    >
                                                      <span className="ge-iconButtonIcon">
                                                        <SvgIcon name="pencil" size={18} />
                                                      </span>
                                                    </button>
                                                    <button
                                                      type="button"
                                                      className="ge-iconButton"
                                                      onClick={() => {
                                                        if (!canManageLocationsAndSectors) return
                                                        if (!window.confirm('Apagar este setor?')) return
                                                        void (async () => {
                                                          setSettingsLocationsSaving(true)
                                                          try {
                                                            await apiFetch(`/api/settings/sectors/${sec.id}`, { method: 'DELETE' })
                                                            await loadSettingsLocations()
                                                          } catch (err) {
                                                            const message =
                                                              err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                                            setSettingsLocationsError(message || 'Não foi possível apagar o setor.')
                                                          } finally {
                                                            setSettingsLocationsSaving(false)
                                                          }
                                                        })()
                                                      }}
                                                      disabled={!canManageLocationsAndSectors || settingsLocationsSaving}
                                                      aria-label="Apagar setor"
                                                      title="Apagar setor"
                                                    >
                                                      <span className="ge-iconButtonIcon">
                                                        <SvgIcon name="trash" size={18} />
                                                      </span>
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })()
                                  ) : null}

                                  <div className="ge-modalActions">
                                    <button type="button" className="ge-buttonSecondary" onClick={() => setSettingsLocationModal(null)} disabled={settingsLocationsSaving}>
                                      Cancelar
                                    </button>
                                    <button type="submit" className="ge-buttonPrimary" disabled={settingsLocationsSaving}>
                                      Salvar
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {settingsSectorModal ? (
                          <div className="ge-modalOverlay" role="dialog" aria-modal="true">
                            <div className="ge-modal">
                              <div className="ge-modalHeader">
                                <div className="ge-modalTitle">
                                  {settingsSectorModal.mode === 'create' ? 'Adicionar setor' : 'Editar setor'}
                                </div>
                                <button type="button" className="ge-modalClose" onClick={() => setSettingsSectorModal(null)} aria-label="Fechar">
                                  ×
                                </button>
                              </div>
                              <div className="ge-modalBody">
                                <form
                                  className="ge-modalForm"
                                  onSubmit={(e) => {
                                    e.preventDefault()
                                    if (!canManageLocationsAndSectors) return
                                    void (async () => {
                                      setSettingsLocationsSaving(true)
                                      try {
                                        const f = settingsSectorModal.form
                                        const payload =
                                          settingsSectorModal.mode === 'create'
                                            ? { locationId: settingsSectorModal.locationId, code: f.code || null, name: f.name }
                                            : { code: f.code || null, name: f.name }
                                        if (settingsSectorModal.mode === 'create') {
                                          await apiFetch('/api/settings/sectors', { method: 'POST', body: JSON.stringify(payload) })
                                        } else {
                                          await apiFetch(`/api/settings/sectors/${settingsSectorModal.sectorId}`, {
                                            method: 'PUT',
                                            body: JSON.stringify(payload),
                                          })
                                        }
                                        setSettingsSectorModal(null)
                                        await loadSettingsLocations()
                                      } catch (err) {
                                        const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                        setSettingsLocationsError(message || 'Não foi possível salvar o setor.')
                                      } finally {
                                        setSettingsLocationsSaving(false)
                                      }
                                    })()
                                  }}
                                  style={{ display: 'grid', gap: 10 }}
                                >
                                  <label className="ge-modalField">
                                    <div className="ge-modalLabel">Código</div>
                                    <input
                                      className="ge-input"
                                      value={settingsSectorModal.form.code}
                                      onChange={(e) =>
                                        setSettingsSectorModal((prev) =>
                                          prev ? { ...prev, form: { ...prev.form, code: e.target.value } } : prev,
                                        )
                                      }
                                      disabled={settingsLocationsSaving}
                                    />
                                  </label>
                                  <label className="ge-modalField">
                                    <div className="ge-modalLabel">Nome do setor *</div>
                                    <input
                                      className="ge-input"
                                      required
                                      value={settingsSectorModal.form.name}
                                      onChange={(e) =>
                                        setSettingsSectorModal((prev) =>
                                          prev ? { ...prev, form: { ...prev.form, name: e.target.value } } : prev,
                                        )
                                      }
                                      disabled={settingsLocationsSaving}
                                    />
                                  </label>
                                  <div className="ge-modalActions">
                                    <button type="button" className="ge-buttonSecondary" onClick={() => setSettingsSectorModal(null)} disabled={settingsLocationsSaving}>
                                      Cancelar
                                    </button>
                                    <button type="submit" className="ge-buttonPrimary" disabled={settingsLocationsSaving}>
                                      Salvar
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </section>
                  ) : null}

                  {activeSectionId === 'settings' && activeItemId === 'grupos' ? (
                    <section className="ge-card">
                      <div className="ge-cardTitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span>Grupos</span>
                        {canManageGroups ? (
                          <button
                            type="button"
                            className="ge-buttonPrimary"
                            onClick={() => setSettingsGroupEditor({ mode: 'create', name: '' })}
                            disabled={settingsGroupSaving}
                          >
                            Adicionar Grupo
                          </button>
                        ) : null}
                      </div>
                      <div className="ge-cardBody">
                        {!canManageGroups ? (
                          <div style={{ opacity: 0.85 }}>
                            Apenas usuários do tipo Administrador e Super Admin têm permissão para criar, alterar e excluir grupos.
                          </div>
                        ) : null}

                        {settingsGroupsError ? <div className="ge-errorText">{settingsGroupsError}</div> : null}

                        {settingsGroupsLoading ? (
                          <div>Carregando...</div>
                        ) : (
                          <>
                            {settingsGroupEditor?.mode === 'create' ? (
                              <div className="ge-inlineForm" style={{ marginTop: 10, gap: 10 }}>
                                <input
                                  className="ge-input"
                                  type="text"
                                  placeholder="Nome do grupo"
                                  style={{ flex: 1 }}
                                  value={settingsGroupEditor.name}
                                  onChange={(e) =>
                                    setSettingsGroupEditor((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                                  }
                                  disabled={settingsGroupSaving}
                                />
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="ge-buttonSecondary"
                                    disabled={settingsGroupSaving}
                                    onClick={() => setSettingsGroupEditor(null)}
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    className="ge-buttonPrimary"
                                    disabled={settingsGroupSaving || !settingsGroupEditor.name.trim()}
                                    onClick={() => {
                                      if (!settingsGroupEditor.name.trim()) return
                                      void (async () => {
                                        setSettingsGroupSaving(true)
                                        try {
                                          await apiFetch('/api/groups', {
                                            method: 'POST',
                                            body: JSON.stringify({ name: settingsGroupEditor.name }),
                                          })
                                          setSettingsGroupEditor(null)
                                          await loadSettingsGroups()
                                        } catch (err) {
                                          const message =
                                            err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                          setSettingsGroupsError(message || 'Não foi possível criar o grupo.')
                                        } finally {
                                          setSettingsGroupSaving(false)
                                        }
                                      })()
                                    }}
                                  >
                                    Salvar
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            <div className="ge-list" style={{ marginTop: 10 }}>
                              {filteredSettingsGroups.length === 0 ? (
                                <div style={{ opacity: 0.75 }}>Nenhum grupo encontrado.</div>
                              ) : (
                                filteredSettingsGroups.map((group) => {
                                  const editing = settingsGroupEditor?.mode === 'edit' && settingsGroupEditor.id === group.id
                                  return (
                                    <div key={group.id} className="ge-listRow" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                      {editing ? (
                                        <>
                                          <input
                                            className="ge-input"
                                            type="text"
                                            value={settingsGroupEditor?.name ?? ''}
                                            onChange={(e) =>
                                              setSettingsGroupEditor((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                                            }
                                            disabled={settingsGroupSaving}
                                          />
                                          <button
                                            type="button"
                                            className="ge-buttonPrimary"
                                            disabled={settingsGroupSaving || !settingsGroupEditor?.name.trim()}
                                            onClick={() => {
                                              if (!settingsGroupEditor?.id) return
                                              if (!settingsGroupEditor.name.trim()) return
                                              void (async () => {
                                                setSettingsGroupSaving(true)
                                                try {
                                                  await apiFetch(`/api/groups/${settingsGroupEditor.id}`, {
                                                    method: 'PUT',
                                                    body: JSON.stringify({ name: settingsGroupEditor.name }),
                                                  })
                                                  setSettingsGroupEditor(null)
                                                  await loadSettingsGroups()
                                                } catch (err) {
                                                  const message =
                                                    err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                                  setSettingsGroupsError(message || 'Não foi possível salvar o grupo.')
                                                } finally {
                                                  setSettingsGroupSaving(false)
                                                }
                                              })()
                                            }}
                                          >
                                            Salvar
                                          </button>
                                          <button
                                            type="button"
                                            className="ge-buttonSecondary"
                                            disabled={settingsGroupSaving}
                                            onClick={() => setSettingsGroupEditor(null)}
                                          >
                                            Cancelar
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <div style={{ flex: 1, fontWeight: 700 }}>{group.name}</div>
                                          <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                              type="button"
                                              className="ge-buttonSecondary ge-buttonIconOnly"
                                              onClick={() => setSettingsGroupEditor({ mode: 'edit', id: group.id, name: group.name })}
                                              disabled={settingsGroupSaving}
                                              aria-label="Editar"
                                              title="Editar"
                                            >
                                              <SvgIcon name="pencil" />
                                            </button>
                                            <button
                                              type="button"
                                              className="ge-buttonDanger ge-buttonIconOnly"
                                              onClick={() => {
                                                if (settingsGroupSaving) return
                                                void (async () => {
                                                  setSettingsGroupSaving(true)
                                                  try {
                                                    await apiFetch(`/api/groups/${group.id}`, { method: 'DELETE' })
                                                    await loadSettingsGroups()
                                                  } catch (err) {
                                                    const message =
                                                      err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                                    setSettingsGroupsError(message || 'Não foi possível excluir o grupo.')
                                                  } finally {
                                                    setSettingsGroupSaving(false)
                                                  }
                                                })()
                                              }}
                                              disabled={settingsGroupSaving}
                                              aria-label="Excluir"
                                              title="Excluir"
                                            >
                                              <SvgIcon name="trash" />
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </section>
                  ) : null}

                  {activeSectionId === 'settings' && activeItemId === 'tipos-plantao' ? (
                    <section className="ge-card">
                      <div className="ge-cardTitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span>Tipos de Plantão</span>
                        {isAdmin || isSuperAdmin ? (
                          <button
                            type="button"
                            className="ge-buttonPrimary"
                            onClick={() => setSettingsShiftTypeEditor({ mode: 'create', name: '', color: '' })}
                            disabled={settingsShiftTypesSaving}
                          >
                            Adicionar Tipo
                          </button>
                        ) : null}
                      </div>
                      <div className="ge-cardBody">
                        {!(isAdmin || isSuperAdmin) ? (
                          <div style={{ opacity: 0.85 }}>
                            Apenas usuários do tipo Administrador e Super Admin têm permissão para criar, alterar e excluir tipos de plantão.
                          </div>
                        ) : null}

                        {settingsShiftTypesError ? <div className="ge-errorText">{settingsShiftTypesError}</div> : null}

                        {settingsShiftTypesLoading ? (
                          <div>Carregando...</div>
                        ) : (
                          <>
                            {settingsShiftTypeEditor?.mode === 'create' ? (
                              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                                <div className="ge-inlineForm" style={{ gap: 10 }}>
                                  <input
                                    className="ge-input"
                                    type="text"
                                    placeholder="Nome do tipo"
                                    style={{ flex: 1 }}
                                    value={settingsShiftTypeEditor.name}
                                    onChange={(e) =>
                                      setSettingsShiftTypeEditor((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                                    }
                                    disabled={settingsShiftTypesSaving}
                                  />
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <div
                                      style={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: 4,
                                        border: '1px solid rgba(0,0,0,0.12)',
                                        background: settingsShiftTypeEditor.color.trim() ? settingsShiftTypeEditor.color : '#ffffff',
                                        flex: '0 0 auto',
                                      }}
                                      title={settingsShiftTypeEditor.color.trim() || 'Sem cor'}
                                    />
                                    <input
                                      className="ge-input"
                                      type="text"
                                      placeholder="Cor (ex: #64748b)"
                                      value={settingsShiftTypeEditor.color}
                                      onChange={(e) =>
                                        setSettingsShiftTypeEditor((prev) => (prev ? { ...prev, color: e.target.value } : prev))
                                      }
                                      disabled={settingsShiftTypesSaving}
                                      style={{ maxWidth: 190 }}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    <button
                                      type="button"
                                      className="ge-buttonSecondary"
                                      disabled={settingsShiftTypesSaving}
                                      onClick={() => setSettingsShiftTypeEditor(null)}
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      className="ge-buttonPrimary"
                                      disabled={settingsShiftTypesSaving || !settingsShiftTypeEditor.name.trim() || !(isAdmin || isSuperAdmin)}
                                      onClick={() => {
                                        if (!settingsShiftTypeEditor.name.trim()) return
                                        if (!(isAdmin || isSuperAdmin)) return
                                        void (async () => {
                                          setSettingsShiftTypesSaving(true)
                                          try {
                                            await apiFetch('/api/settings/shift-types', {
                                              method: 'POST',
                                              body: JSON.stringify({ name: settingsShiftTypeEditor.name, color: settingsShiftTypeEditor.color }),
                                            })
                                            setSettingsShiftTypeEditor(null)
                                            await queryClient.invalidateQueries({ queryKey: ['shiftTypes'] })
                                            await loadSettingsShiftTypes()
                                          } catch (err) {
                                            const message =
                                              err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                            setSettingsShiftTypesError(message || 'Não foi possível criar o tipo de plantão.')
                                          } finally {
                                            setSettingsShiftTypesSaving(false)
                                          }
                                        })()
                                      }}
                                    >
                                      Salvar
                                    </button>
                                  </div>
                                </div>

                                <div style={{ maxWidth: 560 }}>
                                  <SettingsShiftTypeColorPicker
                                    value={settingsShiftTypeEditor.color}
                                    disabled={settingsShiftTypesSaving}
                                    onChange={(next) =>
                                      setSettingsShiftTypeEditor((prev) => (prev ? { ...prev, color: next } : prev))
                                    }
                                  />
                                </div>
                              </div>
                            ) : null}

                            <div className="ge-list" style={{ marginTop: 10 }}>
                              {filteredSettingsShiftTypes.length === 0 ? (
                                <div style={{ opacity: 0.75 }}>Nenhum tipo encontrado.</div>
                              ) : (
                                filteredSettingsShiftTypes.map((t) => {
                                  const editing = settingsShiftTypeEditor?.mode === 'edit' && settingsShiftTypeEditor.id === t.id
                                  const locked = t.system || t.code === 'NORMAL'
                                  return (
                                    <div
                                      key={t.id}
                                      className="ge-listRow"
                                      style={{ display: 'flex', gap: 10, alignItems: editing ? 'flex-start' : 'center' }}
                                    >
                                      <div
                                        style={{
                                          width: 14,
                                          height: 14,
                                          borderRadius: 4,
                                          border: '1px solid rgba(0,0,0,0.12)',
                                          background: t.code === 'NORMAL' ? '#ffffff' : t.color || '#e2e8f0',
                                          flex: '0 0 auto',
                                        }}
                                        title={t.color || 'Sem cor'}
                                      />
                                      {editing ? (
                                        <>
                                          <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 8 }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                              <input
                                                className="ge-input"
                                                type="text"
                                                value={settingsShiftTypeEditor?.name ?? ''}
                                                onChange={(e) =>
                                                  setSettingsShiftTypeEditor((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                                                }
                                                disabled={settingsShiftTypesSaving}
                                                style={{ flex: 1, minWidth: 240 }}
                                              />
                                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <div
                                                  style={{
                                                    width: 18,
                                                    height: 18,
                                                    borderRadius: 4,
                                                    border: '1px solid rgba(0,0,0,0.12)',
                                                    background: settingsShiftTypeEditor?.color.trim()
                                                      ? settingsShiftTypeEditor.color
                                                      : '#ffffff',
                                                    flex: '0 0 auto',
                                                  }}
                                                  title={settingsShiftTypeEditor?.color.trim() || 'Sem cor'}
                                                />
                                                <input
                                                  className="ge-input"
                                                  type="text"
                                                  value={settingsShiftTypeEditor?.color ?? ''}
                                                  placeholder="Cor (ex: #64748b)"
                                                  onChange={(e) =>
                                                    setSettingsShiftTypeEditor((prev) => (prev ? { ...prev, color: e.target.value } : prev))
                                                  }
                                                  disabled={settingsShiftTypesSaving}
                                                  style={{ maxWidth: 190 }}
                                                />
                                              </div>
                                            </div>

                                            <div style={{ maxWidth: 560 }}>
                                              <SettingsShiftTypeColorPicker
                                                value={settingsShiftTypeEditor?.color ?? ''}
                                                disabled={settingsShiftTypesSaving}
                                                onChange={(next) =>
                                                  setSettingsShiftTypeEditor((prev) => (prev ? { ...prev, color: next } : prev))
                                                }
                                              />
                                            </div>
                                          </div>

                                          <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                              type="button"
                                              className="ge-buttonPrimary"
                                              disabled={
                                                settingsShiftTypesSaving ||
                                                !settingsShiftTypeEditor?.name.trim() ||
                                                locked ||
                                                !(isAdmin || isSuperAdmin)
                                              }
                                              onClick={() => {
                                                if (!settingsShiftTypeEditor?.id) return
                                                if (!settingsShiftTypeEditor.name.trim()) return
                                                if (locked) return
                                                if (!(isAdmin || isSuperAdmin)) return
                                                void (async () => {
                                                  setSettingsShiftTypesSaving(true)
                                                  try {
                                                    await apiFetch(`/api/settings/shift-types/${settingsShiftTypeEditor.id}`, {
                                                      method: 'PUT',
                                                      body: JSON.stringify({
                                                        name: settingsShiftTypeEditor.name,
                                                        color: settingsShiftTypeEditor.color,
                                                      }),
                                                    })
                                                    setSettingsShiftTypeEditor(null)
                                                    await queryClient.invalidateQueries({ queryKey: ['shiftTypes'] })
                                                    await loadSettingsShiftTypes()
                                                  } catch (err) {
                                                    const message =
                                                      err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                                    setSettingsShiftTypesError(message || 'Não foi possível salvar o tipo de plantão.')
                                                  } finally {
                                                    setSettingsShiftTypesSaving(false)
                                                  }
                                                })()
                                              }}
                                            >
                                              Salvar
                                            </button>
                                            <button
                                              type="button"
                                              className="ge-buttonSecondary"
                                              disabled={settingsShiftTypesSaving}
                                              onClick={() => setSettingsShiftTypeEditor(null)}
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                                            <div style={{ opacity: 0.75, fontSize: 13 }}>{t.code}</div>
                                          </div>
                                          {t.code !== 'NORMAL' ? (
                                            <div style={{ display: 'flex', gap: 8 }}>
                                              <button
                                                type="button"
                                                className="ge-buttonSecondary ge-buttonIconOnly"
                                                onClick={() =>
                                                  setSettingsShiftTypeEditor({ mode: 'edit', id: t.id, name: t.name, color: t.color ?? '' })
                                                }
                                                disabled={settingsShiftTypesSaving || locked || !(isAdmin || isSuperAdmin)}
                                                aria-label="Editar"
                                                title={locked ? 'Tipo padrão não pode ser alterado' : 'Editar'}
                                              >
                                                <SvgIcon name="pencil" />
                                              </button>
                                              <button
                                                type="button"
                                                className="ge-buttonDanger ge-buttonIconOnly"
                                                onClick={() => {
                                                  if (settingsShiftTypesSaving) return
                                                  if (locked) return
                                                  if (!(isAdmin || isSuperAdmin)) return
                                                  const ok = window.confirm(`Excluir tipo "${t.name}"?`)
                                                  if (!ok) return
                                                  void (async () => {
                                                    setSettingsShiftTypesSaving(true)
                                                    try {
                                                      await apiFetch(`/api/settings/shift-types/${t.id}`, { method: 'DELETE' })
                                                      await queryClient.invalidateQueries({ queryKey: ['shiftTypes'] })
                                                      await loadSettingsShiftTypes()
                                                    } catch (err) {
                                                      const message =
                                                        err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                                      setSettingsShiftTypesError(message || 'Não foi possível excluir o tipo de plantão.')
                                                    } finally {
                                                      setSettingsShiftTypesSaving(false)
                                                    }
                                                  })()
                                                }}
                                                disabled={settingsShiftTypesSaving || locked || !(isAdmin || isSuperAdmin)}
                                                aria-label="Excluir"
                                                title={locked ? 'Tipo padrão não pode ser excluído' : 'Excluir'}
                                              >
                                                <SvgIcon name="trash" />
                                              </button>
                                            </div>
                                          ) : null}
                                        </>
                                      )}
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </section>
                  ) : null}

                  {activeSectionId === 'settings' && activeItemId === 'situacoes-plantao' ? (
                    <section className="ge-card">
                      <div className="ge-cardTitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span>Situações do Plantão</span>
                        {isAdmin || isSuperAdmin ? (
                          <button
                            type="button"
                            className="ge-buttonPrimary"
                            onClick={() => setSettingsShiftSituationEditor({ mode: 'create', name: '', requiresCoverage: false })}
                            disabled={settingsShiftSituationsSaving}
                          >
                            Adicionar Situação
                          </button>
                        ) : null}
                      </div>
                      <div className="ge-cardBody">
                        {!(isAdmin || isSuperAdmin) ? (
                          <div style={{ opacity: 0.85 }}>
                            Apenas usuários do tipo Administrador e Super Admin têm permissão para criar, alterar e excluir situações do plantão.
                          </div>
                        ) : null}

                        {settingsShiftSituationsError ? <div className="ge-errorText">{settingsShiftSituationsError}</div> : null}

                        {settingsShiftSituationsLoading ? (
                          <div>Carregando...</div>
                        ) : (
                          <>
                            {settingsShiftSituationEditor?.mode === 'create' ? (
                              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                                <div className="ge-inlineForm" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <input
                                    className="ge-input"
                                    type="text"
                                    placeholder="Nome da situação"
                                    style={{ flex: 1, minWidth: 240 }}
                                    value={settingsShiftSituationEditor.name}
                                    onChange={(e) =>
                                      setSettingsShiftSituationEditor((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                                    }
                                    disabled={settingsShiftSituationsSaving}
                                  />
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                                    <input
                                      type="checkbox"
                                      checked={settingsShiftSituationEditor.requiresCoverage}
                                      onChange={(e) =>
                                        setSettingsShiftSituationEditor((prev) =>
                                          prev ? { ...prev, requiresCoverage: e.target.checked } : prev,
                                        )
                                      }
                                      disabled={settingsShiftSituationsSaving}
                                    />
                                    Precisa de Cobertura
                                  </label>
                                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    <button
                                      type="button"
                                      className="ge-buttonSecondary"
                                      disabled={settingsShiftSituationsSaving}
                                      onClick={() => setSettingsShiftSituationEditor(null)}
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      className="ge-buttonPrimary"
                                      disabled={
                                        settingsShiftSituationsSaving || !settingsShiftSituationEditor.name.trim() || !(isAdmin || isSuperAdmin)
                                      }
                                      onClick={() => {
                                        if (!settingsShiftSituationEditor.name.trim()) return
                                        if (!(isAdmin || isSuperAdmin)) return
                                        void (async () => {
                                          setSettingsShiftSituationsSaving(true)
                                          try {
                                            await apiFetch('/api/settings/shift-situations', {
                                              method: 'POST',
                                              body: JSON.stringify({
                                                name: settingsShiftSituationEditor.name,
                                                requiresCoverage: settingsShiftSituationEditor.requiresCoverage,
                                              }),
                                            })
                                            setSettingsShiftSituationEditor(null)
                                            await queryClient.invalidateQueries({ queryKey: ['shiftSituations'] })
                                            await loadSettingsShiftSituations()
                                          } catch (err) {
                                            const message =
                                              err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                            setSettingsShiftSituationsError(message || 'Não foi possível criar a situação do plantão.')
                                          } finally {
                                            setSettingsShiftSituationsSaving(false)
                                          }
                                        })()
                                      }}
                                    >
                                      Salvar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            <div className="ge-list" style={{ marginTop: 10 }}>
                              {filteredSettingsShiftSituations.length === 0 ? (
                                <div style={{ opacity: 0.75 }}>Nenhuma situação encontrada.</div>
                              ) : (
                                filteredSettingsShiftSituations.map((s) => {
                                  const editing = settingsShiftSituationEditor?.mode === 'edit' && settingsShiftSituationEditor.id === s.id
                                  return (
                                    <div
                                      key={s.id}
                                      className="ge-listRow"
                                      style={{ display: 'flex', gap: 10, alignItems: editing ? 'flex-start' : 'center' }}
                                    >
                                      {editing ? (
                                        <>
                                          <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 8 }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                              <input
                                                className="ge-input"
                                                type="text"
                                                value={settingsShiftSituationEditor?.name ?? ''}
                                                onChange={(e) =>
                                                  setSettingsShiftSituationEditor((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                                                }
                                                disabled={settingsShiftSituationsSaving}
                                                style={{ flex: 1, minWidth: 240 }}
                                              />
                                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                                                <input
                                                  type="checkbox"
                                                  checked={settingsShiftSituationEditor?.requiresCoverage ?? false}
                                                  onChange={(e) =>
                                                    setSettingsShiftSituationEditor((prev) =>
                                                      prev ? { ...prev, requiresCoverage: e.target.checked } : prev,
                                                    )
                                                  }
                                                  disabled={settingsShiftSituationsSaving}
                                                />
                                                Precisa de Cobertura
                                              </label>
                                            </div>
                                          </div>

                                          <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                              type="button"
                                              className="ge-buttonPrimary"
                                              disabled={
                                                settingsShiftSituationsSaving ||
                                                !settingsShiftSituationEditor?.name.trim() ||
                                                !(isAdmin || isSuperAdmin)
                                              }
                                              onClick={() => {
                                                if (!settingsShiftSituationEditor?.id) return
                                                if (!settingsShiftSituationEditor.name.trim()) return
                                                if (!(isAdmin || isSuperAdmin)) return
                                                void (async () => {
                                                  setSettingsShiftSituationsSaving(true)
                                                  try {
                                                    await apiFetch(`/api/settings/shift-situations/${settingsShiftSituationEditor.id}`, {
                                                      method: 'PUT',
                                                      body: JSON.stringify({
                                                        name: settingsShiftSituationEditor.name,
                                                        requiresCoverage: settingsShiftSituationEditor.requiresCoverage,
                                                      }),
                                                    })
                                                    setSettingsShiftSituationEditor(null)
                                                    await queryClient.invalidateQueries({ queryKey: ['shiftSituations'] })
                                                    await loadSettingsShiftSituations()
                                                  } catch (err) {
                                                    const message =
                                                      err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                                    setSettingsShiftSituationsError(message || 'Não foi possível salvar a situação do plantão.')
                                                  } finally {
                                                    setSettingsShiftSituationsSaving(false)
                                                  }
                                                })()
                                              }}
                                            >
                                              Salvar
                                            </button>
                                            <button
                                              type="button"
                                              className="ge-buttonSecondary"
                                              disabled={settingsShiftSituationsSaving}
                                              onClick={() => setSettingsShiftSituationEditor(null)}
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {s.name}
                                            </div>
                                            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                                              {s.requiresCoverage ? 'Precisa de cobertura' : 'Sem cobertura'}
                                            </div>
                                          </div>
                                          <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                              type="button"
                                              className="ge-buttonSecondary ge-buttonIconOnly"
                                              onClick={() =>
                                                setSettingsShiftSituationEditor({
                                                  mode: 'edit',
                                                  id: s.id,
                                                  name: s.name,
                                                  requiresCoverage: s.requiresCoverage,
                                                })
                                              }
                                              disabled={settingsShiftSituationsSaving || !(isAdmin || isSuperAdmin)}
                                              aria-label="Editar"
                                              title="Editar"
                                            >
                                              <SvgIcon name="pencil" />
                                            </button>
                                            <button
                                              type="button"
                                              className="ge-buttonDanger ge-buttonIconOnly"
                                              onClick={() => {
                                                if (settingsShiftSituationsSaving) return
                                                if (!(isAdmin || isSuperAdmin)) return
                                                void (async () => {
                                                  setSettingsShiftSituationsSaving(true)
                                                  try {
                                                    await apiFetch(`/api/settings/shift-situations/${s.id}`, { method: 'DELETE' })
                                                    await queryClient.invalidateQueries({ queryKey: ['shiftSituations'] })
                                                    await loadSettingsShiftSituations()
                                                  } catch (err) {
                                                    const message =
                                                      err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                                    setSettingsShiftSituationsError(message || 'Não foi possível excluir a situação do plantão.')
                                                  } finally {
                                                    setSettingsShiftSituationsSaving(false)
                                                  }
                                                })()
                                              }}
                                              disabled={settingsShiftSituationsSaving || !(isAdmin || isSuperAdmin)}
                                              aria-label="Excluir"
                                              title="Excluir"
                                            >
                                              <SvgIcon name="trash" />
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </section>
                  ) : null}

                  {activeSectionId === 'settings' && activeItemId === 'valores' ? (
                    <section className="ge-card">
                      <div className="ge-cardTitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span>Valores</span>
                        <button
                          type="button"
                          className="ge-buttonPrimary"
                          disabled={settingsValuesSaving || !isAdmin || !settingsValuesSectorId}
                          onClick={() => {
                            if (!isAdmin) return
                            if (!settingsValuesSectorId) return
                            if (!/^\d{4}-\d{2}-\d{2}$/.test(settingsValuesPeriodStart)) {
                              setSettingsValuesError('Selecione uma data inicial válida.')
                              return
                            }
                            if (!/^\d{4}-\d{2}-\d{2}$/.test(settingsValuesPeriodEnd)) {
                              setSettingsValuesError('Selecione uma data final válida.')
                              return
                            }
                            void (async () => {
                              setSettingsValuesSaving(true)
                              try {
                                const shiftTypesPayload = settingsValuesShiftTypes.map((r) => {
                                  const valueCents = parseBrlToCents(r.value)
                                  if (valueCents == null) throw new Error('shift_type_value_invalid')
                                  return { shiftTypeCode: r.shiftTypeCode, valueCents, currency: 'BRL' }
                                })
                                const bonusesPayload = settingsValuesBonuses.map((r) => {
                                  const rule = settingsBonusRuleById[r.bonusRuleId]
                                  const valueKind = rule?.valueKind ?? r.valueKind
                                  if (valueKind === 'CURRENCY') {
                                    const valueCents = parseBrlToCents(r.value)
                                    if (valueCents == null) throw new Error('bonus_value_invalid')
                                    return { bonusRuleId: r.bonusRuleId, valueKind, valueCents, valueBps: null }
                                  }
                                  const valueBps = parsePercentToBps(r.value)
                                  if (valueBps == null) throw new Error('bonus_value_invalid')
                                  return { bonusRuleId: r.bonusRuleId, valueKind, valueCents: null, valueBps }
                                })

                                await apiFetch('/api/settings/values', {
                                  method: 'PUT',
                                  body: JSON.stringify({
                                    sectorId: settingsValuesSectorId,
                                    periodStart: settingsValuesPeriodStart,
                                    periodEnd: settingsValuesPeriodEnd,
                                    shiftTypes: shiftTypesPayload,
                                    bonuses: bonusesPayload,
                                  }),
                                })
                                await loadSettingsValues({
                                  sectorId: settingsValuesSectorId,
                                  periodStart: settingsValuesPeriodStart,
                                  periodEnd: settingsValuesPeriodEnd,
                                })
                              } catch (err) {
                                const raw = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                if (raw === 'shift_type_value_invalid') {
                                  setSettingsValuesError('Informe valores válidos para os tipos (R$).')
                                } else if (raw === 'bonus_value_invalid') {
                                  setSettingsValuesError('Informe valores válidos para as bonificações (R$ ou %).')
                                } else {
                                  const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                  setSettingsValuesError(message || 'Não foi possível salvar os valores.')
                                }
                              } finally {
                                setSettingsValuesSaving(false)
                              }
                            })()
                          }}
                        >
                          Salvar Valores
                        </button>
                      </div>
                      <div className="ge-cardBody">
                        {!isAdmin ? (
                          <div style={{ opacity: 0.85 }}>Apenas usuários do tipo Administrador têm permissão para salvar valores.</div>
                        ) : null}

                        {settingsValuesError ? <div className="ge-errorText">{settingsValuesError}</div> : null}

                        <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
                          <div
                            className="ge-inlineForm"
                            style={{ gap: 10, alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto' }}
                          >
                            <div style={{ fontWeight: 900, opacity: 0.9 }}>Período</div>
                            <input
                              className="ge-input"
                              type="date"
                              value={settingsValuesPeriodStart}
                              onChange={(e) => setSettingsValuesPeriodStart(e.target.value)}
                              disabled={settingsValuesSaving}
                            />
                            <span style={{ opacity: 0.75 }}>→</span>
                            <input
                              className="ge-input"
                              type="date"
                              value={settingsValuesPeriodEnd}
                              onChange={(e) => setSettingsValuesPeriodEnd(e.target.value)}
                              disabled={settingsValuesSaving}
                            />
                          </div>

                          <div className="ge-inlineForm" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 900, opacity: 0.9 }}>Local</div>
                            <select
                              className="ge-select"
                              value={settingsValuesLocationId}
                              onChange={(e) => {
                                setSettingsValuesLocationId(e.target.value)
                                setSettingsValuesSectorId('')
                              }}
                              disabled={settingsLocationsLoading || settingsValuesSaving}
                              style={{ minWidth: 260 }}
                            >
                              <option value="">{settingsLocationsLoading ? 'Carregando...' : 'Selecione'}</option>
                              {(settingsLocations ?? [])
                                .filter((l) => l.enabled)
                                .map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.name}
                                  </option>
                                ))}
                            </select>

                            <div style={{ fontWeight: 900, opacity: 0.9 }}>Setor</div>
                            <select
                              className="ge-select"
                              value={settingsValuesSectorId}
                              onChange={(e) => setSettingsValuesSectorId(e.target.value)}
                              disabled={!settingsValuesLocationId || settingsValuesSaving}
                              style={{ minWidth: 260 }}
                            >
                              <option value="">{settingsValuesLocationId ? 'Selecione' : 'Selecione um local'}</option>
                              {settingsValuesAvailableSectors.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {settingsValuesLoading ? <div style={{ marginTop: 12 }}>Carregando...</div> : null}

                        <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
                          <div style={{ border: '1px solid rgba(127,127,127,0.22)', borderRadius: 12, overflow: 'hidden' }}>
                            <button
                              type="button"
                              className="ge-listRow"
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 900 }}
                              onClick={() => setSettingsValuesExpandedShiftTypes((v) => !v)}
                            >
                              <span style={{ flex: 1 }}>Tipos</span>
                              <span style={{ opacity: 0.9, transform: settingsValuesExpandedShiftTypes ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                                <SvgIcon name="chevronDown" size={18} />
                              </span>
                            </button>
                            {settingsValuesExpandedShiftTypes ? (
                              <div style={{ padding: 12, display: 'grid', gap: 10 }}>
                                {settingsValuesShiftTypes.length === 0 ? (
                                  <div style={{ opacity: 0.75 }}>Nenhum tipo configurado neste período.</div>
                                ) : (
                                  <div style={{ display: 'grid', gap: 8 }}>
                                    {settingsValuesShiftTypes.map((row) => (
                                      <div key={row.shiftTypeCode} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <div style={{ flex: 1, minWidth: 0, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {settingsShiftTypeNameByCode[row.shiftTypeCode] ?? row.shiftTypeCode}
                                        </div>
                                        <input
                                          className="ge-input"
                                          type="text"
                                          placeholder="Ex: 120,00"
                                          value={row.value}
                                          onChange={(e) =>
                                            setSettingsValuesShiftTypes((prev) =>
                                              prev.map((p) => (p.shiftTypeCode === row.shiftTypeCode ? { ...p, value: e.target.value } : p)),
                                            )
                                          }
                                          disabled={settingsValuesSaving || !isAdmin}
                                          style={{ maxWidth: 150 }}
                                        />
                                        {isAdmin ? (
                                          <button
                                            type="button"
                                            className="ge-buttonSecondary ge-buttonIconOnly"
                                            aria-label="Remover"
                                            title="Remover"
                                            disabled={settingsValuesSaving}
                                            onClick={() =>
                                              setSettingsValuesShiftTypes((prev) => prev.filter((p) => p.shiftTypeCode !== row.shiftTypeCode))
                                            }
                                          >
                                            <SvgIcon name="x" />
                                          </button>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <select
                                    className="ge-select"
                                    value={settingsValuesShiftTypeToAdd}
                                    onChange={(e) => setSettingsValuesShiftTypeToAdd(e.target.value)}
                                    disabled={settingsValuesSaving || !isAdmin || settingsValuesAvailableShiftTypes.length === 0}
                                    style={{ minWidth: 260 }}
                                  >
                                    <option value="">{settingsValuesAvailableShiftTypes.length ? 'Selecione' : 'Nenhum disponível'}</option>
                                    {settingsValuesAvailableShiftTypes.map((t) => (
                                      <option key={t.id} value={t.code}>
                                        {t.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    className="ge-buttonSecondary"
                                    disabled={settingsValuesSaving || !isAdmin || !settingsValuesShiftTypeToAdd}
                                    onClick={() => {
                                      if (!settingsValuesShiftTypeToAdd) return
                                      const code = settingsValuesShiftTypeToAdd
                                      setSettingsValuesShiftTypes((prev) => [...prev, { shiftTypeCode: code, value: '' }])
                                      setSettingsValuesShiftTypeToAdd('')
                                    }}
                                  >
                                    Adicionar
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div style={{ border: '1px solid rgba(127,127,127,0.22)', borderRadius: 12, overflow: 'hidden' }}>
                            <button
                              type="button"
                              className="ge-listRow"
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 900 }}
                              onClick={() => setSettingsValuesExpandedBonuses((v) => !v)}
                            >
                              <span style={{ flex: 1 }}>Bonificações</span>
                              <span style={{ opacity: 0.9, transform: settingsValuesExpandedBonuses ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                                <SvgIcon name="chevronDown" size={18} />
                              </span>
                            </button>
                            {settingsValuesExpandedBonuses ? (
                              <div style={{ padding: 12, display: 'grid', gap: 10 }}>
                                {settingsValuesBonuses.length === 0 ? (
                                  <div style={{ opacity: 0.75 }}>Nenhuma bonificação configurada neste período.</div>
                                ) : (
                                  <div style={{ display: 'grid', gap: 8 }}>
                                    {settingsValuesBonuses.map((row) => {
                                      const rule = settingsBonusRuleById[row.bonusRuleId]
                                      const title = rule ? rule.name : row.bonusRuleId
                                      const kind = rule?.valueKind ?? row.valueKind
                                      return (
                                        <div key={row.bonusRuleId} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {title}
                                            </div>
                                            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                                              {rule ? settingsBonusTypeLabel[rule.bonusType] : kind}
                                            </div>
                                          </div>
                                          <input
                                            className="ge-input"
                                            type="text"
                                            placeholder={kind === 'PERCENT' ? 'Ex: 10' : 'Ex: 100,00'}
                                            value={row.value}
                                            onChange={(e) =>
                                              setSettingsValuesBonuses((prev) =>
                                                prev.map((p) => (p.bonusRuleId === row.bonusRuleId ? { ...p, value: e.target.value } : p)),
                                              )
                                            }
                                            disabled={settingsValuesSaving || !isAdmin}
                                            style={{ maxWidth: 150 }}
                                          />
                                          {isAdmin ? (
                                            <button
                                              type="button"
                                              className="ge-buttonSecondary ge-buttonIconOnly"
                                              aria-label="Remover"
                                              title="Remover"
                                              disabled={settingsValuesSaving}
                                              onClick={() => setSettingsValuesBonuses((prev) => prev.filter((p) => p.bonusRuleId !== row.bonusRuleId))}
                                            >
                                              <SvgIcon name="x" />
                                            </button>
                                          ) : null}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}

                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <select
                                    className="ge-select"
                                    value={settingsValuesBonusToAdd}
                                    onChange={(e) => setSettingsValuesBonusToAdd(e.target.value)}
                                    disabled={settingsValuesSaving || !isAdmin || settingsValuesAvailableBonuses.length === 0}
                                    style={{ minWidth: 260 }}
                                  >
                                    <option value="">{settingsValuesAvailableBonuses.length ? 'Selecione' : 'Nenhuma disponível'}</option>
                                    {settingsValuesAvailableBonuses.map((b) => (
                                      <option key={b.id} value={b.id}>
                                        {b.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    className="ge-buttonSecondary"
                                    disabled={settingsValuesSaving || !isAdmin || !settingsValuesBonusToAdd}
                                    onClick={() => {
                                      const id = settingsValuesBonusToAdd
                                      if (!id) return
                                      const rule = settingsBonusRuleById[id]
                                      const kind = rule?.valueKind ?? 'CURRENCY'
                                      setSettingsValuesBonuses((prev) => [...prev, { bonusRuleId: id, valueKind: kind, value: '' }])
                                      setSettingsValuesBonusToAdd('')
                                    }}
                                  >
                                    Adicionar
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  {activeSectionId === 'settings' && activeItemId === 'bonificacoes' ? (
                    <section className="ge-card">
                      <div className="ge-cardTitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span>Bonificações</span>
                        {isAdmin ? (
                          <button
                            type="button"
                            className="ge-buttonPrimary"
                            onClick={() =>
                              setSettingsBonusRuleEditor({
                                mode: 'create',
                                name: '',
                                valueKind: 'CURRENCY',
                                value: '',
                                bonusType: 'ADDITIONAL_PER_SHIFT',
                              })
                            }
                            disabled={settingsBonusRulesSaving}
                          >
                            Adicionar Regra
                          </button>
                        ) : null}
                      </div>
                      <div className="ge-cardBody">
                        {!isAdmin ? (
                          <div style={{ opacity: 0.85 }}>Apenas usuários do tipo Administrador têm permissão para criar, alterar e excluir uma bonificação.</div>
                        ) : null}

                        {settingsBonusRulesError ? <div className="ge-errorText">{settingsBonusRulesError}</div> : null}

                        {settingsBonusRulesLoading ? (
                          <div>Carregando...</div>
                        ) : (
                          <>
                            <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                              <input
                                className="ge-input"
                                type="text"
                                placeholder="Pesquisar..."
                                value={settingsBonusRulesSearch}
                                onChange={(e) => setSettingsBonusRulesSearch(e.target.value)}
                                style={{ flex: 1, minWidth: 220 }}
                              />
                            </div>

                            {settingsBonusRuleEditor ? (
                              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                                <div
                                  className="ge-inlineForm"
                                  style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}
                                >
                                  <input
                                    className="ge-input"
                                    type="text"
                                    placeholder="Nome da bonificação"
                                    style={{ flex: 1, minWidth: 240 }}
                                    value={settingsBonusRuleEditor.name}
                                    onChange={(e) =>
                                      setSettingsBonusRuleEditor((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                                    }
                                    disabled={settingsBonusRulesSaving || !isAdmin}
                                  />
                                  <select
                                    className="ge-select"
                                    value={settingsBonusRuleEditor.valueKind}
                                    onChange={(e) => {
                                      const nextKind = (e.target.value || 'CURRENCY') as SettingsBonusRuleValueKind
                                      setSettingsBonusRuleEditor((prev) => {
                                        if (!prev) return prev
                                        const compatibleTypes =
                                          nextKind === 'PERCENT'
                                            ? (['PERCENT_PER_SHIFT', 'PERCENT_PER_MONTH'] as const)
                                            : (['ADDITIONAL_PER_SHIFT', 'ADDITIONAL_PER_MONTH', 'FIXED_PER_MONTH'] as const)
                                        const nextType = compatibleTypes.includes(prev.bonusType as never)
                                          ? prev.bonusType
                                          : compatibleTypes[0]
                                        return { ...prev, valueKind: nextKind, bonusType: nextType, value: '' }
                                      })
                                    }}
                                    disabled={settingsBonusRulesSaving || !isAdmin}
                                    style={{ minWidth: 110 }}
                                    aria-label="Tipo do valor"
                                    title="Tipo do valor"
                                  >
                                    <option value="CURRENCY">R$</option>
                                    <option value="PERCENT">%</option>
                                  </select>
                                  <input
                                    className="ge-input"
                                    type="text"
                                    placeholder={settingsBonusRuleEditor.valueKind === 'PERCENT' ? 'Ex: 10' : 'Ex: 100,00'}
                                    value={settingsBonusRuleEditor.value}
                                    onChange={(e) =>
                                      setSettingsBonusRuleEditor((prev) => (prev ? { ...prev, value: e.target.value } : prev))
                                    }
                                    disabled={settingsBonusRulesSaving || !isAdmin}
                                    style={{ maxWidth: 150 }}
                                  />
                                  <select
                                    className="ge-select"
                                    value={settingsBonusRuleEditor.bonusType}
                                    onChange={(e) =>
                                      setSettingsBonusRuleEditor((prev) =>
                                        prev ? { ...prev, bonusType: e.target.value as SettingsBonusRuleType } : prev,
                                      )
                                    }
                                    disabled={settingsBonusRulesSaving || !isAdmin}
                                    style={{ minWidth: 220 }}
                                    aria-label="Tipo da bonificação"
                                    title="Tipo da bonificação"
                                  >
                                    {(
                                      settingsBonusRuleEditor.valueKind === 'PERCENT'
                                        ? (['PERCENT_PER_SHIFT', 'PERCENT_PER_MONTH'] as const)
                                        : (['ADDITIONAL_PER_SHIFT', 'ADDITIONAL_PER_MONTH', 'FIXED_PER_MONTH'] as const)
                                    ).map((t) => (
                                      <option key={t} value={t}>
                                        {settingsBonusTypeLabel[t]}
                                      </option>
                                    ))}
                                  </select>
                                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    <button
                                      type="button"
                                      className="ge-buttonSecondary"
                                      disabled={settingsBonusRulesSaving}
                                      onClick={() => setSettingsBonusRuleEditor(null)}
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      className="ge-buttonPrimary"
                                      disabled={settingsBonusRulesSaving || !isAdmin || !settingsBonusRuleEditor.name.trim()}
                                      onClick={() => {
                                        if (!isAdmin) return
                                        const name = settingsBonusRuleEditor.name.trim()
                                        if (!name) return

                                        const valueKind = settingsBonusRuleEditor.valueKind
                                        const bonusType = settingsBonusRuleEditor.bonusType

                                        const valueCents = valueKind === 'CURRENCY' ? parseBrlToCents(settingsBonusRuleEditor.value) : null
                                        const valueBps = valueKind === 'PERCENT' ? parsePercentToBps(settingsBonusRuleEditor.value) : null

                                        if (valueKind === 'CURRENCY' && valueCents == null) {
                                          setSettingsBonusRulesError('Informe um valor válido (R$).')
                                          return
                                        }
                                        if (valueKind === 'PERCENT' && valueBps == null) {
                                          setSettingsBonusRulesError('Informe uma porcentagem válida (%).')
                                          return
                                        }

                                        void (async () => {
                                          setSettingsBonusRulesSaving(true)
                                          try {
                                            const payload = {
                                              name,
                                              valueKind,
                                              valueCents: valueKind === 'CURRENCY' ? valueCents : null,
                                              valueBps: valueKind === 'PERCENT' ? valueBps : null,
                                              bonusType,
                                            }
                                            if (settingsBonusRuleEditor.mode === 'create') {
                                              await apiFetch('/api/settings/bonuses', { method: 'POST', body: JSON.stringify(payload) })
                                            } else {
                                              if (!settingsBonusRuleEditor.id) return
                                              await apiFetch(`/api/settings/bonuses/${settingsBonusRuleEditor.id}`, {
                                                method: 'PUT',
                                                body: JSON.stringify(payload),
                                              })
                                            }
                                            setSettingsBonusRuleEditor(null)
                                            await loadSettingsBonusRules()
                                          } catch (err) {
                                            const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                            setSettingsBonusRulesError(message || 'Não foi possível salvar a bonificação.')
                                          } finally {
                                            setSettingsBonusRulesSaving(false)
                                          }
                                        })()
                                      }}
                                    >
                                      Salvar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            <div className="ge-list" style={{ marginTop: 10 }}>
                              {filteredSettingsBonusRules.length === 0 ? (
                                <div style={{ opacity: 0.75 }}>Nenhuma bonificação encontrada.</div>
                              ) : (
                                filteredSettingsBonusRules.map((r) => {
                                  const valueLabel =
                                    r.valueKind === 'PERCENT' && r.valueBps != null
                                      ? formatPercentFromBps(r.valueBps)
                                      : r.valueKind === 'CURRENCY' && r.valueCents != null
                                        ? formatBrlFromCents(r.valueCents)
                                        : '—'

                                  return (
                                    <div key={r.id} className="ge-listRow" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                      <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
                                        <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {r.name}
                                        </div>
                                        <div style={{ opacity: 0.8, fontSize: 13 }}>
                                          <span style={{ marginRight: 10 }}>
                                            Valor: <span style={{ fontWeight: 800 }}>{valueLabel}</span>
                                          </span>
                                          <span>
                                            Tipo: <span style={{ fontWeight: 800 }}>{settingsBonusTypeLabel[r.bonusType]}</span>
                                          </span>
                                        </div>
                                      </div>
                                      {isAdmin ? (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                          <button
                                            type="button"
                                            className="ge-buttonSecondary ge-buttonIconOnly"
                                            onClick={() => {
                                              const editorValue =
                                                r.valueKind === 'PERCENT' && r.valueBps != null
                                                  ? String(r.valueBps / 100).replace(/\.0+$/, '')
                                                  : r.valueKind === 'CURRENCY' && r.valueCents != null
                                                    ? (r.valueCents / 100).toLocaleString('pt-BR', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                      })
                                                    : ''
                                              setSettingsBonusRuleEditor({
                                                mode: 'edit',
                                                id: r.id,
                                                name: r.name,
                                                valueKind: r.valueKind,
                                                value: editorValue,
                                                bonusType: r.bonusType,
                                              })
                                            }}
                                            disabled={settingsBonusRulesSaving}
                                            aria-label="Editar"
                                            title="Editar"
                                          >
                                            <SvgIcon name="pencil" />
                                          </button>
                                          <button
                                            type="button"
                                            className="ge-buttonDanger ge-buttonIconOnly"
                                            onClick={() => {
                                              const ok = window.confirm(`Excluir bonificação "${r.name}"?`)
                                              if (!ok) return
                                              void (async () => {
                                                setSettingsBonusRulesSaving(true)
                                                try {
                                                  await apiFetch(`/api/settings/bonuses/${r.id}`, { method: 'DELETE' })
                                                  await loadSettingsBonusRules()
                                                } catch (err) {
                                                  const message =
                                                    err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                                  setSettingsBonusRulesError(message || 'Não foi possível excluir a bonificação.')
                                                } finally {
                                                  setSettingsBonusRulesSaving(false)
                                                }
                                              })()
                                            }}
                                            disabled={settingsBonusRulesSaving}
                                            aria-label="Excluir"
                                            title="Excluir"
                                          >
                                            <SvgIcon name="trash" />
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </section>
                  ) : null}

                  {activeSectionId === 'settings' && activeItemId === 'profissionais-config' ? (
                    <section className="ge-card">
                      <div className="ge-cardTitle">{activeItem.label}</div>
                      <div className="ge-cardBody">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                          <button
                            type="button"
                            className={professionalProfileCatalogActiveKind === 'prefixes' ? 'ge-buttonPrimary' : 'ge-buttonSecondary'}
                            onClick={() => setProfessionalProfileCatalogActiveKind('prefixes')}
                          >
                            Prefixos
                          </button>
                          <button
                            type="button"
                            className={professionalProfileCatalogActiveKind === 'professions' ? 'ge-buttonPrimary' : 'ge-buttonSecondary'}
                            onClick={() => setProfessionalProfileCatalogActiveKind('professions')}
                          >
                            Profissões
                          </button>
                          <button
                            type="button"
                            className={
                              professionalProfileCatalogActiveKind === 'registration-types' ? 'ge-buttonPrimary' : 'ge-buttonSecondary'
                            }
                            onClick={() => setProfessionalProfileCatalogActiveKind('registration-types')}
                          >
                            Tipos de Registro
                          </button>
                          <button
                            type="button"
                            className={
                              professionalProfileCatalogActiveKind === 'hiring-types' ? 'ge-buttonPrimary' : 'ge-buttonSecondary'
                            }
                            onClick={() => setProfessionalProfileCatalogActiveKind('hiring-types')}
                          >
                            Tipos de Contratação
                          </button>
                          <button
                            type="button"
                            className={professionalProfileCatalogActiveKind === 'specialties' ? 'ge-buttonPrimary' : 'ge-buttonSecondary'}
                            onClick={() => setProfessionalProfileCatalogActiveKind('specialties')}
                          >
                            Especialidades
                          </button>
                        </div>
                        {isSuperAdmin ? (
                          <>
                            {systemProfessionalProfileCatalogError ? (
                              <div className="ge-errorText">{systemProfessionalProfileCatalogError}</div>
                            ) : null}

                            <div className="ge-inlineForm">
                              <select
                                className="ge-select"
                                value={systemProfessionalProfileCatalogOrganizationTypeId}
                                onChange={(e) => setSystemProfessionalProfileCatalogOrganizationTypeId(e.target.value)}
                                aria-label="Tipo de organização"
                              >
                                <option value="">Selecione o tipo de organização</option>
                                {systemOrganizationTypes.map((type) => (
                                  <option key={type.id} value={type.id}>
                                    {type.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!systemProfessionalProfileCatalogOrganizationTypeId) return
                                  void loadSystemProfessionalProfileCatalog(systemProfessionalProfileCatalogOrganizationTypeId)
                                }}
                                disabled={!systemProfessionalProfileCatalogOrganizationTypeId}
                              >
                                Recarregar
                              </button>
                            </div>

                            {(() => {
                              const kind = professionalProfileCatalogActiveKind
                              const catalog = systemProfessionalProfileCatalog
                              if (!systemProfessionalProfileCatalogOrganizationTypeId) {
                                return <div style={{ opacity: 0.8 }}>Selecione um tipo de organização para editar o catálogo.</div>
                              }
                              if (!catalog) return <div>Carregando...</div>
                              const items =
                                kind === 'prefixes'
                                  ? catalog.prefixes
                                  : kind === 'professions'
                                    ? catalog.professions
                                    : kind === 'registration-types'
                                      ? catalog.registrationTypes
                                      : kind === 'hiring-types'
                                        ? catalog.hiringTypes
                                        : catalog.specialties

                              return (
                                <>
                                  <div className="ge-inlineForm ge-professionalProfileCatalogNewRow" style={{ marginTop: 10 }}>
                                    <input
                                      className="ge-input"
                                      type="text"
                                      value={professionalProfileCatalogNewName}
                                      onChange={(e) => setProfessionalProfileCatalogNewName(e.target.value)}
                                      placeholder="Novo item"
                                    />
                                    <input
                                      className="ge-input"
                                      type="number"
                                      value={professionalProfileCatalogNewSortOrder}
                                      onChange={(e) => setProfessionalProfileCatalogNewSortOrder(e.target.value)}
                                      min={0}
                                      placeholder="Ordem"
                                      style={{ maxWidth: 140 }}
                                    />
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!systemProfessionalProfileCatalogOrganizationTypeId) return
                                        try {
                                          await apiFetch(`/api/system/professional-profile-catalog/${kind}`, {
                                            method: 'POST',
                                            body: JSON.stringify({
                                              organizationTypeId: systemProfessionalProfileCatalogOrganizationTypeId,
                                              name: professionalProfileCatalogNewName,
                                              sortOrder: Number(professionalProfileCatalogNewSortOrder || 0),
                                            }),
                                          })
                                          setProfessionalProfileCatalogNewName('')
                                          setProfessionalProfileCatalogNewSortOrder('0')
                                          await loadSystemProfessionalProfileCatalog(systemProfessionalProfileCatalogOrganizationTypeId)
                                        } catch (err) {
                                          const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                          setSystemProfessionalProfileCatalogError(message || 'Não foi possível criar o item.')
                                        }
                                      }}
                                      disabled={!professionalProfileCatalogNewName.trim()}
                                    >
                                      Criar
                                    </button>
                                  </div>

                                  <div className="ge-list" style={{ marginTop: 10 }}>
                                    {items.map((item) => (
                                      <div key={item.id} className="ge-listRow ge-professionalProfileCatalogRow">
                                        <input
                                          className="ge-input"
                                          type="text"
                                          value={item.name}
                                          onChange={(e) => {
                                            const value = e.target.value
                                            setSystemProfessionalProfileCatalog((prev) => {
                                              if (!prev) return prev
                                              const update = (arr: ProfessionalProfileCatalogItem[]) =>
                                                arr.map((x) => (x.id === item.id ? { ...x, name: value } : x))
                                              return {
                                                ...prev,
                                                prefixes: kind === 'prefixes' ? update(prev.prefixes) : prev.prefixes,
                                                professions: kind === 'professions' ? update(prev.professions) : prev.professions,
                                                registrationTypes:
                                                  kind === 'registration-types' ? update(prev.registrationTypes) : prev.registrationTypes,
                                                hiringTypes: kind === 'hiring-types' ? update(prev.hiringTypes) : prev.hiringTypes,
                                                specialties: kind === 'specialties' ? update(prev.specialties) : prev.specialties,
                                              }
                                            })
                                          }}
                                        />
                                        <input
                                          className="ge-input"
                                          type="number"
                                          value={item.sortOrder}
                                          onChange={(e) => {
                                            const raw = e.target.value
                                            const sortOrder = raw ? Number(raw) : 0
                                            setSystemProfessionalProfileCatalog((prev) => {
                                              if (!prev) return prev
                                              const update = (arr: ProfessionalProfileCatalogItem[]) =>
                                                arr.map((x) => (x.id === item.id ? { ...x, sortOrder } : x))
                                              return {
                                                ...prev,
                                                prefixes: kind === 'prefixes' ? update(prev.prefixes) : prev.prefixes,
                                                professions: kind === 'professions' ? update(prev.professions) : prev.professions,
                                                registrationTypes:
                                                  kind === 'registration-types' ? update(prev.registrationTypes) : prev.registrationTypes,
                                                hiringTypes: kind === 'hiring-types' ? update(prev.hiringTypes) : prev.hiringTypes,
                                                specialties: kind === 'specialties' ? update(prev.specialties) : prev.specialties,
                                              }
                                            })
                                          }}
                                          min={0}
                                          style={{ maxWidth: 140 }}
                                        />
                                        <button
                                          type="button"
                                          className="ge-buttonPrimary ge-buttonIconOnly"
                                          aria-label="Salvar"
                                          title="Salvar"
                                          onClick={async () => {
                                            if (!systemProfessionalProfileCatalogOrganizationTypeId) return
                                            try {
                                              await apiFetch(`/api/system/professional-profile-catalog/${kind}/${item.id}`, {
                                                method: 'PUT',
                                                body: JSON.stringify({
                                                  organizationTypeId: systemProfessionalProfileCatalogOrganizationTypeId,
                                                  name: item.name,
                                                  sortOrder: item.sortOrder,
                                                }),
                                              })
                                              await loadSystemProfessionalProfileCatalog(systemProfessionalProfileCatalogOrganizationTypeId)
                                            } catch (err) {
                                              const message =
                                                err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                              setSystemProfessionalProfileCatalogError(message || 'Não foi possível salvar o item.')
                                            }
                                          }}
                                        >
                                          <SvgIcon name="check" />
                                        </button>
                                        <button
                                          type="button"
                                          className="ge-buttonDanger ge-buttonIconOnly"
                                          aria-label="Remover"
                                          title="Remover"
                                          onClick={async () => {
                                            if (!systemProfessionalProfileCatalogOrganizationTypeId) return
                                            try {
                                              const qs = new URLSearchParams()
                                              qs.set('organizationTypeId', systemProfessionalProfileCatalogOrganizationTypeId)
                                              await apiFetch(`/api/system/professional-profile-catalog/${kind}/${item.id}?${qs.toString()}`, {
                                                method: 'DELETE',
                                              })
                                              await loadSystemProfessionalProfileCatalog(systemProfessionalProfileCatalogOrganizationTypeId)
                                            } catch (err) {
                                              const message =
                                                err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                              setSystemProfessionalProfileCatalogError(message || 'Não foi possível remover o item.')
                                            }
                                          }}
                                        >
                                          <SvgIcon name="trash" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )
                            })()}
                          </>
                        ) : isAdmin ? (
                          <>
                            {adminProfessionalProfileCatalogError ? (
                              <div className="ge-errorText">{adminProfessionalProfileCatalogError}</div>
                            ) : null}

                            <div style={{ opacity: 0.8, marginBottom: 10 }}>
                              Estes itens ficam disponíveis para uso no cadastro de profissionais da sua empresa.
                            </div>

                            <div className="ge-inlineForm">
                              <button type="button" onClick={() => void loadAdminProfessionalProfileCatalog()}>
                                Recarregar
                              </button>
                            </div>

                            {(() => {
                              const kind = professionalProfileCatalogActiveKind
                              const catalog = adminProfessionalProfileCatalog
                              if (!catalog) return <div>Carregando...</div>
                              const items =
                                kind === 'prefixes'
                                  ? catalog.prefixes
                                  : kind === 'professions'
                                    ? catalog.professions
                                    : kind === 'registration-types'
                                      ? catalog.registrationTypes
                                      : kind === 'hiring-types'
                                        ? catalog.hiringTypes
                                        : catalog.specialties

                              return (
                                <>
                                  <div className="ge-inlineForm ge-professionalProfileCatalogNewRow" style={{ marginTop: 10 }}>
                                    <input
                                      className="ge-input"
                                      type="text"
                                      value={professionalProfileCatalogNewName}
                                      onChange={(e) => setProfessionalProfileCatalogNewName(e.target.value)}
                                      placeholder="Novo item"
                                    />
                                    <input
                                      className="ge-input"
                                      type="number"
                                      value={professionalProfileCatalogNewSortOrder}
                                      onChange={(e) => setProfessionalProfileCatalogNewSortOrder(e.target.value)}
                                      min={0}
                                      placeholder="Ordem"
                                      style={{ maxWidth: 140 }}
                                    />
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await apiFetch(`/api/admin/professional-profile-catalog/${kind}`, {
                                            method: 'POST',
                                            body: JSON.stringify({
                                              name: professionalProfileCatalogNewName,
                                              sortOrder: Number(professionalProfileCatalogNewSortOrder || 0),
                                            }),
                                          })
                                          setProfessionalProfileCatalogNewName('')
                                          setProfessionalProfileCatalogNewSortOrder('0')
                                          await loadAdminProfessionalProfileCatalog()
                                        } catch (err) {
                                          const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                          setAdminProfessionalProfileCatalogError(message || 'Não foi possível criar o item.')
                                        }
                                      }}
                                      disabled={!professionalProfileCatalogNewName.trim()}
                                    >
                                      Criar
                                    </button>
                                  </div>

                                  <div className="ge-list" style={{ marginTop: 10 }}>
                                    {items.map((item) => (
                                      <div key={item.id} className="ge-listRow ge-professionalProfileCatalogRow">
                                        <input
                                          className="ge-input"
                                          type="text"
                                          value={item.name}
                                          onChange={(e) => {
                                            const value = e.target.value
                                            setAdminProfessionalProfileCatalog((prev) => {
                                              if (!prev) return prev
                                              const update = (arr: ProfessionalProfileCatalogItem[]) =>
                                                arr.map((x) => (x.id === item.id ? { ...x, name: value } : x))
                                              return {
                                                ...prev,
                                                prefixes: kind === 'prefixes' ? update(prev.prefixes) : prev.prefixes,
                                                professions: kind === 'professions' ? update(prev.professions) : prev.professions,
                                                registrationTypes:
                                                  kind === 'registration-types' ? update(prev.registrationTypes) : prev.registrationTypes,
                                                hiringTypes: kind === 'hiring-types' ? update(prev.hiringTypes) : prev.hiringTypes,
                                                specialties: kind === 'specialties' ? update(prev.specialties) : prev.specialties,
                                              }
                                            })
                                          }}
                                        />
                                        <input
                                          className="ge-input"
                                          type="number"
                                          value={item.sortOrder}
                                          onChange={(e) => {
                                            const raw = e.target.value
                                            const sortOrder = raw ? Number(raw) : 0
                                            setAdminProfessionalProfileCatalog((prev) => {
                                              if (!prev) return prev
                                              const update = (arr: ProfessionalProfileCatalogItem[]) =>
                                                arr.map((x) => (x.id === item.id ? { ...x, sortOrder } : x))
                                              return {
                                                ...prev,
                                                prefixes: kind === 'prefixes' ? update(prev.prefixes) : prev.prefixes,
                                                professions: kind === 'professions' ? update(prev.professions) : prev.professions,
                                                registrationTypes:
                                                  kind === 'registration-types' ? update(prev.registrationTypes) : prev.registrationTypes,
                                                hiringTypes: kind === 'hiring-types' ? update(prev.hiringTypes) : prev.hiringTypes,
                                                specialties: kind === 'specialties' ? update(prev.specialties) : prev.specialties,
                                              }
                                            })
                                          }}
                                          min={0}
                                          style={{ maxWidth: 140 }}
                                        />
                                        <button
                                          type="button"
                                          className="ge-buttonPrimary ge-buttonIconOnly"
                                          aria-label="Salvar"
                                          title="Salvar"
                                          onClick={async () => {
                                            try {
                                              await apiFetch(`/api/admin/professional-profile-catalog/${kind}/${item.id}`, {
                                                method: 'PUT',
                                                body: JSON.stringify({ name: item.name, sortOrder: item.sortOrder }),
                                              })
                                              await loadAdminProfessionalProfileCatalog()
                                            } catch (err) {
                                              const message =
                                                err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                              setAdminProfessionalProfileCatalogError(message || 'Não foi possível salvar o item.')
                                            }
                                          }}
                                        >
                                          <SvgIcon name="check" />
                                        </button>
                                        <button
                                          type="button"
                                          className="ge-buttonDanger ge-buttonIconOnly"
                                          aria-label="Remover"
                                          title="Remover"
                                          onClick={async () => {
                                            try {
                                              await apiFetch(`/api/admin/professional-profile-catalog/${kind}/${item.id}`, { method: 'DELETE' })
                                              await loadAdminProfessionalProfileCatalog()
                                            } catch (err) {
                                              const message =
                                                err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                              setAdminProfessionalProfileCatalogError(message || 'Não foi possível remover o item.')
                                            }
                                          }}
                                        >
                                          <SvgIcon name="trash" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )
                            })()}
                          </>
                        ) : (
                          <div style={{ opacity: 0.85 }}>
                            Apenas usuários do tipo Administrador e Super Admin têm permissão para editar este catálogo.
                          </div>
                        )}
                      </div>
                    </section>
                  ) : activeSectionId !== 'scheduling' &&
                    !(activeSectionId === 'users' && activeItemId === 'profissionais') &&
                    !(activeSectionId === 'users' && activeItemId === 'coordenadores') &&
                    !(activeSectionId === 'settings' && activeItemId === 'locais-setores') &&
                    !(activeSectionId === 'settings' && activeItemId === 'grupos') &&
                    !(activeSectionId === 'settings' && activeItemId === 'tipos-plantao') &&
                    !(activeSectionId === 'settings' && activeItemId === 'situacoes-plantao') &&
                    !(activeSectionId === 'settings' && activeItemId === 'valores') &&
                    !(activeSectionId === 'settings' && activeItemId === 'bonificacoes') ? (
                    <section className="ge-card">
                      <div className="ge-cardTitle">{activeItem.label}</div>
                      <div className="ge-cardBody">Em breve</div>
                    </section>
                  ) : null}
                </>
              )}

              {activeSectionId === 'dashboard' && activeItemId === 'resumo' ? (
                <>
                  {isAdmin ? (
                    <section className="ge-section">
                      <h2 className="ge-sectionTitle">Configuração da organização</h2>
                      <div className="ge-sectionBody">
                        {adminError ? <div className="ge-errorText">{adminError}</div> : null}
                        {tenantInfo ? (
                          <div className="ge-formGrid">
                            <div className="ge-formRow">
                              <div className="ge-formLabel">Organização</div>
                              <div className="ge-formValue">{tenantInfo.name}</div>
                            </div>
                            <div className="ge-formRow">
                              <div className="ge-formLabel">Tipo de organização</div>
                              <div className="ge-formValue">
                                <select
                                  className="ge-select"
                                  value={tenantInfo.organizationTypeId ?? ''}
                                  onChange={async (e) => {
                                    const value = e.target.value
                                    if (!value) return
                                    try {
                                      const updated = await apiFetch<{
                                        id: string
                                        name: string
                                        organizationTypeId: string | null
                                        organizationTypeName: string | null
                                        userTerm: string | null
                                        shiftTerm: string | null
                                      }>('/api/admin/tenant/organization-type', {
                                        method: 'PUT',
                                        body: JSON.stringify({ organizationTypeId: value }),
                                      })
                                      setTenantInfo(updated)
                                      setAdminError(null)
                                    } catch (err) {
                                      const message =
                                        err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                      setAdminError(message || 'Não foi possível atualizar o tipo de organização.')
                                    }
                                  }}
                                >
                                  <option value="">Selecione</option>
                                  {organizationTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                      {type.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="ge-formRow">
                              <div className="ge-formLabel">Termo para usuário</div>
                              <div className="ge-formValue">{tenantInfo.userTerm ?? '-'}</div>
                            </div>
                            <div className="ge-formRow">
                              <div className="ge-formLabel">Termo para turno</div>
                              <div className="ge-formValue">{tenantInfo.shiftTerm ?? '-'}</div>
                            </div>
                          </div>
                        ) : (
                          <div>Carregando...</div>
                        )}
                      </div>
                    </section>
                  ) : null}

                  {isSuperAdmin ? (
                    <section className="ge-section">
                      <h2 className="ge-sectionTitle">Catálogo (Super Admin)</h2>
                      <div className="ge-sectionBody">
                        {systemError ? <div className="ge-errorText">{systemError}</div> : null}

                        <div className="ge-subsection">
                          <div className="ge-subsectionTitle">Segmentos</div>
                          <div className="ge-inlineForm">
                            <input
                              className="ge-input"
                              type="text"
                              value={newSegmentName}
                              onChange={(e) => setNewSegmentName(e.target.value)}
                              placeholder="Novo segmento"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await apiFetch('/api/system/catalog/segments', {
                                    method: 'POST',
                                    body: JSON.stringify({ name: newSegmentName }),
                                  })
                                  setNewSegmentName('')
                                  await loadSystemData()
                                } catch (err) {
                                  const message =
                                    err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                  setSystemError(message || 'Não foi possível criar o segmento.')
                                }
                              }}
                            >
                              Criar
                            </button>
                            <button type="button" onClick={() => void loadSystemData()}>
                              Recarregar
                            </button>
                          </div>
                          <div className="ge-list">
                            {segments.map((segment) => (
                              <div key={segment.id} className="ge-listRow">
                                <input
                                  className="ge-input"
                                  type="text"
                                  value={segment.name}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setSegments((prev) =>
                                      prev.map((s) => (s.id === segment.id ? { ...s, name: value } : s)),
                                    )
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await apiFetch(`/api/system/catalog/segments/${segment.id}`, {
                                        method: 'PUT',
                                        body: JSON.stringify({ name: segment.name }),
                                      })
                                      await loadSystemData()
                                    } catch (err) {
                                      const message =
                                        err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                      setSystemError(message || 'Não foi possível salvar o segmento.')
                                    }
                                  }}
                                >
                                  Salvar
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await apiFetch(`/api/system/catalog/segments/${segment.id}`, { method: 'DELETE' })
                                      await loadSystemData()
                                    } catch (err) {
                                      const message =
                                        err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                      setSystemError(message || 'Não foi possível remover o segmento.')
                                    }
                                  }}
                                >
                                  Remover
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="ge-subsection">
                          <div className="ge-subsectionTitle">Tipos de organização</div>
                          <div className="ge-typeGrid">
                            <select
                              className="ge-select"
                              value={newType.segmentId}
                              onChange={(e) => setNewType((prev) => ({ ...prev, segmentId: e.target.value }))}
                            >
                              <option value="">Segmento</option>
                              {segments.map((segment) => (
                                <option key={segment.id} value={segment.id}>
                                  {segment.name}
                                </option>
                              ))}
                            </select>
                            <input
                              className="ge-input"
                              type="text"
                              value={newType.name}
                              onChange={(e) => setNewType((prev) => ({ ...prev, name: e.target.value }))}
                              placeholder="Nome"
                            />
                            <input
                              className="ge-input"
                              type="text"
                              value={newType.userTerm}
                              onChange={(e) => setNewType((prev) => ({ ...prev, userTerm: e.target.value }))}
                              placeholder="Termo para usuário"
                            />
                            <input
                              className="ge-input"
                              type="text"
                              value={newType.shiftTerm}
                              onChange={(e) => setNewType((prev) => ({ ...prev, shiftTerm: e.target.value }))}
                              placeholder="Termo para turno"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await apiFetch('/api/system/catalog/organization-types', {
                                    method: 'POST',
                                    body: JSON.stringify(newType),
                                  })
                                  setNewType({ segmentId: '', name: '', userTerm: '', shiftTerm: '' })
                                  await loadSystemData()
                                } catch (err) {
                                  const message =
                                    err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                  setSystemError(message || 'Não foi possível criar o tipo de organização.')
                                }
                              }}
                            >
                              Criar
                            </button>
                          </div>

                          <div className="ge-list">
                            {systemOrganizationTypes.map((type) => (
                              <div key={type.id} className="ge-typeListRow">
                                <select
                                  className="ge-select"
                                  value={type.segmentId}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setSystemOrganizationTypes((prev) =>
                                      prev.map((t) => (t.id === type.id ? { ...t, segmentId: value } : t)),
                                    )
                                  }}
                                >
                                  {segments.map((segment) => (
                                    <option key={segment.id} value={segment.id}>
                                      {segment.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  className="ge-input"
                                  type="text"
                                  value={type.name}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setSystemOrganizationTypes((prev) =>
                                      prev.map((t) => (t.id === type.id ? { ...t, name: value } : t)),
                                    )
                                  }}
                                />
                                <input
                                  className="ge-input"
                                  type="text"
                                  value={type.userTerm}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setSystemOrganizationTypes((prev) =>
                                      prev.map((t) => (t.id === type.id ? { ...t, userTerm: value } : t)),
                                    )
                                  }}
                                />
                                <input
                                  className="ge-input"
                                  type="text"
                                  value={type.shiftTerm}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setSystemOrganizationTypes((prev) =>
                                      prev.map((t) => (t.id === type.id ? { ...t, shiftTerm: value } : t)),
                                    )
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await apiFetch(`/api/system/catalog/organization-types/${type.id}`, {
                                        method: 'PUT',
                                        body: JSON.stringify({
                                          segmentId: type.segmentId,
                                          name: type.name,
                                          userTerm: type.userTerm,
                                          shiftTerm: type.shiftTerm,
                                        }),
                                      })
                                      await loadSystemData()
                                    } catch (err) {
                                      const message =
                                        err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                      setSystemError(message || 'Não foi possível salvar o tipo de organização.')
                                    }
                                  }}
                                >
                                  Salvar
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await apiFetch(`/api/system/catalog/organization-types/${type.id}`, {
                                        method: 'DELETE',
                                      })
                                      await loadSystemData()
                                    } catch (err) {
                                      const message =
                                        err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                                      setSystemError(message || 'Não foi possível remover o tipo de organização.')
                                    }
                                  }}
                                >
                                  Remover
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>
                  ) : null}
                </>
              ) : null}
            </section>
          </div>
        </main>
      </div>

      {addProfessionalDialog.open ? (
        <>
        <AddProfessionalDialog
          addProfessionalDialog={addProfessionalDialog}
          setAddProfessionalDialog={setAddProfessionalDialog}
          addProfessionalDialogTabs={addProfessionalDialogTabs}
          canManageProfessionals={canManageProfessionals}
          canSaveAddProfessional={canSaveAddProfessional}
          addProfessionalMutation={addProfessionalMutation}
          addProfessionalInfoForm={addProfessionalInfoForm}
          setAddProfessionalInfoForm={setAddProfessionalInfoForm}
          addProfessionalPhotoInputRef={addProfessionalPhotoInputRef}
          addProfessionalPhotoPreviewUrl={addProfessionalPhotoPreviewUrl}
          setAddProfessionalPhotoPreviewUrl={setAddProfessionalPhotoPreviewUrl}
          addProfessionalSaveAttempted={addProfessionalSaveAttempted}
          setAddProfessionalSaveAttempted={setAddProfessionalSaveAttempted}
          addProfessionalSpecialtyOptions={addProfessionalSpecialtyOptions}
          addProfessionalGroupsQuery={addProfessionalGroupsQuery}
          setAddProfessionalGroupsQuery={setAddProfessionalGroupsQuery}
          addProfessionalGroupsOnlySelected={addProfessionalGroupsOnlySelected}
          setAddProfessionalGroupsOnlySelected={setAddProfessionalGroupsOnlySelected}
          addProfessionalSelectedLocationIds={addProfessionalSelectedLocationIds}
          setAddProfessionalSelectedLocationIds={setAddProfessionalSelectedLocationIds}
          addProfessionalSelectedSectorIds={addProfessionalSelectedSectorIds}
          setAddProfessionalSelectedSectorIds={setAddProfessionalSelectedSectorIds}
          locationsQuery={locationsQuery}
          sectorsQuery={sectorsQuery}
          addProfessionalBankAccount={addProfessionalBankAccount}
          setAddProfessionalBankAccount={setAddProfessionalBankAccount}
          addProfessionalHiring={addProfessionalHiring}
          setAddProfessionalHiring={setAddProfessionalHiring}
          addProfessionalCompensationValues={addProfessionalCompensationValues}
          setAddProfessionalCompensationValues={setAddProfessionalCompensationValues}
          addProfessionalAvailability={addProfessionalAvailability}
          setAddProfessionalAvailability={setAddProfessionalAvailability}
          addProfessionalBonuses={addProfessionalBonuses}
          setAddProfessionalBonuses={setAddProfessionalBonuses}
          addProfessionalPendencies={addProfessionalPendencies}
          setAddProfessionalPendencies={setAddProfessionalPendencies}
          addProfessionalDocuments={addProfessionalDocuments}
          setAddProfessionalDocuments={setAddProfessionalDocuments}
          addProfessionalDocumentsInputRef={addProfessionalDocumentsInputRef}
          parseBrlToCents={parseBrlToCents}
          formatBrlFromCents={formatBrlFromCents}
          downloadLocalFile={downloadLocalFile}
        />
        </>
      ) : null}
    </div>
  )
}

export default DashboardPage
