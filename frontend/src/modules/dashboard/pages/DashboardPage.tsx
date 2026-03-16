import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../app/store'
import { apiFetch } from '../../../core/api/client'
import { useLockSchedule } from '../../scheduling/hooks/useLockSchedule'
import { usePublishSchedule } from '../../scheduling/hooks/usePublishSchedule'
import { useCreateShift } from '../../shifts/hooks/useCreateShift'
import { useShifts } from '../../shifts/hooks/useShifts'
import { useUpdateShift } from '../../shifts/hooks/useUpdateShift'
import type { Shift } from '../../shifts/types/shift'
import type { Schedule } from '../../scheduling/types/schedule'
import { useProfessionals } from '../../workforce/hooks/useProfessionals'

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

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | null

function badgeColorToCss(color: BadgeColor): string {
  if (color === 'blue') return '#2d7ef7'
  if (color === 'green') return '#2ecc71'
  if (color === 'yellow') return '#f1c40f'
  if (color === 'red') return '#e74c3c'
  return 'transparent'
}

type IconName =
  | 'app'
  | 'menu'
  | 'help'
  | 'envelope'
  | 'warning'
  | 'bell'
  | 'building'
  | 'chevronDown'
  | 'barChart'
  | 'calendar'
  | 'persons'
  | 'gear'
  | 'calendarWeek'
  | 'calendarMonth'
  | 'person'
  | 'shiftScale'
  | 'search'
  | 'templatePlus'
  | 'textSearch'
  | 'eye'
  | 'mapPin'
  | 'users'
  | 'tag'
  | 'flag'
  | 'money'
  | 'gift'
  | 'bank'
  | 'sliders'
  | 'briefcase'

