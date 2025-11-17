import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { findAvailablePort } from "./port-manager";
import path from "path";

// Para CommonJS, __dirname já está disponível globalmente
// Mas TypeScript não reconhece, então criamos uma referência local
declare global {
  var __dirname: string;
  var __filename: string;
}

const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
  credentials: true,               // 👈 Permite envio de cookies
}));



// 🧩 Permite o Express ler cookies da requisição
app.use(cookieParser());

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
// Allow larger payloads for imports (Excel -> JSON arrays). Limit set for development and reasonable imports.
// Allow larger payloads for imports (Excel -> JSON arrays). Limit set higher for development imports.
app.use(express.json({
  limit: '25mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '25mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log('📍 Iniciando aplicação...');
  
  console.log('📍 Chamando registerRoutes...');
  const server = await registerRoutes(app);
  console.log('📍 registerRoutes completado.');

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
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
  await setupVite(app, server);
} else {
  console.log('📍 Modo produção - serveStatic...');
  const distPath = path.join(__dirname, "../public");
  console.log('📍 distPath:', distPath);

  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
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

server.listen(
  port,
  "0.0.0.0",
  () => {
    log(`🚀 Servidor rodando em http://0.0.0.0:${port}`);
  }
);

  } catch (err) {
    console.error('Falha ao iniciar o servidor:', err);
    process.exit(1);
  }

})();
