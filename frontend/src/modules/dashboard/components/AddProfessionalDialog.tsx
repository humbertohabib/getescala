import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { MonthlyLocation, MonthlySector } from '../types'
import { SvgIcon } from './DashboardIcons'
import type { IconName } from './DashboardIcons'

type QueryLike<T> = { data?: T; isLoading: boolean; error: unknown }
type MutationLike<TVars> = { isPending: boolean; error: unknown; mutate: (vars: TVars, opts?: { onSuccess?: () => void }) => void }

type AddProfessionalDialogTabId =
  | 'informacoes'
  | 'grupos'
  | 'dados-bancarios'
  | 'contratacao'
  | 'afastamentos'
  | 'bonificacao'
  | 'pendencias'
  | 'documentos'

type AddProfessionalDialogTab = { id: AddProfessionalDialogTabId; label: string; icon: IconName }

type AddProfessionalEmergencyContact = { id: string; name: string; phone: string }

type AddProfessionalInfoForm = {
  photoFileName: string
  photoDataUrl: string
  fullName: string
  birthDate: string
  prefix: string
  email: string
  cpf: string
  phone: string
  profession: string
  specialties: string[]
  department: string
  registrationType: string
  professionalRegistration: string
  cep: string
  street: string
  addressNumber: string
  neighborhood: string
  complement: string
  state: string
  city: string
  country: string
  admissionDate: string
  code: string
  notes: string
  details: string
  emergencyContacts: AddProfessionalEmergencyContact[]
  sendInviteByEmail: boolean
}

type AddProfessionalBankAccountForm = {
  alias: string
  transactionType: 'TED' | 'PIX'
  primary: boolean
  pixKey: string
  documentType: 'CPF' | 'CNPJ'
  documentNumber: string
  fullNameOrBusinessName: string
  observation: string
  bankCode: string
  agency: string
  accountNumber: string
  operation: '' | '001' | '013'
}

type AddProfessionalHiringPeriod = {
  type: string
  start: string
  end: string
  comment: string
}

type AddProfessionalCompensationUnit = 'HOUR' | 'MONTH'

type AddProfessionalCompensationValueDraft = {
  unit: AddProfessionalCompensationUnit
  start: string
  end: string
  value: string
}

type AddProfessionalAvailabilityStatus = 'DISPONIVEL' | 'INDISPONIVEL'
type AddProfessionalAvailabilityKind = 'DIA' | 'PERIODO' | 'DIAS_SEMANA'

type AddProfessionalAvailabilityRule = {
  status: AddProfessionalAvailabilityStatus
  kind: AddProfessionalAvailabilityKind
  day: string
  start: string
  end: string
  weekdays: string[]
  comment: string
}

type AddProfessionalBonusDraft = {
  bonusType: string
  sectorId: string
  start: string
  end: string
}

type AddProfessionalPendencyItem = { id: string; text: string; done: boolean }

type AddProfessionalPendenciesState = {
  draft: string
  items: AddProfessionalPendencyItem[]
}

type AddProfessionalDocumentItem = {
  id: string
  name: string
  file: File
}

