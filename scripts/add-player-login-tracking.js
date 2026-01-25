const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Adding login tracking fields to Player table...");
    
    // SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we'll try-catch
    try {
      await prisma.$executeRawUnsafe("ALTER TABLE Player ADD COLUMN lastLoginAt DATETIME;");
      console.log("✅ Added lastLoginAt column");
    } catch (e) {
      if (e.message.includes("duplicate column")) {
        console.log("⚠️ lastLoginAt column already exists");
      } else {
        throw e;
      }
    }

    try {
      await prisma.$executeRawUnsafe("ALTER TABLE Player ADD COLUMN isOnline BOOLEAN DEFAULT 0;");
      console.log("✅ Added isOnline column");
    } catch (e) {
      if (e.message.includes("duplicate column")) {
        console.log("⚠️ isOnline column already exists");
      } else {
        throw e;
      }
    }

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();




