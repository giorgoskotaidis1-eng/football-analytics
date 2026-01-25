const { PrismaClient } = require("@prisma/client");
const { scryptSync, randomBytes } = require("crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("Creating test player account...");

  // Find or create a test team
  let team = await prisma.team.findFirst({
    where: { name: { contains: "Test" } },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: "Test Team",
        league: "Test League",
      },
    });
    console.log("Created test team:", team.id);
  }

  // Create test player
  const email = "player@test.com";
  const password = "test123";
  const passwordHash = hashPassword(password);

  // Check if player already exists
  const existing = await prisma.player.findUnique({
    where: { email },
  });

  if (existing) {
    // Update existing player
    const updated = await prisma.player.update({
      where: { email },
      data: {
        passwordHash,
        teamId: team.id,
      },
    });
    console.log("✅ Updated existing player:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Player ID: ${updated.id}`);
    console.log(`   Dashboard URL: /players/${updated.id}/dashboard`);
    console.log(`   Login URL: /auth/player-login`);
  } else {
    // Create new player
    const player = await prisma.player.create({
      data: {
        name: "Test Player",
        slug: `test-player-${Date.now()}`,
        position: "Forward",
        age: 25,
        number: 10,
        email,
        passwordHash,
        teamId: team.id,
        goals: 5,
        assists: 3,
        xg: 4.5,
      },
    });
    console.log("✅ Created test player:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Player ID: ${player.id}`);
    console.log(`   Dashboard URL: /players/${player.id}/dashboard`);
    console.log(`   Login URL: /auth/player-login`);
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });





