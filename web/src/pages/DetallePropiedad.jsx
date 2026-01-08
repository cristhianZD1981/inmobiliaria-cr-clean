import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"

function DetallePropiedad() {
  const { id } = useParams()
  const [propiedad, setPropiedad] = useState(null)
  const [fotoIndex, setFotoIndex] = useState(0)

  const WHATSAPP_NUMERO = "50688888888"

  useEffect(() => {
    fetch(`http://localhost:3001/api/propiedades/${id}`)
      .then(res => res.json())
      .then(data => {
        setPropiedad(data)
        setFotoIndex(0)

        // 🔍 SEO dinámico
        if (data?.Titulo) {
          document.title = `${data.Titulo} | ₡${data.Precio?.toLocaleString()} | Inmobiliaria CR`

          let metaDesc = document.querySelector("meta[name='description']")
          if (!metaDesc) {
            metaDesc = document.createElement("meta")
            metaDesc.name = "description"
            document.head.appendChild(metaDesc)
          }

          metaDesc.content = `Propiedad en ${data.Provincia}. ${data.Titulo}. Precio ₡${data.Precio?.toLocaleString()}. Consultá por WhatsApp.`
        }
      })
      .catch(err => console.error(err))
  }, [id])

  if (!propiedad) {
    return <p style={{ padding: 20 }}>Cargando propiedad...</p>
  }

  const fotos = propiedad.fotos && propiedad.fotos.length > 0
    ? propiedad.fotos
    : [
        {
          Url: "https://picsum.photos/800/500?random=99",
          EsPrincipal: true
        }
      ]

  const fotoActual = fotos[fotoIndex]

  const siguiente = () => {
    setFotoIndex((fotoIndex + 1) % fotos.length)
  }

  const anterior = () => {
    setFotoIndex((fotoIndex - 1 + fotos.length) % fotos.length)
  }

  const mensajeWhatsApp = encodeURIComponent(
    `Hola, me interesa esta propiedad:\n\n${propiedad.Titulo}\nPrecio: ₡${propiedad.Precio?.toLocaleString()}`
  )

  const urlWhatsApp = `https://wa.me/${WHATSAPP_NUMERO}?text=${mensajeWhatsApp}`

  return (
    <div style={{ maxWidth: 1000, margin: "auto", padding: 20 }}>
      {/* Carrusel */}
      <div style={{ position: "relative" }}>
        <img
          src={fotoActual.Url}
          alt={propiedad.Titulo}
          style={{
            width: "100%",
            height: 450,
            objectFit: "cover",
            borderRadius: 10
          }}
        />

        {fotos.length > 1 && (
          <>
            <button onClick={anterior} style={btnLeft}>‹</button>
            <button onClick={siguiente} style={btnRight}>›</button>
          </>
        )}
      </div>

      {/* Miniaturas */}
      <div style={thumbsContainer}>
        {fotos.map((foto, index) => (
          <img
            key={index}
            src={foto.Url}
            alt={`Foto ${index + 1} de ${propiedad.Titulo}`}
            onClick={() => setFotoIndex(index)}
            style={{
              ...thumb,
              border: index === fotoIndex ? "3px solid #0a58ca" : "2px solid #ddd"
            }}
          />
        ))}
      </div>

      {/* Info principal */}
      <h1 style={{ marginTop: 20 }}>{propiedad.Titulo}</h1>
      <p><b>Provincia:</b> {propiedad.Provincia}</p>
      <p style={{ fontSize: 22, fontWeight: "bold" }}>
        ₡{propiedad.Precio?.toLocaleString()}
      </p>

      {/* WhatsApp */}
      <a
        href={urlWhatsApp}
        target="_blank"
        rel="noopener noreferrer"
        style={btnWhatsApp}
      >
        📲 Consultar por WhatsApp
      </a>

      {/* Ficha técnica */}
      <div style={fichaTecnica}>
        <h2>Ficha técnica</h2>
        <ul style={lista}>
          <li>🛏 Habitaciones: {propiedad.Habitaciones ?? "N/D"}</li>
          <li>🚿 Baños: {propiedad.Banos ?? "N/D"}</li>
          <li>🚗 Parqueos: {propiedad.Parqueos ?? "N/D"}</li>
          <li>📐 Terreno: {propiedad.MetrosTerreno ?? "N/D"} m²</li>
          <li>🏗 Construcción: {propiedad.MetrosConstruccion ?? "N/D"} m²</li>
        </ul>
      </div>

      {/* Descripción */}
      <div style={{ marginTop: 20 }}>
        <h2>Descripción</h2>
        <p>{propiedad.Descripcion}</p>
      </div>

      <Link to="/" style={{ display: "inline-block", marginTop: 30 }}>
        ← Volver
      </Link>
    </div>
  )
}

/* ===== estilos ===== */

const btnBase = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  background: "rgba(0,0,0,0.6)",
  color: "#fff",
  border: "none",
  fontSize: 30,
  padding: "5px 15px",
  cursor: "pointer",
  borderRadius: 5
}

const btnLeft = { ...btnBase, left: 10 }
const btnRight = { ...btnBase, right: 10 }

const thumbsContainer = {
  display: "flex",
  gap: 10,
  marginTop: 15,
  overflowX: "auto"
}

const thumb = {
  width: 100,
  height: 70,
  objectFit: "cover",
  cursor: "pointer",
  borderRadius: 5
}

const btnWhatsApp = {
  display: "inline-block",
  marginTop: 15,
  background: "#25D366",
  color: "#fff",
  padding: "12px 20px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: "bold"
}

const fichaTecnica = {
  marginTop: 25,
  padding: 20,
  background: "#f8f9fa",
  borderRadius: 10
}

const lista = {
  listStyle: "none",
  padding: 0,
  lineHeight: "1.8em"
}

export default DetallePropiedad
