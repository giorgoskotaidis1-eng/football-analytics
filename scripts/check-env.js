const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file does NOT exist!');
  console.log('Run: npm run setup-env (or create it manually)');
  process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
console.log('✅ .env file exists!');
console.log('');
console.log('Current contents:');
console.log('---');
console.log(content);
console.log('---');
console.log('');

// Check if DATABASE_URL exists
if (!content.includes('DATABASE_URL')) {
  console.log('⚠️  WARNING: DATABASE_URL is missing!');
  console.log('');
  console.log('To fix, run this command:');
  console.log('cat > .env << \'EOF\'');
  console.log('DATABASE_URL="file:./prisma/dev.db"');
  console.log('NEXTAUTH_SECRET="dev-secret-key-change-in-production"');
  console.log('NEXTAUTH_URL="http://localhost:3000"');
  console.log('EOF');
  process.exit(1);
}

console.log('✅ DATABASE_URL is present!');
console.log('');
console.log('If you still get errors, make sure the path is correct:');
console.log('DATABASE_URL should point to: file:./prisma/dev.db');

