import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { getIntlLocale } from "../i18n"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

// Fallbacks (por si alguna propiedad no trae Agente o viene incompleto)
const DEFAULT_WHATSAPP_NUMBER = "50683269055"
const DEFAULT_EMAIL = "info@tudominio.com"

function formatMoney(value, moneda, locale) {
  const num = Number(value || 0)
  const currency = moneda === "USD" ? "USD" : "CRC"
  return new Intl.NumberFormat(locale || "es-CR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CRC" ? 0 : 2,
  }).format(num)
}

// wa.me requiere solo dígitos (sin +, espacios, guiones)
function normalizeWhatsAppNumber(raw) {
  if (!raw) return null
  const digits = String(raw).replace(/\D+/g, "")
  return digits.length >= 8 ? digits : null
}

function buildWhatsAppMessage(propiedad, extraLines = []) {
  const titulo = propiedad?.Titulo || "Propiedad"
  const pid = propiedad?.PropiedadId != null ? propiedad.PropiedadId : ""
  const codigo = propiedad?.CodigoPublico ? propiedad.CodigoPublico : ""
  const idLine = codigo ? `Código: ${codigo} • ID: ${pid}` : `ID: ${pid}`

  const base = `Hola, quiero información sobre la propiedad: ${titulo}\n${idLine}`
  const extra = (extraLines || []).filter(Boolean).join("\n")
  return extra ? `${base}\n\n${extra}` : base
}

