import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AuthSession = {
  accessToken: string | null
  tenantId: string | null
  userId: string | null
  defaultScheduleId: string | null
}

type AuthStore = {
  session: AuthSession
  setSession: (session: AuthSession) => void
  setDefaultScheduleId: (scheduleId: string | null) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      session: {
        accessToken: null,
        tenantId: null,
        userId: null,
        defaultScheduleId: null,
      },
      setSession: (session) => set({ session }),
      setDefaultScheduleId: (defaultScheduleId) =>
        set((state) => ({
          session: { ...state.session, defaultScheduleId },
        })),
      clearSession: () =>
        set({
          session: { accessToken: null, tenantId: null, userId: null, defaultScheduleId: null },
        }),
    }),
    { name: 'getescala-auth' },
  ),
)
