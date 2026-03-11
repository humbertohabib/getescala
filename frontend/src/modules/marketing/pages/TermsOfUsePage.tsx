import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function TermsOfUsePage() {
  return (
    <div
      style={{
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, rgba(100,108,255,0.12), transparent 40%), #0b0d12',
        color: 'rgba(255,255,255,0.92)',
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
          <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: '0 0 10px' }}>Termos de Uso</h1>
          <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 14 }}>
            Última atualização: {formatDate(new Date())}
          </div>

          <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
            <Card>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.78)' }}>
                Estes Termos de Uso regulam o acesso e o uso da plataforma GetEscala por gestores e usuários
                (profissionais). Ao criar uma conta, acessar ou utilizar a plataforma, você declara que leu e concorda
                com estes termos.
              </p>
            </Card>

            <Card>
              <SectionTitle>1. Definições</SectionTitle>
              <List
                items={[
                  'Plataforma: o software GetEscala, incluindo site, APIs e aplicativos.',
                  'Gestor: a pessoa/organização responsável por administrar a operação, cadastrar usuários, criar escalas e definir regras internas.',
                  'Usuário: profissional que acessa a plataforma para visualizar e executar atividades relacionadas a escalas e presença.',
                  'Tenant: ambiente lógico isolado da plataforma, identificado por organização/unidade.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>2. Aceitação e Elegibilidade</SectionTitle>
              <List
                items={[
                  'Você deve ter capacidade legal para aceitar estes termos.',
                  'O uso da plataforma implica aceitação integral deste documento e de políticas complementares eventualmente publicadas.',
                  'Se você utiliza a plataforma em nome de uma empresa, declara ter poderes para vinculá-la.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>3. Escopo do Serviço</SectionTitle>
              <List
                items={[
                  'A plataforma apoia a gestão de escalas, turnos e registros de presença, conforme funcionalidades disponíveis.',
                  'A plataforma não substitui políticas internas, contratos trabalhistas ou normas específicas do seu setor.',
                  'A plataforma pode evoluir com melhorias, ajustes e alterações de interface, mantendo compatibilidade razoável sempre que possível.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>4. Cadastro, Acesso e Segurança</SectionTitle>
              <List
                items={[
                  'Você é responsável por manter suas credenciais em sigilo e por toda atividade realizada na sua conta.',
                  'O Gestor é responsável por configurar corretamente o tenant, incluindo permissões, escalas e usuários.',
                  'Podemos suspender ou bloquear acessos em caso de suspeita de fraude, abuso, violação de segurança ou descumprimento destes termos.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>5. Regras de Uso e Condutas Proibidas</SectionTitle>
              <List
                items={[
                  'Inserir dados falsos, enganosos ou sem autorização.',
                  'Tentar burlar autenticação, explorar vulnerabilidades, realizar engenharia reversa ou ataques.',
                  'Compartilhar credenciais, tokens, ou permitir acesso de terceiros não autorizados.',
                  'Inserir conteúdo ilegal, discriminatório, abusivo ou que viole direitos de terceiros.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>6. Dados e Privacidade</SectionTitle>
              <List
                items={[
                  'O Gestor e os Usuários devem inserir apenas dados necessários para a operação.',
                  'Dados pessoais devem ser tratados conforme legislação aplicável e políticas internas da organização.',
                  'A plataforma pode armazenar registros de auditoria para fins de segurança, rastreabilidade e suporte.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>7. Disponibilidade e Suporte</SectionTitle>
              <List
                items={[
                  'Buscamos manter a plataforma disponível, mas podem ocorrer indisponibilidades por manutenção, atualizações ou eventos fora do nosso controle.',
                  'Falhas e incidentes podem ser reportados pelos canais oficiais disponibilizados pelo GetEscala.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>8. Planos, Pagamentos e Cancelamento</SectionTitle>
              <List
                items={[
                  'Se aplicável, a contratação é realizada pelo Gestor conforme plano e condições comerciais acordadas.',
                  'A inadimplência pode implicar restrição de acesso e suspensão de recursos, conforme contrato.',
                  'A exclusão de contas e dados pode depender de prazos legais e requisitos de auditoria da organização.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>9. Propriedade Intelectual</SectionTitle>
              <List
                items={[
                  'A plataforma e seus componentes são protegidos por leis de propriedade intelectual.',
                  'Não é permitido copiar, modificar, distribuir ou explorar comercialmente a plataforma sem autorização.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>10. Limitação de Responsabilidade</SectionTitle>
              <List
                items={[
                  'A plataforma é fornecida “como está”, dentro dos limites legais aplicáveis.',
                  'Não nos responsabilizamos por prejuízos decorrentes de configurações incorretas, dados inseridos pelos usuários, ou decisões administrativas tomadas com base em informações fornecidas pela organização.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>11. Alterações destes Termos</SectionTitle>
              <List
                items={[
                  'Podemos atualizar estes termos periodicamente.',
                  'A continuidade de uso após atualização constitui concordância com o novo texto.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>12. Contato</SectionTitle>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.78)' }}>
                Para dúvidas, solicitações e suporte, utilize os canais de contato informados pelo Gestor da sua
                organização ou a página oficial de contato do GetEscala.
              </p>
            </Card>
          </div>
        </main>

        <footer style={{ marginTop: 54, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13 }}>© {new Date().getFullYear()} GetEscala</div>
            <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
              <Link to="/" style={{ color: 'rgba(255,255,255,0.68)' }}>
                Home
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

function SectionTitle({ children }: { children: string }) {
  return <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>{children}</div>
}

function List({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'grid', gap: 8, color: 'rgba(255,255,255,0.78)', fontSize: 14 }}>
      {items.map((item) => (
        <div key={item} style={{ display: 'flex', gap: 10 }}>
          <span style={{ color: '#00d4ff' }}>•</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

function formatDate(date: Date) {
  const day = `${date.getDate()}`.padStart(2, '0')
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
