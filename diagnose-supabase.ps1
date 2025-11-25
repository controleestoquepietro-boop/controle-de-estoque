#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Script de diagnóstico para validar configuração do Supabase e Fly.io

.DESCRIPTION
  Verifica:
  1. Variáveis de ambiente
  2. Conectividade com Supabase
  3. Configuração de RLS
  4. Dados na tabela 'users'
  5. Histórico de erros

.EXAMPLE
  .\diagnose-supabase.ps1
#>

param(
  [string]$SupabaseUrl,
  [string]$SupabaseServiceKey,
  [string]$SupabaseAnonKey
)

$ErrorActionPreference = "Continue"

function Write-Section {
  param([string]$Title, [string]$Color = "Cyan")
  Write-Host ""
  Write-Host "╔$(('=' * ($Title.Length + 2)))╗" -ForegroundColor $Color
  Write-Host "║ $Title ║" -ForegroundColor $Color
  Write-Host "╚$(('=' * ($Title.Length + 2)))╝" -ForegroundColor $Color
}

function Test-EnvVariables {
  Write-Section "1. VERIFICANDO VARIÁVEIS DE AMBIENTE"
  
  $vars = @(
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "NODE_ENV"
  )
  
  foreach ($var in $vars) {
    $value = [Environment]::GetEnvironmentVariable($var, "Process") -or [Environment]::GetEnvironmentVariable($var, "User")
    
    if ($value) {
      # Mascarar valores sensíveis
      if ($var -match "KEY|PASSWORD|TOKEN|URL") {
        $masked = $value.Substring(0, [Math]::Min(10, $value.Length)) + "..." + $value.Substring([Math]::Max($value.Length - 10, 0))
      } else {
        $masked = $value
      }
      Write-Host "✅ $var = $masked" -ForegroundColor Green
    } else {
      Write-Host "❌ $var = NÃO CONFIGURADO" -ForegroundColor Red
    }
  }
}

function Test-SupabaseConnectivity {
  Write-Section "2. TESTANDO CONECTIVIDADE COM SUPABASE"
  
  if (-not $SupabaseUrl) {
    $SupabaseUrl = [Environment]::GetEnvironmentVariable("SUPABASE_URL", "Process") -or [Environment]::GetEnvironmentVariable("SUPABASE_URL", "User")
  }
  
  if (-not $SupabaseUrl) {
    Write-Host "⚠️  SUPABASE_URL não configurado - skip" -ForegroundColor Yellow
    return
  }
  
  try {
    Write-Host "🔄 Testando conexão para: $SupabaseUrl" -ForegroundColor Cyan
    
    # Teste simples: fazer GET no health check do Supabase
    $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/" `
      -Method Get `
      -TimeoutSec 5 `
      -ErrorAction Stop
    
    Write-Host "✅ Conectividade com Supabase: OK" -ForegroundColor Green
  } catch {
    Write-Host "❌ Erro ao conectar com Supabase: $_" -ForegroundColor Red
  }
}

function Test-RLSConfiguration {
  Write-Section "3. VERIFICANDO CONFIGURAÇÃO DE RLS"
  
  Write-Host "Para verificar RLS:" -ForegroundColor Cyan
  Write-Host "1. Acesse: https://app.supabase.com" -ForegroundColor Cyan
  Write-Host "2. Seu projeto → SQL Editor" -ForegroundColor Cyan
  Write-Host "3. Execute:" -ForegroundColor Cyan
  
  $sqlCheck = @"
SELECT 
  tablename, 
  rowsecurity,
  (SELECT count(*) FROM pg_policies WHERE tablename = t.tablename) as policies
FROM pg_tables t
WHERE schemaname = 'public' AND tablename IN ('users', 'alimentos', 'modelos_produtos', 'audit_log')
ORDER BY tablename;
"@
  
  Write-Host ""
  Write-Host $sqlCheck -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Resultado esperado: rowsecurity = true para todas as tabelas" -ForegroundColor Green
}

function Test-UsersTable {
  Write-Section "4. VERIFICANDO TABELA 'USERS'"
  
  Write-Host "Para verificar dados na tabela 'users':" -ForegroundColor Cyan
  Write-Host "1. Acesse: https://app.supabase.com" -ForegroundColor Cyan
  Write-Host "2. Seu projeto → Table Editor → users" -ForegroundColor Cyan
  Write-Host "3. Procure por registros recentes" -ForegroundColor Cyan
  Write-Host ""
  
  Write-Host "Estrutura esperada da tabela 'users':" -ForegroundColor Green
  $structure = @"
  Coluna                 Tipo         Constraints
  ─────────────────────────────────────────────────
  id                     uuid         PRIMARY KEY
  nome                   text         NOT NULL
  email                  text         NOT NULL, UNIQUE
  password               text         NOT NULL
  reset_token            text         (optional)
  reset_token_expiry     timestamp    (optional)
  created_at             timestamp    DEFAULT now()
  color                  text         NOT NULL, UNIQUE
"@
  Write-Host $structure -ForegroundColor Cyan
}

function Test-SupabaseSchema {
  Write-Section "5. VERIFICANDO SCHEMA DO BANCO DE DADOS"
  
  Write-Host "Para validar schema do Supabase:" -ForegroundColor Cyan
  Write-Host "1. Acesse: https://app.supabase.com" -ForegroundColor Cyan
  Write-Host "2. Seu projeto → SQL Editor" -ForegroundColor Cyan
  Write-Host "3. Execute:" -ForegroundColor Cyan
  Write-Host ""
  
  $sqlSchema = @"
-- Verificar estrutura da tabela 'users'
\d+ public.users
"@
  
  Write-Host $sqlSchema -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Validar que os campos estão presentes:" -ForegroundColor Green
  Write-Host "  ✓ id, nome, email, password, created_at, color" -ForegroundColor Green
}

