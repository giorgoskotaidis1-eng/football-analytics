const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

console.log('Checking .env file...');
console.log('Expected location:', envPath);

// Check if file exists
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists!');
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('Current content:');
  console.log('---');
  console.log(content);
  console.log('---');
  
  // Check if DATABASE_URL is present
  if (content.includes('DATABASE_URL')) {
    console.log('✅ DATABASE_URL found in file');
  } else {
    console.log('❌ DATABASE_URL NOT found! Fixing...');
    const fixedContent = `DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key-change-this-in-production"
`;
    fs.writeFileSync(envPath, fixedContent, 'utf8');
    console.log('✅ Fixed .env file');
  }
} else {
  console.log('❌ .env file NOT found! Creating it...');
  const content = `DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key-change-this-in-production"
`;
  fs.writeFileSync(envPath, content, 'utf8');
  console.log('✅ Created .env file');
}

// Verify the file again
const finalContent = fs.readFileSync(envPath, 'utf8');
console.log('\nFinal .env content:');
console.log('---');
console.log(finalContent);
console.log('---');

// Check environment variable
console.log('\nEnvironment check:');
console.log('DATABASE_URL from process.env:', process.env.DATABASE_URL || 'NOT SET');

