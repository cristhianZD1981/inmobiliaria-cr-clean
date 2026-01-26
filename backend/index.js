const express = require("express")
const sql = require("mssql")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const multer = require("multer")
const cloudinary = require("cloudinary").v2
require("dotenv").config()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || "cambia-esto-por-una-clave-larga"

// ===============================
// CLOUDINARY
// ===============================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ===============================
// MULTER (memoria)
// ===============================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
})

// ===============================
// BD (SQL Server)
// ===============================
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 1433,
  options: {
    encrypt: (process.env.DB_ENCRYPT || "false").toLowerCase() === "true",
    trustServerCertificate:
      (process.env.DB_TRUST_CERT || "true").toLowerCase() === "true",
  },
}

sql
  .connect(dbConfig)
  .then(() => console.log(`✅ Conectado a SQL Server. API lista en puerto ${PORT}`))
  .catch((e) => console.error("❌ ERROR CONEXIÓN SQL:", e))

// ===============================
// HELPERS
// ===============================
function authRequired(req, res, next) {
  const h = req.headers.authorization || ""
  const token = h.startsWith("Bearer ") ? h.slice(7) : null
  if (!token) return res.status(401).json({ error: "No autorizado" })

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: "Token inválido" })
  }
}

function isFiniteId(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function clipStr(v, max) {
  if (v == null) return null
  const s = String(v).trim()
  if (!s) return null
  return s.length > max ? s.slice(0, max) : s
}

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"]
  if (xf) return String(xf).split(",")[0].trim()
  return req.socket?.remoteAddress || null
}