export default function DetallePropiedad() {
  const { t, i18n } = useTranslation()
  const intlLocale = useMemo(() => getIntlLocale(i18n.language), [i18n.language])

  const { id } = useParams()

  const [propiedad, setPropiedad] = useState(null)
  const [fotoActiva, setFotoActiva] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [lead, setLead] = useState({
    Nombre: "",
    Telefono: "",
    Email: "",
    Mensaje: "",
    _hp: "", // honeypot
  })

  const [enviando, setEnviando] = useState(false)
  const [leadOk, setLeadOk] = useState(false)
  const [leadMsg, setLeadMsg] = useState("")

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function cargar() {
    try {
      setError("")
      setLoading(true)
      setPropiedad(null)
      setLeadOk(false)
      setLeadMsg("")

      const res = await fetch(`${API_URL}/api/propiedades/${id}`)
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data?.error || `Error ${res.status}`)
        return
      }

      setPropiedad(data)
      const primera =
        data?.Fotos?.[0]?.Url ||
        "https://via.placeholder.com/1200x700?text=Sin+imagen"
      setFotoActiva(primera)
    } catch (e) {
      setError(e?.message ? `No se pudo cargar: ${e.message}` : "No se pudo conectar")
    } finally {
      setLoading(false)
    }
  }

  // Datos de contacto dinámicos (desde backend)
  const agente = propiedad?.Agente || null

  const agenteNombre = useMemo(() => {
    if (!agente) return null
    const n = [agente.Nombre, agente.Apellidos].filter(Boolean).join(" ").trim()
    return n || null
  }, [agente])

  const whatsappNumber = useMemo(() => {
    const w = normalizeWhatsAppNumber(agente?.WhatsApp) || normalizeWhatsAppNumber(agente?.Telefono)
    return w || DEFAULT_WHATSAPP_NUMBER
  }, [agente])

  const emailContacto = useMemo(() => {
    const e = (agente?.Email || "").trim()
    return e || DEFAULT_EMAIL
  }, [agente])

  const whatsappHref = useMemo(() => {
    if (!propiedad) return "#"
    const msg = buildWhatsAppMessage(propiedad)
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`
  }, [propiedad, whatsappNumber])

  const whatsappHrefConNombre = useMemo(() => {
    if (!propiedad) return "#"
    const n = (lead.Nombre || "").trim()
    const tel = (lead.Telefono || "").trim()
    const em = (lead.Email || "").trim()
    const msj = (lead.Mensaje || "").trim()

    const extra = [
      n ? `Nombre: ${n}` : null,
      tel ? `Tel: ${tel}` : null,
      em ? `Email: ${em}` : null,
      msj ? `Mensaje: ${msj}` : null,
    ]

    const msg = buildWhatsAppMessage(propiedad, extra)
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`
  }, [propiedad, lead, whatsappNumber])

  const mailtoHref = useMemo(() => {
    if (!propiedad) return `mailto:${emailContacto}`
    const subject = `Consulta propiedad ${propiedad.CodigoPublico || propiedad.PropiedadId || ""}`.trim()
    const body = buildWhatsAppMessage(propiedad, [
      (lead.Nombre || "").trim() ? `Nombre: ${(lead.Nombre || "").trim()}` : null,
      (lead.Telefono || "").trim() ? `Tel: ${(lead.Telefono || "").trim()}` : null,
      (lead.Email || "").trim() ? `Email: ${(lead.Email || "").trim()}` : null,
      (lead.Mensaje || "").trim() ? `Mensaje: ${(lead.Mensaje || "").trim()}` : null,
    ])
    return `mailto:${emailContacto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }, [propiedad, emailContacto, lead])

  function onLeadChange(e) {
    const { name, value } = e.target
    setLead((prev) => ({ ...prev, [name]: value }))
  }

  async function enviarLead(e) {
    e.preventDefault()
    if (!propiedad) return

    const nombre = (lead.Nombre || "").trim()
    const tel = (lead.Telefono || "").trim()
    const email = (lead.Email || "").trim()

    if (!nombre) {
      setLeadMsg("Por favor ingresá tu nombre.")
      setLeadOk(false)
      return
    }
    if (!tel && !email) {
      setLeadMsg("Ingresá teléfono o email para contactarte.")
      setLeadOk(false)
      return
    }

    try {
      setEnviando(true)
      setLeadMsg("")
      setLeadOk(false)

      const res = await fetch(`${API_URL}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PropiedadId: propiedad.PropiedadId,
          Nombre: nombre,
          Telefono: tel || null,
          Email: email || null,
          Mensaje: (lead.Mensaje || "").trim() || null,
          Canal: "web", // ✅ antes estaba "Fuente"
          _hp: lead._hp || "",
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLeadOk(false)
        setLeadMsg(data?.error || "No se pudo enviar tu consulta.")
        return
      }

      setLeadOk(true)
      setLeadMsg("¡Listo! Recibimos tu consulta. En breve te contactamos.")
      setLead((p) => ({ ...p, Mensaje: "" }))
    } catch (err) {
      setLeadOk(false)
      setLeadMsg(err?.message ? `Error: ${err.message}` : "Error enviando consulta.")
    } finally {
      setEnviando(false)
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: 20 }}>
        <p>Cargando detalle...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container" style={{ padding: 20 }}>
        <Link to="/propiedades" style={{ textDecoration: "none", fontWeight: 900 }}>
          {t("common.back")}
        </Link>
        <p style={{ marginTop: 14, color: "#991b1b", fontWeight: 900 }}>{error}</p>
      </div>
    )
  }

  if (!propiedad) {
    return (
      <div className="container" style={{ padding: 20 }}>
        <Link to="/propiedades" style={{ textDecoration: "none", fontWeight: 900 }}>
          {t("common.back")}
        </Link>
        <p style={{ marginTop: 14 }}>No se encontró la propiedad.</p>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <Link to="/propiedades" style={{ textDecoration: "none", fontWeight: 900 }}>
        {t("common.back")}
      </Link>

      <h1 style={{ marginTop: 12 }}>{propiedad.Titulo}</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        {propiedad.Provincia}
        {propiedad.DireccionDetallada ? ` • ${propiedad.DireccionDetallada}` : ""}
      </p>

      <div style={{ marginTop: 14, borderRadius: 16, overflow: "hidden" }}>
        <img
          src={fotoActiva}
          alt={propiedad.Titulo}
          style={{ width: "100%", maxHeight: 520, objectFit: "cover", display: "block" }}
        />
      </div>

      {Array.isArray(propiedad.Fotos) && propiedad.Fotos.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          {propiedad.Fotos.map((f, idx) => (
            <img
              key={`${f.Url}-${idx}`}
              src={f.Url}
              alt=""
              onClick={() => setFotoActiva(f.Url)}
              style={{
                width: 90,
                height: 70,
                objectFit: "cover",
                borderRadius: 10,
                cursor: "pointer",
                border: f.Url === fotoActiva ? "2px solid #0f172a" : "1px solid #e5e7eb",
              }}
            />
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: 16, marginTop: 18 }}>
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>{t("detail.description")}</h3>
          <p style={{ whiteSpace: "pre-line" }}>{propiedad.Descripcion || "Sin descripción."}</p>

          <h3 style={{ marginTop: 16 }}>{t("detail.details")}</h3>
          <ul style={{ paddingLeft: 18, lineHeight: 1.7 }}>
            {propiedad.Tipo && (
              <li>
                <strong>Tipo:</strong> {propiedad.Tipo}
              </li>
            )}
            {propiedad.Condicion && (
              <li>
                <strong>Condición:</strong> {propiedad.Condicion}
              </li>
            )}
            {propiedad.MetrosTerreno != null && (
              <li>
                <strong>Terreno:</strong> {propiedad.MetrosTerreno} m²
              </li>
            )}
            {propiedad.MetrosConstruccion != null && (
              <li>
                <strong>Construcción:</strong> {propiedad.MetrosConstruccion} m²
              </li>
            )}
            {propiedad.Habitaciones != null && (
              <li>
                <strong>Habitaciones:</strong> {propiedad.Habitaciones}
              </li>
            )}
            {propiedad.Banos != null && (
              <li>
                <strong>Baños:</strong> {propiedad.Banos}
              </li>
            )}
            {propiedad.Parqueos != null && (
              <li>
                <strong>Parqueos:</strong> {propiedad.Parqueos}
              </li>
            )}
          </ul>
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Precio</h3>
          <p style={{ fontSize: 24, fontWeight: 900, margin: "8px 0 0" }}>
            {formatMoney(propiedad.Precio, propiedad.Moneda, intlLocale)}
          </p>

          {/* Contacto dinámico */}
          {(agenteNombre || agente?.Telefono || agente?.WhatsApp || agente?.Email) && (
            <div style={{ marginTop: 10, opacity: 0.9, fontSize: 14, lineHeight: 1.4 }}>
              {agenteNombre && (
                <div>
                  <strong>Agente:</strong> {agenteNombre}
                </div>
              )}
              {(agente?.WhatsApp || agente?.Telefono) && (
                <div>
                  <strong>Tel:</strong> {agente?.WhatsApp || agente?.Telefono}
                </div>
              )}
              {agente?.Email && (
                <div>
                  <strong>Email:</strong> {agente.Email}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a href={whatsappHref} target="_blank" rel="noreferrer" style={btnPrimary}>
              WhatsApp
            </a>
            <a href={mailtoHref} style={btn}>
              Email
            </a>
          </div>

          <p style={{ marginTop: 14, opacity: 0.8 }}>
            ID: {propiedad.PropiedadId}
            {propiedad.CodigoPublico ? ` • Código: ${propiedad.CodigoPublico}` : ""}
          </p>
        </div>
      </div>

      {/* FORM LEAD */}
      <section style={{ ...card, marginTop: 18 }}>
        <h2 style={{ marginTop: 0 }}>Estoy interesado</h2>
        <p style={{ marginTop: 6, opacity: 0.8 }}>
          Dejanos tus datos y te contactamos. (Teléfono o email es requerido)
        </p>

        {leadMsg && (
          <p style={{ marginTop: 10, fontWeight: 900, color: leadOk ? "#065f46" : "#991b1b" }}>
            {leadMsg}
          </p>
        )}

        <form onSubmit={enviarLead} style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {/* honeypot oculto */}
          <input
            name="_hp"
            value={lead._hp}
            onChange={onLeadChange}
            style={{ display: "none" }}
            tabIndex={-1}
            autoComplete="off"
          />

          <input
            name="Nombre"
            value={lead.Nombre}
            onChange={onLeadChange}
            placeholder="Nombre completo"
            style={input}
            required
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input
              name="Telefono"
              value={lead.Telefono}
              onChange={onLeadChange}
              placeholder="Teléfono"
              style={input}
            />
            <input
              name="Email"
              value={lead.Email}
              onChange={onLeadChange}
              placeholder="Email"
              style={input}
            />
          </div>

          <textarea
            name="Mensaje"
            value={lead.Mensaje}
            onChange={onLeadChange}
            placeholder="Mensaje (opcional). Ej: Quiero coordinar una visita."
            rows={4}
            style={textarea}
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button type="submit" disabled={enviando} style={btnPrimary}>
              {enviando ? "Enviando..." : "Enviar consulta"}
            </button>

            <a href={whatsappHrefConNombre} target="_blank" rel="noreferrer" style={btn}>
              Enviar por WhatsApp con mis datos
            </a>
          </div>
        </form>
      </section>
    </div>
  )
}

const card = {
  background: "#fff",
  borderRadius: 16,
  padding: 14,
  boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
}

const input = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  width: "100%",
}

const textarea = {
  ...input,
  resize: "vertical",
}

const btn = {
  textDecoration: "none",
  fontWeight: 900,
  borderRadius: 12,
  padding: "10px 12px",
  border: "1px solid #0f172a",
  color: "#0f172a",
}

const btnPrimary = {
  ...btn,
  background: "#0f172a",
  color: "#fff",
}
