const API = '/api'
const AUTH = '/auth'
const TOKEN_KEY = 'lg_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

function authHeaders() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) {
    // An expired/invalid token on an authenticated API call → force re-login.
    if (res.status === 401 && url.startsWith(API)) {
      clearToken()
      localStorage.removeItem('lg_user')
      window.location.reload()
    }
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const auth = {
  // POST /auth/login → { jwt: "<signed-token>", role: "user" }
  // Persists the token so subsequent API calls are authenticated.
  login: async (username, password) => {
    const data = await request(`${AUTH}/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    if (data.jwt) setToken(data.jwt)
    return data
  },

  // POST /auth/create_user → { status: "ok", role: "user" }
  register: (username, password) =>
    request(`${AUTH}/create_user`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () => clearToken(),
}

export const rag = {
  // GET /api/rag/sessions → { sessions: [...] }  (user derived from token)
  getSessions: async () => {
    const data = await request(`${API}/rag/sessions`)
    return data.sessions ?? []
  },

  // GET /api/rag/history/{sessionId} → { history: [{ role, content }] }
  getHistory: async (sessionId) => {
    const data = await request(`${API}/rag/history/${sessionId}`)
    return data.history ?? []
  },

  // POST /api/rag/query → { result: { content } }
  query: async (query, sessionId) => {
    const data = await request(`${API}/rag/query`, {
      method: 'POST',
      body: JSON.stringify({ query, session_id: sessionId }),
    })
    return data.result.content
  },

  // POST /api/rag/documents/upload (multipart)
  // Returns { status: true, session_id: string }
  uploadDocument: async (file, description, sessionId) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API}/rag/documents/upload`, {
      method: 'POST',
      headers: {
        'X-Description': description,
        'X-Session-ID': sessionId,
        ...authHeaders(),
      },
      body: form,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || 'Upload failed')
    }
    return res.json() // { status, session_id }
  },
}
