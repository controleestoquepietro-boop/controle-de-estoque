# Arquitetura de Conexão ao Banco de Dados - Projeto Controle de Estoque

## Resumo Executivo
O projeto utiliza **PostgreSQL via Supabase**, com duas camadas de conexão:
1. **Drizzle ORM + pg (TCP)** — para operações normais do banco
2. **Supabase Auth Client (HTTP)** — para autenticação/usuários

---

## 1. ARQUIVOS CRÍTICOS DE CONEXÃO

### 1.1 `server/db.ts` ⭐ **PRINCIPAL**
**Responsável por:** Conexão TCP ao PostgreSQL e inicialização do Drizzle ORM

**Caminho:** `c:\Users\sammu\Desktop\backup2025\server\db.ts`

**Variáveis de Ambiente Utilizadas:**
- `SUPABASE_DB_URL` (prioridade 1) → `postgres://user:pass@host:5432/db`
- `DATABASE_URL` (prioridade 2) → `postgresql://user:pass@host:5432/db`
- `SUPABASE_DB_HOST_IPV4` (opcional) → força uso de IPv4 em vez do hostname

**Imports Críticos:**
```typescript
import { Pool } from 'pg';  // Native PostgreSQL pooling
import { drizzle } from 'drizzle-orm/node-postgres';  // ORM
import 'dotenv/config';  // Carrega variáveis de ambiente
```

**Trecho de Código - Inicialização da Pool:**
```typescript
let connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

// ... validação e parsing ...

const poolOptions: any = {
  max: 1,  // Max connections (serverless)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false },
  connectionString,
};

const pool = new Pool(poolOptions);

export const db = drizzle(pool, { schema });
```

**Configuração TCP:**
- Port: `5432` (padrão PostgreSQL)
- SSL: Habilitado com `rejectUnauthorized: false`
- Max connections: 1 (otimizado para Render/serverless)
- Connection timeout: 5000ms

---

### 1.2 `server/supabaseClient.ts` ⭐ **AUTENTICAÇÃO**
**Responsável por:** Cliente Supabase para autenticação (Auth) — NÃO para banco de dados

**Caminho:** `c:\Users\sammu\Desktop\backup2025\server\supabaseClient.ts`

**Variáveis de Ambiente Utilizadas:**
- `SUPABASE_URL` → `https://project.supabase.co`
- `SUPABASE_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` → tokens de autenticação

**Imports Críticos:**
```typescript
import { createClient } from '@supabase/supabase-js';  // Supabase Auth client
import dotenv from 'dotenv';  // Carrega .env
```

**Trecho de Código - Criação do Cliente:**
```typescript
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,  // Desabilita WebSocket (Render bloqueia)
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/server',
    },
  },
});

export const supabaseService = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY, {
  // ... config similar para operações admin
});
```

**Status Atual:**
- WebSocket DESABILITADO (para evitar bloqueios em Render/Fly)
- Apenas autenticação via HTTP REST
- Cliente principal: `supabase` (Anon key)
- Cliente admin: `supabaseService` (Service Role key)

---

### 1.3 `drizzle.config.ts` 
**Responsável por:** Configuração do Drizzle Kit para migrations

**Caminho:** `c:\Users\sammu\Desktop\backup2025\drizzle.config.ts`

**Variáveis de Ambiente Utilizadas:**
- `DATABASE_URL` → connection string para migrations

**Código:**
```typescript
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

---

### 1.4 `shared/schema.ts`
**Responsável por:** Definição das tabelas PostgreSQL via Drizzle

**Caminho:** `c:\Users\sammu\Desktop\backup2025\shared\schema.ts`

**Imports Críticos:**
```typescript
import { pgTable, text, varchar, integer, timestamp, boolean, real, jsonb } from "drizzle-orm/pg-core";
```

**Tabelas Definidas:**
```typescript
export const users = pgTable("users", { ... });
export const alimentos = pgTable("alimentos", { ... });
export const modelosProdutos = pgTable("modelos_produtos", { ... });
export const auditLog = pgTable("audit_log", { ... });
export const alimentosBackfillReview = pgTable("alimentos_backfill_review", { ... });
export const alimentosBackup20251105 = pgTable("alimentos_backup_20251105", { ... });
```

---

### 1.5 Scripts de Setup (Histórico, não usados atualmente)
**Arquivos:**
- `scripts/setup-supabase.ts` — Pool Neon (DESCONTINUADO)
- `scripts/setup-supabase-client.ts` — Cliente Supabase (DESCONTINUADO)
- `scripts/test-supabase.js` — Teste Supabase Auth (DESCONTINUADO)
- `scripts/check-db-conn.js` — Diagnóstico DNS/TCP (ATIVO - diagnóstico apenas)

---

## 2. VARIÁVEIS DE AMBIENTE - MAPA COMPLETO

### Variáveis Obrigatórias

| Variável | Valor Esperado | Usado em | Propósito |
|----------|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | `server/db.ts`, `drizzle.config.ts` | Conexão TCP ao PostgreSQL |
| `SUPABASE_DB_URL` | `postgres://user:pass@host:5432/db` | `server/db.ts` | Alternativa para DATABASE_URL (prioridade 1) |
| `SUPABASE_URL` | `https://project.supabase.co` | `server/supabaseClient.ts` | URL da API Supabase (Auth) |
| `SUPABASE_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` | Token JWT | `server/supabaseClient.ts` | Autenticação Supabase |

