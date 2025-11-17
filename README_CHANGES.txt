# 📌 TL;DR - Tudo em Uma Página

## ❌ Problema
```
ZodError: "color" field is required
POST /api/auth/register falha
```

## ✅ Solução em 3 Linhas
1. Reescrevi `insertUserSchema` como `z.object({email, password, nome})` puro
2. Todos schemas Drizzle-Zod agora usam `.merge()` (não `.extend()`)
3. Mudei imports de `@shared/schema` para `../shared/schema`

## 🚀 Deploy Render (5 min)

### Build & Start Commands
```
Build:  npm run build
Start:  node dist/server/index.js
```

### Variáveis (Essencial)
```
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_URL=...
SESSION_SECRET=...
FRONTEND_URL=...
NODE_ENV=production
```

### Git Push
```powershell
git add -A
git commit -m "fix: Zod schema and build config"
git push origin main
```

## ✅ Validar
```
curl -X POST https://seu-render.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"User","email":"u@t.com","password":"pass"}'
```

**Esperado:** 200 ou 400 (sem ZodError)

## 📄 Docs
- `QUICK_SUMMARY.md` — 5 min
- `DEPLOYMENT_FINAL_GUIDE.md` — 15 min (completo)
- `CHECKLIST_FINAL.md` — Tudo verificado ✅

---

## Arquivos Alterados (Em Ordem)
1. `shared/schema.ts` — Line 104-107
2. `server/routes.ts` — Line 9
3. `server/storage.ts` — Line 2
4. `server/db.ts` — Line 5
5. `tsconfig.json` — Nova (raiz)
6. `server/tsconfig.json` — Line 5
7. `tsconfig.build.json` — Line 3-4

---

**Status:** 🟢 Pronto. Deploy agora.
