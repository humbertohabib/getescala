import { apiFetch } from '../../../core/api/client'
import type { Shift } from '../types/shift'

export type ListShiftsParams = {
  from?: string
  to?: string
  scheduleId?: string
  professionalId?: string
}

export async function listShifts(params: ListShiftsParams = {}): Promise<Shift[]> {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  if (params.scheduleId) searchParams.set('scheduleId', params.scheduleId)
  if (params.professionalId) searchParams.set('professionalId', params.professionalId)

  const query = searchParams.toString()
  const path = query ? `/api/shifts?${query}` : '/api/shifts'
  return apiFetch<Shift[]>(path)
}
