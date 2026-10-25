# Autos Colombia

Aplicación web para **controlar la entrada y salida de vehículos** de un parqueadero.
Permite registrar vehículos, celdas (puestos) y operadores, y llevar el control de
cada estancia: qué vehículo está dentro, en qué celda, quién lo recibió y cuándo salió.

## Tecnologías

| Parte | Tecnología |
|---|---|
| Frontend | Angular |
| Backend (API) | Python 3.13 + FastAPI |
| Base de datos | PostgreSQL |
| Migraciones | Alembic |

## Estructura del proyecto

```
AutosColombia/
├── backend/            API en FastAPI
│   ├── app/            Código (rutas, servicios, modelos)
│   ├── migrations/     Migraciones de Alembic (crean las tablas)
│   ├── tests/          Pruebas
│   ├── .env.example    Plantilla de configuración
│   └── requirements.txt
├── frontend/           Aplicación Angular
└── README.md
```

## Requisitos previos

Instala lo siguiente antes de empezar:

| Programa | Versión | Descarga |
|---|---|---|
| Python | 3.13 | https://www.python.org/downloads/ |
| Node.js | 22 o superior | https://nodejs.org |
| PostgreSQL | 14 o superior | https://www.postgresql.org/download/ |

pgAdmin (incluido con el instalador de PostgreSQL) es útil para crear la base de datos
de forma visual.

Los comandos de esta guía son para **Windows con PowerShell**.

---

## Instalación y ejecución paso a paso

Se necesitan **dos terminales abiertas a la vez**: una para el backend y otra para
el frontend.

### Paso 1. Crear la base de datos

Crea una base de datos **vacía** llamada `autos_colombia`.

**Con pgAdmin:** clic derecho sobre *Databases* → *Create* → *Database…* →
nombre `autos_colombia` → *Save*.

**O con psql:**

```sql
CREATE DATABASE autos_colombia;
```

> Solo se crea la base vacía. Las tablas se crean automáticamente en el Paso 4.

### Paso 2. Configurar la conexión (archivo `.env`)

El backend lee sus datos de conexión desde `backend/.env`. Este archivo **no está en el
repositorio** (contiene contraseñas), por eso hay que crearlo a partir de la plantilla.

Desde la raíz del proyecto:

```powershell
cd backend
copy .env.example .env
```

