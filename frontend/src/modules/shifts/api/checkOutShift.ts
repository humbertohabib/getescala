import { apiFetch } from '../../../core/api/client'
import type { Shift } from '../types/shift'

export async function checkOutShift(shiftId: string): Promise<Shift> {
  return apiFetch<Shift>(`/api/shifts/${shiftId}/check-out`, { method: 'POST' })
}
