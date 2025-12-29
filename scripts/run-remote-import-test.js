const XLSX = require('xlsx');
const fs = require('fs');
const fetch = require('node-fetch');

(async function main(){
  const file = 'C:/Users/sammu/OneDrive/Área de Trabalho/Projetos/Controle FIFO_Versão final.xlsx';
  if (!fs.existsSync(file)) { console.error('file missing', file); process.exit(1); }
  const wb = XLSX.readFile(file, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  let headerIndex = -1;
  for (let i = 0; i < 20 && i < rows.length; i++) {
    const row = rows[i] || [];
    const nonEmpty = row.reduce((a, c) => a + (c !== null && c !== undefined && String(c).trim() !== '' ? 1 : 0), 0);
    if (nonEmpty >= 2) { headerIndex = i; break; }
  }
  if (headerIndex === -1) { console.error('no header'); process.exit(1); }
  const headers = rows[headerIndex].map(h => (h === null || h === undefined) ? '' : String(h).trim());
  const data = [];
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every(c => c === null || c === undefined || String(c).trim() === '')) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `col_${c}`;
      obj[key] = row[c] !== undefined ? row[c] : null;
    }
    data.push(obj);
  }

  function normalize(s) {
    if (s === null || s === undefined) return '';
    return String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]/g, '');
  }
  function getCell(row, aliases) {
    const na = aliases.map(a => normalize(a));
    for (const k of Object.keys(row)) {
      const nk = normalize(k);
      const val = row[k];
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) continue;
      for (const a of na) {
        if (nk.includes(a) || a.includes(nk)) return val;
      }
    }
    return undefined;
  }

  const modelos = [];
  data.forEach((row, idx) => {
    const codigo = getCell(row, ['Z0B_COD', 'Z06_COD', 'COD', 'CODIGO']);
    const descricao = getCell(row, ['Z06_DESC', 'DESCRICAO', 'DESC']);
    const temperatura = getCell(row, ['Z0B_ARMA', 'Z06_ARMA', 'TEMPERATURA']);
    const shelfRaw = getCell(row, ['Z0B_PRAZO', 'Z06_PRAZO', 'PRAZO', 'SHELF']);
    modelos.push({
      codigoProduto: codigo ? String(codigo).trim() : '',
      descricao: descricao ? String(descricao).trim() : '',
      temperatura: temperatura ? String(temperatura).trim() : undefined,
      shelfLife: shelfRaw ? Number(shelfRaw) : undefined,
      _rowIndex: headerIndex >= 0 ? headerIndex + 1 + idx + 1 : idx + 2,
    });
  });

  console.log('Prepared', modelos.length, 'modelos');
  const res = await fetch('https://cxpt-core.fly.dev/api/modelos-produtos/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-dev-impersonate': 'dev@test.local' },
    body: JSON.stringify({ modelos }),
  });
  console.log('Status', res.status);
  console.log(JSON.stringify(await res.json(), null, 2));
})();