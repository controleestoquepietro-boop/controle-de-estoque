# Guia de Importação de Dados via Excel

## 📋 Resumo da Implementação

O componente de importação Excel (`import-excel-dialog.tsx`) foi atualizado para capturar **TODOS os campos disponíveis** de seus arquivos Excel com suporte a múltiplas variações de nomes de coluna.

### Campos Capturados Automaticamente

| Campo | Variações de Nome Suportadas | Padrão | Exemplo |
|-------|------------------------------|--------|---------|
| **Código Produto** | Código Produto, codigoProduto, Código, código, Z06_COD, Codigo, CODIGO, SKU, sku, Prod_Code, PROD_CODE | Obrigatório | "160631" |
| **Nome** | Nome, nome, Descrição, descrição, DESCRIÇÃO, Descricao, DESCRICAO, Z06_DESC, Desc, DESC, Product Name, PRODUCT_NAME, Produto, PRODUTO | Obrigatório | "Miúdo salgado de suíno" |
| **Lote** | Lote, lote, LOTE, Batch, BATCH, Lot, LOT, Z06_LOTE | "LOTE-01" | "L123456" |
| **Quantidade** | Quantidade, quantidade, Qtd, QTD, Quantity, QUANTITY, Quantidade (kg), quantidade (kg), Z06_QTD | 0 | 15.5 |
| **Unidade** | Unidade, unidade, Unit, UNIT, Unidade Medida, unidade_medida, Z06_UNI | "kg" | "caixa" ou "kg" |
| **Data Fabricação** | Data Fabricação, dataFabricacao, Data Fabricacao, Data de Fabricacao | Hoje | "2024-01-15" ou número Excel |
| **Data Validade** | Data Validade, dataValidade, Data de Validade, Vencimento, vencimento, Expiration, EXPIRATION | Calculada | "2024-03-30" ou número Excel |
| **Shelf Life** | Shelf Life (dias), shelfLife, Shelf Life, SHELF_LIFE, Dias Validade, dias_validade, Z06_PRAZO, Prazo, PRAZO, Validade (dias) | 365 | 75 |
| **Peso por Caixa** | Peso por Caixa (kg), pesoPorCaixa, Peso Caixa, PESO_CAIXA, Weight per Box, Z06_TRCX, Peso Unitário, peso_unitario, Weight | Vazio | 15.0 |
| **Temperatura** | Temperatura, temperatura, TEMPERATURA, Temp, TEMP, Z06_ARMA, Armazenamento, ARMAZENAMENTO, Storage, STORAGE | Vazio | "8°C a 25°C" |

## 📊 Formatos de Arquivo Suportados

- ✅ Excel 2007+ (.xlsx)
- ✅ Excel 97-2003 (.xls)
- ✅ Excel habilitado para macros (.xlsm) — somente leitura dos dados (macros são ignoradas)
- ✅ Excel binário (.xlsb) — suportado (dados lidos, macros não executadas)

## 🔄 Conversão Automática

### Datas
- **Excel (número)**: Convertido automaticamente usando a fórmula `(value - 25569) * 86400 * 1000`
- **Texto (ISO)**: Aceita formato "YYYY-MM-DD"

### Data de Validade Automática
Se você informar:
- Data de Fabricação + Shelf Life → Data de Validade é **calculada automaticamente**

Exemplo:
- Data Fabricação: 2024-01-15
- Shelf Life: 75 dias
- Data Validade: 2024-03-30 (calculada)

### Unidade de Medida
- "caixa" ou "cx" → normalizado para "caixa"
- Qualquer outro valor → normalizado para "kg"

## 📥 Processo de Importação

1. **Carregar arquivo** → Clique no botão "Clique para selecionar um arquivo"
2. **Validação** → Sistema valida:
   - ✓ Código Produto é obrigatório
   - ✓ Nome é obrigatório
   - ✓ Mostra preview dos primeiros 5 alimentos
   - ✓ Exibe avisos de linhas com problemas
3. **Preview Completo** → Visualize todos os campos:
   - Código, Nome, Lote, Quantidade, Unidade
   - Data Fabricação, Data Validade, Shelf Life
   - Temperatura, Peso por Caixa
4. **Importar** → Clique em "Importar X alimentos"

## 📝 Exemplo de Arquivo Excel

### Formato Simples (Mínimo)
```
| Código Produto | Nome                    | Lote    | Quantidade | Unidade |
|---|---|---|---|---|
| 160631         | Miúdo salgado de suíno  | L001    | 10         | caixa   |
| 160632         | Lingüiça toscana        | L002    | 5          | kg      |
```

### Formato Completo (Com todos os campos)
```
| Código | Nome                 | Lote | Qtd | Unidade | Fab. Date    | Validade | Dias | Temp      | Peso/Cx |
|---|---|---|---|---|---|---|---|---|---|
| 160631 | Miúdo salgado        | L001 | 10  | caixa   | 2024-01-15   | 2024-03-30| 75   | 8-25°C    | 15.0    |
| 160632 | Lingüiça toscana     | L002 | 5   | kg      | 01/15/2024   | 03/30/2024| 75   | 4-8°C     |         |
```

