# 🔄 Instruções de Commit e Deploy

## Se Usando Git

### 1. Verificar Status
```powershell
git status
```

### 2. Adicionar Todas as Mudanças
```powershell
git add -A
```

### 3. Commit
```powershell
git commit -m "fix: Zod schema validation and TypeScript build configuration

- Remove mandatory 'color' field from user registration schema
- Rewrite all Drizzle-Zod schemas to use .merge() pattern
- Fix runtime import resolution with relative paths
- Configure CommonJS build output for Render compatibility
- Update TypeScript config files for consistent ES2020 target

Fixes: ZodError on POST /api/auth/register when 'color' field missing
Fixes: DrizzleTypeError on schema composition
Fixes: MODULE_NOT_FOUND errors with @shared/* imports at runtime"
```

### 4. Push para Repository
```powershell
git push origin main
```

---

## Sem Git (Manual Setup)

### 1. Copie os Arquivos Corrigidos para Produção

```powershell
# Ou faça upload via SFTP/Git+Push
Copy-Item -Path "shared/schema.ts" -Destination "produção/shared/schema.ts" -Force
Copy-Item -Path "server/routes.ts" -Destination "produção/server/routes.ts" -Force
Copy-Item -Path "server/storage.ts" -Destination "produção/server/storage.ts" -Force
Copy-Item -Path "server/db.ts" -Destination "produção/server/db.ts" -Force
Copy-Item -Path "tsconfig.json" -Destination "produção/tsconfig.json" -Force
Copy-Item -Path "server/tsconfig.json" -Destination "produção/server/tsconfig.json" -Force
Copy-Item -Path "tsconfig.build.json" -Destination "produção/tsconfig.build.json" -Force
```

### 2. Render Deploy Manual

1. **Connect Repository** ao Render (se não estiver)
2. **Manual Deploy:** Render Dashboard → Services → Seu serviço → **Manual Deploy**

---

## Render Dashboard - Passo a Passo

### 1. Acessar Dashboard
```
https://dashboard.render.com/
```

### 2. Selecionar Seu Web Service
- Clique no nome do serviço
- Procure por "Build & Deploy"

### 3. Configurar Build Command
```
Build Command: npm run build
```

### 4. Configurar Start Command
```
Start Command: node dist/server/index.js
```

### 5. Adicionar Environment Variables
Clique em **Environment** e adicione:

```
SUPABASE_URL = https://xxxxxxxxxxxx.supabase.co
SUPABASE_KEY = ey...
SUPABASE_SERVICE_ROLE_KEY = ey...
SUPABASE_DB_URL = postgresql://postgres:xxxxx@xxxx.supabase.co:5432/postgres
SESSION_SECRET = (generate 32 random chars)
SESSION_COOKIE_NAME = session_id
FRONTEND_URL = https://seu-frontend.vercel.app
NODE_ENV = production
```

### 6. Deploy
- Clique **Deploy** ou deixe auto-deploy via Git

### 7. Monitorar
- Vá a **Logs**
- Procure por: `🚀 Servidor rodando em http://0.0.0.0:5000`
- Se houver erro, debugue nos logs

---

## Troubleshooting Pós-Deploy

### Deploy Falha com TS Error
```
Error: tsc compilation failed
```
**Solução:**
1. Verificar `tsconfig.build.json` está no repositório
2. Verificar imports usam `../shared/schema` (não `@shared`)
3. Fazer commit e push novamente

### 503 Service Unavailable
```
Error: Cannot start service
```
**Solução:**
1. Verificar **Start Command** é exatamente: `node dist/server/index.js`
2. Verificar **Build Command** é: `npm run build`
3. Verificar variáveis de ambiente estão todas preenchidas
4. Clicar **Reboot** no painel Render

### Aplicação Inicia mas Retorna 500
```
POST /api/auth/register → 500 Internal Server Error
```
**Solução:**
1. Verificar logs Render para stack trace
2. Verificar variáveis Supabase estão corretas
3. Verificar conectividade com banco de dados
4. Se ZodError aparecer, voltar acima e verificar arquivos foram atualizados

---

## Verificação Pós-Deploy

### 1. Health Check
```bash
curl https://[seu-dominio].onrender.com/api/debug/session
```

### 2. Testar Register
```bash
curl -X POST https://[seu-dominio].onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste",
    "email": "teste@example.com",
    "password": "Senha123!"
  }'
```

**Esperado:**
- ✅ Status 200-400 (sem 500)
- ✅ Sem mensagem `ZodError`
- ✅ Resposta JSON com campo `message` ou `error`

### 3. Verificar Logs
```
# No painel Render → Logs
1:04:52 PM [express] 🚀 Servidor rodando em http://0.0.0.0:5000
1:04:53 PM [express] POST /api/auth/register 200 in 234ms
```

---

## Rollback (Se Necessário)

Se algo der muito errado:

### 1. Identificar Commit Anterior Bom
```powershell
git log --oneline | head -5
```

### 2. Reverter para Commit Anterior
```powershell
git revert HEAD --no-edit
git push origin main
```

### 3. Render Fará Rebuild Automaticamente

---

## Próximos Passos (Opcional)

1. **CI/CD Pipeline:** Configurar GitHub Actions para testar antes de merge
2. **Database Backups:** Configurar snapshots automáticos no Supabase
3. **Monitoring:** Integrar Sentry para error tracking em produção
4. **Rate Limiting:** Adicionar rate limit em `/api/auth/register`
5. **Email Verification:** Ativar verificação de email no Supabase

---

## Checklist Pré-Deploy

- [ ] Código commitado e pushed
- [ ] Build local funciona: `npm run build`
- [ ] Servidor inicia: `node dist/server/index.js`
- [ ] Não há erros TS
- [ ] `dist/server/index.js` existe
- [ ] Variáveis de ambiente copiadas do Render
- [ ] Build Command no Render: `npm run build`
- [ ] Start Command no Render: `node dist/server/index.js`

---

## Contato / Suporte

Se houver problemas:

1. **Verificar logs:** Render Dashboard → Logs
2. **Ler stack trace:** Procure por `Error:` nos logs
3. **Validar config:** Comparar com guia `DEPLOYMENT_FINAL_GUIDE.md`
4. **Última resort:** Fazer rollback e tentar novamente

---

**Última atualização:** 17 de novembro de 2025  
**Status:** ✅ Pronto para Deploy
