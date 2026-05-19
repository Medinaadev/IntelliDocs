# IntelliDocs — Resumen Ejecutivo

**Trabajo de Fin de Grado · Ingeniería Informática**

---

## 1. ¿Qué es IntelliDocs?

IntelliDocs es una plataforma web de gestión documental colaborativa. Permite a equipos de trabajo almacenar, organizar, buscar y compartir documentos desde el navegador, sin necesidad de instalar ningún software.

El proyecto nació con el objetivo de construir, desde cero, una aplicación moderna de nivel profesional que cubra el ciclo completo de un producto real: diseño, desarrollo frontend y backend, infraestructura, autenticación, tiempo real, pagos y despliegue en producción.

---

## 2. Funcionalidades principales

| Área | Descripción |
|---|---|
| **Autenticación** | Registro con email/contraseña o Google OAuth 2.0. Verificación de email obligatoria. Sistema de sesiones con JWT y renovación automática de tokens. |
| **Workspaces** | Espacios de trabajo aislados por equipo. Cada workspace tiene sus propios miembros, archivos y configuración. |
| **Drive** | Sistema de archivos virtual con carpetas jerarquizadas. Subida de hasta 4 archivos simultáneos, vista en cuadrícula, búsqueda de texto completo dentro del contenido de los documentos. |
| **Procesamiento** | Los archivos subidos se procesan automáticamente en segundo plano: extracción de texto (PDFs), dimensiones (imágenes), checksum SHA-256 y conteo de palabras. |
| **Colaboración** | Invitación de miembros por email, control de acceso por roles y permisos granulares por carpeta. |
| **Tiempo real** | Cualquier cambio en el drive, miembros o etiquetas se refleja al instante en todos los usuarios conectados sin necesidad de recargar la página. |
| **Etiquetas** | Sistema de tags con color personalizable para categorizar archivos. |
| **Papelera** | Eliminación suave con posibilidad de restaurar o eliminar definitivamente. |
| **Actividad** | Registro de auditoría completo: quién hizo qué y cuándo. |
| **Planes y pagos** | Integración con Stripe para gestionar suscripciones (Free, Pro, Enterprise). Límites de almacenamiento y miembros según el plan. |

---

## 3. Stack tecnológico

El proyecto está organizado como un **monorepo** con dos aplicaciones independientes: frontend y backend.

### Frontend — `apps/web`

| Tecnología | Uso |
|---|---|
| React 19 | Framework UI |
| TanStack Router | Enrutamiento basado en archivos |
| TanStack React Query | Sincronización de datos con el servidor |
| Zustand | Estado global de la aplicación |
| Tailwind CSS 4 + shadcn/ui | Estilos y componentes |
| Socket.IO Client | Comunicación en tiempo real |
| Vite | Bundler y servidor de desarrollo |
| Zod | Validación de esquemas |

### Backend — `apps/api`

| Tecnología | Uso |
|---|---|
| NestJS 11 (Node.js) | Framework backend modular |
| Prisma 7 | ORM y migraciones de base de datos |
| PostgreSQL | Base de datos principal |
| Redis | Cola de tareas y throttling distribuido |
| BullMQ | Cola de procesamiento de archivos |
| Socket.IO | WebSockets para tiempo real |
| Passport.js | Autenticación (JWT, Local, Google OAuth) |
| AWS S3 / MinIO | Almacenamiento de archivos |
| Stripe | Pagos y suscripciones |
| Resend | Envío de emails transaccionales |

### Paquetes compartidos — `packages/`

- `@intellidocs/types` — Tipos TypeScript compartidos entre frontend y backend
- `@intellidocs/ui` — Librería de componentes reutilizables
- `@intellidocs/eslint-config` y `typescript-config` — Configuraciones comunes

---

## 4. Arquitectura

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
PostgreSQL    Redis     MinIO/S3   PgPubSub
(datos)     (colas)   (archivos)  (triggers)
```

**Flujo de tiempo real:** Los triggers de PostgreSQL detectan cambios en la base de datos → los publica mediante `PgPubSub` → el módulo `Realtime` los reenvía por Socket.IO a los clientes suscritos al canal correspondiente.

**Procesamiento asíncrono:** Al subir un archivo, se encola un job en Redis con BullMQ. Un worker independiente lo procesa (extrae texto, metadatos, etc.) sin bloquear la respuesta HTTP.

---

## 5. Despliegue

La aplicación está desplegada en producción con los siguientes servicios:

| Componente | Servicio |
|---|---|
| Frontend | **Vercel** (CDN global, HTTPS automático) |
| Backend + API | **Railway** (contenedor Node.js) |
| Base de datos | **Railway** PostgreSQL plugin |
| Redis | **Railway** Redis plugin |
| Almacenamiento | **Cloudflare R2** (compatible S3, sin coste de egress) |
| Email | **Resend** |
| Pagos | **Stripe** |

---

## 6. Cómo ejecutar el proyecto en local

### Requisitos previos

- Node.js ≥ 22
- pnpm (`npm install -g pnpm`)
- Docker y Docker Compose

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd IntelliDocs

# 2. Levantar infraestructura local (PostgreSQL, Redis, MinIO)
docker-compose up -d

# 3. Instalar dependencias
pnpm install

# 4. Configurar variables de entorno
# Copiar apps/api/.env.example a apps/api/.env y rellenar los valores

# 5. Ejecutar migraciones de base de datos
cd apps/api
pnpm prisma migrate dev

# 6. Volver a la raíz e iniciar ambas aplicaciones
cd ../..
pnpm dev
```

La aplicación quedará disponible en:
- **Frontend**: `http://localhost:5173`
- **API**: `http://localhost:3000`
- **MinIO (almacenamiento)**: `http://localhost:9001`

### Variables de entorno mínimas (`apps/api/.env`)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/intellidocs"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="un-secreto-largo"
FRONTEND_URL="http://localhost:5173"

# S3/MinIO local
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_BUCKET_NAME="intellidocs"
S3_REGION="us-east-1"

# Resend (puede dejarse vacío en local, los emails no se envían)
RESEND_API_KEY=""

# Google OAuth (opcional en local)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Stripe (opcional en local)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
```

---

## 7. Estructura del repositorio

```
IntelliDocs/
├── apps/
│   ├── api/                  # Backend NestJS
│   │   ├── prisma/           # Schema y migraciones de BD
│   │   └── src/
│   │       ├── auth/         # Autenticación y sesiones
│   │       ├── workspaces/   # Drive, miembros, etiquetas
│   │       ├── processing/   # Cola de procesamiento
│   │       ├── realtime/     # WebSockets
│   │       ├── storage/      # S3/MinIO
│   │       └── stripe/       # Pagos
│   └── web/                  # Frontend React
│       └── src/
│           ├── routes/       # Páginas (file-based routing)
│           ├── components/   # Componentes UI
│           ├── stores/       # Estado global (Zustand)
│           └── lib/          # Utilidades y queries
├── packages/
│   ├── types/                # Tipos compartidos
│   └── ui/                   # Componentes compartidos
├── docker-compose.yml        # Infraestructura local
└── turbo.json                # Configuración del monorepo
```

---

*Documento generado para evaluación académica del TFG.*
