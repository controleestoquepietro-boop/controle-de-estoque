#!/usr/bin/env pwsh

param(
  [string]$ServerUrl = "https://cxpt-core.fly.dev",
  [string]$Email = "controle.estoque.pietro@gmail.com",
  [string]$Password = "ADM1234"
)

Write-Host "`n=== TESTE DE IMPORTACAO DE MODELOS ===" -ForegroundColor Cyan

# 1. Login
Write-Host "`n[1] Fazendo login..." -ForegroundColor Yellow
$loginBody = @{
  email = $Email
  password = $Password
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$ServerUrl/api/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body $loginBody `
  -ErrorAction Stop `
  -SessionVariable session

Write-Host "OK - Login com sucesso - UserId: $($loginResponse.user.id)" -ForegroundColor Green

# 2. Tentar importar modelos
Write-Host "`n[2] Testando import de modelos..." -ForegroundColor Yellow

$modelos = @(
  @{
    codigoProduto = "DEBUG-001"
    descricao = "Modelo Debug 1"
    temperatura = "2-8C"
    shelfLife = 30
    gtin = "123456789012"
    pesoEmbalagem = 100
    pesoPorCaixa = 5000
    empresa = "Empresa Debug"
  }
)

$bodyJson = $modelos | ConvertTo-Json -Depth 5
Write-Host "Enviando payload:" -ForegroundColor Cyan

try {
  $response = Invoke-RestMethod -Uri "$ServerUrl/api/modelos-produtos/import" `
    -Method Post `
    -ContentType "application/json" `
    -Body $bodyJson `
    -WebSession $session `
    -ErrorAction Stop

  Write-Host "OK - Importacao sucesso:" -ForegroundColor Green
  Write-Host ($response | ConvertTo-Json) -ForegroundColor Green
} catch {
  Write-Host "ERRO ao importar:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Resposta do servidor:" -ForegroundColor Red
    Write-Host $responseBody -ForegroundColor Red
  }
}

# 3. Listar modelos
Write-Host "`n[3] Listando modelos..." -ForegroundColor Yellow

try {
  $response = Invoke-RestMethod -Uri "$ServerUrl/api/modelos-produtos" `
    -Method Get `
    -ContentType "application/json" `
    -WebSession $session `
    -ErrorAction Stop

  Write-Host "OK - Total modelos: $($response.Count)" -ForegroundColor Green
  $response | ForEach-Object {
    Write-Host "  - $($_.codigoProduto): $($_.descricao)" -ForegroundColor Green
  }
} catch {
  Write-Host "ERRO ao listar modelos:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
}
