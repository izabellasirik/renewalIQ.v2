#!/usr/bin/env node
// Prisma's schema references DIRECT_URL for migrations (a non-pooled
// connection, needed because `prisma migrate deploy` can't take the
// advisory lock it needs through a pooled/pgbouncer connection). If
// DIRECT_URL isn't configured, Prisma hard-fails with "Environment
// variable not found: DIRECT_URL" instead of just using DATABASE_URL —
// so this falls back to DATABASE_URL when DIRECT_URL is unset, which
// matches Prisma's behavior before directUrl was added to the schema.
// Cross-platform (plain Node, no shell-specific syntax) since this also
// runs via postinstall on whatever OS `npm install` is run on.
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vercel injects configured Environment Variables directly into
// process.env, but locally we only have a .env file — load it here too
// (without overriding real env vars) so this fallback works the same
// way in both places. Minimal parser, no dotenv dependency needed.
function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = (match[2] ?? "").trim();
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const command = process.argv.slice(2).join(" ");
const result = spawnSync(command, { stdio: "inherit", shell: true, env: process.env });
process.exit(result.status ?? 1);
