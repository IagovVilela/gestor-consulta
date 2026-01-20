import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando migração para multi-tenant...');

  // 1. Encontrar ou criar clínica padrão
  let clinicaPadrao = await prisma.clinicas.findFirst({
    where: { nome: 'Clínica Padrão' },
  });

  if (!clinicaPadrao) {
    // Encontrar primeiro ADMIN para ser owner
    const admin = await prisma.users.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!admin) {
      throw new Error('Nenhum usuário ADMIN encontrado. Crie um ADMIN primeiro.');
    }

    clinicaPadrao = await prisma.clinicas.create({
      data: {
        id: crypto.randomUUID(),
        nome: 'Clínica Padrão',
        ownerId: admin.id,
        corPrimaria: '#3b82f6',
        corSecundaria: '#1e40af',
        updatedAt: new Date(),
      } as any,
    });
    console.log('✓ Clínica padrão criada');
  } else {
    console.log('✓ Clínica padrão já existe');
  }

  // 2. Atualizar usuários sem clínica (exceto ADMIN)
  const usuariosSemClinica = await prisma.users.findMany({
    where: {
      clinicaId: null,
      role: { not: 'ADMIN' },
    },
  });

  console.log(`📋 Atualizando ${usuariosSemClinica.length} usuários sem clínica...`);
  for (const user of usuariosSemClinica) {
    await prisma.users.update({
      where: { id: user.id },
      data: { clinicaId: clinicaPadrao.id },
    });
    console.log(`  ✓ Usuário ${user.name} vinculado à clínica padrão`);
  }

  // 3. Atualizar pacientes sem clínica
  const pacientesSemClinica = await prisma.pacientes.findMany({
    where: { clinicaId: null },
  });

  console.log(`📋 Atualizando ${pacientesSemClinica.length} pacientes sem clínica...`);
  for (const paciente of pacientesSemClinica) {
    await prisma.pacientes.update({
      where: { id: paciente.id },
      data: { clinicaId: clinicaPadrao.id },
    });
    console.log(`  ✓ Paciente ${paciente.nome} vinculado à clínica padrão`);
  }

  // 4. Atualizar clínicas sem owner
  const clinicasSemOwner = await prisma.clinicas.findMany({
    where: { ownerId: null },
  });

  if (clinicasSemOwner.length > 0) {
    const admin = await prisma.users.findFirst({
      where: { role: 'ADMIN' },
    });

    if (admin) {
      console.log(`📋 Atualizando ${clinicasSemOwner.length} clínicas sem owner...`);
      for (const clinica of clinicasSemOwner) {
        await prisma.clinicas.update({
          where: { id: clinica.id },
          data: { ownerId: admin.id },
        });
        console.log(`  ✓ Clínica ${clinica.nome} vinculada ao ADMIN`);
      }
    }
  }

  console.log('✅ Migração concluída com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