function SvgIcon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
  } as const

  if (name === 'menu') {
    return (
      <svg {...common}>
        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'help') {
    return (
      <svg {...common}>
        <path
          d="M12 20a8 8 0 1 0-8-8 8 8 0 0 0 8 8Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M9.8 9.5a2.3 2.3 0 1 1 3.7 1.9c-.9.6-1.5 1.1-1.5 2.2v.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'envelope') {
    return (
      <svg {...common}>
        <path
          d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="m5 7 7 6 7-6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }
  if (name === 'warning') {
    return (
      <svg {...common}>
        <path
          d="M12 3 1.8 20.2A1.3 1.3 0 0 0 2.9 22h18.2a1.3 1.3 0 0 0 1.1-1.8L12 3Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'bell') {
    return (
      <svg {...common}>
        <path
          d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'building') {
    return (
      <svg {...common}>
        <path d="M4 21V3h12v18" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M16 8h4v13" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M8 7h2M8 11h2M8 15h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 21v-4h4v4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }
  if (name === 'chevronDown') {
    return (
      <svg {...common}>
        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (name === 'barChart') {
    return (
      <svg {...common}>
        <path d="M5 12v7M12 5v14M19 9v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'calendar') {
    return (
      <svg {...common}>
        <path
          d="M7 3v3M17 3v3M4 8h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (name === 'persons') {
    return (
      <svg {...common}>
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
        <path
          d="M22 21v-2a4 4 0 0 0-3-3.87"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 3.13a4 4 0 0 1 0 7.75"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (name === 'gear') {
    return (
      <svg {...common}>
        <path
          d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M19.4 15a7.8 7.8 0 0 0 .1-1l2-1.5-2-3.4-2.4.9a7.5 7.5 0 0 0-1.7-1L15 6h-6l-.4 3a7.5 7.5 0 0 0-1.7 1l-2.4-.9-2 3.4L4.6 14a7.8 7.8 0 0 0 .1 1 7.8 7.8 0 0 0-.1 1l-2 1.5 2 3.4 2.4-.9a7.5 7.5 0 0 0 1.7 1L9 22h6l.4-3a7.5 7.5 0 0 0 1.7-1l2.4.9 2-3.4-2-1.5a7.8 7.8 0 0 0-.1-1Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (name === 'calendarWeek') {
    return (
      <svg {...common}>
        <path
          d="M7 3v3M17 3v3M4 8h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d="M7 12h3M7 16h3M14 12h3M14 16h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'calendarMonth') {
    return (
      <svg {...common}>
        <path
          d="M7 3v3M17 3v3M4 8h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d="M7 12h3M11 12h3M15 12h2M7 16h3M11 16h3M15 16h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'person') {
    return (
      <svg {...common}>
        <path
          d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (name === 'shiftScale') {
    return (
      <svg {...common}>
        <path d="M6 7h12M6 12h8M6 17h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M15 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M13.5 16.5 15 18l1.5-1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (name === 'search') {
    return (
      <svg {...common}>
        <path
          d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="m21 21-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'templatePlus') {
    return (
      <svg {...common}>
        <path d="M4 5h16v14H4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 9v6M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'textSearch') {
    return (
      <svg {...common}>
        <path d="M4 6h10M4 10h10M4 14h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M15.5 18a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="m21 21-2.2-2.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'eye') {
    return (
      <svg {...common}>
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (name === 'mapPin') {
    return (
      <svg {...common}>
        <path
          d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M12 11.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (name === 'users') {
    return (
      <svg {...common}>
        <path
          d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
        <path
          d="M23 21v-2a4 4 0 0 0-3-3.9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M16.5 3.2a4 4 0 0 1 0 7.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'tag') {
    return (
      <svg {...common}>
        <path
          d="M20 13.6 12.4 21.2a2 2 0 0 1-2.8 0L2.8 14.4a2 2 0 0 1-.6-1.4V4a2 2 0 0 1 2-2h9a2 2 0 0 1 1.4.6L20 8.2a2 2 0 0 1 0 2.8Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M7.6 7.6h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'flag') {
    return (
      <svg {...common}>
        <path
          d="M5 22V4m0 0h11l-1.4 3L19 10H5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (name === 'money') {
    return (
      <svg {...common}>
        <path d="M3 7h18v10H3V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="2" />
        <path d="M7 10h.01M17 14h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'gift') {
    return (
      <svg {...common}>
        <path d="M20 12v10H4V12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M2 7h20v5H2V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 22V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M12 7H8.8a2.8 2.8 0 1 1 0-5.6C11.2 1.4 12 7 12 7Zm0 0h3.2a2.8 2.8 0 1 0 0-5.6C12.8 1.4 12 7 12 7Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (name === 'bank') {
    return (
      <svg {...common}>
        <path d="M4 10h16v11H4V10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M2 10 12 3l10 7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M7 10v11M12 10v11M17 10v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'sliders') {
    return (
      <svg {...common}>
        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 6v6M16 12v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'briefcase') {
    return (
      <svg {...common}>
        <path
          d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M4 7h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function IconButton({
  icon,
  label,
  badgeColor,
  onClick,
}: {
  icon: IconName
  label: string
  badgeColor?: BadgeColor
  onClick?: () => void
}) {
  return (
    <button type="button" className="ge-iconButton" aria-label={label} title={label} onClick={onClick}>
      <span className="ge-iconButtonIcon">
        <SvgIcon name={icon} />
      </span>
      <span className="ge-iconButtonBadge" style={{ backgroundColor: badgeColorToCss(badgeColor ?? null) }} />
    </button>
  )
}

type MonthlyLocation = { id: string; name: string }
type MonthlySector = { id: string; locationId: string | null; name: string }

function formatMonthLabel(date: Date): string {
  try {
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
    return label.toUpperCase()
  } catch {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    return `${mm}/${yyyy}`
  }
}

function formatMonthReference(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}-01`
}

function toIsoUtcStartOfDayLocal(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)).toISOString()
}

function buildMonthCells(monthDate: Date): Date[] {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const first = new Date(year, month, 1, 12, 0, 0)
  const dayOfWeek = first.getDay()
  const mondayIndex = (dayOfWeek + 6) % 7
  const start = new Date(year, month, 1 - mondayIndex, 12, 0, 0)
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12, 0, 0))
}

function dateKeyLocal(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso)
  const pad2 = (v: number) => String(v).padStart(2, '0')
  const yyyy = date.getFullYear()
  const mm = pad2(date.getMonth() + 1)
  const dd = pad2(date.getDate())
  const hh = pad2(date.getHours())
  const min = pad2(date.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

function formatTimeHHMM(iso: string): string {
  const d = new Date(iso)
  const pad2 = (v: number) => String(v).padStart(2, '0')
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function scheduleStatusLabel(status: string | null | undefined): string {
  if (status === 'DRAFT') return 'Escala em rascunho'
  if (status === 'PUBLISHED') return 'Escala publicada'
  if (status === 'LOCKED') return 'Escala bloqueada'
  return 'Escala'
}

function MonthlySchedulePanel() {
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
      // ignore
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
      // ignore
    }
  }, [viewFormat])

  useEffect(() => {
    try {
      const yyyy = month.getFullYear()
      const mm = String(month.getMonth() + 1).padStart(2, '0')
      window.localStorage.setItem('ge.scheduling.monthly.month', `${yyyy}-${mm}`)
    } catch {
      // ignore
    }
  }, [month])

  useEffect(() => {
    try {
      window.localStorage.setItem('ge.scheduling.monthly.locationId', selectedLocationId)
    } catch {
      // ignore
    }
  }, [selectedLocationId])

  useEffect(() => {
    try {
      window.localStorage.setItem('ge.scheduling.monthly.sectorId', selectedSectorId)
    } catch {
      // ignore
    }
  }, [selectedSectorId])

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: () => apiFetch<MonthlyLocation[]>('/api/locations'),
  })

  const sectorsQuery = useQuery({
    queryKey: ['sectors', selectedLocationId],
    queryFn: () => {
      const query = selectedLocationId ? `?locationId=${encodeURIComponent(selectedLocationId)}` : ''
      return apiFetch<MonthlySector[]>(`/api/sectors${query}`)
    },
  })

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
  const toIso = useMemo(() => toIsoUtcStartOfDayLocal(new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate() + 1, 12, 0, 0)), [monthEnd])

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
    mutationFn: async (scheduleId: string) => apiFetch<{ created: number; skipped: number }>(`/api/schedules/${scheduleId}/replicate-previous-month`, { method: 'POST' }),
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

  async function publish() {
    if (!schedule?.id) return
    try {
      const updated = await publishScheduleMutation.mutateAsync(schedule.id)
      queryClient.setQueryData(scheduleQueryKey, updated)
      setToast('Escala liberada.')
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
    try {
      const result = await requestConfirmationMutation.mutateAsync(schedule.id)
      setToast(`Solicitação enviada: ${result.created} criado(s), ${result.skipped} ignorado(s).`)
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
    const startLocal = (form.elements.namedItem('start') as HTMLInputElement).value
    const endLocal = (form.elements.namedItem('end') as HTMLInputElement).value
    const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
    const currency = (form.elements.namedItem('currency') as HTMLInputElement).value

    try {
      const startIso = new Date(startLocal).toISOString()
      const endIso = new Date(endLocal).toISOString()
      await createShiftMutation.mutateAsync({
        scheduleId: schedule.id,
        professionalId: professionalId ? professionalId : null,
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
    const startLocal = (form.elements.namedItem('start') as HTMLInputElement).value
    const endLocal = (form.elements.namedItem('end') as HTMLInputElement).value
    const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
    const currency = (form.elements.namedItem('currency') as HTMLInputElement).value

    try {
      await updateShiftMutation.mutateAsync({
        shiftId,
        input: {
          professionalId: professionalId ? professionalId : null,
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

  const monthLabel = useMemo(() => formatMonthLabel(month), [month])

  return (
    <section className="ge-monthly">
      <div className="ge-monthlyToolbar">
        <div className="ge-monthlyToolbarLeft">
          <select
            className="ge-select ge-monthlySelect"
            value={viewFormat}
            onChange={(e) => {
              const next = e.target.value === 'location' ? 'location' : 'sector'
              setViewFormat(next)
              if (next === 'location') setSelectedSectorId('')
            }}
            aria-label="Formato de visualização"
          >
            <option value="sector">Por setor</option>
            <option value="location">Por local</option>
          </select>

          <select
            className="ge-select ge-monthlySelect"
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            aria-label="Local"
          >
            <option value="">(Todos os locais)</option>
            {(locationsQuery.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {viewFormat === 'sector' ? (
            <select
              className="ge-select ge-monthlySelect"
              value={normalizedSectorId}
              onChange={(e) => setSelectedSectorId(e.target.value)}
              aria-label="Setor"
              disabled={sectorsQuery.isLoading}
            >
              <option value="">(Todos os setores)</option>
              {(sectorsQuery.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : null}
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
          <button type="button" className="ge-pillButton" aria-label={scheduleStatusLabel(schedule?.status)} disabled>
            {scheduleStatusLabel(schedule?.status)}
          </button>
          <button type="button" className="ge-pillButton" onClick={replicate} disabled={!schedule?.id || !canReplicate || replicateMutation.isPending}>
            Replicar mês
          </button>
          <button type="button" className="ge-pillButton" onClick={canPublish ? publish : lock} disabled={!schedule?.id || (!canPublish && !canLock) || publishScheduleMutation.isPending || lockScheduleMutation.isPending}>
            {canPublish ? 'Liberar escala' : 'Bloquear escala'}
          </button>
          <button
            type="button"
            className="ge-pillButton"
            onClick={requestConfirmation}
            disabled={!schedule?.id || !canRequestConfirmation || requestConfirmationMutation.isPending}
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
                  >
                    <div className="ge-shiftCardName">
                      {s.professionalId ? professionalNameById[s.professionalId] ?? s.professionalId : '(Sem profissional)'}
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
          <div className="ge-modal">
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
                    <div className="ge-modalLabel">Profissional</div>
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
                    <div className="ge-modalLabel">Profissional</div>
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
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function DashboardPage() {
  const session = useAuthStore((s) => s.session)
  const clearSession = useAuthStore((s) => s.clearSession)
  const roles = useMemo(() => parseJwtRoles(session.accessToken), [session.accessToken])
  const isAdmin = roles.includes('ADMIN')
  const isSuperAdmin = roles.includes('SUPER_ADMIN')
  const location = useLocation()
  const navigate = useNavigate()

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
    | 'visualizadores'
    | 'locais-setores'
    | 'grupos'
    | 'tipos-plantao'
    | 'situacoes-plantao'
    | 'valores'
    | 'bonificacoes'
    | 'contas-bancarias'
    | 'auto-ajustes'
    | 'tipos-contratacao'
    | 'produtividades'

  type WorkspaceItem = { id: WorkspaceItemId; label: string; icon?: IconName; enabled?: boolean }
  type WorkspaceSection = { id: WorkspaceSectionId; label: string; icon: IconName; items: WorkspaceItem[] }

  const [companyMenuOpen, setCompanyMenuOpen] = useState(false)
  const companyMenuRef = useRef<HTMLDivElement | null>(null)

  const [navFlyoutSectionId, setNavFlyoutSectionId] = useState<WorkspaceSectionId | null>(null)
  const sidebarRef = useRef<HTMLElement | null>(null)

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
          { id: 'visualizadores' as const, label: 'Visualizadores', icon: 'eye' as const },
        ],
      },
      {
        id: 'settings' as const,
        label: 'Configurações',
        icon: 'gear' as const,
        items: [
          { id: 'locais-setores' as const, label: 'Locais e Setores', icon: 'mapPin' as const },
          { id: 'grupos' as const, label: 'Grupos', icon: 'users' as const },
          { id: 'tipos-plantao' as const, label: 'Tipos de Plantão', icon: 'tag' as const },
          { id: 'situacoes-plantao' as const, label: 'Situações do Plantão', icon: 'flag' as const },
          { id: 'valores' as const, label: 'Valores', icon: 'money' as const },
          { id: 'bonificacoes' as const, label: 'Bonificações', icon: 'gift' as const },
          { id: 'contas-bancarias' as const, label: 'Contas Bancárias', icon: 'bank' as const },
          { id: 'auto-ajustes' as const, label: 'Auto-ajustes', icon: 'sliders' as const },
          { id: 'tipos-contratacao' as const, label: 'Tipos de Contratação', icon: 'briefcase' as const },
          { id: 'produtividades' as const, label: 'Produtividades', icon: 'barChart' as const },
        ],
      },
    ]
  }, [timeJustificationsEnabled])

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
    const desiredHash = `#${activeSectionId}/${activeItemId}`
    if (location.hash === desiredHash) return
    navigate({ pathname: '/dashboard', hash: desiredHash }, { replace: true })
  }, [activeItemId, activeSectionId, location.hash, navigate])

  const activeSection = workspaceSections.find((s) => s.id === activeSectionId) ?? workspaceSections[0]
  const activeItem = activeSection.items.find((i) => i.id === activeItemId) ?? activeSection.items[0]

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
              <div className="ge-pageHeader">
                <h1 className="ge-pageTitle">{activeItem.label}</h1>
              </div>

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
                  {activeSectionId === 'scheduling' && activeItemId === 'mensal' ? (
                    <MonthlySchedulePanel />
                  ) : (
                    <section className="ge-card">
                      <div className="ge-cardTitle">{activeItem.label}</div>
                      <div className="ge-cardBody">Em breve</div>
                    </section>
                  )}
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
    </div>
  )
}
