import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"

export default function AdminPropiedadEditar() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")

  const [provincias, setProvincias] = useState([])
  const [imagenes, setImagenes] = useState([])

  const [form, setForm] = useState({
    PropiedadId: "",
    Titulo: "",
    Descripcion: "",
    Tipo: "Casa",
    Condicion: "Nueva",
    Precio: "",
    Moneda: "CRC",
    ProvinciaId: "",
    DireccionDetallada: "",
    MetrosTerreno: "",
    MetrosConstruccion: "",
    Habitaciones: "",
    Banos: "",
    Parqueos: "",
    TieneCondominio: false,
    CuotaCondominio: "",
    EstadoPublicacion: "Borrador",
    Visible: true,
    Destacada: false,
  })

  const [fotos, setFotos] = useState([])
  const dragFotoId = useRef(null)
  const [ordenDirty, setOrdenDirty] = useState(false)

  useEffect(() => {
    const tk = localStorage.getItem("token")
    if (!tk) {
      navigate("/admin/login")
      return
    }
    cargar(tk)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate])

  async function cargar(tk) {
    try {
      setLoading(true)
      setError("")
      setInfo("")
      setOrdenDirty(false)

      const [provRes, propRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/provincias`, {
          headers: { Authorization: `Bearer ${tk}` },
        }),
        fetch(`${API_URL}/api/admin/propiedades/${id}`, {
          headers: { Authorization: `Bearer ${tk}` },
        }),
      ])

      const provData = await provRes.json().catch(() => ([]))
      if (!provRes.ok) throw new Error(provData?.error || `Error provincias ${provRes.status}`)
      setProvincias(Array.isArray(provData) ? provData : [])

      const propData = await propRes.json().catch(() => ({}))
      if (!propRes.ok) throw new Error(propData?.error || `Error propiedad ${propRes.status}`)

      setForm({
        PropiedadId: propData.PropiedadId,
        Titulo: propData.Titulo || "",
        Descripcion: propData.Descripcion || "",
        Tipo: propData.Tipo || "Casa",
        Condicion: propData.Condicion || "",
        Precio: propData.Precio ?? "",
        Moneda: propData.Moneda || "CRC",
        ProvinciaId: propData.ProvinciaId ?? "",
        DireccionDetallada: propData.DireccionDetallada || "",
        MetrosTerreno: propData.MetrosTerreno ?? "",
        MetrosConstruccion: propData.MetrosConstruccion ?? "",
        Habitaciones: propData.Habitaciones ?? "",
        Banos: propData.Banos ?? "",
        Parqueos: propData.Parqueos ?? "",
        TieneCondominio: !!propData.TieneCondominio,
        CuotaCondominio: propData.CuotaCondominio ?? "",
        EstadoPublicacion: propData.EstadoPublicacion || "Borrador",
        Visible: !!propData.Visible,
        Destacada: !!propData.Destacada,
      })

      const fotosApi = Array.isArray(propData.Fotos) ? propData.Fotos : []
      setFotos(normalizarOrdenLocal(fotosApi))
    } catch (e) {
      setError(e?.message || "Error cargando datos")
    } finally {
      setLoading(false)
    }
  }

  function normalizarOrdenLocal(arr) {
    // Render por EsPrincipal desc, Orden asc
    const sorted = [...arr].sort((a, b) => {
      const ap = a.EsPrincipal ? 1 : 0
      const bp = b.EsPrincipal ? 1 : 0
      if (bp !== ap) return bp - ap
      return Number(a.Orden || 0) - Number(b.Orden || 0)
    })

    // Reasignamos un orden "visual" consecutivo (sin tocar BD todavía)
    return sorted.map((f, idx) => ({
      ...f,
      Orden: idx + 1,
      _ordenUI: idx + 1,
    }))
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
      Condicion: form.Condicion?.trim() || null,
      Precio: Number(form.Precio || 0),
      Moneda: form.Moneda,
      ProvinciaId: Number(form.ProvinciaId),
      DireccionDetallada: form.DireccionDetallada?.trim() || null,
      MetrosTerreno: toNumOrNull(form.MetrosTerreno),
      MetrosConstruccion: toNumOrNull(form.MetrosConstruccion),
      Habitaciones: toNumOrNull(form.Habitaciones),
      Banos: toNumOrNull(form.Banos),
      Parqueos: toNumOrNull(form.Parqueos),
      TieneCondominio: !!form.TieneCondominio,
      CuotaCondominio: form.TieneCondominio ? toNumOrNull(form.CuotaCondominio) : null,
      EstadoPublicacion: form.EstadoPublicacion,
      Visible: !!form.Visible,
      Destacada: !!form.Destacada,
    }
  }, [form])

  async function guardarCambios(e) {
    e.preventDefault()
    const tk = localStorage.getItem("token")
    if (!tk) return navigate("/admin/login")

    try {
      setSaving(true)
      setError("")
      setInfo("")

      const res = await fetch(`${API_URL}/api/admin/propiedades/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tk}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Error guardando")
        return
      }

      setInfo("Cambios guardados")
    } catch (e2) {
      setError(e2?.message || "Error guardando")
    } finally {
      setSaving(false)
    }
  }

  async function refrescarFotos(tk) {
    const res = await fetch(`${API_URL}/api/admin/propiedades/${id}/fotos`, {
      headers: { Authorization: `Bearer ${tk}` },
    })
    const data = await res.json().catch(() => ([]))
    if (res.ok) {
      setFotos(normalizarOrdenLocal(Array.isArray(data) ? data : []))
      setOrdenDirty(false)
    }
  }

  async function subirFotos() {
    const tk = localStorage.getItem("token")
    if (!tk) return navigate("/admin/login")

    if (!imagenes.length) {
      setError("Seleccioná al menos una imagen para subir")
      return
    }

    try {
      setSaving(true)
      setError("")
      setInfo("")

      const fd = new FormData()
      for (const img of imagenes) fd.append("fotos", img)

      const res = await fetch(`${API_URL}/api/admin/propiedades/${id}/fotos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tk}` },
        body: fd,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Error subiendo imágenes")
        return
      }

      setInfo("Imágenes subidas")
      setImagenes([])
      await refrescarFotos(tk)
    } catch (e) {
      setError(e?.message || "Error subiendo imágenes")
    } finally {
      setSaving(false)
    }
  }

  async function eliminarFoto(fotoId) {
    const ok = window.confirm("¿Eliminar esta foto?")
    if (!ok) return

    const tk = localStorage.getItem("token")
    if (!tk) return navigate("/admin/login")

    try {
      setSaving(true)
      setError("")
      setInfo("")

      const res = await fetch(`${API_URL}/api/admin/propiedades/${id}/fotos/${fotoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tk}` },
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Error eliminando foto")
        return
      }

      setInfo("Foto eliminada")
      await refrescarFotos(tk)
    } catch (e) {
      setError(e?.message || "Error eliminando foto")
    } finally {
      setSaving(false)
    }
  }

  async function marcarPrincipal(fotoId) {
    const tk = localStorage.getItem("token")
    if (!tk) return navigate("/admin/login")

    try {
      setSaving(true)
      setError("")
      setInfo("")

      const res = await fetch(
        `${API_URL}/api/admin/propiedades/${id}/fotos/${fotoId}/principal`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${tk}` },
        }
      )

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Error marcando principal")
        return
      }

      setInfo("Principal actualizada")
      await refrescarFotos(tk)
    } catch (e) {
      setError(e?.message || "Error marcando principal")
    } finally {
      setSaving(false)
    }
  }

  // ===============================
  // Drag & Drop orden
  // ===============================
  function onDragStart(fotoId) {
    dragFotoId.current = fotoId
  }

  function onDragOver(e) {
    e.preventDefault()
  }

  function onDrop(targetFotoId) {
    const fromId = dragFotoId.current
    dragFotoId.current = null
    if (!fromId || fromId === targetFotoId) return

    setFotos((prev) => {
      const arr = [...prev]
      const fromIndex = arr.findIndex((x) => x.FotoId === fromId)
      const toIndex = arr.findIndex((x) => x.FotoId === targetFotoId)
      if (fromIndex < 0 || toIndex < 0) return prev

      const [moved] = arr.splice(fromIndex, 1)
      arr.splice(toIndex, 0, moved)

      const normalized = arr.map((f, idx) => ({
        ...f,
        _ordenUI: idx + 1,
        Orden: idx + 1,
      }))

      return normalized
    })

    setOrdenDirty(true)
    setInfo("")
    setError("")
  }

  async function guardarOrden() {
    const tk = localStorage.getItem("token")
    if (!tk) return navigate("/admin/login")
    if (!ordenDirty) return

    try {
      setSaving(true)
      setError("")
      setInfo("")

      const body = {
        orden: fotos.map((f, idx) => ({ FotoId: f.FotoId, Orden: idx + 1 })),
      }

      const res = await fetch(`${API_URL}/api/admin/propiedades/${id}/fotos/orden`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tk}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Error guardando orden")
        return
      }

      setInfo("Orden guardado")
      setOrdenDirty(false)
      await refrescarFotos(tk)
    } catch (e) {
      setError(e?.message || "Error guardando orden")
    } finally {
      setSaving(false)
    }
  }

  // ===============================
  // AltText
  // ===============================
  function setAltLocal(fotoId, alt) {
    setFotos((prev) =>
      prev.map((f) => (f.FotoId === fotoId ? { ...f, AltText: alt } : f))
    )
  }

  async function guardarAltText(fotoId) {
    const tk = localStorage.getItem("token")
    if (!tk) return navigate("/admin/login")

    const f = fotos.find((x) => x.FotoId === fotoId)
    const alt = f?.AltText ?? ""

    try {
      setSaving(true)
      setError("")
      setInfo("")

      const res = await fetch(`${API_URL}/api/admin/propiedades/${id}/fotos/${fotoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tk}`,
        },
        body: JSON.stringify({ AltText: alt }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Error guardando AltText")
        return
      }

      setInfo("AltText guardado")
    } catch (e) {
      setError(e?.message || "Error guardando AltText")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main style={{ padding: 28, maxWidth: 900, margin: "0 auto" }}>
        <p>Cargando...</p>
      </main>
    )
  }

  return (
    <main style={styles.main}>
      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>Editar Propiedad #{form.PropiedadId}</h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/admin/propiedades")} style={styles.btnLight}>
            ← Volver
          </button>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {info && <p style={styles.info}>{info}</p>}

      <form onSubmit={guardarCambios} style={styles.form}>
        <input name="Titulo" value={form.Titulo} onChange={handleChange} placeholder="Título" required />
        <textarea
          name="Descripcion"
          value={form.Descripcion}
          onChange={handleChange}
          placeholder="Descripción"
          rows={4}
        />

        <div style={styles.grid2}>
          <select name="Tipo" value={form.Tipo} onChange={handleChange}>
            <option value="Casa">Casa</option>
            <option value="Apartamento">Apartamento</option>
            <option value="Terreno">Terreno</option>
            <option value="Local">Local</option>
          </select>

          <input
            name="Condicion"
            value={form.Condicion}
            onChange={handleChange}
            placeholder="Condición (Nueva/Usada...)"
          />
        </div>

        <div style={styles.grid2}>
          <input
            name="Precio"
            type="number"
            value={form.Precio}
            onChange={handleChange}
            placeholder="Precio"
            required
          />
          <select name="Moneda" value={form.Moneda} onChange={handleChange}>
            <option value="CRC">CRC</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <select name="ProvinciaId" value={form.ProvinciaId} onChange={handleChange} required>
          <option value="">Seleccione provincia</option>
          {provincias.map((p) => (
            <option key={p.ProvinciaId} value={p.ProvinciaId}>
              {p.Nombre}
            </option>
          ))}
        </select>

        <textarea
          name="DireccionDetallada"
          value={form.DireccionDetallada}
          onChange={handleChange}
          placeholder="Dirección detallada"
          rows={2}
        />

        <div style={styles.grid3}>
          <input
            name="Habitaciones"
            type="number"
            value={form.Habitaciones}
            onChange={handleChange}
            placeholder="Habitaciones"
          />
          <input name="Banos" type="number" value={form.Banos} onChange={handleChange} placeholder="Baños" />
          <input
            name="Parqueos"
            type="number"
            value={form.Parqueos}
            onChange={handleChange}
            placeholder="Parqueos"
          />
        </div>

        <div style={styles.grid2}>
          <input
            name="MetrosTerreno"
            type="number"
            value={form.MetrosTerreno}
            onChange={handleChange}
            placeholder="Metros terreno"
          />
          <input
            name="MetrosConstruccion"
            type="number"
            value={form.MetrosConstruccion}
            onChange={handleChange}
            placeholder="Metros construcción"
          />
        </div>

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
            value={form.CuotaCondominio}
            onChange={handleChange}
            placeholder="Cuota condominio"
          />
        )}

        <div style={styles.grid2}>
          <select name="EstadoPublicacion" value={form.EstadoPublicacion} onChange={handleChange}>
            <option value="Borrador">Borrador</option>
            <option value="Publicado">Publicado</option>
          </select>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={styles.row}>
              <input name="Visible" type="checkbox" checked={form.Visible} onChange={handleChange} />
              Visible
            </label>
            <label style={styles.row}>
              <input name="Destacada" type="checkbox" checked={form.Destacada} onChange={handleChange} />
              Destacada
            </label>
          </div>
        </div>

        <button disabled={saving} style={styles.btnPrimary} type="submit">
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>

      <section style={{ marginTop: 22 }}>
        <div style={styles.photosHeader}>
          <h2 style={{ margin: 0 }}>Fotos</h2>

          <button
            disabled={saving || !ordenDirty}
            onClick={guardarOrden}
            style={ordenDirty ? styles.btnPrimary : styles.btnDisabled}
          >
            {ordenDirty ? "Guardar orden" : "Orden guardado"}
          </button>
        </div>

        <div style={styles.photoBox}>
          <input type="file" multiple accept="image/*" onChange={handleImages} />
          <div style={{ marginTop: 8, opacity: 0.8 }}>{imagenes.length} seleccionada(s)</div>

          <button disabled={saving} style={{ ...styles.btnPrimary, marginTop: 10 }} onClick={subirFotos}>
            {saving ? "Procesando..." : "Subir fotos"}
          </button>

          <p style={{ margin: "10px 0 0", opacity: 0.75, fontSize: 13 }}>
            Arrastrá y soltá para reordenar. Luego presioná “Guardar orden”.
          </p>
        </div>

        <div style={styles.photoGrid}>
          {fotos.map((f) => (
            <div
              key={f.FotoId}
              style={{
                ...styles.photoCard,
                outline: ordenDirty ? "1px dashed #94a3b8" : "none",
              }}
              draggable
              onDragStart={() => onDragStart(f.FotoId)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(f.FotoId)}
              title="Arrastrá para reordenar"
            >
              <img src={f.Url} alt={f.AltText || ""} style={styles.photoImg} />

              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  style={f.EsPrincipal ? styles.pillOn : styles.pillOff}
                  disabled={saving}
                  onClick={() => marcarPrincipal(f.FotoId)}
                >
                  {f.EsPrincipal ? "Principal" : "Hacer principal"}
                </button>

                <button style={styles.btnDanger} disabled={saving} onClick={() => eliminarFoto(f.FotoId)}>
                  Eliminar
                </button>
              </div>

              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Alt text (SEO)</label>
                <input
                  value={f.AltText || ""}
                  onChange={(e) => setAltLocal(f.FotoId, e.target.value)}
                  maxLength={160}
                  placeholder="Ej: Casa en Meta Ponto, fachada"
                  style={styles.altInput}
                />
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>
                    {String(f.AltText || "").length}/160
                  </span>
                  <button
                    disabled={saving}
                    onClick={() => guardarAltText(f.FotoId)}
                    style={styles.btnLightSmall}
                  >
                    Guardar AltText
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                FotoId: {f.FotoId} • Orden: {f.Orden}
              </div>
            </div>
          ))}

          {!fotos.length && <p style={{ opacity: 0.8 }}>No hay fotos aún.</p>}
        </div>
      </section>
    </main>
  )
}

const styles = {
  main: { padding: 28, maxWidth: 1000, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  form: {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  row: { display: "flex", gap: 8, alignItems: "center" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },

  btnPrimary: {
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #0f172a",
    padding: "12px 14px",
    borderRadius: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
  btnDisabled: {
    background: "#e5e7eb",
    color: "#64748b",
    border: "1px solid #e5e7eb",
    padding: "12px 14px",
    borderRadius: 12,
    fontWeight: 900,
    cursor: "not-allowed",
  },
  btnLight: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #e5e7eb",
    padding: "10px 12px",
    borderRadius: 10,
    fontWeight: 800,
    cursor: "pointer",
  },
  btnLightSmall: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #e5e7eb",
    padding: "8px 10px",
    borderRadius: 10,
    fontWeight: 900,
    cursor: "pointer",
  },
  btnDanger: {
    background: "#991b1b",
    color: "#fff",
    border: "1px solid #991b1b",
    padding: "8px 10px",
    borderRadius: 10,
    fontWeight: 900,
    cursor: "pointer",
  },

  error: { color: "#991b1b", fontWeight: 900 },
  info: { color: "#065f46", fontWeight: 900 },

  photosHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 10,
  },

  photoBox: {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
    padding: 14,
    marginBottom: 14,
  },
  photoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 14,
  },
  photoCard: {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
    padding: 12,
  },
  photoImg: { width: "100%", height: 170, objectFit: "cover", borderRadius: 12, display: "block" },

  pillOn: {
    background: "#065f46",
    color: "#fff",
    border: "1px solid #065f46",
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 900,
    cursor: "pointer",
  },
  pillOff: {
    background: "#fff",
    color: "#111827",
    border: "1px solid #d1d5db",
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 900,
    cursor: "pointer",
  },

  altInput: {
    width: "100%",
    marginTop: 6,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
  },
}
