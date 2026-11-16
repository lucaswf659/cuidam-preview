import { spawnSync } from "node:child_process";
import path from "node:path";
import { e2eEnv } from "./config";

const inheritedKeys = ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP", "USERPROFILE", "HOME", "APPDATA", "LOCALAPPDATA"];
const childEnv: NodeJS.ProcessEnv = { NODE_ENV: "production" };
Object.assign(childEnv, Object.fromEntries(inheritedKeys.filter((key) => process.env[key]).map((key) => [key, process.env[key]])));
Object.assign(childEnv, { DATABASE_URL: e2eEnv.DATABASE_URL, DIRECT_URL: e2eEnv.DIRECT_URL });

const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], { stdio: "inherit", env: childEnv });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

