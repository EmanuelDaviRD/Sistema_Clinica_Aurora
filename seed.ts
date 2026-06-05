import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'lunamendes@clinica.com';
  const password = 'lunamendes123456789';

  const existing = await prisma.adminUser.findUnique({
    where: { email }
  });

  if (existing) {
    console.log(`[Seed] Admin ${email} já existe.`);
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);
  await prisma.adminUser.create({
    data: {
      email,
      password_hash
    }
  });

  console.log(`[Seed] Admin ${email} criado com sucesso!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
