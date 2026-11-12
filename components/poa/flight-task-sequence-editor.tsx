"use client";
import { useState, type DragEvent } from "react";
import type { FlightTaskDraft } from "@/lib/poa/flight-tasks";
import { flightFamilyFor, flightPlacement } from "@/lib/poa/flight-sequence";

export function moveFlightTask(keys: string[], key: string, before?: string) {
  if (key === before) return keys;
  const next = keys.filter((value) => value !== key);
  const index = before ? next.indexOf(before) : -1;
  next.splice(index < 0 ? next.length : index, 0, key);
  return next;
}

export function FlightTaskSequenceEditor({ library, selected, onChange }: { library: FlightTaskDraft[]; selected: string[]; onChange: (keys: string[]) => void }) {
  const [search, setSearch] = useState("");
  const tasks = selected.flatMap((code) => library.filter((task) => task.acs_task_code_snapshot === code));
  // The library is already in flight order; a task added without a drop target goes to its place in
  // that order (before the first selected task that comes after it), not to the end.
  function add(code: string, before?: string) {
    if (!library.some((task) => task.acs_task_code_snapshot === code)) return;
    let target = before;
    if (!target && !selected.includes(code)) {
      const order = library.map((task) => task.acs_task_code_snapshot);
      const position = order.indexOf(code);
      target = selected.find((key) => order.indexOf(key) > position);
    }
    onChange(moveFlightTask(selected, code, target));
  }
  const family = flightFamilyFor(library.map((task) => task.acs_task_code_snapshot.split(".")[0]));
  const setOf = (task: FlightTaskDraft) => flightPlacement(task.task_name_snapshot, family).set;
  function drag(event: DragEvent, code: string) { event.dataTransfer.setData("application/x-poa-flight-task", code); event.dataTransfer.effectAllowed = "move"; }
  function drop(event: DragEvent, before?: string) { event.preventDefault(); event.stopPropagation(); add(event.dataTransfer.getData("application/x-poa-flight-task"), before); }
  return <section id="poa-panel-flight_tasks" role="tabpanel" aria-labelledby="poa-tab-flight_tasks" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="text-xl font-bold text-slate-900">Flight Tasks</h2>
    <p className="mt-2 text-sm text-slate-600">Tasks come in flight order, grouped like the oral: preflight, first takeoff, en route, maneuvers, emergencies, ground reference, takeoffs and landings, postflight. Drag a task onto another to put it before that one, or use Move up / Move down.</p>
    <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
      <div onDragOver={(event) => { if (event.dataTransfer.types.includes("application/x-poa-flight-task")) event.preventDefault(); }} onDrop={(event) => drop(event)} className="min-h-40 rounded-xl border border-dashed border-slate-300 p-4">
        <h3 className="font-bold text-slate-900">Flight sequence · {tasks.length} tasks</h3>
        <ol className="mt-3 space-y-2">{tasks.map((task, index) => <li key={task.acs_task_code_snapshot} className="list-none">
          {index === 0 || setOf(tasks[index - 1]).code !== setOf(task).code ? (
            <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-sky-800 first:mt-0">{setOf(task).name}</p>
          ) : null}
          <div draggable onDragStart={(event) => drag(event, task.acs_task_code_snapshot)} onDragOver={(event) => { if (event.dataTransfer.types.includes("application/x-poa-flight-task")) event.preventDefault(); }} onDrop={(event) => drop(event, task.acs_task_code_snapshot)} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-bold text-slate-900">{index + 1}. {task.task_name_snapshot}</p><p className="mt-1 text-xs text-slate-500">{task.acs_task_code_snapshot}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
            <button type="button" disabled={index === 0} onClick={() => onChange(moveFlightTask(selected, task.acs_task_code_snapshot, tasks[index - 1]?.acs_task_code_snapshot))} className="text-indigo-700 disabled:opacity-30">Move up</button>
            <button type="button" disabled={index === tasks.length - 1} onClick={() => onChange(moveFlightTask(selected, task.acs_task_code_snapshot, tasks[index + 2]?.acs_task_code_snapshot))} className="text-indigo-700 disabled:opacity-30">Move down</button>
            <button type="button" onClick={() => onChange(selected.filter((code) => code !== task.acs_task_code_snapshot))} className="text-rose-700">Remove</button>
          </div>
          </div>
        </li>)}</ol>
        <p className="mt-4 text-sm text-slate-500">Drop flight tasks here to add to the end.</p>
      </div>
      <div><label className="block text-sm font-semibold text-slate-700">Flight-task library<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search task or ACS code…" className="mt-2 w-full rounded-lg border border-slate-300 p-2 font-normal" /></label>
        <div className="mt-3 max-h-[600px] space-y-2 overflow-y-auto">{library.filter((task) => `${task.task_name_snapshot} ${task.acs_task_code_snapshot}`.toLowerCase().includes(search.toLowerCase())).map((task) => <article key={task.acs_task_code_snapshot} draggable onDragStart={(event) => drag(event, task.acs_task_code_snapshot)} className="rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-900">{task.task_name_snapshot}</p><p className="mt-1 text-xs text-slate-500">{task.acs_task_code_snapshot} · {setOf(task).name}</p>
          <button type="button" disabled={selected.includes(task.acs_task_code_snapshot)} onClick={() => add(task.acs_task_code_snapshot)} className="mt-2 text-xs font-bold text-indigo-700 disabled:text-emerald-700">{selected.includes(task.acs_task_code_snapshot) ? "Added" : "Add to flight sequence"}</button>
        </article>)}</div>
      </div>
    </div>
  </section>;
}
