import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { mockHouseholdForSession } from "@/lib/mock/store";
import { getRealHouseholdSnapshot } from "@/lib/real/household";
import { createClient } from "@/lib/supabase/server";

type EnterPageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function EnterPage({ searchParams }: EnterPageProps) {
  const { mode } = await searchParams;
  const initialMode = mode === "login" ? "login" : "signup";

  if (process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false") {
    const household = mockHouseholdForSession((await cookies()).get("cuidam_mock_session")?.value);
    if (household) redirect("/today");
    return <OnboardingFlow initialStep="signup" initialMode={initialMode} />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const household = await getRealHouseholdSnapshot();
    if (household) redirect("/today");
    return <OnboardingFlow
      initialStep="house"
      initialMode="signup"
      initialName={typeof user.user_metadata?.name === "string" ? user.user_metadata.name : ""}
      initialEmail={user.email ?? ""}
    />;
  }

  return <OnboardingFlow initialStep="signup" initialMode={initialMode} />;
}
