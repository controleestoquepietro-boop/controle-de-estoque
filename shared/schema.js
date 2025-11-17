import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
// Tabela de usuários
export const users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    nome: text("nome").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    resetToken: text("reset_token"),
    resetTokenExpiry: timestamp("reset_token_expiry"),
    criadoEm: timestamp("criado_em").defaultNow().notNull(), // ✅ campo certo
    // Cor visual do usuário (ex: "hsl(120 70% 40%)") — preenchida pelo servidor ao criar o usuário
    color: text("color").notNull().unique(),
});
// Tabela de alimentos - REMOVIDO campo departamento
export const alimentos = pgTable("alimentos", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    codigoProduto: text("codigo_produto").notNull(),
    nome: text("nome").notNull(),
    unidade: text("unidade").notNull(), // 'kg' ou 'caixa'
    lote: text("lote").notNull(),
    dataFabricacao: text("data_fabricacao").notNull(),
    dataValidade: text("data_validade").notNull(),
    quantidade: real("quantidade").notNull().default(0),
    pesoPorCaixa: real("peso_por_caixa"),
    temperatura: text("temperatura").notNull(),
    shelfLife: integer("shelf_life").notNull(),
    dataEntrada: text("data_entrada").notNull(),
    dataSaida: text("data_saida"),
    categoria: varchar('categoria', { length: 100 }),
    // Configurações de alertas como JSON
    alertasConfig: jsonb("alertas_config").notNull().$type(),
    // Metadata
    cadastradoPor: varchar("cadastrado_por").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
// Tabela de modelos de produtos (template) - baseado na planilha Excel
export const modelosProdutos = pgTable("modelos_produtos", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    codigoProduto: text("codigo_produto").notNull().unique(), // Z06_COD
    descricao: text("descricao").notNull(), // Z06_DESC
    temperatura: text("temperatura").notNull(), // Z06_ARMA
    shelfLife: integer("shelf_life").notNull(), // Z06_PRAZO
    gtin: text("gtin"), // Z06_GTIN - código de barras
    pesoEmbalagem: real("peso_embalagem"), // Z06_TREMB
    pesoPorCaixa: real("peso_por_caixa"), // Z06_TRCX
    empresa: text("empresa"), // Z06_EMPRE
    pesoLiquido: real("peso_liquido"), // Z06_PESOLI
    tipoPeso: text("tipo_peso"), // Z06_TPPESO (V ou F)
    quantidadePorCaixa: integer("quantidade_por_caixa"), // Z06_QTCX
    unidadePadrao: text("unidade_padrao").notNull().default("kg"), // 'kg' ou 'caixa'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    cadastradoPor: varchar("cadastrado_por").notNull(),
    dataAtualizacao: timestamp("data_atualizacao").defaultNow().notNull(),
});
// Tabela de auditoria para rastrear TODAS as operações
export const auditLog = pgTable("audit_log", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    alimentoId: integer("alimento_id"), // Pode ser null se o alimento foi deletado
    alimentoCodigo: text("alimento_codigo"), // Guardamos o código do produto para referência
    alimentoNome: text("alimento_nome"), // Nome do alimento para referência
    action: text("action").notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'SAIDA'
    userId: varchar("user_id").notNull().references(() => users.id),
    userName: text("user_name").notNull(),
    changes: jsonb("changes"), // Detalhes das mudanças
    timestamp: timestamp("timestamp").defaultNow().notNull(),
});
// Relações
export const usersRelations = relations(users, ({ many }) => ({
    alimentos: many(alimentos),
    auditLogs: many(auditLog),
}));
export const alimentosRelations = relations(alimentos, ({ one, many }) => ({
    cadastradoPor: one(users, {
        fields: [alimentos.cadastradoPor],
        references: [users.id],
    }),
    auditLogs: many(auditLog),
}));
export const auditLogRelations = relations(auditLog, ({ one }) => ({
    user: one(users, {
        fields: [auditLog.userId],
        references: [users.id],
    }),
}));
// Schemas de inserção com validação de email REAL
export const insertUserSchema = createInsertSchema(users).merge(z.object({
    email: z.string().email("Digite um email válido").min(5, "Email deve ter pelo menos 5 caracteres"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
}));
export const insertModeloProdutoSchema = createInsertSchema(modelosProdutos).merge(z.object({
    codigoProduto: z.string().min(1, "Código do produto é obrigatório"),
    descricao: z.string().min(1, "Descrição é obrigatória"),
    temperatura: z.string().min(1, "Temperatura é obrigatória"),
    shelfLife: z.number().positive("Shelf life deve ser maior que zero"),
    // Campos opcionais + aceitam null — use nullable().optional()
    gtin: z.string().nullable().optional(),
    pesoEmbalagem: z.number().nullable().optional(),
    pesoPorCaixa: z.number().nullable().optional(),
    empresa: z.string().nullable().optional(),
    pesoLiquido: z.number().nullable().optional(),
    tipoPeso: z.string().nullable().optional(),
    quantidadePorCaixa: z.number().int().nullable().optional(),
    unidadePadrao: z.enum(["kg", "caixa"]).default("kg"),
    // Esse é opcional no schema porque o servidor preenche
    cadastradoPor: z.string().min(1, "Cadastrado por é obrigatório").optional(),
}));
// Schema de alimento SEM departamento
export const insertAlimentoSchema = createInsertSchema(alimentos).merge(z.object({
    quantidade: z.number().min(0, "Quantidade deve ser maior ou igual a 0"),
    shelfLife: z.number().min(1, "Shelf life deve ser maior que 0"),
    pesoPorCaixa: z.number().nullable().optional(),
    codigoProduto: z.string().min(1, "Código do produto é obrigatório"),
    nome: z.string().min(1, "Nome é obrigatório"),
    unidade: z.enum(["kg", "caixa"], { errorMap: () => ({ message: "Unidade deve ser kg ou caixa" }) }),
    // Tornamos `lote` opcional no schema: em alguns fluxos de importação o lote pode não existir
    // O servidor preencherá um valor padrão caso esteja ausente.
    lote: z.string().optional().nullable(),
    dataFabricacao: z.string().min(1, "Data de fabricação é obrigatória"),
    dataValidade: z.string().min(1, "Data de validade é obrigatória"),
    temperatura: z.string().min(1, "Temperatura é obrigatória"),
    dataEntrada: z.string().optional(),
    dataSaida: z.string().nullable().optional(),
    alertasConfig: z.object({
        contarAPartirFabricacaoDias: z.number(),
        avisoQuandoUmTercoValidade: z.boolean(),
        popUpNotificacoes: z.boolean(),
    }),
    // ID do usuário que está criando o alimento (fornecido pelo servidor)
    // cadastradoPor é preenchido pelo servidor no endpoint /api/alimentos
    // tornamos opcional aqui para que o formulário no frontend não precise
    // enviar esse campo (o servidor adiciona `req.user.id` antes de validar)
    cadastradoPor: z.string().min(1, "ID do usuário é obrigatório").optional(),
}));
export const insertAuditLogSchema = createInsertSchema(auditLog).merge(z.object({
    action: z.string().min(1, "Ação é obrigatória"),
    userId: z.string().min(1, "ID do usuário é obrigatório"),
    userName: z.string().min(1, "Nome do usuário é obrigatório"),
    alimentoId: z.number().nullable().optional(),
    alimentoCodigo: z.string().nullable().optional(),
    alimentoNome: z.string().nullable().optional(),
    changes: z.any().nullable().optional(),
    timestamp: z.string().optional(),
}));
// Schema para login
export const loginSchema = z.object({
    email: z.string().email("Digite um email válido"),
    password: z.string().min(1, "Senha é obrigatória"),
});
// Schema para recuperação de senha
export const forgotPasswordSchema = z.object({
    email: z.string().email("Digite um email válido"),
});
// Schema para resetar senha
export const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token é obrigatório"),
    newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
});
// Tabelas auxiliares/exportadas para refletir backups e backfills (conforme imagem no DB)
export const alimentosBackfillReview = pgTable("alimentos_backfill_review", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    originalData: jsonb("original_data").notNull(),
    nota: text("nota").default(''),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const alimentosBackup20251105 = pgTable("alimentos_backup_20251105", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    snapshot: jsonb("snapshot").notNull(),
    importedFrom: text("imported_from").default('backup'),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
