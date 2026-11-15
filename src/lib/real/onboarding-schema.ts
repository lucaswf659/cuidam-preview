import { z } from "zod";

export const onboardingPayloadSchema = z.object({
  name: z.string().trim().min(1).max(80),
  houseName: z.string().trim().min(1).max(80),
  areas: z.array(z.object({ id: z.string().max(40), name: z.string().max(80), icon: z.string().max(12) })).max(20),
});

