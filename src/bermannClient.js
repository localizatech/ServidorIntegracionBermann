const axios = require("axios");
const logger = require("./logger");

const AUTH_ENDPOINT = `/api/auth`;
const DATA_ENDPOINT = `/api/data/insert`;

let cachedToken = null;
let tokenExpiresAt = 0;

async function authenticate() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const payload = {
    id_cliente_externo: Number(process.env.BERMANN_CLIENT_ID),
    nombre_usuario: process.env.BERMANN_USERNAME,
    password_usuario: process.env.BERMANN_PASSWORD,
  };

  const url = `${process.env.BERMANN_BASE_URL}${AUTH_ENDPOINT}`;

  const response = await axios.post(url, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 5000,
  });

  cachedToken = response.data?.token;
  tokenExpiresAt = Date.now() + 60 * 60 * 1000 - 30000; // 1 hora - 30s margen

  if (!cachedToken) {
    throw new Error("No se recibió token desde Bermann");
  }

  logger.info("Token Bermann renovado");
  return cachedToken;
}

async function sendPayload(data) {
  const token = await authenticate();
  const url = `${process.env.BERMANN_BASE_URL}${DATA_ENDPOINT}`;

  const response = await axios.post(url, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    timeout: 10000,
  });

  return response.data;
}

module.exports = {
  sendPayload,
};
