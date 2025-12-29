const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function normalizeKey(s) {
  if (s === null || s === undefined) return '';
  return String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]/g, '');
}

function parseAnyDate(v) {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return undefined;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().split('T')[0];
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let dd = m[1].padStart(2,'0');
    let mm = m[2].padStart(2,'0');
    let yyyy = m[3]; if (yyyy.length===2) yyyy = '20'+yyyy;
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return undefined;
}

function parseWorksheetToJson(worksheet, expectedKeys) {
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  let headerIndex = -1;
  const normalize = (s) => s===null||s===undefined? '': String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]/g,'');
  const normalizedExpected = expectedKeys.map(k=>normalize(k));

  for (let i=0;i<Math.min(rows.length,20);i++){
    const row = rows[i]||[];
    const found = row.some(c=>{ if (c===null||c===undefined) return false; const v=normalize(c); return normalizedExpected.some(h => v.includes(h) || h.includes(v));});
    if (found) { headerIndex = i; 
      const maybeHeaders = (rows[headerIndex] || []).map(h => (h===null||h===undefined)?'':String(h).trim());
      const nonEmptyCountHeader = maybeHeaders.reduce((acc,h)=> acc+(h!==''?1:0),0);
      if (nonEmptyCountHeader < 2) { headerIndex = -1; continue; }
      break; }
  }
  if (headerIndex === -1) {
    for (let i=0;i<Math.min(rows.length,20);i++){
      const row = rows[i]||[]; const nonEmpty = row.reduce((acc,cell)=> acc + (cell!==null && cell!==undefined && String(cell).trim()!==''?1:0),0);
      if (nonEmpty >=2) { headerIndex = i; break; }
    }
  }

  if (headerIndex >= 0) {
    const headers = rows[headerIndex].map(h=> h===null||h===undefined? '': String(h).trim());
    const out = [];
    for (let r=headerIndex+1;r<rows.length;r++){
      const row = rows[r]; if (!row || row.every(c=> c===null||c===undefined||String(c).trim()==='')) continue;
      const obj = {};
      for (let c=0;c<headers.length;c++) obj[headers[c]||`col_${c}`] = row[c] !== undefined? row[c] : null;
      out.push(obj);
    }
    return { jsonData: out, headerIndex, headers };
  }
  return { jsonData: XLSX.utils.sheet_to_json(worksheet, { defval: null }), headerIndex:-1, headers:[] };
}

function getCellValue(row, aliases) {
  const normalizedAliases = aliases.map(a=>normalizeKey(a));
  for (const k of Object.keys(row)){
    try {
      const nk = normalizeKey(k);
      const val = row[k];
      if (val===null||val===undefined||(typeof val==='string'&&val.trim()==='')) continue;
      for (const a of normalizedAliases) {
        if (nk.includes(a) || a.includes(nk)) return val;
      }
    } catch(e) { continue; }
  }
  return undefined;
}

(async function main(){
  const file = process.argv[2] || 'C:/Users/sammu/OneDrive/Área de Trabalho/Projetos/Controle FIFO_Versão final.xlsx';
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) { console.error('File not found:', filePath); process.exit(2); }

  console.log('Reading file:', filePath);
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  console.log('Sheets:', workbook.SheetNames);

  for (const sheetName of workbook.SheetNames) {
    console.log('\n--- Sheet:', sheetName, '---');
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    for (let i=0;i<10 && i<rows.length;i++) console.log('Row',i,':',rows[i]);

    const expectedHeaders = ['codigo','cod','codigo produto','nome','descricao','data fabricacao','data validade','quantidade','qtd kg','qtd cx','shelf life','shelf'];
    const { jsonData, headerIndex, headers } = parseWorksheetToJson(ws, expectedHeaders);
    console.log('detected headerIndex=', headerIndex, 'headers=', headers);
    console.log('parsed rows count:', jsonData.length);

    const validationErrors = [];
    const processed = [];
    jsonData.forEach((row, idx)=>{
      const mapped = {};
      // basic mapping like client
      mapped.codigoProduto = getCellValue(row, ['codigo','cod','codigo produto','codigoProduto','z06_cod']);
      mapped.nome = getCellValue(row, ['nome','descricao','descricao do item','z06_desc']);
      mapped.dataFabricacao = getCellValue(row, ['data fabricacao','fabricacao']);
      mapped.dataValidade = getCellValue(row, ['data validade','validade']);
      mapped.quantidade = getCellValue(row, ['quantidade','qtd','qtd kg','qtdkg']);
      mapped.qtdCx = getCellValue(row, ['qtd cx','qtdcx']);
      mapped.pesoPorCaixa = getCellValue(row, ['peso por caixa','peso_por_caixa','pesoUnitario','peso unitario','peso']);

      const codigo = mapped.codigoProduto? String(mapped.codigoProduto).trim() : '';
      const nome = mapped.nome? String(mapped.nome).trim() : '';
      if (!codigo || !nome) validationErrors.push(`Linha ${idx + (headerIndex>=0? headerIndex+2 : 2)}: Faltam campos obrigatórios (Código ou Nome)`);
      else processed.push({ codigo, nome, _rowIndex: idx + (headerIndex>=0? headerIndex+2 : 2) });
    });

    console.log('Processed sample:', processed.slice(0,10));
    console.log('Validation errors sample (first 10):', validationErrors.slice(0,10));
    console.log('Total validation errors:', validationErrors.length);
  }
})();