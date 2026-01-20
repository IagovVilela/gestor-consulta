import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Iniciando exclusão de todas as clínicas...');

  // Contar clínicas antes
  const countBefore = await prisma.clinicas.count();
  console.log(`📊 Total de clínicas encontradas: ${countBefore}`);

  if (countBefore === 0) {
    console.log('✅ Nenhuma clínica encontrada para excluir.');
    return;
  }

  // Listar todas as clínicas
  const clinicas = await prisma.clinicas.findMany({
    select: {
      id: true,
      nome: true,
      cnpj: true,
      active: true,
    },
  });

  console.log('\n📋 Clínicas encontradas:');
  clinicas.forEach((c, index) => {
    console.log(`  ${index + 1}. ${c.nome} (CNPJ: ${c.cnpj || 'N/A'}) - Ativa: ${c.active}`);
  });

  // Excluir todas as clínicas permanentemente
  console.log('\n🗑️  Excluindo todas as clínicas...');
  
  // Primeiro, remover vínculos de usuários
  await prisma.users.updateMany({
    where: {
      clinicaId: {
        not: null,
      },
    },
    data: {
      clinicaId: null,
    },
  });
  console.log('  ✓ Vínculos de usuários removidos');

  // Remover vínculos de pacientes
  await prisma.pacientes.updateMany({
    where: {
      clinicaId: {
        not: null,
      },
    },
    data: {
      clinicaId: null,
    },
  });
  console.log('  ✓ Vínculos de pacientes removidos');

  // Excluir profissionais vinculados (clinicaId é obrigatório, não pode ser null)
  const profissionaisCount = await prisma.profissionais.count();
  
  if (profissionaisCount > 0) {
    console.log(`  ⚠️  Encontrados ${profissionaisCount} profissional(is). Eles serão excluídos também.`);
    await prisma.profissionais.deleteMany({});
    console.log('  ✓ Profissionais excluídos');
  } else {
    console.log('  ✓ Nenhum profissional encontrado');
  }

  // Excluir todas as clínicas
  const result = await prisma.clinicas.deleteMany({});
  console.log(`\n✅ ${result.count} clínica(s) excluída(s) permanentemente do banco de dados.`);

  // Verificar se restou alguma
  const countAfter = await prisma.clinicas.count();
  console.log(`📊 Total de clínicas restantes: ${countAfter}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

