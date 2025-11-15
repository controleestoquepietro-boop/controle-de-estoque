const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('=== VERIFICANDO CONFIGURAÇÃO DO SUPABASE ===');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓' : '✗');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✓' : '✗');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    console.log('✅ Conexão com Supabase estabelecida!');
    console.log('Data:', data);
  } catch (error) {
    console.error('❌ Erro ao conectar com Supabase:', error.message);
  }
}

testConnection();