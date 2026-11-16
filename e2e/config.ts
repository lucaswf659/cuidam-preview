import { config as loadDotenv, parse } from "dotenv";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const e2ePath = path.join(root, ".env.e2e");
if (!fs.existsSync(e2ePath)) {
  throw new Error("E2E bloqueado: crie .env.e2e a partir de .env.e2e.example e configure um projeto Supabase exclusivo para testes.");
}
const e2e = parse(fs.readFileSync(e2ePath));
const required = ["CUIDAM_E2E_CONFIRM_ISOLATED_PROJECT", "CUIDAM_E2E_SUPABASE_PROJECT_REF", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "DATABASE_URL", "DIRECT_URL", "SUPABASE_SECRET_KEY"];
const missing = required.filter((key) => !e2e[key]);
if (missing.length) throw new Error(`E2E bloqueado: configure no .env.e2e: ${missing.join(", ")}.`);
if (e2e.CUIDAM_E2E_CONFIRM_ISOLATED_PROJECT !== "YES_CUIDAM_E2E_ONLY") {
  throw new Error("E2E bloqueado: confirme em .env.e2e que este projeto Supabase/PostgreSQL é exclusivo para testes.");
}

const ref = e2e.CUIDAM_E2E_SUPABASE_PROJECT_REF;
const supabaseUrl = new URL(e2e.NEXT_PUBLIC_SUPABASE_URL);
if (supabaseUrl.hostname !== `${ref}.supabase.co`) throw new Error("E2E bloqueado: a URL Supabase não corresponde ao project ref isolado informado.");
const directUrl = new URL(e2e.DIRECT_URL);
const dbUrl = new URL(e2e.DATABASE_URL);
const isDirectDatabaseUrl = directUrl.hostname === `db.${ref}.supabase.co`;
const isSessionPoolerUrl = directUrl.hostname.endsWith(".pooler.supabase.com") && directUrl.port === "5432" && decodeURIComponent(directUrl.username).includes(ref);
if ((!isDirectDatabaseUrl && !isSessionPoolerUrl) || !`${dbUrl.hostname} ${decodeURIComponent(dbUrl.username)}`.includes(ref)) {
  throw new Error("E2E bloqueado: confira se DIRECT_URL e DATABASE_URL apontam para o mesmo projeto Supabase isolado.");
}
if (dbUrl.hostname.endsWith(".pooler.supabase.com") && dbUrl.port === "6543" && dbUrl.searchParams.get("pgbouncer") !== "true") {
  throw new Error("E2E bloqueado: DATABASE_URL usa Transaction pooler; adicione ?pgbouncer=true para compatibilidade com Prisma.");
}

const pointsAtTestProject = (values: Record<string, string | undefined>) => {
  if (values.NEXT_PUBLIC_SUPABASE_URL && new URL(values.NEXT_PUBLIC_SUPABASE_URL).hostname === `${ref}.supabase.co`) return true;
  if (values.DIRECT_URL && new URL(values.DIRECT_URL).hostname === `db.${ref}.supabase.co`) return true;
  if (values.DATABASE_URL) {
    const normalDb = new URL(values.DATABASE_URL);
    if (decodeURIComponent(normalDb.username).includes(ref)) return true;
  }
  return false;
};
const normalConfigs = [".env", ".env.local", ".env.development", ".env.development.local"]
  .map((file) => path.join(root, file))
  .filter(fs.existsSync)
  .map((file) => parse(fs.readFileSync(file)));
for (const normal of normalConfigs) {
  if (pointsAtTestProject(normal)) {
    throw new Error("E2E bloqueado: a configuração de testes coincide com a configuração normal da aplicação. Use um projeto isolado diferente.");
  }
}
const alreadyLoadedTestConfig = process.env.CUIDAM_E2E_CONFIG_LOADED === "1";
if (!alreadyLoadedTestConfig && pointsAtTestProject(process.env)) {
  throw new Error("E2E bloqueado: a configuração isolada coincide com uma variável de ambiente da sessão.");
}

loadDotenv({ path: e2ePath, override: true });
process.env.NEXT_PUBLIC_CUIDAM_MOCK = "false";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = e2e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
process.env.CUIDAM_E2E_EMAIL_PREFIX ||= "cuidam-e2e+";
process.env.CUIDAM_E2E_CONFIG_LOADED = "1";

export const e2eEnv = e2e;

