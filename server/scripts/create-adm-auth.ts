import { supabaseService } from '../supabaseClient';

async function main() {
  if (!supabaseService) {
    console.error('supabaseService não disponível. Verifique SUPABASE_SERVICE_ROLE_KEY no .env');
    process.exit(1);
  }

  const email = 'adm@dev.local';
  const password = 'adm123';

  try {
    console.log('Tentando criar usuário no Supabase Auth:', email);
    console.log('supabaseService.auth keys:', Object.keys((supabaseService as any).auth || {}));
    console.log('supabaseService.auth.admin exists?', !!((supabaseService as any).auth && (supabaseService as any).auth.admin));

    // admin.createUser pode variar de acordo com a versão do cliente;
    // chamamos e logamos o retorno inteiro para diagnóstico.
    // @ts-ignore
    const adminApi = (supabaseService.auth as any).admin;
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
  } catch (e) {
    console.error('Erro ao criar usuário no Supabase Auth:', e && (e as any).message ? (e as any).message : e);
    process.exit(1);
  }
}

main();
