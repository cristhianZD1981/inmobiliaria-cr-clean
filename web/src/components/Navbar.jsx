import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

export default function Navbar() {
  const { i18n, t } = useTranslation()

  function cambiarIdioma(e) {
    const lang = e.target.value
    i18n.changeLanguage(lang)
    localStorage.setItem("lang", lang)
  }

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Propiedades del sur
        </Link>

        <nav className="navbar-links">
          <Link to="/propiedades">{t("home.ctaBrowse")}</Link>
          <Link to="/contacto">{t("common.contact")}</Link>
          <Link to="/admin/login">Admin</Link>
        </nav>

        {/* 🌐 SELECTOR DE IDIOMA */}
        <select
          onChange={cambiarIdioma}
          value={i18n.language}
          className="navbar-lang"
          aria-label="Selector de idioma"
        >
          <option value="es">🇨🇷 Español</option>
          <option value="en">🇺🇸 English</option>
          <option value="fr">🇫🇷 Français</option>
          <option value="pt">🇧🇷 Português</option>
          <option value="it">🇮🇹 Italiano</option>
          <option value="de">🇩🇪 Deutsch</option>
          <option value="zh">🇨🇳 中文</option>
        </select>
      </div>
    </header>
  )
}
