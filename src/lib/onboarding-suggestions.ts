export type OnboardingResponsibility = "Você" | "Outra pessoa" | "Nós";
export type OnboardingSuggestion = { id: string; areaId: string; name: string; responsibility: OnboardingResponsibility; recurrence: string; load: number };

export const suggestedTasksByArea: Record<string, Omit<OnboardingSuggestion, "id" | "areaId">[]> = {
  kitchen: [
    { name: "Limpar bancada", responsibility: "Você", recurrence: "Diária", load: 2 },
    { name: "Esvaziar lava-louças", responsibility: "Nós", recurrence: "Diária", load: 2 },
    { name: "Limpar geladeira", responsibility: "Nós", recurrence: "Mensal", load: 3 }
  ],
  living: [
    { name: "Aspirar sala", responsibility: "Nós", recurrence: "Semanal", load: 2 },
    { name: "Organizar sala", responsibility: "Você", recurrence: "3× por semana", load: 1 }
  ],
  bedroom: [
    { name: "Trocar roupa de cama", responsibility: "Você", recurrence: "Semanal", load: 2 },
    { name: "Aspirar quartos", responsibility: "Nós", recurrence: "Semanal", load: 2 }
  ],
  bathroom: [
    { name: "Limpar banheiro", responsibility: "Você", recurrence: "Semanal", load: 3 },
    { name: "Repor papel higiênico", responsibility: "Você", recurrence: "Semanal", load: 1 },
    { name: "Limpar espelho", responsibility: "Nós", recurrence: "Semanal", load: 1 }
  ],
  office: [{ name: "Organizar mesa", responsibility: "Você", recurrence: "Semanal", load: 1 }],
  pets: [
    { name: "Alimentar pets", responsibility: "Nós", recurrence: "Diária", load: 2 },
    { name: "Comprar ração", responsibility: "Você", recurrence: "Mensal", load: 2 }
  ]
};

export function onboardingSuggestionsForAreas(areaIds: string[]): OnboardingSuggestion[] {
  return areaIds.flatMap((areaId) => (suggestedTasksByArea[areaId] ?? []).map((task, index) => ({ ...task, id: `${areaId}-${index}`, areaId })));
}
