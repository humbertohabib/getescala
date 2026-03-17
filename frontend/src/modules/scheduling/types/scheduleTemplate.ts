export type ScheduleTemplate = {
  id: string
  sectorId: string
  name: string
  weeksCount: number
}

export type ScheduleTemplateShift = {
  id: string
  templateId: string
  weekIndex: number
  dayOfWeek: number
  startTime: string
  endTime: string
  endDayOffset: number
  kind: string
  professionalId: string | null
  valueCents: number | null
  currency: string | null
}
