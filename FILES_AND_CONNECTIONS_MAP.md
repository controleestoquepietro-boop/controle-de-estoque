# Mapa de Arquivos de Conexão - Projeto Controle de Estoque

## ARQUIVOS ENCONTRADOS

### 1️⃣ server/db.ts
- **Caminho completo:** `c:\Users\sammu\Desktop\backup2025\server\db.ts`
- **Tipo:** TypeScript (source)
- **Propósito:** Pool PostgreSQL + Drizzle ORM inicialização
- **Status:** ✅ ATIVO E CRÍTICO

**Variáveis de ambiente lidas:**
- `SUPABASE_DB_URL` (prioridade 1)
- `DATABASE_URL` (prioridade 2)
- `SUPABASE_DB_HOST_IPV4` (opcional, força IPv4)

**Imports de conexão:**
```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import 'dotenv/config';
```

**Código-chave (criação do Pool):**
```typescript
const poolOptions: any = {
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false },
  connectionString,
};

const pool = new Pool(poolOptions);
export const db = drizzle(pool, { schema });
```

**Exports:**
- `export const db` — objeto Drizzle para usar em queries

---

### 2️⃣ server/supabaseClient.ts
- **Caminho completo:** `c:\Users\sammu\Desktop\backup2025\server\supabaseClient.ts`
- **Tipo:** TypeScript (source)
- **Propósito:** Cliente Supabase para autenticação (HTTP, NÃO banco de dados)
- **Status:** ✅ ATIVO (apenas autenticação)

**Variáveis de ambiente lidas:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_KEY`

**Imports de conexão:**
```typescript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
```

**Código-chave:**
```typescript
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,  // ← WebSocket desabilitado
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/server',
    },
  },
} as any);

export const supabaseService = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY, {
  // config similar para admin operations
});
```

**Exports:**
- `export const supabase` — cliente anon
- `export const supabaseService` — cliente admin
- `export async function isSupabaseReachable(timeoutMs = 2000): Promise<boolean>` — checagem de reachability

**Nota Importante:** Este arquivo é para autenticação apenas. O banco de dados é acessado via `server/db.ts` (Drizzle + pg).

---

### 3️⃣ drizzle.config.ts
- **Caminho completo:** `c:\Users\sammu\Desktop\backup2025\drizzle.config.ts`
- **Tipo:** TypeScript (config)
- **Propósito:** Configuração Drizzle Kit para migrations
- **Status:** ✅ ATIVO

**Variáveis de ambiente lidas:**
- `DATABASE_URL`

**Imports de conexão:**
```typescript
import { defineConfig } from "drizzle-kit";
```

**Código completo:**
```typescript
import 'dotenv/config';
import { defineConfig } from "drizzle-kit";

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

**Propósito:** Usado em: `npm run migrate` (rodar migrations)

---

### 4️⃣ shared/schema.ts
- **Caminho completo:** `c:\Users\sammu\Desktop\backup2025\shared\schema.ts`
- **Tipo:** TypeScript (source)
- **Propósito:** Definição das tabelas PostgreSQL via Drizzle ORM
- **Status:** ✅ ATIVO

**Imports de conexão:**
```typescript
import { pgTable, text, varchar, integer, timestamp, boolean, real, jsonb } from "drizzle-orm/pg-core";
```

**Tabelas definidas:**
1. `users` — usuários cadastrados
2. `alimentos` — produtos/alimentos em estoque
3. `modelosProdutos` — modelos/categorias de produtos
4. `auditLog` — histórico de operações
5. `alimentosBackfillReview` — tabela de review (backup)
6. `alimentosBackup20251105` — backup 05/11/2025

**Exemplo de tabela:**
```typescript
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  // ...
});
```

---

### 5️⃣ .env (arquivo configuração)
- **Caminho completo:** `c:\Users\sammu\Desktop\backup2025\.env`
- **Tipo:** Dotenv (variáveis de ambiente)
- **Propósito:** Configuração local para desenvolvimento
- **Status:** ⚠️ NÃO commitar em produção

**Variáveis presentes (exemplo):**
```bash
SUPABASE_URL=https://xppfzlscfkrhocmkdjsn.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_URL=postgres://postgres.xppfzlscfkrhocmkdjsn:password@db.xppfzlscfkrhocmkdjsn.supabase.co:5432/postgres
DATABASE_URL=postgresql://postgres:password@db.xppfzlscfkrhocmkdjsn.supabase.co:5432/postgres
SUPABASE_DB_HOST_IPV4=34.120.45.67
ENABLE_DEV_ROUTES=1
```

---

