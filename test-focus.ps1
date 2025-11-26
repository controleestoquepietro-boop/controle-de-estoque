#!/usr/bin/env pwsh

param(
  [string]$ServerUrl = "https://cxpt-core.fly.dev",
  [string]$Email = "controle.estoque.pietro@gmail.com"
)

Write-Host "`n=== TESTE: Importacao de Modelos + Reset de Senha ===" -ForegroundColor Cyan

# 1. Login
Write-Host "`n[1] Login..." -ForegroundColor Yellow
$loginBody = @{ email = $Email; password = "ADM@1234" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Uri "$ServerUrl/api/auth/login" `
  -Method Post -ContentType "application/json" -Body $loginBody `
  -ErrorAction Stop -SessionVariable session
Write-Host "OK - Login sucesso" -ForegroundColor Green

# 2. Testar importacao de modelos COM MULTIPLOS ITENS
Write-Host "`n[2] Importando 3 modelos (array com multiplos itens)..." -ForegroundColor Yellow
$modelos = @(
  @{ codigoProduto = "MULTI-001"; descricao = "Modelo M1"; temperatura = "2-8C"; shelfLife = 30 },
  @{ codigoProduto = "MULTI-002"; descricao = "Modelo M2"; temperatura = "20-25C"; shelfLife = 60 },
  @{ codigoProduto = "MULTI-003"; descricao = "Modelo M3"; temperatura = "15-20C"; shelfLife = 45 }
)

try {
  $response = Invoke-RestMethod -Uri "$ServerUrl/api/modelos-produtos/import" `
    -Method Post -ContentType "application/json" -Body ($modelos | ConvertTo-Json -Depth 5) `
    -WebSession $session -ErrorAction Stop
  
  Write-Host "OK - Importado: $($response.imported), Atualizado: $($response.updated)" -ForegroundColor Green
  if ($response.errors.Count -gt 0) {
    Write-Host "Avisos: $($response.errors)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Listar modelos importados
Write-Host "`n[3] Listando modelos importados..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$ServerUrl/api/modelos-produtos" `
  -Method Get -ContentType "application/json" -WebSession $session

$multiModelos = $response | Where-Object { $_.codigoProduto -like "MULTI-*" }
Write-Host "OK - Encontrados $($multiModelos.Count) modelos MULTI" -ForegroundColor Green
$multiModelos | ForEach-Object {
  Write-Host "  - $($_.codigoProduto): $($_.descricao)" -ForegroundColor Green
}

# 4. Testar forgot password COM RESET URL
Write-Host "`n[4] Solicitando reset de senha..." -ForegroundColor Yellow
$forgotBody = @{ email = $Email } | ConvertTo-Json
try {
  $response = Invoke-RestMethod -Uri "$ServerUrl/api/auth/forgot-password" `
    -Method Post -ContentType "application/json" -Body $forgotBody `
    -ErrorAction Stop
  
  if ($response.resetToken) {
    Write-Host "OK - Token gerado: $($response.resetToken.Substring(0, 10))..." -ForegroundColor Green
  }
  if ($response.resetUrl) {
    Write-Host "OK - URL de reset: $($response.resetUrl)" -ForegroundColor Green
    Write-Host "     Token na URL: $($response.resetUrl.Split('=')[1])" -ForegroundColor Green
  } else {
    Write-Host "AVISO - Sem resetUrl na resposta (producao sem SMTP?)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== TESTE COMPLETO ===" -ForegroundColor Cyan
