import { HashRouter, Routes, Route } from "react-router-dom"
import { useTranslation } from "react-i18next"
import Home from "./pages/Home"
import Listado from "./Listado"
import DetallePropiedad from "./pages/DetallePropiedad"
import Contacto from "./pages/Contacto"

import LoginAdmin from "./pages/LoginAdmin"
import AdminPanel from "./pages/AdminPanel"
import AdminDashboard from "./pages/AdminDashboard"
import AdminPropiedades from "./pages/AdminPropiedades"
import AdminPropiedadNueva from "./pages/AdminPropiedadNueva"
import AdminPropiedadEditar from "./pages/AdminPropiedadEditar"
import AdminLeads from "./pages/AdminLeads"
import AdminUsuarios from "./pages/AdminUsuarios" // ✅ NUEVO

export default function App() {
  const { t } = useTranslation()

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/propiedades" element={<Listado />} />

        <Route path="/propiedad/:id" element={<DetallePropiedad />} />
        <Route path="/propiedades/:id" element={<DetallePropiedad />} />

        <Route path="/contacto" element={<Contacto />} />

        <Route path="/admin/login" element={<LoginAdmin />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/propiedades" element={<AdminPropiedades />} />
        <Route path="/admin/propiedades/nueva" element={<AdminPropiedadNueva />} />

        {/* ✅ Editar (todas las variantes comunes para evitar 404) */}
        <Route path="/admin/propiedades/:id" element={<AdminPropiedadEditar />} />
        <Route path="/admin/propiedades/:id/editar" element={<AdminPropiedadEditar />} />
        <Route path="/admin/propiedades/editar/:id" element={<AdminPropiedadEditar />} />

        <Route path="/admin/leads" element={<AdminLeads />} />

        {/* ✅ Usuarios */}
        <Route path="/admin/usuarios" element={<AdminUsuarios />} />

        <Route
          path="*"
          element={
            <div style={{ padding: 40 }}>
              <h2>{t("common.notFound")}</h2>
            </div>
          }
        />
      </Routes>
    </HashRouter>
  )
}
