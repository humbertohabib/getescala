import { useQuery } from '@tanstack/react-query'
import { listAttendance, type ListAttendanceParams } from '../api/listAttendance'

export function useAttendance(params: ListAttendanceParams = {}) {
  return useQuery({
    queryKey: ['attendance', params],
    queryFn: () => listAttendance(params),
  })
}
