const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
      },
    });

    console.log(`\n📊 Found ${users.length} user(s) in database:\n`);

    if (users.length === 0) {
      console.log('❌ NO USERS FOUND!');
      console.log('');
      console.log('You need to create a user first:');
      console.log('   npm run create-user');
      console.log('');
      console.log('This will create a default user:');
      console.log('   Email: admin@football.com');
      console.log('   Password: admin123');
    } else {
      users.forEach((user, idx) => {
        console.log(`${idx + 1}. ${user.email}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Role: ${user.role || 'N/A'}`);
        console.log(`   Has Password: ${user.passwordHash ? '✅ Yes' : '❌ No'}`);
        console.log('');
      });
      
      console.log('💡 If you cannot login, try:');
      console.log('   npm run create-user');
      console.log('   (This will create admin@football.com / admin123)');
    }
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
    if (error.message.includes('DATABASE_URL')) {
      console.log('');
      console.log('⚠️  DATABASE_URL is missing or incorrect!');
      console.log('Check your .env file has:');
      console.log('   DATABASE_URL="file:./prisma/dev.db"');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();

