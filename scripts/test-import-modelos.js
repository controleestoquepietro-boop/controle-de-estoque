const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

function normalize(s) {
  if (s === null || s === undefined) return '';
  return String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]/g, '');
}

function parseWorksheetToJson(worksheet, expectedKeys) {
  let jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  let headerIndex = -1;
  const normalizedExpected = expectedKeys.map(k => normalize(k));

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i] || [];
    const normalizedRow = row.map((c) => c === null || c === undefined ? '' : normalize(c));
    const found = row.some((cell) => {
      if (cell === null || cell === undefined) return false;
      const v = normalize(cell);
      return normalizedExpected.some(h => v.includes(h) || h.includes(v));
    });
    if (found) { headerIndex = i; break; }
  }

  if (headerIndex === -1) {
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
      if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === '')) continue;
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

  return { jsonData, headerIndex: -1, headers: [] };
}

(async function main(){
  const fileArg = process.argv[2] || 'C:/Users/sammu/OneDrive/Área de Trabalho/Projetos/Controle FIFO_Versão final.xlsx';
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

  const expectedHeaders = ['z06_cod','z0b_cod','cod','codigo','z06_desc','descricao','z06_arma','prazo','shelf','gtin'];
  const { jsonData, headerIndex, headers } = parseWorksheetToJson(worksheet, expectedHeaders);

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

  const modelos = [];
  (jsonData || []).forEach((row, idx) => {
    const codigo = getCell(row, ['Z0B_COD', 'Z06_COD', 'COD', 'CODIGO', 'Código', 'codigo', 'cod']);
    const descricao = getCell(row, ['Z0B_DESC', 'Z06_DESC', 'DESC', 'DESCRICAO', 'Descrição', 'descricao', 'descricao do item']);
    const temperatura = getCell(row, ['Z0B_ARMA', 'Z06_ARMA', 'ARMA', 'TEMPERATURA']);
    const shelfRaw = getCell(row, ['Z0B_PRAZO', 'Z06_PRAZO', 'Z0B_GTIN', 'Z06_GTIN', 'PRAZO', 'SHELF']);

    modelos.push({
      codigoProduto: codigo ? String(codigo).trim() : '',
      descricao: descricao ? String(descricao).trim() : '',
      temperatura: temperatura ? String(temperatura).trim() : undefined,
      shelfLife: shelfRaw ? Number(shelfRaw) : undefined,
      _rowIndex: headerIndex >= 0 ? headerIndex + 1 + idx + 1 : idx + 2,
    });
  });

  console.log('Prepared modelos sample:', modelos.slice(0,5));
  console.log('Total modelos prepared:', modelos.length);

  // Send to local server
  const res = await fetch('http://127.0.0.1:5000/api/modelos-produtos/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-dev-impersonate': 'dev@test.local' },
    body: JSON.stringify({ modelos }),
  });
  const body = await res.json();
  console.log('Server response status:', res.status);
  console.log('Server response body:', JSON.stringify(body, null, 2));
})();