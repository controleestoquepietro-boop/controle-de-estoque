# Controle de Estoque — Versão Web + PWA

Sistema de controle de estoque de alimentos com auditoria, dashboards e histórico de operações.
✨ **Agora funciona como aplicativo web instalável (PWA)!**

## 🚀 Quick Start

### Desenvolvimento
```bash
npm install
npm run dev
```

Acesse em `http://localhost:5173` (frontend) com backend em `http://localhost:5000`.

### Build de Produção
```bash
npm run build
npm run start:prod
```

## 📱 PWA (Progressive Web App)

Seu app pode ser instalado como aplicativo nativo:

- ✅ **Android**: Chrome oferece "Add to Home Screen"
- ✅ **Desktop**: Botão "Install" na barra de endereço
- ✅ **iOS**: Suporte via "Add to Home Screen" (manual)
- ✅ **Offline**: Service Worker cacheia assets estáticos
- ✅ **Sincronização**: Sincroniza dados quando conexão retorna

**Próximas etapas**:
1. Gerar ícones (veja [ICONS_GENERATOR_GUIDE.md](./ICONS_GENERATOR_GUIDE.md))
2. Copiar para `client/public/`
3. Deploy no Render

Mais detalhes: [PWA_SETUP_GUIDE.md](./PWA_SETUP_GUIDE.md)

## 📦 Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Neon ou Supabase)
- **Auth**: Supabase Auth (JWT)
- **ORM**: Drizzle ORM
- **Queries**: TanStack React Query

## 🔧 Configuração

Crie `.env.local` na raiz:

```env
SUPABASE_DB_URL=postgresql://...
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SESSION_SECRET=your-secret-key
NODE_ENV=development
PORT=5000
```

## 📚 Documentação

- **[RENDER_DEPLOY_GUIDE.md](./RENDER_DEPLOY_GUIDE.md)** — Guia completo de deploy no Render
- **[PWA_SETUP_GUIDE.md](./PWA_SETUP_GUIDE.md)** — Configuração e recursos PWA
- **[ICONS_GENERATOR_GUIDE.md](./ICONS_GENERATOR_GUIDE.md)** — Como gerar ícones para o app

## 📖 Estrutura

```
├── client/           # Frontend React
├── server/           # Backend Express
├── shared/           # Schemas e tipos compartilhados
├── migrations/       # Migrations do banco (Drizzle)
└── dist/             # Build de produção
```

## ✅ Scripts

- `npm run dev` — Desenvolvimento
- `npm run build` — Build para produção
- `npm run start:prod` — Inicia servidor de produção
- `npm run check` — TypeScript check
- `npm run lint` — ESLint

## 🚀 Deploy

Veja [RENDER_DEPLOY_GUIDE.md](./RENDER_DEPLOY_GUIDE.md) para deploy no Render.

## 📝 Licença

Propriedade de Prieto.

---

**Versão**: 1.0.0 (Web-only)  
**Data**: 12 de novembro de 2025
