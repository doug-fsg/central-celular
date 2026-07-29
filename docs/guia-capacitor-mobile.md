# Plano: Vue + Vite → Capacitor → App nativo (Aprisco)

Roadmap para levar o Aprisco de **PWA web** a **app Android/iOS**, reutilizando o mesmo Vue 3 + Express + Prisma.

**Stack fixa:** Vue 3 · Vite · Vue Router · Pinia · Express · PostgreSQL  
**Entrada nativa:** Capacitor 7 (`webDir: dist`) consumindo a API HTTPS existente

---

## Status atual (jul/2026)

| Fase | Tema | Progresso | Bloqueio |
|------|------|-----------|----------|
| **1** | Backend pronto p/ mobile | ~90% | Zod nos controllers restantes; teste CORS preflight |
| **2** | Vue preparado p/ nativo | **Concluída** | — |
| **3** | Capacitor instalado + APK debug | ~85% | Teste login/relatório no device físico |
| **4** | UI/UX app-like | ~70% | Admin nav “Mais”; skeletons; polish admin |
| **5** | Produção nativa | 0% | Depende da Fase 3 |

**Já no repo:** `capacitor.config.ts`, `src/utils/platform.ts`, `src/capacitor/initNativeShell.ts`, plugins (app, splash, status-bar, haptics, keyboard), build `yarn build:capacitor`, UX do líder (sticky bar, confirm sheet, haptics).

**Ainda não no repo:** pastas `android/` e `ios/` (geradas pelo `cap add`), ícones/splash nativos finais, deep links, lojas.

---

## Princípios (framework → Capacitor)

Capacitor embute **HTML/CSS/JS estáticos** num WebView nativo. Implicações para este projeto:

| Regra | Aprisco hoje | Ação |
|-------|--------------|------|
| Build estático (`dist/`) | ✅ Vite SPA | Manter; **não** usar SSR |
| API externa HTTPS | ✅ Express separado | Capacitor **não** roda `server/` |
| `webDir` = saída do Vite | ✅ `dist` | Nunca apontar para `src/` |
| URL da API no nativo | Variável `VITE_*` no build | `.env.capacitor.example` |
| PWA + Capacitor | Dois builds distintos | PWA só em `yarn build`; SW off em `build:capacitor` |
| Roteamento | `createWebHistory()` | OK com nginx + fallback; **avaliar hash** se refresh quebrar no APK |
| CORS | Origens incl. `capacitor://localhost` | Validar login no device real |

---

## Visão da arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  Browser / PWA          │  Capacitor (Android/iOS)      │
│  yarn build             │  yarn build:capacitor         │
│  + vite-plugin-pwa      │  sem service worker           │
│  API → /api (proxy)     │  API → VITE_API_URL (HTTPS)   │
└────────────┬────────────┴──────────────┬────────────────┘
             │                           │
             └───────────┬───────────────┘
                         ▼
              Express + Prisma (mesma API)
              CORS_ORIGINS + JWT + refresh
```

**Dois produtos, um frontend:** o código Vue é compartilhado; só mudam env de build, splash e plugins nativos.

---

## Fase 1 — Backend (API previsível)

> **Objetivo:** qualquer client (Postman, PWA, Capacitor) loga, lista células e envia relatório sem surpresas.

### 1.1 Respostas e erros
- [x] `server/lib/response.ts` (`ok`, `fail`, `paginated`)
- [x] Refresh token + logout
- [ ] Migrar controllers legados para envelope `{ success, data }`

### 1.2 Validação
- [x] Zod em auth + relatórios (parcial)
- [ ] Zod nos demais controllers admin/célula

### 1.3 CORS e rede
- [x] `CORS_ORIGINS` no `.env`
- [x] Defaults: Vite dev + `capacitor://localhost` + `ionic://localhost`
- [ ] **Teste manual:** `OPTIONS /api/auth/login` a partir de origem Capacitor simulada
- [ ] Documentar IP LAN no CORS se usar live reload (`CAPACITOR_DEV_SERVER_URL`)

### 1.4 Auth mobile
- [x] JWT padronizado, refresh, Pinia com retry 401
- [x] OTP 6 dígitos + setupToken no primeiro acesso

