Servidor de Integración Bermann
================================

Resumen Ejecutivo
-----------------
Este servicio publica la telemetría de nuestros dispositivos hacia el concentrador Bermann GPS mediante un API REST. El documento Bermann Integración GPS v3.5.3 define autenticación vía JWT, frecuencia de transmisión basada en el estado del móvil, formato JSON obligatorio y los códigos de eventos aceptados. Toda comunicación debe respetar las validaciones del proveedor, de lo contrario los registros son descartados y los reportes quedan incompletos.

Autenticación y Seguridad
-------------------------
1. Bermann entrega `id_cliente_externo`, `nombre_usuario` y `password_usuario`.
2. Se hace `POST` al endpoint de autenticación con `Content-Type: application/json`.
3. Si las credenciales son correctas, se recibe un token JWT válido por 1 hora.
4. Al expirar el token se debe solicitar uno nuevo antes de seguir enviando datos.

Frecuencia de Transmisión
-------------------------
- Vehículo en movimiento: cada 50 segundos.
- Vehículo detenido: cada 20 minutos.

Endpoints
---------
### Swagger
- Producción: https://concentrador.bermann.cl/swagger-ui/index.html
- Desarrollo: https://concentradordev.bermann.cl/swagger-ui/index.html

### Autenticación (POST)
- Producción: https://concentrador.bermann.cl/integracion_bermann/api/auth
- Desarrollo: https://concentradordev.bermann.cl/integracion_bermann/api/auth
- Headers: `Content-Type: application/json`
- Body:

```
{
	"id_cliente_externo": 0,
	"nombre_usuario": "string",
	"password_usuario": "string"
}
```

### Inserción de Datos (POST)
- Producción: https://concentrador.bermann.cl/integracion_bermann/api/data/insert
- Desarrollo: https://concentradordev.bermann.cl/integracion_bermann/api/data/insert
- Headers: `Content-Type: application/json`, `Authorization: Bearer <token>`

Payload JSON requerido
----------------------

```
{
	"fecha": "2020-05-08 21:34:00",
	"imei": "357041236504013",
	"patente": "AFHJ-93",
	"latitud": "-33.456456",
	"longitud": "-70.456456",
	"orientacion": 125,
	"altitud": 400,
	"velocidad": 96.2,
	"estado_motor": 1,
	"id_cliente_externo": 1515,
	"odometro_virtual": 321654654,
	"horometro_virtual": "00045:04:21",
	"nivel_bateria": 70,
	"voltaje_externo": 0,
	"estado_input1": 0,
	"estado_input2": 0,
	"estado_input3": 0,
	"estado_input4": 0,
	"hdop": 1,
	"num_sat": 3,
	"estado": 0,
	"ibutton": "string",
	"temp_1": 0,
	"temp_2": 0,
	"temp_3": 0,
	"evento": {
		"id_cliente_externo": 0,
		"codigo_evento": 0,
		"descripcion_evento": "string"
	}
}
```

Códigos de Evento
-----------------
| Código | Descripción                  |
|-------:|------------------------------|
|      1 | Movimiento                   |
|      2 | Encendido                    |
|      3 | Apagado                      |
|      4 | Pánico                       |
|      5 | Exceso de velocidad          |
|      6 | Detenido                     |
|     13 | GPS desconectado (sin energía)|
|     14 | GPS conectado (energizado)   |
|     31 | Jamming GPRS ON              |
|     32 | Jamming GPRS OFF             |
|     33 | Batería baja                 |
|     34 | Batería alta                 |
|     38 | Chapa abierta                |
|     39 | Chapa cerrada                |
|     85 | Desbloqueo por tarjeta       |
|    113 | Apertura puerta trasera      |
|    114 | Cierre puerta trasera        |
|    116 | Apertura puerta copiloto     |
|    125 | Llave chofer (iButton)       |
|    167 | Puerta cabina abierta        |
|    168 | Puerta cabina cerrada        |
|    180 | Puerta piloto abierta        |
|    181 | Puerta piloto cerrada        |
|    182 | Apertura fuera de zona       |
|    219 | Evento CANBUS                |
|    273 | Frenada brusca media         |
|    274 | Aceleración brusca media     |
|    277 | Aceleración brusca alta      |

Consideraciones
---------------
- Registros fuera de formato, con fecha futura o fuera de secuencia son rechazados.
- Los móviles deben existir previamente en Bermann para aceptar la data enviada.
- Mantener la frecuencia estipulada para evitar alertas de integridad en el proveedor.

Historial de Cambios
--------------------
| Fecha      | Versión | Autor          | Comentario                              |
|------------|---------|----------------|------------------------------------------|
| 22-11-2024 | 1.0     | Marcelo Pinto  | Versión inicial                          |
| 11-06-2025 | 1.5     | Marcelo Pinto  | Actualiza URLs y estructura JSON         |
| 11-06-2025 | 1.6     | Marcelo Pinto  | Agrega ejemplo de payload                |
| 10-11-2025 | 1.7     | Adán Escobar   | Incorpora campos de temperatura          |

