import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelShift } from '../api/cancelShift'

export function useCancelShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (shiftId: string) => cancelShift(shiftId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}
