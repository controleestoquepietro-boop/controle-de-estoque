# 🎬 Tutorial Passo a Passo - AC Filter + Favicon

## 📺 Vídeo-Tutorial (Como imagens)

### PASSO 1: Iniciar o servidor local
```bash
npm run dev
```
**Resultado esperado:**
```
✓ Servidor rodando em http://127.0.0.1:5000
✓ Abra no navegador
✓ Logo Prieto 🏰 aparece na aba
```

---

### PASSO 2: Acessar "Controle de Alimentos"
```
Home da app
    ↓
[Controle de Alimentos]
    ↓
Tela com cards de estatísticas
```

**Você verá:**
```
┌──────────┬────────────┬──────────────┬──────────┬──────┐
│ Total    │ Ativos     │ Vence Breve  │ Vencidos │ AC   │ ← NOVO!
│   0      │     0      │       0      │    0     │  0   │
└──────────┴────────────┴──────────────┴──────────┴──────┘
```

---

### PASSO 3: Importar dados de teste
```
[Importar Alimentos]
    ↓
Upload: teste-ac.xlsx
    ↓
Preview: 5 alimentos
    ↓
[Importar 5 alimentos]
```

**Arquivo de teste (copie em Excel):**
```
Código | Nome | Quantidade | Data Validade | Shelf Life | Temperatura
001    | Leite| 50        | 2025-11-20    | 10        | 4°C
002    | Pão | 100       | [em branco]   | 7         | 20°C
003    | Queijo| [vazio] | 2025-12-09    | 30        | 8°C
004    | Manteiga| 20    | 2025-12-11    | 30        | [vazio]
005    | Iogurte| [vazio]| [em branco]   | 15        | [vazio]
```

---

### PASSO 4: Verificar o resultado
**Após importar, veja as estatísticas atualizadas:**

```
ANTES:
┌──────────┬────────────┬──────────────┬──────────┬──────┐
│ Total    │ Ativos     │ Vence Breve  │ Vencidos │ AC   │
│   0      │     0      │       0      │    0     │  0   │
└──────────┴────────────┴──────────────┴──────────┴──────┘

DEPOIS:
┌──────────┬────────────┬──────────────┬──────────┬──────┐
│ Total    │ Ativos     │ Vence Breve  │ Vencidos │ AC   │
│   5      │     1      │       0      │    0     │  4   │ ✅
└──────────┴────────────┴──────────────┴──────────┴──────┘
```

---

### PASSO 5: Clicar no botão [AC]
```
Botões de filtro:
[Todos] [Ativos] [Vence Breve] [Vencidos] [AC]
                                          ↓
                                    Clique aqui!
```

**Resultado:**
```
Lista filtrando apenas AC:

┌────────────────────────────────────┐
│ 002 | Pão      | P001 | AC 🟠     │ ← Falta Data Validade
│ 003 | Queijo   | Q001 | AC 🟠     │ ← Falta Quantidade
│ 004 | Manteiga | M001 | AC 🟠     │ ← Falta Temperatura
│ 005 | Iogurte  | Y001 | AC 🟠     │ ← Falta tudo
└────────────────────────────────────┘

↑ 4 alimentos incompletos aparecendo!
```

---

### PASSO 6: Completar os dados
```
Clique em um alimento AC:
    ↓
[Editar]
    ↓
Preencha os campos faltando:
    ├─ Data Validade: 2025-11-20
    ├─ Quantidade: 50
    ├─ Shelf Life: 7
    └─ Temperatura: 4°C
    ↓
[Salvar]
    ↓
Status muda para: ✅ ATIVO ou 🟡 VENCE EM BREVE
```

---

### PASSO 7: Verificar a mudança
```
Volte para filtro [TODOS]:

┌────────────────────────────────────┐
│ 001 | Leite    | L001 | ATIVO ✅  │ ← Verde
│ 002 | Pão      | P001 | ATIVO ✅  │ ← Verde (agora preenchido!)
│ 003 | Queijo   | Q001 | AC 🟠     │ ← Ainda incompleto
│ 004 | Manteiga | M001 | AC 🟠     │ ← Ainda incompleto
│ 005 | Iogurte  | Y001 | AC 🟠     │ ← Ainda incompleto
└────────────────────────────────────┘

Estatísticas atualizadas:
┌──────────┬────────────┬──────────────┬──────────┬──────┐
│ Total    │ Ativos     │ Vence Breve  │ Vencidos │ AC   │
│   5      │     2      │       0      │    0     │  3   │ ✅
└──────────┴────────────┴──────────────┴──────────┴──────┘
```

---

## 🎨 Cores no AC Filter

```
Badge AC:
┌────────────────────────┐
│ 🟠 AGUARDANDO_CADASTRO │ ← Laranja (#ea580c)
└────────────────────────┘

Comparação com outros status:
🟢 ATIVO              (verde, sem problemas)
🟡 VENCE EM BREVE    (amarelo, atenção)
🔴 VENCIDO           (vermelho, problema)
🟠 AC                (laranja, incompleto)
```

---

## 🔍 Verificar Favicon PWA

### No Navegador (DevTools)
```
Abra: http://localhost:5000
Tecla: F12
```

