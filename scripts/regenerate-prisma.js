const { execSync } = require("child_process");

console.log("Regenerating Prisma client...");
try {
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("✅ Prisma client regenerated successfully!");
} catch (error) {
  console.error("❌ Error regenerating Prisma client:", error.message);
  console.log("\n💡 Tip: Make sure the dev server is stopped before running this script.");
  process.exit(1);
}






