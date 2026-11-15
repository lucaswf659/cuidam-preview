import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { mockHouseholdForSession } from "@/lib/mock/store";
import { getRealHouseholdSnapshot } from "@/lib/real/household";
import { NotificationSettings } from "@/components/notification-settings";

export default async function NotificationSettingsPage() {
  const household = process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false"
    ? mockHouseholdForSession((await cookies()).get("cuidam_mock_session")?.value)
    : await getRealHouseholdSnapshot();
  if (!household) redirect("/");
  return <NotificationSettings householdName={household.name} />;
}
