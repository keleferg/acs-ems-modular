-- Repair the Private Pilot ASEL Question Library coverage identified by the
-- ACS-driven generator. Existing questions are given additional parent-level
-- Knowledge/Risk applicability only where the question itself directly
-- evaluates that subject. Four narrowly scoped system questions fill areas
-- for which no defensible library question existed.

with new_questions (
  question,
  answer,
  acs_reference,
  topic,
  task_name
) as (
  values
    (
      'While operating near a towered airport, your radio fails and traffic is converging. How will you maintain situational awareness, avoid a runway incursion or conflict, and safely continue or land?',
      'Maintain aircraft control and visual separation, troubleshoot without becoming distracted, use 7600 when appropriate, observe traffic and light-gun signals, follow the applicable lost-communications and tower procedures, and choose the safest option based on position, fuel, weather, and traffic.',
      'PA.III.A.R',
      'Communications and traffic-conflict risk management',
      'PA.III.A.R Communications, Light Signals, and Runway Lighting Systems'
    ),
    (
      'During slow flight, workload and angle of attack increase while control effectiveness decreases. What cues would cause you to stop the maneuver, and how will you prevent an inadvertent stall or loss of control?',
      'Use clearing procedures and an appropriate altitude, recognize buffet, stall warning, deteriorating control response, uncoordinated flight, or excessive workload, maintain coordination and angle-of-attack awareness, and promptly reduce angle of attack and recover when safety margins deteriorate.',
      'PA.VII.A.R',
      'Slow-flight risk management',
      'PA.VII.A.R Maneuvering During Slow Flight'
    ),
    (
      'While maneuvering solely by reference to instruments, your scan begins to break down and altitude, airspeed, and heading start drifting. How do you recognize the problem, prioritize corrections, and avoid spatial disorientation or loss of control?',
      'Trust and cross-check the flight instruments, return to a disciplined scan, prioritize attitude and power before secondary deviations, make small coordinated corrections, avoid fixation and abrupt control inputs, and discontinue or seek assistance before workload exceeds capability.',
      'PA.VIII.A.R; PA.VIII.B.R; PA.VIII.C.R; PA.VIII.D.R',
      'Basic instrument maneuver risk management',
      'PA.VIII.A.R Straight-and-Level Flight; PA.VIII.B.R Constant Airspeed Climbs; PA.VIII.C.R Constant Airspeed Descents; PA.VIII.D.R Turns to Headings'
    ),
    (
      'During a simulated inadvertent-IMC escape, the primary navigation display becomes unreliable and radio reception is intermittent. How will you verify usable navigation and communication information, obtain assistance, and maintain aircraft control while choosing the safest course of action?',
      'Maintain aircraft control by reference to reliable instruments, cross-check independent navigation sources, verify frequencies and equipment configuration, use available ATC, Flight Service, radar, or emergency assistance, apply appropriate lost-communications procedures, and select the safest route back to visual conditions or a suitable landing.',
      'PA.VIII.F.K; PA.VIII.F.R',
      'Communications, navigation, and radar services',
      'PA.VIII.F.K Radio Communications, Navigation Systems/Facilities, and Radar Services; PA.VIII.F.R Radio Communications, Navigation Systems/Facilities, and Radar Services'
    )
)
insert into public.poa_questions (
  examiner_profile_id,
  acs_reference,
  question,
  answer,
  reference,
  topic,
  task_name,
  question_type,
  difficulty,
  source_type,
  source_document_name,
  is_active
)
select
  'c1a1420e-149d-402c-8d4e-65e659bfd8cd'::uuid,
  n.acs_reference,
  n.question,
  n.answer,
  'FAA-S-ACS-6C, Private Pilot for Airplane Category',
  n.topic,
  n.task_name,
  'scenario',
  'standard',
  'system',
  'FAA-S-ACS-6C coverage repair',
  true
from new_questions n
where not exists (
  select 1
  from public.poa_questions q
  where q.examiner_profile_id = 'c1a1420e-149d-402c-8d4e-65e659bfd8cd'::uuid
    and q.question = n.question
);
with new_questions (question, acs_reference) as (
  values
    (
      'While operating near a towered airport, your radio fails and traffic is converging. How will you maintain situational awareness, avoid a runway incursion or conflict, and safely continue or land?',
      'PA.III.A.R'
    ),
    (
      'During slow flight, workload and angle of attack increase while control effectiveness decreases. What cues would cause you to stop the maneuver, and how will you prevent an inadvertent stall or loss of control?',
      'PA.VII.A.R'
    ),
    (
      'While maneuvering solely by reference to instruments, your scan begins to break down and altitude, airspeed, and heading start drifting. How do you recognize the problem, prioritize corrections, and avoid spatial disorientation or loss of control?',
      'PA.VIII.A.R; PA.VIII.B.R; PA.VIII.C.R; PA.VIII.D.R'
    ),
    (
      'During a simulated inadvertent-IMC escape, the primary navigation display becomes unreliable and radio reception is intermittent. How will you verify usable navigation and communication information, obtain assistance, and maintain aircraft control while choosing the safest course of action?',
      'PA.VIII.F.K; PA.VIII.F.R'
    )
)
insert into public.poa_question_acs_applicability (
  question_id,
  certificate_name,
  acs_reference
)
select q.id, 'Private Pilot', n.acs_reference
from new_questions n
join public.poa_questions q
  on q.examiner_profile_id = 'c1a1420e-149d-402c-8d4e-65e659bfd8cd'::uuid
 and q.question = n.question
