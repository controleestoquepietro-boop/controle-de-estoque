#!/usr/bin/env ts-node
import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:5000';
let cookie = '';

async function register() {
  console.log('📝 Registrando usuário...');
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      nome: 'Teste User',
      email: 'test@example.com',
      password: 'Teste123!'
    })
  });
  
  // Pegar cookie da resposta
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  
  const data = await res.json();
  console.log('Resultado:', data);
  return data;
}

async function login() {
  console.log('\n🔐 Fazendo login...');
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'Teste123!'
    })
  });
  
  // Pegar cookie da resposta
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  
  const data = await res.json();
  console.log('Resultado:', data);
  console.log('Cookie:', cookie);
  return data;
}

async function createFood() {
  console.log('\n🍔 Criando alimento...');
  const res = await fetch(`${BASE_URL}/api/alimentos`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Cookie': cookie 
    },
    body: JSON.stringify({
      codigoProduto: 'TEST001',
      nome: 'Alimento de Teste',
      unidade: 'kg',
      lote: 'LOTE-TEST',
      dataFabricacao: '2025-11-01',
      dataValidade: '2025-11-15',
      quantidade: 10,
      temperatura: '25C',
      shelfLife: 14,
      alertasConfig: {
        contarAPartirFabricacaoDias: 10,
        avisoQuandoUmTercoValidade: true,
        popUpNotificacoes: true
      }
    })
  });
  
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Resultado:', data);
  return data;
}

async function main() {
  try {
    // await register();
    await login();
    await createFood();
  } catch (e) {
    console.error('Erro:', e);
  }
}

main();
