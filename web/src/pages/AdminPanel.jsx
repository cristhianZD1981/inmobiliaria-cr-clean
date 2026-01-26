import { Link, useNavigate } from "react-router-dom"
import { useEffect, useMemo } from "react"

export default function AdminPanel() {
  const navigate = useNavigate()

  useEffect(() => {
    const tk = localStorage.getItem("token")
    if (!tk) navigate("/admin/login")
  }, [navigate])

  const userLabel = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null")
      if (u?.usuario) return u.usuario
      if (u?.Usuario) return u.Usuario
    } catch {}
    try {
      const legacy = JSON.parse(localStorage.getItem("usuario") || "null")
      if (typeof legacy === "string") return legacy
      if (legacy?.usuario) return legacy.usuario
    } catch {}
    return null
  }, [])

  function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("usuario") // legacy
    localStorage.removeItem("user") // nuevo
    navigate("/admin/login")
  }

  return (
    <main style={S.page}>
      <header style={S.header}>
        <div>
          <h1 style={{ margin: 0 }}>Panel Administrativo</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.85 }}>
            Elegí una sección{userLabel ? ` • Sesión: ${userLabel}` : ""}
          </p>
        </div>

        <button onClick={logout} style={S.btnDanger}>
          Cerrar sesión
        </button>
      </header>

      <section style={S.container}>
        <div style={S.grid}>
          <Link to="/admin/dashboard" style={S.cardLink}>
            <div style={S.card}>
              <div style={S.cardTitle}>Dashboard</div>
              <div style={S.cardDesc}>KPIs, leads por día, top propiedades</div>
            </div>
          </Link>

          <Link to="/admin/propiedades" style={S.cardLink}>
            <div style={S.card}>
              <div style={S.cardTitle}>Propiedades</div>
              <div style={S.cardDesc}>Crear, editar, fotos, orden, publicación</div>
            </div>
          </Link>

          <Link to="/admin/leads" style={S.cardLink}>
            <div style={S.card}>
              <div style={S.cardTitle}>Leads</div>
              <div style={S.cardDesc}>Listado, filtros, estado, notas, eliminar</div>
            </div>
          </Link>

          <Link to="/admin/usuarios" style={S.cardLink}>
            <div style={S.card}>
              <div style={S.cardTitle}>Usuarios</div>
              <div style={S.cardDesc}>Crear administradores/agentes y sus datos de contacto</div>
            </div>
          </Link>

          <a href="/#/" style={S.cardLink} target="_blank" rel="noreferrer">
            <div style={S.card}>
              <div style={S.cardTitle}>Sitio público</div>
              <div style={S.cardDesc}>Ver propiedades como usuario.</div>
            </div>
          </a>
        </div>
      </section>
    </main>
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
    alignItems: "start",
  },
  cardLink: { textDecoration: "none" },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 10px 20px rgba(0,0,0,0.06)",
    minHeight: 92,
  },
  cardTitle: { fontWeight: 1000, color: "#0f172a", fontSize: 18 },
  cardDesc: { marginTop: 8, color: "#64748b", fontWeight: 700, fontSize: 13 },
  btnDanger: {
    background: "#991b1b",
    color: "#fff",
    border: "1px solid #991b1b",
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
}
