const { PrismaClient } = require('@prisma/client');
const { scryptSync, randomBytes } = require('node:crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function createDefaultUser() {
  try {
    const email = 'admin@football.com';
    const password = 'admin123';
    const name = 'Admin User';

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log('✅ User already exists:', email);
      console.log('   You can login with:');
      console.log('   Email:', email);
      console.log('   Password:', password);
      return;
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: 'Head coach',
        passwordHash: hashPassword(password),
        emailVerified: true, // Skip email verification for default user
      },
    });

    console.log('✅ Default user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('');
    console.log('⚠️  IMPORTANT: Change this password after first login!');
  } catch (error) {
    console.error('❌ Error creating user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultUser();

