import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL("..", import.meta.url).pathname;
const db = new PGlite();
await db.exec(readFileSync(new URL("./qualification-fixtures/bootstrap.sql", import.meta.url),"utf8"));
const migration=readFileSync(`${root}/supabase/migrations/20261006175224_instrument_airplane_qualification.sql`,'utf8');
await db.exec(migration);
await db.exec(migration); // Idempotency.
await db.exec(readFileSync(`${root}/supabase/migrations/20261006181127_secure_qualification_explicit_grants.sql`,"utf8"));
await db.exec(readFileSync(`${root}/supabase/migrations/20261006182645_refine_instrument_qualification_fields.sql`,"utf8"));
await db.exec(readFileSync(`${root}/supabase/migrations/20261006183210_instrument_graduation_certificate.sql`,"utf8"));
assert.equal((await db.query('select count(*)::int n from qualification_requirements where is_active')).rows[0].n,40);
assert.equal((await db.query("select has_function_privilege('anon','public.examiner_save_qualification_note(uuid,uuid,text)','EXECUTE') allowed")).rows[0].allowed,false);
assert.equal((await db.query('select count(*)::int n from qualification_rule_sets')).rows[0].n,2);
assert.equal((await db.query('select count(*)::int n from qualification_requirements')).rows[0].n,42);
const rule = (await db.query("select id from qualification_rule_sets where practical_test_type_id='f630259c-3be6-485d-bdff-c4942c6dfdff'")).rows[0].id;
const requirement = async(code) => (await db.query('select id from qualification_requirements where rule_set_id=$1 and requirement_code=$2',[rule,code])).rows[0].id;
const applicant='11111111-1111-4111-8111-111111111111';
const examiner='22222222-2222-4222-8222-222222222222';
const outsider='33333333-3333-4333-8333-333333333333';
const instructor='44444444-4444-4444-8444-444444444444';
const wizard='55555555-5555-4555-8555-555555555555';
const revision='66666666-6666-4666-8666-666666666666';
const profile='77777777-7777-4777-8777-777777777777';
const request='88888888-8888-4888-8888-888888888888';
await db.exec(`insert into applicant_profiles values ('${profile}','${applicant}'); insert into practical_test_requests values ('${request}','2026-10-20T20:00:00Z'); insert into qualification_wizards values ('${wizard}','${request}','${profile}','${examiner}','${rule}',1,'applicant_in_progress','2020-01-01'); insert into qualification_wizard_revisions values ('${revision}','${wizard}',1,false,'draft'); insert into qualification_instructor_reviews(revision_id,instructor_profile_id) values ('${revision}','${instructor}');`);
const asUser=async(id) => {await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
const count=async(sql)=> (await db.query(sql)).rows[0].n;
const id=await requirement('IR_PIC_XC'); const id2=await requirement('IR_RECENT_TRAINING');
const path=`${applicant}/${revision}/photo.jpg`;
await asUser(applicant);
await db.query('insert into storage.objects(bucket_id,name) values ($1,$2)',['qualification-evidence',path]);
await db.query('insert into qualification_evidence(revision_id,requirement_id,object_path,file_name,mime_type) values ($1,$2,$3,$4,$5)',[revision,id,path,'photo.jpg','image/jpeg']);
assert.equal(await count('select count(*)::int n from qualification_evidence'),1);
await db.query('insert into qualification_evidence(revision_id,requirement_id,object_path,file_name,mime_type) values ($1,$2,$3,$4,$5)',[revision,id2,path,'photo.jpg','image/jpeg']);
for (const user of [examiner,instructor]) { await asUser(user); assert.equal(await count('select count(*)::int n from qualification_evidence'),2); assert.equal(await count('select count(*)::int n from storage.objects'),1); }
await asUser(outsider);
assert.equal(await count('select count(*)::int n from qualification_evidence'),0);assert.equal(await count('select count(*)::int n from storage.objects'),0);
await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values ($1,$2)',['qualification-evidence',`${outsider}/${revision}/attack.jpg`]));
await asUser(applicant);
await assert.rejects(db.query('insert into qualification_evidence(revision_id,requirement_id,object_path,file_name,mime_type) values ($1,$2,$3,$4,$5)',[revision,id,'does/not/exist','fake.jpg','image/jpeg']));
// Wrong requirement's package is rejected.
await db.exec('reset role'); const wrongId=(await db.query('select id from qualification_requirements where rule_set_id <> $1 limit 1',[rule])).rows[0].id;
await asUser(applicant);
await assert.rejects(db.query('insert into qualification_evidence(revision_id,requirement_id,object_path,file_name,mime_type) values ($1,$2,$3,$4,$5)',[revision,wrongId,path,'fake.jpg','image/jpeg']));
await db.exec('reset role');
const validate=async(code,values) => (await db.query('select qualification_private.instrument_validation($1,$2::jsonb,$3) result',[await requirement(code),JSON.stringify(values),revision])).rows[0].result;
assert.equal(await validate('IR_PIC_XC',{hours:'50',airplane_hours:'10'}),null);
assert.ok(await validate('IR_PIC_XC',{hours:'49.9',airplane_hours:'10'}));
assert.ok(await validate('IR_PIC_XC',{hours:'50',airplane_hours:'51'}));
assert.ok(await validate('IR_PIC_XC',{hours:'NaN',airplane_hours:'10'}));
assert.equal(await validate('IR_RECENT_TRAINING',{entries:JSON.stringify([{date:'2026-08-01',airplane:'N123',hours:'3'}])}),null);
assert.ok(await validate('IR_RECENT_TRAINING',{entries:JSON.stringify([{date:'2026-07-31',airplane:'N123',hours:'3'}])}));
assert.ok(await validate('IR_RECENT_TRAINING',{entries:JSON.stringify([{date:'2026-10-20',airplane:'N123',hours:'2.9'}])}));
assert.equal(await validate('IR_KNOWLEDGE_TEST',{test_date:'2024-10-01',score:'70',deficiency_codes:'None'}),null);
assert.ok(await validate('IR_KNOWLEDGE_TEST',{test_date:'2024-09-30',score:'70',deficiency_codes:'None'}));
assert.equal(await validate('IR_PATHWAY',{training_basis:'Part 141 Graduate',existing_instrument:false,concurrent_private:false,graduation_date:'2026-01-01'}),null);
assert.equal(await validate('IR_PATHWAY',{training_basis:'Part 141 Graduate',existing_instrument:false,concurrent_private:false}),'Enter a valid Date of Graduation.');
assert.equal(await validate('IR_ENDORSEMENT_KNOWLEDGE',{endorsement_date:'2024-09-01',instructor_name:'Test',instructor_certificate_number:'1'}),null);
assert.ok(await validate('IR_DEVICE_CREDIT',{entries:JSON.stringify([{device_type:'BATD',device_model:'Test',date:'2026-10-01',hours:'11',instructor:'Test',part142:'No',approval_reference:'Test'}])}));
assert.ok(await validate('IR_APPLICATION',{application_type:'IACRA',application_id:'1',signed:false}));
// A failed metadata save can clean up its own unreferenced upload.
await asUser(applicant);
const orphan=`${applicant}/${revision}/orphan.jpg`;
await db.query('insert into storage.objects(bucket_id,name) values ($1,$2)',['qualification-evidence',orphan]);
assert.equal((await db.query('delete from storage.objects where name=$1 returning id',[orphan])).rows.length,1);
await db.exec('reset role');
// Authorized reviewer comments cannot be saved by an unrelated account.
await db.query('insert into qualification_answers(revision_id,requirement_id,answer_value) values ($1,$2,$3::jsonb)',[revision,id,JSON.stringify({hours:'50',airplane_hours:'10'})]);
await asUser(examiner);
await db.query('select examiner_save_qualification_note($1,$2,$3)',[revision,id,'Please upload the totals page.']);
await asUser(outsider);
await assert.rejects(db.query('select examiner_save_qualification_note($1,$2,$3)',[revision,id,'Unauthorized comment']));
await db.exec('reset role');
assert.equal((await db.query('select examiner_notes from qualification_answers where revision_id=$1 and requirement_id=$2',[revision,id])).rows[0].examiner_notes,'Please upload the totals page.');
// Incomplete submission fails even when a caller skips client checks.
await assert.rejects(db.exec(`update qualification_wizard_revisions set is_locked=true,revision_status='applicant_submitted' where id='${revision}'`));
// A complete standard package with no device credit can be submitted.
const catalog=JSON.parse(readFileSync(`${root}/data/instrument-qualification.json`,'utf8'));
for (const definition of catalog.filter((row)=>!["computed","instructor_certification"].includes(row.rule_config.answer_type) && row.requirement_code!=='IR_DEVICE_CREDIT')) {
  const values=Object.fromEntries(definition.display_config.fields.map((field)=>[field.key,
    field.type==='checkbox' || field.type==='yes_no' ? true : field.type==='number' ? '50' : field.type==='date' ? '2026-10-01' : field.type==='select' ? field.options[0] : field.type==='entries' ? JSON.stringify([Object.fromEntries(field.columns.map((column)=>[column.key,column.type==='date' ? '2026-10-01' : column.type==='number' ? '3' : 'Test']))]) : 'Test']));
  if (definition.requirement_code==='IR_PATHWAY') Object.assign(values,{existing_instrument:false,concurrent_private:false});
  if (definition.requirement_code==='IR_KNOWLEDGE_TEST') values.score='70';
  if (definition.requirement_code==='IR_INSTRUMENT_TOTAL') Object.assign(values,{actual_hours:'10',simulated_hours:'30',device_hours:'0'});
  if (definition.requirement_code==='IR_LONG_XC') values.logged_distance_nm='250';
  if (definition.requirement_code==='IR_MEDICAL') Object.assign(values,{date_of_birth:'1990-01-01',qualification_type:'BasicMed'});
  const requirementId=await requirement(definition.requirement_code);
  await db.exec('reset role');
  await db.query('delete from qualification_answers where revision_id=$1 and requirement_id=$2',[revision,requirementId]);
  await db.query('insert into qualification_answers(revision_id,requirement_id,answer_value) values ($1,$2,$3::jsonb)',[revision,requirementId,JSON.stringify(values)]);
  if (definition.requires_document && definition.requirement_code!=='IR_MEDICAL') {
    await asUser(applicant);
    await db.query('insert into qualification_evidence(revision_id,requirement_id,object_path,file_name,mime_type) values ($1,$2,$3,$4,$5) on conflict do nothing',[revision,requirementId,path,'photo.jpg','image/jpeg']);
  }
}
await db.exec('reset role');
const pathwayId = await requirement('IR_PATHWAY');
await db.query('update qualification_answers set answer_value=$1::jsonb where revision_id=$2 and requirement_id=$3',[JSON.stringify({training_basis:'Part 141 Graduate',existing_instrument:false,concurrent_private:false,graduation_date:'2026-01-01'}),revision,pathwayId]);
assert.match((await db.query('select automated_result_message from qualification_answers where revision_id=$1 and requirement_id=$2',[revision,pathwayId])).rows[0].automated_result_message,/more than 60/);
await assert.rejects(db.exec(`update qualification_wizard_revisions set is_locked=true,revision_status='applicant_submitted' where id='${revision}'`),/Attach supporting pictures/);
await asUser(applicant);
await db.query('insert into qualification_evidence(revision_id,requirement_id,object_path,file_name,mime_type) values ($1,$2,$3,$4,$5)',[revision,pathwayId,path,'graduation.jpg','image/jpeg']);
await db.exec('reset role');
const evidenceBeforeSubmission=await count(`select count(*)::int n from qualification_evidence where revision_id='${revision}'`);
await db.exec(`update qualification_wizard_revisions set is_locked=true,revision_status='applicant_submitted' where id='${revision}'`);
// Lock evidence mutations and preserve old revision references.
await db.exec(`update qualification_wizard_revisions set is_locked=true,revision_status='instructor_certified' where id='${revision}'`);
await asUser(applicant);
assert.equal((await db.query('delete from qualification_evidence where revision_id=$1 returning id',[revision])).rows.length,0);
await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values ($1,$2)',['qualification-evidence',`${applicant}/${revision}/locked.jpg`]));
await asUser(examiner); await db.exec('reset role');
const newRevision='99999999-9999-4999-8999-999999999999';
await db.exec(`insert into qualification_wizard_revisions values ('${newRevision}','${wizard}',2,false,'draft'); update qualification_wizards set current_revision_number=2 where id='${wizard}';`);
assert.equal(await count(`select count(*)::int n from qualification_evidence where revision_id='${newRevision}'`),evidenceBeforeSubmission);
await asUser(applicant);
await db.query('delete from qualification_evidence where revision_id=$1',[newRevision]);
await db.exec('reset role');
assert.equal(await count(`select count(*)::int n from qualification_evidence where revision_id='${revision}'`),evidenceBeforeSubmission);
assert.equal(await count('select count(*)::int n from storage.objects'),1);
await db.close();
console.log('PASS: migration/idempotency, initial-only routing, numeric/date limits, signed evidence access, wrong-package/outsider rejection, submission guard, locked revisions, evidence reuse and correction history.');
