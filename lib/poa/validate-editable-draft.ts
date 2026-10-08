export function validateEditableDraft(input: {
  events: { id: string; name: string; maxQuestionCount: number }[];
  questions: { id: string; selected: boolean; assignedEventSetId?: string }[];
  triggers: Record<string, string[]>;
  compatibleTriggers: { id: string; eventSetId: string }[];
  allTasksCovered: boolean;
}) {
  const issues: string[] = [];
  if (!input.allTasksCovered) issues.push('Cover all required Knowledge, Risk, and flight tasks.');
  for (const event of input.events) {
    const selected = input.triggers[event.id] ?? [];
    if (!selected.length) issues.push(`${event.name} needs at least one trigger.`);
    if (selected.some(id => !input.compatibleTriggers.some(t => t.id === id && t.eventSetId === event.id))) issues.push(`${event.name} has an incompatible trigger.`);
    if (input.questions.filter(q => q.selected && q.assignedEventSetId === event.id).length > event.maxQuestionCount) issues.push(`${event.name} exceeds its question limit.`);
  }
  if (input.questions.some(q => q.selected && !input.events.some(e => e.id === q.assignedEventSetId))) issues.push('Place each selected question in an event set.');
  return issues;
}
