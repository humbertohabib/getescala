import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '../../../app/store'
import { apiFetch } from '../../../core/api/client'

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
                <section className="ge-card">
                  <div className="ge-cardTitle">{activeItem.label}</div>
                  <div className="ge-cardBody">Em breve</div>
                </section>
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
