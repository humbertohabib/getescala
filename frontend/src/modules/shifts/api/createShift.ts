import { apiFetch } from '../../../core/api/client'
import type { Shift } from '../types/shift'

export type CreateShiftInput = {
  scheduleId: string
  professionalId?: string | null
  fixedProfessionalId?: string | null
  startTime: string
  endTime: string
  kind?: string
  situationCode?: string
  valueCents?: number | null
  currency?: string | null
}

export async function createShift(input: CreateShiftInput): Promise<Shift> {
  return apiFetch<Shift>('/api/shifts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
