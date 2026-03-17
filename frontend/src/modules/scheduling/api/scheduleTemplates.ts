import { apiFetch, apiFetchBlob } from '../../../core/api/client'
import type { ScheduleTemplate, ScheduleTemplateShift } from '../types/scheduleTemplate'

export async function listScheduleTemplates(params: { sectorId: string }): Promise<ScheduleTemplate[]> {
  const qs = new URLSearchParams()
  qs.set('sectorId', params.sectorId)
  return apiFetch<ScheduleTemplate[]>(`/api/schedule-templates?${qs.toString()}`)
}

export async function createScheduleTemplate(payload: {
  sectorId: string
  name: string
  weeksCount?: number
}): Promise<ScheduleTemplate> {
  return apiFetch<ScheduleTemplate>('/api/schedule-templates', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateScheduleTemplate(
  id: string,
  payload: {
    name?: string
    weeksCount?: number
  },
): Promise<ScheduleTemplate> {
  return apiFetch<ScheduleTemplate>(`/api/schedule-templates/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteScheduleTemplate(id: string): Promise<void> {
  await apiFetch<void>(`/api/schedule-templates/${id}`, { method: 'DELETE' })
}

export async function duplicateScheduleTemplate(id: string, payload?: { name?: string }): Promise<ScheduleTemplate> {
  return apiFetch<ScheduleTemplate>(`/api/schedule-templates/${id}/duplicate`, {
    method: 'POST',
    body: payload ? JSON.stringify(payload) : undefined,
  })
}

export async function clearScheduleTemplate(id: string): Promise<void> {
  await apiFetch<void>(`/api/schedule-templates/${id}/clear`, { method: 'POST' })
}

export async function exportScheduleTemplateCsv(id: string): Promise<Blob> {
  return apiFetchBlob(`/api/schedule-templates/${id}/export`, { method: 'GET' })
}

export async function listScheduleTemplateShifts(templateId: string): Promise<ScheduleTemplateShift[]> {
  return apiFetch<ScheduleTemplateShift[]>(`/api/schedule-templates/${templateId}/shifts`)
}

export async function createScheduleTemplateShift(
  templateId: string,
  payload: {
    weekIndex: number
    dayOfWeek: number
    startTime: string
    endTime: string
    endDayOffset?: number
    kind?: string
    professionalId?: string | null
    valueCents?: number | null
    currency?: string | null
  },
): Promise<ScheduleTemplateShift> {
  return apiFetch<ScheduleTemplateShift>(`/api/schedule-templates/${templateId}/shifts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateScheduleTemplateShift(
  shiftId: string,
  payload: {
    weekIndex?: number
    dayOfWeek?: number
    startTime?: string
    endTime?: string
    endDayOffset?: number
    kind?: string
    professionalId?: string | null
    valueCents?: number | null
    currency?: string | null
  },
): Promise<ScheduleTemplateShift> {
  return apiFetch<ScheduleTemplateShift>(`/api/schedule-templates/shifts/${shiftId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteScheduleTemplateShift(shiftId: string): Promise<void> {
  await apiFetch<void>(`/api/schedule-templates/shifts/${shiftId}`, { method: 'DELETE' })
}

export async function applyScheduleTemplate(
  templateId: string,
  payload: {
    fromMonth: string
    monthsCount?: number
    startDate?: string | null
    endDate?: string | null
    mode?: string
    startWeekIndex?: number
  },
): Promise<{ created: number; skipped: number }> {
  return apiFetch<{ created: number; skipped: number }>(`/api/schedule-templates/${templateId}/apply`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
