export function normalizeNumberLikeBr(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const cleaned = trimmed.replace(/[^\d.,-]/g, '')
  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')
  if (hasComma && hasDot) {
    return cleaned.replace(/\./g, '').replace(',', '.')
  }
  if (hasComma) return cleaned.replace(',', '.')
  return cleaned
}

export function parseBrlToCents(value: string): number | null {
  const normalized = normalizeNumberLikeBr(value)
  if (!normalized) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  const cents = Math.round(parsed * 100)
  if (!Number.isFinite(cents) || cents < 0) return null
  return cents
}

export function formatBrlFromCents(valueCents: number): string {
  return (valueCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parsePercentToBps(value: string): number | null {
  const normalized = normalizeNumberLikeBr(value)
  if (!normalized) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  const bps = Math.round(parsed * 100)
  if (!Number.isFinite(bps) || bps < 0 || bps > 10000) return null
  return bps
}

export function formatPercentFromBps(valueBps: number): string {
  const percent = valueBps / 100
  const asInt = Number.isInteger(percent)
  return `${asInt ? String(percent) : percent.toFixed(2).replace(/\.00$/, '')}%`
}

export function downloadLocalFile(name: string, file: File) {
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
