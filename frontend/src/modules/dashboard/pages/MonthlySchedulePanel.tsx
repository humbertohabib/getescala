import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../../core/api/client'
import { useLockSchedule } from '../../scheduling/hooks/useLockSchedule'
import { usePublishSchedule } from '../../scheduling/hooks/usePublishSchedule'
import { useCreateShift } from '../../shifts/hooks/useCreateShift'
import { useShifts } from '../../shifts/hooks/useShifts'
import { useUpdateShift } from '../../shifts/hooks/useUpdateShift'
import type { Schedule } from '../../scheduling/types/schedule'
import type { Shift } from '../../shifts/types/shift'
import { useProfessionals } from '../../workforce/hooks/useProfessionals'
import { SvgIcon } from '../components/DashboardIcons'
import type { MonthlyLocation, MonthlySector } from '../types'
import {
  buildMonthCells,
  dateKeyLocal,
  formatMonthLabel,
  formatMonthReference,
  formatTimeHHMM,
  toDateTimeLocalValue,
  toIsoUtcStartOfDayLocal,
} from '../utils/dateTime'

function shiftKindLabel(kind: string | null | undefined): string {
  if (!kind) return 'Normal'
  if (kind === 'NORMAL') return 'Normal'
  if (kind === 'NOTURNO') return 'Noturno'
  if (kind === 'FIM_DE_SEMANA') return 'Fim de Semana'
  if (kind === 'FERIADO') return 'Feriado'
  if (kind === 'OUTRO') return 'Outro'
  return kind
}

