import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../app/store'
import { apiFetch, type ApiError } from '../../../core/api/client'
import { useCreateProfessional } from '../hooks/useCreateProfessional'
import { useProfessionals } from '../hooks/useProfessionals'
import type { Professional } from '../types/professional'

function parseJwtRoles(accessToken: string | null): string[] {
  if (!accessToken) return []
  const parts = accessToken.split('.')
  if (parts.length < 2) return []
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = atob(padded)
    const payload = JSON.parse(json) as unknown
    if (typeof payload !== 'object' || payload == null) return []
    const roles = (payload as Record<string, unknown>).roles
    if (!Array.isArray(roles)) return []
    return roles.filter((r) => typeof r === 'string') as string[]
  } catch {
    return []
  }
}

type ProfessionalFormState = {
  fullName: string
  email: string
  phone: string
}

export function ProfessionalsPage() {
  const session = useAuthStore((s) => s.session)
  const roles = useMemo(() => parseJwtRoles(session.accessToken), [session.accessToken])
  const canManageProfessionals = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN') || roles.includes('COORDINATOR')

  const queryClient = useQueryClient()
  const professionalsQuery = useProfessionals()
  const createProfessionalMutation = useCreateProfessional()
  const updateProfessionalMutation = useMutation({
    mutationFn: async (input: { professionalId: string; data: { fullName: string; email: string | null; phone: string | null } }) => {
      return apiFetch<Professional>(`/api/professionals/${input.professionalId}`, {
        method: 'PUT',
        body: JSON.stringify(input.data),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['professionals'] })
    },
  })

  const deactivateProfessionalMutation = useMutation({
    mutationFn: async (professionalId: string) => {
      return apiFetch<Professional>(`/api/professionals/${professionalId}`, { method: 'DELETE' })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['professionals'] })
    },
  })

  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<
    | { open: false }
    | {
        open: true
        mode: 'create' | 'edit'
        professionalId: string | null
        title: string
        form: ProfessionalFormState
      }
  >({ open: false })
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null)

  const professionalsFiltered = useMemo(() => {
    const list = (professionalsQuery.data ?? []).filter((p) => p.status !== 'INACTIVE')
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((p) => {
      const hay = `${p.fullName} ${p.email ?? ''} ${p.phone ?? ''} ${p.status}`.toLowerCase()
      return hay.includes(q)
    })
  }, [professionalsQuery.data, search])

  function openCreate() {
    createProfessionalMutation.reset()
    setModal({
      open: true,
      mode: 'create',
      professionalId: null,
      title: 'Adicionar profissional',
      form: { fullName: '', email: '', phone: '' },
    })
  }

  function openEdit(p: Professional) {
    updateProfessionalMutation.reset()
    setModal({
      open: true,
      mode: 'edit',
      professionalId: p.id,
      title: 'Alterar profissional',
      form: { fullName: p.fullName ?? '', email: p.email ?? '', phone: p.phone ?? '' },
    })
  }

  function closeModal() {
    setModal({ open: false })
  }

  const submitBusy =
    createProfessionalMutation.isPending || updateProfessionalMutation.isPending || deactivateProfessionalMutation.isPending

  return (
    <div style={{ maxWidth: 980, margin: '32px auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ opacity: 0.75, fontWeight: 800 }}>
            <Link to="/dashboard#users/profissionais">Usuários</Link> / Profissionais
          </div>
          <h1 style={{ margin: 0 }}>Profissionais</h1>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link className="ge-pillLink" to="/dashboard#users/profissionais">
            Voltar
          </Link>
          {canManageProfessionals ? (
            <button type="button" className="ge-buttonPrimary" onClick={openCreate}>
              Adicionar Profissional
            </button>
          ) : null}
        </div>
      </div>

      {!canManageProfessionals ? (
        <div style={{ marginTop: 12, opacity: 0.85 }}>
          Apenas usuários do tipo Administrador e Coordenador têm permissão para criar, alterar e excluir profissionais.
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="ge-input"
          placeholder="Pesquisar por profissional..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        {professionalsQuery.isLoading ? <div>Carregando...</div> : null}
        {professionalsQuery.error ? (
          <div className="ge-errorText">Erro ao carregar: {(professionalsQuery.error as { message?: string }).message ?? 'erro'}</div>
        ) : null}
        {professionalsQuery.data ? (
          <div style={{ border: '1px solid rgba(127, 127, 127, 0.25)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                <thead>
                  <tr style={{ background: 'color-mix(in srgb, Canvas 96%, transparent)' }}>
                    <th style={{ textAlign: 'left', padding: 12 }}>Nome</th>
                    <th style={{ textAlign: 'left', padding: 12 }}>E-mail</th>
                    <th style={{ textAlign: 'left', padding: 12 }}>Telefone</th>
                    <th style={{ textAlign: 'left', padding: 12, width: 130 }}>Status</th>
                    <th style={{ textAlign: 'right', padding: 12, width: 220 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {professionalsFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 14, opacity: 0.75 }}>
                        Nenhum profissional encontrado.
                      </td>
                    </tr>
                  ) : (
                    professionalsFiltered.map((p) => (
                      <tr key={p.id} style={{ borderTop: '1px solid rgba(127, 127, 127, 0.18)' }}>
                        <td style={{ padding: 12, fontWeight: 900 }}>{p.fullName}</td>
                        <td style={{ padding: 12 }}>{p.email ?? '-'}</td>
                        <td style={{ padding: 12 }}>{p.phone ?? '-'}</td>
                        <td style={{ padding: 12 }}>{p.status}</td>
                        <td style={{ padding: 12 }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {canManageProfessionals ? (
                              <>
                                <button type="button" className="ge-buttonSecondary" onClick={() => openEdit(p)} disabled={submitBusy}>
                                  Alterar
                                </button>
                                <button
                                  type="button"
                                  className="ge-buttonDanger"
                                  onClick={() => setConfirmDeactivateId(p.id)}
                                  disabled={submitBusy}
                                >
                                  Excluir
                                </button>
                              </>
                            ) : (
                              <span style={{ opacity: 0.65 }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      {modal.open ? (
        <div className="ge-modalOverlay" role="dialog" aria-modal="true">
          <div className="ge-modal">
            <div className="ge-modalHeader">
              <div className="ge-modalTitle">{modal.title}</div>
              <button type="button" className="ge-modalClose" onClick={closeModal} aria-label="Fechar" disabled={submitBusy}>
                ×
              </button>
            </div>
            <div className="ge-modalBody">
              <form
                className="ge-modalForm"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!canManageProfessionals) return
                  const fullName = modal.form.fullName.trim()
                  const email = modal.form.email.trim()
                  const phone = modal.form.phone.trim()
                  if (modal.mode === 'create') {
                    createProfessionalMutation.mutate(
                      {
                        fullName,
                        email: email ? email : null,
                        phone: phone ? phone : null,
                      },
                      { onSuccess: () => closeModal() },
                    )
                    return
                  }
                  if (!modal.professionalId) return
                  updateProfessionalMutation.mutate(
                    {
                      professionalId: modal.professionalId,
                      data: { fullName, email: email ? email : null, phone: phone ? phone : null },
                    },
                    { onSuccess: () => closeModal() },
                  )
                }}
              >
                <label className="ge-modalField">
                  <div className="ge-modalLabel">Nome completo</div>
                  <input
                    className="ge-input"
                    type="text"
                    required
                    value={modal.form.fullName}
                    onChange={(e) =>
                      setModal((prev) => (prev.open ? { ...prev, form: { ...prev.form, fullName: e.target.value } } : prev))
                    }
                    disabled={!canManageProfessionals || submitBusy}
                  />
                </label>
                <label className="ge-modalField">
                  <div className="ge-modalLabel">E-mail</div>
                  <input
                    className="ge-input"
                    type="email"
                    value={modal.form.email}
                    onChange={(e) =>
                      setModal((prev) => (prev.open ? { ...prev, form: { ...prev.form, email: e.target.value } } : prev))
                    }
                    disabled={!canManageProfessionals || submitBusy}
                  />
                </label>
                <label className="ge-modalField">
                  <div className="ge-modalLabel">Telefone</div>
                  <input
                    className="ge-input"
                    type="tel"
                    value={modal.form.phone}
                    onChange={(e) =>
                      setModal((prev) => (prev.open ? { ...prev, form: { ...prev.form, phone: e.target.value } } : prev))
                    }
                    disabled={!canManageProfessionals || submitBusy}
                  />
                </label>

                {(() => {
                  const err = (modal.mode === 'create' ? createProfessionalMutation.error : updateProfessionalMutation.error) as
                    | Partial<ApiError>
                    | undefined
                  if (!err) return null
                  if (err.status === 402) {
                    return (
                      <div style={{ display: 'grid', gap: 6 }}>
                        <div className="ge-errorText">Limite do plano atingido.</div>
                        <div>
                          Vá em <Link to="/planos">Planos</Link> para ajustar sua assinatura.
                        </div>
                      </div>
                    )
                  }
                  return <div className="ge-errorText">Erro: {err.message ?? 'erro'}</div>
                })()}

                <div className="ge-modalActions">
                  <button type="button" className="ge-buttonSecondary" onClick={closeModal} disabled={submitBusy}>
                    Cancelar
                  </button>
                  <button type="submit" className="ge-buttonPrimary" disabled={!canManageProfessionals || submitBusy}>
                    {modal.mode === 'create'
                      ? createProfessionalMutation.isPending
                        ? 'Salvando...'
                        : 'Salvar'
                      : updateProfessionalMutation.isPending
                        ? 'Salvando...'
                        : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDeactivateId ? (
        <div className="ge-modalOverlay" role="dialog" aria-modal="true">
          <div className="ge-modal">
            <div className="ge-modalHeader">
              <div className="ge-modalTitle">Excluir profissional</div>
              <button
                type="button"
                className="ge-modalClose"
                onClick={() => setConfirmDeactivateId(null)}
                aria-label="Fechar"
                disabled={submitBusy}
              >
                ×
              </button>
            </div>
            <div className="ge-modalBody">
              <div style={{ display: 'grid', gap: 10 }}>
                <div>Deseja realmente excluir este profissional?</div>
                {deactivateProfessionalMutation.error ? (
                  <div className="ge-errorText">
                    Erro: {(deactivateProfessionalMutation.error as Partial<ApiError>)?.message ?? 'erro'}
                  </div>
                ) : null}
                <div className="ge-modalActions">
                  <button type="button" className="ge-buttonSecondary" onClick={() => setConfirmDeactivateId(null)} disabled={submitBusy}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="ge-buttonDanger"
                    onClick={() => {
                      if (!canManageProfessionals) return
                      deactivateProfessionalMutation.mutate(confirmDeactivateId, {
                        onSuccess: () => setConfirmDeactivateId(null),
                      })
                    }}
                    disabled={!canManageProfessionals || submitBusy}
                  >
                    {deactivateProfessionalMutation.isPending ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
