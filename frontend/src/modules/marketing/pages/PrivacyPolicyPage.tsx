import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function PrivacyPolicyPage() {
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
            <img src="/icon.png" alt="GetEscala" style={{ width: 34, height: 34, borderRadius: 10 }} />
            <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>GetEscala</div>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Home
            </Link>
            <Link to="/termos-de-uso" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Termos
            </Link>
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Login
            </Link>
          </nav>
        </header>

        <main style={{ marginTop: 26 }}>
          <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: '0 0 10px' }}>Política de Privacidade</h1>
          <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 14 }}>
            Última atualização: {formatDate(new Date())}
          </div>

          <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
            <Card>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.78)' }}>
                Este documento descreve como o GetEscala coleta, utiliza, compartilha e protege dados pessoais no
                contexto de gestão de escalas, turnos e presença. O uso da plataforma implica ciência desta política.
              </p>
            </Card>

            <Card>
              <SectionTitle>1. Definições</SectionTitle>
              <List
                items={[
                  'Dado pessoal: informação relacionada a pessoa natural identificada ou identificável.',
                  'Dado pessoal sensível: dados sobre origem racial/étnica, convicção religiosa, opinião política, filiação sindical, dados de saúde/vida sexual, dados genéticos/biométricos, entre outros previstos em lei.',
                  'Titular: pessoa natural a quem se referem os dados pessoais.',
                  'Controlador: quem toma decisões sobre o tratamento de dados pessoais.',
                  'Operador: quem realiza o tratamento em nome do controlador.',
                  'Tratamento: toda operação realizada com dados pessoais (coleta, uso, armazenamento, eliminação etc.).',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>2. Papéis (Controlador e Operador)</SectionTitle>
              <List
                items={[
                  'Em geral, a organização cliente (Gestor) atua como Controladora dos dados de seus profissionais e da operação de escalas.',
                  'O GetEscala pode atuar como Operador (quando trata dados em nome do cliente) e/ou como Controlador (para dados necessários à segurança, auditoria, cobrança e melhoria do serviço).',
                  'As responsabilidades podem variar conforme contrato e configuração da plataforma.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>3. Quais dados coletamos</SectionTitle>
              <List
                items={[
                  'Dados cadastrais: nome, e-mail, identificadores internos, função/cargo e vínculos com equipes.',
                  'Dados de autenticação: credenciais, tokens, logs de acesso, eventos de segurança.',
                  'Dados operacionais: escalas, turnos, apontamentos de presença, status de publicação e histórico de alterações.',
                  'Dados técnicos: endereço IP, informações do dispositivo/navegador e métricas de erro/desempenho.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>4. Finalidades de uso</SectionTitle>
              <List
                items={[
                  'Permitir cadastro, autenticação e controle de acesso por tenant.',
                  'Viabilizar criação, publicação e consulta de escalas e turnos.',
                  'Registrar presença e trilha de auditoria para rastreabilidade.',
                  'Proteger contra fraudes, abuso e incidentes de segurança.',
                  'Operar, manter, corrigir e melhorar a plataforma.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>5. Bases legais</SectionTitle>
              <List
                items={[
                  'Execução de contrato e procedimentos preliminares relacionados à prestação do serviço.',
                  'Cumprimento de obrigação legal/regulatória, quando aplicável.',
                  'Legítimo interesse (por exemplo, segurança da informação, prevenção a fraudes e melhoria do serviço), com avaliação e salvaguardas.',
                  'Consentimento, quando exigido por lei para finalidades específicas.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>6. Compartilhamento de dados</SectionTitle>
              <List
                items={[
                  'Provedores de infraestrutura e hospedagem (por exemplo, para executar o serviço e armazenar dados).',
                  'Prestadores de suporte e monitoramento (por exemplo, observabilidade e atendimento).',
                  'Autoridades públicas, mediante obrigação legal ou ordem válida.',
                  'Não vendemos dados pessoais.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>7. Segurança da informação</SectionTitle>
              <List
                items={[
                  'Aplicamos controles técnicos e organizacionais para proteger os dados contra acesso não autorizado, perda e alteração indevida.',
                  'Utilizamos registros de auditoria e monitoramento para detectar e responder a incidentes.',
                  'Nenhuma medida é absoluta; por isso, recomendamos boas práticas de senha e controle de acesso pela organização.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>8. Retenção e eliminação</SectionTitle>
              <List
                items={[
                  'Mantemos dados pelo tempo necessário para cumprir finalidades do serviço, obrigações legais e necessidades de auditoria.',
                  'A eliminação pode ocorrer após término de contrato, respeitando prazos legais e requisitos de segurança.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>9. Direitos do titular</SectionTitle>
              <List
                items={[
                  'Confirmação de tratamento e acesso aos dados.',
                  'Correção de dados incompletos/inexatos.',
                  'Anonimização, bloqueio ou eliminação, quando aplicável.',
                  'Portabilidade, nos termos legais.',
                  'Informações sobre compartilhamentos e possibilidade de oposição, quando aplicável.',
                ]}
              />
            </Card>

            <Card>
              <SectionTitle>10. Como exercer direitos e contato</SectionTitle>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.78)' }}>
                Para solicitações relacionadas a dados pessoais, o canal principal é o Gestor da sua organização
                (Controlador). Caso necessário, o GetEscala poderá orientar o encaminhamento adequado conforme o papel
                exercido em cada tratamento.
              </p>
            </Card>

            <Card>
              <SectionTitle>11. Atualizações desta política</SectionTitle>
              <List
                items={[
                  'Podemos atualizar esta política para refletir mudanças legais, técnicas ou operacionais.',
                  'A data de atualização é indicada no topo deste documento.',
                ]}
              />
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
