import { apiFetch } from '../../../core/api/client'
import type { Professional } from '../types/professional'

export async function listProfessionals(): Promise<Professional[]> {
  return apiFetch<Professional[]>('/api/professionals')
}
