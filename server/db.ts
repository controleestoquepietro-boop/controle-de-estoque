// Reference: javascript_database blueprint
import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "../shared/schema";

// ⚠️ IMPORTANTE: WebSocket causava erro 401 com Supabase
// Desabilitar WebSocket força o uso de HTTP (mais estável e seguro)
// neonConfig.webSocketConstructor = ws;

// Aceita certificados auto-assinados/expirados em dev/empacotado
// Em alguns ambientes (desenvolvimento/empacotado) precisamos aceitar
// certificados auto-assinados; a tipagem exposta pela biblioteca pode
// esperar um booleano — fazemos um cast para 'any' para manter o
// comportamento desejado sem quebrar a tipagem.
(neonConfig as any).pipelineTLS = { rejectUnauthorized: false } as any;

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DB_URL or DATABASE_URL must be set. Did you forget to configure Supabase?",
  );
}

// Opcionalmente usa um pool local se a conexão remota falhar
let pool;
try {
  pool = new Pool({ connectionString });
} catch (e) {
  console.error('[db] Falha na conexão remota:', e);
  pool = new Pool({ connectionString: 'sqlite::memory:' }); // fallback local
}

export const db = drizzle({ client: pool, schema });
