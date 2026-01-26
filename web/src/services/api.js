const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"
const API_URL = `${BASE_URL}/api`

export function getToken() {
  return localStorage.getItem("token")
}

export function setToken(token) {
  if (!token) localStorage.removeItem("token")
  else localStorage.setItem("token", token)
}

async function parseResponse(res) {
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return data
}

export async function apiFetch(path, options = {}, { auth = false } = {}) {
  const headers = new Headers(options.headers || {})

  // Body helper: si body es objeto plano, lo convertimos a JSON.
  // (No tocar FormData / Blob / ArrayBuffer)
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData
  const isBodyString = typeof options.body === "string"
  const isPlainObject =
    options.body &&
    typeof options.body === "object" &&
    !isFormData &&
    !(options.body instanceof Blob) &&
    !(options.body instanceof ArrayBuffer)

  let body = options.body
  if (isPlainObject) {
    body = JSON.stringify(options.body)
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  } else if (!headers.has("Content-Type") && isBodyString && body) {
    headers.set("Content-Type", "application/json")
  }

  if (auth) {
    const token = getToken()
    if (token) headers.set("Authorization", `Bearer ${token}`)
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    body,
    headers,
  })

  const data = await parseResponse(res)

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.error || data.message)) ||
      `Error HTTP ${res.status}`
    throw new Error(msg)
  }

  return data
}

// ===============================
// AUTH
// ===============================
export async function loginAdmin({ usuario, password }) {
  return apiFetch(
    "/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, password }),
    },
    { auth: false }
  )
}

// ===============================
// PÚBLICO
// ===============================
export async function getPropiedades() {
  return apiFetch("/propiedades", { method: "GET" }, { auth: false })
}
