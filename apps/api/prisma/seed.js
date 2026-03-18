const { PrismaClient } = require('@prisma/client');
const { randomBytes, scryptSync } = require('node:crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');

  return `scrypt:${salt}:${derivedKey}`;
}

async function main() {
  const adminName = (process.env.ADMIN_NAME || 'Administrador').trim();
  const adminEmail = (
    process.env.ADMIN_EMAIL || 'admin@controle.local'
  )
    .trim()
    .toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  await prisma.configuration.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      allowMultipleVehiclesPerClient: false,
      sessionDurationDays: 7,
    },
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: 'ADMIN',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