### 6️⃣ scripts/check-db-conn.js (diagnóstico)
- **Caminho completo:** `c:\Users\sammu\Desktop\backup2025\scripts\check-db-conn.js`
- **Tipo:** JavaScript (script de teste)
- **Propósito:** Testar conectividade DNS e TCP do banco
- **Status:** ℹ️ Diagnóstico apenas (não é usado em produção)

**Como usar:**
```bash
$env:SUPABASE_DB_URL = "postgres://user:pass@host:5432/db"
node scripts/check-db-conn.js
```

**Saída esperada:**
```
Testing DB host: db.xppfzlscfkrhocmkdjsn.supabase.co port: 5432
A records (IPv4): [lista de IPs ou vazio]
AAAA records (IPv6): [lista de IPs IPv6 ou vazio]
-> IPv4 { addr: '...' family: 4, ok: true/false }
-> IPv6 { addr: '...' family: 6, ok: true/false }
-> Hostname connect result: { addr: 'host', family: 'auto', ok: true/false }
```

---

### 7️⃣ scripts/ (histórico, descontinuado)
**Arquivos descontinuados (referência histórica):**

- `scripts/setup-supabase.ts` 
  - Objetivo: Setup inicial usando Neon WebSocket
  - Status: ❌ DESCONTINUADO (WebSocket desabilitado)
  - Usa: `@neondatabase/serverless` (antigo, agora usamos `pg`)

- `scripts/setup-supabase-client.ts`
  - Objetivo: Setup usando Supabase JS client
  - Status: ❌ DESCONTINUADO
  - Usa: `createClient` from `@supabase/supabase-js`

- `scripts/test-supabase.js`
  - Objetivo: Testar conexão Supabase Auth
  - Status: ⚠️ Pode estar quebrado (Supabase Auth pode ter mudado)
  - Usa: `createClient` from `@supabase/supabase-js`

---

## RESUMO POR TIPO

### 📊 Conexão ao Banco de Dados (PostgreSQL)
**Arquivo Principal:** `server/db.ts`
```
┌─────────────────────────────┐
│ DATABASE_URL                │
│ SUPABASE_DB_URL             │
└──────────────┬──────────────┘
               ↓
        ┌──────────────┐
        │ pool (pg)    │ ← max:1, TCP only
        └──────┬───────┘
               ↓
        ┌──────────────┐
        │  Drizzle ORM │ ← db object
        └──────────────┘
```

### 🔐 Autenticação (Supabase Auth)
**Arquivo Principal:** `server/supabaseClient.ts`
```
┌─────────────────────────────┐
│ SUPABASE_URL                │
│ SUPABASE_KEY (ou SERVICE)   │
└──────────────┬──────────────┘
               ↓
    ┌──────────────────────┐
    │ supabase client      │ ← HTTP only (WebSocket OFF)
    │ supabaseService      │ ← Admin client
    └──────────────────────┘
```

### 🔄 Migrations
**Arquivo Principal:** `drizzle.config.ts`
```
DATABASE_URL
    ↓
drizzle-kit
    ↓
migrations/ (SQL files)
```

### 📋 Schema Definição
**Arquivo Principal:** `shared/schema.ts`
```
pgTable definitions
    ↓
Drizzle ORM
    ↓
PostgreSQL tables
```

---

## VARIÁVEIS CRÍTICAS PARA FLY.IO

| Variável | Exemplo | Necessário? | Onde configurar |
|----------|---------|-----------|---|
| `DATABASE_URL` | `postgresql://user:pw@host:5432/db` | ✅ SIM | Fly.io Secrets |
| `SUPABASE_URL` | `https://project.supabase.co` | ✅ SIM | Fly.io Secrets |
| `SUPABASE_KEY` | `eyJ...` | ✅ SIM | Fly.io Secrets |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | ✅ SIM | Fly.io Secrets |
| `SUPABASE_DB_HOST_IPV4` | `34.120.45.67` | ❌ Opcional | Fly.io Secrets (se necessário) |

---

## CHECKLIST PARA FLY.IO

- [ ] Obter `DATABASE_URL` do provedor PostgreSQL (conexão TCP)
- [ ] Verificar se host tem IPv4 ou apenas IPv6
- [ ] Se apenas IPv6, obter IPv4 de fallback (ou adicionar a `SUPABASE_DB_HOST_IPV4`)
- [ ] Copiar `SUPABASE_URL` do projeto Supabase
- [ ] Copiar `SUPABASE_KEY` (anon) ou `SUPABASE_SERVICE_ROLE_KEY` (admin)
- [ ] Adicionar todas as variáveis em `flyctl secrets set`
- [ ] Rodar `flyctl deploy`
- [ ] Testar: `curl https://app.fly.dev/api/modelos-produtos` (deve retornar JSON ou 401, não 502)

