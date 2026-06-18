import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load .env file explicitly for local Prisma commands.
config();

function getPrismaCliDatabaseUrl() {
  const directUrl = process.env.DIRECT_URL;
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (directUrl) {
    return directUrl;
  }

  // Supabase serverless transaction pooler URLs use port 6543.
  // Prisma migrations are safer through the session/direct connection.
  // Supabase session pooler uses the same host with port 5432.
  if (databaseUrl.includes(".pooler.supabase.com:6543")) {
    return databaseUrl.replace(":6543", ":5432");
  }

  return databaseUrl;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: getPrismaCliDatabaseUrl(),
  },
});
