import { ConfirmRecoveryLink } from "@/components/confirm-recovery-link";

export default async function ConfirmRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash: tokenHash = "", type } = await searchParams;
  return <ConfirmRecoveryLink tokenHash={type === "recovery" ? tokenHash : ""} />;
}

