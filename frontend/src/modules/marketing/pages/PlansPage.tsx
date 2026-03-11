import { Link } from 'react-router-dom'
import { useAuthStore } from '../../../app/store'

export function PlansPage() {
  const accessToken = useAuthStore((s) => s.session.accessToken)

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
            <a href="#planos" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Planos
            </a>
            <a href="#recursos" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Recursos
            </a>
            <a href="#depoimentos" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Depoimentos
            </a>
            <Link to={accessToken ? '/dashboard' : '/login'} style={{ color: 'rgba(255,255,255,0.8)' }}>
              {accessToken ? 'Painel' : 'Entrar'}
            </Link>
          </nav>
        </header>

        <main>
          <section style={{ paddingTop: 34 }}>
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
              Gestão de escalas, plantões e vagas
            </div>
            <h1 style={{ fontSize: 46, lineHeight: 1.08, margin: '14px 0 10px' }}>
              Já pensou em abandonar a planilha?
            </h1>
            <p style={{ margin: 0, fontSize: 18, color: 'rgba(255,255,255,0.76)', maxWidth: 860 }}>
              Para equipes grandes ou pequenas, o ativo mais valioso é o tempo. O GetEscala ajuda você a sair do
              controle manual e operar com previsibilidade, rastreabilidade e comunicação clara com a equipe.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
              <Link
                to={accessToken ? '/dashboard' : '/cadastro'}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #646cff, #00d4ff)',
                  color: '#0b0d12',
                  fontWeight: 800,
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                {accessToken ? 'Abrir painel' : 'Solicitar demonstração'}
              </Link>
              <a
                href="#planos"
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.92)',
                  fontWeight: 700,
                }}
              >
                Ver planos
              </a>
            </div>
          </section>

          <section id="recursos" style={{ marginTop: 64 }}>
            <SectionTitle
              eyebrow="Recursos"
              title="Recursos que facilitam a rotina da sua equipe"
              subtitle="Estruture a operação com indicadores, auditoria e fluxo de publicação. Tudo em um só lugar."
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 14,
                marginTop: 18,
              }}
            >
              <FeatureCard
                title="Painel de indicadores"
                text="Visão consolidada por período, status de publicação e pontos de atenção."
                tags={['Previsibilidade', 'Em tempo real']}
              />
              <FeatureCard
                title="Escalas e publicação"
                text="Crie, bloqueie e publique versões de escala com rastreio de alterações."
                tags={['Controle', 'Rastreabilidade']}
              />
              <FeatureCard
                title="Presença e exportação"
                text="Acompanhe check-in/check-out e exporte apontamentos para conferência."
                tags={['Operação', 'Relatórios']}
              />
            </div>
          </section>

          <section id="planos" style={{ marginTop: 64 }}>
            <SectionTitle
              eyebrow="Planos"
              title="Planos para cada tamanho de operação"
              subtitle="Valores e limites são exemplos e podem ser ajustados. Use esta página para apresentar sua proposta comercial."
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 14,
                marginTop: 18,
              }}
            >
              <PlanCard
                name="Básico"
                price="R$ 499/mês"
                highlight={false}
                bullets={[
                  'Até 50 profissionais',
                  'Web (gestão e consulta)',
                  'Suporte por e-mail',
                  'Relatórios essenciais',
                ]}
                actionLabel="Assinar"
                actionTo="/cadastro"
              />
              <PlanCard
                name="Intermediário"
                price="R$ 799/mês"
                highlight
                bullets={[
                  'Até 100 profissionais',
                  'Web + fluxos de aprovação',
                  'Suporte por e-mail e chat',
                  'Relatórios avançados',
                ]}
                actionLabel="Assinar"
                actionTo="/cadastro"
              />
              <PlanCard
                name="Premium"
                price="Consulte"
                highlight={false}
                bullets={[
                  'Mais de 100 profissionais',
                  'SLA e suporte prioritário',
                  'Relatórios personalizados',
                  'Customizações e integrações',
                ]}
                actionLabel="Falar com vendas"
                actionTo="/cadastro"
              />
            </div>
          </section>

          <section style={{ marginTop: 64 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
              <StatCard value="30M+" label="eventos operacionais" />
              <StatCard value="100k+" label="usuários mensais (exemplo)" />
              <StatCard value="20+" label="relatórios com 1 clique" />
            </div>
          </section>

          <section id="depoimentos" style={{ marginTop: 64 }}>
            <SectionTitle
              eyebrow="Depoimentos"
              title="O que as equipes dizem"
              subtitle="Textos ilustrativos para a página. Substituímos por depoimentos reais depois."
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 14,
                marginTop: 18,
              }}
            >
              <TestimonialCard
                label="Operação"
                text="“Reduzimos o tempo gasto com troca de plantões e publicação de escala.”"
                author="Coordenação"
              />
              <TestimonialCard
                label="Gestão"
                text="“Ter indicadores claros ajudou a antecipar gargalos e cobrir faltas mais rápido.”"
                author="Gestor(a) de equipe"
              />
              <TestimonialCard
                label="Fechamento"
                text="“O histórico e a exportação facilitaram o fechamento e a conferência mensal.”"
                author="Financeiro"
              />
            </div>
          </section>

          <section style={{ marginTop: 64 }}>
            <div
              style={{
                borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'linear-gradient(135deg, rgba(100,108,255,0.22), rgba(0,212,255,0.10))',
                padding: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Vamos fazer um teste?</div>
                <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.78)' }}>
                  Cadastre sua organização e comece a configurar a operação.
                </div>
              </div>
              <Link
                to={accessToken ? '/dashboard' : '/cadastro'}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: '#0b0d12',
                  color: 'rgba(255,255,255,0.92)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  fontWeight: 800,
                }}
              >
                {accessToken ? 'Ir para o painel' : 'Cadastrar empresa'}
              </Link>
            </div>
          </section>
        </main>

        <footer style={{ marginTop: 54, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13 }}>© {new Date().getFullYear()} GetEscala</div>
            <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
              <Link to="/" style={{ color: 'rgba(255,255,255,0.68)' }}>
                Home
              </Link>
              <Link to="/planos" style={{ color: 'rgba(255,255,255,0.68)' }}>
                Planos
              </Link>
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

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle: string
}) {
  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{ fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.62)' }}>
        {eyebrow}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{title}</div>
      <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.72)', maxWidth: 860 }}>{subtitle}</div>
    </div>
  )
}

