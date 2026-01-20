import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testLogin() {
  const email = 'iago@iago';
  const password = '123456';
  
  const user = await prisma.users.findUnique({
    where: { email }
  });
  
  if (!user) {
    console.log('ERRO: Usuario nao encontrado!');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Usuario encontrado:');
  console.log('  Email:', user.email);
  console.log('  Nome:', user.name);
  console.log('  Perfil:', user.role);
  console.log('  Ativo:', user.active);
  
  const isValid = await bcrypt.compare(password, user.password);
  console.log('\nTeste de senha:');
  console.log('  Senha correta:', isValid ? 'SIM' : 'NAO');
  
  if (!isValid) {
    console.log('\nATENCAO: Senha nao confere! Atualizando senha...');
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.users.update({
      where: { email },
      data: { password: hashedPassword }
    });
    console.log('Senha atualizada com sucesso!');
  }
}

testLogin().finally(() => prisma.$disconnect());
