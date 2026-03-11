import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../../../app/store'
import { apiFetch } from '../../../core/api/client'

const loginSchema = z
  .object({
    mode: z.enum(['signIn', 'signUp']),
    tenantId: z.string().optional(),
    tenantName: z.string().optional(),
    email: z.string().email(),
    password: z.string().min(6),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'signIn') {
      if (!value.tenantId || value.tenantId.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tenantId'], message: 'Tenant é obrigatório' })
      }
    }
    if (value.mode === 'signUp') {
      if (!value.tenantName || value.tenantName.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tenantName'], message: 'Nome da empresa é obrigatório' })
      }
    }
  })

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [mode, setMode] = useState<LoginFormValues['mode']>('signIn')
  const form = useForm<LoginFormValues>({
    defaultValues: { mode: 'signIn', tenantId: '', tenantName: '', email: '', password: '' },
    resolver: zodResolver(loginSchema),
  })

  type AuthResponse = {
    accessToken: string
    tokenType: string
    tenantId: string
    userId: string
    defaultScheduleId: string
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (values.mode === 'signUp') {
      const response = await apiFetch<AuthResponse>('/api/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify({
          tenantName: values.tenantName,
          email: values.email,
          password: values.password,
        }),
      })
      setSession({
        accessToken: response.accessToken,
        tenantId: response.tenantId,
        userId: response.userId,
        defaultScheduleId: response.defaultScheduleId,
      })
      navigate('/dashboard')
      return
    }

    const response = await apiFetch<AuthResponse>('/api/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: values.tenantId,
        email: values.email,
        password: values.password,
      }),
    })
    setSession({
      accessToken: response.accessToken,
      tenantId: response.tenantId,
      userId: response.userId,
      defaultScheduleId: response.defaultScheduleId,
    })
    navigate('/dashboard')
  })

  return (
    <div style={{ maxWidth: 360, margin: '48px auto', padding: 16 }}>
      <h1>{mode === 'signUp' ? 'Criar conta' : 'Entrar'}</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setMode('signIn')
              form.setValue('mode', 'signIn')
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signUp')
              form.setValue('mode', 'signUp')
            }}
          >
            Criar conta
          </button>
        </div>

        {mode === 'signIn' ? (
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Tenant (UUID)</span>
            <input type="text" {...form.register('tenantId')} />
          </label>
        ) : (
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Empresa</span>
            <input type="text" {...form.register('tenantName')} />
          </label>
        )}

        <label style={{ display: 'grid', gap: 6 }}>
          <span>E-mail</span>
          <input type="email" {...form.register('email')} />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Senha</span>
          <input type="password" {...form.register('password')} />
        </label>
        <button type="submit">{mode === 'signUp' ? 'Criar conta' : 'Entrar'}</button>
      </form>
    </div>
  )
}
