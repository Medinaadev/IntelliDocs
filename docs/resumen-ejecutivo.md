# IntelliDocs — Resumen del proyecto

---

## ¿Qué es IntelliDocs?

IntelliDocs es una aplicación para que equipos gestionen sus documentos. Puedes subir archivos, organizarlos en carpetas, buscar dentro del contenido y ver los cambios de tus compañeros en tiempo real, todo desde el navegador.

El proyecto nació de la asignatura de proyecto final de Aurora, que pedía hacer la documentación de una aplicación. En vez de documentar algo que no existía, decidí construirla de verdad, y aproveché la asignatura de Desarrollo web en entorno cliente para darle forma completa.

**Aplicación desplegada:**
- Frontend: https://intellidocs-web.vercel.app
- API: https://intellidocs-api.up.railway.app

---

## Funcionalidades

- **Registro e inicio de sesión** — con email y contraseña o con Google. El registro requiere verificar el email antes de poder entrar.
- **Workspaces** — cada equipo tiene su propio espacio de trabajo con sus archivos y miembros. Un usuario puede pertenecer a varios workspaces.
- **Drive** — sistema de archivos con carpetas anidadas. Se pueden subir hasta 4 archivos a la vez, buscar por nombre o por el contenido del documento, y filtrar por etiquetas.
- **Procesamiento de archivos** — cuando subes un PDF o una imagen, la aplicación extrae el texto, cuenta las palabras, obtiene metadatos (número de páginas, dimensiones) y calcula un checksum. Todo esto en segundo plano para no bloquear la subida.
- **Tiempo real** — si dos personas están en el mismo workspace, cualquier cambio (nuevo archivo, carpeta renombrada, miembro añadido) aparece al instante sin recargar la página.
- **Miembros y permisos** — el propietario puede invitar a otros usuarios por email y configurar permisos por carpeta.
- **Etiquetas** — se pueden crear etiquetas de colores y asignarlas a los archivos para organizarlos.
- **Papelera** — los archivos eliminados van a la papelera y se pueden recuperar antes de borrarlos definitivamente.
- **Actividad** — registro de todo lo que pasa en el workspace: quién subió qué, quién borró qué y cuándo.
- **Planes y pagos** — integración con Stripe para gestionar suscripciones. El plan determina cuánto almacenamiento y cuántos miembros puede tener el workspace.

---

## Stack tecnológico

El proyecto está montado como un monorepo con Turborepo, lo que me permite tener el frontend y el backend en el mismo repositorio compartiendo tipos TypeScript.

### Frontend — `apps/web`

| Tecnología | Por qué la usé |
|---|---|
| React 19 | Framework de UI |
| TanStack Router | Enrutamiento basado en archivos con tipado completo |
| TanStack React Query | Gestión del estado del servidor y caché |
| Zustand | Estado global ligero (sesión, workspace activo...) |
| Tailwind CSS 4 + shadcn/ui | Estilos y componentes de UI |
| Socket.IO Client | Conexión WebSocket para el tiempo real |
| Vite | Bundler rápido |
| Zod | Validación de formularios y esquemas |

### Backend — `apps/api`

| Tecnología | Por qué la usé |
|---|---|
| NestJS 11 | Framework de Node.js modular, buena separación de responsabilidades |
| Prisma 7 | ORM con migraciones y tipado generado automáticamente |
| PostgreSQL | Base de datos principal |
| Redis | Cola de jobs y throttling distribuido |
| BullMQ | Procesamiento asíncrono de archivos |
| Socket.IO | WebSockets para el tiempo real |
| Passport.js | Autenticación con JWT, Local y Google OAuth 2.0 |
| Cloudflare R2 | Almacenamiento de archivos (compatible con S3) |
| Stripe | Pagos y suscripciones |
| Resend | Emails transaccionales (verificación, invitaciones) |

### Paquetes compartidos — `packages/`

- `@intellidocs/types` — tipos TypeScript compartidos entre el frontend y el backend
- `@intellidocs/ui` — componentes React reutilizables

---

## Arquitectura

