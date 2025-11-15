(async () => {
  const base = 'http://127.0.0.1:5000';
  const accounts = [
    { label: 'Conta A', email: 'sammuaraujo200@gmail.com', password: '1234567890' },
    { label: 'Conta B', email: 'obrabo20026@gmail.com', password: '1234567890' }
  ];

  for (const acc of accounts) {
    console.log('\n=== Testando', acc.label, acc.email, '===');
    try {
      const res = await fetch(base + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: acc.email, password: acc.password }),
        // keep redirects default
      });
      console.log('login status:', res.status);
      const setCookie = res.headers.get('set-cookie');
      console.log('raw set-cookie header:', setCookie);

      // Construir header Cookie a partir de todos os cookies retornados
      let cookieHeader = null;
      if (setCookie) {
        // set-cookie pode conter múltiplos cookies concatenados. Tentamos separar por ", "
        // e pegar o par nome=valor antes do ponto-e-vírgula de cada um.
        const parts = setCookie.split(/, (?=[^ ]+?=)/g);
        const cookies = parts.map(p => (p.split(';')[0] || '').trim()).filter(Boolean);
        cookieHeader = cookies.join('; ');
        console.log('constructed Cookie header:', cookieHeader);
      }

      if (!cookieHeader) {
        console.log('Nenhum cookie recebido — login provavelmente falhou');
        const txt = await res.text();
        console.log('body:', txt);
        continue;
      }

      // GET /api/auth/me
  const me = await fetch(base + '/api/auth/me', { method: 'GET', headers: { Cookie: cookieHeader } });
      console.log('/api/auth/me status:', me.status);
      try { console.log('me json:', await me.json()); } catch (e) { console.log('me text:', await me.text()); }

      // GET /api/alimentos
  const al = await fetch(base + '/api/alimentos', { method: 'GET', headers: { Cookie: cookieHeader } });
      console.log('/api/alimentos status:', al.status);
      try { const j = await al.json(); console.log('/api/alimentos length:', Array.isArray(j) ? j.length : 'not-array'); } catch (e) { console.log('alimentos text:', await al.text()); }

    } catch (err) {
      console.error('Erro ao testar', acc.label, err && err.message ? err.message : err);
    }
  }
})();
