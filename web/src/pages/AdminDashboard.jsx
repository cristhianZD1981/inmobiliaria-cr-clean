import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [data, setData] = useState({
    resumen: {},
    leadsPorEstado: [],
    leadsPorCanal: [],
    leadsPorDia: [],
    topPropiedades: [],
  })

  useEffect(() => {
    const tk = localStorage.getItem("token")
    if (!tk) {
      navigate("/admin/login")
      return
    }
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  async function cargar() {
    try {
      setLoading(true)
      setError("")
      const tk = localStorage.getItem("token")

      if (!tk) {
        navigate("/admin/login")
        return
      }

      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      // Si el token expiró o es inválido, forzamos logout
      if (res.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("usuario")
        navigate("/admin/login")
        return
      }

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || "No se pudieron cargar estadísticas")
        return
      }

      setData({
        resumen: json.resumen || {},
        leadsPorEstado: json.leadsPorEstado || [],
        leadsPorCanal: json.leadsPorCanal || [],
        leadsPorDia: json.leadsPorDia || [],
        topPropiedades: json.topPropiedades || [],
      })
    } catch {
      setError("No se pudo conectar con el servidor")
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("usuario")
    navigate("/admin/login")
  }

  const r = data.resumen || {}

  const maxDia = useMemo(() => {
    const arr = data.leadsPorDia || []
    let m = 0
    for (const x of arr) m = Math.max(m, Number(x.Cantidad || 0))
    return m || 1
  }, [data.leadsPorDia])

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <h1 style={{ margin: 0 }}>Admin • Dashboard</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.85 }}>KPIs rápidos del sitio</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/admin" style={S.btnLight}>
            Menú
          </Link>

          <Link to="/admin/propiedades" style={S.btnLight}>
            Propiedades
          </Link>

          <Link to="/admin/leads" style={S.btnPrimary}>
            Leads
          </Link>

          <button onClick={cargar} style={S.btnLightBtn}>
            Refrescar
          </button>

          <button onClick={logout} style={S.btnDanger}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <section style={S.container}>
        {loading && <p>Cargando...</p>}

        {error && (
          <div style={S.errorBox}>
            <p style={{ margin: 0, fontWeight: 800 }}>{error}</p>
            <button onClick={cargar} style={{ ...S.btnPrimaryBtn, marginTop: 10 }}>
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div style={S.cards}>
              <Card title="Propiedades (Total)" value={r.PropiedadesTotal} />
              <Card title="Publicadas" value={r.PropiedadesPublicadas} />
              <Card title="Borrador" value={r.PropiedadesBorrador} />
              <Card title="Leads (Total)" value={r.LeadsTotal} />
              <Card title="Leads Hoy" value={r.LeadsHoy} />
              <Card title="Leads 7 días" value={r.Leads7Dias} />
            </div>

            <div style={S.grid2}>
              <div style={S.panel}>
                <h3 style={S.h3}>Leads por Estado</h3>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Estado</th>
                      <th style={S.th}>Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leadsPorEstado.map((x) => (
                      <tr key={x.Estado}>
                        <td style={S.td}>{x.Estado}</td>
                        <td style={S.td}>{x.Cantidad}</td>
                      </tr>
                    ))}
                    {!data.leadsPorEstado.length && (
                      <tr>
                        <td style={S.td} colSpan={2}>
                          Sin datos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={S.panel}>
                <h3 style={S.h3}>Leads por Canal</h3>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Canal</th>
                      <th style={S.th}>Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leadsPorCanal.map((x) => (
                      <tr key={x.Canal}>
                        <td style={S.td}>{x.Canal}</td>
                        <td style={S.td}>{x.Cantidad}</td>
                      </tr>
                    ))}
                    {!data.leadsPorCanal.length && (
                      <tr>
                        <td style={S.td} colSpan={2}>
                          Sin datos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={S.grid2}>
              <div style={S.panel}>
                <h3 style={S.h3}>Leads por día (últimos 14)</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {data.leadsPorDia.map((x) => {
                    const pct = Math.round((Number(x.Cantidad || 0) / maxDia) * 100)
                    return (
                      <div
                        key={String(x.Fecha)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "130px 1fr 60px",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>
                          {String(x.Fecha).slice(0, 10)}
                        </div>
                        <div
                          style={{
                            background: "#e5e7eb",
                            borderRadius: 999,
                            overflow: "hidden",
                            height: 12,
                          }}
                        >
                          <div style={{ width: `${pct}%`, height: 12, background: "#0f172a" }} />
                        </div>
                        <div style={{ textAlign: "right", fontWeight: 900 }}>{x.Cantidad}</div>
                      </div>
                    )
                  })}
                  {!data.leadsPorDia.length && (
                    <p style={{ margin: 0, color: "#6b7280" }}>Sin datos</p>
                  )}
                </div>
              </div>

              <div style={S.panel}>
                <h3 style={S.h3}>Top Propiedades (leads últimos 30 días)</h3>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Propiedad</th>
                      <th style={S.th}>Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPropiedades.map((x) => (
                      <tr key={x.PropiedadId}>
                        <td style={S.td}>
                          <div style={{ fontWeight: 900 }}>{x.Titulo}</div>
                          <div style={{ color: "#6b7280", fontSize: 12 }}>ID: {x.PropiedadId}</div>
                        </td>
                        <td style={S.td}>{x.Cantidad}</td>
                      </tr>
                    ))}
                    {!data.topPropiedades.length && (
                      <tr>
                        <td style={S.td} colSpan={2}>
                          Sin datos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

function Card({ title, value }) {
  return (
    <div style={S.card}>
      <div style={{ color: "#6b7280", fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 1000, color: "#0f172a", marginTop: 6 }}>
        {value ?? 0}
      </div>
    </div>
  )
}

const S = {
  page: { minHeight: "100vh", background: "#f5f7fa", fontFamily: "system-ui" },
  header: {
    background: "#0f172a",
    color: "white",
    padding: "18px 22px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  container: { maxWidth: 1100, margin: "0 auto", padding: 22 },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 12,
    marginBottom: 14,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 10px 20px rgba(0,0,0,0.06)",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: 12,
    marginTop: 12,
  },
  panel: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 10px 20px rgba(0,0,0,0.06)",
  },
  h3: { margin: "0 0 10px", color: "#0f172a" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    borderBottom: "1px solid #e5e7eb",
    padding: "10px 8px",
    color: "#334155",
  },
  td: { borderBottom: "1px solid #f1f5f9", padding: "10px 8px", verticalAlign: "top" },

  // Links en header
  btnPrimary: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #fff",
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 900,
    textDecoration: "none",
    cursor: "pointer",
  },
  btnLight: {
    background: "transparent",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.25)",
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 900,
    textDecoration: "none",
  },

  // Botones en header
  btnLightBtn: {
    background: "transparent",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.25)",
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
  btnPrimaryBtn: {
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #0f172a",
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
  btnDanger: {
    background: "#991b1b",
    color: "#fff",
    border: "1px solid #991b1b",
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 900,
    cursor: "pointer",
  },

  errorBox: {
    background: "#fff",
    border: "1px solid #fecaca",
    borderRadius: 14,
    padding: 14,
    color: "#991b1b",
  },
}
