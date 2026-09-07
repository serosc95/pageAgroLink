# ADD-COM

Plataforma web que conecta **productores** y **consumidores** agrícolas: registro diferenciado, catálogo de vendedores, chat en tiempo real y menú institucional.

El logo y la paleta (verde bosque `#2D5A42`, oro `#B58931` y fondo negro) definen la identidad visual.

---

## Qué puedes hacer

| Flujo | Qué ocurre |
| --- | --- |
| **Registrarse** (botón izquierdo) | Alta de vendedor: identificación, datos de contacto, primer producto con foto, precio y especificaciones. |
| **Comprar** (botón derecho) | Listado de vendedores → ficha con productos, contactos y **chat** en la misma página. |
| **Menú ⋮** | Quiénes somos, cómo contactarnos y buzón de sugerencias. |

Cuentas demo (contraseña `Demo1234`) se crean con el seed:

- `maria.gonzalez@addcom.demo` — vendedor (Huila)
- `carlos.ramirez@addcom.demo` — vendedor (Antioquia)
- `ana.perez@addcom.demo` — vendedor (Boyacá)
- `comprador@addcom.demo` — comprador

---

## Stack

- **Frontend:** HTML, CSS y JavaScript (sin frameworks de UI).
- **Backend:** Node.js 18+ con estructura MVC y servidor HTTP nativo (sin Express).
- **Tiempo real:** WebSockets (`ws`).
- **Base de datos:** PostgreSQL 16.
- **Auth:** JWT + contraseñas con bcrypt.

Dependencias de Node (solo bibliotecas, no frameworks de aplicación): `pg`, `ws`, `bcryptjs`, `jsonwebtoken`, `dotenv`.

---

## Estructura de carpetas

```text
/
├── README.md
├── docker-compose.yml          # PostgreSQL de desarrollo
├── .env.example
├── logo.png
├── frontend/                   # Sitio estático
│   ├── index.html
│   ├── catalogo.html
│   ├── vendedor.html           # Ficha + chat
│   ├── registro.html           # Alta vendedor
│   ├── registro-comprador.html
│   ├── login.html
│   ├── panel.html              # CRUD de productos del vendedor
│   ├── inbox.html              # Bandeja de chat
│   ├── quienes-somos.html
│   ├── contacto.html
│   ├── sugerencias.html
│   ├── css/styles.css
│   ├── js/                     # api, auth, ui, chat, config
│   └── assets/logo.png
└── backend/
    ├── server.js               # HTTP + estáticos + arranque
    ├── package.json
    ├── .env                    # No versionar secretos reales
    ├── uploads/                # Fotos de productos
    ├── migrations/001_init.sql
    ├── scripts/migrate.js
    ├── scripts/seed.js
    └── src/
        ├── config/             # entorno y pool pg
        ├── controllers/        # auth, users, products, messages, suggestions
        ├── models/             # acceso a tablas
        ├── routes/             # definición de endpoints
        ├── middleware/         # JWT y rate limit
        ├── services/chatHub.js
        ├── websocket.js
        └── utils/
```

Separación frontend / backend: el cliente solo habla con `/api` y `/ws`. Node sirve el estático para un solo puerto de despliegue.

---

## Requisitos

- Node.js 18 o superior
- Docker (recomendado) **o** PostgreSQL 14+ local
- npm

---

## Configuración de base de datos

### Opción A — Docker (recomendada)

Desde la raíz del proyecto:

```bash
docker compose up -d
```

Esto levanta PostgreSQL en `localhost:5432` con:

| Variable | Valor |
| --- | --- |
| Base | `addcom` |
| Usuario | `addcom` |
| Contraseña | `addcom_dev_password` |

Comprueba: `docker compose ps` (el servicio debe estar `healthy`).

### Opción B — PostgreSQL instalado

```sql
CREATE USER addcom WITH PASSWORD 'addcom_dev_password';
CREATE DATABASE addcom OWNER addcom;
```

Ajusta `backend/.env` si usas otros valores.

