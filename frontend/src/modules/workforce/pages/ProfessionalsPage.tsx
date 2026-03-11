import { Link } from 'react-router-dom'
import { useCreateProfessional } from '../hooks/useCreateProfessional'
import { useProfessionals } from '../hooks/useProfessionals'

export function ProfessionalsPage() {
  const professionalsQuery = useProfessionals()
  const createProfessionalMutation = useCreateProfessional()

  return (
    <div style={{ maxWidth: 960, margin: '32px auto', padding: 16 }}>
      <h1>Profissionais</h1>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Link to="/dashboard">Voltar</Link>
      </div>

      <div style={{ marginTop: 16 }}>
        <h2>Novo profissional</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.currentTarget
            const fullName = (form.elements.namedItem('fullName') as HTMLInputElement).value
            const email = (form.elements.namedItem('email') as HTMLInputElement).value
            const phone = (form.elements.namedItem('phone') as HTMLInputElement).value

            createProfessionalMutation.mutate({
              fullName,
              email: email || null,
              phone: phone || null,
            })
          }}
          style={{ display: 'grid', gap: 12, maxWidth: 420 }}
        >
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Nome completo</span>
            <input name="fullName" type="text" required />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>E-mail</span>
            <input name="email" type="email" />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Telefone</span>
            <input name="phone" type="tel" />
          </label>
          <button type="submit" disabled={createProfessionalMutation.isPending}>
            {createProfessionalMutation.isPending ? 'Criando...' : 'Criar profissional'}
          </button>
          {createProfessionalMutation.error ? (
            <div>Erro ao criar: {(createProfessionalMutation.error as { message?: string }).message ?? 'erro'}</div>
          ) : null}
        </form>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>Lista</h2>
        {professionalsQuery.isLoading ? <div>Carregando...</div> : null}
        {professionalsQuery.error ? (
          <div>Erro ao carregar: {(professionalsQuery.error as { message?: string }).message ?? 'erro'}</div>
        ) : null}
        {professionalsQuery.data ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {professionalsQuery.data.length === 0 ? <div>Nenhum profissional cadastrado.</div> : null}
            {professionalsQuery.data.map((p) => (
              <div key={p.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <div>{p.fullName}</div>
                <div>{p.email ?? '-'}</div>
                <div>{p.phone ?? '-'}</div>
                <div>Status: {p.status}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
