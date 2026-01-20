import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'iago@iago';
  
  console.log(`🔍 Verificando usuário: "${email}"...\n`);

  const user = await prisma.users.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      clinicaId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    console.log(`❌ Usuário não encontrado!`);
    process.exit(1);
  }

  console.log(`📋 Dados do usuário no banco:`);
  console.log(`  - ID: ${user.id}`);
  console.log(`  - Email: ${user.email}`);
  console.log(`  - Nome: ${user.name}`);
  console.log(`  - Role: ${user.role}`);
  console.log(`  - Ativo: ${user.active}`);
  console.log(`  - Clínica ID: ${user.clinicaId || 'Nenhuma'}`);
  console.log(`  - Criado em: ${user.createdAt.toLocaleString('pt-BR')}`);
  console.log(`  - Atualizado em: ${user.updatedAt.toLocaleString('pt-BR')}`);
  
  // Verificar se há múltiplos usuários com esse email
  const allUsers = await prisma.users.findMany({
    where: {
      email: {
        contains: 'iago',
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
      active: true,
    },
  });
  
  console.log(`\n📋 Todos os usuários com "iago" no email:`);
  allUsers.forEach(u => {
    console.log(`  - ${u.email} (${u.role}) - ${u.active ? 'ATIVO' : 'INATIVO'} - ID: ${u.id}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

