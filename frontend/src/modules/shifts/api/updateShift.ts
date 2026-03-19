import { apiFetch } from '../../../core/api/client'
import type { Shift } from '../types/shift'

export type UpdateShiftInput = {
  professionalId?: string | null
  fixedProfessionalId?: string | null
  startTime?: string
  endTime?: string
  kind?: string
  situationCode?: string
  valueCents?: number | null
  currency?: string | null
}

export async function updateShift(shiftId: string, input: UpdateShiftInput): Promise<Shift> {
  return apiFetch<Shift>(`/api/shifts/${shiftId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
