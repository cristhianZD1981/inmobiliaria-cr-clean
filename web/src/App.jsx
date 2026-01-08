import { HashRouter, Routes, Route, Link } from "react-router-dom";
import Propiedades from "./pages/Propiedades";
import DetallePropiedad from "./pages/DetallePropiedad";

function App() {
  return (
    <HashRouter>
      <nav style={{ padding: 10, background: "#eee" }}>
        <Link to="/" style={{ textDecoration: "none", fontWeight: "bold" }}>
          Inmobiliaria CR
        </Link>
      </nav>

      <Routes>
        <Route path="/" element={<Propiedades />} />
        <Route path="/propiedad/:id" element={<DetallePropiedad />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
