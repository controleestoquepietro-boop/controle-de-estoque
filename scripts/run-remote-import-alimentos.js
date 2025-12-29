const fetch = require('node-fetch');

(async function(){
  const url = process.argv[2] || 'https://cxpt-core.fly.dev/api/alimentos/import';
  const alimentos = [
    {
      codigoProduto: 'TEST-REMOTE-001',
      nome: 'LINGUICA REMOTA SEM TEMPERATURA',
      unidade: 'kg',
      lote: 'L1',
      dataFabricacao: '2025-01-01',
      dataValidade: '2025-06-01',
      quantidade: 10,
      shelfLife: 120,
      // temperatura ausente intencional
      pesoPorCaixa: 2.5,
      alertasConfig: { contarAPartirFabricacaoDias: 0, avisoQuandoUmTercoValidade: false, popUpNotificacoes: false }
    }
  ];

  console.log('Posting to', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-dev-impersonate': 'dev@test.local' },
    body: JSON.stringify({ alimentos }),
  });

  console.log('Status:', res.status);
  const body = await res.json();
  console.log('Response body:', JSON.stringify(body, null, 2));
})();