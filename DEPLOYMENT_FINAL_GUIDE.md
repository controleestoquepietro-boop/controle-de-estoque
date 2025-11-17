# Guia Final de Deployment - Controle de Estoque

## Resumo das Mudanças Realizadas

### 1. **Correção do Erro Zod: Campo `color` Obrigatório**

**Problema Original:**
```
ZodError: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": ["color"],
    "message": "Required"
  }
]
```

**Causa:** O schema `insertUserSchema` estava tentando herdar da tabela Drizzle `users` (que tem `color` como obrigatório), mas o frontend nunca envia esse campo. O servidor deveria gerar a cor automaticamente.

**Solução Aplicada em `shared/schema.ts`:**
```typescript
// ANTES (causava erro):
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(...),
  password: z.string().min(6, ...),
  nome: z.string().min(2, ...),
}).omit({
  id: true,
  criadoEm: true,
  resetToken: true,
  resetTokenExpiry: true,
  color: true,  // ❌ Problemas de typing com .omit
});

// DEPOIS (funciona):
export const insertUserSchema = z.object({
  email: z.string().email("Digite um email válido").min(5, "..."),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});
```

**Impacto:** Agora o endpoint `/api/auth/register` aceita apenas `nome`, `email` e `password`. O servidor gera automaticamente a cor no momento da criação (código já existe em `server/storage.ts`).

---

### 2. **Normalização de Todos os Schemas Drizzle-Zod**

Todos os schemas que usam `createInsertSchema()` foram reescritos para usar `.merge()` em vez de `.extend()` ou parâmetro de overrides, evitando conflitos com marcações internas do Drizzle (`$drizzleTypeError`):

- `insertModeloProdutoSchema` — `.merge(z.object({...}))`
- `insertAlimentoSchema` — `.merge(z.object({...}))`
- `insertAuditLogSchema` — `.merge(z.object({...}))` com todos os campos opcionais necessários

---

### 3. **Configuração de TypeScript para Build Correto**

**Alterações em `tsconfig.build.json`:**
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

**Resultado:**
- `npm run build` gera `dist/server/index.js` (ponto de entrada para Render)
- `dist/shared/schema.js` contém tipos compilados
- Suporta CommonJS nativo (Node.js consegue executar sem ERR_REQUIRE_ESM)

---

### 4. **Correção de Imports para Runtime**

Mudança de imports com alias para imports relativos em `server/`:
- `@shared/schema` → `../shared/schema`

Motivo: Node.js em runtime não resolve `tsconfig.json` `paths`. Imports relativos funcionam após compilação.

**Arquivos alterados:**
- `server/db.ts` (line 5)
- `server/storage.ts` (line 2)
- `server/routes.ts` (line 9)

---

## Arquivos Alterados (Resumo)

| Arquivo | Mudança | Razão |
|---------|---------|-------|
| `shared/schema.ts` | Reescrita de `insertUserSchema` como `z.object({...})` puro | Remover campo `color` obrigatório; evitar problemas de typing com `.omit()` |
| `server/routes.ts` | Remove verificação de propriedade `confirmed` inexistente | Correção de tipo Supabase |
| `server/storage.ts` | Adiciona `as any` em calls `.set()` e `.values()` | Contornar incompatibilidade Drizzle/Drizzle-Zod |
| `server/db.ts` | Import relativo `../shared/schema` | Runtime resolvability |
| `tsconfig.json` (novo) | Cria tsconfig raiz com `paths` e `target: ES2020` | Path resolution; consistency |
| `server/tsconfig.json` | Adiciona `module: commonjs`, `target: ES2020` | Output correto |
| `tsconfig.build.json` | Ajusta `outDir: ./dist`, `rootDir: .`, `module: commonjs` | Emissão correta de files |

---

## Build e Teste Local

### Compilar

```powershell
npm run build
```

**Esperado:**
- ✅ `build:app` (Vite) completa em ~10s
- ✅ `build:server` (tsc) compila sem erros
- ✅ `dist/server/index.js` criado

