export type MockArea = { id: string; name: string; icon: string; sortOrder: number };
export type MockResponsibility = "Você" | "Outra pessoa" | "Nós";
export type MockTask = { id: string; name: string; areaId: string; responsibility: MockResponsibility; recurrence: string; load: number; completed: boolean; completedAt?: string; archived?: boolean };
export type MockHousehold = { id: string; name: string; ownerName: string; ownerEmail: string; areas: MockArea[]; tasks: MockTask[]; inviteEmail?: string };

type MockStore = { households: Map<string, MockHousehold>; sessions: Map<string, string> };
const globalStore = globalThis as typeof globalThis & { __cuidamMockStore?: MockStore };
const store: MockStore = globalStore.__cuidamMockStore ?? { households: new Map(), sessions: new Map() };
globalStore.__cuidamMockStore = store;

export function mockSessionId(email: string) { return `mock-${encodeURIComponent(email.trim().toLowerCase())}`; }
export function mockHouseholdForSession(sessionId: string | undefined) {
  const householdId = sessionId ? store.sessions.get(sessionId) : undefined;
  return householdId ? store.households.get(householdId) : undefined;
}
export function saveMockHousehold(sessionId: string, household: MockHousehold) {
  store.households.set(household.id, household); store.sessions.set(sessionId, household.id); return household;
}
export function updateMockHousehold(household: MockHousehold) { store.households.set(household.id, household); return household; }
