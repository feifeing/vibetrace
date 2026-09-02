import { randomBytes } from "node:crypto";

export function createId(prefix = "vt") {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/gu, "")
    .slice(0, 14);
  return `${prefix}_${stamp}_${randomBytes(3).toString("hex")}`;
}
