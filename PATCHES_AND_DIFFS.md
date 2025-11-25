# 📝 PATCHES E DIFFS DETALHADOS

---

## ARQUIVO 1: server/supabaseClient.ts

### Mudança: Adicionar Validação de Produção

```diff
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Log de diagnóstico (não expõe chaves)
console.log("=== CONFIGURAÇÃO SUPABASE ===");
console.log("🔑 SUPABASE_URL:", SUPABASE_URL ? '✓ configurada' : '✗ ausente');
console.log("🔐 SUPABASE_KEY (anon):", SUPABASE_ANON_KEY ? '✓ configurada' : '✗ ausente');
console.log("🧩 SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? '✓ configurada' : '✗ ausente');

+// Validação de variáveis críticas para Fly.io
+if (process.env.NODE_ENV === 'production') {
+  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
+    console.error('❌ ERRO CRÍTICO EM PRODUÇÃO: Variáveis Supabase incompletas!');
+    console.error('   Configure com: flyctl secrets set SUPABASE_URL=... SUPABASE_KEY=... SUPABASE_SERVICE_ROLE_KEY=...');
+  }
+}
```

**Explicação**:
- Linha 1-3: Lê variáveis de ambiente
- Linha 5-9: Logs existentes
- Linha 11-16 (NOVO): Se em produção, valida se todas as variáveis críticas existem
- Se faltar, exibe erro CRÍTICO com instruções

**Benefício**: Identifica rapidamente se Fly.io foi configurado corretamente

---

## ARQUIVO 2: server/routes.ts

### Mudança: Corrigir Rota POST /api/auth/register

**Localização**: Linhas ~210-250 (seção de criação de usuário)

#### ANTES (❌ Problemático):

```typescript
    // 3️⃣ Inserir o usuário na tabela "users" (metadados adicionais)
    if (data.user) {
      // ... código de storage local ...

      // Tentar manter também a tabela 'users' no Supabase (opcional).
      // Usamos upsert por email para evitar erro de duplicate key caso o
      // email já exista na tabela (p.ex. importado manualmente no painel).
      try {
        // Gerar valores obrigatórios ausentes na tabela `users` (ex: password e color)
        const generatedColor = `hsl(${Math.floor(Math.random() * 360)} 70% 40%)`;
        console.log('🔄 Tentando upsert no Supabase (users) com:', {
          id: data.user.id,
          nome,
          email,
          color: generatedColor,
        });

        try {
          const svc = supabaseService || supabase;  // ❌ Fallback silencioso
          const { error: insertError } = await svc
            .from('users')
            .upsert([                                // ❌ Usa upsert (oculta erros)
              {
                id: data.user.id,
                nome,
                email,
                password: '',                        // ❌ VAZIO - Viola NOT NULL!
                color: generatedColor,
                criado_em: new Date().toISOString(), // ❌ Campo NÃO EXISTE!
              },
            ], { onConflict: 'email', ignoreDuplicates: false });

          if (insertError) {
            console.error('⚠️ Erro ao upsert usuário no Supabase (users)...', insertError);
          } else {
            console.log('✅ Usuário criado na tabela users do Supabase...');
          }
        } catch (e) {
          console.error('⚠️ Falha ao tentar upsert usuários no Supabase...', e);
        }
      } catch (e) {
        console.error('⚠️ Erro ao upsert usuário no Supabase (users):', e);
      }
    }
```

#### DEPOIS (✅ Corrigido):

