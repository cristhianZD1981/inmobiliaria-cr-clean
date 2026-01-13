import { useEffect, useMemo, useState } from "react"
import { useNavigate, Link } from "react-router-dom"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

function fmtDate(s) {
  try {
    const d = new Date(s)
    return d.toLocaleString("es-CR")
  } catch {
    return s
  }
}

export default function AdminLeads() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")

  const [leads, setLeads] = useState([])
  const [estado, setEstado] = useState("")
  const [q, setQ] = useState("")
  const [propiedadId, setPropiedadId] = useState("")

  useEffect(() => {
    const tk = localStorage.getItem("token")
    if (!tk) {
      navigate("/admin/login")
      return
    }
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("usuario")
    navigate("/admin/login")
  }

  async function cargar() {
    const tk = localStorage.getItem("token")
    if (!tk) return navigate("/admin/login")

    try {
      setLoading(true)
      setError("")
      setInfo("")

      const params = new URLSearchParams()
      if (estado) params.set("estado", estado)
      if (q) params.set("q", q)
      if (propiedadId) params.set("propiedadId", propiedadId)

      const qs = params.toString()
      const url = qs ? `${API_URL}/api/admin/leads?${qs}` : `${API_URL}/api/admin/leads`

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      const data = await res.json().catch(() => [])
      if (!res.ok) {
        setError(data?.error || `Error ${res.status}`)
        return
      }

      setLeads(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.message || "Error cargando leads")
    } finally {
      setLoading(false)
    }
  }

  const propiedadesUnicas = useMemo(() => {
    const map = new Map()
    for (const l of leads) {
      if (!map.has(l.PropiedadId)) map.set(l.PropiedadId, l.PropiedadTitulo)
    }
    return Array.from(map.entries()).map(([id, titulo]) => ({ id, titulo }))
  }, [leads])

  async function setEstadoLead(leadId, nuevoEstado) {
    const tk = localStorage.getItem("token")
    if (!tk) return navigate("/admin/login")

    try {
      setError("")
      setInfo("")

      const res = await fetch(`${API_URL}/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tk}`,
        },
        body: JSON.stringify({ Estado: nuevoEstado }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Error actualizando estado")
        return
      }

      setInfo("Estado actualizado")
      await cargar()
    } catch (e) {
      setError(e?.message || "Error actualizando estado")
    }
  }

  async function guardarNotas(leadId, notas) {
    const tk = localStorage.getItem("token")
    if (!tk) return navigate("/admin/login")

    try {
      setError("")
      setInfo("")

      const res = await fetch(`${API_URL}/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tk}`,
        },
        body: JSON.stringify({ Notas: notas }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Error guardando notas")
        return
      }

      setInfo("Notas guardadas")
      await cargar()
    } catch (e) {
      setError(e?.message || "Error guardando notas")
    }
  }

  async function eliminar(leadId) {
    const ok = window.confirm("¿Eliminar este lead? (No se puede deshacer)")
    if (!ok) return

    const tk = localStorage.getItem("token")
    if (!tk) return navigate("/admin/login")

    try {
      setError("")
      setInfo("")
      const res = await fetch(`${API_URL}/api/admin/leads/${leadId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tk}` },
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Error eliminando lead")
        return
      }

      setInfo("Lead eliminado")
      await cargar()
    } catch (e) {
      setError(e?.message || "Error eliminando lead")
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>Leads</h1>
          <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/admin/dashboard" style={styles.linkTop}>
              Dashboard
            </Link>
            <Link to="/admin/propiedades" style={styles.linkTop}>
              Propiedades
            </Link>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.btnLight} onClick={() => navigate("/admin")}>
            ← Panel
          </button>

          <button style={styles.btnPrimary} onClick={cargar}>
            Refrescar
          </button>

          <button style={styles.btnDanger} onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {info && <p style={styles.info}>{info}</p>}

      <section style={styles.filters}>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} style={styles.input}>
          <option value="">Todos los estados</option>
          <option value="Nuevo">Nuevo</option>
          <option value="Contactado">Contactado</option>
          <option value="Cerrado">Cerrado</option>
          <option value="Descartado">Descartado</option>
        </select>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar (nombre, tel, email, título)"
          style={styles.input}
        />

        <input
          value={propiedadId}
          onChange={(e) => setPropiedadId(e.target.value)}
          placeholder="PropiedadId (opcional)"
          style={styles.input}
        />

        <button
          style={styles.btnLight}
          onClick={() => {
            setEstado("")
            setQ("")
            setPropiedadId("")
          }}
        >
          Limpiar
        </button>

        <button style={styles.btnPrimary} onClick={cargar}>
          Aplicar
        </button>
      </section>

      {loading && <p>Cargando...</p>}

      {!loading && !leads.length && <p>No hay leads todavía.</p>}

      {!loading && leads.length > 0 && (
        <div style={styles.grid}>
          {leads.map((l) => (
            <LeadCard
              key={l.LeadId}
              lead={l}
              onSetEstado={setEstadoLead}
              onGuardarNotas={guardarNotas}
              onEliminar={eliminar}
            />
          ))}
        </div>
      )}

      {propiedadesUnicas.length > 0 && (
        <p style={{ marginTop: 14, opacity: 0.8, fontSize: 13 }}>
          Tip: podés abrir la propiedad en público con el enlace dentro del lead.
        </p>
      )}
    </main>
  )
}

