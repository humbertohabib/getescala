import { apiFetch } from '../../../core/api/client'
import type { Schedule } from '../types/schedule'

export type ListSchedulesParams = {
  from?: string
  to?: string
  locationId?: string
  sectorId?: string
}

export async function listSchedules(params: ListSchedulesParams = {}): Promise<Schedule[]> {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  if (params.locationId) searchParams.set('locationId', params.locationId)
  if (params.sectorId) searchParams.set('sectorId', params.sectorId)
  const query = searchParams.toString()
  const path = query ? `/api/schedules?${query}` : '/api/schedules'
  return apiFetch<Schedule[]>(path)
}
