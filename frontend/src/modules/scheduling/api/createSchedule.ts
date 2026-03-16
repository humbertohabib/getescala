import { apiFetch } from '../../../core/api/client'
import type { Schedule } from '../types/schedule'

export type CreateScheduleInput = {
  monthReference: string
  locationId?: string | null
  sectorId?: string | null
}

export async function createSchedule(input: CreateScheduleInput): Promise<Schedule> {
  return apiFetch<Schedule>('/api/schedules', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
