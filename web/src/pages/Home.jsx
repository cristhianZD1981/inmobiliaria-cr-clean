import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import "../styles/home.css"

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

export default function Home() {
  const navigate = useNavigate()

  // Datos para la home
  const [featured, setFeatured] = useState([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)

  // Catálogos para el buscador (reutiliza lo mismo que /propiedades)
  const [provincias, setProvincias] = useState([])
  const [tipos, setTipos] = useState([])

  // Controles del buscador rápido
  const [q, setQ] = useState("")
  const [provinciaId, setProvinciaId] = useState("")
  const [tipo, setTipo] = useState("")
  const [precioMax, setPrecioMax] = useState("")

  useEffect(() => {
    cargarCatalogos()
    cargarDestacadas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function cargarCatalogos() {
    try {
      const [pRes, tRes] = await Promise.all([
        fetch(`${API_URL}/api/catalogos/provincias`),
        fetch(`${API_URL}/api/catalogos/tipos`),
      ])

      const pData = await pRes.json().catch(() => [])
      const tData = await tRes.json().catch(() => [])

      if (pRes.ok && Array.isArray(pData)) setProvincias(pData)
      if (tRes.ok && Array.isArray(tData)) setTipos(tData)
    } catch {
      // sin catálogo no bloqueamos la home
    }
  }

  async function cargarDestacadas() {
    try {
      setLoadingFeatured(true)
      const res = await fetch(`${API_URL}/api/propiedades?top=6`)
      const data = await res.json().catch(() => [])
      setFeatured(res.ok && Array.isArray(data) ? data : [])
    } catch {
      setFeatured([])
    } finally {
      setLoadingFeatured(false)
    }
  }

  function onBuscar(e) {
    e.preventDefault()

    const params = new URLSearchParams()
    if (q.trim()) params.set("q", q.trim())
    if (provinciaId) params.set("provinciaId", provinciaId)
    if (tipo) params.set("tipo", tipo)
    if (precioMax) params.set("precioMax", precioMax)

    const qs = params.toString()
    navigate(qs ? `/propiedades?${qs}` : "/propiedades")
  }

  const stats = useMemo(
    () => [
      { k: "Propiedades verificadas", v: "100%" },
      { k: "Atención personalizada", v: "Asesoría real" },
      { k: "Respuesta rápida", v: "< 15 min" },
    ],
    []
  )

  return (
    <div className="home-page">
      {/* HEADER */}
      <header className="home-header">
        <div className="home-container home-header-inner">
          <h1 className="home-logo">Propiedades del sur</h1>

          <nav className="home-nav" aria-label="Navegación principal">
            <Link to="/propiedades" className="home-nav-link">
              Ver propiedades
            </Link>

            <Link to="/admin/login" className="home-admin-btn">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="home-hero">
        <div className="home-container home-hero-inner">
          <div className="home-hero-copy">
            <p className="home-hero-eyebrow">Propiedades en Costa Rica</p>
            <h2 className="home-hero-title">
              Encontrá tu próxima propiedad sin perder tiempo
            </h2>
            <p className="home-hero-subtitle">
              Buscá por provincia, tipo y presupuesto. Listados con fotos y detalles claros para
              tomar mejores decisiones.
            </p>

            <div className="home-hero-actions">
              <Link to="/propiedades" className="btn btn-primary">
                Explorar propiedades
              </Link>
              <a href="#destacadas" className="btn btn-secondary">
                Ver destacadas
              </a>
            </div>

            <div className="home-stats" aria-label="Beneficios principales">
              {stats.map((s) => (
                <div key={s.k} className="home-stat">
                  <div className="home-stat-value">{s.v}</div>
                  <div className="home-stat-label">{s.k}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Buscador */}
          <aside className="home-search" aria-label="Buscador rápido">
            <div className="home-search-card">
              <h3 className="home-search-title">Buscá rápido</h3>
              <p className="home-search-subtitle">Probá con provincia + tipo + precio máximo.</p>

              <form onSubmit={onBuscar} className="home-search-form">
                <label className="sr-only" htmlFor="q">
                  Palabra clave
                </label>
                <input
                  id="q"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="input"
                  placeholder="Ej: Escazú, cerca de la playa…"
                />

                <label className="sr-only" htmlFor="provincia">
                  Provincia
                </label>
                <select
                  id="provincia"
                  value={provinciaId}
                  onChange={(e) => setProvinciaId(e.target.value)}
                  className="input"
                >
                  <option value="">Todas las provincias</option>
                  {provincias.map((p) => (
                    <option key={p.ProvinciaId} value={String(p.ProvinciaId)}>
                      {p.Nombre}
                    </option>
                  ))}
                </select>

                <label className="sr-only" htmlFor="tipo">
                  Tipo
                </label>
                <select
                  id="tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="input"
                >
                  <option value="">Todos los tipos</option>
                  {tipos.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <label className="sr-only" htmlFor="precioMax">
                  Precio máximo
                </label>
                <input
                  id="precioMax"
                  type="number"
                  inputMode="numeric"
                  value={precioMax}
                  onChange={(e) => setPrecioMax(e.target.value)}
                  className="input"
                  placeholder="Precio máximo (CRC o USD)"
                />

                <button className="btn btn-primary btn-block" type="submit">
                  Buscar propiedades
                </button>

                <div className="home-search-hint">
                  Tip: podés afinar más filtros dentro del listado.
                </div>
              </form>
            </div>
          </aside>
        </div>
      </section>

      {/* DESTACADAS */}
      <section id="destacadas" className="home-section">
        <div className="home-container">
          <div className="home-section-head">
            <h3 className="home-section-title">Propiedades destacadas</h3>
            <Link to="/propiedades" className="home-section-link">
              Ver todas →
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="home-skeleton-grid" aria-label="Cargando destacadas">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="home-skeleton-card" />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="home-empty">
              Aún no hay propiedades para mostrar. Probá recargar o revisá el API.
            </div>
          ) : (
            <div className="home-grid">
              {featured.map((p) => (
                <Link
                  key={p.PropiedadId}
                  to={`/propiedades/${p.PropiedadId}`}
                  className="property-card"
                >
                  <div className="property-image">
                    {p.Imagen ? (
                      <img src={p.Imagen} alt={p.Titulo || "Propiedad"} loading="lazy" />
                    ) : (
                      <div className="property-image-placeholder" aria-hidden="true" />
                    )}
                    <span className="badge">
                      {p.Tipo || "Propiedad"}
                      {p.Condicion ? ` • ${p.Condicion}` : ""}
                    </span>
                  </div>

                  <div className="property-body">
                    <div className="property-price">{formatMoney(p.Precio, p.Moneda)}</div>
                    <div className="property-title">{p.Titulo || "Propiedad"}</div>
                    <div className="property-location">{p.Provincia || "Costa Rica"}</div>

                    <div className="property-meta">
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
          )}
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="home-section home-section-alt">
        <div className="home-container">
          <h3 className="home-section-title">¿Por qué elegirnos?</h3>

          <div className="home-benefits">
            <div className="benefit">
              <div className="benefit-icon">✔</div>
              <div className="benefit-title">Propiedades verificadas</div>
              <div className="benefit-text">Publicaciones con información completa y revisada.</div>
            </div>

            <div className="benefit">
              <div className="benefit-icon">🤝</div>
              <div className="benefit-title">Acompañamiento</div>
              <div className="benefit-text">Te guiamos desde la búsqueda hasta la visita.</div>
            </div>

            <div className="benefit">
              <div className="benefit-icon">📍</div>
              <div className="benefit-title">Enfoque local</div>
              <div className="benefit-text">Conocemos zonas, precios y oportunidades en CR.</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="home-cta">
        <div className="home-container home-cta-inner">
          <div>
            <h3 className="home-cta-title">¿Listo para encontrar la propiedad ideal?</h3>
            <p className="home-cta-text">
              Explorá el inventario completo y filtrá por ubicación, precio, tipo y más.
            </p>
          </div>

          <div className="home-cta-actions">
            <Link to="/propiedades" className="btn btn-primary">
              Ver propiedades
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="home-footer">
        <div className="home-container home-footer-inner">
          <div className="home-footer-brand">
            <div className="home-footer-logo">Propiedades del sur</div>
            <div className="home-footer-muted">Compra y venta de propiedades en Costa Rica.</div>
          </div>

          <div className="home-footer-links">
            <Link to="/propiedades" className="home-footer-link">
              Propiedades
            </Link>
            <Link to="/admin/login" className="home-footer-link">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
