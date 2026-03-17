import { useQuery } from '@tanstack/react-query'
import { listScheduleTemplates } from '../api/scheduleTemplates'

export function useScheduleTemplates(params: { sectorId: string } | null) {
  return useQuery({
    queryKey: ['scheduleTemplates', params?.sectorId ?? null],
    queryFn: () => {
      if (!params?.sectorId) return Promise.resolve([])
      return listScheduleTemplates({ sectorId: params.sectorId })
    },
    enabled: Boolean(params?.sectorId),
  })
}

