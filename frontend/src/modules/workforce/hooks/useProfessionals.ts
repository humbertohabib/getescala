import { useQuery } from '@tanstack/react-query'
import { listProfessionals } from '../api/listProfessionals'

export function useProfessionals() {
  return useQuery({
    queryKey: ['professionals'],
    queryFn: () => listProfessionals(),
  })
}
