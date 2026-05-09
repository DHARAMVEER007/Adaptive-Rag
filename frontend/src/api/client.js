const API = '/api'
const AUTH = '/auth'

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const auth = {
  // POST /auth/login → { jwt: "session_username", role: "user" }
  login: (username, password) =>
    request(`${AUTH}/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // POST /auth/create_user → { status: "ok", role: "user" }
  register: (username, password) =>
    request(`${AUTH}/create_user`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
}

export const rag = {
  // GET /api/rag/sessions/{username} → { sessions: [...] }
  getSessions: async (username) => {
    const data = await request(`${API}/rag/sessions/${username}`)
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
