# Script para parar Backend e Frontend

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  PARANDO SERVIDORES - GESTOR DE CONSULTAS MÉDICAS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Cores
$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

# Funcao para finalizar processos em portas especificas
function Stop-PortProcess {
    param([int]$Port, [string]$Name)
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
            Select-Object -ExpandProperty OwningProcess -Unique
        if ($processes) {
            foreach ($processId in $processes) {
                try {
                    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    if ($process) {
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                        Write-Host "    [OK] Processo $Name (PID: $processId) finalizado" -ForegroundColor $SuccessColor
                    }
                } catch {
                    # Ignorar erros ao parar processos
                }
            }
            Start-Sleep -Seconds 1
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

# Parar processos salvos nos arquivos PID
Write-Host "[1/3] Parando processos salvos..." -ForegroundColor $InfoColor
$backendPidFile = Join-Path $PSScriptRoot ".backend.pid"
$frontendPidFile = Join-Path $PSScriptRoot ".frontend.pid"

if (Test-Path $backendPidFile) {
    $backendPid = Get-Content $backendPidFile -ErrorAction SilentlyContinue
    if ($backendPid) {
        try {
            $process = Get-Process -Id $backendPid -ErrorAction SilentlyContinue
            if ($process) {
                Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
                Write-Host "    [OK] Backend (PID: $backendPid) finalizado" -ForegroundColor $SuccessColor
            }
        } catch {
            # Processo ja finalizado
        }
    }
    Remove-Item $backendPidFile -ErrorAction SilentlyContinue
}

if (Test-Path $frontendPidFile) {
    $frontendPid = Get-Content $frontendPidFile -ErrorAction SilentlyContinue
    if ($frontendPid) {
        try {
            $process = Get-Process -Id $frontendPid -ErrorAction SilentlyContinue
            if ($process) {
                Stop-Process -Id $frontendPid -Force -ErrorAction SilentlyContinue
                Write-Host "    [OK] Frontend (PID: $frontendPid) finalizado" -ForegroundColor $SuccessColor
            }
        } catch {
            # Processo ja finalizado
        }
    }
    Remove-Item $frontendPidFile -ErrorAction SilentlyContinue
}
Write-Host ""

# Parar processos nas portas
Write-Host "[2/3] Parando processos nas portas..." -ForegroundColor $InfoColor
$backendStopped = Stop-PortProcess -Port 3001 -Name "Backend"
$frontendStopped = Stop-PortProcess -Port 3000 -Name "Frontend"

if (-not $backendStopped -and -not $frontendStopped) {
    Write-Host "    Nenhum processo encontrado nas portas 3000 e 3001" -ForegroundColor Gray
}
Write-Host ""

# Parar processos Node relacionados
Write-Host "[3/3] Verificando processos Node..." -ForegroundColor $InfoColor
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | 
        Where-Object { $_.Path -like "*Gestor-Consulta*" }
    
    if ($nodeProcesses) {
        foreach ($process in $nodeProcesses) {
            try {
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                Write-Host "    [OK] Processo Node (PID: $($process.Id)) finalizado" -ForegroundColor $SuccessColor
            } catch {
                # Ignorar erros
            }
        }
    } else {
        Write-Host "    Nenhum processo Node relacionado encontrado" -ForegroundColor Gray
    }
} catch {
    Write-Host "    Nao foi possivel verificar processos Node" -ForegroundColor $WarningColor
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SERVIDORES PARADOS" -ForegroundColor $SuccessColor
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Pressione qualquer tecla para fechar..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")




