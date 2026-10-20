import { orderEventItems, type SequenceQuestion } from "./event-sequence";

// maxQuestionCount: how many questions the event set should hold
// (poa_event_sets.minimum_question_count: 60 / 30 / 15).
type EventSet = { id: string; code: string; name: string; maxQuestionCount: number };
type Trigger = { id: string; eventSetId: string; position: number };
type Question = { id: string; codes: string[]; placements: { eventSetId: string; afterTrigger: boolean; order: number; triggerIds?: string[]; required?: boolean }[] };

// Produce editable selections; never persist or finalize a POA here.
//
// triggerSelections: the triggers already chosen for each event set
// (pickRotatedTriggers); an event set may have none.
// requiredOnly: an additional rating asks only the Tasks in the FAA
// additional-rating table, so event sets are filled only with questions that
// cover those Tasks and may stay blank.
export function buildCompliantDraft(input: {
  events: EventSet[]; triggers: Trigger[]; triggerSelections: Record<string, string[]>;
  questions: Question[]; requiredCodes: string[];
  links: { trigger_id: string; question_id: string; is_required: boolean }[];
  requiredQuestionIds: string[];
  requiredOnly?: boolean;
}) {
  const triggers: Record<string, string[]> = Object.fromEntries(
    input.events.map(event => [event.id, (input.triggerSelections[event.id] ?? []).filter(id => input.triggers.some(t => t.id === id && t.eventSetId === event.id))]),
  );
  const selectedTriggers = new Set(Object.values(triggers).flat());
  input = { ...input, questions: input.questions.map(q => ({ ...q, placements: q.placements.filter(p => !p.triggerIds || p.triggerIds.some(id => (triggers[p.eventSetId]??[]).includes(id))) })) };
  const assignments: Record<string,string> = {};
  const counts = new Map(input.events.map(e => [e.id,0]));
  const covered = new Set<string>();
  const provisionalQuestionIds: string[] = [];
  const questions = new Map(input.questions.map(q => [q.id,q]));
  const coversRequired = (q: Question) => q.codes.some(code => input.requiredCodes.includes(code));
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
  const mandatory = new Set([...input.requiredQuestionIds,...input.questions.filter(q => q.placements.some(p => p.required) && (!input.requiredOnly || coversRequired(q))).map(q => q.id),...input.links.filter(l => l.is_required && selectedTriggers.has(l.trigger_id)).map(l => l.question_id)]);
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
  // Fill each event set to its question count from the questions mapped to
  // it, in the mapped sequence order (additional ratings: only questions on
  // the required Tasks).
  for (const event of input.events) {
    const candidates = input.questions
      .filter(q => !assignments[q.id] && (!input.requiredOnly || coversRequired(q)))
      .flatMap(q => {
        const placement = q.placements.find(p => p.eventSetId === event.id);
        return placement ? [{ q, order: placement.order }] : [];
      })
      .sort((a,b) => a.order-b.order || a.q.id.localeCompare(b.q.id));
    // When the bank holds more than the event set needs, take questions
    // spread evenly across the whole flight sequence rather than only the
    // first ones, so every part of the event set is discussed.
    const room = Math.max(0, event.maxQuestionCount - (counts.get(event.id) ?? 0));
    const spread = candidates.length > room
      ? Array.from({ length: room }, (_, i) => candidates[Math.floor((i * candidates.length) / room)])
      : candidates;
    for (const { q } of spread) {
      if ((counts.get(event.id) ?? 0) >= event.maxQuestionCount) break;
      assignments[q.id] = event.id;
      counts.set(event.id, (counts.get(event.id) ?? 0) + 1);
      q.codes.forEach(code => covered.add(code));
    }
  }
  // An additional rating's blank event sets carry no trigger.
  if (input.requiredOnly) {
    for (const event of input.events) {
      if ((counts.get(event.id) ?? 0) === 0) triggers[event.id] = [];
    }
  }
  // Event sets the question bank can't fill yet (not reported for an
  // additional rating, whose sets hold only the required Tasks).
  const shortEventSets = input.requiredOnly ? [] : input.events
    .filter(e => (counts.get(e.id) ?? 0) < e.maxQuestionCount)
    .map(e => ({ id: e.id, name: e.name, count: counts.get(e.id) ?? 0, target: e.maxQuestionCount }));
  const order: Record<string,string[]> = {};
  for (const event of input.events) {
    const eventTriggers = triggers[event.id] ?? [];
    const selected: SequenceQuestion[] = input.questions
      .filter(q => assignments[q.id]===event.id)
      .map(q => {
        const placement = q.placements.find(p => p.eventSetId===event.id);
        const linked = input.links.filter(l => l.question_id === q.id && eventTriggers.includes(l.trigger_id)).map(l => l.trigger_id);
        return {
          id: q.id,
          order: placement?.order ?? 100,
          followsTriggerIds: [...(placement?.triggerIds ?? []).filter(id => eventTriggers.includes(id)), ...linked],
          afterTrigger: placement?.afterTrigger,
        };
      });
    order[event.id] = orderEventItems({
      questions: selected,
      triggers: eventTriggers.map(id => ({ id, position: input.triggers.find(t => t.id === id && t.eventSetId === event.id)?.position ?? 500 })),
    });
  }
  return { triggers, assignments, order, questionIds: Object.keys(assignments), provisionalQuestionIds, shortEventSets, missingCodes: input.requiredCodes.filter(code => !covered.has(code)) };
}
