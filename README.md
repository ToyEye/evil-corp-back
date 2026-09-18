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
npx prisma generate
# later: npx prisma migrate dev && npx prisma db seed
npm run start:dev
```

- API prefix: `/api`
- CORS: `http://localhost:5173`
- Seed password (when applied): `Password123!` for all users
