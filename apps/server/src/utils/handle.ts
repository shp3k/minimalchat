import { randomBytes } from "node:crypto";
import { prisma } from "../db.js";

export function normalizeHandle(value: string) {
  return value
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function assertValidHandle(handle: string) {
  if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
    return "Handle must contain 3-24 latin letters, numbers or underscores";
  }

  return null;
}

export async function createUniqueHandle(seed: string) {
  const base = normalizeHandle(seed) || "user";

  for (let index = 0; index < 20; index += 1) {
    const suffix = index === 0 ? "" : `_${randomBytes(2).toString("hex")}`;
    const candidate = `${base}${suffix}`.slice(0, 24).replace(/_+$/g, "") || "user";
    const existing = await prisma.user.findUnique({ where: { handle: candidate } });

    if (!existing) {
      return candidate;
    }
  }

  return `user_${randomBytes(5).toString("hex")}`;
}
