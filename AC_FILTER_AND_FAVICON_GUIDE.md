# 📋 Guia: Filtro AC (Aguardando Cadastro) e Favicon PWA

## ✅ O que foi implementado

### 1. **Filtro "AC" - Aguardando Cadastro**
Um novo filtro foi adicionado à lista de alimentos que mostra arquivos incompletos (aqueles que ainda faltam dados importantes para o cadastro completo).

#### Critérios de "Aguardando Cadastro"
Um alimento é marcado como **AC (Aguardando Cadastro)** quando falta qualquer um destes campos:
- ❌ **Data de Validade**
- ❌ **Quantidade**
- ❌ **Shelf Life (dias)**
- ❌ **Temperatura**

#### Como usar
1. Abra o sistema de "Controle de Alimentos"
2. Ao lado dos botões "Todos, Ativos, Vence Breve e Vencidos", agora aparece um novo botão **"AC"**
3. Clique em **"AC"** para filtrar apenas arquivos que aguardam cadastro
4. Os alimentos incompletos aparecem com um **badge laranja** e text o "AGUARDANDO_CADASTRO"

#### Visualização
- **Número de AC**: Mostrado na seção de estatísticas (card com fundo laranja)
- **Cor do badge**: Laranja (`#ea580c`)
- **Local dos botões**: Abaixo do campo de busca, ao lado dos outros filtros

---

### 2. **Favicon e Ícones PWA**
O logo do Prieto foi configurado como favicon e os ícones PWA foram gerados automaticamente.

#### Ícones criados
| Arquivo | Tamanho | Uso |
|---------|--------|-----|
| `favicon.png` | Original | Aba do navegador |
| `icon-192.png` | 192×192 | Tela inicial (telefone) |
| `icon-512.png` | 512×512 | Splash screen |
| `icon-maskable-192.png` | 192×192 | Ícone adaptativo (maskable) |
| `icon-maskable-512.png` | 512×512 | Ícone adaptativo (maskable) |

#### Onde estão
```
client/public/
├── favicon.png
├── icon-192.png
├── icon-512.png
├── icon-maskable-192.png
├── icon-maskable-512.png
└── manifest.json
```

#### Como foram gerados
Um script Node.js (`scripts/generate-pwa-icons.js`) foi criado para:
1. Ler o `favicon.png` (logo Prieto)
2. Redimensionar para 192×192 e 512×512
3. Gerar versões "maskable" com espaço ao redor

**Comando para regenerar (se necessário):**
```bash
node scripts/generate-pwa-icons.js
```

---

## 🧪 Como testar localmente

### Teste 1: Visualizar o Favicon
```bash
npm run dev
# Abra http://localhost:5000
# Procure no navegador: a aba terá o logo Prieto
```

### Teste 2: Verificar PWA no DevTools
```bash
npm run dev
# Abra http://localhost:5000
# F12 → Application → Manifest
# Verifique se manifest.json está carregado (deve estar verde ✓)
# Service Workers: deve estar "Activated and running"
```

### Teste 3: Filtro AC em ação
```bash
npm run dev
# Vá para "Controle de Alimentos"
# Importe alguns alimentos sem temperatura
# Clique no botão "AC"
# Veja os alimentos incompletos sendo filtrados
```

### Teste 4: Build para produção
```bash
npm run build
# npm run start:prod (se disponível)
# Abra http://localhost:5000
# Verifique DevTools novamente
```

---

## 📱 PWA - Instalar no telefone

### iOS (Apple)
1. Abra o Safari
2. Acesse `https://[seu-dominio].com` (HTTPS necessário)
3. Clique em "Compartilhar" → "Adicionar à Tela de Início"
4. A app aparecerá com o ícone Prieto

### Android (Chrome)
1. Abra o Chrome
2. Acesse `https://[seu-dominio].com`
3. Menu (⋮) → "Instalar app"
4. A app aparecerá na tela de início com o ícone Prieto

---

## ⚠️ Notas importantes

### Ícones em Localhost
- ✅ Favicon aparece em localhost
- ⚠️ PWA install não funciona em localhost (requer HTTPS)
- ✅ Service Worker funciona em localhost

### Ícones em Produção (Render)
- ✅ Favicon aparece
- ✅ PWA install funciona
- ✅ Todos os ícones aparecem corretamente
- ✅ App pode ser instalada em telefones

### Regenerar ícones
Se o favicon.png for atualizado, execute:
```bash
node scripts/generate-pwa-icons.js
npm run build
```

---

## 🔧 Referência técnica

### Arquivos modificados
- `client/src/lib/alimento-utils.ts` - Adicionada função `isAlimentoIncompleto()`
- `client/src/components/alimento-list.tsx` - Adicionado filtro e card AC
- `shared/schema.ts` - Status agora inclui `'AGUARDANDO_CADASTRO'`
- `client/index.html` - Favicon link adicionado
- `client/public/manifest.json` - Ícones maskable adicionados

### Arquivos criados
- `scripts/generate-pwa-icons.js` - Script para gerar ícones
- `client/public/icon-192.png`
- `client/public/icon-512.png`
- `client/public/icon-maskable-192.png`
- `client/public/icon-maskable-512.png`

---

## 📞 Suporte

**Problema:** Ícones não aparecem em produção
**Solução:** Verificar se `client/public/*.png` estão sendo servidos (devem estar em `dist/public/`)

**Problema:** Filtro AC não mostra alimentos
**Solução:** Importar alimentos com campos incompletos (remover temperatura, quantidade, etc)

**Problema:** PWA não instala
**Solução:** Verificar se está em HTTPS (Render fornece automaticamente) e se manifest.json carregou corretamente

---

✅ Implementação completa! O sistema está pronto para usar o filtro AC e instalar a PWA com o logo Prieto. 🎉
