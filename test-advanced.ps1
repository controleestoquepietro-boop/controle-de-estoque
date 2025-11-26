#!/usr/bin/env pwsh

param(
  [string]$ServerUrl = "http://localhost:5000",
  [string]$Email = "controle.estoque.pietro@gmail.com",
  [string]$OldPassword = "adm1234",
  [string]$NewPassword = "ADM1234"
)

$ErrorActionPreference = "Continue"

# Cores para output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"

Write-Host "`n================================================================================`n" -ForegroundColor $Cyan
Write-Host "TESTE AVANÇADO: Redefinir Senha, Trocar Senha, Importar Dados" -ForegroundColor $Cyan
Write-Host "================================================================================`n" -ForegroundColor $Cyan
Write-Host "Servidor: $ServerUrl`n" -ForegroundColor $Yellow

# ============================================================================
# TESTE 1: LOGIN COM SENHA ANTIGA
# ============================================================================
function Test-LoginOldPassword {
  Write-Host "[1/7] Testando login com senha antiga..." -ForegroundColor $Cyan
  
  try {
    $body = @{
      email = $Email
      password = $OldPassword
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/auth/login" `
      -Method Post `
      -ContentType "application/json" `
      -Body $body `
      -ErrorAction Stop `
      -SessionVariable session
    
    Write-Host "PASS - Login com senha antiga OK" -ForegroundColor $Green
    Write-Host "UserId: $($response.user.id)" -ForegroundColor $Green
    
    $script:session = $session
    $script:userId = $response.user.id
    
    return $true
  } catch {
    Write-Host "FAIL - Erro ao fazer login: $_" -ForegroundColor $Red
    return $false
  }
}

# ============================================================================
# TESTE 2: FORGOT PASSWORD
# ============================================================================
function Test-ForgotPassword {
  Write-Host "`n[2/7] Testando forgot password..." -ForegroundColor $Cyan
  
  try {
    $body = @{
      email = $Email
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/auth/forgot-password" `
      -Method Post `
      -ContentType "application/json" `
      -Body $body `
      -ErrorAction Stop
    
    Write-Host "PASS - Forgot password iniciado" -ForegroundColor $Green
    Write-Host "Resposta: $($response.message)" -ForegroundColor $Green
    Write-Host "NOTA: Email de reset foi enviado (verificar caixa de entrada)" -ForegroundColor $Yellow
    
    return $true
  } catch {
    Write-Host "FAIL - Erro ao fazer forgot password: $_" -ForegroundColor $Red
    return $false
  }
}

# ============================================================================
# TESTE 3: TROCAR SENHA (Change Password)
# ============================================================================
function Test-ChangePassword {
  Write-Host "`n[3/7] Testando trocar senha (change password)..." -ForegroundColor $Cyan
  
  if (-not $script:session) {
    Write-Host "SKIP - Sessão não disponível" -ForegroundColor $Yellow
    return $false
  }
  
  try {
    $body = @{
      oldPassword = $OldPassword
      newPassword = $NewPassword
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/auth/change-password" `
      -Method Post `
      -ContentType "application/json" `
      -Body $body `
      -WebSession $script:session `
      -ErrorAction Stop
    
    Write-Host "PASS - Senha alterada com sucesso" -ForegroundColor $Green
    Write-Host "Resposta: $($response.message)" -ForegroundColor $Green
    
    # Atualizar variável para próximos testes
    $script:currentPassword = $NewPassword
    
    return $true
  } catch {
    Write-Host "FAIL - Erro ao trocar senha: $_" -ForegroundColor $Red
    return $false
  }
}

# ============================================================================
# TESTE 4: LOGIN COM NOVA SENHA
# ============================================================================
function Test-LoginNewPassword {
  Write-Host "`n[4/7] Testando login com nova senha..." -ForegroundColor $Cyan
  
  try {
    $body = @{
      email = $Email
      password = $NewPassword
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/auth/login" `
      -Method Post `
      -ContentType "application/json" `
      -Body $body `
      -ErrorAction Stop `
      -SessionVariable newSession
    
    Write-Host "PASS - Login com nova senha OK" -ForegroundColor $Green
    Write-Host "UserId: $($response.user.id)" -ForegroundColor $Green
    
    $script:session = $newSession
    
    return $true
  } catch {
    Write-Host "FAIL - Erro ao fazer login com nova senha: $_" -ForegroundColor $Red
    return $false
  }
}

# ============================================================================
# TESTE 5: IMPORTAR MODELOS DE PRODUTOS
# ============================================================================
function Test-ImportModelos {
  Write-Host "`n[5/7] Testando importação de modelos de produtos..." -ForegroundColor $Cyan
  
  if (-not $script:session) {
    Write-Host "SKIP - Sessão não disponível" -ForegroundColor $Yellow
    return $false
  }
  
  try {
    # Criar dados de teste para importação
    $modelos = @(
      @{
        codigoProduto = "MOD-001"
        descricao = "Modelo Teste 1"
        temperatura = "2-8°C"
        shelfLife = 30
        gtin = "123456789012"
        pesoEmbalagem = 100
        pesoPorCaixa = 5000
        empresa = "Empresa Teste"
      },
      @{
        codigoProduto = "MOD-002"
        descricao = "Modelo Teste 2"
        temperatura = "20-25°C"
        shelfLife = 60
        gtin = "123456789013"
        pesoEmbalagem = 200
        pesoPorCaixa = 10000
        empresa = "Empresa Teste"
      }
    )
    
    $body = $modelos | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/modelos-produtos/import" `
      -Method Post `
      -ContentType "application/json" `
      -Body $body `
      -WebSession $script:session `
      -ErrorAction Stop
    
    Write-Host "PASS - Modelos importados com sucesso" -ForegroundColor $Green
    Write-Host "Resposta: $($response | ConvertTo-Json)" -ForegroundColor $Green
    
    return $true
  } catch {
    Write-Host "FAIL - Erro ao importar modelos: $_" -ForegroundColor $Red
    return $false
  }
}

# ============================================================================
# TESTE 6: IMPORTAR ALIMENTOS
# ============================================================================
function Test-ImportAlimentos {
  Write-Host "`n[6/7] Testando importação de alimentos..." -ForegroundColor $Cyan
  
  if (-not $script:session) {
    Write-Host "SKIP - Sessão não disponível" -ForegroundColor $Yellow
    return $false
  }
  
  try {
    # Criar dados de teste para importação
    $alimentos = @(
      @{
        codigoProduto = "ALIM-001"
        nome = "Alimento Importado 1"
        unidade = "kg"
        lote = "LOTE-IMP-001"
        dataFabricacao = (Get-Date).AddDays(-10).ToString("yyyy-MM-dd")
        dataValidade = (Get-Date).AddDays(20).ToString("yyyy-MM-dd")
        quantidade = 100
        pesoPorCaixa = 25
        temperatura = "2-8°C"
        shelfLife = 30
        categoria = "Alimentos Processados"
        alertasConfig = @{
          contarAPartirFabricacaoDias = 5
          avisoQuandoUmTercoValidade = $true
          popUpNotificacoes = $true
        }
      },
      @{
        codigoProduto = "ALIM-002"
        nome = "Alimento Importado 2"
        unidade = "caixa"
        lote = "LOTE-IMP-002"
        dataFabricacao = (Get-Date).AddDays(-5).ToString("yyyy-MM-dd")
        dataValidade = (Get-Date).AddDays(45).ToString("yyyy-MM-dd")
        quantidade = 50
        pesoPorCaixa = 50
        temperatura = "20-25°C"
        shelfLife = 60
        categoria = "Bebidas"
        alertasConfig = @{
          contarAPartirFabricacaoDias = 10
          avisoQuandoUmTercoValidade = $true
          popUpNotificacoes = $false
        }
      }
    )
    
    $body = $alimentos | ConvertTo-Json -Depth 5
    
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/alimentos/import" `
      -Method Post `
      -ContentType "application/json" `
      -Body $body `
      -WebSession $script:session `
      -ErrorAction Stop
    
    Write-Host "PASS - Alimentos importados com sucesso" -ForegroundColor $Green
    Write-Host "Total importado: $($response.imported) alimentos" -ForegroundColor $Green
    if ($response.errors -and $response.errors.Count -gt 0) {
      Write-Host "Erros: $($response.errors)" -ForegroundColor $Yellow
    }
    
    return $true
  } catch {
    Write-Host "FAIL - Erro ao importar alimentos: $_" -ForegroundColor $Red
    return $false
  }
}

# ============================================================================
# TESTE 7: LISTAR ALIMENTOS IMPORTADOS
# ============================================================================
function Test-ListAlimentos {
  Write-Host "`n[7/7] Testando listagem de alimentos..." -ForegroundColor $Cyan
  
  if (-not $script:session) {
    Write-Host "SKIP - Sessão não disponível" -ForegroundColor $Yellow
    return $false
  }
  
  try {
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/alimentos" `
      -Method Get `
      -ContentType "application/json" `
      -WebSession $script:session `
      -ErrorAction Stop
    
    Write-Host "PASS - Alimentos listados com sucesso" -ForegroundColor $Green
    Write-Host "Total de alimentos: $($response.Count)" -ForegroundColor $Green
    
    if ($response.Count -gt 0) {
      Write-Host "Primeiros 3 alimentos:" -ForegroundColor $Cyan
      $response | Select-Object -First 3 | ForEach-Object {
        Write-Host "  - $($_.nome) (ID: $($_.id), Quantidade: $($_.quantidade))" -ForegroundColor $Green
      }
    }
    
    return $true
  } catch {
    Write-Host "FAIL - Erro ao listar alimentos: $_" -ForegroundColor $Red
    return $false
  }
}

# ============================================================================
# EXECUTAR TODOS OS TESTES
# ============================================================================
$results = @()

$results += @{ name = "Login com Senha Antiga"; result = Test-LoginOldPassword }
$results += @{ name = "Forgot Password"; result = Test-ForgotPassword }
$results += @{ name = "Trocar Senha"; result = Test-ChangePassword }
$results += @{ name = "Login com Nova Senha"; result = Test-LoginNewPassword }
$results += @{ name = "Importar Modelos"; result = Test-ImportModelos }
$results += @{ name = "Importar Alimentos"; result = Test-ImportAlimentos }
$results += @{ name = "Listar Alimentos"; result = Test-ListAlimentos }

# ============================================================================
# RELATÓRIO FINAL
# ============================================================================
Write-Host "`n================================================================================`n" -ForegroundColor $Cyan
Write-Host "RELATORIO FINAL" -ForegroundColor $Cyan
Write-Host "================================================================================`n" -ForegroundColor $Cyan

$passed = 0
$failed = 0

foreach ($test in $results) {
  $status = if ($test.result) { "PASS" } else { "FAIL" }
  $color = if ($test.result) { $Green } else { $Red }
  Write-Host "$status - $($test.name)" -ForegroundColor $color
  
  if ($test.result) { $passed++ } else { $failed++ }
}

Write-Host "`nResultados: $passed passed, $failed failed`n" -ForegroundColor $Cyan

if ($failed -eq 0) {
  Write-Host "✅ TODOS OS TESTES PASSARAM!`n" -ForegroundColor $Green
  exit 0
} else {
  Write-Host "⚠️ ALGUNS TESTES FALHARAM - Verifique os logs acima`n" -ForegroundColor $Red
  exit 1
}
