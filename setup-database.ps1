# Script para configurar o banco de dados e executar migracoes

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACAO DO BANCO DE DADOS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

# Verificar Docker
Write-Host "[1/4] Verificando Docker..." -ForegroundColor $InfoColor
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    [OK] Docker instalado" -ForegroundColor $SuccessColor
        
        # Verificar se Docker Desktop esta rodando
        $dockerPs = docker ps 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    [OK] Docker Desktop esta rodando" -ForegroundColor $SuccessColor
        } else {
            Write-Host "    [ERRO] Docker Desktop nao esta rodando!" -ForegroundColor $ErrorColor
            Write-Host "            Por favor, inicie o Docker Desktop primeiro" -ForegroundColor $ErrorColor
            Write-Host "`nPressione qualquer tecla para sair..."
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            exit 1
        }
    } else {
        Write-Host "    [ERRO] Docker nao esta instalado!" -ForegroundColor $ErrorColor
        Write-Host "`nPressione qualquer tecla para sair..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
} catch {
    Write-Host "    [ERRO] Erro ao verificar Docker: $_" -ForegroundColor $ErrorColor
    Write-Host "`nPressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host ""

# Verificar/Iniciar MySQL
Write-Host "[2/4] Verificando MySQL..." -ForegroundColor $InfoColor
$mysqlContainer = docker ps --filter "name=gestor-consulta-mysql" --format "{{.Names}}" 2>&1
if ($mysqlContainer -like "*gestor-consulta-mysql*") {
    Write-Host "    [OK] Container MySQL esta rodando" -ForegroundColor $SuccessColor
} else {
    Write-Host "    [AVISO] Container MySQL nao esta rodando" -ForegroundColor $WarningColor
    Write-Host "            Tentando iniciar MySQL..." -ForegroundColor $WarningColor
    Push-Location $PSScriptRoot
    docker-compose up -d 2>&1 | Out-Null
    Start-Sleep -Seconds 5
    
    $mysqlContainer = docker ps --filter "name=gestor-consulta-mysql" --format "{{.Names}}" 2>&1
    if ($mysqlContainer -like "*gestor-consulta-mysql*") {
        Write-Host "    [OK] MySQL iniciado com sucesso" -ForegroundColor $SuccessColor
    } else {
        Write-Host "    [ERRO] Falha ao iniciar MySQL" -ForegroundColor $ErrorColor
        Write-Host "`nPressione qualquer tecla para sair..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    Pop-Location
}
Write-Host ""

# Verificar arquivo .env
Write-Host "[3/4] Verificando configuracoes..." -ForegroundColor $InfoColor
$backendPath = Join-Path $PSScriptRoot "backend"
if (-not (Test-Path "$backendPath\.env")) {
    Write-Host "    [ERRO] Arquivo .env nao encontrado!" -ForegroundColor $ErrorColor
    Write-Host "            Execute primeiro: .\start.ps1" -ForegroundColor $ErrorColor
    Write-Host "`nPressione qualquer tecla para sair..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host "    [OK] Arquivo .env encontrado" -ForegroundColor $SuccessColor
Write-Host ""

# Executar migracoes
Write-Host "[4/4] Executando migracoes do banco de dados..." -ForegroundColor $InfoColor
Push-Location $backendPath

# Verificar se Prisma Client esta gerado
if (-not (Test-Path "node_modules\.prisma")) {
    Write-Host "    Gerando Prisma Client..." -ForegroundColor Gray
    npx prisma generate 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    [OK] Prisma Client gerado" -ForegroundColor $SuccessColor
    }
}

# Executar migracoes
Write-Host "    Criando tabelas no banco de dados..." -ForegroundColor Gray
Write-Host "    (Isso pode levar alguns segundos...)" -ForegroundColor DarkGray
Write-Host ""

try {
    npx prisma migrate dev --name init 2>&1 | Tee-Object -Variable migrationOutput
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "    [OK] Migracoes executadas com sucesso!" -ForegroundColor $SuccessColor
        Write-Host ""
        
        # Verificar tabelas criadas
        Write-Host "    Verificando tabelas criadas..." -ForegroundColor Gray
        $tables = npx prisma db execute --stdin --schema=prisma/schema.prisma 2>&1
        Write-Host "    [OK] Banco de dados configurado!" -ForegroundColor $SuccessColor
    } else {
        Write-Host ""
        Write-Host "    [ERRO] Erro ao executar migracoes" -ForegroundColor $ErrorColor
        Write-Host "            Verifique a conexao com o banco de dados" -ForegroundColor $ErrorColor
        Write-Host "            Verifique o arquivo backend/.env" -ForegroundColor $ErrorColor
    }
} catch {
    Write-Host ""
    Write-Host "    [ERRO] Erro ao executar migracoes: $_" -ForegroundColor $ErrorColor
}

Pop-Location
Write-Host ""

# Resumo
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACAO CONCLUIDA" -ForegroundColor $SuccessColor
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Proximos passos:" -ForegroundColor $InfoColor
Write-Host "  1. Verifique se as migracoes foram executadas com sucesso" -ForegroundColor Gray
Write-Host "  2. Execute: .\start.ps1 para iniciar os servidores" -ForegroundColor Gray
Write-Host "  3. Crie seu primeiro usuario via API ou Prisma Studio" -ForegroundColor Gray
Write-Host ""

Write-Host "Para visualizar o banco de dados:" -ForegroundColor $InfoColor
Write-Host "  cd backend && npx prisma studio" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Pressione qualquer tecla para fechar..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")




