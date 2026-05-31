const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  try {
    await prisma.$connect();
    await prisma.user.findMany({ take: 1 });
    console.log("DB_OK");
  } catch (e) {
    console.error("DB_FAIL", e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
