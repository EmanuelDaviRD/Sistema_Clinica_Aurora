import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Lista com as 20 URLs de imagens brutas carregadas no bucket do Supabase 'fotos-clinica'
const URLS_SUPABASE = [
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.41.jpeg", // 0: Dr. Henrique Feitosa
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42%20(1).jpeg", // 1: Dr. Éverton Silveira Macedo
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42%20(2).jpeg", // 2: Júnior Soares
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42%20(3).jpeg", // 3: Ana Cecília Benício
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42%20(4).jpeg", // 4: Dra. Myreia Petronio
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.42.jpeg", // 5: Dra. Tamyllys Tavares
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43%20(1).jpeg", // 6: Josiclea Cassiano
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43%20(2).jpeg", // 7: Dra. Renata Aquino
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43%20(3).jpeg", // 8: Jamile Santos
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43%20(4).jpeg", // 9: Dr. Cícero Hedilberto
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.43.jpeg", // 10: Dr. Guilherme Porto (Neuropediatria)
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.44%20(1).jpeg", // 11: Dr. Henrile Ferreira (Nutrologia)
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.44%20(2).jpeg", // 12: Samara Joice
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.44%20(3).jpeg", // 13: Márcia Duarte
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.45.44.jpeg", // 14: Paula Jamilly
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.47%20(1).jpeg", // 15: Dr. Guilherme Porto (Neuropsiquiatria)
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.47%20(2).jpeg", // 16: Dr. Henrile Ferreira (Endoscopia)
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.47.jpeg", // 17: Dr. Francisco Rosário
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.48%20(1).jpeg", // 18: Dr. Pablo Rolim
  "https://dzjjioioqbwiouusrkrb.supabase.co/storage/v1/object/public/fotos-clinica/WhatsApp%20Image%202026-06-01%20at%2022.47.48.jpeg"  // 19: Dr. Fernando Filho
];

async function main() {
  console.log('Iniciando semeadura do banco de dados com os dados CORRETOS Luna & Mendes (JS Code)...');

  await prisma.agendamento.deleteMany({});
  await prisma.horario.deleteMany({});
  await prisma.medico.deleteMany({});
  await prisma.adminUser.deleteMany({});
  
  console.log('Tabelas limpas para garantir integridade dos dados.');

  const password = 'lunamendes123456789';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.adminUser.create({
    data: {
      email: 'lunamendes@clinica.com',
      password_hash: passwordHash,
    },
  });
  console.log(`✓ Administrador padrão criado: ${admin.email} | Senha: ${password}`);

  const medicosReais = [
    {
      nome: 'Dr. Henrique Feitosa',
      especialidade: 'Cardiologia',
      foto_url: URLS_SUPABASE[0]
    },
    {
      nome: 'Dr. Éverton Silveira Macedo',
      especialidade: 'Cirurgia Geral e Urologista',
      foto_url: URLS_SUPABASE[1]
    },
    {
      nome: 'Júnior Soares',
      especialidade: 'Enfermeiro Dermato-Estomaterapeuta',
      foto_url: URLS_SUPABASE[2]
    },
    {
      nome: 'Ana Cecília Benício',
      especialidade: 'Estomaterapeuta / Laserterapeuta',
      foto_url: URLS_SUPABASE[3]
    },
    {
      nome: 'Dra. Myreia Petronio',
      especialidade: 'Ginecologista e Obstetra',
      foto_url: URLS_SUPABASE[4]
    },
    {
      nome: 'Dra. Tamyllys Tavares',
      especialidade: 'Psiquiatria Adulto e Infantil',
      foto_url: URLS_SUPABASE[5]
    },
    {
      nome: 'Josiclea Cassiano',
      especialidade: 'Fonoaudióloga Especialista em Audiologia',
      foto_url: URLS_SUPABASE[6]
    },
    {
      nome: 'Dra. Renata Aquino',
      especialidade: 'Médica Dermatologista',
      foto_url: URLS_SUPABASE[7]
    },
    {
      nome: 'Jamile Santos',
      especialidade: 'Enfermeira (Exame Citopatológico)',
      foto_url: URLS_SUPABASE[8]
    },
    {
      nome: 'Dr. Cícero Hedilberto',
      especialidade: 'Gastroenterologia, Endoscopia e Cirurgia Geral',
      foto_url: URLS_SUPABASE[9]
    },
    {
      nome: 'Dr. Guilherme Porto (Neuropediatria)',
      especialidade: 'Neuropediatria e Neurologia',
      foto_url: URLS_SUPABASE[10]
    },
    {
      nome: 'Dr. Henrile Ferreira (Nutrologia)',
      especialidade: 'Endoscopia Digestiva Alta e Nutrologia',
      foto_url: URLS_SUPABASE[11]
    },
    {
      nome: 'Samara Joice',
      especialidade: 'Nutricionista Infantil',
      foto_url: URLS_SUPABASE[12]
    },
    {
      nome: 'Márcia Duarte',
      especialidade: 'Fonoaudióloga Clínico-Comportamental',
      foto_url: URLS_SUPABASE[13]
    },
    {
      nome: 'Paula Jamilly',
      especialidade: 'Enfermeira',
      foto_url: URLS_SUPABASE[14]
    },
    {
      nome: 'Dr. Guilherme Porto (Neuropsiquiatria)',
      especialidade: 'Médico Neuropsiquiatra',
      foto_url: URLS_SUPABASE[15]
    },
    {
      nome: 'Dr. Henrile Ferreira (Endoscopia)',
      especialidade: 'Endoscopia Digestiva Alta',
      foto_url: URLS_SUPABASE[16]
    },
    {
      nome: 'Dr. Francisco Rosário',
      especialidade: 'Medicina do Trabalho',
      foto_url: URLS_SUPABASE[17]
    },
    {
      nome: 'Dr. Pablo Rolim',
      especialidade: 'Ultrassonografia e Consultas Gástricas',
      foto_url: URLS_SUPABASE[18]
    },
    {
      nome: 'Dr. Fernando Filho',
      especialidade: 'Ultrassonografia',
      foto_url: URLS_SUPABASE[19]
    }
  ];

  const medicosCriados = [];
  for (const medico of medicosReais) {
    const med = await prisma.medico.create({
      data: {
        nome: medico.nome,
        especialidade: medico.especialidade,
        foto_url: medico.foto_url
      }
    });
    medicosCriados.push(med);
    console.log(`✓ Profissional inserido: ${med.nome} | Especialidade: ${med.especialidade}`);
  }

  const dataRef = new Date();
  dataRef.setHours(9, 0, 0, 0);

  for (const med of medicosCriados) {
    const horarioManha = new Date(dataRef.getTime() + 1000 * 60 * 60 * 24); 
    const horarioTarde = new Date(dataRef.getTime() + 1000 * 60 * 60 * 24 + 1000 * 60 * 60 * 5); 

    await prisma.horario.create({
      data: {
        data_hora: horarioManha,
        medico_id: med.id,
        status_disponivel: true,
      },
    });

    await prisma.horario.create({
      data: {
        data_hora: horarioTarde,
        medico_id: med.id,
        status_disponivel: true,
      },
    });

    console.log(`  └─ Criados horários padrão de atendimento para: ${med.nome}`);
  }

  console.log('Semeadura do banco de dados (20 Profissionais no total) concluída com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao executar o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
