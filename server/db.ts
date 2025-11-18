// Reference: javascript_database blueprint
import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "../shared/schema";

// ⚠️ CRÍTICO: Desabilitar WebSocket
// No Render, WebSocket é bloqueado por firewall de saída.
// Usar apenas HTTP/HTTPS para conexões com Neon.
neonConfig.webSocketConstructor = undefined;

// Aceita certificados auto-assinados/expirados em dev
// Em ambientes de desenvolvimento/empacotado podemos aceitar certificados auto-assinados.
(neonConfig as any).pipelineTLS = { rejectUnauthorized: false } as any;

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ SUPABASE_DB_URL or DATABASE_URL not configured');
  console.error('DATABASE_URL:', process.env.DATABASE_URL ? '✓' : '✗');
  console.error('SUPABASE_DB_URL:', process.env.SUPABASE_DB_URL ? '✓' : '✗');
  throw new Error('SUPABASE_DB_URL or DATABASE_URL must be set');
}

console.log('📍 Conectando ao banco de dados via Neon...');
console.log('📍 Connection string configurado:', connectionString ? '✓' : '✗');

// Criar pool com tratamento de erro
let pool: Pool;
try {
  pool = new Pool({ connectionString });
  console.log('✅ Pool de conexão Neon criado com sucesso');
} catch (e) {
  console.error('❌ Falha ao criar pool Neon:', e);
  throw e;
}

export const db = drizzle({ client: pool, schema });
