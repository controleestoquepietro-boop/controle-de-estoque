"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alimentosBackup20251105 = exports.alimentosBackfillReview = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.insertAuditLogSchema = exports.insertAlimentoSchema = exports.insertModeloProdutoSchema = exports.insertUserSchema = exports.auditLogRelations = exports.alimentosRelations = exports.usersRelations = exports.auditLog = exports.modelosProdutos = exports.alimentos = exports.users = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_2 = require("drizzle-orm");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
// Tabela de usuários
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    nome: (0, pg_core_1.text)("nome").notNull(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
    resetToken: (0, pg_core_1.text)("reset_token"),
    resetTokenExpiry: (0, pg_core_1.timestamp)("reset_token_expiry"),
    criadoEm: (0, pg_core_1.timestamp)("criado_em").defaultNow().notNull(), // ✅ campo certo
    // Cor visual do usuário (ex: "hsl(120 70% 40%)") — preenchida pelo servidor ao criar o usuário
    color: (0, pg_core_1.text)("color").notNull().unique(),
});
// Tabela de alimentos - REMOVIDO campo departamento
exports.alimentos = (0, pg_core_1.pgTable)("alimentos", {
    id: (0, pg_core_1.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
    codigoProduto: (0, pg_core_1.text)("codigo_produto").notNull(),
    nome: (0, pg_core_1.text)("nome").notNull(),
    unidade: (0, pg_core_1.text)("unidade").notNull(), // 'kg' ou 'caixa'
    lote: (0, pg_core_1.text)("lote").notNull(),
    dataFabricacao: (0, pg_core_1.text)("data_fabricacao").notNull(),
    dataValidade: (0, pg_core_1.text)("data_validade").notNull(),
    quantidade: (0, pg_core_1.real)("quantidade").notNull().default(0),
    pesoPorCaixa: (0, pg_core_1.real)("peso_por_caixa"),
    temperatura: (0, pg_core_1.text)("temperatura").notNull(),
    shelfLife: (0, pg_core_1.integer)("shelf_life").notNull(),
    dataEntrada: (0, pg_core_1.text)("data_entrada").notNull(),
    dataSaida: (0, pg_core_1.text)("data_saida"),
    categoria: (0, pg_core_1.varchar)('categoria', { length: 100 }),
    // Configurações de alertas como JSON
    alertasConfig: (0, pg_core_1.jsonb)("alertas_config").notNull().$type(),
    // Metadata
    cadastradoPor: (0, pg_core_1.varchar)("cadastrado_por").notNull().references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Tabela de modelos de produtos (template) - baseado na planilha Excel
exports.modelosProdutos = (0, pg_core_1.pgTable)("modelos_produtos", {
    id: (0, pg_core_1.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
    codigoProduto: (0, pg_core_1.text)("codigo_produto").notNull().unique(), // Z06_COD
    descricao: (0, pg_core_1.text)("descricao").notNull(), // Z06_DESC
    temperatura: (0, pg_core_1.text)("temperatura").notNull(), // Z06_ARMA
    shelfLife: (0, pg_core_1.integer)("shelf_life").notNull(), // Z06_PRAZO
    gtin: (0, pg_core_1.text)("gtin"), // Z06_GTIN - código de barras
    pesoEmbalagem: (0, pg_core_1.real)("peso_embalagem"), // Z06_TREMB
    pesoPorCaixa: (0, pg_core_1.real)("peso_por_caixa"), // Z06_TRCX
    empresa: (0, pg_core_1.text)("empresa"), // Z06_EMPRE
    pesoLiquido: (0, pg_core_1.real)("peso_liquido"), // Z06_PESOLI
    tipoPeso: (0, pg_core_1.text)("tipo_peso"), // Z06_TPPESO (V ou F)
    quantidadePorCaixa: (0, pg_core_1.integer)("quantidade_por_caixa"), // Z06_QTCX
    unidadePadrao: (0, pg_core_1.text)("unidade_padrao").notNull().default("kg"), // 'kg' ou 'caixa'
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    cadastradoPor: (0, pg_core_1.varchar)("cadastrado_por").notNull(),
    dataAtualizacao: (0, pg_core_1.timestamp)("data_atualizacao").defaultNow().notNull(),
});
// Tabela de auditoria para rastrear TODAS as operações
exports.auditLog = (0, pg_core_1.pgTable)("audit_log", {
    id: (0, pg_core_1.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
    alimentoId: (0, pg_core_1.integer)("alimento_id"), // Pode ser null se o alimento foi deletado
    alimentoCodigo: (0, pg_core_1.text)("alimento_codigo"), // Guardamos o código do produto para referência
    alimentoNome: (0, pg_core_1.text)("alimento_nome"), // Nome do alimento para referência
    action: (0, pg_core_1.text)("action").notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'SAIDA'
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id),
    userName: (0, pg_core_1.text)("user_name").notNull(),
    changes: (0, pg_core_1.jsonb)("changes"), // Detalhes das mudanças
    timestamp: (0, pg_core_1.timestamp)("timestamp").defaultNow().notNull(),
});
// Relações
exports.usersRelations = (0, drizzle_orm_2.relations)(exports.users, ({ many }) => ({
    alimentos: many(exports.alimentos),
    auditLogs: many(exports.auditLog),
}));
exports.alimentosRelations = (0, drizzle_orm_2.relations)(exports.alimentos, ({ one, many }) => ({
    cadastradoPor: one(exports.users, {
        fields: [exports.alimentos.cadastradoPor],
        references: [exports.users.id],
    }),
    auditLogs: many(exports.auditLog),
}));
exports.auditLogRelations = (0, drizzle_orm_2.relations)(exports.auditLog, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.auditLog.userId],
        references: [exports.users.id],
    }),
}));
// Schemas de inserção com validação de email REAL
exports.insertUserSchema = zod_1.z.object({
    email: zod_1.z.string().email("Digite um email válido").min(5, "Email deve ter pelo menos 5 caracteres"),
    password: zod_1.z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    nome: zod_1.z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});
