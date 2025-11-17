"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabaseClient_1 = require("../supabaseClient");
async function main() {
    if (!supabaseClient_1.supabaseService) {
        console.error('supabaseService não disponível. Verifique SUPABASE_SERVICE_ROLE_KEY no .env');
        process.exit(1);
    }
    const email = 'adm@dev.local';
    const password = 'adm123';
    try {
        console.log('Tentando criar usuário no Supabase Auth:', email);
        console.log('supabaseService.auth keys:', Object.keys(supabaseClient_1.supabaseService.auth || {}));
        console.log('supabaseService.auth.admin exists?', !!(supabaseClient_1.supabaseService.auth && supabaseClient_1.supabaseService.auth.admin));
        // admin.createUser pode variar de acordo com a versão do cliente;
        // chamamos e logamos o retorno inteiro para diagnóstico.
        // @ts-ignore
        const adminApi = supabaseClient_1.supabaseService.auth.admin;
        if (!adminApi || typeof adminApi.createUser !== 'function') {
            console.error('Admin API não disponível no supabaseService.auth. Versão do cliente pode não expor admin.createUser.');
            process.exit(1);
        }
        const result = await adminApi.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { nome: 'adm' },
        });
        console.log('Resultado da criação no Auth:', JSON.stringify(result, null, 2));
        process.exit(0);
    }
    catch (e) {
        console.error('Erro ao criar usuário no Supabase Auth:', e && e.message ? e.message : e);
        process.exit(1);
    }
}
main();