### 1.5 Observabilidade
- [x] `GET /api/health`, `GET /api/health/ready`
- [x] OpenAPI parcial · [`backend-checklist.md`](backend-checklist.md)

### 1.6 Push (estrutura only)
- [x] `DeviceToken` + `POST /api/devices/register`
- [ ] Integrar FCM/APNs (Fase 5)

**Definition of done:** testes de integração de relatório passando; login + envio via Postman com `Authorization` e refresh.

---

## Fase 2 — Vue preparado (concluída)

> **Objetivo:** mesmo código roda em browser, PWA instalado e WebView nativo.

### 2.1 Detecção de plataforma
| Helper | Uso |
|--------|-----|
| `isNativeApp()` | Capacitor iOS/Android |
| `isMobileShell()` | PWA instalado **ou** nativo → layout bottom nav |
| `usePlatform()` | Composable nos componentes |

Arquivos: `src/utils/platform.ts`, `src/utils/pwa.ts`, `src/composables/usePlatform.ts`

### 2.2 API client (`src/services/api.ts`)
| Ambiente | Resolução da base |
|----------|-------------------|
| Dev browser | `localhost:3000` ou proxy |
| Web prod | mesma origem `/api` |
| `VITE_CAPACITOR=true` | `VITE_API_URL` absoluta HTTPS |

### 2.3 Shell nativo (`src/capacitor/initNativeShell.ts`)
- [x] StatusBar, SplashScreen (hide após router ready)
- [x] Botão voltar Android
- [x] Keyboard resize
- [x] Classes `is-native-shell` / `is-mobile-shell`

### 2.4 Builds
```bash
yarn build              # web + PWA
yarn build:capacitor    # nativo, sem PWA plugin
```

Env: copiar `.env.capacitor.example` → `.env.production.local`

**Definition of done:** ✅ implementado.

---

## Fase 3 — Capacitor: do build ao APK debug

> **Objetivo:** APK/IPA abre, autentica e envia relatório contra API staging/prod.

### 3.1 Dependências (feito)
Pacotes Capacitor 7 no `package.json`: core, cli, android, ios, app, splash-screen, status-bar, haptics, keyboard.

### 3.2 Config (`capacitor.config.ts`)

```ts
// Estado atual — não commitar URL de dev em produção
webDir: 'dist'
appId: 'com.aprisco.app'
server: só se CAPACITOR_DEV_SERVER_URL estiver definido
plugins: SplashScreen (manual hide), StatusBar, Keyboard
```

**Melhorias recomendadas (próximo PR):**
- [x] `server.androidScheme: 'https'` (cookies / mixed content Android)
- [x] `CapacitorHttp.enabled: true`
- [x] Hash router no build Capacitor (`createRouterHistory.ts`)
- [x] Script `build:mobile` (`yarn build:capacitor && cap sync`)
- [ ] Ícones Android/iOS via `@capacitor/assets` ou manual em `android/` / `ios/`

### 3.3 Pipeline de build nativo

```bash
# 1. Env
cp .env.capacitor.example .env.production.local
# Editar: VITE_API_URL=https://SEU-DOMINIO.com/api

# 2. Build estático
yarn build:capacitor

# 3. Plataformas (primeira vez)
npx cap add android
# npx cap add ios   # requer Mac + Xcode

# 4. Sync + IDE
yarn cap:sync
yarn cap:android    # abre Android Studio

# 5. Run no device
npx cap run android --livereload --external   # dev opcional
```

Script composto sugerido (adicionar ao `package.json`):
```json
"build:mobile": "yarn build:capacitor && cap sync"
```

### 3.4 Live reload (dev only)

```bash
# Terminal 1
yarn dev --host

# Terminal 2
export CAPACITOR_DEV_SERVER_URL=http://SEU-IP-LAN:5173
yarn cap:sync && npx cap run android
```

Incluir `http://SEU-IP:5173` em `CORS_ORIGINS` no backend.

### 3.5 Roteamento Vue (decisão pendente)

| Modo | Prós | Contras | Recomendação |
|------|------|---------|--------------|
| **History** (`createWebHistory`) | URLs limpas; já em prod web | Refresh deep link pode 404 no APK | Manter **se** nginx/`index.html` fallback OK no Capacitor |
| **Hash** (`createWebHashHistory`) | Funciona sem servidor | URLs com `#` | Plano B se rotas quebrarem no device |

