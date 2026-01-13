import { createHashRouter } from "react-router-dom"
import Listado from "./Listado"
import LoginAdmin from "./pages/LoginAdmin"

export const router = createHashRouter([
  {
    path: "/",
    element: <Listado />,
  },
  {
    path: "/admin/login",
    element: <LoginAdmin />,
  },
  {
    path: "*",
    element: (
      <div style={{ padding: 40 }}>
        <h2>Página no encontrada</h2>
      </div>
    ),
  },
])
