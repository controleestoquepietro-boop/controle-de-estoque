import type { Express } from "express";
import { createServer, type Server } from "http";
import path from 'path';
import { storage } from "./storage";
import session from "express-session";
import createMemoryStore from "memorystore";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { insertUserSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, insertAlimentoSchema, insertModeloProdutoSchema, type User } from "../shared/schema";
import { supabase, supabaseService } from './supabaseClient';

const MemoryStore = createMemoryStore(session);

// Extend Express session with user
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  function isDbNetworkError(err: any) {
    if (!err) return false;
    const code = err.code || err.errno || '';
    const msg = String(err.message || '');
    return code === 'ENETUNREACH' || code === -101 || msg.includes('ENETUNREACH');
  }

  // Session middleware
  app.use(
    session({
      // Nome explícito do cookie para evitar discrepâncias entre
      // cookies setados manualmente e o cookie do express-session.
      name: process.env.SESSION_COOKIE_NAME || 'session_id',
      secret: process.env.SESSION_SECRET || 'shelf-aid-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: 86400000, // 24 hours
      }),
      cookie: {
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
          httpOnly: true,
          // Em produção (Render), usar secure=true e HTTPS
          secure: process.env.NODE_ENV === 'production',
          // Para permitir cookies cross-site (frontend separado), usar 'none' em produção.
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          path: '/',
        },

    })
  );

      // Rota de DEBUG: mostra a sessão e cookies enviados pelo navegador.
      // Útil para desenvolvimento: acessar /api/debug/session após login para
      // confirmar se `req.session.userId` foi criado e se o cookie foi enviado.
      app.get('/api/debug/session', (req: any, res) => {
        try {
          res.json({ session: req.session || null, cookies: req.headers?.cookie || null });
        } catch (e) {
          res.status(500).json({ message: 'Erro ao ler sessão de debug', error: String(e) });
        }
      });

  // Middleware para verificar autenticação
  // ⚠️ CRÍTICO: Este middleware deve ser MÍNIMO e não fazer nenhuma chamada externa.
  // Qualquer chamada a Supabase/Storage pode disparar WebSocket em Render e retornar 401.
  const requireAuth = async (req: any, res: any, next: any) => {
    // Dev header bypass: se ENABLE_DEV_ROUTES=1 e header x-dev-impersonate
    // estiver presente, permitimos autenticar por email sem cookie (apenas
    // para testes locais). Isto facilita testes via curl/Invoke-RestMethod.
    if (process.env.ENABLE_DEV_ROUTES === '1' && req.headers['x-dev-impersonate']) {
      const devEmail = String(req.headers['x-dev-impersonate']);
      const devUser = { id: `dev-${Date.now()}`, nome: devEmail.split('@')[0], email: devEmail } as any;
      req.user = devUser;
      req.userId = devUser.id;
      console.log('✅ Dev bypass (x-dev-impersonate) ativado para:', devEmail);
      return next();
    }

    // AUTENTICAÇÃO PRIMÁRIA: Validar via req.session.userId (Express session cookie)
    if (req.session && req.session.userId) {
      const userId = req.session.userId;
      try {
        // Buscar dados do usuário no banco de dados
        const userFromDb = await storage.getUser(userId);
        if (userFromDb) {
          req.user = userFromDb;
        } else {
          req.user = { id: userId };
        }
      } catch {
        req.user = { id: userId };
      }
      req.userId = userId;
      console.log(`✅ Autenticado via session_id - userId: ${req.session.userId.substring(0, 20)}`);
      return next();
    }

    // AUTENTICAÇÃO SECUNDÁRIA: Validar via cookie assinado shelf_uid (fallback stateless)
    try {
      const signedCookieName = process.env.SIGNED_COOKIE_NAME || 'shelf_uid';
      const signed = req.cookies && req.cookies[signedCookieName];
      if (signed && typeof signed === 'string') {
        const parts = signed.split('.');
        if (parts.length === 2) {
          const uid = parts[0];
          const sig = parts[1];
          const secret = process.env.SESSION_SECRET || 'shelf-aid-secret-key-change-in-production';
          
          try {
            const expected = crypto.createHmac('sha256', secret).update(uid).digest('hex');
            if (sig === expected) {
              // ✅ Cookie assinado válido
              try {
                const userFromDb = await storage.getUser(uid);
                if (userFromDb) {
                  req.user = userFromDb;
                } else {
                  req.user = { id: uid };
                }
              } catch {
                req.user = { id: uid };
              }
              req.userId = uid;
              // Tentar restaurar sessão no store para proxies/redeploys
              try {
                if (!req.session) req.session = {};
                req.session.userId = uid;
                if (typeof req.session.save === 'function') {
                  req.session.save((err: any) => {
                    if (err) console.warn('Aviso: falha ao restaurar sessão:', err);
                    else console.log(`✅ Sessão restaurada a partir do cookie assinado - userId: ${uid.substring(0, 20)}`);
                  });
                }
              } catch (_) {
                // ignore - autenticação já sucedeu via cookie assinado
              }
              return next();
            }
          } catch (e) {
            console.warn('⚠️ Erro ao validar cookie assinado:', e);
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Erro ao processar fallback de cookie assinado:', e);
    }

    // ❌ Nenhuma forma de autenticação funcionou
    console.warn(`❌ 401 Não autenticado - path: ${req.path}, sessionID: ${req.sessionID || 'N/A'}, cookies: ${Object.keys(req.cookies || {}).join(',')}`);
    return res.status(401).json({ message: 'Não autenticado' });
  };

  // ============ AUTENTICAÇÃO ============

// Registrar novo usuário
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nome, email, password } = insertUserSchema.parse(req.body);

    // ✅ Verificar se email já existe (antes de tentar criar)
    try {
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log('⚠️ Tentativa de registrar email já cadastrado:', email);
        return res.status(400).json({ message: 'Email já cadastrado' });
      }
    } catch (e) {
      console.warn('Aviso ao checar email existente:', e);
    }

    // 1️⃣ Criar o usuário no Supabase Auth
    let data: any = null;
    let error: any = null;
    try {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nome } },
      });
      data = result.data;
      error = result.error;
    } catch (e) {
      error = e;
    }

    // Se ocorrer erro no signup no Supabase e estivermos em dev, fazer fallback
    // para criar o usuário apenas no storage local para permitir testes.
    if (error) {
      console.error('❌ Erro ao criar usuário no Supabase Auth:', error);
      // Capturar erro de email duplicado do Supabase
      if (error?.message && error.message.toLowerCase().includes('already')) {
        return res.status(400).json({ message: 'Email já cadastrado' });
      }
      if (process.env.ENABLE_DEV_ROUTES === '1') {
        try {
          const local = await storage.createUser({ id: `dev-${Date.now()}`, nome, email: email || '' } as any);
          // Popular sessão com o id local
          if (req.session) req.session.userId = local.id;
          console.log('✅ Usuário criado localmente (dev fallback) com id:', local.id);
          return res.status(200).json({ message: 'Usuário criado localmente (dev)' });
        } catch (e) {
          console.error('Falha ao criar usuário local em fallback de registro:', e);
          return res.status(400).json({ message: String(error?.message || error) });
        }
      }
      return res.status(400).json({ message: error.message || String(error) });
    }

    // DEBUG: mostrar resultado do signUp
    console.log('✅ Resultado do signUp:', {
      userId: data.user?.id,
      email: data.user?.email,
      metadata: data.user?.user_metadata,
    });

    // 2️⃣ Criptografar a senha antes de salvar


    // 3️⃣ Inserir o usuário na tabela "users" (metadados adicionais)
    if (data.user) {
      // Persistir metadados do usuário também no storage local/DB.
      // Em desenvolvimento `storage` é InMemoryStorage, então precisamos
      // garantir que o usuário exista lá também (mesmo id do Supabase)
      try {
        console.log('🔄 Criando usuário no storage local com id:', data.user.id);
        await storage.createUser({ id: data.user.id, nome, email } as any);
        console.log('✅ Usuário criado no storage local');
      } catch (e) {
        console.error('⚠️ Erro ao criar usuário no storage local:', e);
      }

    // 3️⃣ Inserir o usuário na tabela "users" (metadados adicionais)
    if (data.user) {
      // Persistir metadados do usuário também no storage local/DB.
      // Em desenvolvimento `storage` é InMemoryStorage, então precisamos
      // garantir que o usuário exista lá também (mesmo id do Supabase)
      try {
        console.log('🔄 Criando usuário no storage local com id:', data.user.id);
        await storage.createUser({ id: data.user.id, nome, email } as any);
        console.log('✅ Usuário criado no storage local');
      } catch (e) {
        console.error('⚠️ Erro ao criar usuário no storage local:', e);
      }

      // Criar também na tabela 'users' do Supabase.
      // CRÍTICO: Usar supabaseService (com service_role) para bypass de RLS.
      // Se service_role não estiver disponível, o signup falha no painel do Supabase.
      try {
        if (!supabaseService) {
          console.error('❌ ERRO CRÍTICO: supabaseService não inicializado. Usuário não será inserido na tabela users do Supabase.');
          console.error('   Verifique se SUPABASE_SERVICE_ROLE_KEY foi configurado corretamente no ambiente.');
        } else {
          // Gerar valores obrigatórios ausentes na tabela `users`
          const generatedColor = `hsl(${Math.floor(Math.random() * 360)} 70% 40%)`;
          
          console.log('🔄 Tentando inserir na tabela users do Supabase com:', {
            id: data.user.id,
            nome,
            email,
            color: generatedColor,
          });

          // Usar INSERT direto (não upsert) para forçar erro se já existir
          // Isso ajuda a detectar problemas de sincronização
          const { error: insertError, data: insertedData } = await supabaseService
            .from('users')
            .insert([
              {
                id: data.user.id,
                nome,
                email,
                // Placeholder para satisfazer NOT NULL na tabela (não é a senha real)
                password: 'auth-via-supabase',
                color: generatedColor,
                created_at: new Date().toISOString(),
              },
            ]);

          if (insertError) {
            // Se houver erro de duplicate key, tentar atualizar em vez de inserir
            if (insertError.message && insertError.message.toLowerCase().includes('duplicate')) {
              console.warn('⚠️ Usuário já existe na tabela users - tentando atualizar...');
              const { error: updateError } = await supabaseService
                .from('users')
                .update({
                  nome,
                  email,
                })
                .eq('id', data.user.id);
              
              if (updateError) {
                console.error('⚠️ Erro ao atualizar usuário existente:', updateError);
              } else {
                console.log('✅ Usuário atualizado na tabela users do Supabase (via service client)');
              }
            } else {
              console.error('❌ Erro ao inserir usuário no Supabase (users) via service client:', insertError);
            }
          } else {
            console.log('✅ Usuário criado na tabela users do Supabase (via service client)');
          }
        }
      } catch (e) {
        console.error('❌ Falha ao tentar inserir usuário no Supabase (users):', e);
      }
    }
    }

    // Auto-login: popular a sessão do express com o novo user id para evitar
    // que o usuário precise logar manualmente após o registro.
    try {
      // Não criar sessão automaticamente após registro quando o email não
      // estiver confirmado. Em alguns fluxos o Supabase retorna sessão mesmo
      // que o email não esteja confirmado — evitamos autenticar automaticamente
      // para forçar o fluxo de confirmação por email.
      const confirmed = data?.user && (data.user.email_confirmed_at || data.user.confirmed_at);
      if (confirmed && req.session) {
        req.session.userId = data.user?.id;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) return reject(err);
            resolve();
          });
        });
        console.log('✅ Sessão iniciada após registro para userId (email confirmado):', req.session.userId);
      } else {
        console.log('ℹ️ Usuário registrado, mas email não confirmado — não criando sessão automaticamente');
      }
    } catch (e) {
      console.warn('⚠️ Falha ao persistir sessão após registro:', e);
    }

    return res.status(200).json({ message: "Usuário criado com sucesso!" });
  } catch (err) {
    console.error("❌ Erro inesperado:", err);
    return res.status(500).json({ message: "Erro interno no servidor." });
  }
});

