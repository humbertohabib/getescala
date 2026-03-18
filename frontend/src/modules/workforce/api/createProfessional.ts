import { apiFetch } from '../../../core/api/client'
import type { Professional } from '../types/professional'

export type CreateProfessionalInput = {
  fullName: string
  email?: string | null
  phone?: string | null
  prefix?: string | null
  profession?: string | null
  registrationType?: string | null
  specialties?: string | null
}

export async function createProfessional(input: CreateProfessionalInput): Promise<Professional> {
  return apiFetch<Professional>('/api/professionals', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