function Test-LocalEnvFile {
  Write-Section "6. VERIFICANDO ARQUIVO .env LOCAL"
  
  $envPath = "$(Get-Location)\.env"
  
  if (Test-Path $envPath) {
    Write-Host "✅ Arquivo .env encontrado" -ForegroundColor Green
    
    $envContent = Get-Content $envPath
    $requiredVars = @("SUPABASE_URL", "SUPABASE_KEY", "SUPABASE_SERVICE_ROLE_KEY")
    
    foreach ($var in $requiredVars) {
      if ($envContent -match "^$var=") {
        Write-Host "  ✅ $var está configurado no .env" -ForegroundColor Green
      } else {
        Write-Host "  ❌ $var NÃO está configurado no .env" -ForegroundColor Red
      }
    }
  } else {
    Write-Host "⚠️  Arquivo .env não encontrado em: $envPath" -ForegroundColor Yellow
    Write-Host "   Criar arquivo .env com as variáveis necessárias" -ForegroundColor Yellow
  }
}

function Test-FlyIOSecrets {
  Write-Section "7. VERIFICANDO SECRETS NO FLY.IO"
  
  Write-Host "Para verificar secrets no Fly.io:" -ForegroundColor Cyan
  Write-Host "Execute:" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "  flyctl secrets list -a cxpt-core" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Resultado esperado:" -ForegroundColor Green
  Write-Host "  NAME                        DIGEST              CREATED AT" -ForegroundColor Green
  Write-Host "  SUPABASE_URL                sha256:...          N minutes ago" -ForegroundColor Green
  Write-Host "  SUPABASE_KEY                sha256:...          N minutes ago" -ForegroundColor Green
  Write-Host "  SUPABASE_SERVICE_ROLE_KEY   sha256:...          N minutes ago" -ForegroundColor Green
}

function Test-SignupFlow {
  Write-Section "8. VALIDAR FLUXO DE SIGNUP"
  
  Write-Host "Checklist de validação:" -ForegroundColor Cyan
  Write-Host "  [ ] Registrar novo usuário" -ForegroundColor Yellow
  Write-Host "  [ ] Email de confirmação recebido" -ForegroundColor Yellow
  Write-Host "  [ ] Clicar no link de confirmação" -ForegroundColor Yellow
  Write-Host "  [ ] Verificar se usuário aparece na tabela 'users'" -ForegroundColor Yellow
  Write-Host "  [ ] Fazer login com as credenciais" -ForegroundColor Yellow
  Write-Host "  [ ] Criar novo alimento" -ForegroundColor Yellow
  Write-Host "  [ ] Importar dados" -ForegroundColor Yellow
  Write-Host "  [ ] Exportar dados" -ForegroundColor Yellow
}

function Test-ErrorLogs {
  Write-Section "9. VERIFICANDO LOGS DE ERRO"
  
  Write-Host "Para verificar logs em tempo real no Fly.io:" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "  flyctl logs -a cxpt-core --follow" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Procurar por erros relacionados a:" -ForegroundColor Green
  Write-Host "  • SUPABASE_URL / SUPABASE_KEY não configurados" -ForegroundColor Green
  Write-Host "  • Erro ao criar usuário na tabela 'users'" -ForegroundColor Green
  Write-Host "  • RLS: Política violada" -ForegroundColor Green
  Write-Host "  • Campo 'password' vazio ou inválido" -ForegroundColor Green
}

function Test-MigrationStatus {
  Write-Section "10. VERIFICANDO STATUS DAS MIGRATIONS"
  
  Write-Host "Para verificar se as RLS policies foram aplicadas:" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Execute no Supabase SQL Editor:" -ForegroundColor Yellow
  
  $sqlCheck = @"
-- Listar todas as políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar quais tabelas têm RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
"@
  
  Write-Host $sqlCheck -ForegroundColor Yellow
}

# ============================================================================
# EXECUTAR DIAGNÓSTICO
# ============================================================================

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║     DIAGNÓSTICO: INTEGRAÇÃO SUPABASE + FLY.IO                ║" -ForegroundColor Magenta
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta

Test-EnvVariables
Test-SupabaseConnectivity
Test-RLSConfiguration
Test-UsersTable
Test-SupabaseSchema
Test-LocalEnvFile
Test-FlyIOSecrets
Test-SignupFlow
Test-ErrorLogs
Test-MigrationStatus

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║     PRÓXIMOS PASSOS                                           ║" -ForegroundColor Magenta
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta

Write-Host ""
Write-Host "1️⃣  Verificar variáveis de ambiente (seção 1)" -ForegroundColor Cyan
Write-Host "2️⃣  Aplicar RLS policies no Supabase (seção 3)" -ForegroundColor Cyan
Write-Host "3️⃣  Configurar secrets no Fly.io (seção 7)" -ForegroundColor Cyan
Write-Host "4️⃣  Testar fluxo de signup localmente" -ForegroundColor Cyan
Write-Host "5️⃣  Fazer deploy no Fly.io" -ForegroundColor Cyan
Write-Host "6️⃣  Validar em produção (seção 8)" -ForegroundColor Cyan
Write-Host "7️⃣  Acompanhar logs (seção 9)" -ForegroundColor Cyan

Write-Host ""
Write-Host "✅ Diagnóstico completo" -ForegroundColor Green
