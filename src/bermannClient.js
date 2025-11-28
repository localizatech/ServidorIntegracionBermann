const axios = require("axios");
const logger = require("./logger");

const AUTH_ENDPOINT = `/api/auth`;
const DATA_ENDPOINT = `/api/data/insert`;

let cachedTokenInfo = {
  token: null,
  expiresAt: 0,
};

async function authenticate({ force = false } = {}) {
  if (!force && cachedTokenInfo.token && Date.now() < cachedTokenInfo.expiresAt) {
    return cachedTokenInfo;
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

  // Bermann expone el JWT en "access_token" aunque la documentación menciona "token".
  const token = response.data?.token || response.data?.access_token;
  const expiresAt = Date.now() + 60 * 60 * 1000 - 30000; // 1 hora - 30s margen

  if (!token) {
    throw new Error("No se recibió token desde Bermann");
  }

  cachedTokenInfo = {
    token,
    expiresAt,
  };

  logger.info(
    `Token Bermann renovado (expira ${new Date(expiresAt).toISOString()})`
  );
  return cachedTokenInfo;
}

async function sendPayload(data) {
  const { token } = await authenticate();
  const url = `${process.env.BERMANN_BASE_URL}${DATA_ENDPOINT}`;

  logger.debug(
    `Enviando payload Bermann imei=${data.imei} patente=${data.patente} fecha=${data.fecha}`
  );

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
  authenticate,
  getTokenInfo: () => cachedTokenInfo,
  sendPayload,
};
