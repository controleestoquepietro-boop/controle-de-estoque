-- ============================================================================
-- Migration: Adicionar Row Level Security (RLS) à tabela users
-- ============================================================================
-- 
-- Este script:
-- 1. Habilita RLS na tabela 'users'
-- 2. Cria políticas para permitir operações administrativas via service_role
-- 3. Cria políticas para permitir que usuários leiam seus próprios dados
-- 4. Garante que apenas o backend (via service_role) pode inserir/atualizar
--
-- ============================================================================

-- 1. Habilitar RLS na tabela users (se não estiver habilitado)
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- 2. Política para INSERT: apenas backend (service_role) pode inserir
-- Backend usa supabaseService com service_role_key, que bypassa RLS
-- Usuários autenticados NÃO podem inserir diretamente
CREATE POLICY "Service role can insert users"
ON "public"."users"
FOR INSERT
WITH CHECK (
  -- Apenas service_role pode fazer INSERT
  auth.role() = 'service_role'
);

-- 3. Política para SELECT: usuários autenticados podem ler seus próprios dados
-- Admins/backend podem ler todos
CREATE POLICY "Users can read own data"
ON "public"."users"
FOR SELECT
USING (
  -- Ou é service_role (admin), ou é o próprio usuário
  auth.role() = 'service_role'
  OR auth.uid() = id
);

-- 4. Política para UPDATE: apenas service_role pode atualizar
-- Backend gerencia atualizações de perfil
CREATE POLICY "Service role can update users"
ON "public"."users"
FOR UPDATE
WITH CHECK (
  -- Apenas service_role pode fazer UPDATE
  auth.role() = 'service_role'
);

-- 5. Política para DELETE: apenas service_role pode deletar
CREATE POLICY "Service role can delete users"
ON "public"."users"
FOR DELETE
USING (
  -- Apenas service_role pode fazer DELETE
  auth.role() = 'service_role'
);

-- ============================================================================
-- Habilitar RLS nas tabelas de dados (alimentos e modelos_produtos)
-- ============================================================================

-- 1. RLS na tabela alimentos
ALTER TABLE "public"."alimentos" ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: todos os usuários autenticados podem ler
CREATE POLICY "Authenticated users can read alimentos"
ON "public"."alimentos"
FOR SELECT
USING (
  auth.role() = 'authenticated' OR auth.role() = 'service_role'
);

-- Política para INSERT: apenas quem é o cadastrador (usuario autenticado) ou service_role
CREATE POLICY "Authenticated users and service role can insert alimentos"
ON "public"."alimentos"
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
  OR (auth.role() = 'authenticated' AND auth.uid()::text = cadastrado_por)
);

-- Política para UPDATE: apenas service_role (backend) pode atualizar
CREATE POLICY "Service role can update alimentos"
ON "public"."alimentos"
FOR UPDATE
USING (auth.role() = 'service_role');

-- Política para DELETE: apenas service_role (backend) pode deletar
CREATE POLICY "Service role can delete alimentos"
ON "public"."alimentos"
FOR DELETE
USING (auth.role() = 'service_role');

-- 2. RLS na tabela modelos_produtos
ALTER TABLE "public"."modelos_produtos" ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: todos os usuários autenticados podem ler
CREATE POLICY "Authenticated users can read modelos_produtos"
ON "public"."modelos_produtos"
FOR SELECT
USING (
  auth.role() = 'authenticated' OR auth.role() = 'service_role'
);

-- Política para INSERT: apenas service_role (backend) pode inserir
CREATE POLICY "Service role can insert modelos_produtos"
ON "public"."modelos_produtos"
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Política para UPDATE: apenas service_role (backend) pode atualizar
CREATE POLICY "Service role can update modelos_produtos"
ON "public"."modelos_produtos"
FOR UPDATE
USING (auth.role() = 'service_role');

-- Política para DELETE: apenas service_role (backend) pode deletar
CREATE POLICY "Service role can delete modelos_produtos"
ON "public"."modelos_produtos"
FOR DELETE
USING (auth.role() = 'service_role');

-- 3. RLS na tabela audit_log
ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários autenticados podem ler todo audit log
CREATE POLICY "Authenticated users can read audit_log"
ON "public"."audit_log"
FOR SELECT
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Política para INSERT: apenas service_role (backend) pode inserir
CREATE POLICY "Service role can insert audit_log"
ON "public"."audit_log"
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- Fim das políticas de RLS
-- ============================================================================
