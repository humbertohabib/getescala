import { useMutation, useQueryClient } from '@tanstack/react-query'
import { publishSchedule, type PublishScheduleInput } from '../api/publishSchedule'

export function usePublishSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PublishScheduleInput) => publishSchedule(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}
