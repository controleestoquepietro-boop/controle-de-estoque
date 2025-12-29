function normalize(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function mapRowToFields(row) {
  const normalizeKey = (s) => normalize(s);
  const out = {};
  for (const k of Object.keys(row)) {
    const nk = normalizeKey(k);
    const val = row[k];
    console.log('Key:', k, '->', nk, 'val:', val);
    if (!out.codigoProduto && (nk.includes("cod") || nk.includes("codigo") || nk === "cod")) { out.codigoProduto = val; console.log('  -> codigoProduto set'); }
    if (!out.nome && (nk.includes("desc") || nk.includes("nome") || nk.includes("produto") || nk.includes("descricao"))) { out.nome = val; console.log('  -> nome set'); }
    if (!out.temperatura && (nk.includes("temp") || nk.includes("arma") || nk.includes("temperatura"))) { out.temperatura = val; console.log('  -> temperatura set'); }
    if (!out.lote && nk.includes("lote")) { out.lote = val; console.log('  -> lote set'); }
    if (!out.dataFabricacao && (nk.includes("fabric") || nk.includes("fabr"))) { out.dataFabricacao = val; console.log('  -> dataFabricacao set'); }
    if (!out.dataValidade && nk.includes("valid")) { out.dataValidade = val; console.log('  -> dataValidade set'); }
    if (!out.shelfLife && (nk.includes("shelf") || nk.includes("prazo") || nk.includes("dias"))) { out.shelfLife = val; console.log('  -> shelfLife set'); }
    if (!out.pesoPorCaixa && (nk.includes("peso") || nk.includes("weight") || nk.includes("peso_unitario")) && !nk.includes("qtd") && !nk.includes("quant")) { out.pesoPorCaixa = val; console.log('  -> pesoPorCaixa set'); }
    if (!out.quantidade && (nk.includes("qtd") || nk.includes("quant") || nk === "qtdkg")) { out.quantidade = val; console.log('  -> quantidade set'); }
    if (!out.unidade && nk.includes("unid")) { out.unidade = val; console.log('  -> unidade set'); }
  }

  console.log('After initial loop', out);

  const getCellValue = (row, aliases) => {
    const normalizedAliases = aliases.map((a) => normalize(a));
    for (const k of Object.keys(row)) {
      const nk = normalize(k);
      const val = row[k];
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) continue;
      for (const a of normalizedAliases) {
        if (nk.includes(a) || a.includes(nk)) {
          console.log('getCellValue matched', k, 'for alias', a);
          return val;
        }
      }
    }
    return undefined;
  };

  if (!out.codigoProduto)
    out.codigoProduto = getCellValue(row, ["codigo", "cod", "codigo produto", "codigoProduto", "z06_cod", "sku", "prod_code"]);
  if (!out.nome)
    out.nome = getCellValue(row, ["nome", "descricao", "descricao do item", "z06_desc", "desc", "product name", "produto"]);
  if (!out.dataFabricacao)
    out.dataFabricacao = getCellValue(row, ["data fabricacao", "fabricacao", "fabricao", "data de fabricacao"]);
  if (!out.dataValidade)
    out.dataValidade = getCellValue(row, ["data validade", "validade", "vencimento", "data de validade", "expiracao", "expiração"]);
  if (!out.quantidade)
    out.quantidade = getCellValue(row, ["quantidade", "qtd", "qtd kg", "qtdkg", "quantity", "qtdkg"]);
  if (!out.shelfLife)
    out.shelfLife = getCellValue(row, ["shelf life", "shelfLife", "shelf_life", "prazo", "dias_validade", "z06_prazo"]);
  if (!out.pesoPorCaixa)
    out.pesoPorCaixa = getCellValue(row, ["peso por caixa", "pesoPorCaixa", "peso caixa", "peso_unitario", "weight", "peso"]);
  if (!out.temperatura)
    out.temperatura = getCellValue(row, ["temperatura", "temp", "armazenamento", "storage", "z06_arma"]);
  if (!out.lote)
    out.lote = getCellValue(row, ["lote", "batch", "lot", "z06_lote"]);

  console.log('After fallback', out);
  return out;
}

const sampleRow = {
  'CÓD': 'ABC123',
  'DESCRIÇÃO DO ITEM': 'Leite UHT',
  'QTD KG': '150',
  'FABRICAÇÃO': '01/01/2025',
  VALIDADE: '01/04/2025',
  'PESO POR CAIXA (kg)': '3',
  UNIDADE: 'kg'
};
console.log('\n=== Sample row ===');
console.log(mapRowToFields(sampleRow));

const sample2 = {
  'cod': 'XYZ999',
  'descricao do item': 'Farinha',
  'Qtd': '20',
  'Data Validade': '30/06/2025',
  'Peso Caixa': '10',
  'Unidade Medida': 'cx'
};
console.log('\n=== Sample2 ===');
console.log(mapRowToFields(sample2));
