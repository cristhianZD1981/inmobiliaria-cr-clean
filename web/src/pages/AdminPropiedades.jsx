import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export default function AdminPropiedades() {
  const navigate = useNavigate()
  const [propiedades, setPropiedades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")

  useEffect(() => {
    const tk = localStorage.getItem("token")
    if (!tk) {
      navigate("/admin/login")
      return
    }
    cargar(tk)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  async function cargar(tk) {
    try {
      setLoading(true)
      setError("")
      setInfo("")

      const res = await fetch(`${API_URL}/api/admin/propiedades`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      const data = await res.json().catch(() => ([]))
      if (!res.ok) {
        setError(data?.error || `Error ${res.status}`)
        if (res.status === 401) {
          localStorage.removeItem("token")
          navigate("/admin/login")
        }
        return
      }

      setPropiedades(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.message ? `Error: ${e.message}` : "No se pudo conectar")
    } finally {
      setLoading(false)
    }
  }

  async function actualizarCampo(p, patch) {
    const tk = localStorage.getItem("token")
    if (!tk) return navigate("/admin/login")

    try {
      setError("")
      setInfo("")

      // ✅ 1) Traer detalle real para no pisar campos con null
      const det = await fetch(`${API_URL}/api/admin/propiedades/${p.PropiedadId}`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      const detData = await det.json().catch(() => ({}))
      if (!det.ok) {
        setError(detData?.error || "No se pudo cargar detalle para actualizar")
        return
      }

      // ✅ 2) Construir payload SOLO con campos que el backend PUT usa,
      // usando el detalle como base + patch
      const fullPayload = {
        Titulo: detData.Titulo,
        Descripcion: detData.Descripcion || null,
        Tipo: detData.Tipo,
        Condicion: detData.Condicion || null,
        Precio: Number(detData.Precio || 0),
        Moneda: detData.Moneda,
        ProvinciaId: detData.ProvinciaId,
        DireccionDetallada: detData.DireccionDetallada || null,
        MetrosTerreno: detData.MetrosTerreno ?? null,
        MetrosConstruccion: detData.MetrosConstruccion ?? null,
        Habitaciones: detData.Habitaciones ?? null,
        Banos: detData.Banos ?? null,
        Parqueos: detData.Parqueos ?? null,
        TieneCondominio: detData.TieneCondominio ? true : false,
        CuotaCondominio: detData.CuotaCondominio ?? null,
        EstadoPublicacion: detData.EstadoPublicacion || "Borrador",
        Visible: !!detData.Visible,
        Destacada: !!detData.Destacada,
        ...patch,
      }

      const res = await fetch(`${API_URL}/api/admin/propiedades/${p.PropiedadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tk}`,
        },
        body: JSON.stringify(fullPayload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Error actualizando")
        return
      }

      setInfo("Actualizado")
      await cargar(tk)
    } catch (e) {
      setError(e?.message ? `Error: ${e.message}` : "Error actualizando")
    }
  }

  async function eliminar(p) {
    const ok = window.confirm(`¿Eliminar "${p.Titulo}"? Esta acción no se puede deshacer.`)
    if (!ok) return

    const tk = localStorage.getItem("token")
    if (!tk) return navigate("/admin/login")

    try {
      setError("")
      setInfo("")

      const res = await fetch(`${API_URL}/api/admin/propiedades/${p.PropiedadId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tk}` },
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Error eliminando")
        return
      }

      setInfo("Eliminado")
      await cargar(tk)
    } catch (e) {
      setError(e?.message ? `Error: ${e.message}` : "Error eliminando")
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>Propiedades (Admin)</h1>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/admin")} style={styles.btnLight}>
            ← Panel
          </button>
          <button onClick={() => navigate("/admin/propiedades/nueva")} style={styles.btnPrimary}>
            + Nueva
          </button>
        </div>
      </div>

      {loading && <p>Cargando...</p>}
      {!loading && error && <p style={styles.error}>{error}</p>}
      {!loading && info && <p style={styles.info}>{info}</p>}

      {!loading && !error && (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Título</th>
                <th>Provincia</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Visible</th>
                <th>Destacada</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {propiedades.map((p) => (
                <tr key={p.PropiedadId}>
                  <td>{p.PropiedadId}</td>
                  <td style={{ fontWeight: 800 }}>{p.Titulo}</td>
                  <td>{p.Provincia}</td>
                  <td>
                    {p.Moneda} {Number(p.Precio || 0).toLocaleString("es-CR")}
                  </td>
                  <td>{p.EstadoPublicacion}</td>

                  <td>
                    <button
                      style={p.Visible ? styles.pillOn : styles.pillOff}
                      onClick={() => actualizarCampo(p, { Visible: !p.Visible })}
                    >
                      {p.Visible ? "Sí" : "No"}
                    </button>
                  </td>

                  <td>
                    <button
                      style={p.Destacada ? styles.pillOn : styles.pillOff}
                      onClick={() => actualizarCampo(p, { Destacada: !p.Destacada })}
                    >
                      {p.Destacada ? "Sí" : "No"}
                    </button>
                  </td>

                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        style={styles.btnLight}
                        onClick={() => navigate(`/admin/propiedades/${p.PropiedadId}`)}
                      >
                        Editar
                      </button>

                      <button style={styles.btnDanger} onClick={() => eliminar(p)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!propiedades.length && (
                <tr>
                  <td colSpan={8} style={{ padding: 14 }}>
                    No hay propiedades.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 14, opacity: 0.8, fontSize: 13 }}>
        Tip: Para edición completa (provincia, precio, etc.) usá el botón “Editar”.
      </p>
    </main>
  )
}

const styles = {
  main: { padding: 28, maxWidth: 1200, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  card: {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
    padding: 12,
    overflowX: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  error: { color: "#991b1b", fontWeight: 900 },
  info: { color: "#065f46", fontWeight: 900 },
  btnPrimary: {
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #0f172a",
    padding: "10px 12px",
    borderRadius: 10,
    fontWeight: 900,
    cursor: "pointer",
  },
  btnLight: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #e5e7eb",
    padding: "10px 12px",
    borderRadius: 10,
    fontWeight: 800,
    cursor: "pointer",
  },
  btnDanger: {
    background: "#991b1b",
    color: "#fff",
    border: "1px solid #991b1b",
    padding: "10px 12px",
    borderRadius: 10,
    fontWeight: 900,
    cursor: "pointer",
  },
  pillOn: {
    background: "#065f46",
    color: "#fff",
    border: "1px solid #065f46",
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 900,
    cursor: "pointer",
  },
  pillOff: {
    background: "#fff",
    color: "#111827",
    border: "1px solid #d1d5db",
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 900,
    cursor: "pointer",
  },
}
