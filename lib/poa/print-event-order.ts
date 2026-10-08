type Entry = {
  kind: 'question' | 'trigger';
  sortOrder: number;
  question?: { event_set_id: string | null; trigger_option_id?: string | null };
  trigger?: { event_set_id: string | null; timeline_kind: string | null; trigger_library_id?: string | null };
};

export function orderPrintedEventSets<T extends Entry>(entries: T[]): T[] {
  const sorted = [...entries].sort((a,b) => a.sortOrder-b.sortOrder || Number(b.kind==='trigger')-Number(a.kind==='trigger'));
  const headers = sorted.filter(e => e.trigger?.timeline_kind==='event_set' && e.trigger.event_set_id);
  const grouped = new Set(headers.map(e => e.trigger!.event_set_id));
  const eventId = (e:T) => e.kind==='question' ? e.question?.event_set_id : e.trigger?.event_set_id;
  const groupedEntries = [
    ...sorted.filter(e => e.trigger?.timeline_kind==='scenario'),
    ...headers.flatMap(header => [header,...sorted.filter(e => e!==header && e.trigger?.timeline_kind!=='event_set' && eventId(e)===header.trigger!.event_set_id)]),
    ...sorted.filter(e => e.trigger?.timeline_kind!=='scenario' && !grouped.has(eventId(e)??null)),
  ];
  const triggers = groupedEntries.filter(e => e.kind==='trigger' && e.trigger?.trigger_library_id);
  const linked = (e:T) => e.kind==='question' && e.question?.trigger_option_id && triggers.some(t=>t.trigger?.trigger_library_id===e.question?.trigger_option_id);
  return groupedEntries.filter(e=>!linked(e)).flatMap(e=>e.kind==='trigger' && e.trigger?.trigger_library_id ? [e,...groupedEntries.filter(q=>linked(q) && q.question?.trigger_option_id===e.trigger?.trigger_library_id)] : [e]);
}
