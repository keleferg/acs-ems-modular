"use client";
import { parseEntries, type QualificationField } from "@/lib/qualification/instrument";

export function EntryFields({ field, value, disabled, onChange, id }: {
  field: QualificationField; value: unknown; disabled: boolean; onChange: (value: string) => void; id: string;
}) {
  const rows = parseEntries(value);
  const update = (index: number, key: string, next: string) => onChange(JSON.stringify(rows.map((row, i) => i === index ? { ...row, [key]: next } : row)));
  return <fieldset className="sm:col-span-2 space-y-3"><legend className="mb-2 text-sm font-semibold text-slate-800">{field.label}</legend>
    {rows.map((row, index) => <div key={index} className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-3 flex justify-between"><span className="text-sm font-semibold">Entry {index + 1}</span><button type="button" disabled={disabled} className="text-sm text-red-700 disabled:opacity-50" onClick={() => onChange(JSON.stringify(rows.filter((_, i) => i !== index)))}>Remove entry</button></div><div className="grid gap-3 sm:grid-cols-2">
      {field.columns?.map((column) => <label key={column.key} className="text-sm font-semibold text-slate-700" htmlFor={`${id}-${index}-${column.key}`}>{column.label}{column.type === "select" ? <select id={`${id}-${index}-${column.key}`} value={row[column.key] ?? ""} disabled={disabled} onChange={(event) => update(index, column.key, event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"><option value="">Select</option>{column.options?.map((option) => <option key={option}>{option}</option>)}</select> : <input id={`${id}-${index}-${column.key}`} type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"} min={column.type === "number" ? 0 : undefined} step={column.type === "number" ? "0.1" : undefined} value={row[column.key] ?? ""} disabled={disabled} onChange={(event) => update(index, column.key, event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />}</label>)}
    </div></div>)}
    <button type="button" disabled={disabled} onClick={() => onChange(JSON.stringify([...rows, {}]))} className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-800 disabled:opacity-50">Add another entry</button>
  </fieldset>;
}
