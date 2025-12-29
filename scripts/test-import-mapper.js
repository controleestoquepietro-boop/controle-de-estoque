// Simple Node script to test mapRowToFields logic copied from import-excel-dialog
function normalize(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function getCellValue(row, aliases) {
  const normalizeKey = (s) => normalize(s);
  const normalizedAliases = aliases.map((a) => normalizeKey(a));
  for (const k of Object.keys(row)) {
    try {
      const nk = normalizeKey(k);
      const val = row[k];
      if (val === null || val === undefined || (typeof val === "string" && val.trim() === "")) continue;
      for (const a of normalizedAliases) {
        if (nk.includes(a) || a.includes(nk)) return val;
      }
    } catch (err) {
      continue;
    }
  }
  return undefined;
}

function mapRowToFields(row) {
  const normalizeKey = (s) => {
    if (s === null || s === undefined) return "";
    return String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const out = {};

  for (const k of Object.keys(row)) {
    try {
      const nk = normalizeKey(k);
      const val = row[k];
      if (!out.codigoProduto && (nk.includes("cod") || nk.includes("codigo") || nk === "cod")) out.codigoProduto = val;
      if (!out.nome && (nk.includes("desc") || nk.includes("nome") || nk.includes("produto") || nk.includes("descricao"))) out.nome = val;
      if (!out.temperatura && (nk.includes("temp") || nk.includes("arma") || nk.includes("temperatura"))) out.temperatura = val;
      if (!out.lote && nk.includes("lote")) out.lote = val;
      if (!out.dataFabricacao && (nk.includes("fabric") || nk.includes("fabr"))) out.dataFabricacao = val;
      if (!out.dataValidade && nk.includes("valid")) out.dataValidade = val;
      if (!out.shelfLife && (nk.includes("shelf") || nk.includes("prazo") || nk.includes("dias"))) out.shelfLife = val;
      if (!out.pesoPorCaixa && (nk.includes("peso") || nk.includes("weight") || nk.includes("kg") || nk.includes("peso_unitario"))) out.pesoPorCaixa = val;
      if (!out.quantidade && (nk.includes("qtd") || nk.includes("quant") || nk === "qtdkg")) out.quantidade = val;
      if (!out.unidade && nk.includes("unid")) out.unidade = val;
    } catch (err) {
      continue;
    }
  }

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

  return out;
}

const sampleRow = {
  'CÓD': 'ABC123',
  'DESCRIÇÃO DO ITEM': 'Leite UHT',
  'QTD KG': '150',
  'FABRICAÇÃO': '01/01/2025',
  'VALIDADE': '01/04/2025',
  'PESO POR CAIXA (kg)': '3',
  'UNIDADE': 'kg',
};

console.log('Sample row:', sampleRow);
console.log('Mapped:', mapRowToFields(sampleRow));

// Another variant
const sample2 = {
  'cod': 'XYZ999',
  'descricao do item': 'Farinha',
  'Qtd': '20',
  'Data Validade': '30/06/2025',
  'Peso Caixa': '10',
  'Unidade Medida': 'cx'
};
console.log('Sample2 mapped:', mapRowToFields(sample2));
