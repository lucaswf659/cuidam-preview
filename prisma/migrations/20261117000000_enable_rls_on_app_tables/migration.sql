-- App business data is accessed through the authenticated Next.js backend (Prisma),
-- not directly through Supabase's anon/authenticated Data API roles.
-- Enable RLS without policies so those public API roles cannot access these tables.
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Household" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Area" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TaskOccurrence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OccurrenceCompletion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Reward" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RewardRedemption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
