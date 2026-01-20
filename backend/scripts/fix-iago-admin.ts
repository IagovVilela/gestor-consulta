import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando e corrigindo usuário iago@iago...\n');

  // Buscar TODOS os usuários com "iago" no email
  const allIagoUsers = await prisma.users.findMany({
    where: {
      email: {
        contains: 'iago',
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      clinicaId: true,
    },
  });

  console.log(`📋 Encontrados ${allIagoUsers.length} usuário(s) com "iago" no email:\n`);
  
  for (const user of allIagoUsers) {
    console.log(`- ${user.email}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Ativo: ${user.active}`);
    console.log(`  Clínica: ${user.clinicaId || 'Nenhuma'}`);
  }

  // Buscar especificamente iago@iago
  const iagoUser = await prisma.users.findUnique({
    where: { email: 'iago@iago' },
  });

  if (!iagoUser) {
    console.log('\n❌ Usuário iago@iago não encontrado! Criando...');
    const hashedPassword = await bcrypt.hash('123456', 10);
    const newUser = await prisma.users.create({
      data: {
        id: require('crypto').randomUUID(),
        email: 'iago@iago',
        password: hashedPassword,
        name: 'Iago',
        role: 'ADMIN',
        clinicaId: null,
        active: true,
        updatedAt: new Date(),
      } as any,
    });
    console.log('✅ Usuário criado:', newUser.id);
  } else {
    console.log('\n📋 Usuário iago@iago encontrado!');
    console.log(`  ID: ${iagoUser.id}`);
    console.log(`  Role atual: ${iagoUser.role}`);
    console.log(`  Clínica: ${iagoUser.clinicaId || 'Nenhuma'}`);
    
    if (iagoUser.role !== 'ADMIN' || iagoUser.clinicaId !== null) {
      console.log('\n⚠️  Corrigindo para ADMIN...');
      const hashedPassword = await bcrypt.hash('123456', 10);
      await prisma.users.update({
        where: { id: iagoUser.id },
        data: {
          role: 'ADMIN',
          clinicaId: null,
          active: true,
          password: hashedPassword, // Atualizar senha também
          updatedAt: new Date(),
        },
      });
      console.log('✅ Usuário corrigido!');
    } else {
      console.log('✅ Usuário já está correto!');
    }
  }

  // Desativar outros usuários "iago" se houver
  if (allIagoUsers.length > 1) {
    console.log('\n⚠️  Múltiplos usuários encontrados. Desativando duplicatas...');
    const iagoId = iagoUser?.id || (await prisma.users.findUnique({ where: { email: 'iago@iago' } }))?.id;
    
    for (const user of allIagoUsers) {
      if (user.id !== iagoId && user.email.includes('iago')) {
        console.log(`  Desativando: ${user.email} (${user.id})`);
        await prisma.users.update({
          where: { id: user.id },
          data: { active: false },
        });
      }
    }
  }

  console.log('\n✅ Processo concluído!');
  console.log('\n📋 Credenciais:');
  console.log('  Email: iago@iago');
  console.log('  Senha: 123456');
  console.log('  Role: ADMIN');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

