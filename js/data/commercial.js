function T(id, fc, title, code, scenario, k, r, s, ratings) {
  const obj = { id, filterCode: fc, title, code, scenario, knowledge: k, risk: r, skill: s };
  if (ratings) obj.ratings = ratings;
  return obj;
}

function K(code, text) { return { code, text }; }
function R(code, text) { return { code, text }; }
function S(code, text) { return { code, text }; }

export const COMMERCIAL_DATA = [
  {
    id: "I",
    roman: "I",
    title: "Preflight Preparation",
    phase: "ground",
    tasks: [
      T("A", "I_A", "Pilot Qualifications", "CA.I.A",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with airman and medical certificates including privileges, limitations, currency, and operating as pilot-in-command as a commercial pilot.",
        [
          K("CA.I.A.K1", "Certification requirements, recent flight experience, and recordkeeping."),
          K("CA.I.A.K2", "Privileges and limitations."),
          K("CA.I.A.K3", "Medical certificates: class, expiration, privileges, temporary disqualifications."),
          K("CA.I.A.K4", "Documents required to exercise commercial pilot privileges."),
          K("CA.I.A.K5", "Part 68 BasicMed privileges and limitations.")
        ],
        [
          R("CA.I.A.R1", "Proficiency versus currency."),
          R("CA.I.A.R2", "Flying unfamiliar aircraft or operating with unfamiliar flight display systems and avionics.")
        ],
        [
          S("CA.I.A.S1", "Apply requirements to act as pilot-in-command (PIC) under Visual Flight Rules (VFR) in a scenario given by the evaluator.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("B", "I_B", "Airworthiness Requirements", "CA.I.B",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with airworthiness requirements, including airplane certificates.",
        [
          K("CA.I.B.K1", "General airworthiness requirements and compliance for airplanes, including:"),
          K("CA.I.B.K1a", "a. Location and expiration dates of required aircraft certificates"),
          K("CA.I.B.K1b", "b. Required inspections and airplane logbook documentation"),
          K("CA.I.B.K1c", "c. Airworthiness Directives and Special Airworthiness Information Bulletins"),
          K("CA.I.B.K1d", "d. Purpose and procedure for obtaining a special flight permit"),
          K("CA.I.B.K2", "Pilot-performed preventive maintenance."),
          K("CA.I.B.K3", "Equipment requirements for day and night VFR flight, including:"),
          K("CA.I.B.K3a", "a. Flying with inoperative equipment"),
          K("CA.I.B.K3b", "b. Using an approved Minimum Equipment List (MEL)"),
          K("CA.I.B.K3c", "c. Kinds of Operation Equipment List (KOEL)"),
          K("CA.I.B.K3d", "d. Required discrepancy records or placards"),
          K("CA.I.B.K4", "Special airworthiness certificate aircraft operating limitations, if applicable.")
        ],
        [
          R("CA.I.B.R1", "Inoperative equipment discovered prior to flight.")
        ],
        [
          S("CA.I.B.S1", "Locate and describe airplane airworthiness and registration information."),
          S("CA.I.B.S2", "Determine the airplane is airworthy in the scenario given by the evaluator."),
          S("CA.I.B.S3", "Apply appropriate procedures for operating with inoperative equipment in the scenario given by the evaluator.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("C", "I_C", "Weather Information", "CA.I.C",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with weather information for a flight under VFR.",
        [
          K("CA.I.C.K1", "Sources of weather data (e.g., National Weather Service, Flight Service) for flight planning purposes."),
          K("CA.I.C.K2", "Acceptable weather products and resources required for preflight planning, current and forecast weather for departure, en route, and arrival phases of flight such as:"),
          K("CA.I.C.K2a", "a. Airport Observations (METAR and SPECI) and Pilot Observations (PIREP)"),
          K("CA.I.C.K2b", "b. Surface Analysis Chart, Ceiling and Visibility Chart (CVA)"),
          K("CA.I.C.K2c", "c. Terminal Aerodrome Forecasts (TAF)"),
          K("CA.I.C.K2d", "d. Graphical Forecasts for Aviation (GFA)"),
          K("CA.I.C.K2e", "e. Wind and Temperature Aloft Forecast (FB)"),
          K("CA.I.C.K2f", "f. Convective Outlook (AC)"),
          K("CA.I.C.K2g", "g. Inflight Aviation Weather Advisories including Airmen's Meteorological Information (AIRMET), Significant Meteorological Information (SIGMET), and Convective SIGMET"),
          K("CA.I.C.K3", "Meteorology applicable to the departure, en route, alternate, and destination under visual flight rules (VFR) in Visual Meteorological Conditions (VMC), including expected climate and hazardous conditions such as:"),
          K("CA.I.C.K3a", "a. Atmospheric composition and stability"),
          K("CA.I.C.K3b", "b. Wind (e.g., windshear, mountain wave, factors affecting wind, etc.)"),
          K("CA.I.C.K3c", "c. Temperature and heat exchange"),
          K("CA.I.C.K3d", "d. Moisture/precipitation"),
          K("CA.I.C.K3e", "e. Weather system formation, including air masses and fronts"),
          K("CA.I.C.K3f", "f. Clouds"),
          K("CA.I.C.K3g", "g. Turbulence"),
          K("CA.I.C.K3h", "h. Thunderstorms and microbursts"),
          K("CA.I.C.K3i", "i. Icing and freezing level information"),
          K("CA.I.C.K3j", "j. Fog/mist"),
          K("CA.I.C.K3k", "k. Frost"),
          K("CA.I.C.K3l", "l. Obstructions to visibility (e.g., smoke, haze, volcanic ash, etc.)"),
          K("CA.I.C.K4", "Flight deck instrument displays of digital weather and aeronautical information.")
        ],
        [
          R("CA.I.C.R1", "Making the go/no-go and continue/divert decisions, including:"),
          R("CA.I.C.R1a", "a. Circumstances that would make diversion prudent"),
          R("CA.I.C.R1b", "b. Personal weather minimums"),
          R("CA.I.C.R1c", "c. Hazardous weather conditions, including known or forecast icing or turbulence aloft"),
          R("CA.I.C.R2", "Use and limitations of:"),
          R("CA.I.C.R2a", "a. Installed onboard weather equipment"),
          R("CA.I.C.R2b", "b. Aviation weather reports and forecasts"),
          R("CA.I.C.R2c", "c. Inflight weather resources")
        ],
        [
          S("CA.I.C.S1", "Use available aviation weather resources to obtain an adequate weather briefing."),
          S("CA.I.C.S2", "Analyze the implications of at least three of the conditions listed in K3a through K3l, using actual weather or weather conditions provided by the evaluator."),
          S("CA.I.C.S3", "Correlate weather information to make a go/no-go decision.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      )    ,

    T("D","I_D","Cross-Country Flight Planning","CA.I.D",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with cross-country flights and VFR flight planning.",
      [
        K("CA.I.D.K1","Route planning, including consideration of different classes and special use airspace (SUA) and selection of appropriate and available navigation/communication systems and facilities."),
        K("CA.I.D.K1a","a. Use of an electronic flight bag (EFB), if used"),
        K("CA.I.D.K2","Altitude selection accounting for terrain and obstacles, glide distance of airplane, VFR cruising altitudes, and effect of wind."),
        K("CA.I.D.K3","Calculating:"),
        K("CA.I.D.K3a","a. Time, climb and descent rates, course, distance, heading, true airspeed, and groundspeed"),
        K("CA.I.D.K3b","b. Estimated time of arrival, including conversion to universal coordinated time (UTC)"),
        K("CA.I.D.K3c","c. Fuel requirements, including reserve"),
        K("CA.I.D.K4","Elements of a VFR flight plan."),
        K("CA.I.D.K5","Procedures for filing, activating, and closing a VFR flight plan."),
        K("CA.I.D.K6","Inflight intercept procedures.")
      ],
      [
        R("CA.I.D.R1","Pilot."),
        R("CA.I.D.R2","Aircraft."),
        R("CA.I.D.R3","Environment (e.g., weather, airports, airspace, terrain, obstacles)."),
        R("CA.I.D.R4","External pressures."),
        R("CA.I.D.R5","Limitations of air traffic control (ATC) services."),
        R("CA.I.D.R6","Fuel planning."),
        R("CA.I.D.R7","Use of an electronic flight bag (EFB), if used.")
      ],
      [
        S("CA.I.D.S1","Prepare, present, and explain a cross-country flight plan assigned by the evaluator, including a risk analysis based on real-time weather, to the first fuel stop."),
        S("CA.I.D.S2","Apply pertinent information from appropriate and current aeronautical charts, Chart Supplements; Notices to Air Missions (NOTAMs) relative to airport, runway and taxiway closures; and other flight publications."),
        S("CA.I.D.S3","Create a navigation log and prepare a VFR flight plan."),
        S("CA.I.D.S4","Recalculate fuel reserves based on a scenario provided by the evaluator."),
        S("CA.I.D.S5","Use an electronic flight bag (EFB), if applicable.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("E","I_E","National Airspace System","CA.I.E",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with National Airspace System (NAS) operations under VFR as a commercial pilot.",
      [
        K("CA.I.E.K1","Airspace classes and associated requirements and limitations."),
        K("CA.I.E.K2","Chart symbols."),
        K("CA.I.E.K3","Special use airspace (SUA), special flight rules areas (SFRA), temporary flight restrictions (TFR), and other airspace areas."),
        K("CA.I.E.K4","Special visual flight rules (VFR) requirements.")
      ],
      [
        R("CA.I.E.R1","Various classes and types of airspace.")
      ],
      [
        S("CA.I.E.S1","Identify and comply with the requirements for basic VFR weather minimums and flying in particular classes of airspace."),
        S("CA.I.E.S2","Correctly identify airspace and operate in accordance with associated communication and equipment requirements."),
        S("CA.I.E.S3","Identify the requirements for operating in SUA or within a TFR. Identify and comply with special air traffic rules (SATR) and SFRA operations, if applicable.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("F","I_F","Performance and Limitations","CA.I.F",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with operating an airplane safely within the parameters of its performance capabilities and limitations.",
      [
        K("CA.I.F.K1","Elements related to performance and limitations by explaining the use of charts, tables, and data to determine performance."),
        K("CA.I.F.K2","Factors affecting performance, including:"),
        K("CA.I.F.K2a","a. Atmospheric conditions"),
        K("CA.I.F.K2b","b. Pilot technique"),
        K("CA.I.F.K2c","c. Airplane configuration"),
        K("CA.I.F.K2d","d. Airport environment"),
        K("CA.I.F.K2e","e. Loading and weight and balance"),
        K("CA.I.F.K2f","f. [Archived]"),
        K("CA.I.F.K3","Aerodynamics.")
      ],
      [
        R("CA.I.F.R1","Use of performance charts, tables, and data."),
        R("CA.I.F.R2","Airplane limitations."),
        R("CA.I.F.R3","Possible differences between calculated performance and actual performance.")
      ],
      [
        S("CA.I.F.S1","Compute the weight and balance, correct out-of-CG loading errors and determine if the weight and balance remains within limits during all phases of flight."),
        S("CA.I.F.S2","Use the appropriate airplane performance charts, tables, and data.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("G","I_G","Operation of Systems","CA.I.G",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with safe operation of systems on the airplane provided for the flight test.",
      [
        K("CA.I.G.K1","Airplane systems, including:"),
        K("CA.I.G.K1a","a. Primary flight controls"),
        K("CA.I.G.K1b","b. Secondary flight controls"),
        K("CA.I.G.K1c","c. Powerplant and propeller"),
        K("CA.I.G.K1d","d. Landing gear"),
        K("CA.I.G.K1e","e. Fuel, oil, and hydraulic"),
        K("CA.I.G.K1f","f. Electrical"),
        K("CA.I.G.K1g","g. Avionics"),
        K("CA.I.G.K1h","h. Pitot-static, vacuum/pressure, and associated flight instruments"),
        K("CA.I.G.K1i","i. Environmental"),
        K("CA.I.G.K1j","j. Deicing and anti-icing"),
        K("CA.I.G.K1k","k. Water rudders (ASES, AMES)"),
        K("CA.I.G.K1l","l. Oxygen system"),
        K("CA.I.G.K2","Indications of and procedures for managing system abnormalities or failures.")
      ],
      [
        R("CA.I.G.R1","Detection of system malfunctions or failures."),
        R("CA.I.G.R2","Management of a system failure."),
        R("CA.I.G.R3","Monitoring and management of automated systems.")
      ],
      [
        S("CA.I.G.S1","Operate at least three of the systems listed in K1a through K1l appropriately."),
        S("CA.I.G.S2","Complete the appropriate checklist(s).")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("H","I_H","Human Factors","CA.I.H",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with personal health, flight physiology, and aeromedical and human factors related to safety of flight.",
      [
        K("CA.I.H.K1","Symptoms, recognition, causes, effects, and corrective actions associated with aeromedical and physiological issues, including:"),
        K("CA.I.H.K1a","a. Hypoxia"),
        K("CA.I.H.K1b","b. Hyperventilation"),
        K("CA.I.H.K1c","c. Middle ear and sinus problems"),
        K("CA.I.H.K1d","d. Spatial disorientation"),
        K("CA.I.H.K1e","e. Motion sickness"),
        K("CA.I.H.K1f","f. Carbon monoxide poisoning"),
        K("CA.I.H.K1g","g. Stress"),
        K("CA.I.H.K1h","h. Fatigue"),
        K("CA.I.H.K1i","i. Dehydration and nutrition"),
        K("CA.I.H.K1j","j. Hypothermia"),
        K("CA.I.H.K1k","k. Optical illusions"),
        K("CA.I.H.K1l","l. Dissolved nitrogen in the bloodstream after scuba dives"),
        K("CA.I.H.K2","Regulations regarding use of alcohol and drugs."),
        K("CA.I.H.K3","Effects of alcohol, drugs, and over-the-counter medications."),
        K("CA.I.H.K4","Aeronautical Decision-Making (ADM) to include using Crew Resource Management (CRM) or Single-Pilot Resource Management (SRM), as appropriate.")
      ],
      [
        R("CA.I.H.R1","Aeromedical and physiological issues."),
        R("CA.I.H.R2","Hazardous attitudes."),
        R("CA.I.H.R3","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.I.H.R4","Confirmation and expectation bias.")
      ],
      [
        S("CA.I.H.S1","Associate the symptoms and effects for at least three of the conditions listed in K1a through K1l with the cause(s) and corrective action(s)."),
        S("CA.I.H.S2","Perform self-assessment, including fitness for flight and personal minimums, for actual flight or a scenario given by the evaluator.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("I","I_I","Water and Seaplane Characteristics, Seaplane Bases, Maritime Rules, and Aids to Marine Navigation","CA.I.I",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with water and seaplane characteristics, seaplane bases, maritime rules, and aids to marine navigation.",
      [
        K("CA.I.I.K1","The characteristics of a water surface as affected by features, such as:"),
        K("CA.I.I.K1a","a. Size and location"),
        K("CA.I.I.K1b","b. Protected and unprotected areas"),
        K("CA.I.I.K1c","c. Surface wind"),
        K("CA.I.I.K1d","d. Direction and strength of water current"),
        K("CA.I.I.K1e","e. Floating and partially submerged debris"),
        K("CA.I.I.K1f","f. Sandbars, islands, and shoals"),
        K("CA.I.I.K1g","g. Vessel traffic and wakes"),
        K("CA.I.I.K1h","h. Other characteristics specific to the area"),
        K("CA.I.I.K1i","i. Direction and height of waves"),
        K("CA.I.I.K2","Float and hull construction, and its effect on seaplane performance."),
        K("CA.I.I.K3","Causes of porpoising and skipping, and the pilot action needed to prevent or correct these occurrences."),
        K("CA.I.I.K4","How to locate and identify seaplane bases on charts or in directories."),
        K("CA.I.I.K5","Operating restrictions at various bases."),
        K("CA.I.I.K6","Right-of-way, steering, and sailing rules pertinent to seaplane operation."),
        K("CA.I.I.K7","Marine navigation aids, such as buoys, beacons, lights, sound signals, and range markers."),
        K("CA.I.I.K8","Naval vessel protection zones."),
        K("CA.I.I.K9","No wake zones.")
      ],
      [
        R("CA.I.I.R1","Local conditions."),
        R("CA.I.I.R2","Impact of marine traffic."),
        R("CA.I.I.R3","Right-of-way and sailing rules pertinent to seaplane operations."),
        R("CA.I.I.R4","Limited services and assistance available at seaplane bases.")
      ],
      [
        S("CA.I.I.S1","Assess the water surface characteristics for the proposed flight."),
        S("CA.I.I.S2","Identify restrictions at local seaplane bases."),
        S("CA.I.I.S3","Identify marine navigation aids."),
        S("CA.I.I.S4","Describe correct right-of-way, steering, and sailing operations."),
        S("CA.I.I.S5","Explain how float and hull construction can affect seaplane performance."),
        S("CA.I.I.S6","Describe how to correct for porpoising and skipping.")
      ],
      ["ASES","AMES"]
    )
    ]
  },

  {
    id: "II",
    roman: "II",
    title: "Preflight Procedures",
    phase: "ground",
    tasks: [
      T("A", "II_A", "Preflight Assessment", "CA.II.A",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with preparation for safe flight.",
        [
          K("CA.II.A.K1", "Pilot self-assessment."),
          K("CA.II.A.K2", "Determining that the airplane to be used is appropriate and airworthy."),
          K("CA.II.A.K3", "Airplane preflight inspection, including:"),
          K("CA.II.A.K3a", "a. Which items should be inspected"),
          K("CA.II.A.K3b", "b. The reasons for checking each item"),
          K("CA.II.A.K3c", "c. How to detect possible defects"),
          K("CA.II.A.K3d", "d. The associated regulations"),
          K("CA.II.A.K4", "Environmental factors, including weather, terrain, route selection, and obstructions.")
        ],
        [
          R("CA.II.A.R1", "Pilot."),
          R("CA.II.A.R2", "Aircraft."),
          R("CA.II.A.R3", "Environment (e.g., weather, airports, airspace, terrain, obstacles)."),
          R("CA.II.A.R4", "External pressures."),
          R("CA.II.A.R5", "Aviation security concerns.")
        ],
        [
          S("CA.II.A.S1", "Inspect the airplane with reference to an appropriate checklist."),
          S("CA.II.A.S2", "Verify the airplane is in condition for safe flight and conforms to its type design."),
          S("CA.II.A.S3", "Perform self-assessment."),
          S("CA.II.A.S4", "Continue to assess the environment for safe flight.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("B", "II_B", "Flight Deck Management", "CA.II.B",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with flight deck management practices.",
        [
          K("CA.II.B.K1", "Passenger briefing requirements, including operation and required use of safety restraint systems."),
          K("CA.II.B.K2", "Use of appropriate checklists."),
          K("CA.II.B.K3", "Requirements for current and appropriate navigation data."),
          K("CA.II.B.K4", "Securing items and cargo.")
        ],
        [
          R("CA.II.B.R1", "Use of systems or equipment, including automation and portable electronic devices."),
          R("CA.II.B.R2", "Inoperative equipment."),
          R("CA.II.B.R3", "Passenger distractions.")
        ],
        [
          S("CA.II.B.S1", "Secure all items in the aircraft."),
          S("CA.II.B.S2", "Conduct an appropriate passenger briefing, including identifying the pilot-in-command (PIC), use of safety belts, shoulder harnesses, doors, passenger conduct, sterile aircraft, propeller blade avoidance, and emergency procedures."),
          S("CA.II.B.S3", "Properly program and manage the aircraft’s automation, as applicable."),
          S("CA.II.B.S4", "Appropriately manage risks by utilizing ADM, including SRM/CRM.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("C", "II_C", "Engine Starting", "CA.II.C",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with recommended engine starting procedures.",
        [
          K("CA.II.C.K1", "Starting under various conditions."),
          K("CA.II.C.K2", "Starting the engine(s) by use of external power."),
          K("CA.II.C.K3", "Engine limitations as they relate to starting.")
        ],
        [
          R("CA.II.C.R1", "Propeller safety.")
        ],
        [
          S("CA.II.C.S1", "Position the airplane properly considering structures, other aircraft, wind, and the safety of nearby persons and property."),
          S("CA.II.C.S2", "Complete the appropriate checklist(s).")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("D", "II_D", "Taxiing", "CA.II.D",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with taxi operations, including runway incursion avoidance.",
        [
          K("CA.II.D.K1", "Current airport aeronautical references and information resources such as the Chart Supplement, airport diagram, and Notices to Air Missions (NOTAMs)."),
          K("CA.II.D.K2", "Taxi instructions/clearances."),
          K("CA.II.D.K3", "Airport markings, signs, and lights."),
          K("CA.II.D.K4", "Visual indicators for wind."),
          K("CA.II.D.K5", "Aircraft lighting, as appropriate."),
          K("CA.II.D.K6", "Procedures for:"),
          K("CA.II.D.K6a", "a. Appropriate flight deck activities prior to taxi, including route planning and identifying the location of Hot Spots"),
          K("CA.II.D.K6b", "b. Radio communications at towered and nontowered airports"),
          K("CA.II.D.K6c", "c. Entering or crossing runways"),
          K("CA.II.D.K6d", "d. Night taxi operations"),
          K("CA.II.D.K6e", "e. Low visibility taxi operations")
        ],
        [
          R("CA.II.D.R1", "Activities and distractions."),
          R("CA.II.D.R2", "Confirmation or expectation bias as related to taxi instructions."),
          R("CA.II.D.R3", "A taxi route or departure runway change."),
          R("CA.II.D.R4", "Runway incursion.")
        ],
        [
          S("CA.II.D.S1", "Receive and correctly read back clearances/instructions, if applicable."),
          S("CA.II.D.S2", "Use an airport diagram or taxi chart during taxi, if published, and maintain situational awareness."),
          S("CA.II.D.S3", "Position the flight controls for the existing wind, if applicable."),
          S("CA.II.D.S4", "Complete the appropriate checklist(s)."),
          S("CA.II.D.S5", "Perform a brake check immediately after the airplane begins moving."),
          S("CA.II.D.S6", "Maintain positive control of the airplane during ground operations by controlling direction and speed without excessive use of brakes."),
          S("CA.II.D.S7", "Comply with airport/taxiway markings, signals, and air traffic control (ATC) clearances and instructions."),
          S("CA.II.D.S8", "Position the airplane properly relative to hold lines.")
        ],
        ["ASEL","AMEL"]
      ),

      T("E", "II_E", "Taxiing and Sailing", "CA.II.E",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with taxiing and sailing operations, including runway incursion avoidance.",
        [
          K("CA.II.E.K1", "Airport information resources, including Chart Supplements, airport diagram, and appropriate references."),
          K("CA.II.E.K2", "Taxi instructions/clearances."),
          K("CA.II.E.K3", "Airport/seaplane base markings, signs, and lights."),
          K("CA.II.E.K4", "Visual indicators for wind."),
          K("CA.II.E.K5", "Airplane lighting."),
          K("CA.II.E.K6", "Procedures for:"),
          K("CA.II.E.K6a", "a. Appropriate flight deck activities during taxiing or sailing"),
          K("CA.II.E.K6b", "b. Radio communications at towered and nontowered seaplane bases")
        ],
        [
          R("CA.II.E.R1", "Activities and distractions."),
          R("CA.II.E.R2", "Porpoising and skipping."),
          R("CA.II.E.R3", "Low visibility taxi and sailing operations."),
          R("CA.II.E.R4", "Other aircraft, vessels, and hazards."),
          R("CA.II.E.R5", "Confirmation or expectation bias as related to taxi instructions.")
        ],
        [
          S("CA.II.E.S1", "Receive and correctly read back clearances/instructions, if applicable."),
          S("CA.II.E.S2", "Use an appropriate airport diagram or taxi chart, if published."),
          S("CA.II.E.S3", "Comply with seaplane base/airport/taxiway markings, signals, and signs."),
          S("CA.II.E.S4", "Depart the dock/mooring buoy or beach/ramp in a safe manner, considering wind, current, traffic, and hazards."),
          S("CA.II.E.S5", "Complete the appropriate checklist(s)."),
          S("CA.II.E.S6", "Position the flight controls, flaps, doors, water rudders, and power correctly for the existing conditions to follow the desired course while sailing and to prevent or correct for porpoising and skipping during step taxi."),
          S("CA.II.E.S7", "Exhibit procedures for steering and maneuvering while maintaining proper situational awareness and desired orientation, path, and position while taxiing using idle, plow, or step taxi technique, as appropriate."),
          S("CA.II.E.S8", "Plan and follow the most favorable taxi or sailing course for current conditions."),
          S("CA.II.E.S9", "Abide by right-of-way rules, maintain positive airplane control, proper speed, and separation between other aircraft, vessels, and persons."),
          S("CA.II.E.S10", "Comply with applicable taxi elements in Task D if the practical test is conducted in an amphibious airplane.")
        ],
        ["ASES","AMES"]
      ),

      T("F", "II_F", "Before Takeoff Check", "CA.II.F",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with before takeoff check.",
        [
          K("CA.II.F.K1", "Purpose of before takeoff checklist items, including:"),
          K("CA.II.F.K1a", "a. Reasons for checking each item"),
          K("CA.II.F.K1b", "b. Detecting malfunctions"),
          K("CA.II.F.K1c", "c. Ensuring the aircraft is in safe operating condition as recommended by the manufacturer")
        ],
        [
          R("CA.II.F.R1", "Division of attention while conducting before takeoff checks."),
          R("CA.II.F.R2", "Unexpected runway changes by air traffic control (ATC)."),
          R("CA.II.F.R3", "Wake turbulence."),
          R("CA.II.F.R4", "Potential powerplant failure during takeoff or other malfunction considering operational factors such as airplane characteristics, runway/takeoff path length, surface conditions, environmental conditions, and obstructions.")
        ],
        [
          S("CA.II.F.S1", "Review takeoff performance."),
          S("CA.II.F.S2", "Complete the appropriate checklist(s)."),
          S("CA.II.F.S3", "Position the airplane appropriately considering wind direction and the presence of any aircraft, vessels, or buildings as applicable."),
          S("CA.II.F.S4", "Divide attention inside and outside the flight deck."),
          S("CA.II.F.S5", "Verify that engine parameters and airplane configuration are suitable.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      )
    ]
  },

  {
    id: "III",
    roman: "III",
    title: "Airport and Seaplane Base Operations",
    phase: "flight",
    tasks: [
      T("A","III_A","Communications, Light Signals, and Runway Lighting Systems","CA.III.A",
        "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with normal and emergency radio communications, air traffic control (ATC) light signals, and runway lighting systems.",
        [
          K("CA.III.A.K1","How to obtain appropriate radio frequencies."),
          K("CA.III.A.K2","Proper radio communication procedures and air traffic control (ATC) phraseology."),
          K("CA.III.A.K3","ATC light signal recognition."),
          K("CA.III.A.K4","Appropriate use of transponder(s)."),
          K("CA.III.A.K5","Lost communication procedures."),
          K("CA.III.A.K6","Equipment issues that could cause loss of communication."),
          K("CA.III.A.K7","Radar assistance."),
          K("CA.III.A.K8","National Transportation Safety Board (NTSB) accident/incident reporting."),
          K("CA.III.A.K9","Runway Status Lighting Systems.")
        ],
        [
          R("CA.III.A.R1","Communication."),
          R("CA.III.A.R2","Deciding if and when to declare an emergency."),
          R("CA.III.A.R3","Use of non-standard phraseology.")
        ],
        [
          S("CA.III.A.S1","Select and activate appropriate frequencies."),
          S("CA.III.A.S2","Transmit using standard phraseology and procedures as specified in the Aeronautical Information Manual (AIM) and Pilot/Controller Glossary."),
          S("CA.III.A.S3","Acknowledge radio communications and comply with ATC instructions or as directed by the evaluator.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("B","III_B","Traffic Patterns","CA.III.B",
        "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with traffic patterns.",
        [
          K("CA.III.B.K1","Towered and nontowered airport operations."),
          K("CA.III.B.K2","Traffic pattern selection for the current conditions."),
          K("CA.III.B.K3","Right-of-way rules."),
          K("CA.III.B.K4","Use of automated weather and airport information.")
        ],
        [
          R("CA.III.B.R1","Collision hazards."),
          R("CA.III.B.R2","Distractions, task prioritization, loss of situational awareness, or disorientation."),
          R("CA.III.B.R3","Windshear and wake turbulence.")
        ],
        [
          S("CA.III.B.S1","Identify and interpret airport/seaplane base runways, taxiways, markings, signs, and lighting."),
          S("CA.III.B.S2","Comply with recommended traffic pattern procedures."),
          S("CA.III.B.S3","Correct for wind drift to maintain the proper ground track."),
          S("CA.III.B.S4","Maintain orientation with the runway/landing area in use."),
          S("CA.III.B.S5","Maintain traffic pattern altitude, ±100 feet, and the appropriate airspeed, ±10 knots."),
          S("CA.III.B.S6","Maintain situational awareness and proper spacing from other aircraft in the traffic pattern.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      )
    ]
  },

  {
    id: "IV",
    roman: "IV",
    title: "Takeoffs, Landings, and Go-Arounds",
    phase: "flight",
    tasks: [
      T("A","IV_A","Normal Takeoff and Climb","CA.IV.A",
        "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with normal takeoff, climb operations, and rejected takeoff procedures.",
        [
          K("CA.IV.A.K1","Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
          K("CA.IV.A.K2","Best angle of climb speed (VX) and best rate of climb speed (VY)."),
          K("CA.IV.A.K3","Appropriate airplane configuration.")
        ],
        [
          R("CA.IV.A.R1","Selection of runway or takeoff path based on aircraft performance and limitations, available distance, and wind."),
          R("CA.IV.A.R2","Effects of:"),
          R("CA.IV.A.R2a","Crosswind"),
          R("CA.IV.A.R2b","Windshear"),
          R("CA.IV.A.R2c","Tailwind"),
          R("CA.IV.A.R2d","Wake turbulence"),
          R("CA.IV.A.R2e","Takeoff surface/condition"),
          R("CA.IV.A.R3","Abnormal operations, including planning for:"),
          R("CA.IV.A.R3a","Rejected takeoff"),
          R("CA.IV.A.R3b","Potential engine failure in takeoff/climb phase of flight"),
          R("CA.IV.A.R4","Collision hazards."),
          R("CA.IV.A.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
          R("CA.IV.A.R6","Distractions, task prioritization, loss of situational awareness, or disorientation."),
          R("CA.IV.A.R7","Runway incursion.")
        ],
        [
          S("CA.IV.A.S1","Complete the appropriate checklist(s)."),
          S("CA.IV.A.S2","Make radio calls as appropriate."),
          S("CA.IV.A.S3","Verify assigned/correct runway or takeoff path."),
          S("CA.IV.A.S4","Determine wind direction with or without visible wind direction indicators."),
          S("CA.IV.A.S5","Position the flight controls for the existing wind, if applicable."),
          S("CA.IV.A.S6","Clear the area, taxi into takeoff position, and align the airplane on the runway centerline (ASEL, AMEL) or takeoff path (ASES, AMES)."),
          S("CA.IV.A.S6a","Retract the water rudders, as appropriate (ASES, AMES)"),
          S("CA.IV.A.S7","Advance the throttle smoothly to takeoff power and confirm proper engine and flight instrument indications prior to rotation."),
          S("CA.IV.A.S7a","Establish and maintain the most efficient planing/lift-off attitude, and correct for porpoising or skipping (ASES, AMES)"),
          S("CA.IV.A.S8","Avoid excessive water spray on the propeller(s) (ASES, AMES)."),
          S("CA.IV.A.S9","Rotate and lift off at the recommended airspeed and accelerate to VY."),
          S("CA.IV.A.S10","[Archived]"),
          S("CA.IV.A.S11","Establish a pitch attitude to maintain the manufacturer’s recommended speed or VY, ±5 knots."),
          S("CA.IV.A.S12","Configure the airplane in accordance with manufacturer’s guidance."),
          S("CA.IV.A.S13","Maintain VY ±5 knots to a safe maneuvering altitude."),
          S("CA.IV.A.S14","Maintain directional control and proper wind-drift correction throughout takeoff and climb."),
          S("CA.IV.A.S15","Comply with noise abatement procedures, as applicable.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("B","IV_B","Normal Approach and Landing","CA.IV.B",
        "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with normal approach and landing with emphasis on proper use and coordination of flight controls.",
        [
          K("CA.IV.B.K1","A stabilized approach, including energy management concepts."),
          K("CA.IV.B.K2","Effects of atmospheric conditions, including wind, on approach and landing performance."),
          K("CA.IV.B.K3","Wind correction techniques on approach and landing.")
        ],
        [
          R("CA.IV.B.R1","Selection of runway/landing surface, approach path, and touchdown area based on pilot capability, aircraft performance and limitations, available distance, and wind."),
          R("CA.IV.B.R2","Effects of:"),
          R("CA.IV.B.R2a","Crosswind"),
          R("CA.IV.B.R2b","Windshear"),
          R("CA.IV.B.R2c","Tailwind"),
          R("CA.IV.B.R2d","Wake turbulence"),
          R("CA.IV.B.R2e","Landing surface/condition"),
          R("CA.IV.B.R3","Planning for:"),
          R("CA.IV.B.R3a","Rejected landing and go-around"),
          R("CA.IV.B.R3b","Land and hold short operations (LAHSO)"),
          R("CA.IV.B.R4","Collision hazards."),
          R("CA.IV.B.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
          R("CA.IV.B.R6","Distractions, task prioritization, loss of situational awareness, or disorientation.")
        ],
        [
          S("CA.IV.B.S1","Complete the appropriate checklist(s)."),
          S("CA.IV.B.S2","Make radio calls as appropriate."),
          S("CA.IV.B.S3","Ensure the airplane is aligned with the correct/assigned runway or landing surface."),
          S("CA.IV.B.S4","Scan the runway or landing surface and adjoining area for traffic and obstructions."),
          S("CA.IV.B.S5","Select and aim for a suitable touchdown point considering the wind conditions, landing surface, and obstructions."),
          S("CA.IV.B.S6","Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
          S("CA.IV.B.S7","Maintain manufacturer’s published approach airspeed or in its absence not more than 1.3 times the stalling speed or the minimum steady flight speed in the landing configuration (VSO), ±5 knots with gust factor applied."),
          S("CA.IV.B.S8","Maintain directional control and appropriate crosswind correction throughout the approach and landing."),
          S("CA.IV.B.S9","Make smooth, timely, and correct control application during round out and touchdown."),
          S("CA.IV.B.S10","Touch down at a proper pitch attitude, within 200 feet beyond or on the specified point, with no side drift, and with the airplane’s longitudinal axis aligned with and over the runway center/landing path."),
          S("CA.IV.B.S11","Execute a timely go-around if the approach cannot be made within the tolerances specified above or for any other condition that may result in an unsafe approach or landing."),
          S("CA.IV.B.S12","Use runway incursion avoidance procedures, if applicable.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("C","IV_C","Soft-Field Takeoff and Climb","CA.IV.C",
        "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with soft-field takeoff, climb operations, and rejected takeoff procedures.",
        [
          K("CA.IV.C.K1","Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
          K("CA.IV.C.K2","Best angle of climb speed (VX) and best rate of climb speed (VY)."),
          K("CA.IV.C.K3","Appropriate airplane configuration."),
          K("CA.IV.C.K4","Ground effect."),
          K("CA.IV.C.K5","Importance of weight transfer from wheels to wings."),
          K("CA.IV.C.K6","Left turning tendencies.")
        ],
        [
          R("CA.IV.C.R1","Selection of runway based on pilot capability, airplane performance and limitations, available distance, and wind."),
          R("CA.IV.C.R2","Effects of:"),
          R("CA.IV.C.R2a","Crosswind"),
          R("CA.IV.C.R2b","Windshear"),
          R("CA.IV.C.R2c","Tailwind"),
          R("CA.IV.C.R2d","Wake turbulence"),
          R("CA.IV.C.R2e","Takeoff surface/condition"),
          R("CA.IV.C.R3","Abnormal operations, including planning for:"),
          R("CA.IV.C.R3a","Rejected takeoff"),
          R("CA.IV.C.R3b","Potential engine failure in takeoff/climb phase of flight"),
          R("CA.IV.C.R4","Collision hazards."),
          R("CA.IV.C.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
          R("CA.IV.C.R6","Distractions, task prioritization, loss of situational awareness, or disorientation.")
        ],
        [
          S("CA.IV.C.S1","Complete the appropriate checklist(s)."),
          S("CA.IV.C.S2","Make radio calls as appropriate."),
          S("CA.IV.C.S3","Verify assigned/correct runway."),
          S("CA.IV.C.S4","Determine wind direction with or without visible wind direction indicators."),
          S("CA.IV.C.S5","Position the flight controls for the existing wind, if applicable."),
          S("CA.IV.C.S6","Clear the area, maintain necessary flight control inputs, taxi into takeoff position and align the airplane on the runway centerline without stopping, while advancing the throttle smoothly to takeoff power."),
          S("CA.IV.C.S7","Confirm takeoff power and proper engine and flight instrument indications."),
          S("CA.IV.C.S8","Establish and maintain a pitch attitude that transfers the weight of the airplane from the wheels to the wings as rapidly as possible."),
          S("CA.IV.C.S9","Lift off at the lowest possible airspeed and remain in ground effect while accelerating to VX or VY, as appropriate."),
          S("CA.IV.C.S10","Establish a pitch attitude for VX or VY, as appropriate, and maintain selected airspeed ±5 knots during the climb."),
          S("CA.IV.C.S11","Configure the airplane after a positive rate of climb has been verified or in accordance with airplane manufacturer’s instructions."),
          S("CA.IV.C.S12","Maintain VX or VY, as appropriate, ±5 knots to a safe maneuvering altitude."),
          S("CA.IV.C.S13","Maintain directional control and proper wind-drift correction throughout takeoff and climb."),
          S("CA.IV.C.S14","Comply with noise abatement procedures, as applicable.")
        ],
        ["ASEL"]
      ),

      T("D","IV_D","Soft-Field Approach and Landing","CA.IV.D",
        "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with soft-field approach and landing with emphasis on proper use and coordination of flight controls.",
        [
          K("CA.IV.D.K1","A stabilized approach, including energy management concepts."),
          K("CA.IV.D.K2","Effects of atmospheric conditions, including wind, on approach and landing performance."),
          K("CA.IV.D.K3","Wind correction techniques on approach and landing.")
        ],
        [
          R("CA.IV.D.R1","Selection of runway based on pilot capability, airplane performance and limitations, available distance, and wind."),
          R("CA.IV.D.R2","Effects of:"),
          R("CA.IV.D.R2a","Crosswind"),
          R("CA.IV.D.R2b","Windshear"),
          R("CA.IV.D.R2c","Tailwind"),
          R("CA.IV.D.R2d","Wake turbulence"),
          R("CA.IV.D.R2e","Landing surface/condition"),
          R("CA.IV.D.R3","Planning for:"),
          R("CA.IV.D.R3a","Rejected landing and go-around"),
          R("CA.IV.D.R3b","Land and hold short operations (LAHSO)"),
          R("CA.IV.D.R4","Collision hazards."),
          R("CA.IV.D.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
          R("CA.IV.D.R6","Distractions, task prioritization, loss of situational awareness, or disorientation.")
        ],
        [
          S("CA.IV.D.S1","Complete the appropriate checklist(s)."),
          S("CA.IV.D.S2","Make radio calls as appropriate."),
          S("CA.IV.D.S3","Ensure the airplane is aligned with the correct/assigned runway."),
          S("CA.IV.D.S4","Scan the landing runway and adjoining area for traffic and obstructions."),
          S("CA.IV.D.S5","Select and aim for a suitable touchdown point considering the wind conditions, landing surface, and obstructions."),
          S("CA.IV.D.S6","Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
          S("CA.IV.D.S7","Maintain manufacturer’s published approach airspeed or in its absence not more than 1.3 times the stalling speed or the minimum steady flight speed in the landing configuration (VSO), ±5 knots with gust factor applied."),
          S("CA.IV.D.S8","Maintain directional control and appropriate crosswind correction throughout the approach and landing."),
          S("CA.IV.D.S9","Make smooth, timely, and correct control inputs during the round out and touchdown, and, for tricycle gear airplanes, keep the nose wheel off the surface until loss of elevator effectiveness."),
          S("CA.IV.D.S10","Touch down at a proper pitch attitude with minimum sink rate, no side drift, and with the airplane’s longitudinal axis aligned with the center of the runway."),
          S("CA.IV.D.S11","Maintain elevator as recommended by manufacturer during rollout and exit the “soft” area at a speed that would preclude sinking into the surface."),
          S("CA.IV.D.S12","Execute a timely go-around if the approach cannot be made within the tolerances specified above or for any other condition that may result in an unsafe approach or landing."),
          S("CA.IV.D.S13","Maintain proper position of the flight controls and sufficient speed to taxi while on the soft surface.")
        ],
        ["ASEL"]
      ),

      T("E","IV_E","Short-Field Takeoff and Maximum Performance Climb","CA.IV.E",
        "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with short-field takeoff, maximum performance climb operations, and rejected takeoff procedures.",
        [
          K("CA.IV.E.K1","Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
          K("CA.IV.E.K2","Best angle of climb speed (VX) and best rate of climb speed (VY)."),
          K("CA.IV.E.K3","Appropriate airplane configuration.")
        ],
        [
          R("CA.IV.E.R1","Selection of runway based on pilot capability, airplane performance and limitations, available distance, and wind."),
          R("CA.IV.E.R2","Effects of:"),
          R("CA.IV.E.R2a","Crosswind"),
          R("CA.IV.E.R2b","Windshear"),
          R("CA.IV.E.R2c","Tailwind"),
          R("CA.IV.E.R2d","Wake turbulence"),
          R("CA.IV.E.R2e","Takeoff surface/condition"),
          R("CA.IV.E.R3","Abnormal operations, including planning for:"),
          R("CA.IV.E.R3a","Rejected takeoff"),
          R("CA.IV.E.R3b","Potential engine failure in takeoff/climb phase of flight"),
          R("CA.IV.E.R4","Collision hazards."),
          R("CA.IV.E.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
          R("CA.IV.E.R6","Distractions, task prioritization, loss of situational awareness, or disorientation.")
        ],
        [
          S("CA.IV.E.S1","Complete the appropriate checklist(s)."),
          S("CA.IV.E.S2","Make radio calls as appropriate."),
          S("CA.IV.E.S3","Verify assigned/correct runway."),
          S("CA.IV.E.S4","Determine wind direction with or without visible wind direction indicators."),
          S("CA.IV.E.S5","Position the flight controls for the existing wind, if applicable."),
          S("CA.IV.E.S6","Clear the area, taxi into takeoff position, and align the airplane on the runway centerline utilizing maximum available takeoff area."),
          S("CA.IV.E.S7","Apply brakes while setting engine power to achieve maximum performance."),
          S("CA.IV.E.S8","Confirm takeoff power prior to brake release and verify proper engine and flight instrument indications prior to rotation."),
          S("CA.IV.E.S9","Rotate and lift off at the recommended airspeed and accelerate to the recommended obstacle clearance airspeed or VX, ±5 knots."),
          S("CA.IV.E.S10","Establish a pitch attitude to maintain the recommended obstacle clearance airspeed or VX, ±5 knots until the obstacle is cleared or until the airplane is 50 feet above the surface."),
          S("CA.IV.E.S11","Establish a pitch attitude for VY and accelerate to VY ±5 knots after clearing the obstacle or at 50 feet above ground level (AGL) if simulating an obstacle."),
          S("CA.IV.E.S12","Configure the airplane in accordance with the manufacturer’s guidance after a positive rate of climb has been verified."),
          S("CA.IV.E.S13","Maintain VY ±5 knots to a safe maneuvering altitude."),
          S("CA.IV.E.S14","Maintain directional control and proper wind-drift correction throughout takeoff and climb."),
          S("CA.IV.E.S15","Comply with noise abatement procedures, as applicable.")
        ],
        ["ASEL","AMEL"]
      )    ,

    T("F","IV_F","Short-Field Approach and Landing","CA.IV.F",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with short-field approach and landing with emphasis on proper use and coordination of flight controls.",
      [
        K("CA.IV.F.K1","A stabilized approach, including energy management concepts."),
        K("CA.IV.F.K2","Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("CA.IV.F.K3","Wind correction techniques on approach and landing.")
      ],
      [
        R("CA.IV.F.R1","Selection of runway based on pilot capability, airplane performance and limitations, available distance, and wind."),
        R("CA.IV.F.R2","Effects of:"),
        R("CA.IV.F.R2a","a. Crosswind"),
        R("CA.IV.F.R2b","b. Windshear"),
        R("CA.IV.F.R2c","c. Tailwind"),
        R("CA.IV.F.R2d","d. Wake turbulence"),
        R("CA.IV.F.R2e","e. Landing surface/condition"),
        R("CA.IV.F.R3","Planning for:"),
        R("CA.IV.F.R3a","a. Rejected landing and go-around"),
        R("CA.IV.F.R3b","b. Land and hold short operations (LAHSO)"),
        R("CA.IV.F.R4","Collision hazards."),
        R("CA.IV.F.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.IV.F.R6","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("CA.IV.F.S1","Complete the appropriate checklist(s)."),
        S("CA.IV.F.S2","Make radio calls as appropriate."),
        S("CA.IV.F.S3","Ensure the airplane is aligned with the correct/assigned runway."),
        S("CA.IV.F.S4","Scan the landing runway and adjoining area for traffic and obstructions."),
        S("CA.IV.F.S5","Select and aim for a suitable touchdown point considering the wind conditions, landing surface, and obstructions."),
        S("CA.IV.F.S6","Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("CA.IV.F.S7","Maintain manufacturer’s published approach airspeed or in its absence not more than 1.3 times the stalling speed or the minimum steady flight speed in the landing configuration (VSO), ±5 knots with gust factor applied."),
        S("CA.IV.F.S8","Maintain directional control and appropriate crosswind correction throughout the approach and landing."),
        S("CA.IV.F.S9","Make smooth, timely, and correct control application before, during, and after touchdown."),
        S("CA.IV.F.S10","Touch down at a proper pitch attitude within 100 feet beyond or on the specified point, threshold markings, or runway numbers, with no side drift, minimum float, and with the airplane’s longitudinal axis aligned with and over the runway centerline."),
        S("CA.IV.F.S11","Use manufacturer’s recommended procedures for airplane configuration and braking."),
        S("CA.IV.F.S12","Execute a timely go-around if the approach cannot be made within the tolerances specified above or for any other condition that may result in an unsafe approach or landing."),
        S("CA.IV.F.S13","Use runway incursion avoidance procedures, if applicable.")
      ],
      ["ASEL","AMEL"]
    ),

    T("G","IV_G","Confined Area Takeoff and Maximum Performance Climb","CA.IV.G",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with confined area takeoff and maximum performance climb.",
      [
        K("CA.IV.G.K1","Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
        K("CA.IV.G.K2","Best angle of climb speed (VX) and best rate of climb speed (VY)."),
        K("CA.IV.G.K3","Appropriate airplane configuration."),
        K("CA.IV.G.K4","Effects of water surface.")
      ],
      [
        R("CA.IV.G.R1","Selection of takeoff path based on pilot capability, airplane performance and limitations, available distance, and wind."),
        R("CA.IV.G.R2","Effects of:"),
        R("CA.IV.G.R2a","a. Crosswind"),
        R("CA.IV.G.R2b","b. Windshear"),
        R("CA.IV.G.R2c","c. Tailwind"),
        R("CA.IV.G.R2d","d. Wake turbulence"),
        R("CA.IV.G.R2e","e. Water surface/condition"),
        R("CA.IV.G.R3","Abnormal operations, including planning for:"),
        R("CA.IV.G.R3a","a. Rejected takeoff"),
        R("CA.IV.G.R3b","b. Potential engine failure in takeoff/climb phase of flight"),
        R("CA.IV.G.R4","Collision hazards."),
        R("CA.IV.G.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.IV.G.R6","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("CA.IV.G.S1","Complete the appropriate checklist(s)."),
        S("CA.IV.G.S2","Make radio calls as appropriate."),
        S("CA.IV.G.S3","Verify assigned/correct takeoff path."),
        S("CA.IV.G.S4","Determine wind direction with or without visible wind direction indicators."),
        S("CA.IV.G.S5","Position the flight controls for the existing wind, if applicable."),
        S("CA.IV.G.S6","Clear the area, taxi into takeoff position utilizing maximum available takeoff area, and align the airplane on the takeoff path."),
        S("CA.IV.G.S6a","a. Retract the water rudders, as appropriate"),
        S("CA.IV.G.S7","Advance the throttle smoothly to takeoff power and confirm proper engine and flight instrument indications prior to rotation."),
        S("CA.IV.G.S8","Establish a pitch attitude that maintains the most efficient planing/lift-off attitude and correct for porpoising and skipping."),
        S("CA.IV.G.S9","Avoid excessive water spray on the propeller(s)."),
        S("CA.IV.G.S10","Rotate and lift off at the recommended airspeed, and accelerate to the recommended obstacle clearance airspeed or VX."),
        S("CA.IV.G.S11","Establish a pitch attitude to maintain the recommended obstacle clearance airspeed or VX, ±5 knots until the obstacle is cleared or until the airplane is 50 feet above the surface."),
        S("CA.IV.G.S12","Establish a pitch attitude for VY and accelerate to VY ±5 knots after clearing the obstacle or at 50 feet above ground level (AGL) if simulating an obstacle."),
        S("CA.IV.G.S13","Retract flaps, if extended, after a positive rate of climb has been verified or in accordance with airplane manufacturer’s guidance."),
        S("CA.IV.G.S14","Maintain VY ±5 knots to a safe maneuvering altitude."),
        S("CA.IV.G.S15","Maintain directional control and proper wind-drift correction throughout takeoff and climb."),
        S("CA.IV.G.S16","Comply with noise abatement procedures, as applicable.")
      ],
      ["ASES","AMES"]
    ),

    T("H","IV_H","Confined Area Approach and Landing","CA.IV.H",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with confined area approach and landing.",
      [
        K("CA.IV.H.K1","A stabilized approach, including energy management concepts."),
        K("CA.IV.H.K2","Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("CA.IV.H.K3","Wind correction techniques on approach and landing.")
      ],
      [
        R("CA.IV.H.R1","Selection of approach path and touchdown area based on pilot capability, airplane performance and limitations, available distance, and wind."),
        R("CA.IV.H.R2","Effects of:"),
        R("CA.IV.H.R2a","a. Crosswind"),
        R("CA.IV.H.R2b","b. Windshear"),
        R("CA.IV.H.R2c","c. Tailwind"),
        R("CA.IV.H.R2d","d. Wake turbulence"),
        R("CA.IV.H.R2e","e. Water surface/condition"),
        R("CA.IV.H.R3","Planning for a go-around and rejected landing."),
        R("CA.IV.H.R4","Collision hazards."),
        R("CA.IV.H.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.IV.H.R6","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("CA.IV.H.S1","Complete the appropriate checklist(s)."),
        S("CA.IV.H.S2","Make radio calls as appropriate."),
        S("CA.IV.H.S3","Ensure the airplane is aligned for an approach to the correct/assigned landing surface."),
        S("CA.IV.H.S4","Scan the landing area for traffic and obstructions."),
        S("CA.IV.H.S5","Select and aim for a suitable touchdown point considering the wind conditions, landing surface, and obstructions."),
        S("CA.IV.H.S6","Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("CA.IV.H.S7","Maintain manufacturer’s published approach airspeed or in its absence not more than 1.3 VSO, +10/-5 knots with gust factor applied."),
        S("CA.IV.H.S8","Maintain directional control and appropriate crosswind correction throughout the approach and landing."),
        S("CA.IV.H.S9","Make smooth, timely, and correct control application before, during, and after touchdown."),
        S("CA.IV.H.S10","Contact the water at the recommended airspeed with a proper pitch attitude for the surface conditions."),
        S("CA.IV.H.S11","Touch down at a proper pitch attitude, within 100 feet beyond or on the specified point, with no side drift, minimum float, and with the airplane’s longitudinal axis aligned with the projected landing path."),
        S("CA.IV.H.S12","Execute a timely go-around if the approach cannot be made within the tolerances specified above or for any other condition that may result in an unsafe approach or landing."),
        S("CA.IV.H.S13","Apply elevator control as necessary to stop in the shortest distance consistent with safety.")
      ],
      ["ASES","AMES"]
    ),

    T("I","IV_I","Glassy Water Takeoff and Climb","CA.IV.I",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with glassy water takeoff and climb.",
      [
        K("CA.IV.I.K1","Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
        K("CA.IV.I.K2","Best angle of climb speed (VX) and best rate of climb speed (VY)."),
        K("CA.IV.I.K3","Appropriate airplane configuration."),
        K("CA.IV.I.K4","Appropriate use of glassy water takeoff and climb technique.")
      ],
      [
        R("CA.IV.I.R1","Selection of takeoff path based on pilot capability, airplane performance and limitations, and available distance."),
        R("CA.IV.I.R2","Water surface/condition."),
        R("CA.IV.I.R3","Abnormal operations, including planning for:"),
        R("CA.IV.I.R3a","a. Rejected takeoff"),
        R("CA.IV.I.R3b","b. Potential engine failure in takeoff/climb phase of flight"),
        R("CA.IV.I.R4","Collision hazards."),
        R("CA.IV.I.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.IV.I.R6","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.IV.I.R7","Gear position in an amphibious airplane.")
      ],
      [
        S("CA.IV.I.S1","Complete the appropriate checklist(s)."),
        S("CA.IV.I.S2","Make radio calls as appropriate."),
        S("CA.IV.I.S3","Position flight controls and configure the aircraft for the existing conditions."),
        S("CA.IV.I.S4","Clear the area, select appropriate takeoff path considering surface hazards or vessels and surface conditions."),
        S("CA.IV.I.S4a","a. Retract the water rudders, as appropriate"),
        S("CA.IV.I.S4b","b. Advance the throttle smoothly to takeoff power and confirm proper engine and flight instrument indications prior to rotation"),
        S("CA.IV.I.S5","[Archived]"),
        S("CA.IV.I.S6","Establish and maintain an appropriate planing attitude, directional control, and correct for porpoising, skipping, and increase in water drag."),
        S("CA.IV.I.S7","Avoid excessive water spray on the propeller(s)."),
        S("CA.IV.I.S8","Use appropriate techniques to lift seaplane from the water considering surface conditions."),
        S("CA.IV.I.S9","Establish proper attitude/airspeed and accelerate to VY ±5 knots during the climb."),
        S("CA.IV.I.S10","Configure the airplane after a positive rate of climb has been verified or in accordance with airplane manufacturer’s instructions."),
        S("CA.IV.I.S11","Maintain VY ±5 knots to a safe maneuvering altitude."),
        S("CA.IV.I.S12","Maintain directional control throughout takeoff and climb.")
      ],
      ["ASES","AMES"]
    ),

    T("J","IV_J","Glassy Water Approach and Landing","CA.IV.J",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with glassy water approach and landing.",
      [
        K("CA.IV.J.K1","A stabilized approach, including energy management concepts."),
        K("CA.IV.J.K2","Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("CA.IV.J.K3","When and why glassy water techniques are used."),
        K("CA.IV.J.K4","How a glassy water approach and landing is executed.")
      ],
      [
        R("CA.IV.J.R1","Selection of approach path and touchdown area based on pilot capability, airplane performance and limitations, and available distance."),
        R("CA.IV.J.R2","Water surface/condition."),
        R("CA.IV.J.R3","Planning for a go-around and rejected landing."),
        R("CA.IV.J.R4","Collision hazards."),
        R("CA.IV.J.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.IV.J.R6","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.IV.J.R7","Gear position in an amphibious airplane.")
      ],
      [
        S("CA.IV.J.S1","Complete the appropriate checklist(s)."),
        S("CA.IV.J.S2","Make radio calls as appropriate."),
        S("CA.IV.J.S3","Scan the landing area for traffic and obstructions."),
        S("CA.IV.J.S4","Select a proper approach and landing path considering the landing surface, visual attitude references, water depth, and collision hazards."),
        S("CA.IV.J.S5","Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("CA.IV.J.S6","Maintain manufacturer’s published approach airspeed or in its absence not more than 1.3 VSO, ±5 knots."),
        S("CA.IV.J.S7","Make smooth, timely, and correct power and control adjustments to maintain proper pitch attitude and rate of descent to touchdown."),
        S("CA.IV.J.S8","Contact the water in a proper pitch attitude, and slow to idle taxi speed."),
        S("CA.IV.J.S9","Maintain directional control throughout the approach and landing.")
      ],
      ["ASES","AMES"]
    ),

    T("K","IV_K","Rough Water Takeoff and Climb","CA.IV.K",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with rough water takeoff and climb.",
      [
        K("CA.IV.K.K1","Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
        K("CA.IV.K.K2","Best angle of climb speed (VX) and best rate of climb speed (VY)."),
        K("CA.IV.K.K3","Appropriate airplane configuration."),
        K("CA.IV.K.K4","Appropriate use of rough water takeoff and climb technique.")
      ],
      [
        R("CA.IV.K.R1","Selection of takeoff path based on pilot capability, airplane performance and limitations, available distance, and wind."),
        R("CA.IV.K.R2","Effects of:"),
        R("CA.IV.K.R2a","a. Crosswind"),
        R("CA.IV.K.R2b","b. Windshear"),
        R("CA.IV.K.R2c","c. Tailwind"),
        R("CA.IV.K.R2d","d. Wake turbulence"),
        R("CA.IV.K.R2e","e. Water surface/condition"),
        R("CA.IV.K.R3","Abnormal operations, including planning for:"),
        R("CA.IV.K.R3a","a. Rejected takeoff"),
        R("CA.IV.K.R3b","b. Potential engine failure in takeoff/climb phase of flight"),
        R("CA.IV.K.R4","Collision hazards."),
        R("CA.IV.K.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.IV.K.R6","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.IV.K.R7","Gear position in an amphibious airplane.")
      ],
      [
        S("CA.IV.K.S1","Complete the appropriate checklist(s)."),
        S("CA.IV.K.S2","Make radio calls as appropriate."),
        S("CA.IV.K.S3","Verify assigned/correct takeoff path."),
        S("CA.IV.K.S4","Determine wind direction with or without visible wind direction indicators."),
        S("CA.IV.K.S5","Position flight controls and configure the airplane for the existing conditions."),
        S("CA.IV.K.S6","Clear the area, select an appropriate takeoff path considering wind, swells, surface hazards, or vessels."),
        S("CA.IV.K.S6a","a. Retract the water rudders, as appropriate"),
        S("CA.IV.K.S6b","b. Advance the throttle smoothly to takeoff power and confirm proper engine and flight instrument indications prior to rotation"),
        S("CA.IV.K.S7","[Archived]"),
        S("CA.IV.K.S8","Establish and maintain an appropriate planing attitude, directional control, and correct for porpoising, skipping, and increase in water drag."),
        S("CA.IV.K.S9","Avoid excessive water spray on the propeller(s)."),
        S("CA.IV.K.S10","Lift off at minimum airspeed and accelerate to VY ±5 knots before leaving ground effect."),
        S("CA.IV.K.S11","Configure the airplane after a positive rate of climb has been verified or in accordance with airplane manufacturer’s instructions."),
        S("CA.IV.K.S12","Maintain VY ±5 knots to a safe maneuvering altitude."),
        S("CA.IV.K.S13","Maintain directional control and proper wind-drift correction throughout takeoff and climb.")
      ],
      ["ASES","AMES"]
    )    ,

    T("L","IV_L","Rough Water Approach and Landing","CA.IV.L",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with rough water approach and landing.",
      [
        K("CA.IV.L.K1","A stabilized approach, including energy management concepts."),
        K("CA.IV.L.K2","Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("CA.IV.L.K3","Wind correction techniques on approach and landing."),
        K("CA.IV.L.K4","When and why rough water techniques are used."),
        K("CA.IV.L.K5","How to perform a proper rough water approach and landing.")
      ],
      [
        R("CA.IV.L.R1","Selection of approach path and touchdown area based on pilot capability, airplane performance and limitations, available distance, and wind."),
        R("CA.IV.L.R2","Effects of:"),
        R("CA.IV.L.R2a","a. Crosswind"),
        R("CA.IV.L.R2b","b. Windshear"),
        R("CA.IV.L.R2c","c. Tailwind"),
        R("CA.IV.L.R2d","d. Wake turbulence"),
        R("CA.IV.L.R2e","e. Water surface/condition"),
        R("CA.IV.L.R3","Planning for a go-around and rejected landing."),
        R("CA.IV.L.R4","Collision hazards."),
        R("CA.IV.L.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.IV.L.R6","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.IV.L.R7","Gear position in an amphibious airplane.")
      ],
      [
        S("CA.IV.L.S1","Complete the appropriate checklist(s)."),
        S("CA.IV.L.S2","Make radio calls as appropriate."),
        S("CA.IV.L.S3","Ensure the airplane is aligned with the correct/assigned waterway."),
        S("CA.IV.L.S4","Scan the landing area for traffic and obstructions."),
        S("CA.IV.L.S5","Select and aim for a suitable touchdown point considering the wind conditions, landing surface, and obstructions."),
        S("CA.IV.L.S6","Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("CA.IV.L.S7","Maintain manufacturer’s published approach airspeed or in its absence not more than 1.3 times the stalling speed or the minimum steady flight speed in the landing configuration (VSO), ±5 knots with gust factor applied."),
        S("CA.IV.L.S8","Maintain directional control and appropriate crosswind correction throughout the approach and landing."),
        S("CA.IV.L.S9","Make smooth, timely, and correct power and control adjustments to maintain proper pitch attitude and rate of descent to touchdown."),
        S("CA.IV.L.S10","Contact the water in a proper pitch attitude, considering the type of rough water.")
      ],
      ["ASES","AMES"]
    ),

    T("M","IV_M","Power-Off 180° Accuracy Approach and Landing","CA.IV.M",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with power-off 180° accuracy approach and landing.",
      [
        K("CA.IV.M.K1","A stabilized approach, including energy management concepts."),
        K("CA.IV.M.K2","Effects of atmospheric conditions, including wind, on approach and landing."),
        K("CA.IV.M.K3","Wind correction techniques on approach and landing."),
        K("CA.IV.M.K4","Purpose of power-off accuracy approach.")
      ],
      [
        R("CA.IV.M.R1","Selection of runway/landing surface, approach path, and touchdown area based on pilot capability, aircraft performance and limitations, available distance, and wind."),
        R("CA.IV.M.R2","Effects of:"),
        R("CA.IV.M.R2a","a. Crosswind"),
        R("CA.IV.M.R2b","b. Windshear"),
        R("CA.IV.M.R2c","c. Tailwind"),
        R("CA.IV.M.R2d","d. Wake turbulence"),
        R("CA.IV.M.R2e","e. Landing surface/condition"),
        R("CA.IV.M.R3","Planning for:"),
        R("CA.IV.M.R3a","a. Rejected landing and go-around"),
        R("CA.IV.M.R3b","b. Land and hold short operations (LAHSO)"),
        R("CA.IV.M.R4","Collision hazards."),
        R("CA.IV.M.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.IV.M.R6","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.IV.M.R7","Forward slip operations, including fuel flowage, tail stalls with flaps, and airspeed control.")
      ],
      [
        S("CA.IV.M.S1","Complete the appropriate checklist(s)."),
        S("CA.IV.M.S2","Make radio calls as appropriate."),
        S("CA.IV.M.S3","Plan and follow a flightpath to the selected landing area considering altitude, wind, terrain, and obstructions."),
        S("CA.IV.M.S4","Select the most suitable touchdown point based on wind, landing surface, obstructions, and aircraft limitations."),
        S("CA.IV.M.S5","Position airplane on downwind leg, parallel to landing runway."),
        S("CA.IV.M.S6","Correctly configure the airplane."),
        S("CA.IV.M.S7","As necessary, correlate crosswind with direction of forward slip and transition to side slip before touchdown."),
        S("CA.IV.M.S8","Touch down at a proper pitch attitude, within 200 feet beyond or on the specified point with no side drift and with the airplane’s longitudinal axis aligned with and over the runway centerline or landing path, as applicable.")
      ],
      ["ASEL","ASES"]
    ),

    T("N","IV_N","Go-Around/Rejected Landing","CA.IV.N",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with go-around/rejected landing with emphasis on factors that contribute to landing conditions that may require a go-around.",
      [
        K("CA.IV.N.K1","A stabilized approach, including energy management concepts."),
        K("CA.IV.N.K2","Effects of atmospheric conditions, including wind and density altitude, on a go-around or rejected landing."),
        K("CA.IV.N.K3","Wind correction techniques on takeoff/departure and approach/landing."),
        K("CA.IV.N.K4","Go-around/rejected landing procedures, the importance of a timely decision, and appropriate airspeeds for the maneuver.")
      ],
      [
        R("CA.IV.N.R1","Delayed recognition of the need for a go-around/rejected landing."),
        R("CA.IV.N.R2","Delayed performance of a go-around at low altitude."),
        R("CA.IV.N.R3","Power application."),
        R("CA.IV.N.R4","Configuring the airplane."),
        R("CA.IV.N.R5","Collision hazards."),
        R("CA.IV.N.R6","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.IV.N.R7","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.IV.N.R8","Runway incursion."),
        R("CA.IV.N.R9","Managing a go-around/rejected landing after accepting a LAHSO clearance.")
      ],
      [
        S("CA.IV.N.S1","Complete the appropriate checklist(s)."),
        S("CA.IV.N.S2","Make radio calls as appropriate."),
        S("CA.IV.N.S3","Make a timely decision to discontinue the approach to landing."),
        S("CA.IV.N.S4","Apply takeoff power immediately and transition to climb pitch attitude for VX or VY as appropriate ±5 knots."),
        S("CA.IV.N.S5","Configure the airplane after a positive rate of climb has been verified or in accordance with airplane manufacturer’s instructions."),
        S("CA.IV.N.S6","Maneuver to the side of the runway/landing area when necessary to clear and avoid conflicting traffic."),
        S("CA.IV.N.S7","Maintain VY ±5 knots to a safe maneuvering altitude."),
        S("CA.IV.N.S8","Maintain directional control and proper wind-drift correction throughout the climb."),
        S("CA.IV.N.S9","Use runway incursion avoidance procedures, if applicable.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
    ]
  },

  {
    id: "V",
    roman: "V",
    title: "Performance Maneuvers and Ground Reference Maneuvers",
    phase: "flight",
    tasks: [
      T("A","V_A","Steep Turns","CA.V.A",
        "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with steep turns.",
        [
          K("CA.V.A.K1","How to conduct a proper steep turn."),
          K("CA.V.A.K2","Aerodynamics associated with steep turns, including:"),
          K("CA.V.A.K2a","Maintaining coordinated flight"),
          K("CA.V.A.K2b","Overbanking tendencies"),
          K("CA.V.A.K2c","Maneuvering speed, including the impact of weight changes"),
          K("CA.V.A.K2d","Load factor and accelerated stalls"),
          K("CA.V.A.K2e","Rate and radius of turn")
        ],
        [
          R("CA.V.A.R1","Division of attention between aircraft control and orientation."),
          R("CA.V.A.R2","Collision hazards."),
          R("CA.V.A.R3","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
          R("CA.V.A.R4","Distractions, task prioritization, loss of situational awareness, or disorientation."),
          R("CA.V.A.R5","Uncoordinated flight.")
        ],
        [
          S("CA.V.A.S1","Clear the area."),
          S("CA.V.A.S2","Establish the manufacturer's recommended airspeed; or if one is not available, an airspeed not to exceed maneuvering speed (VA)."),
          S("CA.V.A.S3","Roll into a coordinated 360° steep turn with approximately a 50° bank."),
          S("CA.V.A.S4","Perform the Task in the opposite direction."),
          S("CA.V.A.S5","Maintain the entry altitude ±100 feet, airspeed ±10 knots, bank ±5°, and roll out on the entry heading ±10°.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("B","V_B","Steep Spiral","CA.V.B",
        "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with steep spirals.",
        [
          K("CA.V.B.K1","Relationship to emergency landing procedures."),
          K("CA.V.B.K2","Maintaining a constant radius about a point."),
          K("CA.V.B.K3","Effects of wind on ground track and relation to a ground reference.")
        ],
        [
          R("CA.V.B.R1","Division of attention between aircraft control and orientation."),
          R("CA.V.B.R2","Collision hazards."),
          R("CA.V.B.R3","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
          R("CA.V.B.R4","Distractions, task prioritization, loss of situational awareness, or disorientation."),
          R("CA.V.B.R5","Uncoordinated flight."),
          R("CA.V.B.R6","Effects of wind."),
          R("CA.V.B.R7","Airframe or airspeed limitations.")
        ],
        [
          S("CA.V.B.S1","Clear the area."),
          S("CA.V.B.S2","Select an altitude sufficient to continue through a series of at least three, 360° turns."),
          S("CA.V.B.S3","Establish and maintain a steep spiral, not to exceed 60° angle of bank, to maintain a constant radius about a suitable ground reference point."),
          S("CA.V.B.S4","Apply wind-drift correction to track a constant radius circle around selected reference point with bank not to exceed 60° a steepest point in turn."),
          S("CA.V.B.S5","Divide attention between airplane control, traffic avoidance and the ground track while maintaining coordinated flight."),
          S("CA.V.B.S6","Maintain the specified airspeed, ±10 knots and roll out toward an object or specified heading, ±10°, and complete the maneuver no lower than 1,500 feet above ground level (AGL).")
        ],
        ["ASEL","ASES"]
      ),

      T("C","V_C","Chandelles","CA.V.C",
        "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with chandelles.",
        [
          K("CA.V.C.K1","How to conduct proper chandelles."),
          K("CA.V.C.K2","Aerodynamics associated with chandelles, including:"),
          K("CA.V.C.K2a","Maintaining coordinated flight"),
          K("CA.V.C.K2b","Overbanking tendencies"),
          K("CA.V.C.K2c","Maneuvering speed, including the impact of weight changes"),
          K("CA.V.C.K2d","Accelerated stalls"),
          K("CA.V.C.K3","Appropriate airplane configuration for maximum performance climb."),
          K("CA.V.C.K4","Proper pitch control required for continuously decreasing airspeed.")
        ],
        [
          R("CA.V.C.R1","Division of attention between aircraft control and orientation."),
          R("CA.V.C.R2","Collision hazards."),
          R("CA.V.C.R3","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
          R("CA.V.C.R4","Distractions, task prioritization, loss of situational awareness, or disorientation."),
          R("CA.V.C.R5","Uncoordinated flight."),
          R("CA.V.C.R6","Energy management."),
          R("CA.V.C.R7","Rate and radius of turn with confined area operations.")
        ],
        [
          S("CA.V.C.S1","Clear the area."),
          S("CA.V.C.S2","Select an altitude that allows the maneuver to be performed no lower than 1,500 feet above ground level (AGL)."),
          S("CA.V.C.S3","Establish the appropriate entry configuration, power, and airspeed."),
          S("CA.V.C.S4","Establish the angle of bank at approximately 30°."),
          S("CA.V.C.S5","Simultaneously apply power and pitch to maintain a smooth, coordinated climbing turn, in either direction, to the 90° point, with a constant bank and continuously decreasing airspeed."),
          S("CA.V.C.S6","Begin a coordinated constant rate rollout from the 90° point to the 180° point maintaining power and a constant pitch attitude."),
          S("CA.V.C.S7","Complete rollout at the 180° point, ±10° just above a stall airspeed, and maintaining that airspeed momentarily avoiding a stall."),
          S("CA.V.C.S8","Resume a straight-and-level flight with minimum loss of altitude.")
        ],
        ["ASEL","ASES"]
      ),

      T("D","V_D","Lazy Eights","CA.V.D",
        "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with lazy eights.",
        [
          K("CA.V.D.K1","How to conduct proper lazy eights."),
          K("CA.V.D.K2","Aerodynamics associated with lazy eights, including how to maintain coordinated flight."),
          K("CA.V.D.K3","Performance and airspeed limitations."),
          K("CA.V.D.K4","Phases of the lazy eight maneuver from entry to recovery.")
        ],
        [
          R("CA.V.D.R1","Division of attention between aircraft control and orientation."),
          R("CA.V.D.R2","Collision hazards."),
          R("CA.V.D.R3","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
          R("CA.V.D.R4","Distractions, task prioritization, loss of situational awareness, or disorientation."),
          R("CA.V.D.R5","Uncoordinated flight."),
          R("CA.V.D.R6","Energy management."),
          R("CA.V.D.R7","Accelerated stalls.")
        ],
        [
          S("CA.V.D.S1","Clear the area."),
          S("CA.V.D.S2","Select an altitude that allows the maneuver to be performed no lower than 1,500 feet above ground level (AGL)."),
          S("CA.V.D.S3","Establish the recommended entry configuration, power, and airspeed."),
          S("CA.V.D.S4","Maintain coordinated flight throughout the maneuver."),
          S("CA.V.D.S5","Complete the maneuver in accordance with the following:"),
          S("CA.V.D.S5a","Approximately 30° bank at the steepest point"),
          S("CA.V.D.S5b","Constant change of pitch and roll rate and airspeed"),
          S("CA.V.D.S5c","Altitude at 180° point, ±100 feet from entry altitude"),
          S("CA.V.D.S5d","Airspeed at the 180° point, ±10 knots from entry airspeed"),
          S("CA.V.D.S5e","Heading at the 180° point, ±10°"),
          S("CA.V.D.S6","Continue the maneuver through the number of symmetrical loops specified, then resume straight-and-level flight.")
        ],
        ["ASEL","ASES"]
      ),

      T("E","V_E","Eights on Pylons","CA.V.E",
        "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with eights on pylons.",
        [
          K("CA.V.E.K1","Purpose of eights on pylons."),
          K("CA.V.E.K2","Aerodynamics associated with the eights on pylons, including coordinated and uncoordinated flight."),
          K("CA.V.E.K3","Pivotal altitude and factors that affect it."),
          K("CA.V.E.K4","Effect of wind on ground track."),
          K("CA.V.E.K5","Phases of the eights on pylons maneuver from entry to recovery.")
        ],
        [
          R("CA.V.E.R1","Division of attention between aircraft control and orientation."),
          R("CA.V.E.R2","Collision hazards."),
          R("CA.V.E.R3","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
          R("CA.V.E.R4","Distractions, task prioritization, loss of situational awareness, or disorientation."),
          R("CA.V.E.R5","Uncoordinated flight."),
          R("CA.V.E.R6","Energy management."),
          R("CA.V.E.R7","Emergency landing considerations.")
        ],
        [
          S("CA.V.E.S1","Clear the area."),
          S("CA.V.E.S2","Determine the approximate pivotal altitude."),
          S("CA.V.E.S3","Select suitable pylons that permits straight-and-level flight between the pylons."),
          S("CA.V.E.S4","Enter the maneuver in the correct direction and position using an appropriate altitude and airspeed."),
          S("CA.V.E.S5","Establish the correct bank angle for the conditions, not to exceed 40°."),
          S("CA.V.E.S6","Apply smooth and continuous corrections so that the line-of-sight reference line remains on the pylon."),
          S("CA.V.E.S7","Divide attention between accurate, coordinated airplane control and outside visual references."),
          S("CA.V.E.S8","Maintain pylon position using appropriate pivotal altitude, avoiding slips and skids.")
        ],
         ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},

{
  id: "VI",
  roman: "VI",
  title: "Navigation",
  phase: "flight",
  tasks: [
    T("A","VI_A","Pilotage and Dead Reckoning","CA.VI.A",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with pilotage and dead reckoning.",
      [
        K("CA.VI.A.K1","Pilotage and dead reckoning."),
        K("CA.VI.A.K2","Magnetic compass errors."),
        K("CA.VI.A.K3","Topography."),
        K("CA.VI.A.K4","Selection of appropriate:"),
        K("CA.VI.A.K4a","a. Route"),
        K("CA.VI.A.K4b","b. Altitude(s)"),
        K("CA.VI.A.K4c","c. Checkpoints"),
        K("CA.VI.A.K5","Plotting a course, including:"),
        K("CA.VI.A.K5a","a. Determining heading, speed, and course"),
        K("CA.VI.A.K5b","b. Wind correction angle"),
        K("CA.VI.A.K5c","c. Estimating time, speed, and distance"),
        K("CA.VI.A.K5d","d. True airspeed and density altitude"),
        K("CA.VI.A.K6","Power setting selection."),
        K("CA.VI.A.K7","Planned calculations versus actual results and required corrections.")
      ],
      [
        R("CA.VI.A.R1","Collision hazards."),
        R("CA.VI.A.R2","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.VI.A.R3","Unplanned fuel/power consumption, if applicable.")
      ],
      [
        S("CA.VI.A.S1","Prepare and use a flight log."),
        S("CA.VI.A.S2","Navigate by pilotage."),
        S("CA.VI.A.S3","Navigate by means of pre-computed headings, groundspeeds, elapsed time, and reference to landmarks or checkpoints."),
        S("CA.VI.A.S4","Use the magnetic direction indicator in navigation, including turns to headings."),
        S("CA.VI.A.S5","Verify position within two nautical miles of the flight-planned route."),
        S("CA.VI.A.S6","Arrive at the en route checkpoints within three minutes of the initial or revised estimated time of arrival (ETA) and provide a destination estimate."),
        S("CA.VI.A.S7","Maintain the selected altitude, ±100 feet and heading, ±10°.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","VI_B","Navigation Systems and Radar Services","CA.VI.B",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with navigation systems and radar services.",
      [
        K("CA.VI.B.K1","Ground-based navigation (identification, orientation, course determination, equipment, tests, regulations, interference, appropriate use of navigation data, and signal integrity)."),
        K("CA.VI.B.K2","Satellite-based navigation (e.g., equipment, regulations, authorized use of databases, and Receiver Autonomous Integrity Monitoring (RAIM))."),
        K("CA.VI.B.K3","Radar assistance to visual flight rules (VFR) aircraft (e.g., operations, equipment, available services, traffic advisories)."),
        K("CA.VI.B.K4","Transponder (Mode(s) A, C, and S) and Automatic Dependent Surveillance-Broadcast (ADS-B).")
      ],
      [
        R("CA.VI.B.R1","Management of automated navigation and autoflight systems."),
        R("CA.VI.B.R2","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.VI.B.R3","Limitations of the navigation system in use."),
        R("CA.VI.B.R4","Loss of a navigation signal."),
        R("CA.VI.B.R5","Use of an electronic flight bag (EFB), if used.")
      ],
      [
        S("CA.VI.B.S1","Use an airborne electronic navigation system."),
        S("CA.VI.B.S2","Determine the airplane’s position using the navigation system."),
        S("CA.VI.B.S3","Intercept and track a given course, radial, or bearing."),
        S("CA.VI.B.S4","Recognize and describe the indication of station or waypoint passage."),
        S("CA.VI.B.S5","Recognize signal loss or interference and take appropriate action, if applicable."),
        S("CA.VI.B.S6","Use proper communication procedures when utilizing radar services."),
        S("CA.VI.B.S7","Maintain the appropriate altitude, ±100 feet and heading, ±10°.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("C","VI_C","Diversion","CA.VI.C",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with diversion.",
      [
        K("CA.VI.C.K1","Selecting an alternate destination."),
        K("CA.VI.C.K2","Situations that require deviations from flight plan or air traffic control (ATC) instructions.")
      ],
      [
        R("CA.VI.C.R1","Collision hazards."),
        R("CA.VI.C.R2","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.VI.C.R3","Circumstances that would make diversion prudent."),
        R("CA.VI.C.R4","Selecting an appropriate airport or seaplane base."),
        R("CA.VI.C.R5","Using available resources (e.g., automation, ATC, and flight deck planning aids).")
      ],
      [
        S("CA.VI.C.S1","Select a suitable destination and route for diversion."),
        S("CA.VI.C.S2","Make a reasonable estimate of heading, groundspeed, arrival time, and fuel required to the “divert to” destination."),
        S("CA.VI.C.S3","Maintain the appropriate altitude, ±100 feet and heading, ±10°."),
        S("CA.VI.C.S4","Update/interpret weather in flight."),
        S("CA.VI.C.S5","Use displays of digital weather and aeronautical information, as applicable to maintain situational awareness."),
        S("CA.VI.C.S6","Promptly divert toward the destination.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("D","VI_D","Lost Procedures","CA.VI.D",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with lost procedures and can take appropriate steps to achieve a satisfactory outcome if lost.",
      [
        K("CA.VI.D.K1","Methods to determine position."),
        K("CA.VI.D.K2","Assistance available if lost (e.g., radar services, communication procedures).")
      ],
      [
        R("CA.VI.D.R1","Collision hazards."),
        R("CA.VI.D.R2","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.VI.D.R3","Recording times over waypoints."),
        R("CA.VI.D.R4","When to seek assistance or declare an emergency in a deteriorating situation.")
      ],
      [
        S("CA.VI.D.S1","Use an appropriate method to determine position."),
        S("CA.VI.D.S2","Maintain an appropriate heading and climb as necessary."),
        S("CA.VI.D.S3","Identify prominent landmarks."),
        S("CA.VI.D.S4","Use navigation systems/facilities or contact an ATC facility for assistance."),
        S("CA.VI.D.S5","Select an appropriate course of action.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},

{
  id: "VII",
  roman: "VII",
  title: "Slow Flight and Stalls",
  phase: "flight",
  tasks: [
    T("A","VII_A","Maneuvering During Slow Flight","CA.VII.A",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with maneuvering during slow flight in cruise configuration.",
      [
        K("CA.VII.A.K1","Aerodynamics associated with slow flight in various airplane configurations, including the relationship between angle of attack, airspeed, load factor, power setting, airplane weight and center of gravity, airplane attitude, and yaw effects.")
      ],
      [
        R("CA.VII.A.R1","Inadvertent slow flight and flight with a stall warning, which could lead to loss of control."),
        R("CA.VII.A.R2","Range and limitations of stall warning indicators (e.g., aircraft buffet, stall horn, etc.)."),
        R("CA.VII.A.R3","Uncoordinated flight."),
        R("CA.VII.A.R4","Effect of environmental elements on airplane performance (e.g., turbulence, microbursts, and high-density altitude)."),
        R("CA.VII.A.R5","Collision hazards."),
        R("CA.VII.A.R6","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("CA.VII.A.S1","Clear the area."),
        S("CA.VII.A.S2","Select an entry altitude that allows the Task to be completed no lower than 1,500 feet above ground level (AGL) (ASEL, ASES) or 3,000 feet AGL (AMEL, AMES)."),
        S("CA.VII.A.S3","Establish and maintain an airspeed at which any further increase in angle of attack, increase in load factor, or reduction in power, would result in a stall warning (e.g., aircraft buffet, stall horn, etc.)."),
        S("CA.VII.A.S4","Accomplish coordinated straight-and-level flight, turns, climbs, and descents with the aircraft configured as specified by the evaluator without a stall warning (e.g., aircraft buffet, stall horn, etc.)."),
        S("CA.VII.A.S5","Maintain the specified altitude, ±50 feet; specified heading, ±10°; airspeed, +5/-0 knots; and specified angle of bank, ±5°.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","VII_B","Power-Off Stalls","CA.VII.B",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with power-off stalls.",
      [
        K("CA.VII.B.K1","Aerodynamics associated with stalls in various airplane configurations, including the relationship between angle of attack, airspeed, load factor, power setting, airplane weight and center of gravity, airplane attitude, and yaw effects."),
        K("CA.VII.B.K2","Stall characteristics as they relate to airplane design, and recognition impending stall and full stall indications using sight, sound, or feel."),
        K("CA.VII.B.K3","Factors and situations that can lead to a power-off stall and actions that can be taken to prevent it."),
        K("CA.VII.B.K4","Fundamentals of stall recovery.")
      ],
      [
        R("CA.VII.B.R1","Factors and situations that could lead to an inadvertent power-off stall, spin, and loss of control."),
        R("CA.VII.B.R2","Range and limitations of stall warning indicators (e.g., aircraft buffet, stall horn, etc.)."),
        R("CA.VII.B.R3","Stall warning(s) during normal operations."),
        R("CA.VII.B.R4","Stall recovery procedure."),
        R("CA.VII.B.R5","Secondary stalls, accelerated stalls, and cross-control stalls."),
        R("CA.VII.B.R6","Effect of environmental elements on airplane performance related to power-off stalls (e.g., turbulence, microbursts, and high-density altitude)."),
        R("CA.VII.B.R7","Collision hazards."),
        R("CA.VII.B.R8","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("CA.VII.B.S1","Clear the area."),
        S("CA.VII.B.S2","Select an entry altitude that allows the Task to be completed no lower than 1,500 feet above ground level (AGL) (ASEL, ASES) or 3,000 feet AGL (AMEL, AMES)."),
        S("CA.VII.B.S3","Configure the airplane in the approach or landing configuration, as specified by the evaluator, and maintain coordinated flight throughout the maneuver."),
        S("CA.VII.B.S4","Establish a stabilized descent."),
        S("CA.VII.B.S5","Transition smoothly from the approach or landing attitude to a pitch attitude that induces a stall."),
        S("CA.VII.B.S6","Maintain a specified heading, ±10° if in straight flight; maintain a specified angle of bank not to exceed 20°, ±5° if in turning flight, until an impending or full stall occurs, as specified by the evaluator."),
        S("CA.VII.B.S7","Acknowledge the cues at the first indication of a stall (e.g., aircraft buffet, stall horn, etc.)."),
        S("CA.VII.B.S8","Recover at the first indication of a stall or after a full stall has occurred, as specified by the evaluator."),
        S("CA.VII.B.S9","Configure the airplane as recommended by the manufacturer, and accelerate to best angle of climb speed (VX) or best rate of climb speed (VY)."),
        S("CA.VII.B.S10","Return to the altitude, heading, and airspeed specified by the evaluator.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("C","VII_C","Power-On Stalls","CA.VII.C",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with power-on stalls.",
      [
        K("CA.VII.C.K1","Aerodynamics associated with stalls in various airplane configurations, including the relationship between angle of attack, airspeed, load factor, power setting, airplane weight and center of gravity, airplane attitude, and yaw effects."),
        K("CA.VII.C.K2","Stall characteristics as they relate to airplane design, and recognition impending stall and full stall indications using sight, sound, or feel."),
        K("CA.VII.C.K3","Factors and situations that can lead to a power-on stall and actions that can be taken to prevent it."),
        K("CA.VII.C.K4","Fundamentals of stall recovery.")
      ],
      [
        R("CA.VII.C.R1","Factors and situations that could lead to an inadvertent power-on stall, spin, and loss of control."),
        R("CA.VII.C.R2","Range and limitations of stall warning indicators (e.g., aircraft buffet, stall horn, etc.)."),
        R("CA.VII.C.R3","Stall warning(s) during normal operations."),
        R("CA.VII.C.R4","Stall recovery procedure."),
        R("CA.VII.C.R5","Secondary stalls, accelerated stalls, elevator trim stalls, and cross-control stalls."),
        R("CA.VII.C.R6","Effect of environmental elements on airplane performance related to power-on stalls (e.g., turbulence, microbursts, and high-density altitude)."),
        R("CA.VII.C.R7","Collision hazards."),
        R("CA.VII.C.R8","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("CA.VII.C.S1","Clear the area."),
        S("CA.VII.C.S2","Select an entry altitude that allows the Task to be completed no lower than 1,500 feet above ground level (AGL) (ASEL, ASES) or 3,000 feet AGL (AMEL, AMES)."),
        S("CA.VII.C.S3","Establish the takeoff, departure, or cruise configuration, as specified by the evaluator, and maintain coordinated flight throughout the maneuver."),
        S("CA.VII.C.S4","Set power to no less than 65 percent power."),
        S("CA.VII.C.S5","Transition smoothly from the takeoff or departure attitude to the pitch attitude that induces a stall."),
        S("CA.VII.C.S6","Maintain a specified heading ±10° if in straight flight; maintain a specified angle of bank not to exceed 20°, ±10° if in turning flight, until an impending or full stall is reached, as specified by the evaluator."),
        S("CA.VII.C.S7","Acknowledge the cues at the first indication of a stall (e.g., aircraft buffet, stall horn, etc.)."),
        S("CA.VII.C.S8","Recover at the first indication of a stall or after a full stall has occurred, as specified by the evaluator."),
        S("CA.VII.C.S9","Configure the airplane as recommended by the manufacturer, and accelerate to best angle of climb speed (VX) or best rate of climb speed (VY)."),
        S("CA.VII.C.S10","Return to the altitude, heading, and airspeed specified by the evaluator.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("D","VII_D","Accelerated Stalls","CA.VII.D",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with accelerated stalls (power-on or power-off).",
      [
        K("CA.VII.D.K1","Aerodynamics associated with accelerated stalls in various airplane configurations, including the relationship between angle of attack, airspeed, load factor, power setting, airplane weight and center of gravity, airplane attitude, and yaw effects."),
        K("CA.VII.D.K2","Stall characteristics as they relate to airplane design, and recognition impending stall and full stall indications using sight, sound, or feel."),
        K("CA.VII.D.K3","Factors leading to an accelerated stall and preventive actions."),
        K("CA.VII.D.K4","Fundamentals of stall recovery.")
      ],
      [
        R("CA.VII.D.R1","Factors and situations that could lead to an inadvertent accelerated stall, spin, and loss of control."),
        R("CA.VII.D.R2","Range and limitations of stall warning indicators (e.g., aircraft buffet, stall horn, etc.)."),
        R("CA.VII.D.R3","Stall warning(s) during normal operations."),
        R("CA.VII.D.R4","Stall recovery procedure."),
        R("CA.VII.D.R5","Secondary stalls, cross-control stalls, and spins."),
        R("CA.VII.D.R6","Effect of environmental elements on airplane performance related to accelerated stalls (e.g., turbulence, microbursts, and high-density altitude)."),
        R("CA.VII.D.R7","Collision hazards."),
        R("CA.VII.D.R8","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("CA.VII.D.S1","Clear the area."),
        S("CA.VII.D.S2","Select an entry altitude that allows the Task to be completed no lower than 3,000 feet above ground level (AGL)."),
        S("CA.VII.D.S3","Establish the configuration as specified by the evaluator."),
        S("CA.VII.D.S4","Set power appropriate for the configuration, such that the airspeed does not exceed the maneuvering speed (VA) or any other applicable Pilot's Operating Handbook (POH)/Airplane Flight Manual (AFM) limitation."),
        S("CA.VII.D.S5","Establish and maintain a coordinated turn in a 45° bank, increasing elevator back pressure smoothly and firmly until an impending stall is reached."),
        S("CA.VII.D.S6","Acknowledge the cues at the first indication of a stall (e.g., aircraft buffet, stall horn, etc.)."),
        S("CA.VII.D.S7","Execute a stall recovery in accordance with procedures set forth in the Pilot's Operating Handbook (POH)/Flight Manual (FM)."),
        S("CA.VII.D.S8","Configure the airplane as recommended by the manufacturer, and accelerate to best angle of climb speed (VX) or best rate of climb speed (VY)."),
        S("CA.VII.D.S9","Return to the altitude, heading, and airspeed specified by the evaluator.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("E","VII_E","Spin Awareness","CA.VII.E",
      "To determine the applicant exhibits satisfactory knowledge of the causes and procedures for recovery from unintentional spins and understands the risk associated with unintentional spins.",
      [
        K("CA.VII.E.K1","Aerodynamics associated with spins in various airplane configurations, including the relationship between angle of attack, airspeed, load factor, power setting, airplane weight and center of gravity, airplane attitude, and yaw effects."),
        K("CA.VII.E.K2","What causes a spin and how to identify the entry, incipient, and developed phases of a spin."),
        K("CA.VII.E.K3","Spin recovery procedure.")
      ],
      [
        R("CA.VII.E.R1","Factors and situations that could lead to inadvertent spin and loss of control."),
        R("CA.VII.E.R2","Range and limitations of stall warning indicators (e.g., aircraft buffet, stall horn, etc.)."),
        R("CA.VII.E.R3","Spin recovery procedure."),
        R("CA.VII.E.R4","Effect of environmental elements on airplane performance related to spins (e.g., turbulence, microbursts, and high-density altitude)."),
        R("CA.VII.E.R5","Collision hazards."),
        R("CA.VII.E.R6","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},

{
  id: "VIII",
  roman: "VIII",
  title: "High-Altitude Operations",
  phase: "ground",
  tasks: [
    T("A","VIII_A","Supplemental Oxygen","CA.VIII.A",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with flight at higher altitudes where supplemental oxygen is required or recommended.",
      [
        K("CA.VIII.A.K1","Regulatory requirements for supplemental oxygen use by flight crew and passengers."),
        K("CA.VIII.A.K2","Physiological factors, including:"),
        K("CA.VIII.A.K2a","a. Impairment"),
        K("CA.VIII.A.K2b","b. Symptoms of hypoxia"),
        K("CA.VIII.A.K2c","c. Time of useful consciousness (TUC)"),
        K("CA.VIII.A.K3","Operational factors, including:"),
        K("CA.VIII.A.K3a","a. Characteristics, limitations, and applicability of continuous flow, demand, and pressure-demand oxygen systems"),
        K("CA.VIII.A.K3b","b. Differences between and identification of “aviator’s breathing oxygen” and other types of oxygen"),
        K("CA.VIII.A.K3c","c. Precautions when using supplemental oxygen systems")
      ],
      [
        R("CA.VIII.A.R1","High altitude flight."),
        R("CA.VIII.A.R2","Use of supplemental oxygen."),
        R("CA.VIII.A.R3","Management of compressed gas containers."),
        R("CA.VIII.A.R4","Combustion hazards in an oxygen-rich environment.")
      ],
      [
        S("CA.VIII.A.S1","Determine the quantity of supplemental oxygen required in a scenario given by the evaluator."),
        S("CA.VIII.A.S2","Operate or simulate operation of the installed or portable oxygen equipment in the airplane, if installed or available."),
        S("CA.VIII.A.S3","Brief passengers on use of supplemental oxygen equipment in a scenario given by the evaluator."),
        S("CA.VIII.A.S4","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","VIII_B","Pressurization","CA.VIII.B",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with flight in pressurized aircraft at high altitudes.",
      [
        K("CA.VIII.B.K1","Fundamental concepts of aircraft pressurization system, including failure modes."),
        K("CA.VIII.B.K2","Physiological factors, including:"),
        K("CA.VIII.B.K2a","a. Impairment"),
        K("CA.VIII.B.K2b","b. Symptoms of hypoxia"),
        K("CA.VIII.B.K2c","c. Time of useful consciousness (TUC)"),
        K("CA.VIII.B.K2d","d. Effects of rapid decompression on crew and passengers")
      ],
      [
        R("CA.VIII.B.R1","High altitude flight."),
        R("CA.VIII.B.R2","Malfunction of pressurization system, if equipment is installed.")
      ],
      [
        S("CA.VIII.B.S1","Operate the pressurization system, if equipment is installed."),
        S("CA.VIII.B.S2","Respond appropriately to simulated pressurization malfunctions, if equipment is installed."),
        S("CA.VIII.B.S3","Brief passengers on use of supplemental oxygen in the case of pressurization malfunction, if equipment is installed."),
        S("CA.VIII.B.S4","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},

{
  id: "IX",
  roman: "IX",
  title: "Emergency Operations",
  phase: "flight",
  tasks: [
    T("A","IX_A","Emergency Descent","CA.IX.A",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with emergency descent.",
      [
        K("CA.IX.A.K1","Situations that would require an emergency descent (e.g., depressurization, smoke, or engine fire)."),
        K("CA.IX.A.K2","Immediate action items and emergency procedures."),
        K("CA.IX.A.K3","Airspeed, including airspeed limitations."),
        K("CA.IX.A.K4","Aircraft performance and limitations.")
      ],
      [
        R("CA.IX.A.R1","Altitude, wind, terrain, obstructions, gliding distance, and available landing distance considerations."),
        R("CA.IX.A.R2","Collision hazards."),
        R("CA.IX.A.R3","Configuring the airplane."),
        R("CA.IX.A.R4","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("CA.IX.A.S1","Clear the area."),
        S("CA.IX.A.S2","Establish and maintain the appropriate airspeed and configuration appropriate to the scenario specified by the evaluator and as covered in Pilot's Operating Handbook (POH)/Airplane Flight Manual (AFM) for the emergency descent."),
        S("CA.IX.A.S3","Maintain orientation, divide attention appropriately, and plan and execute a smooth recovery."),
        S("CA.IX.A.S4","Use bank angle between 30° and 45° to maintain positive load factors during the descent."),
        S("CA.IX.A.S5","Maintain appropriate airspeed +0/-10 knots, and level off at a specified altitude ±100 feet."),
        S("CA.IX.A.S6","Complete the appropriate checklist(s)."),
        S("CA.IX.A.S7","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","IX_B","Emergency Approach and Landing (Simulated)","CA.IX.B",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with emergency approach and landing procedures.",
      [
        K("CA.IX.B.K1","Immediate action items and emergency procedures."),
        K("CA.IX.B.K2","Airspeed, including:"),
        K("CA.IX.B.K2a","a. Importance of best glide speed and its relationship to distance"),
        K("CA.IX.B.K2b","b. Difference between best glide speed and minimum sink speed"),
        K("CA.IX.B.K2c","c. Effects of wind on glide distance"),
        K("CA.IX.B.K3","Effects of atmospheric conditions on emergency approach and landing."),
        K("CA.IX.B.K4","A stabilized approach, including energy management concepts."),
        K("CA.IX.B.K5","Emergency Locator Transmitters (ELTs) and other emergency locating devices."),
        K("CA.IX.B.K6","Air traffic control (ATC) services to aircraft in distress.")
      ],
      [
        R("CA.IX.B.R1","Altitude, wind, terrain, obstructions, gliding distance, and available landing distance considerations."),
        R("CA.IX.B.R2","Following or changing the planned flightpath to the selected landing area."),
        R("CA.IX.B.R3","Collision hazards."),
        R("CA.IX.B.R4","Configuring the airplane."),
        R("CA.IX.B.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.IX.B.R6","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("CA.IX.B.S1","Establish and maintain the recommended best glide airspeed, ±10 knots."),
        S("CA.IX.B.S2","Configure the airplane in accordance with the Pilot's Operating Handbook (POH)\\Airplane Flight Manual (AFM) and existing conditions."),
        S("CA.IX.B.S3","Select a suitable landing area considering altitude, wind, terrain, obstructions, and available glide distance."),
        S("CA.IX.B.S4","Plan and follow a flightpath to the selected landing area considering altitude, wind, terrain, and obstructions."),
        S("CA.IX.B.S5","Prepare for landing as specified by the evaluator."),
        S("CA.IX.B.S6","Complete the appropriate checklist(s).")
      ],
      ["ASEL","ASES"]
    ),

    T("C","IX_C","Systems and Equipment Malfunctions","CA.IX.C",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with system and equipment malfunctions appropriate to the airplane provided for the practical test.",
      [
        K("CA.IX.C.K1","Causes of partial or complete power loss related to the specific type of powerplant(s)."),
        K("CA.IX.C.K1a","a. [Archived]"),
        K("CA.IX.C.K1b","b. [Archived]"),
        K("CA.IX.C.K1c","c. [Archived]"),
        K("CA.IX.C.K1d","d. [Archived]"),
        K("CA.IX.C.K2","System and equipment malfunctions specific to the aircraft, including:"),
        K("CA.IX.C.K2a","a. Electrical malfunction"),
        K("CA.IX.C.K2b","b. Vacuum/pressure and associated flight instrument malfunctions"),
        K("CA.IX.C.K2c","c. Pitot-static system malfunction"),
        K("CA.IX.C.K2d","d. Electronic flight deck display malfunction"),
        K("CA.IX.C.K2e","e. Landing gear or flap malfunction"),
        K("CA.IX.C.K2f","f. Inoperative trim"),
        K("CA.IX.C.K3","Causes and remedies for smoke or fire onboard the aircraft."),
        K("CA.IX.C.K4","Any other system specific to the aircraft (e.g., supplemental oxygen, deicing)."),
        K("CA.IX.C.K5","Inadvertent door or window opening.")
      ],
      [
        R("CA.IX.C.R1","Checklist usage for a system or equipment malfunction."),
        R("CA.IX.C.R2","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.IX.C.R3","Undesired aircraft state."),
        R("CA.IX.C.R4","Startle response.")
      ],
      [
        S("CA.IX.C.S1","Determine appropriate action for simulated emergencies specified by the evaluator, from at least three of the elements or sub-elements listed in K1 through K5."),
        S("CA.IX.C.S2","Complete the appropriate checklist(s).")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("D","IX_D","Emergency Equipment and Survival Gear","CA.IX.D",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with emergency equipment, and survival gear appropriate to the airplane and environment encountered during flight.",
      [
        K("CA.IX.D.K1","Emergency Locator Transmitter (ELT) operations, limitations, and testing requirements."),
        K("CA.IX.D.K2","Fire extinguisher operations and limitations."),
        K("CA.IX.D.K3","Emergency equipment and survival gear needed for:"),
        K("CA.IX.D.K3a","a. Climate extremes (hot/cold)"),
        K("CA.IX.D.K3b","b. Mountainous terrain"),
        K("CA.IX.D.K3c","c. Overwater operations"),
        K("CA.IX.D.K4","When to deploy a ballistic parachute and associated passenger briefings, if equipped."),
        K("CA.IX.D.K5","When to activate an emergency auto-land system and brief passengers, if equipped.")
      ],
      [
        R("CA.IX.D.R1","Survival gear (water, clothing, shelter) for 48 to 72 hours."),
        R("CA.IX.D.R2","Use of a ballistic parachute system."),
        R("CA.IX.D.R3","Use of an emergency auto-land system, if installed.")
      ],
      [
        S("CA.IX.D.S1","Identify appropriate equipment and personal gear."),
        S("CA.IX.D.S2","Brief passengers on proper use of on-board emergency equipment and survival gear."),
        S("CA.IX.D.S3","Simulate ballistic parachute deployment procedures, if equipped.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("E","IX_E","Engine Failure During Takeoff Before VMC (Simulated)","CA.IX.E",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with engine failure during takeoff before minimum controllable airspeed (VMC).",
      [
        K("CA.IX.E.K1","Factors affecting minimum controllable speed (VMC)."),
        K("CA.IX.E.K2","VMC (red line) and best single-engine rate of climb airspeed (VYSE) (blue line)."),
        K("CA.IX.E.K3","Accelerate/stop distance.")
      ],
      [
        R("CA.IX.E.R1","Potential engine failure during takeoff."),
        R("CA.IX.E.R2","Configuring the airplane."),
        R("CA.IX.E.R3","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("CA.IX.E.S1","Close the throttles smoothly and promptly when a simulated engine failure occurs."),
        S("CA.IX.E.S2","Maintain directional control and apply brakes (AMEL), or flight controls (AMES), as necessary.")
      ],
      ["AMEL","AMES"]
    ),

    T("F","IX_F","Engine Failure After Liftoff (Simulated)","CA.IX.F",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with engine failure after liftoff.",
      [
        K("CA.IX.F.K1","Factors affecting minimum controllable speed (VMC)."),
        K("CA.IX.F.K2","VMC (red line), VYSE (blue line), and safe single-engine speed (VSSE)."),
        K("CA.IX.F.K3","Accelerate/stop and accelerate/go distances."),
        K("CA.IX.F.K4","How to identify, verify, feather, and secure an inoperative engine."),
        K("CA.IX.F.K5","Importance of drag reduction, including propeller feathering, gear and flap retraction, the manufacturer’s recommended control input and its relation to zero sideslip."),
        K("CA.IX.F.K6","Simulated propeller feathering and the evaluator’s zero-thrust procedures and responsibilities.")
      ],
      [
        R("CA.IX.F.R1","Potential engine failure after lift-off."),
        R("CA.IX.F.R2","Collision hazards."),
        R("CA.IX.F.R3","Configuring the airplane."),
        R("CA.IX.F.R4","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.IX.F.R5","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("CA.IX.F.S1","Promptly recognize an engine failure, maintain control, and use appropriate emergency procedures."),
        S("CA.IX.F.S2","Establish VYSE; if obstructions are present, establish best single-engine angle of climb speed (VXSE) or VMC +5 knots, whichever is greater, until obstructions are cleared. Then transition to VYSE."),
        S("CA.IX.F.S3","Reduce drag by retracting landing gear and flaps in accordance with the manufacturer’s guidance."),
        S("CA.IX.F.S4","Simulate feathering the propeller on the inoperative engine (evaluator should then establish zero thrust on the inoperative engine)."),
        S("CA.IX.F.S5","Use flight controls in the proper combination as recommended by the manufacturer, or as required to maintain best performance, and trim as required."),
        S("CA.IX.F.S6","Monitor the operating engine and aircraft systems and make adjustments as necessary."),
        S("CA.IX.F.S7","Recognize the airplane’s performance capabilities. If a climb is not possible at VYSE, maintain VYSE and return to the departure airport for landing, or initiate an approach to the most suitable landing area available."),
        S("CA.IX.F.S8","Simulate securing the inoperative engine."),
        S("CA.IX.F.S9","Maintain heading ±10° and airspeed ±5 knots."),
        S("CA.IX.F.S10","Complete the appropriate checklist(s).")
      ],
      ["AMEL","AMES"]
    ),

    T("G","IX_G","Approach and Landing with an Inoperative Engine (Simulated)","CA.IX.G",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with approach and landing with an engine inoperative, including engine failure on final approach.",
      [
        K("CA.IX.G.K1","Factors affecting minimum controllable speed (VMC)."),
        K("CA.IX.G.K2","VMC (red line) and best single-engine rate of climb airspeed (VYSE) (blue line)."),
        K("CA.IX.G.K3","How to identify, verify, feather, and secure an inoperative engine."),
        K("CA.IX.G.K4","Importance of drag reduction, including propeller feathering, gear and flap retraction, the manufacturer’s recommended control input and its relation to zero sideslip."),
        K("CA.IX.G.K5","Applicant responsibilities during simulated feathering.")
      ],
      [
        R("CA.IX.G.R1","Potential engine failure inflight or during an approach."),
        R("CA.IX.G.R2","Collision hazards."),
        R("CA.IX.G.R3","Configuring the airplane."),
        R("CA.IX.G.R4","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.IX.G.R5","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.IX.G.R6","Possible single-engine go-around.")
      ],
      [
        S("CA.IX.G.S1","Promptly recognize an engine failure and maintain positive aircraft control."),
        S("CA.IX.G.S2","Set the engine controls, reduce drag, identify and verify the inoperative engine, and simulate feathering of the propeller on the inoperative engine (evaluator should then establish zero thrust on the inoperative engine)."),
        S("CA.IX.G.S3","Use flight controls in the proper combination as recommended by the manufacturer, or as required to maintain best performance, and trim as required."),
        S("CA.IX.G.S4","Follow the manufacturer’s recommended emergency procedures and complete the appropriate checklist."),
        S("CA.IX.G.S5","Monitor the operating engine and aircraft systems and make adjustments as necessary."),
        S("CA.IX.G.S6","Maintain the manufacturer's recommended approach airspeed ±5 knots in the landing configuration with a stabilized approach, until landing is assured."),
        S("CA.IX.G.S7","Make smooth, timely, and correct control application before, during, and after touchdown."),
        S("CA.IX.G.S8","Touch down on the first one-third of available runway/landing surface, with no drift, and the airplane’s longitudinal axis aligned with and over the runway center or landing path."),
        S("CA.IX.G.S9","Maintain directional control and appropriate crosswind correction throughout the approach and landing."),
        S("CA.IX.G.S10","Complete the appropriate checklist(s).")
      ],
      ["AMEL","AMES"]
    )
  ]
},

{
  id: "X",
  roman: "X",
  title: "Multiengine Operations",
  phase: "ground-flight",
  tasks: [
    T("A","X_A","Maneuvering with One Engine Inoperative","CA.X.A",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with maneuvering with one engine inoperative.",
      [
        K("CA.X.A.K1","Factors affecting minimum controllable speed (VMC)."),
        K("CA.X.A.K2","VMC (red line) and best single-engine rate of climb airspeed (VYSE) (blue line)."),
        K("CA.X.A.K3","How to identify, verify, feather, and secure an inoperative engine."),
        K("CA.X.A.K4","Importance of drag reduction, including propeller feathering, gear and flap retraction, the manufacturer's recommended control input and its relation to zero sideslip."),
        K("CA.X.A.K5","Feathering, securing, unfeathering, and restarting.")
      ],
      [
        R("CA.X.A.R1","Potential engine failure during flight."),
        R("CA.X.A.R2","Collision hazards."),
        R("CA.X.A.R3","Configuring the airplane."),
        R("CA.X.A.R4","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.X.A.R5","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("CA.X.A.S1","Recognize an engine failure, maintain control, use manufacturer’s memory item procedures, and use appropriate emergency procedures."),
        S("CA.X.A.S2","Set the engine controls, identify and verify the inoperative engine, and feather the appropriate propeller."),
        S("CA.X.A.S3","Use flight controls in the proper combination as recommended by the manufacturer, or as required to maintain best performance, and trim as required."),
        S("CA.X.A.S4","Attempt to determine and resolve the reason for the engine failure."),
        S("CA.X.A.S5","Secure the inoperative engine and monitor the operating engine and make necessary adjustments."),
        S("CA.X.A.S6","Restart the inoperative engine using manufacturer’s restart procedures."),
        S("CA.X.A.S7","Maintain altitude ±100 feet or minimum sink rate if applicable, airspeed ±10 knots, and selected headings ±10°."),
        S("CA.X.A.S8","Complete the appropriate checklist(s).")
      ],
      ["AMEL","AMES"]
    ),

    T("B","X_B","VMC Demonstration","CA.X.B",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with VMC demonstration.",
      [
        K("CA.X.B.K1","Factors affecting VMC and how VMC differs from stall speed (VS)."),
        K("CA.X.B.K2","VMC (red line), VYSE (blue line), and safe single-engine speed (VSSE)."),
        K("CA.X.B.K3","Cause of loss of directional control at airspeeds below VMC."),
        K("CA.X.B.K4","Proper procedures for maneuver entry and safe recovery.")
      ],
      [
        R("CA.X.B.R1","Configuring the airplane."),
        R("CA.X.B.R2","Maneuvering with one engine inoperative."),
        R("CA.X.B.R3","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("CA.X.B.S1","Configure the airplane in accordance with the manufacturer’s recommendations, in the absence of the manufacturer’s recommendations, then at safe single-engine speed (VSSE/VYSE), as appropriate, and:"),
        S("CA.X.B.S1a","a. Landing gear retracted"),
        S("CA.X.B.S1b","b. Flaps set for takeoff"),
        S("CA.X.B.S1c","c. Cowl flaps set for takeoff"),
        S("CA.X.B.S1d","d. Trim set for takeoff"),
        S("CA.X.B.S1e","e. Propellers set for high revolutions per minute (rpm)"),
        S("CA.X.B.S1f","f. Power on critical engine reduced to idle and propeller windmilling"),
        S("CA.X.B.S1g","g. Power on operating engine set to takeoff or maximum available power"),
        S("CA.X.B.S2","Establish a single-engine climb attitude with the airspeed at approximately 10 knots above VSSE."),
        S("CA.X.B.S3","Establish a bank angle not to exceed 5° toward the operating engine, as required for best performance and controllability."),
        S("CA.X.B.S4","Increase the pitch attitude slowly to reduce the airspeed at approximately 1 knot per second while applying increased rudder pressure as needed to maintain directional control."),
        S("CA.X.B.S5","Recognize and recover at the first indication of loss of directional control, stall warning, or buffet."),
        S("CA.X.B.S6","Recover promptly by simultaneously reducing power sufficiently on the operating engine, decreasing the angle of attack as necessary to regain airspeed and directional control, and without adding power on the simulated failed engine."),
        S("CA.X.B.S7","Recover within 20° of entry heading."),
        S("CA.X.B.S8","Advance power smoothly on the operating engine and accelerate to VSSE/VYSE, as appropriate, ±5 knots during recovery.")
      ],
      ["AMEL","AMES"]
    ),

    T("C","X_C","One Engine Inoperative (Simulated) (solely by Reference to Instruments) During Straight-and-Level Flight and Turns","CA.X.C",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with flight solely by reference to instruments with one engine inoperative.",
      [
        K("CA.X.C.K1","Procedures used if engine failure occurs during straight-and-level flight and turns while on instruments.")
      ],
      [
        R("CA.X.C.R1","Identification of the inoperative engine."),
        R("CA.X.C.R2","Inability to climb or maintain altitude with an inoperative engine."),
        R("CA.X.C.R3","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.X.C.R4","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.X.C.R5","Fuel management during single-engine operation.")
      ],
      [
        S("CA.X.C.S1","Promptly recognize an engine failure and maintain positive aircraft control."),
        S("CA.X.C.S2","Set the engine controls, reduce drag, identify and verify the inoperative engine, and simulate feathering of the propeller on the inoperative engine (evaluator should then establish zero thrust on the inoperative engine)."),
        S("CA.X.C.S3","Establish the best engine-inoperative airspeed and trim the airplane."),
        S("CA.X.C.S4","Use flight controls in the proper combination as recommended by the manufacturer, or as required to maintain best performance, and trim as required."),
        S("CA.X.C.S5","Verify the prescribed checklist procedures used for securing the inoperative engine."),
        S("CA.X.C.S6","Attempt to determine and resolve the reason for the engine failure."),
        S("CA.X.C.S7","Monitor engine functions and make necessary adjustments."),
        S("CA.X.C.S8","Maintain the specified altitude ±100 feet or minimum sink rate if applicable, airspeed ±10 knots, and the specified heading ±10°."),
        S("CA.X.C.S9","Assess the aircraft’s performance capability and decide an appropriate action to ensure a safe landing."),
        S("CA.X.C.S10","Avoid loss of airplane control or attempted flight contrary to the engine-inoperative operating limitations of the airplane."),
        S("CA.X.C.S11","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ],
      ["AMEL","AMES"]
    ),

    T("D","X_D","Instrument Approach and Landing with an Inoperative Engine (Simulated)","CA.X.D",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with executing a published instrument approach solely by reference to instruments with one engine inoperative.",
      [
        K("CA.X.D.K1","Instrument approach procedures with one engine inoperative.")
      ],
      [
        R("CA.X.D.R1","Potential engine failure during approach and landing."),
        R("CA.X.D.R2","Collision hazards."),
        R("CA.X.D.R3","Configuring the airplane."),
        R("CA.X.D.R4","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("CA.X.D.R5","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("CA.X.D.R6","Performing a go-around/rejected landing with an engine failure.")
      ],
      [
        S("CA.X.D.S1","Promptly recognize an engine failure and maintain positive aircraft control."),
        S("CA.X.D.S2","Set the engine controls, reduce drag, identify and verify the inoperative engine, and simulate feathering of the propeller on the inoperative engine (evaluator should then establish zero thrust on the inoperative engine)."),
        S("CA.X.D.S3","Use flight controls in the proper combination as recommended by the manufacturer, or as required to maintain best performance, and trim as required."),
        S("CA.X.D.S4","Follow the manufacturer’s recommended emergency procedures and complete the appropriate checklist."),
        S("CA.X.D.S5","Monitor the operating engine and aircraft systems and make adjustments as necessary."),
        S("CA.X.D.S6","Request and follow an actual or a simulated air traffic control (ATC) clearance for an instrument approach."),
        S("CA.X.D.S7","Maintain altitude ±100 feet or minimum sink rate if applicable, airspeed ±10 knots, and selected heading ±10°."),
        S("CA.X.D.S8","Establish a rate of descent that ensures arrival at the minimum descent altitude (MDA) or decision altitude (DA)/decision height (DH) with the airplane in a position from which a descent to a landing on the intended runway can be made, either straight in or circling as appropriate."),
        S("CA.X.D.S9","On final approach segment, maintain vertical (as applicable) and lateral guidance within ¾-scale deflection."),
        S("CA.X.D.S10","Avoid loss of airplane control or attempted flight contrary to the operating limitations of the airplane."),
        S("CA.X.D.S11","Comply with the published criteria for the aircraft approach category if circling."),
        S("CA.X.D.S12","Execute a landing."),
        S("CA.X.D.S13","Complete the appropriate checklist(s).")
      ],
      ["AMEL","AMES"]
    )
  ]
},

{
  id: "XI",
  roman: "XI",
  title: "Postflight Procedures",
  phase: "flight",
  tasks: [
    T("A","XI_A","After Landing, Parking, and Securing","CA.XI.A",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with after landing, parking, and securing procedures.",
      [
        K("CA.XI.A.K1","Airplane shutdown, securing, and postflight inspection."),
        K("CA.XI.A.K2","Documenting in-flight/postflight discrepancies.")
      ],
      [
        R("CA.XI.A.R1","Activities and distractions."),
        R("CA.XI.A.R2","[Archived]"),
        R("CA.XI.A.R3","Airport specific security procedures."),
        R("CA.XI.A.R4","Disembarking passengers safely on the ramp and monitoring passenger movement while on the ramp.")
      ],
      [
        S("CA.XI.A.S1","[Archived]"),
        S("CA.XI.A.S2","Park in an appropriate area, considering the safety of nearby persons and property."),
        S("CA.XI.A.S3","Complete the appropriate checklist(s)."),
        S("CA.XI.A.S4","Conduct a postflight inspection and document discrepancies and servicing requirements, if any."),
        S("CA.XI.A.S5","Secure the airplane.")
      ],
      ["ASEL","AMEL"]
    ),

    T("B","XI_B","Seaplane Post-Landing Procedures","CA.XI.B",
      "To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with anchoring, docking, mooring, and ramping/beaching.",
      [
        K("CA.XI.B.K1","Mooring."),
        K("CA.XI.B.K2","Docking."),
        K("CA.XI.B.K3","Anchoring."),
        K("CA.XI.B.K4","Beaching/ramping."),
        K("CA.XI.B.K5","Postflight inspection, recording of in-flight/postflight discrepancies.")
      ],
      [
        R("CA.XI.B.R1","Activities and distractions."),
        R("CA.XI.B.R2","[Archived]"),
        R("CA.XI.B.R3","Seaplane base specific security procedures, if applicable."),
        R("CA.XI.B.R4","Disembarking passengers safely on the ramp and monitoring passenger movement while on the ramp.")
      ],
      [
        S("CA.XI.B.S1","If anchoring, select a suitable area considering seaplane movement, water depth, tide, wind, and weather changes. Use an adequate number of anchors and lines of sufficient strength and length to ensure the seaplane’s security."),
        S("CA.XI.B.S2","If not anchoring, approach the dock/mooring buoy or beach/ramp in the proper direction and at a safe speed, considering water depth, tide, current, and wind."),
        S("CA.XI.B.S3","Complete the appropriate checklist(s)."),
        S("CA.XI.B.S4","Conduct a postflight inspection and document discrepancies and servicing requirements, if any."),
        S("CA.XI.B.S5","Secure the seaplane considering the effect of wind, waves, and changes in water level, or comply with applicable after landing, parking, and securing procedures if operating an amphibious airplane on land.")
      ],
      ["ASES","AMES"]
    )
  ]
}
    ]
