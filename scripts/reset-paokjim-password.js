const { PrismaClient } = require("@prisma/client");
const { scryptSync, randomBytes } = require("node:crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const email = "paokjim97@gmail.com";
const newPassword = "admin123";

async function main() {
  try {
    console.log("🔍 Looking for user:", email);

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log("ℹ️  User not found — creating (Supabase / fresh DB)…");
      user = await prisma.user.create({
        data: {
          email,
          name: "paokjim",
          role: "Head Coach",
          passwordHash: hashPassword(newPassword),
          emailVerified: true,
        },
      });
      console.log("✅ User created, id:", user.id);
    } else {
      console.log("✅ User found — resetting password");
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashPassword(newPassword),
          emailVerified: true,
        },
      });
    }

    console.log("\n📋 Login:");
    console.log("   Email:   ", email);
    console.log("   Password:", newPassword);
    console.log("\n⚠️  Change password after login!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
