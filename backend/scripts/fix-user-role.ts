import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('❌ Por favor, forneça o email do usuário como argumento');
    console.log('Uso: npm run fix:user-role <email>');
    process.exit(1);
  }

  console.log(`🔍 Buscando usuário: "${email}"...\n`);

  const user = await prisma.users.findUnique({
    where: { email },
    include: {
      clinica: {
        select: {
          id: true,
          nome: true,
          ownerId: true,
        },
      },
      clinicasCriadas: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  });

  if (!user) {
    console.log(`❌ Usuário não encontrado com email "${email}"`);
    process.exit(1);
  }

  console.log(`📋 Usuário encontrado:\n`);
  console.log(`- Nome: ${user.name}`);
  console.log(`- Email: ${user.email}`);
  console.log(`- Role: ${user.role}`);
  console.log(`- Ativo: ${user.active ? 'SIM' : 'NÃO'}`);
  console.log(`- Clínica vinculada: ${user.clinicaId || 'Nenhuma'}`);
  if (user.clinica) {
    console.log(`  - Nome da clínica: ${user.clinica.nome}`);
    console.log(`  - É owner? ${user.clinica.ownerId === user.id ? 'SIM' : 'NÃO'}`);
  }
  console.log(`- Clínicas criadas (owner): ${user.clinicasCriadas.length}`);
  user.clinicasCriadas.forEach(c => {
    console.log(`  - ${c.nome}`);
  });

  // Se o usuário é owner de uma clínica mas tem role ADMIN, corrigir para MEDICO
  if (user.role === 'ADMIN' && user.clinicasCriadas.length > 0) {
    console.log(`\n⚠️  Usuário é ADMIN mas é owner de clínica(s). Corrigindo role para MEDICO...`);
    await prisma.users.update({
      where: { id: user.id },
      data: {
        role: 'MEDICO',
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Role corrigida para MEDICO`);
  }

  // Se o usuário é owner mas não tem clínica vinculada, vincular à primeira clínica que ele é owner
  if (user.clinicasCriadas.length > 0 && !user.clinicaId) {
    const primeiraClinica = user.clinicasCriadas[0];
    console.log(`\n⚠️  Usuário é owner mas não tem clínica vinculada. Vinculando à clínica "${primeiraClinica.nome}"...`);
    await prisma.users.update({
      where: { id: user.id },
      data: {
        clinicaId: primeiraClinica.id,
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Vinculado à clínica "${primeiraClinica.nome}"`);
  }

  // Garantir que está ativo
  if (!user.active) {
    console.log(`\n⚠️  Usuário está inativo. Reativando...`);
    await prisma.users.update({
      where: { id: user.id },
      data: {
        active: true,
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Usuário reativado`);
  }

  console.log('\n✅ Processo concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

