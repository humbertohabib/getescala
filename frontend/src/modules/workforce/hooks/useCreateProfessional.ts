import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createProfessional, type CreateProfessionalInput } from '../api/createProfessional'

export function useCreateProfessional() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateProfessionalInput) => createProfessional(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['professionals'] })
    },
  })
}
