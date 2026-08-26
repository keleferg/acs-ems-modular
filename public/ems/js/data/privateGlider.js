function T(id, fc, title, code, scenario, k, r, s, ratings) {
  const obj = { id, filterCode: fc, title, code, scenario, knowledge: k, risk: r, skill: s };
  if (ratings) obj.ratings = ratings;
  return obj;
}

function K(code, text) { return { code, text }; }
function R(code, text) { return { code, text }; }
function S(code, text) { return { code, text }; }

export const PRIVATE_GLIDER_DATA = [
  {
    id: "I",
    roman: "I",
    title: "Preflight Preparation",
    phase: "ground",
    tasks: [
      T("A", "I_A", "Pilot Qualifications", "PG.I.A",
        "You are preparing for a private pilot glider flight with a passenger. Explain whether you are legal and current to act as PIC.",
        [
          K("K1", "Private pilot glider certificate eligibility, privileges, and limitations under 14 CFR Part 61"),
          K("K2", "Recent flight experience and passenger-carrying requirements"),
          K("K3", "Required pilot documents and logbook endorsements"),
          K("K4", "Medical requirements and BasicMed applicability considerations for glider operations")
        ],
        [
          R("R1", "Acting as PIC without required currency or endorsements"),
          R("R2", "Misunderstanding glider passenger-carrying privileges"),
          R("R3", "Failure to verify personal fitness for flight")
        ],
        [
          S("S1", "Determine whether the pilot is qualified and current for the planned glider flight"),
          S("S2", "Explain applicable private pilot glider privileges and limitations")
        ],
        ["GLIDER"]
      ),

      T("B", "I_B", "Airworthiness Requirements", "PG.I.B",
        "You arrive at the gliderport and find the annual inspection expired last week. Can you fly the glider today?",
        [
          K("K1", "Glider airworthiness requirements and required aircraft documents"),
          K("K2", "Required inspections, including annual inspection and applicable AD compliance"),
          K("K3", "Required equipment for the planned operation"),
          K("K4", "Pilot responsibilities for determining airworthiness before flight")
        ],
        [
          R("R1", "Operating an unairworthy glider"),
          R("R2", "Failure to verify inspection status"),
          R("R3", "Accepting unresolved discrepancies without proper determination")
        ],
        [
          S("S1", "Locate and verify required glider documents and inspection status"),
          S("S2", "Determine whether the glider is airworthy for the planned flight")
        ],
        ["GLIDER"]
      ),

      T("C", "I_C", "Weather Information", "PG.I.C",
        "You are planning a soaring flight. The forecast shows moderate winds, scattered cumulus, and possible afternoon thunderstorms. Explain your weather decision-making.",
        [
          K("K1", "Weather information sources appropriate to glider operations"),
          K("K2", "Surface winds, winds aloft, thermal activity, cloud development, and convective activity"),
          K("K3", "METARs, TAFs, area forecasts, radar, satellite, and PIREPs"),
          K("K4", "Weather hazards affecting glider operations, including thunderstorms, turbulence, wind shear, and reduced visibility")
        ],
        [
          R("R1", "Launching into deteriorating or convective weather"),
          R("R2", "Underestimating wind, turbulence, or sink conditions"),
          R("R3", "Continuing flight without safe landing options")
        ],
        [
          S("S1", "Obtain and interpret weather information for a glider flight"),
          S("S2", "Make a safe go/no-go decision based on weather and pilot capability")
        ],
        ["GLIDER"]
      ),

      T("D", "I_D", "Cross-Country Flight Planning", "PG.I.D",
        "Plan a glider cross-country route. Explain how you will evaluate lift, terrain, airspace, landing areas, and retrieve options.",
        [
          K("K1", "Glider cross-country route planning and chart interpretation"),
          K("K2", "Thermal, ridge, and wave lift considerations"),
          K("K3", "Terrain, airspace, landing fields, and outlanding options"),
          K("K4", "Navigation planning, communications, and retrieve planning")
        ],
        [
          R("R1", "Continuing beyond gliding distance of suitable landing areas"),
          R("R2", "Entering controlled or restricted airspace without authorization"),
          R("R3", "Inadequate outlanding or retrieve planning")
        ],
        [
          S("S1", "Prepare and explain a glider cross-country plan"),
          S("S2", "Identify safe landing options along the route"),
          S("S3", "Use charts and available navigation tools appropriately")
        ],
        ["GLIDER"]
      ),

      T("E", "I_E", "National Airspace System", "PG.I.E",
        "Your soaring area is near Class C airspace, a restricted area, and several airports. Explain the airspace requirements and risks.",
        [
          K("K1", "Classes of airspace and operating requirements"),
          K("K2", "Special use airspace, TFRs, and glider operating areas"),
          K("K3", "Transponder and ADS-B requirements and exceptions"),
          K("K4", "Radio communication and ATC coordination for glider operations")
        ],
        [
          R("R1", "Airspace violation"),
          R("R2", "Failure to coordinate with ATC where required"),
          R("R3", "Loss of situational awareness near busy airports")
        ],
        [
          S("S1", "Identify airspace along the planned route"),
          S("S2", "Explain procedures to comply with airspace requirements")
        ],
        ["GLIDER"]
      ),

      T("F", "I_F", "Performance and Limitations", "PG.I.F",
        "The glider is near maximum gross weight on a warm day. Explain how weight, density altitude, and wind affect launch and landing performance.",
        [
          K("K1", "Glider performance data, limitations, and operating speeds"),
          K("K2", "Effects of weight, density altitude, wind, and runway/surface conditions"),
          K("K3", "Best glide speed, minimum sink speed, and speed-to-fly concepts"),
          K("K4", "Weight and balance limitations")
        ],
        [
          R("R1", "Exceeding weight and balance limits"),
          R("R2", "Using improper speed for conditions"),
          R("R3", "Underestimating launch, climb, or landing distance")
        ],
        [
          S("S1", "Determine whether the glider is within weight and balance limits"),
          S("S2", "Apply performance and limitation data to the planned flight")
        ],
        ["GLIDER"]
      ),

      T("G", "I_G", "Operation of Systems", "PG.I.G",
        "Explain the glider systems you will inspect before flight, including controls, spoilers, tow release, instruments, ballast, and oxygen if installed.",
        [
          K("K1", "Flight controls, trim, spoilers/dive brakes, and tow release systems"),
          K("K2", "Flight instruments, variometer, electrical system, and avionics"),
          K("K3", "Ballast systems, oxygen systems, and landing gear if installed"),
          K("K4", "Glider-specific abnormal and emergency system considerations")
        ],
        [
          R("R1", "Improper control connection or positive control check"),
          R("R2", "Tow release malfunction"),
          R("R3", "Failure to understand installed equipment or limitations")
        ],
        [
          S("S1", "Explain glider systems and normal operation"),
          S("S2", "Identify abnormal indications and appropriate responses")
        ],
        ["GLIDER"]
      ),

      T("H", "I_H", "Human Factors", "PG.I.H",
        "You are fatigued, dehydrated, and planning a long soaring flight in hot weather. Evaluate whether you are fit to fly.",
        [
          K("K1", "Aeromedical factors affecting glider pilots, including dehydration, fatigue, hypoxia, heat stress, and motion sickness"),
          K("K2", "Spatial disorientation and visual illusions"),
          K("K3", "Risk management models, including IMSAFE and PAVE"),
          K("K4", "Hazardous attitudes and aeronautical decision-making")
        ],
        [
          R("R1", "Launching while impaired by fatigue, dehydration, or illness"),
          R("R2", "Poor decision-making due to external pressure or get-there-itis"),
          R("R3", "Failure to recognize deteriorating pilot performance")
        ],
        [
          S("S1", "Apply IMSAFE and PAVE to a glider flight scenario"),
          S("S2", "Identify personal minimums and risk controls")
        ],
        ["GLIDER"]
      )
    ]
  },

  {
    id: "II",
    roman: "II",
    title: "Preflight Procedures",
    phase: "ground",
    tasks: [
      T("A", "II_A", "Preflight Inspection", "PG.II.A",
        "Conduct a glider preflight inspection and explain what items would make the glider unairworthy.",
        [
          K("K1", "Glider preflight inspection procedures"),
          K("K2", "Positive control check and control continuity"),
          K("K3", "Tow hook, release mechanism, rope/ring compatibility, and weak link considerations"),
          K("K4", "Canopy, ballast, landing gear, spoilers, and structural inspection items")
        ],
        [
          R("R1", "Incomplete preflight inspection"),
          R("R2", "Failure to conduct a positive control check"),
          R("R3", "Undetected tow release or control system discrepancy")
        ],
        [
          S("S1", "Perform a systematic glider preflight inspection"),
          S("S2", "Verify proper control operation and tow release function"),
          S("S3", "Identify and explain discrepancies")
        ],
        ["GLIDER"]
      ),

      T("B", "II_B", "Cockpit / Flight Deck Management", "PG.II.B",
        "Prepare the glider for flight, secure the cockpit, brief the passenger, and explain your checklist discipline.",
        [
          K("K1", "Flight deck organization and checklist use"),
          K("K2", "Passenger briefing, seat belts, shoulder harnesses, and canopy operation"),
          K("K3", "Emergency equipment, oxygen if installed, and communications equipment")
        ],
        [
          R("R1", "Loose objects interfering with controls"),
          R("R2", "Incomplete passenger briefing"),
          R("R3", "Improper canopy or harness security")
        ],
        [
          S("S1", "Organize the flight deck for safe operation"),
          S("S2", "Conduct passenger briefing and secure occupant restraints"),
          S("S3", "Use checklists appropriately")
        ],
        ["GLIDER"]
      ),

      T("C", "II_C", "Before Launch Check", "PG.II.C",
        "Complete the before-launch checklist and explain what you verify before signaling ready for launch.",
        [
          K("K1", "Before launch checklist items"),
          K("K2", "Towline attachment and release check"),
          K("K3", "Controls, ballast, instruments, trim, canopy, and traffic scan"),
          K("K4", "Launch signals and crew coordination")
        ],
        [
          R("R1", "Launching with canopy, controls, trim, ballast, or spoilers improperly configured"),
          R("R2", "Improper towline attachment"),
          R("R3", "Failure to verify traffic and runway conditions")
        ],
        [
          S("S1", "Complete before-launch checklist"),
          S("S2", "Coordinate with ground crew and tow pilot or launch crew"),
          S("S3", "Confirm glider is properly configured and ready for launch")
        ],
        ["GLIDER"]
      )
    ]
  },

  {
    id: "III",
    roman: "III",
    title: "Airport and Gliderport Operations",
    phase: "flight",
    tasks: [
      T("A", "III_A", "Radio Communications and ATC Light Signals", "PG.III.A",
        "Operate at a non-towered gliderport and explain what you would do if you needed to enter controlled airspace.",
        [
          K("K1", "Gliderport and airport communication procedures"),
          K("K2", "CTAF, UNICOM, and ATC phraseology"),
          K("K3", "ATC light gun signals"),
          K("K4", "Coordination with tow pilot, launch crew, and other traffic")
        ],
        [
          R("R1", "Failure to communicate position and intentions"),
          R("R2", "Traffic conflict in the pattern or launch area"),
          R("R3", "Improper controlled airspace entry")
        ],
        [
          S("S1", "Use appropriate communication procedures"),
          S("S2", "Interpret light gun signals"),
          S("S3", "Maintain traffic awareness at the gliderport")
        ],
        ["GLIDER"]
      ),

      T("B", "III_B", "Traffic Patterns", "PG.III.B",
        "Enter and fly a glider traffic pattern while managing altitude, spacing, and landing area selection.",
        [
          K("K1", "Glider traffic pattern procedures and entry methods"),
          K("K2", "Pattern altitude, key positions, and energy management"),
          K("K3", "Right-of-way rules and collision avoidance")
        ],
        [
          R("R1", "Entering the pattern too low or too high"),
          R("R2", "Poor spacing or failure to see and avoid traffic"),
          R("R3", "Failure to plan a safe landing pattern without engine power")
        ],
        [
          S("S1", "Enter and fly an appropriate glider traffic pattern"),
          S("S2", "Maintain proper spacing and visual lookout"),
          S("S3", "Manage energy to reach the selected touchdown area")
        ],
        ["GLIDER"]
      )
    ]
  },

  {
    id: "IV",
    roman: "IV",
    title: "Launches and Landings",
    phase: "flight",
    tasks: [
      T("A", "IV_A", "Aerotow Launch", "PG.IV.A",
        "Demonstrate an aerotow launch and explain normal, high-tow, low-tow, and emergency procedures.",
        [
          K("K1", "Aerotow launch procedures and signals"),
          K("K2", "Tow positions and wake turbulence considerations"),
          K("K3", "Boxing the wake and towline release procedures"),
          K("K4", "Aerotow emergency procedures")
        ],
        [
          R("R1", "Improper tow position"),
          R("R2", "Towline slack or excessive towline angle"),
          R("R3", "Failure to release during unsafe tow condition")
        ],
        [
          S("S1", "Maintain proper position during aerotow"),
          S("S2", "Manage towline slack and directional control"),
          S("S3", "Release at the appropriate point and clear the tow area")
        ],
        ["GLIDER"]
      ),

      T("B", "IV_B", "Ground Launch", "PG.IV.B",
        "Demonstrate or explain a ground launch, including winch or auto-tow procedures and emergency actions.",
        [
          K("K1", "Ground launch procedures and signals"),
          K("K2", "Pitch attitude, airspeed, and climb profile during ground launch"),
          K("K3", "Cable break and launch failure procedures")
        ],
        [
          R("R1", "Excessive pitch attitude during ground launch"),
          R("R2", "Airspeed decay or overspeed"),
          R("R3", "Delayed response to cable break")
        ],
        [
          S("S1", "Maintain directional control and proper pitch during ground launch"),
          S("S2", "Monitor airspeed and launch attitude"),
          S("S3", "Respond promptly to launch failure")
        ],
        ["GLIDER"]
      ),

      T("C", "IV_C", "Normal Approach and Landing", "PG.IV.C",
        "Fly a normal glider approach and landing to a selected touchdown area.",
        [
          K("K1", "Normal glider approach and landing procedures"),
          K("K2", "Use of spoilers or dive brakes"),
          K("K3", "Energy management and stabilized approach concepts")
        ],
        [
          R("R1", "Arriving too high or too low in the pattern"),
          R("R2", "Improper spoiler use"),
          R("R3", "Landing long, short, or with excessive speed")
        ],
        [
          S("S1", "Plan and fly a stabilized approach"),
          S("S2", "Use spoilers or dive brakes appropriately"),
          S("S3", "Touch down in the selected area with directional control")
        ],
        ["GLIDER"]
      ),

      T("D", "IV_D", "Slip to Landing", "PG.IV.D",
        "You are high on final. Demonstrate a slip to landing and explain the risks.",
        [
          K("K1", "Forward slip and sideslip technique"),
          K("K2", "Use of slips for glidepath control"),
          K("K3", "Airspeed, stall, and control considerations during slips")
        ],
        [
          R("R1", "Excessive sink rate"),
          R("R2", "Uncoordinated stall or spin risk"),
          R("R3", "Improper recovery from slip close to the ground")
        ],
        [
          S("S1", "Establish and maintain an appropriate slip"),
          S("S2", "Maintain airspeed and landing alignment"),
          S("S3", "Recover smoothly and complete landing")
        ],
        ["GLIDER"]
      ),

      T("E", "IV_E", "Downwind Landing", "PG.IV.E",
        "You must land downwind due to traffic or field constraints. Explain and demonstrate the considerations.",
        [
          K("K1", "Downwind landing procedures and performance effects"),
          K("K2", "Groundspeed, rollout distance, and directional control considerations"),
          K("K3", "Decision-making for accepting or rejecting a downwind landing")
        ],
        [
          R("R1", "Excessive groundspeed on touchdown"),
          R("R2", "Insufficient landing distance"),
          R("R3", "Loss of directional control")
        ],
        [
          S("S1", "Plan the approach for increased groundspeed"),
          S("S2", "Maintain proper airspeed and glidepath"),
          S("S3", "Touch down under control within the available landing area")
        ],
        ["GLIDER"]
      ),

      T("F", "IV_F", "Simulated Off-Airport Landing", "PG.IV.F",
        "You are unable to return to the gliderport. Select and fly toward a suitable off-airport landing area.",
        [
          K("K1", "Off-airport landing site selection"),
          K("K2", "Field inspection, wind determination, obstacles, slope, surface, and access"),
          K("K3", "Pattern planning and decision points for outlanding")
        ],
        [
          R("R1", "Delaying field selection too long"),
          R("R2", "Selecting an unsuitable landing field"),
          R("R3", "Attempting to stretch the glide")
        ],
        [
          S("S1", "Select a suitable off-airport landing area"),
          S("S2", "Plan a safe pattern to the selected area"),
          S("S3", "Maintain aircraft control and safe approach speed")
        ],
        ["GLIDER"]
      )
    ]
  },

  {
    id: "V",
    roman: "V",
    title: "Performance Speeds",
    phase: "flight",
    tasks: [
      T("A", "V_A", "Minimum Sink Speed", "PG.V.A",
        "Demonstrate flight at minimum sink speed and explain when it is used.",
        [
          K("K1", "Minimum sink speed and its relationship to endurance"),
          K("K2", "Effect of weight, bank angle, and configuration on sink rate"),
          K("K3", "Use of minimum sink in lift"
          )
        ],
        [
          R("R1", "Flying too slowly near stall speed"),
          R("R2", "Failure to maintain coordination"),
          R("R3", "Using minimum sink when best glide is more appropriate")
        ],
        [
          S("S1", "Establish and maintain minimum sink speed"),
          S("S2", "Maintain coordinated flight"),
          S("S3", "Recognize conditions requiring a different speed")
        ],
        ["GLIDER"]
      ),

      T("B", "V_B", "Best Glide Speed", "PG.V.B",
        "Demonstrate best glide speed and explain how wind and weight affect speed selection.",
        [
          K("K1", "Best glide speed and maximum glide ratio"),
          K("K2", "Effects of wind, weight, and ballast on glide performance"),
          K("K3", "Speed-to-fly principles"
          )
        ],
        [
          R("R1", "Improper speed selection for conditions"),
          R("R2", "Failure to maintain safe landing options"),
          R("R3", "Attempting to stretch the glide")
        ],
        [
          S("S1", "Establish and maintain best glide speed"),
          S("S2", "Adjust speed for wind and operational conditions"),
          S("S3", "Maintain situational awareness of reachable landing areas")
        ],
        ["GLIDER"]
      )
    ]
  },

  {
    id: "VI",
    roman: "VI",
    title: "Soaring Techniques",
    phase: "flight",
    tasks: [
      T("A", "VI_A", "Thermalling", "PG.VI.A",
        "Find and center a thermal or explain your technique for locating and using thermal lift.",
        [
          K("K1", "Thermal formation, indicators, and lifecycle"),
          K("K2", "Thermalling entry, centering technique, and bank angle control"),
          K("K3", "Collision avoidance while thermalling with other gliders"
          )
        ],
        [
          R("R1", "Loss of situational awareness in a thermal"),
          R("R2", "Poor traffic scan or improper turn direction near other gliders"),
          R("R3", "Stall/spin risk from slow, steep, uncoordinated turns")
        ],
        [
          S("S1", "Locate or identify likely thermal sources"),
          S("S2", "Establish coordinated circling flight in lift"),
          S("S3", "Maintain lookout and proper right-of-way procedures")
        ],
        ["GLIDER"]
      ),

      T("B", "VI_B", "Ridge and Slope Soaring", "PG.VI.B",
        "Explain how you would safely use ridge lift, including wind requirements, turn direction, and escape options.",
        [
          K("K1", "Ridge lift formation and wind requirements"),
          K("K2", "Ridge traffic patterns, right-of-way, and turn direction"),
          K("K3", "Terrain clearance, rotor, turbulence, and escape routes")
        ],
        [
          R("R1", "Insufficient terrain clearance"),
          R("R2", "Turning toward the ridge without adequate clearance"),
          R("R3", "Failure to maintain escape options")
        ],
        [
          S("S1", "Explain or demonstrate safe ridge soaring technique"),
          S("S2", "Maintain safe terrain clearance"),
          S("S3", "Apply proper traffic and right-of-way procedures")
        ],
        ["GLIDER"]
      ),

      T("C", "VI_C", "Wave Soaring", "PG.VI.C",
        "Explain the conditions needed for wave lift and the hazards associated with wave soaring.",
        [
          K("K1", "Mountain wave formation and indicators"),
          K("K2", "Lenticular clouds, rotor clouds, turbulence, and altitude considerations"),
          K("K3", "Oxygen requirements and high-altitude considerations")
        ],
        [
          R("R1", "Severe turbulence or rotor encounter"),
          R("R2", "Hypoxia during high-altitude soaring"),
          R("R3", "Exceeding glider limitations in strong lift or sink")
        ],
        [
          S("S1", "Identify conditions favorable for wave lift"),
          S("S2", "Explain hazard avoidance and oxygen considerations"),
          S("S3", "Maintain safe airspeed and escape options")
        ],
        ["GLIDER"]
      )
    ]
  },

  {
    id: "VII",
    roman: "VII",
    title: "Performance Maneuvers",
    phase: "flight",
    tasks: [
      T("A", "VII_A", "Straight Glides", "PG.VII.A",
        "Demonstrate a straight glide at a specified airspeed while maintaining coordination and heading.",
        [
          K("K1", "Pitch attitude and airspeed relationship in a glide"),
          K("K2", "Use of trim and spoilers/dive brakes"),
          K("K3", "Effect of wind on glidepath"
          )
        ],
        [
          R("R1", "Airspeed deviations"),
          R("R2", "Failure to maintain coordination"),
          R("R3", "Poor glidepath awareness")
        ],
        [
          S("S1", "Establish a straight glide at specified airspeed"),
          S("S2", "Maintain heading and coordinated flight"),
          S("S3", "Adjust glidepath using appropriate controls")
        ],
        ["GLIDER"]
      ),

      T("B", "VII_B", "Turns to Headings", "PG.VII.B",
        "Demonstrate coordinated turns to assigned headings while maintaining appropriate airspeed.",
        [
          K("K1", "Coordinated turn aerodynamics"),
          K("K2", "Bank angle, load factor, and stall speed relationship"),
          K("K3", "Rollout lead and heading control")
        ],
        [
          R("R1", "Uncoordinated turn leading to stall/spin"),
          R("R2", "Overbanking or excessive pitch changes"),
          R("R3", "Loss of airspeed awareness")
        ],
        [
          S("S1", "Enter, maintain, and recover from coordinated turns"),
          S("S2", "Roll out on assigned heading"),
          S("S3", "Maintain appropriate airspeed and bank control")
        ],
        ["GLIDER"]
      ),

      T("C", "VII_C", "Steep Turns", "PG.VII.C",
        "Demonstrate steep turns in both directions while maintaining airspeed, coordination, and orientation.",
        [
          K("K1", "Steep turn aerodynamics and increased load factor"),
          K("K2", "Stall speed increase during steep turns"),
          K("K3", "Energy management without engine power")
        ],
        [
          R("R1", "Inadvertent stall during steep turn"),
          R("R2", "Loss of orientation or lookout"),
          R("R3", "Improper pitch or bank control")
        ],
        [
          S("S1", "Establish proper airspeed and bank"),
          S("S2", "Maintain coordinated steep turns"),
          S("S3", "Recover on assigned heading with appropriate airspeed")
        ],
        ["GLIDER"]
      )
    ]
  },

  {
    id: "VIII",
    roman: "VIII",
    title: "Navigation",
    phase: "flight",
    tasks: [
      T("A", "VIII_A", "Pilotage and Dead Reckoning", "PG.VIII.A",
        "Navigate to a selected checkpoint using pilotage and dead reckoning while maintaining safe landing options.",
        [
          K("K1", "Pilotage and dead reckoning for glider operations"),
          K("K2", "Checkpoint selection and wind correction"),
          K("K3", "Maintaining glide range to landing areas"
          )
        ],
        [
          R("R1", "Becoming geographically disoriented"),
          R("R2", "Flying beyond safe glide range"),
          R("R3", "Fixation on navigation at the expense of lookout and energy management")
        ],
        [
          S("S1", "Navigate using visual references and dead reckoning"),
          S("S2", "Maintain awareness of reachable landing areas"),
          S("S3", "Correct for wind and update position estimates")
        ],
        ["GLIDER"]
      ),

      T("B", "VIII_B", "Navigation Systems and Radar Services", "PG.VIII.B",
        "Use available navigation equipment and explain how you would obtain radar services if needed.",
        [
          K("K1", "Use of GPS, moving map, variometer navigation, and other installed equipment"),
          K("K2", "Limitations of navigation equipment in glider operations"),
          K("K3", "VFR radar advisory services and emergency assistance"
          )
        ],
        [
          R("R1", "Overreliance on electronic navigation"),
          R("R2", "Battery depletion or equipment failure"),
          R("R3", "Delayed request for assistance")
        ],
        [
          S("S1", "Use available navigation systems appropriately"),
          S("S2", "Cross-check electronic navigation with outside references"),
          S("S3", "Communicate with ATC or other resources as needed")
        ],
        ["GLIDER"]
      ),

      T("C", "VIII_C", "Diversion", "PG.VIII.C",
        "Lift is weaker than expected and you cannot complete the planned route. Select and navigate toward an alternate landing site.",
        [
          K("K1", "Diversion decision-making in glider operations"),
          K("K2", "Selecting an alternate airport, gliderport, or off-airport landing site"),
          K("K3", "Estimating glide range, wind effect, and arrival altitude"
          )
        ],
        [
          R("R1", "Delaying diversion decision"),
          R("R2", "Attempting to stretch the glide"),
          R("R3", "Selecting an unsuitable landing area")
        ],
        [
          S("S1", "Select a suitable diversion landing site"),
          S("S2", "Navigate toward the site while maintaining safe airspeed"),
          S("S3", "Plan arrival and pattern entry with adequate altitude")
        ],
        ["GLIDER"]
      ),

      T("D", "VIII_D", "Lost Procedures", "PG.VIII.D",
        "You are uncertain of your position and below your planned altitude. Explain and demonstrate lost procedures.",
        [
          K("K1", "Lost procedures appropriate to glider flight"),
          K("K2", "Use of charts, GPS, landmarks, radio, and ATC assistance"),
          K("K3", "Maintaining landing options while resolving position uncertainty")
        ],
        [
          R("R1", "Continuing without position awareness"),
          R("R2", "Ignoring safe landing options while troubleshooting navigation"),
          R("R3", "Failure to communicate or request help")
        ],
        [
          S("S1", "Apply lost procedures"),
          S("S2", "Use available resources to re-establish position"),
          S("S3", "Maintain safe landing options")
        ],
        ["GLIDER"]
      )
    ]
  },

  {
    id: "IX",
    roman: "IX",
    title: "Slow Flight and Stalls",
    phase: "flight",
    tasks: [
      T("A", "IX_A", "Maneuvering at Minimum Controllable Airspeed", "PG.IX.A",
        "Demonstrate maneuvering at minimum controllable airspeed and explain the risks.",
        [
          K("K1", "Slow flight aerodynamics in gliders"),
          K("K2", "Control effectiveness near stall speed"),
          K("K3", "Stall warning cues and coordination")
        ],
        [
          R("R1", "Inadvertent stall"),
          R("R2", "Uncoordinated flight leading to spin entry"),
          R("R3", "Distraction from airspeed and attitude awareness")
        ],
        [
          S("S1", "Establish and maintain slow flight"),
          S("S2", "Maintain coordinated control"),
          S("S3", "Recover promptly to normal glide"
          )
        ],
        ["GLIDER"]
      ),

      T("B", "IX_B", "Stall Recognition and Recovery", "PG.IX.B",
        "Demonstrate recognition and recovery from an impending or full stall.",
        [
          K("K1", "Aerodynamic causes of stalls"),
          K("K2", "Stall indications and recovery procedures"),
          K("K3", "Effect of bank, load factor, and coordination on stall behavior"
          )
        ],
        [
          R("R1", "Delayed stall recovery"),
          R("R2", "Secondary stall from improper recovery"),
          R("R3", "Spin entry from uncoordinated stall")
        ],
        [
          S("S1", "Recognize stall indications"),
          S("S2", "Reduce angle of attack and recover promptly"),
          S("S3", "Return to normal glide while maintaining control")
        ],
        ["GLIDER"]
      ),

      T("C", "IX_C", "Spin Awareness", "PG.IX.C",
        "Explain spin entry, spin avoidance, and recovery concepts applicable to glider flight.",
        [
          K("K1", "Spin aerodynamics and entry conditions"),
          K("K2", "Common glider scenarios leading to spins"),
          K("K3", "Manufacturer-recommended spin recovery procedures"
          )
        ],
        [
          R("R1", "Uncoordinated turns at low airspeed"),
          R("R2", "Low-altitude stall/spin during thermalling or pattern work"),
          R("R3", "Improper recovery inputs")
        ],
        [
          S("S1", "Explain spin awareness and avoidance"),
          S("S2", "Describe appropriate recovery procedure"),
          S("S3", "Maintain coordinated flight in stall-prone situations")
        ],
        ["GLIDER"]
      )
    ]
  },

  {
    id: "X",
    roman: "X",
    title: "Emergency Operations",
    phase: "flight",
    tasks: [
      T("A", "X_A", "Abnormal and Emergency Procedures", "PG.X.A",
        "During flight, you experience a control, canopy, spoiler, tow release, or instrument abnormality. Explain your response.",
        [
          K("K1", "Glider abnormal and emergency procedures"),
          K("K2", "Canopy opening, control malfunction, spoiler malfunction, and tow release malfunction procedures"),
          K("K3", "Emergency communications and landing priorities")
        ],
        [
          R("R1", "Failure to maintain aircraft control"),
          R("R2", "Delayed decision to land"),
          R("R3", "Improper response to glider-specific malfunction")
        ],
        [
          S("S1", "Maintain aircraft control"),
          S("S2", "Apply appropriate checklist or procedure"),
          S("S3", "Select and fly to a suitable landing area")
        ],
        ["GLIDER"]
      ),

      T("B", "X_B", "Launch Failure / Rope Break", "PG.X.B",
        "You have a rope break or launch failure at low altitude. Explain your immediate actions and decision-making.",
        [
          K("K1", "Aerotow and ground launch failure procedures"),
          K("K2", "Altitude-based emergency options"),
          K("K3", "Airspeed control and landing area selection after launch failure")
        ],
        [
          R("R1", "Failure to lower nose and maintain airspeed"),
          R("R2", "Attempting an unsafe turnback"),
          R("R3", "Indecision during low-altitude emergency")
        ],
        [
          S("S1", "Lower nose and maintain appropriate airspeed"),
          S("S2", "Select safe landing option based on altitude and position"),
          S("S3", "Execute landing or pattern as appropriate"
          )
        ],
        ["GLIDER"]
      ),

      T("C", "X_C", "Emergency Equipment and Survival Gear", "PG.X.C",
        "Describe emergency equipment and survival considerations for a glider outlanding.",
        [
          K("K1", "Emergency equipment carried in the glider"),
          K("K2", "ELT, radio, tracking device, and signaling equipment"),
          K("K3", "Survival considerations after an off-airport landing"
          )
        ],
        [
          R("R1", "Inability to signal location after outlanding"),
          R("R2", "Poor post-landing communication or retrieve planning"),
          R("R3", "Inadequate survival equipment for conditions")
        ],
        [
          S("S1", "Identify emergency equipment and location"),
          S("S2", "Explain post-outlanding procedures"),
          S("S3", "Describe communication and survival priorities")
        ],
        ["GLIDER"]
      )
    ]
  },

  {
    id: "XI",
    roman: "XI",
    title: "Postflight Procedures",
    phase: "flight",
    tasks: [
      T("A", "XI_A", "After Landing, Parking, and Securing", "PG.XI.A",
        "After landing, secure the glider and explain postflight inspection and discrepancy reporting.",
        [
          K("K1", "After landing and securing procedures"),
          K("K2", "Glider parking, tie-down, control locks, canopy protection, and ballast removal"),
          K("K3", "Postflight inspection and discrepancy recording"
          )
        ],
        [
          R("R1", "Failure to secure glider against wind damage"),
          R("R2", "Failure to report or document discrepancies"),
          R("R3", "Improper handling during ground movement")
        ],
        [
          S("S1", "Complete after-landing and postflight checklist"),
          S("S2", "Park and secure the glider properly"),
          S("S3", "Record discrepancies and flight time as appropriate")
        ],
        ["GLIDER"]
      )
    ]
  }
];