```typescript
    // 3️⃣ Inserir o usuário na tabela "users" (metadados adicionais)
    if (data.user) {
      // Persistir metadados do usuário também no storage local/DB.
      // Em desenvolvimento `storage` é InMemoryStorage, então precisamos
      // garantir que o usuário exista lá também (mesmo id do Supabase)
      try {
        console.log('🔄 Criando usuário no storage local com id:', data.user.id);
        await storage.createUser({ id: data.user.id, nome, email } as any);
        console.log('✅ Usuário criado no storage local');
      } catch (e) {
        console.error('⚠️ Erro ao criar usuário no storage local:', e);
      }

      // Criar também na tabela 'users' do Supabase.
      // CRÍTICO: Usar supabaseService (com service_role) para bypass de RLS.
      // Se service_role não estiver disponível, o signup falha no painel do Supabase.
      try {
        if (!supabaseService) {                     // ✅ Validação explícita
          console.error('❌ ERRO CRÍTICO: supabaseService não inicializado...');
          console.error('   Verifique se SUPABASE_SERVICE_ROLE_KEY foi configurado...');
        } else {
          // Gerar valores obrigatórios ausentes na tabela `users`
          const generatedColor = `hsl(${Math.floor(Math.random() * 360)} 70% 40%)`;
          
          console.log('🔄 Tentando inserir na tabela users do Supabase com:', {
            id: data.user.id,
            nome,
            email,
            color: generatedColor,
          });

          // ✅ Usar INSERT direto (não upsert) para forçar erro se já existir
          const { error: insertError, data: insertedData } = await supabaseService
            .from('users')
            .insert([                               // ✅ INSERT em vez de UPSERT
              {
                id: data.user.id,
                nome,
                email,
                password: 'auth-via-supabase',      // ✅ Valor válido (não vazio)
                color: generatedColor,
                created_at: new Date().toISOString(), // ✅ Campo CORRETO
              },
            ]);

          if (insertError) {
            // ✅ Se houver erro de duplicate key, tentar atualizar
            if (insertError.message?.includes('duplicate')) {
              console.warn('⚠️ Usuário já existe - tentando atualizar...');
              const { error: updateError } = await supabaseService
                .from('users')
                .update({
                  nome,
                  email,
                })
                .eq('id', data.user.id);
              
              if (updateError) {
                console.error('⚠️ Erro ao atualizar usuário:', updateError);
              } else {
                console.log('✅ Usuário atualizado na tabela users');
              }
            } else {
              console.error('❌ Erro ao inserir usuário no Supabase:', insertError);
            }
          } else {
            console.log('✅ Usuário criado na tabela users do Supabase');
          }
        }
      } catch (e) {
        console.error('❌ Falha ao inserir usuário no Supabase:', e);
      }
    }
```

### Resumo das Mudanças:

| # | Antes | Depois | Motivo |
|---|---|---|---|
| 1 | `upsert` | `insert` | Força erro se duplicate (mais visível) |
| 2 | `criado_em` | `created_at` | Campo correto da schema |
| 3 | `password: ''` | `password: 'auth-via-supabase'` | Satisfaz NOT NULL |
| 4 | `svc = supabaseService \|\| supabase` | `if (!supabaseService)` | Validação explícita |
| 5 | Fallback silencioso | Erro CRÍTICO + instruções | Melhor diagnóstico |
| 6 | Insert único | Insert + fallback para Update | Trata casos de sincronização |
| 7 | Logs fracos | Logs com ✅ e ❌ | Melhor debugging |

---

## ARQUIVO 3: migrations/0001_add_rls_policies.sql

### Mudança: Criar Arquivo Novo com Políticas de RLS

**Estrutura Geral**:

```sql
-- 1. HABILITAR RLS
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."alimentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."modelos_produtos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS PARA TABELA 'users'

-- ✅ INSERT: Apenas service_role (backend) pode inserir
CREATE POLICY "Service role can insert users"
ON "public"."users"
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
);

-- ✅ SELECT: Usuários podem ler seus próprios dados OU service_role lê tudo
CREATE POLICY "Users can read own data"
ON "public"."users"
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR auth.uid() = id
);

-- ✅ UPDATE: Apenas service_role pode atualizar
CREATE POLICY "Service role can update users"
ON "public"."users"
FOR UPDATE
WITH CHECK (
  auth.role() = 'service_role'
);

-- ✅ DELETE: Apenas service_role pode deletar
CREATE POLICY "Service role can delete users"
ON "public"."users"
FOR DELETE
USING (
  auth.role() = 'service_role'
);

-- 3. POLÍTICAS PARA TABELA 'alimentos'
-- (similar ao acima, com permissões mais restritivas)

-- 4. POLÍTICAS PARA TABELA 'modelos_produtos'
-- (similar ao acima)

-- 5. POLÍTICAS PARA TABELA 'audit_log'
-- (similar ao acima)
```

