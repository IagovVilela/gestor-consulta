import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de dados iniciais...');

  // Criar especialidades
  const especialidades = [
    { nome: 'Cardiologia', descricao: 'Especialidade médica focada no coração e sistema circulatório' },
    { nome: 'Dermatologia', descricao: 'Especialidade médica focada na pele, cabelos e unhas' },
    { nome: 'Endocrinologia', descricao: 'Especialidade médica focada em hormônios e metabolismo' },
    { nome: 'Ginecologia', descricao: 'Especialidade médica focada na saúde da mulher' },
    { nome: 'Neurologia', descricao: 'Especialidade médica focada no sistema nervoso' },
    { nome: 'Ortopedia', descricao: 'Especialidade médica focada em ossos, articulações e músculos' },
    { nome: 'Pediatria', descricao: 'Especialidade médica focada em crianças e adolescentes' },
    { nome: 'Psiquiatria', descricao: 'Especialidade médica focada em saúde mental' },
    { nome: 'Urologia', descricao: 'Especialidade médica focada no sistema urinário' },
    { nome: 'Clínica Geral', descricao: 'Atenção primária à saúde' },
  ];

  console.log('📋 Criando especialidades...');
  for (const esp of especialidades) {
    const existing = await prisma.especialidades.findUnique({
      where: { nome: esp.nome },
    });

    if (!existing) {
      await prisma.especialidades.create({
        data: {
          id: crypto.randomUUID(),
          nome: esp.nome,
          descricao: esp.descricao,
          updatedAt: new Date(),
        } as any,
      });
      console.log(`  ✓ Especialidade criada: ${esp.nome}`);
    } else {
      console.log(`  - Especialidade já existe: ${esp.nome}`);
    }
  }

  // Criar clínicas
  const clinicas = [
    {
      nome: 'Clínica Central',
      cnpj: '12.345.678/0001-90',
      endereco: 'Rua Principal, 123 - Centro',
      telefone: '(11) 3456-7890',
      email: 'contato@clinicacentral.com.br',
    },
    {
      nome: 'Clínica Saúde & Vida',
      cnpj: '98.765.432/0001-10',
      endereco: 'Av. Saúde, 456 - Jardim das Flores',
      telefone: '(11) 3456-7891',
      email: 'contato@saudevida.com.br',
    },
    {
      nome: 'Centro Médico Premium',
      cnpj: '11.222.333/0001-44',
      endereco: 'Rua Premium, 789 - Bairro Nobre',
      telefone: '(11) 3456-7892',
      email: 'contato@premiummed.com.br',
    },
  ];

  console.log('🏥 Criando clínicas...');
  for (const clin of clinicas) {
    const existing = await prisma.clinicas.findFirst({
      where: { nome: clin.nome },
    });

    if (!existing) {
      await prisma.clinicas.create({
        data: {
          id: crypto.randomUUID(),
          nome: clin.nome,
          cnpj: clin.cnpj,
          endereco: clin.endereco,
          telefone: clin.telefone,
          email: clin.email,
          ownerId: '', // Será atualizado pela migração
          updatedAt: new Date(),
        } as any,
      });
      console.log(`  ✓ Clínica criada: ${clin.nome}`);
    } else {
      console.log(`  - Clínica já existe: ${clin.nome}`);
    }
  }

  console.log('✅ Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

