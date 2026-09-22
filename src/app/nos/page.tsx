import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { mockHouseholdForSession } from "@/lib/mock/store";
import { NosMock } from "@/components/nos-mock";
import { getRealHouseholdSnapshot } from "@/lib/real/household";

export default async function NosPage() {
  const household = process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false"
    ? mockHouseholdForSession((await cookies()).get("cuidam_mock_session")?.value)
    : await getRealHouseholdSnapshot();
  if (!household) redirect("/");
  return <NosMock household={household} />;
}
