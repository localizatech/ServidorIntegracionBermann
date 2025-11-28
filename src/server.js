require("dotenv").config();

const logger = require("./logger");
const db = require("./db");
const bermannClient = require("./bermannClient");

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 60000);
const MAX_DB_RETRIES = Number(process.env.MAX_DB_RETRIES || 5);
const DB_RETRY_DELAY_MS = Number(process.env.DB_RETRY_DELAY_MS || 5000);

logger.info("Servidor Integración Bermann inicializando...");

const SELECT_REGISTROS_PENDIENTES = `
  SELECT
    a.idUbicacion,
    a.idDispositivo,
    b.patente,
    a.fechaHoraGps,
    a.latitud,
    a.longitud,
    a.altitud,
    a.trueCourse,
    a.velocidadKmh,
    a.estadoIgnicion,
    a.temp1,
    a.evento,
    a.valorEvento
  FROM Ubicaciones_Bermann a
  JOIN Integraciones b ON a.idDispositivo = b.idDispositivo
  WHERE (a.estadoEnvio IS NULL OR a.estadoEnvio = 6)
    AND b.activo = 1
  ORDER BY a.fechaHoraGps ASC
  LIMIT 50
`;

async function consultarRegistrosPendientes() {
  return ejecutarQueryConReintentos(SELECT_REGISTROS_PENDIENTES);
}

async function marcarRegistro(idUbicacion, estado, detalle = null) {
  const sql =
    "UPDATE Ubicaciones_Bermann SET fechaEnvio = NOW(), estadoEnvio = ?, detalleEnvio = ? WHERE idUbicacion = ?";
  return ejecutarQueryConReintentos(sql, [estado, detalle, idUbicacion]);
}

async function ejecutarQueryConReintentos(sql, params = [], intento = 0) {
  try {
    return await db.query(sql, params);
  } catch (error) {
    if (
      intento < MAX_DB_RETRIES &&
      ["ECONNREFUSED", "PROTOCOL_CONNECTION_LOST"].includes(error.code)
    ) {
      const siguiente = intento + 1;
      logger.warn(
        `Error DB (${siguiente}/${MAX_DB_RETRIES}) ${error.message}. Reintentando en ${DB_RETRY_DELAY_MS}ms`
      );
      await delay(DB_RETRY_DELAY_MS);
      return ejecutarQueryConReintentos(sql, params, siguiente);
    }
    throw error;
  }
}

function mapearRegistroAFormatoBermann(row) {
  const fechaFormateada = formatearFecha(row.fechaHoraGps);
  const lat = Number(row.latitud || 0);
  const lon = Number(row.longitud || 0);
  const velocidad = Number(row.velocidadKmh || 0);

  return {
    fecha: fechaFormateada,
    imei: row.imei || String(row.idDispositivo || ""),
    patente: row.patente || "",
    latitud: lat.toFixed(6),
    longitud: lon.toFixed(6),
    orientacion: Number(row.trueCourse || 0),
    altitud: Number(row.altitud || 0),
    velocidad,
    estado_motor: row.estadoIgnicion ? 1 : 0,
    id_cliente_externo: Number(process.env.BERMANN_CLIENT_ID || 0),
    odometro_virtual: row.odometroVirtual || 0,
    horometro_virtual: row.horometroVirtual || "00000:00:00",
    nivel_bateria: row.nivelBateria || 0,
    voltaje_externo: row.voltajeExterno || 0,
    estado_input1: row.estadoInput1 || 0,
    estado_input2: row.estadoInput2 || 0,
    estado_input3: row.estadoInput3 || 0,
    estado_input4: row.estadoInput4 || 0,
    hdop: row.hdop || 0,
    num_sat: row.numSat || 0,
    estado: row.estado || 0,
    ibutton: row.ibutton || "",
    temp_1: row.temp1 ?? 0,
    temp_2: row.temp2 ?? 0,
    temp_3: row.temp3 ?? 0,
    evento: construirEvento(row),
  };
}

function construirEvento(row) {
  const codigo = Number(row.valorEvento ?? row.evento ?? 0);
  return {
    id_cliente_externo: Number(process.env.BERMANN_CLIENT_ID || 0),
    codigo_evento: Number.isNaN(codigo) ? 0 : codigo,
    descripcion_evento: describirEvento(row.descripcionEvento, codigo),
  };
}

function describirEvento(descripcion, codigo) {
  if (descripcion) {
    return descripcion;
  }
  const catalogo = {
    1: "Movimiento",
    2: "Encendido",
    3: "Apagado",
    4: "Pánico",
    5: "Exceso de velocidad",
    6: "Detenido",
    33: "Batería baja",
    34: "Batería alta",
    273: "Frenada brusca media",
    274: "Aceleración brusca media",
    277: "Aceleración brusca alta",
  };
  return catalogo[codigo] || "Evento sin descripción";
}

function formatearFecha(fecha) {
  if (!fecha) {
    return new Date().toISOString().replace("T", " ").substring(0, 19);
  }
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function cicloPrincipal() {
  logger.info("Ciclo Bermann iniciado");

  try {
    const registros = await consultarRegistrosPendientes();
    if (!registros.length) {
      logger.debug("Sin registros pendientes");
      return;
    }

    for (const registro of registros) {
      try {
        const payload = mapearRegistroAFormatoBermann(registro);
        const respuesta = await bermannClient.sendPayload(payload);
        await marcarRegistro(registro.idUbicacion, 1, JSON.stringify(respuesta));
        logger.info(
          `Registro ${registro.idUbicacion} enviado correctamente (patente ${registro.patente})`
        );
      } catch (error) {
        logger.error(
          `Error enviando registro ${registro.idUbicacion}: ${error.message}`
        );
        await marcarRegistro(
          registro.idUbicacion,
          6,
          JSON.stringify(error.response?.data || error.message)
        );
      }
    }
  } catch (error) {
    logger.error(`Fallo en ciclo principal: ${error.message}`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async function bootstrap() {
  while (true) {
    await cicloPrincipal();
    await delay(POLL_INTERVAL_MS);
  }
})();