### Variáveis Opcionais

| Variável | Valor Esperado | Usado em | Propósito |
|----------|---|---|---|
| `SUPABASE_DB_HOST_IPV4` | `34.120.45.67` (apenas IP) | `server/db.ts` | Força conexão via IPv4 (evita ENETUNREACH em Render) |
| `NODE_ENV` | `development` ou `production` | Vários | Modo da aplicação |
| `ENABLE_DEV_ROUTES` | `1` | `server/routes.ts` | Habilita rotas de desenvolvimento |

### Variáveis do Frontend (não usadas no backend, mas necessárias)
```
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 3. FLUXO DE CONEXÃO

### Startup Sequence
```
1. server/index.ts inicia
   ↓
2. server/db.ts carregado
   - Lê SUPABASE_DB_URL ou DATABASE_URL
   - Cria Pool { connectionString, max: 1, ssl: true }
   - Inicializa Drizzle ORM
   ↓
3. server/supabaseClient.ts carregado (se usado)
   - Lê SUPABASE_URL, SUPABASE_KEY
   - Cria cliente Supabase (Auth apenas, WebSocket desabilitado)
   ↓
4. server/routes.ts registra endpoints
   - GET /api/alimentos → storage.getAllAlimentos() → db query via Drizzle
   - POST /api/auth/login → Supabase Auth client
   ↓
5. App listening on port
```

### Query Flow (exemplo)
```
GET /api/alimentos (autenticado)
  ↓
routes.ts requireAuth middleware
  ↓
storage.getAllAlimentos()
  ↓
db.query() [Drizzle ORM]
  ↓
pool.connect() → TCP to PostgreSQL:5432
  ↓
Execute: SELECT * FROM alimentos WHERE user_id = $1
  ↓
Response JSON
```

---

## 4. ESTADO ATUAL - FLY.IO

**Status:** Código configurado para funcionar com qualquer host PostgreSQL + Supabase Auth

**Variáveis de Ambiente Esperadas (Fly.io):**
```bash
DATABASE_URL=postgresql://user:password@host:5432/database
SUPABASE_URL=https://project.supabase.co
SUPABASE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Mudanças necessárias para Fly.io:**
- Nenhuma mudança no código!
- Fly.io permite IPv4 e IPv6 de saída → funcionará direto
- Se `DATABASE_URL` apontar para PostgreSQL com IPv4, funciona imediatamente
- Se `DATABASE_URL` for apenas IPv6 (como em Render anterior), pode adicionar `SUPABASE_DB_HOST_IPV4` se necessário

---

## 5. CHECKLIST DE DEPLOY NO FLY.IO

- [ ] Criar/provisionar banco PostgreSQL (Neon, Railway, etc.) com IPv4/IPv6
- [ ] Copiar connection string para `DATABASE_URL` no Fly.io (Environment)
- [ ] Configurar Supabase Auth (SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Deploy via `flyctl deploy`
- [ ] Testar: `curl https://app.fly.dev/api/alimentos` (deve retornar 401 ou 200 com dados, não 502)
- [ ] Se retornar 502 ENETUNREACH → adicionar `SUPABASE_DB_HOST_IPV4` com IPv4 do host

---

## 6. Problemas Conhecidos & Soluções

| Problema | Causa | Solução |
|----------|-------|--------|
| 502 ENETUNREACH | Host PostgreSQL só em IPv6, plataforma sem saída IPv6 | Adicionar `SUPABASE_DB_HOST_IPV4` |
| Connection timeout | Pool max=1, timeoutMillis baixo | Aumentar `connectionTimeoutMillis` em db.ts |
| SSL certificate error | SSL desabilitado | Manter `ssl: { rejectUnauthorized: false }` |
| "Non-101 status code" | WebSocket ativo | Confirmado desabilitado em supabaseClient.ts |

---

## 7. Referência Rápida de Imports

**Para usar o banco de dados:**
```typescript
import { db } from './server/db';

const alimentos = await db.query.alimentos.findMany();
```

**Para usar Supabase Auth:**
```typescript
import { supabase } from './server/supabaseClient';

const { data, error } = await supabase.auth.signUp({ email, password });
```

**Para usar o pool PostgreSQL diretamente (não recomendado):**
```typescript
// Não é necessário, use Drizzle através de db
```

---

## Resumo Final

- **Banco de Dados:** PostgreSQL via TCP (`pg` library + Drizzle ORM)
- **Autenticação:** Supabase Auth via HTTP (WebSocket desabilitado)
- **Plataforma:** Fly.io (sem limitações IPv6 conhecidas)
- **Status de Código:** Pronto para produção em Fly.io
