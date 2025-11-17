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
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
// Reference: javascript_database blueprint
require("dotenv/config");
const serverless_1 = require("@neondatabase/serverless");
const neon_serverless_1 = require("drizzle-orm/neon-serverless");
const schema = __importStar(require("../shared/schema"));
// ⚠️ IMPORTANTE: WebSocket causava erro 401 com Supabase
// Desabilitar WebSocket força o uso de HTTP (mais estável e seguro)
// neonConfig.webSocketConstructor = ws;
// Aceita certificados auto-assinados/expirados em dev/empacotado
// Em alguns ambientes (desenvolvimento/empacotado) precisamos aceitar
// certificados auto-assinados; a tipagem exposta pela biblioteca pode
// esperar um booleano — fazemos um cast para 'any' para manter o
// comportamento desejado sem quebrar a tipagem.
serverless_1.neonConfig.pipelineTLS = { rejectUnauthorized: false };
const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("SUPABASE_DB_URL or DATABASE_URL must be set. Did you forget to configure Supabase?");
}
// Opcionalmente usa um pool local se a conexão remota falhar
let pool;
try {
    pool = new serverless_1.Pool({ connectionString });
}
catch (e) {
    console.error('[db] Falha na conexão remota:', e);
    pool = new serverless_1.Pool({ connectionString: 'sqlite::memory:' }); // fallback local
}
exports.db = (0, neon_serverless_1.drizzle)({ client: pool, schema });
