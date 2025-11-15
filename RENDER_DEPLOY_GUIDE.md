# 🚀 Guia de Deploy no Render

Projeto **Controle de Estoque** — Versão Web (sem Electron/Desktop).

---

## 📋 Pré-requisitos

1. **Node.js 18+** — Render fornece suporte nativo.
2. **Conta Render** — https://render.com
3. **PostgreSQL/Neon DB** — URL de conexão.
4. **Supabase** — Para autenticação (opcional, mas recomendado).
5. **Git** — Repositório GitHub/GitLab.

---

## 🔧 Configuração Local (Dev)

### 1. Clonar e instalar
```bash
npm install
```

### 2. Variáveis de ambiente (`.env.local`)
```
SUPABASE_DB_URL=postgresql://user:password@host:5432/database
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SESSION_SECRET=your-session-secret-key
SESSION_COOKIE_NAME=session_id
NODE_ENV=development
PORT=5000
```

### 3. Rodar em desenvolvimento
```bash
npm run dev
```

### 4. Build local de produção
```bash
npm run build
```

---

## 🌐 Deploy no Render

### Passo 1: Criar um Web Service

1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique em **+ New** → **Web Service**
3. Selecione seu repositório GitHub
4. Configure:
   - **Name**: `controle-de-estoque`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Plan**: Free ou pago

### Passo 2: Configurar Variáveis de Ambiente

No Render Dashboard, aba **Environment**, adicione:

```
SUPABASE_DB_URL=postgresql://user:password@host:5432/database
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SESSION_SECRET=your-production-session-secret
SESSION_COOKIE_NAME=session_id
NODE_ENV=production
PORT=10000
```

### Passo 3: Deploy

Quando você fizer `git push`, o Render:
1. Clona o repositório
2. Executa o comando de build
3. Inicia o serviço com o comando start

---

## 📦 Scripts do `package.json`

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"tsx watch server/index.ts\"",
    "build": "npm run build:app",
    "build:app": "vite build",
    "start": "tsx server/index.ts",
    "start:prod": "node dist/server/index.js || tsx server/index.ts",
    "check": "tsc"
  }
}
```

---

## 🔐 Variáveis de Ambiente

- **SUPABASE_DB_URL**: Connection string do PostgreSQL/Neon
- **VITE_SUPABASE_URL**: URL do projeto Supabase
- **VITE_SUPABASE_ANON_KEY**: Chave pública Supabase
- **SESSION_SECRET**: Chave para criptografar sessões (gerar com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- **NODE_ENV**: sempre `production`
- **PORT**: Render fornece dinamicamente via `process.env.PORT`

---

## 🧪 Testes Pré-Deploy

```bash
# Verificar TypeScript
npm run check

# Build de produção
npm run build

# Iniciar servidor
npm run start:prod
```

---

## 📊 Monitoramento

Acesse [Render Dashboard](https://dashboard.render.com) para ver:
- Logs em tempo real
- Métricas de CPU/memória
- Status do deploy

---

## ✅ Checklist

- [ ] Variáveis de ambiente no Render configuradas
- [ ] `npm run check` passa
- [ ] `npm run build` gera `dist/public/`
- [ ] `npm run start:prod` inicia sem erros
- [ ] Repositório Git atualizado
- [ ] Banco de dados acessível
- [ ] Email/senha de teste funcionam

---

**Versão**: 1.0.0 (Web-only, sem Electron)
**Data**: 12 de novembro de 2025
SUPABASE_URL=https://xppfzlscfkrhocmkdjsn.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:PASSWORD@db.xppfzlscfkrhocmkdjsn.supabase.co:5432/postgres

# Frontend (público - usar anon key)
VITE_SUPABASE_URL=https://xppfzlscfkrhocmkdjsn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server
PORT=10000
NODE_ENV=production
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Passo 4: Deploy

Clique em **"Deploy"** e aguarde (~2-3 minutos)

---

## 🔍 Verificar Funcionamento

### ✅ Checklist Pós-Deploy

```bash
# 1. Verifica se app está rodando
curl https://seu-app.onrender.com

# 2. Verifica se CSS está carregando
# Abra em DevTools > Network > Procure por .css

# 3. Verifica se queryClient está funcionando
# Abra DevTools > Console > não deve ter "queryClient is not defined"

# 4. Faz login para testar Supabase
# Tente fazer login com uma conta existente
```

---

## 🐛 Troubleshooting

### Erro: "queryClient is not defined"
**Solução**: Confirme que `client/src/main.tsx` tem:
```typescript
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

### Erro: CSS não carrega no Render
**Solução**: Verifique o build command:
- `npm run build` deve gerar `dist/public/` com CSS/JS
- No Render, o start command `npm start` deve servir esses arquivos
- Confirme `server/vite.ts` tem `serveStatic(app)` em produção

### Erro: Login funcionando localmente mas não no Render
**Solução**: Verifique variáveis de ambiente:
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` devem estar no Render
- Mesmos valores de `.env` local

### Erro: Página branca em branco após login
**Solução**: Verifique no console:
- `fetch` está indo para a URL correta?
- Supabase está conectando? (abra DevTools > Network)
- QueryClient está definido?

---

## 📦 Estrutura do Projeto

```
controle-de-estoque/
├── client/                 # React Frontend (Vite)
│   ├── public/            # Assets (favicon, manifest)
│   ├── src/
│   │   ├── main.tsx       # Entry point (agora com QueryClientProvider ✅)
│   │   ├── App.tsx        # Router principal
│   │   ├── index.css      # Estilos globais
│   │   ├── components/    # Componentes React
│   │   └── lib/
│   │       └── queryClient.ts  # Exporta queryClient
│   └── index.html         # Template HTML
│
├── server/                 # Express Backend
│   ├── index.ts           # Server entrypoint
│   ├── routes.ts          # API routes
│   ├── db.ts              # Drizzle ORM
│   ├── storage.ts         # In-memory storage
│   └── vite.ts            # Serve static em produção ✅
│
├── shared/                 # Código compartilhado
│   └── schema.ts          # Zod schemas
│
├── package.json           # Dependencies
├── vite.config.ts         # Vite config (outDir: dist/public)
├── tsconfig.json          # TypeScript config
├── .env                   # Env vars (gitignored)
├── .env.example           # Template (versionado)
└── .gitignore             # Ignora build, node_modules, .env
```

---

## 🎯 Como Funciona em Produção (Render)

1. **GitHub Push** → Render detecta mudança em `main`
2. **Build**: `npm install && npm run build`
   - Vite compila React + CSS em `dist/public/`
   - Node.js já está pronto para servir
3. **Start**: `npm start`
   - Express inicia em `process.env.PORT` (Render define PORT=10000)
   - `server/index.ts` chama `serveStatic(app)` (produção)
   - Serve `dist/public/` para todas as rotas
   - API `/api/*` é roteada antes do fallback para `index.html`
4. **Cliente** acessa `https://seu-app.onrender.com`
   - Recebe `index.html` com `<script src="/src/main.tsx">`
   - React carrega com `QueryClientProvider` ✅
   - CSS e assets já estão em `dist/public/`

---

## 💡 Dicas

- **Logs do Render**: Acesse em "Logs" no dashboard
- **Reiniciar app**: Menu "Restart" (sem rebuild)
- **Cache**: Render cacheia dependências npm, limpe se problema persistir
- **Performance**: Adicione `NODE_OPTIONS=--max-old-space-size=512` se needed

---

**Status: Pronto para Deploy! 🚀**

Qualquer dúvida, verifique logs em: `Render Dashboard > Logs`
