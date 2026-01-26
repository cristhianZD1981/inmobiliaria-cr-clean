import { useTranslation } from "react-i18next"

export default function Contacto() {
  const { t } = useTranslation()

  return (
    <div className="container">
      <h1>{t("contact.title")}</h1>
      <p>{t("contact.text")}</p>

      <a href="https://wa.me/50688888888" target="_blank" style={btnStyle} rel="noreferrer">
        {t("contact.whatsapp")}
      </a>
    </div>
  )
}

const btnStyle = {
  display: "inline-block",
  marginTop: "20px",
  padding: "12px 20px",
  backgroundColor: "#25d366",
  color: "#fff",
  borderRadius: "6px",
  textDecoration: "none",
}
