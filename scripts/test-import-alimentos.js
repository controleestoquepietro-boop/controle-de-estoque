const fetch = require('node-fetch');

(async function(){
  const alimentos = [
    {
      codigoProduto: 'TEST-001',
      nome: 'LINGUICA DE CARNE SUINA CONGELADA',
      unidade: 'kg',
      lote: 'L1',
      dataFabricacao: '2025-01-01',
      dataValidade: '2025-06-01',
      quantidade: 10,
      shelfLife: 120,
      // temperatura ausente intencionalmente
      pesoPorCaixa: 2.5,
      alertasConfig: { contarAPartirFabricacaoDias: 0, avisoQuandoUmTercoValidade: false, popUpNotificacoes: false }
    },
    {
      codigoProduto: 'TEST-002',
      nome: 'MASSA DE LINGUICA TIPO ITALIANA',
      unidade: 'kg',
      lote: 'L2',
      dataFabricacao: '2025-02-01',
      dataValidade: '2025-07-01',
      quantidade: 5,
      shelfLife: 90,
      temperatura: '', // string vazia — deve ser tratada como ausente
      pesoPorCaixa: 1.0,
      alertasConfig: { contarAPartirFabricacaoDias: 0, avisoQuandoUmTercoValidade: false, popUpNotificacoes: false }
    }
  ];

  const res = await fetch('http://127.0.0.1:5000/api/alimentos/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-dev-impersonate': 'dev@test.local' },
    body: JSON.stringify({ alimentos }),
  });

  const body = await res.json();
  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(body, null, 2));
})();