"use client";
import { useState } from "react";
import { EVENT_SET_SEQUENCE } from "@/lib/poa/event-set-sequence";
import { TimelineEventEditor } from "@/components/poa/timeline-event-editor";

const previewIds = ["preparation", "procedures", "start", "takeoff", "cruise", "descent", "approach", "secure"];
const eventSets = EVENT_SET_SEQUENCE.map((eventSet, index) => ({ ...eventSet, id: previewIds[index] }));
const initialQuestions = [
  { id: "q1", title: "How would you decide whether the weather is suitable for this route?", eventSetIds: ["preparation"], assignedEventSetId: "preparation", selected: true },
  { id: "q2", title: "How will you verify weight and balance before departure?", eventSetIds: ["preparation", "procedures"], assignedEventSetId: "procedures", selected: false },
  { id: "q3", title: "What action would you take if oil pressure does not rise after starting?", eventSetIds: ["start"], assignedEventSetId: "start", selected: false },
];
const initialTriggers = [
  { id: "t1", title: "Weather deteriorates along the planned route", eventSetIds: ["preparation"], assignedEventSetId: "preparation", selected: false },
  { id: "t2", title: "An additional passenger arrives with heavy baggage", eventSetIds: ["preparation", "procedures"], assignedEventSetId: "procedures", selected: false },
  { id: "t3", title: "Oil pressure remains low after engine start", eventSetIds: ["start"], assignedEventSetId: "start", selected: false },
];
export function ScenarioTimelinePreview() {
  const [questions, setQuestions] = useState(initialQuestions);
  const [triggers, setTriggers] = useState(initialTriggers);
  return <main className="min-h-screen bg-slate-100 px-5 py-10"><div className="mx-auto max-w-6xl">
    <p className="text-sm font-semibold text-indigo-700">Local design preview · Example content</p>
    <h1 className="mt-2 text-2xl font-bold text-slate-900">Scenario POA Timeline</h1>
    <TimelineEventEditor scenario={{ title: "Attending a type-specific checkout at another flight school", narrative: "Mission: Fly to another flight school for a checkout. Use your route, weather, aircraft, and passenger planning to guide the oral discussion." }} eventSets={eventSets} questions={questions} triggers={triggers}
      onAssign={(kind, id, eventSetId) => { const update = (entries: typeof initialQuestions) => entries.map((entry) => entry.id === id ? { ...entry, assignedEventSetId: eventSetId, selected: true } : entry); if (kind === "question") setQuestions(update); else setTriggers(update); }}
      onRemove={(kind, id) => { const update = (entries: typeof initialQuestions) => entries.map((entry) => entry.id === id ? { ...entry, selected: false } : entry); if (kind === "question") setQuestions(update); else setTriggers(update); }} />
  </div></main>;
}