exports.insertModeloProdutoSchema = (0, drizzle_zod_1.createInsertSchema)(exports.modelosProdutos).merge(zod_1.z.object({
    codigoProduto: zod_1.z.string().min(1, "Código do produto é obrigatório"),
    descricao: zod_1.z.string().min(1, "Descrição é obrigatória"),
    temperatura: zod_1.z.string().min(1, "Temperatura é obrigatória"),
    shelfLife: zod_1.z.number().positive("Shelf life deve ser maior que zero"),
    // Campos opcionais + aceitam null — use nullable().optional()
    gtin: zod_1.z.string().nullable().optional(),
    pesoEmbalagem: zod_1.z.number().nullable().optional(),
    pesoPorCaixa: zod_1.z.number().nullable().optional(),
    empresa: zod_1.z.string().nullable().optional(),
    pesoLiquido: zod_1.z.number().nullable().optional(),
    tipoPeso: zod_1.z.string().nullable().optional(),
    quantidadePorCaixa: zod_1.z.number().int().nullable().optional(),
    unidadePadrao: zod_1.z.enum(["kg", "caixa"]).default("kg"),
    // Esse é opcional no schema porque o servidor preenche
    cadastradoPor: zod_1.z.string().min(1, "Cadastrado por é obrigatório").optional(),
}));
// Schema de alimento SEM departamento
exports.insertAlimentoSchema = (0, drizzle_zod_1.createInsertSchema)(exports.alimentos).merge(zod_1.z.object({
    quantidade: zod_1.z.number().min(0, "Quantidade deve ser maior ou igual a 0"),
    shelfLife: zod_1.z.number().min(1, "Shelf life deve ser maior que 0"),
    pesoPorCaixa: zod_1.z.number().nullable().optional(),
    codigoProduto: zod_1.z.string().min(1, "Código do produto é obrigatório"),
    nome: zod_1.z.string().min(1, "Nome é obrigatório"),
    unidade: zod_1.z.enum(["kg", "caixa"], { errorMap: () => ({ message: "Unidade deve ser kg ou caixa" }) }),
    // Tornamos `lote` opcional no schema: em alguns fluxos de importação o lote pode não existir
    // O servidor preencherá um valor padrão caso esteja ausente.
    lote: zod_1.z.string().optional().nullable(),
    dataFabricacao: zod_1.z.string().min(1, "Data de fabricação é obrigatória"),
    dataValidade: zod_1.z.string().min(1, "Data de validade é obrigatória"),
    temperatura: zod_1.z.string().min(1, "Temperatura é obrigatória"),
    dataEntrada: zod_1.z.string().optional(),
    dataSaida: zod_1.z.string().nullable().optional(),
    alertasConfig: zod_1.z.object({
        contarAPartirFabricacaoDias: zod_1.z.number(),
        avisoQuandoUmTercoValidade: zod_1.z.boolean(),
        popUpNotificacoes: zod_1.z.boolean(),
    }),
    // ID do usuário que está criando o alimento (fornecido pelo servidor)
    // cadastradoPor é preenchido pelo servidor no endpoint /api/alimentos
    // tornamos opcional aqui para que o formulário no frontend não precise
    // enviar esse campo (o servidor adiciona `req.user.id` antes de validar)
    cadastradoPor: zod_1.z.string().min(1, "ID do usuário é obrigatório").optional(),
}));
exports.insertAuditLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.auditLog).merge(zod_1.z.object({
    action: zod_1.z.string().min(1, "Ação é obrigatória"),
    userId: zod_1.z.string().min(1, "ID do usuário é obrigatório"),
    userName: zod_1.z.string().min(1, "Nome do usuário é obrigatório"),
    alimentoId: zod_1.z.number().nullable().optional(),
    alimentoCodigo: zod_1.z.string().nullable().optional(),
    alimentoNome: zod_1.z.string().nullable().optional(),
    changes: zod_1.z.any().nullable().optional(),
    timestamp: zod_1.z.string().optional(),
}));
// Schema para login
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Digite um email válido"),
    password: zod_1.z.string().min(1, "Senha é obrigatória"),
});
// Schema para recuperação de senha
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email("Digite um email válido"),
});
// Schema para resetar senha
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, "Token é obrigatório"),
    newPassword: zod_1.z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
});
// Tabelas auxiliares/exportadas para refletir backups e backfills (conforme imagem no DB)
exports.alimentosBackfillReview = (0, pg_core_1.pgTable)("alimentos_backfill_review", {
    id: (0, pg_core_1.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
    originalData: (0, pg_core_1.jsonb)("original_data").notNull(),
    nota: (0, pg_core_1.text)("nota").default(''),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.alimentosBackup20251105 = (0, pg_core_1.pgTable)("alimentos_backup_20251105", {
    id: (0, pg_core_1.integer)("id").primaryKey().generatedAlwaysAsIdentity(),
    snapshot: (0, pg_core_1.jsonb)("snapshot").notNull(),
    importedFrom: (0, pg_core_1.text)("imported_from").default('backup'),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
