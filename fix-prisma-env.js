const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envExample = `DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key-change-this-in-production"
`;

console.log('========================================');
console.log('Fixing .env file for Prisma');
console.log('========================================\n');

// Check if .env exists
if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');
  const currentContent = fs.readFileSync(envPath, 'utf8');
  console.log('Current content:');
  console.log(currentContent);
  console.log('\n---\n');
  
  // Check if DATABASE_URL exists
  if (!currentContent.includes('DATABASE_URL')) {
    console.log('❌ DATABASE_URL missing! Fixing...');
    fs.writeFileSync(envPath, envExample, 'utf8');
    console.log('✅ Fixed!');
  } else {
    console.log('✅ DATABASE_URL found');
    // But let's rewrite it to ensure correct format
    fs.writeFileSync(envPath, envExample, 'utf8');
    console.log('✅ Rewrote .env with correct format');
  }
} else {
  console.log('❌ .env file NOT found! Creating...');
  fs.writeFileSync(envPath, envExample, 'utf8');
  console.log('✅ Created .env file');
}

// Verify
const finalContent = fs.readFileSync(envPath, 'utf8');
console.log('\nFinal .env content:');
console.log('---');
console.log(finalContent);
console.log('---\n');

// Check file location
console.log('File location:', envPath);
console.log('File exists:', fs.existsSync(envPath));
console.log('File size:', fs.statSync(envPath).size, 'bytes');

// Try to load it as environment variable
require('dotenv').config({ path: envPath });
console.log('\nAfter loading with dotenv:');
console.log('DATABASE_URL =', process.env.DATABASE_URL || 'NOT SET');

console.log('\n========================================');
console.log('✅ Done! Now try:');
console.log('npm run migrate -- --name add_message_comment_relations');
console.log('========================================');

