# Script para configurar banco de dados no MySQL local

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACAO DO BANCO - MYSQL LOCAL" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

Write-Host "Este script vai configurar o banco de dados no MySQL local." -ForegroundColor $InfoColor
Write-Host "Voce precisara informar a senha do MySQL root." -ForegroundColor $WarningColor
Write-Host ""

# Solicitar senha do MySQL
$mysqlRootPassword = Read-Host "Digite a senha do MySQL root (ou pressione Enter se nao tiver senha)" -AsSecureString
$mysqlRootPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($mysqlRootPassword))

if ([string]::IsNullOrWhiteSpace($mysqlRootPasswordPlain)) {
    $mysqlRootPasswordPlain = ""
    Write-Host "Tentando conectar sem senha..." -ForegroundColor $WarningColor
}

# Criar script SQL
$sqlScript = @"
CREATE DATABASE IF NOT EXISTS gestor_consulta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'gestor_user'@'localhost' IDENTIFIED BY 'gestor_password';
GRANT ALL PRIVILEGES ON gestor_consulta.* TO 'gestor_user'@'localhost';
FLUSH PRIVILEGES;
"@

# Salvar script temporario
$tempSqlFile = Join-Path $env:TEMP "setup_gestor_consulta.sql"
$sqlScript | Out-File -FilePath $tempSqlFile -Encoding UTF8 -Force

Write-Host "`n[1/3] Criando banco de dados e usuario..." -ForegroundColor $InfoColor

# Tentar encontrar mysql.exe
$mysqlPath = $null
$possiblePaths = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.2\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe",
    "C:\wamp64\bin\mysql\mysql8.0.xx\bin\mysql.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $mysqlPath = $path
        break
    }
}

if (-not $mysqlPath) {
    Write-Host "    [AVISO] mysql.exe nao encontrado no PATH" -ForegroundColor $WarningColor
    Write-Host "    Vamos tentar usar mysql diretamente..." -ForegroundColor $WarningColor
    $mysqlPath = "mysql"
}

# Executar SQL
try {
    if ([string]::IsNullOrWhiteSpace($mysqlRootPasswordPlain)) {
        $result = & $mysqlPath -u root -e "source $tempSqlFile" 2>&1
    } else {
        $result = & $mysqlPath -u root -p"$mysqlRootPasswordPlain" -e "source $tempSqlFile" 2>&1
    }
    
    if ($LASTEXITCODE -eq 0 -or $result -like "*gestor_consulta*") {
        Write-Host "    [OK] Banco de dados e usuario criados!" -ForegroundColor $SuccessColor
    } else {
        Write-Host "    [AVISO] Pode ter havido um erro, mas continuando..." -ForegroundColor $WarningColor
        Write-Host "    Resultado: $result" -ForegroundColor Gray
    }
} catch {
    Write-Host "    [ERRO] Erro ao executar SQL: $_" -ForegroundColor $ErrorColor
    Write-Host "    Voce pode executar manualmente o arquivo: $tempSqlFile" -ForegroundColor $WarningColor
}

# Limpar arquivo temporario
Remove-Item $tempSqlFile -ErrorAction SilentlyContinue

Write-Host "`n[2/3] Executando migracoes do Prisma..." -ForegroundColor $InfoColor
Push-Location (Join-Path $PSScriptRoot "backend")

try {
    npx prisma migrate dev --name init 2>&1 | Tee-Object -Variable migrationOutput
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    [OK] Migracoes executadas com sucesso!" -ForegroundColor $SuccessColor
    } else {
        Write-Host "    [AVISO] Erro nas migracoes. Tentando db push..." -ForegroundColor $WarningColor
        npx prisma db push --accept-data-loss 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    [OK] Schema criado usando db push!" -ForegroundColor $SuccessColor
        }
    }
} catch {
    Write-Host "    [ERRO] Erro ao executar migracoes: $_" -ForegroundColor $ErrorColor
}

Pop-Location

Write-Host "`n[3/3] Verificando tabelas criadas..." -ForegroundColor $InfoColor
Push-Location (Join-Path $PSScriptRoot "backend")

try {
    $tables = npx prisma db execute --stdin --schema=prisma/schema.prisma --stdin-input "SHOW TABLES;" 2>&1
    if ($tables -like "*users*" -or $tables -like "*consultas*") {
        Write-Host "    [OK] Tabelas criadas com sucesso!" -ForegroundColor $SuccessColor
    } else {
        Write-Host "    [AVISO] Nao foi possivel verificar tabelas automaticamente" -ForegroundColor $WarningColor
        Write-Host "            Execute: cd backend && npx prisma studio" -ForegroundColor $WarningColor
    }
} catch {
    Write-Host "    [AVISO] Nao foi possivel verificar tabelas" -ForegroundColor $WarningColor
}

Pop-Location

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACAO CONCLUIDA" -ForegroundColor $SuccessColor
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Proximos passos:" -ForegroundColor $InfoColor
Write-Host "  1. Execute: .\start.ps1 para iniciar os servidores" -ForegroundColor Gray
Write-Host "  2. Acesse: http://localhost:3000" -ForegroundColor Gray
Write-Host "  3. Crie seu primeiro usuario" -ForegroundColor Gray
Write-Host ""

Write-Host "Para visualizar o banco:" -ForegroundColor $InfoColor
Write-Host "  cd backend && npx prisma studio" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Pressione qualquer tecla para fechar..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")




