import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import "./styles/listado.css"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export default function Listado() {
  const location = useLocation()
  const navigate = useNavigate()

  // Lee filtros desde la URL
  const init = useMemo(() => {
    const sp = new URLSearchParams(location.search)
    return {
      q: sp.get("q") || "",
      provinciaId: sp.get("provinciaId") || "",
      tipo: sp.get("tipo") || "",
      condicion: sp.get("condicion") || "",
      precioMin: sp.get("precioMin") || "",
      precioMax: sp.get("precioMax") || "",
      habMin: sp.get("habMin") || "",
      banosMin: sp.get("banosMin") || "",
      order: sp.get("order") || "recientes",
      top: sp.get("top") || "200",
    }
  }, [location.search])

  const [propiedades, setPropiedades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // catálogos
  const [provincias, setProvincias] = useState([])
  const [tipos, setTipos] = useState([])
  const [condiciones, setCondiciones] = useState([])

  // filtros
  const [q, setQ] = useState(init.q)
  const [provinciaId, setProvinciaId] = useState(init.provinciaId)
  const [tipo, setTipo] = useState(init.tipo)
  const [condicion, setCondicion] = useState(init.condicion)
  const [precioMin, setPrecioMin] = useState(init.precioMin)
  const [precioMax, setPrecioMax] = useState(init.precioMax)
  const [habMin, setHabMin] = useState(init.habMin)
  const [banosMin, setBanosMin] = useState(init.banosMin)
  const [order, setOrder] = useState(init.order)
  const [top, setTop] = useState(init.top)

  // Si el usuario usa back/forward o entra por link compartido, sincroniza estados con la URL
  useEffect(() => {
    setQ(init.q)
    setProvinciaId(init.provinciaId)
    setTipo(init.tipo)
    setCondicion(init.condicion)
    setPrecioMin(init.precioMin)
    setPrecioMax(init.precioMax)
    setHabMin(init.habMin)
    setBanosMin(init.banosMin)
    setOrder(init.order)
    setTop(init.top)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init])

  useEffect(() => {
    cargarCatalogos()
    cargar() // carga inicial con lo que venga en URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargarCatalogos() {
    try {
      const [pRes, tRes, cRes] = await Promise.all([
        fetch(`${API_URL}/api/catalogos/provincias`),
        fetch(`${API_URL}/api/catalogos/tipos`),
        fetch(`${API_URL}/api/catalogos/condiciones`),
      ])

      const pData = await pRes.json().catch(() => [])
      const tData = await tRes.json().catch(() => [])
      const cData = await cRes.json().catch(() => [])

      if (pRes.ok && Array.isArray(pData)) setProvincias(pData)
      if (tRes.ok && Array.isArray(tData)) setTipos(tData)
      if (cRes.ok && Array.isArray(cData)) setCondiciones(cData)
    } catch {
      // no bloquea
    }
  }

  function buildParams() {
    const params = new URLSearchParams()

    if (q.trim()) params.set("q", q.trim())
    if (provinciaId) params.set("provinciaId", provinciaId)
    if (tipo) params.set("tipo", tipo)
    if (condicion) params.set("condicion", condicion)

    if (precioMin) params.set("precioMin", precioMin)
    if (precioMax) params.set("precioMax", precioMax)

    if (habMin) params.set("habMin", habMin)
    if (banosMin) params.set("banosMin", banosMin)

    if (order) params.set("order", order)
    if (top) params.set("top", top)

    return params.toString()
  }

  async function cargar(e) {
    if (e?.preventDefault) e.preventDefault()

    try {
      setLoading(true)
      setError("")

      const qs = buildParams()

      // refleja filtros en URL (shareable)
      navigate({ search: qs ? `?${qs}` : "" }, { replace: true })

      const url = qs ? `${API_URL}/api/propiedades?${qs}` : `${API_URL}/api/propiedades`
      const res = await fetch(url)
      const data = await res.json().catch(() => [])

      if (!res.ok) throw new Error(data?.error || "Error cargando propiedades")

      setPropiedades(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || "Error cargando propiedades")
      setPropiedades([])
    } finally {
      setLoading(false)
    }
  }

  function limpiar() {
    navigate({ search: "" }, { replace: true })

    setQ("")
    setProvinciaId("")
    setTipo("")
    setCondicion("")
    setPrecioMin("")
    setPrecioMax("")
    setHabMin("")
    setBanosMin("")
    setOrder("recientes")
    setTop("200")

    setTimeout(() => cargar(), 0)
  }

  const total = propiedades.length
  const resumen = useMemo(() => {
    if (loading) return "Cargando..."
    if (error) return ""
    return `${total} resultado${total === 1 ? "" : "s"}`
  }, [loading, error, total])

  return (
    <main className="listado-page">
      <header className="listado-header">
        <div className="listado-container listado-header-inner">
          <h1 className="listado-logo">Propiedades del sur</h1>

          <nav className="listado-nav">
            <Link to="/" className="listado-nav-link">
              Inicio
            </Link>
            <Link to="/admin/login" className="listado-admin-btn">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <section className="listado-container listado-content">
        <div className="listado-title-row">
          <h2 className="listado-title">Propiedades disponibles</h2>
          <span className="listado-badge">{resumen}</span>
        </div>

        <form onSubmit={cargar} className="listado-filters">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar (título, provincia, código, descripción...)"
            className="listado-input"
          />

          <select
            value={provinciaId}
            onChange={(e) => setProvinciaId(e.target.value)}
            className="listado-input"
          >
            <option value="">Todas las provincias</option>
            {provincias.map((p) => (
              <option key={p.ProvinciaId} value={String(p.ProvinciaId)}>
                {p.Nombre}
              </option>
            ))}
          </select>

          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="listado-input">
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={condicion}
            onChange={(e) => setCondicion(e.target.value)}
            className="listado-input"
          >
            <option value="">Cualquier condición</option>
            {condiciones.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <input
            type="number"
            inputMode="numeric"
            value={precioMin}
            onChange={(e) => setPrecioMin(e.target.value)}
            placeholder="Precio mínimo"
            className="listado-input"
          />

          <input
            type="number"
            inputMode="numeric"
            value={precioMax}
            onChange={(e) => setPrecioMax(e.target.value)}
            placeholder="Precio máximo"
            className="listado-input"
          />

          <input
            type="number"
            inputMode="numeric"
            value={habMin}
            onChange={(e) => setHabMin(e.target.value)}
            placeholder="Habitaciones mín."
            className="listado-input"
          />

          <input
            type="number"
            inputMode="numeric"
            value={banosMin}
            onChange={(e) => setBanosMin(e.target.value)}
            placeholder="Baños mín."
            className="listado-input"
          />

          <select value={order} onChange={(e) => setOrder(e.target.value)} className="listado-input">
            <option value="recientes">Más recientes</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
          </select>

          <select value={top} onChange={(e) => setTop(e.target.value)} className="listado-input">
            <option value="50">Top 50</option>
            <option value="100">Top 100</option>
            <option value="200">Top 200</option>
            <option value="500">Top 500</option>
          </select>

          <div className="listado-actions">
            <button type="submit" className="btn btn-primary">
              Aplicar filtros
            </button>
            <button type="button" onClick={limpiar} className="btn btn-secondary">
              Limpiar
            </button>
          </div>
        </form>

        {loading && <p className="listado-info">Cargando propiedades...</p>}
        {error && <p className="listado-error">{error}</p>}

        <div className="listado-grid">
          {propiedades.map((p) => (
            <Link
              key={p.PropiedadId}
              to={`/propiedades/${p.PropiedadId}`}
              className="listado-card"
              title="Ver detalle"
            >
              <div className="listado-card-image">
                {p.Imagen ? (
                  <img src={p.Imagen} alt={p.Titulo || "Propiedad"} loading="lazy" />
                ) : (
                  <div className="listado-card-placeholder" aria-hidden="true" />
                )}
                <span className="listado-card-badge">
                  {p.Tipo || "Propiedad"}
                  {p.Condicion ? ` • ${p.Condicion}` : ""}
                </span>
              </div>

              <div className="listado-card-body">
                <div className="listado-card-title">{p.Titulo || "Propiedad"}</div>

                <div className="listado-card-price">
                  {p.Moneda === "CRC" ? "₡" : "$"}
                  {Number(p.Precio || 0).toLocaleString("es-CR")}
                </div>

                <div className="listado-card-location">{p.Provincia || "Costa Rica"}</div>

                <div className="listado-card-meta">
                  <span>{p.Habitaciones ? `${p.Habitaciones} hab` : "— hab"}</span>
                  <span>{p.Banos ? `${p.Banos} baños` : "— baños"}</span>
                  <span>
                    {p.MetrosConstruccion
                      ? `${p.MetrosConstruccion} m²`
                      : p.MetrosTerreno
                        ? `${p.MetrosTerreno} m²`
                        : "— m²"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="listado-footer">
        © {new Date().getFullYear()} Propiedades del sur
      </footer>
    </main>
  )
}
