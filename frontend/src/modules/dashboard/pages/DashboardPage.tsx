import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../app/store'
import { apiFetch } from '../../../core/api/client'
import { useLockSchedule } from '../../scheduling/hooks/useLockSchedule'
import { usePublishSchedule } from '../../scheduling/hooks/usePublishSchedule'
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

type IconName =
  | 'app'
  | 'menu'
  | 'help'
  | 'info'
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
  | 'paperclip'
  | 'plus'
  | 'pencil'
  | 'trash'
  | 'check'
  | 'x'

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
  if (name === 'info') {
    return (
      <svg {...common}>
        <path
          d="M12 20a8 8 0 1 0-8-8 8 8 0 0 0 8 8Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M12 10.5v4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 7.5h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
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
  if (name === 'plus') {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'pencil') {
    return (
      <svg {...common}>
        <path
          d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0 0-3L15.5 4a2.1 2.1 0 0 0-3 0L2 14.5V20Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M12.5 6.5 17.5 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === 'trash') {
    return (
      <svg {...common}>
        <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M6 7l1 14h10l1-14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }
  if (name === 'check') {
    return (
      <svg {...common}>
        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (name === 'x') {
    return (
      <svg {...common}>
        <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
  if (name === 'paperclip') {
    return (
      <svg {...common}>
        <path
          d="M9 17.5 16.6 9.9a3.5 3.5 0 0 0-5-5L6.4 10.1a5.5 5.5 0 0 0 7.8 7.8l7.1-7.1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
    queryKey: ['sectors'],
    queryFn: () => apiFetch<MonthlySector[]>('/api/sectors'),
  })

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
    const kind = (form.elements.namedItem('kind') as HTMLSelectElement | null)?.value ?? 'NORMAL'
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
        kind,
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
    const kind = (form.elements.namedItem('kind') as HTMLSelectElement | null)?.value ?? 'NORMAL'
    const startLocal = (form.elements.namedItem('start') as HTMLInputElement).value
    const endLocal = (form.elements.namedItem('end') as HTMLInputElement).value
    const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
    const currency = (form.elements.namedItem('currency') as HTMLInputElement).value

    try {
      await updateShiftMutation.mutateAsync({
        shiftId,
        input: {
          professionalId: professionalId ? professionalId : null,
          kind,
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

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  const dayOfWeek = d.getDay()
  const mondayIndex = (dayOfWeek + 6) % 7
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - mondayIndex, 12, 0, 0)
}

function dateIso(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
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
    const kind = (form.elements.namedItem('kind') as HTMLSelectElement | null)?.value ?? 'NORMAL'
    const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
    const currency = (form.elements.namedItem('currency') as HTMLInputElement).value

    const startIso = new Date(start).toISOString()
    const endIso = new Date(end).toISOString()

    try {
      const schedule = await ensureScheduleForDate(modal.sectorId, startIso)
      if (schedule.status !== 'DRAFT') {
        setToast('Esta escala não pode mais ser editada.')
        return
      }
      await createShiftMutation.mutateAsync({
        scheduleId: schedule.id,
        professionalId: professionalId ? professionalId : null,
        kind,
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
    const kind = (form.elements.namedItem('kind') as HTMLSelectElement | null)?.value ?? 'NORMAL'
    const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
    const currency = (form.elements.namedItem('currency') as HTMLInputElement).value

    try {
      await updateShiftMutation.mutateAsync({
        shiftId,
        input: {
          professionalId,
          kind,
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
                    <div className="ge-modalLabel">Profissional</div>
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
    const kind = (form.elements.namedItem('kind') as HTMLSelectElement | null)?.value ?? 'NORMAL'
    const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
    const currency = (form.elements.namedItem('currency') as HTMLInputElement).value

    if (!sectorId) {
      setToast('Selecione um setor.')
      return
    }

    const startIso = new Date(start).toISOString()
    const endIso = new Date(end).toISOString()

    try {
      const schedule = await ensureScheduleForDate(sectorId, startIso)
      if (schedule.status !== 'DRAFT') {
        setToast('Esta escala não pode mais ser editada.')
        return
      }
      await createShiftMutation.mutateAsync({
        scheduleId: schedule.id,
        professionalId: professionalId ? professionalId : null,
        kind,
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
    const kind = (form.elements.namedItem('kind') as HTMLSelectElement | null)?.value ?? 'NORMAL'
    const valueCentsRaw = (form.elements.namedItem('valueCents') as HTMLInputElement).value
    const currency = (form.elements.namedItem('currency') as HTMLInputElement).value

    try {
      await updateShiftMutation.mutateAsync({
        shiftId,
        input: {
          professionalId,
          kind,
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
                    <div className="ge-modalLabel">Profissional</div>
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
                    <div className="ge-modalLabel">Profissional</div>
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
    setAddProfessionalAvailability({ draft: defaultAddProfessionalAvailabilityDraft, items: [] })
    setAddProfessionalBonuses({ draft: defaultAddProfessionalBonusDraft, items: [] })
    setAddProfessionalPendencies(defaultAddProfessionalPendencies)
    setAddProfessionalDocuments([])
    setAddProfessionalDialog({ open: true, tabId: 'informacoes' })
  }

  function downloadLocalFile(name: string, file: File) {
    const url = URL.createObjectURL(file)
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = name || file.name
      a.rel = 'noreferrer'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    }
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

  const canSeeProfessionalDetails = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN') || roles.includes('COORDINATOR')
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
    specialties: ProfessionalProfileCatalogItem[]
  }
  type ProfessionalProfileCatalogKind = 'prefixes' | 'professions' | 'registration-types' | 'specialties'

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
  const filteredSettingsShiftTypes = useMemo(() => {
    const q = settingsShiftTypesSearch.trim().toLowerCase()
    if (!q) return settingsShiftTypes
    return settingsShiftTypes.filter((t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
  }, [settingsShiftTypes, settingsShiftTypesSearch])

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
          { id: 'grupos' as const, label: 'Grupos', icon: 'users' as const, enabled: canManageGroups },
          { id: 'tipos-plantao' as const, label: 'Tipos de Plantão', icon: 'tag' as const },
          { id: 'situacoes-plantao' as const, label: 'Situações do Plantão', icon: 'flag' as const },
          { id: 'valores' as const, label: 'Valores', icon: 'money' as const },
          { id: 'bonificacoes' as const, label: 'Bonificações', icon: 'gift' as const },
          { id: 'contas-bancarias' as const, label: 'Contas Bancárias', icon: 'bank' as const },
          { id: 'auto-ajustes' as const, label: 'Auto-ajustes', icon: 'sliders' as const },
          { id: 'tipos-contratacao' as const, label: 'Tipos de Contratação', icon: 'briefcase' as const },
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
    if (activeItemId !== 'locais-setores') return
    setSettingsLocationModal(null)
    setSettingsSectorModal(null)
    void loadSettingsLocations()
  }, [activeItemId, activeSectionId, loadSettingsLocations, session.accessToken])

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
  const addProfessionalGroupsDataEnabled = addProfessionalDialog.open && addProfessionalDialog.tabId === 'grupos'
  const addProfessionalBonusesDataEnabled = addProfessionalDialog.open && addProfessionalDialog.tabId === 'bonificacao'
  const schedulingScopeDataEnabled =
    weeklyHeaderEnabled ||
    professionalHeaderEnabled ||
    templateHeaderEnabled ||
    searchHeaderEnabled ||
    addProfessionalGroupsDataEnabled ||
    addProfessionalBonusesDataEnabled

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
            {weeklyHeaderEnabled || professionalHeaderEnabled || groupsHeaderEnabled || locationsHeaderEnabled || shiftTypesHeaderEnabled ? (
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
                              <div className="ge-inlineForm" style={{ marginTop: 10, gap: 10 }}>
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
                            ) : null}

                            <div className="ge-list" style={{ marginTop: 10 }}>
                              {filteredSettingsShiftTypes.length === 0 ? (
                                <div style={{ opacity: 0.75 }}>Nenhum tipo encontrado.</div>
                              ) : (
                                filteredSettingsShiftTypes.map((t) => {
                                  const editing = settingsShiftTypeEditor?.mode === 'edit' && settingsShiftTypeEditor.id === t.id
                                  const locked = t.system || t.code === 'NORMAL'
                                  return (
                                    <div key={t.id} className="ge-listRow" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                      <div
                                        style={{
                                          width: 14,
                                          height: 14,
                                          borderRadius: 4,
                                          border: '1px solid rgba(0,0,0,0.12)',
                                          background: t.color || '#e2e8f0',
                                          flex: '0 0 auto',
                                        }}
                                        title={t.color || 'Sem cor'}
                                      />
                                      {editing ? (
                                        <>
                                          <input
                                            className="ge-input"
                                            type="text"
                                            value={settingsShiftTypeEditor?.name ?? ''}
                                            onChange={(e) =>
                                              setSettingsShiftTypeEditor((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                                            }
                                            disabled={settingsShiftTypesSaving}
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
                                          <button
                                            type="button"
                                            className="ge-buttonPrimary"
                                            disabled={settingsShiftTypesSaving || !settingsShiftTypeEditor?.name.trim() || locked || !(isAdmin || isSuperAdmin)}
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
                                                    body: JSON.stringify({ name: settingsShiftTypeEditor.name, color: settingsShiftTypeEditor.color }),
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
                                        </>
                                      ) : (
                                        <>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                                            <div style={{ opacity: 0.75, fontSize: 13 }}>{t.code}</div>
                                          </div>
                                          <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                              type="button"
                                              className="ge-buttonSecondary ge-buttonIconOnly"
                                              onClick={() => setSettingsShiftTypeEditor({ mode: 'edit', id: t.id, name: t.name, color: t.color ?? '' })}
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
                    !(activeSectionId === 'settings' && activeItemId === 'locais-setores') &&
                    !(activeSectionId === 'settings' && activeItemId === 'grupos') ? (
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
        <div className="ge-modalOverlay" role="dialog" aria-modal="true">
          <div className="ge-modal ge-modalWide ge-professionalDialogModal">
            <div className="ge-professionalDialogHeader">
              <div className="ge-professionalDialogTitle">Adicionar Profissional</div>
              <div className="ge-professionalDialogHeaderActions">
                <button
                  type="button"
                  className="ge-buttonPrimary"
                  disabled={!canSaveAddProfessional}
                  onClick={() => {
                    setAddProfessionalSaveAttempted(true)
                    if (!canSaveAddProfessional) return
                    addProfessionalMutation.mutate(addProfessionalInfoForm, {
                      onSuccess: () => setAddProfessionalDialog((prev) => ({ ...prev, open: false })),
                    })
                  }}
                >
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  className="ge-modalClose"
                  onClick={() => setAddProfessionalDialog((prev) => ({ ...prev, open: false }))}
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="ge-professionalDialogBody">
              <aside className="ge-professionalDialogTabs">
                {addProfessionalDialogTabs.map((t) => {
                  const active = addProfessionalDialog.tabId === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`ge-professionalDialogTab ${active ? 'ge-professionalDialogTabActive' : ''}`}
                      onClick={() => setAddProfessionalDialog((prev) => ({ ...prev, tabId: t.id }))}
                    >
                      <span className="ge-professionalDialogTabIcon">
                        <SvgIcon name={t.icon} size={18} />
                      </span>
                      <span className="ge-professionalDialogTabLabel">{t.label}</span>
                    </button>
                  )
                })}
              </aside>

              <section className="ge-professionalDialogContent">
                {addProfessionalDialog.tabId === 'informacoes' ? (
                  <div className="ge-professionalInfoTab">
                    <div className="ge-professionalSectionTitle">Dados Pessoais</div>

                    <div style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
                      <div style={{ display: 'grid', gap: 10, justifyItems: 'start' }}>
                        <button
                          type="button"
                          onClick={() => addProfessionalPhotoInputRef.current?.click()}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                          style={{
                            width: 150,
                            height: 150,
                            borderRadius: 14,
                            border: '1px dashed rgba(127, 127, 127, 0.35)',
                            background: 'color-mix(in srgb, Canvas 96%, transparent)',
                            display: 'grid',
                            placeItems: 'center',
                            padding: 0,
                            overflow: 'hidden',
                            color: 'inherit',
                            cursor: canManageProfessionals && !addProfessionalMutation.isPending ? 'pointer' : 'default',
                          }}
                        >
                          {addProfessionalPhotoPreviewUrl ? (
                            <img
                              src={addProfessionalPhotoPreviewUrl}
                              alt="Foto do profissional"
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <div style={{ display: 'grid', placeItems: 'center', opacity: 0.85 }}>
                              <SvgIcon name="person" size={54} />
                            </div>
                          )}
                        </button>

                        {addProfessionalInfoForm.photoFileName ? (
                          <div style={{ fontSize: 12, opacity: 0.75, wordBreak: 'break-word' }}>{addProfessionalInfoForm.photoFileName}</div>
                        ) : null}

                        <input
                          ref={addProfessionalPhotoInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setAddProfessionalInfoForm((prev) => ({ ...prev, photoFileName: file.name }))
                            setAddProfessionalPhotoPreviewUrl((prev) => {
                              if (prev) URL.revokeObjectURL(prev)
                              return URL.createObjectURL(file)
                            })
                            try {
                              const reader = new FileReader()
                              reader.onload = () => {
                                const dataUrl = typeof reader.result === 'string' ? reader.result : ''
                                setAddProfessionalInfoForm((prev) => ({ ...prev, photoDataUrl: dataUrl }))
                              }
                              reader.readAsDataURL(file)
                            } catch {
                              setAddProfessionalInfoForm((prev) => ({ ...prev, photoDataUrl: '' }))
                            }
                            e.target.value = ''
                          }}
                        />
                      </div>

                      <div className="ge-professionalFormGrid">
                        <label className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                          <div className="ge-professionalLabel">Nome completo*</div>
                          <input
                            className="ge-input"
                            type="text"
                            value={addProfessionalInfoForm.fullName}
                            onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, fullName: e.target.value }))}
                            disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            required
                          />
                        </label>

                        <label className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                          <div className="ge-professionalLabel">Data de nascimento</div>
                          <input
                            className="ge-input"
                            type="date"
                            value={addProfessionalInfoForm.birthDate}
                            onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                            disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                          />
                        </label>

                        <label className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                          <div className="ge-professionalLabel">CPF</div>
                          <input
                            className="ge-input"
                            type="text"
                            value={addProfessionalInfoForm.cpf}
                            onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, cpf: e.target.value }))}
                            disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                          />
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      <div className="ge-professionalSectionTitle">Mini bio</div>
                      <textarea
                        className="ge-input ge-professionalTextarea"
                        value={addProfessionalInfoForm.notes}
                        onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, notes: e.target.value }))}
                        disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        placeholder="Breve descrição do profissional (experiência, áreas de atuação, preferências)."
                      />
                    </div>

                    <div className="ge-professionalDivider" />

                    <div className="ge-professionalSectionTitle">Dados Profissionais</div>

                    <div className="ge-professionalFormGrid">
                      <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                        <div className="ge-professionalLabel">Prefixo (de tratamento)</div>
                        <select
                          className="ge-select"
                          value={addProfessionalInfoForm.prefix}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, prefix: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        >
                          <option value="">—</option>
                          <option value="Dr">Dr</option>
                          <option value="Dra">Dra</option>
                          <option value="Enf">Enf</option>
                          <option value="Prof">Prof</option>
                        </select>
                      </label>
                    </div>

                    <div className="ge-professionalFormGrid">
                      <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                        <div className="ge-professionalLabel">Profissão*</div>
                        <select
                          className="ge-select"
                          value={addProfessionalInfoForm.profession}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, profession: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        >
                          <option value="">Selecione</option>
                          <option value="Médico(a)">Médico(a)</option>
                          <option value="Enfermeiro(a)">Enfermeiro(a)</option>
                          <option value="Técnico(a) de Enfermagem">Técnico(a) de Enfermagem</option>
                          <option value="Fisioterapeuta">Fisioterapeuta</option>
                          <option value="Nutricionista">Nutricionista</option>
                          <option value="Cuidador">Cuidador</option>
                        </select>
                      </label>

                      <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                        <div className="ge-professionalLabel">Tipo de registro</div>
                        <select
                          className="ge-select"
                          value={addProfessionalInfoForm.registrationType}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, registrationType: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        >
                          <option value="">—</option>
                          <option value="CRM">CRM</option>
                          <option value="COREN">COREN</option>
                          <option value="CREFITO">CREFITO</option>
                          <option value="CRN">CRN</option>
                          <option value="CRC">CRC</option>
                          <option value="CREA">CREA</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </label>

                      <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                        <div className="ge-professionalLabel">Registro profissional</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalInfoForm.professionalRegistration}
                          onChange={(e) =>
                            setAddProfessionalInfoForm((prev) => ({ ...prev, professionalRegistration: e.target.value }))
                          }
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                          placeholder="12345-DF"
                        />
                      </label>
                    </div>

                    <div className="ge-professionalFormGrid">
                      <div className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                        <div className="ge-professionalLabel">Especialidades</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                          {addProfessionalSpecialtyOptions.map((opt) => {
                            const checked = addProfessionalInfoForm.specialties.includes(opt)
                            return (
                              <label key={opt} className="ge-professionalCheckboxRow" style={{ fontWeight: 800, opacity: 0.85 }}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setAddProfessionalInfoForm((prev) => ({
                                      ...prev,
                                      specialties: checked ? prev.specialties.filter((v) => v !== opt) : [...prev.specialties, opt],
                                    }))
                                  }}
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                />
                                <span>{opt}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="ge-professionalFormGrid">
                      <label className="ge-professionalField" style={{ gridColumn: 'span 8' }}>
                        <div className="ge-professionalLabel">Departamento</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalInfoForm.department}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, department: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>

                      <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                        <div className="ge-professionalLabel">Data de admissão</div>
                        <input
                          className="ge-input"
                          type="date"
                          value={addProfessionalInfoForm.admissionDate}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, admissionDate: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>
                    </div>

                    <div className="ge-professionalFormGrid">
                      <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                        <div className="ge-professionalLabel">Código</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalInfoForm.code}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, code: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>
                    </div>

                    <div className="ge-professionalDivider" />

                    <div className="ge-professionalSectionTitle">Dados de Contato</div>

                    <div className="ge-professionalFormGrid">
                      <label className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                        <div className="ge-professionalLabel">Telefone</div>
                        <input
                          className="ge-input"
                          type="tel"
                          value={addProfessionalInfoForm.phone}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, phone: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>
                    </div>

                    <div className="ge-professionalFormGrid">
                      <label className="ge-professionalField" style={{ gridColumn: 'span 8' }}>
                        <div className="ge-professionalLabel">{`E-mail${addProfessionalInfoForm.sendInviteByEmail ? '*' : ''}`}</div>
                        <input
                          className="ge-input"
                          type="email"
                          value={addProfessionalInfoForm.email}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, email: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>

                      <div style={{ gridColumn: 'span 4', display: 'grid', gap: 6, justifyItems: 'end', alignContent: 'end' }}>
                        <button
                          type="button"
                          className="ge-buttonSecondary"
                          disabled={
                            !canManageProfessionals ||
                            addProfessionalMutation.isPending ||
                            addProfessionalInfoForm.sendInviteByEmail ||
                            !emailValue ||
                            !/^\S+@\S+\.\S+$/.test(emailValue)
                          }
                          onClick={() => {
                            const targetEmail = addProfessionalInfoForm.email.trim()
                            const targetName = addProfessionalInfoForm.fullName.trim()
                            const label = targetName ? `${targetName} <${targetEmail}>` : targetEmail
                            const ok = window.confirm(`Confirmar envio de convite por e-mail para ${label} ao salvar?`)
                            if (!ok) return
                            setAddProfessionalInfoForm((prev) => ({ ...prev, sendInviteByEmail: true }))
                          }}
                        >
                          Enviar convite
                        </button>

                        {addProfessionalInfoForm.sendInviteByEmail ? (
                          <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>Convite será enviado ao salvar.</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="ge-professionalFormGrid">
                      <label className="ge-professionalField" style={{ gridColumn: 'span 8' }}>
                        <div className="ge-professionalLabel">Rua</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalInfoForm.street}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, street: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>

                      <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                        <div className="ge-professionalLabel">Número</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalInfoForm.addressNumber}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, addressNumber: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>

                      <label className="ge-professionalField" style={{ gridColumn: 'span 6' }}>
                        <div className="ge-professionalLabel">Complemento</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalInfoForm.complement}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, complement: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>

                      <label className="ge-professionalField" style={{ gridColumn: 'span 6' }}>
                        <div className="ge-professionalLabel">Bairro</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalInfoForm.neighborhood}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, neighborhood: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>

                      <label className="ge-professionalField" style={{ gridColumn: 'span 5' }}>
                        <div className="ge-professionalLabel">Cidade</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalInfoForm.city}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, city: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>

                      <label className="ge-professionalField" style={{ gridColumn: 'span 2' }}>
                        <div className="ge-professionalLabel">UF</div>
                        <select
                          className="ge-select"
                          value={addProfessionalInfoForm.state}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, state: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
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

                      <label className="ge-professionalField" style={{ gridColumn: 'span 5' }}>
                        <div className="ge-professionalLabel">País</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalInfoForm.country}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, country: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>

                      <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                        <div className="ge-professionalLabel">CEP</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalInfoForm.cep}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, cep: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>
                    </div>

                    <div className="ge-professionalDivider" />

                    <div style={{ display: 'grid', gap: 10 }}>
                      <div className="ge-professionalSectionTitle">Contatos de emergência</div>

                      {addProfessionalInfoForm.emergencyContacts.length === 0 ? (
                        <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 700 }}>Nenhum contato de emergência adicionado.</div>
                      ) : (
                        <div style={{ display: 'grid', gap: 10 }}>
                          {addProfessionalInfoForm.emergencyContacts.map((c) => (
                            <div key={c.id} className="ge-professionalFormGrid" style={{ alignItems: 'end' }}>
                              <label className="ge-professionalField" style={{ gridColumn: 'span 6' }}>
                                <div className="ge-professionalLabel">Nome</div>
                                <input
                                  className="ge-input"
                                  type="text"
                                  value={c.name}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setAddProfessionalInfoForm((prev) => ({
                                      ...prev,
                                      emergencyContacts: prev.emergencyContacts.map((item) =>
                                        item.id === c.id ? { ...item, name: value } : item,
                                      ),
                                    }))
                                  }}
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                />
                              </label>

                              <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                                <div className="ge-professionalLabel">Telefone</div>
                                <input
                                  className="ge-input"
                                  type="tel"
                                  value={c.phone}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setAddProfessionalInfoForm((prev) => ({
                                      ...prev,
                                      emergencyContacts: prev.emergencyContacts.map((item) =>
                                        item.id === c.id ? { ...item, phone: value } : item,
                                      ),
                                    }))
                                  }}
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                />
                              </label>

                              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'end' }}>
                                <button
                                  type="button"
                                  className="ge-buttonDanger ge-buttonIconOnly"
                                  onClick={() =>
                                    setAddProfessionalInfoForm((prev) => ({
                                      ...prev,
                                      emergencyContacts: prev.emergencyContacts.filter((item) => item.id !== c.id),
                                    }))
                                  }
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                  aria-label="Remover"
                                  title="Remover"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M6 7l1 14h10l1-14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                    <path d="M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <button
                          type="button"
                          className="ge-buttonSecondary"
                          onClick={() => {
                            let id = `${Date.now()}-${Math.random()}`
                            try {
                              if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
                                id = (crypto as Crypto).randomUUID()
                              }
                            } catch {
                              void 0
                            }
                            setAddProfessionalInfoForm((prev) => ({
                              ...prev,
                              emergencyContacts: [...prev.emergencyContacts, { id, name: '', phone: '' }],
                            }))
                          }}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        >
                          + Adicionar contato
                        </button>
                      </div>
                    </div>

                    {canSeeProfessionalDetails ? (
                      <>
                        <div className="ge-professionalDivider" />

                        <div className="ge-professionalSectionTitle">Detalhes</div>
                        <textarea
                          className="ge-input ge-professionalTextarea"
                          value={addProfessionalInfoForm.details}
                          onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, details: e.target.value }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </>
                    ) : null}

                    {addProfessionalSaveAttempted && !addProfessionalFormValid ? (
                      <div className="ge-errorText" style={{ marginTop: 10 }}>
                        Preencha os campos obrigatórios. Verifique o e-mail e o CPF.
                      </div>
                    ) : null}

                    {addProfessionalMutation.error ? (
                      <div className="ge-errorText" style={{ marginTop: 10 }}>
                        {(() => {
                          const err = addProfessionalMutation.error as { status?: number; message?: string }
                          if (err?.status === 402) return 'Limite do plano atingido. Vá em “Planos” para ajustar sua assinatura.'
                          return err?.message ?? 'Não foi possível salvar.'
                        })()}
                      </div>
                    ) : null}
                  </div>
                ) : addProfessionalDialog.tabId === 'grupos' ? (
                  <div className="ge-professionalGroupsTab">
                    <div className="ge-professionalGroupsHeader">
                      <div className="ge-professionalGroupsHeaderText">
                        Selecione os locais, setores e grupos ao qual o usuário irá pertencer.
                      </div>

                      <label className="ge-professionalCheckboxRow" style={{ justifySelf: 'end' }}>
                        <input
                          type="checkbox"
                          checked={addProfessionalGroupsOnlySelected}
                          onChange={(e) => setAddProfessionalGroupsOnlySelected(e.target.checked)}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                        <span>Exibir apenas grupos selecionados</span>
                      </label>
                    </div>

                    <div className="ge-professionalGroupsToolbar">
                      <input
                        className="ge-input"
                        type="text"
                        placeholder="Pesquisar local, setor ou grupo"
                        value={addProfessionalGroupsQuery}
                        onChange={(e) => setAddProfessionalGroupsQuery(e.target.value)}
                        disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                      />

                      {(() => {
                        const q = addProfessionalGroupsQuery.trim().toLowerCase()
                        const locations = locationsQuery.data ?? []
                        const sectors = sectorsQuery.data ?? []

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

                        const hasSearch = Boolean(q)
                        const matches = (name: string) => (!hasSearch ? true : name.toLowerCase().includes(q))

                        type Row =
                          | { id: string; kind: 'location'; label: string; locationId: string; selected: boolean; indeterminate: boolean }
                          | { id: string; kind: 'sector'; label: string; sectorId: string; selected: boolean; nested: boolean }

                        const rows: Row[] = []
                        for (const l of locations) {
                          const children = sectorsByLocation[l.id] ?? []
                          const childSelectedCount = children.reduce((acc, s) => acc + (addProfessionalSelectedSectorIds[s.id] ? 1 : 0), 0)
                          const locationSelected = Boolean(addProfessionalSelectedLocationIds[l.id])
                          const locationChecked = locationSelected || (children.length > 0 && childSelectedCount === children.length)
                          const locationIndeterminate = !locationChecked && childSelectedCount > 0

                          const locationMatches = matches(l.name)
                          const anyChildMatches = children.some((s) => matches(s.name))

                          const locationVisibleBySearch = locationMatches || anyChildMatches
                          const locationVisibleBySelection =
                            !addProfessionalGroupsOnlySelected || locationChecked || locationIndeterminate || children.some((s) => addProfessionalSelectedSectorIds[s.id])

                          if (locationVisibleBySearch && locationVisibleBySelection) {
                            rows.push({
                              id: `loc:${l.id}`,
                              kind: 'location',
                              label: l.name,
                              locationId: l.id,
                              selected: locationChecked,
                              indeterminate: locationIndeterminate,
                            })

                            for (const s of children) {
                              const sectorSelected = Boolean(addProfessionalSelectedSectorIds[s.id])
                              const sectorVisibleBySearch = locationMatches || matches(s.name)
                              const sectorVisibleBySelection = !addProfessionalGroupsOnlySelected || sectorSelected || locationChecked || locationIndeterminate
                              if (sectorVisibleBySearch && sectorVisibleBySelection) {
                                rows.push({
                                  id: `sec:${s.id}`,
                                  kind: 'sector',
                                  label: s.name,
                                  sectorId: s.id,
                                  selected: sectorSelected,
                                  nested: true,
                                })
                              }
                            }
                          }
                        }

                        for (const s of sectorsWithoutLocation) {
                          const sectorSelected = Boolean(addProfessionalSelectedSectorIds[s.id])
                          const sectorVisibleBySearch = matches(s.name)
                          const sectorVisibleBySelection = !addProfessionalGroupsOnlySelected || sectorSelected
                          if (sectorVisibleBySearch && sectorVisibleBySelection) {
                            rows.push({
                              id: `sec:${s.id}`,
                              kind: 'sector',
                              label: s.name,
                              sectorId: s.id,
                              selected: sectorSelected,
                              nested: false,
                            })
                          }
                        }

                        const total = locations.length + sectors.length
                        const shown = rows.length

                        const IndeterminateCheckbox = ({
                          checked,
                          indeterminate,
                          onChange,
                          disabled,
                        }: {
                          checked: boolean
                          indeterminate: boolean
                          onChange: (checked: boolean) => void
                          disabled: boolean
                        }) => {
                          const ref = useRef<HTMLInputElement | null>(null)
                          useEffect(() => {
                            if (!ref.current) return
                            ref.current.indeterminate = indeterminate
                          }, [indeterminate])
                          return (
                            <input
                              ref={ref}
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => onChange(e.target.checked)}
                              disabled={disabled}
                            />
                          )
                        }

                        return (
                          <>
                            <div className="ge-professionalGroupsCount">{`Exibindo ${shown} de ${total}`}</div>

                            <div className="ge-professionalGroupsList">
                              {locationsQuery.isLoading || sectorsQuery.isLoading ? (
                                <div className="ge-professionalGroupsEmpty">Carregando...</div>
                              ) : null}

                              {locationsQuery.error || sectorsQuery.error ? (
                                <div className="ge-errorText">Não foi possível carregar locais e setores.</div>
                              ) : null}

                              {!locationsQuery.isLoading && !sectorsQuery.isLoading && !locationsQuery.error && !sectorsQuery.error && rows.length === 0 ? (
                                <div className="ge-professionalGroupsEmpty">Nenhum resultado encontrado.</div>
                              ) : null}

                              {rows.map((r) => {
                                const disabled = !canManageProfessionals || addProfessionalMutation.isPending
                                if (r.kind === 'location') {
                                  const children = (sectorsQuery.data ?? []).filter((s) => s.locationId === r.locationId)
                                  return (
                                    <div key={r.id} className="ge-professionalGroupRow">
                                      <div className="ge-professionalGroupRowLeft">
                                        <IndeterminateCheckbox
                                          checked={r.selected}
                                          indeterminate={r.indeterminate}
                                          disabled={disabled}
                                          onChange={(checked) => {
                                            const locId = r.locationId
                                            setAddProfessionalSelectedLocationIds((prev) => {
                                              if (checked) return { ...prev, [locId]: true }
                                              const next = { ...prev }
                                              delete next[locId]
                                              return next
                                            })
                                            setAddProfessionalSelectedSectorIds((prev) => {
                                              const next = { ...prev }
                                              if (checked) {
                                                for (const c of children) next[c.id] = true
                                              } else {
                                                for (const c of children) delete next[c.id]
                                              }
                                              return next
                                            })
                                          }}
                                        />
                                        <span className="ge-professionalGroupRowLabel">{r.label}</span>
                                      </div>
                                      <span className="ge-professionalGroupPill ge-professionalGroupPillLocal">Local</span>
                                    </div>
                                  )
                                }

                                return (
                                  <div
                                    key={r.id}
                                    className={`ge-professionalGroupRow ${r.nested ? 'ge-professionalGroupRowNested' : ''}`}
                                  >
                                    <div className="ge-professionalGroupRowLeft">
                                      <input
                                        type="checkbox"
                                        checked={r.selected}
                                        onChange={(e) => {
                                          const checked = e.target.checked
                                          const sectorId = r.sectorId
                                          setAddProfessionalSelectedSectorIds((prev) => {
                                            if (checked) return { ...prev, [sectorId]: true }
                                            const next = { ...prev }
                                            delete next[sectorId]
                                            return next
                                          })
                                        }}
                                        disabled={disabled}
                                      />
                                      <span className="ge-professionalGroupRowLabel">{r.label}</span>
                                    </div>
                                    <span className="ge-professionalGroupPill ge-professionalGroupPillSector">Setor</span>
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                ) : addProfessionalDialog.tabId === 'dados-bancarios' ? (
                  <div className="ge-professionalBankTab">
                    <div className="ge-professionalBankHeader">
                      <div className="ge-professionalBankHeaderLeft">
                        <div className="ge-professionalBankHeaderTitle">Dados bancários do profissional</div>
                      </div>
                    </div>

                    <div className="ge-professionalBankCard">
                      <div className="ge-professionalBankCardTop">
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <input
                            className="ge-input"
                            type="text"
                            value={addProfessionalBankAccount.draft.alias}
                            onChange={(e) =>
                              setAddProfessionalBankAccount((prev) => ({ ...prev, draft: { ...prev.draft, alias: e.target.value } }))
                            }
                            disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            placeholder="Conta Pessoal"
                            style={{ width: 240, maxWidth: '55vw' }}
                          />

                          <button
                            type="button"
                            className="ge-buttonSecondary"
                            onClick={() =>
                              setAddProfessionalBankAccount((prev) => ({ ...prev, draft: { ...prev.draft, primary: !prev.draft.primary } }))
                            }
                            disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
                          >
                            <span
                              style={{
                                color: addProfessionalBankAccount.draft.primary ? '#f5c542' : 'rgba(127,127,127,0.7)',
                                fontSize: 24,
                                lineHeight: 1,
                              }}
                            >
                              {addProfessionalBankAccount.draft.primary ? '★' : '☆'}
                            </span>
                            Principal
                          </button>
                        </div>
                        <div className="ge-professionalBankCardTopActions">
                          <button
                            type="button"
                            className="ge-buttonSecondary"
                            onClick={() => {
                              setAddProfessionalBankAccount((prev) => ({ ...prev, draft: prev.saved }))
                            }}
                            disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="ge-buttonPrimary"
                            onClick={() => {
                              setAddProfessionalBankAccount((prev) => ({
                                saved: prev.draft,
                                draft: prev.draft,
                                principal: prev.draft.primary,
                              }))
                            }}
                            disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                          >
                            Salvar
                          </button>
                        </div>
                      </div>

                      <div style={{ padding: 12 }}>
                        <div className="ge-professionalFormGrid">
                          <label className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                            <div className="ge-professionalLabel">Tipo</div>
                            <select
                              className="ge-select"
                              value={addProfessionalBankAccount.draft.transactionType}
                              onChange={(e) =>
                                setAddProfessionalBankAccount((prev) => ({
                                  ...prev,
                                  draft: { ...prev.draft, transactionType: e.target.value as AddProfessionalBankAccountForm['transactionType'] },
                                }))
                              }
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            >
                              <option value="PIX">PIX</option>
                              <option value="TED">TED</option>
                            </select>
                          </label>

                          {addProfessionalBankAccount.draft.transactionType === 'PIX' ? (
                            <label className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                              <div className="ge-professionalLabel">Chave pix</div>
                              <input
                                className="ge-input"
                                type="text"
                                value={addProfessionalBankAccount.draft.pixKey}
                                onChange={(e) =>
                                  setAddProfessionalBankAccount((prev) => ({ ...prev, draft: { ...prev.draft, pixKey: e.target.value } }))
                                }
                                disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                              />
                            </label>
                          ) : (
                            <>
                              <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                                <div className="ge-professionalLabel">Banco</div>
                                <select
                                  className="ge-select"
                                  value={addProfessionalBankAccount.draft.bankCode}
                                  onChange={(e) =>
                                    setAddProfessionalBankAccount((prev) => ({
                                      ...prev,
                                      draft: { ...prev.draft, bankCode: e.target.value },
                                    }))
                                  }
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                >
                                  <option value="">Selecione um banco</option>
                                  {[
                                    { code: '001', name: 'Banco do Brasil' },
                                    { code: '237', name: 'Bradesco' },
                                    { code: '341', name: 'Itaú' },
                                    { code: '104', name: 'Caixa' },
                                    { code: '033', name: 'Santander' },
                                    { code: '260', name: 'Nu Pagamentos' },
                                    { code: '077', name: 'Inter' },
                                  ].map((b) => (
                                    <option key={b.code} value={b.code}>
                                      {`${b.code} - ${b.name}`}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="ge-professionalField" style={{ gridColumn: 'span 2' }}>
                                <div className="ge-professionalLabel">Agência</div>
                                <input
                                  className="ge-input"
                                  type="text"
                                  value={addProfessionalBankAccount.draft.agency}
                                  onChange={(e) =>
                                    setAddProfessionalBankAccount((prev) => ({
                                      ...prev,
                                      draft: { ...prev.draft, agency: e.target.value },
                                    }))
                                  }
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                />
                              </label>

                              <label className="ge-professionalField" style={{ gridColumn: 'span 3' }}>
                                <div className="ge-professionalLabel">Conta</div>
                                <input
                                  className="ge-input"
                                  type="text"
                                  value={addProfessionalBankAccount.draft.accountNumber}
                                  onChange={(e) =>
                                    setAddProfessionalBankAccount((prev) => ({
                                      ...prev,
                                      draft: { ...prev.draft, accountNumber: e.target.value },
                                    }))
                                  }
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                />
                              </label>

                              <label className="ge-professionalField" style={{ gridColumn: 'span 3' }}>
                                <div className="ge-professionalLabel">Operação</div>
                                <select
                                  className="ge-select"
                                  value={addProfessionalBankAccount.draft.operation}
                                  onChange={(e) =>
                                    setAddProfessionalBankAccount((prev) => ({
                                      ...prev,
                                      draft: { ...prev.draft, operation: e.target.value as AddProfessionalBankAccountForm['operation'] },
                                    }))
                                  }
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                >
                                  <option value="">Selecione</option>
                                  <option value="001">001</option>
                                  <option value="013">013</option>
                                </select>
                              </label>

                              <label className="ge-professionalField" style={{ gridColumn: 'span 2' }}>
                                <div className="ge-professionalLabel">CPF ou CNPJ</div>
                                <select
                                  className="ge-select"
                                  value={addProfessionalBankAccount.draft.documentType}
                                  onChange={(e) =>
                                    setAddProfessionalBankAccount((prev) => ({
                                      ...prev,
                                      draft: { ...prev.draft, documentType: e.target.value as AddProfessionalBankAccountForm['documentType'] },
                                    }))
                                  }
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                >
                                  <option value="CPF">CPF</option>
                                  <option value="CNPJ">CNPJ</option>
                                </select>
                              </label>

                              <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                                <div className="ge-professionalLabel">Documento</div>
                                <input
                                  className="ge-input"
                                  type="text"
                                  value={addProfessionalBankAccount.draft.documentNumber}
                                  onChange={(e) =>
                                    setAddProfessionalBankAccount((prev) => ({
                                      ...prev,
                                      draft: { ...prev.draft, documentNumber: e.target.value },
                                    }))
                                  }
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                />
                              </label>

                              <label className="ge-professionalField" style={{ gridColumn: 'span 6' }}>
                                <div className="ge-professionalLabel">Nome ou Razão Social</div>
                                <input
                                  className="ge-input"
                                  type="text"
                                  value={addProfessionalBankAccount.draft.fullNameOrBusinessName}
                                  onChange={(e) =>
                                    setAddProfessionalBankAccount((prev) => ({
                                      ...prev,
                                      draft: { ...prev.draft, fullNameOrBusinessName: e.target.value },
                                    }))
                                  }
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                />
                              </label>
                            </>
                          )}

                          <label className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                            <div className="ge-professionalLabel">Observação</div>
                            <input
                              className="ge-input"
                              type="text"
                              value={addProfessionalBankAccount.draft.observation}
                              onChange={(e) =>
                                setAddProfessionalBankAccount((prev) => ({
                                  ...prev,
                                  draft: { ...prev.draft, observation: e.target.value },
                                }))
                              }
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                              placeholder="Opcional"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : addProfessionalDialog.tabId === 'contratacao' ? (
                  <div className="ge-professionalHiringTab">
                    <div className="ge-professionalHiringHeader">Adicione os períodos de contratação para o profissional.</div>

                    <div className="ge-professionalHiringTable">
                      <div className="ge-professionalHiringTableHeader">
                        <div className="ge-professionalHiringHeaderCell" />
                        <div className="ge-professionalHiringHeaderCell" />
                        <div className="ge-professionalHiringHeaderCell ge-professionalHiringHeaderCellRight">
                          <div className="ge-professionalHiringCellRight">
                            <button
                              type="button"
                              className="ge-buttonSecondary"
                              onClick={() =>
                                setAddProfessionalHiring((prev) => ({ ...prev, draft: defaultAddProfessionalHiringPeriodDraft }))
                              }
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              className="ge-buttonPrimary"
                              onClick={() => {
                                const draft = addProfessionalHiring.draft
                                if (!draft.type.trim() || !draft.start) return
                                setAddProfessionalHiring((prev) => ({
                                  items: [...prev.items, prev.draft],
                                  draft: defaultAddProfessionalHiringPeriodDraft,
                                }))
                              }}
                              disabled={
                                !canManageProfessionals ||
                                addProfessionalMutation.isPending ||
                                !addProfessionalHiring.draft.type.trim() ||
                                !addProfessionalHiring.draft.start
                              }
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="ge-professionalHiringRow">
                        <div className="ge-professionalHiringCell">
                          <label className="ge-professionalField">
                            <div className="ge-professionalLabel">Tipo *</div>
                            <select
                              className="ge-select"
                              value={addProfessionalHiring.draft.type}
                              onChange={(e) =>
                                setAddProfessionalHiring((prev) => ({ ...prev, draft: { ...prev.draft, type: e.target.value } }))
                              }
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            >
                              {[
                                'CLT',
                                'Cooperado',
                                'Estatutário',
                                'Graduação',
                                'Não cooperado',
                                'PJ',
                                'Pós-Graduação',
                                'RT',
                                'Temporário',
                              ].map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="ge-professionalHiringCell" style={{ gridColumn: '2 / -1' }}>
                          <div className="ge-professionalHiringPeriodGrid">
                            <label className="ge-professionalField">
                              <div className="ge-professionalLabel">Início *</div>
                              <input
                                className="ge-input"
                                type="date"
                                value={addProfessionalHiring.draft.start}
                                onChange={(e) =>
                                  setAddProfessionalHiring((prev) => ({ ...prev, draft: { ...prev.draft, start: e.target.value } }))
                                }
                                disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                              />
                            </label>

                            <label className="ge-professionalField">
                              <div className="ge-professionalLabel">Fim</div>
                              <input
                                className="ge-input"
                                type="date"
                                value={addProfessionalHiring.draft.end}
                                onChange={(e) =>
                                  setAddProfessionalHiring((prev) => ({ ...prev, draft: { ...prev.draft, end: e.target.value } }))
                                }
                                disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="ge-professionalHiringCell" style={{ gridColumn: '1 / -1' }}>
                          <label className="ge-professionalField">
                            <div className="ge-professionalLabel">Comentário</div>
                            <input
                              className="ge-input"
                              type="text"
                              value={addProfessionalHiring.draft.comment}
                              onChange={(e) =>
                                setAddProfessionalHiring((prev) => ({ ...prev, draft: { ...prev.draft, comment: e.target.value } }))
                              }
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                              placeholder="Opcional"
                            />
                          </label>
                        </div>
                      </div>

                      {addProfessionalHiring.items.length > 0 ? (
                        <div className="ge-professionalHiringItems">
                          {addProfessionalHiring.items.map((p, idx) => (
                            <div key={`${p.type}-${p.start}-${p.end}-${idx}`} className="ge-professionalHiringItemRow">
                              <div className="ge-professionalHiringItemCell">{p.type}</div>
                              <div className="ge-professionalHiringItemCell">
                                <span>{p.start || '-'}</span>
                                <span style={{ opacity: 0.65, fontWeight: 900, margin: '0 8px' }}>→</span>
                                <span>{p.end || '-'}</span>
                              </div>
                              <div className="ge-professionalHiringItemCell">{p.comment || '-'}</div>
                              <div className="ge-professionalHiringItemCell ge-professionalHiringItemCellRight">
                                <button
                                  type="button"
                                  className="ge-buttonDanger ge-buttonIconOnly"
                                  onClick={() =>
                                    setAddProfessionalHiring((prev) => ({
                                      ...prev,
                                      items: prev.items.filter((_, i) => i !== idx),
                                    }))
                                  }
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                  aria-label="Remover"
                                  title="Remover"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M6 7l1 14h10l1-14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                    <path d="M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : addProfessionalDialog.tabId === 'afastamentos' ? (
                  <div className="ge-professionalAbsencesTab">
                    <div className="ge-professionalAbsencesHeader">
                      Marque disponibilidades e indisponibilidades do profissional (dia, período ou dias da semana).
                    </div>

                    <div className="ge-professionalAbsencesTable">
                      <div className="ge-professionalAbsencesTableHeader">
                        <div className="ge-professionalAbsencesHeaderCell ge-professionalAbsencesSpan3" />
                        <div className="ge-professionalAbsencesHeaderCell ge-professionalAbsencesHeaderCellRight">
                          <div className="ge-professionalAbsencesCellRight">
                            <button
                              type="button"
                              className="ge-buttonSecondary"
                              onClick={() =>
                                setAddProfessionalAvailability((prev) => ({
                                  ...prev,
                                  draft: defaultAddProfessionalAvailabilityDraft,
                                }))
                              }
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              className="ge-buttonPrimary"
                              onClick={() => {
                                const draft = addProfessionalAvailability.draft
                                if (draft.kind === 'DIA') {
                                  if (!draft.day) return
                                } else if (draft.kind === 'PERIODO') {
                                  if (!draft.start || !draft.end) return
                                  if (draft.end < draft.start) return
                                } else {
                                  if (draft.weekdays.length === 0) return
                                }
                                setAddProfessionalAvailability((prev) => ({
                                  items: [...prev.items, prev.draft],
                                  draft: defaultAddProfessionalAvailabilityDraft,
                                }))
                              }}
                              disabled={
                                !canManageProfessionals ||
                                addProfessionalMutation.isPending ||
                                (addProfessionalAvailability.draft.kind === 'DIA'
                                  ? !addProfessionalAvailability.draft.day
                                  : addProfessionalAvailability.draft.kind === 'PERIODO'
                                    ? !addProfessionalAvailability.draft.start ||
                                      !addProfessionalAvailability.draft.end ||
                                      addProfessionalAvailability.draft.end < addProfessionalAvailability.draft.start
                                    : addProfessionalAvailability.draft.weekdays.length === 0)
                              }
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="ge-professionalAbsencesRow">
                        <div className="ge-professionalAbsencesCell ge-professionalAbsencesSpanAll">
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                              gap: 10,
                              alignItems: 'end',
                            }}
                          >
                            <label className="ge-professionalField">
                              <div className="ge-professionalLabel">Tipo de disponibilidade *</div>
                              <select
                                className="ge-select"
                                value={addProfessionalAvailability.draft.kind}
                                onChange={(e) => {
                                  const kind = e.target.value as AddProfessionalAvailabilityKind
                                  setAddProfessionalAvailability((prev) => ({
                                    ...prev,
                                    draft: {
                                      ...prev.draft,
                                      kind,
                                      day: kind === 'DIA' ? prev.draft.day : '',
                                      start: kind === 'PERIODO' ? prev.draft.start : '',
                                      end: kind === 'PERIODO' ? prev.draft.end : '',
                                      weekdays: kind === 'DIAS_SEMANA' ? prev.draft.weekdays : [],
                                    },
                                  }))
                                }}
                                disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                              >
                                <option value="DIA">Dia</option>
                                <option value="PERIODO">Período</option>
                                <option value="DIAS_SEMANA">Dias da semana</option>
                              </select>
                            </label>

                            <label className="ge-professionalField">
                              <div className="ge-professionalLabel">Situação *</div>
                              <select
                                className="ge-select"
                                value={addProfessionalAvailability.draft.status}
                                onChange={(e) => {
                                  const status = e.target.value as AddProfessionalAvailabilityStatus
                                  setAddProfessionalAvailability((prev) => ({ ...prev, draft: { ...prev.draft, status } }))
                                }}
                                disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                              >
                                <option value="DISPONIVEL">Disponível</option>
                                <option value="INDISPONIVEL">Indisponível</option>
                              </select>
                            </label>
                          </div>
                        </div>

                        <div className="ge-professionalAbsencesCell ge-professionalAbsencesSpanAll">
                          <div style={{ display: 'grid', gap: 10 }}>
                            {addProfessionalAvailability.draft.kind === 'DIA' ? (
                              <label className="ge-professionalField">
                                <div className="ge-professionalLabel">Data *</div>
                                <input
                                  className="ge-input"
                                  type="date"
                                  value={addProfessionalAvailability.draft.day}
                                  onChange={(e) =>
                                    setAddProfessionalAvailability((prev) => ({ ...prev, draft: { ...prev.draft, day: e.target.value } }))
                                  }
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                />
                              </label>
                            ) : addProfessionalAvailability.draft.kind === 'PERIODO' ? (
                              <div className="ge-professionalAbsencesPeriodGrid">
                                <label className="ge-professionalField">
                                  <div className="ge-professionalLabel">Início *</div>
                                  <input
                                    className="ge-input"
                                    type="date"
                                    value={addProfessionalAvailability.draft.start}
                                    onChange={(e) =>
                                      setAddProfessionalAvailability((prev) => ({ ...prev, draft: { ...prev.draft, start: e.target.value } }))
                                    }
                                    disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                  />
                                </label>

                                <label className="ge-professionalField">
                                  <div className="ge-professionalLabel">Fim *</div>
                                  <input
                                    className="ge-input"
                                    type="date"
                                    value={addProfessionalAvailability.draft.end}
                                    onChange={(e) =>
                                      setAddProfessionalAvailability((prev) => ({ ...prev, draft: { ...prev.draft, end: e.target.value } }))
                                    }
                                    disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                  />
                                </label>
                              </div>
                            ) : (
                              <div style={{ display: 'grid', gap: 8 }}>
                                <div className="ge-professionalLabel">Dias da semana *</div>
                                <div className="ge-inlineForm" style={{ gap: 10 }}>
                                  {[
                                    { value: 'SEG', label: 'Seg' },
                                    { value: 'TER', label: 'Ter' },
                                    { value: 'QUA', label: 'Qua' },
                                    { value: 'QUI', label: 'Qui' },
                                    { value: 'SEX', label: 'Sex' },
                                    { value: 'SAB', label: 'Sáb' },
                                    { value: 'DOM', label: 'Dom' },
                                  ].map((d) => {
                                    const checked = addProfessionalAvailability.draft.weekdays.includes(d.value)
                                    return (
                                      <label key={d.value} className="ge-professionalCheckboxRow" style={{ fontSize: 12, opacity: 0.9 }}>
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(e) => {
                                            const nextChecked = e.target.checked
                                            setAddProfessionalAvailability((prev) => {
                                              const weekdays = prev.draft.weekdays
                                              if (nextChecked && !weekdays.includes(d.value)) {
                                                return { ...prev, draft: { ...prev.draft, weekdays: [...weekdays, d.value] } }
                                              }
                                              if (!nextChecked) {
                                                return { ...prev, draft: { ...prev.draft, weekdays: weekdays.filter((w) => w !== d.value) } }
                                              }
                                              return prev
                                            })
                                          }}
                                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                        />
                                        {d.label}
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            <label className="ge-professionalField">
                              <div className="ge-professionalLabel">Comentário</div>
                              <input
                                className="ge-input"
                                type="text"
                                value={addProfessionalAvailability.draft.comment}
                                onChange={(e) =>
                                  setAddProfessionalAvailability((prev) => ({ ...prev, draft: { ...prev.draft, comment: e.target.value } }))
                                }
                                disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                placeholder="Opcional"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {addProfessionalAvailability.items.length > 0 ? (
                        <div className="ge-professionalAbsencesItems">
                          {addProfessionalAvailability.items.map((p, idx) => (
                            <div
                              key={`${p.kind}-${p.status}-${p.day}-${p.start}-${p.end}-${p.weekdays.join('-')}-${idx}`}
                              className="ge-professionalAbsencesItemRow"
                            >
                              <div className="ge-professionalAbsencesItemCell ge-professionalAbsencesSpan3">
                                {(() => {
                                  const statusLabel = p.status === 'DISPONIVEL' ? 'Disponível' : 'Indisponível'
                                  const kindLabel = p.kind === 'DIA' ? 'Dia' : p.kind === 'PERIODO' ? 'Período' : 'Dias da semana'

                                  const whenText =
                                    p.kind === 'DIA'
                                      ? p.day
                                      : p.kind === 'PERIODO'
                                        ? p.start && p.end
                                          ? `${p.start} → ${p.end}`
                                          : p.start || p.end
                                        : p.weekdays.length > 0
                                          ? p.weekdays
                                              .map((w) => {
                                                if (w === 'SEG') return 'Seg'
                                                if (w === 'TER') return 'Ter'
                                                if (w === 'QUA') return 'Qua'
                                                if (w === 'QUI') return 'Qui'
                                                if (w === 'SEX') return 'Sex'
                                                if (w === 'SAB') return 'Sáb'
                                                if (w === 'DOM') return 'Dom'
                                                return w
                                              })
                                              .join(', ')
                                          : ''

                                  const commentText = p.comment.trim()

                                  const parts = [statusLabel, kindLabel, whenText, commentText].filter(Boolean)

                                  return parts.map((part, partIdx) => (
                                    <span key={`${idx}-${partIdx}`}>
                                      {partIdx > 0 ? <span style={{ opacity: 0.65, fontWeight: 900, margin: '0 8px' }}>-</span> : null}
                                      {part}
                                    </span>
                                  ))
                                })()}
                              </div>
                              <div className="ge-professionalAbsencesItemCell ge-professionalAbsencesItemCellRight">
                                <button
                                  type="button"
                                  className="ge-buttonDanger ge-buttonIconOnly"
                                  onClick={() =>
                                    setAddProfessionalAvailability((prev) => ({
                                      ...prev,
                                      items: prev.items.filter((_, i) => i !== idx),
                                    }))
                                  }
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                  aria-label="Remover"
                                  title="Remover"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M6 7l1 14h10l1-14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                    <path d="M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : addProfessionalDialog.tabId === 'bonificacao' ? (
                  <div className="ge-professionalBonusTab">
                    <div className="ge-professionalBonusHeader">Adicione bonificações para o profissional.</div>

                    <div className="ge-professionalBonusTable">
                      <div className="ge-professionalBonusTableHeader">
                        <div className="ge-professionalBonusHeaderCell" />
                        <div className="ge-professionalBonusHeaderCell" />
                        <div className="ge-professionalBonusHeaderCell" />
                        <div className="ge-professionalBonusHeaderCell ge-professionalBonusHeaderCellRight">
                          <div className="ge-professionalBonusCellRight">
                            <button
                              type="button"
                              className="ge-buttonSecondary"
                              onClick={() => setAddProfessionalBonuses((prev) => ({ ...prev, draft: defaultAddProfessionalBonusDraft }))}
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              className="ge-buttonPrimary"
                              onClick={() => {
                                const draft = addProfessionalBonuses.draft
                                if (!draft.bonusType.trim() || !draft.sectorId || !draft.start) return
                                setAddProfessionalBonuses((prev) => ({
                                  items: [...prev.items, prev.draft],
                                  draft: defaultAddProfessionalBonusDraft,
                                }))
                              }}
                              disabled={
                                !canManageProfessionals ||
                                addProfessionalMutation.isPending ||
                                !addProfessionalBonuses.draft.bonusType.trim() ||
                                !addProfessionalBonuses.draft.sectorId ||
                                !addProfessionalBonuses.draft.start
                              }
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="ge-professionalBonusRow">
                        <div className="ge-professionalBonusCell" style={{ gridColumn: '1 / -1' }}>
                          <label className="ge-professionalField ge-professionalBonusNarrow">
                            <div className="ge-professionalLabel">Tipo de Bonificação *</div>
                            <select
                              className="ge-select"
                              value={addProfessionalBonuses.draft.bonusType}
                              onChange={(e) =>
                                setAddProfessionalBonuses((prev) => ({ ...prev, draft: { ...prev.draft, bonusType: e.target.value } }))
                              }
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            >
                              {[
                                'Bonificação FIXA',
                                'Bonificação Fixa',
                                'Bonificação por Mês (%)',
                                'Bonificação por Mês (R$)',
                                'Bonificação Por Plantão (%)',
                                'Bonificação Por Plantão (R$)',
                                'Bonificação por Trajeto',
                                'Bonificação Trajeto Coordenador',
                              ].map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="ge-professionalBonusCell" style={{ gridColumn: '1 / -1' }}>
                          <label className="ge-professionalField ge-professionalBonusNarrow">
                            <div className="ge-professionalLabel">Setor *</div>
                            <select
                              className="ge-select"
                              value={addProfessionalBonuses.draft.sectorId}
                              onChange={(e) =>
                                setAddProfessionalBonuses((prev) => ({ ...prev, draft: { ...prev.draft, sectorId: e.target.value } }))
                              }
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            >
                              <option value="">Selecione ...</option>
                              {(sectorsQuery.data ?? [])
                                .slice()
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                            </select>
                          </label>
                        </div>

                        <div className="ge-professionalBonusCell" style={{ gridColumn: '1 / -1' }}>
                          <div className="ge-professionalBonusPeriodGrid ge-professionalBonusNarrow">
                            <label className="ge-professionalField">
                              <div className="ge-professionalLabel">Início *</div>
                              <input
                                className="ge-input"
                                type="date"
                                value={addProfessionalBonuses.draft.start}
                                onChange={(e) =>
                                  setAddProfessionalBonuses((prev) => ({ ...prev, draft: { ...prev.draft, start: e.target.value } }))
                                }
                                disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                              />
                            </label>

                            <label className="ge-professionalField">
                              <div className="ge-professionalLabel">Fim</div>
                              <input
                                className="ge-input"
                                type="date"
                                value={addProfessionalBonuses.draft.end}
                                onChange={(e) =>
                                  setAddProfessionalBonuses((prev) => ({ ...prev, draft: { ...prev.draft, end: e.target.value } }))
                                }
                                disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {addProfessionalBonuses.items.length > 0 ? (
                        <div className="ge-professionalBonusItems">
                          {addProfessionalBonuses.items.map((p, idx) => (
                            <div key={`${p.bonusType}-${p.sectorId}-${p.start}-${p.end}-${idx}`} className="ge-professionalBonusItemRow">
                              <div className="ge-professionalBonusItemCell">
                                <span>{p.start || '-'}</span>
                                <span style={{ opacity: 0.65, fontWeight: 900, margin: '0 8px' }}>→</span>
                                <span>{p.end || '-'}</span>
                              </div>
                              <div className="ge-professionalBonusItemCell">{p.bonusType}</div>
                              <div className="ge-professionalBonusItemCell">
                                {(sectorsQuery.data ?? []).find((s) => s.id === p.sectorId)?.name ?? '-'}
                              </div>
                              <div className="ge-professionalBonusItemCell ge-professionalBonusItemCellRight">
                                <button
                                  type="button"
                                  className="ge-buttonDanger ge-buttonIconOnly"
                                  onClick={() =>
                                    setAddProfessionalBonuses((prev) => ({
                                      ...prev,
                                      items: prev.items.filter((_, i) => i !== idx),
                                    }))
                                  }
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                  aria-label="Remover"
                                  title="Remover"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M6 7l1 14h10l1-14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                    <path d="M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : addProfessionalDialog.tabId === 'pendencias' ? (
                  <div className="ge-professionalSkillsTab">
                    <div className="ge-professionalSkillsHeader">Pendências</div>

                    <div className="ge-professionalSkillsSection">
                      <div className="ge-professionalSkillsSectionHeader" />
                      <div className="ge-professionalSkillsSectionBody">
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            className="ge-input"
                            type="text"
                            value={addProfessionalPendencies.draft}
                            onChange={(e) => setAddProfessionalPendencies((prev) => ({ ...prev, draft: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return
                              e.preventDefault()
                              const text = addProfessionalPendencies.draft.trim()
                              if (!text) return
                              let id = `${Date.now()}-${Math.random()}`
                              try {
                                if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
                                  id = (crypto as Crypto).randomUUID()
                                }
                              } catch {
                                void 0
                              }
                              setAddProfessionalPendencies((prev) => ({
                                draft: '',
                                items: [...prev.items, { id, text, done: false }],
                              }))
                            }}
                            disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            placeholder="Digite um item a fazer"
                            style={{ flex: '1 1 260px' }}
                          />
                          <button
                            type="button"
                            className="ge-buttonPrimary"
                            onClick={() => {
                              const text = addProfessionalPendencies.draft.trim()
                              if (!text) return
                              let id = `${Date.now()}-${Math.random()}`
                              try {
                                if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
                                  id = (crypto as Crypto).randomUUID()
                                }
                              } catch {
                                void 0
                              }
                              setAddProfessionalPendencies((prev) => ({
                                draft: '',
                                items: [...prev.items, { id, text, done: false }],
                              }))
                            }}
                            disabled={!canManageProfessionals || addProfessionalMutation.isPending || !addProfessionalPendencies.draft.trim()}
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="ge-professionalSkillsSection">
                      <div className="ge-professionalSkillsSectionHeader">Lista</div>
                      <div className="ge-professionalSkillsSectionBody">
                        <div style={{ display: 'grid', gap: 8 }}>
                          {addProfessionalPendencies.items.map((item) => (
                            <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                              <label className="ge-professionalCheckboxRow" style={{ alignItems: 'center', minWidth: 0 }}>
                                <input
                                  type="checkbox"
                                  checked={item.done}
                                  onChange={(e) => {
                                    const done = e.target.checked
                                    setAddProfessionalPendencies((prev) => ({
                                      ...prev,
                                      items: prev.items.map((i) => (i.id === item.id ? { ...i, done } : i)),
                                    }))
                                  }}
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                />
                                <span
                                  style={{
                                    fontWeight: 900,
                                    opacity: item.done ? 0.6 : 0.9,
                                    textDecoration: item.done ? 'line-through' : 'none',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {item.text}
                                </span>
                              </label>
                              <button
                                type="button"
                                className="ge-buttonDanger ge-buttonIconOnly"
                                onClick={() =>
                                  setAddProfessionalPendencies((prev) => ({
                                    ...prev,
                                    items: prev.items.filter((i) => i.id !== item.id),
                                  }))
                                }
                                disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                aria-label="Remover"
                                title="Remover"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                  <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                  <path d="M6 7l1 14h10l1-14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                  <path d="M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : addProfessionalDialog.tabId === 'documentos' ? (
                  <div className="ge-professionalDocumentsTab">
                    <div className="ge-professionalDocumentsHeader">Adicione, baixe ou remova os arquivos vinculados a este profissional.</div>

                    <div className="ge-professionalDocumentsTable">
                      <div className="ge-professionalDocumentsTableHeader">
                        <div className="ge-professionalDocumentsHeaderCell">Nome</div>
                        <div className="ge-professionalDocumentsHeaderCell ge-professionalDocumentsHeaderCellRight">Opções</div>
                      </div>

                      {addProfessionalDocuments.length > 0 ? (
                        <div className="ge-professionalDocumentsItems">
                          {addProfessionalDocuments.map((doc) => (
                            <div key={doc.id} className="ge-professionalDocumentsRow">
                              <button
                                type="button"
                                className="ge-professionalDocumentsName"
                                onClick={() => downloadLocalFile(doc.name, doc.file)}
                                disabled={!doc.file}
                              >
                                {doc.name}
                              </button>
                              <div className="ge-professionalDocumentsActions">
                                <button
                                  type="button"
                                  className="ge-professionalDocumentsIconButton ge-professionalDocumentsIconButtonDanger"
                                  onClick={() => setAddProfessionalDocuments((prev) => prev.filter((d) => d.id !== doc.id))}
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                  aria-label="Remover"
                                  title="Remover"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path
                                      d="M6 7l1 14h10l1-14"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinejoin="round"
                                    />
                                    <path d="M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="ge-professionalDocumentsIconButton ge-professionalDocumentsIconButtonPrimary"
                                  onClick={() => downloadLocalFile(doc.name, doc.file)}
                                  disabled={!doc.file}
                                  aria-label="Baixar"
                                  title="Baixar"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M8 11l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path
                                      d="M5 21h14"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="ge-professionalDocumentsAddWrap">
                        <button
                          type="button"
                          className="ge-professionalDocumentsAdd"
                          onClick={() => addProfessionalDocumentsInputRef.current?.click()}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        >
                          + Adicionar
                        </button>
                        <input
                          ref={addProfessionalDocumentsInputRef}
                          type="file"
                          style={{ display: 'none' }}
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? [])
                            if (files.length === 0) return
                            setAddProfessionalDocuments((prev) => [
                              ...prev,
                              ...files.map((file) => {
                                let id = `${Date.now()}-${Math.random()}`
                                try {
                                  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
                                    id = (crypto as Crypto).randomUUID()
                                  }
                                } catch {
                                  void 0
                                }
                                return { id, name: file.name, file }
                              }),
                            ])
                            e.target.value = ''
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontWeight: 900, opacity: 0.9 }}>
                      {addProfessionalDialogTabs.find((t) => t.id === addProfessionalDialog.tabId)?.label}
                    </div>
                    <div style={{ marginTop: 10, opacity: 0.75 }}>Conteúdo será colocado em seguida.</div>
                    <div style={{ height: 420 }} />
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default DashboardPage
