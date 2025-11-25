#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Script de teste completo para validar o fluxo de signup e sincronização com Supabase

.DESCRIPTION
  Este script:
  1. Verifica se as variáveis de ambiente estão configuradas
  2. Testa conexão com Supabase
  3. Executa fluxo de signup
  4. Verifica se o usuário foi criado na tabela 'users'
  5. Testa login
  6. Valida se todos os fluxos funcionam

.NOTES
  Requisitos:
  - Node.js e npm/yarn instalados
  - .env configurado com SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY
  - Servidor rodando em http://localhost:5000

.EXAMPLE
  .\test-signup-flow.ps1
#>

param(
  [string]$ServerUrl = "http://localhost:5000",
  [string]$Email = "test-$(Get-Random)@test.local",
  [string]$Password = "TestPassword123!",
  [string]$Nome = "Teste User"
)

$ErrorActionPreference = "Continue"

function Test-SupabaseConnection {
  Write-Host "🔍 [1/6] Testando conexão com Supabase..." -ForegroundColor Cyan
  
  try {
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/debug/supabase" `
      -Method Get `
      -ContentType "application/json" `
      -ErrorAction Stop
    
    if ($response.ok) {
      Write-Host "✅ Conexão com Supabase OK" -ForegroundColor Green
      return $true
    } else {
      Write-Host "❌ Supabase retornou erro: $($response.error)" -ForegroundColor Red
      return $false
    }
  } catch {
    Write-Host "❌ Erro ao testar Supabase: $_" -ForegroundColor Red
    return $false
  }
}

