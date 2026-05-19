# IntelliDocs

IntelliDocs es una aplicación para que equipos gestionen sus documentos. Puedes subir archivos, organizarlos en carpetas, buscar dentro del contenido y ver los cambios de tus compañeros en tiempo real, todo desde el navegador.

El proyecto nació de la asignatura de proyecto final de Aurora, que pedía hacer la documentación de una aplicación. En vez de documentar algo que no existía, decidí construirla de verdad, y aproveché la asignatura de Desarrollo web en entorno cliente para darle forma completa.

**Producción:**
- Frontend: https://intellidocs-web.vercel.app
- API: https://intellidocs-api.up.railway.app

---

## Stack

| Parte | Tecnologías |
|---|---|
| Frontend | React 19, TanStack Router, React Query, Zustand, Tailwind CSS, shadcn/ui |
| Backend | NestJS, Prisma, PostgreSQL, Redis, BullMQ, Socket.IO |
| Almacenamiento | Cloudflare R2 (compatible S3) |
| Pagos | Stripe |
| Email | Resend |

---

## Despliegue

| Componente | Servicio |
|---|---|
| Frontend | Vercel — https://intellidocs-web.vercel.app |
| Backend | Railway — https://intellidocs-api.up.railway.app |
| Base de datos | Railway PostgreSQL plugin |
| Redis | Railway Redis plugin |
| Almacenamiento | Cloudflare R2 |
| Email | Resend |
| Pagos | Stripe (modo test) |

---

## Ejecutar en local

### Requisitos

- Node.js ≥ 22
- pnpm — `npm install -g pnpm`
- Docker y Docker Compose

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Medinaadev/IntelliDocs
cd IntelliDocs

# 2. Levantar la infraestructura (PostgreSQL, Redis, MinIO)
docker-compose up -d

# 3. Instalar dependencias
pnpm install

# 4. Configurar variables de entorno
cp apps/api/.env.example apps/api/.env

# 5. Ejecutar migraciones
cd apps/api && pnpm prisma migrate dev && cd ../..

# 6. Arrancar todo
pnpm dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000
- MinIO: http://localhost:9001 (usuario: `minioadmin`, contraseña: `minioadmin`)

---

## Documentación

- [`docs/resumen-ejecutivo.md`](docs/resumen-ejecutivo.md) — descripción técnica del proyecto
- [`docs/guia-usuario.md`](docs/guia-usuario.md) — guía de uso de la aplicación
- [`docs/decisiones-tecnicas.md`](docs/decisiones-tecnicas.md) — por qué se eligió cada tecnología

---

## Estructura del monorepo

```
IntelliDocs/
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend React + Vite
├── packages/
│   ├── types/        # Tipos TypeScript compartidos
│   └── ui/           # Componentes compartidos
├── docker-compose.yml
└── turbo.json
```
