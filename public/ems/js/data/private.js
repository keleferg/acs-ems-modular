function T(id, fc, title, code, scenario, k, r, s, ratings) {
  const obj = { id, filterCode: fc, title, code, scenario, knowledge: k, risk: r, skill: s };
  if (ratings) obj.ratings = ratings;
  return obj;
}

function K(code, text) { return { code, text }; }
function R(code, text) { return { code, text }; }
function S(code, text) { return { code, text }; }

export const PRIVATE_DATA = [
  {
  id: "I",
  roman: "I",
  title: "Preflight Preparation",
  phase: "ground",
  tasks: [
    T("A", "I_A", "Pilot Qualifications", "PA.I.A",
      "You've been flying with friends on weekends and one offers to split fuel costs on your next cross-country. Walk me through the regulations that apply to this situation.",
      [
        K("PA.I.A.K1", "Certification requirements, recent flight experience, and recordkeeping."),
        K("PA.I.A.K2", "Privileges and limitations."),
        K("PA.I.A.K3", "Medical certificates: class, expiration, privileges, temporary disqualifications."),
        K("PA.I.A.K4", "Documents required to exercise private pilot privileges."),
        K("PA.I.A.K5", "Part 68 BasicMed privileges and limitations.")
      ],
      [
        R("PA.I.A.R1", "Proficiency versus currency."),
        R("PA.I.A.R2", "Flying unfamiliar aircraft or operating with unfamiliar flight display systems and avionics.")
      ],
      [
        S("PA.I.A.S1", "Apply requirements to act as pilot-in-command (PIC) under Visual Flight Rules (VFR) in a scenario given by the evaluator.")
      ]
    ),

    T("B", "I_B", "Airworthiness Requirements", "PA.I.B",
      "You arrive at the airport and the aircraft's annual inspection expired yesterday. Can you legally fly this aircraft today?",
      [
        K("PA.I.B.K1", "General airworthiness requirements and compliance for airplanes, including:"),
        K("PA.I.B.K1a", "a. Location and expiration dates of required aircraft certificates"),
        K("PA.I.B.K1b", "b. Required inspections and airplane logbook documentation"),
        K("PA.I.B.K1c", "c. Airworthiness Directives and Special Airworthiness Information Bulletins"),
        K("PA.I.B.K1d", "d. Purpose and procedure for obtaining a special flight permit"),
        K("PA.I.B.K1e", "e. Owner/Operator and pilot-in-command responsibilities"),
        K("PA.I.B.K2", "Pilot-performed preventive maintenance."),
        K("PA.I.B.K3", "Equipment requirements for day and night VFR flight, including:"),
        K("PA.I.B.K3a", "a. Flying with inoperative equipment"),
        K("PA.I.B.K3b", "b. Using an approved Minimum Equipment List (MEL)"),
        K("PA.I.B.K3c", "c. Kinds of Operation Equipment List (KOEL)"),
        K("PA.I.B.K3d", "d. Required discrepancy records or placards"),
        K("PA.I.B.K4", "Standard and special airworthiness certificates and their associated operational limitations.")
      ],
      [
        R("PA.I.B.R1", "Inoperative equipment discovered prior to flight.")
      ],
      [
        S("PA.I.B.S1", "Locate and describe airplane airworthiness and registration information."),
        S("PA.I.B.S2", "Determine the airplane is airworthy in the scenario given by the evaluator."),
        S("PA.I.B.S3", "Apply appropriate procedures for operating with inoperative equipment in the scenario given by the evaluator.")
      ]
    ),

    T("C", "I_C", "Weather Information", "PA.I.C",
      "You're planning a 150 NM cross-country departing at 1830Z tomorrow. The TAF shows MVFR improving to VFR by noon. How would you obtain and interpret weather?",
      [
        K("PA.I.C.K1", "Sources of weather data (e.g., National Weather Service, Flight Service) for flight planning purposes."),
        K("PA.I.C.K2", "Acceptable weather products and resources required for preflight planning, current and forecast weather for departure, en route, and arrival phases of flight such as:"),
        K("PA.I.C.K2a", "a. Airport Observations (METAR and SPECI) and Pilot Observations (PIREP)"),
        K("PA.I.C.K2b", "b. Surface Analysis Chart, Ceiling and Visibility Chart (CVA)"),
        K("PA.I.C.K2c", "c. Terminal Aerodrome Forecasts (TAF)"),
        K("PA.I.C.K2d", "d. Graphical Forecasts for Aviation (GFA)"),
        K("PA.I.C.K2e", "e. Wind and Temperature Aloft Forecast (FB)"),
        K("PA.I.C.K2f", "f. Convective Outlook (AC)"),
        K("PA.I.C.K2g", "g. Inflight Aviation Weather Advisories including Airmen's Meteorological Information (AIRMET), Significant Meteorological Information (SIGMET), and Convective SIGMET"),
        K("PA.I.C.K3", "Meteorology applicable to the departure, en route, alternate, and destination under visual flight rules (VFR) in Visual Meteorological Conditions (VMC), including expected climate and hazardous conditions such as:"),
        K("PA.I.C.K3a", "a. Atmospheric composition and stability"),
        K("PA.I.C.K3b", "b. Wind (e.g., windshear, mountain wave, factors affecting wind, etc.)"),
        K("PA.I.C.K3c", "c. Temperature and heat exchange"),
        K("PA.I.C.K3d", "d. Moisture/precipitation"),
        K("PA.I.C.K3e", "e. Weather system formation, including air masses and fronts"),
        K("PA.I.C.K3f", "f. Clouds"),
        K("PA.I.C.K3g", "g. Turbulence"),
        K("PA.I.C.K3h", "h. Thunderstorms and microbursts"),
        K("PA.I.C.K3i", "i. Icing and freezing level information"),
        K("PA.I.C.K3j", "j. Fog/mist"),
        K("PA.I.C.K3k", "k. Frost"),
        K("PA.I.C.K3l", "l. Obstructions to visibility (e.g., smoke, haze, volcanic ash, etc.)"),
        K("PA.I.C.K4", "Flight deck instrument displays of digital weather and aeronautical information.")
      ],
      [
        R("PA.I.C.R1", "Making the go/no-go and continue/divert decisions, including:"),
        R("PA.I.C.R1a", "a. Circumstances that would make diversion prudent"),
        R("PA.I.C.R1b", "b. Personal weather minimums"),
        R("PA.I.C.R1c", "c. Hazardous weather conditions, including known or forecast icing or turbulence aloft"),
        R("PA.I.C.R2", "Use and limitations of:"),
        R("PA.I.C.R2a", "a. Installed onboard weather equipment"),
        R("PA.I.C.R2b", "b. Aviation weather reports and forecasts"),
        R("PA.I.C.R2c", "c. Inflight weather resources")
      ],
      [
        S("PA.I.C.S1", "Use available aviation weather resources to obtain an adequate weather briefing."),
        S("PA.I.C.S2", "Analyze the implications of at least three of the conditions listed in K3a through K3l, using actual weather or weather conditions provided by the evaluator."),
        S("PA.I.C.S3", "Correlate weather information to make a go/no-go decision.")
      ]
    ),

    T("D", "I_D", "Cross-Country Flight Planning", "PA.I.D",
      "Plan a VFR cross-country from our departure airport to a destination approximately 120 NM away. Choose appropriate altitudes and calculate fuel burn.",
      [
        K("PA.I.D.K1", "Route planning, including consideration of different classes and special use airspace (SUA) and selection of appropriate and available navigation/communication systems and facilities."),
        K("PA.I.D.K1a", "a. Use of an electronic flight bag (EFB), if used"),
        K("PA.I.D.K2", "Altitude selection accounting for terrain and obstacles, glide distance of airplane, VFR cruising altitudes, and effect of wind."),
        K("PA.I.D.K3", "Calculating:"),
        K("PA.I.D.K3a", "a. Time, climb and descent rates, course, distance, heading, true airspeed, and groundspeed"),
        K("PA.I.D.K3b", "b. Estimated time of arrival, including conversion to universal coordinated time (UTC)"),
        K("PA.I.D.K3c", "c. Fuel requirements, including reserve"),
        K("PA.I.D.K4", "Elements of a VFR flight plan."),
        K("PA.I.D.K5", "Procedures for filing, activating, and closing a VFR flight plan."),
        K("PA.I.D.K6", "Inflight intercept procedures.")
      ],
      [
        R("PA.I.D.R1", "Pilot."),
        R("PA.I.D.R2", "Aircraft."),
        R("PA.I.D.R3", "Environment (e.g., weather, airports, airspace, terrain, obstacles)."),
        R("PA.I.D.R4", "External pressures."),
        R("PA.I.D.R5", "Limitations of air traffic control (ATC) services."),
        R("PA.I.D.R6", "Fuel planning."),
        R("PA.I.D.R7", "Use of an electronic flight bag (EFB), if used.")
      ],
      [
        S("PA.I.D.S1", "Prepare, present, and explain a cross-country flight plan assigned by the evaluator, including a risk analysis based on real-time weather, to the first fuel stop."),
        S("PA.I.D.S2", "Apply pertinent information from appropriate and current aeronautical charts, Chart Supplements; Notices to Air Missions (NOTAMs) relative to airport, runway and taxiway closures; and other flight publications."),
        S("PA.I.D.S3", "Create a navigation plan and simulate filing a VFR flight plan."),
        S("PA.I.D.S4", "Recalculate fuel reserves based on a scenario provided by the evaluator."),
        S("PA.I.D.S5", "Use an electronic flight bag (EFB), if applicable.")
      ]
    ),

    T("E", "I_E", "National Airspace System", "PA.I.E",
      "Your route takes you near Class C and through a VFR corridor adjacent to Class B. Describe the requirements for each airspace class.",
      [
        K("PA.I.E.K1", "Airspace classes and associated requirements and limitations."),
        K("PA.I.E.K2", "Chart symbols."),
        K("PA.I.E.K3", "Special use airspace (SUA), special flight rules areas (SFRA), temporary flight restrictions (TFR), and other airspace areas."),
        K("PA.I.E.K4", "Special visual flight rules (VFR) requirements.")
      ],
      [
        R("PA.I.E.R1", "Various classes and types of airspace.")
      ],
      [
        S("PA.I.E.S1", "Identify and comply with the requirements for basic VFR weather minimums and flying in particular classes of airspace."),
        S("PA.I.E.S2", "Correctly identify airspace and operate in accordance with associated communication and equipment requirements."),
        S("PA.I.E.S3", "Identify the requirements for operating in SUA or within a TFR. Identify and comply with special air traffic rules (SATR) and SFRA operations, if applicable.")
      ]
    ),

    T("F", "I_F", "Performance and Limitations", "PA.I.F",
      "It's 95°F at 3,500 feet MSL. You have three passengers and full fuel. Walk me through weight and balance and takeoff performance.",
      [
        K("PA.I.F.K1", "Elements related to performance and limitations by explaining the use of charts, tables, and data to determine performance."),
        K("PA.I.F.K2", "Factors affecting performance, including:"),
        K("PA.I.F.K2a", "a. Atmospheric conditions"),
        K("PA.I.F.K2b", "b. Pilot technique"),
        K("PA.I.F.K2c", "c. Airplane configuration"),
        K("PA.I.F.K2d", "d. Airport environment"),
        K("PA.I.F.K2e", "e. Loading [e.g., center of gravity (CG)]"),
        K("PA.I.F.K2f", "f. Weight and balance"),
        K("PA.I.F.K3", "Aerodynamics.")
      ],
      [
        R("PA.I.F.R1", "Use of performance charts, tables, and data."),
        R("PA.I.F.R2", "Airplane limitations."),
        R("PA.I.F.R3", "Possible differences between calculated performance and actual performance.")
      ],
      [
        S("PA.I.F.S1", "Compute the weight and balance, correct out-of-CG loading errors and determine if the weight and balance remains within limits during all phases of flight."),
        S("PA.I.F.S2", "Use the appropriate airplane performance charts, tables, and data.")
      ]
    ),

    T("G", "I_G", "Operation of Systems", "PA.I.G",
      "During preflight you notice the alternator circuit breaker has popped. Explain how the electrical system works and what happens if we lose the alternator.",
      [
        K("PA.I.G.K1", "Airplane systems, including:"),
        K("PA.I.G.K1a", "a. Primary flight controls"),
        K("PA.I.G.K1b", "b. Secondary flight controls"),
        K("PA.I.G.K1c", "c. Powerplant and propeller"),
        K("PA.I.G.K1d", "d. Landing gear"),
        K("PA.I.G.K1e", "e. Fuel, oil, and hydraulic"),
        K("PA.I.G.K1f", "f. Electrical"),
        K("PA.I.G.K1g", "g. Avionics"),
        K("PA.I.G.K1h", "h. Pitot-static, vacuum/pressure, and associated flight instruments"),
        K("PA.I.G.K1i", "i. Environmental"),
        K("PA.I.G.K1j", "j. Deicing and anti-icing"),
        K("PA.I.G.K1k", "k. Water rudders (ASES, AMES)"),
        K("PA.I.G.K1l", "l. Oxygen system"),
        K("PA.I.G.K2", "Indications of and procedures for managing system abnormalities or failures.")
      ],
      [
        R("PA.I.G.R1", "Detection of system malfunctions or failures."),
        R("PA.I.G.R2", "Management of a system failure."),
        R("PA.I.G.R3", "Monitoring and management of automated systems.")
      ],
      [
        S("PA.I.G.S1", "Operate at least three of the systems listed in K1a through K1l appropriately."),
        S("PA.I.G.S2", "Complete the appropriate checklist(s).")
      ]
    ),

    T("H", "I_H", "Human Factors", "PA.I.H",
      "You flew until midnight last night and have an 8 AM flight today. You also took an antihistamine before bed. Evaluate whether you're fit to fly.",
      [
        K("PA.I.H.K1", "Symptoms, recognition, causes, effects, and corrective actions associated with aeromedical and physiological issues, including:"),
        K("PA.I.H.K1a", "a. Hypoxia"),
        K("PA.I.H.K1b", "b. Hyperventilation"),
        K("PA.I.H.K1c", "c. Middle ear and sinus problems"),
        K("PA.I.H.K1d", "d. Spatial disorientation"),
        K("PA.I.H.K1e", "e. Motion sickness"),
        K("PA.I.H.K1f", "f. Carbon monoxide poisoning"),
        K("PA.I.H.K1g", "g. Stress"),
        K("PA.I.H.K1h", "h. Fatigue"),
        K("PA.I.H.K1i", "i. Dehydration and nutrition"),
        K("PA.I.H.K1j", "j. Hypothermia"),
        K("PA.I.H.K1k", "k. Optical illusions"),
        K("PA.I.H.K1l", "l. Dissolved nitrogen in the bloodstream after scuba dives"),
        K("PA.I.H.K2", "Regulations regarding use of alcohol and drugs."),
        K("PA.I.H.K3", "Effects of alcohol, drugs, and over-the-counter medications."),
        K("PA.I.H.K4", "Aeronautical Decision-Making (ADM) to include using Crew Resource Management (CRM) or Single-Pilot Resource Management (SRM), as appropriate.")
      ],
      [
        R("PA.I.H.R1", "Aeromedical and physiological issues."),
        R("PA.I.H.R2", "Hazardous attitudes."),
        R("PA.I.H.R3", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.I.H.R4", "Confirmation and expectation bias.")
      ],
      [
        S("PA.I.H.S1", "Associate the symptoms and effects for at least three of the conditions listed in K1a through K1l with the cause(s) and corrective action(s)."),
        S("PA.I.H.S2", "Perform self-assessment, including fitness for flight and personal minimums, for actual flight or a scenario given by the evaluator.")
      ]
    ),

    T("I", "I_I", "Water and Seaplane Characteristics, Seaplane Bases, Maritime Rules, and Aids to Marine Navigation", "PA.I.I",
      "Demonstrate knowledge, risk management, and skills associated with water and seaplane characteristics, seaplane bases, maritime rules, and aids to marine navigation.",
      [
        K("PA.I.I.K1", "The characteristics of a water surface as affected by features, such as:"),
        K("PA.I.I.K1a", "a. Size and location"),
        K("PA.I.I.K1b", "b. Protected and unprotected areas"),
        K("PA.I.I.K1c", "c. Surface wind"),
        K("PA.I.I.K1d", "d. Direction and strength of water current"),
        K("PA.I.I.K1e", "e. Floating and partially submerged debris"),
        K("PA.I.I.K1f", "f. Sandbars, islands, and shoals"),
        K("PA.I.I.K1g", "g. Vessel traffic and wakes"),
        K("PA.I.I.K1h", "h. Other characteristics specific to the area"),
        K("PA.I.I.K1i", "i. Direction and height of waves"),
        K("PA.I.I.K2", "Float and hull construction, and its effect on seaplane performance."),
        K("PA.I.I.K3", "Causes of porpoising and skipping, and the pilot action needed to prevent or correct these occurrences."),
        K("PA.I.I.K4", "How to locate and identify seaplane bases on charts or in directories."),
        K("PA.I.I.K5", "Operating restrictions at various bases."),
        K("PA.I.I.K6", "Right-of-way, steering, and sailing rules pertinent to seaplane operation."),
        K("PA.I.I.K7", "Marine navigation aids, such as buoys, beacons, lights, sound signals, and range markers."),
        K("PA.I.I.K8", "Naval vessel protection zones."),
        K("PA.I.I.K9", "No wake zones.")
      ],
      [
        R("PA.I.I.R1", "Local conditions."),
        R("PA.I.I.R2", "Impact of marine traffic."),
        R("PA.I.I.R3", "Right-of-way and sailing rules pertinent to seaplane operations."),
        R("PA.I.I.R4", "Limited services and assistance available at seaplane bases.")
      ],
      [
        S("PA.I.I.S1", "Assess the water surface characteristics for the proposed flight."),
        S("PA.I.I.S2", "Identify restrictions at local seaplane bases."),
        S("PA.I.I.S3", "Identify marine navigation aids."),
        S("PA.I.I.S4", "Describe correct right-of-way, steering, and sailing operations."),
        S("PA.I.I.S5", "Explain how float and hull construction can affect seaplane performance."),
        S("PA.I.I.S6", "Describe how to correct for porpoising and skipping.")
      ],
      ["ASES", "AMES"]
    )
  ]
},

  {
  id: "II",
  roman: "II",
  title: "Preflight Procedures",
  phase: "ground",
  tasks: [
    T("A", "II_A", "Preflight Assessment", "PA.II.A",
      "Walk me through your entire preflight inspection. Explain what you're looking for and what would ground the airplane.",
      [
        K("PA.II.A.K1", "Pilot self-assessment."),
        K("PA.II.A.K2", "Determining that the airplane to be used is appropriate and airworthy."),
        K("PA.II.A.K3", "Airplane preflight inspection, including:"),
        K("PA.II.A.K3a", "a. Which items should be inspected"),
        K("PA.II.A.K3b", "b. The reasons for checking each item"),
        K("PA.II.A.K3c", "c. How to detect possible defects"),
        K("PA.II.A.K3d", "d. The associated regulations"),
        K("PA.II.A.K4", "Environmental factors, including weather, terrain, route selection, and obstructions.")
      ],
      [
        R("PA.II.A.R1", "Pilot."),
        R("PA.II.A.R2", "Aircraft."),
        R("PA.II.A.R3", "Environment, such as weather, airports, airspace, terrain, and obstacles."),
        R("PA.II.A.R4", "External pressures."),
        R("PA.II.A.R5", "Aviation security concerns.")
      ],
      [
        S("PA.II.A.S1", "Inspect the airplane with reference to an appropriate checklist."),
        S("PA.II.A.S2", "Verify the airplane is in condition for safe flight and conforms to its type design."),
        S("PA.II.A.S3", "Perform self-assessment."),
        S("PA.II.A.S4", "Continue to assess the environment for safe flight.")
      ]
    ),

    T("B", "II_B", "Flight Deck Management", "PA.II.B",
      "How do you ensure proper flight deck management including passenger briefing, seatbelts, and checklist use?",
      [
        K("PA.II.B.K1", "Passenger briefing requirements, including operation and required use of safety restraint systems."),
        K("PA.II.B.K2", "Use of appropriate checklists."),
        K("PA.II.B.K3", "Requirements for current and appropriate navigation data."),
        K("PA.II.B.K4", "Securing items and cargo.")
      ],
      [
        R("PA.II.B.R1", "Use of systems or equipment, including automation and portable electronic devices."),
        R("PA.II.B.R2", "Inoperative equipment."),
        R("PA.II.B.R3", "Passenger distractions.")
      ],
      [
        S("PA.II.B.S1", "Secure all items in the aircraft."),
        S("PA.II.B.S2", "Conduct an appropriate passenger briefing, including identifying the pilot-in-command (PIC), use of safety belts, shoulder harnesses, doors, passenger conduct, sterile aircraft, propeller blade avoidance, and emergency procedures."),
        S("PA.II.B.S3", "Properly program and manage the aircraft’s automation, as applicable."),
        S("PA.II.B.S4", "Appropriately manage risks by utilizing ADM, including SRM/CRM.")
      ]
    ),

    T("C", "II_C", "Engine Starting", "PA.II.C",
      "Demonstrate a normal engine start. What would you do differently on a cold day versus a hot day?",
      [
        K("PA.II.C.K1", "Starting under various conditions."),
        K("PA.II.C.K2", "Starting the engine by use of external power."),
        K("PA.II.C.K3", "Limitations associated with starting."),
        K("PA.II.C.K4", "Conditions leading to and procedures for an aborted start.")
      ],
      [
        R("PA.II.C.R1", "Propeller safety.")
      ],
      [
        S("PA.II.C.S1", "Position the airplane properly considering structures, other aircraft, wind, and the safety of nearby persons and property."),
        S("PA.II.C.S2", "Complete the appropriate checklist(s).")
      ]
    ),

    T("D", "II_D", "Taxiing", "PA.II.D",
      "Demonstrate proper taxi technique including wind correction, sign identification, and situational awareness.",
      [
        K("PA.II.D.K1", "Current airport aeronautical references and information resources such as the Chart Supplement, airport diagram, and Notices to Air Missions (NOTAMs)."),
        K("PA.II.D.K2", "Taxi instructions and clearances."),
        K("PA.II.D.K3", "Airport markings, signs, and lights."),
        K("PA.II.D.K4", "Visual indicators for wind."),
        K("PA.II.D.K5", "Aircraft lighting, as appropriate."),
        K("PA.II.D.K6", "Procedures for appropriate flight deck activities prior to taxi, including:"),
        K("PA.II.D.K6a", "a. Route planning and identifying the location of Hot Spots"),
        K("PA.II.D.K6b", "b. Radio communications at towered and nontowered airports"),
        K("PA.II.D.K6c", "c. Entering or crossing runways"),
        K("PA.II.D.K6d", "d. Night taxi operations"),
        K("PA.II.D.K6e", "e. Low visibility taxi operations")
      ],
      [
        R("PA.II.D.R1", "Activities and distractions."),
        R("PA.II.D.R2", "Confirmation or expectation bias as related to taxi instructions."),
        R("PA.II.D.R3", "A taxi route or departure runway change."),
        R("PA.II.D.R4", "Runway incursion.")
      ],
      [
        S("PA.II.D.S1", "Receive and correctly read back clearances and instructions, if applicable."),
        S("PA.II.D.S2", "Use an airport diagram or taxi chart during taxi, if published, and maintain situational awareness."),
        S("PA.II.D.S3", "Position the flight controls for the existing wind, if applicable."),
        S("PA.II.D.S4", "Complete the appropriate checklist(s)."),
        S("PA.II.D.S5", "Perform a brake check immediately after the airplane begins moving."),
        S("PA.II.D.S6", "Maintain positive control of the airplane during ground operations by controlling direction and speed without excessive use of brakes."),
        S("PA.II.D.S7", "Comply with airport and taxiway markings, signals, and air traffic control clearances and instructions."),
        S("PA.II.D.S8", "Position the airplane properly relative to hold lines.")
      ],
      ["ASEL", "AMEL"]
    ),

    T("E", "II_E", "Taxiing and Sailing", "PA.II.E",
      "You are operating a seaplane on the water with wind and current present. Demonstrate taxiing and sailing procedures and explain the hazards.",
      [
        K("PA.II.E.K1", "Airport information resources, including Chart Supplements, airport diagram, and appropriate references."),
        K("PA.II.E.K2", "Taxi instructions and clearances."),
        K("PA.II.E.K3", "Airport and seaplane base markings, signs, and lights."),
        K("PA.II.E.K4", "Visual indicators for wind."),
        K("PA.II.E.K5", "Airplane lighting."),
        K("PA.II.E.K6", "Procedures for appropriate flight deck activities during taxiing or sailing and radio communications at towered and nontowered seaplane bases.")
      ],
      [
        R("PA.II.E.R1", "Activities and distractions."),
        R("PA.II.E.R2", "Porpoising and skipping."),
        R("PA.II.E.R3", "Low visibility taxi and sailing operations."),
        R("PA.II.E.R4", "Other aircraft, vessels, and hazards."),
        R("PA.II.E.R5", "Confirmation or expectation bias as related to taxi instructions.")
      ],
      [
        S("PA.II.E.S1", "Receive and correctly read back clearances and instructions, if applicable."),
        S("PA.II.E.S2", "Use an appropriate airport diagram or taxi chart, if published."),
        S("PA.II.E.S3", "Comply with seaplane base, airport, and taxiway markings, signals, and signs."),
        S("PA.II.E.S4", "Depart the dock, mooring buoy, beach, or ramp in a safe manner, considering wind, current, traffic, and hazards."),
        S("PA.II.E.S5", "Complete the appropriate checklist(s)."),
        S("PA.II.E.S6", "Position the flight controls, flaps, doors, water rudders, and power correctly for the existing conditions to follow the desired course while sailing and to prevent or correct for porpoising and skipping during step taxi."),
        S("PA.II.E.S7", "Exhibit procedures for steering and maneuvering while maintaining proper situational awareness and desired orientation, path, and position while taxiing using idle, plow, or step taxi technique, as appropriate."),
        S("PA.II.E.S8", "Plan and follow the most favorable taxi or sailing course for current conditions."),
        S("PA.II.E.S9", "Abide by right-of-way rules, maintain positive airplane control, proper speed, and separation between other aircraft, vessels, and persons."),
        S("PA.II.E.S10", "Comply with applicable taxi elements in Task D if the practical test is conducted in an amphibious airplane.")
      ],
      ["ASES", "AMES"]
    ),

    T("F", "II_F", "Before Takeoff Check", "PA.II.F",
      "Perform the before-takeoff check. Explain abnormalities you'd look for during the runup.",
      [
        K("PA.II.F.K1", "Purpose of before takeoff checklist items including:"),
        K("PA.II.F.K1a", "a. Reasons for checking each item"),
        K("PA.II.F.K1b", "b. How to detect malfunctions"),
        K("PA.II.F.K1c", "c. Ensuring the aircraft is in safe operating condition as recommended by the manufacturer")
      ],
      [
        R("PA.II.F.R1", "Division of attention while conducting before takeoff checks."),
        R("PA.II.F.R2", "Unexpected runway changes by air traffic control."),
        R("PA.II.F.R3", "Wake turbulence."),
        R("PA.II.F.R4", "Potential powerplant failure during takeoff or other malfunction considering operational factors such as airplane characteristics, runway or takeoff path length, surface conditions, environmental conditions, and obstructions.")
      ],
      [
        S("PA.II.F.S1", "Review takeoff performance."),
        S("PA.II.F.S2", "Complete the appropriate checklist(s)."),
        S("PA.II.F.S3", "Position the airplane appropriately considering wind direction and the presence of any aircraft, vessels, or buildings as applicable."),
        S("PA.II.F.S4", "Divide attention inside and outside the flight deck."),
        S("PA.II.F.S5", "Verify that engine parameters and airplane configuration are suitable.")
      ]
    )
  ]
},
    

  {
  id: "III",
  roman: "III",
  title: "Airport and Seaplane Base Operations",
  phase: "flight",
  tasks: [

    T("A", "III_A", "Communications, Light Signals, and Runway Lighting Systems", "PA.III.A",
      "You need to land at a non-towered field with pilot-controlled lighting, then divert to a towered airport where your radio fails.",
      [
        K("PA.III.A.K1", "Towered airport communications."),
        K("PA.III.A.K2", "Nontowered airport communications."),
        K("PA.III.A.K3", "UNICOM/CTAF procedures."),
        K("PA.III.A.K4", "ATC light signals and their meaning."),
        K("PA.III.A.K5", "Runway lighting systems, including pilot-controlled lighting.")
      ],
      [
        R("PA.III.A.R1", "Failure to comply with air traffic control (ATC) clearances and instructions."),
        R("PA.III.A.R2", "Failure to recognize and respond to light gun signals."),
        R("PA.III.A.R3", "Collision hazards in the airport environment."),
        R("PA.III.A.R4", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.III.A.S1", "Use appropriate radio communications and phraseology."),
        S("PA.III.A.S2", "Comply with air traffic control (ATC) clearances and instructions."),
        S("PA.III.A.S3", "Interpret and respond correctly to light gun signals."),
        S("PA.III.A.S4", "Operate runway lighting systems, as appropriate.")
      ]
    ),

    T("B", "III_B", "Traffic Patterns", "PA.III.B",
      "You're approaching a non-towered airport. Describe proper pattern entry and how you'd sequence yourself.",
      [
        K("PA.III.B.K1", "Purpose and procedures for traffic patterns."),
        K("PA.III.B.K2", "Traffic pattern entries."),
        K("PA.III.B.K3", "Traffic pattern departures."),
        K("PA.III.B.K4", "Right-of-way rules."),
        K("PA.III.B.K5", "Collision avoidance procedures."),
        K("PA.III.B.K6", "Wake turbulence avoidance."),
        K("PA.III.B.K7", "Traffic pattern operations at nontowered airports.")
      ],
      [
        R("PA.III.B.R1", "Collision hazards in the traffic pattern."),
        R("PA.III.B.R2", "Wake turbulence."),
        R("PA.III.B.R3", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.III.B.R4", "Non-standard traffic pattern procedures.")
      ],
      [
        S("PA.III.B.S1", "Clear the area."),
        S("PA.III.B.S2", "Comply with traffic pattern procedures."),
        S("PA.III.B.S3", "Maintain appropriate airspeed and altitude."),
        S("PA.III.B.S4", "Maintain proper spacing from other aircraft."),
        S("PA.III.B.S5", "Apply wind correction."),
        S("PA.III.B.S6", "Comply with right-of-way rules."),
        S("PA.III.B.S7", "Maintain situational awareness.")
      ]
    )

  ]
},

  {
  id: "IV",
  roman: "IV",
  title: "Takeoffs, Landings, and Go-Arounds",
  phase: "flight",
  tasks: [
    T("A", "IV_A", "Normal Takeoff and Climb", "PA.IV.A",
      "Demonstrate a normal takeoff. I'll evaluate centerline, rotation speed, and climb.",
      [
        K("PA.IV.A.K1", "Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
        K("PA.IV.A.K2", "Best angle of climb speed (VX) and best rate of climb speed (VY)."),
        K("PA.IV.A.K3", "Appropriate airplane configuration.")
      ],
      [
        R("PA.IV.A.R1", "Selection of runway or takeoff path based on aircraft performance and limitations, available distance, and wind."),
        R("PA.IV.A.R2", "Effects of:"),
        R("PA.IV.A.R2a", "a. Crosswind"),
        R("PA.IV.A.R2b", "b. Windshear"),
        R("PA.IV.A.R2c", "c. Tailwind"),
        R("PA.IV.A.R2d", "d. Wake turbulence"),
        R("PA.IV.A.R2e", "e. Takeoff surface/condition"),
        R("PA.IV.A.R3", "Abnormal operations, including planning for:"),
        R("PA.IV.A.R3a", "a. Rejected takeoff"),
        R("PA.IV.A.R3b", "b. Potential engine failure in takeoff/climb phase of flight"),
        R("PA.IV.A.R4", "Collision hazards."),
        R("PA.IV.A.R5", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IV.A.R6", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.IV.A.R7", "Runway incursion.")
      ],
      [
        S("PA.IV.A.S1", "Complete the appropriate checklist(s)."),
        S("PA.IV.A.S2", "Make radio calls as appropriate."),
        S("PA.IV.A.S3", "Verify assigned/correct runway or takeoff path."),
        S("PA.IV.A.S4", "Determine wind direction with or without visible wind direction indicators."),
        S("PA.IV.A.S5", "Position the flight controls for the existing wind, if applicable."),
        S("PA.IV.A.S6", "Clear the area, taxi into takeoff position, and align the airplane on the runway centerline (ASEL, AMEL) or takeoff path (ASES, AMES)."),
        S("PA.IV.A.S6a", "a. Retract the water rudders, as appropriate (ASES, AMES)"),
        S("PA.IV.A.S7", "Advance the throttle smoothly to takeoff power and confirm proper engine and flight instrument indications prior to rotation."),
        S("PA.IV.A.S7a", "a. Establish and maintain the most efficient planing/lift-off attitude, and correct for porpoising or skipping (ASES, AMES)"),
        S("PA.IV.A.S8", "Avoid excessive water spray on the propeller(s) (ASES, AMES)."),
        S("PA.IV.A.S9", "Rotate and lift off at the recommended airspeed and accelerate to VY."),
        S("PA.IV.A.S10", "[Archived]"),
        S("PA.IV.A.S11", "Establish a pitch attitude to maintain the manufacturer’s recommended speed or VY, +10/-5 knots."),
        S("PA.IV.A.S12", "Configure the airplane in accordance with manufacturer’s guidance."),
        S("PA.IV.A.S13", "Maintain VY +10/-5 knots to a safe maneuvering altitude."),
        S("PA.IV.A.S14", "Maintain directional control and proper wind-drift correction throughout takeoff and climb."),
        S("PA.IV.A.S15", "Comply with noise abatement procedures, as applicable.")
      ]
    ),

    T("B", "IV_B", "Normal Approach and Landing", "PA.IV.B",
      "Set up for and execute a normal approach and landing.",
      [
        K("PA.IV.B.K1", "A stabilized approach, including energy management concepts."),
        K("PA.IV.B.K2", "Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("PA.IV.B.K3", "Wind correction techniques on approach and landing.")
      ],
      [
        R("PA.IV.B.R1", "Selection of runway/landing surface, approach path, and touchdown area based on pilot capability, aircraft performance and limitations, available distance, and wind."),
        R("PA.IV.B.R2", "Effects of:"),
        R("PA.IV.B.R2a", "a. Crosswind"),
        R("PA.IV.B.R2b", "b. Windshear"),
        R("PA.IV.B.R2c", "c. Tailwind"),
        R("PA.IV.B.R2d", "d. Wake turbulence"),
        R("PA.IV.B.R2e", "e. Landing surface/condition"),
        R("PA.IV.B.R3", "Planning for:"),
        R("PA.IV.B.R3a", "a. Rejected landing and go-around"),
        R("PA.IV.B.R3b", "b. Land and hold short operations (LAHSO)"),
        R("PA.IV.B.R4", "Collision hazards."),
        R("PA.IV.B.R5", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IV.B.R6", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.IV.B.S1", "Complete the appropriate checklist(s)."),
        S("PA.IV.B.S2", "Make radio calls as appropriate."),
        S("PA.IV.B.S3", "Ensure the airplane is aligned with the correct/assigned runway or landing surface."),
        S("PA.IV.B.S4", "Scan the runway or landing surface and adjoining area for traffic and obstructions."),
        S("PA.IV.B.S5", "Select and aim for a suitable touchdown point considering the wind conditions, landing surface, and obstructions."),
        S("PA.IV.B.S6", "Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("PA.IV.B.S7", "Maintain manufacturer’s published approach airspeed or in its absence not more than 1.3 times the stalling speed or the minimum steady flight speed in the landing configuration (VSO), +10/-5 knots with gust factor applied."),
        S("PA.IV.B.S8", "Maintain directional control and appropriate crosswind correction throughout the approach and landing."),
        S("PA.IV.B.S9", "Make smooth, timely, and correct control application during round out and touchdown."),
        S("PA.IV.B.S10", "Touch down at a proper pitch attitude, within 400 feet beyond or on the specified point, with no side drift, and with the airplane’s longitudinal axis aligned with and over the runway center/landing path."),
        S("PA.IV.B.S11", "Execute a timely go-around if the approach cannot be made within the tolerances specified above or for any other condition that may result in an unsafe approach or landing."),
        S("PA.IV.B.S12", "Use runway incursion avoidance procedures, if applicable.")
      ]
    ),

    T("C", "IV_C", "Soft-Field Takeoff and Climb", "PA.IV.C",
      "Simulate departing from a soft grass strip. Demonstrate proper technique to minimize time on the surface.",
      [
        K("PA.IV.C.K1", "Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
        K("PA.IV.C.K2", "Best angle of climb speed (VX) and best rate of climb speed (VY)."),
        K("PA.IV.C.K3", "Appropriate airplane configuration."),
        K("PA.IV.C.K4", "Ground effect."),
        K("PA.IV.C.K5", "Importance of weight transfer from wheels to wings."),
        K("PA.IV.C.K6", "Left turning tendencies.")
      ],
      [
        R("PA.IV.C.R1", "Selection of runway based on pilot capability, airplane performance and limitations, available distance, and wind."),
        R("PA.IV.C.R2", "Effects of:"),
        R("PA.IV.C.R2a", "a. Crosswind"),
        R("PA.IV.C.R2b", "b. Windshear"),
        R("PA.IV.C.R2c", "c. Tailwind"),
        R("PA.IV.C.R2d", "d. Wake turbulence"),
        R("PA.IV.C.R2e", "e. Takeoff surface/condition"),
        R("PA.IV.C.R3", "Abnormal operations, including planning for:"),
        R("PA.IV.C.R3a", "a. Rejected takeoff"),
        R("PA.IV.C.R3b", "b. Potential engine failure in takeoff/climb phase of flight"),
        R("PA.IV.C.R4", "Collision hazards."),
        R("PA.IV.C.R5", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IV.C.R6", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.IV.C.S1", "Complete the appropriate checklist(s)."),
        S("PA.IV.C.S2", "Make radio calls as appropriate."),
        S("PA.IV.C.S3", "Verify assigned/correct runway."),
        S("PA.IV.C.S4", "Determine wind direction with or without visible wind direction indicators."),
        S("PA.IV.C.S5", "Position the flight controls for the existing wind, if applicable."),
        S("PA.IV.C.S6", "Clear the area, maintain necessary flight control inputs, taxi into takeoff position and align the airplane on the runway centerline without stopping, while advancing the throttle smoothly to takeoff power."),
        S("PA.IV.C.S7", "Confirm takeoff power and proper engine and flight instrument indications."),
        S("PA.IV.C.S8", "Establish and maintain a pitch attitude that transfers the weight of the airplane from the wheels to the wings as rapidly as possible."),
        S("PA.IV.C.S9", "Lift off at the lowest possible airspeed and remain in ground effect while accelerating to VX or VY, as appropriate."),
        S("PA.IV.C.S10", "Establish a pitch attitude for VX or VY, as appropriate, and maintain selected airspeed +10/-5 knots during the climb."),
        S("PA.IV.C.S11", "Configure the airplane after a positive rate of climb has been verified or in accordance with airplane manufacturer’s instructions."),
        S("PA.IV.C.S12", "Maintain VX or VY, as appropriate, +10/-5 knots to a safe maneuvering altitude."),
        S("PA.IV.C.S13", "Maintain directional control and proper wind-drift correction throughout takeoff and climb."),
        S("PA.IV.C.S14", "Comply with noise abatement procedures, as applicable.")
      ],
      ["ASEL"]
    ),

    T("D", "IV_D", "Soft-Field Approach and Landing", "PA.IV.D",
      "Demonstrate a soft-field landing. Explain how technique differs from a normal landing.",
      [
        K("PA.IV.D.K1", "A stabilized approach, including energy management concepts."),
        K("PA.IV.D.K2", "Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("PA.IV.D.K3", "Wind correction techniques on approach and landing.")
      ],
      [
        R("PA.IV.D.R1", "Selection of runway based on pilot capability, airplane performance and limitations, available distance, and wind."),
        R("PA.IV.D.R2", "Effects of:"),
        R("PA.IV.D.R2a", "a. Crosswind"),
        R("PA.IV.D.R2b", "b. Windshear"),
        R("PA.IV.D.R2c", "c. Tailwind"),
        R("PA.IV.D.R2d", "d. Wake turbulence"),
        R("PA.IV.D.R2e", "e. Landing surface/condition"),
        R("PA.IV.D.R3", "Planning for:"),
        R("PA.IV.D.R3a", "a. Rejected landing and go-around"),
        R("PA.IV.D.R3b", "b. Land and hold short operations (LAHSO)"),
        R("PA.IV.D.R4", "Collision hazards."),
        R("PA.IV.D.R5", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IV.D.R6", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.IV.D.S1", "Complete the appropriate checklist(s)."),
        S("PA.IV.D.S2", "Make radio calls as appropriate."),
        S("PA.IV.D.S3", "Ensure the airplane is aligned with the correct/assigned runway."),
        S("PA.IV.D.S4", "Scan the landing runway and adjoining area for traffic and obstructions."),
        S("PA.IV.D.S5", "Select and aim for a suitable touchdown point considering the wind conditions, landing surface, and obstructions."),
        S("PA.IV.D.S6", "Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("PA.IV.D.S7", "Maintain manufacturer’s published approach airspeed or in its absence not more than 1.3 VSO, +10/-5 knots with gust factor applied."),
        S("PA.IV.D.S8", "Maintain directional control and appropriate crosswind correction throughout the approach and landing."),
        S("PA.IV.D.S9", "Make smooth, timely, and correct control inputs during the round out and touchdown, and, for tricycle gear airplanes, keep the nose wheel off the surface until loss of elevator effectiveness."),
        S("PA.IV.D.S10", "Touch down at a proper pitch attitude with minimum sink rate, no side drift, and with the airplane’s longitudinal axis aligned with the center of the runway."),
        S("PA.IV.D.S11", "Maintain elevator as recommended by manufacturer during rollout and exit the “soft” area at a speed that would preclude sinking into the surface."),
        S("PA.IV.D.S12", "Execute a timely go-around if the approach cannot be made within the tolerances specified above or for any other condition that may result in an unsafe approach or landing."),
        S("PA.IV.D.S13", "Maintain proper position of the flight controls and sufficient speed to taxi while on the soft surface.")
      ],
      ["ASEL"]
    ),

    T("E", "IV_E", "Short-Field Takeoff and Maximum Performance Climb", "PA.IV.E",
      "Imagine departing a 2,000-foot strip with 50-foot trees on the departure end. Demonstrate short-field technique.",
      [
        K("PA.IV.E.K1", "Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
        K("PA.IV.E.K2", "Best angle of climb speed (VX) and best rate of climb speed (VY)."),
        K("PA.IV.E.K3", "Appropriate airplane configuration.")
      ],
      [
        R("PA.IV.E.R1", "Selection of runway based on pilot capability, airplane performance and limitations, available distance, and wind."),
        R("PA.IV.E.R2", "Effects of:"),
        R("PA.IV.E.R2a", "a. Crosswind"),
        R("PA.IV.E.R2b", "b. Windshear"),
        R("PA.IV.E.R2c", "c. Tailwind"),
        R("PA.IV.E.R2d", "d. Wake turbulence"),
        R("PA.IV.E.R2e", "e. Takeoff surface/condition"),
        R("PA.IV.E.R3", "Abnormal operations, including planning for:"),
        R("PA.IV.E.R3a", "a. Rejected takeoff"),
        R("PA.IV.E.R3b", "b. Potential engine failure in takeoff/climb phase of flight"),
        R("PA.IV.E.R4", "Collision hazards."),
        R("PA.IV.E.R5", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IV.E.R6", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.IV.E.S1", "Complete the appropriate checklist(s)."),
        S("PA.IV.E.S2", "Make radio calls as appropriate."),
        S("PA.IV.E.S3", "Verify assigned/correct runway."),
        S("PA.IV.E.S4", "Determine wind direction with or without visible wind direction indicators."),
        S("PA.IV.E.S5", "Position the flight controls for the existing wind, if applicable."),
        S("PA.IV.E.S6", "Clear the area, taxi into takeoff position, and align the airplane on the runway centerline utilizing maximum available takeoff area."),
        S("PA.IV.E.S7", "Apply brakes while setting engine power to achieve maximum performance."),
        S("PA.IV.E.S8", "Confirm takeoff power prior to brake release and verify proper engine and flight instrument indications prior to rotation."),
        S("PA.IV.E.S9", "Rotate and lift off at the recommended airspeed and accelerate to the recommended obstacle clearance airspeed or VX, +10/-5 knots."),
        S("PA.IV.E.S10", "Establish a pitch attitude to maintain the recommended obstacle clearance airspeed or VX, +10/-5 knots until the obstacle is cleared or until the airplane is 50 feet above the surface."),
        S("PA.IV.E.S11", "Establish a pitch attitude for VY and accelerate to VY +10/-5 knots after clearing the obstacle or at 50 feet AGL if simulating an obstacle."),
        S("PA.IV.E.S12", "Configure the airplane in accordance with the manufacturer’s guidance after a positive rate of climb has been verified."),
        S("PA.IV.E.S13", "Maintain VY +10/-5 knots to a safe maneuvering altitude."),
        S("PA.IV.E.S14", "Maintain directional control and proper wind-drift correction throughout takeoff and climb."),
        S("PA.IV.E.S15", "Comply with noise abatement procedures, as applicable.")
      ],
      ["ASEL", "AMEL"]
    ),

    T("F", "IV_F", "Short-Field Approach and Landing", "PA.IV.F",
      "Demonstrate a short-field approach aiming for a specified touchdown point with a simulated obstacle.",
      [
        K("PA.IV.F.K1", "A stabilized approach, including energy management concepts."),
        K("PA.IV.F.K2", "Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("PA.IV.F.K3", "Wind correction techniques on approach and landing.")
      ],
      [
        R("PA.IV.F.R1", "Selection of runway based on pilot capability, airplane performance and limitations, available distance, and wind."),
        R("PA.IV.F.R2", "Effects of:"),
        R("PA.IV.F.R2a", "a. Crosswind"),
        R("PA.IV.F.R2b", "b. Windshear"),
        R("PA.IV.F.R2c", "c. Tailwind"),
        R("PA.IV.F.R2d", "d. Wake turbulence"),
        R("PA.IV.F.R2e", "e. Landing surface/condition"),
        R("PA.IV.F.R3", "Planning for:"),
        R("PA.IV.F.R3a", "a. Rejected landing and go-around"),
        R("PA.IV.F.R3b", "b. Land and hold short operations (LAHSO)"),
        R("PA.IV.F.R4", "Collision hazards."),
        R("PA.IV.F.R5", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IV.F.R6", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.IV.F.S1", "Complete the appropriate checklist(s)."),
        S("PA.IV.F.S2", "Make radio calls as appropriate."),
        S("PA.IV.F.S3", "Ensure the airplane is aligned with the correct/assigned runway."),
        S("PA.IV.F.S4", "Scan the landing runway and adjoining area for traffic and obstructions."),
        S("PA.IV.F.S5", "Select and aim for a suitable touchdown point considering the wind conditions, landing surface, and obstructions."),
        S("PA.IV.F.S6", "Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("PA.IV.F.S7", "Maintain manufacturer’s published approach airspeed or in its absence not more than 1.3 VSO, +10/-5 knots with gust factor applied."),
        S("PA.IV.F.S8", "Maintain directional control and appropriate crosswind correction throughout the approach and landing."),
        S("PA.IV.F.S9", "Make smooth, timely, and correct control application before, during, and after touchdown."),
        S("PA.IV.F.S10", "Touch down at a proper pitch attitude within 200 feet beyond or on the specified point, threshold markings, or runway numbers, with no side drift, minimum float, and with the airplane's longitudinal axis aligned with and over the runway centerline."),
        S("PA.IV.F.S11", "Use manufacturer’s recommended procedures for airplane configuration and braking."),
        S("PA.IV.F.S12", "Execute a timely go-around if the approach cannot be made within the tolerances specified above or for any other condition that may result in an unsafe approach or landing."),
        S("PA.IV.F.S13", "Use runway incursion avoidance procedures, if applicable.")
      ],
      ["ASEL", "AMEL"]
    ),
        T("G", "IV_G", "Confined Area Takeoff and Maximum Performance Climb", "PA.IV.G",
      "You need to depart from a small, confined cove. Demonstrate confined area water takeoff planning and technique.",
      [
        K("PA.IV.G.K1", "Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
        K("PA.IV.G.K2", "Best angle of climb speed (VX) and best rate of climb speed (VY)."),
        K("PA.IV.G.K3", "Appropriate airplane configuration."),
        K("PA.IV.G.K4", "Effects of water surface.")
      ],
      [
        R("PA.IV.G.R1", "Selection of takeoff path based on pilot capability, airplane performance and limitations, available distance, and wind."),
        R("PA.IV.G.R2", "Effects of:"),
        R("PA.IV.G.R2a", "a. Crosswind"),
        R("PA.IV.G.R2b", "b. Windshear"),
        R("PA.IV.G.R2c", "c. Tailwind"),
        R("PA.IV.G.R2d", "d. Wake turbulence"),
        R("PA.IV.G.R2e", "e. Water surface/condition"),
        R("PA.IV.G.R3", "Abnormal operations, including planning for:"),
        R("PA.IV.G.R3a", "a. Rejected takeoff"),
        R("PA.IV.G.R3b", "b. Potential engine failure in takeoff/climb phase of flight"),
        R("PA.IV.G.R4", "Collision hazards."),
        R("PA.IV.G.R5", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IV.G.R6", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.IV.G.S1", "Complete the appropriate checklist(s)."),
        S("PA.IV.G.S2", "Make radio calls as appropriate."),
        S("PA.IV.G.S3", "Verify assigned/correct takeoff path."),
        S("PA.IV.G.S4", "Determine wind direction with or without visible wind direction indicators."),
        S("PA.IV.G.S5", "Position the flight controls for the existing wind, if applicable."),
        S("PA.IV.G.S6", "Clear the area, taxi into takeoff position utilizing maximum available takeoff area, and align the airplane on the takeoff path."),
        S("PA.IV.G.S6a", "a. Retract the water rudders, as appropriate"),
        S("PA.IV.G.S7", "Advance the throttle smoothly to takeoff power and confirm proper engine and flight instrument indications prior to rotation."),
        S("PA.IV.G.S8", "Establish a pitch attitude that maintains the most efficient planing/lift-off attitude and correct for porpoising and skipping."),
        S("PA.IV.G.S9", "Avoid excessive water spray on the propeller(s)."),
        S("PA.IV.G.S10", "Rotate and lift off at the recommended airspeed, and accelerate to the recommended obstacle clearance airspeed or VX."),
        S("PA.IV.G.S11", "Establish a pitch attitude to maintain the recommended obstacle clearance airspeed or VX, +10/-5 knots until the obstacle is cleared or until the airplane is 50 feet above the surface."),
        S("PA.IV.G.S12", "Establish a pitch attitude for VY and accelerate to VY +10/-5 knots after clearing the obstacle or at 50 feet AGL if simulating an obstacle."),
        S("PA.IV.G.S13", "Retract flaps, if extended, after a positive rate of climb has been verified or in accordance with airplane manufacturer’s guidance."),
        S("PA.IV.G.S14", "Maintain VY +10/-5 knots to a safe maneuvering altitude."),
        S("PA.IV.G.S15", "Maintain directional control and proper wind-drift correction throughout takeoff and climb."),
        S("PA.IV.G.S16", "Comply with noise abatement procedures, as applicable.")
      ],
      ["ASES", "AMES"]
    ),

    T("H", "IV_H", "Confined Area Approach and Landing", "PA.IV.H",
      "Demonstrate an approach and landing into a confined water area, accounting for obstacles and water conditions.",
      [
        K("PA.IV.H.K1", "A stabilized approach, including energy management concepts."),
        K("PA.IV.H.K2", "Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("PA.IV.H.K3", "Wind correction techniques on approach and landing.")
      ],
      [
        R("PA.IV.H.R1", "Selection of approach path and touchdown area based on pilot capability, airplane performance and limitations, available distance, and wind."),
        R("PA.IV.H.R2", "Effects of:"),
        R("PA.IV.H.R2a", "a. Crosswind"),
        R("PA.IV.H.R2b", "b. Windshear"),
        R("PA.IV.H.R2c", "c. Tailwind"),
        R("PA.IV.H.R2d", "d. Wake turbulence"),
        R("PA.IV.H.R2e", "e. Water surface/condition"),
        R("PA.IV.H.R3", "Planning for a go-around and rejected landing."),
        R("PA.IV.H.R4", "Collision hazards."),
        R("PA.IV.H.R5", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IV.H.R6", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.IV.H.S1", "Complete the appropriate checklist(s)."),
        S("PA.IV.H.S2", "Make radio calls as appropriate."),
        S("PA.IV.H.S3", "Ensure the airplane is aligned for an approach to the correct/assigned landing surface."),
        S("PA.IV.H.S4", "Scan the landing area for traffic and obstructions."),
        S("PA.IV.H.S5", "Select and aim for a suitable touchdown point considering the wind conditions, landing surface, and obstructions."),
        S("PA.IV.H.S6", "Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("PA.IV.H.S7", "Maintain manufacturer’s published approach airspeed or in its absence not more than 1.3 VSO, +10/-5 knots with gust factor applied."),
        S("PA.IV.H.S8", "Maintain directional control and appropriate crosswind correction throughout the approach and landing."),
        S("PA.IV.H.S9", "Make smooth, timely, and correct control application before, during, and after touchdown."),
        S("PA.IV.H.S10", "Contact the water at the recommended airspeed with a proper pitch attitude for the surface conditions."),
        S("PA.IV.H.S11", "Touch down at a proper pitch attitude, within 200 feet beyond or on the specified point, with no side drift, minimum float, and with the airplane’s longitudinal axis aligned with the projected landing path."),
        S("PA.IV.H.S12", "Execute a timely go-around if the approach cannot be made within the tolerances specified above or for any other condition that may result in an unsafe approach or landing."),
        S("PA.IV.H.S13", "Apply elevator control as necessary to stop in the shortest distance consistent with safety.")
      ],
      ["ASES", "AMES"]
    ),

    T("I", "IV_I", "Glassy Water Takeoff and Climb", "PA.IV.I",
      "The lake is perfectly calm with no wind. Demonstrate a glassy water takeoff technique.",
      [
        K("PA.IV.I.K1", "Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
        K("PA.IV.I.K2", "Best angle of climb speed (VX) and best rate of climb speed (VY)."),
        K("PA.IV.I.K3", "Appropriate airplane configuration."),
        K("PA.IV.I.K4", "Appropriate use of glassy water takeoff and climb technique.")
      ],
      [
        R("PA.IV.I.R1", "Selection of takeoff path based on pilot capability, airplane performance and limitations, and available distance."),
        R("PA.IV.I.R2", "Water surface/condition."),
        R("PA.IV.I.R3", "Abnormal operations, including planning for:"),
        R("PA.IV.I.R3a", "a. Rejected takeoff"),
        R("PA.IV.I.R3b", "b. Potential engine failure in takeoff/climb phase of flight"),
        R("PA.IV.I.R4", "Collision hazards."),
        R("PA.IV.I.R5", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IV.I.R6", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.IV.I.R7", "Gear position in an amphibious airplane.")
      ],
      [
        S("PA.IV.I.S1", "Complete the appropriate checklist(s)."),
        S("PA.IV.I.S2", "Make radio calls as appropriate."),
        S("PA.IV.I.S3", "Position flight controls and configure the aircraft for the existing conditions."),
        S("PA.IV.I.S4", "Clear the area, select appropriate takeoff path considering surface hazards or vessels and surface conditions:"),
        S("PA.IV.I.S4a", "a. Retract the water rudders, as appropriate"),
        S("PA.IV.I.S4b", "b. Advance the throttle smoothly to takeoff power and confirm proper engine and flight instrument indications prior to rotation"),
        S("PA.IV.I.S5", "[Archived]"),
        S("PA.IV.I.S6", "Establish and maintain an appropriate planing attitude, directional control, and correct for porpoising, skipping, and increase in water drag."),
        S("PA.IV.I.S7", "Avoid excessive water spray on the propeller(s)."),
        S("PA.IV.I.S8", "Use appropriate techniques to lift seaplane from the water considering surface conditions."),
        S("PA.IV.I.S9", "Establish proper attitude/airspeed and accelerate to VY +10/-5 knots during the climb."),
        S("PA.IV.I.S10", "Configure the airplane after a positive rate of climb has been verified or in accordance with airplane manufacturer’s instructions."),
        S("PA.IV.I.S11", "Maintain VY +10/-5 knots to a safe maneuvering altitude."),
        S("PA.IV.I.S12", "Maintain directional control throughout takeoff and climb.")
      ],
      ["ASES", "AMES"]
    ),

    T("J", "IV_J", "Glassy Water Approach and Landing", "PA.IV.J",
      "Demonstrate a glassy water landing. Explain how you establish a descent rate without visual cues from the water surface.",
      [
        K("PA.IV.J.K1", "A stabilized approach, including energy management concepts."),
        K("PA.IV.J.K2", "Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("PA.IV.J.K3", "When and why glassy water techniques are used."),
        K("PA.IV.J.K4", "How a glassy water approach and landing is executed.")
      ],
      [
        R("PA.IV.J.R1", "Selection of approach path and touchdown area based on pilot capability, airplane performance and limitations, and available distance."),
        R("PA.IV.J.R2", "Water surface/condition."),
        R("PA.IV.J.R3", "Planning for a go-around and rejected landing."),
        R("PA.IV.J.R4", "Collision hazards."),
        R("PA.IV.J.R5", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IV.J.R6", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.IV.J.R7", "Gear position in an amphibious airplane.")
      ],
      [
        S("PA.IV.J.S1", "Complete the appropriate checklist(s)."),
        S("PA.IV.J.S2", "Make radio calls as appropriate."),
        S("PA.IV.J.S3", "Scan the landing area for traffic and obstructions."),
        S("PA.IV.J.S4", "Select a proper approach and landing path considering the landing surface, visual attitude references, water depth, and collision hazards."),
        S("PA.IV.J.S5", "Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("PA.IV.J.S6", "Maintain manufacturer’s published approach airspeed or in its absence not more than 1.3 VSO, +10/-5 knots."),
        S("PA.IV.J.S7", "Make smooth, timely, and correct power and control adjustments to maintain proper pitch attitude and rate of descent to touchdown."),
        S("PA.IV.J.S8", "Contact the water in a proper pitch attitude, and slow to idle taxi speed."),
        S("PA.IV.J.S9", "Maintain directional control throughout the approach and landing.")
      ],
      ["ASES", "AMES"]
    ),

    T("K", "IV_K", "Rough Water Takeoff and Climb", "PA.IV.K",
      "The water is choppy with whitecaps. Demonstrate a rough water takeoff technique.",
      [
        K("PA.IV.K.K1", "Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
        K("PA.IV.K.K2", "Best angle of climb speed (VX) and best rate of climb speed (VY)."),
        K("PA.IV.K.K3", "Appropriate airplane configuration."),
        K("PA.IV.K.K4", "Appropriate use of rough water takeoff and climb technique.")
      ],
      [
        R("PA.IV.K.R1", "Selection of takeoff path based on pilot capability, airplane performance and limitations, available distance, and wind."),
        R("PA.IV.K.R2", "Effects of:"),
        R("PA.IV.K.R2a", "a. Crosswind"),
        R("PA.IV.K.R2b", "b. Windshear"),
        R("PA.IV.K.R2c", "c. Tailwind"),
        R("PA.IV.K.R2d", "d. Wake turbulence"),
        R("PA.IV.K.R2e", "e. Water surface/condition"),
        R("PA.IV.K.R3", "Abnormal operations, including planning for:"),
        R("PA.IV.K.R3a", "a. Rejected takeoff"),
        R("PA.IV.K.R3b", "b. Potential engine failure in takeoff/climb phase of flight"),
        R("PA.IV.K.R4", "Collision hazards."),
        R("PA.IV.K.R5", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IV.K.R6", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.IV.K.R7", "Gear position in an amphibious airplane.")
      ],
      [
        S("PA.IV.K.S1", "Complete the appropriate checklist(s)."),
        S("PA.IV.K.S2", "Make radio calls as appropriate."),
        S("PA.IV.K.S3", "Verify assigned/correct takeoff path."),
        S("PA.IV.K.S4", "Determine wind direction with or without visible wind direction indicators."),
        S("PA.IV.K.S5", "Position flight controls and configure the airplane for the existing conditions."),
        S("PA.IV.K.S6", "Clear the area, select an appropriate takeoff path considering wind, swells, surface hazards, or vessels."),
        S("PA.IV.K.S6a", "a. Retract the water rudders, as appropriate"),
        S("PA.IV.K.S6b", "b. Advance the throttle smoothly to takeoff power and confirm proper engine and flight instrument indications prior to rotation"),
        S("PA.IV.K.S7", "[Archived]"),
        S("PA.IV.K.S8", "Establish and maintain an appropriate planing attitude, directional control, and correct for porpoising, skipping, and increase in water drag."),
        S("PA.IV.K.S9", "Avoid excessive water spray on the propeller(s)."),
        S("PA.IV.K.S10", "Lift off at minimum airspeed and accelerate to VY +10/- 5 knots before leaving ground effect."),
        S("PA.IV.K.S11", "Configure the airplane after a positive rate of climb has been verified or in accordance with airplane manufacturer’s instructions."),
        S("PA.IV.K.S12", "Maintain VY +10/-5 knots to a safe maneuvering altitude."),
        S("PA.IV.K.S13", "Maintain directional control and proper wind-drift correction throughout takeoff and climb.")
      ],
      ["ASES", "AMES"]
    ),

    T("L", "IV_L", "Rough Water Approach and Landing", "PA.IV.L",
      "Demonstrate a rough water landing. Explain how technique differs from a normal water landing.",
      [
        K("PA.IV.L.K1", "A stabilized approach, including energy management concepts."),
        K("PA.IV.L.K2", "Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("PA.IV.L.K3", "Wind correction techniques on approach and landing."),
        K("PA.IV.L.K4", "When and why rough water techniques are used."),
        K("PA.IV.L.K5", "How to perform a proper rough water approach and landing.")
      ],
      [
        R("PA.IV.L.R1", "Selection of approach path and touchdown area based on pilot capability, airplane performance and limitations, available distance, and wind."),
        R("PA.IV.L.R2", "Effects of:"),
        R("PA.IV.L.R2a", "a. Crosswind"),
        R("PA.IV.L.R2b", "b. Windshear"),
        R("PA.IV.L.R2c", "c. Tailwind"),
        R("PA.IV.L.R2d", "d. Wake turbulence"),
        R("PA.IV.L.R2e", "e. Water surface/condition"),
        R("PA.IV.L.R3", "Planning for a go-around and rejected landing."),
        R("PA.IV.L.R4", "Collision hazards."),
        R("PA.IV.L.R5", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IV.L.R6", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.IV.L.R7", "Gear position in an amphibious airplane.")
      ],
      [
        S("PA.IV.L.S1", "Complete the appropriate checklist(s)."),
        S("PA.IV.L.S2", "Make radio calls as appropriate."),
        S("PA.IV.L.S3", "Ensure the airplane is aligned with the correct/assigned waterway."),
        S("PA.IV.L.S4", "Scan the landing area for traffic and obstructions."),
        S("PA.IV.L.S5", "Select and aim for a suitable touchdown point considering the wind conditions, landing surface, and obstructions."),
        S("PA.IV.L.S6", "Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("PA.IV.L.S7", "Maintain manufacturer’s published approach airspeed or in its absence not more than 1.3 VSO, +10/-5 knots with gust factor applied."),
        S("PA.IV.L.S8", "Maintain directional control and appropriate crosswind correction throughout the approach and landing."),
        S("PA.IV.L.S9", "Make smooth, timely, and correct power and control adjustments to maintain proper pitch attitude and rate of descent to touchdown."),
        S("PA.IV.L.S10", "Contact the water in a proper pitch attitude, considering the type of rough water.")
      ],
      ["ASES", "AMES"]
    ),

    T("M", "IV_M", "Forward Slip to a Landing", "PA.IV.M",
      "You're too high on final. Demonstrate a forward slip to lose altitude.",
      [
        K("PA.IV.M.K1", "Concepts of energy management during a forward slip approach."),
        K("PA.IV.M.K2", "Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("PA.IV.M.K3", "Wind correction techniques during forward slip."),
        K("PA.IV.M.K4", "When and why a forward slip approach is used during an approach.")
      ],
      [
        R("PA.IV.M.R1", "Selection of runway/landing surface, approach path, and touchdown area based on pilot capability, aircraft performance and limitations, available distance, and wind."),
        R("PA.IV.M.R2", "Effects of:"),
        R("PA.IV.M.R2a", "a. Crosswind"),
        R("PA.IV.M.R2b", "b. Windshear"),
        R("PA.IV.M.R2c", "c. Tailwind"),
        R("PA.IV.M.R2d", "d. Wake turbulence"),
        R("PA.IV.M.R2e", "e. Landing surface/condition"),
        R("PA.IV.M.R3", "Planning for:"),
        R("PA.IV.M.R3a", "a. Rejected landing and go-around"),
        R("PA.IV.M.R3b", "b. Land and hold short operations (LAHSO)"),
        R("PA.IV.M.R4", "Collision hazards."),
        R("PA.IV.M.R5", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IV.M.R6", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.IV.M.R7", "Forward slip operations, including fuel flowage, tail stalls with flaps, and airspeed control."),
        R("PA.IV.M.R8", "Surface contact with the airplane’s longitudinal axis misaligned."),
        R("PA.IV.M.R9", "Unstable approach.")
      ],
      [
        S("PA.IV.M.S1", "Complete the appropriate checklist(s)."),
        S("PA.IV.M.S2", "Make radio calls as appropriate."),
        S("PA.IV.M.S3", "Plan and follow a flightpath to the selected landing area considering altitude, wind, terrain, and obstructions."),
        S("PA.IV.M.S4", "Select the most suitable touchdown point based on wind, landing surface, obstructions, and airplane limitations."),
        S("PA.IV.M.S5", "Position airplane on downwind leg, parallel to landing runway or selected landing surface."),
        S("PA.IV.M.S6", "Configure the airplane correctly."),
        S("PA.IV.M.S7", "As necessary, correlate crosswind with direction of forward slip and transition to side slip before touchdown."),
        S("PA.IV.M.S8", "Touch down at a proper pitch attitude, within 400 feet beyond or on the specified point, with no side drift, and with the airplane’s longitudinal axis aligned with and over the runway center/landing path."),
        S("PA.IV.M.S9", "Maintain a ground track aligned with the runway center/landing path.")
      ],
      ["ASEL", "ASES"]
    ),

    T("N", "IV_N", "Go-Around/Rejected Landing", "PA.IV.N",
      "On short final, a vehicle enters the runway. Execute a go-around.",
      [
        K("PA.IV.N.K1", "A stabilized approach, including energy management concepts."),
        K("PA.IV.N.K2", "Effects of atmospheric conditions, including wind and density altitude, on a go-around or rejected landing."),
        K("PA.IV.N.K3", "Wind correction techniques on takeoff/departure and approach/landing.")
      ],
      [
        R("PA.IV.N.R1", "Delayed recognition of the need for a go-around/rejected landing."),
        R("PA.IV.N.R2", "Delayed performance of a go-around at low altitude."),
        R("PA.IV.N.R3", "Power application."),
        R("PA.IV.N.R4", "Configuring the airplane."),
        R("PA.IV.N.R5", "Collision hazards."),
        R("PA.IV.N.R6", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IV.N.R7", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.IV.N.R8", "Runway incursion."),
        R("PA.IV.N.R9", "Managing a go-around/rejected landing after accepting a LAHSO clearance.")
      ],
      [
        S("PA.IV.N.S1", "Complete the appropriate checklist(s)."),
        S("PA.IV.N.S2", "Make radio calls as appropriate."),
        S("PA.IV.N.S3", "Make a timely decision to discontinue the approach to landing."),
        S("PA.IV.N.S4", "Apply takeoff power immediately and transition to climb pitch attitude for VX or VY as appropriate +10/-5 knots."),
        S("PA.IV.N.S5", "Configure the airplane after a positive rate of climb has been verified or in accordance with airplane manufacturer’s instructions."),
        S("PA.IV.N.S6", "Maneuver to the side of the runway/landing area when necessary to clear and avoid conflicting traffic."),
        S("PA.IV.N.S7", "Maintain VY +10/-5 knots to a safe maneuvering altitude."),
        S("PA.IV.N.S8", "Maintain directional control and proper wind-drift correction throughout the climb."),
        S("PA.IV.N.S9", "Use runway incursion avoidance procedures, if applicable.")
      ]
    )
  ]
},

  {
  id: "V",
  roman: "V",
  title: "Performance Maneuvers and Ground Reference Maneuvers",
  phase: "flight",
  tasks: [
    T("A", "V_A", "Steep Turns", "PA.V.A",
      "Demonstrate steep turns in both directions. Maintain the specified altitude, airspeed, and bank angle.",
      [
        K("PA.V.A.K1", "How to conduct a proper steep turn."),
        K("PA.V.A.K2", "Aerodynamics associated with steep turns, including:"),
        K("PA.V.A.K2a", "a. Maintaining coordinated flight"),
        K("PA.V.A.K2b", "b. Overbanking tendencies"),
        K("PA.V.A.K2c", "c. Maneuvering speed, including the impact of weight changes"),
        K("PA.V.A.K2d", "d. Load factor and accelerated stalls"),
        K("PA.V.A.K2e", "e. Rate and radius of turn")
      ],
      [
        R("PA.V.A.R1", "Division of attention between aircraft control and orientation."),
        R("PA.V.A.R2", "Collision hazards."),
        R("PA.V.A.R3", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.V.A.R4", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.V.A.R5", "Uncoordinated flight.")
      ],
      [
        S("PA.V.A.S1", "Clear the area."),
        S("PA.V.A.S2", "Establish the manufacturer's recommended airspeed; or if one is not available, an airspeed not to exceed the maneuvering speed (VA)."),
        S("PA.V.A.S3", "Roll into a coordinated 360° steep turn with approximately a 45° bank."),
        S("PA.V.A.S4", "Perform the Task in the opposite direction, as specified by evaluator."),
        S("PA.V.A.S5", "Maintain the entry altitude ±100 feet, airspeed ±10 knots, bank ±5°, and roll out on the entry heading ±10°.")
      ]
    ),

    T("B", "V_B", "Ground Reference Maneuvers", "PA.V.B",
      "Demonstrate turns around a point and/or rectangular course correcting for wind.",
      [
        K("PA.V.B.K1", "Purpose of ground reference maneuvers."),
        K("PA.V.B.K2", "Effects of wind on ground track and relation to a ground reference."),
        K("PA.V.B.K3", "Effects of bank angle and groundspeed on rate and radius of turn."),
        K("PA.V.B.K4", "Relationship of rectangular course to airport traffic pattern.")
      ],
      [
        R("PA.V.B.R1", "Division of attention between aircraft control and orientation."),
        R("PA.V.B.R2", "Collision hazards."),
        R("PA.V.B.R3", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.V.B.R4", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.V.B.R5", "Uncoordinated flight.")
      ],
      [
        S("PA.V.B.S1", "Clear the area."),
        S("PA.V.B.S2", "Select a suitable ground reference area, line, or point as appropriate."),
        S("PA.V.B.S3", "Plan the maneuver:"),
        S("PA.V.B.S3a", "a. Rectangular course: enter a left or right pattern, 600 to 1,000 feet above ground level (AGL) at an appropriate distance from the selected reference area, 45° to the downwind leg"),
        S("PA.V.B.S3b", "b. S-turns: enter perpendicular to the selected reference line, 600 to 1,000 feet AGL at an appropriate distance from the selected reference area"),
        S("PA.V.B.S3c", "c. Turns around a point: enter at an appropriate distance from the reference point, 600 to 1,000 feet AGL at an appropriate distance from the selected reference area"),
        S("PA.V.B.S4", "Apply adequate wind-drift correction during straight and turning flight to maintain a constant ground track around a rectangular reference area, or to maintain a constant radius turn on each side of a selected reference line or point."),
        S("PA.V.B.S5", "If performing S-Turns, reverse the turn directly over the selected reference line; if performing turns around a point, complete turns in either direction, as specified by the evaluator."),
        S("PA.V.B.S6", "Divide attention between airplane control, traffic avoidance and the ground track while maintaining coordinated flight."),
        S("PA.V.B.S7", "Maintain altitude ±100 feet; maintain airspeed ±10 knots.")
      ]
    )
  ]
},

  {
  id: "VI",
  roman: "VI",
  title: "Navigation",
  phase: "flight",
  tasks: [
    T("A", "VI_A", "Pilotage and Dead Reckoning", "PA.VI.A",
      "Navigate to your first two checkpoints using pilotage and dead reckoning.",
      [
        K("PA.VI.A.K1", "Pilotage and dead reckoning."),
        K("PA.VI.A.K2", "Magnetic compass errors."),
        K("PA.VI.A.K3", "Topography."),
        K("PA.VI.A.K4", "Selection of appropriate:"),
        K("PA.VI.A.K4a", "a. Route"),
        K("PA.VI.A.K4b", "b. Altitude(s)"),
        K("PA.VI.A.K4c", "c. Checkpoints"),
        K("PA.VI.A.K5", "Plotting a course, including:"),
        K("PA.VI.A.K5a", "a. Determining heading, speed, and course"),
        K("PA.VI.A.K5b", "b. Wind correction angle"),
        K("PA.VI.A.K5c", "c. Estimating time, speed, and distance"),
        K("PA.VI.A.K5d", "d. True airspeed and density altitude"),
        K("PA.VI.A.K6", "Power setting selection."),
        K("PA.VI.A.K7", "Planned calculations versus actual results and required corrections.")
      ],
      [
        R("PA.VI.A.R1", "Collision hazards."),
        R("PA.VI.A.R2", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.VI.A.R3", "Unplanned fuel/power consumption, if applicable.")
      ],
      [
        S("PA.VI.A.S1", "Prepare and use a flight log."),
        S("PA.VI.A.S2", "Navigate by pilotage."),
        S("PA.VI.A.S3", "Navigate by means of pre-computed headings, groundspeeds, elapsed time, and reference to landmarks or checkpoints."),
        S("PA.VI.A.S4", "Use the magnetic direction indicator in navigation, including turns to headings."),
        S("PA.VI.A.S5", "Verify position within three nautical miles of the flight-planned route."),
        S("PA.VI.A.S6", "Arrive at the en route checkpoints within five minutes of the initial or revised estimated time of arrival (ETA) and provide a destination estimate."),
        S("PA.VI.A.S7", "Maintain the selected altitude, ±200 feet and heading, ±15°.")
      ]
    ),

    T("B", "VI_B", "Navigation Systems and Radar Services", "PA.VI.B",
      "Use VOR and/or GPS to verify position. Demonstrate requesting VFR flight following.",
      [
        K("PA.VI.B.K1", "Ground-based navigation (identification, orientation, course determination, equipment, tests, regulations, interference, appropriate use of navigation data, and signal integrity)."),
        K("PA.VI.B.K2", "Satellite-based navigation (e.g., equipment, regulations, authorized use of databases, and Receiver Autonomous Integrity Monitoring (RAIM))."),
        K("PA.VI.B.K3", "Radar assistance to visual flight rules (VFR) aircraft (e.g., operations, equipment, available services, traffic advisories)."),
        K("PA.VI.B.K4", "Transponder (Mode(s) A, C, and S) and Automatic Dependent Surveillance-Broadcast (ADS-B).")
      ],
      [
        R("PA.VI.B.R1", "Management of automated navigation and autoflight systems."),
        R("PA.VI.B.R2", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.VI.B.R3", "Limitations of the navigation system in use."),
        R("PA.VI.B.R4", "Loss of a navigation signal."),
        R("PA.VI.B.R5", "Use of an electronic flight bag (EFB), if used.")
      ],
      [
        S("PA.VI.B.S1", "Use an airborne electronic navigation system."),
        S("PA.VI.B.S2", "Determine the airplane’s position using the navigation system."),
        S("PA.VI.B.S3", "Intercept and track a given course, radial, or bearing."),
        S("PA.VI.B.S4", "Recognize and describe the indication of station or waypoint passage."),
        S("PA.VI.B.S5", "Recognize signal loss or interference and take appropriate action, if applicable."),
        S("PA.VI.B.S6", "Use proper communication procedures when utilizing radar services."),
        S("PA.VI.B.S7", "Maintain the selected altitude, ±200 feet and heading, ±15°.")
      ]
    ),

    T("C", "VI_C", "Diversion", "PA.VI.C",
      "Weather is deteriorating ahead. Divert to an alternate airport.",
      [
        K("PA.VI.C.K1", "Selecting an alternate destination."),
        K("PA.VI.C.K2", "Situations that require deviations from flight plan or air traffic control (ATC) instructions.")
      ],
      [
        R("PA.VI.C.R1", "Collision hazards."),
        R("PA.VI.C.R2", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.VI.C.R3", "Circumstances that would make diversion prudent."),
        R("PA.VI.C.R4", "Selecting an appropriate airport or seaplane base."),
        R("PA.VI.C.R5", "Using available resources (e.g., automation, ATC, and flight deck planning aids).")
      ],
      [
        S("PA.VI.C.S1", "Select a suitable destination and route for diversion."),
        S("PA.VI.C.S2", "Make a reasonable estimate of heading, groundspeed, arrival time, and fuel required to the “divert to” destination."),
        S("PA.VI.C.S3", "Maintain the selected altitude, ±200 feet and heading, ±15°."),
        S("PA.VI.C.S4", "Update/interpret weather in flight."),
        S("PA.VI.C.S5", "Use displays of digital weather and aeronautical information, as applicable to maintain situational awareness."),
        S("PA.VI.C.S6", "Promptly divert toward the destination.")
      ]
    ),

    T("D", "VI_D", "Lost Procedures", "PA.VI.D",
      "You cannot positively identify your position. Walk me through lost procedures.",
      [
        K("PA.VI.D.K1", "Methods to determine position."),
        K("PA.VI.D.K2", "Assistance available if lost (e.g., radar services, communication procedures).")
      ],
      [
        R("PA.VI.D.R1", "Collision hazards."),
        R("PA.VI.D.R2", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.VI.D.R3", "Recording times over waypoints."),
        R("PA.VI.D.R4", "When to seek assistance or declare an emergency in a deteriorating situation.")
      ],
      [
        S("PA.VI.D.S1", "Use an appropriate method to determine position."),
        S("PA.VI.D.S2", "Maintain an appropriate heading and climb as necessary."),
        S("PA.VI.D.S3", "Identify prominent landmarks."),
        S("PA.VI.D.S4", "Use navigation systems/facilities or contact an ATC facility for assistance."),
        S("PA.VI.D.S5", "Select an appropriate course of action.")
      ]
    )
  ]
},

  {
  id: "VII",
  roman: "VII",
  title: "Slow Flight and Stalls",
  phase: "flight",
  tasks: [

    T("A", "VII_A", "Maneuvering During Slow Flight", "PA.VII.A",
      "Demonstrate slow flight and maintain control at the edge of the stall.",
      [
        K("PA.VII.A.K1", "Aerodynamics associated with slow flight, including angle of attack, airspeed, load factor, and the relationship between these elements."),
        K("PA.VII.A.K2", "Stall characteristics as a result of airspeed, configuration, and angle of attack."),
        K("PA.VII.A.K3", "Flight controls and power for slow flight."),
        K("PA.VII.A.K4", "Aircraft performance during slow flight."),
        K("PA.VII.A.K5", "Relationship of slow flight to approach and landing.")
      ],
      [
        R("PA.VII.A.R1", "Collision hazards."),
        R("PA.VII.A.R2", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.VII.A.R3", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.VII.A.R4", "Uncoordinated flight."),
        R("PA.VII.A.R5", "Fixation and omission.")
      ],
      [
        S("PA.VII.A.S1", "Clear the area."),
        S("PA.VII.A.S2", "Select an entry altitude that will allow the Task to be completed no lower than 1,500 feet AGL."),
        S("PA.VII.A.S3", "Establish and maintain an airspeed at which any further increase in angle of attack, increase in load factor, or reduction in power would result in an immediate stall warning."),
        S("PA.VII.A.S4", "Accomplish coordinated straight-and-level flight, turns, climbs, and descents with the specified slow flight airspeed."),
        S("PA.VII.A.S5", "Maintain altitude ±100 feet, heading ±10°, and airspeed +10/-0 knots."),
        S("PA.VII.A.S6", "Recover to the specified airspeed, altitude, and heading.")
      ]
    ),

    T("B", "VII_B", "Power-Off Stalls", "PA.VII.B",
      "Demonstrate a power-off stall and recovery.",
      [
        K("PA.VII.B.K1", "Aerodynamics associated with stalls, including angle of attack, airspeed, load factor, and the relationship between these elements."),
        K("PA.VII.B.K2", "Stall recognition and recovery procedures."),
        K("PA.VII.B.K3", "Factors and situations that can lead to a stall during approach and landing."),
        K("PA.VII.B.K4", "Flight control and power usage for stall entry and recovery.")
      ],
      [
        R("PA.VII.B.R1", "Collision hazards."),
        R("PA.VII.B.R2", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.VII.B.R3", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.VII.B.R4", "Uncoordinated flight."),
        R("PA.VII.B.R5", "Improper stall recovery."),
        R("PA.VII.B.R6", "Secondary stall.")
      ],
      [
        S("PA.VII.B.S1", "Clear the area."),
        S("PA.VII.B.S2", "Select an entry altitude that will allow the Task to be completed no lower than 1,500 feet AGL."),
        S("PA.VII.B.S3", "Establish the takeoff, departure, or approach configuration as specified by the evaluator."),
        S("PA.VII.B.S4", "Transition smoothly from cruise to the approach or landing configuration."),
        S("PA.VII.B.S5", "Maintain coordinated flight."),
        S("PA.VII.B.S6", "Induce a stall by smoothly increasing the angle of attack until a stall occurs."),
        S("PA.VII.B.S7", "Recognize and recover promptly after a full stall occurs."),
        S("PA.VII.B.S8", "Reduce the angle of attack, apply appropriate power, and return to the desired flight path."),
        S("PA.VII.B.S9", "Return to the altitude, heading, and airspeed specified by the evaluator.")
      ]
    ),

    T("C", "VII_C", "Power-On Stalls", "PA.VII.C",
      "Demonstrate a departure stall and recovery.",
      [
        K("PA.VII.C.K1", "Aerodynamics associated with stalls, including angle of attack, airspeed, load factor, and the relationship between these elements."),
        K("PA.VII.C.K2", "Stall recognition and recovery procedures."),
        K("PA.VII.C.K3", "Factors and situations that can lead to a stall during takeoff and departure."),
        K("PA.VII.C.K4", "Flight control and power usage for stall entry and recovery.")
      ],
      [
        R("PA.VII.C.R1", "Collision hazards."),
        R("PA.VII.C.R2", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.VII.C.R3", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.VII.C.R4", "Uncoordinated flight."),
        R("PA.VII.C.R5", "Improper stall recovery."),
        R("PA.VII.C.R6", "Secondary stall.")
      ],
      [
        S("PA.VII.C.S1", "Clear the area."),
        S("PA.VII.C.S2", "Select an entry altitude that will allow the Task to be completed no lower than 1,500 feet AGL."),
        S("PA.VII.C.S3", "Establish the takeoff or departure configuration as specified by the evaluator."),
        S("PA.VII.C.S4", "Apply takeoff or climb power."),
        S("PA.VII.C.S5", "Maintain coordinated flight."),
        S("PA.VII.C.S6", "Induce a stall by smoothly increasing the angle of attack until a stall occurs."),
        S("PA.VII.C.S7", "Recognize and recover promptly after a full stall occurs."),
        S("PA.VII.C.S8", "Reduce the angle of attack, apply appropriate power, and return to the desired flight path."),
        S("PA.VII.C.S9", "Return to the altitude, heading, and airspeed specified by the evaluator.")
      ]
    )

  ]
},

  {
  id: "VIII",
  roman: "VIII",
  title: "Basic Instrument Maneuvers",
  phase: "flight",
  tasks: [

    T("A", "VIII_A", "Straight-and-Level Flight", "PA.VIII.A",
      "Maintain straight-and-level flight solely by reference to instruments.",
      [
        K("PA.VIII.A.K1", "Flight instruments, including:"),
        K("PA.VIII.A.K1a", "a. Airspeed indicator"),
        K("PA.VIII.A.K1b", "b. Attitude indicator"),
        K("PA.VIII.A.K1c", "c. Altimeter"),
        K("PA.VIII.A.K1d", "d. Turn coordinator"),
        K("PA.VIII.A.K1e", "e. Heading indicator"),
        K("PA.VIII.A.K1f", "f. Vertical speed indicator"),
        K("PA.VIII.A.K2", "Proper instrument cross-check techniques."),
        K("PA.VIII.A.K3", "Instrument interpretation."),
        K("PA.VIII.A.K4", "Use of trim.")
      ],
      [
        R("PA.VIII.A.R1", "Spatial disorientation."),
        R("PA.VIII.A.R2", "Fixation, omission, and emphasis errors."),
        R("PA.VIII.A.R3", "Failure to maintain aircraft control."),
        R("PA.VIII.A.R4", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.VIII.A.S1", "Maintain altitude ±200 feet."),
        S("PA.VIII.A.S2", "Maintain heading ±20°."),
        S("PA.VIII.A.S3", "Maintain airspeed ±10 knots."),
        S("PA.VIII.A.S4", "Maintain coordinated flight."),
        S("PA.VIII.A.S5", "Use proper instrument cross-check and interpretation."),
        S("PA.VIII.A.S6", "Use trim appropriately.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B", "VIII_B", "Constant Airspeed Climbs", "PA.VIII.B",
      "Demonstrate a constant airspeed climb solely by reference to instruments.",
      [
        K("PA.VIII.B.K1", "Flight instruments and their operation."),
        K("PA.VIII.B.K2", "Proper instrument cross-check techniques."),
        K("PA.VIII.B.K3", "Instrument interpretation."),
        K("PA.VIII.B.K4", "Use of trim.")
      ],
      [
        R("PA.VIII.B.R1", "Spatial disorientation."),
        R("PA.VIII.B.R2", "Fixation, omission, and emphasis errors."),
        R("PA.VIII.B.R3", "Failure to maintain aircraft control."),
        R("PA.VIII.B.R4", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.VIII.B.S1", "Establish a constant airspeed climb."),
        S("PA.VIII.B.S2", "Maintain altitude within ±200 feet of assigned level-off altitude."),
        S("PA.VIII.B.S3", "Maintain heading ±20°."),
        S("PA.VIII.B.S4", "Maintain airspeed ±10 knots."),
        S("PA.VIII.B.S5", "Maintain coordinated flight."),
        S("PA.VIII.B.S6", "Use proper instrument cross-check and interpretation.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("C", "VIII_C", "Constant Airspeed Descents", "PA.VIII.C",
      "Demonstrate a constant airspeed descent solely by reference to instruments.",
      [
        K("PA.VIII.C.K1", "Flight instruments and their operation."),
        K("PA.VIII.C.K2", "Proper instrument cross-check techniques."),
        K("PA.VIII.C.K3", "Instrument interpretation."),
        K("PA.VIII.C.K4", "Use of trim.")
      ],
      [
        R("PA.VIII.C.R1", "Spatial disorientation."),
        R("PA.VIII.C.R2", "Fixation, omission, and emphasis errors."),
        R("PA.VIII.C.R3", "Failure to maintain aircraft control."),
        R("PA.VIII.C.R4", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.VIII.C.S1", "Establish a constant airspeed descent."),
        S("PA.VIII.C.S2", "Maintain altitude within ±200 feet of assigned level-off altitude."),
        S("PA.VIII.C.S3", "Maintain heading ±20°."),
        S("PA.VIII.C.S4", "Maintain airspeed ±10 knots."),
        S("PA.VIII.C.S5", "Maintain coordinated flight."),
        S("PA.VIII.C.S6", "Use proper instrument cross-check and interpretation.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("D", "VIII_D", "Turns to Headings", "PA.VIII.D",
      "Execute standard-rate turns to assigned headings using instruments only.",
      [
        K("PA.VIII.D.K1", "Standard-rate turns."),
        K("PA.VIII.D.K2", "Use of heading and turn instruments."),
        K("PA.VIII.D.K3", "Instrument cross-check and interpretation.")
      ],
      [
        R("PA.VIII.D.R1", "Spatial disorientation."),
        R("PA.VIII.D.R2", "Fixation, omission, and emphasis errors."),
        R("PA.VIII.D.R3", "Failure to maintain aircraft control."),
        R("PA.VIII.D.R4", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.VIII.D.S1", "Perform standard-rate turns."),
        S("PA.VIII.D.S2", "Roll out on assigned heading ±20°."),
        S("PA.VIII.D.S3", "Maintain altitude ±200 feet."),
        S("PA.VIII.D.S4", "Maintain airspeed ±10 knots."),
        S("PA.VIII.D.S5", "Maintain coordinated flight."),
        S("PA.VIII.D.S6", "Use proper instrument cross-check and interpretation.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("E", "VIII_E", "Recovery from Unusual Flight Attitudes", "PA.VIII.E",
      "Recover from both nose-high and nose-low unusual attitudes using instruments only.",
      [
        K("PA.VIII.E.K1", "Recognition of unusual attitudes."),
        K("PA.VIII.E.K2", "Recovery procedures."),
        K("PA.VIII.E.K3", "Instrument cross-check and interpretation.")
      ],
      [
        R("PA.VIII.E.R1", "Spatial disorientation."),
        R("PA.VIII.E.R2", "Improper recovery technique."),
        R("PA.VIII.E.R3", "Excessive control inputs."),
        R("PA.VIII.E.R4", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.VIII.E.S1", "Recognize unusual attitude."),
        S("PA.VIII.E.S2", "Apply correct recovery procedures."),
        S("PA.VIII.E.S3", "Return to straight-and-level flight."),
        S("PA.VIII.E.S4", "Maintain aircraft control."),
        S("PA.VIII.E.S5", "Use proper instrument cross-check and interpretation.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),
    T("F", "VIII_F", "Radio Communications, Navigation Systems/Facilities, and Radar Services", "PA.VIII.F",
      "Demonstrate radio communications, navigation systems/facilities, and radar services available for use during flight solely by reference to instruments.",
      [
        K("PA.VIII.F.K1", "Operating communications equipment, including identifying and selecting radio frequencies, requesting and following air traffic control (ATC) instructions."),
        K("PA.VIII.F.K2", "Operating navigation equipment, including functions and displays, and following bearings, radials, or courses."),
        K("PA.VIII.F.K3", "Air traffic control facilities and services.")
      ],
      [
        R("PA.VIII.F.R1", "When to seek assistance or declare an emergency in a deteriorating situation."),
        R("PA.VIII.F.R2", "Using available resources (e.g., automation, ATC, and flight deck planning aids).")
      ],
      [
        S("PA.VIII.F.S1", "Maintain airplane control while selecting proper communications frequencies, identifying the appropriate facility, and managing navigation equipment."),
        S("PA.VIII.F.S2", "Comply with ATC instructions."),
        S("PA.VIII.F.S3", "[Archived]")
      ],
      ["ASEL", "ASES", "AMEL", "AMES"]
    )
  ]
},

  {
  id: "IX",
  roman: "IX",
  title: "Emergency Operations",
  phase: "flight",
  tasks: [
    T("A", "IX_A", "Emergency Descent", "PA.IX.A",
      "You have smoke, fire, or another condition requiring an immediate emergency descent. Demonstrate the emergency descent procedure.",
      [
        K("PA.IX.A.K1", "Situations that would require an emergency descent (e.g., depressurization, smoke, or engine fire)."),
        K("PA.IX.A.K2", "Immediate action items and emergency procedures."),
        K("PA.IX.A.K3", "Airspeed, including airspeed limitations."),
        K("PA.IX.A.K4", "Aircraft performance and limitations.")
      ],
      [
        R("PA.IX.A.R1", "Altitude, wind, terrain, obstructions, gliding distance, and available landing distance considerations."),
        R("PA.IX.A.R2", "Collision hazards."),
        R("PA.IX.A.R3", "Configuring the airplane."),
        R("PA.IX.A.R4", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.IX.A.S1", "Clear the area."),
        S("PA.IX.A.S2", "Establish and maintain the appropriate airspeed and configuration appropriate to the scenario specified by the evaluator and as covered in Pilot's Operating Handbook (POH)/Airplane Flight Manual (AFM) for the emergency descent."),
        S("PA.IX.A.S3", "Maintain orientation, divide attention appropriately, and plan and execute a smooth recovery."),
        S("PA.IX.A.S4", "Use bank angle between 30° and 45° to maintain positive load factors during the descent."),
        S("PA.IX.A.S5", "Maintain appropriate airspeed +0/-10 knots, and level off at a specified altitude ±100 feet."),
        S("PA.IX.A.S6", "Complete the appropriate checklist(s)."),
        S("PA.IX.A.S7", "Make radio calls as appropriate."),
        S("PA.IX.A.S8", "Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ],
      ["ASEL", "ASES", "AMEL", "AMES"]
    ),

    T("B", "IX_B", "Emergency Approach and Landing (Simulated)", "PA.IX.B",
      "Your engine just failed. Show me your emergency procedures: select a landing site, establish best glide, and troubleshoot.",
      [
        K("PA.IX.B.K1", "Immediate action items and emergency procedures."),
        K("PA.IX.B.K2", "Airspeed, including:"),
        K("PA.IX.B.K2a", "a. Importance of best glide speed and its relationship to distance"),
        K("PA.IX.B.K2b", "b. Difference between best glide speed and minimum sink speed"),
        K("PA.IX.B.K2c", "c. Effects of wind on glide distance"),
        K("PA.IX.B.K3", "Effects of atmospheric conditions on emergency approach and landing."),
        K("PA.IX.B.K4", "A stabilized approach, including energy management concepts."),
        K("PA.IX.B.K5", "Emergency Locator Transmitters (ELTs) and other emergency locating devices."),
        K("PA.IX.B.K6", "Air traffic control (ATC) services to aircraft in distress.")
      ],
      [
        R("PA.IX.B.R1", "Altitude, wind, terrain, obstructions, gliding distance, and available landing distance considerations."),
        R("PA.IX.B.R2", "Following or changing the planned flightpath to the selected landing area."),
        R("PA.IX.B.R3", "Collision hazards."),
        R("PA.IX.B.R4", "Configuring the airplane."),
        R("PA.IX.B.R5", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IX.B.R6", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.IX.B.S1", "Establish and maintain the recommended best glide airspeed, ±10 knots."),
        S("PA.IX.B.S2", "Configure the airplane in accordance with the Pilot's Operating Handbook (POH)\\Airplane Flight Manual (AFM) and existing conditions."),
        S("PA.IX.B.S3", "Select a suitable landing area considering altitude, wind, terrain, obstructions, and available glide distance."),
        S("PA.IX.B.S4", "Plan and follow a flightpath to the selected landing area considering altitude, wind, terrain, and obstructions."),
        S("PA.IX.B.S5", "Prepare for landing as specified by the evaluator."),
        S("PA.IX.B.S6", "Complete the appropriate checklist(s).")
      ],
      ["ASEL", "ASES"]
    ),

    T("C", "IX_C", "Systems and Equipment Malfunctions", "PA.IX.C",
      "Oil pressure is dropping and oil temperature is rising. What do you do? Also describe response to electrical, avionics, vacuum, flight control, and landing gear malfunctions as applicable.",
      [
        K("PA.IX.C.K1", "Causes of partial or complete power loss related to the specific type of powerplant(s)."),
        K("PA.IX.C.K1a", "a. [Archived]"),
        K("PA.IX.C.K1b", "b. [Archived]"),
        K("PA.IX.C.K1c", "c. [Archived]"),
        K("PA.IX.C.K1d", "d. [Archived]"),
        K("PA.IX.C.K2", "System and equipment malfunctions specific to the aircraft, including:"),
        K("PA.IX.C.K2a", "a. Electrical malfunction"),
        K("PA.IX.C.K2b", "b. Vacuum/pressure and associated flight instrument malfunctions"),
        K("PA.IX.C.K2c", "c. Pitot-static system malfunction"),
        K("PA.IX.C.K2d", "d. Electronic flight deck display malfunction"),
        K("PA.IX.C.K2e", "e. Landing gear or flap malfunction"),
        K("PA.IX.C.K2f", "f. Inoperative trim"),
        K("PA.IX.C.K3", "Causes and remedies for smoke or fire onboard the aircraft."),
        K("PA.IX.C.K4", "Any other system specific to the aircraft (e.g., supplemental oxygen, deicing)."),
        K("PA.IX.C.K5", "Inadvertent door or window opening.")
      ],
      [
        R("PA.IX.C.R1", "Checklist usage for a system or equipment malfunction."),
        R("PA.IX.C.R2", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.IX.C.R3", "Undesired aircraft state."),
        R("PA.IX.C.R4", "Startle response.")
      ],
      [
        S("PA.IX.C.S1", "Determine appropriate action for simulated emergencies specified by the evaluator, from at least three of the elements or sub-elements listed in K1 through K5."),
        S("PA.IX.C.S2", "Complete the appropriate checklist(s).")
      ],
      ["ASEL", "ASES", "AMEL", "AMES"]
    ),

    T("D", "IX_D", "Emergency Equipment and Survival Gear", "PA.IX.D",
      "What emergency equipment is on board and where? Describe survival priorities if you landed off-airport.",
      [
        K("PA.IX.D.K1", "Emergency Locator Transmitter (ELT) operations, limitations, and testing requirements."),
        K("PA.IX.D.K2", "Fire extinguisher operations and limitations."),
        K("PA.IX.D.K3", "Emergency equipment and survival gear needed for:"),
        K("PA.IX.D.K3a", "a. Climate extremes (hot/cold)"),
        K("PA.IX.D.K3b", "b. Mountainous terrain"),
        K("PA.IX.D.K3c", "c. Overwater operations"),
        K("PA.IX.D.K4", "When to deploy a ballistic parachute and associated passenger briefings, if equipped."),
        K("PA.IX.D.K5", "When to activate an emergency auto-land system and brief passengers, if equipped.")
      ],
      [
        R("PA.IX.D.R1", "Survival gear (water, clothing, shelter) for 48 to 72 hours."),
        R("PA.IX.D.R2", "Use of a ballistic parachute system."),
        R("PA.IX.D.R3", "Use of an emergency auto-land system, if installed.")
      ],
      [
        S("PA.IX.D.S1", "Identify appropriate equipment and personal gear."),
        S("PA.IX.D.S2", "Brief passengers on proper use of on-board emergency equipment and survival gear."),
        S("PA.IX.D.S3", "Simulate ballistic parachute deployment procedures, if equipped.")
      ],
      ["ASEL", "ASES", "AMEL", "AMES"]
    ),

    T("E", "IX_E", "Engine Failure During Takeoff Before VMC (Simulated)", "PA.IX.E",
      "During the takeoff roll you lose an engine before reaching VMC. Describe and demonstrate the correct procedure.",
      [
        K("PA.IX.E.K1", "Factors affecting minimum control airspeed with an inoperative engine (VMC)."),
        K("PA.IX.E.K2", "VMC (red line) and best single-engine rate of climb airspeed (VYSE) (blue line)."),
        K("PA.IX.E.K3", "Accelerate/stop distance.")
      ],
      [
        R("PA.IX.E.R1", "Potential engine failure during takeoff."),
        R("PA.IX.E.R2", "Configuring the airplane."),
        R("PA.IX.E.R3", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.IX.E.S1", "Close the throttles smoothly and promptly when a simulated engine failure occurs."),
        S("PA.IX.E.S2", "Maintain directional control and apply brakes (AMEL), or flight controls (AMES), as necessary.")
      ],
      ["AMEL", "AMES"]
    ),

    T("F", "IX_F", "Engine Failure After Liftoff (Simulated)", "PA.IX.F",
      "You've just lifted off and one engine fails. Demonstrate proper procedures to maintain control.",
      [
        K("PA.IX.F.K1", "Factors affecting minimum controllable speed (VMC)."),
        K("PA.IX.F.K2", "VMC (red line), VYSE (blue line), and safe single-engine speed (VSSE)."),
        K("PA.IX.F.K3", "Accelerate/stop and accelerate/go distances."),
        K("PA.IX.F.K4", "How to identify, verify, feather, and secure an inoperative engine."),
        K("PA.IX.F.K5", "Importance of drag reduction, including propeller feathering, gear and flap retraction, the manufacturer’s recommended control input and its relation to zero sideslip."),
        K("PA.IX.F.K6", "Simulated propeller feathering and the evaluator’s zero-thrust procedures and responsibilities.")
      ],
      [
        R("PA.IX.F.R1", "Potential engine failure after lift-off."),
        R("PA.IX.F.R2", "Collision hazards."),
        R("PA.IX.F.R3", "Configuring the airplane."),
        R("PA.IX.F.R4", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IX.F.R5", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.IX.F.S1", "Promptly recognize an engine failure, maintain control, and use appropriate emergency procedures."),
        S("PA.IX.F.S2", "Establish VYSE; if obstructions are present, establish best single-engine angle of climb speed (VXSE) or VMC +5 knots, whichever is greater, until obstructions are cleared. Then transition to VYSE."),
        S("PA.IX.F.S3", "Reduce drag by retracting landing gear and flaps in accordance with the manufacturer’s guidance."),
        S("PA.IX.F.S4", "Simulate feathering the propeller on the inoperative engine (evaluator should then establish zero thrust on the inoperative engine)."),
        S("PA.IX.F.S5", "Use flight controls in the proper combination as recommended by the manufacturer, or as required to maintain best performance, and trim as required."),
        S("PA.IX.F.S6", "Monitor the operating engine and aircraft systems and make adjustments as necessary."),
        S("PA.IX.F.S7", "Recognize the airplane’s performance capabilities. If a climb is not possible at VYSE, maintain VYSE and return to the departure airport for landing, or initiate an approach to the most suitable landing area available."),
        S("PA.IX.F.S8", "Simulate securing the inoperative engine."),
        S("PA.IX.F.S9", "Maintain heading ±10° and airspeed ±5 knots."),
        S("PA.IX.F.S10", "Complete the appropriate checklist(s).")
      ],
      ["AMEL", "AMES"]
    ),

    T("G", "IX_G", "Approach and Landing with an Inoperative Engine (Simulated)", "PA.IX.G",
      "Demonstrate an approach and landing with a simulated inoperative engine.",
      [
        K("PA.IX.G.K1", "Factors affecting minimum controllable speed (VMC)."),
        K("PA.IX.G.K2", "VMC (red line) and best single-engine rate of climb airspeed (VYSE) (blue line)."),
        K("PA.IX.G.K3", "How to identify, verify, feather, and secure an inoperative engine."),
        K("PA.IX.G.K4", "Importance of drag reduction, including propeller feathering, gear and flap retraction, the manufacturer’s recommended control input and its relation to zero sideslip."),
        K("PA.IX.G.K5", "Applicant responsibilities during simulated feathering.")
      ],
      [
        R("PA.IX.G.R1", "Potential engine failure inflight or during an approach."),
        R("PA.IX.G.R2", "Collision hazards."),
        R("PA.IX.G.R3", "Configuring the airplane."),
        R("PA.IX.G.R4", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.IX.G.R5", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.IX.G.R6", "Possible single-engine go-around.")
      ],
      [
        S("PA.IX.G.S1", "Promptly recognize an engine failure and maintain positive aircraft control."),
        S("PA.IX.G.S2", "Set the engine controls, reduce drag, identify and verify the inoperative engine, and simulate feathering of the propeller on the inoperative engine (evaluator should then establish zero thrust on the inoperative engine)."),
        S("PA.IX.G.S3", "Use flight controls in the proper combination as recommended by the manufacturer, or as required to maintain best performance, and trim as required."),
        S("PA.IX.G.S4", "Follow the manufacturer’s recommended emergency procedures and complete the appropriate checklist."),
        S("PA.IX.G.S5", "Monitor the operating engine and aircraft systems and make adjustments as necessary."),
        S("PA.IX.G.S6", "Maintain the manufacturer’s recommended approach airspeed +10/-5 knots, in the landing configuration with a stabilized approach, until landing is assured."),
        S("PA.IX.G.S7", "Make smooth, timely, and correct control application before, during, and after touchdown."),
        S("PA.IX.G.S8", "Touch down on the first one-third of available runway/landing surface, with no drift, and the airplane’s longitudinal axis aligned with and over the runway center or landing path."),
        S("PA.IX.G.S9", "Maintain directional control and appropriate crosswind correction throughout the approach and landing."),
        S("PA.IX.G.S10", "Complete the appropriate checklist(s).")
      ],
      ["AMEL", "AMES"]
    )
  ]
},

  {
  id: "X",
  roman: "X",
  title: "Multiengine Operations",
  phase: "flight",
  tasks: [
    T("A", "X_A", "Maneuvering with One Engine Inoperative", "PA.X.A",
      "Demonstrate maneuvering flight with one engine inoperative including turns, climbs, and descents.",
      [
        K("PA.X.A.K1", "Factors affecting minimum controllable speed (VMC)."),
        K("PA.X.A.K2", "VMC (red line) and best single-engine rate of climb airspeed (VYSE) (blue line)."),
        K("PA.X.A.K3", "How to identify, verify, feather, and secure an inoperative engine."),
        K("PA.X.A.K4", "Importance of drag reduction, including propeller feathering, gear and flap retraction, the manufacturer's recommended control input and its relation to zero sideslip."),
        K("PA.X.A.K5", "Feathering, securing, unfeathering, and restarting.")
      ],
      [
        R("PA.X.A.R1", "Potential engine failure during flight."),
        R("PA.X.A.R2", "Collision hazards."),
        R("PA.X.A.R3", "Configuring the airplane."),
        R("PA.X.A.R4", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.X.A.R5", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.X.A.S1", "Recognize an engine failure, maintain control, use manufacturer’s memory item procedures, and use appropriate emergency procedures."),
        S("PA.X.A.S2", "Set the engine controls, identify and verify the inoperative engine, and feather the appropriate propeller."),
        S("PA.X.A.S3", "Use flight controls in the proper combination as recommended by the manufacturer, or as required to maintain best performance, and trim as required."),
        S("PA.X.A.S4", "Attempt to determine and resolve the reason for the engine failure."),
        S("PA.X.A.S5", "Secure the inoperative engine and monitor the operating engine and make necessary adjustments."),
        S("PA.X.A.S6", "Restart the inoperative engine using manufacturer’s restart procedures."),
        S("PA.X.A.S7", "Maintain altitude ±100 feet or minimum sink rate if applicable, airspeed ±10 knots, and selected headings ±10°."),
        S("PA.X.A.S8", "Complete the appropriate checklist(s).")
      ],
      ["AMEL", "AMES"]
    ),

    T("B", "X_B", "VMC Demonstration", "PA.X.B",
      "Demonstrate VMC. Explain the factors that affect VMC and describe the recovery procedure.",
      [
        K("PA.X.B.K1", "Factors affecting VMC and how VMC differs from stall speed (VS)."),
        K("PA.X.B.K2", "VMC (red line), VYSE (blue line), and safe single-engine speed (VSSE)."),
        K("PA.X.B.K3", "Cause of loss of directional control at airspeeds below VMC."),
        K("PA.X.B.K4", "Proper procedures for maneuver entry and safe recovery.")
      ],
      [
        R("PA.X.B.R1", "Configuring the airplane."),
        R("PA.X.B.R2", "Maneuvering with one engine inoperative."),
        R("PA.X.B.R3", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.X.B.S1", "Configure the airplane in accordance with the manufacturer’s recommendations, in the absence of the manufacturer’s recommendations, then at safe single-engine speed (VSSE/VYSE), as appropriate, and:"),
        S("PA.X.B.S1a", "a. Landing gear retracted"),
        S("PA.X.B.S1b", "b. Flaps set for takeoff"),
        S("PA.X.B.S1c", "c. Cowl flaps set for takeoff"),
        S("PA.X.B.S1d", "d. Trim set for takeoff"),
        S("PA.X.B.S1e", "e. Propellers set for high revolutions per minute (rpm)"),
        S("PA.X.B.S1f", "f. Power on critical engine reduced to idle and propeller windmilling"),
        S("PA.X.B.S1g", "g. Power on operating engine set to takeoff or maximum available power"),
        S("PA.X.B.S2", "Establish a single-engine climb attitude with the airspeed at approximately 10 knots above VSSE."),
        S("PA.X.B.S3", "Establish a bank angle not to exceed 5° toward the operating engine, as required for best performance and controllability."),
        S("PA.X.B.S4", "Increase the pitch attitude slowly to reduce the airspeed at approximately 1 knot per second while applying increased rudder pressure as needed to maintain directional control."),
        S("PA.X.B.S5", "Recognize and recover at the first indication of loss of directional control, stall warning, or buffet."),
        S("PA.X.B.S6", "Recover promptly by simultaneously reducing power sufficiently on the operating engine, decreasing the angle of attack as necessary to regain airspeed and directional control, and without adding power on the simulated failed engine."),
        S("PA.X.B.S7", "Recover within 20° of entry heading."),
        S("PA.X.B.S8", "Advance power smoothly on the operating engine and accelerate to VSSE/VYSE, as appropriate, +10/-5 knots during recovery.")
      ],
      ["AMEL", "AMES"]
    ),

    T("C", "X_C", "One Engine Inoperative (Simulated) (solely by Reference to Instruments) During Straight-and-Level Flight and Turns", "PA.X.C",
      "Using instrument references, demonstrate straight-and-level flight and turns with one engine inoperative.",
      [
        K("PA.X.C.K1", "Procedures used if engine failure occurs during straight-and-level flight and turns while on instruments.")
      ],
      [
        R("PA.X.C.R1", "Identification of the inoperative engine."),
        R("PA.X.C.R2", "Inability to climb or maintain altitude with an inoperative engine."),
        R("PA.X.C.R3", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.X.C.R4", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.X.C.R5", "Fuel management during single-engine operation.")
      ],
      [
        S("PA.X.C.S1", "Promptly recognize an engine failure and maintain positive aircraft control."),
        S("PA.X.C.S2", "Set the engine controls, reduce drag, identify and verify the inoperative engine, and simulate feathering of the propeller on the inoperative engine (evaluator should then establish zero thrust on the inoperative engine)."),
        S("PA.X.C.S3", "Establish the best engine-inoperative airspeed and trim the airplane."),
        S("PA.X.C.S4", "Use flight controls in the proper combination as recommended by the manufacturer, or as required to maintain best performance, and trim as required."),
        S("PA.X.C.S5", "Verify the prescribed checklist procedures used for securing the inoperative engine."),
        S("PA.X.C.S6", "Attempt to determine and resolve the reason for the engine failure."),
        S("PA.X.C.S7", "Monitor engine functions and make necessary adjustments."),
        S("PA.X.C.S8", "Maintain the specified altitude ±100 feet or minimum sink rate if applicable, airspeed ±10 knots, and the specified heading ±10°."),
        S("PA.X.C.S9", "Assess the aircraft’s performance capability and decide an appropriate action to ensure a safe landing."),
        S("PA.X.C.S10", "Avoid loss of airplane control or attempted flight contrary to the engine-inoperative operating limitations of the airplane."),
        S("PA.X.C.S11", "Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ],
      ["AMEL", "AMES"]
    ),

    T("D", "X_D", "Instrument Approach and Landing with an Inoperative Engine (Simulated)", "PA.X.D",
      "Fly an instrument approach and landing with one engine inoperative. Describe configuration management throughout.",
      [
        K("PA.X.D.K1", "Instrument approach procedures with one engine inoperative.")
      ],
      [
        R("PA.X.D.R1", "Potential engine failure during approach and landing."),
        R("PA.X.D.R2", "Collision hazards."),
        R("PA.X.D.R3", "Configuring the airplane."),
        R("PA.X.D.R4", "Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("PA.X.D.R5", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.X.D.R6", "Performing a go-around/rejected landing with an engine failure.")
      ],
      [
        S("PA.X.D.S1", "Promptly recognize an engine failure and maintain positive aircraft control."),
        S("PA.X.D.S2", "Set the engine controls, reduce drag, identify and verify the inoperative engine, and simulate feathering of the propeller on the inoperative engine (evaluator should then establish zero thrust on the inoperative engine)."),
        S("PA.X.D.S3", "Use flight controls in the proper combination as recommended by the manufacturer, or as required to maintain best performance, and trim as required."),
        S("PA.X.D.S4", "Follow the manufacturer’s recommended emergency procedures and complete the appropriate checklist."),
        S("PA.X.D.S5", "Monitor the operating engine and aircraft systems and make adjustments as necessary."),
        S("PA.X.D.S6", "Request and follow an actual or a simulated air traffic control (ATC) clearance for an instrument approach."),
        S("PA.X.D.S7", "Maintain altitude ±100 feet or minimum sink rate if applicable, airspeed ±10 knots, and selected heading ±10°."),
        S("PA.X.D.S8", "Establish a rate of descent that ensures arrival at the minimum descent altitude (MDA) or decision altitude (DA)/decision height (DH) with the airplane in a position from which a descent to a landing on the intended runway or landing path can be made, either straight in or circling as appropriate."),
        S("PA.X.D.S9", "On final approach segment, maintain vertical (as applicable) and lateral guidance within ¾-scale deflection."),
        S("PA.X.D.S10", "Avoid loss of airplane control or attempted flight contrary to the operating limitations of the airplane."),
        S("PA.X.D.S11", "Comply with the published criteria for the aircraft approach category if circling."),
        S("PA.X.D.S12", "Execute a landing."),
        S("PA.X.D.S13", "Complete the appropriate checklist(s).")
      ],
      ["AMEL", "AMES"]
    )
  ]
},
  {
  id: "XI",
  roman: "XI",
  title: "Night Operations",
  phase: "flight",
  tasks: [
    T("A", "XI_A", "Night Operations", "PA.XI.A",
      "Describe physiological considerations for night flight, illusions during night approaches, and how procedures change.",
      [
        K("PA.XI.A.K1", "Physiological aspects of vision related to night flying."),
        K("PA.XI.A.K2", "Lighting systems identifying airports, runways, taxiways and obstructions, as well as pilot controlled lighting."),
        K("PA.XI.A.K3", "Airplane equipment and lighting requirements for night operations."),
        K("PA.XI.A.K4", "Personal equipment essential for night flight."),
        K("PA.XI.A.K5", "Night orientation, navigation, chart reading techniques and methods for maintaining night vision effectiveness."),
        K("PA.XI.A.K6", "Night taxi operations."),
        K("PA.XI.A.K7", "Interpretation of traffic position and direction based solely on position lights."),
        K("PA.XI.A.K8", "Visual illusions at night.")
      ],
      [
        R("PA.XI.A.R1", "Collision hazards."),
        R("PA.XI.A.R2", "Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("PA.XI.A.R3", "Effect of visual illusions and night adaptation during all phases of night flying."),
        R("PA.XI.A.R4", "Runway incursion."),
        R("PA.XI.A.R5", "Night currency versus proficiency."),
        R("PA.XI.A.R6", "Weather considerations specific to night operations."),
        R("PA.XI.A.R7", "Inoperative equipment.")
      ],
      [
          S("S1","No Specific Skills Task listed in the ACS"),
      ]
    )
  ]
},

  {
  id: "XII",
  roman: "XII",
  title: "Postflight Procedures",
  phase: "ground",
  tasks: [

    T("A", "XII_A", "After Landing, Parking, and Securing", "PA.XII.A",
      "After landing, demonstrate proper taxi in, shutdown, and securing procedures. Explain how you would leave the aircraft for an extended period.",
      [
        K("PA.XII.A.K1", "After-landing, parking, and securing procedures."),
        K("PA.XII.A.K2", "Airplane shutdown procedures."),
        K("PA.XII.A.K3", "Securing procedures for various weather conditions."),
        K("PA.XII.A.K4", "Postflight inspection procedures."),
        K("PA.XII.A.K5", "Discrepancy reporting procedures.")
      ],
      [
        R("PA.XII.A.R1", "Collision hazards."),
        R("PA.XII.A.R2", "Damage to aircraft due to improper securing."),
        R("PA.XII.A.R3", "Foreign object damage."),
        R("PA.XII.A.R4", "Inadequate postflight inspection."),
        R("PA.XII.A.R5", "Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("PA.XII.A.S1", "Maintain situational awareness and positive aircraft control during taxi."),
        S("PA.XII.A.S2", "Park in an appropriate area considering wind and obstacles."),
        S("PA.XII.A.S3", "Complete the appropriate checklist(s)."),
        S("PA.XII.A.S4", "Shut down the engine using the manufacturer’s recommended procedures."),
        S("PA.XII.A.S5", "Secure the aircraft using appropriate tie-down, control locks, and covers."),
        S("PA.XII.A.S6", "Perform a postflight inspection."),
        S("PA.XII.A.S7", "Record discrepancies.")
      ],
      ["ASEL", "AMEL"]
    ),

    T("B", "XII_B", "Seaplane Post-Landing Procedures", "PA.XII.B",
      "Demonstrate anchoring, docking, mooring, and ramping/beaching procedures.",
      [
        K("PA.XII.B.K1", "Mooring."),
        K("PA.XII.B.K2", "Docking."),
        K("PA.XII.B.K3", "Anchoring."),
        K("PA.XII.B.K4", "Beaching/ramping."),
        K("PA.XII.B.K5", "Postflight inspection and recording discrepancies.")
      ],
      [
        R("PA.XII.B.R1", "Activities and distractions."),
        R("PA.XII.B.R2", "[Archived]"),
        R("PA.XII.B.R3", "Seaplane base-specific security procedures."),
        R("PA.XII.B.R4", "Disembarking passengers safely and monitoring passenger movement.")
      ],
      [
        S("PA.XII.B.S1", "If anchoring, select a suitable area and use adequate anchors and lines."),
        S("PA.XII.B.S2", "If not anchoring, approach dock, mooring buoy, beach, or ramp properly and safely."),
        S("PA.XII.B.S3", "Complete the appropriate checklist(s)."),
        S("PA.XII.B.S4", "Conduct postflight inspection and document discrepancies or servicing requirements."),
        S("PA.XII.B.S5", "Secure the seaplane considering wind, waves, and water level changes.")
      ],
      ["ASES", "AMES"]
    )

  ]
},
];