export function formatMonthLabel(date: Date): string {
  try {
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
    return label.toUpperCase()
  } catch {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    return `${mm}/${yyyy}`
  }
}

export function formatMonthReference(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}-01`
}

export function toIsoUtcStartOfDayLocal(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)).toISOString()
}

export function buildMonthCells(monthDate: Date): Date[] {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const first = new Date(year, month, 1, 12, 0, 0)
  const dayOfWeek = first.getDay()
  const mondayIndex = (dayOfWeek + 6) % 7
  const start = new Date(year, month, 1 - mondayIndex, 12, 0, 0)
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12, 0, 0))
}

export function dateKeyLocal(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso)
  const pad2 = (v: number) => String(v).padStart(2, '0')
  const yyyy = date.getFullYear()
  const mm = pad2(date.getMonth() + 1)
  const dd = pad2(date.getDate())
  const hh = pad2(date.getHours())
  const min = pad2(date.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

export function formatTimeHHMM(iso: string): string {
  const d = new Date(iso)
  const pad2 = (v: number) => String(v).padStart(2, '0')
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  const dayOfWeek = d.getDay()
  const mondayIndex = (dayOfWeek + 6) % 7
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - mondayIndex, 12, 0, 0)
}

export function dateIso(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
