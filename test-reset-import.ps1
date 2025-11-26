#!/usr/bin/env pwsh

param(
  [string]$ServerUrl = "https://cxpt-core.fly.dev",
  [string]$Email = "controle.estoque.pietro@gmail.com"
)

Write-Host "`n=== TESTE: Redefinir Senha + Importar Modelos ===" -ForegroundColor Cyan

# 1. Login
Write-Host "`n[1] Login..." -ForegroundColor Yellow
$loginBody = @{ email = $Email; password = "ADM@12345" } | ConvertTo-Json
try {
  $loginResponse = Invoke-RestMethod -Uri "$ServerUrl/api/auth/login" `
    -Method Post -ContentType "application/json" -Body $loginBody `
    -ErrorAction Stop -SessionVariable session
  Write-Host "OK - Login sucesso" -ForegroundColor Green
} catch {
  Write-Host "ERRO ao login: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

# 2. Testar reset-password (simular clique em "Ir para redefinir senha")
Write-Host "`n[2] Solicitando reset de senha..." -ForegroundColor Yellow
$forgotBody = @{ email = $Email } | ConvertTo-Json
try {
  $response = Invoke-RestMethod -Uri "$ServerUrl/api/auth/forgot-password" `
    -Method Post -ContentType "application/json" -Body $forgotBody `
    -ErrorAction Stop
  
  if ($response.resetUrl) {
    $resetUrl = $response.resetUrl
    Write-Host "OK - URL obtida: $resetUrl" -ForegroundColor Green
    
    # 3. Agora simular acessar a página de reset
    Write-Host "`n[3] Acessando página de reset com token..." -ForegroundColor Yellow
    
    # Extrair token da URL
    $token = $resetUrl.Split('=')[1]
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    
    # 4. Testar reset-password endpoint
    Write-Host "`n[4] Testando reset de senha com token..." -ForegroundColor Yellow
    $resetBody = @{
      token = $token
      newPassword = "ADM@123456"
    } | ConvertTo-Json
    
    try {
      $resetResponse = Invoke-RestMethod -Uri "$ServerUrl/api/auth/reset-password" `
        -Method Post -ContentType "application/json" -Body $resetBody `
        -ErrorAction Stop
      
      Write-Host "OK - Senha resetada: $($resetResponse.message)" -ForegroundColor Green
    } catch {
      Write-Host "ERRO ao resetar: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
} catch {
  Write-Host "ERRO ao forgot-password: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Testar importacao com JSON do Excel (simular erro de validação)
Write-Host "`n[5] Importando modelos com dados de Excel..." -ForegroundColor Yellow
$modelosExcel = @(
  @{
    codigoProduto = "EXCEL-001"
    descricao = "Produto Excel"
    temperatura = "2-8C"
    shelfLife = 30
  },
  @{
    codigoProduto = "EXCEL-002"
    descricao = "Outro Produto"
    temperatura = "20-25C"
    shelfLife = 60
  }
)

try {
  $importResponse = Invoke-RestMethod -Uri "$ServerUrl/api/modelos-produtos/import" `
    -Method Post -ContentType "application/json" -Body ($modelosExcel | ConvertTo-Json -Depth 5) `
    -WebSession $session -ErrorAction Stop
  
  Write-Host "OK - Importado: $($importResponse.imported), Atualizado: $($importResponse.updated)" -ForegroundColor Green
  if ($importResponse.errors -and $importResponse.errors.Count -gt 0) {
    Write-Host "Erros: $($importResponse.errors)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "ERRO ao importar: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== TESTE COMPLETO ===" -ForegroundColor Cyan
