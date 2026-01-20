import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando usuários ADMIN...\n');

  // Buscar todos os usuários ADMIN
  const adminUsers = await prisma.users.findMany({
    where: {
      role: 'ADMIN',
    },
    select: {
      id: true,
      email: true,
      name: true,
      active: true,
      clinicaId: true,
    },
  });

  console.log(`📊 Encontrados ${adminUsers.length} usuário(s) ADMIN:\n`);

  for (const user of adminUsers) {
    console.log(`- ${user.name} (${user.email})`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Active: ${user.active}`);
    console.log(`  Clínica: ${user.clinicaId || 'Nenhuma (correto para ADMIN)'}`);
    
    // Corrigir se não estiver ativo ou tiver clínica vinculada
    if (!user.active || user.clinicaId !== null) {
      console.log(`  ⚠️  Corrigindo...`);
      await prisma.users.update({
        where: { id: user.id },
        data: {
          active: true,
          clinicaId: null, // ADMIN não deve ter clínica
        },
      });
      console.log(`  ✅ Corrigido!`);
    }
    console.log('');
  }

  console.log('✅ Verificação concluída!');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

