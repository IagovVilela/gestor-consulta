import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 Listando todos os profissionais...\n');

  // Listar todos os profissionais (ativos e inativos)
  const profissionaisAtivos = await prisma.profissionais.findMany({
    where: { active: true },
    include: {
      clinicas: {
        select: {
          id: true,
          nome: true,
        },
      },
      especialidades: {
        select: {
          id: true,
          nome: true,
        },
      },
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { nomeCompleto: 'asc' },
  });

  const profissionaisInativos = await prisma.profissionais.findMany({
    where: { active: false },
    include: {
      clinicas: {
        select: {
          id: true,
          nome: true,
        },
      },
      especialidades: {
        select: {
          id: true,
          nome: true,
        },
      },
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { nomeCompleto: 'asc' },
  });

  console.log(`Total de profissionais ativos: ${profissionaisAtivos.length}`);
  console.log(`Total de profissionais inativos: ${profissionaisInativos.length}\n`);

  if (profissionaisAtivos.length === 0 && profissionaisInativos.length === 0) {
    console.log('⚠️  Nenhum profissional encontrado no banco de dados.');
  } else {
    if (profissionaisAtivos.length > 0) {
      console.log('✅ PROFISSIONAIS ATIVOS:\n');
      profissionaisAtivos.forEach((p, index) => {
      console.log(`${index + 1}. ${p.nomeCompleto}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   CRM: ${p.crm || 'N/A'}`);
      console.log(`   Telefone: ${p.telefone || 'N/A'}`);
      console.log(`   Clínica: ${p.clinicas?.nome || 'N/A'} (${p.clinicaId})`);
      console.log(`   Especialidade: ${p.especialidades?.nome || 'N/A'}`);
      console.log(`   Usuário: ${p.users?.email || 'N/A'} (${p.users?.name || 'N/A'})`);
      console.log(`   Ativo: ${p.active ? 'SIM' : 'NÃO'}`);
      console.log('');
    });
    }
    
    if (profissionaisInativos.length > 0) {
      console.log('\n❌ PROFISSIONAIS INATIVOS:\n');
      profissionaisInativos.forEach((p, index) => {
        console.log(`${index + 1}. ${p.nomeCompleto}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   CRM: ${p.crm || 'N/A'}`);
        console.log(`   Telefone: ${p.telefone || 'N/A'}`);
        console.log(`   Clínica: ${p.clinicas?.nome || 'N/A'} (${p.clinicaId})`);
        console.log(`   Especialidade: ${p.especialidades?.nome || 'N/A'}`);
        console.log(`   Usuário: ${p.users?.email || 'N/A'} (${p.users?.name || 'N/A'})`);
        console.log(`   Ativo: ${p.active ? 'SIM' : 'NÃO'}`);
        console.log('');
      });
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

