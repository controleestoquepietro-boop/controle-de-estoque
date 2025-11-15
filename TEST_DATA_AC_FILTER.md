# 📋 Excel de Teste - Filtro AC

Use este exemplo para testar o filtro **AC (Aguardando Cadastro)**.

## 📊 Arquivo de Importação

Copie os dados abaixo e crie um arquivo Excel (`.xlsx`):

### Com Headers (para importar):

```
Código Produto | Nome | Lote | Data Fabricação | Data Validade | Quantidade | Temperatura | Shelf Life
001            | Leite | L001 | 2025-11-10     | 2025-11-20   | 50        | 4°C        | 10
002            | Pão  | P001 | 2025-11-12     |              | 100       | 20°C       | 7
003            | Queijo | Q001 | 2025-11-09    | 2025-12-09   |           | 8°C        | 30
004            | Manteiga | M001 | 2025-11-11  | 2025-12-11   | 20        |            | 30
005            | Iogurte | Y001 | 2025-11-12  |              |           |            | 15
```

### Interpretar a tabela:

| Código | Nome | Status Esperado | Motivo |
|--------|------|-----------------|---------|
| **001** | Leite | ✅ ATIVO | Todos os campos preenchidos |
| **002** | Pão | 🟠 AC | **Falta Data Validade** |
| **003** | Queijo | 🟠 AC | **Falta Quantidade** |
| **004** | Manteiga | 🟠 AC | **Falta Temperatura** |
| **005** | Iogurte | 🟠 AC | **Falta Tudo (Validade, Qtd, Temp)** |

---

## 🧪 Passos para Testar

### 1️⃣ Criar o arquivo Excel

Abra um novo arquivo no Excel e preencha assim:

```
   A                B          C       D                  E                F           G             H
1  Código Produto  Nome       Lote    Data Fabricação   Data Validade   Quantidade  Temperatura   Shelf Life
2  001             Leite      L001    2025-11-10        2025-11-20      50          4°C           10
3  002             Pão        P001    2025-11-12        [em branco]     100         20°C          7
4  003             Queijo     Q001    2025-11-09        2025-12-09      [em branco] 8°C           30
5  004             Manteiga   M001    2025-11-11        2025-12-11      20          [em branco]   30
6  005             Iogurte    Y001    2025-11-12        [em branco]     [em branco] [em branco]   15
```

Salve como `teste-ac.xlsx`

### 2️⃣ Importar no sistema

1. Abra o sistema em http://localhost:5000
2. Vá para "Controle de Alimentos"
3. Clique em "Importar Alimentos"
4. Selecione `teste-ac.xlsx`
5. Clique em "Importar 5 alimentos"

### 3️⃣ Verificar o Filtro AC

Na tela "Controle de Alimentos":

1. Veja as **Estatísticas**:
   - Total: 5
   - Ativos: 1
   - AC: 4

2. Clique no botão **[AC]**

3. Veja aparecer:
   - 🟠 Pão (falta Data Validade)
   - 🟠 Queijo (falta Quantidade)
   - 🟠 Manteiga (falta Temperatura)
   - 🟠 Iogurte (falta tudo)

---

## 🎨 Resultado Visual

### Antes de filtrar (Todos):
```
┌─────┬──────────┬──────┬─────────┐
│001  │ Leite    │ L001 │ ATIVO ✅│
├─────┼──────────┼──────┼─────────┤
│002  │ Pão      │ P001 │ AC 🟠   │
├─────┼──────────┼──────┼─────────┤
│003  │ Queijo   │ Q001 │ AC 🟠   │
├─────┼──────────┼──────┼─────────┤
│004  │ Manteiga │ M001 │ AC 🟠   │
├─────┼──────────┼──────┼─────────┤
│005  │ Iogurte  │ Y001 │ AC 🟠   │
└─────┴──────────┴──────┴─────────┘
```

### Depois de clicar em [AC]:
```
┌─────┬──────────┬──────┬─────────┐
│002  │ Pão      │ P001 │ AC 🟠   │
├─────┼──────────┼──────┼─────────┤
│003  │ Queijo   │ Q001 │ AC 🟠   │
├─────┼──────────┼──────┼─────────┤
│004  │ Manteiga │ M001 │ AC 🟠   │
├─────┼──────────┼──────┼─────────┤
│005  │ Iogurte  │ Y001 │ AC 🟠   │
└─────┴──────────┴──────┴─────────┘
```

---

## 📋 Variações de Teste

### Teste 1: Apenas Temperatura faltando
```
Código | Nome | Quantidade | Data Validade | Shelf Life | Temperatura
006    | Sal  | 30         | 2026-11-12   | 360        | [em branco]
```
**Resultado esperado:** 🟠 AC (falta Temperatura)

### Teste 2: Vencido + AC
Você pode combinar problemas:
```
Código | Nome | Data Validade | Quantidade | Shelf Life | Temperatura
007    | Pão  | 2025-11-01   | [em branco]| 7         | 20°C
```
**Resultado esperado:** 🟠 AC (prioridade maior que VENCIDO)

### Teste 3: Todos os campos preenchidos
```
Código | Nome | Quantidade | Data Validade | Shelf Life | Temperatura
008    | Café | 5          | 2025-12-31   | 180        | 15°C
```
**Resultado esperado:** ✅ ATIVO

---

## 🔧 Solução de Problemas

### Problema: Importação falha
- ✅ Verifique se as colunas têm os nomes corretos
- ✅ Verifique se o arquivo é `.xlsx` e não `.xls`

### Problema: Alimentos aparecem como ATIVO mesmo sem dados
- Verifique se os campos estão realmente vazios (não com espaços)
- Campos com "0" ou "-" são considerados vazios?
  - ✅ `0` em Quantidade = **AC** (considerado vazio)
  - ✅ Espaço em branco = **AC** (considerado vazio)

### Problema: Não vejo o botão [AC]
- Atualize a página (`F5`)
- Verifique se você importou alimentos com campos incompletos
- Aguarde o loading de dados completar

---

## 💡 Dicas Avançadas

### Ver quem criou cada AC
Cada alimento incompleto mostra quem o importou. Use a aba "Auditoria" para:
1. Filtrar por usuário
2. Ver data/hora da criação
3. Identificar quem precisa completar os dados

### Editar AC diretamente
Clique em um alimento AC para editá-lo:
1. Preencha os campos faltando
2. Clique em "Salvar"
3. O status muda para ✅ ATIVO ou 🟡 VENCE EM BREVE

### Exportar apenas AC
No futuro, você pode criar um relatório que:
- Filtra apenas AC
- Exporta para Excel
- Envia para o gerente completar

---

## 📞 Validação

Após importar, abra o DevTools (`F12 → Console`) e procure por:
```
✅ Alimento sincronizado no Supabase
```

Se vir isso, a importação funcionou! ✅

---

**🎉 Pronto!** Você tem um dataset de teste completo para validar o filtro AC! 🎉
