import { apiFetch } from '../../../core/api/client'

export async function cancelShift(shiftId: string): Promise<void> {
  await apiFetch<void>(`/api/shifts/${shiftId}/cancel`, { method: 'POST' })
}
