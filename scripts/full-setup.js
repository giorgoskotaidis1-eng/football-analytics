const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Full Setup Script for Mac\n');

// Step 1: Check .env
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  const envContent = `DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="dev-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
`;
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ .env file created\n');
} else {
  console.log('✅ .env file exists\n');
}

// Step 2: Generate Prisma Client
console.log('🔧 Generating Prisma Client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Prisma Client generated\n');
} catch (error) {
  console.error('❌ Failed to generate Prisma Client');
  process.exit(1);
}

// Step 3: Run migrations
console.log('📦 Running database migrations...');
try {
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Migrations completed\n');
} catch (error) {
  console.log('⚠️  Migration might have failed (this is OK if already migrated)\n');
}

// Step 4: Create default user
console.log('👤 Creating default user...');
try {
  execSync('node scripts/create-default-user.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ User created\n');
} catch (error) {
  console.log('⚠️  User might already exist (this is OK)\n');
}

// Step 5: Test database
console.log('🧪 Testing database...');
try {
  execSync('node scripts/test-database.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (error) {
  console.error('❌ Database test failed');
  process.exit(1);
}

console.log('\n✅ Setup complete!');
console.log('\n📋 Next steps:');
console.log('   1. Run: npm run dev');
console.log('   2. Open: http://localhost:3000');
console.log('   3. Login with:');
console.log('      Email: admin@football.com');
console.log('      Password: admin123');

