import { apiFetchBlob } from '../../../core/api/client'

export async function downloadAttendanceCsv(params: {
  scheduleId?: string
  professionalId?: string
  from?: string
  to?: string
}) {
  const searchParams = new URLSearchParams()
  if (params.scheduleId) searchParams.set('scheduleId', params.scheduleId)
  if (params.professionalId) searchParams.set('professionalId', params.professionalId)
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  const query = searchParams.toString()
  const path = query ? `/api/attendance/export?${query}` : '/api/attendance/export'
  return apiFetchBlob(path, { method: 'GET' })
}
