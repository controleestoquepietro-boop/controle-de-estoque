# 🚀 GUIA DE DEPLOYMENT NO FLY.IO - CORREÇÕES SUPABASE

Este documento fornece instruções passo a passo para aplicar as correções e fazer deploy no Fly.io.

## ❌ PROBLEMAS CORRIGIDOS

1. **Variáveis de ambiente não configuradas no Fly.io** → Usuário não era criado na tabela `users`
2. **Fluxo de signup usando campo incorreto (`criado_em` vs `created_at`)** → Erro ao inserir usuário
3. **Uso de `upsert` em vez de `insert`** → Falha silenciosa ao criar usuário
4. **Campo `password` vazio** → Violava constraint NOT NULL
5. **Sem políticas de RLS** → Qualquer um poderia inserir na tabela `users`
6. **Backend não validava se `supabaseService` estava inicializado** → Erros não eram vistos

## ✅ CORREÇÕES IMPLEMENTADAS

### 1. `server/supabaseClient.ts`
- ✅ Adicionada validação de variáveis em produção
- ✅ Logs mais detalhados para diagnóstico
- ✅ Avisos se `SUPABASE_SERVICE_ROLE_KEY` não estiver configurado

### 2. `server/routes.ts` - Rota `/api/auth/register`
- ✅ Mudado de `upsert` para `insert` (força erro se duplicado)
- ✅ Campo `created_at` em vez de `criado_em`
- ✅ Campo `password` com valor default `'auth-via-supabase'` (não vazio)
- ✅ Validação se `supabaseService` existe antes de usar
- ✅ Fallback para `UPDATE` se `INSERT` falhar com duplicate key
- ✅ Logs detalhados de cada etapa

### 3. `migrations/0001_add_rls_policies.sql`
- ✅ RLS habilitado nas tabelas `users`, `alimentos`, `modelos_produtos`, `audit_log`
- ✅ Políticas que permitem `service_role` (backend) fazer INSERT/UPDATE/DELETE sem restrições
- ✅ Políticas que permitem usuários autenticados ler dados
- ✅ RLS não bloqueia operações via `supabaseService` (usa service_role)

## 📋 PASSO A PASSO: DEPLOY EM FLY.IO

### Pré-requisitos

```powershell
# 1. Instalar Fly.io CLI
# Baixar de: https://fly.io/docs/getting-started/installing-flyctl/
# Ou: choco install flyctl (se usar Chocolatey)

# 2. Login no Fly.io
flyctl auth login

# 3. Verificar aplicação e dados
flyctl apps list
flyctl apps info cxpt-core
```

### PASSO 1: Preparar Variáveis de Ambiente

