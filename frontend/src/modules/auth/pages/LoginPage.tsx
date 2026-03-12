import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { useAuthStore } from '../../../app/store'
import { apiFetch, type ApiError } from '../../../core/api/client'

const loginSchema = z
  .object({
    mode: z.enum(['signIn', 'signUp']),
    institutionType: z.enum(['Hospital', 'Cooperativa', 'Grupo médico', 'Secretaria de Saúde', 'Clínica', 'Outro']).optional(),
    tenantName: z.string().optional(),
    email: z.string().email(),
    password: z.string().min(6),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'signUp') {
      if (!value.institutionType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['institutionType'], message: 'Tipo de instituição é obrigatório' })
      }
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
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<LoginFormValues>({
    defaultValues: { mode: 'signIn', institutionType: undefined, tenantName: '', email: '', password: '' },
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
    setSubmitError(null)
    try {
      if (values.mode === 'signUp') {
        const response = await apiFetch<AuthResponse>('/api/auth/sign-up', {
          method: 'POST',
          body: JSON.stringify({
            tenantName: values.tenantName,
            institutionType: values.institutionType,
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
    } catch (err) {
      const apiErr = err as Partial<ApiError>
      if (apiErr?.status === 401) {
        setSubmitError('E-mail ou senha inválidos.')
        return
      }
      setSubmitError(apiErr?.message ?? 'Não foi possível entrar. Tente novamente.')
    }
  })

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'radial-gradient(900px 380px at 50% 0%, rgba(100,108,255,0.18), transparent), #0b0d12',
        color: 'rgba(255,255,255,0.92)',
        overflowX: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 20px 64px' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '8px 0',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: 'rgba(255,255,255,0.92)',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #646cff, #00d4ff)',
              }}
            />
            <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>GetEscala</div>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link to="/planos" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Planos
            </Link>
            <Link to="/cadastro" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Cadastro
            </Link>
          </nav>
        </header>

        <main style={{ marginTop: 28 }}>
          <div style={{ maxWidth: 420, margin: '0 auto' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.62)' }}>
                {mode === 'signUp' ? 'Criar conta' : 'Entrar'}
              </div>
              <h1 style={{ margin: '10px 0 6px', fontSize: 32, lineHeight: 1.1 }}>
                {mode === 'signUp' ? 'Crie sua conta' : 'Entre na sua conta'}
              </h1>
              <div style={{ color: 'rgba(255,255,255,0.74)', fontSize: 14 }}>
                {mode === 'signUp'
                  ? 'Use um e-mail e senha para criar sua organização.'
                  : 'Informe seu e-mail e senha.'}
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                padding: 16,
              }}
            >
              <div
                role="tablist"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  padding: 4,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.03)',
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode('signIn')
                    form.setValue('mode', 'signIn')
                    setSubmitError(null)
                    form.clearErrors()
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid transparent',
                    background: mode === 'signIn' ? 'rgba(255,255,255,0.10)' : 'transparent',
                    color: 'rgba(255,255,255,0.92)',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signUp')
                    form.setValue('mode', 'signUp')
                    setSubmitError(null)
                    form.clearErrors()
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid transparent',
                    background: mode === 'signUp' ? 'rgba(255,255,255,0.10)' : 'transparent',
                    color: 'rgba(255,255,255,0.92)',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Criar conta
                </button>
              </div>

              <form onSubmit={onSubmit} style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                {mode === 'signUp' ? (
                  <>
                    <Field label="Tipo de instituição" error={form.formState.errors.institutionType?.message}>
                      <select
                        style={inputStyle}
                        {...form.register('institutionType', {
                          setValueAs: (value) => (value === '' ? undefined : value),
                        })}
                      >
                        <option value="">Selecione</option>
                        <option value="Hospital">Hospital</option>
                        <option value="Cooperativa">Cooperativa</option>
                        <option value="Grupo médico">Grupo médico</option>
                        <option value="Secretaria de Saúde">Secretaria de Saúde</option>
                        <option value="Clínica">Clínica</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </Field>
                    <Field label="Empresa" error={form.formState.errors.tenantName?.message}>
                      <input
                        type="text"
                        placeholder="Nome da organização"
                        autoComplete="organization"
                        style={inputStyle}
                        {...form.register('tenantName')}
                      />
                    </Field>
                  </>
                ) : null}

                <Field label="E-mail" error={form.formState.errors.email?.message}>
                  <input
                    type="email"
                    placeholder="voce@empresa.com"
                    autoComplete="email"
                    style={inputStyle}
                    {...form.register('email')}
                  />
                </Field>

                <Field label="Senha" error={form.formState.errors.password?.message}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                      placeholder="Sua senha"
                      {...form.register('password')}
                      style={{ ...inputStyle, paddingRight: 96 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        height: 34,
                        padding: '0 10px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.16)',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.86)',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </Field>

                {submitError ? (
                  <div
                    style={{
                      borderRadius: 12,
                      border: '1px solid rgba(255,180,32,0.35)',
                      background: 'rgba(255,180,32,0.10)',
                      padding: 12,
                      color: 'rgba(255,255,255,0.86)',
                      fontSize: 13,
                    }}
                  >
                    {submitError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'linear-gradient(135deg, #646cff, #00d4ff)',
                    color: '#0b0d12',
                    fontWeight: 900,
                    cursor: form.formState.isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: form.formState.isSubmitting ? 0.72 : 1,
                  }}
                >
                  {form.formState.isSubmitting ? 'Enviando...' : mode === 'signUp' ? 'Criar conta' : 'Entrar'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13 }}>
                    {mode === 'signIn' ? (
                      <>
                        Não tem conta?{' '}
                        <Link to="/cadastro" style={{ color: 'rgba(255,255,255,0.88)' }}>
                          Cadastre sua empresa
                        </Link>
                      </>
                    ) : (
                      <>
                        Já tem conta?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setMode('signIn')
                            form.setValue('mode', 'signIn')
                            setSubmitError(null)
                            form.clearErrors()
                          }}
                          style={{
                            padding: 0,
                            border: 'none',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.88)',
                            fontWeight: 800,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textUnderlineOffset: 2,
                          }}
                        >
                          Entrar
                        </button>
                      </>
                    )}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.56)', fontSize: 13 }}>
                    Precisa de ajuda?{' '}
                    <Link to="/cadastro" style={{ color: 'rgba(255,255,255,0.78)' }}>
                      Fale com a equipe
                    </Link>
                  </div>
                </div>
              </form>
            </div>

            <div style={{ marginTop: 16, color: 'rgba(255,255,255,0.56)', fontSize: 12, textAlign: 'left' }}>
              Ao continuar, você concorda com os{' '}
              <Link to="/termos-de-uso" style={{ color: 'rgba(255,255,255,0.78)' }}>
                Termos de Uso
              </Link>{' '}
              e a{' '}
              <Link to="/politica-de-privacidade" style={{ color: 'rgba(255,255,255,0.78)' }}>
                Política de Privacidade
              </Link>
              .
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function Field({
  label,
  helper,
  error,
  children,
}: {
  label: string
  helper?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label style={{ display: 'grid', gap: 6, textAlign: 'left' }}>
      <span style={{ fontWeight: 800, fontSize: 13 }}>{label}</span>
      <div
        style={{
          borderRadius: 12,
          border: error ? '1px solid rgba(255,180,32,0.40)' : '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(255,255,255,0.04)',
          padding: 2,
        }}
      >
        <div
          style={{
            display: 'grid',
          }}
        >
          {children}
        </div>
      </div>
      {error ? (
        <span style={{ color: 'rgba(255,180,32,0.92)', fontSize: 12 }}>{error}</span>
      ) : helper ? (
        <span style={{ color: 'rgba(255,255,255,0.60)', fontSize: 12 }}>{helper}</span>
      ) : null}
    </label>
  )
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 12px',
  borderRadius: 10,
  border: '1px solid transparent',
  background: 'transparent',
  color: 'rgba(255,255,255,0.92)',
  outline: 'none',
  fontSize: 14,
}
