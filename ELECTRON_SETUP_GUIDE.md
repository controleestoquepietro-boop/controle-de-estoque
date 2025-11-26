# Integração Electron - Guia de Implementação

## 📋 O que foi implementado

### 1. **Remoção da Barra Azul Padrão do Windows**
- Configuração do Electron com `frame: false` 
- `titleBarStyle: 'hidden'` para remover a barra de título padrão

### 2. **Barra Personalizada Customizada**
- Criada em `client/src/components/title-bar.tsx`
- Cor: `#6a1b1a` (vermelho escuro, combina com o design do projeto)
- Altura: 32px (`h-8` em Tailwind)
- Suporta drag para mover a janela

### 3. **Funcionalidades da Barra**
- ✅ Minimizar janela
- ✅ Maximizar/Restaurar janela
- ✅ Fechar aplicação
- ✅ Arrastar janela pelo título
- ✅ Botões com hover effects

### 4. **Arquivos Criados**

```
electron/
├── main.ts          # Processo principal do Electron
├── preload.ts       # Script de preload (contexto isolado)

client/src/components/
└── title-bar.tsx    # Componente React da barra personalizada

electron-builder.json  # Configuração de empacotamento (NSIS/Portable)
```

## 🚀 Como Usar

### Instalação de Dependências

```bash
npm install
```

Serão instaladas:
- `electron` - Framework desktop
- `electron-builder` - Empacotamento
- `electron-is-dev` - Detecção dev/prod
- `concurrently` - Rodar vários processos em paralelo

### Desenvolvimento

```bash
npm run electron-dev
```

Isso irá:
1. Iniciar o Vite dev server na porta 5173
2. Compilar o código Electron TypeScript
3. Abrir o app Electron

### Build de Produção

```bash
npm run electron-build
```

Isso irá:
1. Fazer build do front-end (Vite)
2. Compilar o código Electron
3. Gerar instalador Windows (.exe NSIS + Portable)
4. Gerar arquivos em `release/`

### Testar Build Localmente

```bash
npm run electron-start
```

## 🎨 Personalização da Barra

O arquivo `client/src/components/title-bar.tsx` pode ser customizado:

**Cor da Barra:**
```tsx
className="h-8 bg-gradient-to-r from-red-900 to-red-800 text-white..."
```

**Altura:**
```tsx
className="h-8 ..." // Mude para h-10, h-12, etc.
```

**Título/Logo:**
```tsx
<span className="text-xs bg-red-700 px-2 py-1 rounded">
  Seu Título Aqui
</span>
```

## 🔧 Arquitetura

### Segurança (Context Isolation)
- `electronAPI` é exposto via preload script
- Acesso IPC (Inter-Process Communication) isolado
- NodeIntegration desativado por padrão

### Fluxo
1. **Main Process** (`electron/main.ts`) - Cria janela frameless
2. **Preload** (`electron/preload.ts`) - Expõe API segura
3. **TitleBar Component** - UI React que chama APIs Electron via IPC
4. **IPC Handlers** - Main process responde aos comandos (min/max/close)

## 📝 Configuração Avançada

### Arquivo de Ícone

Adicione o arquivo `public/icon.ico` (256x256) para aparecer no instalador.

### Assinatura de Código (Opcional)

Para distribuição em produção, adicione certificado no `electron-builder.json`:

```json
{
  "win": {
    "certificateFile": "path/to/cert.pfx",
    "certificatePassword": "password"
  }
}
```

### Auto-Update (Opcional)

Integre com `electron-updater` para atualizações automáticas:

```bash
npm install electron-updater
```

## ⚠️ Notas Importantes

1. **Modo Dev vs Prod:**
   - Dev: carrega de `http://localhost:5173`
   - Prod: carrega de `file://` (app bundled)

2. **DevTools:**
   - Aberto automaticamente em desenvolvimento
   - Desativado em produção para segurança

3. **Menu:**
   - Removido em produção
   - Normal em desenvolvimento (pode ser customizado)

4. **Compatibilidade:**
   - Testado em Windows (main target)
   - Com pequenos ajustes funciona em macOS e Linux

## 🎯 Próximos Passos

1. ✅ Instalar dependências: `npm install`
2. ✅ Testar em dev: `npm run electron-dev`
3. ✅ Fazer build: `npm run electron-build`
4. ✅ Gerar instalador e distribuir

## 📞 Suporte

Se houver problemas:
- Verifique se Node.js >= 14.x está instalado
- Limpe cache: `rm -rf node_modules dist dist-electron && npm install`
- Rode em PowerShell como Admin se houver erros de permissão
