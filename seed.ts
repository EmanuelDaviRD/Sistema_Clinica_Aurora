import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Seed de Admin
  const email = 'lunamendes@clinica.com';
  const password = 'lunamendes123456789';

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email }
  });

  if (!existingAdmin) {
    const password_hash = await bcrypt.hash(password, 10);
    await prisma.adminUser.create({
      data: {
        email,
        password_hash
      }
    });
    console.log(`[Seed] Admin ${email} criado com sucesso!`);
  } else {
    console.log(`[Seed] Admin ${email} já existe.`);
  }

  // 2. Seed de Check-ups
  const checkups = [
    {
      nome: 'Check-up Completo',
      preco: 'R$ 169,99',
      descricao: JSON.stringify({
        subtitle: 'Mais saúde e tranquilidade para sua viagem ou rotina',
        tag: 'Mais Procurado',
        exams: [
          'Hemograma Completo',
          'Ácido Úrico',
          'Vitamina D',
          'Creatinina',
          'Glicose',
          'Ureia',
          'Triglicerídeos',
          'Colesterol Total',
          'TGO / TGP',
          'TSH & T4 Livre',
          'LDL / VLDL / HDL'
        ]
      }),
      instrucoes_preparo: 'Jejum obrigatório de 8 a 12 horas. Não ingerir bebida alcoólica 72 horas antes.'
    },
    {
      nome: 'Check-up Feminino',
      preco: 'R$ 165,99',
      descricao: JSON.stringify({
        subtitle: 'Prevenção e acompanhamento completo de saúde da mulher',
        tag: 'Essencial Mulher',
        exams: [
          'Citologia (Preventivo)',
          'Tireoide (TSH e T4 Livre)',
          'Vitamina D',
          'Hemograma Completo',
          'Glicose em Jejum',
          'Eletrólitos (Sódio e Potássio)',
          'Sumário de Urina',
          'Colesterol Total e Frações',
          'Triglicerídeos completos'
        ]
      }),
      instrucoes_preparo: 'Jejum de 8 a 12 horas. Abstinência sexual de 48 horas para o preventivo.'
    },
    {
      nome: 'Check-up Infantil',
      preco: 'R$ 90,90',
      descricao: JSON.stringify({
        subtitle: 'Acompanhamento do desenvolvimento e exames fundamentais',
        tag: 'Pediátrico',
        exams: [
          'Hemograma Completo',
          'Hemoglobina Glicada',
          'Ferro Sérico',
          'Colesterol Total',
          'Colesterol HDL / LDL',
          'Colesterol VLDL',
          'Sódio e Potássio',
          'Sumário de Urina',
          'Parasitológico de Fezes'
        ]
      }),
      instrucoes_preparo: 'Jejum mínimo de 4 horas para menores de 5 anos. Levar amostra de fezes.'
    },
    {
      nome: 'Check-up Masculino',
      preco: 'R$ 135,90',
      descricao: JSON.stringify({
        subtitle: 'Prevenção e acompanhamento completo de saúde do homem',
        tag: 'Masculino',
        exams: [
          'PSA Total',
          'PSA Livre',
          'Hemograma Completo',
          'Homoglobina Glicada',
          'Creatinina',
          'Ureia',
          'Colesterol Total',
          'Colesterol HDL',
          'Colesterol LDL',
          'Colesterol VLDL',
          'Triglicerídeos',
          'Sódio',
          'Potássio',
          'Sumário de Urina'
        ]
      }),
      instrucoes_preparo: 'Jejum de 8 a 12 horas. Para o PSA, abstinência sexual e não andar de bicicleta por 48 horas.'
    },
    {
      nome: 'Check-up Pré/Pós Festas',
      preco: 'R$ 149,99',
      descricao: JSON.stringify({
        subtitle: 'Avaliação clínica geral e exames de infecção essenciais',
        tag: 'Foco Geral',
        exams: [
          'Hemograma',
          'Glicose',
          'Ureia e Creatinina',
          'TGO / TGP (Função Hepática)',
          'Exame de Urina (EAS)',
          'Hepatite B e C',
          'HIV',
          'Sífilis'
        ]
      }),
      instrucoes_preparo: 'Jejum de 8 horas.'
    }
  ];

  for (const item of checkups) {
    const existing = await prisma.checkup.findFirst({
      where: { nome: item.nome }
    });
    if (!existing) {
      await prisma.checkup.create({
        data: item
      });
      console.log(`[Seed] Checkup ${item.nome} criado.`);
    } else {
      console.log(`[Seed] Checkup ${item.nome} já existe.`);
    }
  }

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
