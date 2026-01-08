import { HashRouter, Routes, Route, Link } from "react-router-dom";
import Propiedades from "./pages/Propiedades";
import DetallePropiedad from "./pages/DetallePropiedad";

function App() {
  return (
    <HashRouter>
      <header className="navbar">
        <div className="navbar-brand">
          <Link to="/">Inmobiliaria CR</Link>
        </div>

        <nav className="navbar-links">
          <Link to="/">Propiedades</Link>
        </nav>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<Propiedades />} />
          <Route path="/propiedad/:id" element={<DetallePropiedad />} />
        </Routes>
      </main>

      <footer className="footer">
        © {new Date().getFullYear()} Inmobiliaria CR · Todos los derechos reservados
      </footer>
    </HashRouter>
  );
}

export default App;
