# E2E test script: impersonate -> create alimento -> saida -> audit-log -> delete
$base = 'http://127.0.0.1:5000'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function PostJson($path, $obj) {
  $json = $obj | ConvertTo-Json -Depth 6
  return Invoke-RestMethod -Uri ($base + $path) -Method Post -Body $json -ContentType 'application/json' -WebSession $session
}

function GetJson($path) {
  return Invoke-RestMethod -Uri ($base + $path) -Method Get -WebSession $session
}

Write-Host "1) Impersonate as ADM2 (adm@example.com)"
$imp = PostJson '/api/dev/impersonate' @{ email = 'adm@example.com' }
Write-Host "Impersonate result:"; $imp | ConvertTo-Json

Write-Host "2) Create alimento"
$alimentoData = @{ codigoProduto='ADM-TEST-001'; nome='Alimento Teste ADM'; unidade='kg'; lote='L001'; dataFabricacao='2025-11-01'; dataValidade='2026-11-01'; quantidade=10; pesoPorCaixa=$null; temperatura='18°C'; shelfLife=365; alertasConfig = @{ contarAPartirFabricacaoDias=10; avisoQuandoUmTercoValidade=$true; popUpNotificacoes=$true } }
$create = PostJson '/api/alimentos' $alimentoData
Write-Host "Created alimento:"; $create | ConvertTo-Json

$alimentoId = $create.id

Write-Host "3) Register saida (quantidade=2)"
$saida = PostJson ("/api/alimentos/$alimentoId/saida") @{ quantidade = 2 }
Write-Host "Saida response:"; $saida | ConvertTo-Json

Write-Host "4) Fetch audit-log"
$logs = GetJson '/api/audit-log'
Write-Host "Audit-log entries count:" ($logs | Measure-Object).Count
$logs | ConvertTo-Json -Depth 6

Write-Host "5) Delete alimento"
$del = Invoke-RestMethod -Uri ($base + "/api/alimentos/$alimentoId") -Method Delete -WebSession $session
Write-Host "Delete response:"; $del | ConvertTo-Json

Write-Host "Done"
