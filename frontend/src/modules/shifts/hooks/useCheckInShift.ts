import { useMutation, useQueryClient } from '@tanstack/react-query'
import { checkInShift } from '../api/checkInShift'

export function useCheckInShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (shiftId: string) => checkInShift(shiftId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}
