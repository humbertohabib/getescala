import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateShift, type UpdateShiftInput } from '../api/updateShift'

export function useUpdateShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shiftId, input }: { shiftId: string; input: UpdateShiftInput }) => updateShift(shiftId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}
