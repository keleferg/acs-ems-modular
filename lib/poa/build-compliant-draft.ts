type EventSet = { id: string; code: string; name: string; maxQuestionCount: number };
type Trigger = { id: string; eventSetId: string; category: string; weight: number };
type Question = { id: string; codes: string[]; placements: { eventSetId: string; afterTrigger: boolean; order: number; triggerIds?: string[]; required?: boolean }[] };

// Produce editable selections; never persist or finalize a POA here.
export function buildCompliantDraft(input: {
  events: EventSet[]; triggers: Trigger[]; questions: Question[]; requiredCodes: string[];
  links: { trigger_id: string; question_id: string; is_required: boolean }[];
  requiredQuestionIds: string[];
}) {
  const triggers: Record<string, string[]> = {};
  for (const event of input.events) {
    const choices = input.triggers.filter(t => t.eventSetId === event.id).sort((a,b) => b.weight-a.weight || a.id.localeCompare(b.id));
    const picked = choices.slice(0,1);
    if (picked.length < 1) throw new Error(`${event.name} needs at least one compatible trigger before a compliant draft can be built.`);
    triggers[event.id] = picked.map(t => t.id);
  }
  const selectedTriggers = new Set(Object.values(triggers).flat());
  input = { ...input, questions: input.questions.map(q => ({ ...q, placements: q.placements.filter(p => !p.triggerIds || p.triggerIds.some(id => (triggers[p.eventSetId]??[]).includes(id))) })) };
  const assignments: Record<string,string> = {};
  const counts = new Map(input.events.map(e => [e.id,0]));
  const covered = new Set<string>();
  const provisionalQuestionIds: string[] = [];
  const questions = new Map(input.questions.map(q => [q.id,q]));
  const place = (q: Question, preferred?: string) => {
    const placements = [...q.placements].sort((a,b) => Number(b.eventSetId===preferred)-Number(a.eventSetId===preferred) || (counts.get(a.eventSetId)??0)-(counts.get(b.eventSetId)??0) || a.order-b.order);
    let target = placements.find(p => input.events.some(e => e.id===p.eventSetId && (counts.get(e.id)??0)<e.maxQuestionCount));
    if (!target) {
      const preferredCode = q.codes.some(code => /\.II\./.test(code)) ? 'PREFLIGHT_PROCEDURES' : q.codes.some(code => /\.IV\./.test(code)) ? 'TAKEOFF_CLIMB' : q.codes.some(code => /\.I\./.test(code)) ? 'PREFLIGHT_PREPARATION' : 'CRUISE';
      const available = input.events.filter(e => (counts.get(e.id)??0)<e.maxQuestionCount).sort((a,b) => Number(b.id===preferred)-Number(a.id===preferred) || Number(b.code===preferredCode)-Number(a.code===preferredCode) || (counts.get(a.id)??0)-(counts.get(b.id)??0));
      if (available[0]) {
        target = { eventSetId: available[0].id, afterTrigger: Boolean(preferred), order: 100 };
        q.placements.push(target);
        provisionalQuestionIds.push(q.id);
      }
    }
    if (!target) return false;
    assignments[q.id]=target.eventSetId; counts.set(target.eventSetId,(counts.get(target.eventSetId)??0)+1);
    q.codes.forEach(code => covered.add(code)); return true;
  };
  const mandatory = new Set([...input.requiredQuestionIds,...input.questions.filter(q => q.placements.some(p => p.required)).map(q => q.id),...input.links.filter(l => l.is_required && selectedTriggers.has(l.trigger_id)).map(l => l.question_id)]);
  for (const id of mandatory) {
    const q=questions.get(id);
    const trigger=input.links.find(l => l.question_id===id && selectedTriggers.has(l.trigger_id));
    const preferred=input.triggers.find(t => t.id===trigger?.trigger_id)?.eventSetId;
    if (!q || !place(q,preferred)) throw new Error('A required trigger question is missing an approved placement or the event set is full. Review its mapping before building.');
  }
  while (input.requiredCodes.some(code => !covered.has(code))) {
    const candidates=input.questions.filter(q => !assignments[q.id]).map(q => ({q,gain:q.codes.filter(code => input.requiredCodes.includes(code) && !covered.has(code)).length})).filter(x => x.gain>0).sort((a,b) => b.gain-a.gain || a.q.id.localeCompare(b.q.id));
    if (!candidates.some(({q}) => place(q))) {
      break;
    }
  }
  const order: Record<string,string[]> = {};
  for (const event of input.events) {
    const selected=input.questions.filter(q => assignments[q.id]===event.id).sort((a,b) => (a.placements.find(p => p.eventSetId===event.id)?.order??100)-(b.placements.find(p => p.eventSetId===event.id)?.order??100));
    const after=(q:Question) => q.placements.find(p => p.eventSetId===event.id)?.afterTrigger;
    order[event.id]=[...selected.filter(q => !after(q)).map(q => `question:${q.id}`),...triggers[event.id].map(id => `trigger:${id}`),...selected.filter(after).map(q => `question:${q.id}`)];
  }
  return { triggers, assignments, order, questionIds: Object.keys(assignments), provisionalQuestionIds, missingCodes: input.requiredCodes.filter(code => !covered.has(code)) };
}
