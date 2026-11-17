import { redirect } from "next/navigation";
import { getRealContext } from "@/lib/real/household";
import { RewardsView } from "@/components/rewards-view";

export default async function RewardsPage() {
  if (process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false") redirect("/entrar?mode=login");
  const context = await getRealContext();
  if (!context) redirect("/entrar?mode=login");
  return <RewardsView householdName={context.household.name} />;
}

