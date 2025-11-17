"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
exports.setupVite = setupVite;
exports.serveStatic = serveStatic;
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Em ambientes diferentes (CJS/TSX) `import.meta.dirname` pode ser undefined.
// Usamos `process.cwd()` como fallback para resolver caminhos relativos ao
// diretório raiz do projeto.
const PROJECT_ROOT = process.cwd();
// Note: we avoid importing `vite` or the `vite.config` at module load time so
// the production bundle (packaged app) doesn't try to require 'vite' which
// is not present in the packaged runtime. The imports are performed lazily
// inside `setupVite` when running in development.
let viteLogger = null;
function log(message, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app, server) {
    const serverOptions = {
        middlewareMode: true,
        hmr: { server },
        allowedHosts: true,
    };
    // Import vite and vite.config lazily so requiring the server bundle in
    // production doesn't throw if 'vite' isn't installed.
    const { createServer: createViteServer, createLogger } = require("vite");
    viteLogger = createLogger();
    // Load vite config dynamically; it may be a function (factory) or an object.
    // We use require so the config file is only evaluated in dev.
    let viteConfig;
    try {
        viteConfig = require("../vite.config");
        viteConfig = viteConfig && viteConfig.__esModule ? viteConfig.default : viteConfig;
    }
    catch (err) {
        viteConfig = {};
    }
    const resolvedViteConfig = typeof viteConfig === "function" ? await viteConfig() : viteConfig;
    const vite = await createViteServer({
        ...resolvedViteConfig,
        configFile: false,
        customLogger: {
            ...viteLogger,
            error: (msg, options) => {
                viteLogger.error(msg, options);
                process.exit(1);
            },
        },
        server: serverOptions,
        appType: "custom",
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
        const url = req.originalUrl;
        try {
            const clientTemplate = path_1.default.resolve(PROJECT_ROOT, "client", "index.html");
            // always reload the index.html file from disk incase it changes
            let template = await fs_1.default.promises.readFile(clientTemplate, "utf-8");
            // Use an internal, dependency-free id generator to avoid runtime
            // require() calls inside the packaged app which may fail if optional
            // modules are not present. This uses the built-in `crypto` module and
            // falls back to a timestamp when necessary.
            let nanoidFn = () => {
                try {
                    const crypto = require('crypto');
                    return crypto
                        .randomBytes(6)
                        .toString('base64')
                        .replace(/[^A-Za-z0-9]/g, '')
                        .slice(0, 8);
                }
                catch (e) {
                    return Date.now().toString(36);
                }
            };
            template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoidFn()}"`);
            const page = await vite.transformIndexHtml(url, template);
            res.status(200).set({ "Content-Type": "text/html" }).end(page);
        }
        catch (e) {
            vite.ssrFixStacktrace(e);
            next(e);
        }
    });
}
function serveStatic(app) {
    const distPath = path_1.default.resolve(PROJECT_ROOT, "dist", "public");
    if (!fs_1.default.existsSync(distPath)) {
        throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
    }
    app.use(express_1.default.static(distPath));
    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
        res.sendFile(path_1.default.resolve(distPath, "index.html"));
    });
}
