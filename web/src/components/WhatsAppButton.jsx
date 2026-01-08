export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/50688888888?text=Hola,%20quiero%20información%20sobre%20una%20propiedad"
      target="_blank"
      style={btn}
      title="Escribinos por WhatsApp"
    >
      💬
    </a>
  )
}

const btn = {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  width: '55px',
  height: '55px',
  backgroundColor: '#25d366',
  color: '#fff',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '28px',
  textDecoration: 'none',
  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
  zIndex: 1000
}
