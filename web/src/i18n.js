import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import es from "./locales/es/translation.json"
import en from "./locales/en/translation.json"
import fr from "./locales/fr/translation.json"
import pt from "./locales/pt/translation.json"
import it from "./locales/it/translation.json"
import de from "./locales/de/translation.json"
import zh from "./locales/zh/translation.json"

const STORAGE_KEY = "lang"

/**
 * Idioma inicial:
 * 1) localStorage
 * 2) idioma del navegador
 * 3) español por defecto
 */
function getInitialLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) return saved

  const nav = (navigator.language || "es").toLowerCase()

  if (nav.startsWith("en")) return "en"
  if (nav.startsWith("fr")) return "fr"
  if (nav.startsWith("pt")) return "pt"
  if (nav.startsWith("it")) return "it"
  if (nav.startsWith("de")) return "de"
  if (nav.startsWith("zh")) return "zh"

  return "es"
}

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    fr: { translation: fr },
    pt: { translation: pt },
    it: { translation: it },
    de: { translation: de },
    zh: { translation: zh },
  },

  lng: getInitialLanguage(),
  fallbackLng: "es",

  interpolation: {
    escapeValue: false, // React ya protege contra XSS
  },

  react: {
    useSuspense: false, // evita errores en lazy routes
  },
})

/**
 * Cambia el idioma de la app y lo persiste
 */
export function setAppLanguage(lang) {
  i18n.changeLanguage(lang)
  localStorage.setItem(STORAGE_KEY, lang)
}

/**
 * Devuelve locale válido para Intl.NumberFormat
 */
export function getIntlLocale(lang) {
  switch (lang) {
    case "en":
      return "en-US"
    case "fr":
      return "fr-FR"
    case "pt":
      return "pt-PT"
    case "it":
      return "it-IT"
    case "de":
      return "de-DE"
    case "zh":
      return "zh-CN"
    default:
      return "es-CR"
  }
}

export default i18n
