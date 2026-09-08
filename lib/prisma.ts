import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma 7 takes its connection from a driver adapter rather than the schema.
 * The app talks to Neon through the pooled endpoint; migrations use the direct
 * one (see prisma.config.ts).
 */
const client = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

// Next reloads server modules on every edit, and a fresh client per reload would
// hold open a connection pool each time, so it is cached on globalThis.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? client();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
