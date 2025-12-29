const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function normalize(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '');
}

function parseWorksheetToJson(worksheet, expectedKeys) {
  let jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

  const looksLikeColumnLetters = (obj) => {
    if (!obj) return false;
    const keys = Object.keys(obj);
    if (keys.length === 0) return false;
    return keys.every(k => /^[A-Z]+$/.test(k) || /^\d+$/.test(k));
  };

  // Tentar detectar o cabeçalho lendo como matriz (funciona mesmo com linhas de metadados acima)
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  let headerIndex = -1;
  const normalizedExpected = expectedKeys.map(k => normalize(k));

  console.log('Normalized expected keys:', normalizedExpected);
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i] || [];
    const normalizedRow = row.map((c) => c === null || c === undefined ? '' : normalize(c));
    console.log(`Row ${i} normalized:`, normalizedRow);
    const found = row.some((cell) => {
      if (cell === null || cell === undefined) return false;
      const v = normalize(cell);
      return normalizedExpected.some(h => v.includes(h) || h.includes(v));
    });
    if (found) { headerIndex = i; break; }
  }

  if (headerIndex === -1) {
    // heurística genérica: primeira linha com pelo menos 2 células não-vazias
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i] || [];
      const nonEmptyCount = row.reduce((acc, cell) => acc + (cell !== null && cell !== undefined && String(cell).trim() !== '' ? 1 : 0), 0);
      if (nonEmptyCount >= 2) { headerIndex = i; break; }
    }
  }

  if (headerIndex >= 0) {
    const headers = rows[headerIndex].map((h) => (h === null || h === undefined) ? '' : String(h).trim());
    const out = [];
    for (let r = headerIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === '')) continue; // pular linhas vazias entre cabeçalho e dados
      const obj = {};
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c] || `col_${c}`;
        obj[key] = row[c] !== undefined ? row[c] : null;
      }
      out.push(obj);
    }
    jsonData = out;
    return { jsonData, headerIndex, headers };
  }

  // fallback: usar sheet_to_json padrão
  return { jsonData, headerIndex: -1, headers: [] };
}

(async function main(){
  const fileArg = process.argv[2] || 'attached_assets/Controle-de-Estoque_1761698531837.xlsb';
  const filePath = path.resolve(fileArg);
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(2);
  }

  console.log('Reading file:', filePath);
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  console.log('Sheet:', sheetName);
  const worksheet = workbook.Sheets[sheetName];

  // quick headers
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    console.log(`Row ${i}:`, rows[i]);
  }

  const expectedHeaders = ['codigo', 'codigo produto', 'z06_cod', 'codigoProduto', 'nome', 'descricao'];
  const { jsonData, headerIndex, headers } = parseWorksheetToJson(worksheet, expectedHeaders);

  console.log('\nParsed rows count:', jsonData ? jsonData.length : 'undefined');
  console.log('Sample parsed rows (first 5):');
  console.log(Array.isArray(jsonData) ? jsonData.slice(0,5) : jsonData);

  // check for a column that maps to cod
  const possibleCodKeys = ['codigo', 'cod', 'codigo produto', 'codigo_produto', 'z06_cod'];
  const headerRow = headers.length > 0 ? headers : (rows.find(r => r && r.some(c => c !== null && c !== undefined && String(c).trim() !== '')) || []);
  const normalizedHeaderRow = headerRow.map(h => normalize(h));
  console.log('\nNormalized header row:', normalizedHeaderRow);

  const foundCod = normalizedHeaderRow.find(h => possibleCodKeys.some(k => h.includes(normalize(k)) || normalize(k).includes(h)));
  console.log('Found cod-like header:', foundCod || 'not found');

// Process parsed rows similarly to the frontend logic (using normalized lookup)
  const processed = [];
  const validationErrors = [];

  const normalizeKey = (s) => {
    if (s === null || s === undefined) return '';
    return String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]/g, '');
  };
  const getCell = (row, aliases) => {
    const normalizedAliases = aliases.map(a => normalizeKey(a));
    for (const k of Object.keys(row)) {
      const nk = normalizeKey(k);
      const val = row[k];
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) continue;
      for (const a of normalizedAliases) {
        if (nk.includes(a) || a.includes(nk)) return val;
      }
    }
    return undefined;
  };

  (jsonData || []).forEach((row, index) => {
    try {
      const codigoRaw = getCell(row, ['codigo', 'codigo produto', 'z06_cod', 'codigoProduto', 'cod', 'sku', 'prod_code']);
      const nomeRaw = getCell(row, ['nome', 'descricao', 'descricao do item', 'z06_desc', 'desc', 'product name', 'produto']);

      const codigoProduto = codigoRaw ? String(codigoRaw).trim() : '';
      const nome = nomeRaw ? String(nomeRaw).trim() : '';

      if (!codigoProduto || !nome) {
        validationErrors.push(`Linha ${index + 2}: Faltam campos obrigatórios (Código ou Nome)`);
      } else {
        processed.push({ codigoProduto, nome, _rowIndex: index + 2 });
      }
    } catch (err) {
      validationErrors.push(`Linha ${index + 2}: Erro ao processar - ${err}`);
    }
  });

  console.log('\nProcessed sample:', processed.slice(0,10));
  console.log('Validation errors:', validationErrors.slice(0,10));
})();