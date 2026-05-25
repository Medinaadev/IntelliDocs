# Manual de Despliegue — IntelliDocs

## Arquitectura general

IntelliDocs es un monorepo con dos aplicaciones independientes:

- **`apps/web`** — Frontend React + Vite, desplegado en Vercel
- **`apps/api`** — Backend NestJS, desplegado en Railway

En producción, cada parte tiene su propio servicio. En desarrollo local, la infraestructura (base de datos, Redis y almacenamiento) se levanta con Docker Compose.

---

## Entorno de desarrollo local

### Requisitos previos

- Node.js ≥ 22
- pnpm — `npm install -g pnpm`
- Docker y Docker Compose

### Infraestructura con Docker Compose

El archivo `docker-compose.yml` en la raíz del proyecto levanta tres servicios:

| Servicio   | Puerto      | Descripción                                                     |
| ---------- | ----------- | --------------------------------------------------------------- |
| PostgreSQL | 5432        | Base de datos principal                                         |
| Redis      | 6379        | Caché y colas de trabajo                                        |
| MinIO      | 9000 / 9001 | Almacenamiento de archivos (equivalente local de Cloudflare R2) |

```bash
docker-compose up -d
```

MinIO expone una consola web en `http://localhost:9001` (usuario: `minioadmin`, contraseña: `minioadmin`). Desde ahí se puede crear el bucket `intellidocs` manualmente si es necesario.

### Variables de entorno

Copiar el archivo de ejemplo y rellenarlo:

```bash
cp apps/api/.env.example apps/api/.env
```

Variables principales:

```env
# Base de datos
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/intellidocs"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="string-largo-y-aleatorio"

# URLs
BACKEND_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5173"

# Almacenamiento (MinIO en local)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="intellidocs"
S3_REGION="us-east-1"
```

Las variables de Resend, Google OAuth y Stripe son opcionales en local. Si se dejan vacías, esas funcionalidades fallan en silencio sin romper el resto de la aplicación.

### Migraciones de base de datos

```bash
cd apps/api
pnpm prisma migrate dev
```

### Arrancar el proyecto

```bash
pnpm install
pnpm dev
```

Turbo ejecuta el frontend y el backend en paralelo:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

---

## Despliegue en producción

### Diagrama de servicios

```
Usuario
  │
  ├──> Vercel (Frontend React)
  │         │
  │         └──> Railway (API NestJS)
  │                   ├──> Railway PostgreSQL
  │                   ├──> Railway Redis
  │                   └──> Cloudflare R2 (archivos)
  │
  └── Servicios externos: Stripe · Resend · Google OAuth
```

### Frontend — Vercel

El frontend se despliega automáticamente desde GitHub. Vercel detecta la carpeta `apps/web`, ejecuta `vite build` y sirve los archivos estáticos.

**URL de producción:** https://intellidocs-web.vercel.app

Variables de entorno necesarias en Vercel:

```env
VITE_BACKEND_URL=https://intellidocs-api.up.railway.app
```

### Backend — Railway

El backend se despliega en Railway conectando el repositorio de GitHub. Railway detecta el `package.json` de `apps/api`, instala dependencias y ejecuta el proceso de build de NestJS.

**URL de producción:** https://intellidocs-api.up.railway.app

Servicios en Railway:

| Servicio   | Tipo              |
| ---------- | ----------------- |
| API NestJS | Servicio web      |
| PostgreSQL | Plugin de Railway |
| Redis      | Plugin de Railway |

Variables de entorno necesarias en Railway:

```env
DATABASE_URL=              # Generada automáticamente por el plugin de PostgreSQL
REDIS_URL=                 # Generada automáticamente por el plugin de Redis
JWT_SECRET=                # String aleatorio seguro
BACKEND_URL=               # https://intellidocs-api.up.railway.app
FRONTEND_URL=              # https://intellidocs-web.vercel.app
NODE_ENV=                  # production

# Cloudflare R2
S3_ENDPOINT=               # https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=             # Access key de R2
S3_SECRET_KEY=             # Secret key de R2
S3_BUCKET=                 # intellidocs
S3_REGION=                 # auto

# Email
RESEND_API_KEY=            # Obtenida en resend.com

# Google OAuth
GOOGLE_CLIENT_ID=          # Google Cloud Console
GOOGLE_CLIENT_SECRET=      # Google Cloud Console

# Stripe
STRIPE_SECRET_KEY=         # dashboard.stripe.com
STRIPE_WEBHOOK_SECRET=     # Webhook registrado en el Dashboard de Stripe
STRIPE_PRODUCT_PRO=        # ID del producto Pro en Stripe
STRIPE_PRODUCT_ENTERPRISE= # ID del producto Enterprise en Stripe
```

### Almacenamiento — Cloudflare R2

R2 es el servicio de almacenamiento de objetos de Cloudflare, compatible con la API de S3. Se usa para guardar los archivos subidos por los usuarios.

Pasos para configurarlo:

1. Crear un bucket en el dashboard de Cloudflare → R2
2. Generar un API token con permisos de lectura y escritura sobre el bucket
3. Configurar las variables `S3_*` en Railway con los valores del token generado

A diferencia de AWS S3, R2 no cobra por transferencia de datos (egress), lo que lo hace más económico para aplicaciones con muchas descargas de archivos.

### Migraciones en producción

Las migraciones de Prisma se ejecutan automáticamente al arrancar el API mediante el comando de inicio:

```bash
prisma migrate deploy && node dist/main
```

`migrate deploy` aplica las migraciones pendientes sin generar nuevas, lo que es el comportamiento correcto en producción.

---

## Webhooks de Stripe

Para que los eventos de pago lleguen al backend en producción:

1. Ir a [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) con el modo test activado
2. Crear un endpoint apuntando a `https://intellidocs-api.up.railway.app/webhooks/stripe`
3. Seleccionar los eventos: `customer.subscription.*` e `invoice.*`
4. Copiar el signing secret generado y añadirlo como `STRIPE_WEBHOOK_SECRET` en Railway

---

## Coste estimado de infraestructura

| Servicio      | Plan                                     | Coste    |
| ------------- | ---------------------------------------- | -------- |
| Vercel        | Hobby (gratuito)                         | 0 €/mes  |
| Railway       | Starter con tarjeta                      | ~5 €/mes |
| Cloudflare R2 | Gratuito hasta 10 GB                     | 0 €/mes  |
| Resend        | Gratuito hasta 3.000 emails/mes          | 0 €/mes  |
| Stripe        | Sin cuota fija, comisión por transacción | 0 € base |

El coste total en este volumen es de aproximadamente **5 €/mes**.
