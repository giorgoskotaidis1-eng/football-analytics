#!/bin/bash

echo "========================================"
echo "PostgreSQL Setup Helper"
echo "========================================"
echo ""

echo "Αυτό το script θα σε βοηθήσει να αλλάξεις από SQLite σε PostgreSQL"
echo ""

echo "Επιλέξτε επιλογή:"
echo ""
echo "1. Local PostgreSQL (για development στον υπολογιστή)"
echo "2. Cloud PostgreSQL (Vercel/Supabase/Neon - για production)"
echo "3. Άκυρο - Exit"
echo ""

read -p "Εισάγετε επιλογή (1-3): " choice

case $choice in
  1)
    echo ""
    echo "========================================"
    echo "Local PostgreSQL Setup"
    echo "========================================"
    echo ""
    echo "Βεβαιώσου ότι έχεις:"
    echo "- Εγκατεστημένο PostgreSQL στον υπολογιστή"
    echo "- Δημιουργημένο database (π.χ. football_analytics)"
    echo ""
    
    read -p "Όνομα database: " dbname
    read -p "Username (default: postgres): " dbuser
    dbuser=${dbuser:-postgres}
    read -sp "Password: " dbpass
    echo ""
    read -p "Host (default: localhost): " dbhost
    dbhost=${dbhost:-localhost}
    read -p "Port (default: 5432): " dbport
    dbport=${dbport:-5432}
    
    DATABASE_URL="postgresql://${dbuser}:${dbpass}@${dbhost}:${dbport}/${dbname}"
    
    echo ""
    echo "Θα αλλάξω το schema.prisma σε PostgreSQL..."
    echo ""
    
    # Backup το schema
    cp prisma/schema.prisma prisma/schema.prisma.sqlite.backup
    
    # Άλλαξε το provider
    sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
    
    echo "✅ Schema άλλαξε σε PostgreSQL"
    echo ""
    
    echo "Θα ενημερώσω το .env file..."
    echo ""
    
    # Update .env
    if [ -f .env ]; then
      sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
    else
      echo "DATABASE_URL=\"${DATABASE_URL}\"" > .env
      echo "JWT_SECRET=\"your-secret-key-change-this-in-production\"" >> .env
    fi
    
    echo "✅ .env file ενημερώθηκε"
    echo ""
    echo "========================================"
    echo "Επόμενα βήματα:"
    echo "========================================"
    echo ""
    echo "1. Generate Prisma Client:"
    echo "   npx prisma generate"
    echo ""
    echo "2. Run migrations:"
    echo "   npx prisma migrate dev"
    echo ""
    ;;
    
  2)
    echo ""
    echo "========================================"
    echo "Cloud PostgreSQL Setup"
    echo "========================================"
    echo ""
    echo "Επιλέξτε cloud provider:"
    echo ""
    echo "1. Vercel Postgres"
    echo "2. Supabase"
    echo "3. Neon"
    echo "4. Άλλο (custom connection string)"
    echo ""
    
    read -p "Εισάγετε επιλογή (1-4): " cloudchoice
    
    case $cloudchoice in
      1)
        echo ""
        echo "========================================"
        echo "Vercel Postgres Setup"
        echo "========================================"
        echo ""
        echo "1. Πήγαινε στο Vercel project"
        echo "2. Storage tab → Create Database → Postgres"
        echo "3. Αντιγράψε το DATABASE_URL"
        echo ""
        read -p "Επικολλήστε το DATABASE_URL: " DATABASE_URL
        ;;
      2)
        echo ""
        echo "========================================"
        echo "Supabase Setup"
        echo "========================================"
        echo ""
        echo "1. Πήγαινε στο https://supabase.com"
        echo "2. Δημιούργησε project"
        echo "3. Settings → Database → Connection String (URI)"
        echo ""
        read -p "Επικολλήστε το DATABASE_URL: " DATABASE_URL
        ;;
      3)
        echo ""
        echo "========================================"
        echo "Neon Setup"
        echo "========================================"
        echo ""
        echo "1. Πήγαινε στο https://neon.tech"
        echo "2. Δημιούργησε project"
        echo "3. Αντιγράψε το Connection String"
        echo ""
        read -p "Επικολλήστε το DATABASE_URL: " DATABASE_URL
        ;;
      4)
        read -p "Επικολλήστε το PostgreSQL connection string: " DATABASE_URL
        ;;
      *)
        echo "⚠️  Άκυρη επιλογή!"
        exit 1
        ;;
    esac
    
    echo ""
    echo "Θα αλλάξω το schema.prisma σε PostgreSQL..."
    echo ""
    
    # Backup το schema
    cp prisma/schema.prisma prisma/schema.prisma.sqlite.backup
    
    # Άλλαξε το provider
    sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
    
    echo "✅ Schema άλλαξε σε PostgreSQL"
    echo ""
    
    echo "Θα ενημερώσω το .env file..."
    echo ""
    
    # Update .env
    if [ -f .env ]; then
      sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
    else
      echo "DATABASE_URL=\"${DATABASE_URL}\"" > .env
      echo "JWT_SECRET=\"your-secret-key-change-this-in-production\"" >> .env
    fi
    
    echo "✅ .env file ενημερώθηκε"
    echo ""
    echo "========================================"
    echo "Επόμενα βήματα:"
    echo "========================================"
    echo ""
    echo "1. Generate Prisma Client:"
    echo "   npx prisma generate"
    echo ""
    echo "2. Run migrations:"
    echo "   npx prisma migrate deploy"
    echo "   (ή npx prisma migrate dev για development)"
    echo ""
    ;;
    
  3)
    echo "Έξοδος..."
    exit 0
    ;;
    
  *)
    echo ""
    echo "⚠️  Άκυρη επιλογή!"
    exit 1
    ;;
esac

echo ""
echo "========================================"
echo "Ολοκληρώθηκε!"
echo "========================================"
echo ""
echo "Για περισσότερες πληροφορίες, δες το POSTGRESQL_SETUP.md"
echo ""
