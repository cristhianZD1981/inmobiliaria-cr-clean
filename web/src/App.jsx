import { HashRouter, Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Listado from "./Listado"
import DetallePropiedad from "./pages/DetallePropiedad"

import LoginAdmin from "./pages/LoginAdmin"
import AdminPanel from "./pages/AdminPanel"
import AdminDashboard from "./pages/AdminDashboard"
import AdminPropiedades from "./pages/AdminPropiedades"
import AdminPropiedadNueva from "./pages/AdminPropiedadNueva"
import AdminPropiedadEditar from "./pages/AdminPropiedadEditar"
import AdminLeads from "./pages/AdminLeads"

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Público */}
        <Route path="/" element={<Home />} />
        <Route path="/propiedades" element={<Listado />} />
        <Route path="/propiedades/:id" element={<DetallePropiedad />} />

        {/* Admin */}
        <Route path="/admin/login" element={<LoginAdmin />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/propiedades" element={<AdminPropiedades />} />
        <Route path="/admin/propiedades/nueva" element={<AdminPropiedadNueva />} />
        <Route path="/admin/propiedades/:id/editar" element={<AdminPropiedadEditar />} />
        <Route path="/admin/leads" element={<AdminLeads />} />

        <Route
          path="*"
          element={
            <div style={{ padding: 40 }}>
              <h2>Página no encontrada</h2>
            </div>
          }
        />
      </Routes>
    </HashRouter>
  )
}
