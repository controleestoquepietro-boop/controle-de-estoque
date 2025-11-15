#!/usr/bin/env node

/**
 * Script de teste do fluxo completo
 * Testa: Login → Criar Alimento Completo → Criar Alimento Incompleto (NI)
 */

const http = require('http');

const BASE_URL = 'http://127.0.0.1:5000';
let cookies = '';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'User-Agent': 'TestScript/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      // Capturar cookies
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        cookies = setCookie[0].split(';')[0];
        console.log('  🍪 Cookie recebido:', cookies.substring(0, 20) + '...');
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testFlow() {
  console.log('🧪 INICIANDO TESTES...\n');

  try {
    // 1. LOGIN
    console.log('1️⃣  Fazendo login...');
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'Teste123!'
    });
    console.log('  Status:', loginRes.status);
    console.log('  Resposta:', loginRes.data.message);

    if (loginRes.status !== 200) {
      console.log('  ⚠️  Login falhou. Tentando registrar...');
      const regRes = await request('POST', '/api/auth/register', {
        nome: 'Teste User',
        email: 'test@example.com',
        password: 'Teste123!'
      });
      console.log('  Registro Status:', regRes.status);
      console.log('  Resultado:', regRes.data.message || regRes.data);
    }

    // 2. CRIAR ALIMENTO COMPLETO (deve ser ATIVO)
    console.log('\n2️⃣  Criando alimento COMPLETO (20 dias para vencer)...');
    const today = new Date();
    const expire20Days = new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000);
    const fabricDate = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
    
    const formato = (d) => d.toISOString().split('T')[0];
    
    const food1Res = await request('POST', '/api/alimentos', {
      codigoProduto: 'ALIM-001',
      nome: 'Leite Integral',
      unidade: 'kg',
      lote: 'LOTE-001',
      dataFabricacao: formato(fabricDate),
      dataValidade: formato(expire20Days),
      quantidade: 50,
      temperatura: '4°C',
      shelfLife: 21,
      alertasConfig: {
        contarAPartirFabricacaoDias: 10,
        avisoQuandoUmTercoValidade: true,
        popUpNotificacoes: true
      }
    });
    console.log('  Status:', food1Res.status);
    if (food1Res.status === 200) {
      console.log('  ✅ Alimento criado:', food1Res.data.nome);
      console.log('  ID:', food1Res.data.id);
    } else {
      console.log('  ❌ Erro:', food1Res.data.message || food1Res.data);
    }

    // 3. CRIAR ALIMENTO INCOMPLETO (deve ser NI)
    console.log('\n3️⃣  Criando alimento INCOMPLETO (falta data de validade)...');
    const food2Res = await request('POST', '/api/alimentos', {
      codigoProduto: 'ALIM-002',
      nome: 'Pão Francês',
      unidade: 'kg',
      lote: 'LOTE-002',
      dataFabricacao: formato(fabricDate),
      dataValidade: '', // FALTA DATA DE VALIDADE
      quantidade: 100,
      temperatura: '20°C',
      shelfLife: 0, // FALTA SHELF LIFE
      alertasConfig: {
        contarAPartirFabricacaoDias: 10,
        avisoQuandoUmTercoValidade: true,
        popUpNotificacoes: true
      }
    });
    console.log('  Status:', food2Res.status);
    if (food2Res.status === 200) {
      console.log('  ✅ Alimento criado:', food2Res.data.nome);
      console.log('  ID:', food2Res.data.id);
    } else {
      console.log('  ❌ Erro:', food2Res.data.message || food2Res.data);
    }

    // 4. CRIAR ALIMENTO QUE VENCE BREVE (7 dias)
    console.log('\n4️⃣  Criando alimento que VENCE EM BREVE (7 dias)...');
    const expire7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const food3Res = await request('POST', '/api/alimentos', {
      codigoProduto: 'ALIM-003',
      nome: 'Queijo Mezzano',
      unidade: 'kg',
      lote: 'LOTE-003',
      dataFabricacao: formato(fabricDate),
      dataValidade: formato(expire7Days),
      quantidade: 30,
      temperatura: '5°C',
      shelfLife: 8,
      alertasConfig: {
        contarAPartirFabricacaoDias: 10,
        avisoQuandoUmTercoValidade: true,
        popUpNotificacoes: true
      }
    });
    console.log('  Status:', food3Res.status);
    if (food3Res.status === 200) {
      console.log('  ✅ Alimento criado:', food3Res.data.nome);
      console.log('  ID:', food3Res.data.id);
    } else {
      console.log('  ❌ Erro:', food3Res.data.message || food3Res.data);
    }

    // 5. LISTAR ALIMENTOS
    console.log('\n5️⃣  Listando alimentos...');
    const listRes = await request('GET', '/api/alimentos');
    console.log('  Status:', listRes.status);
    console.log('  Total de alimentos:', Array.isArray(listRes.data) ? listRes.data.length : 'N/A');

    console.log('\n✅ TESTES CONCLUÍDOS!');
    console.log('\n📋 Resumo esperado:');
    console.log('  - ALIM-001 (Leite): Status ATIVO (20 dias)');
    console.log('  - ALIM-002 (Pão): Status NI (falta data)');
    console.log('  - ALIM-003 (Queijo): Status VENCE BREVE (7 dias)');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

testFlow();
