// How a POA's oral portion is sequenced (Kele's direction, Oct 19 2026):
//
// - Event sets always run in their library order (poa_event_sets.sort_order).
// - Inside an event set, questions follow the logical flight sequence
//   (poa_event_set_question_rules.sequence_order).
// - Each trigger is dropped in at its point in that sequence
//   (poa_event_set_trigger_options.sequence_order); the questions it raises
//   follow it, then the sequence resumes.
// - An event set draws `triggerCount` triggers by default (0 = none), one per
//   rotation slot (poa_event_set_trigger_options.trigger_slot 1..n). Each POA
//   picks at random within a slot, avoiding the triggers used in the
//   examiner's previous POA for the same practical test, so POAs cover the
//   same objectives with different circumstances.

export type SequenceTriggerOption = {
  id: string;
  eventSetId: string;
  slot: number;
  sequenceOrder: number;
};

export type SequenceEventSet = {
  id: string;
  triggerCount: number;
};

/**
 * Default trigger selection for a new POA: one trigger per slot
 * (1..triggerCount) per event set, random within the slot, never repeating
 * a trigger from the previous POA when the slot has another choice.
 */
export function pickRotatedTriggers(input: {
  events: readonly SequenceEventSet[];
  options: readonly SequenceTriggerOption[];
  previousTriggerIds?: ReadonlySet<string>;
  skipEventSetIds?: ReadonlySet<string>;
  random?: () => number;
}): Record<string, string[]> {
  const random = input.random ?? Math.random;
  const previous = input.previousTriggerIds ?? new Set<string>();
  const picked: Record<string, string[]> = {};

  for (const event of input.events) {
    picked[event.id] = [];
    if (input.skipEventSetIds?.has(event.id)) continue;

    for (let slot = 1; slot <= Math.max(0, event.triggerCount); slot += 1) {
      const pool = input.options.filter(
        (option) =>
          option.eventSetId === event.id &&
          option.slot === slot &&
          !picked[event.id].includes(option.id),
      );
      if (pool.length === 0) continue;

      const fresh = pool.filter((option) => !previous.has(option.id));
      const candidates = fresh.length > 0 ? fresh : pool;
      const choice =
        candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
      picked[event.id].push(choice.id);
    }
  }

  return picked;
}

export type SequenceQuestion = {
  id: string;
  /** Position in the event set's flight sequence. */
  order: number;
  /** Selected triggers in this event set that this question follows up. */
  followsTriggerIds?: readonly string[];
  /** Legacy timing: the question belongs after the event set's trigger. */
  afterTrigger?: boolean;
};

export type SequenceTrigger = {
  id: string;
  /** Point in the question sequence where the trigger is dropped in. */
  position: number;
};

/**
 * One event set's items in order, as `question:<id>` / `trigger:<id>` keys.
 *
 * A trigger at position P comes after every question whose order is <= P.
 * Questions that follow up a trigger come right after it (in their own
 * order). A legacy "after trigger" question with no specific trigger, whose
 * order would put it before the first trigger, follows the first trigger.
 */
export function orderEventItems(input: {
  questions: readonly SequenceQuestion[];
  triggers: readonly SequenceTrigger[];
}): string[] {
  const triggers = [...input.triggers].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
  const triggerIds = new Set(triggers.map((trigger) => trigger.id));
  const byOrder = (a: SequenceQuestion, b: SequenceQuestion) =>
    a.order - b.order || a.id.localeCompare(b.id);

  const followUps = new Map<string, SequenceQuestion[]>();
  const free: SequenceQuestion[] = [];

  for (const question of input.questions) {
    const parent = (question.followsTriggerIds ?? []).find((id) => triggerIds.has(id));
    if (parent) {
      followUps.set(parent, [...(followUps.get(parent) ?? []), question]);
      continue;
    }
    if (question.afterTrigger && triggers.length > 0 && question.order <= triggers[0].position) {
      followUps.set(triggers[0].id, [...(followUps.get(triggers[0].id) ?? []), question]);
      continue;
    }
    free.push(question);
  }

  free.sort(byOrder);

  const keys: string[] = [];
  let next = 0;
  for (const trigger of triggers) {
    while (next < free.length && free[next].order <= trigger.position) {
      keys.push(`question:${free[next].id}`);
      next += 1;
    }
    keys.push(`trigger:${trigger.id}`);
    for (const question of (followUps.get(trigger.id) ?? []).sort(byOrder)) {
      keys.push(`question:${question.id}`);
    }
  }
  for (; next < free.length; next += 1) keys.push(`question:${free[next].id}`);

  return keys;
}
