# Script para criar usuario no sistema

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CRIAR USUARIO - GESTOR DE CONSULTAS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$backendPath = Join-Path $PSScriptRoot "backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "[ERRO] Diretorio backend nao encontrado!" -ForegroundColor Red
    exit 1
}

Push-Location $backendPath

Write-Host "Informe os dados do usuario:" -ForegroundColor Yellow
Write-Host ""

$email = Read-Host "Email"
$password = Read-Host "Senha" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
$name = Read-Host "Nome"
Write-Host ""
Write-Host "Perfis disponiveis:" -ForegroundColor Cyan
Write-Host "  1. ADMIN - Administrador completo" -ForegroundColor Gray
Write-Host "  2. MEDICO - Medico/Profissional" -ForegroundColor Gray
Write-Host "  3. SECRETARIA - Secretaria/Recepcao" -ForegroundColor Gray
Write-Host ""
$roleChoice = Read-Host "Escolha o perfil (1-3)"

$role = switch ($roleChoice) {
    "1" { "ADMIN" }
    "2" { "MEDICO" }
    "3" { "SECRETARIA" }
    default { "SECRETARIA" }
}

Write-Host "`nCriando usuario..." -ForegroundColor Yellow

# Criar script temporario
$scriptContent = @"
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = '$email';
  const password = '$passwordPlain';
  const name = '$name';
  const role = '$role';

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log('Usuario ja existe! Atualizando...');
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        name,
        role: role as any,
        active: true,
      },
    });
    console.log('Usuario atualizado com sucesso!');
  } else {
    console.log('Criando novo usuario...');
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role as any,
        active: true,
      },
    });
    console.log('Usuario criado com sucesso!');
    console.log('ID:', user.id);
  }

  console.log('\nCredenciais:');
  console.log('Email:', email);
  console.log('Senha:', password);
  console.log('Perfil:', role);
}

main()
  .catch((e) => {
    console.error('Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.`$disconnect();
  });
"@

$tempScript = Join-Path $env:TEMP "create-user-temp.ts"
$scriptContent | Out-File -FilePath $tempScript -Encoding UTF8 -Force

try {
    npx ts-node $tempScript 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[OK] Usuario criado/atualizado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "`n[ERRO] Falha ao criar usuario" -ForegroundColor Red
    }
} catch {
    Write-Host "`n[ERRO] Erro: $_" -ForegroundColor Red
} finally {
    Remove-Item $tempScript -ErrorAction SilentlyContinue
}

Pop-Location

Write-Host "`nPressione qualquer tecla para fechar..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")




