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
  /** Fill-ins this item needs beyond the ones in its own text (poa_template_items.requires_fills). */
  requires_fills?: string[] | null;
  /** Missions (scenario versions of the story) this item is for, e.g. ["photo"]; null = every mission. */
  mission_codes?: string[] | null;
  /** This item's answer when it differs from the library question's (may use fill-ins). */
  answer_text?: string | null;
};

/** Whether an item belongs to the scenario's mission (Kele, Nov 11 2026: photo / ferry / on-demand). */
export const missionAllows = (item: Pick<TemplateItem, "mission_codes">, mission: string | null | undefined) =>
  !item.mission_codes?.length || (Boolean(mission) && item.mission_codes.includes(mission as string));

/**
 * Fill-ins an item needs (Kele, Nov 11 2026): the IFR fill-ins in its text plus requires_fills.
 * An item whose needs this POA can't supply is skipped (with its follow-ups), so a POA never
 * prints a made-up fix or a void time at a 24-hour tower.
 */
export function itemNeeds(item: Pick<TemplateItem, "script_text" | "requires_fills">, fillKeys: readonly string[]): string[] {
  const keys = new Set(fillKeys);
  const inText = [...item.script_text.matchAll(/\[([a-z ]+)\]/gi)].map((m) => m[1].trim().toLowerCase()).filter((k) => keys.has(k));
  return [...new Set([...inText, ...(item.requires_fills ?? [])])];
}

export type FillCheck = { keys: readonly string[]; available: Set<string> };

const satisfied = (item: TemplateItem, check: FillCheck | null | undefined) =>
  !check || itemNeeds(item, check.keys).every((key) => check.available.has(key));

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
  fillCheck?: FillCheck | null,
  mission?: string | null,
): TemplateVariants {
  const picks: TemplateVariants = {};
  // A variant is usable only if its trigger and everything under it have the fill-ins they need.
  const unusable = new Set<string>();
  // A variant written for another mission never applies (it isn't a fallback either).
  const otherMission = new Set<string>();
  for (const item of items) {
    if (!item.rotation_slot) continue;
    if (fillCheck && !satisfied(item, fillCheck)) unusable.add(`${item.rotation_slot}:${item.rotation_variant}`);
    if (!missionAllows(item, mission)) otherMission.add(`${item.rotation_slot}:${item.rotation_variant}`);
  }
  for (const [slot, every] of Object.entries(slotVariants(items))) {
    const mine = every.filter((variant) => !otherMission.has(`${slot}:${variant}`));
    const all = mine.length ? mine : every;
    const usable = all.filter((variant) => !unusable.has(`${slot}:${variant}`));
    const variants = usable.length ? usable : all;
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
  /** Skip items whose IFR fill-ins this POA can't supply. */
  fillCheck?: FillCheck | null;
  /** The scenario's mission: items written for other missions are skipped. */
  mission?: string | null;
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
    if (!satisfied(item, options.fillCheck)) return false;
    if (!missionAllows(item, options.mission)) return false;
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

/**
 * Replace [destination] and similar fill-ins with the scenario's details. A fill-in written with a
 * capital ([Passenger]) starts with a capital ("The photographer"). A value may itself use fill-ins
 * ("the lake at [destination]"), so this runs a few passes.
 */
export function fillTemplateText(
  text: string,
  fills: Record<string, string | null | undefined>,
): string {
  let out = text;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = out.replace(/\[([a-z ]+)\]/gi, (match, key: string) => {
      const value = fills[key.trim().toLowerCase()];
      if (!value) return match;
      return /^[A-Z]/.test(key) ? value.charAt(0).toUpperCase() + value.slice(1) : value;
    });
    if (next === out) break;
    out = next;
  }
  return out;
}
