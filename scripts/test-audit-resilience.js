(async function () {
  // Script simples para verificar que falhas no audit_log NÃO retornam erro 400
  // Uso: node scripts/test-audit-resilience.js [ALIMENTO_ID] [BASE_URL]
  // Ex.: node scripts/test-audit-resilience.js 9920 http://localhost:3000

  const id = process.argv[2] || process.env.ALIMENTO_ID || '9920';
  const base = process.argv[3] || process.env.BASE_URL || 'http://localhost:3000';
  const url = `${base.replace(/\/$/, '')}/api/alimentos/${id}`;

  console.log('Teste de resiliência do audit_log para', url);

  const body = { quantidade: Math.floor(Math.random() * 10) + 1 };

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-impersonate': 'dev@test.local',
      },
      body: JSON.stringify(body),
    });

    console.log('Status:', res.status);
    const text = await res.text();
    try {
      console.log('Body:', JSON.parse(text));
    } catch {
      console.log('Body (raw):', text);
    }
  } catch (e) {
    console.error('Erro de fetch:', e);
  }
})();
