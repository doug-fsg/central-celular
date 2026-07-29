# Backend checklist — produção Express

Use antes de deploy ou de empacotar Capacitor.

## Segurança (P0)

- [x] `JWT_SECRET` obrigatório em produção (`server/lib/env.ts`)
- [x] Sem fallback hardcoded de JWT em middlewares/services
- [x] `create-password` exige `setupToken` pós OTP/convite
- [x] Rate limit em `/api/auth/*` (10 req/min/IP)
- [x] OTP 6 dígitos + lockout in-memory (5 tentativas / 15 min)
- [x] Logs de OTP/tokens removidos de `otpService`
- [x] CORS allowlist via `CORS_ORIGINS`
- [x] Tenant scoping em relatórios, células (mutações), WhatsApp, admin delete
- [x] Rotas write de `/api/usuarios` removidas (admin only)
- [x] WhatsApp montado uma vez via `routes/index.ts`
- [x] Job de aniversário não roda no boot em dev

## Fundação Express

- [x] `createApp()` em `server/app.ts`
- [x] Helmet, morgan, CORS, rate limit global
- [x] `requestId`, `notFound`, `errorHandler` global
- [x] Helpers `ok` / `fail` em `server/lib/response.ts`
- [x] Prisma singleton em `server/lib/prisma.ts`

## Auth mobile

- [x] Payload JWT unificado (`userId`, `accountId`, `isSuperAdmin`)
- [x] `POST /api/auth/refresh` e `POST /api/auth/logout`
- [x] Refresh tokens persistidos (hash SHA256)
- [x] Frontend: `userStore` + refresh automático em `api.ts`

## API operacional

- [x] `GET /api/health` e `GET /api/health/ready`
- [x] `POST /api/devices/register` + model `DeviceToken`
- [x] `relatorioService` com agregação (fix N+1 em listagem)
- [x] Estatísticas admin: presenças via `groupBy` (sem `findMany` unbounded)

## Testes

- [ ] `yarn test` — Supertest P0 (create-password, rate limit, health)
- [ ] Migrar DB: `yarn prisma migrate deploy`

## Variáveis de ambiente

Ver `.env.example`: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, `QUEPASA_UPSTREAM`, `DATABASE_URL`.

## Deploy

1. `yarn install && yarn generate`
2. `yarn prisma migrate deploy`
3. `NODE_ENV=production yarn build` (frontend)
4. `docker compose up -d --build`
