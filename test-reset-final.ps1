# Test final reset-password com API REST
$BASE_URL = "https://cxpt-core.fly.dev"
$email = "controle.estoque.pietro@gmail.com"
$oldPassword = "12345678"
$newPassword = "NovaSenh@123"

Write-Host "=== TESTE FINAL RESET PASSWORD ===" -ForegroundColor Cyan

# 1. Check email
Write-Host "`n1️⃣ Verificando email..." -ForegroundColor Yellow
$checkResp = Invoke-RestMethod -Uri "$BASE_URL/api/auth/check-email" -Method Post -Body ([ordered]@{email=$email} | ConvertTo-Json) -ContentType "application/json"
Write-Host "   ✓ Email existe: $($checkResp.exists), Confirmado: $($checkResp.confirmed)"

# 2. Forgot password (gerar token)
Write-Host "`n2️⃣ Solicitando reset (forgot-password)..." -ForegroundColor Yellow
$forgotResp = Invoke-RestMethod -Uri "$BASE_URL/api/auth/forgot-password" -Method Post -Body ([ordered]@{email=$email} | ConvertTo-Json) -ContentType "application/json"
Write-Host "   ✓ $($forgotResp.message)"

# 3. Tentar login com senha antiga (deve funcionar ainda)
Write-Host "`n3️⃣ Testando login com senha antiga..." -ForegroundColor Yellow
try {
  $loginOld = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method Post -Body ([ordered]@{email=$email; password=$oldPassword} | ConvertTo-Json) -ContentType "application/json"
  Write-Host "   ✓ Login com senha antiga funcionou: $($loginOld.message)"
  $userId = $loginOld.user.id
  Write-Host "   💡 User ID: $userId"
} catch {
  Write-Host "   ❌ Erro no login: $($_)" -ForegroundColor Red
  exit 1
}

# 4. Extrair token da base de dados local (simulando)
# Na prática, o token é enviado por email, mas para teste vamos buscar direto do storage
Write-Host "`n4️⃣ Procurando token de reset..." -ForegroundColor Yellow
Write-Host "   (Nota: em produção, token é enviado por email)" -ForegroundColor Gray

# 5. Chamar reset-password (simulando que recebemos o token)
# Criar um token válido chamando forgot novamente e capturando-o
$bodies = @{email=$email; password=$newPassword}
Write-Host "`n5️⃣ Simulando chamada ao reset-password endpoint..." -ForegroundColor Yellow

# Nota: Para este teste, você precisa manualmente:
# a. Clicar no link de reset no email
# b. Ou capturar o token do log da aplicação

Write-Host "`n⚠️  PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "   1. Acesse: $BASE_URL"
Write-Host "   2. Clique em 'Esqueci a senha'"
Write-Host "   3. Insira: $email"
Write-Host "   4. Clique no link do email recebido"
Write-Host "   5. Defina a nova senha: $newPassword"
Write-Host "   6. Vá para Login e tente: email=$email, password=$newPassword"
Write-Host "`n✅ Se conseguir logar com a nova senha, o reset-password está funcionando!" -ForegroundColor Green
