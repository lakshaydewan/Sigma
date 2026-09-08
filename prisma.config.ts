import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { defineConfig, env } from "prisma/config";

// The CLI doesn't read .env for us any more. It's absent on a CI build — the
// vars come from the platform's own environment there — so this stays optional.
const envFile = path.join(process.cwd(), ".env");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

/**
 * Prisma 7 keeps connection URLs out of the schema. The CLI reads this file;
 * the app builds its own client in lib/prisma.ts.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  // Neon's pooler rejects the DDL that `db push` issues, so schema changes go to
  // the endpoint directly. The app's own queries stay pooled.
  datasource: { url: env("DIRECT_URL") },
});
