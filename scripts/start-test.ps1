# Тестовый запуск с ноутбука: сайт + публичная ссылка https://….trycloudflare.com для тестировщиков.
# Пошагово — docs/testing-laptop.md.
#
#   .\scripts\start-test.ps1            # собрать, запустить, открыть туннель
#   .\scripts\start-test.ps1 -NoBuild   # без пересборки (если код не менялся)
#   .\scripts\start-test.ps1 -NoTunnel  # только локально, http://localhost:3000
#
# PostgreSQL должен уже работать (backend берёт адрес из backend\.env).
# Остановить всё — Ctrl+C в этом окне.

param([switch]$NoBuild, [switch]$NoTunnel)

# Не 'Stop': npx и prisma пишут предупреждения в stderr, а PowerShell 5.1 считает их ошибками.
# Настоящие ошибки ловим по коду возврата ($LASTEXITCODE) и throw.
$ErrorActionPreference = 'Continue'
$root = Split-Path $PSScriptRoot -Parent
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'
$logDir = Join-Path $env:TEMP 'idu-help-test'
New-Item -ItemType Directory -Force $logDir | Out-Null

function Step($text) { Write-Host "`n» $text" -ForegroundColor Cyan }

function Wait-Http($url, $name, $log) {
  for ($i = 0; $i -lt 60; $i++) {
    try {
      Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 | Out-Null
      return
    } catch {
      # Любой HTTP-ответ (даже 401/404) значит, что сервер запущен
      if ($_.Exception.Response) { return }
    }
    Start-Sleep -Seconds 1
  }
  throw "$name не запустился за минуту. Журнал: $log"
}

function Stop-Tree($proc) {
  if ($proc -and -not $proc.HasExited) { taskkill /T /F /PID $proc.Id 2>$null | Out-Null }
}

foreach ($port in 3000, 3001) {
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    throw "Порт $port уже занят — остановите запущенный backend/frontend и повторите."
  }
}

# Сайт ходит в API по тому же адресу (/api/v1), frontend пересылает /api/* на backend:3001.
# Поэтому наружу достаточно открыть один порт 3000.
$env:NEXT_PUBLIC_API_URL = '/api/v1'
$env:NEXT_PUBLIC_STAND_LABEL = 'Тестовый стенд. Не вводите настоящие имена, телефоны и адреса — данные периодически удаляются.'
$env:NEXT_TELEMETRY_DISABLED = '1'
# Телефон координатора для «Забыли пароль?» (тестовый координатор)
$env:NEXT_PUBLIC_SUPPORT_PHONE = '+79000000002'

if (-not $NoBuild) {
  Step 'Сборка backend'
  Push-Location $backendDir
  try {
    npx prisma generate | Out-Null
    npm run build; if ($LASTEXITCODE) { throw 'Сборка backend не удалась' }
  } finally { Pop-Location }

  Step 'Сборка frontend (3–5 минут)'
  Push-Location $frontendDir
  $env:NEXT_BUILD_CPUS = '1'
  try { npm run build; if ($LASTEXITCODE) { throw 'Сборка frontend не удалась' } } finally { Pop-Location }
}

$backend = $null; $frontend = $null
try {
  Step 'Обновление базы данных (новые миграции)'
  Push-Location $backendDir
  try { npx prisma migrate deploy; if ($LASTEXITCODE) { throw 'Не удалось применить миграции — запущен ли PostgreSQL?' } } finally { Pop-Location }

  Step 'Запуск backend'
  # Через туннель все посетители приходят с одного адреса — общий лимит запросов на время теста выключен
  $env:THROTTLE_ENABLED = 'false'
  $env:NODE_ENV = 'production'
  $backend = Start-Process node -ArgumentList 'dist/main.js' -WorkingDirectory $backendDir -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput "$logDir\backend.log" -RedirectStandardError "$logDir\backend.err.log"
  Wait-Http 'http://localhost:3001/api/docs' 'Backend' "$logDir\backend.err.log"

  Step 'Запуск frontend'
  $frontend = Start-Process node -ArgumentList 'node_modules/next/dist/bin/next', 'start', '-p', '3000' `
    -WorkingDirectory $frontendDir -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput "$logDir\frontend.log" -RedirectStandardError "$logDir\frontend.err.log"
  Wait-Http 'http://localhost:3000/' 'Frontend' "$logDir\frontend.err.log"
  Write-Host 'Сайт на этом компьютере: http://localhost:3000' -ForegroundColor Green

  if ($NoTunnel) {
    Write-Host "`nНажмите Ctrl+C, чтобы остановить."
    while (-not $backend.HasExited -and -not $frontend.HasExited) { Start-Sleep -Seconds 2 }
    return
  }

  $cf = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
  if (-not $cf) { $cf = "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe" }
  if (-not (Test-Path $cf)) { throw 'Нет cloudflared: winget install --id Cloudflare.cloudflared' }

  Step 'Открываю туннель (ссылка появится через 5–15 секунд)'
  $shown = $false
  # cloudflared пишет журнал в stderr; в PowerShell 5.1 при 'Stop' каждая такая строка — исключение
  $ErrorActionPreference = 'Continue'
  & $cf tunnel --no-autoupdate --url http://localhost:3000 2>&1 | ForEach-Object {
    $line = "$_"
    Add-Content -Path "$logDir\tunnel.log" -Value $line
    if (-not $shown -and $line -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
      $shown = $true
      $url = $Matches[0]
      try { Set-Clipboard -Value $url } catch {}
      Write-Host ''
      Write-Host '  ┌──────────────────────────────────────────────────────────────┐' -ForegroundColor Green
      Write-Host "    Ссылка для тестировщиков (уже скопирована):" -ForegroundColor Green
      Write-Host "    $url" -ForegroundColor Yellow
      Write-Host '  └──────────────────────────────────────────────────────────────┘' -ForegroundColor Green
      Write-Host "  Работает, пока открыто это окно. Остановить — Ctrl+C. Журналы: $logDir"
    }
  }
} finally {
  Step 'Останавливаю backend и frontend'
  Stop-Tree $frontend
  Stop-Tree $backend
}
