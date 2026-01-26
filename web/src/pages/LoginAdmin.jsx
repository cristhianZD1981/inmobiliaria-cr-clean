import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { loginAdmin } from "../services/api"

export default function LoginAdmin() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const data = await loginAdmin({ usuario, password })

      // guardar sesión
      if (data?.token) localStorage.setItem("token", data.token)

      // backend nuevo: { token, user }
      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user))
        // compat: por si en algún lugar leés "usuario" (legacy)
        localStorage.setItem("usuario", JSON.stringify(data.user.usuario || data.user))
      } else {
        // compat si alguna vez el backend devuelve algo distinto
        localStorage.removeItem("user")
        localStorage.setItem("usuario", JSON.stringify(usuario))
      }

      navigate("/admin")
    } catch (err) {
      setError(err?.message || "No se pudo conectar con el servidor")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrapper}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h1 style={styles.title}>Panel Administrativo</h1>
        <p style={styles.subtitle}>Propiedades del Sur</p>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.field}>
          <label>Usuario</label>
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        <div style={styles.field}>
          <label>{t("admin.password")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f7fa",
  },
  card: {
    background: "#ffffff",
    padding: "40px",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "380px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
  },
  title: {
    margin: 0,
    fontSize: "26px",
    fontWeight: 800,
    color: "#0a2540",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: "#6b7280",
    marginBottom: "24px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "18px",
  },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "14px",
  },
  button: {
    width: "100%",
    padding: "12px",
    background: "#0a2540",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
}
