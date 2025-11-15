import { Pool } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL não está configurada');
  process.exit(1);
}

const pool = new Pool({ connectionString });

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
    console.log('Conectando ao Supabase...');
    await pool.query(schema);
    console.log('✅ Tabelas criadas com sucesso no Supabase!');
    
    // Verificar tabelas criadas
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Tabelas no banco:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
