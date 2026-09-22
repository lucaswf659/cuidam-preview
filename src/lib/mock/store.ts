export type MockArea = { id: string; name: string; icon: string; sortOrder: number };
export type MockResponsibility = "Você" | "Outra pessoa" | "Nós";
export type MockTask = { id: string; name: string; areaId: string; responsibility: MockResponsibility; recurrence: string; load: number; completed: boolean; completedAt?: string; archived?: boolean };
export type MockHousehold = { id: string; name: string; ownerName: string; ownerEmail: string; areas: MockArea[]; tasks: MockTask[]; inviteEmail?: string };

type MockStore = { households: Map<string, MockHousehold>; sessions: Map<string, string> };
const globalStore = globalThis as typeof globalThis & { __cuidamMockStore?: MockStore };
const store: MockStore = globalStore.__cuidamMockStore ?? { households: new Map(), sessions: new Map() };
globalStore.__cuidamMockStore = store;

export function mockSessionId(email: string) { return `mock-${encodeURIComponent(email.trim().toLowerCase())}`; }

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
  return { id: "mock-household-demo", name: "Nossa casa de teste", ownerName: "Morador de teste", ownerEmail: mockDemoEmail, areas, tasks };
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
