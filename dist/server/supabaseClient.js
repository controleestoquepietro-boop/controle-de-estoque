"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseService = exports.supabase = void 0;
exports.isSupabaseReachable = isSupabaseReachable;
const supabase_js_1 = require("@supabase/supabase-js");
/**
 * Configuração do Supabase no servidor.
 *
 * Este arquivo é CRÍTICO para produção (Fly.io, Render, etc).
 * Lê variáveis APENAS de process.env (não usa dotenv ou fs).
 *
 * Variáveis necessárias:
 * - SUPABASE_URL: URL do projeto Supabase
 * - SUPABASE_KEY: Anon key (ou service role se anon não disponível)
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (opcional, para admin ops)
 *
 * Em desenvolvimento local, defina essas variáveis no .env.
 * Em produção (Fly.io), configure via `flyctl secrets set`.
 */
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// Log de diagnóstico (não expõe chaves)
console.log("=== CONFIGURAÇÃO SUPABASE ===");
console.log("🔑 SUPABASE_URL:", SUPABASE_URL ? '✓ configurada' : '✗ ausente');
console.log("🔐 SUPABASE_KEY (anon):", SUPABASE_ANON_KEY ? '✓ configurada' : '✗ ausente');
console.log("🧩 SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? '✓ configurada' : '✗ ausente');
// Validação de variáveis críticas para Fly.io
if (process.env.NODE_ENV === 'production') {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ ERRO CRÍTICO EM PRODUÇÃO: Variáveis Supabase incompletas!');
        console.error('   Configure com: flyctl secrets set SUPABASE_URL=... SUPABASE_KEY=... SUPABASE_SERVICE_ROLE_KEY=...');
    }
}
/**
 * Helper: cria client com validação, ou retorna undefined se variáveis ausentes.
 * Supabase v2 lança erro se URL for vazia, então precisamos validar antes.
 */
function createSupabaseClient(url, key, options) {
    if (!url || !key) {
        console.warn('⚠️ Supabase client não criado: URL ou chave ausentes.');
        return undefined;
    }
    try {
        return (0, supabase_js_1.createClient)(url, key, options || {});
    }
    catch (err) {
        console.error('❌ Erro ao criar Supabase client:', err);
        return undefined;
    }
}
/**
 * Cliente Supabase para autenticação (HTTP-only, sem realtime).
 *
 * Desabilitamos:
 * - autoRefreshToken: servidor gerencia sessão via cookies
 * - persistSession: sem localStorage no servidor
 * - detectSessionInUrl: evita WebSocket attempts
 * - realtime: sem conexão WebSocket (pode falhar em firewalls de saída)
 *
 * Retorna undefined se variáveis ausentes.
 * Compatível com: Fly.io, Render, Docker, local.
 */
exports.supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
});
/**
 * Cliente Supabase com service role key para operações administrativas.
 * Fallback para anon key se service role não disponível.
 * Bypass de RLS (Row Level Security).
 * Usar com cuidado — apenas para operações que precisam de acesso total.
 *
 * Retorna undefined se variáveis ausentes.
 */
exports.supabaseService = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
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
});
// Verificação final: avisar se ambos os clients falharam
if (!exports.supabase || !exports.supabaseService) {
    console.error('❌ ERRO CRÍTICO: Nenhum cliente Supabase foi criado.');
    console.error('   Certifique-se de que SUPABASE_URL e SUPABASE_KEY estão definidas.');
    if (process.env.NODE_ENV === 'production') {
        console.error('   Em Fly.io, configure: flyctl secrets set SUPABASE_URL=... SUPABASE_KEY=...');
    }
}
/**
 * Verifica se o Supabase está configurado e alcançável (ping simples).
 * Retorna false se variáveis ausentes ou timeout.
 */
async function isSupabaseReachable(timeoutMs = 2000) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('isSupabaseReachable: variáveis Supabase não configuradas');
        return false;
    }
    if (!exports.supabase) {
        console.warn('isSupabaseReachable: supabase client não inicializado');
        return false;
    }
    const ping = (async () => {
        try {
            // Query simples para testar conexão
            const { data, error } = await exports.supabase
                .from('alimentos')
                .select('id')
                .limit(1)
                .maybeSingle();
            if (error) {
                console.warn('isSupabaseReachable: ping query error:', error.message);
                return false;
            }
            return true;
        }
        catch (e) {
            console.warn('isSupabaseReachable: exception:', e);
            return false;
        }
    })();
    const timeout = new Promise((resolve) => setTimeout(() => {
        console.warn('isSupabaseReachable: timeout após', timeoutMs, 'ms');
        resolve(false);
    }, timeoutMs));
    try {
        return await Promise.race([ping, timeout]);
    }
    catch (e) {
        console.warn('isSupabaseReachable: race exception:', e);
        return false;
    }
}
