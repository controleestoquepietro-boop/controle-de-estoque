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
const pg_1 = require("pg");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema = __importStar(require("../shared/schema"));
// Use native pg pooling - supports both direct and pooled connections
// This avoids WebSocket issues on Render which blocks outbound connections
let connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
// Keep port 5432 (TCP direct connection is fine for pg library)
// Pooling is handled by pg's native pool, not Supabase pooler
console.log('📍 Using TCP connection (port 5432) - pooling handled by pg library...');
if (!connectionString) {
    console.error('❌ SUPABASE_DB_URL or DATABASE_URL not configured');
    console.error('DATABASE_URL:', process.env.DATABASE_URL ? '✓' : '✗');
    console.error('SUPABASE_DB_URL:', process.env.SUPABASE_DB_URL ? '✓' : '✗');
    throw new Error('SUPABASE_DB_URL or DATABASE_URL must be set');
}
console.log('📍 Conectando ao banco de dados via TCP Pool (pg)...');
console.log('📍 Connection string configurado:', connectionString ? '✓' : '✗');
// Create native pg pool - doesn't use WebSocket
const pool = new pg_1.Pool({
    connectionString: connectionString,
    // Pool configuration to handle serverless environments
    max: 1, // Render/serverless doesn't support many concurrent connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
pool.on('error', (err) => {
    console.error('❌ Erro na pool PostgreSQL:', err);
});
// Drizzle ORM with pg pool
exports.db = (0, node_postgres_1.drizzle)(pool, { schema });
console.log('✅ Cliente PostgreSQL (pg pool) inicializado com sucesso');
