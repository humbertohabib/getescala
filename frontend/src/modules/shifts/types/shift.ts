export type Shift = {
  id: string
  scheduleId: string
  professionalId: string | null
  fixedProfessionalId: string | null
  startTime: string
  endTime: string
  kind: string
  situationCode: string
  checkInAt: string | null
  checkOutAt: string | null
  status: string
  valueCents: number | null
  currency: string | null
}
