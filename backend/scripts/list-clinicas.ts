import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 Listando todas as clínicas...\n');

  const clinicas = await prisma.clinicas.findMany({
    select: {
      id: true,
      nome: true,
      cnpj: true,
      active: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`Total de clínicas: ${clinicas.length}\n`);

  clinicas.forEach((c, index) => {
    console.log(`${index + 1}. ${c.nome}`);
    console.log(`   ID: ${c.id}`);
    console.log(`   CNPJ: ${c.cnpj || 'N/A'}`);
    console.log(`   Ativa: ${c.active ? 'SIM' : 'NÃO'}`);
    console.log(`   Criada em: ${c.createdAt.toLocaleString('pt-BR')}`);
    console.log('');
  });

  // Verificar CNPJs duplicados
  const cnpjs = clinicas.filter(c => c.cnpj).map(c => c.cnpj);
  const duplicates = cnpjs.filter((cnpj, index) => cnpjs.indexOf(cnpj) !== index);
  
  if (duplicates.length > 0) {
    console.log('⚠️  CNPJs duplicados encontrados:');
    duplicates.forEach(cnpj => {
      const clinicasComCnpj = clinicas.filter(c => c.cnpj === cnpj);
      console.log(`   CNPJ ${cnpj}: ${clinicasComCnpj.length} clínica(s)`);
      clinicasComCnpj.forEach(c => {
        console.log(`     - ${c.nome} (${c.active ? 'ATIVA' : 'INATIVA'})`);
      });
    });
  } else {
    console.log('✅ Nenhum CNPJ duplicado encontrado');
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


