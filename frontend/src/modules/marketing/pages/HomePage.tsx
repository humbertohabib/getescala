import { Link } from 'react-router-dom'
import { useAuthStore } from '../../../app/store'

export function HomePage() {
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
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '24px 20px 64px',
        }}
      >
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
            <a href="#recursos" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Recursos
            </a>
            <a href="#como-funciona" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Como funciona
            </a>
            <a href="#depoimentos" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Depoimentos
            </a>
            {!accessToken ? (
              <Link to="/cadastro" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Cadastro
              </Link>
            ) : null}
            <Link
              to={accessToken ? '/dashboard' : '/login'}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              {accessToken ? 'Acessar painel' : 'Entrar'}
            </Link>
          </nav>
        </header>

        <main>
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr',
              gap: 24,
              alignItems: 'center',
              paddingTop: 36,
            }}
          >
            <div>
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
                Gestão de escalas, turnos e presença
              </div>
              <h1 style={{ fontSize: 54, lineHeight: 1.06, margin: '14px 0 10px' }}>
                Escalas em dia.
                <br />
                Equipes alinhadas.
                <br />
                Decisão mais rápida.
              </h1>
              <p style={{ fontSize: 18, margin: 0, color: 'rgba(255,255,255,0.76)' }}>
                Centralize a criação de escalas, controle de presença e acompanhamento de plantões em um fluxo simples
                para gestores e profissionais.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
                <Link
                  to={accessToken ? '/dashboard' : '/cadastro'}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #646cff, #00d4ff)',
                    color: '#0b0d12',
                    fontWeight: 700,
                  }}
                >
                  {accessToken ? 'Abrir painel' : 'Começar agora'}
                </Link>
                <a
                  href="#recursos"
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.16)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.92)',
                  }}
                >
                  Ver recursos
                </a>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 18,
                  marginTop: 20,
                  flexWrap: 'wrap',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 14,
                }}
              >
                <span>Web</span>
                <span>•</span>
                <span>Fluxos por tenant</span>
                <span>•</span>
                <span>Autenticação com JWT</span>
              </div>
            </div>

            <div
              style={{
                borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.12)',
                background:
                  'radial-gradient(800px 260px at 50% 0%, rgba(100,108,255,0.18), transparent), rgba(255,255,255,0.05)',
                padding: 18,
              }}
            >
              <div style={{ display: 'grid', gap: 10 }}>
                <MetricCard title="Visão em tempo real" value="Escalas publicadas" detail="com alterações rastreáveis" />
                <MetricCard title="Presença simplificada" value="Check-in / Check-out" detail="com validação" />
                <MetricCard title="Gestão operacional" value="Trocas e folgas" detail="com aprovação" />
              </div>
            </div>
          </section>

          <section id="recursos" style={{ marginTop: 64 }}>
            <SectionTitle
              eyebrow="Recursos"
              title="Tudo o que você precisa para operar a escala"
              subtitle="O foco é reduzir retrabalho e aumentar previsibilidade: do planejamento ao acompanhamento do realizado."
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
                title="Escalas e turnos"
                items={['Criação e publicação de escalas', 'Controle de turnos por equipe', 'Visibilidade por período']}
              />
              <FeatureCard
                title="Presença e apontamentos"
                items={['Registro de entrada e saída', 'Exportação para conferência', 'Auditoria por usuário e tenant']}
              />
              <FeatureCard
                title="Operação diária"
                items={['Trocas e cancelamentos', 'Lista de profissionais', 'Fluxo simples para o gestor']}
              />
            </div>
          </section>

          <section id="como-funciona" style={{ marginTop: 64 }}>
            <SectionTitle
              eyebrow="Como funciona"
              title="Um fluxo em 3 passos"
              subtitle="Planeje, publique e acompanhe — com acesso controlado e rastreabilidade."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 18 }}>
              <StepCard number="1" title="Planeje" text="Cadastre profissionais, crie turnos e organize a escala." />
              <StepCard number="2" title="Publique" text="Bloqueie e publique a versão válida para a equipe." />
              <StepCard number="3" title="Acompanhe" text="Registre presença, resolva ajustes e exporte relatórios." />
            </div>
          </section>

          <section id="depoimentos" style={{ marginTop: 64 }}>
            <SectionTitle
              eyebrow="Depoimentos"
              title="Feedback de quem vive a operação"
              subtitle="Textos ilustrativos para a home. Personalizamos depois com relatos reais dos seus clientes."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 18 }}>
              <TestimonialCard
                label="Gestão"
                text="“Conseguimos organizar publicação de escala e reduzir ajustes de última hora.”"
                author="Coordenador(a) de operações"
              />
              <TestimonialCard
                label="Transparência"
                text="“O time enxerga a escala e as mudanças com clareza. Menos mensagens e retrabalho.”"
                author="Gestor(a) de equipe"
              />
              <TestimonialCard
                label="Agilidade"
                text="“Os relatórios e exportações deixam o fechamento mais rápido e previsível.”"
                author="Financeiro / Backoffice"
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
                <div style={{ fontSize: 18, fontWeight: 800 }}>Pronto para organizar a escala?</div>
                <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.78)' }}>
                  Acesse o ambiente e comece a estruturar sua operação.
                </div>
              </div>
              <Link
                to={accessToken ? '/dashboard' : '/login'}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: '#0b0d12',
                  color: 'rgba(255,255,255,0.92)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  fontWeight: 700,
                }}
              >
                {accessToken ? 'Ir para o painel' : 'Entrar'}
              </Link>
            </div>
          </section>
        </main>

        <footer style={{ marginTop: 54, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13 }}>© {new Date().getFullYear()} GetEscala</div>
            <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
              <a href="#recursos" style={{ color: 'rgba(255,255,255,0.68)' }}>
                Recursos
              </a>
              <a href="#como-funciona" style={{ color: 'rgba(255,255,255,0.68)' }}>
                Como funciona
              </a>
              <Link to="/termos-de-uso" style={{ color: 'rgba(255,255,255,0.68)' }}>
                Termos de Uso
              </Link>
              <Link to="/politica-de-privacidade" style={{ color: 'rgba(255,255,255,0.68)' }}>
                Política de Privacidade
              </Link>
              <Link to="/login" style={{ color: 'rgba(255,255,255,0.68)' }}>
                Login
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

function FeatureCard({ title, items }: { title: string; items: string[] }) {
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
      <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'grid', gap: 8, color: 'rgba(255,255,255,0.76)', fontSize: 14 }}>
        {items.map((item) => (
          <div key={item} style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#00d4ff' }}>•</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepCard({ number, title, text }: { number: string; title: string; text: string }) {
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
          width: 34,
          height: 34,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.14)',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800,
          marginBottom: 10,
        }}
      >
        {number}
      </div>
      <div style={{ fontWeight: 800 }}>{title}</div>
      <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.76)', fontSize: 14 }}>{text}</div>
    </div>
  )
}

function MetricCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(0,0,0,0.18)',
        padding: 14,
      }}
    >
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{title}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{detail}</div>
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
