import { useTranslation } from "react-i18next"
import { setAppLanguage } from "../i18n"

export default function LanguageSelector({ className = "" }) {
  const { i18n } = useTranslation()

  return (
    <select
      className={className}
      value={i18n.language}
      onChange={(e) => setAppLanguage(e.target.value)}
      aria-label="Selector de idioma"
      title="Idioma"
    >
      <option value="es">🇨🇷 Español</option>
      <option value="en">🇺🇸 English</option>
      <option value="fr">🇫🇷 Français</option>
      <option value="pt">🇵🇹 Português</option>
      <option value="it">🇮🇹 Italiano</option>
      <option value="de">🇩🇪 Deutsch</option>
      <option value="zh">🇨🇳 中文</option>
    </select>
  )
}
