export type OnboardingResponsibility = "Você" | "Outra pessoa" | "Nós";
export type OnboardingSuggestion = { id: string; areaId: string; name: string; responsibility: OnboardingResponsibility; recurrence: string; load: number; selectedByDefault?: boolean };

export const suggestedTasksByArea: Record<string, Omit<OnboardingSuggestion, "id" | "areaId">[]> = {
  kitchen: [
    { name: "Limpar bancada", responsibility: "Você", recurrence: "Diária", load: 2 },
    { name: "Esvaziar lava-louças", responsibility: "Nós", recurrence: "Diária", load: 2 },
    { name: "Limpar geladeira", responsibility: "Nós", recurrence: "Mensal", load: 3 },
    { name: "Retirar o lixo", responsibility: "Você", recurrence: "Diária", load: 2, selectedByDefault: false },
    { name: "Limpar o fogão", responsibility: "Você", recurrence: "Semanal", load: 2, selectedByDefault: false },
    { name: "Limpar micro-ondas", responsibility: "Nós", recurrence: "Semanal", load: 1, selectedByDefault: false },
    { name: "Conferir alimentos da geladeira", responsibility: "Você", recurrence: "Semanal", load: 1, selectedByDefault: false },
    { name: "Organizar despensa", responsibility: "Nós", recurrence: "Mensal", load: 2, selectedByDefault: false }
  ],
  living: [
    { name: "Aspirar sala", responsibility: "Nós", recurrence: "Semanal", load: 2 },
    { name: "Organizar sala", responsibility: "Você", recurrence: "3× por semana", load: 1 },
    { name: "Tirar o pó dos móveis", responsibility: "Nós", recurrence: "Semanal", load: 2, selectedByDefault: false },
    { name: "Recolher objetos da sala", responsibility: "Nós", recurrence: "Diária", load: 1, selectedByDefault: false },
    { name: "Limpar a mesa de centro", responsibility: "Você", recurrence: "Semanal", load: 1, selectedByDefault: false }
  ],
  bedroom: [
    { name: "Trocar roupa de cama", responsibility: "Você", recurrence: "Semanal", load: 2 },
    { name: "Aspirar quartos", responsibility: "Nós", recurrence: "Semanal", load: 2 },
    { name: "Arrumar a cama", responsibility: "Você", recurrence: "Diária", load: 1, selectedByDefault: false },
    { name: "Guardar roupas limpas", responsibility: "Você", recurrence: "Semanal", load: 1, selectedByDefault: false },
    { name: "Tirar o pó dos móveis", responsibility: "Nós", recurrence: "Semanal", load: 1, selectedByDefault: false }
  ],
  bathroom: [
    { name: "Limpar banheiro", responsibility: "Você", recurrence: "Semanal", load: 3 },
    { name: "Repor papel higiênico", responsibility: "Você", recurrence: "Semanal", load: 1 },
    { name: "Limpar espelho", responsibility: "Nós", recurrence: "Semanal", load: 1 },
    { name: "Limpar o box", responsibility: "Nós", recurrence: "Semanal", load: 3, selectedByDefault: false },
    { name: "Limpar a pia", responsibility: "Você", recurrence: "Semanal", load: 2, selectedByDefault: false }
  ],
  office: [
    { name: "Organizar mesa", responsibility: "Você", recurrence: "Semanal", load: 1 },
    { name: "Limpar a mesa", responsibility: "Você", recurrence: "Semanal", load: 1, selectedByDefault: false },
    { name: "Esvaziar a lixeira", responsibility: "Nós", recurrence: "Semanal", load: 1, selectedByDefault: false },
    { name: "Organizar arquivos", responsibility: "Você", recurrence: "Mensal", load: 2, selectedByDefault: false }
  ],
  pets: [
    { name: "Alimentar pets", responsibility: "Nós", recurrence: "Diária", load: 2 },
    { name: "Comprar ração", responsibility: "Você", recurrence: "Mensal", load: 2 },
    { name: "Escovar os pets", responsibility: "Nós", recurrence: "Semanal", load: 2, selectedByDefault: false },
    { name: "Lavar os comedouros", responsibility: "Você", recurrence: "Semanal", load: 1, selectedByDefault: false },
    { name: "Conferir estoque de ração", responsibility: "Você", recurrence: "Mensal", load: 1, selectedByDefault: false }
  ]
};

export function onboardingSuggestionsForAreas(areaIds: string[]): OnboardingSuggestion[] {
  return areaIds.flatMap((areaId) => (suggestedTasksByArea[areaId] ?? []).map((task, index) => ({ ...task, id: `${areaId}-${index}`, areaId })));
}

export function defaultOnboardingTaskKeys(tasks: OnboardingSuggestion[]): Set<string> {
  return new Set(tasks.filter((task) => task.selectedByDefault !== false).map((task) => task.id));
}