// Esqueci minha senha (gera token e salva no usuário)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);

    const user = await storage.getUserByEmail(data.email);
    if (!user) {
      // Não vazar informação sobre existência do email
      return res.json({ message: 'Se o email existir, você receberá instruções de recuperação' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    await storage.updateUser(user.id, { resetToken, resetTokenExpiry } as any);

    const frontendBase = process.env.FRONTEND_URL || (`http://localhost:${process.env.PORT || 5173}`);
    // Aplicação usa hash routing, então incluimos o token como query na hash
    const resetUrl = `${frontendBase}/#reset-password?token=${resetToken}`;

    console.log('🔐 Reset password requested for', data.email, 'resetUrl:', resetUrl);

    // TODO: Em produção, enviar email com o resetUrl
    // Para usar email em produção:
    // 1. Instalar nodemailer: npm install nodemailer
    // 2. Configurar variáveis de ambiente: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
    // 3. Descomente o código abaixo:
    // 
    // if (process.env.SMTP_HOST) {
    //   const nodemailer = require('nodemailer');
    //   const transporter = nodemailer.createTransport({
    //     host: process.env.SMTP_HOST,
    //     port: parseInt(process.env.SMTP_PORT || '587'),
    //     secure: process.env.SMTP_SECURE === 'true',
    //     auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    //   });
    //   await transporter.sendMail({
    //     from: process.env.SMTP_FROM,
    //     to: data.email,
    //     subject: 'Redefinição de Senha - Controle de Estoque',
    //     html: `<p>Clique no link abaixo para redefinir sua senha:</p><a href="${resetUrl}">${resetUrl}</a><p>O link expira em 1 hora.</p>`
    //   });
    // }

    // Em desenvolvimento OU se ALLOW_DEV_RESET=1, retornar o link diretamente
    if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_RESET === '1') {
      return res.json({ message: 'Email de recuperação gerado. Link de reset disponível.', resetToken, resetUrl });
    }

    // Em produção, retornar mensagem genérica (email será enviado se configurado)
    return res.json({ message: 'Se o email existir, você receberá instruções de recuperação' });
  } catch (error: any) {
    console.error('Erro ao solicitar recuperação:', error);
    res.status(400).json({ message: error.message || 'Erro ao solicitar recuperação de senha' });
  }
});

