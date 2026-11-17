import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(process.cwd(), "prisma/migrations/20261117000000_enable_rls_on_app_tables/migration.sql");

describe("RLS migration for Supabase Data API", () => {
  it("enables RLS on every application table exposed in public", () => {
    const sql = readFileSync(migrationPath, "utf8");
    const tables = [
      "User", "Household", "Membership", "Invitation", "Area", "Task", "TaskOccurrence",
      "OccurrenceCompletion", "Reward", "RewardRedemption", "NotificationPreference", "_prisma_migrations"
    ];

    for (const table of tables) {
      expect(sql).toMatch(new RegExp(`ALTER TABLE public\\."${table}" ENABLE ROW LEVEL SECURITY;`));
    }
    expect(sql).not.toMatch(/CREATE\s+POLICY/i);
  });
});
