# Dados de Teste para Importação Excel

## 📝 Como criar arquivo teste_import.xlsx

Use LibreOffice Calc, Excel ou qualquer editor de planilhas e crie com estes dados:

### Formato 1: Usando nomes de coluna originais

```
Código Produto,Nome,Lote,Quantidade,Unidade,Data Fabricação,Data Validade,Shelf Life (dias),Temperatura,Peso por Caixa (kg)
160701,Pastel de Carne,L100,20,caixa,2024-01-15,2024-03-30,75,8°C a -18°C,2.5
160702,Coxinha Mineira,L101,30,caixa,2024-01-16,2024-04-01,76,-18°C,1.8
160703,Pão de Queijo Caseiro,L102,15,kg,2024-01-17,2024-02-17,31,20°C a 25°C,
160704,Salgado de Queijo,L103,50,caixa,2024-01-18,2024-04-15,88,4°C a 8°C,3.2
160705,Bolo de Chocolate,L104,25,kg,2024-01-19,2024-03-01,41,25°C,
```

### Formato 2: Usando variações de coluna (SAP/Z06)

```
Z06_COD,Z06_DESC,Z06_LOTE,Z06_QTD,Z06_UNI,Data Fabricacao,Vencimento,Z06_PRAZO,Z06_ARMA,Z06_TRCX
160701,Pastel de Carne,L100,20,cx,2024-01-15,2024-03-30,75,CONGELADO,-18°C,2.5
160702,Coxinha Mineira,L101,30,cx,2024-01-16,2024-04-01,76,CONGELADO,-18°C,1.8
160703,Pão de Queijo Caseiro,L102,15,kg,2024-01-17,2024-02-17,31,AMBIENTE,25°C,
160704,Salgado de Queijo,L103,50,cx,2024-01-18,2024-04-15,88,CONGELADO,-18°C,3.2
160705,Bolo de Chocolate,L104,25,kg,2024-01-19,2024-03-01,41,AMBIENTE,25°C,
```

### Formato 3: Usando nomes genéricos (English)

```
SKU,Product Name,Lot,Quantity,Unit,Manufacturing Date,Expiration Date,Shelf Life (days),Storage Temperature,Weight per Box
160701,Pastel de Carne,L100,20,box,01/15/2024,03/30/2024,75,Frozen,-18°C,2.5
160702,Coxinha Mineira,L101,30,box,01/16/2024,04/01/2024,76,Frozen,-18°C,1.8
160703,Pão de Queijo Caseiro,L102,15,kg,01/17/2024,02/17/2024,31,Room,25°C,
160704,Salgado de Queijo,L103,50,box,01/18/2024,04/15/2024,88,Frozen,-18°C,3.2
160705,Bolo de Chocolate,L104,25,kg,01/19/2024,03/01/2024,41,Room,25°C,
```

### Formato 4: Calculando Data de Validade (apenas Fab + Shelf Life)

```
Código Produto,Nome,Lote,Quantidade,Unidade,Data Fabricação,Shelf Life (dias),Temperatura,Peso por Caixa (kg)
160701,Pastel de Carne,L100,20,caixa,2024-01-15,75,8°C a -18°C,2.5
160702,Coxinha Mineira,L101,30,caixa,2024-01-16,76,-18°C,1.8
160703,Pão de Queijo Caseiro,L102,15,kg,2024-01-17,31,20°C a 25°C,
160704,Salgado de Queijo,L103,50,caixa,2024-01-18,88,4°C a 8°C,3.2
160705,Bolo de Chocolate,L104,25,kg,2024-01-19,41,25°C,
```
**Nota**: Data de Validade será calculada automaticamente = Data Fabricação + Shelf Life

## ✅ Resultado Esperado

Depois de importar qualquer um dos formatos acima, você deve ver:

### No Preview (antes de confirmar)
- 5 linhas mostradas com todos os campos
- Coluna "Código": 160701, 160702, 160703, 160704, 160705
- Coluna "Qtd": 20, 30, 15, 50, 25
- Coluna "Dias": 75, 76, 31, 88, 41
- Coluna "Temp": 8°C a -18°C, -18°C, 20°C a 25°C, 4°C a 8°C, 25°C
- Coluna "Peso/Cx": 2.5, 1.8, (vazio), 3.2, (vazio)

### No Dashboard (após importar)
- 5 novos alimentos na lista
- Clicando em "Editar" de cada um:
  - ✓ Código preenchido
  - ✓ Nome preenchido
  - ✓ Lote preenchido (ou "LOTE-01" se não informado)
  - ✓ Quantidade preenchida
  - ✓ Unidade correta (caixa ou kg)
  - ✓ Data Fabricação preenchida
  - ✓ Data Validade preenchida (ou calculada)
  - ✓ Shelf Life preenchido
  - ✓ Temperatura preenchida
  - ✓ Peso por Caixa preenchido (se informado)

## 🔍 Teste de Validação

### Teste 1: Campo obrigatório faltando
Crie arquivo com linha faltando código:
```
Código Produto,Nome,Lote,Quantidade
,Pastel de Carne,L100,20
```
**Esperado**: Erro "Linha 2: Faltam campos obrigatórios (Código ou Nome)"

### Teste 2: Data em formato Excel (número)
Crie arquivo com data como número:
```
Código Produto,Nome,Data Fabricação
160701,Pastel de Carne,45296
```
**Esperado**: Data convertida para "2024-01-15"

### Teste 3: Nomes de coluna com espaços extras
Crie arquivo com espaços desnecessários:
```
 Código Produto , Nome , Lote 
160701,Pastel de Carne,L100
```
**Esperado**: Funciona normalmente (trimmed)

## 📋 Checklist de Importação

Para testar completamente a importação:

- [ ] Criar arquivo Excel com todos os 10 campos
- [ ] Abrir dialog "Importar Alimentos via Excel"
- [ ] Selecionar arquivo
- [ ] Verificar preview mostra todas as colunas (10 campos)
- [ ] Verificar dados estão corretos no preview
- [ ] Clicar "Importar X alimentos"
- [ ] Aguardar notificação de sucesso
- [ ] Abrir lista de alimentos
- [ ] Clicar "Editar" em um alimento importado
- [ ] Verificar se TODOS os 10 campos foram salvos
- [ ] Fechar form
- [ ] Repetir com diferentes formatos de arquivo

## 💡 Dicas

1. **Variações de Coluna**: Sistema suporta ~40 variações de nomes de coluna, então funciona com:
   - Português: "Código Produto", "Nome", "Data Fabricação"
   - Inglês: "SKU", "Product Name", "Manufacturing Date"
   - SAP/Legacy: "Z06_COD", "Z06_DESC", "Z06_PRAZO"

2. **Datas**: Aceita
   - Formato ISO: 2024-01-15
   - Formato BR: 15/01/2024 (quando convertido do Excel)
   - Número Excel: 45296 (será convertido)

3. **Cálculo Automático**: Se informar Data Fabricação + Shelf Life, Data Validade é calculada

4. **Lote Padrão**: Se não informar lote, usa "LOTE-01"

5. **Unidade**: "caixa" ou "cx" → normalizado para "caixa"; qualquer outro → "kg"

## 🚀 Próximos Passos

Após testes bem-sucedidos:
1. Exportar dados reais da SAP/ERP para xlsx
2. Usar qualquer formato de coluna (sistema reconhece variações)
3. Importar em batch no dashboard
4. Dados sincronizam automaticamente com Supabase