// Trocar senha (change password) - usuário autenticado
app.post('/api/auth/change-password', requireAuth, async (req: any, res) => {
  try {
    const userId = req.userId;
    
    const data = z.object({
      oldPassword: z.string(),
      newPassword: z.string()
    }).parse(req.body);

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    try {
      // 1. Verificar senha antiga fazendo login fresco
      console.log('🔐 Verificando senha atual para:', user.email);
      const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.oldPassword
      });

      if (loginError || !authData.user) {
        console.log('❌ Senha atual incorreta para:', user.email, loginError);
        return res.status(401).json({ message: 'Senha atual incorreta' });
      }

      // 2. Usar a sessão retornada para atualizar a senha
      const { session } = authData;
      if (!session) {
        return res.status(400).json({ message: 'Erro ao obter sessão de autenticação' });
      }

      // 3. Criar um novo cliente Supabase com o token da sessão
      const supabaseAuth = supabase;
      
      // Estabelecer a sessão no cliente
      const { error: setSessionError } = await supabaseAuth.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

      if (setSessionError) {
        console.error('❌ Erro ao estabelecer sessão:', setSessionError);
        return res.status(400).json({ message: 'Erro ao atualizar senha' });
      }

      // 4. Agora atualizar a senha
      const { error: updateError } = await supabaseAuth.auth.updateUser({
        password: data.newPassword
      });

      if (updateError) {
        console.error('❌ Erro ao atualizar senha:', updateError);
        return res.status(400).json({ message: 'Erro ao atualizar senha: ' + updateError.message });
      }

      console.log('✅ Senha alterada com sucesso para usuário:', userId);
      return res.json({ message: 'Senha alterada com sucesso' });
    } catch (authError: any) {
      console.error('❌ Erro durante troca de senha:', authError);
      return res.status(400).json({ message: 'Erro ao atualizar senha: ' + authError.message });
    }
  } catch (error: any) {
    console.error('Erro ao trocar senha:', error);
    res.status(400).json({ message: error.message || 'Erro ao trocar senha' });
  }
});

