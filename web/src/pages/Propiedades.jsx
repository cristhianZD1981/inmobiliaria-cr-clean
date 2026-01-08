import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

const Propiedades = () => {
  const [propiedades, setPropiedades] = useState([])
  const [filtradas, setFiltradas] = useState([])

  const [provincia, setProvincia] = useState("")
  const [precioMax, setPrecioMax] = useState("")

  const [error, setError] = useState(false)

  useEffect(() => {
    fetch("http://localhost:3001/api/propiedades")
      .then(res => res.json())
      .then(data => {
        setPropiedades(data)
        setFiltradas(data)
      })
      .catch(() => setError(true))
  }, [])

  // aplicar filtros
  useEffect(() => {
    let resultado = [...propiedades]

    if (provincia) {
      resultado = resultado.filter(
        p => p.Provincia === provincia
      )
    }

    if (precioMax) {
      resultado = resultado.filter(
        p => p.Precio <= Number(precioMax)
      )
    }

    setFiltradas(resultado)
  }, [provincia, precioMax, propiedades])

  if (error) {
    return <h2>Error al cargar propiedades</h2>
  }

  // provincias únicas para el select
  const provincias = [
    ...new Set(propiedades.map(p => p.Provincia))
  ]

  return (
    <div style={{ padding: "20px" }}>
      <h1>Propiedades disponibles</h1>

      {/* FILTROS */}
      <div
        style={{
          display: "flex",
          gap: "15px",
          margin: "20px 0",
          flexWrap: "wrap"
        }}
      >
        <select
          value={provincia}
          onChange={e => setProvincia(e.target.value)}
        >
          <option value="">Todas las provincias</option>
          {provincias.map((prov, index) => (
            <option key={index} value={prov}>
              {prov}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Precio máximo ₡"
          value={precioMax}
          onChange={e => setPrecioMax(e.target.value)}
        />

        <button
          onClick={() => {
            setProvincia("")
            setPrecioMax("")
          }}
        >
          Limpiar filtros
        </button>
      </div>

      {/* RESULTADOS */}
      {filtradas.length === 0 && (
        <p>No hay propiedades que coincidan con los filtros</p>
      )}

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {filtradas.map(propiedad => (
          <div
            key={propiedad.PropiedadId}
            style={{
              width: "260px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              padding: "10px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
            }}
          >
            <img
              src={
                propiedad.fotos?.[0]?.Url ||
                "https://picsum.photos/400/300?random=10"
              }
              alt={propiedad.Titulo}
              style={{
                width: "100%",
                height: "160px",
                objectFit: "cover",
                borderRadius: "6px"
              }}
            />

            <h3>{propiedad.Titulo}</h3>
            <p>
              <b>₡ {propiedad.Precio.toLocaleString()}</b>
            </p>
            <p>{propiedad.Provincia}</p>

            <Link to={`/propiedad/${propiedad.PropiedadId}`}>
              <button style={{ marginTop: "10px" }}>
                Ver detalles
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Propiedades
