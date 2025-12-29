function parseAnyDate(v) {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return undefined;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().split('T')[0];
  if (typeof v === 'number') {
    const date = new Date((v - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const ddmmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (ddmmy) {
    let day = ddmmy[1].padStart(2, '0');
    let month = ddmmy[2].padStart(2, '0');
    let year = ddmmy[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return undefined;
}

function mapRowToFields(row) {
  const normalizeKey = (s) => {
    if (s === null || s === undefined) return '';
    return String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const out = {};
  for (const k of Object.keys(row)) {
    try {
      const nk = normalizeKey(k);
      const val = row[k];
      if (!out.codigoProduto && (nk.includes('cod') || nk.includes('codigo') || nk === 'cod')) out.codigoProduto = val;
      if (!out.nome && (nk.includes('desc') || nk.includes('nome') || nk.includes('produto') || nk.includes('descricao'))) out.nome = val;
      if (!out.temperatura && (nk.includes('temp') || nk.includes('arma') || nk.includes('temperatura'))) out.temperatura = val;
      if (!out.lote && nk.includes('lote')) out.lote = val;
      if (!out.dataFabricacao && (nk.includes('fabric') || nk.includes('fabr'))) out.dataFabricacao = val;
      if (!out.dataValidade && nk.includes('valid')) out.dataValidade = val;
      if (!out.shelfLife && (nk.includes('shelf') || nk.includes('prazo') || nk.includes('dias'))) out.shelfLife = val;
      if (!out.pesoPorCaixa && (nk.includes('peso') || nk.includes('weight') || nk.includes('peso_unitario')) && !nk.includes('qtd') && !nk.includes('quant')) out.pesoPorCaixa = val;
      if (!out.quantidade && (nk.includes('qtd') || nk.includes('quant') || nk === 'qtdkg')) out.quantidade = val;
      if (!out.unidade && nk.includes('unid')) out.unidade = val;
    } catch (err) {
      continue;
    }
  }

  const getCellValue = (row, aliases) => {
    const normalize = (s) => {
      if (s === null || s === undefined) return '';
      return String(s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]/g, '');
    };
    const normalizedAliases = aliases.map((a) => normalize(a));
    for (const k of Object.keys(row)) {
      try {
        const nk = normalize(k);
        const val = row[k];
        if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) continue;
        for (const a of normalizedAliases) {
          if (nk.includes(a) || a.includes(nk)) return val;
        }
      } catch (err) {
        continue;
      }
    }
    return undefined;
  };

  if (!out.codigoProduto)
    out.codigoProduto = getCellValue(row, ['codigo', 'cod', 'codigo produto', 'codigoProduto', 'z06_cod', 'sku', 'prod_code']);
  if (!out.nome)
    out.nome = getCellValue(row, ['nome', 'descricao', 'descricao do item', 'z06_desc', 'desc', 'product name', 'produto']);
  if (!out.dataFabricacao)
    out.dataFabricacao = getCellValue(row, ['data fabricacao', 'fabricacao', 'fabricao', 'data de fabricacao']);
  if (!out.dataValidade)
    out.dataValidade = getCellValue(row, ['data validade', 'validade', 'vencimento', 'data de validade', 'expiracao', 'expiração']);
  if (!out.quantidade)
    out.quantidade = getCellValue(row, ['quantidade', 'qtd', 'qtd kg', 'qtdkg', 'quantity', 'qtdkg']);
  if (!out.shelfLife)
    out.shelfLife = getCellValue(row, ['shelf life', 'shelfLife', 'shelf_life', 'prazo', 'dias_validade', 'z06_prazo']);
  if (!out.pesoPorCaixa)
    out.pesoPorCaixa = getCellValue(row, ['peso por caixa', 'pesoPorCaixa', 'peso caixa', 'peso_unitario', 'weight', 'peso']);
  if (!out.temperatura)
    out.temperatura = getCellValue(row, ['temperatura', 'temp', 'armazenamento', 'storage', 'z06_arma']);
  if (!out.lote)
    out.lote = getCellValue(row, ['lote', 'batch', 'lot', 'z06_lote']);

  return out;
}

function processRow(row, index) {
  const mapped = mapRowToFields(row);
  const codigoProduto = mapped.codigoProduto ? String(mapped.codigoProduto).trim() : '';
  const nome = mapped.nome ? String(mapped.nome).trim() : '';
  let temperatura = mapped.temperatura ? String(mapped.temperatura).trim() : '';
  let lote = mapped.lote ? String(mapped.lote).trim() : 'LOTE-01';

  let dataFabricacao = parseAnyDate(mapped.dataFabricacao);
  let dataValidade = parseAnyDate(mapped.dataValidade);

  const shelfLifeRaw = mapped.shelfLife || row['Shelf Life (dias)'] || row['SHELF_LIFE'] || row['Dias Validade'] || row['Z06_PRAZO'];
  let shelfLife = Number(shelfLifeRaw);
  if (!shelfLife || isNaN(shelfLife)) shelfLife = 365;

  if (!dataFabricacao) dataFabricacao = new Date().toISOString().split('T')[0];
  if (!dataValidade && dataFabricacao && shelfLife) {
    const fab = new Date(dataFabricacao);
    fab.setDate(fab.getDate() + Number(shelfLife));
    dataValidade = fab.toISOString().split('T')[0];
  }

  let quantidade = 0;
  const qtdKg = mapped.quantidade || row['QTD KG'] || row['QTD_KG'] || row['QTDKG'];
  const qtd = mapped.quantidade || row['QTD'] || row['Qtd'] || row['Quantidade'] || row['quantidade'];
  if (qtdKg !== undefined && qtdKg !== null && String(qtdKg).trim() !== '') quantidade = Number(qtdKg);
  else if (qtd !== undefined && qtd !== null && String(qtd).trim() !== '') quantidade = Number(qtd);

  const pesoPorCaixaValue = mapped.pesoPorCaixa ?? row['Peso por Caixa (kg)'] ?? row['pesoPorCaixa'] ?? row['Peso Caixa'] ?? row['PESO_CAIXA'] ?? row['Weight per Box'] ?? row['Z06_TRCX'] ?? row['Peso Unitário'] ?? row['peso_unitario'] ?? row['Weight'];
  const pesoPorCaixaNum = pesoPorCaixaValue !== undefined && pesoPorCaixaValue !== null && String(pesoPorCaixaValue).trim() !== '' ? Number(pesoPorCaixaValue) : undefined;

  const unidadeRaw = mapped.unidade ?? row['Unidade'] ?? row['unidade'] ?? row['Unit'] ?? row['UNIT'] ?? row['Unidade Medida'] ?? row['unidade_medida'] ?? row['Z06_UNI'] ?? 'kg';
  const unidade = String(unidadeRaw).toLowerCase();

  const alimento = {
    codigoProduto,
    nome,
    unidade: unidade === 'caixa' || unidade === 'cx' ? 'caixa' : 'kg',
    lote,
    dataFabricacao: String(dataFabricacao),
    dataValidade: String(dataValidade),
    quantidade,
    pesoPorCaixa: pesoPorCaixaNum,
    temperatura,
    shelfLife,
    alertasConfig: {
      contarAPartirFabricacaoDias: 10,
      avisoQuandoUmTercoValidade: true,
      popUpNotificacoes: true,
    },
    _rowIndex: index + 2,
  };

  const errors = [];
  if (!alimento.codigoProduto || !alimento.nome) errors.push('Faltam campos obrigatórios (Código ou Nome)');
  return { alimento, errors };
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

console.log(processRow(sampleRow, 0));

const sampleRow3 = {
  'CÓD': null,
  'DESCRIÇÃO DO ITEM': 'Sem código',
  'QTD KG': '20'
};
console.log(processRow(sampleRow3, 1));