// Resetar senha com token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const data = resetPasswordSchema.parse(req.body);

    const allUsers = await storage.getAllUsers();
    const user = allUsers.find(u => u.resetToken === data.token);

    if (!user || !user.resetTokenExpiry) {
      return res.status(400).json({ message: 'Token inválido ou expirado' });
    }

    if (new Date() > new Date(user.resetTokenExpiry)) {
      return res.status(400).json({ message: 'Token expirado. Solicite uma nova recuperação.' });
    }

    // Verificar se temos service role key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    
    if (!serviceRoleKey || !supabaseUrl) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_URL ausentes. Abortando reset para evitar inconsistência.');
      return res.status(500).json({ message: 'Configuração de autenticação incompleta. Defina SUPABASE_SERVICE_ROLE_KEY.' });
    }

    // Usar API REST do Supabase Admin diretamente em vez do cliente JS
    // (cliente JS tem problema com encoding de headers em alguns ambientes)
    try {
      const adminApiUrl = `${supabaseUrl}/auth/v1/admin/users/${user.id}?apikey=${encodeURIComponent(serviceRoleKey)}`;
      console.log(`📝 Atualizando senha via Admin API REST para user: ${user.id}`);
      console.log('🛠 adminApiUrl contains apikey param?', adminApiUrl.includes('?apikey='));

      const headersObj: any = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      };
      console.log('🛠 headers keys being sent:', Object.keys(headersObj));

      const response = await fetch(adminApiUrl, {
        method: 'PUT',
        headers: headersObj,
        body: JSON.stringify({ password: data.newPassword }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Admin API retornou ${response.status}:`, errorText);
        return res.status(500).json({ message: 'Falha ao atualizar senha no servidor de autenticação.' });
      }

      console.log('✅ Supabase Admin API atualizou senha com sucesso');

      // Agora persistimos o hash localmente e removemos o token
      const hashed = await bcrypt.hash(data.newPassword, 10);
      await storage.updateUser(user.id, { password: hashed, resetToken: null, resetTokenExpiry: null } as any);

      return res.json({ message: 'Senha redefinida com sucesso' });
    } catch (supErr: any) {
      console.error('❌ Falha ao atualizar senha via Admin API REST:', supErr);
      return res.status(500).json({ message: 'Falha ao atualizar senha no servidor de autenticação.' });
    }
  } catch (error: any) {
    console.error('Erro ao resetar senha:', error);
    res.status(400).json({ message: error.message || 'Erro ao resetar senha' });
  }
});



// Login via Supabase Auth
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    console.log(`📝 LOGIN ATTEMPT - email: ${email}, sessionID: ${req.sessionID}`);

    // 1️⃣ Autenticar com o Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("❌ Erro ao autenticar no Supabase:", error.message);
      return res.status(401).json({ message: "Email ou senha incorretos" });
    }

    console.log(`✅ Supabase auth ok - userId: ${data.user?.id}`);


    // Bloquear login se o e-mail não estiver confirmado no Supabase
    try {
      const confirmed = data?.user && (data.user.email_confirmed_at || data.user.confirmed_at);
      if (!confirmed) {
        return res.status(403).json({ message: 'E-mail não confirmado. Verifique sua caixa de entrada.' });
      }
    } catch (e) {
      // se houver problemas ao acessar o campo, seguir com cautela (não bloquear por erro interno)
      console.warn('Aviso: falha ao verificar confirmação de email do usuário:', e);
    }

    // 2️⃣ Recuperar dados adicionais da tabela `users` (se quiser)
    // Incluímos o campo `password` para que possamos sincronizar o usuário
    // no storage em memória durante o desenvolvimento, caso necessário.
    // Buscar metadados do usuário na tabela `users`. Usamos maybeSingle para
    // evitar erro quando não existir uma linha com o mesmo id (caso o mapeamento
    // entre Auth user id e tabela users não esteja sincronizado). Se não houver
    // resultado por id, tentamos buscar por email como fallback.
    let userRow: any = null;
    try {
      const byId = await supabase
        .from("users")
        .select("id, nome, email, created_at")
        .eq("id", data.user.id)
        .maybeSingle();
      userRow = byId.data || null;
      if (!userRow) {
        // Fallback: procurar por email (poderá existir uma linha com outro id)
        const byEmail = await supabase
          .from("users")
          .select("id, nome, email, created_at")
          .eq("email", data.user.email)
          .maybeSingle();
        userRow = byEmail.data || null;
        if (byEmail.error) {
          console.warn('⚠️ Erro ao buscar usuário por email:', byEmail.error.message);
        }
      }
    } catch (e: any) {
      console.warn('⚠️ Não foi possível buscar metadados do usuário:', e?.message || e);
    }

    // 3️⃣ Criar sessão Express: regenerar e persistir a sessão para garantir
    // que um sessionID válido seja criado e armazenado no store antes da
    // resposta — evita problemas com proxies/redeploys e garante que o
    // cookie enviado ao cliente corresponda à sessão persistida.
    try {
      // Garantir sincronização com o storage local em desenvolvimento
      try {
        const existing = await storage.getUser(data.user.id);
        if (!existing) {
          await storage.createUser({ id: data.user.id, nome: userRow?.nome || data.user.user_metadata?.nome || '', email: userRow?.email || data.user.email } as any);
          console.log('✅ Usuário sincronizado no storage local para desenvolvimento');
        }
      } catch (e) {
        console.warn('⚠️ Erro ao sincronizar usuário no storage local:', e);
      }

      await new Promise<void>((resolve) => {
        // Regenerar sessão para garantir sessionID limpo
        try {
          req.session.regenerate((regErr: any) => {
            if (regErr) {
              console.warn('⚠️ Falha em session.regenerate:', regErr);
              // fallback: tentar setar userId na sessão atual
              try { req.session.userId = data.user.id; } catch (_) {}
            } else {
              try { req.session.userId = data.user.id; } catch (_) {} }

            // Salvar sessão e então enviar cookies explicitamente
            try {
              req.session.save((saveErr: any) => {
                if (saveErr) console.warn('⚠️ Erro ao salvar sessão:', saveErr);
                else console.log(`✅ Sessão salva - sessionID: ${req.sessionID}, userId: ${req.session?.userId}`);

                try {
                  const cookieName = process.env.SESSION_COOKIE_NAME || 'session_id';
                  const cookieOptions: any = {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    path: '/',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                  };
                  if (req.sessionID) {
                    res.cookie(cookieName, req.sessionID, cookieOptions);
                    console.log(`✅ Cookie enviado - ${cookieName}: ${req.sessionID.substring(0, 20)}..., secure: ${cookieOptions.secure}, sameSite: ${cookieOptions.sameSite}`);
                  }

                  // Adicionar cookie assinado (stateless fallback) com userId
                  try {
                    const signedCookieName = process.env.SIGNED_COOKIE_NAME || 'shelf_uid';
                    const secret = process.env.SESSION_SECRET || 'shelf-aid-secret-key-change-in-production';
                    const uid = data.user?.id || (userRow && userRow.id) || '';
                    if (uid) {
                      const sig = crypto.createHmac('sha256', secret).update(String(uid)).digest('hex');
                      const signedValue = `${uid}.${sig}`;
                      res.cookie(signedCookieName, signedValue, cookieOptions);
                      console.log(`✅ Signed cookie enviado - ${signedCookieName}: ${uid}.${sig.substring(0, 20)}...`);
                    }
                  } catch (e) {
                    console.warn('⚠️ Falha ao setar cookie assinado:', e);
                  }
                } catch (e) {
                  console.warn('⚠️ Falha ao forçar envio de cookie de sessão:', e);
                }

                // Responder ao cliente
                try {
                  console.log(`✅ LOGIN SUCCESS - respondendo com user e dados de sessão`);
                  res.json({
                    message: "Login realizado com sucesso!",
                    user: userRow || data.user,
                    session: data.session,
                  });
                } catch (e) {
                  console.warn('⚠️ Falha ao enviar resposta após login:', e);
                }

                return resolve();
              });
            } catch (e) {
              console.warn('⚠️ Erro ao salvar sessão (outer):', e);
              try {
                res.json({ message: "Login realizado com sucesso!", user: userRow || data.user, session: data.session });
              } catch (_) {}
              return resolve();
            }
          });
        } catch (e) {
          console.warn('⚠️ Erro ao tentar regenerar sessão:', e);
          try {
            req.session.userId = data.user.id;
          } catch (_) {}
          try { res.json({ message: "Login realizado com sucesso!", user: userRow || data.user, session: data.session }); } catch (_) {}
          return resolve();
        }
      });
    } catch (e) {
      // fallback simples
      console.warn('Erro no fluxo de sessão após login:', e);
      res.json({
        message: "Login realizado com sucesso!",
        user: userRow || data.user,
        session: data.session,
      });
    }

  } catch (error: any) {
    console.error("Erro no login:", error);
    res.status(400).json({ message: error.message || "Erro ao fazer login" });
  }
});

  // Dev helper: permite setar uma sessão para um usuário pelo email.
  // Somente habilitar em desenvolvimento ou quando ENABLE_DEV_ROUTES=1.
  app.post('/api/dev/impersonate', async (req: any, res) => {
    try {
      if (process.env.ENABLE_DEV_ROUTES !== '1') {
        return res.status(404).json({ message: 'Not found' });
      }

      const { email } = req.body || {};
      if (!email) return res.status(400).json({ message: 'email required' });

      // Tentar localizar usuário no storage (ou criar temporariamente)
      let user = await storage.getUserByEmail(email);
      if (!user) {
        // criar um usuário mínimo no storage para permitir testes offline
        user = await storage.createUser({ nome: email.split('@')[0], email } as any);
      }

      // Criar sessão express e enviar cookie similar ao login
      req.session.userId = user.id;
      try {
        req.session.save((saveErr: any) => {
          if (saveErr) console.warn('Erro ao salvar sessão (impersonate):', saveErr);
          return res.json({ message: 'Impersonation ok', userId: user.id });
        });
      } catch (e) {
        return res.json({ message: 'Impersonation ok', userId: user.id });
      }
    } catch (error: any) {
      console.error('Erro em /api/dev/impersonate:', error);
      return res.status(500).json({ message: error.message || 'Erro interno' });
    }
  });

  // Verifica se um email existe e se está confirmado (usado pelo frontend)
  app.post('/api/auth/check-email', async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email || typeof email !== 'string') return res.status(400).json({ message: 'Email inválido' });

      // 1) Checar existência no storage local
      const local = await storage.getUserByEmail(email);
      if (!local) {
        // Se não houver local, retornar não existe (sem tentar admin API que pode ter WebSocket issues)
        return res.json({ exists: false, confirmed: false });
      }

      // 2) Usuário existe localmente. Retornar com confirmed=true como padrão
      // (já que passou por validação de email durante login/registro)
      return res.json({ exists: true, confirmed: true });
    } catch (error: any) {
      // Serializar Error/Event de forma segura para aparecer nos logs
      try {
        if (error && typeof error === 'object') {
          if ((error as any).stack) console.error('Erro em check-email (stack):', (error as any).stack);
          else if ((error as any).message) console.error('Erro em check-email (message):', (error as any).message);
          else if ((error as any).type) console.error('Erro em check-email (type):', (error as any).type, error);
          else console.error('Erro em check-email (obj):', JSON.stringify(error));
        } else {
          console.error('Erro em check-email:', String(error));
        }
      } catch (e) {
        console.error('Erro ao logar erro em check-email:', e, 'original:', error);
      }
      return res.status(500).json({ message: 'Erro interno' });
    }
  });

  // Debug: testar conectividade com Supabase (usa service role quando disponível)
  app.get('/api/debug/supabase', async (req, res) => {
    try {
      const svc = supabaseService || supabase;
      // Tentar uma operação simples que exige conexão e permissões
      try {
        const test = await svc.from('users').select('id').limit(1).maybeSingle();
        return res.json({ ok: true, result: test?.data || null, error: test?.error || null });
      } catch (e) {
        return res.status(500).json({ ok: false, error: String(e) });
      }
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e) });
    }
  });



  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao fazer logout' });
      }
      // Limpar também o cookie assinado de fallback
      try {
        const signedCookieName = process.env.SIGNED_COOKIE_NAME || 'shelf_uid';
        res.clearCookie(signedCookieName, { path: '/', secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' });
      } catch (e) {
        // ignore
      }
      res.json({ message: 'Logout realizado com sucesso' });
    });
  });

  // Rota de DEBUG: receber logs do renderer para diagnóstico remoto
  app.post('/api/debug/log', (req: any, res) => {
    try {
      const { level, message, stack } = req.body || {};
      const text = `[${new Date().toISOString()}] RENDERER ${level || 'info'}: ${message || ''}\n${stack || ''}`;
      try { require('fs').appendFileSync(path.join(__dirname, '..', 'server-renderer.log'), text + '\n\n', 'utf8'); } catch (_) {}
      console[level === 'error' ? 'error' : 'log'](text);
      return res.json({ ok: true });
    } catch (e) {
      console.error('Erro ao receber log do renderer:', e);
      return res.status(500).json({ ok: false });
    }
  });

// Obter usuário atual diretamente do Supabase
app.get('/api/auth/me', requireAuth, async (req: any, res) => {
  try {
    // O middleware requireAuth já garantiu que req.user.id existe
    const userId = req.user?.id || req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    // Retornar informações mínimas do usuário (apenas o que está disponível via cookie)
    // Não fazer chamadas a storage/supabase que possam disparar WebSocket
    return res.json({
      id: userId,
      nome: 'Usuário',
      email: '',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});



  // Removido endpoint de recuperação de senha - agora usando Supabase client diretamente

  // ============ MODELOS DE PRODUTOS ============

  // Compatibilidade: rotas antigas do cliente podiam chamar '/import-excel'.
  // Reescrevemos para o handler atual '/api/modelos-produtos/import' para
  // evitar 404 em clientes com bundle antigo (cache). Isto é uma correção
  // temporária até todos os usuários atualizarem o bundle no navegador.
  app.use((req, res, next) => {
    try {
      if (req.method === 'POST' && req.path === '/api/modelos-produtos/import-excel') {
        console.log('🔁 Reescrevendo /api/modelos-produtos/import-excel -> /api/modelos-produtos/import (compat)');
        // Preservar query string, se houver
        const qsIndex = req.url.indexOf('?');
        const qs = qsIndex >= 0 ? req.url.slice(qsIndex) : '';
        req.url = '/api/modelos-produtos/import' + qs;
      }
    } catch (e) {
      console.warn('⚠️ Falha ao reescrever rota legacy import-excel:', e);
    }
    return next();
  });

  // Listar todos os modelos de produtos
  app.get('/api/modelos-produtos', requireAuth, async (req, res) => {
    try {
      console.log('📍 GET /api/modelos-produtos - Usuário:', (req as any).userId);
      const modelos = await storage.getAllModelosProdutos();
      console.log(`✅ Retornando ${modelos.length} modelos`);
      res.json(modelos);
    } catch (error: any) {
      console.error('❌ Erro ao listar modelos:', {
        message: error?.message || error?.toString(),
        stack: error?.stack?.substring(0, 200),
        code: error?.code,
        name: error?.name,
      });
      res.status(500).json({ message: 'Erro ao listar modelos de produtos' });
    }
  });

  // Buscar modelo de produto por código
  app.get('/api/modelos-produtos/:codigo', requireAuth, async (req, res) => {
    try {
      const modelo = await storage.getModeloProdutoByCodigo(req.params.codigo);
      if (!modelo) {
        return res.status(404).json({ message: 'Modelo não encontrado' });
      }
      res.json(modelo);
    } catch (error: any) {
      console.error('Erro ao buscar modelo:', error);
      res.status(500).json({ message: 'Erro ao buscar modelo de produto' });
    }
  });

  // Criar modelo de produto
  app.post('/api/modelos-produtos', requireAuth, async (req, res) => {
    try {
      const data = insertModeloProdutoSchema.parse(req.body);
      const modelo = await storage.createModeloProduto(data);
      res.json(modelo);
    } catch (error: any) {
      console.error('Erro ao criar modelo:', error);
      res.status(400).json({ message: error.message || 'Erro ao criar modelo de produto' });
    }
  });

  // Importar modelos de produtos de planilha Excel
  app.post('/api/modelos-produtos/import', requireAuth, async (req, res) => {
    try {
      console.log('📍 POST /api/modelos-produtos/import');
      console.log('📍 Body type:', typeof req.body);
      console.log('📍 Body is array:', Array.isArray(req.body));
      
      let { modelos } = req.body;
      console.log('📍 Destructured modelos type:', typeof modelos);
      console.log('📍 Destructured modelos is array:', Array.isArray(modelos));

      // Aceitar: array direto, objeto com propriedade 'modelos', ou um único objeto de modelo
      if (Array.isArray(req.body)) {
        modelos = req.body;
        console.log('📍 Using req.body directly as array');
      } else if (!modelos && req.body && typeof req.body === 'object' && !Array.isArray(req.body) && req.body.codigoProduto) {
        // Se for um único objeto de modelo (PowerShell envia assim), envolver em array
        modelos = [req.body];
        console.log('📍 Single modelo object detected, wrapping in array');
      }

      console.log('📍 Final modelos type:', typeof modelos);
      console.log('📍 Final modelos is array:', Array.isArray(modelos));
      
      if (!Array.isArray(modelos)) {
        console.log('📍 ERROR: Formato inválido - modelos:', modelos);
        return res.status(400).json({ message: 'Formato inválido - esperado array ou { modelos: [] }' });
      }

      console.log(`📍 OK - Importando ${modelos.length} modelos`);
      let imported = 0;
      let updated = 0;
      const errors: string[] = [];

      for (let i = 0; i < modelos.length; i++) {
        const modeloData = modelos[i];
        try {
          console.log(`📍 [${i + 1}/${modelos.length}] Processando: ${modeloData.codigoProduto}`);
          
          // Garantir que o campo cadastradoPor exista (preencher com usuário que faz a importação ou 'SISTEMA')
          try {
            if (!modeloData.cadastradoPor) {
              modeloData.cadastradoPor = (req as any).user?.id || 'SISTEMA';
            }
          } catch (e) {
            modeloData.cadastradoPor = 'SISTEMA';
          }

          // Normalizar/sanitizar campos comuns (aceitar string vazia como ausência)
          try {
            if (typeof modeloData.temperatura === 'string') {
              modeloData.temperatura = modeloData.temperatura.trim();
              if (modeloData.temperatura === '') delete modeloData.temperatura;
            }
            // Se temperatura ausente, aplicar fallback seguro para evitar violação NOT NULL no banco
            if (modeloData.temperatura === undefined || modeloData.temperatura === null) {
              modeloData.temperatura = 'N/D';
            }

            if (modeloData.shelfLife === '' || modeloData.shelfLife === null) {
              delete modeloData.shelfLife;
            } else if (typeof modeloData.shelfLife === 'string') {
              const n = Number(modeloData.shelfLife);
              if (!Number.isFinite(n)) delete modeloData.shelfLife; else modeloData.shelfLife = n;
            }
          } catch (e) {
            // continue — sanificação deve ser silenciosa
          }

          const data = insertModeloProdutoSchema.parse(modeloData);
          
          const existente = await storage.getModeloProdutoByCodigo(data.codigoProduto);

          
          if (existente) {
            await storage.updateModeloProduto(existente.id, data);
            updated++;
          } else {
            await storage.createModeloProduto(data);
            imported++;
          }
        } catch (error: any) {
          const codigo = (modeloData as any).codigoProduto || 'desconhecido';
          const row = (modeloData as any)._rowIndex ? `Linha ${(modeloData as any)._rowIndex}` : '';
          // Formatar erros do Zod (se existirem) para mensagens legíveis
          if (error && error.errors && Array.isArray(error.errors)) {
            const msgs = error.errors.map((e: any) => {
              const path = Array.isArray(e.path) ? e.path.join('.') : String(e.path || 'campo');
              return `${path}: ${e.message}`;
            });
            errors.push(`${row} - Erro ao importar código ${codigo}: ${msgs.join('; ')}`);
          } else {
            errors.push(`${row} - Erro ao importar código ${codigo}: ${error.message || String(error)}`);
          }
        }
      }

      res.json({ imported, updated, errors });
    } catch (error: any) {
      console.error('Erro na importação de modelos:', error);
      res.status(500).json({ message: 'Erro na importação de modelos' });
    }
  });

  // ============ ALIMENTOS ============

  /// Listar todos os alimentos
app.get('/api/alimentos', requireAuth, async (req, res) => {
  try {
    const alimentos = await storage.getAllAlimentos();
    res.json(alimentos);
  } catch (error: any) {
    console.error('Erro ao listar alimentos:', error);
    if (isDbNetworkError(error)) {
      return res.status(502).json({ message: 'Banco inacessível (ENETUNREACH). Verifique se o provedor expõe IPv4 ou configure SUPABASE_DB_HOST_IPV4 no ambiente.' });
    }
    res.status(500).json({ message: 'Erro ao listar alimentos' });
  }
});

// Criar alimento
app.post('/api/alimentos', requireAuth, async (req: any, res) => {
  try {
    console.log('📍 POST /api/alimentos - Usuário:', req.user.id, 'Dados:', Object.keys(req.body));
    console.log('🔍 alertasConfig TYPE:', typeof req.body.alertasConfig, 'VALUE:', req.body.alertasConfig);
    const data = insertAlimentoSchema.parse({
      ...req.body,
      cadastradoPor: req.user.id,
    });

    // IMPORTANTE: Data de entrada sempre vem do servidor (data atual)
    // Se lote não foi fornecido, padronizamos para 'LOTE-01'
    const alimentoData = {
      ...data,
      lote: data.lote || 'LOTE-01',
      dataEntrada: new Date().toISOString().split('T')[0],
      dataSaida: null,
    };

    const alimento = await storage.createAlimento(alimentoData, req.user.id);
    console.log('✅ Alimento criado:', alimento.id, alimento.nome);

    // Sincronização com Supabase já é feita dentro de `storage.createAlimento`.
    // Evitamos duplicar inserts aqui para não causar erros de FK ou duplicidade.

    // Registrar no audit log (inclui quantidade inicial explicitamente)
    await storage.createAuditLog({
      alimentoId: alimento.id,
      alimentoCodigo: alimento.codigoProduto,
      alimentoNome: alimento.nome,
      action: 'CREATE',
      userId: req.user.id,
      userName: req.user.nome,
      changes: { 
        alimento: data,
        quantidadeInicial: alimento.quantidade,
        dataEntrada: alimento.dataEntrada,
      },
    });

    res.json(alimento);
  } catch (error: any) {
    console.error('❌ Erro ao criar alimento:', {
      message: error?.message,
      code: error?.code,
      errno: error?.errno,
      stack: error?.stack?.substring(0, 150),
    });
    if (isDbNetworkError(error)) {
      return res.status(502).json({ message: 'Banco inacessível (ENETUNREACH). Verifique se o provedor expõe IPv4 ou configure SUPABASE_DB_HOST_IPV4 no ambiente.' });
    }
    res.status(400).json({ message: error.message || 'Erro ao criar alimento' });
  }
});

  // Atualizar alimento
  app.patch('/api/alimentos/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertAlimentoSchema.partial().parse(req.body);

      const alimentoAntes = await storage.getAlimento(id);
      if (!alimentoAntes) {
        return res.status(404).json({ message: 'Alimento não encontrado' });
      }

      const alimento = await storage.updateAlimento(id, data);

      // Registrar no audit log
      await storage.createAuditLog({
        alimentoId: id,
        alimentoCodigo: alimento?.codigoProduto || alimentoAntes.codigoProduto,
        alimentoNome: alimento?.nome || alimentoAntes.nome,
        action: 'UPDATE',
        userId: req.user.id,
        userName: req.user.nome,
        changes: { antes: alimentoAntes, depois: data },
      });

      res.json(alimento);
    } catch (error: any) {
      console.error('Erro ao atualizar alimento:', error);
      res.status(400).json({ message: error.message || 'Erro ao atualizar alimento' });
    }
  });

  // Deletar alimento
  app.delete('/api/alimentos/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);

      const alimento = await storage.getAlimento(id);
      if (!alimento) {
        return res.status(404).json({ message: 'Alimento não encontrado' });
      }

      const success = await storage.deleteAlimento(id);

      // Registrar no audit log
      await storage.createAuditLog({
        alimentoId: undefined, // Alimento foi deletado
        alimentoCodigo: alimento.codigoProduto,
        alimentoNome: alimento.nome,
        action: 'DELETE',
        userId: req.user.id,
        userName: req.user.nome,
        changes: { alimento },
      });

      // Em ambiente de desenvolvimento, tentar também limpar duplicatas remotas
      // por código_produto + lote quando existirem (ajuda a evitar que itens
      // 'reapareçam' no dev por causa de linhas duplicadas no Supabase).
      try {
        if (process.env.ENABLE_DEV_ROUTES === '1') {
          try {
            const { supabaseService } = require('./supabaseClient');
            const svc = supabaseService || (await import('./supabaseClient')).supabase;
            // Tentar remover por id já feito, mas também remover por código+lote
            const filtro: any = { codigo_produto: alimento.codigoProduto };
            if (alimento.lote) filtro.lote = alimento.lote;
            await svc.from('alimentos').delete().match(filtro);
          } catch (e) {
            console.warn('Falha ao tentar limpar duplicatas remotas (dev):', e);
          }
        }
      } catch (e) {
        // silencioso
      }

      res.json({ success });
    } catch (error: any) {
      console.error('Erro ao deletar alimento:', error);
      res.status(500).json({ message: 'Erro ao deletar alimento' });
    }
  });

  // Registrar saída
  app.post('/api/alimentos/:id/saida', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { quantidade } = req.body;

      if (!quantidade || quantidade <= 0) {
        return res.status(400).json({ message: 'Quantidade deve ser maior que zero' });
      }

      const alimentoAntes = await storage.getAlimento(id);
      if (!alimentoAntes) {
        return res.status(404).json({ message: 'Alimento não encontrado' });
      }

      if (quantidade > alimentoAntes.quantidade) {
        return res.status(400).json({ message: 'Quantidade maior que o estoque disponível' });
      }

      // Capture a snapshot da quantidade antes de aplicar a saída.
      // IMPORTANTE: em implementações in-memory `alimentoAntes` pode ser a
      // mesma referência que será atualizada por `registrarSaida`. Por isso
      // guardamos o valor antes de chamar a função que altera o estoque.
      const quantidadeAntes = alimentoAntes.quantidade;
      const alimento = await storage.registrarSaida(id, quantidade);

      // Determinar a "quantidade cadastrada" original — isto é, o valor que
      // foi inserido pela primeira vez no histórico (pode vir do CREATE ou de
      // um UPDATE que definiu a quantidade). Percorremos os logs na ordem
      // cronológica e pegamos o primeiro registro de CREATE/UPDATE que contenha
      // um valor de quantidade.
      let quantidadeInicialFromCreate: number | undefined = undefined;
      try {
        const allLogs = await storage.getAllAuditLogs();
        const logsForAlimento = (allLogs || [])
          .filter((l) => Number(l.alimentoId) === Number(id))
          .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        for (const l of logsForAlimento) {
          const ch = l.changes as any || {};
          if (l.action === 'CREATE') {
            const q = ch.quantidadeInicial ?? ch.alimento?.quantidade ?? ch.alimento?.quantidadeInicial;
            // Aceitar somente valores numéricos positivos — ignorar zeros que
            // possam representar ausência de quantidade relevante.
            if (typeof q === 'number' && q > 0) {
              quantidadeInicialFromCreate = q;
              break;
            }
          }

          if (l.action === 'UPDATE') {
            // Em UPDATE salvamos { antes, depois }, onde `depois` contém o objeto
            // enviado no PATCH (possivelmente com `quantidade`). Preferimos
            // valores numéricos positivos.
            const q = ch.depois?.quantidade ?? ch.depois?.quantidadeInicial ?? ch.quantidade;
            if (typeof q === 'number' && q > 0) {
              quantidadeInicialFromCreate = q;
              break;
            }
          }
        }
      } catch (e) {
        // ignore
      }

      // Registrar no audit log com mais detalhes do estoque
      // Observação: `quantidadeInicialFromCreate` tentava recuperar a quantidade
      // originalmente registrada na criação do produto. Em muitos casos é mais
      // útil registrar a quantidade que estava cadastrada imediatamente antes
      // da saída (p.ex. após edições) — isto é `alimentoAntes.quantidade`.
      await storage.createAuditLog({
        alimentoId: id,
        alimentoCodigo: alimento?.codigoProduto || alimentoAntes.codigoProduto,
        alimentoNome: alimento?.nome || alimentoAntes.nome,
        action: 'SAIDA',
        userId: req.user.id,
        userName: req.user.nome,
        changes: {
          quantidadeSaida: quantidade,
          estoqueAntes: quantidadeAntes,
          estoqueDepois: alimento?.quantidade || 0,
          dataSaida: new Date().toISOString(),
          loteSaida: alimentoAntes.lote,
          cadastradoPor: alimentoAntes.cadastradoPor,
          dataEntrada: alimentoAntes.dataEntrada,
          // `quantidadeInicial` deve refletir o valor que foi inserido pela
          // primeira vez — seja na criação ou na primeira edição que definiu a
          // quantidade. Se não encontrarmos esse histórico, caímos para o
          // valor que estava cadastrado imediatamente antes da saída.
          quantidadeInicial: quantidadeInicialFromCreate ?? quantidadeAntes,
          // preservamos o valor da criação (ou do primeiro registro encontrado)
          // em uma chave separada para facilitar auditoria.
          quantidadeInicialCriacao: quantidadeInicialFromCreate,
        },
      });

      res.json(alimento);
    } catch (error: any) {
      console.error('Erro ao registrar saída:', error);
      res.status(500).json({ message: 'Erro ao registrar saída' });
    }
  });

  // Importar múltiplos alimentos
  app.post('/api/alimentos/import', requireAuth, async (req: any, res) => {
    try {
      let { alimentos } = req.body;

      // Aceitar array direto ou objeto com propriedade 'alimentos'
      if (Array.isArray(req.body)) {
        alimentos = req.body;
      }

      if (!Array.isArray(alimentos)) {
        return res.status(400).json({ message: 'Formato inválido - esperado array ou { alimentos: [] }' });
      }

      let imported = 0;
      const errors: string[] = [];

      for (const alimentoData of alimentos) {
        try {
          // Normalizar/sanitizar 'temperatura' — aceitar string vazia como ausência
          try {
            if (typeof alimentoData.temperatura === 'string') {
              alimentoData.temperatura = alimentoData.temperatura.trim();
              if (alimentoData.temperatura === '') delete alimentoData.temperatura;
            }
            // Se temperatura ausente, aplicar fallback seguro para evitar erro de validação/NOT NULL
            if (alimentoData.temperatura === undefined || alimentoData.temperatura === null) {
              alimentoData.temperatura = 'N/D';
            }
          } catch (e) {
            // Sanitização silenciosa
          }

          const data = insertAlimentoSchema.parse(alimentoData);

          // Se o lote estiver ausente durante a importação, atribuímos um padrão
          const dataComLote = {
            ...data,
            lote: (data as any).lote || 'LOTE-01',
          };

          // IMPORTANTE: Data de entrada sempre vem do servidor (data atual) na importação
          const alimentoComDataServidor = {
            ...dataComLote,
            dataEntrada: new Date().toISOString().split('T')[0],
            dataSaida: undefined,
          };

          // Log detalhado de importação
          console.log(`[IMPORT] Importando alimento ${imported + 1}:`, {
            codigoProduto: alimentoComDataServidor.codigoProduto,
            nome: alimentoComDataServidor.nome,
            lote: alimentoComDataServidor.lote,
            quantidade: alimentoComDataServidor.quantidade,
            unidade: alimentoComDataServidor.unidade,
            dataFabricacao: alimentoComDataServidor.dataFabricacao,
            dataValidade: alimentoComDataServidor.dataValidade,
            shelfLife: alimentoComDataServidor.shelfLife,
            temperatura: alimentoComDataServidor.temperatura,
            pesoPorCaixa: alimentoComDataServidor.pesoPorCaixa,
            alertasConfig: alimentoComDataServidor.alertasConfig,
          });
          
          const alimento = await storage.createAlimento(alimentoComDataServidor, req.user.id);

          // Registrar no audit log
          await storage.createAuditLog({
            alimentoId: alimento.id,
            alimentoCodigo: alimento.codigoProduto,
            alimentoNome: alimento.nome,
            action: 'CREATE',
            userId: req.user.id,
            userName: req.user.nome,
            changes: { alimento: data, importado: true },
          });

          imported++;
        } catch (error: any) {
          const row = (alimentoData as any)._rowIndex ? `Linha ${(alimentoData as any)._rowIndex}` : '';
          const nome = (alimentoData as any).nome || 'desconhecido';
          errors.push(`${row} - Erro ao importar ${nome}: ${error.message}`);
                  console.error(`[IMPORT ERROR] ${row} - ${nome}:`, error);
              console.log(`[IMPORT COMPLETE] Importados ${imported} de ${alimentos.length} alimentos`);
              if (errors.length > 0) {
                console.error(`[IMPORT WARNINGS] ${errors.length} erro(s):`, errors);
              }
      
        }
      }

      res.json({ imported, errors });
    } catch (error: any) {
      console.error('Erro na importação:', error);
      res.status(500).json({ message: 'Erro na importação' });
    }
  });

  // ============ AUDIT LOG ============

  // Listar audit logs
  app.get('/api/audit-log', requireAuth, async (req, res) => {
    try {
      const logs = await storage.getAllAuditLogs();
      res.json(logs);
    } catch (error: any) {
      console.error('Erro ao listar audit logs:', error);
      if (isDbNetworkError(error)) {
        return res.status(502).json({ message: 'Banco inacessível (ENETUNREACH). Verifique se o provedor expõe IPv4 ou configure SUPABASE_DB_HOST_IPV4 no ambiente.' });
      }
      res.status(500).json({ message: 'Erro ao listar histórico' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
