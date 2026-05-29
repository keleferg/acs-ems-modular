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
          K("K1", "Certification requirements, recent experience, and recordkeeping (14 CFR 61)"),
          K("K2", "Privileges and limitations of a private pilot certificate (14 CFR 61.113)"),
          K("K3", "Medical certificates: class, expiration, privileges (14 CFR 61 & 68)"),
          K("K4", "Documents required to exercise private pilot privileges")
        ],
        [
          R("R1", "Failure to distinguish between proficiency vs. currency"),
          R("R2", "Flying without required endorsements or currency")
        ],
        [
          S("S1", "Apply requirements to maintain and exercise the privileges of a private pilot certificate")
        ]
      ),

      T("B", "I_B", "Airworthiness Requirements", "PA.I.B",
        "You arrive at the airport and the aircraft's annual inspection expired yesterday. Can you legally fly this aircraft today?",
        [
          K("K1", "General airworthiness requirements and compliance (14 CFR 91)"),
          K("K2", "Pilot-performed preventive maintenance"),
          K("K3", "Equipment requirements for day/night VFR flight (91.205)"),
          K("K4", "Airworthiness directives (ADs)")
        ],
        [
          R("R1", "Inoperative equipment"),
          R("R2", "Flying an unairworthy aircraft")
        ],
        [
          S("S1", "Locate and describe required aircraft/engine documents"),
          S("S2", "Determine airworthiness using checklists and documentation"),
          S("S3", "Apply MEL/equipment requirements to a given scenario")
        ]
      ),

      T("C", "I_C", "Weather Information", "PA.I.C",
        "You're planning a 150 NM cross-country departing at 1400Z tomorrow. The TAF shows MVFR improving to VFR by noon. How would you obtain and interpret weather?",
        [
          K("K1", "Sources of weather data for flight planning"),
          K("K2", "METARs and TAFs - symbology, decoding, interpretation"),
          K("K3", "Surface analysis and prognostic charts"),
          K("K4", "PIREPs and their relevance"),
          K("K5", "SIGMETs, AIRMETs, Center Weather Advisories")
        ],
        [
          R("R1", "Marginal VFR conditions"),
          R("R2", "Convective weather, icing, turbulence, wind shear"),
          R("R3", "Use of outdated weather data")
        ],
        [
          S("S1", "Use available aviation weather resources for a weather briefing"),
          S("S2", "Analyze weather to make a competent go/no-go decision")
        ]
      ),

      T("D", "I_D", "Cross-Country Flight Planning", "PA.I.D",
        "Plan a VFR cross-country from our departure airport to a destination approximately 120 NM away. Choose appropriate altitudes and calculate fuel burn.",
        [
          K("K1", "Route planning using aeronautical charts"),
          K("K2", "Altitude selection, including terrain, airspace, and VFR cruising altitudes"),
          K("K3", "Fuel requirements for VFR flight under 14 CFR 91.151"),
          K("K4", "Elements of a VFR flight plan")
        ],
        [
          R("R1", "Fuel planning errors"),
          R("R2", "Lack of diversion or alternate planning"),
          R("R3", "Personal minimums not established")
        ],
        [
          S("S1", "Prepare and explain a cross-country flight plan"),
          S("S2", "Apply information from current aeronautical charts"),
          S("S3", "Create a navigation log")
        ]
      ),

      T("E", "I_E", "National Airspace System", "PA.I.E",
        "Your route takes you near Class C and through a VFR corridor adjacent to Class B. Describe the requirements for each airspace class.",
        [
          K("K1", "Types of airspace and requirements: Class A, B, C, D, E, and G"),
          K("K2", "Special use airspace, including prohibited, restricted, warning areas, and MOAs"),
          K("K3", "TFRs, ADIZ, parachute jump areas, and other airspace considerations"),
          K("K4", "ATC, transponder, and ADS-B requirements")
        ],
        [
          R("R1", "Airspace violations"),
          R("R2", "TFR non-compliance")
        ],
        [
          S("S1", "Identify and comply with airspace requirements along the planned route"),
          S("S2", "Use charts and resources to determine airspace requirements")
        ]
      ),

      T("F", "I_F", "Performance and Limitations", "PA.I.F",
        "It's 95°F at 3,500 feet MSL. You have three passengers and full fuel. Walk me through weight and balance and takeoff performance.",
        [
          K("K1", "Elements of aircraft performance"),
          K("K2", "Effects of density altitude on performance"),
          K("K3", "Weight and balance computation, CG limits"),
          K("K4", "Factors affecting performance: temperature, altitude, wind, runway surface")
        ],
        [
          R("R1", "Exceeding weight and balance limits"),
          R("R2", "High density altitude operations"),
          R("R3", "Insufficient runway length")
        ],
        [
          S("S1", "Compute weight and balance within limits"),
          S("S2", "Compute performance using charts and tables"),
          S("S3", "Determine if the planned flight can be conducted safely")
        ]
      ),

      T("G", "I_G", "Operation of Systems", "PA.I.G",
        "During preflight you notice the alternator circuit breaker has popped. Explain how the electrical system works and what happens if we lose the alternator.",
        [
          K("K1", "Primary flight controls and trim"),
          K("K2", "Powerplant and propeller system"),
          K("K3", "Fuel, oil, and hydraulic systems"),
          K("K4", "Electrical system"),
          K("K5", "Pitot-static, vacuum/pressure, and flight instruments")
        ],
        [
          R("R1", "System malfunctions or failures in flight"),
          R("R2", "Inoperative equipment or systems")
        ],
        [
          S("S1", "Demonstrate appropriate knowledge of airplane systems"),
          S("S2", "Describe procedures for system abnormalities")
        ]
      ),

      T("H", "I_H", "Human Factors", "PA.I.H",
        "You flew until midnight last night and have an 8 AM flight today. You also took an antihistamine before bed. Evaluate whether you're fit to fly.",
        [
          K("K1", "Aeromedical factors, including hypoxia, hyperventilation, spatial disorientation, and carbon monoxide poisoning"),
          K("K2", "Hazardous attitudes and antidotes"),
          K("K3", "Risk management and the PAVE model"),
          K("K4", "IMSAFE checklist"),
          K("K5", "ADM and crew/passenger resource management")
        ],
        [
          R("R1", "Operating while impaired"),
          R("R2", "Failure to recognize hazardous attitudes"),
          R("R3", "Get-there-itis")
        ],
        [
          S("S1", "Apply the IMSAFE checklist and PAVE model to a given scenario"),
          S("S2", "Identify hazardous attitudes and appropriate countermeasures")
        ]
      ),

      T("I","I_I","Water and Seaplane Characteristics, Seaplane Bases, Maritime Rules, and Aids to Marine Navigation","PA.I.I",
        "Demonstrate knowledge, risk management, and skills associated with water and seaplane characteristics, seaplane bases, maritime rules, and aids to marine navigation.",
        [
          K("K1","Characteristics of a water surface including size, location, protected/unprotected areas, wind, current, debris, shoals, traffic, wakes, and wave direction/height"),
          K("K2","Float and hull construction and effect on seaplane performance"),
          K("K3","Causes and correction of porpoising and skipping"),
          K("K4","Locating and identifying seaplane bases"),
          K("K5","Operating restrictions at seaplane bases"),
          K("K6","Right-of-way, steering, and sailing rules"),
          K("K7","Marine navigation aids"),
          K("K8","Seaplane documents, equipment, and regulatory requirements"),
          K("K9","Seaplane-specific preflight planning considerations")
        ],
        [
          R("R1","Water surface hazards"),
          R("R2","Seaplane base restrictions and operating limitations"),
          R("R3","Marine traffic and right-of-way conflicts"),
          R("R4","Wind, current, tides, wakes, and changing water conditions")
        ],
        [
          S("S1","Identify suitable water operating areas"),
          S("S2","Interpret seaplane base information and restrictions"),
          S("S3","Apply right-of-way and marine navigation rules"),
          S("S4","Identify hazards affecting seaplane operation"),
          S("S5","Describe procedures for avoiding porpoising and skipping"),
          S("S6","Describe how to correct for porpoising and skipping")
        ],
        ["ASES","AMES"]),
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
          K("K1", "POH/AFM preflight inspection procedures"),
          K("K2", "Purpose and importance of the preflight inspection"),
          K("K3", "Fuel quantity, grade, quality, contamination, and sampling procedures")
        ],
        [
          R("R1", "Incomplete or omitted preflight items"),
          R("R2", "Rushing the checklist"),
          R("R3", "Failure to detect conditions that make the airplane unairworthy")
        ],
        [
          S("S1", "Inspect the airplane using the appropriate checklist"),
          S("S2", "Verify the airplane is in an airworthy condition"),
          S("S3", "Identify and explain discrepancies")
        ]
      ),

      T("B", "II_B", "Flight Deck Management", "PA.II.B",
        "How do you ensure proper flight deck management including passenger briefing, seatbelts, and checklist use?",
        [
          K("K1", "Passenger briefing requirements"),
          K("K2", "Use of appropriate checklists"),
          K("K3", "Securing items in the cabin and arranging equipment for safe operation")
        ],
        [
          R("R1", "Distractions from passengers"),
          R("R2", "Improper use of checklists"),
          R("R3", "Loose items interfering with flight controls")
        ],
        [
          S("S1", "Organize materials and configure the flight deck"),
          S("S2", "Conduct a passenger briefing per 14 CFR 91.107"),
          S("S3", "Use checklists appropriately")
        ]
      ),

      T("C", "II_C", "Engine Starting", "PA.II.C",
        "Demonstrate a normal engine start. What would you do differently on a cold day vs. hot day?",
        [
          K("K1", "Starting procedures including external power"),
          K("K2", "Engine start under various conditions, including cold, hot, and flooded starts"),
          K("K3", "Engine fire during start procedures")
        ],
        [
          R("R1", "Improper starting technique"),
          R("R2", "Fire during engine start"),
          R("R3", "Propeller and blast hazards")
        ],
        [
          S("S1", "Position airplane to avoid hazards"),
          S("S2", "Complete checklist and start the engine"),
          S("S3", "Respond appropriately to abnormal start indications")
        ]
      ),

      T("D", "II_D", "Taxiing", "PA.II.D",
        "Demonstrate proper taxi technique including wind correction, sign identification, and situational awareness.",
        [
          K("K1", "Airport conditions, NOTAMs, and taxi routes"),
          K("K2", "Airport markings, signage, and lighting"),
          K("K3", "Flight control positioning for wind during taxi")
        ],
        [
          R("R1", "Improper flight control positioning"),
          R("R2", "Runway incursion risk"),
          R("R3", "Taxi speed too fast")
        ],
        [
          S("S1", "Perform brake check after airplane begins moving"),
          S("S2", "Position flight controls for wind"),
          S("S3", "Taxi using proper markings, signage, and ATC instructions")
        ],
        ["ASEL", "AMEL"]
      ),

      T("E", "II_E", "Taxiing and Sailing", "PA.II.E",
        "You are operating a seaplane on the water with wind and current present. Demonstrate taxiing and sailing procedures and explain the hazards.",
        [
          K("K1", "Seaplane taxiing procedures, including idle taxi, plow taxi, and step taxi"),
          K("K2", "Sailing procedures and use of flight controls on the water"),
          K("K3", "Effects of wind, current, water conditions, and obstacles during water operations")
        ],
        [
          R("R1", "Loss of directional control on the water"),
          R("R2", "Excessive speed during taxi or step taxi"),
          R("R3", "Collision with boats, docks, shorelines, or other obstacles")
        ],
        [
          S("S1", "Use proper taxi technique for existing water and wind conditions"),
          S("S2", "Use flight controls and water rudders appropriately"),
          S("S3", "Maintain awareness of wind, current, traffic, and obstacles")
        ],
        ["ASES", "AMES"]
      ),

      T("F", "II_F", "Before Takeoff Check", "PA.II.F",
        "Perform the before-takeoff check. Explain abnormalities you'd look for during the runup.",
        [
          K("K1", "Purpose of each before-takeoff checklist item"),
          K("K2", "Acceptable and unacceptable engine indications"),
          K("K3", "Takeoff briefing elements")
        ],
        [
          R("R1", "Skipping critical before-takeoff items"),
          R("R2", "Accepting abnormal engine indications"),
          R("R3", "Failure to brief takeoff, abort, and emergency actions")
        ],
        [
          S("S1", "Complete before-takeoff checklist"),
          S("S2", "Review takeoff performance data"),
          S("S3", "Perform a takeoff briefing")
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
          K("K1", "ATC communication procedures and phraseology"),
          K("K2", "Light gun signals for NORDO operations"),
          K("K3", "Pilot-controlled lighting systems"),
          K("K4", "CTAF/UNICOM procedures")
        ],
        [
          R("R1", "Communication failure"),
          R("R2", "Failure to communicate intentions at non-towered airports")
        ],
        [
          S("S1", "Use appropriate radio phraseology"),
          S("S2", "Interpret light gun signals"),
          S("S3", "Activate pilot-controlled lighting")
        ]
      ),

      T("B", "III_B", "Traffic Patterns", "PA.III.B",
        "You're approaching a non-towered airport. Describe proper pattern entry and how you'd sequence yourself.",
        [
          K("K1", "Proper traffic pattern procedures and entries"),
          K("K2", "Non-towered airport operations"),
          K("K3", "Collision avoidance and wake turbulence")
        ],
        [
          R("R1", "Non-standard pattern entry"),
          R("R2", "Failure to see and avoid traffic")
        ],
        [
          S("S1", "Identify and interpret wind indicators"),
          S("S2", "Comply with traffic pattern procedures"),
          S("S3", "Maintain appropriate pattern altitude and airspeed")
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
          K("K1", "Normal takeoff procedures and airspeeds"),
          K("K2", "Effects of wind on takeoff"),
          K("K3", "Takeoff performance considerations")
        ],
        [
          R("R1", "Insufficient performance margin"),
          R("R2", "Failure to abort when warranted")
        ],
        [
          S("S1", "Verify assigned runway or takeoff area"),
          S("S2", "Rotate and lift off at recommended airspeed"),
          S("S3", "Maintain directional control and wind-drift correction")
        ]
      ),

      T("B", "IV_B", "Normal Approach and Landing", "PA.IV.B",
        "Set up for and execute a normal approach and landing.",
        [
          K("K1", "Normal approach and landing procedures"),
          K("K2", "Stabilized approach concept"),
          K("K3", "Effects of wind on approach and landing")
        ],
        [
          R("R1", "Unstabilized approach"),
          R("R2", "Failure to go around when appropriate")
        ],
        [
          S("S1", "Establish and maintain a stabilized approach"),
          S("S2", "Touch down smoothly within the specified touchdown area"),
          S("S3", "Maintain directional control throughout rollout")
        ]
      ),

      T("C", "IV_C", "Soft-Field Takeoff and Climb", "PA.IV.C",
        "Simulate departing from a soft grass strip. Demonstrate proper technique to minimize time on the surface.",
        [
          K("K1", "Soft-field takeoff procedures and technique"),
          K("K2", "Hazards of premature rotation or settling")
        ],
        [
          R("R1", "Stall from over-rotation in ground effect"),
          R("R2", "Settling back to the surface after liftoff")
        ],
        [
          S("S1", "Position controls for soft-field conditions"),
          S("S2", "Lift off at the lowest practical airspeed"),
          S("S3", "Accelerate in ground effect and establish proper climb")
        ],
        ["ASEL"]
      ),

      T("D", "IV_D", "Soft-Field Approach and Landing", "PA.IV.D",
        "Demonstrate a soft-field landing. Explain how technique differs from a normal landing.",
        [
          K("K1", "Soft-field landing procedures"),
          K("K2", "Power use to control descent rate on final")
        ],
        [
          R("R1", "Hard or nose-first touchdown"),
          R("R2", "Loss of directional control after landing")
        ],
        [
          S("S1", "Establish recommended approach configuration"),
          S("S2", "Touch down gently at minimum descent rate"),
          S("S3", "Maintain proper control position after touchdown")
        ],
        ["ASEL"]
      ),

      T("E", "IV_E", "Short-Field Takeoff and Maximum Performance Climb", "PA.IV.E",
        "Imagine departing a 2,000-foot strip with 50-foot trees on the departure end. Demonstrate short-field technique.",
        [
          K("K1", "Short-field takeoff and maximum performance climb procedures"),
          K("K2", "Vx vs. Vy usage"),
          K("K3", "Effects of surface condition on takeoff distance")
        ],
        [
          R("R1", "Insufficient runway length"),
          R("R2", "Improper obstacle clearance technique")
        ],
        [
          S("S1", "Position at the beginning of the takeoff area"),
          S("S2", "Rotate at recommended airspeed and climb at Vx until obstacle clearance"),
          S("S3", "Transition to Vy after obstacle clearance")
        ],
        ["ASEL", "AMEL"]
      ),

      T("F", "IV_F", "Short-Field Approach and Landing", "PA.IV.F",
        "Demonstrate a short-field approach aiming for a specified touchdown point with a simulated obstacle.",
        [
          K("K1", "Short-field approach and landing procedures"),
          K("K2", "Stabilized approach to a specified touchdown point"),
          K("K3", "Approach speed management")
        ],
        [
          R("R1", "Landing long or fast"),
          R("R2", "Inability to stop within available runway")
        ],
        [
          S("S1", "Configure for short-field approach"),
          S("S2", "Maintain stabilized approach at recommended speed"),
          S("S3", "Touch down at the specified point with proper control and braking")
        ],
        ["ASEL", "AMEL"]
      ),

      T("G", "IV_G", "Confined Area Takeoff and Climb", "PA.IV.G",
        "You need to depart from a small, confined cove. Demonstrate confined area water takeoff planning and technique.",
        [
          K("K1", "Confined area water takeoff procedures"),
          K("K2", "Step taxi techniques and takeoff path planning"),
          K("K3", "Wind, current, water surface, and obstacle considerations")
        ],
        [
          R("R1", "Insufficient room for takeoff run"),
          R("R2", "Obstacles surrounding the confined water area"),
          R("R3", "Poor judgment of wind or current")
        ],
        [
          S("S1", "Assess wind, current, water conditions, and obstructions"),
          S("S2", "Plan and execute a takeoff path providing maximum distance"),
          S("S3", "Lift off and clear obstacles using appropriate airspeed and configuration")
        ],
        ["ASES", "AMES"]
      ),

      T("H", "IV_H", "Confined Area Approach and Landing", "PA.IV.H",
        "Demonstrate an approach and landing into a confined water area, accounting for obstacles and water conditions.",
        [
          K("K1", "Confined area water landing technique"),
          K("K2", "Approach planning for obstacles and available water area"),
          K("K3", "Go-around decision criteria for confined water areas")
        ],
        [
          R("R1", "Landing in an area too small to safely stop or depart"),
          R("R2", "Striking obstacles on approach"),
          R("R3", "Failure to go around when conditions are unsuitable")
        ],
        [
          S("S1", "Evaluate water area for suitability and hazards"),
          S("S2", "Execute approach clearing all obstacles"),
          S("S3", "Land and stop within available water area")
        ],
        ["ASES", "AMES"]
      ),

      T("I", "IV_I", "Glassy Water Takeoff and Climb", "PA.IV.I",
        "The lake is perfectly calm with no wind. Demonstrate a glassy water takeoff technique.",
        [
          K("K1", "Glassy water takeoff procedures and hazards"),
          K("K2", "Use of back pressure and step taxi technique"),
          K("K3", "Visual reference challenges on glassy water")
        ],
        [
          R("R1", "Inability to break free from water suction on a glassy surface"),
          R("R2", "Misjudging takeoff distance on glassy water")
        ],
        [
          S("S1", "Apply proper back pressure to get on the step"),
          S("S2", "Maintain proper pitch to reduce water drag"),
          S("S3", "Lift off and establish climb at recommended airspeed")
        ],
        ["ASES", "AMES"]
      ),

      T("J", "IV_J", "Glassy Water Approach and Landing", "PA.IV.J",
        "Demonstrate a glassy water landing. Explain how you establish a descent rate without visual cues from the water surface.",
        [
          K("K1", "Glassy water landing technique and hazards"),
          K("K2", "Establishing a stabilized descent without visual surface cues"),
          K("K3", "Use of power to control descent rate")
        ],
        [
          R("R1", "Striking the water at excessive descent rate"),
          R("R2", "Loss of depth perception on glassy water")
        ],
        [
          S("S1", "Set up power-on approach at proper airspeed"),
          S("S2", "Establish and maintain constant descent rate"),
          S("S3", "Hold attitude until water contact, then reduce power")
        ],
        ["ASES", "AMES"]
      ),

      T("K", "IV_K", "Rough Water Takeoff and Climb", "PA.IV.K",
        "The water is choppy with whitecaps. Demonstrate a rough water takeoff technique.",
        [
          K("K1", "Rough water takeoff procedures"),
          K("K2", "Use of flaps and power to minimize water impact"),
          K("K3", "Porpoising recognition and correction")
        ],
        [
          R("R1", "Structural damage from wave impact during takeoff"),
          R("R2", "Porpoising leading to loss of control")
        ],
        [
          S("S1", "Apply appropriate flaps and back pressure"),
          S("S2", "Get on the step and lift off at minimum safe speed"),
          S("S3", "Establish positive climb and retract flaps as appropriate")
        ],
        ["ASES", "AMES"]
      ),

      T("L", "IV_L", "Rough Water Approach and Landing", "PA.IV.L",
        "Demonstrate a rough water landing. Explain how technique differs from a normal water landing.",
        [
          K("K1", "Rough water landing technique"),
          K("K2", "Touchdown attitude to minimize wave impact"),
          K("K3", "Use of power during rough water landing")
        ],
        [
          R("R1", "Structural damage from hard water landing"),
          R("R2", "Capsizing from improper water handling")
        ],
        [
          S("S1", "Approach at proper airspeed with appropriate flaps"),
          S("S2", "Touch down at minimum safe speed in proper attitude"),
          S("S3", "Use power to control descent rate near the surface")
        ],
        ["ASES", "AMES"]
      ),

      T("M", "IV_M", "Forward Slip to a Landing", "PA.IV.M",
        "You're too high on final. Demonstrate a forward slip to lose altitude.",
        [
          K("K1", "Forward slip technique, limitations, and use"),
          K("K2", "Airspeed indication errors during a slip"),
          K("K3", "POH/AFM limitations on slips with flaps")
        ],
        [
          R("R1", "Excessive sink rate during slip"),
          R("R2", "Stall/spin from improper slip"),
          R("R3", "Improper recovery from the slip")
        ],
        [
          S("S1", "Establish forward slip at appropriate point"),
          S("S2", "Maintain proper airspeed and ground track"),
          S("S3", "Recover smoothly and complete a normal landing")
        ],
        ["ASEL", "ASES"]
      ),

      T("N", "IV_N", "Go-Around / Rejected Landing", "PA.IV.N",
        "On short final, a vehicle enters the runway. Execute a go-around.",
        [
          K("K1", "Go-around procedures and situations requiring a go-around"),
          K("K2", "Transition from approach to climb configuration"),
          K("K3", "Effects of trim, flaps, and power application during go-around")
        ],
        [
          R("R1", "Delayed decision to go around"),
          R("R2", "Improper configuration management"),
          R("R3", "Failure to maintain directional control and climb attitude")
        ],
        [
          S("S1", "Make timely decision to discontinue the approach"),
          S("S2", "Apply power, establish climb attitude, and maintain control"),
          S("S3", "Retract flaps as appropriate and climb at recommended airspeed")
        ]
      )
    ]
  },

  {
    id: "V",
    roman: "V",
    title: "Performance and Ground Reference Maneuvers",
    phase: "flight",
    tasks: [
      T("A", "V_A", "Steep Turns", "PA.V.A",
        "Demonstrate steep turns in both directions. Maintain the specified altitude, airspeed, and bank angle.",
        [
          K("K1", "Aerodynamics of steep turns, including load factor, stall speed increase, and overbanking tendency"),
          K("K2", "Coordination and energy management")
        ],
        [
          R("R1", "Exceeding load factor limits"),
          R("R2", "Inadvertent stall or spiral")
        ],
        [
          S("S1", "Establish proper configuration and entry airspeed"),
          S("S2", "Maintain altitude, airspeed, and bank within standards"),
          S("S3", "Roll out on the entry heading")
        ]
      ),

      T("B", "V_B", "Ground Reference Maneuvers", "PA.V.B",
        "Demonstrate turns around a point and/or rectangular course correcting for wind.",
        [
          K("K1", "Purpose of ground reference maneuvers"),
          K("K2", "Effects of wind on ground track"),
          K("K3", "Selection of appropriate reference points")
        ],
        [
          R("R1", "Fixation on ground reference excluding traffic scan"),
          R("R2", "Low altitude maneuvering hazards")
        ],
        [
          S("S1", "Select suitable reference points"),
          S("S2", "Apply wind drift correction for uniform ground track"),
          S("S3", "Maintain altitude and airspeed within standards")
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
          K("K1", "Pilotage and dead reckoning techniques"),
          K("K2", "Magnetic compass use including deviation and variation"),
          K("K3", "Checkpoint selection and timing")
        ],
        [
          R("R1", "Failure to positively identify checkpoints"),
          R("R2", "Becoming geographically disoriented")
        ],
        [
          S("S1", "Navigate using pilotage with landmarks"),
          S("S2", "Verify position with planned route and checkpoints"),
          S("S3", "Maintain altitude, heading, and timing within standards")
        ]
      ),

      T("B", "VI_B", "Navigation Systems and Radar Services", "PA.VI.B",
        "Use VOR and/or GPS to verify position. Demonstrate requesting VFR flight following.",
        [
          K("K1", "VOR and GPS navigation system capabilities"),
          K("K2", "VFR radar advisory services"),
          K("K3", "Transponder and ADS-B operation")
        ],
        [
          R("R1", "Over-reliance on GPS"),
          R("R2", "Failure to cross-check navigation sources")
        ],
        [
          S("S1", "Use navigation system to verify position"),
          S("S2", "Request and utilize VFR radar services")
        ]
      ),

      T("C", "VI_C", "Diversion", "PA.VI.C",
        "Weather is deteriorating ahead. Divert to an alternate airport.",
        [
          K("K1", "Selecting an appropriate diversion airport"),
          K("K2", "Methods to estimate heading, distance, time, and fuel")
        ],
        [
          R("R1", "Delayed decision to divert"),
          R("R2", "Fuel management during diversion"
          )
        ],
        [
          S("S1", "Select suitable diversion airport"),
          S("S2", "Estimate time, distance, and fuel for diversion"),
          S("S3", "Navigate to the diversion airport")
        ]
      ),

      T("D", "VI_D", "Lost Procedures", "PA.VI.D",
        "You cannot positively identify your position. Walk me through lost procedures.",
        [
          K("K1", "Lost procedures, including climb, communicate, confess, and comply"),
          K("K2", "Use of ATC and radar to determine position")
        ],
        [
          R("R1", "Continued flight without position awareness"),
          R("R2", "Reluctance to request help")
        ],
        [
          S("S1", "Apply lost procedures"),
          S("S2", "Use all available resources to re-establish position")
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
        "Configure for slow flight. Demonstrate controlled flight including turns, climbs, and descents.",
        [
          K("K1", "Aerodynamics of slow flight, including high angle of attack and reduced control effectiveness"),
          K("K2", "Stall recognition and avoidance"),
          K("K3", "Use of trim in slow flight")
        ],
        [
          R("R1", "Inadvertent stall at low altitude"),
          R("R2", "Distraction from airspeed awareness")
        ],
        [
          S("S1", "Establish slow flight configuration"),
          S("S2", "Maintain specified airspeed"),
          S("S3", "Maintain altitude, heading, and coordination within standards")
        ]
      ),

      T("B", "VII_B", "Power-Off Stalls", "PA.VII.B",
        "Demonstrate a power-off stall from landing configuration. Recover at the first indication of a stall.",
        [
          K("K1", "Aerodynamics of power-off stall"),
          K("K2", "Stall recognition cues"),
          K("K3", "Stall recovery procedure")
        ],
        [
          R("R1", "Secondary stall from improper recovery"),
          R("R2", "Spin entry from uncoordinated stall")
        ],
        [
          S("S1", "Configure for approach and landing"),
          S("S2", "Recognize onset of stall and recover promptly"),
          S("S3", "Recover with minimal altitude loss")
        ]
      ),

      T("C", "VII_C", "Power-On Stalls", "PA.VII.C",
        "Demonstrate a power-on stall simulating departure. When is this most likely in normal operations?",
        [
          K("K1", "Aerodynamics of power-on stall"),
          K("K2", "Effects of power on stall characteristics"),
          K("K3", "Stall recovery procedure")
        ],
        [
          R("R1", "Spin entry from uncoordinated power-on stall"),
          R("R2", "Excessive pitch attitude")
        ],
        [
          S("S1", "Set takeoff power and increase pitch to induce stall"),
          S("S2", "Recognize onset and recover promptly"),
          S("S3", "Return to normal flight attitude")
        ]
      ),

      T("D", "VII_D", "Spin Awareness", "PA.VII.D",
        "Explain aerodynamic factors leading to a spin and the PARE recovery procedure.",
        [
          K("K1", "Aerodynamics of spins, including autorotation and aggravated stall"),
          K("K2", "Spin entry, phases, and recovery"),
          K("K3", "Flight situations where spins are most likely")
        ],
        [
          R("R1", "Uncoordinated flight at slow airspeed"),
          R("R2", "Distraction during critical phases")
        ],
        [
          S("S1", "Explain spin awareness, entry conditions, and avoidance"),
          S("S2", "Describe appropriate spin recovery procedure")
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
      "Demonstrate straight-and-level flight solely by reference to instruments.",
      [
        K("K1", "Flight instruments, including limitations, attitude indication, function/operation, and proper instrument cross-check techniques")
      ],
      [
        R("R1", "Instrument flying hazards including inadvertent IMC, spatial disorientation, loss of control, fatigue, stress, and emergency off-airport landings"),
        R("R2", "When to seek assistance or declare an emergency"),
        R("R3", "Collision hazards"),
        R("R4", "Distractions, task prioritization, loss of situational awareness, or disorientation"),
        R("R5", "Fixation and omission"),
        R("R6", "Instrument interpretation"),
        R("R7", "Control application solely by reference to instruments"),
        R("R8", "Trimming the aircraft")
      ],
      [
        S("S1", "Establish and maintain straight-and-level flight solely by reference to instruments"),
        S("S2", "Maintain altitude ±200 ft, heading ±20°, and airspeed ±10 knots"),
        S("S3", "Use proper instrument cross-check and coordinated control")
      ],
      ["ASEL", "ASES", "AMEL", "AMES"]
    ),

    T("B", "VIII_B", "Constant Airspeed Climbs", "PA.VIII.B",
      "Demonstrate attitude instrument flying during constant airspeed climbs solely by reference to instruments.",
      [
        K("K1", "Flight instruments, including limitations, attitude indication, function/operation, and proper instrument cross-check techniques")
      ],
      [
        R("R1", "Instrument flying hazards including inadvertent IMC, spatial disorientation, loss of control, fatigue, stress, and emergency off-airport landings"),
        R("R2", "When to seek assistance or declare an emergency"),
        R("R3", "Collision hazards"),
        R("R4", "Distractions, task prioritization, loss of situational awareness, or disorientation"),
        R("R5", "Fixation and omission"),
        R("R6", "Instrument interpretation"),
        R("R7", "Control application solely by reference to instruments"),
        R("R8", "Trimming the aircraft")
      ],
      [
        S("S1", "Transition to climb pitch attitude and power setting on an assigned heading using proper instrument cross-check and coordinated control"),
        S("S2", "Climb at a constant airspeed to specified altitudes in straight flight and turns"),
        S("S3", "Level off at the assigned altitude and maintain altitude ±200 ft, heading ±20°, and airspeed ±10 knots")
      ],
      ["ASEL", "ASES", "AMEL", "AMES"]
    ),

    T("C", "VIII_C", "Constant Airspeed Descents", "PA.VIII.C",
      "Demonstrate attitude instrument flying during constant airspeed descents solely by reference to instruments.",
      [
        K("K1", "Flight instruments, including limitations, attitude indication, function/operation, and proper instrument cross-check techniques")
      ],
      [
        R("R1", "Instrument flying hazards including inadvertent IMC, spatial disorientation, loss of control, fatigue, stress, and emergency off-airport landings"),
        R("R2", "When to seek assistance or declare an emergency"),
        R("R3", "Collision hazards"),
        R("R4", "Distractions, task prioritization, loss of situational awareness, or disorientation"),
        R("R5", "Fixation and omission"),
        R("R6", "Instrument interpretation"),
        R("R7", "Control application solely by reference to instruments"),
        R("R8", "Trimming the aircraft")
      ],
      [
        S("S1", "Transition to descent pitch attitude and power setting on an assigned heading using proper instrument cross-check and coordinated control"),
        S("S2", "Descend at a constant airspeed to specified altitudes in straight flight and turns"),
        S("S3", "Level off at the assigned altitude and maintain altitude ±200 ft, heading ±20°, and airspeed ±10 knots")
      ],
      ["ASEL", "ASES", "AMEL", "AMES"]
    ),

    T("D", "VIII_D", "Turns to Headings", "PA.VIII.D",
      "Demonstrate turns to assigned headings solely by reference to instruments.",
      [
        K("K1", "Flight instruments, including limitations, attitude indication, function/operation, and proper instrument cross-check techniques")
      ],
      [
        R("R1", "Instrument flying hazards including inadvertent IMC, spatial disorientation, loss of control, fatigue, stress, and emergency off-airport landings"),
        R("R2", "When to seek assistance or declare an emergency"),
        R("R3", "Collision hazards"),
        R("R4", "Distractions, task prioritization, loss of situational awareness, or disorientation"),
        R("R5", "Fixation and omission"),
        R("R6", "Instrument interpretation"),
        R("R7", "Control application solely by reference to instruments"),
        R("R8", "Trimming the aircraft")
      ],
      [
        S("S1", "Enter, maintain, and recover from turns solely by reference to instruments"),
        S("S2", "Turn to assigned headings using proper instrument cross-check and coordinated control"),
        S("S3", "Maintain altitude ±200 ft, heading ±20°, and airspeed ±10 knots")
      ],
      ["ASEL", "ASES", "AMEL", "AMES"]
    ),

    T("E", "VIII_E", "Recovery from Unusual Flight Attitudes", "PA.VIII.E",
      "Demonstrate recovery from unusual flight attitudes solely by reference to instruments.",
      [
        K("K1", "Flight instruments, including limitations, attitude indication, function/operation, and proper instrument cross-check techniques"),
        K("K2", "Recognition and recovery procedures for nose-high and nose-low unusual flight attitudes")
      ],
      [
        R("R1", "Instrument flying hazards including inadvertent IMC, spatial disorientation, loss of control, fatigue, stress, and emergency off-airport landings"),
        R("R2", "When to seek assistance or declare an emergency"),
        R("R3", "Collision hazards"),
        R("R4", "Distractions, task prioritization, loss of situational awareness, or disorientation"),
        R("R5", "Fixation and omission"),
        R("R6", "Instrument interpretation"),
        R("R7", "Control application solely by reference to instruments"),
        R("R8", "Trimming the aircraft"),
        R("R9", "Improper recovery technique that could exceed aircraft limitations")
      ],
      [
        S("S1", "Recognize unusual flight attitudes using available flight instruments"),
        S("S2", "Recover from nose-high and nose-low unusual flight attitudes using proper procedures"),
        S("S3", "Return to stabilized straight-and-level flight"),
        S("S4", "Maintain aircraft control and avoid exceeding aircraft limitations")
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
        K("K1", "Situations requiring an emergency descent, such as smoke, fire, or cabin pressurization issues"),
        K("K2", "Emergency descent procedures, including configuration, airspeed, bank angle, and checklist use"),
        K("K3", "Airspeed limitations, structural limitations, and aircraft performance considerations")
      ],
      [
        R("R1", "Failure to clear the area before beginning the descent"),
        R("R2", "Exceeding aircraft limitations or improper configuration"),
        R("R3", "Loss of situational awareness, disorientation, or poor task prioritization"),
        R("R4", "Failure to level off at the assigned or safe altitude")
      ],
      [
        S("S1", "Clear the area"),
        S("S2", "Establish the appropriate configuration and airspeed for emergency descent"),
        S("S3", "Use an appropriate bank angle, normally 30° to 45°, while maintaining positive load factor"),
        S("S4", "Maintain orientation and divide attention throughout the descent"),
        S("S5", "Level off at the specified altitude within ACS standards"),
        S("S6", "Complete the appropriate checklist and make radio calls as appropriate")
      ],
      ["ASEL", "ASES", "AMEL", "AMES"]
    ),

    T("B", "IX_B", "Emergency Approach and Landing (Simulated)", "PA.IX.B",
      "Your engine just failed. Show me your emergency procedures: select a landing site, establish best glide, and troubleshoot.",
      [
        K("K1", "Immediate actions following engine failure, including best glide speed and selecting a landing area"),
        K("K2", "Emergency checklist procedures"),
        K("K3", "Factors in selecting a suitable emergency landing site"),
        K("K4", "Emergency communications, including 7700, Mayday, and passenger briefing considerations")
      ],
      [
        R("R1", "Failure to maintain best glide speed"),
        R("R2", "Fixation on troubleshooting instead of flying the airplane"),
        R("R3", "Poor landing site selection"),
        R("R4", "Failure to consider wind, terrain, obstructions, or glide distance")
      ],
      [
        S("S1", "Immediately establish and maintain best glide speed"),
        S("S2", "Select a suitable landing site"),
        S("S3", "Plan and fly an appropriate approach to the selected landing area"),
        S("S4", "Attempt restart or troubleshoot using the appropriate checklist"),
        S("S5", "Communicate the emergency as appropriate"),
        S("S6", "Complete the appropriate checklist and passenger briefing")
      ],
      ["ASEL", "ASES"]
    ),

    T("C", "IX_C", "Systems and Equipment Malfunctions", "PA.IX.C",
      "Oil pressure is dropping and oil temperature is rising. What do you do? Also describe response to electrical, avionics, vacuum, flight control, and landing gear malfunctions as applicable.",
      [
        K("K1", "Procedures for systems and equipment malfunctions in accordance with the POH/AFM"),
        K("K2", "Immediate actions for critical system failures"),
        K("K3", "Electrical, avionics, vacuum, flight control, engine, fuel, and landing gear malfunction procedures as applicable"),
        K("K4", "Partial panel or degraded equipment considerations")
      ],
      [
        R("R1", "Failure to recognize abnormal indications"),
        R("R2", "Continued flight with a known or worsening malfunction"),
        R("R3", "Improper checklist use or failure to follow POH/AFM procedures"),
        R("R4", "Failure to determine whether to land immediately, divert, or continue safely")
      ],
      [
        S("S1", "Identify the malfunction and maintain aircraft control"),
        S("S2", "Use the appropriate checklist or POH/AFM procedure"),
        S("S3", "Determine the safest course of action, including landing or diverting if necessary"),
        S("S4", "Communicate the situation as appropriate"),
        S("S5", "Use available equipment and backup systems appropriately")
      ],
      ["ASEL", "ASES", "AMEL", "AMES"]
    ),

    T("D", "IX_D", "Emergency Equipment and Survival Gear", "PA.IX.D",
      "What emergency equipment is on board and where? Describe survival priorities if you landed off-airport.",
      [
        K("K1", "Emergency and survival equipment carried in the airplane"),
        K("K2", "ELT operation, location, and limitations"),
        K("K3", "Fire extinguisher location and operation"),
        K("K4", "Survival priorities after an emergency landing")
      ],
      [
        R("R1", "Unfamiliarity with emergency equipment location or operation"),
        R("R2", "Failure to activate ELT or signal for help"),
        R("R3", "Failure to account for passengers or environmental hazards after landing")
      ],
      [
        S("S1", "Identify and locate emergency equipment"),
        S("S2", "Describe ELT operation and post-crash procedures"),
        S("S3", "Describe appropriate passenger evacuation and survival actions"),
        S("S4", "Describe how to signal for assistance and manage survival priorities")
      ],
      ["ASEL", "ASES", "AMEL", "AMES"]
    ),

    T("E", "IX_E", "Engine Failure During Takeoff Before VMC (Simulated)", "PA.IX.E",
      "During the takeoff roll you lose an engine before reaching VMC. Describe and demonstrate the correct procedure.",
      [
        K("K1", "VMC and engine failure recognition"),
        K("K2", "Procedures for engine failure during takeoff before VMC"),
        K("K3", "Accelerate-stop distance considerations")
      ],
      [
        R("R1", "Loss of directional control below VMC"),
        R("R2", "Delayed recognition of engine failure"),
        R("R3", "Failure to promptly reject the takeoff")
      ],
      [
        S("S1", "Recognize engine failure promptly"),
        S("S2", "Close throttles and maintain directional control"),
        S("S3", "Abort the takeoff safely"),
        S("S4", "Use braking and directional control as appropriate")
      ],
      ["AMEL", "AMES"]
    ),

    T("F", "IX_F", "Engine Failure After Liftoff (Simulated)", "PA.IX.F",
      "You've just lifted off and one engine fails. Demonstrate proper procedures to maintain control.",
      [
        K("K1", "Critical engine failure after liftoff procedures"),
        K("K2", "Identify, verify, and feather sequence"),
        K("K3", "Single-engine climb performance and Vyse")
      ],
      [
        R("R1", "Loss of control from asymmetric thrust"),
        R("R2", "Failure to identify the correct failed engine"),
        R("R3", "Attempting to climb when aircraft performance will not permit it")
      ],
      [
        S("S1", "Maintain aircraft control"),
        S("S2", "Identify, verify, and feather the failed engine"),
        S("S3", "Establish Vyse and single-engine climb or safe descent"),
        S("S4", "Complete the appropriate checklist")
      ],
      ["AMEL", "AMES"]
    ),

    T("G", "IX_G", "Approach and Landing with an Inoperative Engine (Simulated)", "PA.IX.G",
      "Demonstrate an approach and landing with a simulated inoperative engine.",
      [
        K("K1", "Single-engine approach and landing procedures"),
        K("K2", "Configuration management for single-engine approach"),
        K("K3", "Go-around considerations on one engine")
      ],
      [
        R("R1", "VMC issues during single-engine approach"),
        R("R2", "Gear and flap configuration errors on one engine"),
        R("R3", "Attempting a go-around when single-engine performance is inadequate")
      ],
      [
        S("S1", "Fly a stabilized single-engine approach"),
        S("S2", "Manage configuration for single-engine landing"),
        S("S3", "Execute a safe landing with one engine inoperative"),
        S("S4", "Complete the appropriate checklist")
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
          K("K1", "Single-engine aerodynamics, including VMC, critical engine, and Vyse"),
          K("K2", "Control technique for one-engine-inoperative operations"),
          K("K3", "Performance limitations on one engine")
        ],
        [
          R("R1", "Loss of directional control with one engine inoperative"),
          R("R2", "Stall at or below VMC")
        ],
        [
          S("S1", "Maintain positive aircraft control with one engine inoperative"),
          S("S2", "Demonstrate turns, climbs, and descents on one engine"),
          S("S3", "Maintain assigned altitude, heading, and airspeed within standards")
        ],
        ["AMEL", "AMES"]
      ),

      T("B", "X_B", "VMC Demonstration", "PA.X.B",
        "Demonstrate VMC. Explain the factors that affect VMC and describe the recovery procedure.",
        [
          K("K1", "VMC definition and contributing factors"),
          K("K2", "Recognition of VMC and recovery procedure"),
          K("K3", "Relationship between VMC and stall speed")
        ],
        [
          R("R1", "Loss of control during VMC demonstration"),
          R("R2", "Stall before reaching VMC")
        ],
        [
          S("S1", "Set up and demonstrate VMC"),
          S("S2", "Recover at the first indication of loss of directional control"),
          S("S3", "Explain all factors that affect VMC")
        ],
        ["AMEL", "AMES"]
      ),

      T("C", "X_C", "One Engine Inoperative (Simulated) Solely by Reference to Instruments During Straight-and-Level Flight and Turns", "PA.X.C",
        "Using instrument references, demonstrate straight-and-level flight and turns with one engine inoperative.",
        [
          K("K1", "Instrument flying with one engine inoperative"),
          K("K2", "Control, trim, and performance considerations during OEI instrument flight"),
          K("K3", "Instrument scan and workload management with asymmetric thrust")
        ],
        [
          R("R1", "Loss of aircraft control during OEI instrument flight"),
          R("R2", "Failure to maintain airspeed above safe single-engine operating speed"),
          R("R3", "Task saturation during OEI operations")
        ],
        [
          S("S1", "Maintain aircraft control solely by reference to instruments"),
          S("S2", "Maintain heading, altitude, and airspeed within standards"),
          S("S3", "Perform turns while managing asymmetric thrust")
        ],
        ["AMEL", "AMES"]
      ),

      T("D", "X_D", "Instrument Approach and Landing with an Inoperative Engine (Simulated)", "PA.X.D",
        "Fly an instrument approach and landing with one engine inoperative. Describe configuration management throughout.",
        [
          K("K1", "OEI instrument approach procedures"),
          K("K2", "Configuration and speed management during OEI approach"),
          K("K3", "Missed approach considerations with one engine inoperative")
        ],
        [
          R("R1", "VMC or directional control issues during OEI instrument approach"),
          R("R2", "Configuration errors during instrument approach"),
          R("R3", "Failure to plan for missed approach performance limitations")
        ],
        [
          S("S1", "Fly a stabilized OEI instrument approach"),
          S("S2", "Manage configuration throughout the approach"),
          S("S3", "Execute landing or missed approach decision as appropriate")
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
          K("K1", "Physiological aspects of night flying, including vision and dark adaptation"),
          K("K2", "Night illusions, including black hole, autokinesis, and false horizons"),
          K("K3", "Night preflight and cockpit lighting"),
          K("K4", "Night navigation and airport lighting systems")
        ],
        [
          R("R1", "Spatial disorientation at night"),
          R("R2", "Reduced ability to identify weather, terrain, and traffic"),
          R("R3", "Night vision degradation from cockpit lighting")
        ],
        [
          S("S1", "Describe night vision physiology and protection"),
          S("S2", "Identify and mitigate night flight illusions")
        ]
      )
    ]
  },

  {
    id: "XII",
    roman: "XII",
    title: "Postflight Procedures",
    phase: "flight",
    tasks: [
      T("A", "XII_A", "After Landing, Parking, and Securing", "PA.XII.A",
        "Complete the after-landing and shutdown checklists, park, and secure the aircraft.",
        [
          K("K1", "After-landing procedures and checklist"),
          K("K2", "Parking procedures, including chocks, tie-downs, and control lock"),
          K("K3", "Engine shutdown and securing"),
          K("K4", "Postflight inspection and discrepancy recording")
        ],
        [
          R("R1", "Failure to properly secure aircraft"),
          R("R2", "Failure to identify or report discrepancies")
        ],
        [
          S("S1", "Complete after-landing and shutdown checklists"),
          S("S2", "Park, secure, and perform postflight inspection"),
          S("S3", "Record flight time and note discrepancies")
        ],
        ["ASEL","AMEL"]),
       
      T("B","XII_B","Seaplane Post-Landing Procedures","PA.XII.B",
        "Demonstrate anchoring, docking, mooring, and ramping/beaching procedures.",
        [
          K("K1","Mooring"),
          K("K2","Docking"),
          K("K3","Anchoring"),
          K("K4","Beaching/ramping"),
          K("K5","Postflight inspection and recording discrepancies")
        ],
        [
          R("R1","Activities and distractions"),
          R("R2","Archived"),
          R("R3","Seaplane base-specific security procedures"),
          R("R4","Disembarking passengers safely and monitoring passenger movement")
        ],
        [
          S("S1","If anchoring, select a suitable area and use adequate anchors and lines"),
          S("S2","If not anchoring, approach dock, mooring buoy, beach, or ramp properly and safely"),
          S("S3","Complete the appropriate checklist(s)"),
          S("S4","Conduct postflight inspection and document discrepancies or servicing requirements"),
          S("S5","Secure the seaplane considering wind, waves, and water level changes")
        ],
      ["ASES","AMES"]),
    ]
  }
];