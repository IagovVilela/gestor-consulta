# Script para iniciar Backend e Frontend de forma estavel
# Garante que os servidores continuem rodando mesmo com alteracoes

# Configurar encoding UTF-8 para caracteres especiais
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  INICIANDO SERVIDORES - GESTOR DE CONSULTAS MÉDICAS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Cores para output
$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

# Funcao para verificar se uma porta esta em uso
function Test-Port {
    param([int]$Port)
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        return $null -ne $connection
    } catch {
        return $false
    }
}

# Funcao para finalizar processos em portas especificas
function Stop-PortProcess {
    param([int]$Port)
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
            Select-Object -ExpandProperty OwningProcess -Unique
        if ($processes) {
            foreach ($processId in $processes) {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
            Start-Sleep -Seconds 2
            Write-Host "[OK] Processos na porta $Port finalizados" -ForegroundColor $SuccessColor
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

# Verificar MySQL (local ou Docker)
Write-Host "[0/7] Verificando MySQL..." -ForegroundColor $InfoColor
$mysqlLocal = $false
$mysqlDocker = $false

# Verificar MySQL local primeiro
try {
    $mysqlTest = Test-NetConnection -ComputerName localhost -Port 3306 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($mysqlTest.TcpTestSucceeded) {
        Write-Host "    [OK] MySQL local esta rodando na porta 3306" -ForegroundColor $SuccessColor
        $mysqlLocal = $true
    }
} catch {
    # Ignorar erro
}

# Se nao tem MySQL local, verificar Docker
if (-not $mysqlLocal) {
    try {
        $dockerVersion = docker --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    [INFO] Docker instalado" -ForegroundColor $InfoColor
            
            $dockerPs = docker ps 2>&1
            if ($LASTEXITCODE -eq 0) {
                $mysqlContainer = docker ps --filter "name=gestor-consulta-mysql" --format "{{.Names}}" 2>&1
                if ($mysqlContainer -like "*gestor-consulta-mysql*") {
                    Write-Host "    [OK] Container MySQL Docker esta rodando" -ForegroundColor $SuccessColor
                    $mysqlDocker = $true
                } else {
                    Write-Host "    [AVISO] Container MySQL Docker nao esta rodando" -ForegroundColor $WarningColor
                    Write-Host "            Tentando iniciar MySQL no Docker..." -ForegroundColor $WarningColor
                    docker-compose up -d 2>&1 | Out-Null
                    Start-Sleep -Seconds 5
                    $mysqlContainer = docker ps --filter "name=gestor-consulta-mysql" --format "{{.Names}}" 2>&1
                    if ($mysqlContainer -like "*gestor-consulta-mysql*") {
                        Write-Host "    [OK] MySQL Docker iniciado com sucesso" -ForegroundColor $SuccessColor
                        $mysqlDocker = $true
                    }
                }
            }
        }
    } catch {
        # Ignorar erro Docker
    }
}

if (-not $mysqlLocal -and -not $mysqlDocker) {
    Write-Host "    [AVISO] Nenhum MySQL detectado (local ou Docker)" -ForegroundColor $WarningColor
    Write-Host "            O sistema tentara conectar mesmo assim" -ForegroundColor $WarningColor
}
Write-Host ""

# Limpar processos anteriores
Write-Host "[1/7] Limpando processos anteriores..." -ForegroundColor $InfoColor
$cleanedBackend = Stop-PortProcess -Port 3001
$cleanedFrontend = Stop-PortProcess -Port 3000

if (-not $cleanedBackend -and -not $cleanedFrontend) {
    Write-Host "    Nenhum processo anterior encontrado" -ForegroundColor Gray
}
Write-Host ""

# Caminhos dos projetos
$BackendPath = Join-Path $PSScriptRoot "backend"
$FrontendPath = Join-Path $PSScriptRoot "frontend"

# Verificar se os diretorios existem
Write-Host "[2/7] Verificando estrutura do projeto..." -ForegroundColor $InfoColor
if (-not (Test-Path $BackendPath)) {
    Write-Host "[ERRO] Diretorio backend nao encontrado: $BackendPath" -ForegroundColor $ErrorColor
    Write-Host "Pressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host "    Backend encontrado: $BackendPath" -ForegroundColor Gray

if (-not (Test-Path $FrontendPath)) {
    Write-Host "[ERRO] Diretorio frontend nao encontrado: $FrontendPath" -ForegroundColor $ErrorColor
    Write-Host "Pressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host "    Frontend encontrado: $FrontendPath" -ForegroundColor Gray
Write-Host ""

# Verificar dependencias e Prisma
Write-Host "[3/7] Verificando dependencias..." -ForegroundColor $InfoColor

# Backend
if (-not (Test-Path "$BackendPath\node_modules")) {
    Write-Host "    [AVISO] node_modules do backend nao encontrado!" -ForegroundColor $WarningColor
    Write-Host "            Instalando dependencias do backend..." -ForegroundColor $WarningColor
    Push-Location $BackendPath
    try {
        npm install 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    [OK] Dependencias do backend instaladas" -ForegroundColor $SuccessColor
        } else {
            Write-Host "    [ERRO] Falha ao instalar dependencias do backend" -ForegroundColor $ErrorColor
        }
    } catch {
        Write-Host "    [ERRO] Erro ao instalar dependencias: $_" -ForegroundColor $ErrorColor
    }
    Pop-Location
} else {
    Write-Host "    [OK] Dependencias do backend encontradas" -ForegroundColor $SuccessColor
}

# Verificar Prisma Client
if (-not (Test-Path "$BackendPath\node_modules\.prisma")) {
    Write-Host "    [AVISO] Prisma Client nao encontrado. Gerando..." -ForegroundColor $WarningColor
    Push-Location $BackendPath
    try {
        npx prisma generate 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    [OK] Prisma Client gerado" -ForegroundColor $SuccessColor
        }
    } catch {
        Write-Host "    [AVISO] Erro ao gerar Prisma Client" -ForegroundColor $WarningColor
    }
    Pop-Location
} else {
    Write-Host "    [OK] Prisma Client encontrado" -ForegroundColor $SuccessColor
}

# Frontend
if (-not (Test-Path "$FrontendPath\node_modules")) {
    Write-Host "    [AVISO] node_modules do frontend nao encontrado!" -ForegroundColor $WarningColor
    Write-Host "            Instalando dependencias do frontend..." -ForegroundColor $WarningColor
    Push-Location $FrontendPath
    try {
        npm install 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    [OK] Dependencias do frontend instaladas" -ForegroundColor $SuccessColor
        } else {
            Write-Host "    [ERRO] Falha ao instalar dependencias do frontend" -ForegroundColor $ErrorColor
        }
    } catch {
        Write-Host "    [ERRO] Erro ao instalar dependencias: $_" -ForegroundColor $ErrorColor
    }
    Pop-Location
} else {
    Write-Host "    [OK] Dependencias do frontend encontradas" -ForegroundColor $SuccessColor
}
Write-Host ""

# Verificar e criar arquivo .env do backend
Write-Host "[4/7] Verificando configuracoes..." -ForegroundColor $InfoColor
if (-not (Test-Path "$BackendPath\.env")) {
    Write-Host "    [AVISO] Arquivo .env do backend nao encontrado!" -ForegroundColor $WarningColor
    Write-Host "            Criando arquivo .env com valores padrao..." -ForegroundColor $WarningColor
    
    # Gerar secret aleatorio para JWT
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    
    # Verificar se MySQL local esta rodando
    $useRoot = $false
    try {
        $mysqlTest = Test-NetConnection -ComputerName localhost -Port 3306 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        if ($mysqlTest.TcpTestSucceeded) {
            Write-Host "    [INFO] MySQL local detectado na porta 3306" -ForegroundColor $InfoColor
            $useRoot = $true
        }
    } catch {
        # Ignorar erro
    }
    
    # Usar root se MySQL local, caso contrario usar gestor_user (Docker)
    if ($useRoot) {
        $databaseUrl = "mysql://root@localhost:3306/gestor_consulta?schema=public"
        Write-Host "    [INFO] Configurando para MySQL local (root)" -ForegroundColor $InfoColor
    } else {
        $databaseUrl = "mysql://gestor_user:gestor_password@localhost:3306/gestor_consulta?schema=public"
        Write-Host "    [INFO] Configurando para Docker MySQL (gestor_user)" -ForegroundColor $InfoColor
    }
    
    $envContent = @"
# Database
# Se estiver usando MySQL local, use: mysql://root@localhost:3306/gestor_consulta?schema=public
# Se estiver usando Docker, use: mysql://gestor_user:gestor_password@localhost:3306/gestor_consulta?schema=public
DATABASE_URL="$databaseUrl"

# JWT
JWT_SECRET="$jwtSecret"
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DEST=./uploads
"@
    
    try {
        $envContent | Out-File -FilePath "$BackendPath\.env" -Encoding UTF8 -Force
        Write-Host "    [OK] Arquivo .env criado com sucesso" -ForegroundColor $SuccessColor
        Write-Host "    [INFO] JWT_SECRET gerado automaticamente" -ForegroundColor $InfoColor
    } catch {
        Write-Host "    [ERRO] Falha ao criar arquivo .env: $_" -ForegroundColor $ErrorColor
        Write-Host "            Crie manualmente o arquivo backend/.env" -ForegroundColor $ErrorColor
    }
} else {
    Write-Host "    [OK] Arquivo .env do backend encontrado" -ForegroundColor $SuccessColor
    
    # Verificar e corrigir DATABASE_URL se necessario
    $envContent = Get-Content "$BackendPath\.env" -Raw -ErrorAction SilentlyContinue
    $needsUpdate = $false
    
    # Se esta usando gestor_user mas MySQL local esta rodando, atualizar para root
    if ($envContent -and $envContent -like "*gestor_user*" -and $mysqlLocal) {
        Write-Host "    [AVISO] DATABASE_URL usa gestor_user mas MySQL local detectado" -ForegroundColor $WarningColor
        Write-Host "            Atualizando para usar root..." -ForegroundColor $WarningColor
        $envContent = $envContent -replace 'mysql://gestor_user:gestor_password@localhost:3306', 'mysql://root@localhost:3306'
        $needsUpdate = $true
    }
    
    # Se esta usando root mas so tem Docker, manter ou avisar
    if ($envContent -and $envContent -like "*root@localhost*" -and -not $mysqlLocal -and $mysqlDocker) {
        Write-Host "    [INFO] DATABASE_URL configurado para root (OK para Docker tambem)" -ForegroundColor $InfoColor
    }
    
    # Verificar se JWT_SECRET esta configurado
    if ($envContent -and $envContent -notlike "*JWT_SECRET*") {
        Write-Host "    [AVISO] JWT_SECRET nao encontrado no .env!" -ForegroundColor $WarningColor
        Write-Host "            Adicione JWT_SECRET ao arquivo .env" -ForegroundColor $WarningColor
    }
    
    # Atualizar arquivo se necessario
    if ($needsUpdate) {
        try {
            $envContent | Out-File -FilePath "$BackendPath\.env" -Encoding UTF8 -Force
            Write-Host "    [OK] Arquivo .env atualizado" -ForegroundColor $SuccessColor
        } catch {
            Write-Host "    [AVISO] Nao foi possivel atualizar .env automaticamente" -ForegroundColor $WarningColor
        }
    }
}

if (-not (Test-Path "$FrontendPath\.env.local")) {
    Write-Host "    [AVISO] Arquivo .env.local do frontend nao encontrado!" -ForegroundColor $WarningColor
    Write-Host "            Criando .env.local com valores padrao..." -ForegroundColor $WarningColor
    $frontendEnv = @"
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=Gestor de Consultas
"@
    $frontendEnv | Out-File -FilePath "$FrontendPath\.env.local" -Encoding UTF8 -Force
    Write-Host "    [OK] Arquivo .env.local criado" -ForegroundColor $SuccessColor
} else {
    Write-Host "    [OK] Arquivo .env.local do frontend encontrado" -ForegroundColor $SuccessColor
    
    # Verificar e corrigir se necessario
    $envContent = Get-Content "$FrontendPath\.env.local" -Raw -ErrorAction SilentlyContinue
    if ($envContent -and $envContent -like "*NEXT_PUBLIC_API_URL*" -and $envContent -notlike "*/api*") {
        Write-Host "    [AVISO] Corrigindo URL da API (adicionando /api)..." -ForegroundColor $WarningColor
        $envContent = $envContent -replace 'NEXT_PUBLIC_API_URL=http://localhost:3001([^/])', 'NEXT_PUBLIC_API_URL=http://localhost:3001/api$1'
        $envContent = $envContent -replace 'NEXT_PUBLIC_API_URL=http://localhost:3001$', 'NEXT_PUBLIC_API_URL=http://localhost:3001/api'
        $envContent | Out-File -FilePath "$FrontendPath\.env.local" -Encoding UTF8 -Force
        Write-Host "    [OK] Arquivo .env.local corrigido" -ForegroundColor $SuccessColor
    }
}
Write-Host ""

# Verificar migracoes do banco
Write-Host "[5/7] Verificando migracoes do banco de dados..." -ForegroundColor $InfoColor
Push-Location $BackendPath
try {
    # Verificar se existem migracoes
    $migrationsPath = Join-Path $BackendPath "prisma\migrations"
    if (-not (Test-Path $migrationsPath) -or (Get-ChildItem $migrationsPath -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0) {
        Write-Host "    [AVISO] Migracoes nao encontradas!" -ForegroundColor $WarningColor
        Write-Host "            Execute: cd backend && npx prisma migrate dev --name init" -ForegroundColor $WarningColor
        Write-Host "            Ou aguarde e execute manualmente depois" -ForegroundColor $WarningColor
    } else {
        Write-Host "    [OK] Migracoes encontradas" -ForegroundColor $SuccessColor
    }
} catch {
    Write-Host "    [AVISO] Nao foi possivel verificar migracoes" -ForegroundColor $WarningColor
}
Pop-Location
Write-Host ""

# Iniciar Backend em nova janela
Write-Host "[6/7] Iniciando Backend..." -ForegroundColor $InfoColor
Write-Host "    Abrindo janela do Backend..." -ForegroundColor Gray

$backendCommand = @"
cd '$BackendPath'
Write-Host '' 
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  BACKEND - GESTOR DE CONSULTAS MÉDICAS' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Porta: http://localhost:3001' -ForegroundColor Green
Write-Host 'API: http://localhost:3001/api' -ForegroundColor Green
Write-Host ''
Write-Host 'Iniciando servidor...' -ForegroundColor Yellow
Write-Host ''
npm run start:dev
"@

try {
    $backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand -PassThru -WindowStyle Normal
    Write-Host "    Backend iniciado (PID: $($backendProcess.Id))" -ForegroundColor $SuccessColor
} catch {
    Write-Host "[ERRO] Falha ao iniciar Backend: $_" -ForegroundColor $ErrorColor
    Write-Host "Pressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Aguardar backend iniciar
Write-Host "    Aguardando Backend estar pronto..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Verificar se backend esta respondendo
$backendReady = $false
Write-Host "    Verificando porta 3001..." -ForegroundColor Gray
for ($i = 1; $i -le 15; $i++) {
    Start-Sleep -Seconds 2
    if (Test-Port -Port 3001) {
        Write-Host "    [OK] Backend esta rodando na porta 3001!" -ForegroundColor $SuccessColor
        $backendReady = $true
        break
    }
    if ($i -lt 15) {
        Write-Host "    Tentativa $i/15..." -ForegroundColor DarkGray
    }
}

if (-not $backendReady) {
    Write-Host "    [AVISO] Backend pode ainda estar inicializando..." -ForegroundColor $WarningColor
    Write-Host "            Verifique a janela do Backend para ver os logs" -ForegroundColor $WarningColor
}
Write-Host ""

# Iniciar Frontend em nova janela
Write-Host "[7/7] Iniciando Frontend..." -ForegroundColor $InfoColor
Write-Host "    Abrindo janela do Frontend..." -ForegroundColor Gray

$frontendCommand = @"
cd '$FrontendPath'
Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  FRONTEND - GESTOR DE CONSULTAS MÉDICAS' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'URL: http://localhost:3000' -ForegroundColor Green
Write-Host ''
Write-Host 'Iniciando servidor na porta 3000...' -ForegroundColor Yellow
Write-Host ''
npm run dev
"@

try {
    $frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand -PassThru -WindowStyle Normal
    Write-Host "    Frontend iniciado (PID: $($frontendProcess.Id))" -ForegroundColor $SuccessColor
} catch {
    Write-Host "[ERRO] Falha ao iniciar Frontend: $_" -ForegroundColor $ErrorColor
    Write-Host "Pressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Aguardar frontend iniciar
Write-Host "    Aguardando Frontend estar pronto..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Verificar se frontend esta respondendo
$frontendReady = $false
Write-Host "    Verificando porta 3000..." -ForegroundColor Gray
for ($i = 1; $i -le 20; $i++) {
    Start-Sleep -Seconds 2
    if (Test-Port -Port 3000) {
        Write-Host "    [OK] Frontend esta rodando na porta 3000!" -ForegroundColor $SuccessColor
        $frontendReady = $true
        break
    }
    if ($i -lt 20) {
        Write-Host "    Tentativa $i/20..." -ForegroundColor DarkGray
    }
}

if (-not $frontendReady) {
    Write-Host "    [AVISO] Frontend pode ainda estar compilando..." -ForegroundColor $WarningColor
    Write-Host "            A primeira compilacao pode levar 1-2 minutos" -ForegroundColor $WarningColor
    Write-Host "            Verifique a janela do Frontend para ver os logs" -ForegroundColor $WarningColor
}
Write-Host ""

# Resumo
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SERVIDORES INICIADOS COM SUCESSO!" -ForegroundColor $SuccessColor
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "URLs do Sistema:" -ForegroundColor $InfoColor
Write-Host "  Frontend: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3000" -ForegroundColor Green
Write-Host "  Backend:  " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3001" -ForegroundColor Green
Write-Host "  API:      " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3001/api" -ForegroundColor Green
Write-Host "  MySQL:    " -NoNewline -ForegroundColor White
Write-Host "localhost:3306 (Docker)" -ForegroundColor Green
Write-Host ""

Write-Host "Status:" -ForegroundColor $InfoColor
if ($backendReady) {
    Write-Host "  Backend:  " -NoNewline -ForegroundColor White
    Write-Host "[ONLINE]" -ForegroundColor $SuccessColor
} else {
    Write-Host "  Backend:  " -NoNewline -ForegroundColor White
    Write-Host "[INICIANDO...]" -ForegroundColor $WarningColor
}

if ($frontendReady) {
    Write-Host "  Frontend: " -NoNewline -ForegroundColor White
    Write-Host "[ONLINE]" -ForegroundColor $SuccessColor
} else {
    Write-Host "  Frontend: " -NoNewline -ForegroundColor White
    Write-Host "[COMPILANDO...]" -ForegroundColor $WarningColor
}
Write-Host ""

Write-Host "Informacoes:" -ForegroundColor $InfoColor
Write-Host "  - Os servidores estao rodando em janelas separadas" -ForegroundColor Gray
Write-Host "  - Alteracoes nos arquivos serao detectadas automaticamente (hot reload)" -ForegroundColor Gray
Write-Host "  - Os servidores continuarao rodando mesmo com alteracoes" -ForegroundColor Gray
Write-Host "  - Para parar, feche as janelas ou execute: .\stop.ps1" -ForegroundColor Gray
Write-Host ""

Write-Host "Primeiros Passos:" -ForegroundColor $InfoColor
Write-Host "  1. Se ainda nao executou as migracoes, execute:" -ForegroundColor Gray
Write-Host "     cd backend && npx prisma migrate dev --name init" -ForegroundColor DarkGray
Write-Host "  2. Crie seu primeiro usuario via API ou Prisma Studio" -ForegroundColor Gray
Write-Host "  3. Acesse http://localhost:3000 para usar o sistema" -ForegroundColor Gray
Write-Host ""

# Salvar PIDs para referencia
try {
    $backendProcess.Id | Out-File -FilePath "$PSScriptRoot\.backend.pid" -Encoding ASCII -Force -ErrorAction SilentlyContinue
    $frontendProcess.Id | Out-File -FilePath "$PSScriptRoot\.frontend.pid" -Encoding ASCII -Force -ErrorAction SilentlyContinue
} catch {
    # Ignorar erro ao salvar PIDs
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Script concluido. Servidores em execucao." -ForegroundColor $SuccessColor
Write-Host "  Esta janela pode ser fechada." -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Pressione qualquer tecla para fechar esta janela..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
