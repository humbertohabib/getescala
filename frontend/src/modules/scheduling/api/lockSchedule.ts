import { apiFetch } from '../../../core/api/client'
import type { Schedule } from '../types/schedule'

export async function lockSchedule(scheduleId: string): Promise<Schedule> {
  return apiFetch<Schedule>(`/api/schedules/${scheduleId}/lock`, { method: 'POST' })
}