### Formato com Variações de Nome (Será reconhecido)
```
| SKU    | Descrição            | Batch | Quantidade (kg) | Unit | Data Fabricação | Vencimento | Shelf Life (dias) | Temperatura | Peso Unitário |
|---|---|---|---|---|---|---|---|---|---|
| 160631 | Miúdo salgado        | L001  | 10              | cx   | 2024-01-15      | 2024-03-30 | 75                | 8-25°C      | 15.0          |
```

## ⚠️ Validação e Erros

### Erros Detectados
- ❌ Falta Código Produto → "Linha X: Faltam campos obrigatórios (Código ou Nome)"
- ❌ Falta Nome → "Linha X: Faltam campos obrigatórios (Código ou Nome)"
- ❌ Arquivo inválido → "Erro ao ler arquivo - Verifique se o arquivo é um Excel válido"

### Preview de Erros
- Mostra até 5 problemas na interface
- Aviso toast notifica "X linhas com problemas"
- Dados válidos continuam sendo importados (ignora linhas com erro)

## 🎯 Fluxo de Importação Completo

```
Excel File
    ↓
[XLSX Parser] → Extrai SheetName[0]
    ↓
[Row Processor] → Para cada linha:
    • Detecta variações de nomes de coluna
    • Converte datas de Excel para ISO
    • Valida campos obrigatórios
    • Cria objeto InsertAlimento
    ↓
[Validação Schema] → Zod valida cada alimento
    ↓
[Preview] → Mostra 5 primeiros alimentos com todos os campos
    ↓
[Import Button] → POST /api/alimentos/import
    ↓
[Backend Processing] → DatabaseStorage.createAlimento()
    • Tenta Supabase primeiro
    • Se offline, salva em fila (pending-sync.json)
    • Sincroniza quando volta online
    ↓
[UI Feedback] → Toast notifica sucesso/erro
```

## 💾 Pós-Importação

Após importação bem-sucedida:
1. ✅ Dados salvos no Supabase (se online)
2. ✅ Fila sincroniza quando offline
3. ✅ Background scheduler (10s) tenta sincronizar pendentes
4. ✅ Lista de alimentos atualiza automaticamente

## 🧪 Testando a Importação

### Passo 1: Criar arquivo teste
Crie `teste_import.xlsx` com:
```
Código | Nome               | Lote  | Qtd | Unidade | Fab. Date | Validade   | Dias | Temp   | Peso
160701 | Pastel de Carne    | L100  | 20  | caixa   | 01-15-24  | 03-30-24   | 75   | -18°C  | 2.5
160702 | Coxinha            | L101  | 30  | caixa   | 01-16-24  | 04-01-24   | 76   | -18°C  | 1.8
160703 | Pão de Queijo      | L102  | 15  | kg      | 01-17-24  | 02-17-24   | 31   | 25°C   |
```

### Passo 2: Abrir dialog de importação
1. Clique em "Importar Modelos" no dashboard
2. Selecione `teste_import.xlsx`
3. Verifique preview com todos os campos

### Passo 3: Confirmar dados
- ✓ Verificar se todos os 9 campos aparecem
- ✓ Verificar datas foram convertidas corretamente
- ✓ Verificar validação automática de lote (se não informar, usa "LOTE-01")

### Passo 4: Importar
- Clique "Importar 3 alimentos"
- Aguarde notificação de sucesso

### Passo 5: Validar no Dashboard
- Lista deve mostrar 3 novos alimentos
- Clique em "Editar" para confirmar todos os campos foram salvos

## 📊 Campos no Preview

A tabela de preview agora mostra (da esquerda para direita):

| Coluna | Descrição |
|--------|-----------|
| Código | Código do produto |
| Nome | Nome/Descrição do produto |
| Lote | Número do lote |
| Qtd | Quantidade em kg ou número de caixas |
| Un. | Unidade (kg ou caixa) |
| Fab. | Data de Fabricação |
| Validade | Data de Validade |
| Dias | Shelf Life (dias) |
| Temp. | Temperatura de armazenamento |
| Peso/Cx | Peso por caixa em kg |

## 🔗 Integração com Supabase

Todos os dados importados são:
1. ✅ Validados localmente
2. ✅ Enviados para `/api/alimentos/import`
3. ✅ Salvos em Supabase (quando online)
4. ✅ Sincronizados de forma offline (quando desconectado)

## 📌 Resumo de Campos Suportados

**Total de campos capturados: 10**
- codigoProduto
- nome
- unidade
- lote
- dataFabricacao
- dataValidade
- quantidade
- pesoPorCaixa
- temperatura
- shelfLife
- alertasConfig (configurações padrão)

Todos com suporte a **múltiplas variações de nomes de coluna** para compatibilidade com diferentes formatos Excel.
