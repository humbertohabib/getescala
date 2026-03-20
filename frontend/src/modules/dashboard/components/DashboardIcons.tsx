type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | null

function badgeColorToCss(color: BadgeColor): string {
  if (color === 'blue') return '#2d7ef7'
  if (color === 'green') return '#2ecc71'
  if (color === 'yellow') return '#f1c40f'
  if (color === 'red') return '#e74c3c'
  return 'transparent'
}

export type IconName =
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

export function SvgIcon({ name, size = 20 }: { name: IconName; size?: number }) {
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

export function IconButton({
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