Abre `backend/.env` y revisa que los datos coincidan con tu PostgreSQL:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=autos_colombia
DB_USER=postgres
DB_PASSWORD=postgres
DB_CONNECT_TIMEOUT=5
```

**Importante:** cambia `DB_PASSWORD` por la contraseña de tu usuario `postgres`
(la que definiste al instalar PostgreSQL). Si tu usuario o puerto son distintos,
cámbialos también. Guarda el archivo.

### Paso 3. Crear el entorno virtual e instalar dependencias del backend

Dentro de la carpeta `backend`:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

La instalación puede tardar un minuto.

### Paso 4. Verificar la conexión y crear las tablas

```powershell
.\.venv\Scripts\python.exe .\check_db.py
.\.venv\Scripts\python.exe -m alembic -c .\alembic.ini upgrade head
```

- `check_db.py` debe mostrar: `Conexión a PostgreSQL verificada: SELECT 1 correcto.`
  Si falla, revisa el Paso 2.
- `alembic upgrade head` crea las tablas `vehiculo`, `celda`, `operador` y `estancia`.

### Paso 5. Iniciar el backend

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Deja esta terminal abierta.** Para comprobar que funciona, abre en el navegador
<http://127.0.0.1:8000/health>: debe mostrar `{"status":"ok"}`.

La documentación interactiva de la API está en <http://127.0.0.1:8000/docs>.

### Paso 6. Iniciar el frontend

Abre una **segunda terminal** en la raíz del proyecto:

```powershell
cd frontend
npm install
npm start
```

La primera vez, `npm install` tarda uno o dos minutos. Pueden aparecer avisos
`npm warn`; no son errores.

### Paso 7. Abrir la aplicación

Entra en el navegador a:

**<http://localhost:4200>**

> No abras el archivo `frontend/src/index.html` haciendo doble clic. Es solo la
> plantilla de Angular y se vería en blanco. La aplicación debe abrirse siempre
> desde la dirección anterior, con el frontend iniciado.

En la pantalla de inicio debe aparecer **"Servicio disponible"** en verde, lo que
confirma que el frontend se comunica con el backend.

> Para comprobar que todo funciona correctamente, sigue la
> **[Guía de verificación](GUIA_VERIFICACION.md)**.

---

## Cómo usar la aplicación

La base de datos empieza vacía. Registra los datos en este orden:

| Orden | Pantalla | Datos | Ejemplo |
|---|---|---|---|
| 1 | **Operadores** | Nombre y teléfono | Carlos Ramírez · 3001234567 |
| 2 | **Celdas** | Código y tipo (texto libre) | A-01 · Automóvil |
| 3 | **Vehículos** | Placa, marca, color, año y tipo | ABC123 · Chevrolet · Rojo · 2020 · AUTOMOVIL |
| 4 | **Control de acceso** | Entrada y salida de vehículos | Ver abajo |

**Tipos de vehículo válidos:** `MOTO`, `AUTOMOVIL` y `CAMIONETA`.

### Registrar una entrada y una salida

1. Entra a **Control de acceso**.
2. En *Registrar entrada*, escribe la **placa**, elige la **celda** y el **operador**
   y confirma.
3. En *Consultar vehículo y registrar salida*, escribe la placa y pulsa
   **Consultar vehículo**. Mostrará que está **Dentro**, con su celda y la fecha de entrada.
4. Elige el operador de salida y confirma la salida. Al consultar de nuevo, el vehículo
   aparecerá como **Fuera**.

### Reglas que valida el sistema

- La **placa** y el **código de celda** no pueden repetirse y se guardan en mayúsculas.
- Un vehículo no puede entrar si ya está dentro.
- Una celda no puede usarse si ya está ocupada.
- Ningún campo obligatorio puede quedar vacío.
- Las fechas y horas las asigna el servidor y se muestran en hora de Bogotá.

---

## Problemas frecuentes

| Problema | Causa y solución |
|---|---|
| `Completa en backend/.env: ...` | Falta crear `backend/.env`, o aún tiene valores `CAMBIAR_...`. Repite el Paso 2. |
| `password authentication failed` | La contraseña de `DB_PASSWORD` no coincide con la de tu PostgreSQL. |
| `connection refused` / no conecta | PostgreSQL no está iniciado. Abre `services.msc` y activa el servicio *postgresql*. |
| `database "autos_colombia" does not exist` | No creaste la base de datos. Repite el Paso 1. |
| `relation "vehiculo" does not exist` | Faltan las tablas. Ejecuta `alembic upgrade head` (Paso 4). |
| La página abre pero no muestra datos | El backend no está corriendo en el puerto 8000. Revisa el Paso 5. |
| Página en blanco | Estás abriendo `index.html` directamente. Usa <http://localhost:4200>. |
| `py` no se reconoce | Usa `python -m venv .venv` en lugar de `py -3.13 -m venv .venv`. |
| `Port 4200 is already in use` | Hay otro frontend abierto. Ciérralo con `Ctrl + C` y repite `npm start`. |
| `npm` o `node` no se reconocen | Instala Node.js y abre una terminal nueva. |

## Uso en otro momento

Con todo ya instalado, para volver a ejecutar el proyecto solo hace falta:

1. Tener PostgreSQL iniciado.
2. **Terminal 1** (en `backend`):
   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
3. **Terminal 2** (en `frontend`):
   ```powershell
   npm start
   ```
4. Abrir <http://localhost:4200>.

## Notas de seguridad

- El archivo `backend/.env` contiene contraseñas y **nunca debe subirse a Git**.
  Ya está excluido en `.gitignore`.
- Los valores de `.env.example` son solo de ejemplo para entorno local.
