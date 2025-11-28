const mysql = require("mysql");
const util = require("util");
const logger = require("./logger");

const poolConfig = {
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: process.env.DB_CHARSET || "utf8mb4",
  timezone: process.env.DB_TIMEZONE || "Z",
};

const pool = mysql.createPool(poolConfig);

pool.on("connection", () => logger.debug("Conexión MySQL establecida"));
pool.on("acquire", () => logger.trace("Conexión MySQL adquirida"));
pool.on("release", () => logger.trace("Conexión MySQL liberada"));

const poolQuery = util.promisify(pool.query).bind(pool);
const poolGetConnection = util.promisify(pool.getConnection).bind(pool);
const poolEnd = util.promisify(pool.end).bind(pool);

async function query(sql, params = []) {
  try {
    return await poolQuery(sql, params);
  } catch (error) {
    logger.error(`Error ejecutando query: ${error.message}`);
    throw error;
  }
}

async function getConnection() {
  try {
    return await poolGetConnection();
  } catch (error) {
    logger.error(`Error obteniendo conexión DB: ${error.message}`);
    throw error;
  }
}

async function closePool() {
  try {
    await poolEnd();
    logger.info("Pool MySQL cerrado correctamente");
  } catch (error) {
    logger.error(`Error cerrando pool DB: ${error.message}`);
    throw error;
  }
}

module.exports = {
  pool,
  query,
  getConnection,
  closePool,
};
