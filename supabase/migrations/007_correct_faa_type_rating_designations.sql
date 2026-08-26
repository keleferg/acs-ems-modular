-- DPE EMT Web App
-- Migration 007
-- Replace the earlier split FAA type-rating library with
-- corrected Current Type Rating Designation options.
-- Corrected active options: 213

begin;

create temporary table corrected_faa_type_ratings (
  designation text primary key,
  sort_order integer not null,
  source_document text not null,
  source_effective_date date,
  source_url text
);

insert into corrected_faa_type_ratings (
  designation,
  sort_order,
  source_document,
  source_effective_date,
  source_url
)
values
  ('A-300', 10, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('A-310', 20, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('A-320', 30, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('A-330', 40, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('A-340', 50, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('A-350', 60, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('A-380', 70, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('AB-139; AW-139', 80, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('AD-4N', 90, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('AS332E', 100, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('ATR-42; ATR-72', 110, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('AVR-146; BAE-146', 120, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('AW-650', 130, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('AW189', 140, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('B-17', 150, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('B-247', 160, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('B-307', 170, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('B-314', 180, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('B-377', 190, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('B-707; B-720', 200, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('B-727', 210, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('B-737', 220, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('B-747', 230, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('B-747-4', 240, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('B-757; B-767', 250, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('B-777', 260, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('B-787', 270, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BA-111', 280, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BA-3100', 290, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BA-4100', 300, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BAE-125', 310, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BAE-ATP', 320, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BBD-700', 330, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BD500', 340, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BE-1900', 350, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BE-200', 360, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BE-2000; BE-2000S', 370, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BE-300', 380, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BE-400; MU-300', 390, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BG-905', 400, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BH-214', 410, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BH-214ST', 420, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BR-305', 430, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BU-2000', 440, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BV-107', 450, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BV-234', 460, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('BV-44', 470, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('C-295', 480, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('C-82A', 490, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CA-212', 500, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CE-408', 510, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CE-500', 520, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CE-510', 530, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CE-510S', 540, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CE-525', 550, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CE-525S', 560, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CE-560XL', 570, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CE-650', 580, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CE-680', 590, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CE-700', 600, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CE-750', 610, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CL-215', 620, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CL-30', 630, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CL-415', 640, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CL-44', 650, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CL-600', 660, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CL-604', 670, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CL-65', 680, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CL-66', 690, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CONCRD', 700, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CV-240; CV-340; CV-440', 710, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CV-600; CV-640', 720, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CV-880; CV-990', 730, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CV-A340; CV-A440', 740, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CV-LB30', 750, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CV-N1; CV-N2', 760, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CV-P4Y', 770, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CV-PB2Y', 780, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CV-PBY5', 790, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('CW-46', 800, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('D-328JET', 810, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DA-10', 820, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DA-20', 830, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DA-200', 840, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DA-2000', 850, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DA-2EASY', 860, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DA-50', 870, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DA-6X', 880, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DA-7X', 890, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DA-EASY', 900, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DC-10', 910, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DC-2', 920, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DC-3', 930, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DC-3S', 940, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DC-3TP', 950, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DC-4', 960, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DC-6; DC-7', 970, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DC-8', 980, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DC-9', 990, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DC-A20', 1000, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DC-A24', 1010, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DC-B18', 1020, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DC-B23', 1030, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DC-B26', 1040, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DHC-4', 1050, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DHC-6', 1060, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DHC-6HG', 1070, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DHC-7', 1080, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DHC-8', 1090, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DO-228', 1100, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('DO-328', 1110, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('EA-500', 1120, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('EA-500S', 1130, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('EC225LP', 1140, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('EMB-110', 1150, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('EMB-120', 1160, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('EMB-145', 1170, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('EMB-500', 1180, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('EMB-505', 1190, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('EMB-550', 1200, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('ERJ-170; ERJ-190', 1210, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('F-27', 1220, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('FA-119C', 1230, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('FA-C123', 1240, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('FK-100', 1250, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('FK-28', 1260, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('FO-5', 1270, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('G-100; IA-1125', 1280, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('G-111', 1290, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('G-1159', 1300, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('G-200', 1310, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('G-73', 1320, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('G-73T', 1330, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('G-IV', 1340, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('G-S2', 1350, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('G-TBM', 1360, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('G-V', 1370, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('G150', 1380, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('G280', 1390, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('G7500', 1400, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('GVI', 1410, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('GVII', 1420, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('GVIII', 1430, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('H160-B', 1440, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('H46E', 1450, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('HA-420', 1460, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('HF-320', 1470, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('HP-300', 1480, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('HS-106', 1490, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('HS-114', 1500, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('HS-125', 1510, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('HS-748', 1520, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('HW-500', 1530, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('IA-101', 1540, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('IA-JET', 1550, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('L-1011', 1560, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('L-1049', 1570, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('L-1329', 1580, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('L-14', 1590, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('L-18', 1600, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('L-188', 1610, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('L-300', 1620, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('L-382', 1630, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('L-382J', 1640, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('L-420', 1650, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('L-B34', 1660, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('L-P2V', 1670, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('L-P38', 1680, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('LR-45', 1690, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('LR-60', 1700, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('LR-JET', 1710, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('M-202; M-404', 1720, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('M-B26', 1730, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('M-PBM5', 1740, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('MD-11', 1750, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('MS-760', 1760, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('N-265', 1770, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('N-B25', 1780, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('ND-262', 1790, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('NH-P61', 1800, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('P-808', 1810, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('PA-42R', 1820, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('PC-24', 1830, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('PZL-M28', 1840, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('RA-390', 1850, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('RA-390S', 1860, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('RA-4000', 1870, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('S-210', 1880, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('S-321', 1890, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('S-330', 1900, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('S-70', 1910, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('S-70M', 1920, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SA-2000', 1930, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SA-227', 1940, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SD-3', 1950, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SF-340', 1960, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SF-50', 1970, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SJ30', 1980, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SJ30S', 1990, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SK-43', 2000, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SK-44', 2010, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SK-56', 2020, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SK-58', 2030, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SK-61', 2040, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SK-64', 2050, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SK-65', 2060, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SK-92', 2070, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('SN-601', 2080, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('T-33', 2090, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('VC-700; VC-800', 2100, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('Y-12F', 2110, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('YC-122', 2120, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf'),
  ('YS-11', 2130, 'FAA Order 8900.1, Figure 5-88', '2026-07-22'::date, 'https://registry.faa.gov/TypeRatings/Type_Rating_Table.pdf');

insert into public.faa_type_rating_designations (
  designation,
  is_active,
  sort_order,
  source_document,
  source_effective_date,
  source_url
)
select
  designation,
  true,
  sort_order,
  source_document,
  source_effective_date,
  source_url
from corrected_faa_type_ratings
on conflict (designation)
do update set
  is_active = true,
  sort_order = excluded.sort_order,
  source_document = excluded.source_document,
  source_effective_date =
    excluded.source_effective_date,
  source_url = excluded.source_url,
  updated_at = now();

-- Keep obsolete rows for referential history, but prevent
-- them from appearing in the examiner selection library.
update public.faa_type_rating_designations d
set
  is_active = false,
  updated_at = now()
where d.source_document =
      'FAA Order 8900.1, Figure 5-88'
  and not exists (
    select 1
    from corrected_faa_type_ratings c
    where c.designation = d.designation
  );

-- Disable any authorization attached to an obsolete split
-- designation so it is not counted as an active selection.
update public.examiner_type_rating_authorizations a
set
  is_active = false,
  updated_at = now()
where a.is_active = true
  and exists (
    select 1
    from public.faa_type_rating_designations d
    where d.id = a.type_rating_designation_id
      and d.is_active = false
  );

drop table if exists corrected_faa_type_ratings;

commit;

select
  count(*) filter (
    where is_active = true
  ) as active_corrected_options,
  count(*) filter (
    where is_active = false
  ) as inactive_historical_options
from public.faa_type_rating_designations;

select designation
from public.faa_type_rating_designations
where is_active = true
  and designation in (
    'B-707; B-720',
    'B-757; B-767',
    'BE-2000; BE-2000S',
    'BE-400; MU-300',
    'CV-240; CV-340; CV-440'
  )
order by designation;
