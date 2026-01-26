import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { apiFetch } from "../services/api"

function looksLikeEmail(s) {
  const v = String(s || "").trim()
  // Más estricto que includes("@")/includes(".") pero sin ser exagerado
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v) && v.length <= 320
}

function isActivoRow(u) {
  // soporta variantes
  if (u?.AdminActivo != null) return !!u.AdminActivo
  if (u?.Activo != null) return !!u.Activo
  return true
}

function displayNombre(u) {
  const nombre = [u?.Nombre || "", u?.Apellidos || ""].join(" ").trim()
  return nombre || u?.AdminNombre || "-"
}

export default function AdminUsuarios() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [items, setItems] = useState([])

  const [modo, setModo] = useState("nuevo") // nuevo | editar
  const [editId, setEditId] = useState(null)

  const [showInactivos, setShowInactivos] = useState(false)

  const [form, setForm] = useState({
    Usuario: "",
    Nombre: "",
    Apellidos: "",
    Email: "",
    Telefono: "",
    WhatsApp: "",
    Rol: "ADMIN",
    Activo: true,
    Password: "",
  })

  // =========================
  // Confirm modal (custom)
  // =========================
  const confirmResolveRef = useRef(null)
  const [confirm, setConfirm] = useState({
    open: false,
    title: "Confirmar eliminación",
    message: "",
    confirmText: "Eliminar",
    cancelText: "Cancelar",
  })

  function askConfirm({ title, message, confirmText = "Eliminar", cancelText = "Cancelar" }) {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve
      setConfirm({
        open: true,
        title: title || "Confirmar",
        message: message || "",
        confirmText,
        cancelText,
      })
    })
  }

  function closeConfirm(answer) {
    setConfirm((p) => ({ ...p, open: false }))
    const resolve = confirmResolveRef.current
    confirmResolveRef.current = null
    if (resolve) resolve(!!answer)
  }

  // =========================
  // Auth guard
  // =========================
  useEffect(() => {
    const tk = localStorage.getItem("token")
    if (!tk) navigate("/admin/login")
  }, [navigate])

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const titulo = useMemo(() => {
    return modo === "editar" ? `Editar usuario #${editId}` : "Crear usuario"
  }, [modo, editId])

  const itemsFiltrados = useMemo(() => {
    if (showInactivos) return items
    return items.filter((u) => isActivoRow(u))
  }, [items, showInactivos])

  function onChange(e) {
    const { name, value, type, checked } = e.target
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }))
  }

  async function cargar() {
    try {
      setLoading(true)
      setError("")
      setInfo("")
      const data = await apiFetch("/admin/usuarios", { method: "GET" }, { auth: true })
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      const msg = e?.message || "No se pudo cargar usuarios"
      setError(msg)

      // Si el token expiró / inválido, te mando al login
      if (/no autorizado|token inválido/i.test(msg)) {
        localStorage.removeItem("token")
        navigate("/admin/login")
      }

      setItems([])
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setModo("nuevo")
    setEditId(null)
    setError("")
    setInfo("")
    setForm({
      Usuario: "",
      Nombre: "",
      Apellidos: "",
      Email: "",
      Telefono: "",
      WhatsApp: "",
      Rol: "ADMIN",
      Activo: true,
      Password: "",
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function editar(u) {
    setModo("editar")
    setEditId(u.UsuarioAdminId)

    const activo = isActivoRow(u)

    setError("")
    setInfo("")

    setForm({
      Usuario: u.Usuario || "",
      Nombre: u.Nombre || u.AdminNombre || "",
      Apellidos: u.Apellidos || "",
      Email: u.Email || (looksLikeEmail(u.Usuario) ? u.Usuario : ""),
      Telefono: u.Telefono || "",
      WhatsApp: u.WhatsApp || "",
      Rol: u.Rol || "ADMIN",
      Activo: activo,
      Password: "",
    })

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function guardar(e) {
    e.preventDefault()
    if (saving) return

    setError("")
    setInfo("")
    setSaving(true)

    try {
      const usuario = (form.Usuario || "").trim()
      const nombre = (form.Nombre || "").trim()
      const apellidos = (form.Apellidos || "").trim()
      const emailInput = (form.Email || "").trim()
      const email = emailInput || usuario // si no ponen email, usamos usuario
      const telefono = (form.Telefono || "").trim()
      const whatsapp = (form.WhatsApp || "").trim()
      const rol = (form.Rol || "ADMIN").trim()
      const activo = !!form.Activo
      const password = (form.Password || "").trim()

      if (!usuario) {
        setError("Usuario es requerido (ideal: email).")
        return
      }

      if (!looksLikeEmail(email)) {
        setError("Email inválido. (Si lo dejás vacío, Usuario debe ser un email válido.)")
        return
      }

      if (!nombre && modo === "nuevo") {
        setError("Nombre es requerido para crear el usuario.")
        return
      }

      if (modo === "nuevo" && (!password || password.length < 6)) {
        setError("Password es requerido (mínimo 6 caracteres).")
        return
      }

      const payload = {
        Usuario: usuario,
        Nombre: nombre || null,
        Apellidos: apellidos || null,
        Email: email || null,
        Telefono: telefono || null,
        WhatsApp: whatsapp || null,
        Rol: rol,
        Activo: activo,
        Password: password || null,
      }

      if (modo === "nuevo") {
        await apiFetch(
          "/admin/usuarios",
          {
            method: "POST",
            body: payload, // apiFetch lo convierte a JSON
          },
          { auth: true }
        )
        setInfo("Usuario creado correctamente.")
      } else {
        await apiFetch(
          `/admin/usuarios/${editId}`,
          {
            method: "PUT", // ✅ tu backend soporta PUT y PATCH, usamos PUT como “principal”
            body: payload,
          },
          { auth: true }
        )
        setInfo("Usuario actualizado correctamente.")
      }

      await cargar()
      resetForm()
    } catch (e2) {
      const msg = e2?.message || "No se pudo guardar"
      setError(msg)

      if (/no autorizado|token inválido/i.test(msg)) {
        localStorage.removeItem("token")
        navigate("/admin/login")
      }
    } finally {
      setSaving(false)
    }
  }

  async function eliminar(u) {
    setError("")
    setInfo("")

    const ok = await askConfirm({
      title: "Confirmar eliminación",
      message: `¿Eliminar (desactivar) el usuario "${u.Usuario}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    })
    if (!ok) return

    try {
      await apiFetch(`/admin/usuarios/${u.UsuarioAdminId}`, { method: "DELETE" }, { auth: true })

      // Optimista: lo removemos de la lista inmediatamente (si no estás mostrando inactivos)
      setItems((prev) => prev.filter((x) => x.UsuarioAdminId !== u.UsuarioAdminId))

      // Recarga para quedar 100% sincronizado
      await cargar()

      if (editId === u.UsuarioAdminId) resetForm()
      setInfo("Usuario desactivado correctamente.")
    } catch (e) {
      const msg = e?.message || "No se pudo eliminar"
      setError(msg)

      if (/no autorizado|token inválido/i.test(msg)) {
        localStorage.removeItem("token")
        navigate("/admin/login")
      }
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 22 }}>
        <p>Cargando usuarios...</p>
      </div>
    )
  }

  return (
    <main style={S.page}>
      {/* Confirm modal */}
      {confirm.open && (
        <div style={S.modalOverlay} onClick={() => closeConfirm(false)}>
          <div style={S.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 18 }}> {confirm.title} </h3>
            <p style={{ margin: "10px 0 16px", color: "#334155", fontWeight: 700 }}>
              {confirm.message}
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" style={S.btnSmall} onClick={() => closeConfirm(false)}>
                {confirm.cancelText}
              </button>
              <button type="button" style={S.btnSmallDanger} onClick={() => closeConfirm(true)}>
                {confirm.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <header style={S.header}>
        <div>
          <h1 style={{ margin: 0 }}>Usuarios</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.85 }}>
            Administradores/agentes y sus datos de contacto
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={S.toggle}>
            <input
              type="checkbox"
              checked={showInactivos}
              onChange={(e) => setShowInactivos(e.target.checked)}
            />
            <span>Mostrar inactivos</span>
          </label>

          <Link to="/admin" style={S.btn}>
            Volver
          </Link>
          <button type="button" onClick={resetForm} style={S.btnPrimary}>
            Nuevo
          </button>
        </div>
      </header>

      <section style={S.container}>
        {error && <div style={S.error}>{error}</div>}
        {info && <div style={S.info}>{info}</div>}

        <div style={S.grid}>
          {/* FORM */}
          <div style={S.card}>
            <h2 style={{ marginTop: 0 }}>{titulo}</h2>

            <form onSubmit={guardar} style={{ display: "grid", gap: 10 }}>
              <div style={S.row2}>
                <div>
                  <label style={S.label}>Usuario (login)</label>
                  <input
                    name="Usuario"
                    value={form.Usuario}
                    onChange={onChange}
                    style={S.input}
                    placeholder="ej: correo@dominio.com"
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Rol</label>
                  <select name="Rol" value={form.Rol} onChange={onChange} style={S.input}>
                    <option value="ADMIN">ADMIN</option>
                    <option value="AGENTE">AGENTE</option>
                    <option value="SUPER">SUPER</option>
                  </select>
                </div>
              </div>

              <div style={S.row2}>
                <div>
                  <label style={S.label}>Nombre</label>
                  <input name="Nombre" value={form.Nombre} onChange={onChange} style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Apellidos</label>
                  <input name="Apellidos" value={form.Apellidos} onChange={onChange} style={S.input} />
                </div>
              </div>

              <div style={S.row2}>
                <div>
                  <label style={S.label}>Email de contacto</label>
                  <input
                    name="Email"
                    value={form.Email}
                    onChange={onChange}
                    style={S.input}
                    placeholder="si dejás vacío, usamos Usuario"
                  />
                </div>
                <div>
                  <label style={S.label}>Teléfono</label>
                  <input name="Telefono" value={form.Telefono} onChange={onChange} style={S.input} />
                </div>
              </div>

              <div style={S.row2}>
                <div>
                  <label style={S.label}>WhatsApp</label>
                  <input
                    name="WhatsApp"
                    value={form.WhatsApp}
                    onChange={onChange}
                    style={S.input}
                    placeholder="ej: 50688888888"
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 22 }}>
                  <input
                    id="Activo"
                    type="checkbox"
                    name="Activo"
                    checked={form.Activo}
                    onChange={onChange}
                  />
                  <label htmlFor="Activo" style={{ fontWeight: 900 }}>
                    Activo
                  </label>
                </div>
              </div>

              <div>
                <label style={S.label}>
                  Password {modo === "editar" ? "(opcional: solo si querés cambiarlo)" : "(requerido)"}
                </label>
                <input
                  type="password"
                  name="Password"
                  value={form.Password}
                  onChange={onChange}
                  style={S.input}
                />
              </div>

              <button type="submit" style={S.btnPrimary} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </form>

            <p style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
              Nota: si dejás Email vacío, usamos <code>Usuario</code>. (Usuario debe ser un email válido)
            </p>
          </div>

          {/* LISTA */}
          <div style={S.card}>
            <h2 style={{ marginTop: 0 }}>Listado</h2>

            {itemsFiltrados.length === 0 ? (
              <p>No hay usuarios{showInactivos ? "." : " activos."}</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Usuario</th>
                      <th style={S.th}>Nombre</th>
                      <th style={S.th}>Rol</th>
                      <th style={S.th}>Activo</th>
                      <th style={S.th}>Email</th>
                      <th style={S.th}>Tel</th>
                      <th style={S.th}>WhatsApp</th>
                      <th style={S.th}></th>
                    </tr>
                  </thead>

                  <tbody>
                    {itemsFiltrados.map((u) => {
                      const activo = isActivoRow(u)
                      const nombre = displayNombre(u)

                      return (
                        <tr key={u.UsuarioAdminId} style={!activo ? S.rowInactive : undefined}>
                          <td style={S.td}>{u.Usuario}</td>
                          <td style={S.td}>{nombre}</td>
                          <td style={S.td}>{u.Rol || "-"}</td>
                          <td style={S.td}>{activo ? "Sí" : "No"}</td>
                          <td style={S.td}>{u.Email || "-"}</td>
                          <td style={S.td}>{u.Telefono || "-"}</td>
                          <td style={S.td}>{u.WhatsApp || "-"}</td>
                          <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                            <button type="button" style={S.btnSmall} onClick={() => editar(u)}>
                              Editar
                            </button>
                            <button type="button" style={S.btnSmallDanger} onClick={() => eliminar(u)}>
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
  container: { maxWidth: 1200, margin: "0 auto", padding: 22 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14, alignItems: "start" },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 20px rgba(0,0,0,0.06)",
  },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 900,
    marginBottom: 12,
  },
  info: {
    background: "#dcfce7",
    color: "#065f46",
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 900,
    marginBottom: 12,
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  label: { fontWeight: 900, fontSize: 13, display: "block", marginBottom: 6 },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    outline: "none",
  },
  btn: {
    textDecoration: "none",
    fontWeight: 900,
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#0f172a",
  },
  btnPrimary: {
    borderRadius: 12,
    padding: "10px 12px",
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #e5e7eb" },
  td: { padding: "10px 8px", borderBottom: "1px solid #f1f5f9" },
  btnSmall: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #0f172a",
    background: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    marginRight: 8,
  },
  btnSmallDanger: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #991b1b",
    background: "#991b1b",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  toggle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,0.12)",
    padding: "8px 10px",
    borderRadius: 12,
    fontWeight: 900,
  },

  rowInactive: { opacity: 0.55 },

  // Modal styles
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 9999,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    border: "1px solid #e5e7eb",
  },
}
