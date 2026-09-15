alter table public.practical_test_requests
  drop constraint if exists practical_test_requests_issuance_type_check;

alter table public.practical_test_requests
  add constraint practical_test_requests_issuance_type_check
  check (
    issuance_type = any (
      array[
        'original'::text,
        'additional_rating'::text,
        'reissuance'::text,
        'other'::text,
        'proficiency_check'::text
      ]
    )
  );;