on conflict (question_id, certificate_name)
do update set acs_reference = excluded.acs_reference;
with new_question_ids as (
  select q.id
  from public.poa_questions q
  where q.examiner_profile_id = 'c1a1420e-149d-402c-8d4e-65e659bfd8cd'::uuid
    and q.source_document_name = 'FAA-S-ACS-6C coverage repair'
)
insert into public.poa_question_practical_test_types (
  question_id,
  practical_test_type_id
)
select q.id, p.id
from new_question_ids q
cross join public.practical_test_types p
where upper(coalesce(p.certificate_code, '')) = 'PRIVATE'
  and upper(coalesce(p.category_code, '')) = 'AIRPLANE'
  and p.is_active
on conflict (question_id, practical_test_type_id) do nothing;
-- Add reviewed secondary ACS coverage to existing scenario questions.
with mapping (question_id, acs_reference) as (
  values
    ('96dadc25-8241-40c4-853a-838f1b8a4ea6'::uuid, 'PA.I.B.R'),
    ('4feae46c-1772-4679-8709-a997c7ae61e5'::uuid, 'PA.I.E.R'),
    ('1ada18e8-fb33-4923-b9e8-cc606cdedd13'::uuid, 'PA.I.F.R'),
    ('1ada18e8-fb33-4923-b9e8-cc606cdedd13'::uuid, 'PA.IV.E.K'),
    ('f3161d7f-87f8-4e93-bd78-76d009b7e1ae'::uuid, 'PA.II.D.R'),
    ('4aab84c4-f1e1-4838-822f-914529ac0500'::uuid, 'PA.IV.D.R'),
    ('ac0f5c13-4c91-4b0d-afbc-e6194cfaecc0'::uuid, 'PA.IV.F.R'),
    ('3a6ddb45-6716-43d5-bdec-29547b5086b0'::uuid, 'PA.IV.M.R'),
    ('4e2542bc-120d-4e1e-8320-81736c5842dc'::uuid, 'PA.IX.A.R'),
    ('dddd4be2-7477-42c0-b009-0319865e2214'::uuid, 'PA.IX.C.R'),
    ('a85d7c03-44c3-495b-b387-2932d2126948'::uuid, 'PA.IX.D.R'),
    ('3f2ad045-52d1-41a1-a88a-d51aad2ab65e'::uuid, 'PA.V.A.R'),
    ('33cd4481-d71f-4e95-ac7a-51407d157c07'::uuid, 'PA.VI.A.R'),
    ('64e18c93-6139-431f-9789-861d32033d7d'::uuid, 'PA.VI.C.R'),
    ('a395051f-2244-422f-b329-1afa1ef03d1c'::uuid, 'PA.VI.D.R'),
    ('af4a3157-6bbb-465f-8bd8-1d9527a16f8a'::uuid, 'PA.VII.C.R'),
    ('e2b15919-55bd-4edb-b8fc-6071480b9832'::uuid, 'PA.VII.D.R'),
    ('88596f6c-34cb-4a99-b8d0-d1761fd726dc'::uuid, 'PA.VIII.E.R'),
    ('e736e4d7-df3b-4678-aee2-062e4040467a'::uuid, 'PA.XI.A.R'),
    ('f90defe7-290e-4dec-ad0d-6555ec20f2a5'::uuid, 'PA.XII.A.R')
),
grouped as (
  select question_id, string_agg(acs_reference, '; ' order by acs_reference) as new_references
  from mapping
  group by question_id
),
merged as (
  select
    a.id,
    string_agg(distinct trim(reference), '; ' order by trim(reference)) as acs_reference
  from public.poa_question_acs_applicability a
  join grouped g on g.question_id = a.question_id
  cross join lateral regexp_split_to_table(
    a.acs_reference || '; ' || g.new_references,
    '[,;\\n]+'
  ) reference
  where a.certificate_name = 'Private Pilot'
  group by a.id
)
update public.poa_question_acs_applicability a
set acs_reference = m.acs_reference
from merged m
where a.id = m.id;
