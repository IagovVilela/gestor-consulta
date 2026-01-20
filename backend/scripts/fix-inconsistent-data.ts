import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Iniciando correção de dados inconsistentes...\n');

  // 1. Remover CNPJs de clínicas inativas
  console.log('1️⃣  Removendo CNPJs de clínicas inativas...');
  const clinicasInativas = await prisma.clinicas.findMany({
    where: { active: false },
    select: {
      id: true,
      nome: true,
      cnpj: true,
    },
  });

  console.log(`   📊 Encontradas ${clinicasInativas.length} clínica(s) inativa(s)`);

  let cnpjRemovidos = 0;
  for (const clinica of clinicasInativas) {
    if (clinica.cnpj) {
      await prisma.clinicas.update({
        where: { id: clinica.id },
        data: {
          cnpj: null,
          updatedAt: new Date(),
        },
      });
      console.log(`   ✓ CNPJ removido da clínica "${clinica.nome}"`);
      cnpjRemovidos++;
    }
  }

  console.log(`   ✅ ${cnpjRemovidos} CNPJ(s) removido(s) de clínicas inativas\n`);

  // 2. Verificar usuários ADMIN com clínica vinculada
  console.log('2️⃣  Verificando usuários ADMIN com clínica vinculada...');
  const adminsComClinica = await prisma.users.findMany({
    where: {
      role: 'ADMIN',
      clinicaId: { not: null },
      active: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      clinicaId: true,
    },
  });

  console.log(`   📊 Encontrados ${adminsComClinica.length} ADMIN(s) com clínica vinculada`);

  let adminsCorrigidos = 0;
  for (const admin of adminsComClinica) {
    await prisma.users.update({
      where: { id: admin.id },
      data: {
        clinicaId: null,
        updatedAt: new Date(),
      },
    });
    console.log(`   ✓ Clínica removida do ADMIN "${admin.name}" (${admin.email})`);
    adminsCorrigidos++;
  }

  console.log(`   ✅ ${adminsCorrigidos} ADMIN(s) corrigido(s)\n`);

  // 3. Verificar clínicas ativas com CNPJ duplicado
  console.log('3️⃣  Verificando CNPJs duplicados em clínicas ativas...');
  const todasClinicas = await prisma.clinicas.findMany({
    where: { active: true, cnpj: { not: null } },
    select: {
      id: true,
      nome: true,
      cnpj: true,
    },
  });

  // Agrupar por CNPJ
  const cnpjMap = new Map<string, typeof todasClinicas>();
  for (const clinica of todasClinicas) {
    if (clinica.cnpj) {
      if (!cnpjMap.has(clinica.cnpj)) {
        cnpjMap.set(clinica.cnpj, []);
      }
      cnpjMap.get(clinica.cnpj)!.push(clinica);
    }
  }

  let duplicadosCorrigidos = 0;
  for (const [cnpj, clinicas] of cnpjMap.entries()) {
    if (clinicas.length > 1) {
      console.log(`   ⚠️  CNPJ ${cnpj} encontrado em ${clinicas.length} clínica(s) ativa(s):`);
      // Manter a primeira, remover CNPJ das outras
      for (let i = 1; i < clinicas.length; i++) {
        await prisma.clinicas.update({
          where: { id: clinicas[i].id },
          data: {
            cnpj: null,
            updatedAt: new Date(),
          },
        });
        console.log(`   ✓ CNPJ removido da clínica "${clinicas[i].nome}"`);
        duplicadosCorrigidos++;
      }
    }
  }

  if (duplicadosCorrigidos > 0) {
    console.log(`   ✅ ${duplicadosCorrigidos} CNPJ(s) duplicado(s) corrigido(s)\n`);
  } else {
    console.log(`   ✅ Nenhum CNPJ duplicado encontrado\n`);
  }

  // 4. Verificar emails duplicados em usuários ativos
  console.log('4️⃣  Verificando emails duplicados em usuários ativos...');
  const todosUsuarios = await prisma.users.findMany({
    where: { active: true },
    select: {
      id: true,
      email: true,
      name: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const emailMap = new Map<string, typeof todosUsuarios>();
  for (const usuario of todosUsuarios) {
    if (!emailMap.has(usuario.email)) {
      emailMap.set(usuario.email, []);
    }
    emailMap.get(usuario.email)!.push(usuario);
  }

  let emailsDuplicados = 0;
  for (const [email, usuarios] of emailMap.entries()) {
    if (usuarios.length > 1) {
      console.log(`   ⚠️  Email ${email} encontrado em ${usuarios.length} usuário(s) ativo(s):`);
      // Manter o primeiro, desativar os outros
      for (let i = 1; i < usuarios.length; i++) {
        await prisma.users.update({
          where: { id: usuarios[i].id },
          data: {
            active: false,
            updatedAt: new Date(),
          },
        });
        console.log(`   ✓ Usuário "${usuarios[i].name}" desativado`);
        emailsDuplicados++;
      }
    }
  }

  if (emailsDuplicados > 0) {
    console.log(`   ✅ ${emailsDuplicados} email(s) duplicado(s) corrigido(s)\n`);
  } else {
    console.log(`   ✅ Nenhum email duplicado encontrado\n`);
  }

  console.log('✅ Correção de dados inconsistentes concluída!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

