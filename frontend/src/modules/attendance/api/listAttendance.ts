import { apiFetch } from '../../../core/api/client'
import type { AttendanceRow } from '../types/attendanceRow'

export type ListAttendanceParams = {
  from?: string
  to?: string
  scheduleId?: string
  professionalId?: string
}

export async function listAttendance(params: ListAttendanceParams = {}): Promise<AttendanceRow[]> {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  if (params.scheduleId) searchParams.set('scheduleId', params.scheduleId)
  if (params.professionalId) searchParams.set('professionalId', params.professionalId)
  const query = searchParams.toString()
  const path = query ? `/api/attendance?${query}` : '/api/attendance'
  return apiFetch<AttendanceRow[]>(path)
}
