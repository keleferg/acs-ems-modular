function T(id, fc, title, code, scenario, k, r, s, ratings) {
  const obj = { id, filterCode: fc, title, code, scenario, knowledge: k, risk: r, skill: s };
  if (ratings) obj.ratings = ratings;
  return obj;
}

function K(code, text) { return { code, text }; }
function R(code, text) { return { code, text }; }
function S(code, text) { return { code, text }; }

export const ATP_DATA = [
  {
    id: "I",
    roman: "I",
    title: "Preflight Preparation",
    phase: "ground",
    tasks: [
      T("A", "I_A", "Operation of Systems", "AA.I.A",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with aircraft systems and their components; and their normal, abnormal, and emergency procedures.",
        [
          K("AA.I.A.K1", "Landing gear–extension/retraction system(s), indicators, float devices, brakes, antiskid, tires, nose-wheel steering, and shock absorbers."),
          K("AA.I.A.K2", "Powerplant–controls and indications, induction system, carburetor and fuel injection, turbocharging, cooling, mounting points, turbine wheels, compressors, deicing, anti-icing, and other related components."),
          K("AA.I.A.K3", "Propellers–type, controls, feathering/unfeathering, auto-feather, negative torque sensing, synchronizing, synchrophasing, and thrust reverse, including uncommanded reverse procedures."),
          K("AA.I.A.K4", "Fuel system–capacity, drains, pumps, controls, indicators, cross-feeding, transferring, jettisoning, fuel grade, color and additives, fueling and defueling procedures, and fuel substitutions."),
          K("AA.I.A.K5", "Oil system–capacity, allowable types of oil, quantities, and indicators."),
          K("AA.I.A.K6", "Hydraulic system–capacity, pumps, pressure, reservoirs, allowable types of fluid, and regulators."),
          K("AA.I.A.K7", "Electrical system–alternators, generators, batteries, circuit breakers and protection devices, controls, indicators, and external and auxiliary power sources and ratings."),
          K("AA.I.A.K8", "Pneumatic and environmental systems–heating, cooling, ventilation, oxygen, pressurization, supply for ice protection systems, controls, indicators, and regulating devices."),
          K("AA.I.A.K9", "Avionics and communications–autopilot, flight director, Electronic Flight Instrument Systems (EFIS), Flight Management System (FMS), Electronic Flight Bag (EFB), Radar, Inertial Navigation Systems (INS), Global Navigation Satellite System (GNSS), Space-Based Augmentation System (SBAS), Ground-Based Augmentation System (GBAS), ground-based navigation systems and components, Automatic Dependent Surveillance – Broadcast (ADS-B) In and Out, Automatic Dependent Surveillance – Contract (ADS-C), traffic awareness/warning/avoidance systems, terrain awareness/warning/alert systems, communication systems (e.g., data link, Ultra High Frequency (UHF)/Very High Frequency (VHF)/High Frequency (HF), satellite), Controller Pilot Data Link Communication (CPDLC), indicating devices, transponder, and emergency locator transmitter, Head Up-Display (HUD)."),
          K("AA.I.A.K10", "Ice protection–anti-ice, deice, pitot-static system protection, turbine inlet, propeller, windshield, airfoil surfaces, and other related components."),
          K("AA.I.A.K11", "Crewmember and passenger equipment–oxygen system, survival gear, emergency exits, evacuation procedures and crew duties, quick donning oxygen mask for crewmembers, passenger oxygen system."),
          K("AA.I.A.K12", "Flight controls–ailerons, elevator(s), rudder(s), control tabs, control boost/augmentation systems, flaps, spoilers, leading edge devices, speed brakes, stability augmentation system (e.g., yaw damper), and trim systems."),
          K("AA.I.A.K13", "Pitot-static system–associated instruments and the power source for those flight instruments. Operation and power sources for other flight instruments."),
          K("AA.I.A.K14", "Fire & smoke detection, protection, and suppression–powerplant, cargo and passenger compartments, lavatory, pneumatic and environmental, electrical/avionics, and batteries (on aircraft and personal electronic devices)."),
          K("AA.I.A.K15", "Envelope protection–angle of attack warning and protection, and speed protection."),
          K("AA.I.A.K16", "The contents of the Pilot Owner's Handbook (POH) or Airplane Flight Manual (AFM) with regard to the systems and components in the airplane."),
          K("AA.I.A.K17", "How to use a Minimum Equipment List (MEL) and a Configuration Deviation List (CDL).")
        ],
        [
          R("AA.I.A.R1", "Detection of system malfunctions or failures."),
          R("AA.I.A.R2", "Management of a system failure."),
          R("AA.I.A.R3", "Monitoring and management of automated systems."),
          R("AA.I.A.R4", "Following checklists or procedures.")
        ],
        [
          S("AA.I.A.S1", "Explain and describe the operation of the aircraft systems and components using correct terminology."),
          S("AA.I.A.S2", "Recall immediate action items or memory items, if appropriate."),
          S("AA.I.A.S3", "Identify system or component limitations listed in the POH/AFM."),
          S("AA.I.A.S4", "Demonstrate or describe, as appropriate, the process for deferring inoperative equipment (e.g., MEL) and using a CDL."),
          S("AA.I.A.S5", "Comply with operations specifications, management specifications, and letters of authorization, if applicable."),
          S("AA.I.A.S6", "Through the use of the appropriate checklists and normal and abnormal procedures, demonstrate the proper use of the aircraft systems, subsystems, and devices, as determined by the evaluator.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ), 
      
      T("B","I_B","Performance and Limitations","AA.I.B",
        "Objective: To determine that the applicant exhibits satisfactory knowledge, risk management, and skills associated with operating an aircraft safely within its operating envelope.",
        [
          K("AA.I.B.K1","Elements related to performance and limitations by explaining the use of charts, tables, and data to determine performance."),
          K("AA.I.B.K2","How to determine the following, as applicable to the class sought:"),
          K("AA.I.B.K2a","a. Accelerate-stop / accelerate-go distance"),
          K("AA.I.B.K2b","b. Takeoff performance [e.g., balance field length and Velocity, Minimum Control (ground) (VMCG)]"),
          K("AA.I.B.K2c","c. Climb performance"),
          K("AA.I.B.K2d","d. Cruise performance (e.g., optimum and maximum operating altitudes)"),
          K("AA.I.B.K2e","e. Descent performance"),
          K("AA.I.B.K2f","f. Landing performance"),
          K("AA.I.B.K2g","g. Performance with an inoperative powerplant for all phases of flight (AMEL, AMES)"),
          K("AA.I.B.K2h","h. Weight and balance and how to shift weight"),
          K("AA.I.B.K3","Factors affecting performance, including:"),
          K("AA.I.B.K3a","a. Atmospheric conditions"),
          K("AA.I.B.K3b","b. Pilot technique"),
          K("AA.I.B.K3c","c. Aircraft configuration (e.g., flap setting)"),
          K("AA.I.B.K3d","d. Airport environment (e.g., runway condition, land and hold short operations (LAHSO))"),
          K("AA.I.B.K3e","e. Loading (e.g., center of gravity)"),
          K("AA.I.B.K3f","f. Aircraft weight"),
          K("AA.I.B.K4","Aerodynamics and how it relates to performance."),
          K("AA.I.B.K5","Adverse effects of exceeding an airplane limitation or the aircraft operating envelope."),
          K("AA.I.B.K6","Effects of icing on performance."),
          K("AA.I.B.K7","Clean wing concept; deicing and anti-icing procedures, including use of appropriate deice fluid, hold-over tables, calculating hold-over times, and pre-takeoff contamination checks."),
          K("AA.I.B.K8","Air carrier weight and balance systems (e.g., average weight program). Air Transport Pilot (ATP) (AMEL, AMES)."),
          K("AA.I.B.K9","Runway assessment and condition reporting and use of the Runway Condition Assessment Matrix (RCAM). (ATP)(AMEL, AMES).")
        ],
        [
          R("AA.I.B.R1","Use of performance charts, tables, and data."),
          R("AA.I.B.R2","Airplane limitations."),
          R("AA.I.B.R3","Possible differences between calculated performance and actual performance."),
          R("AA.I.B.R4","Airplane icing and its effect on performance and stall warning."),
          R("AA.I.B.R5","Runway excursions.")
        ],
        [
          S("AA.I.B.S1","Describe the airspeeds used during specific phases of flight."),
          S("AA.I.B.S2","Describe the effects of meteorological conditions on performance for all phases of flight and correctly apply these factors to a specific chart, table, graph, or other performance data."),
          S("AA.I.B.S3","Describe the procedures for wing contamination recognition and any deice/anti-ice procedures prior to takeoff."),
          S("AA.I.B.S4","Explain the adverse effects of airframe icing during all phases of flight. Describe any operating limitations for flight in icing conditions. If equipped, describe the procedures for deicing and anti-icing system use and their effects on performance."),
          S("AA.I.B.S5","Compute weight and balance, including practical techniques to resolve out-of-limits calculations for a representative scenario, as specified by the evaluator."),
          S("AA.I.B.S6","Determine the computed center-of-gravity is within the acceptable limits and the lateral fuel balance is within limits for takeoff and landing."),
          S("AA.I.B.S7","Demonstrate proficient use of appropriate performance charts, tables, graphs, or other data to determine airplane performance and limitations for all phases of flight.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("C","I_C","Weather Information (ATP)","AA.I.C",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with obtaining, understanding, and applying weather information for a flight under IFR.",
        [
          K("AA.I.C.K1","Sources of weather data (e.g., National Weather Service, Flight Service) for flight planning purposes."),
          K("AA.I.C.K2","Acceptable weather products and resources required for preflight planning, current and forecast weather for departure, en route, and arrival phases of flight such as:"),
          K("AA.I.C.K2a","a. Airport Observations (METAR and SPECI) and Pilot Observations (PIREP)"),
          K("AA.I.C.K2b","b. Surface Analysis Chart, Ceiling and Visibility Chart (CVA)"),
          K("AA.I.C.K2c","c. Terminal Aerodrome Forecasts (TAF)"),
          K("AA.I.C.K2d","d. Graphical Forecasts for Aviation (GFA)"),
          K("AA.I.C.K2e","e. Wind and Temperature Aloft Forecast (FB)"),
          K("AA.I.C.K2f","f. Convective Outlook (AC)"),
          K("AA.I.C.K2g","g. Inflight Aviation Weather Advisories including Airmen's Meteorological Information (AIRMET), Significant Meteorological Information (SIGMET), and Convective SIGMET"),
          K("AA.I.C.K3","Meteorology applicable to the departure, en route, alternate, and destination for flights conducted under Instrument Flight Rules (IFR) to include expected climate and hazardous conditions such as:"),
          K("AA.I.C.K3a","a. Atmospheric composition and stability"),
          K("AA.I.C.K3b","b. Wind (e.g., windshear, mountain wave, factors affecting wind, etc.)"),
          K("AA.I.C.K3c","c. Temperature and heat exchange"),
          K("AA.I.C.K3d","d. Moisture/precipitation"),
          K("AA.I.C.K3e","e. Weather system formation, including air masses and fronts"),
          K("AA.I.C.K3f","f. Clouds"),
          K("AA.I.C.K3g","g. Turbulence"),
          K("AA.I.C.K3h","h. Thunderstorms and microbursts"),
          K("AA.I.C.K3i","i. Icing and freezing level information"),
          K("AA.I.C.K3j","j. Fog/mist"),
          K("AA.I.C.K3k","k. Frost"),
          K("AA.I.C.K3l","l. Obstructions to visibility (e.g., smoke, haze, volcanic ash, etc.)"),
          K("AA.I.C.K4","Flight deck displays of digital weather and aeronautical information, their use to navigate around weather, and equipment limitations."),
          K("AA.I.C.K5","Low-visibility operations (e.g., surface movement, category II and III approaches). (ATP)(AMEL, AMES)."),
          K("AA.I.C.K6","Flight Risk Assessment Tools.")
        ],
        [
          R("AA.I.C.R1","Weather conditions involved in departure and in-flight decision making, to include:"),
          R("AA.I.C.R1a","a. Circumstances requiring a change in course or destination"),
          R("AA.I.C.R1b","b. Known or forecast icing, winds or turbulence aloft, volcanic ash, destination weather, etc."),
          R("AA.I.C.R1c","c. Personal weather minimums"),
          R("AA.I.C.R1d","d. Operator specified or aircraft operational limitations, if applicable"),
          R("AA.I.C.R2","Use and limitations of:"),
          R("AA.I.C.R2a","a. Installed onboard weather equipment"),
          R("AA.I.C.R2b","b. Aviation weather reports and forecasts"),
          R("AA.I.C.R2c","c. Inflight weather resources")
        ],
        [
          S("AA.I.C.S1","Interpret weather information, apply principles of aeronautical decision-making, and use a Flight Risk Assessment Tool, if available.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("D","I_D","High-Altitude Aerodynamics (ATP)","AA.I.D",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with high altitude airplane aerodynamics.",
        [
          K("AA.I.D.K1","Aerodynamics of large transport category airplanes, including flight characteristics of swept wing airplanes (e.g., Mach buffet)."),
          K("AA.I.D.K2","Energy management."),
          K("AA.I.D.K3","Relationship between Mach number, indicated airspeed, true airspeed, and change over altitudes."),
          K("AA.I.D.K4","Load factor at high altitude and its effect on high and low speed operating margins."),
          K("AA.I.D.K5","Relationship between altitude capability, weight, and temperature."),
          K("AA.I.D.K6","Maximum Operating Speed - Knots (VMO) / Maximum Operating Speed - Mach (MMO) convergence and stall angle of attack."),
          K("AA.I.D.K7","Maximum Lift over Drag Ratio (L/DMAX)."),
          K("AA.I.D.K8","Best range and best endurance."),
          K("AA.I.D.K9","Factors which contribute to airplane upsets at high altitude and upset prevention and recovery techniques.")
        ],
        [
          R("AA.I.D.R1","Managing the airplane’s energy state."),
          R("AA.I.D.R2","High operating altitudes at high operational weights."),
          R("AA.I.D.R3","High altitude slow-downs and excursions behind the power curve."),
          R("AA.I.D.R4","Turbulence at high altitude.")
        ],
        [
          S("AA.I.D.S1","If a cruise altitude is reached, manage the airplane’s systems and energy state.")
        ],
        ["AMEL","AMES"]
      ),

      T("E","I_E","Air Carrier Operations (ATP)","AA.I.E",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with air carrier operations.",
        [
          K("AA.I.E.K1","Turbine engines, thrust reversing systems, and system malfunctions."),
          K("AA.I.E.K2","Airplane automation components (e.g., flight director, autopilot), their relationship to each other, and how to manage the automation for flight."),
          K("AA.I.E.K3","Advanced navigation equipment (e.g., FMS, Required Navigation Performance (RNP), ADS-B, EFB, etc.) and how it is used inflight."),
          K("AA.I.E.K4","Flightpath warning systems (e.g., Traffic Alert and Collision Avoidance Systems (TCAS), Terrain Awareness and Warning System (TAWS) and how to respond to a warning."),
          K("AA.I.E.K5","Altitudes and conditions that require the use of oxygen masks."),
          K("AA.I.E.K6","Causes and recognition of cabin pressure loss."),
          K("AA.I.E.K7","Appropriate rudder use in transport aircraft to avoid rudder reversal."),
          K("AA.I.E.K8","Crew communications (e.g., sterile flight deck rules, briefings)."),
          K("AA.I.E.K9","Operational control."),
          K("AA.I.E.K10","Elements associated with operating at complex and high traffic airports with emphasis on runway incursion prevention techniques."),
          K("AA.I.E.K11","Professional responsibilities associated with being an ATP certificate holder and how to apply leadership skills as pilot-in-command."),
          K("AA.I.E.K12","Crew resource management (CRM) principles and application in a multi-crew environment."),
          K("AA.I.E.K13","Use of safety programs to manage risk across an organization (e.g., Threat and error management (TEM), or Aviation Safety Action Program (ASAP))."),
          K("AA.I.E.K14","Operations specifications.")
        ],
        [
          R("AA.I.E.R1","Turbine engine and thrust reversing system malfunctions."),
          R("AA.I.E.R2","Managing automation and navigation equipment."),
          R("AA.I.E.R3","Responding to a flightpath warning system alert."),
          R("AA.I.E.R4","Loss of cabin pressure."),
          R("AA.I.E.R5","Crew coordination.")
        ],
        [
          S("AA.I.E.S1","Apply CRM principles and use in a crew environment, as appropriate.")
        ],
        ["AMEL","AMES"]
      ),

      T("F","I_F","Human Factors (ATP)","AA.I.F",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with personal health, flight physiology, and aeromedical and human factors related to safety of flight.",
        [
          K("AA.I.F.K1","Causes, effects, recognition, and corrective actions associated with aeromedical and physiological issues, including:"),
          K("AA.I.F.K1a","a. Hypoxia"),
          K("AA.I.F.K1b","b. Hyperventilation"),
          K("AA.I.F.K1c","c. Middle ear and sinus problems"),
          K("AA.I.F.K1d","d. Spatial disorientation"),
          K("AA.I.F.K1e","e. Motion sickness"),
          K("AA.I.F.K1f","f. Carbon monoxide poisoning"),
          K("AA.I.F.K1g","g. Stress"),
          K("AA.I.F.K1h","h. Fatigue"),
          K("AA.I.F.K1i","i. Dehydration and nutrition"),
          K("AA.I.F.K1j","j. Hypothermia"),
          K("AA.I.F.K1k","k. Optical illusions"),
          K("AA.I.F.K1l","l. Dissolved nitrogen in the bloodstream after scuba dives"),
          K("AA.I.F.K2","Effects of alcohol, drugs, and over-the-counter medications."),
          K("AA.I.F.K3","Aeronautical Decision-Making (ADM) to include using Crew Resource Management (CRM) or Single-Pilot Resource Management (SRM), as appropriate."),
          K("AA.I.F.K4","Components of self-assessment for determining fitness for flight.")
        ],
        [
          R("AA.I.F.R1","Aeromedical and physiological issues."),
          R("AA.I.F.R2","Hazardous attitudes."),
          R("AA.I.F.R3","Distractions, task prioritization, loss of situational awareness, or disorientation."),
          R("AA.I.F.R4","Confirmation and expectation bias.")
        ],
        [
          S("AA.I.F.S1","Perform a self-assessment and determine fitness for flight.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("G","I_G","The Code of Federal Regulations (CFR) (ATP)","AA.I.G",
        "Objective: To determine the applicant exhibits satisfactory knowledge associated with regulations applicable to the privileges and limitations of the ATP certificate and to flight operations that require an ATP certificate.",
        [
          K("AA.I.G.K1","14 CFR part 61, subparts A, B, and G."),
          K("AA.I.G.K2","14 CFR part 91 subparts A, B, C, F, G, H."),
          K("AA.I.G.K3","14 CFR part 117 (AMEL, AMES)."),
          K("AA.I.G.K4","14 CFR part 121 subparts A, G, K, M, O, T, U, V (AMEL, AMES)."),
          K("AA.I.G.K5","14 CFR part 135 subparts A, B, C, D, E, F, G (ASEL, ASES)."),
          K("AA.I.G.K6","49 CFR part 830."),
          K("AA.I.G.K7","14 CFR part 111 subparts A, D.")
        ],
        [
          R("AA.I.G.R1","Lack of compliance with the applicable CFRs.")
        ],
        [
          S("AA.I.G.S1","Apply the CFRs to the flight and operation.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("H","I_H","Water and Seaplane Characteristics, Seaplane Bases, Maritime Rules, and Aids to Marine Navigation","AA.I.H",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with water and seaplane characteristics, seaplane bases, maritime rules, and aids to marine navigation.",
        [
          K("AA.I.H.K1","The characteristics of a water surface as affected by features, such as:"),
          K("AA.I.H.K1a","a. Size and location"),
          K("AA.I.H.K1b","b. Protected and unprotected areas"),
          K("AA.I.H.K1c","c. Surface wind"),
          K("AA.I.H.K1d","d. Direction and strength of water current"),
          K("AA.I.H.K1e","e. Floating and partially submerged debris"),
          K("AA.I.H.K1f","f. Sandbars, islands, and shoals"),
          K("AA.I.H.K1g","g. Vessel traffic and wakes"),
          K("AA.I.H.K1h","h. Other characteristics specific to the area"),
          K("AA.I.H.K1i","i. Direction and height of waves"),
          K("AA.I.H.K2","Float and hull construction, and its effect on seaplane performance."),
          K("AA.I.H.K3","Causes of porpoising and skipping, and the pilot action needed to prevent or correct these occurrences."),
          K("AA.I.H.K4","How to locate and identify seaplane bases on charts or in directories."),
          K("AA.I.H.K5","Operating restrictions at various bases."),
          K("AA.I.H.K6","Right-of-way, steering, and sailing rules pertinent to seaplane operation."),
          K("AA.I.H.K7","Marine navigation aids, such as buoys, beacons, lights, sound signals, and range markers."),
          K("AA.I.H.K8","Naval vessel protection zones."),
          K("AA.I.H.K9","No wake zones.")
        ],
        [
          R("AA.I.H.R1","Local conditions."),
          R("AA.I.H.R2","Impact of marine traffic."),
          R("AA.I.H.R3","Right-of-way and sailing rules pertinent to seaplane operations."),
          R("AA.I.H.R4","Limited services and assistance available at seaplane bases.")
        ],
        [
          S("AA.I.H.S1","Explain how float and hull construction can affect seaplane performance."),
          S("AA.I.H.S2","Describe how to correct for porpoising and skipping."),
          S("AA.I.H.S3","Locate seaplane bases on charts or in directories and identify any restrictions."),
          S("AA.I.H.S4","Identify marine navigation aids."),
          S("AA.I.H.S5","Describe what naval vessel protection zones and no wake zones are."),
          S("AA.I.H.S6","Assess the water surface characteristics for the proposed flight."),
          S("AA.I.H.S7","Perform correct right-of-way, steering, and sailing operations.")
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
      T("A","II_A","Preflight Assessment","AA.II.A",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with preparation for safe flight.",
        [
          K("AA.II.A.K1","Pilot self-assessment."),
          K("AA.II.A.K2","Determining that the aircraft to be used is appropriate, airworthy, and in a condition for safe flight by locating and explaining related documents such as:"),
          K("AA.II.A.K2a","a. Airworthiness and registration certificates"),
          K("AA.II.A.K2b","b. Operating limitations, handbooks, and manuals"),
          K("AA.II.A.K2c","c. Minimum Equipment List (MEL) and Configuration Deviation List (CDL), Kinds of Operations Equipment Lists (KOEL)"),
          K("AA.II.A.K2d","d. Weight and balance data"),
          K("AA.II.A.K2e","e. Required inspections or tests and appropriate records and documentation (e.g., dispatch release) as applicable to the proposed flight or operation"),
          K("AA.II.A.K3","Preventive maintenance that can be performed by the pilot or other designated crewmember."),
          K("AA.II.A.K4","Aircraft preflight inspection, including:"),
          K("AA.II.A.K4a","a. Which items should be inspected"),
          K("AA.II.A.K4b","b. The reasons for checking each item"),
          K("AA.II.A.K4c","c. How to detect possible defects"),
          K("AA.II.A.K4d","d. The associated regulations"),
          K("AA.II.A.K5","Environmental factors, including weather, terrain, route selection, and obstructions."),
          K("AA.II.A.K6","Requirements for current and appropriate navigation data."),
          K("AA.II.A.K7","Operations specifications, management specifications, or letters of authorization applying to a particular aircraft and operation, if applicable.")
        ],
        [
          R("AA.II.A.R1","Human performance factors."),
          R("AA.II.A.R2","Inoperative equipment discovered prior to flight."),
          R("AA.II.A.R3","Environment (e.g., weather, airports, airspace, terrain, obstacles)."),
          R("AA.II.A.R4","External pressures."),
          R("AA.II.A.R5","Aviation security concerns.")
        ],
        [
          S("AA.II.A.S1","Inspect the aircraft in accordance with an appropriate checklist demonstrating proper operation of applicable airplane systems. Coordinate checklist with crew, if appropriate."),
          S("AA.II.A.S2","Coordinate with ground crew and ensure adequate clearance prior to moving doors, hatches, flight control surfaces, etc."),
          S("AA.II.A.S3","Document any discrepancies found; take corrective action and acknowledge limitations imposed by MEL/CDL items, if applicable."),
          S("AA.II.A.S4","Determine if the aircraft is airworthy and in condition for safe flight."),
          S("AA.II.A.S5","Identify and comply with operations specifications as required."),
          S("AA.II.A.S6","Assess factors related to the environment (weather, airports, terrain, airspace)."),
          S("AA.II.A.S7","Ensure the airplane and surfaces are free of ice, snow, and frost. If icing conditions are present, demonstrate satisfactory knowledge of deicing procedures.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("B","II_B","Powerplant Start","AA.II.B",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with powerplant start procedures.",
        [
          K("AA.II.B.K1","Normal and abnormal powerplant start procedures and limitations, including the use of an auxiliary power unit (APU) or external power source, if applicable."),
          K("AA.II.B.K2","Starting under various conditions."),
          K("AA.II.B.K3","Malfunctions during powerplant start, procedures to address the malfunction, and any associated limitations."),
          K("AA.II.B.K4","Coordinating and communicating with ground personnel for powerplant start, if applicable.")
        ],
        [
          R("AA.II.B.R1","Malfunctions during powerplant start."),
          R("AA.II.B.R2","Propeller and turbine powerplant safety."),
          R("AA.II.B.R3","Managing situations where specific instructions or checklist items are not published."),
          R("AA.II.B.R4","Personnel, vehicles, vessels, foreign object debris, and other aircraft in the vicinity during powerplant start.")
        ],
        [
          S("AA.II.B.S1","Ensure the ground safety procedures are followed during the before-start, start, and after-start phases."),
          S("AA.II.B.S2","Use appropriate ground crew personnel during the start procedures (if applicable)."),
          S("AA.II.B.S3","Coordinate with crew, if applicable, and complete the appropriate checklist(s) prior to and after powerplant start."),
          S("AA.II.B.S4","Respond appropriately to an abnormal start or malfunction.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      ),

      T("C","II_C","Taxiing","AA.II.C",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with safe taxi operations.",
        [
          K("AA.II.C.K1","Current airport aeronautical references and information resources such as the Chart Supplement, airport diagram, and Notices to Air Missions (NOTAMs)."),
          K("AA.II.C.K2","Taxi instructions/clearances, including published taxi routes."),
          K("AA.II.C.K3","Airport markings, signs, and lights."),
          K("AA.II.C.K4","Appropriate aircraft lighting for day and night operations."),
          K("AA.II.C.K5","Push-back procedures, if applicable."),
          K("AA.II.C.K6","Appropriate flight deck activities prior to taxi, including route planning, identifying the location of Hot Spots, and coordinating with crew if, applicable."),
          K("AA.II.C.K7","Communications at towered and nontowered airports."),
          K("AA.II.C.K8","Entering or crossing runways."),
          K("AA.II.C.K9","Night taxi operations."),
          K("AA.II.C.K10","Low visibility taxi operations and techniques used to avoid disorientation."),
          K("AA.II.C.K11","Single-Engine taxi procedures for (AMEL).")
        ],
        [
          R("AA.II.C.R1","Distractions, task prioritization, loss of situational awareness, or disorientation."),
          R("AA.II.C.R2","Confirmation or expectation bias as related to taxi instructions."),
          R("AA.II.C.R3","A taxi route or departure runway change."),
          R("AA.II.C.R4","Partial completion of checklist(s)."),
          R("AA.II.C.R5","Low visibility taxi operations."),
          R("AA.II.C.R6","Runway incursion.")
        ],
        [
          S("AA.II.C.S1","Receive/record taxi instructions, read back/acknowledge taxi clearances, and review taxi routes on the airport diagram."),
          S("AA.II.C.S2","Use an appropriate airport diagram or taxi chart, if published."),
          S("AA.II.C.S3","Comply with air traffic control (ATC) clearances and instructions and observe all runway hold lines, Instrument Landing System (ILS) critical areas, beacons, and other airport/taxiway markings and lighting."),
          S("AA.II.C.S4","Coordinate with crew, if applicable, and complete the appropriate checklist(s) prior to and during taxi, as appropriate."),
          S("AA.II.C.S5","Maintain situational awareness."),
          S("AA.II.C.S6","Maintain correct and positive airplane control, proper speed, appropriate use of wheel brakes and reverse thrust, and separation between other aircraft, vehicles, and persons to avoid an incursion/incident/accident."),
          S("AA.II.C.S7","Demonstrate taxi during day and night operations. If either condition is not available, the applicant explains the differences between day and night taxi."),
          S("AA.II.C.S8","Demonstrate proper use of aircraft exterior lighting for day and night operations. If either condition is not available, the applicant explains the differences between exterior aircraft lighting used for day and night operations."),
          S("AA.II.C.S9","Explain the hazards of low visibility taxi operations.")
        ],
        ["ASEL","AMEL"]
      )      ,

      T("D","II_D","Taxiing and Sailing","AA.II.D",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with taxiing and sailing operations.",
        [
          K("AA.II.D.K1","Airport/seaplane base information resources, including Chart Supplements, airport diagram, and Notices to Air Missions (NOTAMs)."),
          K("AA.II.D.K2","Taxi instructions/clearances."),
          K("AA.II.D.K3","Airport/seaplane base markings, signs, and lights."),
          K("AA.II.D.K4","Appropriate aircraft lighting for day and night operations."),
          K("AA.II.D.K5","Appropriate flight deck activities prior to taxiing or sailing, including route planning and identifying potential hazards."),
          K("AA.II.D.K6","Communications at towered and nontowered seaplane bases."),
          K("AA.II.D.K7","Night taxi and sailing operations."),
          K("AA.II.D.K8","Low visibility taxi and sailing operations and techniques used to avoid disorientation.")
        ],
        [
          R("AA.II.D.R1","Distractions, task prioritization, loss of situational awareness, or disorientation."),
          R("AA.II.D.R2","Porpoising and skipping."),
          R("AA.II.D.R3","Other aircraft, vessels, and hazards."),
          R("AA.II.D.R4","Runway or waterway incursions."),
          R("AA.II.D.R5","Changing water conditions.")
        ],
        [
          S("AA.II.D.S1","Receive/record taxi instructions, read back/acknowledge taxi clearances, and review taxi routes on the airport diagram or waterway chart."),
          S("AA.II.D.S2","Use an appropriate airport diagram or taxi chart, if published."),
          S("AA.II.D.S3","Comply with air traffic control (ATC) clearances and instructions and observe all markings, beacons, and other lighting."),
          S("AA.II.D.S4","Coordinate with crew, if applicable, and complete the appropriate checklist(s) prior to and during taxiing or sailing, as appropriate."),
          S("AA.II.D.S5","Maintain situational awareness."),
          S("AA.II.D.S6","Maintain correct and positive airplane control, proper speed, and separation between other aircraft, vessels, and persons."),
          S("AA.II.D.S7","Use proper procedures for step taxi, idle taxi, plow taxi, sailing, and docking as appropriate."),
          S("AA.II.D.S8","Demonstrate proper use of aircraft exterior lighting for day and night operations. If either condition is not available, the applicant explains the differences between exterior aircraft lighting used for day and night operations."),
          S("AA.II.D.S9","Explain the hazards of low visibility taxi and sailing operations.")
        ],
        ["ASES","AMES"]
      ),

      T("E","II_E","Before Takeoff Check","AA.II.E",
        "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with the before takeoff check.",
        [
          K("AA.II.E.K1","Purpose of before takeoff checklist items, including:"),
          K("AA.II.E.K1a","a. Reasons for checking each item"),
          K("AA.II.E.K1b","b. Detecting malfunctions"),
          K("AA.II.E.K1c","c. Ensuring the aircraft is in safe operating condition"),
          K("AA.II.E.K2","Performance criteria for takeoff, climb, and departure."),
          K("AA.II.E.K3","Rejected takeoff procedures."),
          K("AA.II.E.K4","Wake turbulence."),
          K("AA.II.E.K5","Crew briefings."),
          K("AA.II.E.K6","Low visibility operations.")
        ],
        [
          R("AA.II.E.R1","Distractions, task prioritization, loss of situational awareness, or disorientation."),
          R("AA.II.E.R2","Unexpected runway changes."),
          R("AA.II.E.R3","Wake turbulence."),
          R("AA.II.E.R4","Potential powerplant failure during takeoff."),
          R("AA.II.E.R5","Improper takeoff data.")
        ],
        [
          S("AA.II.E.S1","Coordinate with crew, if applicable, and complete the appropriate checklist(s)."),
          S("AA.II.E.S2","Review takeoff performance data."),
          S("AA.II.E.S3","Verify aircraft configuration and trim settings."),
          S("AA.II.E.S4","Brief crew and passengers as appropriate."),
          S("AA.II.E.S5","Verify flight instruments and avionics are configured correctly."),
          S("AA.II.E.S6","Use crew resource management (CRM) or single-pilot resource management (SRM), as appropriate.")
        ],
        ["ASEL","ASES","AMEL","AMES"]
      )
    ]
  },

  {
  id: "III",
  roman: "III",
  title: "Takeoffs and Landings",
  phase: "flight",
  tasks: [
    T("A","III_A","Normal Takeoff and Climb","AA.III.A",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management and skills associated with a normal takeoff and climb.",
      [
        K("AA.III.A.K1","Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
        K("AA.III.A.K2","Appropriate V-speeds for takeoff and climb."),
        K("AA.III.A.K3","Appropriate aircraft configuration and power setting for takeoff and climb."),
        K("AA.III.A.K4","Runway markings and lighting.")
      ],
      [
        R("AA.III.A.R1","Selection of a runway, or runway intersection, based on aircraft limitations, available distance, surface conditions, and wind."),
        R("AA.III.A.R2","Wake turbulence."),
        R("AA.III.A.R3","Abnormal operations, including planning for:"),
        R("AA.III.A.R3a","a. Rejected takeoff"),
        R("AA.III.A.R3b","b. Potential engine failure in takeoff/climb phase of flight"),
        R("AA.III.A.R4","Configuring or setting the aircraft (e.g., trim, flaps, autobrakes, etc.)."),
        R("AA.III.A.R5","Collision hazards."),
        R("AA.III.A.R6","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.III.A.R7","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("AA.III.A.S1","Coordinate with crew, if applicable, and complete the appropriate checklist(s) prior to takeoff in a timely manner."),
        S("AA.III.A.S2","Make radio calls as appropriate."),
        S("AA.III.A.S3","Verify assigned/correct runway (ASEL, AMEL) or takeoff path (ASES, AMES)."),
        S("AA.III.A.S4","Verify the airplane is configured for takeoff."),
        S("AA.III.A.S5","Position the flight controls for the existing wind, if applicable."),
        S("AA.III.A.S6","Clear the area, taxi into takeoff position, and align the airplane on the runway centerline (ASEL, AMEL) or takeoff path (ASES, AMES)."),
        S("AA.III.A.S7","Retract the water rudders, as appropriate (ASES, AMES)."),
        S("AA.III.A.S8","Establish and maintain the most efficient planing/lift-off attitude, and correct for porpoising or skipping (ASES, AMES)."),
        S("AA.III.A.S9","Maintain centerline (ASEL, AMEL) and proper flight control inputs during the takeoff roll."),
        S("AA.III.A.S10","Confirm takeoff power and proper engine and flight instrument indications prior to rotation making callouts, as appropriate, for the airplane or per the operator’s procedures."),
        S("AA.III.A.S11","Avoid excessive water spray on the propeller(s) (ASES, AMES)."),
        S("AA.III.A.S12","Rotate and lift off at the recommended airspeed."),
        S("AA.III.A.S13","Establish a power setting and a pitch attitude to maintain the desired climb airspeed/V-speed, ±5 knots for each climb segment."),
        S("AA.III.A.S14","Maintain desired heading ±5°."),
        S("AA.III.A.S15","Retract the landing gear and flaps in accordance with manufacturer or operator procedures and limitations, as appropriate."),
        S("AA.III.A.S16","Avoid wake turbulence, if applicable."),
        S("AA.III.A.S17","Follow noise abatement procedures, as practicable."),
        S("AA.III.A.S18","Complete appropriate after takeoff checklist(s) in a timely manner.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","III_B","Normal Approach and Landing","AA.III.B",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with a normal approach and landing.",
      [
        K("AA.III.B.K1","A stabilized approach, including energy management concepts."),
        K("AA.III.B.K2","Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("AA.III.B.K3","Wind correction techniques on approach and landing."),
        K("AA.III.B.K4","Runway markings and lighting.")
      ],
      [
        R("AA.III.B.R1","Selection of a runway or approach path and touchdown area based on aircraft limitations, available distance, surface conditions, and wind."),
        R("AA.III.B.R2","Wake turbulence."),
        R("AA.III.B.R3","Go-around/rejected landing."),
        R("AA.III.B.R4","Land and hold short operations (LAHSO)."),
        R("AA.III.B.R5","Collision hazards."),
        R("AA.III.B.R6","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.III.B.R7","Distractions, loss of situational awareness, incorrect airport surface approach and landing, or improper task management.")
      ],
      [
        S("AA.III.B.S1","Coordinate with crew, if applicable, and complete the appropriate checklist(s)."),
        S("AA.III.B.S2","Make radio calls as appropriate."),
        S("AA.III.B.S3","Maintain a ground track that ensures the desired traffic pattern flown takes into consideration obstructions and air traffic control (ATC) or evaluator instructions."),
        S("AA.III.B.S4","Ensure the airplane is aligned with the correct/assigned runway or landing surface."),
        S("AA.III.B.S5","Scan the runway or landing surface and adjoining area for traffic and obstructions."),
        S("AA.III.B.S6","Select a suitable touchdown point considering wind, landing surface, and obstructions."),
        S("AA.III.B.S7","Establish the recommended approach and landing configuration and airspeed, ±5 knots, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("AA.III.B.S8","Maintain directional control and appropriate crosswind correction throughout the approach and landing."),
        S("AA.III.B.S9","Make smooth, timely, and correct control application before, during, and after touchdown."),
        S("AA.III.B.S10","Touch down with the runway centerline between the main landing gear at the appropriate speed and pitch attitude at the runway aiming point markings -250/+500 feet, or where there are no runway markings 750 to 1,500 feet from the approach threshold of the runway (ASEL, AMEL)."),
        S("AA.III.B.S11","During round out and touchdown contact the water at the proper pitch attitude within 200 feet beyond a specified point (ASES, AMES). In addition, for AMES, the touchdown is within the first one-third of the water landing area."),
        S("AA.III.B.S12","Decelerate to taxi speed (20 knots or less on dry pavement, 10 knots or less on contaminated pavement) to within the calculated landing distance plus 25% for the actual conditions with the runway centerline between the main landing gear (At least one landing) (ASEL, AMEL)."),
        S("AA.III.B.S13","Use spoilers, prop reverse, thrust reverse, wheel brakes, and other drag/braking devices, as appropriate to safely slow the airplane. (At least one landing to a full stop)."),
        S("AA.III.B.S14","Execute a timely go-around if the approach cannot be made within the tolerances specified above or for any other condition that may result in an unsafe approach or landing."),
        S("AA.III.B.S15","Use runway incursion avoidance procedures, if applicable.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )    ,

    T("C","III_C","Glassy Water Takeoff and Climb","AA.III.C",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with glassy water takeoff and climb.",
      [
        K("AA.III.C.K1","Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
        K("AA.III.C.K2","Appropriate power settings and V-speeds for takeoff and climb."),
        K("AA.III.C.K3","Appropriate airplane configuration."),
        K("AA.III.C.K4","Appropriate use of glassy water takeoff and climb technique.")
      ],
      [
        R("AA.III.C.R1","Selection of the takeoff path based on aircraft limitations, available distance, surface conditions, and wind."),
        R("AA.III.C.R2","Abnormal operations, including planning for:"),
        R("AA.III.C.R2a","a. Rejected takeoff"),
        R("AA.III.C.R2b","b. Potential engine failure in takeoff/climb phase of flight"),
        R("AA.III.C.R3","Collision hazards."),
        R("AA.III.C.R4","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.III.C.R5","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AA.III.C.R6","Gear position in an amphibious airplane.")
      ],
      [
        S("AA.III.C.S1","Coordinate with crew, if applicable, and complete the appropriate checklist(s) prior to takeoff in a timely manner."),
        S("AA.III.C.S2","Make radio calls as appropriate."),
        S("AA.III.C.S3","Position the flight controls for the existing wind, if applicable."),
        S("AA.III.C.S4","Verify the airplane is configured for takeoff."),
        S("AA.III.C.S5","Clear the area; select appropriate takeoff path considering surface conditions and collision hazards."),
        S("AA.III.C.S6","Retract the water rudders, as appropriate."),
        S("AA.III.C.S7","Set and confirm takeoff power."),
        S("AA.III.C.S8","Avoid excessive water spray on the propeller(s)."),
        S("AA.III.C.S9","Maintain directional control throughout takeoff and climb."),
        S("AA.III.C.S10","Establish and maintain an appropriate planing attitude, directional control, and correct for porpoising, skipping, and increase in water drag."),
        S("AA.III.C.S11","Utilize appropriate techniques to lift seaplane from the water considering surface conditions."),
        S("AA.III.C.S12","Adjust power, as appropriate, and establish a pitch attitude to maintain the appropriate climb airspeed/V-speed, ±5 knots for each climb segment."),
        S("AA.III.C.S13","Retract flaps after a positive rate of climb has been verified or in accordance with manufacturer or operator procedures and limitations, as appropriate."),
        S("AA.III.C.S14","Follow noise abatement procedures, as practicable.")
      ],
      ["ASES","AMES"]
    ),

    T("D","III_D","Glassy Water Approach and Landing","AA.III.D",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with glassy water approach and landing.",
      [
        K("AA.III.D.K1","A stabilized approach, including energy management concepts."),
        K("AA.III.D.K2","Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("AA.III.D.K3","Wind correction techniques on approach and landing."),
        K("AA.III.D.K4","When and why glassy water techniques are used."),
        K("AA.III.D.K5","How a glassy water approach and landing is executed.")
      ],
      [
        R("AA.III.D.R1","Selection of the approach path and touchdown area based on aircraft limitations, available distance, surface conditions, and wind."),
        R("AA.III.D.R2","Go-around/rejected landing."),
        R("AA.III.D.R3","Collision hazards."),
        R("AA.III.D.R4","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.III.D.R5","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AA.III.D.R6","Gear position in an amphibious airplane.")
      ],
      [
        S("AA.III.D.S1","Coordinate with crew, if applicable, and complete the appropriate checklist(s)."),
        S("AA.III.D.S2","Make radio calls as appropriate."),
        S("AA.III.D.S3","Ensure that the landing gear and water rudders are retracted, if applicable."),
        S("AA.III.D.S4","Consider the landing surface, visual attitude references, water depth, and collision hazards and select the proper approach and landing path."),
        S("AA.III.D.S5","Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("AA.III.D.S6","Maintain a stabilized approach and recommended airspeed, ±5 knots."),
        S("AA.III.D.S7","Make smooth, timely, and correct power and control adjustments to maintain proper pitch attitude and rate of descent to touchdown."),
        S("AA.III.D.S8","Maintain directional control throughout the approach and landing."),
        S("AA.III.D.S9","Contact the water in a proper pitch attitude, and slow to idle taxi speed.")
      ],
      ["ASES","AMES"]
    ),

    T("E","III_E","Rough Water Takeoff and Climb","AA.III.E",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with rough water takeoff and climb.",
      [
        K("AA.III.E.K1","Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
        K("AA.III.E.K2","Appropriate power settings and V-speeds for takeoff and climb."),
        K("AA.III.E.K3","Appropriate airplane configuration."),
        K("AA.III.E.K4","Appropriate use of rough water takeoff and climb technique.")
      ],
      [
        R("AA.III.E.R1","Selection of the takeoff path based on aircraft limitations, available distance, surface conditions, and wind."),
        R("AA.III.E.R2","Abnormal operations, including planning for:"),
        R("AA.III.E.R2a","a. Rejected takeoff"),
        R("AA.III.E.R2b","b. Potential engine failure in takeoff/climb phase of flight"),
        R("AA.III.E.R3","Collision hazards."),
        R("AA.III.E.R4","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.III.E.R5","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AA.III.E.R6","Gear position in an amphibious airplane.")
      ],
      [
        S("AA.III.E.S1","Coordinate with crew, if applicable, and complete the appropriate checklist(s) prior to takeoff in a timely manner."),
        S("AA.III.E.S2","Make radio calls as appropriate."),
        S("AA.III.E.S3","Position the flight controls for the existing wind, if applicable."),
        S("AA.III.E.S4","Verify the airplane is configured for takeoff."),
        S("AA.III.E.S5","Clear the area; select appropriate takeoff path considering surface conditions and collision hazards."),
        S("AA.III.E.S6","Retract the water rudders, as appropriate."),
        S("AA.III.E.S7","Set and confirm takeoff power."),
        S("AA.III.E.S8","Avoid excessive water spray on the propeller(s)."),
        S("AA.III.E.S9","Maintain directional control and proper wind-drift correction throughout takeoff and climb."),
        S("AA.III.E.S10","Establish and maintain an appropriate planing attitude, directional control, and correct for porpoising, skipping, and increase in water drag."),
        S("AA.III.E.S11","Establish proper attitude and airspeed, lift off at minimum airspeed and accelerate to appropriate climb airspeed/V-speed, ±5 knots before leaving ground effect."),
        S("AA.III.E.S12","Retract the flaps after a positive rate of climb is established and a safe altitude has been achieved."),
        S("AA.III.E.S13","Maintain takeoff power to a safe maneuvering altitude then set climb power."),
        S("AA.III.E.S14","Follow noise abatement procedures, as practicable.")
      ],
      ["ASES","AMES"]
    )    ,

    T("F","III_F","Rough Water Approach and Landing","AA.III.F",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with rough water approach and landing.",
      [
        K("AA.III.F.K1","A stabilized approach, including energy management concepts."),
        K("AA.III.F.K2","Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("AA.III.F.K3","Wind correction techniques on approach and landing."),
        K("AA.III.F.K4","When and why rough water techniques are used."),
        K("AA.III.F.K5","How to perform a proper rough water approach and landing.")
      ],
      [
        R("AA.III.F.R1","Selection of the approach path and touchdown area based on airplane limitations, available distance, surface conditions, and wind."),
        R("AA.III.F.R2","Go-around/rejected landing."),
        R("AA.III.F.R3","Collision hazards."),
        R("AA.III.F.R4","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.III.F.R5","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AA.III.F.R6","Gear position in an amphibious airplane.")
      ],
      [
        S("AA.III.F.S1","Coordinate with crew, if applicable, and complete the appropriate checklist(s)."),
        S("AA.III.F.S2","Make radio calls as appropriate."),
        S("AA.III.F.S3","Ensure that the landing gear and water rudders are retracted, if applicable."),
        S("AA.III.F.S4","Consider the landing surface, visual attitude references, water depth, and collision hazards and select the proper approach and landing path."),
        S("AA.III.F.S5","Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("AA.III.F.S6","Maintain a stabilized approach and recommended airspeed with gust factor applied, ±5 knots."),
        S("AA.III.F.S7","Make smooth, timely, and correct power and control adjustments to maintain proper attitude and rate of descent to touchdown."),
        S("AA.III.F.S8","Contact the water at the correct pitch attitude and touchdown speed."),
        S("AA.III.F.S9","Make smooth, timely, and correct power and control application during the landing while remaining alert for a go-around should conditions be too rough."),
        S("AA.III.F.S10","Maintain positive after-landing control.")
      ],
      ["ASES","AMES"]
    ),

    T("G","III_G","Confined Area Takeoff and Maximum Performance Climb","AA.III.G",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with confined area takeoff and maximum performance climb.",
      [
        K("AA.III.G.K1","Effects of atmospheric conditions, including wind, on takeoff and climb performance."),
        K("AA.III.G.K2","Appropriate power settings and V-speeds for takeoff and climb."),
        K("AA.III.G.K3","Appropriate airplane configuration."),
        K("AA.III.G.K4","Effects of water surface."),
        K("AA.III.G.K5","Available techniques for confined-area takeoff and climb.")
      ],
      [
        R("AA.III.G.R1","Selection of the takeoff path based on airplane limitations, available distance, surface conditions, and wind."),
        R("AA.III.G.R2","Abnormal operations, including planning for:"),
        R("AA.III.G.R2a","a. Rejected takeoff"),
        R("AA.III.G.R2b","b. Potential engine failure in takeoff/climb phase of flight"),
        R("AA.III.G.R3","Collision hazards."),
        R("AA.III.G.R4","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.III.G.R5","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AA.III.G.R6","Gear position in an amphibious airplane.")
      ],
      [
        S("AA.III.G.S1","Coordinate with crew, if applicable, and complete the appropriate checklist(s) prior to takeoff in a timely manner."),
        S("AA.III.G.S2","Make radio calls as appropriate."),
        S("AA.III.G.S3","Position the flight controls for the existing wind, if applicable."),
        S("AA.III.G.S4","Verify the airplane is configured for takeoff."),
        S("AA.III.G.S5","Clear the area; select appropriate takeoff path considering surface conditions and collision hazards."),
        S("AA.III.G.S6","Retract the water rudders, as appropriate."),
        S("AA.III.G.S7","Set and confirm takeoff power."),
        S("AA.III.G.S8","Avoid excessive water spray on the propeller(s)."),
        S("AA.III.G.S9","Maintain directional control and proper wind-drift correction throughout takeoff and climb."),
        S("AA.III.G.S10","Establish and maintain an appropriate planing attitude, directional control, and correct for porpoising, skipping, and increase in water drag."),
        S("AA.III.G.S11","Rotate and lift off at the appropriate airspeed, and accelerate to the recommended obstacle clearance airspeed or VX using appropriate bank angles to maintain terrain clearance, as needed."),
        S("AA.III.G.S12","Climb at the recommended airspeed or in its absence at best angle-of-climb speed (VX), +5/-0 knots until the obstacle is cleared, or until the airplane is 50 feet above the surface. In multiengine airplanes with VX values within 5 knots of minimum control speed (VMC), the use of best rate of climb speed (VY) or the manufacturer's recommendation is acceptable."),
        S("AA.III.G.S13","After clearing all obstacles, accelerate to VY ±5 knots."),
        S("AA.III.G.S14","Retract flaps and adjust power as needed to maintain VY or appropriate climb airspeed, ±5 knots to a safe maneuvering altitude."),
        S("AA.III.G.S15","Follow noise abatement procedures, as practicable.")
      ],
      ["ASES","AMES"]
    ),

    T("H","III_H","Confined Area Approach and Landing","AA.III.H",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with confined area approach and landing.",
      [
        K("AA.III.H.K1","A stabilized approach, including energy management concepts."),
        K("AA.III.H.K2","Effects of atmospheric conditions, including wind, on approach and landing performance."),
        K("AA.III.H.K3","Available techniques for confined-area approach and landing."),
        K("AA.III.H.K4","Wind correction techniques on approach and landing.")
      ],
      [
        R("AA.III.H.R1","Selection of the approach path and touchdown area based on aircraft limitations, available distance, surface conditions, and wind."),
        R("AA.III.H.R2","Go-around/rejected landing."),
        R("AA.III.H.R3","Collision hazards."),
        R("AA.III.H.R4","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.III.H.R5","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AA.III.H.R6","Gear position in an amphibious airplane."),
        R("AA.III.H.R7","Landing in an area or in conditions where a takeoff/climb may not be possible.")
      ],
      [
        S("AA.III.H.S1","Coordinate with crew, if applicable, and complete the appropriate checklist(s)."),
        S("AA.III.H.S2","Make radio calls as appropriate."),
        S("AA.III.H.S3","Ensure that the landing gear and water rudders are retracted, if applicable."),
        S("AA.III.H.S4","Consider the landing surface, visual attitude references, water depth, and collision hazards and select the proper approach and landing path."),
        S("AA.III.H.S5","Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("AA.III.H.S6","Maintain a stabilized approach and recommended airspeed with gust factor applied, ±5 knots."),
        S("AA.III.H.S7","Make smooth, timely, and correct power and control adjustments to maintain proper attitude and rate of descent to touchdown."),
        S("AA.III.H.S8","Touch down smoothly at the recommended airspeed and pitch attitude, beyond and within 100 feet of a specified point/area."),
        S("AA.III.H.S9","Maintain directional control and appropriate crosswind correction throughout the approach and landing.")
      ],
      ["ASES","AMES"]
    ),

    T("I","III_I","Rejected Takeoff","AA.III.I",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with a rejected takeoff.",
      [
        K("AA.III.I.K1","Conditions and situations that could warrant a rejected takeoff (e.g., takeoff warning systems, powerplant failure, other systems warning/failure)."),
        K("AA.III.I.K2","Safety considerations following a rejected takeoff."),
        K("AA.III.I.K3","The procedure for accomplishing a rejected takeoff."),
        K("AA.III.I.K4","Accelerate/stop distance."),
        K("AA.III.I.K5","Relevant V-speeds for a rejected takeoff.")
      ],
      [
        R("AA.III.I.R1","Selection of the takeoff path based on aircraft limitations, available distance, surface conditions, and wind."),
        R("AA.III.I.R2","A powerplant failure or other malfunction during takeoff."),
        R("AA.III.I.R3","Directional control following a rejected takeoff."),
        R("AA.III.I.R4","A rejected takeoff with inadequate stopping distance."),
        R("AA.III.I.R5","High-speed rejected takeoff."),
        R("AA.III.I.R6","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("AA.III.I.S1","Reject the takeoff if the powerplant failure occurs prior to becoming airborne (ASEL, ASES)."),
        S("AA.III.I.S2","Reject the takeoff if the powerplant failure occurs at a point during the takeoff where the rejected takeoff procedure can be initiated and the airplane can be safely stopped on the remaining runway/waterway (AMEL, AMES)."),
        S("AA.III.I.S3","Promptly reduce the power and maintain positive aircraft control using drag and braking devices, as appropriate, to come to a stop."),
        S("AA.III.I.S4","Coordinate with crew, if applicable, and complete the appropriate procedures, checklist(s), and radio calls following a rejected takeoff in a timely manner.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("J","III_J","Go-Around/Rejected Landing","AA.III.J",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with a go-around/rejected landing.",
      [
        K("AA.III.J.K1","A stabilized approach, including energy management concepts."),
        K("AA.III.J.K2","Effects of atmospheric conditions, including wind and density altitude, on a go-around or rejected landing."),
        K("AA.III.J.K3","Wind correction techniques on takeoff/departure and approach/landing."),
        K("AA.III.J.K4","Situations and considerations on approach that could require a go-around/rejected landing, including the inability to comply with a LAHSO clearance."),
        K("AA.III.J.K5","Go-around/rejected landing procedures, the importance of a timely decision, and appropriate airspeed/V-speeds for the maneuver.")
      ],
      [
        R("AA.III.J.R1","Delayed recognition of the need for a go-around/rejected landing."),
        R("AA.III.J.R2","Delayed performance of a go-around at low altitude."),
        R("AA.III.J.R3","Power application."),
        R("AA.III.J.R4","Configuring the airplane."),
        R("AA.III.J.R5","Collision hazards."),
        R("AA.III.J.R6","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.III.J.R7","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AA.III.J.R8","Managing a go-around/rejected landing after accepting a LAHSO clearance.")
      ],
      [
        S("AA.III.J.S1","Make a timely decision to go-around/reject the landing."),
        S("AA.III.J.S2","Apply the appropriate power setting for the flight condition and establish a pitch attitude necessary to obtain the desired performance."),
        S("AA.III.J.S3","Establish a positive rate of climb and the appropriate airspeed/V-speed, ±5 knots."),
        S("AA.III.J.S4","Configure and trim the airplane, when appropriate."),
        S("AA.III.J.S5","Make radio calls as appropriate."),
        S("AA.III.J.S6","Maintain the ground track, heading, or course appropriate for the conditions, or as specified by ATC or the evaluator."),
        S("AA.III.J.S7","Complete the appropriate procedures and checklist(s) in a timely manner.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
    ]
  },

  {
  id: "IV",
  roman: "IV",
  title: "In-flight Maneuvers",
  phase: "flight",
  tasks: [
    T("A","IV_A","Steep Turns","AA.IV.A",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with steep turns.",
      [
        K("AA.IV.A.K1","Energy management concepts."),
        K("AA.IV.A.K2","Aerodynamics associated with steep turns, including:"),
        K("AA.IV.A.K2a","a. Maintaining coordinated flight"),
        K("AA.IV.A.K2b","b. Overbanking tendencies"),
        K("AA.IV.A.K2c","c. Maneuvering speed, including the impact of weight changes"),
        K("AA.IV.A.K2d","d. Load factor and accelerated stalls"),
        K("AA.IV.A.K2e","e. Rate and radius of turn")
      ],
      [
        R("AA.IV.A.R1","Spatial disorientation when conducting a steep turn while flying by reference to instruments."),
        R("AA.IV.A.R2","Collision hazards including aircraft and terrain."),
        R("AA.IV.A.R3","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.IV.A.R4","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AA.IV.A.R5","Uncoordinated flight.")
      ],
      [
        S("AA.IV.A.S1","Select an entry altitude that allows the Task to be completed no lower than 3,000 feet above ground level (AGL)."),
        S("AA.IV.A.S2","Establish the manufacturer's recommended airspeed; or if one is not available, an airspeed not to exceed maneuvering speed (VA)."),
        S("AA.IV.A.S3","Establish at least a 45° bank solely by reference to instruments and make a coordinated steep turn of at least 180°, as specified by the evaluator."),
        S("AA.IV.A.S4","Perform the Task in the opposite direction, as specified by evaluator."),
        S("AA.IV.A.S5","Make smooth pitch, bank, and power adjustments as needed."),
        S("AA.IV.A.S6","Maintain the entry altitude ±100 feet, airspeed ±10 knots, bank ±5°, and roll out on the specified heading, ±10°."),
        S("AA.IV.A.S7","Avoid any indication of an impending stall, abnormal flight attitude, or exceeding any structural or operating limitation during any part of the Task.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","IV_B","Recovery from Unusual Flight Attitudes","AA.IV.B",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with recovering from unusual flight attitudes solely by reference to instruments.",
      [
        K("AA.IV.B.K1","Procedures for recovery from unusual flight attitudes."),
        K("AA.IV.B.K2","Unusual flight attitude causal factors, including physiological factors, system and equipment failures, and environmental factors."),
        K("AA.IV.B.K3","The operating envelope and structural limitations for the aircraft."),
        K("AA.IV.B.K4","Effects of engine location, wing design, and other specific design characteristics that could affect aircraft control during the recovery.")
      ],
      [
        R("AA.IV.B.R1","Situations that could lead to loss of control in-flight (LOC-I) or unusual attitudes in-flight (e.g., stress, task saturation, inadequate instrument scan distractions, and spatial disorientation)."),
        R("AA.IV.B.R2","[Archived]"),
        R("AA.IV.B.R3","Operating envelope considerations."),
        R("AA.IV.B.R4","Interpreting flight instruments."),
        R("AA.IV.B.R5","Assessment of the unusual attitude."),
        R("AA.IV.B.R6","Control input errors, inducing undesired aircraft attitudes."),
        R("AA.IV.B.R7","Control application solely by reference to instruments."),
        R("AA.IV.B.R8","Collision hazards."),
        R("AA.IV.B.R9","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("AA.IV.B.S1","Use proper instrument cross-check and interpretation to identify an unusual attitude (including both nose-high and nose-low) in flight, and apply the appropriate flight control, power input, and aircraft configuration in the correct sequence, to return to a stabilized level flight attitude.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("C","IV_C","Specific Flight Characteristics","AA.IV.C",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with flight and performance characteristics unique to a specific aircraft type.",
      [
        K("AA.IV.C.K1","All specific flight and performance characteristics associated with the aircraft.")
      ],
      [
        R("AA.IV.C.R1","Specific flight and performance characteristics, their effects, and applicable procedures."),
        R("AA.IV.C.R2","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("AA.IV.C.S1","Use proper techniques, checklists, and procedures to enter into, operate within, and recover from specific flight situations, as applicable.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},

  {
  id: "V",
  roman: "V",
  title: "Stall Prevention",
  phase: "flight",
  tasks: [
    T("A","V_A","Partial Flap Configuration Stall Prevention","AA.V.A",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with stalls in a partial flap configuration.",
      [
        K("AA.V.A.K1","Aerodynamics associated with stalls in a partial flap configuration, including the relationship between angle of attack, airspeed, load factor, power setting, aircraft weight and balance, aircraft attitude, and sideslip effects."),
        K("AA.V.A.K2","Stall characteristics as they relate to airplane design, and recognition impending stall and full stall indications using sight, sound, or feel."),
        K("AA.V.A.K3","Factors and situations that can lead to a stall during takeoff or while on approach and actions that can be taken to prevent it."),
        K("AA.V.A.K4","Effects of autoflight, flight envelope protection in normal and degraded modes, and unexpected disconnects of the autopilot or autothrottle/autothrust, if applicable to the aircraft used for the evaluation."),
        K("AA.V.A.K5","Fundamentals of stall recovery.")
      ],
      [
        R("AA.V.A.R1","Factors and situations that could lead to an inadvertent stall, spin, and loss of control during takeoff or while on approach."),
        R("AA.V.A.R2","Range and limitations of stall warning indicators (e.g., aircraft buffet, stall horn, stick shaker, etc.)."),
        R("AA.V.A.R3","Stall warning awareness."),
        R("AA.V.A.R4","Stall recovery procedure."),
        R("AA.V.A.R5","Secondary stalls, accelerated stalls, elevator trim stalls, and cross-control stalls."),
        R("AA.V.A.R6","Effect of environmental elements on aircraft performance while in a partial flap configuration as it relates to stalls (e.g., turbulence, microbursts, and high-density altitude)."),
        R("AA.V.A.R7","Collision hazards including aircraft and terrain."),
        R("AA.V.A.R8","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("AA.V.A.S1","Clear the area and select an entry altitude that allows the recovery to be completed no lower than 3,000 feet above ground level (AGL) (non-transport category airplanes) or 5,000 feet AGL (transport category airplanes)."),
        S("AA.V.A.S2","[Archived]"),
        S("AA.V.A.S3","Establish the takeoff or approach configuration (partial flap), as specified by the evaluator, and maintain coordinated flight in simulated or actual instrument conditions throughout the maneuver."),
        S("AA.V.A.S4","Either manually or with the autopilot engaged, smoothly adjust pitch attitude, bank angle (15°-30°), and power setting in accordance with evaluator’s instructions to an impending stall."),
        S("AA.V.A.S5","Acknowledge the cue(s) and promptly recover at the first indication of an impending stall (e.g., buffet, stall horn, stick shaker, etc.)."),
        S("AA.V.A.S6","Execute a stall recovery in accordance with procedures set forth in the Pilot's Operating Handbook (POH)/Flight Manual (FM)."),
        S("AA.V.A.S7","Retract the flaps or other lift/drag devices to the recommended setting, if applicable; retract the landing gear after a positive rate of climb is established, if applicable; and return to the desired flight path as specified by the evaluator.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","V_B","Clean Configuration Stall Prevention","AA.V.B",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with stalls in a clean configuration.",
      [
        K("AA.V.B.K1","Aerodynamics associated with stalls in a clean configuration, including the relationship between angle of attack, airspeed, load factor, power setting, aircraft weight and balance, and aircraft attitude."),
        K("AA.V.B.K2","Stall characteristics as they relate to airplane design, and recognition impending stall and full stall indications using sight, sound, or feel."),
        K("AA.V.B.K3","Factors and situations that can lead to a stall during cruise flight and actions that can be taken to prevent it."),
        K("AA.V.B.K4","Effects of autoflight, flight envelope protection in normal and degraded modes, and unexpected disconnects of the autopilot or autothrottle/autothrust, if applicable to the aircraft used for the evaluation."),
        K("AA.V.B.K5","Fundamentals of stall recovery."),
        K("AA.V.B.K6","Effects of altitude on performance (e.g., thrust available) and flight control effectiveness during a recovery.")
      ],
      [
        R("AA.V.B.R1","Factors and situations that could lead to an inadvertent stall, spin, and loss of control during cruise flight."),
        R("AA.V.B.R2","Range and limitations of stall warning indicators (e.g., aircraft buffet, stall horn, stick shaker, etc.)."),
        R("AA.V.B.R3","Stall warning awareness."),
        R("AA.V.B.R4","Stall recovery procedure."),
        R("AA.V.B.R5","Secondary stalls, accelerated stalls, elevator trim stalls, and cross-control stalls."),
        R("AA.V.B.R6","Effect of environmental elements on aircraft performance while in cruise flight as it relates to stalls (e.g., turbulence, microbursts, and high-density altitude)."),
        R("AA.V.B.R7","Collision hazards including aircraft and terrain."),
        R("AA.V.B.R8","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("AA.V.B.S1","Clear the area and select an entry altitude that allows the recovery to be completed no lower than 3,000 feet above ground level (AGL) (non-transport category airplanes) or 5,000 feet AGL (transport category airplanes)."),
        S("AA.V.B.S2","[Archived]"),
        S("AA.V.B.S3","While in cruise flight, maintain coordinated flight in simulated or actual instrument conditions throughout the maneuver."),
        S("AA.V.B.S4","Either manually or with the autopilot engaged, smoothly adjust pitch attitude, bank angle (15°-30°), and power setting in accordance with evaluator’s instructions to an impending stall."),
        S("AA.V.B.S5","Acknowledge the cue(s) and promptly recover at the first indication of an impending stall (e.g., buffet, stall horn, stick shaker, etc.)."),
        S("AA.V.B.S6","Execute a stall recovery in accordance with procedures set forth in the Pilot's Operating Handbook (POH)/Flight Manual (FM)."),
        S("AA.V.B.S7","Return to the desired flight path as specified by the evaluator.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("C","V_C","Landing Configuration Stall Prevention","AA.V.C",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with stalls in the landing configuration",
      [
        K("AA.V.C.K1","Aerodynamics associated with stalls in the landing configuration, including the relationship between angle of attack, airspeed, load factor, power setting, aircraft weight and balance, aircraft attitude, and sideslip effects."),
        K("AA.V.C.K2","Stall characteristics as they relate to airplane design, and recognition impending stall and full stall indications using sight, sound, or feel."),
        K("AA.V.C.K3","Factors and situations that can lead to a stall when configured for landing and actions that can be taken to prevent it."),
        K("AA.V.C.K4","Effects of autoflight, flight envelope protection in normal and degraded modes, and unexpected disconnects of the autopilot or autothrottle/autothrust, if applicable to the aircraft used for the evaluation."),
        K("AA.V.C.K5","Fundamentals of stall recovery.")
      ],
      [
        R("AA.V.C.R1","Factors and situations that could lead to an inadvertent stall, spin, and loss of control during landing."),
        R("AA.V.C.R2","Range and limitations of stall warning indicators (e.g., aircraft buffet, stall horn, stick shaker, etc.)."),
        R("AA.V.C.R3","Stall warning awareness."),
        R("AA.V.C.R4","Stall recovery procedure."),
        R("AA.V.C.R5","Secondary stalls, accelerated stalls, elevator trim stalls, and cross-control stalls."),
        R("AA.V.C.R6","Effect of environmental elements on aircraft performance while landing as it relates to stalls (e.g., turbulence, icing, microbursts, and high-density altitude)."),
        R("AA.V.C.R7","Stalls at a low altitude."),
        R("AA.V.C.R8","Collision hazards, including aircraft and terrain."),
        R("AA.V.C.R9","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("AA.V.C.S1","Clear the area and select an entry altitude that allows the recovery to be completed no lower than 3,000 feet above ground level (AGL) (non-transport category airplanes) or 5,000 feet AGL (transport category airplanes)."),
        S("AA.V.C.S2","[Archived]"),
        S("AA.V.C.S3","Establish the landing configuration (i.e., lift/drag devices set and landing gear extended) and maintain coordinated flight in simulated or actual instrument conditions throughout the maneuver."),
        S("AA.V.C.S4","Either manually or with the autopilot engaged, smoothly adjust pitch attitude, bank angle (15°-30°), and power setting in accordance with evaluator’s instructions to an impending stall."),
        S("AA.V.C.S5","Acknowledge the cue(s) and promptly recover at the first indication of an impending stall (e.g., buffet, stall horn, stick shaker, etc.)."),
        S("AA.V.C.S6","Execute a stall recovery in accordance with procedures set forth in the Pilot's Operating Handbook (POH)/Flight Manual (FM)."),
        S("AA.V.C.S7","Retract the flaps or other lift/drag devices to the recommended setting, if applicable; retract the landing gear after a positive rate of climb is established, if applicable; and return to the desired flight path as specified by the evaluator.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},

{
id: "VI",
  roman: "VI",
  title: "Instrument Procedures",
  phase: "flight",
  tasks: [
    T("A","VI_A","Instrument Takeoff","AA.VI.A",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with an instrument takeoff.",
      [
        K("AA.VI.A.K1","Operational factors that could affect an instrument takeoff (e.g., runway length, runway lighting, surface conditions, wind, wake turbulence, icing conditions, obstructions, available instrument approaches or alternate airports available) in the event of an emergency after takeoff.")
      ],
      [
        R("AA.VI.A.R1","Selection of a runway based on aircraft performance and limitations, available distance, surface conditions, lighting, and wind."),
        R("AA.VI.A.R2","Wake turbulence."),
        R("AA.VI.A.R3","Abnormal operations, including planning for:"),
        R("AA.VI.A.R3a","a. Rejected takeoff"),
        R("AA.VI.A.R3b","b. Potential engine failure in takeoff/climb phase of flight with the ceiling or visibility below the minimums for an instrument approach at departure airport"),
        R("AA.VI.A.R4","Collision hazards."),
        R("AA.VI.A.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.VI.A.R6","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("AA.VI.A.S1","Coordinate with crew, if applicable, and complete the appropriate checklist(s) prior to takeoff in a timely manner."),
        S("AA.VI.A.S2","Properly set the applicable avionics and flight instruments prior to initiating the takeoff."),
        S("AA.VI.A.S3","Make radio calls as appropriate."),
        S("AA.VI.A.S4","Verify assigned/correct runway (ASEL, AMEL) or takeoff path (ASES, AMES)."),
        S("AA.VI.A.S5","Position the flight controls for the existing wind, if applicable."),
        S("AA.VI.A.S6","Clear the area, taxi into takeoff position, and align the airplane on the runway centerline (ASEL, AMEL) or takeoff path (ASES, AMES)."),
        S("AA.VI.A.S7","Perform an instrument takeoff with instrument meteorological conditions (IMC) simulated at or before reaching an altitude of 100 feet above ground level (AGL). If accomplished in a full flight simulator, visibility should be no greater than ¼ mile, or as specified by applicable operations specifications, whichever is lower."),
        S("AA.VI.A.S8","Maintain centerline (ASEL, AMEL) and proper flight control inputs during the takeoff roll."),
        S("AA.VI.A.S9","Confirm takeoff power and proper engine and flight instrument indications prior to rotation making callouts, as appropriate, for the airplane or per the operator’s procedures."),
        S("AA.VI.A.S10","Rotate and lift off at the recommended airspeed, establish the desired pitch attitude, and accelerate to the desired airspeed/V-speed."),
        S("AA.VI.A.S11","Transition smoothly from visual meteorological conditions (VMC) to actual or simulated instrument meteorological conditions (IMC)."),
        S("AA.VI.A.S12","Maintain desired heading ±5° and desired airspeeds ±5 knots."),
        S("AA.VI.A.S13","Comply with air traffic control (ATC) clearances and instructions issued by ATC or the evaluator, as appropriate."),
        S("AA.VI.A.S14","Complete appropriate after takeoff checklist(s) in a timely manner.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","VI_B","Departure Procedures","AA.VI.B",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with instrument departure procedures (DPs).",
      [
        K("AA.VI.B.K1","Takeoff minimums; (Obstacle) Departure Procedure (ODP), including Visual Climb over the Airport (VCOA) and Diverse Vector Area (Radar Vectors); Standard Instrument Departure (SID), including Area Navigation (RNAV) departure; required climb gradients; U.S. Terminal Procedures Publications; and En Route Charts."),
        K("AA.VI.B.K2","Use of a Flight Management System (FMS) or Global Positioning System (GPS) to follow a DP."),
        K("AA.VI.B.K3","Pilot/controller responsibilities, communication procedures, and ATC services available to pilots."),
        K("AA.VI.B.K4","Two-way radio communication failure procedures after takeoff."),
        K("AA.VI.B.K5","Ground-based and satellite-based navigation systems (orientation, course determination, equipment, tests and regulations, interference, appropriate use of navigation data, signal integrity).")
      ],
      [
        R("AA.VI.B.R1","Following published procedures and required climb gradients or ATC Instructions."),
        R("AA.VI.B.R2","Limitations of air traffic avoidance equipment and use of see and avoid techniques."),
        R("AA.VI.B.R3","Automation management.")
      ],
      [
        S("AA.VI.B.S1","Select the appropriate instrument departure procedure. Then select, identify (as necessary), and use the appropriate communication and navigation facilities associated with the procedure."),
        S("AA.VI.B.S2","Program the FMS prior to departure and set avionics, including flight director and autopilot controls, as appropriate, for the departure, if applicable."),
        S("AA.VI.B.S3","Coordinate with crew, if applicable, and complete the appropriate checklist(s) in a timely manner."),
        S("AA.VI.B.S4","Use current and appropriate navigation publications or databases for the proposed flight."),
        S("AA.VI.B.S5","Establish two-way communications with the proper controlling agency, use proper phraseology, comply, in a timely manner, with all ATC instructions and airspace restrictions, and exhibit adequate knowledge of communication failure procedures."),
        S("AA.VI.B.S6","Intercept all courses, radials, and bearings appropriate to the procedure, route, clearance, or as directed by the evaluator in a timely manner."),
        S("AA.VI.B.S7","Comply with all applicable charted procedures."),
        S("AA.VI.B.S8","Maintain the appropriate airspeed ±10 knots, headings ±10°, and altitude ±100 feet, and accurately track a course, radial, or bearing."),
        S("AA.VI.B.S9","Conduct the departure phase to a point where, in the opinion of the evaluator, the transition to the en route environment is complete.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("C","VI_C","Arrival Procedures","AA.VI.C",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with Instrument Flight Rules (IFR) arrival procedures.",
      [
        K("AA.VI.C.K1","Standard Terminal Arrival (STAR) charts, U.S. Terminal Procedures Publications, and IFR En Route High and Low Altitude Charts."),
        K("AA.VI.C.K2","Use of a Flight Management System (FMS) or GPS to follow a STAR."),
        K("AA.VI.C.K3","Pilot/controller responsibilities, communication procedures, and ATC services available to pilots."),
        K("AA.VI.C.K4","Two-way radio communication failure procedures during an arrival."),
        K("AA.VI.C.K5","Ground-based and satellite-based navigation systems (orientation, course determination, equipment, tests and regulations, interference, appropriate use of navigation data, signal integrity).")
      ],
      [
        R("AA.VI.C.R1","ATC communications and compliance with published procedures."),
        R("AA.VI.C.R2","Limitations of traffic avoidance equipment."),
        R("AA.VI.C.R3","Responsibility to use \"see and avoid\" techniques when possible."),
        R("AA.VI.C.R4","Automation management."),
        R("AA.VI.C.R5","ATC instructions that modify an arrival or discontinue/resume the aircraft's lateral or vertical navigation on an arrival.")
      ],
      [
        S("AA.VI.C.S1","In actual or simulated instrument conditions, select, identify (as necessary) and use the appropriate communication and navigation facilities associated with the arrival."),
        S("AA.VI.C.S2","Set FMS and avionics, including flight director and autopilot controls for the arrival, if applicable."),
        S("AA.VI.C.S3","Coordinate with crew, if applicable, and complete the appropriate checklist(s) in a timely manner."),
        S("AA.VI.C.S4","Use current and appropriate navigation publications or databases for the proposed flight."),
        S("AA.VI.C.S5","Establish two-way communications with the proper controlling agency, use proper phraseology and comply, in a timely manner, with all ATC instructions and airspace restrictions as well as exhibit adequate knowledge of communication failure procedures."),
        S("AA.VI.C.S6","Intercept all courses, radials, and bearings appropriate to the procedure, route, clearance, or as directed by the evaluator in a timely manner."),
        S("AA.VI.C.S7","Comply with all applicable charted procedures."),
        S("AA.VI.C.S8","Adhere to airspeed restrictions required by regulation, procedure, aircraft limitation, ATC, or the evaluator."),
        S("AA.VI.C.S9","Establish rates of descent consistent with the route segment, airplane operating characteristics and safety."),
        S("AA.VI.C.S10","Maintain the appropriate airspeed/V-speed ±10 knots, but not less than reference landing approach speed (VREF) if applicable, heading ±10°, altitude ±100 feet, and accurately track radials, courses, and bearings.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("D","VI_D","Non-precision Approaches","AA.VI.D",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with performing non-precision approach procedures.",
      [
        K("AA.VI.D.K1","Procedures and limitations associated with a non-precision approach, including the differences between Localizer Performance (LP) and Lateral Navigation (LNAV) approach guidance."),
        K("AA.VI.D.K2","Navigation system displays and annunciations, modes of operation, and Required Navigation Performance (RNP) lateral accuracy values associated with an RNAV (GPS) approach."),
        K("AA.VI.D.K3","Ground-based and satellite-based navigation systems (orientation, course determination, equipment, tests and regulations, interference, appropriate use of navigation data, signal integrity)."),
        K("AA.VI.D.K4","A stabilized approach, including energy management concepts.")
      ],
      [
        R("AA.VI.D.R1","Deviating from the assigned approach procedure."),
        R("AA.VI.D.R2","Selecting a navigation frequency."),
        R("AA.VI.D.R3","Management of automated navigation and autoflight systems."),
        R("AA.VI.D.R4","Aircraft configuration during an approach and missed approach."),
        R("AA.VI.D.R5","An unstable approach, including excessive descent rates."),
        R("AA.VI.D.R6","Deteriorating weather conditions on approach."),
        R("AA.VI.D.R7","Operating below the minimum descent altitude (MDA) without proper visual references.")
      ],
      [
        S("AA.VI.D.S1","Accomplish the non-precision instrument approaches selected by the evaluator."),
        S("AA.VI.D.S2","Establish two-way communications with air traffic control (ATC) appropriate for the phase of flight or approach segment, and use proper communication phraseology."),
        S("AA.VI.D.S3","Select, tune, identify, and confirm the operational status of navigation equipment to be used for the approach."),
        S("AA.VI.D.S4","Comply with all clearances issued by ATC or the evaluator."),
        S("AA.VI.D.S5","Recognize if any flight instrumentation is inaccurate or inoperative, and take appropriate action."),
        S("AA.VI.D.S6","Advise ATC or the evaluator if unable to comply with a clearance."),
        S("AA.VI.D.S7","Coordinate with crew, if applicable, and complete the appropriate checklist(s) in a timely manner."),
        S("AA.VI.D.S8","Establish the appropriate airplane configuration and airspeed considering meteorological and operating conditions."),
        S("AA.VI.D.S9","Maintain altitude ±100 feet, selected heading ±5°, airspeed ±10 knots, and accurately track radials, courses, and bearings, prior to beginning the final approach segment."),
        S("AA.VI.D.S10","Adjust the published MDA/Derived Decision Altitude (DDA) and visibility criteria for the aircraft approach category, as appropriate, for factors that include Notices to Air Missions (NOTAMs), inoperative aircraft or navigation equipment, or inoperative visual aids associated with the landing environment, etc."),
        S("AA.VI.D.S11","Establish a stabilized descent to the appropriate altitude."),
        S("AA.VI.D.S12","For the final approach segment, maintain no more than ¼ scale course deviation indicator (CDI) deflection, airspeed ±5 knots of selected value, and altitude above MDA +50/-0 feet [to the visual descent point (VDP) or missed approach point (MAP)]."),
        S("AA.VI.D.S13","Execute the missed approach procedure if the required visual references are not distinctly visible and identifiable at the appropriate point or altitude for the approach profile; or execute a normal landing from a straight-in or circling approach."),
        S("AA.VI.D.S14","Use a Multi-Function Display (MFD) and other graphical navigation displays, if installed, to monitor position, track wind drift and other parameters to maintain desired flightpath.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("E","VI_E","Precision Approaches","AA.VI.E",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with performing precision approach procedures.",
      [
        K("AA.VI.E.K1","Procedures and limitations associated with a precision approach, including determining required descent rates and adjusting minimums in the case of inoperative equipment."),
        K("AA.VI.E.K2","Navigation system displays, annunciations, and modes of operation."),
        K("AA.VI.E.K3","Ground-based and satellite-based navigation systems (orientation, course determination, equipment, tests and regulations, interference, appropriate use of navigation data, signal integrity)."),
        K("AA.VI.E.K4","A stabilized approach, including energy management concepts.")
      ],
      [
        R("AA.VI.E.R1","Deviating from the assigned approach procedure."),
        R("AA.VI.E.R2","Selecting a navigation frequency."),
        R("AA.VI.E.R3","Management of automated navigation and autoflight systems."),
        R("AA.VI.E.R4","Aircraft configuration during an approach and missed approach."),
        R("AA.VI.E.R5","An unstable approach, including excessive descent rates."),
        R("AA.VI.E.R6","Deteriorating weather conditions on approach."),
        R("AA.VI.E.R7","Continuing to descend below the Decision Altitude (DA)/Decision Height (DH) when the required visual references are not visible.")
      ],
      [
        S("AA.VI.E.S1","Accomplish the precision instrument approaches selected by the evaluator."),
        S("AA.VI.E.S2","Establish two-way communications with air traffic control (ATC) appropriate for the phase of flight or approach segment, and use proper communication phraseology."),
        S("AA.VI.E.S3","Select, tune, identify, and confirm the operational status of navigation equipment to be used for the approach."),
        S("AA.VI.E.S4","Comply in a timely manner with all clearances, instructions, and procedures."),
        S("AA.VI.E.S5","Recognize if any flight instrumentation is inaccurate or inoperative, and take appropriate action."),
        S("AA.VI.E.S6","Advise ATC or the evaluator if unable to comply with a clearance."),
        S("AA.VI.E.S7","Coordinate with crew, if applicable, and complete the appropriate checklist(s) in a timely manner."),
        S("AA.VI.E.S8","Establish the appropriate airplane configuration and airspeed considering meteorological and operating conditions."),
        S("AA.VI.E.S9","Maintain altitude ±100 feet, selected heading ±5°, airspeed ±10 knots, and accurately track radials, courses, and bearings, prior to beginning the final approach segment."),
        S("AA.VI.E.S10","Adjust the published DA/DH and visibility criteria for the aircraft approach category, as appropriate, to account for NOTAMS, inoperative airplane or navigation equipment, or inoperative visual aids associated with the landing environment."),
        S("AA.VI.E.S11","Establish a predetermined rate of descent at the point where vertical guidance begins, which approximates that required for the aircraft to follow the vertical guidance."),
        S("AA.VI.E.S12","Maintain a stabilized final approach from the Final Approach Fix (FAF) to DA/DH allowing no more than ¼-scale deflection of either the vertical or lateral guidance indications and maintain the desired airspeed ±5 knots."),
        S("AA.VI.E.S13","Upon reaching the DA/DH, immediately initiate the missed approach procedures if the required visual references for the runway are not distinctly visible and identifiable (or if in a seaplane); or transition to a normal landing approach only when the aircraft is in a position from which a descent to a landing on the runway can be made at a normal rate of descent using normal maneuvering."),
        S("AA.VI.E.S14","Use an MFD and other graphical navigation displays, if installed, to monitor position, track wind drift and other parameters to maintain desired flightpath.")
      ],
       ["ASEL","ASES","AMEL","AMES"]
      )    ,

    T("F","VI_F","Landing from a Precision Approach","AA.VI.F",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with performing the procedures for a landing from a precision approach.",
      [
        K("AA.VI.F.K1","Elements related to the pilot’s responsibilities, and the environmental, operational, and meteorological factors that affect landing from a precision approach."),
        K("AA.VI.F.K2","Approach lighting systems and runway and taxiway signs, markings, and lighting.")
      ],
      [
        R("AA.VI.F.R1","Selection of an approach procedure and runway based on aircraft limitations, available distance, surface conditions, and wind."),
        R("AA.VI.F.R2","Wake turbulence."),
        R("AA.VI.F.R3","[Archived]"),
        R("AA.VI.F.R3a","a. [Archived]"),
        R("AA.VI.F.R3b","b. [Archived]"),
        R("AA.VI.F.R4","Collision hazards."),
        R("AA.VI.F.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.VI.F.R6","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AA.VI.F.R7","Attempting to land from an unstable approach."),
        R("AA.VI.F.R8","Flying below the glidepath."),
        R("AA.VI.F.R9","Transitioning from instrument to visual references for landing."),
        R("AA.VI.F.R10","Missed Approach."),
        R("AA.VI.F.R11","Land and hold short operations (LAHSO).")
      ],
      [
        S("AA.VI.F.S1","Maintain the desired airspeed, ±5 knots, and vertical and lateral guidance within ¼-scale deflection of the indicators during the descent from DA/DH to a point where visual maneuvering is used to accomplish a normal landing."),
        S("AA.VI.F.S2","Adhere to all ATC or evaluator advisories, such as NOTAMs, windshear, wake turbulence, runway surface, braking conditions, and other operational considerations."),
        S("AA.VI.F.S3","Coordinate with crew, if applicable, and complete the appropriate checklist(s) in a timely manner."),
        S("AA.VI.F.S4","Touch down at the aiming point markings, -250/+500 feet, or where there are no runway aiming point markings, 750 to 1,500 feet, from the approach threshold of the runway."),
        S("AA.VI.F.S5","Maintain positive airplane control throughout the landing using drag and braking devices, as appropriate, to come to a stop."),
        S("AA.VI.F.S6","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate."),
        S("AA.VI.F.S7","Use runway incursion avoidance procedures, if applicable.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("G","VI_G","Circling Approach","AA.VI.G",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with performing a circling approach procedure.",
      [
        K("AA.VI.G.K1","Elements related to circling approach procedures and limitations, including approach categories and related airspeed restrictions.")
      ],
      [
        R("AA.VI.G.R1","Prescribed circling approach procedures."),
        R("AA.VI.G.R2","Executing a circling approach at night or with marginal visibility."),
        R("AA.VI.G.R3","Losing visual contact with an identifiable part of the airport."),
        R("AA.VI.G.R4","Management of automated navigation and autoflight systems."),
        R("AA.VI.G.R5","Control of altitude, airspeed, and distance while circling."),
        R("AA.VI.G.R6","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.VI.G.R7","Executing a missed approach after the MAP while circling.")
      ],
      [
        S("AA.VI.G.S1","Comply with the circling approach procedure considering turbulence, windshear, and the maneuvering capability and approach category of the aircraft."),
        S("AA.VI.G.S2","Confirm the direction of traffic and adhere to all restrictions and instructions issued by ATC or the evaluator."),
        S("AA.VI.G.S3","Coordinate with crew, if applicable, and complete the appropriate checklist(s) in a timely manner."),
        S("AA.VI.G.S4","Establish the approach and landing configuration. Maintain a stabilized approach and a descent rate that ensures arrival at the MDA, or the preselected circling altitude above the MDA, prior to the missed approach point."),
        S("AA.VI.G.S5","Maintain airspeed ±5 knots, desired heading/track ±5°, and altitude +100/-0 feet until descending below the MDA or the preselected circling altitude above the MDA."),
        S("AA.VI.G.S6","Visually maneuver to a base or downwind leg appropriate for the landing runway and environmental conditions."),
        S("AA.VI.G.S7","If a missed approach occurs, turn in the appropriate direction using the correct procedure and appropriately configure the airplane.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("H","VI_H","Landing from a Circling Approach","AA.VI.H",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with performing the procedures for a landing from a circling approach.",
      [
        K("AA.VI.H.K1","Elements related to the pilot’s responsibilities, and the environmental, operational, and meteorological factors that affect landing from a circling approach."),
        K("AA.VI.H.K2","Approach lighting systems and runway and taxiway signs, markings, and lighting.")
      ],
      [
        R("AA.VI.H.R1","Selection of an approach procedure and runway based on aircraft limitations, available distance, surface conditions, and wind."),
        R("AA.VI.H.R2","Wake turbulence."),
        R("AA.VI.H.R3","[Archived]"),
        R("AA.VI.H.R3a","a. [Archived]"),
        R("AA.VI.H.R3b","b. [Archived]"),
        R("AA.VI.H.R4","Collision hazards."),
        R("AA.VI.H.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.VI.H.R6","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AA.VI.H.R7","Attempting to land from an unstable approach."),
        R("AA.VI.H.R8","Missed Approach."),
        R("AA.VI.H.R9","Land and hold short operations (LAHSO).")
      ],
      [
        S("AA.VI.H.S1","Keep the airport environment in sight and remain within the circling approach radius applicable to the approach category to a position from which a stabilized descent to landing can be made."),
        S("AA.VI.H.S2","Adhere to all ATC or evaluator advisories, such as NOTAMs, windshear, wake turbulence, runway surface, braking conditions, and other operational considerations."),
        S("AA.VI.H.S3","Coordinate with crew, if applicable, and complete the appropriate checklist(s) in a timely manner."),
        S("AA.VI.H.S4","Aligns the airplane for a normal landing on the selected runway without excessive maneuvering and without exceeding the normal operating limits of the airplane. The angle of bank should not exceed 30°."),
        S("AA.VI.H.S5","Make smooth, timely, and correct control application throughout the circling maneuver and maintain appropriate airspeed, ±5 knots. If applicable, maintain altitude +100/−0 feet, and desired heading/track, ±5°."),
        S("AA.VI.H.S6","Ensure the airplane is configured for landing."),
        S("AA.VI.H.S7","Scan the landing runway and adjoining area for traffic and obstructions. (ASEL, AMEL)."),
        S("AA.VI.H.S8","Touch down at the aiming point markings - 250/+500 feet, or where there are no runway aiming point markings 750 to 1,500 feet from the approach threshold of the runway."),
        S("AA.VI.H.S9","Maintain positive aircraft control throughout the landing using drag and braking devices, as appropriate, to come to a stop."),
        S("AA.VI.H.S10","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate."),
        S("AA.VI.H.S11","Use runway incursion avoidance procedures, if applicable.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("I","VI_I","Missed Approaches","AA.VI.I",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with performing a missed approach procedure.",
      [
        K("AA.VI.I.K1","Elements related to missed approach procedures, including reference to standby or backup instruments."),
        K("AA.VI.I.K2","Limitations associated with standard instrument approaches, including while using an FMS or autopilot, if equipped.")
      ],
      [
        R("AA.VI.I.R1","Deviations from prescribed procedures or ATC instructions."),
        R("AA.VI.I.R2","Holding, diverting, or electing to fly the approach again."),
        R("AA.VI.I.R3","Aircraft configuration during an approach and missed approach."),
        R("AA.VI.I.R4","Factors that might lead to executing a missed approach procedure before the MAP or to a go-around below DA, DH, or MDA, as applicable."),
        R("AA.VI.I.R5","Management of automated navigation and autoflight systems.")
      ],
      [
        S("AA.VI.I.S1","Promptly initiate the missed approach procedure and report it to ATC."),
        S("AA.VI.I.S2","Apply the appropriate power setting for the flight condition and establish a pitch attitude necessary to obtain the desired performance."),
        S("AA.VI.I.S3","Retract the wing flaps/drag devices and landing gear, if appropriate, in the correct sequence and at a safe altitude, and establish a positive rate of climb and the appropriate airspeed/V-speed, ±5 knots."),
        S("AA.VI.I.S4","Coordinate with crew, if applicable, and complete the appropriate procedures and checklist(s) in a timely manner."),
        S("AA.VI.I.S5","Comply with the published or alternate missed approach procedure."),
        S("AA.VI.I.S6","Advise ATC or the evaluator if unable to comply with a clearance, restriction, or climb gradient."),
        S("AA.VI.I.S7","Maintain the heading, course, or bearing ±5°, and altitude(s) ±100 feet during the missed approach procedure."),
        S("AA.VI.I.S8","Use an MFD and other graphical navigation displays, if installed, to monitor position and track to help navigate the missed approach."),
        S("AA.VI.I.S9","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate."),
        S("AA.VI.I.S10","Re-engage autopilot (if installed) at appropriate times during the missed approach procedure."),
        S("AA.VI.I.S11","Request ATC clearance to attempt another approach, proceed to the alternate airport, holding fix, or other clearance limit, as appropriate, or as directed by the evaluator.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("J","VI_J","Holding Procedures","AA.VI.J",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with holding procedures.",
      [
        K("AA.VI.J.K1","Elements related to holding procedures, including reporting criteria, appropriate speeds, and recommended entry procedures for standard, nonstandard, published, and non-published holding patterns."),
        K("AA.VI.J.K2","Determining holding endurance based upon factors, including an expect further clearance (EFC) time, fuel on board, fuel flow while holding, fuel required to destination and alternate, etc., as appropriate."),
        K("AA.VI.J.K3","When to declare minimum fuel or a fuel-related emergency."),
        K("AA.VI.J.K4","Use of automation for holding, including autopilot and flight management systems, if equipped.")
      ],
      [
        R("AA.VI.J.R1","Recalculating fuel reserves if assigned an unanticipated expect further clearance (EFC) time."),
        R("AA.VI.J.R2","Scenarios and circumstances that could result in minimum fuel or the need to declare an emergency."),
        R("AA.VI.J.R3","Scenarios that could lead to holding, including deteriorating weather at the planned destination."),
        R("AA.VI.J.R4","Holding entry and wind correction while holding."),
        R("AA.VI.J.R5","Holding while in icing conditions."),
        R("AA.VI.J.R6","Automation management.")
      ],
      [
        S("AA.VI.J.S1","Correctly identify instrument navigation aids associated with the assigned hold."),
        S("AA.VI.J.S2","Use an entry procedure appropriate for a standard, nonstandard, published, or non-published holding pattern."),
        S("AA.VI.J.S3","Change to the appropriate holding airspeed for the aircraft and holding altitude to cross the holding fix at or below maximum holding airspeed."),
        S("AA.VI.J.S4","Comply with the holding pattern leg length and other restrictions, if applicable, associated with the holding pattern."),
        S("AA.VI.J.S5","Comply with ATC reporting requirements."),
        S("AA.VI.J.S6","Use proper wind correction procedures to maintain the desired pattern and to arrive over the fix as close as possible to a specified time."),
        S("AA.VI.J.S7","Maintain specified airspeed ±10 knots, altitude ±100 feet, headings ±10°, and accurately track a selected course, radial, or bearing."),
        S("AA.VI.J.S8","If available, use automation, including autopilot, flight director controls, and navigation displays associated with the assigned hold."),
        S("AA.VI.J.S9","Update fuel reserve calculations based on EFC times.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},

{
  id: "VII",
  roman: "VII",
  title: "Emergency Operations",
  phase: "flight",
  tasks: [
    T("A","VII_A","Emergency Procedures","AA.VII.A",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with emergency procedures.",
      [
        K("AA.VII.A.K1","Declaring an emergency and selection of a suitable airport or landing location."),
        K("AA.VII.A.K2","Situations that would require an emergency descent (e.g., depressurization, smoke, or engine fire)."),
        K("AA.VII.A.K3","Causes of inflight fire or smoke."),
        K("AA.VII.A.K4","Airplane decompression."),
        K("AA.VII.A.K5","When an emergency evacuation may be necessary."),
        K("AA.VII.A.K6","Actions required if icing conditions exceed the capabilities of the aircraft.")
      ],
      [
        R("AA.VII.A.R1","Selection of the procedures or checklists to follow in an emergency."),
        R("AA.VII.A.R2","Multiple failures or system abnormalities."),
        R("AA.VII.A.R3","Altitude, wind, terrain, and obstruction considerations in an emergency."),
        R("AA.VII.A.R4","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("AA.VII.A.S1","Explain or describe an emergency procedure for a situation(s) presented by the evaluator."),
        S("AA.VII.A.S2","Use proper procedures for an emergency situation(s) presented by the evaluator, such as:"),
        S("AA.VII.A.S2a","a. Emergency Descent"),
        S("AA.VII.A.S2b","b. Inflight fire and smoke"),
        S("AA.VII.A.S2c","c. Decompression"),
        S("AA.VII.A.S2d","d. Emergency evacuation"),
        S("AA.VII.A.S2e","e. Airframe icing"),
        S("AA.VII.A.S2f","f. Others as specified in the Airplane Flight Manual (AFM)/Pilot's Operating Handbook (POH)"),
        S("AA.VII.A.S3","Fly by reference to standby flight instruments, backup instrumentation, or partial panel, if applicable and appropriate to the situation."),
        S("AA.VII.A.S4","Coordinate with crew, if applicable, and complete the appropriate checklist(s) in a timely manner."),
        S("AA.VII.A.S5","Communicate with air traffic control (ATC) and the evaluator, as appropriate for the situation.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )    ,

    T("B","VII_B","Powerplant Failure During Takeoff","AA.VII.B",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with powerplant failure during takeoff.",
      [
        K("AA.VII.B.K1","The procedures used during a powerplant(s) failure on takeoff, the appropriate reference airspeeds, and the specific pilot actions required."),
        K("AA.VII.B.K2","Operational considerations, including: airplane performance (e.g., sideslip, bank angle, rudder input), takeoff warning systems, runway length, surface conditions, density altitude, wake turbulence, environmental conditions, obstructions, and other related factors that could adversely affect safety.")
      ],
      [
        R("AA.VII.B.R1","Planning for a potential powerplant failure during takeoff considering operational factors (e.g., takeoff warning inhibit systems, other airplane characteristics, runway/takeoff path length, surface conditions, environmental conditions, obstructions, and land and hold short operations."),
        R("AA.VII.B.R2","Briefing the plan for a powerplant failure during takeoff, in a crew environment."),
        R("AA.VII.B.R3","Selection of the procedures or checklists to follow in an emergency."),
        R("AA.VII.B.R4","Identifying the inoperative engine (AMEL, AMES)."),
        R("AA.VII.B.R5","Inability to climb or maintain altitude with an inoperative powerplant (AMEL, AMES)."),
        R("AA.VII.B.R6","Altitude, wind, terrain, and obstruction considerations in an emergency."),
        R("AA.VII.B.R7","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.VII.B.R8","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("AA.VII.B.S1","Following the powerplant failure, maintain positive airplane control and adjust the powerplant controls as recommended by the manufacturer for the existing conditions."),
        S("AA.VII.B.S2","Establish a power-off descent approximately straight-ahead if the powerplant failure occurs after becoming airborne and before reaching an altitude where a safe turn can be made (ASEL, ASES) or the performance capabilities and operating limitations of the airplane do not allow the climb to continue (AMEL, AMES)."),
        S("AA.VII.B.S3","Continue the takeoff if the (simulated) powerplant failure occurs at a point where the airplane can continue to a specified airspeed and altitude at the end of the runway commensurate with the airplane’s performance capabilities and operating limitations (AMEL, AMES)."),
        S("AA.VII.B.S4","After establishing a climb, maintain the desired airspeed, ±5 knots. Use flight controls in the proper combination as recommended by the manufacturer, or as required, to maintain best performance and trim as required (AMEL, AMES)."),
        S("AA.VII.B.S5","Maintain the appropriate heading, ±5°, when powerplant failure occurs (AMEL, AMES)."),
        S("AA.VII.B.S6","Coordinate with crew, if applicable, and complete the appropriate checklist(s) following the powerplant failure."),
        S("AA.VII.B.S7","Communicate with air traffic control (ATC) and the evaluator, as appropriate for the situation.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("C","VII_C","Powerplant Failure (Simulated)","AA.VII.C",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with powerplant failure and associated emergency approach and landing procedures.",
      [
        K("AA.VII.C.K1","Immediate action items and emergency procedures for a forced landing."),
        K("AA.VII.C.K2","Airspeed, including:"),
        K("AA.VII.C.K2a","a. Importance of best glide speed and its relationship to distance"),
        K("AA.VII.C.K2b","b. Difference between best glide speed and minimum sink speed"),
        K("AA.VII.C.K2c","c. Effects of wind on glide distance"),
        K("AA.VII.C.K3","Effects of atmospheric conditions on emergency approach and landing."),
        K("AA.VII.C.K4","A stabilized approach, including energy management concepts."),
        K("AA.VII.C.K5","Emergency Locator Transmitters (ELTs) and other emergency locating devices."),
        K("AA.VII.C.K6","Air traffic control (ATC) services to aircraft in distress.")
      ],
      [
        R("AA.VII.C.R1","Altitude, wind, terrain, obstructions, gliding distance, and available landing distance considerations."),
        R("AA.VII.C.R2","Following or changing the planned flightpath to the selected landing area."),
        R("AA.VII.C.R3","Collision hazards."),
        R("AA.VII.C.R4","Configuring the airplane."),
        R("AA.VII.C.R5","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.VII.C.R6","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AA.VII.C.R7","A powerplant failure in Instrument Meteorological Conditions (IMC).")
      ],
      [
        S("AA.VII.C.S1","Recognize the powerplant failure."),
        S("AA.VII.C.S2","Determine the cause for the simulated powerplant failure (if altitude permits) and if a restart is a viable option."),
        S("AA.VII.C.S3","Maintain positive control throughout the maneuver."),
        S("AA.VII.C.S4","Establish and maintain the recommended best glide airspeed, ±5 knots."),
        S("AA.VII.C.S5","Configure the airplane in accordance with the Pilot's Operating Handbook (POH)\\Airplane Flight Manual (AFM) and existing conditions."),
        S("AA.VII.C.S6","Select a suitable landing area considering altitude, wind, terrain, obstructions, and available glide distance."),
        S("AA.VII.C.S7","Establish a proper flight path to the selected landing area."),
        S("AA.VII.C.S8","Complete emergency checklist items appropriate to the airplane in a timely manner and as recommended by the manufacturer or operator."),
        S("AA.VII.C.S9","Communicate with air traffic control (ATC) and the evaluator, as appropriate for the situation.")
      ],
      ["ASEL","ASES"]
    ),

    T("D","VII_D","Inflight Powerplant(s) Failure and Restart","AA.VII.D",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with inflight powerplant failure and restart procedures, if applicable, in a multiengine airplane.",
      [
        K("AA.VII.D.K1","Flight characteristics and controllability associated with maneuvering the airplane with powerplant(s) inoperative, including the importance of drag reduction."),
        K("AA.VII.D.K2","Powerplant restart procedures and conditions where a restart attempt is appropriate.")
      ],
      [
        R("AA.VII.D.R1","Powerplant(s) failure."),
        R("AA.VII.D.R2","Methods for handling a powerplant failure or a powerplant restart."),
        R("AA.VII.D.R3","Diagnosis of the cause of the powerplant failure."),
        R("AA.VII.D.R4","Collision hazards."),
        R("AA.VII.D.R5","Configuring the airplane."),
        R("AA.VII.D.R6","Factors and situations that could lead to an inadvertent stall, spin, and loss of control with an inflight powerplant failure."),
        R("AA.VII.D.R7","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("AA.VII.D.S1","Recognize and correctly identify powerplant(s) failure, complete memory items (if applicable), and maintain positive airplane control."),
        S("AA.VII.D.S2","Coordinate with crew, if applicable, and complete the appropriate emergency procedures and checklist(s) for propeller feathering or powerplant shutdown."),
        S("AA.VII.D.S3","Use flight controls in the proper combination as recommended by the manufacturer, or as required to maintain best performance, and trim as required."),
        S("AA.VII.D.S4","Determine the cause for the powerplant(s) failure and if a restart is a viable option."),
        S("AA.VII.D.S5","Maintain the operating powerplant(s) within acceptable operating limits."),
        S("AA.VII.D.S6","Maintain airspeed ±10 knots, altitude ±100 feet, headings ±10°, as specified by the evaluator and within the airplane’s capability."),
        S("AA.VII.D.S7","Consider a powerplant restart and, if appropriate, demonstrate the powerplant restart procedures in accordance with the manufacturer or operator specified procedures and checklists."),
        S("AA.VII.D.S8","Select the nearest suitable airport or landing area."),
        S("AA.VII.D.S9","Communicate with air traffic control (ATC) and the evaluator, as appropriate for the situation.")
      ],
      ["AMEL","AMES"]
    ),

    T("E","VII_E","Approach and Landing with a Powerplant Failure (Simulated)","AA.VII.E",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with approach and landing with a powerplant failure in a multiengine airplane.",
      [
        K("AA.VII.E.K1","Flight characteristics and controllability associated with maneuvering to a landing with inoperative powerplant(s)."),
        K("AA.VII.E.K2","Go-around/rejected landing procedures with a powerplant failure."),
        K("AA.VII.E.K3","How to determine a suitable airport.")
      ],
      [
        R("AA.VII.E.R1","Planning for a powerplant failure inflight or during an approach."),
        R("AA.VII.E.R2","Collision hazards."),
        R("AA.VII.E.R3","Configuring the airplane."),
        R("AA.VII.E.R4","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.VII.E.R5","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AA.VII.E.R6","Performing a go-around/rejected landing with a powerplant failure.")
      ],
      [
        S("AA.VII.E.S1","Recognize and correctly identify powerplant(s) failure, complete memory items (if applicable), and maintain positive airplane control."),
        S("AA.VII.E.S2","Coordinate with crew, if applicable, and complete the appropriate emergency procedures and checklist(s) for simulated propeller feathering or simulated powerplant shutdown."),
        S("AA.VII.E.S3","Use flight controls and configure the aircraft as required to maintain best performance or as recommended by the manufacturer."),
        S("AA.VII.E.S4","Maintain the operating powerplant(s) within acceptable operating limits."),
        S("AA.VII.E.S5","Communicate with air traffic control (ATC) and the evaluator, as appropriate for the situation."),
        S("AA.VII.E.S6","Prior to beginning the final approach segment, maintain the desired altitude ±100 feet, the desired airspeed ±10 knots, the desired heading ±5°, and accurately track courses, radials, and bearings."),
        S("AA.VII.E.S7","Establish the recommended approach and landing configuration and airspeed, ±5 knots, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("AA.VII.E.S8","Maintain directional control and appropriate crosswind correction throughout the approach and landing."),
        S("AA.VII.E.S9","Make smooth, timely, and correct control application before, during, and after touchdown."),
        S("AA.VII.E.S10","Touch down at the appropriate speed and pitch attitude at the runway aiming point markings -250/+500 feet, or where there are no runway markings 750 to 1,500 feet from the approach threshold of the runway (AMEL)."),
        S("AA.VII.E.S11","During round out and touchdown contact the water at the proper pitch attitude within 200 feet beyond a specified point. In addition, for AMES, the touchdown is within the first one-third of the water landing area."),
        S("AA.VII.E.S12","Maintain positive aircraft control throughout the landing using drag and braking devices, as appropriate, to come to a stop."),
        S("AA.VII.E.S13","Coordinate with crew, if applicable, and complete after landing checklists.")
      ],
      ["AMEL","AMES"]
    ),

    T("F","VII_F","Precision Approach (Manually Flown) with a Powerplant Failure (Simulated)","AA.VII.F",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with precision approach (manually flown) with a powerplant failure in a multiengine airplane.",
      [
        K("AA.VII.F.K1","Flight characteristics and controllability associated with maneuvering to a landing with inoperative powerplant(s)."),
        K("AA.VII.F.K2","Missed approach considerations with a powerplant failure."),
        K("AA.VII.F.K3","How to determine a suitable airport.")
      ],
      [
        R("AA.VII.F.R1","Planning for a powerplant failure inflight or during an approach."),
        R("AA.VII.F.R2","Collision hazards."),
        R("AA.VII.F.R3","Configuring the airplane."),
        R("AA.VII.F.R4","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.VII.F.R5","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AA.VII.F.R6","Landing with a powerplant failure."),
        R("AA.VII.F.R7","Missed approach with a powerplant failure."),
        R("AA.VII.F.R8","Maneuvering in instrument meteorological conditions (IMC) with a powerplant failure.")
      ],
      [
        S("AA.VII.F.S1","Recognize and correctly identify powerplant(s) failure, complete memory items (if applicable), and maintain positive airplane control."),
        S("AA.VII.F.S2","Coordinate with crew, if applicable, and complete the appropriate emergency procedures and checklist(s) for simulated propeller feathering or simulated powerplant shutdown."),
        S("AA.VII.F.S3","Use flight controls and configure the aircraft as required to maintain best performance or as recommended by the manufacturer."),
        S("AA.VII.F.S4","Maintain the operating powerplant(s) within acceptable operating limits."),
        S("AA.VII.F.S5","Make radio calls as appropriate."),
        S("AA.VII.F.S6","Proceed toward the nearest suitable airport."),
        S("AA.VII.F.S7","Coordinate with crew, if applicable, and complete the approach and landing checklists."),
        S("AA.VII.F.S8","Establish the appropriate airplane configuration and airspeed considering meteorological and operating conditions."),
        S("AA.VII.F.S9","Prior to beginning the final approach segment, maintain the desired altitude ±100 feet, the desired airspeed ±10 knots, the desired heading ±5°, and accurately track courses, radials, and bearings."),
        S("AA.VII.F.S10","Apply adjustments to the published decision altitude (DA)/decision height (DH) and visibility criteria for the aircraft approach category, as appropriate, for factors that include Notices to Air Missions (NOTAMs), inoperative aircraft or navigation equipment, inoperative visual aids associated with the landing environment, etc."),
        S("AA.VII.F.S11","Establish a predetermined rate of descent at the point where vertical guidance begins, which approximates that required for the aircraft to follow the vertical guidance."),
        S("AA.VII.F.S12","Fly and maintain a stabilized approach, adjusting pitch and power as required, allowing no more than ¼-scale deflection of either the vertical or lateral guidance indications."),
        S("AA.VII.F.S13","Maintain a stabilized final approach from the final approach fix (FAF) to the DA/DH allowing no more than ¼-scale deflection of either the vertical or lateral guidance indications and maintain the desired airspeed ±5 knots."),
        S("AA.VII.F.S14","Maintain directional control and appropriate crosswind correction throughout the approach and landing or missed approach."),
        S("AA.VII.F.S15","Upon reaching the DA/DH, immediately initiate the missed approach procedures if the required visual references for the runway are not distinctly visible and identifiable (or if in a seaplane); or transition to a normal landing approach only when the aircraft is in a position from which a descent to a landing on the runway can be made at a normal rate of descent using normal maneuvering."),
        S("AA.VII.F.S16","Make smooth, timely, and correct control application before, during, and after touchdown or during the missed approach.")
      ],
      ["AMEL","AMES"]
    ),

    T("G","VII_G","Landing from a No Flap or a Nonstandard Flap Approach","AA.VII.G",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with no flap or a nonstandard flap approach and landing.",
      [
        K("AA.VII.G.K1","Airplane flight characteristics when flaps, leading edge devices, and other similar devices malfunction or become inoperative."),
        K("AA.VII.G.K2","Other airplane system limitations when landing at a high speed."),
        K("AA.VII.G.K3","How to determine required landing distance and a suitable runway for landing.")
      ],
      [
        R("AA.VII.G.R1","Hazards associated with a no flap or nonstandard flap approach and landing, including an asymmetrical flap situation."),
        R("AA.VII.G.R2","Selection of a runway based on aircraft limitations, available distance, surface conditions, and wind."),
        R("AA.VII.G.R3","Wake turbulence."),
        R("AA.VII.G.R4","Go-around/rejected landing."),
        R("AA.VII.G.R5","Collision hazards."),
        R("AA.VII.G.R6","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("AA.VII.G.R7","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("AA.VII.G.S1","Identify the malfunction."),
        S("AA.VII.G.S2","Coordinate with crew, if applicable, and complete applicable checklist(s) for the malfunction, approach, and landing."),
        S("AA.VII.G.S3","Communicate with ATC as needed and select an airport/runway with sufficient length for landing."),
        S("AA.VII.G.S4","Calculate the correct airspeeds/V-speeds for approach and landing."),
        S("AA.VII.G.S5","Establish the recommended approach and landing configuration, airspeed, and trim, and adjust pitch attitude and power as required to maintain a stabilized approach."),
        S("AA.VII.G.S6","Select a suitable touchdown point considering wind, landing surface, and obstructions."),
        S("AA.VII.G.S7","Make smooth, timely, and correct control application before, during, and after touchdown."),
        S("AA.VII.G.S8","Touch down at an acceptable point on the runway that is agreed upon between the applicant and the evaluator. Touch down at the appropriate speed and pitch attitude at the agreed upon point -250/+500 feet. (ASEL, AMEL)."),
        S("AA.VII.G.S9","Touch down at an acceptable point on the landing surface. During round out and touchdown contact the water at the proper pitch attitude within 200 feet beyond a specified point (ASES, AMES). In addition, for AMES, the touchdown is within the first one-third of the water landing area."),
        S("AA.VII.G.S10","Maintain positive aircraft control throughout the landing using drag and braking devices, as appropriate, to come to a stop.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},

{
  id: "VIII",
  roman: "VIII",
  title: "Postflight Procedures",
  phase: "flight",
  tasks: [
    T("A","VIII_A","After Landing, Parking, and Securing","AA.VIII.A",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with after landing, parking, and securing procedures.",
      [
        K("AA.VIII.A.K1","Parking, shutdown, securing, and postflight inspection."),
        K("AA.VIII.A.K2","Documenting in-flight/postflight discrepancies.")
      ],
      [
        R("AA.VIII.A.R1","Activities and distractions."),
        R("AA.VIII.A.R2","[Archived]"),
        R("AA.VIII.A.R3","Propeller, turbofan inlet, and exhaust safety."),
        R("AA.VIII.A.R4","Airport specific security procedures."),
        R("AA.VIII.A.R5","Disembarking passengers safely on the ramp and monitoring passenger movement while on the ramp.")
      ],
      [
        S("AA.VIII.A.S1","Use runway incursion avoidance procedures, if applicable."),
        S("AA.VIII.A.S2","Comply with air traffic control (ATC) or evaluator instructions and make radio calls as appropriate."),
        S("AA.VIII.A.S3","Coordinate with crew, if applicable, and complete the appropriate checklist(s) after clearing the runway."),
        S("AA.VIII.A.S4","Park at the gate or in an appropriate area, considering the safety of nearby persons and property."),
        S("AA.VIII.A.S5","Conduct a postflight inspection and document discrepancies and servicing requirements, if any."),
        S("AA.VIII.A.S6","Secure the airplane.")
      ],
      ["ASEL","AMEL"]
    ),

    T("B","VIII_B","Seaplane Post-Landing Procedures","AA.VIII.B",
      "Objective: To determine the applicant exhibits satisfactory knowledge, risk management, and skills associated with anchoring, docking, mooring, and ramping/beaching.",
      [
        K("AA.VIII.B.K1","Mooring."),
        K("AA.VIII.B.K2","Docking."),
        K("AA.VIII.B.K3","Anchoring."),
        K("AA.VIII.B.K4","Beaching/ramping.")
      ],
      [
        R("AA.VIII.B.R1","Activities and distractions."),
        R("AA.VIII.B.R2","[Archived]"),
        R("AA.VIII.B.R3","Propeller, turbofan inlet, and exhaust safety."),
        R("AA.VIII.B.R4","Airport/seaplane base security procedures."),
        R("AA.VIII.B.R5","Disembarking passengers safely on the ramp and monitoring passenger movement while on the ramp.")
      ],
      [
        S("AA.VIII.B.S1","Comply with air traffic control (ATC) or evaluator instructions and make radio calls as appropriate."),
        S("AA.VIII.B.S2","If anchoring, select a suitable area considering seaplane movement, water depth, tide, wind, and weather changes. Use an adequate number of anchors and lines of sufficient strength and length to ensure the seaplane’s security."),
        S("AA.VIII.B.S3","If not anchoring, approach the dock/mooring buoy or beach/ramp in the proper direction and at a safe speed, considering water depth, tide, current, and wind."),
        S("AA.VIII.B.S4","Coordinate with crew, if applicable, and complete the appropriate checklist(s)."),
        S("AA.VIII.B.S5","If anchoring/mooring/beaching, secure the seaplane considering the effects of wind, waves, and changes in water level; if ramping, comply with appropriate ground movement procedures."),
        S("AA.VIII.B.S6","Conduct a postflight inspection and document discrepancies and servicing requirements, if any.")
      ],
      ["ASES","AMES"]
    )
  ]
}
];