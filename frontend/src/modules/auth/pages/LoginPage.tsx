import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useAuthStore } from '../../../app/store'
import { apiFetch, type ApiError } from '../../../core/api/client'

type Segment = { id: string; name: string }

type OrganizationType = { id: string; segmentId: string; name: string; userTerm: string; shiftTerm: string }

type CatalogCache = { savedAt: number; segments: Segment[]; organizationTypes: OrganizationType[] }

const CATALOG_CACHE_KEY = 'ge_public_catalog_v1'

function readCatalogCache(): CatalogCache | null {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CatalogCache>
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.savedAt !== 'number') return null
    if (!Array.isArray(parsed.segments) || !Array.isArray(parsed.organizationTypes)) return null
    return { savedAt: parsed.savedAt, segments: parsed.segments as Segment[], organizationTypes: parsed.organizationTypes as OrganizationType[] }
  } catch {
    return null
  }
}

function writeCatalogCache(value: CatalogCache) {
  try {
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(value))
  } catch {
    return
  }
}

const loginSchema = z
  .object({
    mode: z.enum(['signIn', 'signUp']),
    organizationTypeId: z.string().uuid().optional(),
    tenantName: z.string().optional(),
    email: z.string().optional(),
    password: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'signIn') {
      if (!value.email || value.email.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'E-mail é obrigatório' })
      } else {
        const parsed = z.string().email('E-mail inválido').safeParse(value.email)
        if (!parsed.success) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'E-mail inválido' })
        }
      }
      if (!value.password || value.password.length < 6) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Senha deve ter no mínimo 6 caracteres' })
      }
    }

    if (value.mode === 'signUp') {
      if (!value.organizationTypeId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['organizationTypeId'], message: 'Tipo de organização é obrigatório' })
      }
      if (!value.tenantName || value.tenantName.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tenantName'], message: 'Nome da empresa é obrigatório' })
      }
      if (!value.email || value.email.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'E-mail é obrigatório' })
      } else {
        const parsed = z.string().email('E-mail inválido').safeParse(value.email)
        if (!parsed.success) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'E-mail inválido' })
        }
      }
      if (!value.password || value.password.length < 6) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Senha deve ter no mínimo 6 caracteres' })
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
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [organizationTypes, setOrganizationTypes] = useState<OrganizationType[]>([])
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const googleButtonRef = useRef<HTMLDivElement | null>(null)
  const googleInitializedRef = useRef(false)
  const form = useForm<LoginFormValues>({
    defaultValues: { mode: 'signIn', organizationTypeId: undefined, tenantName: '', email: '', password: '' },
    resolver: zodResolver(loginSchema),
  })

  const loadPublicCatalog = useCallback(async () => {
    setCatalogLoading(true)
    setCatalogError(null)
    setCatalogNotice(null)
    try {
      const [segmentsResponse, organizationTypesResponse] = await Promise.all([
        apiFetch<Segment[]>('/api/public/segments'),
        apiFetch<OrganizationType[]>('/api/public/organization-types'),
      ])

      setSegments(segmentsResponse)
      setOrganizationTypes(organizationTypesResponse)
      writeCatalogCache({ savedAt: Date.now(), segments: segmentsResponse, organizationTypes: organizationTypesResponse })
    } catch {
      const cached = readCatalogCache()
      if (cached?.segments?.length && cached?.organizationTypes?.length) {
        setSegments(cached.segments)
        setOrganizationTypes(cached.organizationTypes)
        setCatalogNotice('Não foi possível conectar ao servidor para atualizar a lista. Usando uma lista salva no navegador.')
      } else {
        setSegments([])
        setOrganizationTypes([])
        setCatalogError('Desculpe, não foi possível carregar a lista. Tente novamente mais tarde.')
      }
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPublicCatalog()
  }, [loadPublicCatalog])

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
          form.clearErrors(['email', 'password'])
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
        const modeNow = form.getValues('mode')
        if (apiErr?.status === 409 && modeNow === 'signUp') {
          try {
            const signInResponse = await apiFetch<AuthResponse>('/api/auth/google/sign-in', {
              method: 'POST',
              body: JSON.stringify({ idToken }),
            })
            setSession({
              accessToken: signInResponse.accessToken,
              tenantId: signInResponse.tenantId,
              userId: signInResponse.userId,
              defaultScheduleId: signInResponse.defaultScheduleId,
            })
            navigate('/dashboard')
            return
          } catch {
            setMode('signIn')
            form.setValue('mode', 'signIn')
            setSubmitError(apiErr?.message ?? 'Já existe uma conta com este e-mail. Use "Continuar com Google" para entrar.')
            return
          }
        }
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

    function tryInit() {
      const google = (window as unknown as { google?: GoogleGsi }).google
      if (!google?.accounts?.id) return false
      if (!googleButtonRef.current) return false

      if (!googleInitializedRef.current) {
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
        googleInitializedRef.current = true
      }

      googleButtonRef.current.innerHTML = ''
      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 388,
      })

      return true
    }

    if (tryInit()) return
    const intervalId = window.setInterval(() => {
      if (tryInit()) {
        window.clearInterval(intervalId)
      }
    }, 200)

    return () => window.clearInterval(intervalId)
  }, [googleClientId, handleGoogleIdToken, mode])

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      if (values.mode === 'signUp') {
        const response = await apiFetch<AuthResponse>('/api/auth/sign-up', {
          method: 'POST',
          body: JSON.stringify({
            tenantName: values.tenantName,
            organizationTypeId: values.organizationTypeId,
            email: values.email ?? '',
            password: values.password ?? '',
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
          email: values.email ?? '',
          password: values.password ?? '',
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
      if (apiErr?.status === 409) {
        const modeNow = form.getValues('mode')
        if (modeNow === 'signUp') {
          setSubmitError(apiErr?.message ?? 'Já existe uma conta com este e-mail.')
          return
        }
        setSubmitError(apiErr?.message ?? 'Esta conta foi criada com Google. Use "Continuar com Google" para entrar.')
        googleButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
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

  const busyLabel = googleSubmitting ? (mode === 'signUp' ? 'Criando sua conta com Google...' : 'Entrando com Google...') : null
  const hasOrganizationTypes = groupedOrganizationTypes.length > 0
  const signUpBlocked = mode === 'signUp' && (catalogLoading || !hasOrganizationTypes)
  const organizationTypePlaceholder = catalogLoading ? 'Carregando...' : !hasOrganizationTypes ? (catalogError ? 'Indisponível' : 'Nenhum tipo disponível') : 'Selecione'
  const organizationTypeHelper = catalogError ? catalogError : catalogNotice ? catalogNotice : undefined
  const showCatalogRetry = mode === 'signUp' && !catalogLoading && (!hasOrganizationTypes || !!catalogError || !!catalogNotice)

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
      <style>{'@keyframes geSpin{to{transform:rotate(360deg)}}'}</style>
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
            <img src="/icon.png" alt="GetEscala" style={{ width: 34, height: 34, borderRadius: 10 }} />
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
                  ? 'Informe os dados da empresa e escolha: continue com Google ou crie com e-mail e senha.'
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
                position: 'relative',
              }}
            >
              {busyLabel ? (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 18,
                    background: 'rgba(11,13,18,0.65)',
                    backdropFilter: 'blur(6px)',
                    display: 'grid',
                    placeItems: 'center',
                    padding: 18,
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 360,
                      borderRadius: 16,
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.06)',
                      padding: 14,
                      display: 'grid',
                      gap: 10,
                      justifyItems: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        border: '2px solid rgba(255,255,255,0.22)',
                        borderTopColor: 'rgba(255,255,255,0.92)',
                        animation: 'geSpin 900ms linear infinite',
                      }}
                    />
                    <div style={{ fontWeight: 900, color: 'rgba(255,255,255,0.92)', fontSize: 14 }}>{busyLabel}</div>
                    <div style={{ color: 'rgba(255,255,255,0.70)', fontSize: 12, lineHeight: 1.35 }}>
                      Pode levar alguns segundos. Não feche esta página.
                    </div>
                  </div>
                </div>
              ) : null}
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
                  disabled={googleSubmitting}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid transparent',
                    background: mode === 'signIn' ? 'rgba(255,255,255,0.10)' : 'transparent',
                    color: 'rgba(255,255,255,0.92)',
                    fontWeight: 800,
                    cursor: googleSubmitting ? 'not-allowed' : 'pointer',
                    opacity: googleSubmitting ? 0.72 : 1,
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
                  disabled={googleSubmitting}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid transparent',
                    background: mode === 'signUp' ? 'rgba(255,255,255,0.10)' : 'transparent',
                    color: 'rgba(255,255,255,0.92)',
                    fontWeight: 800,
                    cursor: googleSubmitting ? 'not-allowed' : 'pointer',
                    opacity: googleSubmitting ? 0.72 : 1,
                  }}
                >
                  Criar conta
                </button>
              </div>

              <form onSubmit={onSubmit} style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                {mode === 'signUp' ? (
                  <>
                    <Field label="Tipo de organização" helper={organizationTypeHelper} error={form.formState.errors.organizationTypeId?.message}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <select
                          style={selectStyle}
                          disabled={googleSubmitting || catalogLoading || !hasOrganizationTypes}
                          {...form.register('organizationTypeId', {
                            setValueAs: (value) => (value === '' ? undefined : value),
                          })}
                        >
                          <option value="" style={optionStyle}>
                            {organizationTypePlaceholder}
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

                        {showCatalogRetry ? (
                          <button
                            type="button"
                            onClick={() => void loadPublicCatalog()}
                            disabled={googleSubmitting}
                            style={{
                              alignSelf: 'flex-start',
                              height: 34,
                              padding: '0 10px',
                              borderRadius: 10,
                              border: '1px solid rgba(255,255,255,0.16)',
                              background: 'rgba(255,255,255,0.06)',
                              color: 'rgba(255,255,255,0.86)',
                              fontWeight: 800,
                              cursor: googleSubmitting ? 'not-allowed' : 'pointer',
                              opacity: googleSubmitting ? 0.72 : 1,
                            }}
                          >
                            Recarregar lista
                          </button>
                        ) : null}
                      </div>
                    </Field>
                    <Field label="Empresa" error={form.formState.errors.tenantName?.message}>
                      <input
                        type="text"
                        placeholder="Nome da organização"
                        autoComplete="organization"
                        style={inputStyle}
                        disabled={googleSubmitting}
                        {...form.register('tenantName')}
                      />
                    </Field>

                    {googleClientId ? (
                      <div style={{ marginTop: 6, display: 'grid', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <div
                            ref={googleButtonRef}
                            style={{
                              pointerEvents: googleSubmitting || form.formState.isSubmitting || signUpBlocked ? 'none' : 'auto',
                              opacity: googleSubmitting || form.formState.isSubmitting || signUpBlocked ? 0.72 : 1,
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
                  </>
                ) : null}

                {mode === 'signIn' && googleClientId ? (
                  <div style={{ marginTop: 2, display: 'grid', gap: 12 }}>
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

                <Field label="E-mail" error={form.formState.errors.email?.message}>
                  <input
                    type="email"
                    placeholder="voce@empresa.com"
                    autoComplete="email"
                    style={inputStyle}
                    disabled={googleSubmitting}
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
                      disabled={googleSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      disabled={googleSubmitting}
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        height: 34,
                        width: 38,
                        padding: 0,
                        borderRadius: 10,
                        border: 'none',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.86)',
                        fontWeight: 800,
                        display: 'grid',
                        placeItems: 'center',
                        cursor: googleSubmitting ? 'not-allowed' : 'pointer',
                        opacity: googleSubmitting ? 0.72 : 1,
                      }}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                  {mode === 'signIn' ? (
                    <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.66)', fontSize: 12, lineHeight: 1.35 }}>
                      Se sua conta foi criada com Google, use o botão &quot;Continuar com Google&quot;.
                    </div>
                  ) : null}
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
                  disabled={form.formState.isSubmitting || googleSubmitting || signUpBlocked}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'linear-gradient(135deg, #646cff, #00d4ff)',
                    color: '#0b0d12',
                    fontWeight: 900,
                    cursor: form.formState.isSubmitting || googleSubmitting || signUpBlocked ? 'not-allowed' : 'pointer',
                    opacity: form.formState.isSubmitting || googleSubmitting || signUpBlocked ? 0.72 : 1,
                  }}
                >
                  {form.formState.isSubmitting ? 'Enviando...' : signUpBlocked ? 'Aguardando lista...' : mode === 'signUp' ? 'Criar conta' : 'Entrar'}
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

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block' }}
    >
      {open ? (
        <>
          <path
            d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <path
            d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17.94 17.94C16.14 19.23 14.17 20 12 20c-6.5 0-10-8-10-8a20.6 20.6 0 0 1 5.06-6.94"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.9 4.24A10.5 10.5 0 0 1 12 4c6.5 0 10 8 10 8a20.8 20.8 0 0 1-2.2 3.34"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
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