### Schema (tablas e índices)

Migración `backend/migrations/001_init.sql`:

- `usuarios` — vendedores y compradores (`rol`), email único, identificación única en vendedores.
- `productos` — `vendedor_id` → `usuarios`, índice por vendedor y nombre.
- `mensajes` — par `(vendedor_id, comprador_id)`, índice de conversación y fecha.
- `sugerencias` — buzón institucional.

Relaciones en cascada al borrar un usuario. `updated_at` se mantiene con trigger.

---

## Variables de entorno

Copia el ejemplo y edítalo:

```bash
cp .env.example backend/.env
```

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| `PORT` | Puerto HTTP y WebSocket | `3000` |
| `NODE_ENV` | `development` o `production` | `development` |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma | `http://localhost:3000` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base | `addcom` |
| `DB_USER` | Usuario | `addcom` |
| `DB_PASSWORD` | Contraseña | `addcom_dev_password` |
| `JWT_SECRET` | Secreto de firma JWT (**cámbialo en producción**) | cadena larga aleatoria |
| `JWT_EXPIRES_IN` | Caducidad del token | `7d` |
| `MAX_UPLOAD_BYTES` | Tamaño máximo de foto | `5242880` (5 MB) |

En producción usa un `JWT_SECRET` irrepetible y HTTPS (`wss://`).

---

## Instalación y arranque

```bash
# 1. Base de datos
docker compose up -d

# 2. Variables
cp .env.example backend/.env

# 3. Dependencias, schema y datos demo
cd backend
npm install
npm run setup          # migrate + seed

# 4. Servidor (API + frontend + WebSocket)
npm start
```

