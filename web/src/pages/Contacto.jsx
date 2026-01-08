export default function Contacto() {
  return (
    <div className="container">
      <h1>Contacto</h1>
      <p>
        Para más información sobre alguna propiedad, escribinos por WhatsApp
      </p>

      <a
        href="https://wa.me/50688888888"
        target="_blank"
        style={btnStyle}
      >
        Contactar por WhatsApp
      </a>
    </div>
  )
}

const btnStyle = {
  display: 'inline-block',
  marginTop: '20px',
  padding: '12px 20px',
  backgroundColor: '#25d366',
  color: '#fff',
  borderRadius: '6px'
}
