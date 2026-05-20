import { PrismaClient } from "@prisma/client"

const g = globalThis as { _prisma?: PrismaClient }

export const db =
  g._prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error"] : ["error"] })

if (process.env.NODE_ENV !== "production") g._prisma = db
