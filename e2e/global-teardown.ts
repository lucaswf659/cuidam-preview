import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import "./config";

export default async function globalTeardown() {
  const prefix = process.env.CUIDAM_E2E_EMAIL_PREFIX ?? "cuidam-e2e+";
  // Cleanup is a one-off batch operation; use the validated direct/session URL
  // rather than the transaction pooler used by the app runtime.
  if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;
  const prisma = new PrismaClient();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    const testUsers = await prisma.user.findMany({ where: { email: { startsWith: prefix } }, select: { id: true, authProviderId: true } });
    const testUserIds = testUsers.map((user) => user.id);
    const houses = await prisma.household.findMany({
      where: { name: { startsWith: "E2E " }, memberships: { some: { userId: { in: testUserIds } } } },
      select: { id: true }
    });
    const householdIds = houses.map((house) => house.id);
    if (householdIds.length) {
      const tasks = await prisma.task.findMany({ where: { householdId: { in: householdIds } }, select: { id: true } });
      const taskIds = tasks.map((task) => task.id);
      const occurrences = await prisma.taskOccurrence.findMany({ where: { taskId: { in: taskIds } }, select: { id: true } });
      const occurrenceIds = occurrences.map((occurrence) => occurrence.id);
      const memberships = await prisma.membership.findMany({ where: { householdId: { in: householdIds } }, select: { id: true } });
      await prisma.occurrenceCompletion.deleteMany({ where: { occurrenceId: { in: occurrenceIds } } });
      await prisma.taskOccurrence.deleteMany({ where: { id: { in: occurrenceIds } } });
      await prisma.rewardRedemption.deleteMany({ where: { householdId: { in: householdIds } } });
      await prisma.invitation.deleteMany({ where: { householdId: { in: householdIds } } });
      await prisma.notificationPreference.deleteMany({ where: { membershipId: { in: memberships.map((item) => item.id) } } });
      await prisma.user.updateMany({ where: { activeHouseholdId: { in: householdIds } }, data: { activeHouseholdId: null } });
      await prisma.task.deleteMany({ where: { householdId: { in: householdIds } } });
      await prisma.reward.deleteMany({ where: { householdId: { in: householdIds } } });
      await prisma.membership.deleteMany({ where: { householdId: { in: householdIds } } });
      await prisma.area.deleteMany({ where: { householdId: { in: householdIds } } });
      await prisma.household.deleteMany({ where: { id: { in: householdIds } } });
    }
    await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });

    const authIds = new Set(testUsers.map((user) => user.authProviderId));
    for (let page = 1; ; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      const matching = data.users.filter((user) => user.email?.startsWith(prefix));
      for (const user of matching) {
        authIds.add(user.id);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) throw deleteError;
      }
      if (data.users.length < 1000) break;
    }
    console.info(`Limpeza E2E concluída: ${authIds.size} contas de teste.`);
  } finally {
    await prisma.$disconnect();
  }
}