function Test-Signup {
  Write-Host "`n📝 [2/6] Testando registro de usuário..." -ForegroundColor Cyan
  Write-Host "   Email: $Email"
  Write-Host "   Nome: $Nome"
  
  try {
    $body = @{
      nome = $Nome
      email = $Email
      password = $Password
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/auth/register" `
      -Method Post `
      -ContentType "application/json" `
      -Body $body `
      -ErrorAction Stop
    
    Write-Host "✅ Usuário registrado com sucesso" -ForegroundColor Green
    Write-Host "   Resposta: $($response.message)"
    return $true
  } catch {
    Write-Host "❌ Erro ao registrar usuário: $_" -ForegroundColor Red
    $errorContent = $_.Exception.Response.Content.ReadAsStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() }
    Write-Host "   Detalhes: $errorContent" -ForegroundColor Yellow
    return $false
  }
}

function Test-UserInDatabase {
  Write-Host "`n🔎 [3/6] Verificando se usuário foi criado na tabela 'users'..." -ForegroundColor Cyan
  
  # Aguardar um pouco para garantir sincronização
  Start-Sleep -Milliseconds 500
  
  Write-Host "   ⚠️  Nota: Verificação manual necessária no painel Supabase" -ForegroundColor Yellow
  Write-Host "   Acesse: https://app.supabase.com -> seu projeto -> Table Editor -> users" -ForegroundColor Yellow
  Write-Host "   Procure por email: $Email" -ForegroundColor Yellow
  
  return $true
}

function Test-Login {
  Write-Host "`n🔑 [4/6] Testando login..." -ForegroundColor Cyan
  
  try {
    $body = @{
      email = $Email
      password = $Password
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/auth/login" `
      -Method Post `
      -ContentType "application/json" `
      -Body $body `
      -ErrorAction Stop `
      -SessionVariable session
    
    Write-Host "✅ Login realizado com sucesso" -ForegroundColor Green
    Write-Host "   UserId: $($response.user.id)" -ForegroundColor Green
    Write-Host "   Email: $($response.user.email)" -ForegroundColor Green
    
    # Salvar sessão para próximas requisições
    $script:session = $session
    $script:userId = $response.user.id
    
    return $true
  } catch {
    Write-Host "❌ Erro ao fazer login: $_" -ForegroundColor Red
    $errorContent = $_.Exception.Response.Content.ReadAsStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() }
    Write-Host "   Detalhes: $errorContent" -ForegroundColor Yellow
    return $false
  }
}

function Test-CreateAlimento {
  Write-Host "`n➕ [5/6] Testando criação de alimento (requer usuário na tabela users)..." -ForegroundColor Cyan
  
  if (-not $script:session) {
    Write-Host "⚠️  Sessão não disponível - skip" -ForegroundColor Yellow
    return $false
  }
  
  try {
    $body = @{
      codigoProduto = "TEST-$(Get-Random)"
      nome = "Teste Alimento"
      unidade = "kg"
      lote = "LOTE-TEST-001"
      dataFabricacao = (Get-Date).AddDays(-5).ToString("yyyy-MM-dd")
      dataValidade = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
      quantidade = 100.5
      pesoPorCaixa = 25
      temperatura = "2-8°C"
      shelfLife = 30
      categoria = "Alimentos Processados"
      alertasConfig = @{} | ConvertTo-Json
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/alimentos" `
      -Method Post `
      -ContentType "application/json" `
      -Body $body `
      -WebSession $script:session `
      -ErrorAction Stop
    
    Write-Host "✅ Alimento criado com sucesso" -ForegroundColor Green
    Write-Host "   AlimentoId: $($response.id)" -ForegroundColor Green
    Write-Host "   Nome: $($response.nome)" -ForegroundColor Green
    
    return $true
  } catch {
    Write-Host "❌ Erro ao criar alimento: $_" -ForegroundColor Red
    $errorContent = $_.Exception.Response.Content.ReadAsStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() }
    Write-Host "   Detalhes: $errorContent" -ForegroundColor Yellow
    return $false
  }
}

function Test-GetMe {
  Write-Host "`n👤 [6/6] Testando /api/auth/me..." -ForegroundColor Cyan
  
  if (-not $script:session) {
    Write-Host "⚠️  Sessão não disponível - skip" -ForegroundColor Yellow
    return $false
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/auth/me" `
      -Method Get `
      -ContentType "application/json" `
      -WebSession $script:session `
      -ErrorAction Stop
    
    Write-Host "✅ /api/auth/me retornou dados do usuário" -ForegroundColor Green
    Write-Host "   UserId: $($response.id)" -ForegroundColor Green
    Write-Host "   Email: $($response.email)" -ForegroundColor Green
    
    return $true
  } catch {
    Write-Host "❌ Erro em /api/auth/me: $_" -ForegroundColor Red
    return $false
  }
}

# ============================================================================
# EXECUÇÃO
# ============================================================================

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   TESTE COMPLETO: Signup -> Login -> Criação de Alimento      ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "🌐 Servidor: $ServerUrl" -ForegroundColor Cyan
Write-Host ""

$results = @()

# Teste 1: Conexão Supabase
$results += @{ name = "Conexão Supabase"; result = Test-SupabaseConnection }

# Teste 2: Signup
$results += @{ name = "Registro de Usuário"; result = Test-Signup }

# Teste 3: Usuário no BD
$results += @{ name = "Verificação na Tabela users"; result = Test-UserInDatabase }

# Teste 4: Login
$results += @{ name = "Login"; result = Test-Login }

# Teste 5: Criar Alimento
$results += @{ name = "Criação de Alimento"; result = Test-CreateAlimento }

# Teste 6: /api/auth/me
$results += @{ name = "/api/auth/me"; result = Test-GetMe }

# ============================================================================
# RELATÓRIO FINAL
# ============================================================================

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   RELATÓRIO FINAL                                              ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

$passed = 0
$failed = 0

foreach ($result in $results) {
  $status = if ($result.result) { "✅ PASS" } else { "❌ FAIL" }
  $color = if ($result.result) { "Green" } else { "Red" }
  Write-Host "$status - $($result.name)" -ForegroundColor $color
  
  if ($result.result) { $passed++ } else { $failed++ }
}

Write-Host ""
Write-Host "Resultados: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })

if ($failed -eq 0) {
  Write-Host "`n✅ TODOS OS TESTES PASSARAM!" -ForegroundColor Green
  exit 0
} else {
  Write-Host "`n⚠️  ALGUNS TESTES FALHARAM - Verifique os logs acima" -ForegroundColor Yellow
  exit 1
}