```
┌──────────────────────────────────────────┐
│           NAVEGADOR (React)              │
│  TanStack Router · React Query · Zustand │
└──────────┬───────────────────┬───────────┘
           │ REST API          │ WebSocket
           ▼                   ▼
┌──────────────────────────────────────────┐
│           BACKEND (NestJS)               │
├──────────┬──────────┬────────┬───────────┤
│   Auth   │  Drive   │ Stripe │ Realtime  │
│ (JWT +   │ (Folders │(Pagos) │(Socket.IO)│
│  OAuth)  │ + Files) │        │           │
└──────────┴────┬─────┴────────┴──────┬────┘
                │                     │
     ┌──────────┼──────────┐          │
     ▼          ▼          ▼          ▼
PostgreSQL    Redis     R2/S3      PgPubSub
(datos)     (colas)   (archivos)  (triggers)
```

Dos cosas que me parecen interesantes de la arquitectura:

**Tiempo real con PgPubSub:** en vez de hacer polling o gestionar manualmente los eventos, puse triggers en PostgreSQL que publican un mensaje cada vez que cambia una fila. El backend los escucha, decide a qué usuarios les afecta y se lo manda por WebSocket. Así el frontend solo tiene que suscribirse a un canal y React Query invalida la caché automáticamente.

**Procesamiento asíncrono con BullMQ:** cuando subes un archivo, la API lo guarda en R2 y encola un job en Redis. Un worker independiente lo procesa sin que el usuario tenga que esperar. El estado del archivo pasa de `uploading` → `processing` → `ready` (o `error` si algo falla), y el frontend lo refleja en tiempo real.

---

## Despliegue

| Componente | Servicio |
|---|---|
| Frontend | **Vercel** — https://intellidocs-web.vercel.app |
| Backend | **Railway** — https://intellidocs-api.up.railway.app |
| Base de datos | Railway PostgreSQL plugin |
| Redis | Railway Redis plugin |
| Almacenamiento | Cloudflare R2 |
| Email | Resend |
| Pagos | Stripe (modo test) |

---

## Ejecutar en local

### Requisitos

- Node.js ≥ 22
- pnpm (`npm install -g pnpm`)
- Docker y Docker Compose

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Medinaadev/IntelliDocs
cd IntelliDocs

# 2. Levantar la infraestructura local (PostgreSQL, Redis, MinIO)
docker-compose up -d

# 3. Instalar dependencias
pnpm install

# 4. Crear el archivo de entorno
cp apps/api/.env.example apps/api/.env
# Editar apps/api/.env con los valores locales

# 5. Ejecutar migraciones
cd apps/api && pnpm prisma migrate dev && cd ../..

# 6. Arrancar todo
pnpm dev
```

Una vez arrancado:
- Frontend: http://localhost:5173
- API: http://localhost:3000
- MinIO (panel de archivos): http://localhost:9001

### Variables de entorno mínimas (`apps/api/.env`)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/intellidocs"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="cualquier-string-largo"
BACKEND_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5173"

# MinIO local
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="intellidocs"
S3_REGION="us-east-1"

# Si se deja vacío, los emails fallan en silencio y la app sigue funcionando
RESEND_API_KEY=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
```

---

## Estructura del repositorio

```
IntelliDocs/
├── apps/
│   ├── api/                  # Backend NestJS
│   │   ├── prisma/           # Schema y migraciones
│   │   └── src/
│   │       ├── auth/         # Autenticación y sesiones
│   │       ├── workspaces/   # Drive, miembros, etiquetas
│   │       ├── processing/   # Cola de procesamiento
│   │       ├── realtime/     # WebSockets
│   │       ├── storage/      # Cloudflare R2
│   │       └── stripe/       # Pagos
│   └── web/                  # Frontend React + Vite
│       └── src/
│           ├── routes/       # Páginas (file-based routing)
│           ├── components/   # Componentes UI
│           ├── stores/       # Estado global (Zustand)
│           └── lib/          # API client, queries, utilidades
├── packages/
│   ├── types/                # Tipos TypeScript compartidos
│   └── ui/                   # Componentes compartidos
├── docker-compose.yml
└── turbo.json
```
