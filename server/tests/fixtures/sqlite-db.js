// config/db.js
const mysql = require("mysql2");
const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

let activeDriver = null; // 'mysql' | 'sqlite'
let mysqlPool = null;
let sqliteDb = null;

const initDb = async () => {
  // 1. Try MySQL first if not explicitly disabled
  if (false) {
    try {
      const pool = mysql.createPool({
        host: process.env.DB_HOST || "127.0.0.1",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "material_optimization_db",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 1500,
      });

      const promisePool = pool.promise();
      const connection = await promisePool.getConnection();
      console.log("Successfully connected to the MySQL Database.");
      connection.release();
      mysqlPool = promisePool;
      activeDriver = "mysql";
      return;
    } catch (err) {
      console.warn(
        `MySQL connection unavailable on ${process.env.DB_HOST || "127.0.0.1"}:3306 (${err.code || err.message}).`,
      );
      console.log(
        "Falling back to local SQLite database (server/database/material_optimization.sqlite)...",
      );
    }
  }

  // 2. Fall back to local SQLite database
  try {
    const dbDir = path.join(__dirname, "../../database");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const sqlitePath =
      process.env.SQLITE_PATH ||
      path.join(dbDir, "material_optimization.sqlite");
    sqliteDb = new DatabaseSync(sqlitePath);
    sqliteDb.exec("PRAGMA foreign_keys = ON;");

    // Create tables if they do not exist
    sqliteDb.exec(`
            CREATE TABLE IF NOT EXISTS Users (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'viewer',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS Projects (
                project_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                owner_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES Users(user_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS Collaborators (
                project_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                permission_level TEXT DEFAULT 'read',
                PRIMARY KEY (project_id, user_id),
                FOREIGN KEY (project_id) REFERENCES Projects(project_id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS Material_Specs (
                spec_id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                max_weight REAL NOT NULL,
                target_cost REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES Projects(project_id) ON DELETE CASCADE
            );
        `);

    const columns = sqliteDb.prepare("PRAGMA table_info(Projects)").all();
    if (!columns.some((c) => c.name === "application"))
      sqliteDb.exec(
        "ALTER TABLE Projects ADD COLUMN application TEXT DEFAULT 'General Mechanical'",
      );
    activeDriver = "sqlite";
    console.log("Successfully connected to local SQLite Database.");
  } catch (err) {
    console.error("Failed to initialize local SQLite database:", err);
    throw err;
  }
};

const readyPromise = initDb();

// Serialize SQLite access so a transaction cannot absorb unrelated requests.
let sqliteQueue = Promise.resolve();
const acquire = async () => {
  const previous = sqliteQueue;
  let release;
  sqliteQueue = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  return release;
};
const sqliteExecute = (sql, params = []) => {
  const values = params.map((p) => (p === undefined ? null : p));
  const stmt = sqliteDb.prepare(sql.trim());
  if (/^SELECT/i.test(sql.trim())) return [stmt.all(...values), []];
  const result = stmt.run(...values);
  return [
    {
      insertId: Number(result.lastInsertRowid),
      affectedRows: Number(result.changes),
      changes: Number(result.changes),
    },
    [],
  ];
};
const execute = async (sql, params = []) => {
  await readyPromise;
  if (activeDriver === "mysql") return mysqlPool.execute(sql, params);
  const release = await acquire();
  try {
    return sqliteExecute(sql, params);
  } finally {
    release();
  }
};
const query = execute;
const getConnection = async () => {
  await readyPromise;
  if (activeDriver === "mysql") return mysqlPool.getConnection();
  const unlock = await acquire();
  let released = false;
  return {
    execute: async (sql, params) => sqliteExecute(sql, params),
    query: async (sql, params) => sqliteExecute(sql, params),
    beginTransaction: async () => sqliteDb.exec("BEGIN IMMEDIATE"),
    commit: async () => sqliteDb.exec("COMMIT"),
    rollback: async () => sqliteDb.exec("ROLLBACK"),
    release: () => {
      if (!released) {
        released = true;
        unlock();
      }
    },
  };
};

module.exports = {
  ready: readyPromise,
  driver: () => activeDriver,
  close: async () => {
    await readyPromise;
    if (mysqlPool) await mysqlPool.end();
    if (sqliteDb) sqliteDb.close();
  },
  tableColumns: (table) => sqliteDb.prepare(`PRAGMA table_info(${table})`).all(),
  execute,
  query,
  getConnection,
};
