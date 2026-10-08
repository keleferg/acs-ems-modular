"use client";

import { useState, type DragEvent } from "react";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";

type Entry = { id: string; title: string; eventSetIds: string[]; assignedEventSetId?: string; selected?: boolean };
type EventSet = { id: string; name: string; description?: string | null; maxQuestionCount: number };
type Props = {
  scenario: { title: string; narrative?: string | null };
  eventSets: EventSet[];
  questions: Entry[];
  triggers: Entry[];
  itemOrder?: Record<string, string[]>;
  onOrderChange?: (eventSetId: string, keys: string[]) => void;
  onAssign: (kind: "question" | "trigger", id: string, eventSetId: string) => boolean | void;
  onRemove: (kind: "question" | "trigger", id: string, eventSetId: string) => void;
};

export function insertTimelineItem(keys: string[], key: string, before?: string) {
  if (key === before) return keys;
  const next = keys.filter((existing) => existing !== key);
  const index = before ? next.indexOf(before) : -1;
  next.splice(index < 0 ? next.length : index, 0, key);
  return next;
}

export function TimelineEventEditor({ scenario, eventSets, questions, triggers, onAssign, onRemove, itemOrder, onOrderChange }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<"question" | "trigger">("question");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState("");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [localOrder, setLocalOrder] = useState<Record<string, string[]>>({});
  const order = itemOrder ?? localOrder;
  function entriesFor(eventSetId: string) {
    const entries = [
      ...questions.filter((entry) => entry.selected && entry.assignedEventSetId === eventSetId).map((entry) => ({ ...entry, kind: "question" as const, key: `question:${entry.id}` })),
      ...triggers.filter((entry) => entry.selected && entry.assignedEventSetId === eventSetId).map((entry) => ({ ...entry, kind: "trigger" as const, key: `trigger:${entry.id}` })),
    ];
    const keys = order[eventSetId] ?? [];
    return entries.sort((a, b) => (keys.includes(a.key) ? keys.indexOf(a.key) : Number.MAX_SAFE_INTEGER) - (keys.includes(b.key) ? keys.indexOf(b.key) : Number.MAX_SAFE_INTEGER));
  }
  function updateOrder(eventSetId: string, keys: string[]) {
    setLocalOrder((current) => ({ ...current, [eventSetId]: keys }));
    onOrderChange?.(eventSetId, keys);
  }
  function assign(entryKind: "question" | "trigger", id: string, eventSetId: string, before?: string) {
    const entry = (entryKind === "question" ? questions : triggers).find((item) => item.id === id && item.eventSetIds.includes(eventSetId));
    if (!entry) { setNotice("This item is not mapped to this event set. Choose a compatible item from the library."); return; }
    if (onAssign(entryKind, id, eventSetId) === false) return;
    updateOrder(eventSetId, insertTimelineItem(entriesFor(eventSetId).map((item) => item.key), `${entryKind}:${id}`, before));
    setCollapsed((current) => { const next = new Set(current); next.delete(eventSetId); return next; });
    setNotice("");
  }
  function startDrag(event: DragEvent, entryKind: "question" | "trigger", id: string) {
    event.dataTransfer.setData("application/x-poa-item", JSON.stringify({ kind: entryKind, id }));
    event.dataTransfer.effectAllowed = "move";
  }
  const library = (kind === "question" ? questions : triggers).filter((entry) => entry.title.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="mt-6 space-y-5">
      <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Scenario</p>
        <h3 className="mt-2 text-xl font-bold text-slate-900">{scenario.title}</h3>
        {scenario.narrative && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{scenario.narrative}</p>}
      </article>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {eventSets.map((eventSet, index) => {
            const eventQuestions = questions.filter((entry) => entry.selected && entry.assignedEventSetId === eventSet.id);
            const eventTriggers = triggers.filter((entry) => entry.selected && entry.assignedEventSetId === eventSet.id);
            const closed = collapsed.has(eventSet.id);
            return <section key={eventSet.id} onDragOver={(event) => { if (event.dataTransfer.types.includes("application/x-poa-item")) { event.preventDefault(); setDragOver(eventSet.id); } }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver(null); }} onDrop={(event) => {
              event.preventDefault(); setDragOver(null);
              try { const data = JSON.parse(event.dataTransfer.getData("application/x-poa-item")); if ((data.kind === "question" || data.kind === "trigger") && typeof data.id === "string") assign(data.kind, data.id, eventSet.id); } catch { setNotice("Drag a question or trigger from the library."); }
            }} className={`overflow-hidden rounded-2xl border ${dragOver === eventSet.id ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-200"} bg-white`}>
              <button type="button" aria-expanded={!closed} aria-controls={`event-body-${eventSet.id}`} onClick={() => setCollapsed((current) => { const next = new Set(current); if (closed) next.delete(eventSet.id); else next.add(eventSet.id); return next; })} className="flex w-full items-center gap-3 bg-slate-50 p-4 text-left hover:bg-slate-100">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{index + 1}</span>
                <span className="min-w-0 flex-1"><span className="block font-bold text-slate-900">{eventSet.name}</span><span className="mt-1 block text-xs text-slate-500">{eventQuestions.length}/{eventSet.maxQuestionCount} questions · {eventTriggers.length} triggers · 1 required</span></span>
                {closed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              <div id={`event-body-${eventSet.id}`} hidden={closed} className="space-y-4 p-4">
                {eventSet.description && <p className="text-sm text-slate-600">{eventSet.description}</p>}
                <ol className="space-y-2" aria-label={`${eventSet.name} sequence`}>
                  {entriesFor(eventSet.id).map((entry, itemIndex, entries) => <li key={entry.key} draggable onDragStart={(event) => startDrag(event, entry.kind, entry.id)} onDragOver={(event) => { if (event.dataTransfer.types.includes("application/x-poa-item")) event.preventDefault(); }} onDrop={(event) => {
                    event.preventDefault(); event.stopPropagation(); setDragOver(null);
                    try { const data = JSON.parse(event.dataTransfer.getData("application/x-poa-item")); if ((data.kind === "question" || data.kind === "trigger") && typeof data.id === "string") assign(data.kind, data.id, eventSet.id, entry.key); } catch { setNotice("Drag a question or trigger from the library."); }
                  }} className={`flex items-start gap-2 rounded-lg border p-3 ${entry.kind === "question" ? "border-sky-200 bg-sky-50" : "border-amber-200 bg-amber-50"}`}>
                    <GripVertical aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase text-slate-500">{itemIndex + 1}. {entry.kind === "question" ? "Question" : "Trigger"}</p><p className="mt-1 text-sm text-slate-800">{entry.title}</p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <button type="button" disabled={itemIndex === 0} aria-label={`Move ${entry.title} up`} onClick={() => updateOrder(eventSet.id, insertTimelineItem(entries.map((item) => item.key), entry.key, entries[itemIndex - 1]?.key))} className="text-xs font-semibold text-indigo-700 disabled:opacity-30">Move up</button>
                        <button type="button" disabled={itemIndex === entries.length - 1} aria-label={`Move ${entry.title} down`} onClick={() => updateOrder(eventSet.id, insertTimelineItem(entries.map((item) => item.key), entry.key, entries[itemIndex + 2]?.key))} className="text-xs font-semibold text-indigo-700 disabled:opacity-30">Move down</button>
                        <button type="button" aria-label={`Remove ${entry.title}`} onClick={() => onRemove(entry.kind, entry.id, eventSet.id)} className="text-xs font-semibold text-slate-500 hover:text-rose-700">Remove</button>
                      </div>
                    </div>
                  </li>)}
                </ol>
                <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">Drop a question or trigger here to add it at the end. Drop onto an item to insert before it.</p>
              </div>
            </section>;
          })}
        </div>
        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-bold text-slate-900">Add to event sets</h3>
          <p className="mt-1 text-sm text-slate-600">Drag an item onto an event set, or choose a destination and click Add.</p>
          <div className="mt-4 flex gap-2">{(["question", "trigger"] as const).map((value) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${kind === value ? "bg-indigo-700 text-white" : "bg-white text-slate-700"}`}>{value === "question" ? "Questions" : "Triggers"}</button>)}</div>
          <input aria-label="Search library items" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search library…" className="mt-3 w-full rounded-lg border border-slate-300 p-2 text-sm" />
          <select aria-label="Destination event set" value={target} onChange={(event) => setTarget(event.target.value)} className="mt-3 w-full rounded-lg border border-slate-300 p-2 text-sm"><option value="">Choose an event set</option>{eventSets.map((eventSet, index) => <option key={eventSet.id} value={eventSet.id}>{index + 1}. {eventSet.name}</option>)}</select>
          <div className="mt-3 max-h-[600px] space-y-2 overflow-y-auto">
            {library.map((entry) => <div key={`${entry.id}-${entry.eventSetIds.join()}`} draggable onDragStart={(event) => startDrag(event, kind, entry.id)} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-start gap-2"><GripVertical aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><p className="text-sm text-slate-800">{entry.title}</p></div>
              <p className="mt-2 text-xs text-slate-500">{eventSets.filter((eventSet) => entry.eventSetIds.includes(eventSet.id)).map((eventSet) => eventSet.name).join(", ") || "No event set mapping"}</p>
              <button type="button" disabled={!target || !entry.eventSetIds.includes(target)} onClick={() => assign(kind, entry.id, target)} className="mt-2 text-xs font-bold text-indigo-700 disabled:opacity-40">Add to event set</button>
            </div>)}
            {library.length === 0 && <p className="text-sm text-slate-500">No matching items.</p>}
          </div>
        </aside>
      </div>
      <p role="status" className="text-sm text-rose-700">{notice}</p>
    </div>
  );
}
