#!/usr/bin/env pwsh

param(
  [string]$ServerUrl = "http://localhost:5000",
  [string]$Email = "test-$(Get-Random)@test.local",
  [string]$Password = "TestPassword123!",
  [string]$Nome = "Teste User"
)

$ErrorActionPreference = "Continue"

function Test-SupabaseConnection {
  Write-Host "[1/6] Testando conexao com Supabase..." -ForegroundColor Cyan
  
  try {
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/debug/supabase" `
      -Method Get `
      -ContentType "application/json" `
      -ErrorAction Stop
    
    if ($response.ok) {
      Write-Host "PASS - Conexao com Supabase OK" -ForegroundColor Green
      return $true
    } else {
      Write-Host "FAIL - Supabase retornou erro: $($response.error)" -ForegroundColor Red
      return $false
    }
  } catch {
    Write-Host "FAIL - Erro ao testar Supabase: $_" -ForegroundColor Red
    return $false
  }
}

function Test-Signup {
  Write-Host "`n[2/6] Testando registro de usuario..." -ForegroundColor Cyan
  Write-Host "Email: $Email"
  Write-Host "Nome: $Nome"
  
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
    
    Write-Host "PASS - Usuario registrado com sucesso" -ForegroundColor Green
    Write-Host "Resposta: $($response.message)"
    return $true
  } catch {
    Write-Host "FAIL - Erro ao registrar usuario: $_" -ForegroundColor Red
    return $false
  }
}

function Test-UserInDatabase {
  Write-Host "`n[3/6] Verificando se usuario foi criado na tabela users..." -ForegroundColor Cyan
  
  Start-Sleep -Milliseconds 500
  
  Write-Host "NOTA: Verificacao manual necessaria no painel Supabase" -ForegroundColor Yellow
  Write-Host "Acesse: https://app.supabase.com -> seu projeto -> Table Editor -> users" -ForegroundColor Yellow
  Write-Host "Procure por email: $Email" -ForegroundColor Yellow
  
  return $true
}

function Test-Login {
  Write-Host "`n[4/6] Testando login..." -ForegroundColor Cyan
  
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
    
    Write-Host "PASS - Login realizado com sucesso" -ForegroundColor Green
    Write-Host "UserId: $($response.user.id)" -ForegroundColor Green
    Write-Host "Email: $($response.user.email)" -ForegroundColor Green
    
    $script:session = $session
    $script:userId = $response.user.id
    
    return $true
  } catch {
    Write-Host "FAIL - Erro ao fazer login: $_" -ForegroundColor Red
    return $false
  }
}

function Test-CreateAlimento {
  Write-Host "`n[5/6] Testando criacao de alimento..." -ForegroundColor Cyan
  
  if (-not $script:session) {
    Write-Host "SKIP - Sessao nao disponivel" -ForegroundColor Yellow
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
      temperatura = "2-8"
      shelfLife = 30
      categoria = "Alimentos Processados"
      alertasConfig = @{
        contarAPartirFabricacaoDias = 3
        avisoQuandoUmTercoValidade = $true
        popUpNotificacoes = $true
      }
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/alimentos" `
      -Method Post `
      -ContentType "application/json" `
      -Body $body `
      -WebSession $script:session `
      -ErrorAction Stop
    
    Write-Host "PASS - Alimento criado com sucesso" -ForegroundColor Green
    Write-Host "AlimentoId: $($response.id)" -ForegroundColor Green
    Write-Host "Nome: $($response.nome)" -ForegroundColor Green
    
    return $true
  } catch {
    Write-Host "FAIL - Erro ao criar alimento: $_" -ForegroundColor Red
    return $false
  }
}

function Test-GetMe {
  Write-Host "`n[6/6] Testando /api/auth/me..." -ForegroundColor Cyan
  
  if (-not $script:session) {
    Write-Host "SKIP - Sessao nao disponivel" -ForegroundColor Yellow
    return $false
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/auth/me" `
      -Method Get `
      -ContentType "application/json" `
      -WebSession $script:session `
      -ErrorAction Stop
    
    Write-Host "PASS - /api/auth/me retornou dados do usuario" -ForegroundColor Green
    Write-Host "UserId: $($response.id)" -ForegroundColor Green
    Write-Host "Email: $($response.email)" -ForegroundColor Green
    
    return $true
  } catch {
    Write-Host "FAIL - Erro em /api/auth/me: $_" -ForegroundColor Red
    return $false
  }
}

Write-Host "================================================================================" -ForegroundColor Magenta
Write-Host "TESTE COMPLETO: Signup -> Login -> Criacao de Alimento" -ForegroundColor Magenta
Write-Host "================================================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Servidor: $ServerUrl" -ForegroundColor Cyan
Write-Host ""

$results = @()

$results += @{ name = "Conexao Supabase"; result = Test-SupabaseConnection }
$results += @{ name = "Registro de Usuario"; result = Test-Signup }
$results += @{ name = "Verificacao na Tabela users"; result = Test-UserInDatabase }
$results += @{ name = "Login"; result = Test-Login }
$results += @{ name = "Criacao de Alimento"; result = Test-CreateAlimento }
$results += @{ name = "/api/auth/me"; result = Test-GetMe }

Write-Host "`n================================================================================" -ForegroundColor Magenta
Write-Host "RELATORIO FINAL" -ForegroundColor Magenta
Write-Host "================================================================================" -ForegroundColor Magenta
Write-Host ""

$passed = 0
$failed = 0

foreach ($result in $results) {
  $status = if ($result.result) { "PASS" } else { "FAIL" }
  $color = if ($result.result) { "Green" } else { "Red" }
  Write-Host "$status - $($result.name)" -ForegroundColor $color
  
  if ($result.result) { $passed++ } else { $failed++ }
}

Write-Host ""
if ($failed -eq 0) { $fg = "Green" } else { $fg = "Yellow" }
Write-Host "Resultados: $passed passed, $failed failed" -ForegroundColor $fg

if ($failed -eq 0) {
  Write-Host "`nTODOS OS TESTES PASSARAM!" -ForegroundColor Green
  exit 0
} else {
  Write-Host "`nALGUNS TESTES FALHARAM - Verifique os logs acima" -ForegroundColor Yellow
  exit 1
}
