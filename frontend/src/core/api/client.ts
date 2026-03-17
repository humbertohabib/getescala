import { useAuthStore } from '../../app/store'

export type ApiError = {
  status: number
  message: string
  errorId?: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

const defaultRetryCount = 4
const defaultRetryBaseDelayMs = 600

type PersistedAuthSession = {
  accessToken: string | null
  tenantId: string | null
  userId: string | null
  defaultScheduleId: string | null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function requestMethod(init?: RequestInit): string {
  return (init?.method ?? 'GET').toUpperCase()
}

function shouldRetryFetchError(init: RequestInit | undefined): boolean {
  const method = requestMethod(init)
  return method === 'GET' || method === 'HEAD'
}

async function isRenderWakingUp(response: Response): Promise<boolean> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html')) return false
  try {
    const text = await response.clone().text()
    return (
      text.includes('Application loading') ||
      text.includes('Service waking up') ||
      text.includes('Preparing instance for initialization') ||
      text.includes('Finalizing startup')
    )
  } catch {
    return true
  }
}

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  const canRetry = shouldRetryFetchError(init)
  if (!canRetry) return fetch(url, init)

  let lastResponse: Response | null = null
  let lastError: unknown = null

  for (let attempt = 0; attempt <= defaultRetryCount; attempt++) {
    if (attempt > 0) {
      const backoff = defaultRetryBaseDelayMs * Math.pow(2, attempt - 1)
      const jitter = Math.floor(Math.random() * 200)
      await sleep(backoff + jitter)
    }

    try {
      const response = await fetch(url, init)
      lastResponse = response

      if (response.ok) return response

      if (response.status >= 500) {
        try {
          response.body?.cancel()
        } catch (err) {
          void err
        }
        if (attempt < defaultRetryCount) continue
      }

      return response
    } catch (err) {
      lastError = err
      if (attempt < defaultRetryCount) continue
      throw err
    }
  }

  if (lastResponse) return lastResponse
  throw lastError ?? new Error('Network error')
}

function readPersistedSession(): PersistedAuthSession | null {
  try {
    const raw = localStorage.getItem('getescala-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const root = parsed as Record<string, unknown>
    const state = root.state
    if (!state || typeof state !== 'object') return null
    const session = (state as Record<string, unknown>).session
    if (!session || typeof session !== 'object') return null
    const s = session as Record<string, unknown>
    return {
      accessToken: typeof s.accessToken === 'string' || s.accessToken === null ? (s.accessToken as string | null) : null,
      tenantId: typeof s.tenantId === 'string' || s.tenantId === null ? (s.tenantId as string | null) : null,
      userId: typeof s.userId === 'string' || s.userId === null ? (s.userId as string | null) : null,
      defaultScheduleId:
        typeof s.defaultScheduleId === 'string' || s.defaultScheduleId === null ? (s.defaultScheduleId as string | null) : null,
    }
  } catch {
    return null
  }
}

function shouldAttachAuthHeaders(path: string): boolean {
  if (!path.startsWith('/api/')) return true
  if (path.startsWith('/api/public/')) return false
  if (path.startsWith('/api/auth/')) return false
  if (path.startsWith('/api/billing/webhook')) return false
  return true
}

function headersToRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {}
  if (headers instanceof Headers) {
    const record: Record<string, string> = {}
    headers.forEach((value, key) => {
      record[key] = value
    })
    return record
  }
  if (Array.isArray(headers)) {
    const record: Record<string, string> = {}
    for (const [key, value] of headers) {
      record[key] = value
    }
    return record
  }
  return { ...(headers as Record<string, string>) }
}

function buildAuthHeaders(path: string): Record<string, string> {
  if (!shouldAttachAuthHeaders(path)) return {}
  const storeSession = useAuthStore.getState().session
  const persistedSession =
    storeSession.accessToken && storeSession.tenantId ? null : readPersistedSession()
  const session = {
    accessToken: storeSession.accessToken ?? persistedSession?.accessToken ?? null,
    tenantId: storeSession.tenantId ?? persistedSession?.tenantId ?? null,
  }
  const authHeaders: Record<string, string> = {}
  if (session.accessToken) authHeaders.Authorization = `Bearer ${session.accessToken}`
  if (session.tenantId) authHeaders['X-Tenant-Id'] = session.tenantId
  return authHeaders
}

async function readError(response: Response): Promise<{ message: string; errorId?: string }> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('text/html') && response.status >= 500) {
    if (await isRenderWakingUp(response)) {
      return { message: 'API iniciando. Tente novamente em alguns segundos.' }
    }
  }
  if (contentType.includes('application/json') || contentType.includes('problem+json')) {
    try {
      const data = (await response.clone().json()) as unknown
      if (typeof data === 'string') return { message: data }
      if (typeof data === 'object' && data != null) {
        const value = data as Record<string, unknown>
        const detail = value.detail
        const errorId = typeof value.errorId === 'string' && value.errorId ? value.errorId : undefined
        if (typeof detail === 'string' && detail) return { message: detail, errorId }
        const message = value.message
        if (typeof message === 'string' && message) return { message, errorId }
        const error = value.error
        if (typeof error === 'string' && error) return { message: error, errorId }
        const title = value.title
        if (typeof title === 'string' && title) return { message: title, errorId }
        return { message: JSON.stringify(data), errorId }
      }
    } catch {
      // ignore
    }
  }

  try {
    const text = await response.text()
    return { message: text || response.statusText }
  } catch {
    return { message: response.statusText }
  }
}

export async function apiFetch<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const authHeaders = buildAuthHeaders(path)

  const mergedHeaders: Record<string, string> = {
    ...authHeaders,
    ...headersToRecord(init?.headers),
  }
  if (typeof init?.body === 'string' && !('Content-Type' in mergedHeaders) && !('content-type' in mergedHeaders)) {
    mergedHeaders['Content-Type'] = 'application/json'
  }

  const response = await fetchWithRetry(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...mergedHeaders,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      useAuthStore.getState().clearSession()
    }
    const err = await readError(response)
    const error: ApiError = {
      status: response.status,
      message: err.message || response.statusText,
      errorId: err.errorId,
    }
    throw error
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}

export async function apiFetchBlob(path: string, init?: RequestInit): Promise<Blob> {
  const authHeaders = buildAuthHeaders(path)

  const response = await fetchWithRetry(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      useAuthStore.getState().clearSession()
    }
    const err = await readError(response)
    const error: ApiError = {
      status: response.status,
      message: err.message || response.statusText,
      errorId: err.errorId,
    }
    throw error
  }

  return response.blob()
}
