# Guía de verificación para el profesor

Esta guía permite comprobar en pocos minutos que **Autos Colombia** funciona
correctamente. Se asume que ya se siguieron los pasos de instalación del
[README](README.md) y que el backend y el frontend están en ejecución.

## 0. Antes de empezar

Deben estar activos:

| Componente | Cómo comprobarlo |
|---|---|
| PostgreSQL | Servicio iniciado, con la base `autos_colombia` creada |
| Backend (puerto 8000) | Terminal mostrando `Uvicorn running on http://127.0.0.1:8000` |
| Frontend (puerto 4200) | Terminal mostrando `Local: http://localhost:4200/` |

---

## 1. Comprobar que el backend responde

Abrir en el navegador: <http://127.0.0.1:8000/health>

**Resultado esperado:** `{"status":"ok"}`

## 2. Comprobar que el frontend se comunica con el backend

Abrir: <http://localhost:4200>

**Resultado esperado:** pantalla de inicio de *Autos Colombia* con
**"Servicio disponible"** en verde. Si aparece un mensaje de servicio no disponible,
el backend no está corriendo.

Menú de navegación disponible: **Inicio · Operadores · Celdas · Vehículos · Control de acceso**.

---

## 3. Prueba funcional completa (≈ 5 minutos)

La base de datos empieza vacía. Se recomienda usar estos datos de ejemplo.

### 3.1 Crear un operador
Menú **Operadores** → crear:

| Nombre | Teléfono |
|---|---|
| Carlos Ramírez | 3001234567 |
| María López | 3109876543 |

**Esperado:** los operadores aparecen en el listado.

### 3.2 Crear una celda
Menú **Celdas** → crear:

| Código | Tipo |
|---|---|
| A-01 | Automóvil |
| A-02 | Automóvil |

**Esperado:** aparecen en el listado. El código se guarda en mayúsculas.

### 3.3 Crear un vehículo
Menú **Vehículos** → *Nuevo vehículo*:

| Placa | Marca | Color | Año | Tipo |
|---|---|---|---|---|
| ABC123 | Chevrolet | Rojo | 2020 | AUTOMOVIL |
| XYZ789 | Renault | Blanco | 2018 | AUTOMOVIL |

**Esperado:** aparecen en el listado con los botones *Editar* y *Eliminar*.

### 3.4 Registrar una entrada
Menú **Control de acceso** → *Registrar entrada*:

- Placa: `ABC123`
- Celda: `A-01`
- Operador: `Carlos Ramírez`

**Esperado:** mensaje de entrada registrada, con la celda y la fecha/hora
(zona horaria America/Bogotá).

### 3.5 Consultar el vehículo
En *Consultar vehículo y registrar salida*, escribir `ABC123` y pulsar
**Consultar vehículo**.

**Esperado:** el vehículo aparece como **Dentro**, con su celda `A-01` y la fecha de entrada.

### 3.6 Registrar la salida
Elegir el operador `María López` y confirmar la salida.

**Esperado:** mensaje *"Salida registrada: ABC123, celda A-01, …"*.
Al consultar de nuevo, el vehículo aparece como **Fuera — Vehículo registrado
sin estancia abierta**.

---

## 4. Pruebas de validaciones (el sistema debe rechazar estos casos)

| Acción | Resultado esperado |
|---|---|
| Registrar la entrada de `ABC123` dos veces seguidas (sin salida) | Error: *"El vehículo ya está dentro."* |
| Registrar la entrada de `XYZ789` en la celda `A-01` mientras está ocupada | Error: *"La celda está ocupada."* |
| Crear un vehículo con una placa ya existente | Error de duplicado |
| Crear una celda con un código ya existente | Error de duplicado |
| Dejar un campo obligatorio vacío | *"Este campo es obligatorio y no puede estar vacío."* |
| Crear un vehículo con tipo distinto de `MOTO`, `AUTOMOVIL` o `CAMIONETA` | Rechazado |
| Consultar una placa que no existe | *"Vehículo no registrado"* |
| Eliminar un vehículo, celda u operador con estancias registradas | El sistema lo impide |

---

## 5. Comprobar la API directamente (opcional)

La documentación interactiva (Swagger) está en <http://127.0.0.1:8000/docs>.

| Método | Ruta | Función |
|---|---|---|
| GET / POST | `/vehiculos` | Listar / crear vehículos |
| GET / PATCH / DELETE | `/vehiculos/{id}` | Consultar / editar / eliminar |
| GET / POST | `/celdas` | Listar / crear celdas |
| GET / POST | `/operadores` | Listar / crear operadores |
| POST | `/estancias/entrada` | Registrar entrada (`placa`, `celda_id`, `operador_id`) |
| POST | `/estancias/salida` | Registrar salida (`placa`, `operador_id`) |
| GET | `/estancias/vehiculo/{placa}` | Estado actual de un vehículo |
| GET | `/health` | Estado de la API |

Para probar una ruta: abrirla en Swagger → **Try it out** → **Execute**.
Códigos esperados: `201` al crear, `200` al consultar, `204` al eliminar,
`409` en conflictos (vehículo dentro, celda ocupada), `422` en datos inválidos.

---

## 6. Comprobar los datos en la base de datos (opcional)

En pgAdmin: clic derecho en `autos_colombia` → **Query Tool**, y ejecutar:

```sql
-- Tablas creadas por las migraciones
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
-- Esperado: alembic_version, celda, estancia, operador, vehiculo

-- Versión de migración aplicada
SELECT * FROM alembic_version;
-- Esperado: 0002

-- Registros creados desde la aplicación
SELECT * FROM vehiculo;
SELECT * FROM celda;
SELECT * FROM operador;

-- Historial de entradas y salidas
SELECT e.id, v.placa, c.codigo AS celda, e.entrada, e.salida
FROM estancia e
JOIN vehiculo v ON v.id = e.vehiculo_id
JOIN celda c ON c.id = e.celda_id
ORDER BY e.id;
```

**Esperado:** tras la prueba de la sección 3, la estancia de `ABC123` aparece con
fecha de `entrada` y de `salida` completas.

---

## Resumen de verificación

| # | Comprobación | ✔ |
|---|---|---|
| 1 | `/health` devuelve `{"status":"ok"}` | ☐ |
| 2 | La pantalla de inicio muestra "Servicio disponible" | ☐ |
| 3 | Se crean operadores, celdas y vehículos | ☐ |
| 4 | Se registra una entrada correctamente | ☐ |
| 5 | La consulta muestra el vehículo como Dentro | ☐ |
| 6 | Se registra la salida y el vehículo queda Fuera | ☐ |
| 7 | Se rechazan duplicados, celda ocupada y vehículo ya dentro | ☐ |
| 8 | Los datos quedan guardados en PostgreSQL | ☐ |

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| Página en blanco | Se abrió `index.html` directamente; usar <http://localhost:4200> |
| "Servicio disponible" no aparece | Backend apagado o puerto 8000 ocupado |
| Error 500 al guardar datos | Falta `backend/.env` o la contraseña de PostgreSQL es incorrecta |
| `relation "..." does not exist` | Faltan las tablas: ejecutar `alembic upgrade head` |

Más detalle en la sección *Problemas frecuentes* del [README](README.md).
