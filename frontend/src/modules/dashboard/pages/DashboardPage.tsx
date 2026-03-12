import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../../../app/store'
import { apiFetch } from '../../../core/api/client'

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

export function DashboardPage() {
  const session = useAuthStore((s) => s.session)
  const clearSession = useAuthStore((s) => s.clearSession)
  const roles = useMemo(() => parseJwtRoles(session.accessToken), [session.accessToken])
  const isAdmin = roles.includes('ADMIN')
  const isSuperAdmin = roles.includes('SUPER_ADMIN')

  const [organizationTypes, setOrganizationTypes] = useState<
    Array<{ id: string; segmentId: string; name: string; userTerm: string; shiftTerm: string }>
  >([])
  const [tenantInfo, setTenantInfo] = useState<{
    id: string
    name: string
    organizationTypeId: string | null
    organizationTypeName: string | null
    userTerm: string | null
    shiftTerm: string | null
  } | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)

  const [segments, setSegments] = useState<Array<{ id: string; name: string }>>([])
  const [systemOrganizationTypes, setSystemOrganizationTypes] = useState<
    Array<{ id: string; segmentId: string; name: string; userTerm: string; shiftTerm: string }>
  >([])
  const [systemError, setSystemError] = useState<string | null>(null)
  const [newSegmentName, setNewSegmentName] = useState('')
  const [newType, setNewType] = useState<{ segmentId: string; name: string; userTerm: string; shiftTerm: string }>({
    segmentId: '',
    name: '',
    userTerm: '',
    shiftTerm: '',
  })

  async function loadAdminData() {
    try {
      const [tenant, types] = await Promise.all([
        apiFetch<{
          id: string
          name: string
          organizationTypeId: string | null
          organizationTypeName: string | null
          userTerm: string | null
          shiftTerm: string | null
        }>('/api/admin/tenant'),
        apiFetch<Array<{ id: string; segmentId: string; name: string; userTerm: string; shiftTerm: string }>>('/api/public/organization-types'),
      ])
      setTenantInfo(tenant)
      setOrganizationTypes(types.slice().sort((a, b) => a.name.localeCompare(b.name)))
      setAdminError(null)
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setAdminError(message || 'Não foi possível carregar as configurações da organização.')
    }
  }

  async function loadSystemData() {
    try {
      const [segmentsResponse, typesResponse] = await Promise.all([
        apiFetch<Array<{ id: string; name: string }>>('/api/system/catalog/segments'),
        apiFetch<Array<{ id: string; segmentId: string; name: string; userTerm: string; shiftTerm: string }>>('/api/system/catalog/organization-types'),
      ])
      setSegments(segmentsResponse.slice().sort((a, b) => a.name.localeCompare(b.name)))
      setSystemOrganizationTypes(typesResponse.slice().sort((a, b) => a.name.localeCompare(b.name)))
      setSystemError(null)
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setSystemError(message || 'Não foi possível carregar o catálogo.')
    }
  }

  useEffect(() => {
    if (!session.accessToken) return
    const timers: number[] = []
    if (isAdmin) {
      timers.push(window.setTimeout(() => void loadAdminData(), 0))
    }
    if (isSuperAdmin) {
      timers.push(window.setTimeout(() => void loadSystemData(), 0))
    }
    return () => {
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [session.accessToken, isAdmin, isSuperAdmin])

  return (
    <div style={{ maxWidth: 960, margin: '32px auto', padding: 16 }}>
      <h1>Dashboard</h1>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Link to="/schedules">Escalas</Link>
        <Link to="/attendance">Apontamentos</Link>
        <Link to="/shifts">Turnos</Link>
        <Link to="/professionals">Profissionais</Link>
        <Link
          to="/login"
          onClick={() => {
            clearSession()
          }}
        >
          Sair
        </Link>
      </div>
      <div style={{ marginTop: 16 }}>
        <div>Tenant: {session.tenantId ?? '-'}</div>
        <div>Schedule: {session.defaultScheduleId ?? '-'}</div>
        <div>User: {session.userId ?? '-'}</div>
        <div>Roles: {roles.length ? roles.join(', ') : '-'}</div>
      </div>

      {isAdmin ? (
        <div style={{ marginTop: 24, padding: 16, borderRadius: 12, border: '1px solid rgba(0,0,0,0.12)' }}>
          <h2 style={{ margin: 0 }}>Configuração da organização</h2>
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            {adminError ? <div style={{ color: '#b00020' }}>{adminError}</div> : null}
            {tenantInfo ? (
              <>
                <div>Organização: {tenantInfo.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, alignItems: 'center' }}>
                  <div>Tipo de organização</div>
                  <select
                    value={tenantInfo.organizationTypeId ?? ''}
                    onChange={async (e) => {
                      const value = e.target.value
                      if (!value) return
                      try {
                        const updated = await apiFetch<{
                          id: string
                          name: string
                          organizationTypeId: string | null
                          organizationTypeName: string | null
                          userTerm: string | null
                          shiftTerm: string | null
                        }>('/api/admin/tenant/organization-type', {
                          method: 'PUT',
                          body: JSON.stringify({ organizationTypeId: value }),
                        })
                        setTenantInfo(updated)
                        setAdminError(null)
                      } catch (err) {
                        const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                        setAdminError(message || 'Não foi possível atualizar o tipo de organização.')
                      }
                    }}
                  >
                    <option value="">Selecione</option>
                    {organizationTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12 }}>
                  <div>Termo para usuário</div>
                  <div>{tenantInfo.userTerm ?? '-'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12 }}>
                  <div>Termo para turno</div>
                  <div>{tenantInfo.shiftTerm ?? '-'}</div>
                </div>
              </>
            ) : (
              <div>Carregando...</div>
            )}
          </div>
        </div>
      ) : null}

      {isSuperAdmin ? (
        <div style={{ marginTop: 24, padding: 16, borderRadius: 12, border: '1px solid rgba(0,0,0,0.12)' }}>
          <h2 style={{ margin: 0 }}>Catálogo (Super Admin)</h2>
          <div style={{ marginTop: 10, display: 'grid', gap: 14 }}>
            {systemError ? <div style={{ color: '#b00020' }}>{systemError}</div> : null}

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>Segmentos</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={newSegmentName}
                  onChange={(e) => setNewSegmentName(e.target.value)}
                  placeholder="Novo segmento"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await apiFetch('/api/system/catalog/segments', {
                        method: 'POST',
                        body: JSON.stringify({ name: newSegmentName }),
                      })
                      setNewSegmentName('')
                      await loadSystemData()
                    } catch (err) {
                      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                      setSystemError(message || 'Não foi possível criar o segmento.')
                    }
                  }}
                >
                  Criar
                </button>
                <button type="button" onClick={() => void loadSystemData()}>
                  Recarregar
                </button>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {segments.map((segment) => (
                  <div key={segment.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8 }}>
                    <input
                      type="text"
                      value={segment.name}
                      onChange={(e) => {
                        const value = e.target.value
                        setSegments((prev) => prev.map((s) => (s.id === segment.id ? { ...s, name: value } : s)))
                      }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/system/catalog/segments/${segment.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({ name: segment.name }),
                          })
                          await loadSystemData()
                        } catch (err) {
                          const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                          setSystemError(message || 'Não foi possível salvar o segmento.')
                        }
                      }}
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/system/catalog/segments/${segment.id}`, { method: 'DELETE' })
                          await loadSystemData()
                        } catch (err) {
                          const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                          setSystemError(message || 'Não foi possível remover o segmento.')
                        }
                      }}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>Tipos de organização</div>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr 1fr auto', gap: 8 }}>
                <select value={newType.segmentId} onChange={(e) => setNewType((prev) => ({ ...prev, segmentId: e.target.value }))}>
                  <option value="">Segmento</option>
                  {segments.map((segment) => (
                    <option key={segment.id} value={segment.id}>
                      {segment.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newType.name}
                  onChange={(e) => setNewType((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome"
                />
                <input
                  type="text"
                  value={newType.userTerm}
                  onChange={(e) => setNewType((prev) => ({ ...prev, userTerm: e.target.value }))}
                  placeholder="Termo para usuário"
                />
                <input
                  type="text"
                  value={newType.shiftTerm}
                  onChange={(e) => setNewType((prev) => ({ ...prev, shiftTerm: e.target.value }))}
                  placeholder="Termo para turno"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await apiFetch('/api/system/catalog/organization-types', {
                        method: 'POST',
                        body: JSON.stringify(newType),
                      })
                      setNewType({ segmentId: '', name: '', userTerm: '', shiftTerm: '' })
                      await loadSystemData()
                    } catch (err) {
                      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                      setSystemError(message || 'Não foi possível criar o tipo de organização.')
                    }
                  }}
                >
                  Criar
                </button>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {systemOrganizationTypes.map((type) => (
                  <div key={type.id} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr 1fr auto auto', gap: 8 }}>
                    <select
                      value={type.segmentId}
                      onChange={(e) => {
                        const value = e.target.value
                        setSystemOrganizationTypes((prev) => prev.map((t) => (t.id === type.id ? { ...t, segmentId: value } : t)))
                      }}
                    >
                      {segments.map((segment) => (
                        <option key={segment.id} value={segment.id}>
                          {segment.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={type.name}
                      onChange={(e) => {
                        const value = e.target.value
                        setSystemOrganizationTypes((prev) => prev.map((t) => (t.id === type.id ? { ...t, name: value } : t)))
                      }}
                    />
                    <input
                      type="text"
                      value={type.userTerm}
                      onChange={(e) => {
                        const value = e.target.value
                        setSystemOrganizationTypes((prev) => prev.map((t) => (t.id === type.id ? { ...t, userTerm: value } : t)))
                      }}
                    />
                    <input
                      type="text"
                      value={type.shiftTerm}
                      onChange={(e) => {
                        const value = e.target.value
                        setSystemOrganizationTypes((prev) => prev.map((t) => (t.id === type.id ? { ...t, shiftTerm: value } : t)))
                      }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/system/catalog/organization-types/${type.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({
                              segmentId: type.segmentId,
                              name: type.name,
                              userTerm: type.userTerm,
                              shiftTerm: type.shiftTerm,
                            }),
                          })
                          await loadSystemData()
                        } catch (err) {
                          const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                          setSystemError(message || 'Não foi possível salvar o tipo de organização.')
                        }
                      }}
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await apiFetch(`/api/system/catalog/organization-types/${type.id}`, { method: 'DELETE' })
                          await loadSystemData()
                        } catch (err) {
                          const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
                          setSystemError(message || 'Não foi possível remover o tipo de organização.')
                        }
                      }}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
