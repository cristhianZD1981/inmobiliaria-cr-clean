import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <Link to="/" style={styles.logo}>
          InmobiliariaCR
        </Link>

        <nav style={styles.nav}>
          <Link to="/" style={styles.link}>Inicio</Link>
          <Link to="/propiedades" style={styles.link}>Propiedades</Link>
          <Link to="/contacto" style={styles.link}>Contacto</Link>
        </nav>
      </div>
    </header>
  )
}

const styles = {
  header: {
    backgroundColor: '#0f172a',
    color: '#fff'
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#fff'
  },
  nav: {
    display: 'flex',
    gap: '20px'
  },
  link: {
    color: '#e5e7eb'
  }
}
