"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const storage_1 = require("./storage");
const express_session_1 = __importDefault(require("express-session"));
const memorystore_1 = __importDefault(require("memorystore"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const schema_1 = require("../shared/schema");
const supabaseClient_1 = require("./supabaseClient");
const MemoryStore = (0, memorystore_1.default)(express_session_1.default);
async function registerRoutes(app) {
    // Session middleware
    app.use((0, express_session_1.default)({
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
            sameSite: 'lax',
            path: '/',
        },
    }));
    // Rota de DEBUG: mostra a sessão e cookies enviados pelo navegador.
    // Útil para desenvolvimento: acessar /api/debug/session após login para
    // confirmar se `req.session.userId` foi criado e se o cookie foi enviado.
    app.get('/api/debug/session', (req, res) => {
        try {
            res.json({ session: req.session || null, cookies: req.headers?.cookie || null });
        }
        catch (e) {
            res.status(500).json({ message: 'Erro ao ler sessão de debug', error: String(e) });
        }
    });
    // Middleware para verificar autenticação
    const requireAuth = async (req, res, next) => {
        // Dev header bypass: se ENABLE_DEV_ROUTES=1 e header x-dev-impersonate
        // estiver presente, permitimos autenticar por email sem cookie (apenas
        // para testes locais). Isto facilita testes via curl/Invoke-RestMethod.
        try {
            if (process.env.ENABLE_DEV_ROUTES === '1' && req.headers['x-dev-impersonate']) {
                const devEmail = String(req.headers['x-dev-impersonate']);
                try {
                    // Evitar chamadas que dependam do Supabase/DB para não falhar em
                    // ambientes desconectados. Criamos um usuário mínimo no momento.
                    const devUser = { id: `dev-${Date.now()}`, nome: devEmail.split('@')[0], email: devEmail };
                    req.user = devUser;
                    // também podemos popular req.session.userId para compatibilidade
                    try {
                        req.session.userId = devUser.id;
                    }
                    catch (_) { }
                    return next();
                }
                catch (e) {
                    console.warn('Falha no dev impersonate:', e);
                }
            }
        }
        catch (e) {
            // ignore
        }
        // DEBUG: mostrar informações da sessão para diagnosticar 401
        try {
            console.log('==== DEBUG INFO ====');
            console.log('Session ID:', req.sessionID);
            console.log('Session:', req.session);
            console.log('Cookies:', req.headers?.cookie);
            console.log('User ID:', req.session?.userId);
            console.log('Headers:', req.headers);
            console.log('==================');
        }
        catch (e) {
            console.error('Erro ao logar debug:', e);
        }
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ message: 'Não autenticado' });
        }
        try {
            // Primeiro, buscar usuário local (metadados)
            const user = await storage_1.storage.getUser(req.session.userId);
            if (!user) {
                return res.status(401).json({ message: 'Usuário não encontrado' });
            }
            // Verificar status de confirmação do email no Supabase (quando possível)
            try {
                const svc = supabaseClient_1.supabaseService || supabaseClient_1.supabase;
                // admin API pode variar com a versão do cliente; tentamos usar a API admin quando disponível
                const admin = svc.auth && svc.auth.admin ? svc.auth.admin : null;
                if (admin && typeof admin.getUserById === 'function') {
                    const result = await admin.getUserById(req.session.userId);
                    const remoteUser = result?.data?.user || result?.user || null;
                    const confirmed = remoteUser && (remoteUser.email_confirmed_at || remoteUser.confirmed_at || remoteUser.confirmed);
                    if (!confirmed) {
                        return res.status(403).json({ message: 'E-mail não confirmado' });
                    }
                }
            }
            catch (e) {
                // Se falhar ao checar no Supabase, não bloquear por causa de erro de infra;
                // o requisito principal é bloquear quando sabemos que não está confirmado.
                console.warn('Aviso: falha ao verificar confirmação de email via Supabase:', e);
            }
            req.user = user;
            return next();
        }
        catch (error) {
            console.error('Erro ao validar sessão:', error?.message || error);
            return res.status(401).json({ message: 'Não autenticado' });
        }
    };
    // ============ AUTENTICAÇÃO ============
    // Registrar novo usuário
    app.post('/api/auth/register', async (req, res) => {
        try {
            const { nome, email, password } = schema_1.insertUserSchema.parse(req.body);
            // ✅ Verificar se email já existe (antes de tentar criar)
            try {
                const existingUser = await storage_1.storage.getUserByEmail(email);
                if (existingUser) {
                    console.log('⚠️ Tentativa de registrar email já cadastrado:', email);
                    return res.status(400).json({ message: 'Email já cadastrado' });
                }
            }
            catch (e) {
                console.warn('Aviso ao checar email existente:', e);
            }
            // 1️⃣ Criar o usuário no Supabase Auth
            let data = null;
            let error = null;
            try {
                const result = await supabaseClient_1.supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { nome } },
                });
                data = result.data;
                error = result.error;
            }
            catch (e) {
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
                        const local = await storage_1.storage.createUser({ id: `dev-${Date.now()}`, nome, email: email || '' });
                        // Popular sessão com o id local
                        if (req.session)
                            req.session.userId = local.id;
                        console.log('✅ Usuário criado localmente (dev fallback) com id:', local.id);
                        return res.status(200).json({ message: 'Usuário criado localmente (dev)' });
                    }
                    catch (e) {
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
                    await storage_1.storage.createUser({ id: data.user.id, nome, email });
                    console.log('✅ Usuário criado no storage local');
                }
                catch (e) {
                    console.error('⚠️ Erro ao criar usuário no storage local:', e);
                }
                // Tentar manter também a tabela 'users' no Supabase (opcional).
                // Usamos upsert por email para evitar erro de duplicate key caso o
                // email já exista na tabela (p.ex. importado manualmente no painel).
                try {
                    console.log('🔄 Tentando upsert no Supabase (users) com:', {
                        id: data.user.id,
                        nome,
                        email
                    });
                    try {
                        const svc = supabaseClient_1.supabaseService || supabaseClient_1.supabase;
                        const { error: insertError } = await svc
                            .from('users')
                            .upsert([
                            {
                                id: data.user.id,
                                nome,
                                email,
                                criado_em: new Date().toISOString(),
                            },
                        ], { onConflict: 'email', ignoreDuplicates: false });
                        if (insertError) {
                            console.error('⚠️ Erro ao upsert usuário no Supabase (users) via service client:', insertError);
                        }
                        else {
                            console.log('✅ Usuário criado na tabela users do Supabase (via service client)');
                        }
                    }
                    catch (e) {
                        console.error('⚠️ Falha ao tentar upsert usuários no Supabase via service client:', e);
                    }
                }
                catch (e) {
                    console.error('⚠️ Erro ao upsert usuário no Supabase (users):', e);
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
                    await new Promise((resolve, reject) => {
                        req.session.save((err) => {
                            if (err)
                                return reject(err);
                            resolve();
                        });
                    });
                    console.log('✅ Sessão iniciada após registro para userId (email confirmado):', req.session.userId);
                }
                else {
                    console.log('ℹ️ Usuário registrado, mas email não confirmado — não criando sessão automaticamente');
                }
            }
            catch (e) {
                console.warn('⚠️ Falha ao persistir sessão após registro:', e);
            }
            return res.status(200).json({ message: "Usuário criado com sucesso!" });
        }
        catch (err) {
            console.error("❌ Erro inesperado:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
    });
    // Esqueci minha senha (gera token e salva no usuário)
    app.post('/api/auth/forgot-password', async (req, res) => {
        try {
            const data = schema_1.forgotPasswordSchema.parse(req.body);
            const user = await storage_1.storage.getUserByEmail(data.email);
            if (!user) {
                // Não vazar informação sobre existência do email
                return res.json({ message: 'Se o email existir, você receberá instruções de recuperação' });
            }
            const resetToken = crypto_1.default.randomBytes(32).toString('hex');
            const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hora
            await storage_1.storage.updateUser(user.id, { resetToken, resetTokenExpiry });
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
            // Em desenvolvimento, retornar o link diretamente
            if (process.env.NODE_ENV !== 'production') {
                return res.json({ message: 'Email de recuperação gerado. Em desenvolvimento, verifique o console do servidor.', resetToken, resetUrl });
            }
            // Em produção, retornar mensagem genérica (email será enviado se configurado)
            return res.json({ message: 'Se o email existir, você receberá instruções de recuperação' });
        }
        catch (error) {
            console.error('Erro ao solicitar recuperação:', error);
            res.status(400).json({ message: error.message || 'Erro ao solicitar recuperação de senha' });
        }
    });
    // Resetar senha com token
    app.post('/api/auth/reset-password', async (req, res) => {
        try {
            const data = schema_1.resetPasswordSchema.parse(req.body);
            const allUsers = await storage_1.storage.getAllUsers();
            const user = allUsers.find(u => u.resetToken === data.token);
            if (!user || !user.resetTokenExpiry) {
                return res.status(400).json({ message: 'Token inválido ou expirado' });
            }
            if (new Date() > new Date(user.resetTokenExpiry)) {
                return res.status(400).json({ message: 'Token expirado. Solicite uma nova recuperação.' });
            }
            // Atualizar a senha (hash) e limpar token
            const hashed = await bcryptjs_1.default.hash(data.newPassword, 10);
            await storage_1.storage.updateUser(user.id, { password: hashed, resetToken: null, resetTokenExpiry: null });
            // Se houver service role key, também atualizamos a senha no Supabase Auth
            try {
                const svc = supabaseClient_1.supabaseService || null;
                if (svc && svc.auth && svc.auth.admin && typeof svc.auth.admin.updateUserById === 'function') {
                    try {
                        // @ts-ignore - admin API
                        const updateRes = await svc.auth.admin.updateUserById(user.id, { password: data.newPassword });
                        console.log('✅ Supabase password updated for user', user.id, updateRes);
                    }
                    catch (supErr) {
                        console.warn('⚠️ Falha ao atualizar senha no Supabase (admin):', supErr);
                    }
                }
            }
            catch (e) {
                console.warn('⚠️ Erro ao tentar atualizar senha no Supabase:', e);
            }
            return res.json({ message: 'Senha redefinida com sucesso' });
        }
        catch (error) {
            console.error('Erro ao resetar senha:', error);
            res.status(400).json({ message: error.message || 'Erro ao resetar senha' });
        }
    });
    // Login via Supabase Auth
    app.post('/api/auth/login', async (req, res) => {
        try {
            const { email, password } = schema_1.loginSchema.parse(req.body);
            // 1️⃣ Autenticar com o Supabase
            const { data, error } = await supabaseClient_1.supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                console.error("❌ Erro ao autenticar no Supabase:", error.message);
                return res.status(401).json({ message: "Email ou senha incorretos" });
            }
            // Bloquear login se o e-mail não estiver confirmado no Supabase
            try {
                const confirmed = data?.user && (data.user.email_confirmed_at || data.user.confirmed_at);
                if (!confirmed) {
                    return res.status(403).json({ message: 'E-mail não confirmado. Verifique sua caixa de entrada.' });
                }
            }
            catch (e) {
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
            let userRow = null;
            try {
                const byId = await supabaseClient_1.supabase
                    .from("users")
                    .select("id, nome, email, criado_em")
                    .eq("id", data.user.id)
                    .maybeSingle();
                userRow = byId.data || null;
                if (!userRow) {
                    // Fallback: procurar por email (poderá existir uma linha com outro id)
                    const byEmail = await supabaseClient_1.supabase
                        .from("users")
                        .select("id, nome, email, criado_em")
                        .eq("email", data.user.email)
                        .maybeSingle();
                    userRow = byEmail.data || null;
                    if (byEmail.error) {
                        console.warn('⚠️ Erro ao buscar usuário por email:', byEmail.error.message);
                    }
                }
            }
            catch (e) {
                console.warn('⚠️ Não foi possível buscar metadados do usuário:', e?.message || e);
            }
            // 3️⃣ Criar sessão Express
            // A sessão será exposta via o cookie gerenciado pelo express-session.
            req.session.userId = data.user.id;
            // Garantir sincronização com o storage local em desenvolvimento
            try {
                const existing = await storage_1.storage.getUser(data.user.id);
                if (!existing) {
                    // Se não há usuário no storage (in-memory), criamos usando os
                    // metadados que temos.
                    await storage_1.storage.createUser({ id: data.user.id, nome: userRow?.nome || data.user.user_metadata?.nome || '', email: userRow?.email || data.user.email });
                    console.log('✅ Usuário sincronizado no storage local para desenvolvimento');
                }
            }
            catch (e) {
                console.warn('⚠️ Erro ao sincronizar usuário no storage local:', e);
            }
            // 4️⃣ Retornar sucesso — garantir que a sessão foi persistida antes de
            // enviar a resposta (evita cenários onde o cookie não é enviado pelo
            // renderer porque a sessão ainda não foi gravada).
            try {
                req.session.save((saveErr) => {
                    if (saveErr)
                        console.warn('Erro ao salvar sessão:', saveErr);
                    res.json({
                        message: "Login realizado com sucesso!",
                        user: userRow || data.user,
                        session: data.session,
                    });
                });
            }
            catch (e) {
                // fallback simples
                res.json({
                    message: "Login realizado com sucesso!",
                    user: userRow || data.user,
                    session: data.session,
                });
            }
        }
        catch (error) {
            console.error("Erro no login:", error);
            res.status(400).json({ message: error.message || "Erro ao fazer login" });
        }
    });
    // Dev helper: permite setar uma sessão para um usuário pelo email.
    // Somente habilitar em desenvolvimento ou quando ENABLE_DEV_ROUTES=1.
    app.post('/api/dev/impersonate', async (req, res) => {
        try {
            if (process.env.ENABLE_DEV_ROUTES !== '1') {
                return res.status(404).json({ message: 'Not found' });
            }
            const { email } = req.body || {};
            if (!email)
                return res.status(400).json({ message: 'email required' });
            // Tentar localizar usuário no storage (ou criar temporariamente)
            let user = await storage_1.storage.getUserByEmail(email);
            if (!user) {
                // criar um usuário mínimo no storage para permitir testes offline
                user = await storage_1.storage.createUser({ nome: email.split('@')[0], email });
            }
            // Criar sessão express e enviar cookie similar ao login
            req.session.userId = user.id;
            try {
                req.session.save((saveErr) => {
                    if (saveErr)
                        console.warn('Erro ao salvar sessão (impersonate):', saveErr);
                    return res.json({ message: 'Impersonation ok', userId: user.id });
                });
            }
            catch (e) {
                return res.json({ message: 'Impersonation ok', userId: user.id });
            }
        }
        catch (error) {
            console.error('Erro em /api/dev/impersonate:', error);
            return res.status(500).json({ message: error.message || 'Erro interno' });
        }
    });
    // Verifica se um email existe e se está confirmado (usado pelo frontend)
    app.post('/api/auth/check-email', async (req, res) => {
        try {
            const { email } = req.body || {};
            if (!email || typeof email !== 'string')
                return res.status(400).json({ message: 'Email inválido' });
            // 1) Checar existência no storage local
            const local = await storage_1.storage.getUserByEmail(email);
            if (!local) {
                // Se não houver local, tentar verificar diretamente no Supabase Auth (admin) quando possível
                try {
                    const svc = supabaseClient_1.supabaseService || supabaseClient_1.supabase;
                    const admin = svc.auth && svc.auth.admin ? svc.auth.admin : null;
                    if (admin && typeof admin.listUsers === 'function') {
                        // listUsers pode retornar uma lista paginada
                        const list = await admin.listUsers();
                        const users = list?.data?.users || list?.data || [];
                        const found = users.find((u) => String(u.email).toLowerCase() === String(email).toLowerCase());
                        if (found) {
                            const confirmed = !!(found.email_confirmed_at || found.confirmed_at || found.confirmed);
                            return res.json({ exists: true, confirmed });
                        }
                    }
                }
                catch (e) {
                    console.warn('Aviso: falha ao listar usuários via Supabase admin:', e);
                }
                // Não expor detalhes adicionais
                return res.json({ exists: false, confirmed: false });
            }
            // 2) Tentar checar confirmação via Supabase Admin (quando disponível)
            try {
                const svc = supabaseClient_1.supabaseService || supabaseClient_1.supabase;
                const admin = svc.auth && svc.auth.admin ? svc.auth.admin : null;
                if (admin && typeof admin.getUserById === 'function') {
                    const result = await admin.getUserById(local.id);
                    const remoteUser = result?.data?.user || result?.user || null;
                    const confirmed = !!(remoteUser && (remoteUser.email_confirmed_at || remoteUser.confirmed_at || remoteUser.confirmed));
                    return res.json({ exists: true, confirmed });
                }
            }
            catch (e) {
                console.warn('Aviso: falha ao verificar confirmação via Supabase admin:', e);
            }
            // Se não foi possível checar no Supabase admin, retornamos exists=true e confirmed=true
            return res.json({ exists: true, confirmed: true });
        }
        catch (error) {
            console.error('Erro em check-email:', error);
            return res.status(500).json({ message: 'Erro interno' });
        }
    });
    // Logout
    app.post('/api/auth/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ message: 'Erro ao fazer logout' });
            }
            res.json({ message: 'Logout realizado com sucesso' });
        });
    });
    // Rota de DEBUG: receber logs do renderer para diagnóstico remoto
    app.post('/api/debug/log', (req, res) => {
        try {
            const { level, message, stack } = req.body || {};
            const text = `[${new Date().toISOString()}] RENDERER ${level || 'info'}: ${message || ''}\n${stack || ''}`;
            try {
                require('fs').appendFileSync(path_1.default.join(__dirname, '..', 'server-renderer.log'), text + '\n\n', 'utf8');
            }
            catch (_) { }
            console[level === 'error' ? 'error' : 'log'](text);
            return res.json({ ok: true });
        }
        catch (e) {
            console.error('Erro ao receber log do renderer:', e);
            return res.status(500).json({ ok: false });
        }
    });
    // Obter usuário atual diretamente do Supabase
    app.get('/api/auth/me', async (req, res) => {
        try {
            if (!req.session || !req.session.userId) {
                return res.status(401).json({ message: 'Não autenticado' });
            }
            const userId = req.session.userId;
            // Primeiro tentar ler do storage local (in-memory ou DB). Storage é a
            // fonte de verdade para rotas protegidas no servidor.
            let localUser = null;
            try {
                localUser = await storage_1.storage.getUser(userId);
                if (localUser) {
                    const criado = localUser.criado_em || localUser.createdAt || new Date().toISOString();
                    return res.json({ id: localUser.id, nome: localUser.nome, email: localUser.email, criado_em: criado });
                }
            }
            catch (err) {
                console.error('Erro ao ler usuário do storage:', err && err.message ? err.message : err);
                // fallback configurável para permitir UI mínima caso o DB esteja inacessível
                const allowFallback = process.env.SESSION_FALLBACK !== '0';
                if (allowFallback) {
                    console.warn('SESSION_FALLBACK habilitado — retornando usuário mínimo');
                    return res.json({ id: userId, nome: 'Usuário (offline)', email: '' });
                }
                return res.status(500).json({ message: 'Erro ao ler usuário do storage' });
            }
            // Se não existir no storage, tentar buscar na tabela `users` do Supabase
            // de forma resiliente: usar maybeSingle e fallback por email.
            let userRow = null;
            try {
                const byId = await supabaseClient_1.supabase
                    .from('users')
                    .select('id, nome, email, criado_em')
                    .eq('id', userId)
                    .maybeSingle();
                userRow = byId.data || null;
                if (!userRow) {
                    const byEmail = await supabaseClient_1.supabase
                        .from('users')
                        .select('id, nome, email, criado_em')
                        .eq('email', req.user?.email || '')
                        .maybeSingle();
                    userRow = byEmail.data || null;
                }
            }
            catch (e) {
                console.warn('⚠️ Erro buscando usuário no Supabase:', e?.message || e);
            }
            if (!userRow) {
                console.warn('⚠️ Usuário não encontrado: nenhum usuário no storage ou tabela users');
                return res.status(401).json({ message: 'Usuário não encontrado' });
            }
            // Se encontramos o usuário no Supabase, sincronizamos com o storage
            // local para evitar futuros problemas em dev.
            try {
                await storage_1.storage.createUser({ id: userRow.id, nome: userRow.nome, email: userRow.email });
            }
            catch (e) {
                // ignore
            }
            res.json(userRow);
        }
        catch (error) {
            console.error('Erro ao obter usuário atual:', error);
            res.status(500).json({ message: 'Erro interno no servidor' });
        }
    });
    // Removido endpoint de recuperação de senha - agora usando Supabase client diretamente
    // ============ MODELOS DE PRODUTOS ============
    // Listar todos os modelos de produtos
    app.get('/api/modelos-produtos', requireAuth, async (req, res) => {
        try {
            const modelos = await storage_1.storage.getAllModelosProdutos();
            res.json(modelos);
        }
        catch (error) {
            console.error('Erro ao listar modelos:', error);
            res.status(500).json({ message: 'Erro ao listar modelos de produtos' });
        }
    });
    // Buscar modelo de produto por código
    app.get('/api/modelos-produtos/:codigo', requireAuth, async (req, res) => {
        try {
            const modelo = await storage_1.storage.getModeloProdutoByCodigo(req.params.codigo);
            if (!modelo) {
                return res.status(404).json({ message: 'Modelo não encontrado' });
            }
            res.json(modelo);
        }
        catch (error) {
            console.error('Erro ao buscar modelo:', error);
            res.status(500).json({ message: 'Erro ao buscar modelo de produto' });
        }
    });
    // Criar modelo de produto
    app.post('/api/modelos-produtos', requireAuth, async (req, res) => {
        try {
            const data = schema_1.insertModeloProdutoSchema.parse(req.body);
            const modelo = await storage_1.storage.createModeloProduto(data);
            res.json(modelo);
        }
        catch (error) {
            console.error('Erro ao criar modelo:', error);
            res.status(400).json({ message: error.message || 'Erro ao criar modelo de produto' });
        }
    });
    // Importar modelos de produtos de planilha Excel
    app.post('/api/modelos-produtos/import-excel', requireAuth, async (req, res) => {
        try {
            const { modelos } = req.body;
            if (!Array.isArray(modelos)) {
                return res.status(400).json({ message: 'Formato inválido' });
            }
            let imported = 0;
            let updated = 0;
            const errors = [];
            for (const modeloData of modelos) {
                try {
                    // Garantir que o campo cadastradoPor exista (preencher com usuário que faz a importação ou 'SISTEMA')
                    try {
                        if (!modeloData.cadastradoPor) {
                            modeloData.cadastradoPor = req.user?.id || 'SISTEMA';
                        }
                    }
                    catch (e) {
                        modeloData.cadastradoPor = 'SISTEMA';
                    }
                    const data = schema_1.insertModeloProdutoSchema.parse(modeloData);
                    const existente = await storage_1.storage.getModeloProdutoByCodigo(data.codigoProduto);
                    if (existente) {
                        await storage_1.storage.updateModeloProduto(existente.id, data);
                        updated++;
                    }
                    else {
                        await storage_1.storage.createModeloProduto(data);
                        imported++;
                    }
                }
                catch (error) {
                    const codigo = modeloData.codigoProduto || 'desconhecido';
                    const row = modeloData._rowIndex ? `Linha ${modeloData._rowIndex}` : '';
                    // Formatar erros do Zod (se existirem) para mensagens legíveis
                    if (error && error.errors && Array.isArray(error.errors)) {
                        const msgs = error.errors.map((e) => {
                            const path = Array.isArray(e.path) ? e.path.join('.') : String(e.path || 'campo');
                            return `${path}: ${e.message}`;
                        });
                        errors.push(`${row} - Erro ao importar código ${codigo}: ${msgs.join('; ')}`);
                    }
                    else {
                        errors.push(`${row} - Erro ao importar código ${codigo}: ${error.message || String(error)}`);
                    }
                }
            }
            res.json({ imported, updated, errors });
        }
        catch (error) {
            console.error('Erro na importação de modelos:', error);
            res.status(500).json({ message: 'Erro na importação de modelos' });
        }
    });
    // ============ ALIMENTOS ============
    /// Listar todos os alimentos
    app.get('/api/alimentos', requireAuth, async (req, res) => {
        try {
            const alimentos = await storage_1.storage.getAllAlimentos();
            res.json(alimentos);
        }
        catch (error) {
            console.error('Erro ao listar alimentos:', error);
            res.status(500).json({ message: 'Erro ao listar alimentos' });
        }
    });
    // Criar alimento
    app.post('/api/alimentos', requireAuth, async (req, res) => {
        try {
            const data = schema_1.insertAlimentoSchema.parse({
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
            const alimento = await storage_1.storage.createAlimento(alimentoData, req.user.id);
            // Sincronização com Supabase já é feita dentro de `storage.createAlimento`.
            // Evitamos duplicar inserts aqui para não causar erros de FK ou duplicidade.
            // Registrar no audit log (inclui quantidade inicial explicitamente)
            await storage_1.storage.createAuditLog({
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
        }
        catch (error) {
            console.error('Erro ao criar alimento:', error);
            res.status(400).json({ message: error.message || 'Erro ao criar alimento' });
        }
    });
    // Atualizar alimento
    app.patch('/api/alimentos/:id', requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const data = schema_1.insertAlimentoSchema.partial().parse(req.body);
            const alimentoAntes = await storage_1.storage.getAlimento(id);
            if (!alimentoAntes) {
                return res.status(404).json({ message: 'Alimento não encontrado' });
            }
            const alimento = await storage_1.storage.updateAlimento(id, data);
            // Registrar no audit log
            await storage_1.storage.createAuditLog({
                alimentoId: id,
                alimentoCodigo: alimento?.codigoProduto || alimentoAntes.codigoProduto,
                alimentoNome: alimento?.nome || alimentoAntes.nome,
                action: 'UPDATE',
                userId: req.user.id,
                userName: req.user.nome,
                changes: { antes: alimentoAntes, depois: data },
            });
            res.json(alimento);
        }
        catch (error) {
            console.error('Erro ao atualizar alimento:', error);
            res.status(400).json({ message: error.message || 'Erro ao atualizar alimento' });
        }
    });
    // Deletar alimento
    app.delete('/api/alimentos/:id', requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const alimento = await storage_1.storage.getAlimento(id);
            if (!alimento) {
                return res.status(404).json({ message: 'Alimento não encontrado' });
            }
            const success = await storage_1.storage.deleteAlimento(id);
            // Registrar no audit log
            await storage_1.storage.createAuditLog({
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
                        const svc = supabaseService || (await Promise.resolve().then(() => __importStar(require('./supabaseClient')))).supabase;
                        // Tentar remover por id já feito, mas também remover por código+lote
                        const filtro = { codigo_produto: alimento.codigoProduto };
                        if (alimento.lote)
                            filtro.lote = alimento.lote;
                        await svc.from('alimentos').delete().match(filtro);
                    }
                    catch (e) {
                        console.warn('Falha ao tentar limpar duplicatas remotas (dev):', e);
                    }
                }
            }
            catch (e) {
                // silencioso
            }
            res.json({ success });
        }
        catch (error) {
            console.error('Erro ao deletar alimento:', error);
            res.status(500).json({ message: 'Erro ao deletar alimento' });
        }
    });
    // Registrar saída
    app.post('/api/alimentos/:id/saida', requireAuth, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { quantidade } = req.body;
            if (!quantidade || quantidade <= 0) {
                return res.status(400).json({ message: 'Quantidade deve ser maior que zero' });
            }
            const alimentoAntes = await storage_1.storage.getAlimento(id);
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
            const alimento = await storage_1.storage.registrarSaida(id, quantidade);
            // Determinar a "quantidade cadastrada" original — isto é, o valor que
            // foi inserido pela primeira vez no histórico (pode vir do CREATE ou de
            // um UPDATE que definiu a quantidade). Percorremos os logs na ordem
            // cronológica e pegamos o primeiro registro de CREATE/UPDATE que contenha
            // um valor de quantidade.
            let quantidadeInicialFromCreate = undefined;
            try {
                const allLogs = await storage_1.storage.getAllAuditLogs();
                const logsForAlimento = (allLogs || [])
                    .filter((l) => Number(l.alimentoId) === Number(id))
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                for (const l of logsForAlimento) {
                    const ch = l.changes || {};
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
            }
            catch (e) {
                // ignore
            }
            // Registrar no audit log com mais detalhes do estoque
            // Observação: `quantidadeInicialFromCreate` tentava recuperar a quantidade
            // originalmente registrada na criação do produto. Em muitos casos é mais
            // útil registrar a quantidade que estava cadastrada imediatamente antes
            // da saída (p.ex. após edições) — isto é `alimentoAntes.quantidade`.
            await storage_1.storage.createAuditLog({
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
        }
        catch (error) {
            console.error('Erro ao registrar saída:', error);
            res.status(500).json({ message: 'Erro ao registrar saída' });
        }
    });
    // Importar múltiplos alimentos
    app.post('/api/alimentos/import', requireAuth, async (req, res) => {
        try {
            const { alimentos } = req.body;
            if (!Array.isArray(alimentos)) {
                return res.status(400).json({ message: 'Formato inválido' });
            }
            let imported = 0;
            const errors = [];
            for (const alimentoData of alimentos) {
                try {
                    const data = schema_1.insertAlimentoSchema.parse(alimentoData);
                    // Se o lote estiver ausente durante a importação, atribuímos um padrão
                    const dataComLote = {
                        ...data,
                        lote: data.lote || 'LOTE-01',
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
                    const alimento = await storage_1.storage.createAlimento(alimentoComDataServidor, req.user.id);
                    // Registrar no audit log
                    await storage_1.storage.createAuditLog({
                        alimentoId: alimento.id,
                        alimentoCodigo: alimento.codigoProduto,
                        alimentoNome: alimento.nome,
                        action: 'CREATE',
                        userId: req.user.id,
                        userName: req.user.nome,
                        changes: { alimento: data, importado: true },
                    });
                    imported++;
                }
                catch (error) {
                    const row = alimentoData._rowIndex ? `Linha ${alimentoData._rowIndex}` : '';
                    const nome = alimentoData.nome || 'desconhecido';
                    errors.push(`${row} - Erro ao importar ${nome}: ${error.message}`);
                    console.error(`[IMPORT ERROR] ${row} - ${nome}:`, error);
                    console.log(`[IMPORT COMPLETE] Importados ${imported} de ${alimentos.length} alimentos`);
                    if (errors.length > 0) {
                        console.error(`[IMPORT WARNINGS] ${errors.length} erro(s):`, errors);
                    }
                }
            }
            res.json({ imported, errors });
        }
        catch (error) {
            console.error('Erro na importação:', error);
            res.status(500).json({ message: 'Erro na importação' });
        }
    });
    // ============ AUDIT LOG ============
    // Listar audit logs
    app.get('/api/audit-log', requireAuth, async (req, res) => {
        try {
            const logs = await storage_1.storage.getAllAuditLogs();
            res.json(logs);
        }
        catch (error) {
            console.error('Erro ao listar audit logs:', error);
            res.status(500).json({ message: 'Erro ao listar histórico' });
        }
    });
    const httpServer = (0, http_1.createServer)(app);
    return httpServer;
}
