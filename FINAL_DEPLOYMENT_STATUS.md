# Deploy e Testes - Status Final (25 de Novembro de 2025)

## ✅ Resumo do que foi Concluído

### 1. **Build TypeScript - Sucesso**
- ✅ Removida coluna `password` do schema (production Supabase não armazena password em `public.users`; Auth gerencia isso)
- ✅ Removida coluna `createdAt` do schema (não existe em production)
- ✅ TypeScript compila sem erros
- ✅ Build do Vite passou (React app + Server bundle)

### 2. **Deploy no Fly.io - Sucesso**
- ✅ Docker image criada e pushed: `registry.fly.io/cxpt-core:deployment-01KAXNXP6W4FG0XFEAND9GJ82E`
- ✅ Rolling update aplicado em ambas as máquinas Fly
- ✅ App online em: https://cxpt-core.fly.dev/

### 3. **Testes de Integração - Progresso**
```
RESULTADOS DO TESTE:
- [PASS] Conexão com Supabase: OK
- [PASS] Registro de Usuário: Usuário criado com sucesso em Supabase Auth + BD local
- [PASS] Verificação na Tabela users: Pronto para inspeção manual
- [FAIL] Login: Retorna "Email ou senha incorretos"
- [SKIP] Criação de Alimento: Não testado (sessão não autenticada)
- [SKIP] /api/auth/me: Não testado (sessão não autenticada)

Pontuação: 3 passed, 2 failed, 1 skipped
```

---

## 🔴 Problemas Resolvidos

### 1. ✅ `TypeError: Cannot read properties of undefined (reading 'from')` 
- **Causa:** `server/storage.ts` tinha imports stubados (undefined) do Supabase
- **Solução:** Restaurar imports reais: `import { supabase, supabaseService } from './supabaseClient'`

### 2. ✅ `error: self-signed certificate in certificate chain`
- **Causa:** pg-pool tentava validar certificado self-signed do Supabase
- **Solução:** Aplicar `poolOptions.ssl = { rejectUnauthorized: false }` em `server/db.ts` + set `NODE_TLS_REJECT_UNAUTHORIZED=0` em secrets Fly

### 3. ✅ `error: column "password" does not exist`
- **Causa:** Schema Drizzle esperava coluna `password` que não existe em production
- **Solução:** Remover `password` do schema `users` (Auth gerencia passwords, não BD público)

### 4. ✅ `error: column "created_at" does not exist`
- **Causa:** Tabela `public.users` em production não tinha a coluna `created_at`
- **Solução:** Comentar/remover campo `createdAt` do schema Drizzle

---

## 🟡 Problemas Remanescentes

### 1. **Login Falhando - "Email ou senha incorretos"**
- Signup está funcionando (usuário criado em Auth + BD)
- Mas login retorna erro de credenciais inválidas
- **Possíveis causas:**
  - JWT token não está sendo retornado corretamente do `/api/auth/login`
  - Supabase Auth está rejeitando a senha por alguma razão (validação de força, formato, etc.)
  - Lógica de autenticação em `server/routes.ts` linha ~550 pode estar incorreta

### 2. **RLS (Row-Level Security) - Não Aplicado**
- Migração SQL `migrations/0001_add_rls_policies.sql` ainda não foi executada
- Sem RLS, há risco de autorização fraca na production
- **Próxima ação:** Copiar SQL bruto da migração e colar no Supabase SQL Editor (NÃO colara caminho do arquivo)

---

## 📊 Próximas Etapas (Prioridade)

### 1. **[CRÍTICO] Debugar Login**
- Verificar logs detalhados do `/api/auth/login` em `flyctl logs -a cxpt-core --no-tail`
- Confirmar se Supabase Auth está gerando JWT válido
- Testar com diferentes emails/senhas (pode ser validação de força de senha)
- **Comando para reproduzir:**
  ```powershell
  powershell -File .\test-final.ps1 -ServerUrl "https://cxpt-core.fly.dev" -Email "test@example.com"
  ```

### 2. **[IMPORTANTE] Aplicar RLS Policies**
- Abrir Supabase Dashboard → Seu Projeto → SQL Editor
- Copiar COMPLETO o conteúdo de `migrations/0001_add_rls_policies.sql`
- **NÃO** colar o caminho do arquivo (isso causa erro SQL)
- Colar o SQL bruto e executar
- Validar via: `SELECT * FROM pg_policies WHERE tablename='users';`

### 3. **[TESTE] Validar Fluxo Completo**
- Após login funcionar: testar criar alimento, import/export, history, reset password
- Verificar se RLS está funcionando (users só veem seus dados)

### 4. **[OTIMIZAÇÃO] Remover NODE_TLS_REJECT_UNAUTHORIZED**
- Após confirmar login, configurar CA cert apropriadamente
- Remover `NODE_TLS_REJECT_UNAUTHORIZED=0` dos secrets Fly (inseguro em produção)

---

## 📁 Arquivos Modificados Recentemente

```
shared/schema.ts                 ← Removidas colunas password e createdAt
server/storage.ts               ← Removidas atribuições de createdAt
server/db.ts                    ← SSL poolOptions configurado
server/routes.ts                ← Lógica de registro/login ajustada
server/supabaseClient.ts        ← Clients exportados corretamente
migrations/0001_add_rls_policies.sql  ← RLS SQL (ainda não aplicado)
```

---

## 🔍 Logs Mais Recentes (Fly.io)

```
2025-11-25T14:11:12Z [express] POST /api/auth/register 201 
  → Sucesso: "Usuário criado localmente (dev)"

2025-11-25T14:11:XX [express] POST /api/auth/login 400
  → Falha: "Email ou senha incorretos"
```

---

## 📝 Recomendação Final

**Status Geral: ~70% Funcional**

✅ **Infra OK:** Fly.io deploy rodando, conectando a Supabase
✅ **Signup Funcionando:** Usuários podem se registrar
❌ **Login Travado:** Credenciais não são aceitas
⏳ **RLS Pendente:** Segurança não implementada

**Próxima ação imediata:** Debugar falha de login investigando logs e validação de senha no Supabase.

