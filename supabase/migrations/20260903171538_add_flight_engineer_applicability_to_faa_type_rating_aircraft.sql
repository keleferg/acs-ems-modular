alter table public.faa_type_rating_aircraft
  add column if not exists flight_engineer_applicable boolean not null default false,
  add column if not exists flight_engineer_class text null,
  add column if not exists flight_engineer_basis text null;

alter table public.faa_type_rating_aircraft
  drop constraint if exists faa_type_rating_aircraft_flight_engineer_class_check;

alter table public.faa_type_rating_aircraft
  add constraint faa_type_rating_aircraft_flight_engineer_class_check
  check (flight_engineer_class is null or flight_engineer_class in ('reciprocating','turbopropeller','turbojet'));

update public.faa_type_rating_aircraft
set flight_engineer_applicable = false,
    flight_engineer_class = null,
    flight_engineer_basis = null;

update public.faa_type_rating_aircraft
set flight_engineer_applicable = true,
    flight_engineer_class = 'reciprocating',
    flight_engineer_basis = '14 CFR 91.529(a)(1): pre-1964 type certification and maximum certificated takeoff weight over 80,000 lb'
where id in (
  '02561ef8-90ae-47e6-b36b-6d8bdd4eec91',
  'e610d741-88e5-43fd-ac1a-761214e1d120',
  '76dabb0d-9ef1-4041-99da-461ecafb603b',
  'f40a8b50-6b12-4050-abe9-6f340572ccf8'
);

update public.faa_type_rating_aircraft
set flight_engineer_applicable = true,
    flight_engineer_class = 'turbopropeller',
    flight_engineer_basis = case
      when id in ('732f4f83-19d9-4d68-86af-fb56b40e0143','6bb282f4-55d5-4627-af8a-bcb5725f64f9','13bb332d-1c9f-489d-951c-72bac7bf8cef','cbef17c9-e48d-4967-a95b-836ef6b37472')
        then '14 CFR 91.529(a)(1): pre-1964 type certification and maximum certificated takeoff weight over 80,000 lb'
      else '14 CFR 91.529(a)(2): later type certification requiring a flight engineer'
    end
where id in (
  '732f4f83-19d9-4d68-86af-fb56b40e0143',
  '6bb282f4-55d5-4627-af8a-bcb5725f64f9',
  '13bb332d-1c9f-489d-951c-72bac7bf8cef',
  'cbef17c9-e48d-4967-a95b-836ef6b37472',
  '4a8876a8-c1c1-4eeb-ba71-df7bc2a170ac',
  'bf4d6a13-41c0-4be3-a8f5-05cde7dbfb5c'
);

update public.faa_type_rating_aircraft
set flight_engineer_applicable = true,
    flight_engineer_class = 'turbojet',
    flight_engineer_basis = case
      when id in ('3ace98e2-b59e-4bdd-a81c-87dc935b64e7','73c5d51c-ac77-44b7-9457-4fc33711b166','9f8b97ca-0483-434e-8743-e151027c56bc','6d8b7e9b-2765-4b99-9ac8-84b5254a3e0f','4b9c9bf6-6d92-448e-ab2d-d7f1d6fdb320','3e8c3a9e-ee4d-472a-a0b7-9ba935d61eb4')
        then '14 CFR 91.529(a)(1): pre-1964 type certification and maximum certificated takeoff weight over 80,000 lb'
      else '14 CFR 91.529(a)(2): later type certification requiring a flight engineer'
    end
where id in (
  '3ace98e2-b59e-4bdd-a81c-87dc935b64e7',
  '73c5d51c-ac77-44b7-9457-4fc33711b166',
  '92ea637f-ba1a-43e0-91d6-9be13c3a5bc1',
  '9f8b97ca-0483-434e-8743-e151027c56bc',
  '8c99016d-1974-4901-b88e-78582ef4b087',
  'fdb9e7c6-1ebf-486b-b760-185207de043a',
  '6d8b7e9b-2765-4b99-9ac8-84b5254a3e0f',
  '4b9c9bf6-6d92-448e-ab2d-d7f1d6fdb320',
  'a461abb8-d281-4f6c-ba95-e27e8df3f168',
  'a52369c6-dda7-4ccc-9940-28521452ab0a',
  '3e8c3a9e-ee4d-472a-a0b7-9ba935d61eb4',
  '12c61ec6-a84b-4dc3-9a63-34b3db49094b'
);;
