# Autos Colombia — Sistema de parqueadero

Aplicación web con Angular + FastAPI (Python) + PostgreSQL.

## Módulos incluidos
- Inicio de sesión y autorización JWT con roles **Administrador** y **Operario**.
- Dashboard.
- Usuarios (solo Administrador administra; ambos consultan y cambian su propia contraseña).
- Celdas y tipos Carro, Moto y Camioneta.
- Entradas, salidas, traslados e historial de movimientos.
- Clientes, vehículos y mensualidades.
- Registro y consulta de pagos.
- Auditoría de operaciones (solo Administrador).

El alcance sigue las historias/requerimientos del documento adjunto: clientes no son usuarios del sistema; el servicio es por mensualidad; una placa y una celda no pueden tener dos ocupaciones activas; la placa se normaliza; la salida libera la celda; el Operario puede registrar entradas/salidas y consultar celdas, pero no administrar usuarios ni inhabilitar celdas.

## Requisitos
- Python 3.11 o superior
- Node.js 20.19+ (o versión compatible con Angular 19)
- PostgreSQL 15+
- Visual Studio Code

## 1. Crear base de datos
En pgAdmin, crea una base llamada `autos_colombia1`.
No es necesario ejecutar SQL manualmente: al iniciar el backend se crean las tablas.

## 2. Configurar backend
Abre una terminal de VS Code en la carpeta `backend`:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edita `backend/.env` y coloca la contraseña real de PostgreSQL:
```env
DATABASE_URL=postgresql+psycopg2://postgres:TU_PASSWORD@localhost:5432/autos_colombia
JWT_SECRET=cambia_esta_clave_por_una_larga_y_privada
```

Inicia el backend:
```powershell
uvicorn app.main:app --reload
```
API: http://localhost:8000  
Documentación interactiva: http://localhost:8000/docs

En el primer inicio se crea el usuario administrador:
- Usuario: `admin`
- Contraseña: `Admin12345`

Cámbiala desde el módulo de perfil después de ingresar.

## 3. Configurar frontend
Abre otra terminal de VS Code en la carpeta `frontend`:

```powershell
npm install
npm start
```
Abre http://localhost:4200

## 4. Datos de prueba recomendados
Como Administrador:
1. Crea celdas con códigos C-01 (Carro), M-01 (Moto) y G-01 (Camioneta).
2. Crea un cliente y registra su vehículo.
3. Crea una mensualidad para ese cliente/vehículo.
4. Registra el pago.
5. Inicia sesión como Operario (créalo desde Usuarios) y registra entrada/salida.

## Reglas importantes
- La contraseña se guarda con hash bcrypt, nunca en texto plano.
- Los usuarios inactivos no pueden iniciar sesión.
- La API valida los roles; ocultar botones en Angular no es la única protección.
- La placa se guarda en mayúsculas y sin espacios/guiones.
- Entrada: requiere mensualidad vigente y pago vigente, celda disponible y tipo compatible.
- Salida: valida la placa y libera la celda dentro de una transacción.
- No se permite inhabilitar una celda ocupada ni con asignación fija activa.
- El pago se registra como movimiento financiero; no se procesa tarjeta ni pasarela bancaria.
