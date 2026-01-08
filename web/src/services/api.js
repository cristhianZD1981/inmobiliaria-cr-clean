const API_URL = 'http://localhost:3001/api'

export async function getPropiedades() {
  const response = await fetch(`${API_URL}/propiedades`)
  return await response.json()
}
