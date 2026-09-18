# Evil Corp API

NestJS + Prisma + PostgreSQL backend for the Evil Corp SPA.

## Stack

- NestJS 11
- Prisma 6 + PostgreSQL 16 (Docker)
- JWT auth (Passport)
- Swagger at `/api/docs`

## Setup

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

- API prefix: `/api`
- CORS: `http://localhost:5173`
- Postgres host port: `5433` (container `5432`; avoids clash with a local Windows PostgreSQL on `5432`)
- Seed password: `Password123!` for all users
