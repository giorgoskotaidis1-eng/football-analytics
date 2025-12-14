import { defineConfig, env } from "prisma/config";
import { config } from "dotenv";

// Load .env file explicitly
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL") || process.env.DATABASE_URL || "file:./prisma/dev.db",
  },
});
