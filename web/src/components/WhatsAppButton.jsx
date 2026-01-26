import { useMemo } from "react"
import { useTranslation } from "react-i18next"

const PHONE = "50688888888"

export default function WhatsAppButton() {
  const { t } = useTranslation()

  const href = useMemo(() => {
    const text = encodeURIComponent(t("contact.text"))
    return `https://wa.me/${PHONE}?text=${text}`
  }, [t])

  return (
    <a
      href={href}
      target="_blank"
      style={btn}
      title={t("contact.whatsapp")}
      rel="noreferrer"
    >
      💬
    </a>
  )
}

const btn = {
  position: "fixed",
  bottom: "20px",
  right: "20px",
  width: "55px",
  height: "55px",
  backgroundColor: "#25d366",
  color: "#fff",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
  textDecoration: "none",
  boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
  zIndex: 1000,
}
