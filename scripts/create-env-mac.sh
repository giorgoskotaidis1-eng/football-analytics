#!/bin/bash

# Script to create .env file on Mac/Linux

ENV_FILE=".env"

if [ -f "$ENV_FILE" ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

cat > "$ENV_FILE" << 'EOF'
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="dev-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
EOF

echo "✅ .env file created successfully!"
echo ""
echo "Contents:"
cat "$ENV_FILE"
echo ""
echo "Next steps:"
echo "1. Run: npx prisma generate"
echo "2. Run: npx prisma migrate dev"
echo "3. Run: npm run create-user"
echo "4. Run: npm run dev"