function LeadCard({ lead, onSetEstado, onGuardarNotas, onEliminar }) {
  const [notas, setNotas] = useState(lead.Notas || "")

  return (
    <article style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            {lead.Nombre} <span style={styles.badge}>{lead.Estado}</span>
          </div>
          <div style={{ opacity: 0.8, marginTop: 4 }}>
            {lead.Telefono ? `📞 ${lead.Telefono}` : ""}
            {lead.Telefono && lead.Email ? " • " : ""}
            {lead.Email ? `✉️ ${lead.Email}` : ""}
          </div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            {fmtDate(lead.FechaCreacion)} • Fuente: {lead.Canal || "web"} • LeadId: {lead.LeadId}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button style={styles.btnPill} onClick={() => onSetEstado(lead.LeadId, "Nuevo")}>
            Nuevo
          </button>
          <button style={styles.btnPill} onClick={() => onSetEstado(lead.LeadId, "Contactado")}>
            Contactado
          </button>
          <button style={styles.btnPill} onClick={() => onSetEstado(lead.LeadId, "Cerrado")}>
            Cerrado
          </button>
          <button style={styles.btnPillGray} onClick={() => onSetEstado(lead.LeadId, "Descartado")}>
            Descartar
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 900 }}>Propiedad</div>
        <div style={{ marginTop: 6 }}>
          <div style={{ fontWeight: 800 }}>{lead.PropiedadTitulo}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
            <Link to={`/propiedades/${lead.PropiedadId}`} style={styles.link}>
              Ver en público
            </Link>
            <span style={{ opacity: 0.7 }}>PropiedadId: {lead.PropiedadId}</span>
          </div>
        </div>
      </div>

      {lead.Mensaje && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 900 }}>Mensaje</div>
          <p style={{ marginTop: 6, whiteSpace: "pre-line" }}>{lead.Mensaje}</p>
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 900 }}>Notas internas</div>
        <textarea
          rows={3}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Notas para seguimiento..."
          style={styles.textarea}
        />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
          <button style={styles.btnLight} onClick={() => onGuardarNotas(lead.LeadId, notas)}>
            Guardar notas
          </button>
          <button style={styles.btnDanger} onClick={() => onEliminar(lead.LeadId)}>
            Eliminar
          </button>
        </div>
      </div>
    </article>
  )
}

const styles = {
  main: { padding: 28, maxWidth: 1100, margin: "0 auto", fontFamily: "system-ui" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  filters: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 12,
    boxShadow: "0 10px 22px rgba(0,0,0,0.06)",
    marginBottom: 14,
  },
  input: { padding: 10, borderRadius: 10, border: "1px solid #d1d5db", minWidth: 240 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: 14,
  },
  card: {
    background: "#fff",
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
    border: "1px solid #eef2f7",
  },
  badge: {
    marginLeft: 8,
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
  },
  link: { textDecoration: "none", fontWeight: 900, color: "#0f172a" },
  linkTop: { textDecoration: "none", fontWeight: 900, color: "#0f172a", opacity: 0.85 },
  textarea: {
    width: "100%",
    marginTop: 6,
    padding: 10,
    borderRadius: 12,
    border: "1px solid #d1d5db",
  },
  btnPrimary: {
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #0f172a",
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
  btnLight: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #e5e7eb",
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
  btnPill: {
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #0f172a",
    padding: "8px 10px",
    borderRadius: 999,
    fontWeight: 900,
    cursor: "pointer",
  },
  btnPillGray: {
    background: "#fff",
    color: "#111827",
    border: "1px solid #d1d5db",
    padding: "8px 10px",
    borderRadius: 999,
    fontWeight: 900,
    cursor: "pointer",
  },
  error: { color: "#991b1b", fontWeight: 900 },
  info: { color: "#065f46", fontWeight: 900 },
}
