console.log(">>> Iniciando test-db.js");

require("dotenv").config();
const sql = require("mssql");

// Intenta varios nombres típicos
const HOST =
  process.env.DB_HOST ||
  process.env.DB_SERVER ||
  process.env.SQL_HOST ||
  process.env.SQL_SERVER ||
  process.env.SERVER;

const USER =
  process.env.DB_USER ||
  process.env.DB_USERNAME ||
  process.env.SQL_USER ||
  process.env.SQL_USERNAME ||
  process.env.USER;

const PASSWORD =
  process.env.DB_PASSWORD ||
  process.env.SQL_PASSWORD ||
  process.env.PASSWORD;

const DATABASE =
  process.env.DB_NAME ||
  process.env.SQL_DATABASE ||
  process.env.DATABASE;

const PORT = Number(process.env.DB_PORT || process.env.SQL_PORT || 1433);

console.log(">>> Variables detectadas:", {
  HOST,
  PORT,
  DATABASE,
  USER: USER ? "(ok)" : "(faltante)",
  PASSWORD: PASSWORD ? "(ok)" : "(faltante)",
});

(async () => {
  try {
    if (!HOST) throw new Error("Falta HOST: define DB_HOST (o equivalente) en .env");
    if (!USER) throw new Error("Falta USER: define DB_USER (o equivalente) en .env");
    if (!PASSWORD) throw new Error("Falta PASSWORD: define DB_PASSWORD (o equivalente) en .env");
    if (!DATABASE) throw new Error("Falta DATABASE: define DB_NAME (o equivalente) en .env");

    const config = {
      user: USER,
      password: PASSWORD,
      server: HOST,
      port: PORT,
      database: DATABASE,
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
      pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
      requestTimeout: 30000,
      connectionTimeout: 30000,
    };

    console.log(">>> Conectando a SQL...");
    const pool = await sql.connect(config);

    console.log(">>> Ejecutando SELECT 1...");
    const r = await pool.request().query("SELECT 1 as ok");

    console.log("✅ SELECT 1 OK:", r.recordset);

    await pool.close();
    process.exit(0);
  } catch (e) {
    console.error("❌ FALLÓ BD:", e);
    process.exit(1);
  }
})();