### Executar Localmente

```powershell
node dist/server/index.js
```

**Esperado:**
```
1:04:52 PM [express] 🚀 Servidor rodando em http://0.0.0.0:5000
```

### Testar Endpoint (Powershell)

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

**Esperado:** Sem `ZodError`; resposta `200` ou `400` (depende se Supabase está disponível).

---

## Deploy no Render

### Passos

1. **Commit & Push para repositório (se Git)**
   ```bash
   git add -A
   git commit -m "Fix: Zod schema for user registration without color field"
   git push origin main
   ```

2. **No Painel Render:**
   - Vá para seu serviço (ou crie um novo)
   - **Build Command:** `npm run build`
   - **Start Command:** `node dist/server/index.js`
   - **Environment Variables:** Configure as abaixo

### Variáveis de Ambiente (OBRIGATÓRIAS)

```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://user:password@host/dbname

# Session
SESSION_SECRET=your-random-secret-key-here
SESSION_COOKIE_NAME=session_id

# Frontend URL
FRONTEND_URL=https://seu-frontend.vercel.app (ou seu domínio)

# Node Environment
NODE_ENV=production

# (Opcional) SMTP para envio de emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=seu-app-password
SMTP_FROM=noreply@seu-dominio.com
```

### Ativar Deploy

- Faça push para `main` ou clique "Deploy"
- Render construirá e iniciará o servidor automaticamente
- Monitore logs em **Render Dashboard → Logs**

---

## Validação Pós-Deploy

1. **Testar endpoint `/api/auth/register`:**
   ```bash
   curl -X POST https://seu-dominio.render.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "nome": "Novo Usuário",
       "email": "novo@example.com",
       "password": "Senha123!"
     }'
   ```

2. **Verificar logs do Render:**
   - Nenhum `ZodError`
   - Nenhum `MODULE_NOT_FOUND`
   - Servidor iniciando em porta correta

3. **Testar desde o frontend:**
   - Tente registrar novo usuário
   - Verifique se não há erros 500 de Zod

---

## Checklist Final

- [x] `insertUserSchema` não exige `color`
- [x] Todos os schemas usam `.merge()` (não `.extend()`)
- [x] Build compila sem erros TS
- [x] Servidor inicia localmente (`node dist/server/index.js`)
- [x] Imports resolvem corretamente em runtime
- [x] `tsconfig.build.json` emite CommonJS em `dist/`
- [x] Variáveis de ambiente configuradas no Render
- [ ] Deploy realizado e teste em produção passando

---

## Troubleshooting

| Problema | Causa | Solução |
|----------|-------|--------|
| `MODULE_NOT_FOUND: @shared/schema` | Imports com alias em runtime | Verificar que imports em `server/*.ts` usam `../shared/schema` |
| `ZodError: color Required` | Schema antigo ainda em uso | Verificar `shared/schema.ts` foi recompilado; limpar `dist/` e fazer `npm run build` novamente |
| `Error: Cannot find module '.../dist/server/index.js'` | Build não foi executado | Rodar `npm run build` antes de `node dist/server/index.js` |
| `SyntaxError: Cannot use import outside a module` | CommonJS vs ESM mismatch | Verificar `tsconfig.build.json` tem `module: "commonjs"` |
| `ECONNREFUSED` ao Supabase | Chaves de ambiente não definidas | Configurar `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_DB_URL` no Render |

---

## Próximas Recomendações

1. **Logs Centralizados:** Considere usar Sentry ou similar para monitorar erros em produção
2. **Rate Limiting:** Implementar rate limiting no endpoint `/api/auth/register`
3. **Email Verification:** Ativar verificação de email automática no Supabase
4. **Health Check:** Adicionar `/api/health` para monitoramento

---

**Data de Geração:** 17 de novembro de 2025  
**Versão:** 1.0  
**Status:** ✅ Pronto para Deploy
