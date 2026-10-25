/*
 * POA templates (Kele, Oct 2026): an examiner-written POA script in flight order.
 * Follow-up chains stay with their parent and in order. Trigger chains rotate: each
 * rotation slot has variants; a POA uses one variant per slot and avoids the one used
 * on the examiner's previous POA for the same test.
 */

export type TemplateItemKind =
  | "seed"
  | "scenario"
  | "trigger"
  | "examiner_action"
  | "topic"
  | "question";

export type TemplateItem = {
  id: string;
  event_set_id: string;
  parent_item_id: string | null;
  sort_order: number;
  depth: number;
  item_kind: TemplateItemKind;
  script_text: string;
  question_id: string | null;
  is_optional: boolean;
  condition_note: string | null;
  aircraft_equipment: "six_pack" | "taa" | null;
  class_codes: string[] | null;
  rotation_slot: string | null;
  rotation_variant: number;
  /** ACS Task parent codes (e.g. "PA.I.H") of the linked question, if any. */
  task_parents?: string[];
};

export type TemplateVariants = Record<string, number>;

/** Variants available for each rotation slot. */
export function slotVariants(items: TemplateItem[]): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  for (const item of items) {
    if (!item.rotation_slot) continue;
    const list = (result[item.rotation_slot] ??= []);
    if (!list.includes(item.rotation_variant)) list.push(item.rotation_variant);
  }
  for (const list of Object.values(result)) list.sort((a, b) => a - b);
  return result;
}

/**
 * One variant per slot, at random, never the variant the previous POA used for that slot
 * (unless the slot has only one variant).
 */
export function pickTemplateVariants(
  items: TemplateItem[],
  previous: TemplateVariants | null | undefined,
  random: () => number = Math.random,
): TemplateVariants {
  const picks: TemplateVariants = {};
  for (const [slot, variants] of Object.entries(slotVariants(items))) {
    const fresh = variants.filter((variant) => variant !== previous?.[slot]);
    const pool = fresh.length ? fresh : variants;
    picks[slot] = pool[Math.floor(random() * pool.length)] ?? pool[0];
  }
  return picks;
}

export type TemplateBuildOptions = {
  variants: TemplateVariants;
  equipment?: "six_pack" | "taa" | null;
  classCode?: string | null;
  /** Additional ratings: the required Tasks from the Additional Rating Task Table (e.g. "PA.I.F"). */
  requiredTaskParents?: Set<string> | null;
};

/**
 * The items a POA uses, in template order. Filters drop whole chains (an item's
 * follow-ups go with it). For additional ratings, a question is kept only if every ACS Task it
 * tests is a required Task; scene lines, triggers and other parents are kept only when
 * something beneath them is kept.
 */
export function buildTemplateSequence(
  items: TemplateItem[],
  options: TemplateBuildOptions,
): TemplateItem[] {
  const ordered = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const byId = new Map(ordered.map((item) => [item.id, item]));

  const passesOwnFilters = (item: TemplateItem) => {
    if (item.rotation_slot && options.variants[item.rotation_slot] !== item.rotation_variant) return false;
    if (item.aircraft_equipment && options.equipment && item.aircraft_equipment !== options.equipment) return false;
    if (item.aircraft_equipment && !options.equipment) return false;
    if (item.class_codes?.length && options.classCode && !item.class_codes.includes(options.classCode.toUpperCase())) return false;
    return true;
  };

  // An item is in play only if it and all of its ancestors pass their filters.
  const inPlay = new Map<string, boolean>();
  const isInPlay = (item: TemplateItem): boolean => {
    const cached = inPlay.get(item.id);
    if (cached !== undefined) return cached;
    const parent = item.parent_item_id ? byId.get(item.parent_item_id) : null;
    const value = passesOwnFilters(item) && (!parent || isInPlay(parent));
    inPlay.set(item.id, value);
    return value;
  };

  const required = options.requiredTaskParents;
  if (!required) return ordered.filter(isInPlay);

  // Additional ratings (Kele, Oct 25): a question stays only if every ACS Task it tests is on
  // the Additional Rating Task Table for this add-on. Codes from another ACS (a question shared
  // with Commercial, say) are ignored. Its scene, trigger and parent lines stay with it.
  const acsPrefixes = new Set([...required].map((code) => code.split(".")[0]));
  const onlyRequiredTasks = (item: TemplateItem) => {
    const relevant = (item.task_parents ?? []).filter((code) => acsPrefixes.has(code.split(".")[0]));
    return relevant.length > 0 && relevant.every((code) => required.has(code));
  };
  const keep = new Set<string>();
  const keepWithAncestors = (item: TemplateItem) => {
    let current: TemplateItem | undefined = item;
    while (current && !keep.has(current.id)) {
      keep.add(current.id);
      current = current.parent_item_id ? byId.get(current.parent_item_id) : undefined;
    }
  };
  for (const item of ordered) {
    if (!isInPlay(item)) continue;
    if (item.item_kind === "seed") keep.add(item.id);
    if (item.question_id && onlyRequiredTasks(item)) keepWithAncestors(item);
  }
  return ordered.filter((item) => keep.has(item.id));
}

/** Replace [destination] and similar fill-ins with the scenario's details. */
export function fillTemplateText(
  text: string,
  fills: Record<string, string | null | undefined>,
): string {
  return text.replace(/\[([a-z ]+)\]/gi, (match, key: string) => {
    const value = fills[key.trim().toLowerCase()];
    return value ? value : match;
  });
}
