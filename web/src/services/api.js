const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"
const API_URL = `${BASE_URL}/api`

export async function getPropiedades() {
  const response = await fetch(`${API_URL}/propiedades`)
  if (!response.ok) {
    throw new Error(`Error obteniendo propiedades: ${response.status}`)
  }
  return await response.json()
}
