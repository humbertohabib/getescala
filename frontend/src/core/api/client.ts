import { useAuthStore } from '../../app/store'

export type ApiError = {
  status: number
  message: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

function buildAuthHeaders(): Record<string, string> {
  const session = useAuthStore.getState().session
  const authHeaders: Record<string, string> = {}
  if (session.accessToken) authHeaders.Authorization = `Bearer ${session.accessToken}`
  if (session.tenantId) authHeaders['X-Tenant-Id'] = session.tenantId
  return authHeaders
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json') || contentType.includes('problem+json')) {
    try {
      const data = (await response.clone().json()) as unknown
      if (typeof data === 'string') return data
      if (typeof data === 'object' && data != null) {
        const value = data as Record<string, unknown>
        const detail = value.detail
        if (typeof detail === 'string' && detail) return detail
        const message = value.message
        if (typeof message === 'string' && message) return message
        const error = value.error
        if (typeof error === 'string' && error) return error
        const title = value.title
        if (typeof title === 'string' && title) return title
        return JSON.stringify(data)
      }
    } catch {
      // ignore
    }
  }

  try {
    const text = await response.text()
    return text || response.statusText
  } catch {
    return response.statusText
  }
}

export async function apiFetch<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const authHeaders = buildAuthHeaders()

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = await readErrorMessage(response)
    const error: ApiError = {
      status: response.status,
      message: message || response.statusText,
    }
    throw error
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}

export async function apiFetchBlob(path: string, init?: RequestInit): Promise<Blob> {
  const authHeaders = buildAuthHeaders()

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = await readErrorMessage(response)
    const error: ApiError = {
      status: response.status,
      message: message || response.statusText,
    }
    throw error
  }

  return response.blob()
}
