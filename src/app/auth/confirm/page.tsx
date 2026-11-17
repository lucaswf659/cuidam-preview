import { ConfirmRecoveryLink } from "@/components/confirm-recovery-link";

export default async function ConfirmRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash: tokenHash = "", type, next = "" } = await searchParams;
  const confirmationType = type === "recovery" || type === "email" ? type : "";
  return <ConfirmRecoveryLink tokenHash={confirmationType ? tokenHash : ""} type={confirmationType} next={next} />;
}

