import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSchedule, type CreateScheduleInput } from '../api/createSchedule'

export function useCreateSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateScheduleInput) => createSchedule(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}
