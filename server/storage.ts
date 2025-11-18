// Reference: javascript_database blueprint
import { users, alimentos, auditLog, modelosProdutos, type User, type InsertUser, type Alimento, type InsertAlimento, type AuditLog, type InsertAuditLog, type ModeloProduto, type InsertModeloProduto } from "../shared/schema";
import { db } from "./db";
import fs from 'fs';
import path from 'path';
import { eq, desc } from "drizzle-orm";
import { supabase, isSupabaseReachable, supabaseService } from './supabaseClient';

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  // Modelos de Produtos
  getAllModelosProdutos(): Promise<ModeloProduto[]>;
  getModeloProdutoByCodigo(codigo: string): Promise<ModeloProduto | undefined>;
  createModeloProduto(modelo: InsertModeloProduto): Promise<ModeloProduto>;
  updateModeloProduto(id: number, modelo: Partial<InsertModeloProduto>): Promise<ModeloProduto | undefined>;
  deleteModeloProduto(id: number): Promise<boolean>;

  // Alimentos
  getAllAlimentos(): Promise<Alimento[]>;
  getAlimento(id: number): Promise<Alimento | undefined>;
  createAlimento(alimento: InsertAlimento, userId: string): Promise<Alimento>;
  updateAlimento(id: number, alimento: Partial<InsertAlimento>): Promise<Alimento | undefined>;
  deleteAlimento(id: number): Promise<boolean>;
  registrarSaida(id: number, quantidade: number): Promise<Alimento | undefined>;

  // Audit Log
  getAllAuditLogs(): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  private pendingFilePath: string;
  private processingPending = false;

  constructor() {
    this.pendingFilePath = path.join(__dirname, '..', 'pending-sync.json');
    this.ensurePendingFile().catch(() => {});
    this.processPendingQueue().catch(() => {});
    this.startPendingSyncScheduler();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    return result;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Gera uma cor única para o usuário e persiste no banco
    const generateUniqueColor = async (): Promise<string> => {
      for (let i = 0; i < 50; i++) {
        const hue = Math.floor(Math.random() * 360);
        const color = `hsl(${hue} 70% 40%)`;
        const [exists] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.color, color));
        if (!exists) return color;
      }
      // fallback determinístico
      return `hsl(${Date.now() % 360} 70% 40%)`;
    };

    const user = await db
      .insert(users)
      .values({ ...insertUser, color: await generateUniqueColor() } as any)
      .returning()
      .then(([u]) => u);

    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, createdAt: undefined } as any)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Modelos de Produtos
  async getAllModelosProdutos(): Promise<ModeloProduto[]> {
    const result = await db.select().from(modelosProdutos).orderBy(desc(modelosProdutos.createdAt));
    return result;
  }

  async getModeloProdutoByCodigo(codigo: string): Promise<ModeloProduto | undefined> {
    const [modelo] = await db.select().from(modelosProdutos).where(eq(modelosProdutos.codigoProduto, codigo));
    return modelo || undefined;
  }

  async createModeloProduto(insertModelo: InsertModeloProduto): Promise<ModeloProduto> {
    const [modelo] = await db
      .insert(modelosProdutos)
      .values({ ...insertModelo, cadastradoPor: insertModelo.cadastradoPor || 'SISTEMA' } as any)
      .returning();
    return modelo;
  }

  async updateModeloProduto(id: number, data: Partial<InsertModeloProduto>): Promise<ModeloProduto | undefined> {
    const [modelo] = await db
      .update(modelosProdutos)
      .set(data)
      .where(eq(modelosProdutos.id, id))
      .returning();
    return modelo || undefined;
  }

  async deleteModeloProduto(id: number): Promise<boolean> {
    const result = await db.delete(modelosProdutos).where(eq(modelosProdutos.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Alimentos
  async getAllAlimentos(): Promise<Alimento[]> {
    const result = await db.select().from(alimentos).orderBy(desc(alimentos.createdAt));
    return result;
  }

  async getAlimento(id: number): Promise<Alimento | undefined> {
    const [alimento] = await db.select().from(alimentos).where(eq(alimentos.id, id));
    return alimento || undefined;
  }

  async createAlimento(alimento: InsertAlimento, userId: string): Promise<Alimento> {
    try {
      // 1. Garantir usuário no Supabase (best effort)
      let supabaseUserId = userId;
      try {
        const resolved = await this.ensureUserInSupabase(userId);
        if (resolved) supabaseUserId = resolved;
      } catch (err) {
        console.warn('Falha ao garantir usuário no Supabase:', (err as any)?.message || err);
      }

      // 2. Montar payload para Supabase
      const supabasePayload = {
        nome: alimento.nome,
        codigo_produto: (alimento as any).codigoProduto,
        temperatura: alimento.temperatura,
        quantidade: alimento.quantidade || 0,
        unidade: alimento.unidade,
        lote: alimento.lote || 'LOTE-01',
        data_fabricacao: alimento.dataFabricacao,
        data_validade: alimento.dataValidade,
        data_entrada: alimento.dataEntrada,
        data_saida: null,
        cadastrado_por: supabaseUserId,
        shelf_life: alimento.shelfLife,
        peso_por_caixa: alimento.pesoPorCaixa,
        alertas_config: alimento.alertasConfig,
      };

      // 3. Tentar inserir no Supabase PRIMEIRO (Supabase-first)
      const isReachable = await isSupabaseReachable(2000);
      if (isReachable) {
        try {
          const { data: supaAlimento, error: supaError } = await supabase
            .from('alimentos')
            .insert(supabasePayload)
            .select()
            .maybeSingle();

          if (supaError) {
            console.warn('⚠️ Erro ao inserir no Supabase:', supaError.message);
          } else if (supaAlimento) {
            // Inserir no DB local para manter cache local
            const localObj: any = {
              nome: supaAlimento.nome,
              codigoProduto: supaAlimento.codigo_produto,
              unidade: supaAlimento.unidade,
              lote: supaAlimento.lote,
              dataFabricacao: supaAlimento.data_fabricacao,
              dataValidade: supaAlimento.data_validade,
              quantidade: supaAlimento.quantidade || 0,
              pesoPorCaixa: supaAlimento.peso_por_caixa,
              temperatura: supaAlimento.temperatura,
              shelfLife: supaAlimento.shelf_life,
              dataEntrada: supaAlimento.data_entrada,
              dataSaida: supaAlimento.data_saida,
              categoria: supaAlimento.categoria,
              alertasConfig: supaAlimento.alertas_config,
              cadastradoPor: supaAlimento.cadastrado_por,
            };

            try {
              const [dbInserted] = await db.insert(alimentos).values(localObj as any).returning();
              const result = {
                ...dbInserted,
                codigoProduto: (dbInserted as any).codigo_produto || localObj.codigoProduto,
              } as Alimento;
              return result;
            } catch (dbErr) {
              console.warn('⚠️ Inserido em Supabase mas falha ao inserir localmente (cache):', dbErr);
              // Retornar a versão do Supabase mesmo se falhar localmente
              return {
                id: 999,
                nome: supaAlimento.nome,
                codigoProduto: supaAlimento.codigo_produto,
                unidade: supaAlimento.unidade,
                lote: supaAlimento.lote,
                dataFabricacao: supaAlimento.data_fabricacao,
                dataValidade: supaAlimento.data_validade,
                quantidade: supaAlimento.quantidade || 0,
                pesoPorCaixa: supaAlimento.peso_por_caixa,
                temperatura: supaAlimento.temperatura,
                shelfLife: supaAlimento.shelf_life,
                dataEntrada: supaAlimento.data_entrada,
                dataSaida: supaAlimento.data_saida,
                categoria: supaAlimento.categoria,
                alertasConfig: supaAlimento.alertas_config,
                cadastradoPor: supaAlimento.cadastrado_por,
                createdAt: new Date(),
              } as Alimento;
            }
          }
        } catch (supaErr) {
          console.warn('⚠️ Erro ao chamar Supabase:', supaErr);
        }
      } else {
        console.warn('⚠️ Supabase não alcançável — salvando localmente e agendando sync');
      }

      // 4. Se não conseguiu inserir no Supabase (offline ou erro), inserir localmente e agendar sync
      const localAlimento: Alimento = {
        id: Math.max(1, Math.floor(Math.random() * 1000000)),
        ...alimento,
        cadastradoPor: supabaseUserId,
        createdAt: new Date(),
      } as any;

      try {
        const [dbInserted] = await db.insert(alimentos).values(localAlimento as any).returning();
        const result = {
          ...dbInserted,
          codigoProduto: (dbInserted as any).codigo_produto || (localAlimento as any).codigoProduto,
        } as Alimento;

        // Agendar sincronização com Supabase
        await this.addPendingToSync({ payload: supabasePayload, localId: result.id });
        console.log('✅ Alimento criado localmente, sincronização agendada');
        return result;
      } catch (dbErr) {
        console.warn('⚠️ Falha ao inserir localmente:', dbErr);
        throw new Error('Não foi possível criar o alimento');
      }
    } catch (e) {
      console.error('❌ Erro ao criar alimento:', e);
      throw e;
    }
  }

  // --- Pending sync helpers ---
  private async ensurePendingFile(): Promise<void> {
    try {
      if (!fs.existsSync(this.pendingFilePath)) {
        fs.writeFileSync(this.pendingFilePath, JSON.stringify([]), 'utf8');
      }
    } catch (e) {
      console.warn('Falha ao criar arquivo pending-sync:', e);
    }
  }

  private async readPendingFromFile(): Promise<any[]> {
    await this.ensurePendingFile();
    try {
      const raw = fs.readFileSync(this.pendingFilePath, 'utf8');
      return JSON.parse(raw || '[]');
    } catch (e) {
      console.warn('Falha ao ler pending-sync.json:', e);
      return [];
    }
  }

  private async writePendingToFile(items: any[]): Promise<void> {
    await this.ensurePendingFile();
    try {
      fs.writeFileSync(this.pendingFilePath, JSON.stringify(items, null, 2), 'utf8');
    } catch (e) {
      console.warn('Falha ao gravar pending-sync.json:', e);
    }
  }

  private async addPendingToSync(item: any): Promise<void> {
    try {
      const arr = await this.readPendingFromFile();
      arr.push({ ...item, createdAt: new Date().toISOString() });
      await this.writePendingToFile(arr);
      console.log('📋 Item adicionado à fila de sync pendente');
    } catch (e) {
      console.warn('Falha ao adicionar item pendente:', e);
    }
  }

  private async processPendingQueue(): Promise<void> {
    if (this.processingPending) return;
    this.processingPending = true;
    try {
      const reachable = await isSupabaseReachable(2000);
      if (!reachable) {
        console.log('⏳ Supabase não alcançável ainda — fila aguardando conexão');
        return;
      }

      const pending = await this.readPendingFromFile();
      if (!pending || pending.length === 0) return;

      console.log(`🔄 Processando ${pending.length} item(ns) pendente(s)...`);
      const remaining: any[] = [];

      for (const p of pending) {
        try {
          const { data, error } = await supabase
            .from('alimentos')
            .insert(p.payload)
            .select()
            .maybeSingle();

          if (error) {
            console.warn('❌ Falha ao sincronizar pendente:', error.message);
            remaining.push(p);
          } else {
            console.log('✅ Sincronizado pendente:', data?.id || 'ok');
          }
        } catch (e) {
          console.warn('❌ Erro ao sincronizar pendente:', e);
          remaining.push(p);
        }
      }

      await this.writePendingToFile(remaining);
      if (remaining.length < pending.length) {
        console.log(`✅ ${pending.length - remaining.length} item(ns) sincronizado(s), ${remaining.length} pendente(s)`);
      }
    } catch (e) {
      console.warn('Erro ao processar fila pendente:', e);
    } finally {
      this.processingPending = false;
    }
  }

  private startPendingSyncScheduler(): void {
    try {
      setInterval(() => this.processPendingQueue().catch(err => console.warn('Erro no scheduler pending:', err)), 10000);
      console.log('✅ Scheduler de sincronização pendente iniciado (10s)');
    } catch (e) {
      console.warn('Falha ao iniciar scheduler:', e);
    }
  }

  async updateAlimento(id: number, data: Partial<InsertAlimento>): Promise<Alimento | undefined> {
    // Construímos explicitamente o objeto de atualização para evitar passar
    // propriedades inesperadas ou undefined para o driver do banco.
    const updateFields: Partial<Record<string, any>> = {};
    if (data.codigoProduto !== undefined) updateFields.codigoProduto = data.codigoProduto;
    if (data.nome !== undefined) updateFields.nome = data.nome;
    if (data.unidade !== undefined) updateFields.unidade = data.unidade;
    if (data.lote !== undefined) updateFields.lote = data.lote;
    if (data.dataFabricacao !== undefined) updateFields.dataFabricacao = data.dataFabricacao;
    if (data.dataValidade !== undefined) updateFields.dataValidade = data.dataValidade;
    if (data.quantidade !== undefined) updateFields.quantidade = data.quantidade;
    if (data.pesoPorCaixa !== undefined) updateFields.pesoPorCaixa = data.pesoPorCaixa;
    if (data.temperatura !== undefined) updateFields.temperatura = data.temperatura;
    if (data.shelfLife !== undefined) updateFields.shelfLife = data.shelfLife;
    if (data.dataEntrada !== undefined) updateFields.dataEntrada = data.dataEntrada;
    if (data.dataSaida !== undefined) updateFields.dataSaida = data.dataSaida;
    if (data.alertasConfig !== undefined) updateFields.alertasConfig = data.alertasConfig;

    const [alimento] = await db
      .update(alimentos)
      .set({
        ...(updateFields as any),
        updatedAt: new Date(),
      })
      .where(eq(alimentos.id, id))
      .returning();

    return alimento || undefined;
  }

  async deleteAlimento(id: number): Promise<boolean> {
    const result = await db.delete(alimentos).where(eq(alimentos.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Ensure the user exists in Supabase `users` table. If missing, upsert using
  // local DB info. This prevents FK constraint failures when inserting alimentos.
  private async ensureUserInSupabase(userId: string): Promise<string | undefined> {
    try {
      // 1. Tentar encontrar por ID no Supabase (caso comum)
      const { data: idMatch, error: idError } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle();

      if (idError) {
        console.warn('⚠️ Erro ao buscar usuário por ID no Supabase:', idError);
      } else if (idMatch) {
        console.log('✅ Usuário já existe no Supabase com ID:', idMatch.id);
        return idMatch.id;
      }

      // 2. Se não achou por ID, buscar dados locais
      const local = await this.getUser(userId);
      if (!local?.email) {
        console.error('❌ Usuário não encontrado localmente:', userId);
        return undefined;
      }

      // 3. Tentar encontrar por email no Supabase
      const { data: emailMatch, error: emailError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', local.email)
        .maybeSingle();

      if (emailError) {
        console.warn('⚠️ Erro ao buscar usuário por email no Supabase:', emailError);
      }

      // Se encontrou por email, retornar o ID existente
      if (emailMatch) {
        console.log('✅ Usuário encontrado no Supabase por email, ID:', emailMatch.id);
        return emailMatch.id;
      }

      // 4. Não encontrou, criar novo registro
      const payload: any = {
        id: userId,
        nome: local.nome,
        email: local.email,
        criado_em: new Date().toISOString(),
        color: local.color,
      };

      // Usar service-role client para upsert administrativo (evita problemas RLS)
      const { supabaseService } = require('./supabaseClient');
      const svc = supabaseService || supabase;

      const { data: created, error: insertErr } = await svc
        .from('users')
        .upsert([payload], { 
          onConflict: 'email',
          ignoreDuplicates: true 
        })
        .select()
        .maybeSingle();

      if (insertErr) {
        console.error('❌ Erro ao inserir usuário no Supabase:', insertErr);
        return undefined;
      } 
      
      if (created) {
        console.log('✅ Usuário criado/atualizado no Supabase com ID:', created.id);
        return created.id;
      }

      // 5. Se o upsert não retornou dados, buscar novamente por email
      const { data: finalCheck } = await supabase
        .from('users')
        .select('id')
        .eq('email', local.email)
        .maybeSingle();

      if (finalCheck) {
        console.log('✅ Usuário confirmado no Supabase após upsert, ID:', finalCheck.id);
        return finalCheck.id;
      }

      console.error('❌ Falha ao criar/encontrar usuário no Supabase');
      return undefined;

    } catch (e) {
      console.warn('⚠️ Falha ao garantir usuário no Supabase:', e);
      return undefined;
    }
  }

  async registrarSaida(id: number, quantidade: number): Promise<Alimento | undefined> {
    const alimento = await this.getAlimento(id);
    if (!alimento) return undefined;

    const novaQuantidade = Math.max(0, alimento.quantidade - quantidade);
    const dataSaida = novaQuantidade === 0 ? new Date().toISOString().split('T')[0] : alimento.dataSaida;

    const [updated] = await db
      .update(alimentos)
      .set({
        quantidade: novaQuantidade,
        dataSaida: dataSaida || undefined,
        updatedAt: new Date(),
      } as any)
      .where(eq(alimentos.id, id))
      .returning();

    return updated || undefined;
  }

  // Audit Log
  async getAllAuditLogs(): Promise<AuditLog[]> {
    const result = await db.select({
      id: auditLog.id,
      alimentoId: auditLog.alimentoId,
      alimentoCodigo: auditLog.alimentoCodigo,
      alimentoNome: auditLog.alimentoNome,
      action: auditLog.action,
      userId: auditLog.userId,
      userName: auditLog.userName,
      changes: auditLog.changes,
      timestamp: auditLog.timestamp,
      userColor: users.color,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .orderBy(desc(auditLog.timestamp))
    .limit(200);

    return result as any;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    // Inserir localmente primeiro (fonte de verdade do servidor)
    const [auditEntry] = await db
      .insert(auditLog)
      .values(log as any)
      .returning();

    // Tentar sincronizar com Supabase em background usando service-role
    (async () => {
      try {
        if (!(await isSupabaseReachable())) return;

        const payload: any = {
          alimento_id: log.alimentoId || null,
          alimento_codigo: log.alimentoCodigo || null,
          alimento_nome: log.alimentoNome || null,
          action: log.action,
          user_id: log.userId || null,
          user_name: log.userName || null,
          changes: log.changes || null,
          timestamp: (log as any).timestamp || new Date().toISOString(),
        };

        try {
          const svc = supabaseService || supabase;
          const { data: inserted, error } = await svc.from('audit_log').insert([payload]).select().maybeSingle();
          if (error) {
            console.warn('DatabaseStorage: falha ao sincronizar audit_log com Supabase:', error.message || error);
            return;
          }

          if (inserted) {
            // Atualizar o registro local com id/timestamp retornados quando possível
            try {
              await db.update(auditLog).set({ id: inserted.id, timestamp: inserted.timestamp } as any).where(eq(auditLog.id, (auditEntry as any).id));
            } catch (e) {
              // não crítico
              console.warn('DatabaseStorage: falha ao atualizar id/timestamp local após sync:', e);
            }
          }
        } catch (e) {
          console.warn('DatabaseStorage: erro ao tentar gravar audit_log no Supabase:', e);
        }
      } catch (e) {
        // swallow — não bloquear a escrita local por problemas de sync
      }
    })();

    return auditEntry;
  }
}

// Simple in-memory storage for development (no external DB).
class InMemoryStorage implements IStorage {
  private users: User[] = [];
  private modelos: ModeloProduto[] = [];
  private alimentos: Alimento[] = [];
  private logs: AuditLog[] = [];

  // Counter para gerar IDs consistentes
  private nextId = 1;

  // Ao instanciar, iniciar um carregamento assíncrono (bootstrap)
  // dos dados existentes no Supabase para que o storage em memória
  // reflita o que já existe remotamente durante o desenvolvimento.
  constructor() {
    // não aguardar (não-bloqueante). Em endpoints críticos podemos aguardar
    // manualmente `storageReadyPromise` se desejarmos garantir que os dados
    // foram carregados antes de responder.
    // DESATIVADO: bootstrap().catch(...) causava WebSocket errors em Render
    console.log('InMemoryStorage: inicializado sem bootstrap automático (Render não suporta WebSocket)');
    this.storageReadyPromise = Promise.resolve();
  }

  // Promise pública opcional que pode ser aguardada por quem importar o storage
  // (não exportada aqui, mas útil para debugging). Mantemos como campo privado
  // para futura extensão.
  private storageReadyPromise: Promise<void> | null = null;

  private async bootstrap() {
    // evita múltiplos bootstraps concorrentes
    if (this.storageReadyPromise) return this.storageReadyPromise;

    this.storageReadyPromise = (async () => {
      try {
        console.log('InMemoryStorage: iniciando bootstrap a partir do Supabase...');

        // Carregar usuários
        const { data: supaUsers, error: usersErr } = await supabase.from('users').select('*');
        if (usersErr) {
          console.warn('InMemoryStorage: erro ao carregar users do Supabase:', usersErr.message || usersErr);
        } else if (supaUsers && Array.isArray(supaUsers)) {
          this.users = supaUsers.map((u: any) => ({
            id: u.id,
            nome: u.nome || '',
            email: u.email || '',
            password: u.password || '',
            color: u.color || '',
            criadoEm: u.criado_em ? new Date(u.criado_em) : new Date(),
            resetToken: null,
            resetTokenExpiry: null,
          } as User));
          console.log(`InMemoryStorage: carregados ${this.users.length} users do Supabase`);
        }

          // Em ambiente de desenvolvimento, garantir que exista um usuário administrador
          // local chamado `adm` para facilitar testes sem dependências de email real.
          try {
            const adminExists = this.users.find(u => u.nome === 'adm' || u.email === 'adm@dev.local');
            if (!adminExists) {
              console.log('InMemoryStorage: criando usuário administrador local `adm` (dev)');
              await this.createUser({ id: 'adm', nome: 'adm', email: 'adm@dev.local', password: 'adm123' } as any);
            }
          } catch (e) {
            console.warn('InMemoryStorage: falha ao criar usuário adm local:', e);
          }

        // Carregar alimentos
        const { data: supaAlimentos, error: alimentosErr } = await supabase.from('alimentos').select('*');
        if (alimentosErr) {
          console.warn('InMemoryStorage: erro ao carregar alimentos do Supabase:', alimentosErr.message || alimentosErr);
        } else if (supaAlimentos && Array.isArray(supaAlimentos)) {
          this.alimentos = supaAlimentos.map((r: any) => ({
            id: r.id,
            codigoProduto: r.codigo_produto,
            nome: r.nome,
            unidade: r.unidade,
            lote: r.lote,
            dataFabricacao: r.data_fabricacao,
            dataValidade: r.data_validade,
            quantidade: r.quantidade ?? 0,
            pesoPorCaixa: r.peso_por_caixa,
            temperatura: r.temperatura,
            shelfLife: r.shelf_life,
            dataEntrada: r.data_entrada,
            dataSaida: r.data_saida,
            categoria: r.categoria,
            alertasConfig: r.alertas_config,
            cadastradoPor: r.cadastrado_por,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          } as Alimento));

          // Ajustar nextId para não colidir com IDs existentes
          const maxId = this.alimentos.reduce((mx, a) => Math.max(mx, Number(a.id || 0)), 0);
          this.nextId = Math.max(this.nextId, maxId + 1);

          console.log(`InMemoryStorage: carregados ${this.alimentos.length} alimentos do Supabase (nextId=${this.nextId})`);
        }

        // Carregar audit logs opcionalmente e mapear campos para camelCase
        const { data: supaLogs, error: logsErr } = await supabase.from('audit_log').select('*');
        if (logsErr) {
          // não crítico
        } else if (supaLogs && Array.isArray(supaLogs)) {
          this.logs = supaLogs.map((l: any) => ({
            id: l.id,
            alimentoId: l.alimento_id ?? l.alimentoId,
            alimentoCodigo: l.alimento_codigo ?? l.alimentoCodigo,
            alimentoNome: l.alimento_nome ?? l.alimentoNome,
            action: l.action,
            userId: l.user_id ?? l.userId,
            userName: l.user_name ?? l.userName,
            changes: l.changes ?? l.changes,
            timestamp: l.timestamp,
            userColor: l.user_color ?? l.userColor,
          } as AuditLog));
          console.log(`InMemoryStorage: carregados ${this.logs.length} audit logs do Supabase`);
        }

        // Carregar modelos de produtos (para permitir auto-fill após reiniciar o servidor)
        try {
          const { data: supaModelos, error: modelosErr } = await supabase.from('modelos_produtos').select('*');
          if (modelosErr) {
            console.warn('InMemoryStorage: erro ao carregar modelos do Supabase:', modelosErr.message || modelosErr);
          } else if (supaModelos && Array.isArray(supaModelos)) {
            this.modelos = supaModelos.map((m: any) => ({
              id: m.id,
              codigoProduto: m.codigo_produto ?? m.codigoProduto,
              descricao: m.descricao ?? m.descricao,
              temperatura: m.temperatura ?? m.temperatura,
              shelfLife: m.shelf_life ?? m.shelfLife,
              unidadePadrao: m.unidade_padrao ?? m.unidadePadrao,
              pesoPorCaixa: m.peso_por_caixa ?? m.pesoPorCaixa,
              gtin: m.gtin ?? m.gtin,
              pesoEmbalagem: m.peso_embalagem ?? m.pesoEmbalagem,
              empresa: m.empresa ?? m.empresa,
              createdAt: m.created_at || new Date(),
              dataAtualizacao: m.updated_at || null,
            } as ModeloProduto));
            console.log(`InMemoryStorage: carregados ${this.modelos.length} modelos de produtos do Supabase`);
            // ajustar nextId para evitar colisões com modelos carregados
            const maxModeloId = this.modelos.reduce((mx, it) => Math.max(mx, Number((it as any).id || 0)), 0);
            if (maxModeloId > 0) this.nextId = Math.max(this.nextId, maxModeloId + 1);
          }
        } catch (e) {
          console.warn('InMemoryStorage: erro ao carregar modelos (não crítico):', e);
        }

      } catch (e) {
        console.warn('InMemoryStorage.bootstrap erro:', e);
      }
    })();

    return this.storageReadyPromise;
  }

  // Mesmo método do DatabaseStorage para garantir usuário no Supabase
  private async ensureUserInSupabase(userId: string): Promise<string | undefined> {
    try {
      // 1. Tentar encontrar por ID no Supabase (caso comum)
      const { data: idMatch, error: idError } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle();

      if (idError) {
        console.warn('⚠️ Erro ao buscar usuário por ID no Supabase:', idError);
      } else if (idMatch) {
        console.log('✅ Usuário já existe no Supabase com ID:', idMatch.id);
        return idMatch.id;
      }

      // 2. Se não achou por ID, buscar dados locais
      const local = await this.getUser(userId);
      if (!local?.email) {
        console.error('❌ Usuário não encontrado localmente:', userId);
        return undefined;
      }

      // 3. Tentar encontrar por email no Supabase
      const { data: emailMatch, error: emailError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', local.email)
        .maybeSingle();

      if (emailError) {
        console.warn('⚠️ Erro ao buscar usuário por email no Supabase:', emailError);
      }

      // Se encontrou por email, retornar o ID existente
      if (emailMatch) {
        console.log('✅ Usuário encontrado no Supabase por email, ID:', emailMatch.id);
        return emailMatch.id;
      }

      // 4. Não encontrou, criar novo registro (usar service-role quando possível)
      const payload: any = {
        id: userId,
        nome: local.nome,
        email: local.email,
        criado_em: new Date().toISOString(),
        color: local.color,
      };

      let created: any = null;
      let insertErr: any = null;

      try {
        const { supabaseService } = require('./supabaseClient');
        const svc = supabaseService || supabase;
        const result = await svc
          .from('users')
          .upsert([payload], { onConflict: 'email', ignoreDuplicates: true })
          .select()
          .maybeSingle();
        
        created = result.data;
        insertErr = result.error;
      } catch (e) {
        console.warn('⚠️ Falha ao upsert usuário no Supabase (dev fallback):', e);
      }

      if (insertErr) {
        console.error('❌ Erro ao inserir usuário no Supabase:', insertErr);
        return undefined;
      } 
      
      if (created) {
        console.log('✅ Usuário criado/atualizado no Supabase com ID:', created.id);
        return created.id;
      }

      // 5. Se o upsert não retornou dados, buscar novamente por email
      const { data: finalCheck } = await supabase
        .from('users')
        .select('id')
        .eq('email', local.email)
        .maybeSingle();

      if (finalCheck) {
        console.log('✅ Usuário confirmado no Supabase após upsert, ID:', finalCheck.id);
        return finalCheck.id;
      }

      console.error('❌ Falha ao criar/encontrar usuário no Supabase');
      return undefined;

    } catch (e) {
      console.warn('⚠️ Falha ao garantir usuário no Supabase:', e);
      return undefined;
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find(u => u.email === email);
  }

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Permitir um `id` fornecido (ex: vinda do Supabase) para que possamos
    // manter IDs consistentes entre o auth provider e o armazenamento em memória
    // durante o desenvolvimento.
    const providedId = (insertUser as any).id as string | undefined;

    // Gerar cor única determinística baseada na quantidade atual de usuários
    const hue = (this.users.length * 137) % 360;
    const color = `hsl(${hue} 70% 40%)`;

    const user = {
      id: providedId || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      nome: insertUser.nome || '',
      email: insertUser.email || '',
      password: insertUser.password || '',
      color,
      criadoEm: new Date(),
      resetToken: null,
      resetTokenExpiry: null
    } satisfies User;

    this.users.push(user);
    return user;
  }

  async updateUser(id: string, update: Partial<User>): Promise<User | undefined> {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;

    const user = {
      ...this.users[idx],
      ...update,
      // Nunca permitir que color seja undefined
      color: update.color || this.users[idx].color,
    } as User;

    this.users[idx] = user;
    return user;
  }

  // Modelos de Produtos
  async getAllModelosProdutos(): Promise<ModeloProduto[]> {
    return this.modelos;
  }

  async getModeloProdutoByCodigo(codigo: string): Promise<ModeloProduto | undefined> {
    return this.modelos.find(m => (m as any).codigoProduto === codigo);
  }

  async createModeloProduto(insertModelo: InsertModeloProduto): Promise<ModeloProduto> {
    const modelo = {
      id: this.nextId++,
      ...insertModelo,
      createdAt: new Date(),
      cadastradoPor: insertModelo.cadastradoPor || 'SISTEMA',
      dataAtualizacao: new Date(),
    } as ModeloProduto;

    this.modelos.push(modelo);

    // Supabase sync desativado para evitar WebSocket errors em Render
    // Frontend pode consultar diretamente via GET /api/modelos-produtos via Drizzle

    return modelo;
  }

  async updateModeloProduto(id: number, data: Partial<InsertModeloProduto>): Promise<ModeloProduto | undefined> {
    const idx = this.modelos.findIndex(m => m.id === id);
    if (idx === -1) return undefined;
    this.modelos[idx] = { ...this.modelos[idx], ...data };
    
    // Persistir no Supabase
    (async () => {
      try {
        if (await isSupabaseReachable()) {
          const payload: any = {};
          if (data.descricao !== undefined) payload.descricao = data.descricao;
          if (data.temperatura !== undefined) payload.temperatura = data.temperatura;
          if (data.shelfLife !== undefined) payload.shelf_life = data.shelfLife;
          if (data.unidadePadrao !== undefined) payload.unidade_padrao = data.unidadePadrao;
          if (data.pesoPorCaixa !== undefined) payload.peso_por_caixa = data.pesoPorCaixa;
          if (data.gtin !== undefined) payload.gtin = data.gtin;
          if (data.pesoEmbalagem !== undefined) payload.peso_embalagem = data.pesoEmbalagem;
          if (data.empresa !== undefined) payload.empresa = data.empresa;
          
          if (Object.keys(payload).length > 0) {
            const { error } = await supabase.from('modelos_produtos').update(payload).eq('id', id);
            if (error) console.warn('Falha ao atualizar modelo no Supabase:', error.message);
          }
        }
      } catch (e) {
        console.warn('Erro ao persistir updateModeloProduto no Supabase:', e);
      }
    })();
    
    return this.modelos[idx];
  }

  async deleteModeloProduto(id: number): Promise<boolean> {
    const before = this.modelos.length;
    this.modelos = this.modelos.filter(m => m.id !== id);
    const success = this.modelos.length < before;
    // Persistir exclusão no Supabase (aguardar antes de retornar - síncrono)
    if (success) {
      try {
        if (await isSupabaseReachable()) {
          const { error } = await supabase.from('modelos_produtos').delete().eq('id', id);
          if (error) console.warn('Falha ao deletar modelo no Supabase:', error.message);
        }
      } catch (e) {
        console.warn('Erro ao persistir deleteModeloProduto no Supabase:', e);
      }
    }

    return success;
  }

  // Alimentos
  async getAllAlimentos(): Promise<Alimento[]> {
    // Retorna cópia ordenada por createdAt (mais recentes primeiro) para
    // comportar-se igual à implementação de banco de dados.
    return [...this.alimentos].sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime());
  }

  async getAlimento(id: number): Promise<Alimento | undefined> {
    return this.alimentos.find(a => a.id === id);
  }

  async createAlimento(insertAlimento: InsertAlimento, userId: string): Promise<Alimento> {
    try {
      // Tentar garantir usuário no Supabase, mas se falhar, prosseguir localmente
      let supabaseUserId: string | undefined;
      try {
        supabaseUserId = await this.ensureUserInSupabase(userId);
      } catch (e) {
        console.warn('Falha ao garantir usuário no Supabase (não crítico):', e);
      }

      const alertasConfig = insertAlimento.alertasConfig || {
        contarAPartirFabricacaoDias: 3,
        avisoQuandoUmTercoValidade: true,
        popUpNotificacoes: true,
      };

      // Se o Supabase estiver disponível, inserir primeiro lá para garantir
      // que o `id` usado localmente corresponda ao `id` remoto. Isso evita
      // inconsistências onde um alimento é criado com um id in-memory e a
      // exclusão posterior não encontra a linha no Supabase.
      if (await isSupabaseReachable()) {
        try {
          const supaPayload = {
            nome: insertAlimento.nome,
            codigo_produto: insertAlimento.codigoProduto,
            temperatura: insertAlimento.temperatura,
            quantidade: insertAlimento.quantidade || 0,
            unidade: insertAlimento.unidade,
            lote: insertAlimento.lote || 'LOTE-01',
            data_fabricacao: insertAlimento.dataFabricacao,
            data_validade: insertAlimento.dataValidade,
            data_entrada: insertAlimento.dataEntrada,
            data_saida: null,
            cadastrado_por: supabaseUserId || userId,
            shelf_life: insertAlimento.shelfLife,
            peso_por_caixa: insertAlimento.pesoPorCaixa,
            alertas_config: alertasConfig,
          };

          const { data: supaAlimento, error: supaError } = await supabase
            .from('alimentos')
            .insert(supaPayload)
            .select()
            .maybeSingle();

          if (supaError) {
            console.warn('Falha ao inserir alimento no Supabase (vai usar id in-memory):', supaError.message || supaError);
          }

          if (supaAlimento) {
            const alimento: Alimento = {
              id: supaAlimento.id,
              codigoProduto: supaAlimento.codigo_produto,
              nome: supaAlimento.nome,
              unidade: supaAlimento.unidade,
              lote: supaAlimento.lote || 'LOTE-01',
              dataFabricacao: supaAlimento.data_fabricacao,
              dataValidade: supaAlimento.data_validade,
              quantidade: supaAlimento.quantidade ?? 0,
              pesoPorCaixa: supaAlimento.peso_por_caixa,
              temperatura: supaAlimento.temperatura,
              shelfLife: supaAlimento.shelf_life,
              dataEntrada: supaAlimento.data_entrada,
              dataSaida: supaAlimento.data_saida,
              categoria: supaAlimento.categoria,
              alertasConfig: supaAlimento.alertas_config,
              cadastradoPor: supaAlimento.cadastrado_por || supabaseUserId || userId,
              createdAt: supaAlimento.created_at || new Date(),
              updatedAt: supaAlimento.updated_at || new Date(),
            } as Alimento;

            this.alimentos.push(alimento);

            // ajustar nextId se necessário para evitar colisões com ids remotos
            if (typeof supaAlimento.id === 'number' && supaAlimento.id >= this.nextId) {
              this.nextId = supaAlimento.id + 1;
            }

            console.log('✅ Alimento criado e sincronizado com Supabase:', supaAlimento.id);
            return alimento;
          }
        } catch (bgErr) {
          console.warn('Erro ao criar alimento no Supabase (continuando em memória):', bgErr);
        }
      }

      // Fallback: criar apenas em memória quando Supabase não estiver disponível
      const alimento: Alimento = {
        id: this.nextId++,
        codigoProduto: insertAlimento.codigoProduto,
        nome: insertAlimento.nome,
        unidade: insertAlimento.unidade,
        lote: insertAlimento.lote || 'LOTE-01',
        dataFabricacao: insertAlimento.dataFabricacao,
        dataValidade: insertAlimento.dataValidade,
        quantidade: insertAlimento.quantidade || 0,
        pesoPorCaixa: insertAlimento.pesoPorCaixa,
        temperatura: insertAlimento.temperatura,
        shelfLife: insertAlimento.shelfLife,
        dataEntrada: insertAlimento.dataEntrada,
        dataSaida: null,
        categoria: (insertAlimento as any).categoria,
        alertasConfig: alertasConfig,
        cadastradoPor: supabaseUserId || userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Alimento;

      this.alimentos.push(alimento);

      // Tentar sincronizar com Supabase em background (não bloquear a resposta)
      (async () => {
        try {
          const supaPayload = {
            nome: insertAlimento.nome,
            codigo_produto: insertAlimento.codigoProduto,
            temperatura: insertAlimento.temperatura,
            quantidade: insertAlimento.quantidade || 0,
            unidade: insertAlimento.unidade,
            lote: insertAlimento.lote || 'LOTE-01',
            data_fabricacao: insertAlimento.dataFabricacao,
            data_validade: insertAlimento.dataValidade,
            data_entrada: insertAlimento.dataEntrada,
            data_saida: null,
            cadastrado_por: supabaseUserId || userId,
            shelf_life: insertAlimento.shelfLife,
            peso_por_caixa: insertAlimento.pesoPorCaixa,
            alertas_config: alertasConfig,
          };

          const { data: supaAlimento, error: supaError } = await supabase
            .from('alimentos')
            .insert(supaPayload)
            .select()
            .maybeSingle();

          if (supaError) {
            console.warn('Falha ao sincronizar alimento com Supabase (não crítico):', supaError);
            return;
          }

          if (supaAlimento) {
            console.log('✅ Alimento sincronizado no Supabase (background):', supaAlimento);
          }
        } catch (bgErr) {
          console.warn('Erro ao sincronizar alimento em background:', bgErr);
        }
      })();

      return alimento;

    } catch (e) {
      console.error('❌ Erro ao criar alimento (in-memory):', e);
      throw e;
    }
  }

  async updateAlimento(id: number, update: Partial<InsertAlimento>): Promise<Alimento | undefined> {
    const idx = this.alimentos.findIndex(a => a.id === id);
    if (idx === -1) return undefined;
    
    // Aplica o update garantindo que lote nunca será null
    const alimento = {
      ...this.alimentos[idx],
      ...update,
      updatedAt: new Date(),
      lote: update.lote || this.alimentos[idx].lote || 'LOTE-01',
    } as Alimento;

    this.alimentos[idx] = alimento;
    
    // Persistir mudança no Supabase
    (async () => {
      try {
        if (await isSupabaseReachable()) {
          const payload: any = {
            codigo_produto: alimento.codigoProduto,
            nome: alimento.nome,
            unidade: alimento.unidade,
            lote: alimento.lote,
            data_fabricacao: alimento.dataFabricacao,
            data_validade: alimento.dataValidade,
            quantidade: alimento.quantidade,
            peso_por_caixa: alimento.pesoPorCaixa,
            temperatura: alimento.temperatura,
            shelf_life: alimento.shelfLife,
            data_entrada: alimento.dataEntrada,
            data_saida: alimento.dataSaida,
            categoria: alimento.categoria,
            alertas_config: alimento.alertasConfig,
          };
          
          const { error } = await supabase.from('alimentos').update(payload).eq('id', id);
          if (error) console.warn('Falha ao atualizar alimento no Supabase:', error.message);
        }
      } catch (e) {
        console.warn('Erro ao persistir updateAlimento no Supabase:', e);
      }
    })();
    
    return alimento;
  }

  async deleteAlimento(id: number): Promise<boolean> {
    const before = this.alimentos.length;
    const alimentoAntes = this.alimentos.find(a => a.id === id);
    this.alimentos = this.alimentos.filter(a => a.id !== id);
    const success = this.alimentos.length < before;

    // Persistir exclusão no Supabase (aguardar antes de retornar - síncrono!)
    if (success) {
      try {
        if (await isSupabaseReachable()) {
          // Primeiro tentar deletar pela id (o caso ideal)
          try {
            const { data: deletedById, error } = await supabase.from('alimentos').delete().eq('id', id).select();
            if (error) {
              console.warn('Falha ao deletar alimento por id no Supabase:', error.message);
            }

            // Se a deleção por ID não removeu nada (registro com id diferente),
            // tentar deletar pelo código do produto (falla-safe para registros
            // criados com IDs diferentes entre memória e Supabase).
            const removedCount = Array.isArray(deletedById) ? deletedById.length : (deletedById ? 1 : 0);
            if (removedCount === 0 && alimentoAntes && alimentoAntes.codigoProduto) {
              try {
                const filtro: any = supabase.from('alimentos').delete();
                // Tentar usar lote como filtro adicional quando disponível
                if (alimentoAntes.lote) {
                  const { data: deletedByCodeAndLote, error: err2 } = await supabase.from('alimentos').delete().match({ codigo_produto: alimentoAntes.codigoProduto, lote: alimentoAntes.lote }).select();
                  if (err2) console.warn('Falha ao deletar por código+lote no Supabase:', err2.message);
                  if (Array.isArray(deletedByCodeAndLote) && deletedByCodeAndLote.length > 0) {
                    // sucesso
                  } else {
                    // último recurso: deletar por código apenas
                    const { data: deletedByCode, error: err3 } = await supabase.from('alimentos').delete().eq('codigo_produto', alimentoAntes.codigoProduto).select();
                    if (err3) console.warn('Falha ao deletar por código no Supabase:', err3.message);
                  }
                } else {
                  const { data: deletedByCode, error: err3 } = await supabase.from('alimentos').delete().eq('codigo_produto', alimentoAntes.codigoProduto).select();
                  if (err3) console.warn('Falha ao deletar por código no Supabase:', err3.message);
                }
              } catch (inner) {
                console.warn('Erro ao tentar fallback de deleção por código:', inner);
              }
            }
          } catch (supaErr) {
            console.warn('Falha ao executar deleteAlimento no Supabase:', supaErr);
          }
        }
      } catch (e) {
        console.warn('Erro ao persistir deleteAlimento no Supabase:', e);
      }
    }

    return success;
  }

  async registrarSaida(id: number, quantidade: number): Promise<Alimento | undefined> {
    const alimento = await this.getAlimento(id);
    if (!alimento) return undefined;
    alimento.quantidade = Math.max(0, (alimento.quantidade || 0) - quantidade);
    if (alimento.quantidade === 0) alimento.dataSaida = new Date().toISOString().split('T')[0];
    
    // Persistir saída no Supabase
    (async () => {
      try {
        if (await isSupabaseReachable()) {
          const payload: any = {
            quantidade: alimento.quantidade,
          };
          if (alimento.dataSaida) payload.data_saida = alimento.dataSaida;
          
          const { error } = await supabase.from('alimentos').update(payload).eq('id', id);
          if (error) console.warn('Falha ao registrar saída no Supabase:', error.message);
        }
      } catch (e) {
        console.warn('Erro ao persistir registrarSaida no Supabase:', e);
      }
    })();
    
    return alimento as any;
  }

  // Audit Log
  async getAllAuditLogs(): Promise<AuditLog[]> {
    return this.logs;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const entry: any = { id: this.logs.length + 1, ...log, timestamp: new Date().toISOString() };
    this.logs.push(entry);

    // Tentar sincronizar com Supabase se disponível. Não bloquear a resposta
    (async () => {
      try {
        if (await isSupabaseReachable()) {
          const supaPayload: any = {
            alimento_id: log.alimentoId || null,
            alimento_codigo: log.alimentoCodigo || null,
            alimento_nome: log.alimentoNome || null,
            action: log.action,
            user_id: log.userId || null,
            user_name: log.userName || null,
            changes: log.changes || null,
            timestamp: new Date().toISOString(),
          };

          // Tentar usar o cliente service-role quando disponível para ignorar RLS
          try {
            const { supabaseService } = require('./supabaseClient');
            const svc = supabaseService || supabase;
            const { data: inserted, error } = await svc.from('audit_log').insert([supaPayload]).select().maybeSingle();
            if (!error && inserted) {
              entry.id = inserted.id || entry.id;
              entry.timestamp = inserted.timestamp || entry.timestamp;
            } else if (error) {
              console.warn('InMemoryStorage: falha ao gravar audit_log no Supabase:', error.message || error);
            }
          } catch (e) {
            try {
              const { data: inserted, error } = await supabase.from('audit_log').insert([supaPayload]).select().maybeSingle();
              if (!error && inserted) {
                entry.id = inserted.id || entry.id;
                entry.timestamp = inserted.timestamp || entry.timestamp;
              } else if (error) {
                console.warn('InMemoryStorage: falha ao gravar audit_log no Supabase:', error.message || error);
              }
            } catch (inner) {
              console.warn('InMemoryStorage: erro tentando sincronizar audit_log com Supabase:', inner);
            }
          }
        }
      } catch (e) {
        console.warn('InMemoryStorage: erro tentando sincronizar audit_log com Supabase:', e);
      }
    })();

    return entry;
  }
}

export const storage = process.env.NODE_ENV === 'development' ? new InMemoryStorage() : new DatabaseStorage();
