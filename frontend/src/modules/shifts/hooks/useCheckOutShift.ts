import { useMutation, useQueryClient } from '@tanstack/react-query'
import { checkOutShift } from '../api/checkOutShift'

export function useCheckOutShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (shiftId: string) => checkOutShift(shiftId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}