**Procure por:**

1. **Application Tab**
   ```
   Application → Manifest
   ✅ manifest.json (deve estar em verde)
   ```

2. **Service Workers**
   ```
   Application → Service Workers
   ✅ /sw.js (deve estar "Activated and running")
   ```

3. **Aba do Navegador**
   ```
   Veja o logo Prieto 🏰 aparecendo
   ```

---

## 📱 Testar PWA em Produção

### Build
```bash
npm run build
```

### Iniciar server de produção (se disponível)
```bash
npm run start:prod
```

### No navegador
```
https://seu-dominio.render.com
→ Menu (⋮) → Instalar app
→ Logo Prieto 🏰 na tela inicial
```

---

## 🧪 Casos de Teste

### Caso 1: AC por falta de Data Validade
```
Importar:
├─ Código: 100
├─ Nome: Sal
├─ Quantidade: 10 ✅
├─ Shelf Life: 365 ✅
├─ Temperatura: 15°C ✅
└─ Data Validade: [VAZIO] ❌

Resultado: AC 🟠
```

### Caso 2: AC por falta de Quantidade
```
Importar:
├─ Código: 101
├─ Nome: Açúcar
├─ Quantidade: [VAZIO] ❌
├─ Shelf Life: 730 ✅
├─ Temperatura: 20°C ✅
└─ Data Validade: 2026-11-12 ✅

Resultado: AC 🟠
```

### Caso 3: AC por múltiplas faltas
```
Importar:
├─ Código: 102
├─ Nome: Farinha
├─ Quantidade: [VAZIO] ❌
├─ Shelf Life: [VAZIO] ❌
├─ Temperatura: [VAZIO] ❌
└─ Data Validade: [VAZIO] ❌

Resultado: AC 🟠 (4 campos faltando!)
```

### Caso 4: Tudo completo (ATIVO)
```
Importar:
├─ Código: 103
├─ Nome: Café
├─ Quantidade: 5 ✅
├─ Shelf Life: 180 ✅
├─ Temperatura: 15°C ✅
└─ Data Validade: 2026-05-12 ✅

Resultado: ATIVO ✅
```

---

## 🎯 Checklist de Validação

Use este checklist para validar tudo:

```
PARTE 1: Favicon e Icons
☐ Favicon.png existe em client/public/
☐ icon-192.png foi gerado
☐ icon-512.png foi gerado
☐ icon-maskable-192.png foi gerado
☐ icon-maskable-512.png foi gerado
☐ Logo Prieto aparece na aba do navegador

PARTE 2: Filtro AC
☐ Card "AC" aparece nas estatísticas
☐ Botão [AC] aparece nos filtros
☐ Alimentos incompletos aparecem com badge laranja
☐ Filtro [AC] mostra apenas alimentos incompletos
☐ Estatísticas atualizando corretamente

PARTE 3: TypeScript
☐ npm run check: 0 erros
☐ npm run build: Sucesso

PARTE 4: PWA
☐ DevTools → Manifest (verde ✓)
☐ DevTools → Service Worker (ativo)
☐ App instalável em telefone

PARTE 5: Documentação
☐ AC_FILTER_AND_FAVICON_GUIDE.md criado
☐ FEATURES_SUMMARY.md criado
☐ TEST_DATA_AC_FILTER.md criado
☐ README_NEW_FEATURES.md criado
```

---

## 🚨 Troubleshooting

### Problema: Favicon não aparece
**Solução:**
1. Limpe cache: `Ctrl + Shift + Delete`
2. Recarregue: `F5`
3. Verifique: `client/public/favicon.png` existe

### Problema: AC não mostra alimentos
**Solução:**
1. Verifique se importou dados incompletos
2. Reload: `F5`
3. Abra console (F12) e procure por "Carregado X alimentos"

### Problema: Filtro [AC] não aparece
**Solução:**
1. Verifique se `alimento-list.tsx` foi atualizado
2. Faça rebuild: `npm run build`
3. Reinicie dev server: `npm run dev`

### Problema: TypeError nos ícones
**Solução:**
1. Regenere: `node scripts/generate-pwa-icons.js`
2. Verifique se `sharp` está instalado: `npm install sharp --save-dev`

---

## 📊 Métricas

Após importar o dataset de teste, você deve ver:

```
Total Alimentos:        5
├─ ATIVO:              1 (Leite)
├─ AC:                 4 (Pão, Queijo, Manteiga, Iogurte)
├─ VENCE EM BREVE:     0
└─ VENCIDO:            0

Depois de completar os dados:
├─ ATIVO:              2+ (melhorou!)
└─ AC:                 3- (diminuiu!)
```

---

## 🎉 Conclusão

Se você conseguir:
1. ✅ Ver o logo Prieto na aba
2. ✅ Filtrar alimentos incompletos com [AC]
3. ✅ Atualizar alimentos de AC para ATIVO

**Parabéns! Tudo está funcionando! 🚀**

Próximo passo:
```bash
git commit -m "Add AC filter and Prieto favicon"
git push origin main
```

---

**Criado em:** 12 de novembro de 2025  
**Versão:** 1.0  
**Status:** ✅ Pronto para Produção
