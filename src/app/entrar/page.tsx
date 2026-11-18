import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { mockHouseholdForSession } from "@/lib/mock/store";
import { getRealHouseholdSnapshot, getReopenableHouseholds } from "@/lib/real/household";
import { createClient } from "@/lib/supabase/server";

type EnterPageProps = {
  searchParams: Promise<{ mode?: string; confirmed?: string; reopenError?: string }>;
};

export default async function EnterPage({ searchParams }: EnterPageProps) {
  const { mode, confirmed, reopenError } = await searchParams;
  const initialMode = mode === "login" ? "login" : "signup";

  if (process.env.NEXT_PUBLIC_CUIDAM_MOCK !== "false") {
    const household = mockHouseholdForSession((await cookies()).get("cuidam_mock_session")?.value);
    if (household) redirect("/today");
    return <OnboardingFlow initialStep="signup" initialMode={initialMode} reopenError={reopenError} />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const household = await getRealHouseholdSnapshot();
    if (household) redirect("/today");
    const reopenableHouseholds = await getReopenableHouseholds(user.id);
    return <OnboardingFlow
      initialStep="house"
      initialMode="signup"
      initialName={typeof user.user_metadata?.name === "string" ? user.user_metadata.name : ""}
      initialEmail={user.email ?? ""}
      confirmationCompleted={confirmed === "1"}
      reopenableHouseholds={reopenableHouseholds}
      reopenError={reopenError}
    />;
  }

  return <OnboardingFlow initialStep="signup" initialMode={initialMode} reopenError={reopenError} />;
}
