import { useAuthStore } from '../../app/store'

export type ApiError = {
  status: number
  message: string
  errorId?: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

function shouldAttachAuthHeaders(path: string): boolean {
  if (!path.startsWith('/api/')) return true
  if (path.startsWith('/api/public/')) return false
  if (path.startsWith('/api/auth/')) return false
  if (path.startsWith('/api/billing/webhook')) return false
  return true
}

function buildAuthHeaders(path: string): Record<string, string> {
  if (!shouldAttachAuthHeaders(path)) return {}
  const session = useAuthStore.getState().session
  const authHeaders: Record<string, string> = {}
  if (session.accessToken) authHeaders.Authorization = `Bearer ${session.accessToken}`
  if (session.tenantId) authHeaders['X-Tenant-Id'] = session.tenantId
  return authHeaders
}

async function readError(response: Response): Promise<{ message: string; errorId?: string }> {
  const contentType = response.headers.get('content-type') ?? ''
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

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
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

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}

export async function apiFetchBlob(path: string, init?: RequestInit): Promise<Blob> {
  const authHeaders = buildAuthHeaders(path)

  const response = await fetch(`${apiBaseUrl}${path}`, {
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
