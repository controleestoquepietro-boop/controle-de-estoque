import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Tenta carregar .env de diferentes locais
const envPaths = [
  '.env',
  'dist/.env',
  path.join(__dirname, '.env'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('Carregado .env de:', envPath);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️ Nenhum arquivo .env encontrado!');
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

// --- Log de verificação ---
console.log("=== CONFIGURAÇÃO SUPABASE ===");
console.log("🔑 Supabase URL:", SUPABASE_URL ? '✓' : '✗');
console.log("🧩 Service Role Key:", !!process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
console.log("🔐 Anon Key:", !!process.env.SUPABASE_KEY ? '✓' : '✗');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Não lançar erro em tempo de import para não quebrar ambientes de leitura
  // simples — vamos logar e deixar rotas lidarem com a falta de config.
  // eslint-disable-next-line no-console
  console.warn('Supabase client: variáveis SUPABASE_URL ou SUPABASE_KEY não configuradas. Algumas funcionalidades podem ficar indisponíveis.');
}

// Criar cliente Supabase. No servidor não precisamos do realtime (websockets),
// que pode gerar erros quando a conexão não estiver disponível.
// IMPORTANTE: desativar websocket (realtime.connect: false) e persistência
// de sessão para evitar erro "non-101 status code" em ambientes com firewall
// de saída (ex: Render). O servidor gerencia sessão via cookies Express.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/server',
    },
  },
} as any);

// Cliente separado utilizando explicitamente a service role key quando disponível.
// Usamos esse cliente para operações administrativas que precisam ignorar RLS.
export const supabaseService = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/server-admin',
    },
  },
} as any);

// Checa rapidamente se o Supabase está alcançável fazendo uma query simples
// com timeout. Retorna `true` se a requisição responder dentro do tempo.
export async function isSupabaseReachable(timeoutMs = 2000): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;

  // Promise que faz uma requisição simples ao supabase (select limitado).
  const ping = (async () => {
    try {
      const { data, error } = await supabase.from('alimentos').select('id').limit(1).maybeSingle();
      if (error) return false;
      return true;
    } catch (e) {
      return false;
    }
  })();

  // Timeout
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));

  try {
    return await Promise.race([ping, timeout]);
  } catch (e) {
    return false;
  }
}