export function AddProfessionalDialog({
  addProfessionalDialog,
  setAddProfessionalDialog,
  addProfessionalDialogTabs,
  canManageProfessionals,
  canSaveAddProfessional,
  addProfessionalMutation,
  addProfessionalInfoForm,
  setAddProfessionalInfoForm,
  addProfessionalPhotoInputRef,
  addProfessionalPhotoPreviewUrl,
  setAddProfessionalPhotoPreviewUrl,
  addProfessionalSaveAttempted,
  setAddProfessionalSaveAttempted,
  addProfessionalSpecialtyOptions,
  addProfessionalGroupsQuery,
  setAddProfessionalGroupsQuery,
  addProfessionalGroupsOnlySelected,
  setAddProfessionalGroupsOnlySelected,
  addProfessionalSelectedLocationIds,
  setAddProfessionalSelectedLocationIds,
  addProfessionalSelectedSectorIds,
  setAddProfessionalSelectedSectorIds,
  locationsQuery,
  sectorsQuery,
  addProfessionalBankAccount,
  setAddProfessionalBankAccount,
  addProfessionalHiring,
  setAddProfessionalHiring,
  addProfessionalCompensationValues,
  setAddProfessionalCompensationValues,
  addProfessionalAvailability,
  setAddProfessionalAvailability,
  addProfessionalBonuses,
  setAddProfessionalBonuses,
  addProfessionalPendencies,
  setAddProfessionalPendencies,
  addProfessionalDocuments,
  setAddProfessionalDocuments,
  addProfessionalDocumentsInputRef,
  parseBrlToCents,
  formatBrlFromCents,
  downloadLocalFile,
}: {
  addProfessionalDialog: { open: boolean; tabId: AddProfessionalDialogTabId }
  setAddProfessionalDialog: Dispatch<SetStateAction<{ open: boolean; tabId: AddProfessionalDialogTabId }>>
  addProfessionalDialogTabs: AddProfessionalDialogTab[]
  canManageProfessionals: boolean
  canSaveAddProfessional: boolean
  addProfessionalMutation: MutationLike<AddProfessionalInfoForm>
  addProfessionalInfoForm: AddProfessionalInfoForm
  setAddProfessionalInfoForm: Dispatch<SetStateAction<AddProfessionalInfoForm>>
  addProfessionalPhotoInputRef: RefObject<HTMLInputElement | null>
  addProfessionalPhotoPreviewUrl: string | null
  setAddProfessionalPhotoPreviewUrl: Dispatch<SetStateAction<string | null>>
  addProfessionalSaveAttempted: boolean
  setAddProfessionalSaveAttempted: Dispatch<SetStateAction<boolean>>
  addProfessionalSpecialtyOptions: string[]
  addProfessionalGroupsQuery: string
  setAddProfessionalGroupsQuery: Dispatch<SetStateAction<string>>
  addProfessionalGroupsOnlySelected: boolean
  setAddProfessionalGroupsOnlySelected: Dispatch<SetStateAction<boolean>>
  addProfessionalSelectedLocationIds: Record<string, boolean>
  setAddProfessionalSelectedLocationIds: Dispatch<SetStateAction<Record<string, boolean>>>
  addProfessionalSelectedSectorIds: Record<string, boolean>
  setAddProfessionalSelectedSectorIds: Dispatch<SetStateAction<Record<string, boolean>>>
  locationsQuery: QueryLike<MonthlyLocation[]>
  sectorsQuery: QueryLike<MonthlySector[]>
  addProfessionalBankAccount: { draft: AddProfessionalBankAccountForm; saved: AddProfessionalBankAccountForm; principal: boolean }
  setAddProfessionalBankAccount: Dispatch<
    SetStateAction<{ draft: AddProfessionalBankAccountForm; saved: AddProfessionalBankAccountForm; principal: boolean }>
  >
  addProfessionalHiring: { draft: AddProfessionalHiringPeriod; items: AddProfessionalHiringPeriod[] }
  setAddProfessionalHiring: Dispatch<SetStateAction<{ draft: AddProfessionalHiringPeriod; items: AddProfessionalHiringPeriod[] }>>
  addProfessionalCompensationValues: { draft: AddProfessionalCompensationValueDraft; items: AddProfessionalCompensationValueDraft[] }
  setAddProfessionalCompensationValues: Dispatch<
    SetStateAction<{ draft: AddProfessionalCompensationValueDraft; items: AddProfessionalCompensationValueDraft[] }>
  >
  addProfessionalAvailability: { draft: AddProfessionalAvailabilityRule; items: AddProfessionalAvailabilityRule[] }
  setAddProfessionalAvailability: Dispatch<
    SetStateAction<{ draft: AddProfessionalAvailabilityRule; items: AddProfessionalAvailabilityRule[] }>
  >
  addProfessionalBonuses: { draft: AddProfessionalBonusDraft; items: AddProfessionalBonusDraft[] }
  setAddProfessionalBonuses: Dispatch<SetStateAction<{ draft: AddProfessionalBonusDraft; items: AddProfessionalBonusDraft[] }>>
  addProfessionalPendencies: AddProfessionalPendenciesState
  setAddProfessionalPendencies: Dispatch<SetStateAction<AddProfessionalPendenciesState>>
  addProfessionalDocuments: AddProfessionalDocumentItem[]
  setAddProfessionalDocuments: Dispatch<SetStateAction<AddProfessionalDocumentItem[]>>
  addProfessionalDocumentsInputRef: RefObject<HTMLInputElement | null>
  parseBrlToCents: (value: string) => number | null
  formatBrlFromCents: (valueCents: number) => string
  downloadLocalFile: (name: string, file: File) => void
}) {
  if (!addProfessionalDialog.open) return null

  const cpfDigits = addProfessionalInfoForm.cpf.replace(/\D/g, '')
  const hasCpf = cpfDigits.length > 0
  const cpfValid = cpfDigits.length === 11
  const emailValue = addProfessionalInfoForm.email.trim()
  const emailValid = !addProfessionalInfoForm.sendInviteByEmail || (emailValue.length > 0 && /^\S+@\S+\.\S+$/.test(emailValue))
  const requiredFieldsOk = Boolean(
    addProfessionalInfoForm.fullName.trim() &&
      (!addProfessionalInfoForm.sendInviteByEmail || emailValue) &&
      addProfessionalInfoForm.profession.trim(),
  )
  const addProfessionalFormValid = requiredFieldsOk && emailValid && (!hasCpf || cpfValid)

  return (
    <div className="ge-modalOverlay" role="dialog" aria-modal="true">
      <div className="ge-modal ge-modalWide ge-professionalDialogModal">
        <div className="ge-professionalDialogHeader">
          <div className="ge-professionalDialogTitle">Adicionar Profissional</div>
          <div className="ge-professionalDialogHeaderActions">
            <button
              type="button"
              className="ge-buttonPrimary"
              disabled={!canSaveAddProfessional}
              onClick={() => {
                setAddProfessionalSaveAttempted(true)
                if (!canSaveAddProfessional) return
                addProfessionalMutation.mutate(addProfessionalInfoForm, {
                  onSuccess: () => setAddProfessionalDialog((prev) => ({ ...prev, open: false })),
                })
              }}
            >
              Salvar Alterações
            </button>
            <button
              type="button"
              className="ge-modalClose"
              onClick={() => setAddProfessionalDialog((prev) => ({ ...prev, open: false }))}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        </div>

        <div className="ge-professionalDialogBody">
          <aside className="ge-professionalDialogTabs">
            {addProfessionalDialogTabs.map((t) => {
              const active = addProfessionalDialog.tabId === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`ge-professionalDialogTab ${active ? 'ge-professionalDialogTabActive' : ''}`}
                  onClick={() => setAddProfessionalDialog((prev) => ({ ...prev, tabId: t.id }))}
                >
                  <span className="ge-professionalDialogTabIcon">
                    <SvgIcon name={t.icon} size={18} />
                  </span>
                  <span className="ge-professionalDialogTabLabel">{t.label}</span>
                </button>
              )
            })}
          </aside>

          <section className="ge-professionalDialogContent">
            {addProfessionalDialog.tabId === 'informacoes' ? (
              <div className="ge-professionalInfoTab">
                <div className="ge-professionalSectionTitle">Dados Pessoais</div>

                <div style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
                  <div style={{ display: 'grid', gap: 10, justifyItems: 'start' }}>
                    <button
                      type="button"
                      onClick={() => addProfessionalPhotoInputRef.current?.click()}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                      style={{
                        width: 150,
                        height: 150,
                        borderRadius: 14,
                        border: '1px dashed rgba(127, 127, 127, 0.35)',
                        background: 'color-mix(in srgb, Canvas 96%, transparent)',
                        display: 'grid',
                        placeItems: 'center',
                        padding: 0,
                        overflow: 'hidden',
                        color: 'inherit',
                        cursor: canManageProfessionals && !addProfessionalMutation.isPending ? 'pointer' : 'default',
                      }}
                    >
                      {addProfessionalPhotoPreviewUrl ? (
                        <img
                          src={addProfessionalPhotoPreviewUrl}
                          alt="Foto do profissional"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{ display: 'grid', placeItems: 'center', opacity: 0.85 }}>
                          <SvgIcon name="person" size={54} />
                        </div>
                      )}
                    </button>

                    {addProfessionalInfoForm.photoFileName ? (
                      <div style={{ fontSize: 12, opacity: 0.75, wordBreak: 'break-word' }}>{addProfessionalInfoForm.photoFileName}</div>
                    ) : null}

                    <input
                      ref={addProfessionalPhotoInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setAddProfessionalInfoForm((prev) => ({ ...prev, photoFileName: file.name }))
                        setAddProfessionalPhotoPreviewUrl((prev) => {
                          if (prev) URL.revokeObjectURL(prev)
                          return URL.createObjectURL(file)
                        })
                        try {
                          const reader = new FileReader()
                          reader.onload = () => {
                            const dataUrl = typeof reader.result === 'string' ? reader.result : ''
                            setAddProfessionalInfoForm((prev) => ({ ...prev, photoDataUrl: dataUrl }))
                          }
                          reader.readAsDataURL(file)
                        } catch {
                          setAddProfessionalInfoForm((prev) => ({ ...prev, photoDataUrl: '' }))
                        }
                        e.target.value = ''
                      }}
                    />
                  </div>

                  <div className="ge-professionalFormGrid">
                    <label className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                      <div className="ge-professionalLabel">Nome completo*</div>
                      <input
                        className="ge-input"
                        type="text"
                        value={addProfessionalInfoForm.fullName}
                        onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, fullName: e.target.value }))}
                        disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        required
                      />
                    </label>

                    <label className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                      <div className="ge-professionalLabel">Data de nascimento</div>
                      <input
                        className="ge-input"
                        type="date"
                        value={addProfessionalInfoForm.birthDate}
                        onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                        disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                      />
                    </label>

                    <label className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                      <div className="ge-professionalLabel">CPF</div>
                      <input
                        className="ge-input"
                        type="text"
                        value={addProfessionalInfoForm.cpf}
                        onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, cpf: e.target.value }))}
                        disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                      />
                    </label>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <div className="ge-professionalSectionTitle">Mini bio</div>
                  <textarea
                    className="ge-input ge-professionalTextarea"
                    value={addProfessionalInfoForm.notes}
                    onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, notes: e.target.value }))}
                    disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    placeholder="Breve descrição do profissional (experiência, áreas de atuação, preferências)."
                  />
                </div>

                <div className="ge-professionalDivider" />

                <div className="ge-professionalSectionTitle">Dados Profissionais</div>

                <div className="ge-professionalFormGrid">
                  <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                    <div className="ge-professionalLabel">Prefixo (de tratamento)</div>
                    <select
                      className="ge-select"
                      value={addProfessionalInfoForm.prefix}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, prefix: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    >
                      <option value="">—</option>
                      <option value="Dr">Dr</option>
                      <option value="Dra">Dra</option>
                      <option value="Enf">Enf</option>
                      <option value="Prof">Prof</option>
                    </select>
                  </label>
                </div>

                <div className="ge-professionalFormGrid">
                  <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                    <div className="ge-professionalLabel">Profissão*</div>
                    <select
                      className="ge-select"
                      value={addProfessionalInfoForm.profession}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, profession: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    >
                      <option value="">Selecione</option>
                      <option value="Médico(a)">Médico(a)</option>
                      <option value="Enfermeiro(a)">Enfermeiro(a)</option>
                      <option value="Técnico(a) de Enfermagem">Técnico(a) de Enfermagem</option>
                      <option value="Fisioterapeuta">Fisioterapeuta</option>
                      <option value="Nutricionista">Nutricionista</option>
                      <option value="Cuidador">Cuidador</option>
                    </select>
                  </label>

                  <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                    <div className="ge-professionalLabel">Tipo de registro</div>
                    <select
                      className="ge-select"
                      value={addProfessionalInfoForm.registrationType}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, registrationType: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    >
                      <option value="">—</option>
                      <option value="CRM">CRM</option>
                      <option value="COREN">COREN</option>
                      <option value="CREFITO">CREFITO</option>
                      <option value="CRN">CRN</option>
                      <option value="CRC">CRC</option>
                      <option value="CREA">CREA</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </label>

                  <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                    <div className="ge-professionalLabel">Registro</div>
                    <input
                      className="ge-input"
                      type="text"
                      value={addProfessionalInfoForm.professionalRegistration}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, professionalRegistration: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    />
                  </label>

                  <label className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                    <div className="ge-professionalLabel">Especialidades</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 4 }}>
                      {addProfessionalSpecialtyOptions.map((opt) => {
                        const checked = addProfessionalInfoForm.specialties.includes(opt)
                        return (
                          <label key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setAddProfessionalInfoForm((prev) => ({
                                  ...prev,
                                  specialties: e.target.checked
                                    ? [...prev.specialties, opt]
                                    : prev.specialties.filter((s) => s !== opt),
                                }))
                              }
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            />
                            <span style={{ fontWeight: 800, fontSize: 12, opacity: 0.9 }}>{opt}</span>
                          </label>
                        )
                      })}
                    </div>
                  </label>

                  <label className="ge-professionalField" style={{ gridColumn: 'span 6' }}>
                    <div className="ge-professionalLabel">Departamento</div>
                    <input
                      className="ge-input"
                      type="text"
                      value={addProfessionalInfoForm.department}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, department: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    />
                  </label>

                  <label className="ge-professionalField" style={{ gridColumn: 'span 3' }}>
                    <div className="ge-professionalLabel">Data de admissão</div>
                    <input
                      className="ge-input"
                      type="date"
                      value={addProfessionalInfoForm.admissionDate}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, admissionDate: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    />
                  </label>

                  <label className="ge-professionalField" style={{ gridColumn: 'span 3' }}>
                    <div className="ge-professionalLabel">Código</div>
                    <input
                      className="ge-input"
                      type="text"
                      value={addProfessionalInfoForm.code}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, code: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    />
                  </label>
                </div>

                <div className="ge-professionalDivider" />

                <div className="ge-professionalSectionTitle">Dados de Contato</div>

                <div className="ge-professionalFormGrid">
                  <label className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                    <div className="ge-professionalLabel">Telefone</div>
                    <input
                      className="ge-input"
                      type="tel"
                      value={addProfessionalInfoForm.phone}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, phone: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    />
                  </label>
                </div>

                <div className="ge-professionalFormGrid">
                  <label className="ge-professionalField" style={{ gridColumn: 'span 8' }}>
                    <div className="ge-professionalLabel">{`E-mail${addProfessionalInfoForm.sendInviteByEmail ? '*' : ''}`}</div>
                    <input
                      className="ge-input"
                      type="email"
                      value={addProfessionalInfoForm.email}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, email: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    />
                  </label>

                  <div style={{ gridColumn: 'span 4', display: 'grid', gap: 6, justifyItems: 'end', alignContent: 'end' }}>
                    <button
                      type="button"
                      className="ge-buttonSecondary"
                      disabled={
                        !canManageProfessionals ||
                        addProfessionalMutation.isPending ||
                        addProfessionalInfoForm.sendInviteByEmail ||
                        !emailValue ||
                        !/^\S+@\S+\.\S+$/.test(emailValue)
                      }
                      onClick={() => {
                        const targetEmail = addProfessionalInfoForm.email.trim()
                        const targetName = addProfessionalInfoForm.fullName.trim()
                        const label = targetName ? `${targetName} <${targetEmail}>` : targetEmail
                        const ok = window.confirm(`Confirmar envio de convite por e-mail para ${label} ao salvar?`)
                        if (!ok) return
                        setAddProfessionalInfoForm((prev) => ({ ...prev, sendInviteByEmail: true }))
                      }}
                    >
                      Enviar convite
                    </button>

                    {addProfessionalInfoForm.sendInviteByEmail ? (
                      <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>Convite será enviado ao salvar.</span>
                    ) : null}
                  </div>
                </div>

                <div className="ge-professionalFormGrid">
                  <label className="ge-professionalField" style={{ gridColumn: 'span 8' }}>
                    <div className="ge-professionalLabel">Rua</div>
                    <input
                      className="ge-input"
                      type="text"
                      value={addProfessionalInfoForm.street}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, street: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    />
                  </label>

                  <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                    <div className="ge-professionalLabel">Número</div>
                    <input
                      className="ge-input"
                      type="text"
                      value={addProfessionalInfoForm.addressNumber}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, addressNumber: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    />
                  </label>

                  <label className="ge-professionalField" style={{ gridColumn: 'span 6' }}>
                    <div className="ge-professionalLabel">Complemento</div>
                    <input
                      className="ge-input"
                      type="text"
                      value={addProfessionalInfoForm.complement}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, complement: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    />
                  </label>

                  <label className="ge-professionalField" style={{ gridColumn: 'span 6' }}>
                    <div className="ge-professionalLabel">Bairro</div>
                    <input
                      className="ge-input"
                      type="text"
                      value={addProfessionalInfoForm.neighborhood}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, neighborhood: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    />
                  </label>

                  <label className="ge-professionalField" style={{ gridColumn: 'span 5' }}>
                    <div className="ge-professionalLabel">Cidade</div>
                    <input
                      className="ge-input"
                      type="text"
                      value={addProfessionalInfoForm.city}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, city: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    />
                  </label>

                  <label className="ge-professionalField" style={{ gridColumn: 'span 2' }}>
                    <div className="ge-professionalLabel">UF</div>
                    <select
                      className="ge-select"
                      value={addProfessionalInfoForm.state}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, state: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    >
                      <option value="">—</option>
                      <option value="AC">AC</option>
                      <option value="AL">AL</option>
                      <option value="AP">AP</option>
                      <option value="AM">AM</option>
                      <option value="BA">BA</option>
                      <option value="CE">CE</option>
                      <option value="DF">DF</option>
                      <option value="ES">ES</option>
                      <option value="GO">GO</option>
                      <option value="MA">MA</option>
                      <option value="MT">MT</option>
                      <option value="MS">MS</option>
                      <option value="MG">MG</option>
                      <option value="PA">PA</option>
                      <option value="PB">PB</option>
                      <option value="PR">PR</option>
                      <option value="PE">PE</option>
                      <option value="PI">PI</option>
                      <option value="RJ">RJ</option>
                      <option value="RN">RN</option>
                      <option value="RS">RS</option>
                      <option value="RO">RO</option>
                      <option value="RR">RR</option>
                      <option value="SC">SC</option>
                      <option value="SP">SP</option>
                      <option value="SE">SE</option>
                      <option value="TO">TO</option>
                    </select>
                  </label>

                  <label className="ge-professionalField" style={{ gridColumn: 'span 5' }}>
                    <div className="ge-professionalLabel">País</div>
                    <input
                      className="ge-input"
                      type="text"
                      value={addProfessionalInfoForm.country}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, country: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    />
                  </label>

                  <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                    <div className="ge-professionalLabel">CEP</div>
                    <input
                      className="ge-input"
                      type="text"
                      value={addProfessionalInfoForm.cep}
                      onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, cep: e.target.value }))}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    />
                  </label>
                </div>

                <div className="ge-professionalDivider" />

                <div className="ge-professionalSectionTitle">Contatos de Emergência</div>

                {addProfessionalInfoForm.emergencyContacts.length === 0 ? (
                  <div style={{ opacity: 0.75, fontWeight: 800, fontSize: 12 }}>Nenhum contato cadastrado.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {addProfessionalInfoForm.emergencyContacts.map((c) => (
                      <div key={c.id} style={{ display: 'grid', gap: 8, gridTemplateColumns: 'minmax(0, 1fr) 220px auto' }}>
                        <input
                          className="ge-input"
                          type="text"
                          value={c.name}
                          onChange={(e) =>
                            setAddProfessionalInfoForm((prev) => ({
                              ...prev,
                              emergencyContacts: prev.emergencyContacts.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)),
                            }))
                          }
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                        <input
                          className="ge-input"
                          type="tel"
                          value={c.phone}
                          onChange={(e) =>
                            setAddProfessionalInfoForm((prev) => ({
                              ...prev,
                              emergencyContacts: prev.emergencyContacts.map((x) => (x.id === c.id ? { ...x, phone: e.target.value } : x)),
                            }))
                          }
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                        <button
                          type="button"
                          className="ge-buttonDanger ge-buttonIconOnly"
                          onClick={() =>
                            setAddProfessionalInfoForm((prev) => ({
                              ...prev,
                              emergencyContacts: prev.emergencyContacts.filter((x) => x.id !== c.id),
                            }))
                          }
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                          aria-label="Remover contato"
                        >
                          <SvgIcon name="trash" size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="ge-buttonSecondary"
                    onClick={() => {
                      let id = `${Date.now()}-${Math.random()}`
                      try {
                        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
                          id = (crypto as Crypto).randomUUID()
                        }
                      } catch {
                        void 0
                      }
                      setAddProfessionalInfoForm((prev) => ({
                        ...prev,
                        emergencyContacts: [...prev.emergencyContacts, { id, name: '', phone: '' }],
                      }))
                    }}
                    disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                  >
                    + Adicionar contato
                  </button>
                </div>

                <div className="ge-professionalDivider" />

                <div className="ge-professionalSectionTitle">Observações</div>

                <textarea
                  className="ge-input ge-professionalTextarea"
                  value={addProfessionalInfoForm.details}
                  onChange={(e) => setAddProfessionalInfoForm((prev) => ({ ...prev, details: e.target.value }))}
                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                  placeholder="Observações e detalhes adicionais."
                />

                {addProfessionalSaveAttempted && !addProfessionalFormValid ? (
                  <div style={{ marginTop: 10, color: '#e67e22', fontWeight: 900, fontSize: 12 }}>
                    Preencha os campos obrigatórios e corrija os erros antes de salvar.
                  </div>
                ) : null}

                {addProfessionalMutation.error ? (
                  <div style={{ marginTop: 10, color: '#e74c3c', fontWeight: 900, fontSize: 12 }}>
                    {(() => {
                      const err = addProfessionalMutation.error as { status?: number; message?: string }
                      if (err && typeof err === 'object') {
                        const msg = typeof err.message === 'string' ? err.message : ''
                        return msg || 'Não foi possível salvar o profissional.'
                      }
                      return 'Não foi possível salvar o profissional.'
                    })()}
                  </div>
                ) : null}
              </div>
            ) : addProfessionalDialog.tabId === 'grupos' ? (
              <div className="ge-professionalGroupsTab">
                <div className="ge-professionalGroupsHeader">
                  <div className="ge-professionalGroupsHeaderText">
                    <div style={{ fontWeight: 900, opacity: 0.9 }}>Locais e setores</div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                      Selecione quais locais e setores o profissional pode atuar.
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, opacity: 0.85 }}>
                    <input
                      type="checkbox"
                      checked={addProfessionalGroupsOnlySelected}
                      onChange={(e) => setAddProfessionalGroupsOnlySelected(e.target.checked)}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    />
                    Exibir somente selecionados
                  </label>
                </div>

                <div className="ge-professionalGroupsToolbar">
                  <input
                    className="ge-input ge-professionalGroupsSearch"
                    type="text"
                    placeholder="Buscar local/setor..."
                    value={addProfessionalGroupsQuery}
                    onChange={(e) => setAddProfessionalGroupsQuery(e.target.value)}
                    disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                  />
                </div>

                {(() => {
                  const q = addProfessionalGroupsQuery.trim().toLowerCase()
                  const locations = locationsQuery.data ?? []
                  const sectors = sectorsQuery.data ?? []
                  const sectorByLocationId = sectors.reduce<Record<string, MonthlySector[]>>((acc, s) => {
                    const key = s.locationId ?? ''
                    if (!acc[key]) acc[key] = []
                    acc[key].push(s)
                    return acc
                  }, {})

                  const rows = locations
                    .map((l) => {
                      const children = sectorByLocationId[l.id] ?? []
                      return { location: l, sectors: children }
                    })
                    .filter((row) => {
                      const locationName = row.location.name.toLowerCase()
                      const matchesLocation = !q || locationName.includes(q)
                      const matchesChildren = !q || row.sectors.some((s) => s.name.toLowerCase().includes(q))
                      return matchesLocation || matchesChildren
                    })

                  const total = rows.length
                  let shown = 0

                  const rendered = rows.map(({ location: l, sectors: children }) => {
                    const childSelectedCount = children.reduce((acc, s) => acc + (addProfessionalSelectedSectorIds[s.id] ? 1 : 0), 0)
                    const locationSelected = Boolean(addProfessionalSelectedLocationIds[l.id])
                    const locationIndeterminate = !locationSelected && childSelectedCount > 0
                    const locationChecked = locationSelected || childSelectedCount === children.length

                    const visible =
                      !addProfessionalGroupsOnlySelected ||
                      locationChecked ||
                      locationIndeterminate ||
                      children.some((s) => addProfessionalSelectedSectorIds[s.id])
                    if (!visible) return null
                    shown += 1

                    return (
                      <div key={l.id} className="ge-professionalGroupsLocation">
                        <div className="ge-professionalGroupsLocationHeader">
                          <label className="ge-professionalGroupsLocationLabel">
                            <input
                              type="checkbox"
                              checked={locationChecked}
                              ref={(el) => {
                                if (!el) return
                                el.indeterminate = locationIndeterminate
                              }}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setAddProfessionalSelectedLocationIds((prev) => ({ ...prev, [l.id]: checked }))
                                setAddProfessionalSelectedSectorIds((prev) => {
                                  const next = { ...prev }
                                  for (const s of children) next[s.id] = checked
                                  return next
                                })
                              }}
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            />
                            <span>{l.name}</span>
                          </label>
                          <div className="ge-professionalGroupsLocationCount">{`${childSelectedCount}/${children.length}`}</div>
                        </div>

                        <div className="ge-professionalGroupsSectorList">
                          {children.map((s) => {
                            const sectorSelected = Boolean(addProfessionalSelectedSectorIds[s.id])
                            const sectorVisibleBySelection = !addProfessionalGroupsOnlySelected || sectorSelected || locationChecked || locationIndeterminate
                            if (!sectorVisibleBySelection) return null
                            return (
                              <label key={s.id} className="ge-professionalGroupsSector">
                                <input
                                  type="checkbox"
                                  checked={sectorSelected}
                                  onChange={(e) => {
                                    const checked = e.target.checked
                                    setAddProfessionalSelectedSectorIds((prev) => ({ ...prev, [s.id]: checked }))
                                  }}
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                />
                                <span>{s.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })

                  return (
                    <>
                      <div className="ge-professionalGroupsCount">{`Exibindo ${shown} de ${total}`}</div>
                      <div className="ge-professionalGroupsList">
                        {locationsQuery.isLoading || sectorsQuery.isLoading ? (
                          <div className="ge-professionalGroupsEmpty">Carregando...</div>
                        ) : locationsQuery.error || sectorsQuery.error ? (
                          <div className="ge-professionalGroupsEmpty">Não foi possível carregar locais e setores.</div>
                        ) : !shown ? (
                          <div className="ge-professionalGroupsEmpty">Nenhum resultado encontrado.</div>
                        ) : (
                          rendered
                        )}
                      </div>
                    </>
                  )
                })()}
              </div>
            ) : addProfessionalDialog.tabId === 'dados-bancarios' ? (
              <div className="ge-professionalBankTab">
                <div className="ge-professionalBankHeader">
                  <div className="ge-professionalBankHeaderLeft">
                    <div className="ge-professionalBankHeaderTitle">Dados Bancários</div>
                    <div className="ge-professionalBankHeaderTag">{addProfessionalBankAccount.principal ? 'Principal' : 'Secundária'}</div>
                  </div>
                  <div className="ge-professionalBankHeaderRight">
                    <span className="ge-professionalBankHeaderStar">{addProfessionalBankAccount.draft.primary ? '★' : '☆'}</span>
                    <span>Conta padrão</span>
                  </div>
                </div>

                <div className="ge-professionalBankCard">
                  <div className="ge-professionalBankCardTop">
                    <div className="ge-professionalBankCardTopTitle">Conta</div>
                  </div>
                  <div className="ge-professionalBankCardBody">
                    <div className="ge-professionalFormGrid">
                      <label className="ge-professionalField" style={{ gridColumn: 'span 6' }}>
                        <div className="ge-professionalLabel">Apelido</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalBankAccount.draft.alias}
                          onChange={(e) => setAddProfessionalBankAccount((prev) => ({ ...prev, draft: { ...prev.draft, alias: e.target.value } }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>

                      <label className="ge-professionalField" style={{ gridColumn: 'span 6', display: 'flex', justifyContent: 'flex-end', alignItems: 'end' }}>
                        <button
                          type="button"
                          className="ge-pillButton"
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                          onClick={() =>
                            setAddProfessionalBankAccount((prev) => ({
                              ...prev,
                              draft: { ...prev.draft, primary: !prev.draft.primary },
                            }))
                          }
                          style={{
                            color: addProfessionalBankAccount.draft.primary ? '#f5c542' : 'rgba(127,127,127,0.7)',
                            borderColor: addProfessionalBankAccount.draft.primary ? 'rgba(245,197,66,0.55)' : undefined,
                          }}
                        >
                          {addProfessionalBankAccount.draft.primary ? '★' : '☆'} Marcar como padrão
                        </button>
                      </label>
                    </div>

                    <div className="ge-professionalFormGrid">
                      <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                        <div className="ge-professionalLabel">Transação</div>
                        <select
                          className="ge-select"
                          value={addProfessionalBankAccount.draft.transactionType}
                          onChange={(e) =>
                            setAddProfessionalBankAccount((prev) => ({
                              ...prev,
                              draft: { ...prev.draft, transactionType: e.target.value as 'TED' | 'PIX' },
                            }))
                          }
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        >
                          <option value="TED">TED</option>
                          <option value="PIX">PIX</option>
                        </select>
                      </label>

                      {addProfessionalBankAccount.draft.transactionType === 'PIX' ? (
                        <label className="ge-professionalField" style={{ gridColumn: 'span 8' }}>
                          <div className="ge-professionalLabel">Chave PIX</div>
                          <input
                            className="ge-input"
                            type="text"
                            value={addProfessionalBankAccount.draft.pixKey}
                            onChange={(e) =>
                              setAddProfessionalBankAccount((prev) => ({ ...prev, draft: { ...prev.draft, pixKey: e.target.value } }))
                            }
                            disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                          />
                        </label>
                      ) : (
                        <>
                          <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                            <div className="ge-professionalLabel">Banco</div>
                            <input
                              className="ge-input"
                              type="text"
                              value={addProfessionalBankAccount.draft.bankCode}
                              onChange={(e) =>
                                setAddProfessionalBankAccount((prev) => ({ ...prev, draft: { ...prev.draft, bankCode: e.target.value } }))
                              }
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            />
                          </label>
                          <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                            <div className="ge-professionalLabel">Agência</div>
                            <input
                              className="ge-input"
                              type="text"
                              value={addProfessionalBankAccount.draft.agency}
                              onChange={(e) =>
                                setAddProfessionalBankAccount((prev) => ({ ...prev, draft: { ...prev.draft, agency: e.target.value } }))
                              }
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            />
                          </label>
                          <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                            <div className="ge-professionalLabel">Conta</div>
                            <input
                              className="ge-input"
                              type="text"
                              value={addProfessionalBankAccount.draft.accountNumber}
                              onChange={(e) =>
                                setAddProfessionalBankAccount((prev) => ({ ...prev, draft: { ...prev.draft, accountNumber: e.target.value } }))
                              }
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            />
                          </label>
                          <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                            <div className="ge-professionalLabel">Operação</div>
                            <select
                              className="ge-select"
                              value={addProfessionalBankAccount.draft.operation}
                              onChange={(e) =>
                                setAddProfessionalBankAccount((prev) => ({ ...prev, draft: { ...prev.draft, operation: e.target.value as '' | '001' | '013' } }))
                              }
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            >
                              <option value="">—</option>
                              <option value="001">001</option>
                              <option value="013">013</option>
                            </select>
                          </label>
                        </>
                      )}
                    </div>

                    <div className="ge-professionalFormGrid">
                      <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                        <div className="ge-professionalLabel">Documento</div>
                        <select
                          className="ge-select"
                          value={addProfessionalBankAccount.draft.documentType}
                          onChange={(e) =>
                            setAddProfessionalBankAccount((prev) => ({
                              ...prev,
                              draft: { ...prev.draft, documentType: e.target.value as 'CPF' | 'CNPJ' },
                            }))
                          }
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        >
                          <option value="CPF">CPF</option>
                          <option value="CNPJ">CNPJ</option>
                        </select>
                      </label>
                      <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                        <div className="ge-professionalLabel">Número</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalBankAccount.draft.documentNumber}
                          onChange={(e) =>
                            setAddProfessionalBankAccount((prev) => ({ ...prev, draft: { ...prev.draft, documentNumber: e.target.value } }))
                          }
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>
                      <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                        <div className="ge-professionalLabel">Nome</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalBankAccount.draft.fullNameOrBusinessName}
                          onChange={(e) =>
                            setAddProfessionalBankAccount((prev) => ({ ...prev, draft: { ...prev.draft, fullNameOrBusinessName: e.target.value } }))
                          }
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>
                    </div>

                    <div className="ge-professionalFormGrid">
                      <label className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                        <div className="ge-professionalLabel">Observação</div>
                        <textarea
                          className="ge-input ge-professionalTextarea"
                          value={addProfessionalBankAccount.draft.observation}
                          onChange={(e) =>
                            setAddProfessionalBankAccount((prev) => ({ ...prev, draft: { ...prev.draft, observation: e.target.value } }))
                          }
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : addProfessionalDialog.tabId === 'contratacao' ? (
              <div className="ge-professionalHiringTab">
                <div style={{ fontWeight: 900, opacity: 0.9 }}>Contratação</div>
                <div style={{ marginTop: 10, display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontWeight: 900, opacity: 0.85 }}>Adicionar período</div>
                    <div className="ge-professionalFormGrid">
                      <label className="ge-professionalField" style={{ gridColumn: 'span 3' }}>
                        <div className="ge-professionalLabel">Tipo</div>
                        <select
                          className="ge-select"
                          value={addProfessionalHiring.draft.type}
                          onChange={(e) => setAddProfessionalHiring((prev) => ({ ...prev, draft: { ...prev.draft, type: e.target.value } }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        >
                          <option value="CLT">CLT</option>
                          <option value="PJ">PJ</option>
                          <option value="TEMPORARIO">Temporário</option>
                        </select>
                      </label>

                      <label className="ge-professionalField" style={{ gridColumn: 'span 3' }}>
                        <div className="ge-professionalLabel">Início*</div>
                        <input
                          className="ge-input"
                          type="date"
                          value={addProfessionalHiring.draft.start}
                          onChange={(e) => setAddProfessionalHiring((prev) => ({ ...prev, draft: { ...prev.draft, start: e.target.value } }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>

                      <label className="ge-professionalField" style={{ gridColumn: 'span 3' }}>
                        <div className="ge-professionalLabel">Fim</div>
                        <input
                          className="ge-input"
                          type="date"
                          value={addProfessionalHiring.draft.end}
                          onChange={(e) => setAddProfessionalHiring((prev) => ({ ...prev, draft: { ...prev.draft, end: e.target.value } }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>

                      <label className="ge-professionalField" style={{ gridColumn: 'span 3' }}>
                        <div className="ge-professionalLabel">Observação</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalHiring.draft.comment}
                          onChange={(e) => setAddProfessionalHiring((prev) => ({ ...prev, draft: { ...prev.draft, comment: e.target.value } }))}
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="ge-buttonPrimary"
                        disabled={
                          !canManageProfessionals ||
                          addProfessionalMutation.isPending ||
                          !addProfessionalHiring.draft.type.trim() ||
                          !addProfessionalHiring.draft.start
                        }
                        onClick={() => {
                          const draft = addProfessionalHiring.draft
                          setAddProfessionalHiring((prev) => ({
                            ...prev,
                            items: [...prev.items, { ...draft }],
                            draft: { ...prev.draft, start: '', end: '', comment: '' },
                          }))
                        }}
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {addProfessionalHiring.items.length > 0 ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 900, opacity: 0.85 }}>Períodos cadastrados</div>
                      {addProfessionalHiring.items.map((p, idx) => (
                        <div
                          key={`${p.type}-${p.start}-${idx}`}
                          style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}
                        >
                          <div style={{ fontWeight: 800, opacity: 0.85 }}>
                            {p.type} — {p.start} {p.end ? `→ ${p.end}` : ''}
                          </div>
                          <button
                            type="button"
                            className="ge-buttonDanger ge-buttonIconOnly"
                            onClick={() =>
                              setAddProfessionalHiring((prev) => ({
                                ...prev,
                                items: prev.items.filter((_, i) => i !== idx),
                              }))
                            }
                            disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            aria-label="Remover período"
                          >
                            <SvgIcon name="trash" size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 4, opacity: 0.7, fontSize: 12, fontWeight: 800 }}>
                    Valores de remuneração podem ser configurados em seguida.
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ fontWeight: 900, opacity: 0.85 }}>Valores de remuneração</div>

                    <div className="ge-professionalFormGrid">
                      <label className="ge-professionalField" style={{ gridColumn: 'span 2' }}>
                        <div className="ge-professionalLabel">Unidade</div>
                        <select
                          className="ge-select"
                          value={addProfessionalCompensationValues.draft.unit}
                          onChange={(e) =>
                            setAddProfessionalCompensationValues((prev) => ({
                              ...prev,
                              draft: { ...prev.draft, unit: e.target.value as AddProfessionalCompensationUnit },
                            }))
                          }
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        >
                          <option value="HOUR">Hora</option>
                          <option value="MONTH">Mês</option>
                        </select>
                      </label>
                      <label className="ge-professionalField" style={{ gridColumn: 'span 3' }}>
                        <div className="ge-professionalLabel">Início*</div>
                        <input
                          className="ge-input"
                          type="date"
                          value={addProfessionalCompensationValues.draft.start}
                          onChange={(e) =>
                            setAddProfessionalCompensationValues((prev) => ({ ...prev, draft: { ...prev.draft, start: e.target.value } }))
                          }
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>
                      <label className="ge-professionalField" style={{ gridColumn: 'span 3' }}>
                        <div className="ge-professionalLabel">Fim</div>
                        <input
                          className="ge-input"
                          type="date"
                          value={addProfessionalCompensationValues.draft.end}
                          onChange={(e) =>
                            setAddProfessionalCompensationValues((prev) => ({ ...prev, draft: { ...prev.draft, end: e.target.value } }))
                          }
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>
                      <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                        <div className="ge-professionalLabel">Valor (R$)*</div>
                        <input
                          className="ge-input"
                          type="text"
                          value={addProfessionalCompensationValues.draft.value}
                          onChange={(e) =>
                            setAddProfessionalCompensationValues((prev) => ({ ...prev, draft: { ...prev.draft, value: e.target.value } }))
                          }
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="ge-buttonPrimary"
                        disabled={
                          !canManageProfessionals ||
                          addProfessionalMutation.isPending ||
                          !addProfessionalCompensationValues.draft.start ||
                          (addProfessionalCompensationValues.draft.end &&
                            addProfessionalCompensationValues.draft.end < addProfessionalCompensationValues.draft.start) ||
                          parseBrlToCents(addProfessionalCompensationValues.draft.value) == null
                        }
                        onClick={() => {
                          const draft = addProfessionalCompensationValues.draft
                          setAddProfessionalCompensationValues((prev) => ({
                            ...prev,
                            items: [...prev.items, { ...draft }],
                            draft: { ...prev.draft, start: '', end: '', value: '' },
                          }))
                        }}
                      >
                        Adicionar
                      </button>
                    </div>

                    {addProfessionalCompensationValues.items.length > 0 ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {addProfessionalCompensationValues.items.map((v, idx) => {
                          const cents = parseBrlToCents(v.value)
                          return (
                            <div
                              key={`${v.unit}-${v.start}-${idx}`}
                              style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}
                            >
                              <div style={{ fontWeight: 800, opacity: 0.85 }}>
                                {v.unit === 'HOUR' ? 'Hora' : 'Mês'} — {v.start} {v.end ? `→ ${v.end}` : ''} •{' '}
                                {cents == null ? '-' : formatBrlFromCents(cents)}
                              </div>
                              <button
                                type="button"
                                className="ge-buttonDanger ge-buttonIconOnly"
                                onClick={() =>
                                  setAddProfessionalCompensationValues((prev) => ({
                                    ...prev,
                                    items: prev.items.filter((_, i) => i !== idx),
                                  }))
                                }
                                disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                aria-label="Remover valor"
                              >
                                <SvgIcon name="trash" size={18} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : addProfessionalDialog.tabId === 'afastamentos' ? (
              <div className="ge-professionalAvailabilityTab">
                <div style={{ fontWeight: 900, opacity: 0.9 }}>Disponibilidades</div>

                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  <div className="ge-professionalFormGrid">
                    <label className="ge-professionalField" style={{ gridColumn: 'span 3' }}>
                      <div className="ge-professionalLabel">Tipo</div>
                      <select
                        className="ge-select"
                        value={addProfessionalAvailability.draft.kind}
                        onChange={(e) =>
                          setAddProfessionalAvailability((prev) => ({
                            ...prev,
                            draft: { ...prev.draft, kind: e.target.value as AddProfessionalAvailabilityKind },
                          }))
                        }
                        disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                      >
                        <option value="DIA">Dia</option>
                        <option value="PERIODO">Período</option>
                        <option value="DIAS_SEMANA">Dias da semana</option>
                      </select>
                    </label>

                    <label className="ge-professionalField" style={{ gridColumn: 'span 3' }}>
                      <div className="ge-professionalLabel">Status</div>
                      <select
                        className="ge-select"
                        value={addProfessionalAvailability.draft.status}
                        onChange={(e) =>
                          setAddProfessionalAvailability((prev) => ({
                            ...prev,
                            draft: { ...prev.draft, status: e.target.value as AddProfessionalAvailabilityStatus },
                          }))
                        }
                        disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                      >
                        <option value="DISPONIVEL">Disponível</option>
                        <option value="INDISPONIVEL">Indisponível</option>
                      </select>
                    </label>

                    <div style={{ gridColumn: 'span 6' }} />

                    {addProfessionalAvailability.draft.kind === 'DIA' ? (
                      <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                        <div className="ge-professionalLabel">Dia*</div>
                        <input
                          className="ge-input"
                          type="date"
                          value={addProfessionalAvailability.draft.day}
                          onChange={(e) =>
                            setAddProfessionalAvailability((prev) => ({ ...prev, draft: { ...prev.draft, day: e.target.value } }))
                          }
                          disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                        />
                      </label>
                    ) : addProfessionalAvailability.draft.kind === 'PERIODO' ? (
                      <>
                        <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                          <div className="ge-professionalLabel">Início*</div>
                          <input
                            className="ge-input"
                            type="date"
                            value={addProfessionalAvailability.draft.start}
                            onChange={(e) =>
                              setAddProfessionalAvailability((prev) => ({ ...prev, draft: { ...prev.draft, start: e.target.value } }))
                            }
                            disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                          />
                        </label>
                        <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                          <div className="ge-professionalLabel">Fim*</div>
                          <input
                            className="ge-input"
                            type="date"
                            value={addProfessionalAvailability.draft.end}
                            onChange={(e) =>
                              setAddProfessionalAvailability((prev) => ({ ...prev, draft: { ...prev.draft, end: e.target.value } }))
                            }
                            disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                          />
                        </label>
                      </>
                    ) : (
                      <label className="ge-professionalField" style={{ gridColumn: 'span 8' }}>
                        <div className="ge-professionalLabel">Dias da semana*</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 6 }}>
                          {[
                            { id: 'SEG', label: 'Seg' },
                            { id: 'TER', label: 'Ter' },
                            { id: 'QUA', label: 'Qua' },
                            { id: 'QUI', label: 'Qui' },
                            { id: 'SEX', label: 'Sex' },
                            { id: 'SAB', label: 'Sáb' },
                            { id: 'DOM', label: 'Dom' },
                          ].map((w) => {
                            const checked = addProfessionalAvailability.draft.weekdays.includes(w.id)
                            return (
                              <label key={w.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    setAddProfessionalAvailability((prev) => ({
                                      ...prev,
                                      draft: {
                                        ...prev.draft,
                                        weekdays: e.target.checked
                                          ? [...prev.draft.weekdays, w.id]
                                          : prev.draft.weekdays.filter((x) => x !== w.id),
                                      },
                                    }))
                                  }
                                  disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                                />
                                <span style={{ fontWeight: 800, fontSize: 12, opacity: 0.9 }}>{w.label}</span>
                              </label>
                            )
                          })}
                        </div>
                      </label>
                    )}

                    <label className="ge-professionalField" style={{ gridColumn: 'span 12' }}>
                      <div className="ge-professionalLabel">Comentário</div>
                      <input
                        className="ge-input"
                        type="text"
                        value={addProfessionalAvailability.draft.comment}
                        onChange={(e) =>
                          setAddProfessionalAvailability((prev) => ({ ...prev, draft: { ...prev.draft, comment: e.target.value } }))
                        }
                        disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="ge-buttonPrimary"
                      disabled={
                        !canManageProfessionals ||
                        addProfessionalMutation.isPending ||
                        (addProfessionalAvailability.draft.kind === 'DIA'
                          ? !addProfessionalAvailability.draft.day
                          : addProfessionalAvailability.draft.kind === 'PERIODO'
                            ? !addProfessionalAvailability.draft.start ||
                              !addProfessionalAvailability.draft.end ||
                              addProfessionalAvailability.draft.end < addProfessionalAvailability.draft.start
                            : addProfessionalAvailability.draft.weekdays.length === 0)
                      }
                      onClick={() => {
                        const draft = addProfessionalAvailability.draft
                        setAddProfessionalAvailability((prev) => ({
                          ...prev,
                          items: [...prev.items, { ...draft }],
                          draft: { ...prev.draft, day: '', start: '', end: '', weekdays: [], comment: '' },
                        }))
                      }}
                    >
                      Adicionar
                    </button>
                  </div>

                  {addProfessionalAvailability.items.length > 0 ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {addProfessionalAvailability.items.map((r, idx) => (
                        <div
                          key={`${r.kind}-${r.status}-${idx}`}
                          style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}
                        >
                          <div style={{ fontWeight: 800, opacity: 0.85 }}>
                            {r.status === 'DISPONIVEL' ? 'Disponível' : 'Indisponível'} •{' '}
                            {r.kind === 'DIA'
                              ? r.day
                              : r.kind === 'PERIODO'
                                ? `${r.start} → ${r.end}`
                                : r.weekdays.join(', ')}
                            {r.comment ? ` • ${r.comment}` : ''}
                          </div>
                          <button
                            type="button"
                            className="ge-buttonDanger ge-buttonIconOnly"
                            onClick={() =>
                              setAddProfessionalAvailability((prev) => ({
                                ...prev,
                                items: prev.items.filter((_, i) => i !== idx),
                              }))
                            }
                            disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                            aria-label="Remover regra"
                          >
                            <SvgIcon name="trash" size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : addProfessionalDialog.tabId === 'bonificacao' ? (
              <div className="ge-professionalBonusTab">
                <div style={{ fontWeight: 900, opacity: 0.9 }}>Bonificação</div>
                <div style={{ marginTop: 10, opacity: 0.75, fontWeight: 800, fontSize: 12 }}>Configure bonificações por setor.</div>

                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  <div className="ge-professionalFormGrid">
                    <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                      <div className="ge-professionalLabel">Tipo</div>
                      <input
                        className="ge-input"
                        type="text"
                        value={addProfessionalBonuses.draft.bonusType}
                        onChange={(e) => setAddProfessionalBonuses((prev) => ({ ...prev, draft: { ...prev.draft, bonusType: e.target.value } }))}
                        disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                      />
                    </label>

                    <label className="ge-professionalField" style={{ gridColumn: 'span 4' }}>
                      <div className="ge-professionalLabel">Setor</div>
                      <select
                        className="ge-select"
                        value={addProfessionalBonuses.draft.sectorId}
                        onChange={(e) => setAddProfessionalBonuses((prev) => ({ ...prev, draft: { ...prev.draft, sectorId: e.target.value } }))}
                        disabled={!canManageProfessionals || addProfessionalMutation.isPending || sectorsQuery.isLoading}
                      >
                        <option value="">Selecione</option>
                        {(sectorsQuery.data ?? []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="ge-professionalField" style={{ gridColumn: 'span 2' }}>
                      <div className="ge-professionalLabel">Início</div>
                      <input
                        className="ge-input"
                        type="date"
                        value={addProfessionalBonuses.draft.start}
                        onChange={(e) => setAddProfessionalBonuses((prev) => ({ ...prev, draft: { ...prev.draft, start: e.target.value } }))}
                        disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                      />
                    </label>

                    <label className="ge-professionalField" style={{ gridColumn: 'span 2' }}>
                      <div className="ge-professionalLabel">Fim</div>
                      <input
                        className="ge-input"
                        type="date"
                        value={addProfessionalBonuses.draft.end}
                        onChange={(e) => setAddProfessionalBonuses((prev) => ({ ...prev, draft: { ...prev.draft, end: e.target.value } }))}
                        disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="ge-buttonPrimary"
                      disabled={
                        !canManageProfessionals ||
                        addProfessionalMutation.isPending ||
                        !addProfessionalBonuses.draft.bonusType.trim() ||
                        !addProfessionalBonuses.draft.sectorId
                      }
                      onClick={() => {
                        const draft = addProfessionalBonuses.draft
                        setAddProfessionalBonuses((prev) => ({
                          ...prev,
                          items: [...prev.items, { ...draft }],
                          draft: { ...prev.draft, sectorId: '', start: '', end: '' },
                        }))
                      }}
                    >
                      Adicionar
                    </button>
                  </div>

                  {addProfessionalBonuses.items.length > 0 ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {addProfessionalBonuses.items.map((r, idx) => {
                        const sectorName = (sectorsQuery.data ?? []).find((s) => s.id === r.sectorId)?.name ?? r.sectorId
                        return (
                          <div
                            key={`${r.bonusType}-${r.sectorId}-${idx}`}
                            style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}
                          >
                            <div style={{ fontWeight: 800, opacity: 0.85 }}>
                              {r.bonusType} — {sectorName} {r.start ? `• ${r.start}` : ''} {r.end ? `→ ${r.end}` : ''}
                            </div>
                            <button
                              type="button"
                              className="ge-buttonDanger ge-buttonIconOnly"
                              onClick={() =>
                                setAddProfessionalBonuses((prev) => ({
                                  ...prev,
                                  items: prev.items.filter((_, i) => i !== idx),
                                }))
                              }
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                              aria-label="Remover bonificação"
                            >
                              <SvgIcon name="trash" size={18} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : addProfessionalDialog.tabId === 'pendencias' ? (
              <div className="ge-professionalPendencyTab">
                <div style={{ fontWeight: 900, opacity: 0.9 }}>Pendências</div>
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {addProfessionalPendencies.items.map((p) => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 900, opacity: 0.85 }}>
                      <input
                        type="checkbox"
                        checked={p.done}
                        onChange={(e) =>
                          setAddProfessionalPendencies((prev) => ({
                            ...prev,
                            items: prev.items.map((x) => (x.id === p.id ? { ...x, done: e.target.checked } : x)),
                          }))
                        }
                        disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                      />
                      <span style={{ textDecoration: p.done ? 'line-through' : undefined }}>{p.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : addProfessionalDialog.tabId === 'documentos' ? (
              <div className="ge-professionalDocumentsTab">
                <div style={{ fontWeight: 900, opacity: 0.9 }}>Documentos</div>

                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {addProfessionalDocuments.length > 0 ? (
                    <div className="ge-professionalDocumentsList">
                      {addProfessionalDocuments.map((doc) => (
                        <div key={doc.id} className="ge-professionalDocumentsRow">
                          <div className="ge-professionalDocumentsName">{doc.name}</div>
                          <div className="ge-professionalDocumentsActions">
                            <button
                              type="button"
                              className="ge-professionalDocumentsIconButton ge-professionalDocumentsIconButtonPrimary"
                              onClick={() => downloadLocalFile(doc.name, doc.file)}
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                              aria-label="Baixar"
                              title="Baixar"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="m7 12 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="ge-professionalDocumentsIconButton ge-professionalDocumentsIconButtonDanger"
                              onClick={() => setAddProfessionalDocuments((prev) => prev.filter((x) => x.id !== doc.id))}
                              disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                              aria-label="Remover"
                              title="Remover"
                            >
                              <SvgIcon name="trash" size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="ge-professionalDocumentsAddWrap">
                    <button
                      type="button"
                      className="ge-professionalDocumentsAdd"
                      onClick={() => addProfessionalDocumentsInputRef.current?.click()}
                      disabled={!canManageProfessionals || addProfessionalMutation.isPending}
                    >
                      + Adicionar
                    </button>
                    <input
                      ref={addProfessionalDocumentsInputRef}
                      type="file"
                      style={{ display: 'none' }}
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? [])
                        if (files.length === 0) return
                        setAddProfessionalDocuments((prev) => [
                          ...prev,
                          ...files.map((file) => {
                            let id = `${Date.now()}-${Math.random()}`
                            try {
                              if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
                                id = (crypto as Crypto).randomUUID()
                              }
                            } catch {
                              void 0
                            }
                            return { id, name: file.name, file }
                          }),
                        ])
                        e.target.value = ''
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 900, opacity: 0.9 }}>
                  {addProfessionalDialogTabs.find((t) => t.id === addProfessionalDialog.tabId)?.label}
                </div>
                <div style={{ marginTop: 10, opacity: 0.75 }}>Conteúdo será colocado em seguida.</div>
                <div style={{ height: 420 }} />
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
