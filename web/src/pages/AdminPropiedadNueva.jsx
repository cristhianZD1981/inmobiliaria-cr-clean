import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export default function AdminPropiedadNueva() {
  const navigate = useNavigate()

  const [provincias, setProvincias] = useState([])
  const [imagenes, setImagenes] = useState([])

  const [loading, setLoading] = useState(false)
  const [loadingProv, setLoadingProv] = useState(false)

  const [error, setError] = useState("")
  const [info, setInfo] = useState("")

  const [form, setForm] = useState({
    Titulo: "",
    Descripcion: "",
    Tipo: "Casa",
    Condicion: "Nueva",
    Precio: "",
    Moneda: "CRC",
    ProvinciaId: "",
    Habitaciones: "",
    Banos: "",
    Parqueos: "",
    MetrosTerreno: "",
    MetrosConstruccion: "",
    DireccionDetallada: "",
    TieneCondominio: false,
    CuotaCondominio: "",
    EstadoPublicacion: "Publicado",
    Visible: true,
    Destacada: false,
  })

  useEffect(() => {
    const tk = localStorage.getItem("token")
    if (!tk) {
      navigate("/admin/login")
      return
    }
    cargarProvincias(tk)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  async function cargarProvincias(tk) {
    try {
      setLoadingProv(true)
      setError("")

      const res = await fetch(`${API_URL}/api/admin/provincias`, {
        headers: { Authorization: `Bearer ${tk}` },
      })

      const data = await res.json().catch(() => ([]))
      if (!res.ok) {
        setError(data?.error || `Error ${res.status}`)
        return
      }

      setProvincias(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.message ? `No se pudo cargar provincias: ${e.message}` : "Error cargando provincias")
    } finally {
      setLoadingProv(false)
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  function handleImages(e) {
    const files = Array.from(e.target.files || [])
    setImagenes(files)
  }

  const payload = useMemo(() => {
    const toNumOrNull = (v) => (v === "" || v == null ? null : Number(v))

    return {
      Titulo: form.Titulo?.trim(),
      Descripcion: form.Descripcion?.trim() || null,
      Tipo: form.Tipo,
      Condicion: form.Condicion || null,
      Precio: Number(form.Precio || 0),
      Moneda: form.Moneda,
      ProvinciaId: Number(form.ProvinciaId),
      Habitaciones: toNumOrNull(form.Habitaciones),
      Banos: toNumOrNull(form.Banos),
      Parqueos: toNumOrNull(form.Parqueos),
      MetrosTerreno: toNumOrNull(form.MetrosTerreno),
      MetrosConstruccion: toNumOrNull(form.MetrosConstruccion),
      DireccionDetallada: form.DireccionDetallada?.trim() || null,
      TieneCondominio: !!form.TieneCondominio,
      CuotaCondominio: form.TieneCondominio ? toNumOrNull(form.CuotaCondominio) : null,
      EstadoPublicacion: form.EstadoPublicacion,
      Visible: !!form.Visible,
      Destacada: !!form.Destacada,
    }
  }, [form])

  async function onSubmit(e) {
    e.preventDefault()

    const tk = localStorage.getItem("token")
    if (!tk) {
      navigate("/admin/login")
      return
    }

    setLoading(true)
    setError("")
    setInfo("")

    try {
      // 1) Crear propiedad
      const resProp = await fetch(`${API_URL}/api/admin/propiedades`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tk}`,
        },
        body: JSON.stringify(payload),
      })

      const dataProp = await resProp.json().catch(() => ({}))

      if (!resProp.ok) {
        setError(dataProp?.error || "Error creando propiedad")
        setLoading(false)
        return
      }

      const propiedadId = dataProp?.PropiedadId
      if (!propiedadId) {
        setError("La API no devolvió PropiedadId")
        setLoading(false)
        return
      }

      // 2) Subir imágenes (si hay)
      if (imagenes.length > 0) {
        const fd = new FormData()
        // ✅ CAMBIO CLAVE: el backend espera "fotos"
        for (const img of imagenes) fd.append("fotos", img)

        const resImg = await fetch(`${API_URL}/api/admin/propiedades/${propiedadId}/fotos`, {
          method: "POST",
          headers: { Authorization: `Bearer ${tk}` },
          body: fd,
        })

        const ct = resImg.headers.get("content-type") || ""
        const dataImg = ct.includes("application/json")
          ? await resImg.json().catch(() => ({}))
          : { error: await resImg.text().catch(() => "") }

        if (!resImg.ok) {
          setError(dataImg?.error || "Error subiendo imágenes")
          setLoading(false)
          return
        }
      }

      setInfo("Propiedad creada correctamente")
      navigate("/admin/propiedades")
    } catch (err) {
      setError(err?.message ? `Error: ${err.message}` : "Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={styles.main}>
      <h1>Nueva Propiedad</h1>

      {error && <p style={styles.error}>{error}</p>}
      {info && <p style={styles.info}>{info}</p>}

      <form onSubmit={onSubmit} style={styles.form}>
        <input
          name="Titulo"
          placeholder="Título"
          value={form.Titulo}
          onChange={handleChange}
          required
        />

        <textarea
          name="Descripcion"
          placeholder="Descripción"
          value={form.Descripcion}
          onChange={handleChange}
          rows={3}
        />

        <select name="Tipo" value={form.Tipo} onChange={handleChange}>
          <option value="Casa">Casa</option>
          <option value="Apartamento">Apartamento</option>
          <option value="Terreno">Terreno</option>
          <option value="Local">Local</option>
        </select>

        <input
          name="Condicion"
          placeholder="Condición (Nueva / Usada...)"
          value={form.Condicion}
          onChange={handleChange}
        />

        <input
          name="Precio"
          type="number"
          placeholder="Precio"
          value={form.Precio}
          onChange={handleChange}
          required
        />

        <select name="Moneda" value={form.Moneda} onChange={handleChange}>
          <option value="CRC">Colones (CRC)</option>
          <option value="USD">Dólares (USD)</option>
        </select>

        <select
          name="ProvinciaId"
          value={form.ProvinciaId}
          onChange={handleChange}
          required
          disabled={loadingProv}
        >
          <option value="">Seleccione provincia</option>
          {provincias.map((p) => (
            <option key={p.ProvinciaId} value={p.ProvinciaId}>
              {p.Nombre}
            </option>
          ))}
        </select>

        <input
          name="Habitaciones"
          type="number"
          placeholder="Habitaciones"
          value={form.Habitaciones}
          onChange={handleChange}
        />

        <input
          name="Banos"
          type="number"
          placeholder="Baños"
          value={form.Banos}
          onChange={handleChange}
        />

        <input
          name="Parqueos"
          type="number"
          placeholder="Parqueos"
          value={form.Parqueos}
          onChange={handleChange}
        />

        <input
          name="MetrosTerreno"
          type="number"
          placeholder="Metros de terreno"
          value={form.MetrosTerreno}
          onChange={handleChange}
        />

        <input
          name="MetrosConstruccion"
          type="number"
          placeholder="Metros de construcción"
          value={form.MetrosConstruccion}
          onChange={handleChange}
        />

        <textarea
          name="DireccionDetallada"
          placeholder="Dirección detallada"
          value={form.DireccionDetallada}
          onChange={handleChange}
          rows={2}
        />

        <label style={styles.row}>
          <input
            name="TieneCondominio"
            type="checkbox"
            checked={form.TieneCondominio}
            onChange={handleChange}
          />
          Tiene condominio
        </label>

        {form.TieneCondominio && (
          <input
            name="CuotaCondominio"
            type="number"
            placeholder="Cuota de condominio"
            value={form.CuotaCondominio}
            onChange={handleChange}
          />
        )}

        <select name="EstadoPublicacion" value={form.EstadoPublicacion} onChange={handleChange}>
          <option value="Borrador">Borrador</option>
          <option value="Publicado">Publicado</option>
        </select>

        <label style={styles.row}>
          <input name="Visible" type="checkbox" checked={form.Visible} onChange={handleChange} />
          Visible
        </label>

        <label style={styles.row}>
          <input
            name="Destacada"
            type="checkbox"
            checked={form.Destacada}
            onChange={handleChange}
          />
          Destacada
        </label>

        <div style={styles.box}>
          <h3 style={{ marginTop: 0 }}>Imágenes</h3>
          <input type="file" multiple accept="image/*" onChange={handleImages} />
          <p style={{ margin: "8px 0 0", opacity: 0.8 }}>
            {imagenes.length} imagen(es) seleccionada(s)
          </p>
        </div>

        <button type="submit" disabled={loading} style={styles.btn}>
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </main>
  )
}

const styles = {
  main: { padding: 28, maxWidth: 780, margin: "0 auto" },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  row: { display: "flex", gap: 8, alignItems: "center" },
  box: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
  },
  btn: {
    marginTop: 10,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  error: { color: "#991b1b", fontWeight: 800 },
  info: { color: "#065f46", fontWeight: 800 },
}
