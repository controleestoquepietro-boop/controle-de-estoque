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
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    credentials: true, // 👈 Permite envio de cookies
}));
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
(async () => {
    const server = await (0, routes_1.registerRoutes)(app);
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
        await (0, vite_1.setupVite)(app, server);
    }
    else {
        const distPath = path_1.default.join(__dirname, "../public");
        app.use(express_1.default.static(distPath));
        app.get("*", (req, res) => {
            res.sendFile(path_1.default.join(distPath, "index.html"));
        });
    }
    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    try {
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
