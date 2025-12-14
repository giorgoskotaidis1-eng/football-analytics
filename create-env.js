const fs = require('fs');
const path = require('path');

const envContent = `DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key-change-this-in-production"
`;

const envPath = path.join(__dirname, '.env');

fs.writeFileSync(envPath, envContent, 'utf8');
console.log('✅ .env file created successfully!');
console.log('Location:', envPath);

