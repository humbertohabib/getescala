import { useQuery } from '@tanstack/react-query'
import { listShifts, type ListShiftsParams } from '../api/listShifts'

export function useShifts(params: ListShiftsParams) {
  return useQuery({
    queryKey: ['shifts', params],
    queryFn: () => listShifts(params),
  })
}