export function MonthlySchedulePanel() {
  const queryClient = useQueryClient()
  const professionalsQuery = useProfessionals()
  const publishScheduleMutation = usePublishSchedule()
  const lockScheduleMutation = useLockSchedule()
  const createShiftMutation = useCreateShift()
  const updateShiftMutation = useUpdateShift()

  const [viewFormat, setViewFormat] = useState<'sector' | 'location'>(() => {
    try {
      const raw = window.localStorage.getItem('ge.scheduling.monthly.viewFormat')
      return raw === 'location' ? 'location' : 'sector'
    } catch {
      return 'sector'
    }
  })

  const [month, setMonth] = useState<Date>(() => {
    try {
      const raw = window.localStorage.getItem('ge.scheduling.monthly.month')
      if (raw && /^\d{4}-\d{2}$/.test(raw)) {
        const [yyyy, mm] = raw.split('-').map((v) => Number(v))
        if (Number.isFinite(yyyy) && Number.isFinite(mm)) return new Date(yyyy, mm - 1, 1, 12, 0, 0)
      }
    } catch {
      void 0
    }
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0)
  })

  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    try {
      return window.localStorage.getItem('ge.scheduling.monthly.locationId') ?? ''
    } catch {
      return ''
    }
  })
  const [selectedSectorId, setSelectedSectorId] = useState<string>(() => {
    try {
      return window.localStorage.getItem('ge.scheduling.monthly.sectorId') ?? ''
    } catch {
      return ''
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem('ge.scheduling.monthly.viewFormat', viewFormat)
    } catch {
      void 0
    }
  }, [viewFormat])

  useEffect(() => {
    try {
      const yyyy = month.getFullYear()
      const mm = String(month.getMonth() + 1).padStart(2, '0')
      window.localStorage.setItem('ge.scheduling.monthly.month', `${yyyy}-${mm}`)
    } catch {
      void 0
    }
  }, [month])

  useEffect(() => {
    try {
      window.localStorage.setItem('ge.scheduling.monthly.locationId', selectedLocationId)
    } catch {
      void 0
    }
  }, [selectedLocationId])

  useEffect(() => {
    try {
      window.localStorage.setItem('ge.scheduling.monthly.sectorId', selectedSectorId)
    } catch {
      void 0
    }
  }, [selectedSectorId])

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: () => apiFetch<MonthlyLocation[]>('/api/locations'),
  })

  const sectorsQuery = useQuery({
    queryKey: ['sectors'],
    queryFn: () => apiFetch<MonthlySector[]>('/api/sectors'),
  })

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

  const shiftTypeLabelByCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of shiftTypesQuery.data ?? []) map[t.code] = t.name
    return map
  }, [shiftTypesQuery.data])

  const shiftSituationByCode = useMemo(() => {
    const map: Record<string, { name: string; requiresCoverage: boolean }> = {}
    for (const s of shiftSituationsQuery.data ?? []) map[s.code] = { name: s.name, requiresCoverage: s.requiresCoverage }
    return map
  }, [shiftSituationsQuery.data])

  const shiftTypeColorByCode = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of shiftTypesQuery.data ?? []) {
      if (t.color) map[t.code] = t.color
    }
    return map
  }, [shiftTypesQuery.data])

  const normalizedSectorId = useMemo(() => {
    if (viewFormat !== 'sector') return ''
    if (!selectedSectorId) return ''
    const sectors = sectorsQuery.data ?? []
    return sectors.some((s) => s.id === selectedSectorId) ? selectedSectorId : ''
  }, [sectorsQuery.data, selectedSectorId, viewFormat])

  const monthReference = useMemo(() => formatMonthReference(month), [month])
  const monthStart = useMemo(() => new Date(month.getFullYear(), month.getMonth(), 1, 12, 0, 0), [month])
  const monthEnd = useMemo(() => new Date(month.getFullYear(), month.getMonth() + 1, 0, 12, 0, 0), [month])
  const fromIso = useMemo(() => toIsoUtcStartOfDayLocal(monthStart), [monthStart])
  const toIso = useMemo(
    () => toIsoUtcStartOfDayLocal(new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate() + 1, 12, 0, 0)),
    [monthEnd],
  )

  const locationIdForSchedule = selectedLocationId ? selectedLocationId : null
  const sectorIdForSchedule = viewFormat === 'sector' ? (normalizedSectorId ? normalizedSectorId : null) : null

  const scheduleQueryKey = useMemo(
    () => ['monthlySchedule', monthReference, locationIdForSchedule, sectorIdForSchedule] as const,
    [locationIdForSchedule, monthReference, sectorIdForSchedule],
  )

  const scheduleQuery = useQuery({
    queryKey: scheduleQueryKey,
    queryFn: () =>
      apiFetch<Schedule>('/api/schedules', {
        method: 'POST',
        body: JSON.stringify({ monthReference, locationId: locationIdForSchedule, sectorId: sectorIdForSchedule }),
      }),
    retry: false,
  })

  const schedule = scheduleQuery.data ?? null
  const scheduleError =
    scheduleQuery.error && typeof scheduleQuery.error === 'object' && scheduleQuery.error && 'message' in scheduleQuery.error
      ? String((scheduleQuery.error as { message?: unknown }).message ?? '')
      : scheduleQuery.error
        ? 'Não foi possível carregar a escala.'
        : null

  const scheduleEditable = schedule?.status === 'DRAFT'

  const shiftsQuery = useShifts(
    {
      from: fromIso,
      to: toIso,
      scheduleId: schedule?.id ?? undefined,
    },
    { enabled: Boolean(schedule?.id) },
  )

  const shiftsByDay = useMemo(() => {
    const list = shiftsQuery.data ?? []
    const by: Record<string, Shift[]> = {}
    for (const s of list) {
      const d = new Date(s.startTime)
      const key = dateKeyLocal(d)
      if (!by[key]) by[key] = []
      by[key].push(s)
    }
    for (const key of Object.keys(by)) {
      by[key].sort((a, b) => a.startTime.localeCompare(b.startTime))
    }
    return by
  }, [shiftsQuery.data])

  const professionalNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of professionalsQuery.data ?? []) {
      map[p.id] = p.fullName
    }
    return map
  }, [professionalsQuery.data])

  const replicateMutation = useMutation({
    mutationFn: async (scheduleId: string) =>
      apiFetch<{ created: number; skipped: number }>(`/api/schedules/${scheduleId}/replicate-previous-month`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })

  const requestConfirmationMutation = useMutation({
    mutationFn: async (scheduleId: string) => apiFetch<{ created: number; skipped: number }>(`/api/schedules/${scheduleId}/request-confirmation`, { method: 'POST' }),
  })

  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(id)
  }, [toast])

  const [modal, setModal] = useState<
    | { open: false }
    | { open: true; mode: 'create'; dayKey: string }
    | { open: true; mode: 'edit'; shiftId: string }
    | { open: true; mode: 'requestConfirmation' }
  >({ open: false })

  const shiftBeingEdited = useMemo(() => {
    if (!modal.open || modal.mode !== 'edit') return null
    const list = shiftsQuery.data ?? []
    return list.find((s) => s.id === modal.shiftId) ?? null
  }, [modal, shiftsQuery.data])

  const monthCells = useMemo(() => buildMonthCells(month), [month])
  const weekdayLabels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']

  const monthPickerRef = useRef<HTMLInputElement | null>(null)

  const canPublish = schedule?.status === 'DRAFT'
  const canLock = schedule?.status === 'PUBLISHED'
  const canReplicate = schedule?.status === 'DRAFT'
  const canRequestConfirmation = schedule?.status === 'PUBLISHED'

  const [publishMenuOpen, setPublishMenuOpen] = useState(false)
  const [publishUntil, setPublishUntil] = useState('')
  const [publishNoLimit, setPublishNoLimit] = useState(true)
  const publishMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!publishMenuOpen) return

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (publishMenuRef.current && !publishMenuRef.current.contains(target)) {
        setPublishMenuOpen(false)
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPublishMenuOpen(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [publishMenuOpen])

  async function publish() {
    if (!schedule?.id) return
    try {
      const updated = await publishScheduleMutation.mutateAsync({
        scheduleId: schedule.id,
        publishedUntil: publishNoLimit ? null : publishUntil,
      })
      queryClient.setQueryData(scheduleQueryKey, updated)
      setToast('Escala liberada.')
      setPublishMenuOpen(false)
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setToast(message || 'Não foi possível liberar a escala.')
    }
  }

  async function lock() {
    if (!schedule?.id) return
    try {
      const updated = await lockScheduleMutation.mutateAsync(schedule.id)
      queryClient.setQueryData(scheduleQueryKey, updated)
      setToast('Escala bloqueada.')
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setToast(message || 'Não foi possível bloquear a escala.')
    }
  }

  async function replicate() {
    if (!schedule?.id) return
    try {
      const result = await replicateMutation.mutateAsync(schedule.id)
      setToast(`Replicação concluída: ${result.created} criado(s), ${result.skipped} ignorado(s).`)
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setToast(message || 'Não foi possível replicar o mês.')
    }
  }

  async function requestConfirmation() {
    if (!schedule?.id) return
    if (!canRequestConfirmation) {
      setToast('Você precisa liberar a escala antes de solicitar confirmação.')
      return
    }
    try {
      const result = await requestConfirmationMutation.mutateAsync(schedule.id)
      setToast(`Solicitação enviada: ${result.created} criado(s), ${result.skipped} ignorado(s).`)
      setModal({ open: false })
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setToast(message || 'Não foi possível solicitar confirmação.')
    }
  }

  function moveMonth(delta: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1, 12, 0, 0))
  }

  async function submitCreateShift(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!schedule?.id) return
    if (!scheduleEditable) return
    const form = e.currentTarget
    const professionalId = (form.elements.namedItem('professionalId') as HTMLSelectElement).value
    const fixedProfessionalId = (form.elements.namedItem('fixedProfessionalId') as HTMLSelectElement | null)?.value ?? ''
    const kind = (form.elements.namedItem('kind') as HTMLSelectElement | null)?.value ?? 'NORMAL'
    const situationCode = (form.elements.namedItem('situationCode') as HTMLSelectElement | null)?.value ?? 'DESIGNADO'
    const startLocal = (form.elements.namedItem('start') as HTMLInputElement).value
    const endLocal = (form.elements.namedItem('end') as HTMLInputElement).value
    const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
    const currency = (form.elements.namedItem('currency') as HTMLInputElement).value

    try {
      const startIso = new Date(startLocal).toISOString()
      const endIso = new Date(endLocal).toISOString()
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
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setToast(message || 'Não foi possível criar o plantão.')
    }
  }

  async function submitEditShift(e: React.FormEvent<HTMLFormElement>, shiftId: string) {
    e.preventDefault()
    if (!scheduleEditable) return
    const form = e.currentTarget
    const professionalId = (form.elements.namedItem('professionalId') as HTMLSelectElement).value
    const fixedProfessionalId = (form.elements.namedItem('fixedProfessionalId') as HTMLSelectElement | null)?.value ?? ''
    const kind = (form.elements.namedItem('kind') as HTMLSelectElement | null)?.value ?? 'NORMAL'
    const situationCode = (form.elements.namedItem('situationCode') as HTMLSelectElement | null)?.value ?? shiftBeingEdited?.situationCode ?? 'DESIGNADO'
    const startLocal = (form.elements.namedItem('start') as HTMLInputElement).value
    const endLocal = (form.elements.namedItem('end') as HTMLInputElement).value
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
          startTime: new Date(startLocal).toISOString(),
          endTime: new Date(endLocal).toISOString(),
          valueCents: valueCentsRaw ? Number(valueCentsRaw) : null,
          currency: currency || null,
        },
      })
      setModal({ open: false })
      setToast('Plantão atualizado.')
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setToast(message || 'Não foi possível atualizar o plantão.')
    }
  }

  const defaultCreateTimes = useMemo(() => {
    if (!modal.open || modal.mode !== 'create') return null
    const [yyyy, mm, dd] = modal.dayKey.split('-').map((v) => Number(v))
    const base = new Date(yyyy, mm - 1, dd, 7, 0, 0)
    const end = new Date(yyyy, mm - 1, dd, 19, 0, 0)
    return { start: toDateTimeLocalValue(base.toISOString()), end: toDateTimeLocalValue(end.toISOString()) }
  }, [modal])

  const scopeValue = useMemo(() => {
    if (viewFormat === 'location' && selectedLocationId) return `loc:${selectedLocationId}`
    if (viewFormat === 'sector' && normalizedSectorId) return `sec:${normalizedSectorId}`
    if (selectedLocationId) return `loc:${selectedLocationId}`
    if (selectedSectorId) return `sec:${selectedSectorId}`
    return ''
  }, [normalizedSectorId, selectedLocationId, selectedSectorId, viewFormat])

  const scopeOptions = useMemo(() => {
    const locations = locationsQuery.data ?? []
    const sectors = sectorsQuery.data ?? []

    const sectorsByLocationId: Record<string, MonthlySector[]> = {}
    const sectorsWithoutLocation: MonthlySector[] = []

    for (const sector of sectors) {
      if (sector.locationId) {
        const list = sectorsByLocationId[sector.locationId] ?? []
        list.push(sector)
        sectorsByLocationId[sector.locationId] = list
      } else {
        sectorsWithoutLocation.push(sector)
      }
    }

    for (const id of Object.keys(sectorsByLocationId)) {
      sectorsByLocationId[id].sort((a, b) => a.name.localeCompare(b.name))
    }
    sectorsWithoutLocation.sort((a, b) => a.name.localeCompare(b.name))

    const nbsp = '\u00A0'
    const nameColumnWidth = 34
    const padName = (value: string) => (value.length >= nameColumnWidth ? value : value + nbsp.repeat(nameColumnWidth - value.length))
    const formatLabel = (name: string, type: string) => `${padName(name)}${type}`
    const indent = `${nbsp}${nbsp}`

    const options: Array<{ value: string; label: string }> = [{ value: '', label: formatLabel('(Todos)', 'Todos') }]

    for (const location of locations) {
      options.push({ value: `loc:${location.id}`, label: formatLabel(location.name, 'Local') })
      for (const sector of sectorsByLocationId[location.id] ?? []) {
        options.push({ value: `sec:${sector.id}`, label: formatLabel(`${indent}${sector.name}`, 'Setor') })
      }
    }

    for (const sector of sectorsWithoutLocation) {
      options.push({ value: `sec:${sector.id}`, label: formatLabel(`${indent}${sector.name}`, 'Setor') })
    }

    return options
  }, [locationsQuery.data, sectorsQuery.data])

  const monthLabel = useMemo(() => formatMonthLabel(month), [month])
  const monthLabelSlash = useMemo(() => monthLabel.replace(' DE ', '/'), [monthLabel])

  const scopeSummary = useMemo(() => {
    const locations = locationsQuery.data ?? []
    const sectors = sectorsQuery.data ?? []

    if (viewFormat === 'location') {
      const location = selectedLocationId ? locations.find((l) => l.id === selectedLocationId) : null
      return location ? `local ${location.name}` : 'local selecionado'
    }

    const sector = normalizedSectorId ? sectors.find((s) => s.id === normalizedSectorId) : selectedSectorId ? sectors.find((s) => s.id === selectedSectorId) : null
    if (!sector) return 'setor selecionado'
    const location = sector.locationId ? locations.find((l) => l.id === sector.locationId) : null
    if (location) return `setor ${sector.name} | ${location.name}`
    return `setor ${sector.name}`
  }, [locationsQuery.data, normalizedSectorId, sectorsQuery.data, selectedLocationId, selectedSectorId, viewFormat])

  return (
    <section className="ge-monthly">
      <div className="ge-monthlyToolbar">
        <div className="ge-monthlyToolbarLeft">
          <select
            className="ge-select ge-monthlySelect ge-monthlyScopeSelect"
            value={scopeValue}
            onChange={(e) => {
              const next = e.target.value
              if (!next) {
                setViewFormat('sector')
                setSelectedLocationId('')
                setSelectedSectorId('')
                return
              }
              const [kind, id] = next.split(':', 2)
              if (kind === 'loc') {
                setViewFormat('location')
                setSelectedLocationId(id)
                setSelectedSectorId('')
                return
              }
              if (kind === 'sec') {
                setViewFormat('sector')
                setSelectedSectorId(id)
                setSelectedLocationId('')
              }
            }}
            aria-label="Local ou setor"
          >
            {scopeOptions.map((opt) => (
              <option key={opt.value || '__all__'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ge-monthlyToolbarCenter">
          <button type="button" className="ge-monthNavButton" onClick={() => moveMonth(-1)} aria-label="Mês anterior">
            ‹
          </button>
          <button
            type="button"
            className="ge-monthLabelButton"
            onClick={() => {
              const el = monthPickerRef.current as (HTMLInputElement & { showPicker?: () => void }) | null
              if (!el) return
              if (typeof el.showPicker === 'function') el.showPicker()
              else el.click()
            }}
            aria-label="Selecionar mês"
          >
            {monthLabel}
          </button>
          <button type="button" className="ge-monthNavButton" onClick={() => moveMonth(1)} aria-label="Próximo mês">
            ›
          </button>
          <input
            ref={monthPickerRef}
            type="month"
            className="ge-monthPicker"
            value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`}
            onChange={(e) => {
              const [yyyy, mm] = e.target.value.split('-').map((v) => Number(v))
              if (!Number.isFinite(yyyy) || !Number.isFinite(mm)) return
              setMonth(new Date(yyyy, mm - 1, 1, 12, 0, 0))
            }}
            aria-label="Mês"
          />
        </div>

        <div className="ge-monthlyToolbarRight">
          <button type="button" className="ge-pillButton" onClick={replicate} disabled={!schedule?.id || !canReplicate || replicateMutation.isPending}>
            Replicar mês
          </button>
          {canPublish ? (
            <div className="ge-monthlyPublishWrap" ref={publishMenuRef}>
              <button
                type="button"
                className="ge-pillButton"
                onClick={() => setPublishMenuOpen((v) => !v)}
                disabled={!schedule?.id || publishScheduleMutation.isPending}
                aria-haspopup="dialog"
                aria-expanded={publishMenuOpen}
              >
                Liberar escala
              </button>
              {publishMenuOpen ? (
                <div className="ge-monthlyPublishMenu" role="dialog" aria-label="Liberar escala">
                  <div className="ge-monthlyPublishMenuHeader">
                    <span className="ge-monthlyPublishMenuHeaderIcon">
                      <SvgIcon name="calendar" size={18} />
                    </span>
                    <span>Escala liberada</span>
                  </div>

                  <div className="ge-monthlyPublishMenuRow">
                    <div className="ge-monthlyPublishMenuLabel">Escala liberada até:</div>
                    <input
                      className="ge-input ge-monthlyPublishMenuDate"
                      type="date"
                      value={publishUntil}
                      onChange={(e) => setPublishUntil(e.target.value)}
                      disabled={publishNoLimit}
                      aria-label="Escala liberada até"
                    />
                  </div>

                  <label className="ge-monthlyPublishMenuCheckboxRow">
                    <input
                      type="checkbox"
                      checked={publishNoLimit}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setPublishNoLimit(checked)
                        if (checked) setPublishUntil('')
                      }}
                    />
                    <span>Sem restrição</span>
                  </label>

                  <button
                    type="button"
                    className="ge-buttonPrimary ge-monthlyPublishMenuSave"
                    onClick={publish}
                    disabled={publishScheduleMutation.isPending || (!publishNoLimit && !publishUntil)}
                  >
                    Salvar
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              className="ge-pillButton"
              onClick={lock}
              disabled={!schedule?.id || !canLock || lockScheduleMutation.isPending}
            >
              Bloquear escala
            </button>
          )}
          <button
            type="button"
            className="ge-pillButton"
            onClick={() => {
              if (!schedule?.id) return
              setModal({ open: true, mode: 'requestConfirmation' })
            }}
            disabled={!schedule?.id || requestConfirmationMutation.isPending}
          >
            Solicitar confirmação
          </button>
        </div>
      </div>

      {scheduleError ? <div className="ge-errorText">{scheduleError}</div> : null}
      {locationsQuery.error ? <div className="ge-errorText">Não foi possível carregar locais.</div> : null}
      {sectorsQuery.error ? <div className="ge-errorText">Não foi possível carregar setores.</div> : null}

      <div className="ge-monthlyWeekdays">
        {weekdayLabels.map((label) => (
          <div key={label} className="ge-monthlyWeekday">
            {label}
          </div>
        ))}
      </div>

      <div className={`ge-monthlyCalendar ${scheduleEditable ? '' : 'ge-monthlyCalendarReadOnly'}`}>
        {monthCells.map((cellDate) => {
          const inMonth = cellDate.getMonth() === month.getMonth() && cellDate.getFullYear() === month.getFullYear()
          const key = dateKeyLocal(cellDate)
          const shifts = shiftsByDay[key] ?? []
          return (
            <div key={key} className={`ge-monthlyDay ${inMonth ? '' : 'ge-monthlyDayOutside'}`}>
              <div className="ge-monthlyDayHeader">
                <div className="ge-monthlyDayNumber">{String(cellDate.getDate()).padStart(2, '0')}</div>
                {inMonth ? (
                  <button
                    type="button"
                    className="ge-monthlyAddShift"
                    onClick={() => setModal({ open: true, mode: 'create', dayKey: key })}
                    disabled={!scheduleEditable}
                    aria-label="Criar plantão"
                  >
                    +
                  </button>
                ) : (
                  <div className="ge-monthlyAddShiftPlaceholder" />
                )}
              </div>
              <div className="ge-monthlyDayBody">
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
                      {formatTimeHHMM(s.startTime)} {formatTimeHHMM(s.endTime)}
                    </div>
                  </button>
                ))}
                {shiftsQuery.isLoading ? <div className="ge-monthlyLoading">Carregando...</div> : null}
                {shiftsQuery.error ? <div className="ge-monthlyError">Erro ao carregar plantões.</div> : null}
              </div>
            </div>
          )
        })}
      </div>

      {toast ? <div className="ge-toast">{toast}</div> : null}

      {modal.open ? (
        <div className="ge-modalOverlay" role="dialog" aria-modal="true">
          <div className={`ge-modal ${modal.mode === 'requestConfirmation' ? 'ge-modalWide' : ''}`}>
            {modal.mode === 'requestConfirmation' ? (
              <>
                <div className="ge-modalHeader ge-confirmModalHeader">
                  <div className="ge-confirmModalTitle">
                    <span className="ge-confirmModalIcon">
                      <SvgIcon name="info" size={26} />
                    </span>
                    <span>SOLICITAÇÃO DE CONFIRMAÇÃO</span>
                  </div>
                  <button type="button" className="ge-modalClose" onClick={() => setModal({ open: false })} aria-label="Fechar">
                    ×
                  </button>
                </div>

                <div className="ge-modalBody ge-confirmModalBody">
                  <div className="ge-confirmModalText">
                    Os profissionais receberão uma notificação no aplicativo para confirmar seus plantões e após efetuarem esta ação, os plantões
                    confirmados poderão ser visualizados nesta tela.
                  </div>
                  {!canRequestConfirmation ? (
                    <div className="ge-confirmModalAttention">Você precisa liberar a escala antes de solicitar confirmação.</div>
                  ) : null}
                  <div className="ge-confirmModalAttention">
                    Atenção: As notificações serão referentes aos plantões do {scopeSummary} no mês de {monthLabelSlash}.
                  </div>
                  <div className="ge-confirmModalActions">
                    <button
                      type="button"
                      className="ge-buttonPrimary ge-confirmModalButton"
                      onClick={() => void requestConfirmation()}
                      disabled={!schedule?.id || !canRequestConfirmation || requestConfirmationMutation.isPending}
                    >
                      Solicitar
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="ge-modalHeader">
                  <div className="ge-modalTitle">
                    {modal.mode === 'create' ? `Novo plantão — ${modal.dayKey.split('-').reverse().join('/')}` : `Editar plantão`}
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
                    <button type="submit" className="ge-buttonPrimary" disabled={createShiftMutation.isPending || !scheduleEditable}>
                      Criar
                    </button>
                  </div>
                </form>
              ) : (
                <form className="ge-modalForm" onSubmit={(e) => void submitEditShift(e, modal.shiftId)}>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Profissional de plantão</div>
                    <select className="ge-select" name="professionalId" defaultValue={shiftBeingEdited?.professionalId ?? ''} disabled={!scheduleEditable}>
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
                      disabled={!scheduleEditable}
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
                    <select className="ge-select" name="kind" defaultValue={shiftBeingEdited?.kind ?? 'NORMAL'} disabled={!scheduleEditable}>
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
                    <select className="ge-select" name="situationCode" defaultValue={shiftBeingEdited?.situationCode ?? 'DESIGNADO'} disabled={!scheduleEditable}>
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
                    <input className="ge-input" name="start" type="datetime-local" defaultValue={shiftBeingEdited ? toDateTimeLocalValue(shiftBeingEdited.startTime) : ''} required disabled={!scheduleEditable} />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Fim</div>
                    <input className="ge-input" name="end" type="datetime-local" defaultValue={shiftBeingEdited ? toDateTimeLocalValue(shiftBeingEdited.endTime) : ''} required disabled={!scheduleEditable} />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Valor (centavos)</div>
                    <input className="ge-input" name="valueCents" type="number" min={0} defaultValue={shiftBeingEdited?.valueCents ?? ''} disabled={!scheduleEditable} />
                  </label>
                  <label className="ge-modalField">
                    <div className="ge-modalLabel">Moeda</div>
                    <input className="ge-input" name="currency" type="text" defaultValue={shiftBeingEdited?.currency ?? 'BRL'} disabled={!scheduleEditable} />
                  </label>
                  <div className="ge-modalActions">
                    <button type="button" className="ge-buttonSecondary" onClick={() => setModal({ open: false })}>
                      Fechar
                    </button>
                    <button type="submit" className="ge-buttonPrimary" disabled={updateShiftMutation.isPending || !scheduleEditable}>
                      Salvar
                    </button>
                  </div>
                  {!scheduleEditable ? <div className="ge-monthlyHint">Esta escala não pode mais ser editada.</div> : null}
                </form>
              )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