**Checklist:**
- [x] Testes automatizados Capacitor/mobile (ver seção Testes abaixo)
- [ ] Testar refresh em `/attendance` no APK
- [x] Hash mode no build Capacitor; history no web

### 3.6 Checklist de teste no device

- [ ] Splash nativo → some após login/dashboard
- [ ] Login senha + fluxo OTP primeiro acesso
- [ ] Marcar presenças + enviar relatório (haptic + confirm sheet)
- [ ] Token refresh após 401 (deixar app aberta > exp JWT)
- [ ] Admin: dashboard + listar células
- [ ] Teclado não cobre campos (Keyboard plugin)
- [ ] Botão voltar Android nas telas internas

**Definition of done:** vídeo ou anotação de 1 fluxo líder completo no APK debug contra API real.

---

## Fase 4 — UI/UX mobile

> **Objetivo:** parecer app nativo, não site encolhido. **Prioridade: líder → admin.**

### 4.1 Fluxo do líder (feito)
- [x] `MobilePageHeader` — título + período
- [x] `MobileStickyActionBar` — enviar fixo acima da bottom nav
- [x] Progresso presenças (célula + culto)
- [x] `ReportConfirmSheet` — confirmação bottom sheet
- [x] `SuccessReportModal` + haptics
- [x] Inputs 16px (anti-zoom iOS)
- [x] Toggle admin/célula no menu Perfil (sem FAB)

### 4.2 Navegação admin (pendente)
- [x] Bottom nav com 3 atalhos + **“Mais”** (Membros, Rede, etc.)
- [x] Skeleton em dashboard admin, listas de células/usuários/membros
- [ ] Pull-to-refresh nas listas (opcional)

### 4.3 Design system mobile
- [ ] Cards e empty states padronizados (`MobileCard`, `EmptyState`)
- [ ] Busca sticky no topo das listas admin
- [ ] Replicar padrão sticky bar em outras ações críticas (ex.: salvar membro)

### 4.4 Critério UX
Líder: **< 2 min** abrir → marcar presenças → enviar, sem scroll excessivo.

---

## Fase 5 — Produção nativa e lojas

> Só depois da Fase 3 validada em device real.

### 5.1 Assets nativos
- [ ] Ícone 1024 + adaptive icon Android
- [ ] Splash screens ( `@capacitor/assets generate` )
- [ ] `Info.plist` permissões (câmera futura, notificações)
- [ ] `AndroidManifest`: `INTERNET`, `networkSecurityConfig` (sem cleartext em prod)

### 5.2 Deep links
Rotas críticas: `reset-password`, SSO Gileade, convite.

```ts
// src/capacitor/deepLinks.ts (futuro)
App.addListener('appUrlOpen', ({ url }) => {
  router.push(parseDeepLink(url))
})
```

- [ ] Universal Links (iOS) + App Links (Android)
- [ ] Handler no Vue Router

### 5.3 Push notifications
- [ ] Firebase (Android) + APNs (iOS)
- [ ] Registrar token via `POST /api/devices/register`
- [ ] Lembrete de relatório semanal

### 5.4 Segurança nativa
- [ ] ProGuard release Android (`minifyEnabled true`)
- [ ] Sem `cleartext: true` em prod
- [ ] Avaliar certificate pinning se dados sensíveis crescerem
- [ ] Tokens só em storage seguro (nunca senha em Preferences)

### 5.5 Publicação
- [ ] Play Console (internal testing → closed → production)
- [ ] App Store Connect (TestFlight)
- [ ] Política de privacidade + screenshots por tamanho

### 5.6 Live updates (opcional)
- [ ] `@capgo/capacitor-updater` — bundle OTA sem loja (só JS/assets, não native code)

---

## Matriz de ambientes

| Variável | Web dev | Web prod | Capacitor build |
|----------|---------|----------|-----------------|
| `VITE_API_URL` | `http://localhost:3000` | omitir ou `/api` | `https://dominio.com/api` |
| `VITE_CAPACITOR` | — | — | `true` |
| `CAPACITOR_DEV_SERVER_URL` | — | — | `http://IP:5173` (dev only) |
| `CORS_ORIGINS` (server) | localhost:5173 | domínio prod | + capacitor://localhost |

