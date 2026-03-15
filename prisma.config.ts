// Prisma 7 configuration
// DATABASE_URL    = Neon pooler URL (used by the app at runtime)
// DIRECT_URL      = Neon direct URL (used for migrations, db push, db pull)
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
