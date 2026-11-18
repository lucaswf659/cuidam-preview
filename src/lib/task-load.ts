/** Internal default effort estimate for tasks without a suggested preset. */
export const DEFAULT_TASK_LOAD = 3;

/** Stars are awarded once after an occurrence is complete, scaled by its required completions. */
export function starsForCompletedOccurrence(load: number, targetCompletions: number) {
  return load * Math.max(1, targetCompletions);
}