Você precisa dos seguintes valores do **painel Supabase** (https://app.supabase.com):

1. Acesse seu projeto Supabase
2. Vá para **Settings** → **API**
3. Copie:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_KEY` (anon public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role secret key)

```bash
# Exemplo de valores (NÃO use estes, pegue os seus!)
# SUPABASE_URL=https://xppfzlscfkrhocmkdjsn.supabase.co
# SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwcGZ6bHNjZmtyaG9jbWtkanNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTQ1MzgsImV4cCI6MjA3NzE3MDUzOH0.SQ8Do7KEAbW-E4trrANOtFPbwgt9vJD5npTH32nw1Lg
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwcGZ6bHNjZmtyaG9jbWtkanNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NDUzOCwiZXhwIjoyMDc3MTcwNTM4fQ.JYgHDoEIqo-jrSYRI_Y_9ZrVAkM1v_7vJ9tKBXoouMo
```

### PASSO 2: Configurar Secrets no Fly.io

```powershell
# Execute este comando SUBSTITUINDO pelos valores reais do seu Supabase:

flyctl secrets set `
  SUPABASE_URL="https://xppfzlscfkrhocmkdjsn.supabase.co" `
  SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwcGZ6bHNjZmtyaG9jbWtkanNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTQ1MzgsImV4cCI6MjA3NzE3MDUzOH0.SQ8Do7KEAbW-E4trrANOtFPbwgt9vJD5npTH32nw1Lg" `
  SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwcGZ6bHNjZmtyaG9jbWtkanNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NDUzOCwiZXhwIjoyMDc3MTcwNTM4fQ.JYgHDoEIqo-jrSYRI_Y_9ZrVAkM1v_7vJ9tKBXoouMo" `
  -a cxpt-core

# Verificar se os secrets foram aplicados
flyctl secrets list -a cxpt-core

# Resultado esperado:
# NAME                        DIGEST                  CREATED AT
# SUPABASE_URL                sha256:abc123...        2 minutes ago
# SUPABASE_KEY                sha256:def456...        2 minutes ago
# SUPABASE_SERVICE_ROLE_KEY   sha256:ghi789...        2 minutes ago
```

### PASSO 3: Verificar RLS no Supabase

Antes de fazer deploy, configure as políticas de RLS:

```sql
-- 1. Conectar ao banco Supabase via psql ou painel SQL Editor
-- 2. Executar script: migrations/0001_add_rls_policies.sql

-- Ou copiar e colar os comandos do arquivo na interface web do Supabase:
-- Settings → SQL Editor → Paste and execute

-- Validar que RLS foi habilitado:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('users', 'alimentos', 'modelos_produtos', 'audit_log');

-- Resultado esperado: todos com rowsecurity = true
```

### PASSO 4: Fazer Deploy

```powershell
# 1. Commit das mudanças localmente (se usar Git)
git add -A
git commit -m "Fix: Corrigir integração Supabase com Fly.io - RLS, campo created_at, service_role"

# 2. Deploy no Fly.io
flyctl deploy -a cxpt-core

# 3. Acompanhar deploy em tempo real
flyctl logs -a cxpt-core --follow

# Resultado esperado (procurar por):
# ==> Monitoring deployment ...
# v0 [app] 80% [========>    ]
# v0 [app] [INFO] === CONFIGURAÇÃO SUPABASE ===
# v0 [app] [INFO] 🔑 SUPABASE_URL: ✓ configurada
# v0 [app] [INFO] 🔐 SUPABASE_KEY (anon): ✓ configurada
# v0 [app] [INFO] 🧩 SUPABASE_SERVICE_ROLE_KEY: ✓ configurada
```

### PASSO 5: Testar Fluxo Completo

#### Teste 1: Signup + Verificação na Tabela

```powershell
# 1. Registrar novo usuário
$body = @{
  nome = "Teste User"
  email = "teste-$(Get-Date -Format 'HHmmssfff')@test.local"
  password = "TestPassword123!"
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "https://cxpt-core.fly.dev/api/auth/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body

Write-Host "Signup response: $($response | ConvertTo-Json)"

# 2. Verificar no painel Supabase se usuário apareceu na tabela 'users'
# Acesse: https://app.supabase.com → seu projeto → Table Editor → users
# Procure pelo email que você acabou de registrar
```

#### Teste 2: Login

```powershell
$body = @{
  email = "teste@test.local"
  password = "TestPassword123!"
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "https://cxpt-core.fly.dev/api/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body `
  -SessionVariable session

Write-Host "Login response: $($response | ConvertTo-Json)"
Write-Host "UserId: $($response.user.id)"
```

#### Teste 3: Criar Alimento (requer login)

```powershell
$body = @{
  codigoProduto = "TEST-001"
  nome = "Alimento Teste"
  unidade = "kg"
  lote = "LOTE-001"
  dataFabricacao = "2025-11-20"
  dataValidade = "2025-12-20"
  quantidade = 100
  pesoPorCaixa = 25
  temperatura = "2-8°C"
  shelfLife = 30
  categoria = "Alimentos"
  alertasConfig = @{}
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "https://cxpt-core.fly.dev/api/alimentos" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body `
  -WebSession $session

Write-Host "Create alimento response: $($response | ConvertTo-Json)"
```

#### Teste 4: Importação/Exportação

```powershell
# Testar rota de importação de alimentos
$alimentos = @(
  @{
    codigoProduto = "IMP-001"
    nome = "Alimento Importado"
    unidade = "kg"
    lote = "LOTE-IMP-001"
    dataFabricacao = "2025-11-20"
    dataValidade = "2025-12-20"
    quantidade = 50
    pesoPorCaixa = 10
    temperatura = "2-8°C"
    shelfLife = 30
    categoria = "Alimentos"
    alertasConfig = @{}
  }
) | ConvertTo-Json

$body = @{ alimentos = $alimentos } | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "https://cxpt-core.fly.dev/api/alimentos/import" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body `
  -WebSession $session

Write-Host "Import response: $($response | ConvertTo-Json)"
```

## 🔍 TROUBLESHOOTING

### ❌ Erro: "Não foi possível criar usuário no Supabase"

**Causa**: `SUPABASE_SERVICE_ROLE_KEY` não está configurado no Fly.io

**Solução**:
```powershell
# 1. Verificar se está configurado
flyctl secrets list -a cxpt-core

# 2. Se faltar, adicionar
flyctl secrets set SUPABASE_SERVICE_ROLE_KEY="seu-valor-aqui" -a cxpt-core

# 3. Re-deploy
flyctl deploy -a cxpt-core
```

### ❌ Erro: "Email já cadastrado" após signup bem-sucedido

**Causa**: Usuário foi inserido com sucesso mas frontend recebeu erro de duplicate key

**Solução**: Verificar nos logs do Fly.io:
```powershell
flyctl logs -a cxpt-core | Select-String "upsert|insert|users"
```

### ❌ Erro: "Violação de constraint NOT NULL no campo password"

**Causa**: Código antigo tentando inserir `password: ''` (vazio)

**Solução**: Usar versão corrigida de `routes.ts` que define `password: 'auth-via-supabase'`

### ❌ Login falha com "E-mail não confirmado"

**Causa**: Normal - usuário precisa confirmar email antes de logar

**Solução**: Verificar caixa de entrada do email e clicar no link de confirmação do Supabase

### ❌ Erro de RLS: "Política de linha violada"

**Causa**: RLS foi habilitado mas políticas não foram criadas corretamente

**Solução**:
```sql
-- Executar no painel Supabase → SQL Editor
-- Reexecutar: migrations/0001_add_rls_policies.sql

-- Validar políticas foram criadas
SELECT * FROM pg_policies WHERE tablename = 'users';
```

## 📊 VALIDAÇÃO PÓS-DEPLOY

Checklist final:

- [ ] Signup: Usuário registrado com sucesso
- [ ] Tabela users: Usuário aparece no painel Supabase
- [ ] Login: Usuário consegue fazer login
- [ ] Criar alimento: Possível criar novo alimento
- [ ] Redefinir senha: Fluxo completo funciona
- [ ] Importação: Importar alimentos de Excel funciona
- [ ] Exportação: Exportar dados funciona
- [ ] Audit log: Operações são registradas

## 📝 LOGS IMPORTANTES

Para diagnosticar problemas, procurar por estes logs:

```
✅ SUPABASE_URL: ✓ configurada
✅ SUPABASE_KEY (anon): ✓ configurada
✅ SUPABASE_SERVICE_ROLE_KEY: ✓ configurada

✅ Usuário criado na tabela users do Supabase (via service client)

📝 LOGIN ATTEMPT - email: ...
✅ Supabase auth ok - userId: ...
✅ Sessão salva - sessionID: ...
✅ Signed cookie enviado - shelf_uid: ...

✅ Alimento criado: ...
```

## 🚀 PRÓXIMOS PASSOS

1. Execute o script de teste local: `.\test-signup-flow.ps1`
2. Confirme que todas as correções funcionam localmente
3. Siga os passos de deployment passo a passo
4. Monitore os logs em tempo real: `flyctl logs -a cxpt-core --follow`
5. Teste cada fluxo manualmente no app em produção

---

**Data**: 25 de novembro de 2025  
**Versão**: 1.0  
**Status**: ✅ Pronto para production
