type AuthIdentity = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export function authDisplayName(user: AuthIdentity): string | null {
  const metadata = user.user_metadata;
  if (!metadata) return null;

  for (const key of ["display_name", "displayName", "full_name", "name"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

export function authDisplayNameOrEmail(user: AuthIdentity): string {
  return authDisplayName(user) ?? user.email?.split("@")[0] ?? "Morador";
}