function safeNumber(v) {
  if (v == null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function looksLikeEmail(s) {
  if (!s) return false
  const v = String(s).trim()
  return v.includes("@") && v.includes(".") && v.length <= 320
}

function guessNombreFromUsuario(usuario) {
  const u = String(usuario || "").trim()
  if (!u) return "Administrador"
  if (looksLikeEmail(u)) return u.split("@")[0].replace(/[._-]+/g, " ").trim() || "Administrador"
  return u.slice(0, 60)
}

function sqlUniqueViolation(err) {
  // SQL Server: 2601/2627 = unique constraint / unique index
  const num = err?.number || err?.originalError?.info?.number
  return num === 2601 || num === 2627
}

// ===============================
// Detección de esquema (para no romper si faltan columnas)
// ===============================
const _colCache = new Map()
async function hasColumn(tableName, columnName) {
  const key = `${tableName}.${columnName}`
  if (_colCache.has(key)) return _colCache.get(key)

  const q = `SELECT COL_LENGTH('${tableName}', '${columnName}') AS L;`
  try {
    const r = await new sql.Request().query(q)
    const ok = r.recordset?.[0]?.L != null
    _colCache.set(key, ok)
    return ok
  } catch {
    _colCache.set(key, false)
    return false
  }
}

const schema = {
  uaUsuarioId: null, // dbo.UsuarioAdmin.UsuarioId
  leadAsignadoAId: null, // dbo.Lead.AsignadoAId
  leadFechaCreacion: null, // dbo.Lead.FechaCreacion
}

async function detectSchemaOnce() {
  if (schema.uaUsuarioId != null) return

  schema.uaUsuarioId = await hasColumn("dbo.UsuarioAdmin", "UsuarioId")
  schema.leadAsignadoAId = await hasColumn("dbo.Lead", "AsignadoAId")
  schema.leadFechaCreacion = await hasColumn("dbo.Lead", "FechaCreacion")

  if (!schema.uaUsuarioId) {
    console.warn(
      "⚠️ dbo.UsuarioAdmin.UsuarioId NO existe. " +
        "Para asociar propiedades al contacto (dbo.Usuario), agregá esa columna y el FK."
    )
  }
}

// ===============================
// Vincular UsuarioAdmin -> Usuario (contacto/agente)
// ===============================
async function ensureUsuarioIdForAdminRow(uAdminRow) {
  await detectSchemaOnce()
  if (!schema.uaUsuarioId) return null

  if (uAdminRow?.UsuarioId) return Number(uAdminRow.UsuarioId)

  const usuarioStr = uAdminRow?.Usuario
  if (!looksLikeEmail(usuarioStr)) {
    return null
  }

  const email = String(usuarioStr).trim()
  const nombre = clipStr(uAdminRow?.Nombre, 160) || guessNombreFromUsuario(email)

  const existing = await new sql.Request()
    .input("Email", sql.NVarChar(320), email)
    .query(`
      SELECT TOP 1 UsuarioId
      FROM dbo.Usuario
      WHERE Email = @Email
    `)

  let usuarioId = existing.recordset?.[0]?.UsuarioId

  if (!usuarioId) {
    const ins = await new sql.Request()
      .input("Nombre", sql.NVarChar(160), nombre)
      .input("Apellidos", sql.NVarChar(240), null)
      .input("Email", sql.NVarChar(320), email)
      .input("Telefono", sql.NVarChar(50), null)
      .input("WhatsApp", sql.NVarChar(50), null)
      .input("PasswordHash", sql.VarBinary(256), null)
      .input("Activo", sql.Bit, 1)
      .query(`
        INSERT INTO dbo.Usuario (Nombre, Apellidos, Email, Telefono, WhatsApp, PasswordHash, Activo, FechaCreacion)
        OUTPUT INSERTED.UsuarioId
        VALUES (@Nombre, @Apellidos, @Email, @Telefono, @WhatsApp, @PasswordHash, @Activo, SYSUTCDATETIME())
      `)

    usuarioId = ins.recordset?.[0]?.UsuarioId
  }

  await new sql.Request()
    .input("UsuarioAdminId", sql.Int, Number(uAdminRow.UsuarioAdminId))
    .input("UsuarioId", sql.Int, Number(usuarioId))
    .query(`
      UPDATE dbo.UsuarioAdmin
      SET UsuarioId = @UsuarioId,
          ActualizadoEn = SYSUTCDATETIME()
      WHERE UsuarioAdminId = @UsuarioAdminId
    `)

  return Number(usuarioId)
}

// ===============================
// Anti-spam simple en memoria (por IP)
// ===============================
const leadRate = new Map()
const LEAD_WINDOW_MS = 10 * 60 * 1000
const LEAD_MAX = 5

function rateLimitLeads(req, res, next) {
  const ip = getClientIp(req) || "unknown"
  const now = Date.now()
  const entry = leadRate.get(ip) || { t: now, c: 0 }

  if (now - entry.t > LEAD_WINDOW_MS) {
    entry.t = now
    entry.c = 0
  }

  entry.c += 1
  leadRate.set(ip, entry)

  if (entry.c > LEAD_MAX) {
    return res.status(429).json({ error: "Demasiadas solicitudes. Probá en unos minutos." })
  }

  next()
}

// ===============================
// BASE
// ===============================
app.get("/", (req, res) => {
  res.json({ ok: true, name: "Inmobiliaria API", port: PORT })
})

// ===============================
// LOGIN
// ===============================
app.post("/api/auth/login", async (req, res) => {
  const { usuario, password } = req.body || {}

  if (!usuario || !password) {
    return res.status(400).json({ error: "Usuario y password requeridos" })
  }

  try {
    await detectSchemaOnce()

    const selectUsuarioId = schema.uaUsuarioId ? ", UsuarioId" : ""

    const r = await new sql.Request()
      .input("Usuario", sql.NVarChar(120), usuario)
      .query(`
        SELECT TOP 1
          UsuarioAdminId,
          Usuario,
          Nombre,
          Rol,
          Activo,
          PasswordHash
          ${selectUsuarioId}
        FROM dbo.UsuarioAdmin
        WHERE Usuario = @Usuario
      `)

    const u = r.recordset?.[0]
    if (!u || !bcrypt.compareSync(password, u.PasswordHash)) {
      return res.status(401).json({ error: "Credenciales inválidas" })
    }

    if (u.Activo === false || u.Activo === 0) {
      return res.status(403).json({ error: "Usuario inactivo" })
    }

    let usuarioId = null
    if (schema.uaUsuarioId) {
      usuarioId = await ensureUsuarioIdForAdminRow(u)
    }

    const token = jwt.sign(
      {
        usuarioAdminId: u.UsuarioAdminId,
        usuario: u.Usuario,
        rol: u.Rol || "ADMIN",
        usuarioId,
      },
      JWT_SECRET,
      { expiresIn: "12h" }
    )

    res.json({
      token,
      user: {
        usuarioAdminId: u.UsuarioAdminId,
        usuario: u.Usuario,
        rol: u.Rol || "ADMIN",
        usuarioId,
      },
    })
  } catch (e) {
    console.error("ERROR LOGIN:", e)
    res.status(500).json({ error: "Error en login" })
  }
})

// ===============================
// ADMIN - USUARIOS (CRUD) ✅ NUEVO/COMPLETO
// Endpoints esperados por el frontend:
// - GET    /api/admin/usuarios
// - POST   /api/admin/usuarios
// - PUT    /api/admin/usuarios/:id
// - DELETE /api/admin/usuarios/:id   (soft delete)
// ===============================

app.get("/api/admin/usuarios", authRequired, async (req, res) => {
  try {
    await detectSchemaOnce()
    if (!schema.uaUsuarioId) {
      return res.status(500).json({
        error: "La BD no tiene dbo.UsuarioAdmin.UsuarioId. Agregalo para habilitar administración de usuarios.",
      })
    }

    const data = await new sql.Request().query(`
      SELECT
        ua.UsuarioAdminId,
        ua.Usuario,
        ua.Rol,
        ua.Activo AS Activo,
        ua.UsuarioId,
        COALESCE(u.Nombre, ua.Nombre) AS Nombre,
        u.Apellidos AS Apellidos,
        COALESCE(u.Email, ua.Usuario) AS Email,
        u.Telefono AS Telefono,
        u.WhatsApp AS WhatsApp
      FROM dbo.UsuarioAdmin ua
      LEFT JOIN dbo.Usuario u ON u.UsuarioId = ua.UsuarioId
      ORDER BY ua.UsuarioAdminId DESC
    `)

    res.json(data.recordset || [])
  } catch (e) {
    console.error("ERROR LISTANDO USUARIOS:", e)
    res.status(500).json({ error: "Error listando usuarios" })
  }
})

app.post("/api/admin/usuarios", authRequired, async (req, res) => {
  const b = req.body || {}

  const email = clipStr(b.Email, 320)
  const password = clipStr(b.Password, 200)
  const nombre = clipStr(b.Nombre, 160)
  const apellidos = clipStr(b.Apellidos, 240)
  const telefono = clipStr(b.Telefono, 50)
  const whatsapp = clipStr(b.WhatsApp, 50)

  const rol = clipStr(b.Rol, 60) || "ADMIN"
  const activo = b.Activo == null ? 1 : b.Activo ? 1 : 0

  const usuarioLogin = clipStr(b.Usuario, 120) || email

  if (!email || !looksLikeEmail(email)) return res.status(400).json({ error: "Email inválido" })
  if (!usuarioLogin) return res.status(400).json({ error: "Usuario requerido" })
  if (!password || password.length < 6) return res.status(400).json({ error: "Password mínimo 6 caracteres" })
  if (!nombre) return res.status(400).json({ error: "Nombre es requerido" })

  try {
    await detectSchemaOnce()
    if (!schema.uaUsuarioId) {
      return res.status(500).json({
        error: "La BD no tiene dbo.UsuarioAdmin.UsuarioId. Agregalo para habilitar administración de usuarios.",
      })
    }

    const hash = bcrypt.hashSync(password, 10)

    const tx = new sql.Transaction()
    await tx.begin()

    // 1) Crear dbo.Usuario (contacto)
    const insU = await new sql.Request(tx)
      .input("Nombre", sql.NVarChar(160), nombre)
      .input("Apellidos", sql.NVarChar(240), apellidos)
      .input("Email", sql.NVarChar(320), email)
      .input("Telefono", sql.NVarChar(50), telefono)
      .input("WhatsApp", sql.NVarChar(50), whatsapp)
      .input("PasswordHash", sql.VarBinary(256), null)
      .input("Activo", sql.Bit, activo)
      .query(`
        INSERT INTO dbo.Usuario (Nombre, Apellidos, Email, Telefono, WhatsApp, PasswordHash, Activo, FechaCreacion)
        OUTPUT INSERTED.UsuarioId
        VALUES (@Nombre, @Apellidos, @Email, @Telefono, @WhatsApp, @PasswordHash, @Activo, SYSUTCDATETIME())
      `)

    const usuarioId = insU.recordset?.[0]?.UsuarioId

    // 2) Crear dbo.UsuarioAdmin (login)
    const insUA = await new sql.Request(tx)
      .input("Usuario", sql.NVarChar(120), usuarioLogin)
      .input("Nombre", sql.NVarChar(240), `${nombre}${apellidos ? " " + apellidos : ""}`.trim())
      .input("Rol", sql.NVarChar(60), rol)
      .input("PasswordHash", sql.NVarChar(510), hash)
      .input("Activo", sql.Bit, activo)
      .input("UsuarioId", sql.Int, usuarioId)
      .query(`
        INSERT INTO dbo.UsuarioAdmin (Usuario, Nombre, Rol, PasswordHash, Activo, UsuarioId, CreadoEn)
        OUTPUT INSERTED.UsuarioAdminId
        VALUES (@Usuario, @Nombre, @Rol, @PasswordHash, @Activo, @UsuarioId, SYSUTCDATETIME())
      `)

    await tx.commit()

    res.json({
      ok: true,
      UsuarioId: usuarioId,
      UsuarioAdminId: insUA.recordset?.[0]?.UsuarioAdminId,
    })
  } catch (e) {
    try {
      // si falló después del begin y no hizo commit
      // (si no hay transacción activa, no pasa nada)
      // eslint-disable-next-line no-empty
    } catch {}

    if (sqlUniqueViolation(e)) {
      return res.status(409).json({
        error: "Ya existe un usuario con ese Email o Usuario (login).",
      })
    }

    console.error("ERROR CREANDO USUARIO:", e)
    res.status(500).json({ error: "Error creando usuario" })
  }
})

// Handler único para PUT/PATCH (para no duplicar lógica)
async function updateAdminUsuarioHandler(req, res) {
  const usuarioAdminId = isFiniteId(req.params.id)
  if (!usuarioAdminId) return res.status(400).json({ error: "Id inválido" })

  const b = req.body || {}

  const email = clipStr(b.Email, 320)
  const nombre = clipStr(b.Nombre, 160)
  const apellidos = clipStr(b.Apellidos, 240)
  const telefono = clipStr(b.Telefono, 50)
  const whatsapp = clipStr(b.WhatsApp, 50)

  const rol = clipStr(b.Rol, 60)
  const activo = b.Activo == null ? null : b.Activo ? 1 : 0

  const usuarioLogin = clipStr(b.Usuario, 120)
  const newPassword = clipStr(b.Password, 200)

  try {
    await detectSchemaOnce()
    if (!schema.uaUsuarioId) {
      return res.status(500).json({
        error: "La BD no tiene dbo.UsuarioAdmin.UsuarioId. Agregalo para habilitar administración de usuarios.",
      })
    }

    const tx = new sql.Transaction()
    await tx.begin()

    // Fila actual
    const curR = await new sql.Request(tx)
      .input("UsuarioAdminId", sql.Int, usuarioAdminId)
      .query(`
        SELECT TOP 1 UsuarioAdminId, Usuario, Nombre, Rol, Activo, UsuarioId
        FROM dbo.UsuarioAdmin
        WHERE UsuarioAdminId = @UsuarioAdminId
      `)

    const cur = curR.recordset?.[0]
    if (!cur) {
      await tx.rollback()
      return res.status(404).json({ error: "Usuario admin no encontrado" })
    }

    let usuarioId = cur.UsuarioId

    // Si no hay vínculo y viene email válido, crear Usuario y vincular
    if (!usuarioId && email && looksLikeEmail(email)) {
      const nombreReq = nombre || guessNombreFromUsuario(email)

      const insU = await new sql.Request(tx)
        .input("Nombre", sql.NVarChar(160), nombreReq)
        .input("Apellidos", sql.NVarChar(240), apellidos)
        .input("Email", sql.NVarChar(320), email)
        .input("Telefono", sql.NVarChar(50), telefono)
        .input("WhatsApp", sql.NVarChar(50), whatsapp)
        .input("PasswordHash", sql.VarBinary(256), null)
        .input("Activo", sql.Bit, activo == null ? (cur.Activo ? 1 : 0) : activo)
        .query(`
          INSERT INTO dbo.Usuario (Nombre, Apellidos, Email, Telefono, WhatsApp, PasswordHash, Activo, FechaCreacion)
          OUTPUT INSERTED.UsuarioId
          VALUES (@Nombre, @Apellidos, @Email, @Telefono, @WhatsApp, @PasswordHash, @Activo, SYSUTCDATETIME())
        `)

      usuarioId = insU.recordset?.[0]?.UsuarioId

      await new sql.Request(tx)
        .input("UsuarioAdminId", sql.Int, usuarioAdminId)
        .input("UsuarioId", sql.Int, usuarioId)
        .query(`
          UPDATE dbo.UsuarioAdmin
          SET UsuarioId = @UsuarioId,
              ActualizadoEn = SYSUTCDATETIME()
          WHERE UsuarioAdminId = @UsuarioAdminId
        `)
    }

    // Update dbo.Usuario (contacto) si existe vínculo
    if (usuarioId) {
      const updU = await new sql.Request(tx)
        .input("UsuarioId", sql.Int, usuarioId)
        .input("Nombre", sql.NVarChar(160), nombre)
        .input("Apellidos", sql.NVarChar(240), apellidos)
        .input("Email", sql.NVarChar(320), email)
        .input("Telefono", sql.NVarChar(50), telefono)
        .input("WhatsApp", sql.NVarChar(50), whatsapp)
        .input("UsuarioActivo", sql.Bit, activo)
        .query(`
          UPDATE dbo.Usuario
          SET
            Nombre = COALESCE(@Nombre, Nombre),
            Apellidos = COALESCE(@Apellidos, Apellidos),
            Email = COALESCE(@Email, Email),
            Telefono = COALESCE(@Telefono, Telefono),
            WhatsApp = COALESCE(@WhatsApp, WhatsApp),
            Activo = COALESCE(@UsuarioActivo, Activo)
          WHERE UsuarioId = @UsuarioId;

          SELECT @@ROWCOUNT AS Afectadas;
        `)

      const afectU = updU.recordset?.[0]?.Afectadas || 0
      if (afectU === 0) {
        await tx.rollback()
        return res.status(404).json({ error: "Usuario (contacto) no encontrado para este admin" })
      }
    }

    // Update dbo.UsuarioAdmin
    const setPass = newPassword ? ", PasswordHash = @PasswordHash" : ""
    const adminDisplayName =
      nombre || apellidos ? `${nombre || ""}${apellidos ? " " + apellidos : ""}`.trim() : null

    const updUA = await new sql.Request(tx)
      .input("UsuarioAdminId", sql.Int, usuarioAdminId)
      .input("Usuario", sql.NVarChar(120), usuarioLogin)
      .input("AdminNombre", sql.NVarChar(240), adminDisplayName)
      .input("Rol", sql.NVarChar(60), rol)
      .input("Activo", sql.Bit, activo)
      .input("PasswordHash", sql.NVarChar(510), newPassword ? bcrypt.hashSync(newPassword, 10) : null)
      .query(`
        UPDATE dbo.UsuarioAdmin
        SET
          Usuario = COALESCE(@Usuario, Usuario),
          Nombre = COALESCE(@AdminNombre, Nombre),
          Rol = COALESCE(@Rol, Rol),
          Activo = COALESCE(@Activo, Activo),
          ActualizadoEn = SYSUTCDATETIME()
          ${setPass}
        WHERE UsuarioAdminId = @UsuarioAdminId;

        SELECT @@ROWCOUNT AS Afectadas;
      `)

    const afectUA = updUA.recordset?.[0]?.Afectadas || 0
    if (afectUA === 0) {
      await tx.rollback()
      return res.status(404).json({ error: "Usuario admin no encontrado" })
    }

    await tx.commit()
    res.json({ ok: true })
  } catch (e) {
    if (sqlUniqueViolation(e)) {
      return res.status(409).json({
        error: "Ya existe un usuario con ese Email o Usuario (login).",
      })
    }
    console.error("ERROR ACTUALIZANDO USUARIO:", e)
    res.status(500).json({ error: "Error actualizando usuario" })
  }
}

// ✅ Frontend usa PUT
app.put("/api/admin/usuarios/:id", authRequired, updateAdminUsuarioHandler)
// ✅ Mantengo PATCH por compatibilidad (si lo usás en algún lugar)
app.patch("/api/admin/usuarios/:id", authRequired, updateAdminUsuarioHandler)

// DELETE (soft delete: desactivar)
app.delete("/api/admin/usuarios/:id", authRequired, async (req, res) => {
  const usuarioAdminId = isFiniteId(req.params.id)
  if (!usuarioAdminId) return res.status(400).json({ error: "Id inválido" })

  try {
    await detectSchemaOnce()
    if (!schema.uaUsuarioId) {
      return res.status(500).json({
        error: "La BD no tiene dbo.UsuarioAdmin.UsuarioId. Agregalo para habilitar administración de usuarios.",
      })
    }

    const tx = new sql.Transaction()
    await tx.begin()

    const curR = await new sql.Request(tx)
      .input("UsuarioAdminId", sql.Int, usuarioAdminId)
      .query(`
        SELECT TOP 1 UsuarioAdminId, UsuarioId
        FROM dbo.UsuarioAdmin
        WHERE UsuarioAdminId = @UsuarioAdminId
      `)

    const cur = curR.recordset?.[0]
    if (!cur) {
      await tx.rollback()
      return res.status(404).json({ error: "Usuario admin no encontrado" })
    }

    // Desactivar UsuarioAdmin
    await new sql.Request(tx)
      .input("UsuarioAdminId", sql.Int, usuarioAdminId)
      .query(`
        UPDATE dbo.UsuarioAdmin
        SET Activo = 0,
            ActualizadoEn = SYSUTCDATETIME()
        WHERE UsuarioAdminId = @UsuarioAdminId
      `)

    // Desactivar Usuario (contacto) si existe
    if (cur.UsuarioId) {
      await new sql.Request(tx)
        .input("UsuarioId", sql.Int, Number(cur.UsuarioId))
        .query(`
          UPDATE dbo.Usuario
          SET Activo = 0
          WHERE UsuarioId = @UsuarioId
        `)
    }

    await tx.commit()
    res.json({ ok: true })
  } catch (e) {
    console.error("ERROR ELIMINANDO (DESACTIVANDO) USUARIO:", e)
    res.status(500).json({ error: "Error eliminando usuario" })
  }
})

// ===============================
// PROVINCIAS (ADMIN)
// ===============================
app.get("/api/admin/provincias", authRequired, async (req, res) => {
  try {
    const r = await new sql.Request().query(`
      SELECT ProvinciaId, Nombre
      FROM dbo.Provincia
      ORDER BY Nombre
    `)
    res.json(r.recordset)
  } catch (e) {
    console.error("ERROR PROVINCIAS:", e)
    res.status(500).json({ error: "Error cargando provincias" })
  }
})

// ===============================
// DASHBOARD (ADMIN) - STATS / KPIs
// ===============================
app.get("/api/admin/stats", authRequired, async (req, res) => {
  try {
    const r = await new sql.Request().query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.Propiedad) AS PropiedadesTotal,
        (SELECT COUNT(*) FROM dbo.Propiedad WHERE Visible = 1 AND EstadoPublicacion = 'Publicado') AS PropiedadesPublicadas,
        (SELECT COUNT(*) FROM dbo.Propiedad WHERE EstadoPublicacion = 'Borrador') AS PropiedadesBorrador,
        (SELECT COUNT(*) FROM dbo.Lead) AS LeadsTotal,
        (SELECT COUNT(*) FROM dbo.Lead WHERE FechaCreacion >= CONVERT(date, GETDATE())) AS LeadsHoy,
        (SELECT COUNT(*) FROM dbo.Lead WHERE FechaCreacion >= DATEADD(day,-6, CONVERT(date, GETDATE()))) AS Leads7Dias;

      SELECT
        ISNULL(Estado, 'SinEstado') AS Estado,
        COUNT(*) AS Cantidad
      FROM dbo.Lead
      GROUP BY Estado
      ORDER BY Cantidad DESC;

      SELECT
        ISNULL(Canal, 'SinCanal') AS Canal,
        COUNT(*) AS Cantidad
      FROM dbo.Lead
      GROUP BY Canal
      ORDER BY Cantidad DESC;

      SELECT
        CONVERT(date, FechaCreacion) AS Fecha,
        COUNT(*) AS Cantidad
      FROM dbo.Lead
      WHERE FechaCreacion >= DATEADD(day,-13, CONVERT(date, GETDATE()))
      GROUP BY CONVERT(date, FechaCreacion)
      ORDER BY Fecha ASC;

      SELECT TOP 10
        l.PropiedadId,
        p.Titulo,
        COUNT(*) AS Cantidad
      FROM dbo.Lead l
      INNER JOIN dbo.Propiedad p ON p.PropiedadId = l.PropiedadId
      WHERE l.FechaCreacion >= DATEADD(day,-30, GETDATE())
      GROUP BY l.PropiedadId, p.Titulo
      ORDER BY Cantidad DESC, l.PropiedadId DESC;
    `)

    const resumen = r.recordsets?.[0]?.[0] || {}
    const leadsPorEstado = r.recordsets?.[1] || []
    const leadsPorCanal = r.recordsets?.[2] || []
    const leadsPorDia = r.recordsets?.[3] || []
    const topPropiedades = r.recordsets?.[4] || []

    res.json({ resumen, leadsPorEstado, leadsPorCanal, leadsPorDia, topPropiedades })
  } catch (e) {
    console.error("ERROR STATS:", e)
    res.status(500).json({ error: "Error cargando estadísticas" })
  }
})

// ===============================
// CATÁLOGOS (PÚBLICO)
// ===============================
app.get("/api/catalogos/provincias", async (req, res) => {
  try {
    const r = await new sql.Request().query(`
      SELECT ProvinciaId, Nombre
      FROM dbo.Provincia
      ORDER BY Nombre
    `)
    res.json(r.recordset || [])
  } catch (e) {
    console.error("ERROR CATALOGO PROVINCIAS:", e)
    res.status(500).json({ error: "Error cargando provincias" })
  }
})

app.get("/api/catalogos/tipos", async (req, res) => {
  try {
    const r = await new sql.Request().query(`
      SELECT DISTINCT p.Tipo
      FROM dbo.Propiedad p
      WHERE p.Visible = 1
        AND p.EstadoPublicacion = 'Publicado'
        AND p.Tipo IS NOT NULL
        AND LTRIM(RTRIM(p.Tipo)) <> ''
      ORDER BY p.Tipo
    `)
    res.json((r.recordset || []).map((x) => x.Tipo))
  } catch (e) {
    console.error("ERROR CATALOGO TIPOS:", e)
    res.status(500).json({ error: "Error cargando tipos" })
  }
})

app.get("/api/catalogos/condiciones", async (req, res) => {
  try {
    const r = await new sql.Request().query(`
      SELECT DISTINCT p.Condicion
      FROM dbo.Propiedad p
      WHERE p.Visible = 1
        AND p.EstadoPublicacion = 'Publicado'
        AND p.Condicion IS NOT NULL
        AND LTRIM(RTRIM(p.Condicion)) <> ''
      ORDER BY p.Condicion
    `)
    res.json((r.recordset || []).map((x) => x.Condicion))
  } catch (e) {
    console.error("ERROR CATALOGO CONDICIONES:", e)
    res.status(500).json({ error: "Error cargando condiciones" })
  }
})

// ===============================
// PROPIEDADES (ADMIN) - LISTADO
// ===============================
app.get("/api/admin/propiedades", authRequired, async (req, res) => {
  try {
    const r = await new sql.Request().query(`
      SELECT
        p.PropiedadId,
        p.CodigoPublico,
        p.Titulo,
        p.Tipo,
        p.Condicion,
        p.Precio,
        p.Moneda,
        pr.Nombre AS Provincia,
        p.Visible,
        p.EstadoPublicacion,
        p.Destacada,
        p.FechaCreacion
      FROM dbo.Propiedad p
      INNER JOIN dbo.Provincia pr ON pr.ProvinciaId = p.ProvinciaId
      ORDER BY p.PropiedadId DESC
    `)
    res.json(r.recordset)
  } catch (e) {
    console.error("ERROR LISTADO ADMIN:", e)
    res.status(500).json({ error: "Error cargando propiedades" })
  }
})

// ===============================
// PROPIEDADES (ADMIN) - DETALLE (incluye Agente)
// ===============================
app.get("/api/admin/propiedades/:id", authRequired, async (req, res) => {
  const id = isFiniteId(req.params.id)
  if (!id) return res.status(400).json({ error: "Id inválido" })

  try {
    const propR = await new sql.Request()
      .input("PropiedadId", sql.Int, id)
      .query(`
        SELECT TOP 1
          p.PropiedadId,
          p.CodigoPublico,
          p.Titulo,
          p.Descripcion,
          p.Tipo,
          p.Condicion,
          p.Precio,
          p.Moneda,
          p.ProvinciaId,
          pr.Nombre AS Provincia,
          p.DireccionDetallada,
          p.MetrosTerreno,
          p.MetrosConstruccion,
          p.Habitaciones,
          p.Banos,
          p.Parqueos,
          p.TieneCondominio,
          p.CuotaCondominio,
          p.EstadoPublicacion,
          p.Visible,
          p.Destacada,
          p.FechaCreacion,
          p.AgenteId,
          u.Nombre AS AgenteNombre,
          u.Apellidos AS AgenteApellidos,
          u.Email AS AgenteEmail,
          u.Telefono AS AgenteTelefono,
          u.WhatsApp AS AgenteWhatsApp
        FROM dbo.Propiedad p
        INNER JOIN dbo.Provincia pr ON pr.ProvinciaId = p.ProvinciaId
        LEFT JOIN dbo.Usuario u ON u.UsuarioId = p.AgenteId
        WHERE p.PropiedadId = @PropiedadId
      `)

    const propiedad = propR.recordset?.[0]
    if (!propiedad) return res.status(404).json({ error: "Propiedad no encontrada" })

    const fotosR = await new sql.Request()
      .input("PropiedadId", sql.Int, id)
      .query(`
        SELECT FotoId, PropiedadId, Url, EsPrincipal, Orden, AltText, FechaCreacion
        FROM dbo.PropiedadFoto
        WHERE PropiedadId = @PropiedadId
        ORDER BY EsPrincipal DESC, Orden ASC
      `)

    propiedad.Fotos = fotosR.recordset || []
    propiedad.Agente = {
      UsuarioId: propiedad.AgenteId || null,
      Nombre: propiedad.AgenteNombre || null,
      Apellidos: propiedad.AgenteApellidos || null,
      Email: propiedad.AgenteEmail || null,
      Telefono: propiedad.AgenteTelefono || null,
      WhatsApp: propiedad.AgenteWhatsApp || null,
    }

    delete propiedad.AgenteNombre
    delete propiedad.AgenteApellidos
    delete propiedad.AgenteEmail
    delete propiedad.AgenteTelefono
    delete propiedad.AgenteWhatsApp

    res.json(propiedad)
  } catch (e) {
    console.error("ERROR DETALLE ADMIN:", e)
    res.status(500).json({ error: "Error cargando detalle (admin)" })
  }
})

// ===============================
// PROPIEDADES (ADMIN) - CREAR
// AgenteId = dbo.UsuarioId (FK real)
// Robustez: si el token no trae usuarioId (token viejo), lo buscamos por usuarioAdminId
// ===============================
app.post("/api/admin/propiedades", authRequired, async (req, res) => {
  const b = req.body || {}
  const codigoPublico = `PROP-${Date.now()}`

  let agenteId = req.user?.usuarioId

  try {
    await detectSchemaOnce()

    if (!agenteId && schema.uaUsuarioId && req.user?.usuarioAdminId) {
      const rr = await new sql.Request()
        .input("UsuarioAdminId", sql.Int, Number(req.user.usuarioAdminId))
        .query(`
          SELECT TOP 1 UsuarioId
          FROM dbo.UsuarioAdmin
          WHERE UsuarioAdminId = @UsuarioAdminId
        `)
      agenteId = rr.recordset?.[0]?.UsuarioId || null
    }

    if (!agenteId) {
      return res.status(500).json({
        error:
          "No se pudo determinar el UsuarioId (agente) del admin. " +
          "Verificá que dbo.UsuarioAdmin tenga UsuarioId y que el admin esté vinculado a dbo.Usuario.",
      })
    }

    const r = await new sql.Request()
      .input("CodigoPublico", sql.NVarChar(60), codigoPublico)
      .input("Titulo", sql.NVarChar(320), b.Titulo)
      .input("Descripcion", sql.NVarChar(sql.MAX), b.Descripcion || null)
      .input("Tipo", sql.NVarChar(60), b.Tipo)
      .input("Condicion", sql.NVarChar(60), b.Condicion || null)
      .input("Precio", sql.Decimal(18, 2), b.Precio)
      .input("Moneda", sql.NVarChar(20), b.Moneda)
      .input("ProvinciaId", sql.TinyInt, b.ProvinciaId)
      .input("DireccionDetallada", sql.NVarChar(250), b.DireccionDetallada || null)
      .input("MetrosTerreno", sql.Decimal(10, 2), b.MetrosTerreno || null)
      .input("MetrosConstruccion", sql.Decimal(10, 2), b.MetrosConstruccion || null)
      .input("Habitaciones", sql.TinyInt, b.Habitaciones || null)
      .input("Banos", sql.TinyInt, b.Banos || null)
      .input("Parqueos", sql.TinyInt, b.Parqueos || null)
      .input("TieneCondominio", sql.Bit, b.TieneCondominio ? 1 : 0)
      .input("CuotaCondominio", sql.Decimal(10, 2), b.CuotaCondominio || null)
      .input("EstadoPublicacion", sql.NVarChar(20), b.EstadoPublicacion || "Borrador")
      .input("Visible", sql.Bit, b.Visible ? 1 : 0)
      .input("Destacada", sql.Bit, b.Destacada ? 1 : 0)
      .input("AgenteId", sql.Int, agenteId)
      .query(`
        INSERT INTO dbo.Propiedad (
          CodigoPublico, Titulo, Descripcion,
          Tipo, Condicion,
          Precio, Moneda, ProvinciaId,
          DireccionDetallada, MetrosTerreno, MetrosConstruccion,
          Habitaciones, Banos, Parqueos,
          TieneCondominio, CuotaCondominio,
          EstadoPublicacion, Visible, Destacada,
          AgenteId, FechaCreacion
        )
        OUTPUT INSERTED.PropiedadId
        VALUES (
          @CodigoPublico, @Titulo, @Descripcion,
          @Tipo, @Condicion,
          @Precio, @Moneda, @ProvinciaId,
          @DireccionDetallada, @MetrosTerreno, @MetrosConstruccion,
          @Habitaciones, @Banos, @Parqueos,
          @TieneCondominio, @CuotaCondominio,
          @EstadoPublicacion, @Visible, @Destacada,
          @AgenteId, GETDATE()
        )
      `)

    res.json({ PropiedadId: r.recordset[0].PropiedadId })
  } catch (e) {
    console.error("ERROR CREATE PROPIEDAD:", e)
    res.status(500).json({ error: "Error creando propiedad" })
  }
})

// ===============================
// PROPIEDADES (ADMIN) - UPDATE
// ===============================
app.put("/api/admin/propiedades/:id", authRequired, async (req, res) => {
  const id = isFiniteId(req.params.id)
  if (!id) return res.status(400).json({ error: "Id inválido" })
  const b = req.body || {}

  try {
    const r = await new sql.Request()
      .input("PropiedadId", sql.Int, id)
      .input("Titulo", sql.NVarChar(320), b.Titulo)
      .input("Descripcion", sql.NVarChar(sql.MAX), b.Descripcion || null)
      .input("Tipo", sql.NVarChar(60), b.Tipo)
      .input("Condicion", sql.NVarChar(60), b.Condicion || null)
      .input("Precio", sql.Decimal(18, 2), b.Precio)
      .input("Moneda", sql.NVarChar(20), b.Moneda)
      .input("ProvinciaId", sql.TinyInt, b.ProvinciaId)
      .input("DireccionDetallada", sql.NVarChar(250), b.DireccionDetallada || null)
      .input("MetrosTerreno", sql.Decimal(10, 2), b.MetrosTerreno || null)
      .input("MetrosConstruccion", sql.Decimal(10, 2), b.MetrosConstruccion || null)
      .input("Habitaciones", sql.TinyInt, b.Habitaciones || null)
      .input("Banos", sql.TinyInt, b.Banos || null)
      .input("Parqueos", sql.TinyInt, b.Parqueos || null)
      .input("TieneCondominio", sql.Bit, b.TieneCondominio ? 1 : 0)
      .input("CuotaCondominio", sql.Decimal(10, 2), b.CuotaCondominio || null)
      .input("EstadoPublicacion", sql.NVarChar(20), b.EstadoPublicacion || "Borrador")
      .input("Visible", sql.Bit, b.Visible ? 1 : 0)
      .input("Destacada", sql.Bit, b.Destacada ? 1 : 0)
      .query(`
        UPDATE dbo.Propiedad
        SET
          Titulo = @Titulo,
          Descripcion = @Descripcion,
          Tipo = @Tipo,
          Condicion = @Condicion,
          Precio = @Precio,
          Moneda = @Moneda,
          ProvinciaId = @ProvinciaId,
          DireccionDetallada = @DireccionDetallada,
          MetrosTerreno = @MetrosTerreno,
          MetrosConstruccion = @MetrosConstruccion,
          Habitaciones = @Habitaciones,
          Banos = @Banos,
          Parqueos = @Parqueos,
          TieneCondominio = @TieneCondominio,
          CuotaCondominio = @CuotaCondominio,
          EstadoPublicacion = @EstadoPublicacion,
          Visible = @Visible,
          Destacada = @Destacada
        WHERE PropiedadId = @PropiedadId;

        SELECT @@ROWCOUNT AS Afectadas;
      `)

    const afectadas = r.recordset?.[0]?.Afectadas || 0
    if (afectadas === 0) return res.status(404).json({ error: "Propiedad no encontrada" })

    res.json({ ok: true })
  } catch (e) {
    console.error("ERROR UPDATE PROPIEDAD:", e)
    res.status(500).json({ error: "Error actualizando propiedad" })
  }
})

// ===============================
// PROPIEDADES (ADMIN) - DELETE
// ===============================
app.delete("/api/admin/propiedades/:id", authRequired, async (req, res) => {
  const id = isFiniteId(req.params.id)
  if (!id) return res.status(400).json({ error: "Id inválido" })

  const tx = new sql.Transaction()
  try {
    await tx.begin()

    await new sql.Request(tx).input("PropiedadId", sql.Int, id).query(`
      DELETE FROM dbo.PropiedadFoto WHERE PropiedadId = @PropiedadId;
    `)

    const del = await new sql.Request(tx).input("PropiedadId", sql.Int, id).query(`
      DELETE FROM dbo.Propiedad WHERE PropiedadId = @PropiedadId;
      SELECT @@ROWCOUNT AS Afectadas;
    `)

    const afectadas = del.recordset?.[0]?.Afectadas || 0
    if (afectadas === 0) {
      await tx.rollback()
      return res.status(404).json({ error: "Propiedad no encontrada" })
    }

    await tx.commit()
    res.json({ ok: true })
  } catch (e) {
    try {
      await tx.rollback()
    } catch {}
    console.error("ERROR DELETE PROPIEDAD:", e)
    res.status(500).json({ error: "Error eliminando propiedad" })
  }
})

// ===============================
// FOTOS (ADMIN) - LISTAR
// ===============================
app.get("/api/admin/propiedades/:id/fotos", authRequired, async (req, res) => {
  const propiedadId = isFiniteId(req.params.id)
  if (!propiedadId) return res.status(400).json({ error: "Id inválido" })

  try {
    const r = await new sql.Request()
      .input("PropiedadId", sql.Int, propiedadId)
      .query(`
        SELECT FotoId, PropiedadId, Url, EsPrincipal, Orden, AltText, FechaCreacion
        FROM dbo.PropiedadFoto
        WHERE PropiedadId = @PropiedadId
        ORDER BY EsPrincipal DESC, Orden ASC
      `)

    res.json(r.recordset || [])
  } catch (e) {
    console.error("ERROR LISTANDO FOTOS:", e)
    res.status(500).json({ error: "Error listando fotos" })
  }
})

// ===============================
// FOTOS (ADMIN) - SUBIR
// ===============================
app.post(
  "/api/admin/propiedades/:id/fotos",
  authRequired,
  upload.fields([
    { name: "fotos", maxCount: 20 },
    { name: "imagenes", maxCount: 20 },
  ]),
  async (req, res) => {
    const propiedadId = isFiniteId(req.params.id)
    if (!propiedadId) return res.status(400).json({ error: "Id inválido" })

    const filesFotos = (req.files && req.files.fotos) || []
    const filesImgs = (req.files && req.files.imagenes) || []
    const files = [...filesFotos, ...filesImgs]

    if (!files.length) {
      return res.status(400).json({ error: "No se recibieron fotos (campo esperado: fotos)" })
    }

    try {
      const infoR = await new sql.Request()
        .input("PropiedadId", sql.Int, propiedadId)
        .query(`
          SELECT
            ISNULL(MAX(Orden), 0) AS MaxOrden,
            SUM(CASE WHEN EsPrincipal = 1 THEN 1 ELSE 0 END) AS Principales
          FROM dbo.PropiedadFoto
          WHERE PropiedadId = @PropiedadId
        `)

      const maxOrden = Number(infoR.recordset?.[0]?.MaxOrden || 0)
      const tienePrincipal = Number(infoR.recordset?.[0]?.Principales || 0) > 0

      const urls = []
      for (const f of files) {
        const up = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "inmobiliaria" },
            (err, result) => (err ? reject(err) : resolve(result))
          )
          stream.end(f.buffer)
        })
        urls.push(up.secure_url)
      }

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]
        const orden = maxOrden + i + 1
        const esPrincipal = !tienePrincipal && i === 0 ? 1 : 0

        await new sql.Request()
          .input("PropiedadId", sql.Int, propiedadId)
          .input("Url", sql.NVarChar(400), url)
          .input("EsPrincipal", sql.Bit, esPrincipal)
          .input("Orden", sql.Int, orden)
          .input("AltText", sql.NVarChar(160), null)
          .query(`
            INSERT INTO dbo.PropiedadFoto (PropiedadId, Url, EsPrincipal, Orden, AltText, FechaCreacion)
            VALUES (@PropiedadId, @Url, @EsPrincipal, @Orden, @AltText, GETDATE())
          `)
      }

      res.json({ ok: true, imagenes: urls })
    } catch (e) {
      console.error("ERROR SUBIENDO FOTOS:", e)
      res.status(500).json({ error: "Error subiendo imágenes" })
    }
  }
)

// ===============================
// FOTOS (ADMIN) - ELIMINAR
// ===============================
app.delete("/api/admin/propiedades/:id/fotos/:fotoId", authRequired, async (req, res) => {
  const propiedadId = isFiniteId(req.params.id)
  const fotoId = isFiniteId(req.params.fotoId)
  if (!propiedadId || !fotoId) return res.status(400).json({ error: "Id inválido" })

  const tx = new sql.Transaction()
  try {
    await tx.begin()

    const chk = await new sql.Request(tx)
      .input("PropiedadId", sql.Int, propiedadId)
      .input("FotoId", sql.Int, fotoId)
      .query(`
        SELECT TOP 1 EsPrincipal
        FROM dbo.PropiedadFoto
        WHERE PropiedadId = @PropiedadId AND FotoId = @FotoId
      `)

    if (!chk.recordset?.length) {
      await tx.rollback()
      return res.status(404).json({ error: "Foto no encontrada" })
    }

    const eraPrincipal = chk.recordset[0].EsPrincipal === true || chk.recordset[0].EsPrincipal === 1

    await new sql.Request(tx)
      .input("PropiedadId", sql.Int, propiedadId)
      .input("FotoId", sql.Int, fotoId)
      .query(`
        DELETE FROM dbo.PropiedadFoto
        WHERE PropiedadId = @PropiedadId AND FotoId = @FotoId
      `)

    if (eraPrincipal) {
      const next = await new sql.Request(tx)
        .input("PropiedadId", sql.Int, propiedadId)
        .query(`
          SELECT TOP 1 FotoId
          FROM dbo.PropiedadFoto
          WHERE PropiedadId = @PropiedadId
          ORDER BY Orden ASC
        `)

      if (next.recordset?.length) {
        const nextId = next.recordset[0].FotoId

        await new sql.Request(tx)
          .input("PropiedadId", sql.Int, propiedadId)
          .query(`
            UPDATE dbo.PropiedadFoto
            SET EsPrincipal = 0
            WHERE PropiedadId = @PropiedadId
          `)

        await new sql.Request(tx)
          .input("PropiedadId", sql.Int, propiedadId)
          .input("FotoId", sql.Int, nextId)
          .query(`
            UPDATE dbo.PropiedadFoto
            SET EsPrincipal = 1
            WHERE PropiedadId = @PropiedadId AND FotoId = @FotoId
          `)
      }
    }

    await tx.commit()
    res.json({ ok: true })
  } catch (e) {
    try {
      await tx.rollback()
    } catch {}
    console.error("ERROR DELETE FOTO:", e)
    res.status(500).json({ error: "Error eliminando foto" })
  }
})

// ===============================
// FOTOS (ADMIN) - PRINCIPAL
// ===============================
app.patch("/api/admin/propiedades/:id/fotos/:fotoId/principal", authRequired, async (req, res) => {
  const propiedadId = isFiniteId(req.params.id)
  const fotoId = isFiniteId(req.params.fotoId)
  if (!propiedadId || !fotoId) return res.status(400).json({ error: "Id inválido" })

  const tx = new sql.Transaction()
  try {
    await tx.begin()

    const chk = await new sql.Request(tx)
      .input("PropiedadId", sql.Int, propiedadId)
      .input("FotoId", sql.Int, fotoId)
      .query(`
        SELECT TOP 1 FotoId
        FROM dbo.PropiedadFoto
        WHERE PropiedadId = @PropiedadId AND FotoId = @FotoId
      `)

    if (!chk.recordset?.length) {
      await tx.rollback()
      return res.status(404).json({ error: "Foto no encontrada" })
    }

    await new sql.Request(tx)
      .input("PropiedadId", sql.Int, propiedadId)
      .query(`
        UPDATE dbo.PropiedadFoto
        SET EsPrincipal = 0
        WHERE PropiedadId = @PropiedadId
      `)

    await new sql.Request(tx)
      .input("PropiedadId", sql.Int, propiedadId)
      .input("FotoId", sql.Int, fotoId)
      .query(`
        UPDATE dbo.PropiedadFoto
        SET EsPrincipal = 1
        WHERE PropiedadId = @PropiedadId AND FotoId = @FotoId
      `)

    await tx.commit()
    res.json({ ok: true })
  } catch (e) {
    try {
      await tx.rollback()
    } catch {}
    console.error("ERROR SET PRINCIPAL:", e)
    res.status(500).json({ error: "Error marcando principal" })
  }
})

// ===============================
// FOTOS (ADMIN) - ALT TEXT
// ===============================
app.patch("/api/admin/propiedades/:id/fotos/:fotoId", authRequired, async (req, res) => {
  const propiedadId = isFiniteId(req.params.id)
  const fotoId = isFiniteId(req.params.fotoId)
  if (!propiedadId || !fotoId) return res.status(400).json({ error: "Id inválido" })

  let alt = req.body?.AltText
  if (alt == null || String(alt).trim() === "") alt = null
  else alt = String(alt).trim()

  if (alt && alt.length > 160) {
    return res.status(400).json({ error: "AltText máximo 160 caracteres" })
  }

  try {
    const r = await new sql.Request()
      .input("PropiedadId", sql.Int, propiedadId)
      .input("FotoId", sql.Int, fotoId)
      .input("AltText", sql.NVarChar(160), alt)
      .query(`
        UPDATE dbo.PropiedadFoto
        SET AltText = @AltText
        WHERE PropiedadId = @PropiedadId AND FotoId = @FotoId;

        SELECT @@ROWCOUNT AS Afectadas;
      `)

    const afectadas = r.recordset?.[0]?.Afectadas || 0
    if (afectadas === 0) return res.status(404).json({ error: "Foto no encontrada" })

    res.json({ ok: true })
  } catch (e) {
    console.error("ERROR ALT TEXT:", e)
    res.status(500).json({ error: "Error guardando AltText" })
  }
})

// ===============================
// FOTOS (ADMIN) - REORDENAR
// ===============================
app.patch("/api/admin/propiedades/:id/fotos/orden", authRequired, async (req, res) => {
  const propiedadId = isFiniteId(req.params.id)
  if (!propiedadId) return res.status(400).json({ error: "Id inválido" })

  const orden = req.body?.orden
  if (!Array.isArray(orden) || orden.length === 0) {
    return res.status(400).json({ error: "Body inválido: orden debe ser un arreglo" })
  }

  const tx = new sql.Transaction()
  try {
    await tx.begin()

    for (const item of orden) {
      const fotoId = isFiniteId(item?.FotoId)
      const ord = isFiniteId(item?.Orden)
      if (!fotoId || !ord) continue

      await new sql.Request(tx)
        .input("PropiedadId", sql.Int, propiedadId)
        .input("FotoId", sql.Int, fotoId)
        .input("Orden", sql.Int, ord)
        .query(`
          UPDATE dbo.PropiedadFoto
          SET Orden = @Orden
          WHERE PropiedadId = @PropiedadId AND FotoId = @FotoId
        `)
    }

    await tx.commit()
    res.json({ ok: true })
  } catch (e) {
    try {
      await tx.rollback()
    } catch {}
    console.error("ERROR REORDEN:", e)
    res.status(500).json({ error: "Error reordenando fotos" })
  }
})

// ===============================
// PUBLICO - LISTADO (CON FILTROS + ORDEN)
// ===============================
app.get("/api/propiedades", async (req, res) => {
  try {
    const q = clipStr(req.query.q, 120)
    const provinciaId = isFiniteId(req.query.provinciaId)
    const tipo = clipStr(req.query.tipo, 60)
    const condicion = clipStr(req.query.condicion, 60)

    const precioMin = safeNumber(req.query.precioMin)
    const precioMax = safeNumber(req.query.precioMax)
    const habMin = safeNumber(req.query.habMin)
    const banosMin = safeNumber(req.query.banosMin)

    const order = clipStr(req.query.order, 30) || "recientes"

    const topRaw = isFiniteId(req.query.top)
    const top = topRaw ? Math.min(Math.max(topRaw, 1), 500) : 200

    const r = new sql.Request()
    r.input("Top", sql.Int, top)

    let where = `
      WHERE p.Visible = 1
        AND p.EstadoPublicacion = 'Publicado'
    `

    if (q) {
      where += `
        AND (
          p.Titulo LIKE @Q
          OR p.Descripcion LIKE @Q
          OR p.CodigoPublico LIKE @Q
          OR p.DireccionDetallada LIKE @Q
          OR pr.Nombre LIKE @Q
        )
      `
      r.input("Q", sql.NVarChar(140), `%${q}%`)
    }

    if (provinciaId) {
      where += ` AND p.ProvinciaId = @ProvinciaId `
      r.input("ProvinciaId", sql.TinyInt, provinciaId)
    }

    if (tipo) {
      where += ` AND p.Tipo = @Tipo `
      r.input("Tipo", sql.NVarChar(60), tipo)
    }

    if (condicion) {
      where += ` AND p.Condicion = @Condicion `
      r.input("Condicion", sql.NVarChar(60), condicion)
    }

    if (precioMin != null) {
      where += ` AND p.Precio >= @PrecioMin `
      r.input("PrecioMin", sql.Decimal(18, 2), precioMin)
    }

    if (precioMax != null) {
      where += ` AND p.Precio <= @PrecioMax `
      r.input("PrecioMax", sql.Decimal(18, 2), precioMax)
    }

    if (habMin != null) {
      where += ` AND ISNULL(p.Habitaciones, 0) >= @HabMin `
      r.input("HabMin", sql.Int, habMin)
    }

    if (banosMin != null) {
      where += ` AND ISNULL(p.Banos, 0) >= @BanosMin `
      r.input("BanosMin", sql.Int, banosMin)
    }

    const orderBy =
      order === "precio_asc"
        ? "ORDER BY p.Precio ASC, p.FechaCreacion DESC"
        : order === "precio_desc"
        ? "ORDER BY p.Precio DESC, p.FechaCreacion DESC"
        : "ORDER BY p.FechaCreacion DESC"

    const data = await r.query(`
      SELECT TOP (@Top)
        p.PropiedadId,
        p.CodigoPublico,
        p.Titulo,
        p.Tipo,
        p.Condicion,
        p.Precio,
        p.Moneda,
        p.ProvinciaId,
        pr.Nombre AS Provincia,
        p.Habitaciones,
        p.Banos,
        p.Parqueos,
        p.MetrosTerreno,
        p.MetrosConstruccion,
        p.FechaCreacion,
        f.Url AS Imagen
      FROM dbo.Propiedad p
      INNER JOIN dbo.Provincia pr ON pr.ProvinciaId = p.ProvinciaId
      OUTER APPLY (
        SELECT TOP 1 Url
        FROM dbo.PropiedadFoto
        WHERE PropiedadId = p.PropiedadId
        ORDER BY EsPrincipal DESC, Orden ASC
      ) f
      ${where}
      ${orderBy}
    `)

    res.json(data.recordset || [])
  } catch (e) {
    console.error("ERROR LISTADO PUBLICO:", e)
    res.status(500).json({ error: "Error cargando propiedades" })
  }
})

// ===============================
// PUBLICO - DETALLE (incluye Agente)
// ===============================
app.get("/api/propiedades/:id", async (req, res) => {
  const id = isFiniteId(req.params.id)
  if (!id) return res.status(400).json({ error: "Id inválido" })

  try {
    const propR = await new sql.Request()
      .input("PropiedadId", sql.Int, id)
      .query(`
        SELECT TOP 1
          p.PropiedadId,
          p.CodigoPublico,
          p.Titulo,
          p.Descripcion,
          p.Tipo,
          p.Condicion,
          p.Precio,
          p.Moneda,
          p.ProvinciaId,
          pr.Nombre AS Provincia,
          p.DireccionDetallada,
          p.MetrosTerreno,
          p.MetrosConstruccion,
          p.Habitaciones,
          p.Banos,
          p.Parqueos,
          p.TieneCondominio,
          p.CuotaCondominio,
          p.AgenteId,
          u.Nombre AS AgenteNombre,
          u.Apellidos AS AgenteApellidos,
          u.Email AS AgenteEmail,
          u.Telefono AS AgenteTelefono,
          u.WhatsApp AS AgenteWhatsApp
        FROM dbo.Propiedad p
        INNER JOIN dbo.Provincia pr ON pr.ProvinciaId = p.ProvinciaId
        LEFT JOIN dbo.Usuario u ON u.UsuarioId = p.AgenteId
        WHERE p.PropiedadId = @PropiedadId
          AND p.Visible = 1
          AND p.EstadoPublicacion = 'Publicado'
      `)

    const propiedad = propR.recordset?.[0]
    if (!propiedad) return res.status(404).json({ error: "Propiedad no encontrada" })

    const fotosR = await new sql.Request()
      .input("PropiedadId", sql.Int, id)
      .query(`
        SELECT Url, EsPrincipal, Orden
        FROM dbo.PropiedadFoto
        WHERE PropiedadId = @PropiedadId
        ORDER BY EsPrincipal DESC, Orden ASC
      `)

    propiedad.Fotos = fotosR.recordset || []
    propiedad.Agente = {
      UsuarioId: propiedad.AgenteId || null,
      Nombre: propiedad.AgenteNombre || null,
      Apellidos: propiedad.AgenteApellidos || null,
      Email: propiedad.AgenteEmail || null,
      Telefono: propiedad.AgenteTelefono || null,
      WhatsApp: propiedad.AgenteWhatsApp || null,
    }

    delete propiedad.AgenteNombre
    delete propiedad.AgenteApellidos
    delete propiedad.AgenteEmail
    delete propiedad.AgenteTelefono
    delete propiedad.AgenteWhatsApp

    res.json(propiedad)
  } catch (e) {
    console.error("ERROR DETALLE PUBLICO:", e)
    res.status(500).json({ error: "Error cargando detalle" })
  }
})

// ===============================
// LEADS (PUBLICO) - CREAR
// Auto-asignar al agente de la propiedad si existe columna AsignadoAId
// ===============================
app.post("/api/leads", rateLimitLeads, async (req, res) => {
  const b = req.body || {}

  const propiedadId = isFiniteId(b.PropiedadId)
  const nombre = clipStr(b.Nombre, 120)
  const telefono = clipStr(b.Telefono, 40)
  const email = clipStr(b.Email, 160)
  const mensaje = clipStr(b.Mensaje, 1000)
  const canal = clipStr(b.Canal, 20) || "web"

  const hp = clipStr(b._hp, 40)
  if (hp) return res.status(200).json({ ok: true })

  if (!propiedadId) return res.status(400).json({ error: "PropiedadId inválido" })
  if (!nombre) return res.status(400).json({ error: "Nombre es requerido" })
  if (!telefono && !email) return res.status(400).json({ error: "Ingresá teléfono o email" })

  try {
    await detectSchemaOnce()

    const chk = await new sql.Request()
      .input("PropiedadId", sql.Int, propiedadId)
      .query(`
        SELECT TOP 1 PropiedadId, AgenteId
        FROM dbo.Propiedad
        WHERE PropiedadId = @PropiedadId
          AND Visible = 1
          AND EstadoPublicacion = 'Publicado'
      `)

    const prop = chk.recordset?.[0]
    if (!prop) {
      return res.status(404).json({ error: "Propiedad no disponible" })
    }

    const ip = clipStr(getClientIp(req), 45)
    const ua = clipStr(req.headers["user-agent"], 300)
    const telDb = telefono ? telefono.slice(0, 25) : null

    if (schema.leadAsignadoAId) {
      const ins = await new sql.Request()
        .input("PropiedadId", sql.Int, propiedadId)
        .input("Nombre", sql.NVarChar(120), nombre)
        .input("Email", sql.NVarChar(160), email)
        .input("Telefono", sql.NVarChar(25), telDb)
        .input("Mensaje", sql.NVarChar(1000), mensaje)
        .input("Canal", sql.NVarChar(20), canal)
        .input("Estado", sql.NVarChar(20), "Nuevo")
        .input("Ip", sql.NVarChar(45), ip)
        .input("UserAgent", sql.NVarChar(300), ua)
        .input("AsignadoAId", sql.Int, prop.AgenteId || null)
        .query(`
          INSERT INTO dbo.Lead (PropiedadId, Nombre, Email, Telefono, Mensaje, Canal, Estado, Ip, UserAgent, AsignadoAId)
          OUTPUT INSERTED.LeadId
          VALUES (@PropiedadId, @Nombre, @Email, @Telefono, @Mensaje, @Canal, @Estado, @Ip, @UserAgent, @AsignadoAId)
        `)

      return res.json({ ok: true, LeadId: ins.recordset?.[0]?.LeadId })
    }

    const ins = await new sql.Request()
      .input("PropiedadId", sql.Int, propiedadId)
      .input("Nombre", sql.NVarChar(120), nombre)
      .input("Email", sql.NVarChar(160), email)
      .input("Telefono", sql.NVarChar(25), telDb)
      .input("Mensaje", sql.NVarChar(1000), mensaje)
      .input("Canal", sql.NVarChar(20), canal)
      .input("Estado", sql.NVarChar(20), "Nuevo")
      .input("Ip", sql.NVarChar(45), ip)
      .input("UserAgent", sql.NVarChar(300), ua)
      .query(`
        INSERT INTO dbo.Lead (PropiedadId, Nombre, Email, Telefono, Mensaje, Canal, Estado, Ip, UserAgent)
        OUTPUT INSERTED.LeadId
        VALUES (@PropiedadId, @Nombre, @Email, @Telefono, @Mensaje, @Canal, @Estado, @Ip, @UserAgent)
      `)

    return res.json({ ok: true, LeadId: ins.recordset?.[0]?.LeadId })
  } catch (e) {
    console.error("ERROR CREANDO LEAD:", e)
    res.status(500).json({ error: "Error enviando tu consulta" })
  }
})

// ===============================
// LEADS (ADMIN) - LISTAR
// ===============================
app.get("/api/admin/leads", authRequired, async (req, res) => {
  const estado = clipStr(req.query.estado, 20)
  const propiedadId = isFiniteId(req.query.propiedadId)
  const q = clipStr(req.query.q, 120)

  try {
    await detectSchemaOnce()

    const r = new sql.Request()

    let where = "WHERE 1=1 "
    if (estado) {
      where += " AND l.Estado = @Estado "
      r.input("Estado", sql.NVarChar(20), estado)
    }
    if (propiedadId) {
      where += " AND l.PropiedadId = @PropiedadId "
      r.input("PropiedadId", sql.Int, propiedadId)
    }
    if (q) {
      where += " AND (l.Nombre LIKE @Q OR l.Telefono LIKE @Q OR l.Email LIKE @Q OR p.Titulo LIKE @Q) "
      r.input("Q", sql.NVarChar(140), `%${q}%`)
    }

    const selAsignado = schema.leadAsignadoAId ? ", l.AsignadoAId" : ""
    const selFecha = schema.leadFechaCreacion ? ", l.FechaCreacion" : ""

    const data = await r.query(`
      SELECT
        l.LeadId,
        l.PropiedadId,
        p.Titulo AS PropiedadTitulo,
        l.Nombre,
        l.Telefono,
        l.Email,
        l.Mensaje,
        l.Canal,
        l.Estado,
        l.Notas
        ${selAsignado},
        l.Ip,
        l.UserAgent
        ${selFecha}
      FROM dbo.Lead l
      INNER JOIN dbo.Propiedad p ON p.PropiedadId = l.PropiedadId
      ${where}
      ORDER BY ${schema.leadFechaCreacion ? "l.FechaCreacion" : "l.LeadId"} DESC
    `)

    res.json(data.recordset || [])
  } catch (e) {
    console.error("ERROR LISTANDO LEADS:", e)
    res.status(500).json({ error: "Error listando leads" })
  }
})

// ===============================
// LEADS (ADMIN) - UPDATE
// ===============================
app.patch("/api/admin/leads/:leadId", authRequired, async (req, res) => {
  const leadId = isFiniteId(req.params.leadId)
  if (!leadId) return res.status(400).json({ error: "LeadId inválido" })

  const estado = clipStr(req.body?.Estado, 20)
  const notas = clipStr(req.body?.Notas, 1000)
  const asignadoAId = req.body?.AsignadoAId == null ? null : isFiniteId(req.body.AsignadoAId)

  const estadosValidos = new Set(["Nuevo", "Contactado", "Cerrado", "Descartado"])
  if (estado && !estadosValidos.has(estado)) {
    return res.status(400).json({ error: "Estado inválido" })
  }

  try {
    await detectSchemaOnce()

    const setAsignado = schema.leadAsignadoAId
      ? ", AsignadoAId = COALESCE(@AsignadoAId, AsignadoAId)"
      : ""

    const r = await new sql.Request()
      .input("LeadId", sql.Int, leadId)
      .input("Estado", sql.NVarChar(20), estado)
      .input("Notas", sql.NVarChar(1000), notas)
      .input("AsignadoAId", sql.Int, asignadoAId)
      .query(`
        UPDATE dbo.Lead
        SET
          Estado = COALESCE(@Estado, Estado),
          Notas = COALESCE(@Notas, Notas)
          ${setAsignado}
        WHERE LeadId = @LeadId;

        SELECT @@ROWCOUNT AS Afectadas;
      `)

    const afectadas = r.recordset?.[0]?.Afectadas || 0
    if (afectadas === 0) return res.status(404).json({ error: "Lead no encontrado" })

    res.json({ ok: true })
  } catch (e) {
    console.error("ERROR UPDATE LEAD:", e)
    res.status(500).json({ error: "Error actualizando lead" })
  }
})

// ===============================
// LEADS (ADMIN) - DELETE
// ===============================
app.delete("/api/admin/leads/:leadId", authRequired, async (req, res) => {
  const leadId = isFiniteId(req.params.leadId)
  if (!leadId) return res.status(400).json({ error: "LeadId inválido" })

  try {
    const r = await new sql.Request()
      .input("LeadId", sql.Int, leadId)
      .query(`
        DELETE FROM dbo.Lead WHERE LeadId = @LeadId;
        SELECT @@ROWCOUNT AS Afectadas;
      `)

    const afectadas = r.recordset?.[0]?.Afectadas || 0
    if (afectadas === 0) return res.status(404).json({ error: "Lead no encontrado" })

    res.json({ ok: true })
  } catch (e) {
    console.error("ERROR DELETE LEAD:", e)
    res.status(500).json({ error: "Error eliminando lead" })
  }
})

// ===============================
// HANDLER ERRORES MULTER
// ===============================
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("MULTER ERROR:", err)
    return res.status(400).json({ error: `Error de carga: ${err.message}` })
  }
  if (err) {
    console.error("ERROR NO CONTROLADO:", err)
    return res.status(500).json({ error: "Error interno del servidor" })
  }
  next()
})

// ✅ Escuchar en 0.0.0.0 y usar process.env.PORT
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor escuchando en puerto ${PORT}`)
})
