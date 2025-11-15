import { storage } from '../storage';
import bcrypt from 'bcryptjs';

async function createTestUser() {
  try {
    console.log('Criando usuário de teste...');

    const testEmail = 'teste@prieto.com';
    const existingUser = await storage.getUserByEmail(testEmail);

    if (existingUser) {
      console.log('✓ Usuário de teste já existe:', testEmail);
      console.log('  ID:', existingUser.id);
      console.log('  Nome:', existingUser.nome);
      return;
    }

    const hashedPassword = await bcrypt.hash('teste123', 10);

    const user = await storage.createUser({
      nome: 'Usuário Teste',
      email: testEmail,
      password: hashedPassword,
    });

    console.log('✓ Usuário de teste criado com sucesso!');
    console.log('  Email:', user.email);
    console.log('  Senha: teste123');
    console.log('  ID:', user.id);
    console.log('\nEste usuário está agora disponível nas tabelas do Supabase.');
  } catch (error) {
    console.error('✗ Erro ao criar usuário de teste:', error);
    process.exit(1);
  }
}

createTestUser();
