import { useMutation, useQueryClient } from '@tanstack/react-query'
import { publishSchedule } from '../api/publishSchedule'

export function usePublishSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scheduleId: string) => publishSchedule(scheduleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}
