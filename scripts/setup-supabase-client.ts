import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL e SUPABASE_ANON_KEY devem estar configurados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const schema = `
-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  reset_token TEXT,
  reset_token_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de modelos de produtos
CREATE TABLE IF NOT EXISTS modelos_produtos (
  id SERIAL PRIMARY KEY,
  codigo_produto TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  temperatura TEXT NOT NULL,
  shelf_life INTEGER NOT NULL,
  gtin TEXT,
  peso_embalagem REAL,
  peso_por_caixa REAL,
  empresa TEXT,
  peso_liquido REAL,
  tipo_peso TEXT,
  quantidade_por_caixa INTEGER,
  unidade_padrao TEXT NOT NULL DEFAULT 'kg',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de alimentos
CREATE TABLE IF NOT EXISTS alimentos (
  id SERIAL PRIMARY KEY,
  codigo_produto TEXT NOT NULL,
  nome TEXT NOT NULL,
  unidade TEXT NOT NULL,
  lote TEXT NOT NULL,
  data_fabricacao TEXT NOT NULL,
  data_validade TEXT NOT NULL,
  quantidade REAL NOT NULL DEFAULT 0,
  peso_por_caixa REAL,
  temperatura TEXT NOT NULL,
  shelf_life INTEGER NOT NULL,
  data_entrada TEXT NOT NULL,
  data_saida TEXT,
  alertas_config JSONB NOT NULL,
  cadastrado_por VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de auditoria
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  alimento_id INTEGER,
  alimento_codigo TEXT,
  alimento_nome TEXT,
  action TEXT NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL,
  changes JSONB,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);
`;

async function setupDatabase() {
  try {
    console.log('Conectando ao Supabase via cliente JS...');
    
    // Executar cada comando CREATE TABLE separadamente
    const statements = schema.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      if (error) {
        console.error('Erro ao executar:', statement.substring(0, 50) + '...');
        console.error('Erro:', error);
      }
    }
    
    console.log('✅ Setup concluído!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    console.log('\n⚠️ Você precisa criar as tabelas manualmente no Supabase SQL Editor.');
    console.log('\n📋 Use este SQL no Supabase SQL Editor:\n');
    console.log(schema);
  }
}

setupDatabase();
