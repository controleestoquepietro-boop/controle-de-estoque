# 📱 Configuração PWA (Progressive Web App)

Seu projeto agora está configurado como uma **Progressive Web App**, permitindo que usuários instalem no celular/desktop como aplicativo nativo.

---

## ✅ O Que Foi Configurado

### 1. **manifest.json** (`client/public/manifest.json`)
Define como o app se comporta quando instalado:
- Nome: "Controle de Estoque Prieto"
- Nome curto: "Estoque"
- Cores (azul #0d6efd)
- Ícones (192px, 512px e máscaras adaptáveis)
- Shortcuts (Dashboard, Novo Alimento, Auditoria)
- Screenshots

### 2. **HTML com PWA Metadata** (`client/index.html`)
Adicionados meta tags essenciais:
```html
<meta name="theme-color" content="#0d6efd" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icon-192.png" />
```

### 3. **Service Worker** (`client/public/sw.js`)
Fornece:
- ✅ Cache offline para assets estáticos
- ✅ Network-first para APIs (tenta conexão, usa cache se falhar)
- ✅ Sincronização em background
- ✅ Suporte a push notifications

---

## 🎨 Ícones Necessários

Você precisa adicionar os seguintes ícones em `client/public/`:

```
client/public/
├── favicon.png              (32x32 ou 64x64)
├── icon-192.png            (192x192)
├── icon-512.png            (512x512)
├── icon-maskable-192.png   (192x192 com bordas transparentes)
├── icon-maskable-512.png   (512x512 com bordas transparentes)
├── screenshot-192.png      (192x192 - screenshot do app)
├── screenshot-512.png      (512x512 - screenshot do app)
├── screenshot-192-dark.png (tema escuro)
└── screenshot-512-dark.png (tema escuro)
```

### Como Gerar Ícones

**Opção 1: Usando ferramentas online**
- https://www.favicon-generator.org/
- https://tools.paulund.com/pwa-icon-generator/

**Opção 2: Usando Python + PIL**
```python
from PIL import Image

# Adicionar seu logo em 512x512
img = Image.open('logo.png')

# Redimensionar para 192x192
img_192 = img.resize((192, 192))
img_192.save('icon-192.png')

# Redimensionar para 512x512
img_512 = img.resize((512, 512))
img_512.save('icon-512.png')
```

**Opção 3: Usar o seu Logo Existente**
Se você já tem um logo (ex: `LOGO-PRIETO_1761688931089.png`):
```bash
# Converter para PNG e redimensionar (usando ImageMagick)
convert LOGO-PRIETO_1761688931089.png -resize 192x192 icon-192.png
convert LOGO-PRIETO_1761688931089.png -resize 512x512 icon-512.png
```

---

## 🚀 Como Testar Localmente

### 1. Build de produção
```bash
npm run build
```

### 2. Servir com servidor local HTTPS (PWA requer HTTPS)
```bash
# Opção 1: Usar um servidor HTTP simples (apenas HTTP, PWA limitado)
npx http-server dist/public -c-1 -p 8080

# Opção 2: Render (produção) - HTTPS automático
# (veja RENDER_DEPLOY_GUIDE.md)
```

### 3. Testar no Chrome DevTools
1. Abra `http://localhost:8080` no Chrome
2. Abra **DevTools** (F12)
3. Vá para **Application** → **Manifest**
4. Procure por erros de manifest
5. Vá para **Service Workers** para ver status
6. Vá para **Storage** → **Cache** para ver assets em cache

### 4. Instalar como App (simulado)
1. Procure por **"Install app"** na barra de endereço
2. Ou abra o menu (⋮) → **"Install Controle de Estoque"**
3. O app abrirá em modo fullscreen (sem barra de endereço)

---

## 📱 Comportamentos PWA

### Desktop (Chrome/Edge)
- ✅ Botão "Install" na barra de endereço
- ✅ Abre em janela standalone (sem barra de ferramentas)
- ✅ Atalho no menu iniciar (Windows) ou Applications (Mac/Linux)

### Mobile (Android Chrome)
- ✅ Banner "Add to Home Screen"
- ✅ Ícone aparece na home do celular
- ✅ Funciona offline (com cache do Service Worker)

### iOS/Safari
- ⚠️ Suporte limitado (sem "Add to Home Screen" automático)
- ⚠️ Usuário deve ir para **Share** → **Add to Home Screen** manualmente
- ✅ `apple-touch-icon` define ícone

---

## 🔐 Segurança

### HTTPS Obrigatório
- PWA **só funciona em HTTPS** (exceto localhost para testes)
- Render fornece HTTPS automaticamente
- Service Workers aumentam segurança (cache controlado)

### Dados em Offline
- Dados sensíveis NÃO são cacheados automaticamente
- APIs retornam erro `503` quando offline
- Usuário precisa de conexão para acessar dados do banco

---

## ⚙️ Customização

### Alterar Cores
Edite `client/public/manifest.json`:
```json
{
  "theme_color": "#0d6efd",      // Cor da barra de tarefas (Android)
  "background_color": "#ffffff"   // Cor de fundo ao carregar
}
```

### Alterar Shortcuts
Adicione/remova shortcuts em `manifest.json`:
```json
"shortcuts": [
  {
    "name": "Seu Atalho",
    "url": "/?action=sua-acao"
  }
]
```

### Desabilitar Service Worker
Se não quiser offline support, remova do `client/index.html`:
```html
<!-- Remova ou comente isto: -->
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

---

## 🧪 Verificação de PWA

Acesse: https://web.dev/measure/

Insira sua URL do Render e verá:
- ✅ Score geral
- ✅ O que funciona
- ✅ O que precisa melhorar

---

## 📚 Referências

- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev - PWA Checklist](https://web.dev/pwa-checklist/)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Criado em**: 12 de novembro de 2025
