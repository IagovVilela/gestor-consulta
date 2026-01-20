import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const email = 'iago@iago';
  const password = '123456';
  const name = 'Iago';
  const role = 'ADMIN';

  // Verificar se usuario ja existe
  const existingUser = await prisma.users.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log('Usuario ja existe! Atualizando senha...');
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.users.update({
      where: { email },
      data: {
        password: hashedPassword,
        name,
        role: role as any,
        clinicaId: null, // ADMIN não deve ter clínica vinculada
        active: true,
      },
    });
    console.log('Usuario atualizado com sucesso!');
  } else {
    console.log('Criando novo usuario...');
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        email,
        password: hashedPassword,
        name,
        role: role as any,
        clinicaId: null, // ADMIN não deve ter clínica vinculada
        active: true,
        updatedAt: new Date(),
      } as any,
    });
    console.log('Usuario criado com sucesso!');
    console.log('ID:', user.id);
  }

  console.log('\nCredenciais de acesso:');
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
    await prisma.$disconnect();
  });


