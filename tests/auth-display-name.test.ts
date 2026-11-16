import { describe, expect, it } from "vitest";
import { authDisplayName, authDisplayNameOrEmail } from "@/lib/real/auth-display-name";

describe("auth display name", () => {
  it("prioritizes the Supabase display name and trims it", () => {
    expect(authDisplayName({ user_metadata: { display_name: " Lucas WF ", name: "lucaswf659" } })).toBe("Lucas WF");
  });

  it("supports standard full name metadata", () => {
    expect(authDisplayName({ user_metadata: { full_name: "Lucas WF" } })).toBe("Lucas WF");
  });

  it("uses the email prefix only when creating an invited user without a name", () => {
    expect(authDisplayNameOrEmail({ email: "lucaswf659@gmail.com", user_metadata: {} })).toBe("lucaswf659");
  });

  it("does not turn an email prefix into a display-name update", () => {
    expect(authDisplayName({ email: "lucaswf659@gmail.com", user_metadata: {} })).toBeNull();
  });
});

