import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useAuthStore } from '../../../app/store'
import { apiFetch, type ApiError } from '../../../core/api/client'

const loginSchema = z
  .object({
    mode: z.enum(['signIn', 'signUp']),
    organizationTypeId: z.string().uuid().optional(),
    tenantName: z.string().optional(),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'signUp') {
      if (!value.organizationTypeId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['organizationTypeId'], message: 'Tipo de organização é obrigatório' })
      }
      if (!value.tenantName || value.tenantName.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tenantName'], message: 'Nome da empresa é obrigatório' })
      }
    }
  })

type LoginFormValues = z.infer<typeof loginSchema>

type GoogleGsi = {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void
      renderButton: (parent: HTMLElement, options: { theme?: string; size?: string; text?: string; shape?: string; width?: number }) => void
    }
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [mode, setMode] = useState<LoginFormValues['mode']>('signIn')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)
  const [segments, setSegments] = useState<Array<{ id: string; name: string }>>([])
  const [organizationTypes, setOrganizationTypes] = useState<Array<{ id: string; segmentId: string; name: string; userTerm: string; shiftTerm: string }>>(
    [],
  )
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const googleButtonRef = useRef<HTMLDivElement | null>(null)
  const googleInitializedRef = useRef(false)
  const form = useForm<LoginFormValues>({
    defaultValues: { mode: 'signIn', organizationTypeId: undefined, tenantName: '', email: '', password: '' },
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    void (async () => {
      try {
        const [segmentsResponse, organizationTypesResponse] = await Promise.all([
          apiFetch<Array<{ id: string; name: string }>>('/api/public/segments'),
          apiFetch<Array<{ id: string; segmentId: string; name: string; userTerm: string; shiftTerm: string }>>('/api/public/organization-types'),
        ])

        setSegments(segmentsResponse)
        setOrganizationTypes(organizationTypesResponse)
      } catch {
        setSegments([])
        setOrganizationTypes([])
      }
    })()
  }, [])

  const groupedOrganizationTypes = useMemo(() => {
    const normalize = (value: string) => value.trim().toLowerCase()
    const isOutros = (value: string) => normalize(value) === 'outros'

    const sortedSegments = segments
      .slice()
      .sort((a, b) => (isOutros(a.name) === isOutros(b.name) ? a.name.localeCompare(b.name) : isOutros(a.name) ? 1 : -1))

    const typesBySegmentId = new Map<string, Array<{ id: string; segmentId: string; name: string; userTerm: string; shiftTerm: string }>>()
    for (const type of organizationTypes) {
      const list = typesBySegmentId.get(type.segmentId) ?? []
      list.push(type)
      typesBySegmentId.set(type.segmentId, list)
    }

    const sortTypes = (types: Array<{ id: string; segmentId: string; name: string; userTerm: string; shiftTerm: string }>) =>
      types
        .slice()
        .sort((a, b) => (isOutros(a.name) === isOutros(b.name) ? a.name.localeCompare(b.name) : isOutros(a.name) ? 1 : -1))

    const groups: Array<{ segmentId: string; segmentName: string; types: Array<{ id: string; segmentId: string; name: string; userTerm: string; shiftTerm: string }> }> =
      []

    for (const segment of sortedSegments) {
      const types = typesBySegmentId.get(segment.id)
      if (!types || types.length === 0) continue
      groups.push({ segmentId: segment.id, segmentName: segment.name, types: sortTypes(types) })
      typesBySegmentId.delete(segment.id)
    }

    const leftoverTypes = Array.from(typesBySegmentId.values()).flat()
    if (leftoverTypes.length > 0) {
      groups.push({ segmentId: 'outros', segmentName: 'Outros', types: sortTypes(leftoverTypes) })
    }

    return groups
  }, [organizationTypes, segments])

  type AuthResponse = {
    accessToken: string
    tokenType: string
    tenantId: string
    userId: string
    defaultScheduleId: string
  }

  const handleGoogleIdToken = useCallback(
    async (idToken: string) => {
      setSubmitError(null)
      setGoogleSubmitting(true)
      try {
        const modeNow = form.getValues('mode')
        if (modeNow === 'signUp') {
          const ok = await form.trigger(['organizationTypeId', 'tenantName'])
          if (!ok) {
            setSubmitError('Preencha os campos obrigatórios para continuar com o Google.')
            return
          }
        }

        const response = await apiFetch<AuthResponse>(modeNow === 'signUp' ? '/api/auth/google/sign-up' : '/api/auth/google/sign-in', {
          method: 'POST',
          body: JSON.stringify(
            modeNow === 'signUp'
              ? {
                  tenantName: form.getValues('tenantName'),
                  organizationTypeId: form.getValues('organizationTypeId'),
                  idToken,
                }
              : { idToken },
          ),
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
          setSubmitError('Não foi possível autenticar com o Google.')
          return
        }
        if (apiErr?.status === 501) {
          setSubmitError('Login com Google ainda não está configurado.')
          return
        }
        if (apiErr?.status === 500 && apiErr?.errorId) {
          setSubmitError(`${apiErr.message ?? 'Erro interno. Tente novamente.'} (código: ${apiErr.errorId})`)
          return
        }
        setSubmitError(apiErr?.message ?? 'Não foi possível entrar com o Google. Tente novamente.')
      } finally {
        setGoogleSubmitting(false)
      }
    },
    [form, navigate, setSession],
  )

  useEffect(() => {
    if (!googleClientId) return
    if (googleInitializedRef.current) return

    function tryInit() {
      const google = (window as unknown as { google?: GoogleGsi }).google
      if (!google?.accounts?.id) return false
      if (!googleButtonRef.current) return false

      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: { credential?: string }) => {
          if (!response.credential) {
            setSubmitError('Não foi possível autenticar com o Google.')
            return
          }
          void handleGoogleIdToken(response.credential)
        },
      })

      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 388,
      })

      googleInitializedRef.current = true
      return true
    }

    if (tryInit()) return
    const intervalId = window.setInterval(() => {
      if (tryInit()) {
        window.clearInterval(intervalId)
      }
    }, 200)

    return () => window.clearInterval(intervalId)
  }, [googleClientId, handleGoogleIdToken])

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      if (values.mode === 'signUp') {
        const response = await apiFetch<AuthResponse>('/api/auth/sign-up', {
          method: 'POST',
          body: JSON.stringify({
            tenantName: values.tenantName,
            organizationTypeId: values.organizationTypeId,
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
      if (apiErr?.status === 500 && apiErr?.errorId) {
        setSubmitError(`${apiErr.message ?? 'Erro interno. Tente novamente.'} (código: ${apiErr.errorId})`)
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

              {googleClientId ? (
                <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div
                      ref={googleButtonRef}
                      style={{
                        pointerEvents: googleSubmitting || form.formState.isSubmitting ? 'none' : 'auto',
                        opacity: googleSubmitting || form.formState.isSubmitting ? 0.72 : 1,
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.14)' }} />
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.62)', letterSpacing: 0.4 }}>OU</div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.14)' }} />
                  </div>
                </div>
              ) : null}

              <form onSubmit={onSubmit} style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                {mode === 'signUp' ? (
                  <>
                    <Field label="Tipo de organização" error={form.formState.errors.organizationTypeId?.message}>
                      <select
                        style={selectStyle}
                        {...form.register('organizationTypeId', {
                          setValueAs: (value) => (value === '' ? undefined : value),
                        })}
                      >
                        <option value="" style={optionStyle}>
                          Selecione
                        </option>
                        {groupedOrganizationTypes.map((group) => (
                          <optgroup key={group.segmentId} label={group.segmentName} style={optionStyle}>
                            {group.types.map((type) => (
                              <option key={type.id} value={type.id} style={optionStyle}>
                                {type.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
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

const selectStyle = { ...inputStyle, colorScheme: 'dark' } as CSSProperties

const optionStyle: CSSProperties = {
  backgroundColor: '#0b0d12',
  color: 'rgba(255,255,255,0.92)',
}
