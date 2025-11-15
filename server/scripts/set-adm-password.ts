import { supabaseService } from '../supabaseClient';

async function main() {
  if (!supabaseService) {
    console.error('supabaseService não disponível. Verifique SUPABASE_SERVICE_ROLE_KEY no .env');
    process.exit(1);
  }

  const email = 'adm@dev.local';
  const password = 'adm123';

  try {
    console.log('Procurando usuário no Auth por email:', email);
    // @ts-ignore
    const list = await (supabaseService.auth as any).admin.listUsers();
    const users = list?.data?.users || list?.data || [];

    const found = users.find((u: any) => u.email === email);
    if (!found) {
      console.error('Usuário não encontrado no Auth:', email);
      process.exit(1);
    }

    console.log('Usuário encontrado, id=', found.id, ' — atualizando senha...');
    // @ts-ignore
    const res = await (supabaseService.auth as any).admin.updateUserById(found.id, { password });

    console.log('Resultado da atualização:', JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Erro ao atualizar senha do adm no Auth:', e && (e as any).message ? (e as any).message : e);
    process.exit(1);
  }
}

main();
