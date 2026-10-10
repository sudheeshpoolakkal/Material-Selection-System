// MySQL is mandatory at runtime. SQLite is confined to disposable unit tests.
if (process.env.NODE_ENV === "test" && process.env.USE_SQLITE === "true") {
  module.exports = require("../tests/fixtures/sqlite-db");
} else {
  const mysql = require("mysql2/promise");
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "materia",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "material_optimization_db",
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 100,
    connectTimeout: 5000,
  });
  const ready = pool.getConnection().then((connection) => {
    connection.release();
    console.log("Connected to MySQL.");
  }).catch(async (error) => {
    await pool.end();
    throw new Error(`MySQL is unavailable (${error.code || "connection error"}). Configure DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME. No fallback catalog is used.`);
  });
  module.exports = {
    ready,
    driver: () => "mysql",
    execute: async (sql, params = []) => { await ready; return pool.execute(sql, params); },
    query: async (sql, params = []) => { await ready; return pool.query(sql, params); },
    getConnection: async () => { await ready; return pool.getConnection(); },
    close: async () => { await ready; await pool.end(); },
  };
}
