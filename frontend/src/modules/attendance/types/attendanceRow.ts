export type AttendanceRow = {
  shiftId: string
  scheduleId: string
  professionalId: string | null
  professionalName: string | null
  startTime: string
  endTime: string
  kind: string
  checkInAt: string | null
  checkOutAt: string | null
  status: string
  scheduledMinutes: number
  workedMinutes: number | null
  deltaMinutes: number | null
}
