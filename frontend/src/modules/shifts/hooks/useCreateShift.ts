import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createShift, type CreateShiftInput } from '../api/createShift'

export function useCreateShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateShiftInput) => createShift(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}
