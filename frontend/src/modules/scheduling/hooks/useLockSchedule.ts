import { useMutation, useQueryClient } from '@tanstack/react-query'
import { lockSchedule } from '../api/lockSchedule'

export function useLockSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scheduleId: string) => lockSchedule(scheduleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
      await queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}
