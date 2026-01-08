const express = require("express")
const sql = require("mssql")
const cors = require("cors")

const app = express()
app.use(cors())
app.use(express.json())

// ===============================
// CONFIGURACIÓN BASE DE DATOS
// ===============================
const dbConfig = {
  user: "admin",
  password: "Seguros2025*",
  server: "bdseguros2025.cxsusk008jt2.us-east-2.rds.amazonaws.com",
  database: "InmobiliariaCR",
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
}

// Conexión global
sql.connect(dbConfig)
  .then(() => console.log("Backend conectado a SQL en http://localhost:3001"))
  .catch(err => console.error("ERROR SQL:", err))

// ===============================
// ENDPOINT BASE
// ===============================
app.get("/", (req, res) => {
  res.send("API Inmobiliaria CR funcionando")
})

// ===============================
// LISTADO DE PROPIEDADES (CON FILTROS)
// ===============================
app.get("/api/propiedades", async (req, res) => {
  const { provincia, precioMax } = req.query

  try {
    let query = `
      SELECT 
        p.PropiedadId,
        p.Titulo,
        p.Precio,
        p.Moneda,
        pr.Nombre AS Provincia
      FROM dbo.Propiedad p
      INNER JOIN dbo.Provincia pr ON pr.ProvinciaId = p.ProvinciaId
      WHERE p.Visible = 1
    `

    const request = new sql.Request()

    if (provincia) {
      query += " AND pr.Nombre = @provincia"
      request.input("provincia", sql.VarChar, provincia)
    }

    if (precioMax) {
      query += " AND p.Precio <= @precioMax"
      request.input("precioMax", sql.BigInt, precioMax)
    }

    const result = await request.query(query)

    res.json(result.recordset)
  } catch (error) {
    console.error("ERROR LISTADO:", error)
    res.status(500).json({ error: "Error al consultar propiedades" })
  }
})

// ===============================
// DETALLE DE PROPIEDAD (CON FOTOS)
// ===============================
app.get("/api/propiedades/:id", async (req, res) => {
  const propiedadId = parseInt(req.params.id, 10)

  if (isNaN(propiedadId)) {
    return res.status(400).json({ error: "ID de propiedad inválido" })
  }

  try {
    // 1️⃣ Propiedad
    const propiedadResult = await new sql.Request()
      .input("PropiedadId", sql.Int, propiedadId)
      .query(`
        SELECT
          p.PropiedadId,
          p.Titulo,
          p.Descripcion,
          p.Precio,
          p.Moneda,
          p.Habitaciones,
          p.Banos,
          p.Parqueos,
          p.MetrosTerreno,
          p.MetrosConstruccion,
          p.DireccionDetallada,
          pr.Nombre AS Provincia
        FROM dbo.Propiedad p
        INNER JOIN dbo.Provincia pr ON pr.ProvinciaId = p.ProvinciaId
        WHERE p.PropiedadId = @PropiedadId
          AND p.Visible = 1
      `)

    if (propiedadResult.recordset.length === 0) {
      return res.status(404).json({ error: "Propiedad no encontrada" })
    }

    const propiedad = propiedadResult.recordset[0]

    // 2️⃣ Fotos
    const fotosResult = await new sql.Request()
      .input("PropiedadId", sql.Int, propiedadId)
      .query(`
        SELECT
          FotoId,
          Url,
          EsPrincipal
        FROM dbo.PropiedadFoto
        WHERE PropiedadId = @PropiedadId
        ORDER BY EsPrincipal DESC, FotoId ASC
      `)

    propiedad.fotos = fotosResult.recordset

    res.json(propiedad)
  } catch (error) {
    console.error("ERROR DETALLE:", error)
    res.status(500).json({ error: "Error al consultar detalle de propiedad" })
  }
})

// ===============================
app.listen(3001, () => {
  console.log("Servidor escuchando en http://localhost:3001")
})
