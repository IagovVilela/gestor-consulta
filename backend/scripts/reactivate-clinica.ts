import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clinicaNome = process.argv[2] || 'eyes'; // Nome da clínica ou 'eyes' por padrão
  
  console.log(`🔍 Buscando clínica: "${clinicaNome}"...\n`);

  // Buscar todas as clínicas e filtrar por nome (case-insensitive)
  const todasClinicas = await prisma.clinicas.findMany({
    select: {
      id: true,
      nome: true,
      active: true,
      ownerId: true,
      createdAt: true,
    },
  });

  // Filtrar por nome (case-insensitive)
  const clinicas = todasClinicas.filter(c => 
    c.nome.toLowerCase().includes(clinicaNome.toLowerCase())
  );

  if (clinicas.length === 0) {
    console.log(`❌ Nenhuma clínica encontrada com o nome "${clinicaNome}"`);
    process.exit(1);
  }

  console.log(`📋 Encontradas ${clinicas.length} clínica(s):\n`);
  
  for (const clinica of clinicas) {
    console.log(`- ${clinica.nome}`);
    console.log(`  ID: ${clinica.id}`);
    console.log(`  Ativa: ${clinica.active ? 'SIM' : 'NÃO'}`);
    console.log(`  Owner ID: ${clinica.ownerId || 'Nenhum'}`);
    console.log(`  Criada em: ${clinica.createdAt.toLocaleString('pt-BR')}`);
    
    if (!clinica.active) {
      console.log(`  ⚠️  Reativando...`);
      await prisma.clinicas.update({
        where: { id: clinica.id },
        data: {
          active: true,
          updatedAt: new Date(),
        },
      });
      console.log(`  ✅ Reativada com sucesso!\n`);
    } else {
      console.log(`  ✅ Já está ativa\n`);
    }
  }

  console.log('✅ Processo concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