**Por que isso funciona**:

1. `auth.role() = 'service_role'` = Backend usando `supabaseService`
2. Backend consegue fazer qualquer coisa (INSERT/UPDATE/DELETE) sem restrição
3. Usuários normais só podem ler seus próprios dados
4. RLS automaticamente aplicado a todas as queries

---

## COMPARAÇÃO: FLUXO ANTIGO vs NOVO

### ANTIGO (❌ Problemático)

```
1. User registra
   └─ Supabase Auth cria user ✅
      └─ Email enviado ✅
         └─ Email confirmado ✅
            └─ Backend tenta upsert com criado_em + password:'' ❌
               └─ SQL Error silencioso
                  └─ User não aparece em public.users
                     └─ Login "funciona" mas dados faltam
                        └─ Criar alimento FALHA (user não em BD)
                           └─ Importar FALHA
                              └─ Exportar FALHA
```

### NOVO (✅ Correto)

```
1. User registra
   └─ Supabase Auth cria user ✅
      └─ Email enviado ✅
         └─ Email confirmado ✅
            └─ Backend valida supabaseService ✅
               └─ Backend insere em public.users com created_at + password:'auth-via-supabase' ✅
                  └─ User SINCRONIZADO em public.users ✅
                     └─ Login funciona com dados corretos ✅
                        └─ Criar alimento FUNCIONA ✅
                           └─ Importar FUNCIONA ✅
                              └─ Exportar FUNCIONA ✅
```

---

## TESTE DE VALIDAÇÃO

Para confirmar que os patches foram aplicados corretamente:

```bash
# 1. Verificar server/supabaseClient.ts
grep -n "ERRO CRÍTICO EM PRODUÇÃO" server/supabaseClient.ts
# Deve retornar a linha com a validação

# 2. Verificar server/routes.ts
grep -n "created_at" server/routes.ts
# Deve retornar a linha com campo correto (não criado_em)

grep -n "auth-via-supabase" server/routes.ts
# Deve retornar a linha com password correto

grep -n "INSERT" server/routes.ts
# Deve retornar INSERT em vez de UPSERT

# 3. Verificar migrations
grep -n "ENABLE ROW LEVEL SECURITY" migrations/0001_add_rls_policies.sql
# Deve retornar 4 linhas (uma para cada tabela)

grep -n "Service role can insert" migrations/0001_add_rls_policies.sql
# Deve retornar política de INSERT
```

---

## APLICAÇÃO DOS PATCHES

### Passo 1: Verificar Mudanças Locais

```powershell
git status

# Deve mostrar:
# server/supabaseClient.ts (modificado)
# server/routes.ts (modificado)
# migrations/0001_add_rls_policies.sql (novo)
```

### Passo 2: Revisar Diffs

```powershell
git diff server/supabaseClient.ts
git diff server/routes.ts
git add migrations/0001_add_rls_policies.sql
git diff --cached migrations/0001_add_rls_policies.sql
```

### Passo 3: Commit e Push

```powershell
git add server/supabaseClient.ts
git add server/routes.ts
git add migrations/0001_add_rls_policies.sql

git commit -m "Fix: Corrigir integração Supabase+Fly.io - service_role, RLS, created_at"

git push origin main
```

### Passo 4: Deploy

```powershell
flyctl deploy -a cxpt-core
```

---

## VALIDAÇÃO PÓS-PATCH

Verificar que as mudanças foram aplicadas:

```powershell
# 1. Conectar ao servidor
flyctl ssh console -a cxpt-core

# 2. Verificar logs
cat /app/server-output.txt | grep "CONFIGURAÇÃO SUPABASE"

# 3. Verificar arquivos
grep "created_at" /app/server/routes.ts
grep "auth-via-supabase" /app/server/routes.ts
```

---

**Todos os patches estão prontos para serem aplicados! 🚀**
