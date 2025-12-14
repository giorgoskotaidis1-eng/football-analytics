const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...\n');

    // Test 1: Check if Prisma can connect
    await prisma.$connect();
    console.log('✅ Database connection: OK');

    // Test 2: Check if User table exists and is accessible
    const userCount = await prisma.user.count();
    console.log(`✅ User table accessible: ${userCount} user(s) found`);

    // Test 3: Try to create a test query
    const users = await prisma.user.findMany({ take: 1 });
    console.log('✅ Database queries: OK');

    // Test 4: Check if we can write (test transaction)
    await prisma.$transaction(async (tx) => {
      // Just test, don't actually write
      await tx.user.findMany({ take: 1 });
    });
    console.log('✅ Database transactions: OK');

    console.log('\n✅ All database tests passed!');
    console.log('\n💡 If you still get network errors:');
    console.log('   1. Make sure npm run dev is running');
    console.log('   2. Check that .env has DATABASE_URL');
    console.log('   3. Run: npx prisma generate');
    console.log('   4. Run: npx prisma migrate dev');

  } catch (error) {
    console.error('\n❌ Database test failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('DATABASE_URL')) {
      console.log('\n⚠️  DATABASE_URL is missing!');
      console.log('Create .env file with:');
      console.log('   DATABASE_URL="file:./prisma/dev.db"');
    } else if (error.message.includes('schema')) {
      console.log('\n⚠️  Prisma schema issue!');
      console.log('Run: npx prisma generate');
    } else if (error.message.includes('migrate') || error.message.includes('table')) {
      console.log('\n⚠️  Database migrations needed!');
      console.log('Run: npx prisma migrate dev');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();

