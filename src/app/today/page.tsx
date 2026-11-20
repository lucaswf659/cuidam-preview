import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { mockHouseholdForSession } from "@/lib/mock/store";
import { TodayMock } from "@/components/today-mock";
import { getRealHouseholdSnapshot } from "@/lib/real/household";

export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const { add } = await searchParams;
  const household = process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false"
    ? mockHouseholdForSession((await cookies()).get("cuidam_mock_session")?.value)
    : await getRealHouseholdSnapshot();
  if (!household) redirect("/entrar?mode=login");
  return <TodayMock household={household} initialAdd={add === "1"} />;
}
