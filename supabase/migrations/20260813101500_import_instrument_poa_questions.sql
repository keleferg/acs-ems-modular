-- DPE EMT
-- Import 52 Instrument Rating — Airplane oral questions into the existing POA Question Library.
-- Source workbook: ACS Oral Exam Question Bank - Instrument Rating Added.xlsx
-- Generated 2026-08-13
--
-- This migration is idempotent:
--   * existing matching questions are not duplicated
--   * missing practical-test mappings are added
--
-- Target library:
--   public.poa_questions
--   public.poa_question_practical_test_types

begin;

do $import$
declare
  v_examiner_id uuid;
  v_test_type_id uuid;
  v_inserted integer := 0;
  v_mapped integer := 0;
begin
  select ur.profile_id
    into v_examiner_id
  from public.user_roles ur
  where ur.role = 'examiner'
  limit 1;

  if v_examiner_id is null then
    raise exception 'Instrument question import stopped: no examiner role was found in public.user_roles.';
  end if;

  select ptt.id
    into v_test_type_id
  from public.practical_test_types ptt
  where ptt.certificate_code = 'INSTRUMENT'
    and ptt.issuance_code = 'ORIGINAL'
    and ptt.category_code = 'AIRPLANE'
    and ptt.rating_code = 'INSTRUMENT_AIRPLANE'
  limit 1;

  if v_test_type_id is null then
    raise exception 'Instrument question import stopped: Instrument Rating — Airplane practical test type was not found.';
  end if;

  create temporary table _instrument_poa_import (
    source_question_id text primary key,
    acs_reference text,
    question text not null,
    answer text,
    reference text,
    topic text,
    task_name text
  ) on commit drop;

  insert into _instrument_poa_import (
    source_question_id,
    acs_reference,
    question,
    answer,
    reference,
    topic,
    task_name
  )
  values
    ('IR-ASEL-0001', 'IR.I.A', 'When do you need an IFR rating?', '• Flying by instrument flight rules (IFR flight plan) • Weather less than minimums for VFR • Class A airspace • Under special VFR within Class B, C, D, & E surfaces areas between sunset and sunrise • Flying for hire with passengers on cross country flights greater than 50NM or at night', '14 CFR part 61; AC 68-1; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25', 'I. Preflight Preparation', 'IR.I.A Pilot Qualifications'),
    ('IR-ASEL-0002', 'IR.I.C', '* Added from Exam Guide. What information must the PIC be aware of before flight?', '• NOTAMS • Weather reports & forecasts • Known ATC traffic delays • Runway lengths of airport at intended use • Alternatives available if planned flight cannot be completed • Fuel Available', '14 CFR part 91; AIM; Chart Supplement; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-16; FAA-H-8083-25; IFR Enroute Charts; NOTAMs; IFR Navigation Charts', 'I. Preflight Preparation', 'IR.I.C Cross-Country Flight Planning'),
    ('IR-ASEL-0003', 'IR.I.A', 'Explain Currency', 'Currency is valid for the 6 months following check ride or proficiency check. Within those 6 months, Pilot must have logged 6 instrumented approaches including intercepting/tracking courses using navigation systems, and holding procedures.', '14 CFR part 61; AC 68-1; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25', 'I. Preflight Preparation', 'IR.I.A Pilot Qualifications'),
    ('IR-ASEL-0004', 'IR.I.A', 'What happens when currency expires?', 'If beyond the 6 months, you must go and conduct the 6 instrument approaches with intercepting/tracking course, and holding procedures in an FAA approved sim / training device with a CFII, in an aircraft under the hood with safety pilot of CFII. Finish the remaining activities in a sim or airplane with safety pilot', '14 CFR part 61; AC 68-1; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25', 'I. Preflight Preparation', 'IR.I.A Pilot Qualifications'),
    ('IR-ASEL-0005', 'IR.I.A', 'What happens if you exceed 12 months?', '• Instrument proficiency check- check ride sequence with DE or CFII', '14 CFR part 61; AC 68-1; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25', 'I. Preflight Preparation', 'IR.I.A Pilot Qualifications'),
    ('IR-ASEL-0006', 'IR.I.A', 'What documents must pilots carry?', '• Pilot License with Instrument Rating • Valid Medical • Photo ID', '14 CFR part 61; AC 68-1; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25', 'I. Preflight Preparation', 'IR.I.A Pilot Qualifications'),
    ('IR-ASEL-0007', 'IR.I.A', 'How to log instrument time?', '• Location, name of approach, and name of safety pilot (if applicable)', '14 CFR part 61; AC 68-1; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25', 'I. Preflight Preparation', 'IR.I.A Pilot Qualifications'),
    ('IR-ASEL-0008', 'IR.II.B; IR.II.C', 'What documents must be aboard for IFR?', '• The airplane must be certified for IFR • GPS Airworthiness Certificate and Instruction manual (supplemental AFM) • Current GPS chip and logged • VOR check and logged within 30 days of flight • VFR (ARROW)JILI • Instrument GRABCARD (VFR day and night) & AAV1ATE (tests and inspections for IFR)- page 1-12 oral exam guide- pull up', '14 CFR part 91; AC 90-100; AC 90-105; AC 90-107; AC 91-78; AC 91.21-1; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM; 14 CFR part 91; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM', 'II. Preflight Procedures', 'IR.II.B Aircraft Flight Instruments and Navigation Equipment; IR.II.C Instrument Flight Deck Check'),
    ('IR-ASEL-0009', 'IR.I.C', 'When do you have to file an IFR flight plan and receive an IFR clearance?', '• Whenever you are flying IMC in controlled airspace', '14 CFR part 91; AIM; Chart Supplement; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-16; FAA-H-8083-25; IFR Enroute Charts; NOTAMs; IFR Navigation Charts', 'I. Preflight Preparation', 'IR.I.C Cross-Country Flight Planning'),
    ('IR-ASEL-0010', 'IR.III.A', 'What is a “void if not of by” clearance?', '2 • A clearance provided by ATC at non- towered airports to permit take off IFR from the airport. Failure to become airborne by this time results in an automatically void IFR clearance. The pilot is to request for a new IFR clearance. The pilot has 30 mins from the clearance void time to notify ATC of their intentions if not airborne else search and rescue will initiate. • Clearance void if not off by 14:00. Can’t take off after 14:00. You have 30 mins from then to call and tell them not off the ground. Unless they tell you call us back 14:20. Means you have only 20 mins to call back and say didn’t take off.', '14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16', 'III. Air Traffic Control (ATC) Clearances and Procedures', 'IR.III.A Compliance with Air Traffic Control Clearances'),
    ('IR-ASEL-0011', 'IR.I.C', 'When do I have to file an alternate? (1-2-3 rule)', 'When you have less than 3 SM visibility or less than 2000ft ceiling 1 hour before or 1 hour after the ETA, then an alternate airport is required', '14 CFR part 91; AIM; Chart Supplement; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-16; FAA-H-8083-25; IFR Enroute Charts; NOTAMs; IFR Navigation Charts', 'I. Preflight Preparation', 'IR.I.C Cross-Country Flight Planning'),
    ('IR-ASEL-0012', 'IR.I.C', 'What are the standard alternate airport minimum requirements to use published approach procedures?', '• Precision Approach: 600ft/2SM vis • Non-Precision Approach: 800ft/2SM vis • To follow these standard requirements unless specific airport minima specified in the approach plate', '14 CFR part 91; AIM; Chart Supplement; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-16; FAA-H-8083-25; IFR Enroute Charts; NOTAMs; IFR Navigation Charts', 'I. Preflight Preparation', 'IR.I.C Cross-Country Flight Planning'),
    ('IR-ASEL-0013', 'IR.I.C', 'Can I assign a VFR airport (no Instrument Approach Procedures) as an alternate?', '• Yes, if you are able to leave the enroute structure and descend to the airport in VMC.', '14 CFR part 91; AIM; Chart Supplement; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-16; FAA-H-8083-25; IFR Enroute Charts; NOTAMs; IFR Navigation Charts', 'I. Preflight Preparation', 'IR.I.C Cross-Country Flight Planning'),
    ('IR-ASEL-0014', 'IR.I.C', 'What are the fuel requirements for an IFR flight?', '• To Final Destination: Fuel to your final destination plus 45 minutes reserve at normal cruising speed • If Alternate airport is required: Fuel to your final destination plus to your alternate plus 45 minutes reserve at normal cruising speed', '14 CFR part 91; AIM; Chart Supplement; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-16; FAA-H-8083-25; IFR Enroute Charts; NOTAMs; IFR Navigation Charts', 'I. Preflight Preparation', 'IR.I.C Cross-Country Flight Planning'),
    ('IR-ASEL-0015', 'IR.II.A', 'Can you as PIC of an IFR flight allow portable electronic devices to be used by passengers?', '• During critical phases of flight (Take-off and landing) please request passengers to stow portable electronic devices that transmit or receive RF signals.', '14 CFR part 91; AC 91-74; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM', 'II. Preflight Procedures', 'IR.II.A Aircraft Systems Related to Instrument Flight Rules (IFR) Operations'),
    ('IR-ASEL-0016', 'IR.I.C', 'What are the takeoff minimums for IFR flight?', '• Part 91: Unrestricted – This is our category • Part 135 & 121 : Use Obstacle departure procedure and interpret standard minimums i. Dependent on number of engines 1. 1-2 Engines require 1 SM vis 2. 3+ Engines require ½ SM vis 3. Airline Ops Specs generally ¼ Mile', '14 CFR part 91; AIM; Chart Supplement; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-16; FAA-H-8083-25; IFR Enroute Charts; NOTAMs; IFR Navigation Charts', 'I. Preflight Preparation', 'IR.I.C Cross-Country Flight Planning'),
    ('IR-ASEL-0017', 'IR.I.C', 'After filing an IFR flight plan, can you take off VFR, fly controlled airspace and radio for your IFR clearance?', '• Yes, you can request it in the air but you should do so and receive it before entering IMC. As long as you stay VFR.', '14 CFR part 91; AIM; Chart Supplement; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-16; FAA-H-8083-25; IFR Enroute Charts; NOTAMs; IFR Navigation Charts', 'I. Preflight Preparation', 'IR.I.C Cross-Country Flight Planning'),
    ('IR-ASEL-0018', 'IR.V.B', 'Define the following terms', '• MEA- Minimum En-route Altitude- provides reception for NavAids and obstacle clearance • MOCA- Minimum Obstacle Clearance Altitude- provides clearance from obstacles/terrain plus 2000’ mountainous and 1000’ non-mountainous regions 3 • MORCA- Minimum Off-Route Clearance Altitude- provides obstacle clearance when travelling off pre-set routes (i.e. victor airways). Large letters in brown in IFR sectional That 107 shown on IFR enroute charts is MORCA. Its applicable for the quadrangle in which the text is enclosed. • MCA- Minimum Crossing Altitude- the altitude required to pass from one victor airway to another via a transition point (VOR) when Lost Comm • MRA- Minimum Reception Altitude- guarantees reception for NavAids and Comm at or above this altitude • MAA- Maximum allowable altitude- this is to help you from entering an altitude that 2 VORs operating on the same frequency could interfere and misguide you • MVA- Minimum Vectoring Altitude- this is known to ATC, they factor this in when providing radar vectors', '14 CFR part 91; AIM; Chart Supplement; FAA-H-8083-15; FAA-H-8083-16; IFR Enroute Charts; Terminal Procedures Publications', 'V. Navigation Systems', 'IR.V.B Departure, En Route, and Arrival Operations'),
    ('IR-ASEL-0019', 'IR.VI.A; IR.VI.B; IR.VI.D', 'How do you know what category your aircraft is in for IFR approaches?', '• Check the maneuvering tables in the 2nd page of the approach plate book. the category is based on the aircrafts speed (1.3Vso). With the known category you can check the table on the approach plate itself for the DH and visibility', '14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16; Terminal Procedures Publications', 'VI. Instrument Approach Procedures', 'IR.VI.A Non-precision Approach; IR.VI.B Precision Approach; IR.VI.D Circling Approach'),
    ('IR-ASEL-0020', 'IR.II.B; IR.VI.B', 'Name the components of an ILS system', '• Beacons • Localizer • Glideslope • Approach lighting of some kind (RAIL)', '14 CFR part 91; AC 90-100; AC 90-105; AC 90-107; AC 91-78; AC 91.21-1; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM; 14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16; Terminal Procedures Publications', 'II. Preflight Procedures; VI. Instrument Approach Procedures', 'IR.II.B Aircraft Flight Instruments and Navigation Equipment; IR.VI.B Precision Approach'),
    ('IR-ASEL-0021', 'IR.II.B; IR.VI.B', 'What color are the marker beacon lights?', '• Blue finish', '14 CFR part 91; AC 90-100; AC 90-105; AC 90-107; AC 91-78; AC 91.21-1; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM; 14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16; Terminal Procedures Publications', 'II. Preflight Procedures; VI. Instrument Approach Procedures', 'IR.II.B Aircraft Flight Instruments and Navigation Equipment; IR.VI.B Precision Approach'),
    ('IR-ASEL-0022', 'IR.II.B; IR.VI.B', 'What is the difference between a localizer signal and a regular VOR signal?', '• VOR is omnidirectional. LOC has one direction. 10 degrees on either side for VOR (5 degrees either side), only 5 degrees total for LOC (2.5 either side). LOC is 4 times more sensitive so it keeps the airplane in a more tighter space.', '14 CFR part 91; AC 90-100; AC 90-105; AC 90-107; AC 91-78; AC 91.21-1; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM; 14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16; Terminal Procedures Publications', 'II. Preflight Procedures; VI. Instrument Approach Procedures', 'IR.II.B Aircraft Flight Instruments and Navigation Equipment; IR.VI.B Precision Approach'),
    ('IR-ASEL-0023', 'IR.II.B; IR.VI.B', 'What is compass locator outer/ middle marker?', '• LOM Compass locator outer marker blue dash tones. It has an NDB its collocated so you can fly to it (the NDB) (KRNT) middle 2 code hear. • or LMM locator middle marker (KRNT) last 2 code hear. Amber. • Inner marker is white.', '14 CFR part 91; AC 90-100; AC 90-105; AC 90-107; AC 91-78; AC 91.21-1; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM; 14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16; Terminal Procedures Publications', 'II. Preflight Procedures; VI. Instrument Approach Procedures', 'IR.II.B Aircraft Flight Instruments and Navigation Equipment; IR.VI.B Precision Approach'),
    ('IR-ASEL-0024', 'IR.II.B; IR.VI.B', 'What can you substitute for an outer marker?', '• You can use NDB beacon or request a Precision Approach Radar (PAR) • NDB approach plate, if it says ‘or GPS’ then you can fly GPS', '14 CFR part 91; AC 90-100; AC 90-105; AC 90-107; AC 91-78; AC 91.21-1; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM; 14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16; Terminal Procedures Publications', 'II. Preflight Procedures; VI. Instrument Approach Procedures', 'IR.II.B Aircraft Flight Instruments and Navigation Equipment; IR.VI.B Precision Approach'),
    ('IR-ASEL-0025', 'IR.II.B; IR.VI.B', 'What can you substitute for a middle marker?', '• Any legitimate nav aid. Cross radial from a VOR, GPS fix, …. Anything published to get an absolute fix.', '14 CFR part 91; AC 90-100; AC 90-105; AC 90-107; AC 91-78; AC 91.21-1; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM; 14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16; Terminal Procedures Publications', 'II. Preflight Procedures; VI. Instrument Approach Procedures', 'IR.II.B Aircraft Flight Instruments and Navigation Equipment; IR.VI.B Precision Approach'),
    ('IR-ASEL-0026', 'IR.I.A', 'When can you log instrument flight time?', '• A person may log instrument time only for that flight time when the person operates the aircraft solely (sole manipulator) by reference to instruments under actual or simulated instrument flight conditions 4 • Keep in mind when flying between cloud layers (not in cloud!) is not considered IFR – VFR time- Spence’s comment', '14 CFR part 61; AC 68-1; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25', 'I. Preflight Preparation', 'IR.I.A Pilot Qualifications'),
    ('IR-ASEL-0027', 'IR.I.A', 'What are the conditions under which a pilot may conduct and log IAPs?', '• Actual instrument flight conditions in an aircraft • Simulated instrument flight conditions using a view limiting device flown in an aircraft with a safety pilot. i. Safety pilot is one with a minimum private pilot with the appropriate category and class ratings required to operate that aircraft, valid appropriate medical to act as flight crew member, and if flight required to be done on IFR flight plan, they must have valid and current instrument rating • Simulated instrument flight conditions conduced in any FAA approved flight simulator/ full flight simulator (FFS), flight training device (FTD), aviation training device (ATD) with a CFII • A combination of A) to C)', '14 CFR part 61; AC 68-1; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25', 'I. Preflight Preparation', 'IR.I.A Pilot Qualifications'),
    ('IR-ASEL-0028', 'IR.III.A', 'Explain VFR on top', '• You want out of clouds due to turbulence- relief for yourself and/or passengers due to discomfort or passenger motion sickness • It’s still an IFR clearance so stay on your routing. But you can change altitudes- advisory to notify ATC • VFR cruising magnetic rules for altitude rules kick in! odd+500/even+500 • Clouds and Visibility Requirements i. >10,000 ft. 5SM, 1 mile from clouds, 1000 ft. above or below ii. <10,000 ft. 3SM 2000 ft. from clouds, 1000 ft. above, 500 ft. below iii. Cannot exceed 18,000 ft. – CLASS A, IFR ONLY! iv. Cannot descend below MEA • Flying VFR on the top you have towering cumulus in front of you what should you do? i. Request from ATC a deviation on route around it.', '14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16', 'III. Air Traffic Control (ATC) Clearances and Procedures', 'IR.III.A Compliance with Air Traffic Control Clearances'),
    ('IR-ASEL-0029', 'IR.III.A', 'Explain Cruise Clearance', '• Assigned altitude to MEA is your space. If you descend below it and report it, you need permission to climb back up. • This clearance also ALWAYS clears you for the approach as well.', '14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16', 'III. Air Traffic Control (ATC) Clearances and Procedures', 'IR.III.A Compliance with Air Traffic Control Clearances'),
    ('IR-ASEL-0030', 'IR.VII.A', 'Explain lost communication altitude requirements', '• See #31', '14 CFR §91.185; AIM; FAA-H-8083-15; FAA-H-8083-16', 'VII. Emergency Operations', 'IR.VII.A Loss of Communications'),
    ('IR-ASEL-0031', 'IR.VII.A', 'What do you do when you go lost communication?', '• Check my radios + CBs? Headset jack? Co-pilot head set jack? Push to talk button? • Squawk 7600 • Follow logic i. If VFR, stay VFR and go land. After landing call ATC on ground and state your arrival (Tell them you are ok) ii. If IFR, follow rules for IMC 1. Routing a. Last assigned b. Last told to expect 5 c. As Filed (flight plan) 2. Altitude (whichever is highest) a. Last assigned b. Last told to expect c. MEA, but must also comply with MRA and MCA. Which ever is the highest, fly it. 3. Time a. If you haven’t got a clearance before lost COMM, go shoot approach with full procedure turns if there is no clearance limit b. If you were told to proceed to some point (i.e. PAE VOR) then you hold until ETA. You can hold on the radial you arrived on if not marked on the approach plate for that given point. If no ETA, just go shoot it. c. If you arrive late, just go shoot approach', '14 CFR §91.185; AIM; FAA-H-8083-15; FAA-H-8083-16', 'VII. Emergency Operations', 'IR.VII.A Loss of Communications'),
    ('IR-ASEL-0032', 'IR.VI.D; IR.VI.E', 'What is the difference between a straight in approach and a straight in landing?', '• Straight in approach does not require PT • Straight in Landing i. if the centerline of runway and approach heading are within 30 degrees of each other, then you can do a straight in landing (lower DH minimum) ii. If you are greater than 30 degrees for the approach, then you must circle and land. Higher DH (circling minimum) iii. This could also mean you have a really fast step down- see name of approach (VOR OLM-A) look for the letter (A,B,C) indication', '14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16; Terminal Procedures Publications; 14 CFR §91.175; AIM; FAA-H-8083-15; FAA-H-8083-16; Terminal Procedures Publications', 'VI. Instrument Approach Procedures', 'IR.VI.D Circling Approach; IR.VI.E Landing from an Instrument Approach'),
    ('IR-ASEL-0033', 'IR.VI.A; IR.VI.B', 'When is a procedure turn not required?', '• It is not required when you are cleared straight in approach • Transition route says NO PT • Holding pattern given instead of PT (holding in lieu of PT)', '14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16; Terminal Procedures Publications', 'VI. Instrument Approach Procedures', 'IR.VI.A Non-precision Approach; IR.VI.B Precision Approach'),
    ('IR-ASEL-0034', 'IR.VI.E', 'When can you descend below MDA or DH?', '• Decision Height (DH) is for precision approach GPS(LPV) or ILS – 200 ft AAE; usually lower than MDA • Minimum Decision Altitude (MDA) is for non-precision approach (i.e. VOR) 1. Visibility on approach procedure – 600 (1/2) 2. Normal maneuvers 3. Runway environment in-sight -Other lights on runway- runway lights, end of runway lights, wind sock, etc. Rabbit lighting you can see okay, then come down but 100’ + TDZE. Not lower until other requirements can be met. 4. VDP- Visual Descent Point (V) on the approach plate i. PAPI/VASI out of service then you can see VDP, stay above MDS/DH until you get passed the VDP', '14 CFR §91.175; AIM; FAA-H-8083-15; FAA-H-8083-16; Terminal Procedures Publications', 'VI. Instrument Approach Procedures', 'IR.VI.E Landing from an Instrument Approach'),
    ('IR-ASEL-0035', 'IR.II.B; IR.V.A', 'How can you check the VOR Receiver accuracy?', '• VOT page 283 in chart supplements only 4 in WA i. Insert procedure 6 • Air and Ground FAA approved page 282 for WA i. Ground +/- 4° ii. Air +/- 6° • Dual Receiver Check i. Using 2 VORs you can dial in the same VOR frequency and check to see if the difference between both of them is within 4° • Single VOR check i. If you can’t do a, b, or c, then do d especially if say you are 100 miles away from nearest VOR or VOT. ii. Take off VFR and go to nearest victor airways iii. Using VFR sections, note the blue victor airway and find a landmark, get over the landmark and check your VOR based on the radial. Its airborne check so apply +/- 6° tolerance band', '14 CFR part 91; AC 90-100; AC 90-105; AC 90-107; AC 91-78; AC 91.21-1; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM; 14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16; IFR Enroute Charts; POH/AFM', 'II. Preflight Procedures; V. Navigation Systems', 'IR.II.B Aircraft Flight Instruments and Navigation Equipment; IR.V.A Intercepting and Tracking Navigational Systems and DME Arcs'),
    ('IR-ASEL-0036', 'IR.I.B', 'How far from a Severe TS must you keep away?', '• 20NM', '14 CFR part 91; AC 91-92; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-25; FAA-H-8083-28', 'I. Preflight Preparation', 'IR.I.B Weather Information'),
    ('IR-ASEL-0038', 'IR.II.A', 'Aircraft performance: Advantages and Disadvantages of FWD and AFT CG', '• Aft CG less stable, better fuel economy • FWD CG more stable, less desirable fuel economy', '14 CFR part 91; AC 91-74; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM', 'II. Preflight Procedures', 'IR.II.A Aircraft Systems Related to Instrument Flight Rules (IFR) Operations'),
    ('IR-ASEL-0039', 'IR.I.C', 'NOTAMs- types', '• L- local NOTAMs- “like to know” unlighted crane, don’t go down Taxiway B with wing span greater than 80ft • D-Distance NOTAMs- VFR is out of service along route. • FDC- regulatory in natures including changes to approach plate requirements such as DH change or a new transition. Must comply with', '14 CFR part 91; AIM; Chart Supplement; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-16; FAA-H-8083-25; IFR Enroute Charts; NOTAMs; IFR Navigation Charts', 'I. Preflight Preparation', 'IR.I.C Cross-Country Flight Planning'),
    ('IR-ASEL-0040', 'IR.I.B', 'Why is frost dangerous?', '• Causes early airflow separation and loss in lift.', '14 CFR part 91; AC 91-92; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-25; FAA-H-8083-28', 'I. Preflight Preparation', 'IR.I.B Weather Information'),
    ('IR-ASEL-0041', 'IR.I.B; IR.II.A', 'Scenario based – Icing. What would you do if you have RIME ice building.', '• keep you speed up • no flaps • see if you can descend to an altitude below FL – advise ATC of situation • Remember for this aircraft- flight is prohibited into known icing conditions check AFM.', '14 CFR part 91; AC 91-92; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-25; FAA-H-8083-28; 14 CFR part 91; AC 91-74; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM', 'I. Preflight Preparation; II. Preflight Procedures', 'IR.I.B Weather Information; IR.II.A Aircraft Systems Related to Instrument Flight Rules (IFR) Operations'),
    ('IR-ASEL-0042', 'IR.I.B', 'Stratiform vs Cumuliform clouds', '• Big puffy vertical vs more fog like cloud. • Cumuliform is unstable so its got more turbulence in it', '14 CFR part 91; AC 91-92; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-25; FAA-H-8083-28', 'I. Preflight Preparation', 'IR.I.B Weather Information'),
    ('IR-ASEL-0043', 'IR.II.B; IR.V.A', 'Service Volumes (off route fight)- page 27 Chart Supplements', '• Terminal (T) from 1000’ to 12,000’ service guaranteed for 25 NM from VOR • High (H) from 1000’ to 18,000’ service guaranteed for 40 NM from VOR • Low (L) from 1000’ to 14,500’ and 14,500’ to 18,000’ service guaranteed for 40 NM and 100 NM from VOR respectively • Chart supplements shows (T) when its only Terminal. H assumes also L & T. L assumes also T.', '14 CFR part 91; AC 90-100; AC 90-105; AC 90-107; AC 91-78; AC 91.21-1; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM; 14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16; IFR Enroute Charts; POH/AFM', 'II. Preflight Procedures; V. Navigation Systems', 'IR.II.B Aircraft Flight Instruments and Navigation Equipment; IR.V.A Intercepting and Tracking Navigational Systems and DME Arcs'),
    ('IR-ASEL-0044', 'IR.VI.D; IR.VI.E', 'Circling Protected Area', '1.3 Miles Cat A; 1.5 Miles Cat B; Up to about 7000’, about that it extends but don’t worry about that.', '14 CFR part 91; AIM; FAA-H-8083-15; FAA-H-8083-16; Terminal Procedures Publications; 14 CFR §91.175; AIM; FAA-H-8083-15; FAA-H-8083-16; Terminal Procedures Publications', 'VI. Instrument Approach Procedures', 'IR.VI.D Circling Approach; IR.VI.E Landing from an Instrument Approach'),
    ('IR-ASEL-0045', 'IR.I.B', 'AIRMETS vs SIGMETS', 'AIRMET: For Light A/C+ VFR identifying Light + Mod Icing and turbulence. SIGMET: For all aircrafts identifying significant weather conditions including sand storms, volcano eruptions, etc.', '14 CFR part 91; AC 91-92; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-25; FAA-H-8083-28', 'I. Preflight Preparation', 'IR.I.B Weather Information'),
    ('IR-ASEL-0046', 'IR.II.A', 'Can you permit passengers to use portable electronic devices?', 'Restrict it to anytime but critical phases of flight (take off and landing). High RF outputting devices cannot use at anytime.', '14 CFR part 91; AC 91-74; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM', 'II. Preflight Procedures', 'IR.II.A Aircraft Systems Related to Instrument Flight Rules (IFR) Operations'),
    ('IR-ASEL-0049', 'IR.I.B; IR.II.A', 'Types of icing to worry about:', 'Pitot ice, induction icing (carb aircraft), rime ice, clear ice, mixed ice, restrictions', '14 CFR part 91; AC 91-92; AIM; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-25; FAA-H-8083-28; 14 CFR part 91; AC 91-74; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM', 'I. Preflight Preparation; II. Preflight Procedures', 'IR.I.B Weather Information; IR.II.A Aircraft Systems Related to Instrument Flight Rules (IFR) Operations'),
    ('IR-ASEL-0051', 'IR.II.A', 'Know your airspeeds', 'Vr Rotation Speed 65 mph (55 kts); Vx Best Angle of Climb 74 mph (64 kts); Vy Best Rate of Climb 85 mph (74 kts); VFE Flaps extension speed 115 mph (100 kts) or look for white arc; VA maneuvering speed 129 mph @ max gross weight; Vno maximum structural cruising speed 137 mph (119 kt); Vne never exceed speed 168 mph (146 kts); VG Best Glide Speed 83 mph (72 kts); Vs0 55 mph (47 kts); Vs1 64 mph (55 kts)', '14 CFR part 91; AC 91-74; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM', 'II. Preflight Procedures', 'IR.II.A Aircraft Systems Related to Instrument Flight Rules (IFR) Operations'),
    ('IR-ASEL-0052', 'IR.II.A', 'Max Crosswind', '17 kts', '14 CFR part 91; AC 91-74; FAA-H-8083-2; FAA-H-8083-3; FAA-H-8083-15; FAA-H-8083-25; POH/AFM', 'II. Preflight Procedures', 'IR.II.A Aircraft Systems Related to Instrument Flight Rules (IFR) Operations');

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
    is_active,
    created_by_profile_id
  )
  select
    v_examiner_id,
    s.acs_reference,
    s.question,
    s.answer,
    s.reference,
    s.topic,
    s.task_name,
    'knowledge',
    'standard',
    'imported',
    'ACS Oral Exam Question Bank - Instrument Rating Added.xlsx',
    true,
    v_examiner_id
  from _instrument_poa_import s
  where not exists (
    select 1
    from public.poa_questions q
    where q.examiner_profile_id = v_examiner_id
      and lower(trim(q.question)) = lower(trim(s.question))
      and coalesce(lower(trim(q.acs_reference)), '') =
          coalesce(lower(trim(s.acs_reference)), '')
  );

  get diagnostics v_inserted = row_count;

  insert into public.poa_question_practical_test_types (
    question_id,
    practical_test_type_id
  )
  select
    q.id,
    v_test_type_id
  from _instrument_poa_import s
  join public.poa_questions q
    on q.examiner_profile_id = v_examiner_id
   and lower(trim(q.question)) = lower(trim(s.question))
   and coalesce(lower(trim(q.acs_reference)), '') =
       coalesce(lower(trim(s.acs_reference)), '')
  where not exists (
    select 1
    from public.poa_question_practical_test_types m
    where m.question_id = q.id
      and m.practical_test_type_id = v_test_type_id
  );

  get diagnostics v_mapped = row_count;

  raise notice 'Instrument POA import complete: % valid questions inserted; % mappings added.', v_inserted, v_mapped;
end
$import$;

commit;

-- Verification
select
  count(*) as instrument_airplane_question_count
from public.poa_questions q
join public.poa_question_practical_test_types m
  on m.question_id = q.id
join public.practical_test_types ptt
  on ptt.id = m.practical_test_type_id
where ptt.certificate_code = 'INSTRUMENT'
  and ptt.issuance_code = 'ORIGINAL'
  and ptt.category_code = 'AIRPLANE'
  and ptt.rating_code = 'INSTRUMENT_AIRPLANE'
  and q.is_active = true;

select
  q.acs_reference,
  count(*) as question_count
from public.poa_questions q
join public.poa_question_practical_test_types m
  on m.question_id = q.id
join public.practical_test_types ptt
  on ptt.id = m.practical_test_type_id
where ptt.certificate_code = 'INSTRUMENT'
  and ptt.issuance_code = 'ORIGINAL'
  and ptt.category_code = 'AIRPLANE'
  and ptt.rating_code = 'INSTRUMENT_AIRPLANE'
  and q.is_active = true
group by q.acs_reference
order by q.acs_reference;
