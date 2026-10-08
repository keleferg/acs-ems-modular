"use client";
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
type Question = { id: string; question: string };
type Mapping = { question_id: string; is_required: boolean; poa_questions: Question | Question[] | null };
export function TriggerQuestionAssociations({ triggerId }: { triggerId: string }) {
  const [open,setOpen]=useState(false),[links,setLinks]=useState<Mapping[]>([]),[results,setResults]=useState<Question[]>([]),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function load() {
    const {data,error}=await createClient().from('poa_trigger_questions').select('question_id,is_required,poa_questions(id,question)').eq('trigger_id',triggerId).order('weight',{ascending:false});
    if(error)throw new Error(error.message);
    setLinks((data??[]) as Mapping[]);
  }
  async function run(action:()=>Promise<void>) {
    setBusy(true);setError('');
    try {await action();} catch(e){setError(e instanceof Error?e.message:'Unable to save question association.');} finally {setBusy(false);}
  }
  async function find() {
    const {data,error}=await createClient().from('poa_questions').select('id,question').eq('is_active',true).ilike('question',`%${search.trim()}%`).limit(30);
    if(error)throw new Error(error.message);setResults(data??[]);
  }
  async function save(questionId:string,required:boolean,existing:boolean) {
    const client=createClient();
    const result=existing
      ? await client.from('poa_trigger_questions').update({is_required:required}).eq('trigger_id',triggerId).eq('question_id',questionId).select('question_id')
      : await client.from('poa_trigger_questions').insert({trigger_id:triggerId,question_id:questionId,relationship:'follow_up',is_required:required,weight:100}).select('question_id');
    if(result.error)throw new Error(result.error.message);
    if(!result.data?.length)throw new Error('The association was not saved. Check your editing access.');
    await load();
  }
  return <div className="mt-2">
    <button type="button" disabled={busy} onClick={()=>{setOpen(!open);if(!open)void run(load);}} className="text-sm font-semibold text-indigo-700">{open?'Hide mapped questions':'View and associate questions'}</button>
    {open?<div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-bold text-slate-900">Questions for this trigger</h3>
      <a href={`/examiner/plan-of-action/questions?addForTrigger=${encodeURIComponent(triggerId)}`} className="mt-3 inline-block rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">Add New Question</a>
      <p className="mt-1 text-xs text-slate-600">Required questions are included when the POA builder selects this trigger. Optional questions remain available for manual selection.</p>
      {!links.length?<p className="my-3 text-sm text-slate-500">No questions mapped yet.</p>:<ul className="my-3 space-y-3">{links.map(link=>{const q=Array.isArray(link.poa_questions)?link.poa_questions[0]:link.poa_questions;return <li key={link.question_id} className="rounded-lg bg-slate-50 p-3"><p className="text-sm">{q?.question??'Question unavailable'}</p><div className="mt-2 flex gap-4"><label className="text-sm"><input type="checkbox" checked={link.is_required} disabled={busy} onChange={e=>void run(()=>save(link.question_id,e.target.checked,true))}/> Required follow-up</label><button type="button" disabled={busy} className="text-sm text-red-700" onClick={()=>void run(async()=>{const r=await createClient().from('poa_trigger_questions').delete().eq('trigger_id',triggerId).eq('question_id',link.question_id).select('question_id');if(r.error)throw new Error(r.error.message);if(!r.data?.length)throw new Error('The association was not removed.');await load();})}>Remove association</button></div></li>;})}</ul>}
      <form className="mt-4 flex gap-2" onSubmit={e=>{e.preventDefault();void run(find);}}><input aria-label="Search questions for this trigger" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search questions in the library…" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"/><button disabled={busy||!search.trim()} className="rounded-lg bg-indigo-700 px-3 py-2 text-sm text-white">Search</button></form>
      <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto">{results.filter(q=>!links.some(l=>l.question_id===q.id)).map(q=><li key={q.id} className="rounded-lg border p-3"><p className="text-sm">{q.question}</p><div className="mt-2 flex gap-3"><button disabled={busy} type="button" className="text-sm font-semibold text-indigo-700" onClick={()=>void run(()=>save(q.id,true,false))}>Add required</button><button disabled={busy} type="button" className="text-sm text-slate-600" onClick={()=>void run(()=>save(q.id,false,false))}>Add optional</button></div></li>)}</ul>
      {error?<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>:null}
    </div>:null}
  </div>;
}
