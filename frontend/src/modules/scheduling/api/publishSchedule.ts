import { apiFetch } from '../../../core/api/client'
import type { Schedule } from '../types/schedule'

export async function publishSchedule(scheduleId: string): Promise<Schedule> {
  return apiFetch<Schedule>(`/api/schedules/${scheduleId}/publish`, { method: 'POST' })
}
