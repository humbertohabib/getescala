import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuthStore } from '../../../app/store'
import { apiFetch } from '../../../core/api/client'

const signupSchema = z.object({
  institutionType: z
    .enum(['Hospital', 'Cooperativa', 'Grupo médico', 'Secretaria de Saúde', 'Clínica', 'Outro'])
    .optional()
    .superRefine((value, ctx) => {
      if (!value) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Tipo de instituição é obrigatório' })
      }
    }),
  companyName: z.string().min(1, 'Nome da empresa é obrigatório'),
  responsibleName: z.string().min(1, 'Nome do responsável é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  cep: z.string().optional(),
  state: z.string().optional(),
  neighborhood: z.string().optional(),
  streetNumber: z.string().optional(),
  complement: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  referral: z.string().optional(),
  voucher: z.string().optional(),
  acceptTerms: z.boolean(),
})

type SignupValues = z.infer<typeof signupSchema>

export function CompanySignupPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const accessToken = useAuthStore((s) => s.session.accessToken)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      institutionType: undefined,
      companyName: '',
      responsibleName: '',
      email: '',
      password: '',
      city: '',
      cep: '',
      state: '',
      neighborhood: '',
      streetNumber: '',
      complement: '',
      phone: '',
      mobile: '',
      referral: '',
      voucher: '',
      acceptTerms: false,
    },
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
    if (!values.acceptTerms) {
      form.setError('acceptTerms', { type: 'custom', message: 'Você precisa aceitar os termos' })
      return
    }

    const response = await apiFetch<AuthResponse>('/api/auth/sign-up', {
      method: 'POST',
      body: JSON.stringify({
        tenantName: values.companyName,
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

  if (accessToken) {
    return (
      <div style={{ maxWidth: 520, margin: '48px auto', padding: 16 }}>
        <h1>Você já está logado</h1>
        <div style={{ marginTop: 12 }}>
          <Link to="/dashboard">Ir para o painel</Link>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, rgba(100,108,255,0.12), transparent 40%), #0b0d12',
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
            <Link to="/" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Home
            </Link>
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Login
            </Link>
          </nav>
        </header>

        <main style={{ marginTop: 26 }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 13,
              }}
            >
              Pronto para experimentar?
            </div>
            <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: '12px 0 8px' }}>Cadastre sua empresa</h1>
            <div style={{ color: 'rgba(255,255,255,0.74)', fontSize: 14 }}>
              Este formulário é para empresas/organizações. Profissional: fale com o coordenador da sua equipe.
            </div>

            <form
              onSubmit={async (e) => {
                try {
                  await onSubmit(e)
                } catch (err) {
                  const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                  setSubmitError(message || 'Não foi possível concluir o cadastro. Tente novamente.')
                }
              }}
              style={{ marginTop: 18, display: 'grid', gap: 14 }}
            >
              <Card>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>1. Dados da Empresa</div>
                <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>
                  Informe os dados básicos da organização para criar o tenant administrativo.
                </div>

                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <Field label="Tipo de instituição" error={form.formState.errors.institutionType?.message}>
                    <select {...form.register('institutionType')}>
                      <option value="">Selecione</option>
                      <option value="Hospital">Hospital</option>
                      <option value="Cooperativa">Cooperativa</option>
                      <option value="Grupo médico">Grupo médico</option>
                      <option value="Secretaria de Saúde">Secretaria de Saúde</option>
                      <option value="Clínica">Clínica</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </Field>

                  <Field label="Nome da empresa" error={form.formState.errors.companyName?.message}>
                    <input type="text" {...form.register('companyName')} />
                  </Field>

                  <Field label="Nome do responsável" error={form.formState.errors.responsibleName?.message}>
                    <input type="text" {...form.register('responsibleName')} />
                  </Field>
                </div>
              </Card>

              <Card>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>2. Dados de Acesso</div>
                <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>
                  Estes dados serão usados para entrar no sistema.
                </div>

                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <Field label="E-mail" error={form.formState.errors.email?.message}>
                    <input type="email" {...form.register('email')} />
                  </Field>
                  <Field label="Senha" error={form.formState.errors.password?.message}>
                    <input type="password" {...form.register('password')} />
                  </Field>
                </div>
              </Card>

              <Card>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>3. Dados para Contato</div>
                <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>
                  Endereço e canais para contato (opcional, exceto cidade).
                </div>

                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <Field label="CEP" error={form.formState.errors.cep?.message}>
                    <input type="text" inputMode="numeric" {...form.register('cep')} />
                  </Field>
                  <Field label="Estado" error={form.formState.errors.state?.message}>
                    <input type="text" {...form.register('state')} />
                  </Field>
                  <Field label="Cidade" error={form.formState.errors.city?.message}>
                    <input type="text" {...form.register('city')} />
                  </Field>
                  <Field label="Bairro" error={form.formState.errors.neighborhood?.message}>
                    <input type="text" {...form.register('neighborhood')} />
                  </Field>
                  <Field label="Rua, número" error={form.formState.errors.streetNumber?.message}>
                    <input type="text" {...form.register('streetNumber')} />
                  </Field>
                  <Field label="Complemento" error={form.formState.errors.complement?.message}>
                    <input type="text" {...form.register('complement')} />
                  </Field>
                  <Field label="Telefone fixo" error={form.formState.errors.phone?.message}>
                    <input type="tel" {...form.register('phone')} />
                  </Field>
                  <Field label="Celular" error={form.formState.errors.mobile?.message}>
                    <input type="tel" {...form.register('mobile')} />
                  </Field>
                </div>
              </Card>

              <Card>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>4. Onde conheceu o GetEscala</div>
                <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>
                  Conte em poucas palavras onde conheceu o GetEscala ou informe um voucher (opcional).
                </div>
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <Field label="Onde conheceu" error={form.formState.errors.referral?.message}>
                    <input type="text" {...form.register('referral')} />
                  </Field>
                  <Field label="Voucher" error={form.formState.errors.voucher?.message}>
                    <input type="text" {...form.register('voucher')} />
                  </Field>
                </div>
              </Card>

              <Card>
                <div style={{ display: 'grid', gap: 10 }}>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <input type="checkbox" {...form.register('acceptTerms')} />
                    <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14 }}>
                      Estou de acordo e aceito os{' '}
                      <Link to="/termos-de-uso" style={{ color: '#00d4ff' }}>
                        termos de uso
                      </Link>{' '}
                      e a{' '}
                      <Link to="/politica-de-privacidade" style={{ color: '#00d4ff' }}>
                        política de privacidade
                      </Link>
                      .
                    </span>
                  </label>
                  {form.formState.errors.acceptTerms?.message ? (
                    <div style={{ color: '#ff6b6b', fontSize: 13 }}>{form.formState.errors.acceptTerms.message}</div>
                  ) : null}

                  {submitError ? <div style={{ color: '#ff6b6b', fontSize: 13 }}>{submitError}</div> : null}

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                      type="submit"
                      style={{
                        padding: '12px 16px',
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #646cff, #00d4ff)',
                        color: '#0b0d12',
                        fontWeight: 800,
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                    >
                      Criar conta
                    </button>
                    <Link
                      to="/login"
                      style={{
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.16)',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.92)',
                        fontWeight: 700,
                      }}
                    >
                      Já tenho conta
                    </Link>
                  </div>
                </div>
              </Card>
            </form>
          </div>
        </main>

        <footer style={{ marginTop: 54, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13 }}>© {new Date().getFullYear()} GetEscala</div>
            <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
              <Link to="/termos-de-uso" style={{ color: 'rgba(255,255,255,0.68)' }}>
                Termos de Uso
              </Link>
              <Link to="/politica-de-privacidade" style={{ color: 'rgba(255,255,255,0.68)' }}>
                Política de Privacidade
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.05)',
        padding: 16,
        textAlign: 'left',
      }}
    >
      {children}
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)' }}>{label}</span>
      {children}
      {error ? <span style={{ fontSize: 13, color: '#ff6b6b' }}>{error}</span> : null}
    </label>
  )
}
