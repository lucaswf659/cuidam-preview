export type MockArea = { id: string; name: string; icon: string; sortOrder: number };
export type HouseholdPerson = { id: string; name: string; email?: string; current?: boolean };
export type HouseholdInvitation = { id: string; email: string; expiresAt: string };
export type MockResponsibility = "Você" | "Outra pessoa" | "Nós";
export type MockTask = { id: string; name: string; areaId: string; responsibility: MockResponsibility; recurrence: string; load: number; completed: boolean; completedAt?: string; archived?: boolean; claimInProgress?: boolean; claimOwnedByCurrentUser?: boolean; claimOwnerName?: string };
export type NotificationPreferences = { morningReminder: boolean; activity: boolean; sharedTask: boolean; quietStart: string; quietEnd: string };
export type MockHousehold = { id: string; name: string; ownerName: string; ownerEmail: string; memberCount: number; areas: MockArea[]; tasks: MockTask[]; inviteEmail?: string; members?: HouseholdPerson[]; invitations?: HouseholdInvitation[] };

type MockStore = { households: Map<string, MockHousehold>; sessions: Map<string, string>; notificationPreferences: Map<string, NotificationPreferences> };
const globalStore = globalThis as typeof globalThis & { __cuidamMockStore?: MockStore };
const store: MockStore = globalStore.__cuidamMockStore ?? { households: new Map(), sessions: new Map(), notificationPreferences: new Map() };
store.notificationPreferences ??= new Map();
globalStore.__cuidamMockStore = store;

export function mockSessionId(email: string) { return `mock-${encodeURIComponent(email.trim().toLowerCase())}`; }

export const defaultNotificationPreferences: NotificationPreferences = { morningReminder: true, activity: false, sharedTask: false, quietStart: "22:00", quietEnd: "08:00" };
export function mockNotificationPreferencesForSession(sessionId: string, preferences?: NotificationPreferences) {
  if (preferences) store.notificationPreferences.set(sessionId, preferences);
  return store.notificationPreferences.get(sessionId) ?? defaultNotificationPreferences;
}

const mockDemoEmail = "morador.teste@cuidam.dev";
const mockDemoSessionId = mockSessionId(mockDemoEmail);

function createMockDemoHousehold(): MockHousehold {
  const areas: MockArea[] = [
    { id: "kitchen", name: "Cozinha", icon: "🍳", sortOrder: 0 },
    { id: "living", name: "Sala", icon: "🛋️", sortOrder: 1 },
    { id: "bathroom", name: "Banheiro", icon: "🫧", sortOrder: 2 },
    { id: "bedroom", name: "Quartos", icon: "🛏️", sortOrder: 3 }
  ];
  const tasks: MockTask[] = [
    { id: "mock-demo-task-kitchen", name: "Limpar bancada", areaId: "kitchen", responsibility: "Você", recurrence: "Diária", load: 2, completed: false },
    { id: "mock-demo-task-living", name: "Aspirar sala", areaId: "living", responsibility: "Nós", recurrence: "Semanal", load: 2, completed: false },
    { id: "mock-demo-task-bathroom", name: "Limpar banheiro", areaId: "bathroom", responsibility: "Você", recurrence: "Semanal", load: 3, completed: false },
    { id: "mock-demo-task-bedroom", name: "Trocar roupa de cama", areaId: "bedroom", responsibility: "Você", recurrence: "Semanal", load: 2, completed: false }
  ];
  return { id: "mock-household-demo", name: "Nossa casa de teste", ownerName: "Morador de teste", ownerEmail: mockDemoEmail, memberCount: 1, areas, tasks };
}

export function mockHouseholdForSession(sessionId: string | undefined) {
  const householdId = sessionId ? store.sessions.get(sessionId) : undefined;
  if (householdId) {
    const household = store.households.get(householdId);
    if (household) return household;
  }
  // Vercel pode atender cada request mock em uma instância diferente, então
  // a sessão demo precisa resolver sem depender do Map em memória.
  if (sessionId === mockDemoSessionId) return createMockDemoHousehold();
  return undefined;
}
export function saveMockHousehold(sessionId: string, household: MockHousehold) {
  store.households.set(household.id, household); store.sessions.set(sessionId, household.id); return household;
}
export function updateMockHousehold(household: MockHousehold) { store.households.set(household.id, household); return household; }
