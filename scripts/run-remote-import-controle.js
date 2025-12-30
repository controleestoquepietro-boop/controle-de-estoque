const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

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

function getCellValue(row, aliases) {
  const normalizedAliases = aliases.map(a=>normalizeKey(a));
  for (const k of Object.keys(row)){
    try{
      const nk = normalizeKey(k);
      const val = row[k];
      if (val===null||val===undefined||(typeof val==='string'&&val.trim()==='')) continue;
      for (const a of normalizedAliases) if (nk.includes(a) || a.includes(nk)) return val;
    }catch(e){continue}
  }
  return undefined;
}

(async function main(){
  const file = process.argv[2] || 'C:/Users/sammu/OneDrive/Área de Trabalho/Projetos/Controle FIFO_Versão final.xlsx';
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) { console.error('File not found', filePath); process.exit(2);} 

  console.log('Reading file:', filePath);
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const ws = workbook.Sheets['Controle'];
  if (!ws) { console.error('Sheet Controle not found'); process.exit(2); }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  // find header
  const expected = ['codigo','cod','nome','descricao','fabricacao','validade','qtd kg','qtd cx','qtd','shelf','shelf life'];
  let headerIndex=-1;
  const normalize = s => s===null||s===undefined? '': String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]/g,'');
  const normalizedExpected = expected.map(e=>normalize(e));
  for (let i=0;i<Math.min(rows.length,20);i++){
    const row = rows[i]||[];
    const found = row.some(c=>{ if (c===null||c===undefined) return false; const v=normalize(c); return normalizedExpected.some(h=> v.includes(h) || h.includes(v)); });
    if (found) { headerIndex=i; const headers = (rows[headerIndex]||[]).map(h => h===null||h===undefined? '': String(h).trim()); const nonEmpty = headers.reduce((a,h)=>a+(h!==''?1:0),0); if (nonEmpty<2) { headerIndex=-1; continue; } break; }
  }
  if (headerIndex === -1) {
    for (let i=0;i<Math.min(rows.length,20);i++){ const row=rows[i]||[]; const nonEmpty=row.reduce((acc,cell)=> acc+(cell!==null&&cell!==undefined&&String(cell).trim()!==''?1:0),0); if (nonEmpty>=2) { headerIndex=i; break; }}
  }
  if (headerIndex < 0) { console.error('Header not found'); process.exit(2);} 

  const headers = rows[headerIndex].map(h => h===null||h===undefined? '': String(h).trim());
  const dataRows = [];
  for (let r=headerIndex+1;r<rows.length;r++){ const row = rows[r]; if (!row || row.every(c=> c===null||c===undefined||String(c).trim()==='')) continue; const obj = {}; for (let c=0;c<headers.length;c++) { obj[headers[c]||`col_${c}`] = row[c] !== undefined ? row[c] : null; } dataRows.push(obj); }

  console.log('Found headerIndex=', headerIndex, 'headers=', headers);
  console.log('Data rows to import sample:', dataRows.slice(0,5));

  // Map to InsertAlimento like client
  const processed = [];
  dataRows.forEach((row, idx)=>{
    const mapped = {};
    // basic fields
    mapped.codigoProduto = getCellValue(row, ['cod','codigo','codigo produto','codigoProduto']);
    mapped.nome = getCellValue(row, ['descricao','nome','descricao do item']);
    mapped.lote = getCellValue(row, ['lote']) || 'LOTE-01';
    mapped.dataFabricacao = parseAnyDate(getCellValue(row, ['fabricacao','data fabricacao','fabrica'])) || new Date().toISOString().split('T')[0];
    mapped.shelfLife = Number(getCellValue(row, ['shelf life','shelf','prazo'])) || Number(getCellValue(row, ['SHELF LIFE','SHELF'])) || 365;

    // quantidade: consider QTD KG and QTD CX
    const pesoPorCaixa = getCellValue(row, ['peso por caixa','peso caixa','peso_unitario','peso unitario','peso'])
    const qtdKgRaw = getCellValue(row, ['qtd kg','qtdkg','qtd_kg','qtd_kg']);
    const qtdCxRaw = getCellValue(row, ['qtd cx','qtdcx','qtd_cx']);
    const qtdRaw = getCellValue(row, ['qtd','quantidade','qtd lotes','Qtd. Cx']);
    const toNumber = v=>{ if (v===undefined||v===null||String(v).trim()==='') return undefined; const s=String(v).replace(/\./g,'').replace(',','.'); const n=Number(s); return Number.isFinite(n)?n:undefined };
    const qtdKg = toNumber(qtdKgRaw) ?? toNumber(qtdRaw);
    const qtdCx = toNumber(qtdCxRaw);
    const pesoNum = toNumber(pesoPorCaixa);
    let quantidade = 0;
    // Preferir QTD CX (caixas) quando presente — esse arquivo usa QTD CX
    if (qtdCx !== undefined) {
      quantidade = qtdCx;
    } else if (qtdKg !== undefined) {
      quantidade = qtdKg;
    } else if (qtdRaw !== undefined) {
      quantidade = toNumber(qtdRaw);
    }

    mapped.quantidade = quantidade;
    mapped.pesoPorCaixa = pesoNum;

    // unidade
    mapped.unidade = 'kg';
    if (String(getCellValue(row, ['Unidade','unidade']) || 'kg').toLowerCase().includes('cx')) mapped.unidade = 'caixa';
    // Se existe QTD CX e não há pesoPorCaixa definido, então assumimos que a quantidade encontrada é em caixas
    if (qtdCx !== undefined && pesoNum === undefined) {
      mapped.unidade = 'caixa';
    }

    // Debug
    console.log(`ImportScript: row=${headerIndex + 2 + idx} qtdKg=${qtdKg} qtdCx=${qtdCx} pesoPorCaixa=${pesoNum} -> quantidade=${mapped.quantidade} unidade=${mapped.unidade} dataFab=${mapped.dataFabricacao} dataVal=${mapped.dataValidade}`);

    mapped.dataValidade = parseAnyDate(getCellValue(row, ['validade','data validade'])) || (mapped.dataFabricacao ? (()=>{ const d = new Date(mapped.dataFabricacao); d.setDate(d.getDate()+Number(mapped.shelfLife||365)); return d.toISOString().split('T')[0]; })() : undefined);

    mapped.temperatura = String(getCellValue(row, ['temperatura','temp','armazenamento']) || 'N/D');

    if (mapped.codigoProduto && mapped.nome) {
      processed.push({
        codigoProduto: String(mapped.codigoProduto).trim(),
        nome: String(mapped.nome).trim(),
        unidade: mapped.unidade,
        lote: mapped.lote,
        dataFabricacao: mapped.dataFabricacao,
        dataValidade: mapped.dataValidade,
        quantidade: mapped.quantidade || 0,
        pesoPorCaixa: mapped.pesoPorCaixa,
        temperatura: mapped.temperatura,
        shelfLife: Number(mapped.shelfLife) || 365,
        alertasConfig: { contarAPartirFabricacaoDias: 0, avisoQuandoUmTercoValidade: false, popUpNotificacoes: false },
        _rowIndex: headerIndex + 2 + idx,
      });
    }
  });

  console.log('Prepared to import count:', processed.length);
  console.log('Sample:', processed.slice(0,5));

  // send only first 10 as test
  const toSend = processed.slice(0,10);
  if (toSend.length === 0) { console.error('No items to import'); process.exit(2); }

  console.log('Sending', toSend.length, 'items to production import endpoint');
  const res = await fetch('https://cxpt-core.fly.dev/api/alimentos/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-dev-impersonate': 'dev@test.local' },
    body: JSON.stringify({ alimentos: toSend }),
  });

  console.log('Status:', res.status);
  const body = await res.json();
  console.log('Response:', JSON.stringify(body, null, 2));
})();