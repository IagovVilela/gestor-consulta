import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpando CNPJs de clínicas inativas...');

  // Encontrar todas as clínicas inativas
  const clinicasInativas = await prisma.clinicas.findMany({
    where: { active: false },
    select: {
      id: true,
      nome: true,
      cnpj: true,
    },
  });

  console.log(`📊 Encontradas ${clinicasInativas.length} clínicas inativas`);

  if (clinicasInativas.length === 0) {
    console.log('✅ Nenhuma clínica inativa encontrada.');
    return;
  }

  // Remover CNPJ de clínicas inativas para permitir criar novas com o mesmo CNPJ
  let updated = 0;
  for (const clinica of clinicasInativas) {
    if (clinica.cnpj) {
      await prisma.clinicas.update({
        where: { id: clinica.id },
        data: {
          cnpj: null,
          updatedAt: new Date(),
        },
      });
      console.log(`  ✓ CNPJ removido da clínica "${clinica.nome}"`);
      updated++;
    }
  }

  console.log(`\n✅ ${updated} clínica(s) atualizada(s). CNPJs removidos de clínicas inativas.`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


