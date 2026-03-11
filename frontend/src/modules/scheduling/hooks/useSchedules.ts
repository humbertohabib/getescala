import { useQuery } from '@tanstack/react-query'
import { listSchedules, type ListSchedulesParams } from '../api/listSchedules'

export function useSchedules(params: ListSchedulesParams = {}) {
  return useQuery({
    queryKey: ['schedules', params],
    queryFn: () => listSchedules(params),
  })
}
