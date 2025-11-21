"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const routes_1 = require("./routes");
const vite_1 = require("./vite");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
// 🔒 Confiar no proxy reverso (necessário para Render com HTTPS)
app.set('trust proxy', 1);
app.use((0, cors_1.default)({
    // Em produção, permitir explicitamente a origem do frontend (se configurada)
    // ou refletir a origem da requisição para permitir cookies quando FRONTEND_URL
    // não estiver presente (útil em setups com proxies e domínios dinâmicos).
    origin: (origin, callback) => {
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        const frontend = process.env.FRONTEND_URL;
        if (frontend && typeof origin === 'string' && origin === frontend) {
            return callback(null, true);
        }
        // Se não houver FRONTEND_URL definido, refletir a origem (aceitar)
        if (!frontend)
            return callback(null, true);
        // Caso contrário bloquear
        return callback(new Error('CORS origin denied'));
    },
    credentials: true, // 👈 Permite envio de cookies
}));
// Assegurar header de credenciais em todas as respostas (compatibilidade)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
});
// 🧩 Permite o Express ler cookies da requisição
app.use((0, cookie_parser_1.default)());
// Allow larger payloads for imports (Excel -> JSON arrays). Limit set for development and reasonable imports.
// Allow larger payloads for imports (Excel -> JSON arrays). Limit set higher for development imports.
app.use(express_1.default.json({
    limit: '25mb',
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express_1.default.urlencoded({ extended: false, limit: '25mb' }));
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse = undefined;
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
            let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
            if (capturedJsonResponse) {
                logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
            }
            if (logLine.length > 80) {
                logLine = logLine.slice(0, 79) + "…";
            }
            (0, vite_1.log)(logLine);
        }
    });
    next();
});
// Anti-cache middleware - evita servir assets antigos sem necessidade de hard-refresh
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});
(async () => {
    // TLS handling: prefer a secure CA via SUPABASE_DB_CA env var.
    // DO NOT set NODE_TLS_REJECT_UNAUTHORIZED globally in production.
    if (process.env.SUPABASE_DB_CA) {
        console.log('🔐 SUPABASE_DB_CA provided - using custom CA for DB TLS verification.');
    }
    else {
        console.log('⚠️ SUPABASE_DB_CA not provided - pool will use rejectUnauthorized=false (temporary).');
    }
    console.log('📍 Iniciando aplicação...');
    console.log('📍 Chamando registerRoutes...');
    const server = await (0, routes_1.registerRoutes)(app);
    console.log('📍 registerRoutes completado.');
    app.use((err, req, res, _next) => {
        console.error('=== ERRO NÃO TRATADO ===');
        console.error('Path:', req.path);
        console.error('Method:', req.method);
        console.error('Error:', err);
        console.error('Stack:', err.stack);
        console.error('Env:', {
            NODE_ENV: process.env.NODE_ENV,
            SUPABASE_URL: process.env.SUPABASE_URL ? '✓' : '✗',
            SUPABASE_KEY: process.env.SUPABASE_KEY ? '✓' : '✗',
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗'
        });
        console.error('=====================');
        res.status(500).json({
            error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor',
            path: req.path,
            timestamp: new Date().toISOString()
        });
    });
    if (process.env.NODE_ENV === "development") {
        console.log('📍 Modo desenvolvimento - setupVite...');
        await (0, vite_1.setupVite)(app, server);
    }
    else {
        console.log('📍 Modo produção - serveStatic...');
        const distPath = path_1.default.join(__dirname, "../public");
        console.log('📍 distPath:', distPath);
        // Configurar MIME types para arquivos estáticos
        app.use(express_1.default.static(distPath, {
            setHeaders: (res, filePath) => {
                if (filePath.endsWith('.js')) {
                    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                }
                else if (filePath.endsWith('.css')) {
                    res.setHeader('Content-Type', 'text/css; charset=utf-8');
                }
                else if (filePath.endsWith('.json')) {
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                }
                else if (filePath.endsWith('.woff2')) {
                    res.setHeader('Content-Type', 'font/woff2');
                }
                else if (filePath.endsWith('.woff')) {
                    res.setHeader('Content-Type', 'font/woff');
                }
                else if (filePath.endsWith('.ttf')) {
                    res.setHeader('Content-Type', 'font/ttf');
                }
                else if (filePath.endsWith('.svg')) {
                    res.setHeader('Content-Type', 'image/svg+xml');
                }
                else if (filePath.endsWith('.png')) {
                    res.setHeader('Content-Type', 'image/png');
                }
                else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
                    res.setHeader('Content-Type', 'image/jpeg');
                }
                else if (filePath.endsWith('.gif')) {
                    res.setHeader('Content-Type', 'image/gif');
                }
                else if (filePath.endsWith('.ico')) {
                    res.setHeader('Content-Type', 'image/x-icon');
                }
                else if (filePath.endsWith('.webp')) {
                    res.setHeader('Content-Type', 'image/webp');
                }
            }
        }));
        app.get("*", (req, res) => {
            // Se for uma requisição de API que não foi tratada, retornar 404
            if (req.path.startsWith('/api/')) {
                return res.status(404).json({ error: 'Rota de API não encontrada' });
            }
            // Caso contrário, servir o index.html para SPA routing
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.sendFile(path_1.default.join(distPath, "index.html"));
        });
        console.log('📍 serveStatic configurado.');
    }
    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    try {
        console.log('📍 Iniciando listener na porta...');
        const port = process.env.PORT ? Number(process.env.PORT) : 5000;
        server.listen(port, "0.0.0.0", () => {
            (0, vite_1.log)(`🚀 Servidor rodando em http://0.0.0.0:${port}`);
        });
    }
    catch (err) {
        console.error('Falha ao iniciar o servidor:', err);
        process.exit(1);
    }
})();
