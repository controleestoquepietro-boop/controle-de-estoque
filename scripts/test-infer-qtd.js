// Script simples para testar heurística de inferir QTD como caixas
// Executar: node scripts/test-infer-qtd.js

const samples = [
  { row: { 'QTD': 265, 'QTD KG': 2120 }, expect: { quantidade: 265, unidade: 'caixa', pesoPorCaixa: 8 } },
  { row: { 'QTD': 17, 'QTD KG': 170 }, expect: { quantidade: 17, unidade: 'caixa', pesoPorCaixa: 10 } },
  { row: { 'QTD': 3, 'QTD KG': 18 }, expect: { quantidade: 3, unidade: 'caixa', pesoPorCaixa: 6 } },
  { row: { 'QTD': 100, 'QTD KG': 10 }, expect: { quantidade: 10, unidade: 'kg' } },
  { row: { 'QTD KG': 120 }, expect: { quantidade: 120, unidade: 'kg' } },
];

function toNumber(v){ if (v===undefined||v===null||String(v).trim()==='') return undefined; const s=String(v).replace(/\./g,'').replace(',','.'); const n=Number(s); return Number.isFinite(n)?n:undefined }

samples.forEach((samp, i)=>{
  const qtdRaw = toNumber(samp.row['QTD']);
  const qtdKg = toNumber(samp.row['QTD KG']);
  let pesoPorCaixa = undefined;
  let quantidade=0;
  let unidade='kg';

  if (qtdRaw !== undefined && qtdKg !== undefined) {
    const inferred = qtdKg / qtdRaw;
    if (inferred >= 0.2 && inferred <= 50) {
      quantidade = qtdRaw; unidade='caixa'; pesoPorCaixa = Math.round(inferred*1000)/1000;
    } else {
      quantidade = qtdKg; unidade='kg';
    }
  } else if (qtdKg !== undefined) { quantidade = qtdKg; unidade='kg'; }
  else if (qtdRaw !== undefined) { quantidade = qtdRaw; unidade='caixa'; }

  console.log(`Sample ${i+1}: row=${JSON.stringify(samp.row)} => quantidade=${quantidade} unidade=${unidade} pesoPorCaixa=${pesoPorCaixa} (expected ${JSON.stringify(samp.expect)})`);
});
