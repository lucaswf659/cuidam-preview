import { z } from "zod";

export const onboardingPayloadSchema = z.object({
  name: z.string().trim().min(1).max(80),
  houseName: z.string().trim().min(1).max(80),
  areas: z.array(z.object({ id: z.string().max(40), name: z.string().max(80), icon: z.string().max(12) })).max(20),
  tasks: z.array(z.object({
    areaId: z.string().max(40),
    name: z.string().trim().min(1).max(100),
    responsibility: z.enum(["Você", "Outra pessoa", "Nós"]),
    recurrence: z.enum(["Diária", "Semanal", "3× por semana", "Mensal"]),
    load: z.number().int().min(1).max(5),
  })).max(100),
}).superRefine((value, context) => {
  const areaIds = new Set(value.areas.map((area) => area.id));
  value.tasks.forEach((task, index) => {
    if (!areaIds.has(task.areaId)) context.addIssue({ code: "custom", path: ["tasks", index, "areaId"], message: "A tarefa precisa pertencer a uma área selecionada." });
  });
});
