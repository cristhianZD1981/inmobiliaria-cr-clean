import { useEffect, useMemo, useState } from "react"
import { useNavigate, Link } from "react-router-dom"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

function formatMoney(value, moneda) {
  const num = Number(value || 0)
  const currency = moneda === "USD" ? "USD" : "CRC"
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CRC" ? 0 : 2,
  }).format(num)
}

export default function Propiedades() {
  const navigate = useNavigate()

  const [propiedades, setPropiedades] = useState([])
  const [provincia, setProvincia] = useState("")
  const [precioMax, setPrecioMax] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargar() {
    try {
      setLoading(true)
      setError("")
      const res = await fetch(`${API_URL}/api/propiedades`)
      const data = await res.json().catch(() => ([]))

      if (!res.ok) {
        setError(data?.error || `Error ${res.status}`)
        setPropiedades([])
        return
      }

      setPropiedades(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.message ? `Error: ${e.message}` : "Error al cargar propiedades")
      setPropiedades([])
    } finally {
      setLoading(false)
    }
  }

  const provincias = useMemo(() => {
    return [...new Set(propiedades.map((p) => p.Provincia).filter(Boolean))].sort()
  }, [propiedades])

  const filtradas = useMemo(() => {
    let arr = [...propiedades]

    if (provincia) arr = arr.filter((p) => p.Provincia === provincia)

    if (precioMax) {
      const max = Number(precioMax)
      if (Number.isFinite(max)) arr = arr.filter((p) => Number(p.Precio) <= max)
    }

    return arr
  }, [propiedades, provincia, precioMax])

  function limpiar() {
    setProvincia("")
    setPrecioMax("")
  }

  function irDetalle(id) {
    navigate(`/propiedades/${id}`)
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>Propiedades disponibles</h1>
        <nav style={styles.nav}>
          <Link to="/" style={styles.link}>
            Inicio
          </Link>
          <Link to="/admin/login" style={styles.adminBtn}>
            Admin
          </Link>
        </nav>
      </header>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "0 0 10px" }}>Filtros</h2>

        <div style={styles.filters}>
          <select value={provincia} onChange={(e) => setProvincia(e.target.value)} style={styles.input}>
            <option value="">Todas las provincias</option>
            {provincias.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Precio máximo"
            value={precioMax}
            onChange={(e) => setPrecioMax(e.target.value)}
            style={styles.input}
          />

          <button onClick={limpiar} style={styles.btn}>
            Limpiar
          </button>
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        {loading && <p>Cargando propiedades...</p>}
        {!loading && error && <p style={{ color: "#991b1b", fontWeight: 800 }}>{error}</p>}

        {!loading && !error && filtradas.length === 0 && (
          <p>No hay propiedades que coincidan con los filtros.</p>
        )}

        {!loading && !error && filtradas.length > 0 && (
          <div style={styles.grid}>
            {filtradas.map((p) => (
              <article
                key={p.PropiedadId}
                style={styles.card}
                onClick={() => irDetalle(p.PropiedadId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") irDetalle(p.PropiedadId)
                }}
                aria-label={`Ver detalle de ${p.Titulo}`}
              >
                <div style={styles.imageWrap}>
                  <img
                    src={p.Imagen || "https://via.placeholder.com/800x500?text=Sin+imagen"}
                    alt={p.Titulo || "Propiedad"}
                    style={styles.image}
                    loading="lazy"
                  />
                </div>

                <div style={styles.body}>
                  <h3 style={{ margin: "0 0 6px" }}>{p.Titulo}</h3>
                  <p style={{ margin: 0, opacity: 0.8 }}>{p.Provincia}</p>
                  <p style={{ margin: "8px 0 0", fontWeight: 900 }}>
                    {formatMoney(p.Precio, p.Moneda)}
                  </p>

                  <div style={{ marginTop: 10 }}>
                    {/* Link extra por si querés botón */}
                    <Link
                      to={`/propiedades/${p.PropiedadId}`}
                      onClick={(e) => e.stopPropagation()}
                      style={styles.detailLink}
                    >
                      Ver detalle →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  nav: { display: "flex", gap: 12, alignItems: "center" },
  link: { textDecoration: "none", fontWeight: 700, color: "#0f172a" },
  adminBtn: {
    textDecoration: "none",
    fontWeight: 900,
    background: "#0f172a",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 10,
  },
  filters: { display: "flex", gap: 12, flexWrap: "wrap" },
  input: { padding: 10, borderRadius: 10, border: "1px solid #d1d5db", minWidth: 220 },
  btn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
    marginTop: 14,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
  },
  imageWrap: { width: "100%", aspectRatio: "16 / 10", overflow: "hidden" },
  image: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  body: { padding: 14 },
  detailLink: { textDecoration: "none", fontWeight: 900, color: "#0f172a" },
}
