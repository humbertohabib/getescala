import { apiFetch } from '../../../core/api/client'
import type { Schedule } from '../types/schedule'

export type PublishScheduleInput = {
  scheduleId: string
  publishedUntil?: string | null
}

export async function publishSchedule(input: PublishScheduleInput): Promise<Schedule> {
  return apiFetch<Schedule>(`/api/schedules/${input.scheduleId}/publish`, {
    method: 'POST',
    body: JSON.stringify({ publishedUntil: input.publishedUntil ?? null }),
  })
}