function FeatureCard({ title, text, tags }: { title: string; text: string; tags: string[] }) {
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
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{title}</div>
      <div style={{ color: 'rgba(255,255,255,0.76)', fontSize: 14 }}>{text}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 12,
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.78)',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

function PlanCard({
  name,
  price,
  bullets,
  actionLabel,
  actionTo,
  highlight,
}: {
  name: string
  price: string
  bullets: string[]
  actionLabel: string
  actionTo: string
  highlight: boolean
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: highlight ? '1px solid rgba(0,212,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
        background: highlight
          ? 'radial-gradient(700px 220px at 50% 0%, rgba(0,212,255,0.20), transparent), rgba(255,255,255,0.06)'
          : 'rgba(255,255,255,0.05)',
        padding: 18,
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{name}</div>
        {highlight ? (
          <div
            style={{
              fontSize: 12,
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid rgba(0,212,255,0.35)',
              background: 'rgba(0,212,255,0.10)',
              color: 'rgba(255,255,255,0.86)',
              whiteSpace: 'nowrap',
            }}
          >
            Mais escolhido
          </div>
        ) : null}
      </div>
      <div style={{ marginTop: 10, fontSize: 28, fontWeight: 900 }}>{price}</div>
      <div style={{ marginTop: 14, display: 'grid', gap: 8, color: 'rgba(255,255,255,0.78)', fontSize: 14 }}>
        {bullets.map((item) => (
          <div key={item} style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#00d4ff' }}>•</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
      <Link
        to={actionTo}
        style={{
          marginTop: 16,
          display: 'inline-block',
          padding: '10px 14px',
          borderRadius: 12,
          background: highlight ? 'linear-gradient(135deg, #646cff, #00d4ff)' : 'rgba(255,255,255,0.06)',
          color: highlight ? '#0b0d12' : 'rgba(255,255,255,0.92)',
          border: highlight ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.16)',
          fontWeight: 800,
        }}
      >
        {actionLabel}
      </Link>
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
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
      <div style={{ fontSize: 28, fontWeight: 900 }}>{value}</div>
      <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>{label}</div>
    </div>
  )
}

function TestimonialCard({ label, text, author }: { label: string; text: string; author: string }) {
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
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '6px 10px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(255,255,255,0.06)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.78)',
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 12, fontSize: 15, color: 'rgba(255,255,255,0.86)' }}>{text}</div>
      <div style={{ marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.68)' }}>{author}</div>
    </div>
  )
}
