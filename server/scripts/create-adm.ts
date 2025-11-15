import { supabaseService } from '../supabaseClient';

async function main() {
  if (!supabaseService) {
    console.error('supabaseService não disponível. Verifique SUPABASE_SERVICE_ROLE_KEY no .env');
    process.exit(1);
  }

  const payload = {
    id: 'adm',
    nome: 'adm',
    email: 'adm@dev.local',
    criado_em: new Date().toISOString(),
    color: 'hsl(200 70% 40%)',
  };

  try {
    console.log('Tentando upsert do usuário adm na tabela users (Supabase) ...');
    const { data, error } = await supabaseService
      .from('users')
      .upsert([payload], { onConflict: 'email' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Falha ao upsert usuário adm:', error);
      process.exit(1);
    }

    console.log('Usuário adm criado/atualizado com sucesso:', data);
    process.exit(0);
  } catch (e) {
    console.error('Erro inesperado ao criar adm:', e);
    process.exit(1);
  }
}

main();
