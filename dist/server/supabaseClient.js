"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseService = exports.supabase = void 0;
exports.isSupabaseReachable = isSupabaseReachable;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Tenta carregar .env de diferentes locais
const envPaths = [
    '.env',
    'dist/.env',
    path_1.default.join(__dirname, '.env'),
    path_1.default.join(__dirname, '../.env'),
    path_1.default.join(__dirname, '../../.env'),
    path_1.default.join(__dirname, '../../../.env')
];
let envLoaded = false;
for (const envPath of envPaths) {
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath });
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
exports.supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_KEY);
// Cliente separado utilizando explicitamente a service role key quando disponível.
// Usamos esse cliente para operações administrativas que precisam ignorar RLS.
exports.supabaseService = (0, supabase_js_1.createClient)(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY);
// Checa rapidamente se o Supabase está alcançável fazendo uma query simples
// com timeout. Retorna `true` se a requisição responder dentro do tempo.
async function isSupabaseReachable(timeoutMs = 2000) {
    if (!SUPABASE_URL || !SUPABASE_KEY)
        return false;
    // Promise que faz uma requisição simples ao supabase (select limitado).
    const ping = (async () => {
        try {
            const { data, error } = await exports.supabase.from('alimentos').select('id').limit(1).maybeSingle();
            if (error)
                return false;
            return true;
        }
        catch (e) {
            return false;
        }
    })();
    // Timeout
    const timeout = new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs));
    try {
        return await Promise.race([ping, timeout]);
    }
    catch (e) {
        return false;
    }
}
