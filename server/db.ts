// Reference: javascript_database blueprint
import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

// Use native pg pooling - supports both direct and pooled connections
// This avoids WebSocket issues on Render which blocks outbound connections

let connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

// Keep port 5432 (TCP direct connection is fine for pg library)
// Pooling is handled by pg's native pool, not Supabase pooler
console.log('📍 Using TCP connection (port 5432) - pooling handled by pg library...');

if (!connectionString) {
  console.error('❌ SUPABASE_DB_URL or DATABASE_URL not configured');
  console.error('DATABASE_URL:', process.env.DATABASE_URL ? '✓' : '✗');
  console.error('SUPABASE_DB_URL:', process.env.SUPABASE_DB_URL ? '✓' : '✗');
  throw new Error('SUPABASE_DB_URL or DATABASE_URL must be set');
}

console.log('📍 Conectando ao banco de dados via TCP Pool (pg)...');
console.log('📍 Connection string configurado:', connectionString ? '✓' : '✗');

// Create native pg pool - doesn't use WebSocket
const pool = new Pool({
  connectionString: connectionString,
  // Pool configuration to handle serverless environments
  max: 1,  // Render/serverless doesn't support many concurrent connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('❌ Erro na pool PostgreSQL:', err);
});

// Drizzle ORM with pg pool
export const db = drizzle(pool, { schema });

console.log('✅ Cliente PostgreSQL (pg pool) inicializado com sucesso');
