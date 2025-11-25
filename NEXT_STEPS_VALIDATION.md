# 📋 PRÓXIMOS PASSOS - VALIDAÇÃO E PRODUÇÃO

## ✅ O QUE JÁ FOI FEITO

1. ✅ **Diagnosticado e corrigido**: ImportError em `server/storage.ts`
2. ✅ **Diagnosticado e corrigido**: SSL Certificate error em connection pool
3. ✅ **Compilado e deployado**: 3 versões até sucesso
4. ✅ **Aplicação online**: https://cxpt-core.fly.dev/
5. ✅ **Logs limpos**: Sem erros críticos de inicialização

---

## 🎯 FASE 2: VALIDAÇÃO DE FUNCIONALIDADES

### Passo 1: Aplicar RLS Migration (SEGURANÇA)

**Por quê?** Sem RLS, qualquer usuário pode acessar dados de outros.

**Como fazer:**

1. Abra: https://app.supabase.com/
2. Vá para: **SQL Editor**
3. Copie e Cole:
   ```bash
   cat c:\Users\sammu\Desktop\backup2025\migrations\0001_add_rls_policies.sql
   ```
4. Clique: **▶️ Run**
5. Verifique: Sem erros

**Validar:**
```sql
SELECT * FROM information_schema.table_constraints 
WHERE table_name IN ('users', 'alimentos', 'modelos_produtos', 'audit_log')
AND constraint_type = 'POLICY';
```
Deve retornar 20+ linhas.

---

### Passo 2: Testar Signup → Login → Criar Produto

**Script automático:**
```powershell
cd c:\Users\sammu\Desktop\backup2025
./scripts/test-signup-flow.ps1 -ApiUrl "https://cxpt-core.fly.dev" -Email "teste$(Get-Random)@example.com" -Senha "TestPass123!"
```

**O que testar manualmente (se quiser):**

1. **Signup**:
   ```bash
   curl -X POST https://cxpt-core.fly.dev/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "usuario@example.com",
       "password": "Senha123!"
     }'
   ```
   Deve retornar: `{ "message": "Usuário criado com sucesso" }`

2. **Verificar se user foi criado no Supabase**:
   ```bash
   # No Supabase SQL Editor:
   SELECT id, email, created_at FROM public.users 
   WHERE email = 'usuario@example.com';
   ```
   Deve retornar 1 linha.

3. **Login**:
   ```bash
   curl -X POST https://cxpt-core.fly.dev/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "usuario@example.com",
       "password": "Senha123!"
     }'
   ```
   Deve retornar: `{ "token": "...", "user": {...} }`

4. **Criar Produto** (com token do login):
   ```bash
   curl -X POST https://cxpt-core.fly.dev/api/alimentos \
     -H "Authorization: Bearer TOKEN_AQUI" \
     -H "Content-Type: application/json" \
     -d '{
       "nome": "Produto Teste",
       "codigoProduto": "TEST-001",
       "unidade": "kg",
       "quantidade": 100
     }'
   ```
   Deve retornar: `{ "id": "...", "nome": "Produto Teste", ... }`

---

### Passo 3: Monitorar em Produção

**Ver logs em tempo real:**
```bash
flyctl logs -a cxpt-core --follow
```

**Parar se houver erros:**
```bash
flyctl scale count -a cxpt-core --max=0  # Para app
flyctl scale count -a cxpt-core --max=2  # Retoma app
```

---

## 🔍 CHECKLIST DE VALIDAÇÃO

### Funcionalidades Core

- [ ] **Signup**: Email confirmado → User criado em `public.users`
- [ ] **Login**: Retorna JWT válido com user_id
- [ ] **Criar Produto**: Salva em `alimentos` com user_id
- [ ] **Listar Produtos**: Filtra por `user_id` logado
- [ ] **Editar Produto**: Atualiza com validação de ownership
- [ ] **Deletar Produto**: Remove se é dono
- [ ] **Importar Excel**: Parse e cria múltiplos produtos
- [ ] **Exportar**: Baixa CSV com dados do usuário

### Segurança (RLS)

- [ ] **User A** não vê produtos de **User B** na API
- [ ] **User A** não consegue editar produtos de **User B**
- [ ] Sem JWT: API retorna 401 (exceto /register, /login)
- [ ] JWT inválido: API retorna 403

### Performance

- [ ] Criar 100 produtos: < 5s
- [ ] Listar com 1000 produtos: < 2s
- [ ] Logs não crescem infinitamente (< 100MB/dia)

---

## 🚨 TROUBLESHOOTING

### App não responde
```bash
flyctl status -a cxpt-core
flyctl logs -a cxpt-core --no-tail
```

### Erro "user not found"
```bash
# Verificar se RLS está ativo:
SELECT * FROM pg_policies;

# Se vazio, rodar migration de novo
```

### Erro "connection refused"
```bash
# Verificar DB:
flyctl ssh -a cxpt-core -C "nc -zv db.xppfzlscfkrhocmkdjsn.supabase.co 5432"
```

### Performance lenta
```bash
# Ver conexões ativas:
flyctl ssh -a cxpt-core -C "ps aux | grep node"

# Reiniciar:
flyctl restart -a cxpt-core
```

---

## 📞 SUPORTE

**Logs de hoje:**
```bash
flyctl logs -a cxpt-core --no-tail | head -100
```

**Verificar env vars:**
```bash
flyctl secrets list -a cxpt-core
```

**Ver configuração:**
```bash
cat fly.toml
```

---

## 🎉 SE TUDO PASSAR

Parabéns! A aplicação está **pronta para produção**.

**Próximas ações:**
1. ✅ Backup do banco (`pg_dump` do Supabase)
2. ✅ Configurar alertas do Fly.io
3. ✅ Documentar URLs de acesso
4. ✅ Comunicar equipe sobre go-live

---

*Atualizado em: 2025-11-25*
*Contato: Suporte Fly.io / Supabase*
