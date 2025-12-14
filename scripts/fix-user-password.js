const { PrismaClient } = require('@prisma/client');
const { scryptSync, randomBytes } = require('node:crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64).toString('hex');
  const hashBuf = Buffer.from(hash, 'hex');
  const derivedBuf = Buffer.from(derived, 'hex');
  if (hashBuf.length !== derivedBuf.length) return false;
  return hashBuf.equals(derivedBuf);
}

async function fixUserPassword() {
  try {
    const email = 'admin@football.com';
    const newPassword = 'admin123';

    console.log('🔍 Checking for user:', email);
    
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('❌ User not found! Creating new user...\n');
      
      const newUser = await prisma.user.create({
        data: {
          email,
          name: 'Admin User',
          role: 'Head coach',
          passwordHash: hashPassword(newPassword),
          emailVerified: true,
        },
      });

      console.log('✅ User created successfully!');
      console.log('\n📋 Login credentials:');
      console.log('   Email:', email);
      console.log('   Password:', newPassword);
      return;
    }

    console.log('✅ User found:', user.email);
    console.log('   Name:', user.name || 'N/A');
    console.log('   Has password hash:', user.passwordHash ? 'Yes' : 'No');
    
    // Test if current password works
    if (user.passwordHash) {
      const testPassword = 'admin123';
      const works = verifyPassword(testPassword, user.passwordHash);
      console.log('   Current password test:', works ? '✅ Works' : '❌ Does not work');
      
      if (works) {
        console.log('\n✅ Password is correct! You can login with:');
        console.log('   Email:', email);
        console.log('   Password: admin123');
        return;
      }
    }

    // Update password
    console.log('\n🔧 Updating password...');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(newPassword),
        emailVerified: true, // Ensure email is verified
      },
    });

    console.log('✅ Password updated successfully!');
    console.log('\n📋 Login credentials:');
    console.log('   Email:', email);
    console.log('   Password:', newPassword);
    console.log('\n💡 Try logging in now!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('DATABASE_URL')) {
      console.log('\n⚠️  DATABASE_URL is missing!');
      console.log('Create .env file with:');
      console.log('   DATABASE_URL="file:./prisma/dev.db"');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserPassword();

