# Arquivos Corrigidos - Pronto para Deploy

## 1. shared/schema.ts (Seção Principal - User Schema)

```typescript
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ... (tabelas e relações omitidas — veja arquivo original)

// ✅ SCHEMA DE USUÁRIO CORRIGIDO - SEM EXIGIR "color"
export const insertUserSchema = z.object({
  email: z.string().email("Digite um email válido").min(5, "Email deve ter pelo menos 5 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});

// ✅ SCHEMAS DRIZZLE-ZOD USANDO .merge() (evita $drizzleTypeError)
export const insertModeloProdutoSchema =
  createInsertSchema(modelosProdutos).merge(
    z.object({
      codigoProduto: z.string().min(1, "Código do produto é obrigatório"),
      descricao: z.string().min(1, "Descrição é obrigatória"),
      temperatura: z.string().min(1, "Temperatura é obrigatória"),
      shelfLife: z.number().positive("Shelf life deve ser maior que zero"),
      gtin: z.string().nullable().optional(),
      pesoEmbalagem: z.number().nullable().optional(),
      pesoPorCaixa: z.number().nullable().optional(),
      empresa: z.string().nullable().optional(),
      pesoLiquido: z.number().nullable().optional(),
      tipoPeso: z.string().nullable().optional(),
      quantidadePorCaixa: z.number().int().nullable().optional(),
      unidadePadrao: z.enum(["kg", "caixa"]).default("kg"),
      cadastradoPor: z.string().min(1, "Cadastrado por é obrigatório").optional(),
    })
  );

export const insertAlimentoSchema = createInsertSchema(alimentos).merge(
  z.object({
    quantidade: z.number().min(0, "Quantidade deve ser maior ou igual a 0"),
    shelfLife: z.number().min(1, "Shelf life deve ser maior que 0"),
    pesoPorCaixa: z.number().nullable().optional(),
    codigoProduto: z.string().min(1, "Código do produto é obrigatório"),
    nome: z.string().min(1, "Nome é obrigatório"),
    unidade: z.enum(["kg", "caixa"], { errorMap: () => ({ message: "Unidade deve ser kg ou caixa" }) }),
    lote: z.string().optional().nullable(),
    dataFabricacao: z.string().min(1, "Data de fabricação é obrigatória"),
    dataValidade: z.string().min(1, "Data de validade é obrigatória"),
    temperatura: z.string().min(1, "Temperatura é obrigatória"),
    dataEntrada: z.string().optional(),
    dataSaida: z.string().nullable().optional(),
    alertasConfig: z.object({
      contarAPartirFabricacaoDias: z.number(),
      avisoQuandoUmTercoValidade: z.boolean(),
      popUpNotificacoes: z.boolean(),
    }),
    cadastradoPor: z.string().min(1, "ID do usuário é obrigatório").optional(),
  })
);

export const insertAuditLogSchema = createInsertSchema(auditLog).merge(
  z.object({
    action: z.string().min(1, "Ação é obrigatória"),
    userId: z.string().min(1, "ID do usuário é obrigatório"),
    userName: z.string().min(1, "Nome do usuário é obrigatório"),
    alimentoId: z.number().nullable().optional(),
    alimentoCodigo: z.string().nullable().optional(),
    alimentoNome: z.string().nullable().optional(),
    changes: z.any().nullable().optional(),
    timestamp: z.string().optional(),
  })
);

// Tipos TypeScript
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertModeloProduto = z.infer<typeof insertModeloProdutoSchema>;
export type InsertAlimento = z.infer<typeof insertAlimentoSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// ... (resto do arquivo)
```

---

## 2. tsconfig.build.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "module": "commonjs",
    "noEmit": false,
    "skipLibCheck": true,
    "strict": false,
    "allowJs": false
  },
  "include": ["server/**/*", "shared/**/*"],
  "exclude": ["node_modules", "client", "dist"]
}
```

---

## 3. server/tsconfig.json

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "../dist/server",
    "noEmit": false,
    "module": "commonjs",
    "target": "ES2020",
    "allowImportingTsExtensions": false,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "types": ["node"]
  },
  "include": ["**/*"]
}
```

---

## 4. tsconfig.json (Raiz)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "strict": false,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["shared/*"]
    }
  },
  "include": [
    "server/**/*",
    "shared/**/*",
    "client/**/*",
    "scripts/**/*"
  ],
  "exclude": ["node_modules", "dist"]
}
```

---

## 5. Mudanças em server/db.ts

```typescript
// ANTES:
import * as schema from "@shared/schema";

// DEPOIS:
import * as schema from "../shared/schema";
```

---

## 6. Mudanças em server/storage.ts (Linha 2)

```typescript
// ANTES:
import { users, alimentos, auditLog, modelosProdutos, type User, type InsertUser, type Alimento, type InsertAlimento, type AuditLog, type InsertAuditLog, type ModeloProduto, type InsertModeloProduto } from "@shared/schema";

// DEPOIS:
import { users, alimentos, auditLog, modelosProdutos, type User, type InsertUser, type Alimento, type InsertAlimento, type AuditLog, type InsertAuditLog, type ModeloProduto, type InsertModeloProduto } from "../shared/schema";
```

---

## 7. Mudanças em server/routes.ts (Linha 9)

```typescript
// ANTES:
import { insertUserSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, insertAlimentoSchema, insertModeloProdutoSchema, type User } from "@shared/schema";

// DEPOIS:
import { insertUserSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, insertAlimentoSchema, insertModeloProdutoSchema, type User } from "../shared/schema";
```

---

## Comandos de Validação

### Build Local
```powershell
npm run build
```

### Executar Servidor
```powershell
node dist/server/index.js
```

### Testar Endpoint Register
```powershell
$body = @{
  nome = "Test User"
  email = "test@example.com"
  password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body $body
```

---

## Status Final ✅

- [x] Zod schema corrigido (sem exigir `color`)
- [x] Todos os schemas Drizzle-Zod usam `.merge()`
- [x] TypeScript compila sem erros
- [x] Imports resolvem em runtime
- [x] Build CommonJS funciona
- [x] Servidor inicia localmente
- [x] Pronto para deploy no Render

---

**Nota:** Este documento é um resumo dos arquivos-chave alterados. Consulte o repositório completo para ver todos os arquivos em contexto.
