import { parse } from "dotenv";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const port = process.env.CUIDAM_E2E_PORT ?? "3218";
const config = parse(fs.readFileSync(path.join(root, ".env.e2e")));
const safeEnv = Object.fromEntries(["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP", "USERPROFILE", "HOME", "APPDATA", "LOCALAPPDATA"].filter((key) => process.env[key]).map((key) => [key, process.env[key]]));
Object.assign(safeEnv, {
  NODE_ENV: "development",
  NEXT_PUBLIC_CUIDAM_MOCK: "false",
  NEXT_PUBLIC_SUPABASE_URL: config.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  DATABASE_URL: config.DATABASE_URL,
  DIRECT_URL: config.DIRECT_URL,
  SUPABASE_SECRET_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  PORT: port,
  HOSTNAME: "127.0.0.1"
});
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", port], { cwd: root, env: safeEnv, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));