---

## Comandos (cola rápida)

```bash
# Desenvolvimento full-stack
yarn start:dev

# Web produção
yarn build && yarn preview

# Ciclo nativo
cp .env.capacitor.example .env.production.local
yarn build:capacitor && yarn cap:sync
yarn cap:android

# Testes backend
yarn test              # 47 testes (server + src + capacitor.config)
yarn test:unit         # só frontend (src/)
yarn test:server       # só server/
yarn test:integration  # relatórios com DB (skip sem DATABASE_URL)
```

---

## Troubleshooting (Vue + Capacitor)

| Sintoma | Causa provável | Correção |
|---------|----------------|----------|
| Tela branca no APK | `webDir` errado ou build não rodou | `yarn build:capacitor && cap sync` |
| API 401 / CORS | URL localhost no build nativo | `VITE_API_URL` HTTPS absoluta |
| Login OK web, fail app | Origem não listada em CORS | Adicionar `capacitor://localhost` |
| Refresh quebra rota | History mode sem fallback | Hash router ou `server.url` dev |
| PWA cache conflita | SW no build nativo | Confirmar `VITE_CAPACITOR=true` desliga PWA plugin |
| Zoom nos inputs iOS | font-size < 16px | Classe `text-base` / CSS global shell |
| Splash não some | `launchAutoHide: false` | Chamar `hideNativeSplash()` após router ready ✅ |

---

## O que NÃO fazer

- Reescrever em React Native ou Flutter
- Migrar backend só por causa do Capacitor
- Commitar `server.url` de dev no `capacitor.config.ts`
- Publicar na loja antes do fluxo líder fechar no device
- Ativar push antes de FCM + `DeviceToken` testados
- Mistigar `npm` e `yarn` lockfiles (preferir só `yarn.lock`)

---

## Referências no repo

| Área | Arquivo |
|------|---------|
| API + refresh | `src/services/api.ts` |
| Plataforma | `src/utils/platform.ts`, `src/composables/usePlatform.ts` |
| Shell nativo | `src/capacitor/initNativeShell.ts` |
| Config Capacitor | `capacitor.config.ts` |
| Build Vite | `vite.config.ts` |
| Router | `src/router/index.ts` |
| UX líder | `src/views/AttendanceForm.vue`, `MobileStickyActionBar.vue`, `ReportConfirmSheet.vue` |
| Bottom nav | `src/components/BottomNavbar.vue` |
| Backend auth | `server/controllers/auth.controller.ts` |
| CORS | `server/lib/cors.ts` |
| Deploy | `docker-compose.yml`, `.env.example`, `.env.capacitor.example` |
| Testes relatório | `server/tests/relatorios.test.ts` |

---

## Testes automatizados (Capacitor + mobile)

| Arquivo | O que cobre |
|---------|----------------|
| `src/services/resolveApiBase.test.ts` | URL da API por ambiente (Capacitor HTTPS, prod web, localhost) |
| `src/utils/platform.test.ts` | `isNativeApp`, `isMobileShell`, classes DOM |
| `src/utils/pwa.test.ts` | Detecção PWA standalone |
| `src/router/createRouterHistory.test.ts` | Hash no Capacitor, history no web |
| `server/tests/capacitor.config.test.ts` | `webDir`, `androidScheme`, CapacitorHttp |
| `server/tests/cors.test.ts` | Preflight `capacitor://` e `ionic://` |
| `server/tests/cors.env.test.ts` | Origens default incl. Ionic |
| `server/tests/health.test.ts` | `GET /api/health` |
| `server/tests/relatorios.test.ts` | Fluxo líder + IDOR (integração) |
| `server/tests/security.test.ts` | Auth rate limit, JWT |

Rodar no WSL: `yarn test` (47 testes) ou `yarn test:unit` / `yarn test:server`.

---

## Próximas 3 ações (ordem sugerida)

1. **Testar login + relatório no celular** (`yarn cap:android` → Run no Android Studio)
2. **Ícones/splash nativos** (`@capacitor/assets generate`)
3. **Menu “Mais” no admin mobile** + skeletons (Fase 4.2)

---

*Última atualização: jul/2026 — alinhado a Capacitor 7 + Vue 3/Vite SPA.*