Abre [http://localhost:3000](http://localhost:3000).

Otros comandos:

```bash
npm run migrate        # solo schema
npm run seed           # solo datos demo (idempotente)
npm run dev            # recarga con node --watch
```

### Despliegue

**Backend + frontend en un solo proceso**

1. Instala Node 18+ y PostgreSQL en el servidor (o usa un managed Postgres).
2. Copia el repo, crea `backend/.env` con host real, `NODE_ENV=production` y un `JWT_SECRET` fuerte.
3. `cd backend && npm install --omit=dev && npm run migrate`
4. Arranca con un process manager, por ejemplo:

```bash
# systemd, pm2, etc.
cd backend
NODE_ENV=production node server.js
```

5. Pon un reverse proxy (nginx/Caddy) con TLS hacia el puerto `PORT`. El mismo origen sirve HTML y `/api`.

**Frontend aparte** (otro dominio o puerto)

1. Sirve la carpeta `frontend/` con cualquier servidor estático (nginx, Caddy).
2. En `frontend/js/config.js` deja de usar same-origin: apunta `API_URL` y `WS_URL` al backend.
3. Añade ese origen a `CORS_ORIGIN`.

Fotos: el proceso de Node debe poder escribir en `backend/uploads/`.

---

## API REST

Base: `http://localhost:3000`. JSON en UTF-8. Errores: `{ "error": { "message": "…" } }`.  
Validación de formulario: `422` con `error.fields: [{ field, message }]`.

Autenticación: cabecera `Authorization: Bearer <token>` en las rutas marcadas.

### Salud

```http
GET /api/health
```

```json
{ "ok": true, "servicio": "ADD-COM API" }
```

### Autenticación

```http
POST /api/auth/registro-vendedor
Content-Type: application/json
```

```json
{
  "identificacion": "1098765432",
  "nombres": "María Elena González",
  "telefono": "+57 310 555 1201",
  "whatsapp": "573105551201",
  "email": "maria@correo.com",
  "password": "Campo2026",
  "ubicacion": "Pitalito, Huila",
  "productoNombre": "Café de altura",
  "precio": 28000,
  "especificaciones": "Arábica lavado, 500 g, notas a panela.",
  "foto": "data:image/jpeg;base64,..."
}
```

Respuesta `201`: `{ token, usuario, producto }`.

```http
POST /api/auth/registro-comprador
```

```json
{
  "nombres": "Nicol Herrera",
  "email": "nicol@correo.com",
  "telefono": "+57 300 111 2233",
  "password": "Campo2026"
}
```

```http
POST /api/auth/login
```

```json
{ "email": "comprador@addcom.demo", "password": "Demo1234" }
```

```http
GET /api/auth/me
Authorization: Bearer <token>
```

```json
{ "usuario": { "id": 4, "nombres": "Nicol Herrera", "rol": "comprador" } }
```

### Vendedores (público)

```http
GET /api/vendedores
```

```json
{
  "vendedores": [
    { "id": 1, "nombres": "María Elena González", "ubicacion": "Pitalito, Huila", "productosCount": 2 }
  ]
}
```

```http
GET /api/vendedores/1
```

```json
{
  "vendedor": { "id": 1, "nombres": "…", "telefono": "…", "email": "…", "ubicacion": "…" },
  "productos": [{ "id": 1, "nombre": "Café de altura huilense", "precio": 28000, "especificaciones": "…" }]
}
```

### Usuarios autenticados

```http
PUT    /api/usuarios/me
DELETE /api/usuarios/me
```

```json
{
  "nombres": "Nicol Herrera Ruiz",
  "telefono": "+57 300 111 2233",
  "ubicacion": "Bogotá D.C.",
  "whatsapp": "573001112233"
}
```

`DELETE` elimina la cuenta y, en cascada, sus productos y mensajes.

### Productos (vendedor autenticado)

```http
GET    /api/productos
POST   /api/productos
PUT    /api/productos/:id
DELETE /api/productos/:id
```

Alta:

```json
{
  "nombre": "Panela redonda",
  "precio": 6500,
  "especificaciones": "Unidad de 500 g, caña orgánica.",
  "foto": "data:image/png;base64,..."
}
```

Solo el dueño puede editar o borrar. Fotos: JPEG, PNG o WebP en data URL, máximo 5 MB.

### Mensajes (usuario autenticado)

```http
GET  /api/mensajes
GET  /api/mensajes/:usuarioId
POST /api/mensajes
```

```json
{ "destinatarioId": 1, "contenido": "¿Tiene café para entrega el viernes?" }
```

El chat solo es válido entre un **comprador** y un **vendedor**.

### Sugerencias (público)

```http
POST /api/sugerencias
```

```json
{
  "nombre": "Vecino de la plaza",
  "email": "alguien@correo.com",
  "mensaje": "¿Podrían filtrar vendedores por departamento?"
}
```

---

## WebSockets (chat)

```text
ws://localhost:3000/ws?token=<JWT>
```

Cliente → servidor:

```json
{ "type": "unirse", "destinatarioId": 1 }
{ "type": "mensaje", "destinatarioId": 1, "contenido": "Buenos días" }
```

Servidor → cliente:

```json
{ "type": "listo", "usuario": { "id": 4, "nombres": "Nicol", "rol": "comprador" } }
{ "type": "historial", "mensajes": [], "vendedorId": 1, "compradorId": 4 }
{ "type": "mensaje", "mensaje": { "id": 12, "contenido": "…", "remitenteId": 4 } }
{ "type": "error", "message": "…" }
```

Si el socket se cae, el envío por `POST /api/mensajes` sigue funcionando.

---

## Seguridad (resumen)

- Contraseñas con bcrypt (10 rondas).
- JWT en Authorization; rutas de escritura con rol.
- Consultas parametrizadas (`$1`, `$2`, …).
- Validación en navegador y servidor.
- Límite de tamaño de body y de fotos; tipos MIME restringidos.
- Cabeceras de seguridad y CORS por lista blanca.
- Rate limit en memoria (auth 15/min, API 120/min por IP).
- Salida HTML escapada en el cliente (`textContent` / `escapeHtml`).

---

## Licencia de uso del proyecto

Código de ejemplo para el proyecto académico / productor ADD-COM. Ajusta textos institucionales y datos de contacto antes de un entorno público.
