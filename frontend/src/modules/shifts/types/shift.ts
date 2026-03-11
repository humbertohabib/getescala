export type Shift = {
  id: string
  scheduleId: string
  professionalId: string | null
  startTime: string
  endTime: string
  checkInAt: string | null
  checkOutAt: string | null
  status: string
  valueCents: number | null
  currency: string | null
}
