function T(id, fc, title, code, scenario, k, r, s, ratings) {
  const obj = { id, filterCode: fc, title, code, scenario, knowledge: k, risk: r, skill: s };
  if (ratings) obj.ratings = ratings;
  return obj;
}

function K(code, text) { return { code, text }; }
function R(code, text) { return { code, text }; }
function S(code, text) { return { code, text }; }

export const INSTRUMENT_DATA = [
  {
  id: "I",
  roman: "I",
  title: "Preflight Preparation",
  phase: "ground",
  tasks: [

    T("A", "I_A", "Pilot Qualifications", "IR.I.A",
      "",
      [
        K("IR.I.A.K1", "Certification requirements, recency of experience, and recordkeeping."),
        K("IR.I.A.K2", "Privileges and limitations."),
        K("IR.I.A.K3", "Part 68 BasicMed privileges and limitations.")
      ],
      [
        R("IR.I.A.R1", "Proficiency versus currency."),
        R("IR.I.A.R2", "Personal minimums."),
        R("IR.I.A.R3", "Fitness for flight and physiological factors that might affect the pilot’s ability to fly under instrument conditions."),
        R("IR.I.A.R4", "Flying unfamiliar aircraft or operating with unfamiliar flight display systems and avionics.")
      ],
      [
        S("IR.I.A.S1", "Apply requirements to act as pilot-in-command (PIC) under Instrument Flight Rules (IFR) in a scenario given by the evaluator.")
      ]
    ),

    T("B", "I_B", "Weather Information", "IR.I.B",
      "",
      [
        K("IR.I.B.K1", "Sources of weather data (e.g., National Weather Service, Flight Service) for flight planning purposes."),
        K("IR.I.B.K2", "Acceptable weather products and resources required for preflight planning, current and forecast weather for departure, en route, and arrival phases of flight such as:"),
        K("IR.I.B.K2a", "a. Airport Observations (METAR and SPECI) and Pilot Observations (PIREP)"),
        K("IR.I.B.K2b", "b. Surface Analysis Chart, Ceiling and Visibility Chart (CVA)"),
        K("IR.I.B.K2c", "c. Terminal Aerodrome Forecasts (TAF)"),
        K("IR.I.B.K2d", "d. Graphical Forecasts for Aviation (GFA)"),
        K("IR.I.B.K2e", "e. Wind and Temperature Aloft Forecast (FB)"),
        K("IR.I.B.K2f", "f. Convective Outlook (AC)"),
        K("IR.I.B.K2g", "g. Inflight Aviation Weather Advisories including Airmen's Meteorological Information (AIRMET), Significant Meteorological Information (SIGMET), and Convective SIGMET"),
        K("IR.I.B.K3", "Meteorology applicable to the departure, en route, alternate, and destination for flights conducted under Instrument Flight Rules (IFR) to include expected climate and hazardous conditions such as:"),
        K("IR.I.B.K3a", "a. Atmospheric composition and stability"),
        K("IR.I.B.K3b", "b. Wind (e.g., windshear, mountain wave, factors affecting wind, etc.)"),
        K("IR.I.B.K3c", "c. Temperature and heat exchange"),
        K("IR.I.B.K3d", "d. Moisture/precipitation"),
        K("IR.I.B.K3e", "e. Weather system formation, including air masses and fronts"),
        K("IR.I.B.K3f", "f. Clouds"),
        K("IR.I.B.K3g", "g. Turbulence"),
        K("IR.I.B.K3h", "h. Thunderstorms and microbursts"),
        K("IR.I.B.K3i", "i. Icing and freezing level information"),
        K("IR.I.B.K3j", "j. Fog/mist"),
        K("IR.I.B.K3k", "k. Frost"),
        K("IR.I.B.K3l", "l. Obstructions to visibility (e.g., smoke, haze, volcanic ash, etc.)"),
        K("IR.I.B.K4", "Flight deck instrument displays of digital weather and aeronautical information.")
      ],
      [
        R("IR.I.B.R1", "Making the go/no-go and continue/divert decisions, including:"),
        R("IR.I.B.R1a", "a. Circumstances that would make diversion prudent"),
        R("IR.I.B.R1b", "b. Personal weather minimums"),
        R("IR.I.B.R1c", "c. Hazardous weather conditions, including known or forecast icing or turbulence aloft"),
        R("IR.I.B.R2", "Use and limitations of:"),
        R("IR.I.B.R2a", "a. Installed onboard weather equipment"),
        R("IR.I.B.R2b", "b. Aviation weather reports and forecasts"),
        R("IR.I.B.R2c", "c. Inflight weather resources")
      ],
      [
        S("IR.I.B.S1", "Use available aviation weather resources to obtain an adequate weather briefing."),
        S("IR.I.B.S2", "Analyze the implications of at least three of the conditions listed in K3a through K3l, using actual weather or weather conditions provided by the evaluator."),
        S("IR.I.B.S3", "Correlate weather information to make a go/no-go decision."),
        S("IR.I.B.S4", "Determine whether an alternate airport is required, and, if required, whether the selected alternate airport meets regulatory requirements.")
      ]
    ),

    T("C", "I_C", "Cross-Country Flight Planning", "IR.I.C",
      "",
      [
        K("IR.I.C.K1", "Route planning, including consideration of:"),
        K("IR.I.C.K1a", "a. Available navigational facilities"),
        K("IR.I.C.K1b", "b. Special use airspace"),
        K("IR.I.C.K1c", "c. Preferred routes"),
        K("IR.I.C.K1d", "d. Primary and alternate airports"),
        K("IR.I.C.K1e", "e. Enroute charts"),
        K("IR.I.C.K1f", "f. Chart Supplements"),
        K("IR.I.C.K1g", "g. NOTAMS"),
        K("IR.I.C.K1h", "h. Terminal Procedures Publications (TPP)"),
        K("IR.I.C.K2", "Altitude selection accounting for terrain and obstacles, glide distance of airplane, IFR cruising altitudes, effect of wind, and oxygen requirements."),
        K("IR.I.C.K3", "Calculating:"),
        K("IR.I.C.K3a", "a. Time, climb and descent rates, course, distance, heading, true airspeed, and groundspeed"),
        K("IR.I.C.K3b", "b. Estimated time of arrival, including conversion to universal coordinated time (UTC)"),
        K("IR.I.C.K3c", "c. Fuel requirements, including reserve"),
        K("IR.I.C.K4", "Elements of an IFR flight plan."),
        K("IR.I.C.K5", "Procedures for activating and closing an IFR flight plan in controlled and uncontrolled airspace.")
      ],
      [
        R("IR.I.C.R1", "Pilot."),
        R("IR.I.C.R2", "Aircraft."),
        R("IR.I.C.R3", "Environment (e.g., weather, airports, airspace, terrain, obstacles)."),
        R("IR.I.C.R4", "External pressures."),
        R("IR.I.C.R5", "Limitations of air traffic control (ATC) services."),
        R("IR.I.C.R6", "Limitations of electronic planning applications and programs."),
        R("IR.I.C.R7", "Fuel planning.")
      ],
      [
        S("IR.I.C.S1", "Prepare, present, and explain a cross-country flight plan assigned by the evaluator including a risk analysis based on real time weather, which includes calculating time en route and fuel considering factors such as power settings, operating altitude, wind, fuel reserve requirements, and weight and balance requirements."),
        S("IR.I.C.S2", "Recalculate fuel reserves based on a scenario provided by the evaluator."),
        S("IR.I.C.S3", "Create a navigation plan and simulate filing an IFR flight plan."),
        S("IR.I.C.S4", "Interpret departure, arrival, en route, and approach procedures with reference to appropriate and current charts."),
        S("IR.I.C.S5", "Recognize simulated wing contamination due to airframe icing and demonstrate knowledge of the adverse effects of airframe icing during pre-takeoff, takeoff, cruise, and landing phases of flight as well as the corrective actions."),
        S("IR.I.C.S6", "Apply pertinent information from appropriate and current aeronautical charts, Chart Supplements; Notices to Air Missions (NOTAMs) relative to airport, runway and taxiway closures; and other flight publications.")
      ]
    )

  ]
},

  {
  id: "II",
  roman: "II",
  title: "Preflight Procedures",
  phase: "ground",
  tasks: [

    T("A", "II_A", "Aircraft Systems Related to Instrument Flight Rules (IFR) Operations", "IR.II.A",
      "",
      [
        K("IR.II.A.K1", "The general operational characteristics and limitations of applicable anti-icing and deicing systems, including airframe, propeller, intake, fuel, and pitot-static systems."),
        K("IR.II.A.K2", "Flight control systems.")
      ],
      [
        R("IR.II.A.R1", "Operations in icing conditions."),
        R("IR.II.A.R2", "Limitations of anti-icing and deicing systems."),
        R("IR.II.A.R3", "Use of automated systems in instrument conditions.")
      ],
      [
        S("IR.II.A.S1", "Demonstrate familiarity with anti- or de-icing procedures or information published by the manufacturer specific to the aircraft used on the practical test."),
        S("IR.II.A.S2", "Demonstrate familiarity with the automatic flight control system (AFCS) procedures or information published by the manufacturer specific to the aircraft used on the practical test, if applicable.")
      ]
    ),

    T("B", "II_B", "Aircraft Flight Instruments and Navigation Equipment", "IR.II.B",
      "",
      [
        K("IR.II.B.K1", "Operation of the aircraft’s applicable flight instrument system(s), including:"),
        K("IR.II.B.K1a", "a. Pitot-static instrument system and associated instruments"),
        K("IR.II.B.K1b", "b. Gyroscopic/electric/vacuum instrument system and associated instruments"),
        K("IR.II.B.K1c", "c. Electrical systems, electronic flight instrument displays [primary flight display (PFD), multi-function display (MFD)], transponder and automatic dependent surveillance - broadcast (ADS-B)"),
        K("IR.II.B.K1d", "d. Magnetic compass"),
        K("IR.II.B.K2", "Operation of the aircraft’s applicable navigation system(s), including:"),
        K("IR.II.B.K2a", "a. Very high frequency (VHF) Omnidirectional Range (VOR), distance measuring equipment (DME), instrument landing system (ILS), marker beacon receiver/indicators"),
        K("IR.II.B.K2b", "b. Area navigation (RNAV), global positioning system (GPS), Wide Area Augmentation System (WAAS), flight management system (FMS), autopilot"),
        K("IR.II.B.K3", "Use of an electronic flight bag (EFB), if used.")
      ],
      [
        R("IR.II.B.R1", "Monitoring and management of automated systems."),
        R("IR.II.B.R2", "Difference between approved and non-approved navigation devices."),
        R("IR.II.B.R3", "Modes of flight and navigation instruments, including failure conditions."),
        R("IR.II.B.R4", "Use of an electronic flight bag."),
        R("IR.II.B.R5", "Use of navigation databases.")
      ],
      [
        S("IR.II.B.S1", "Operate and manage installed instruments and navigation equipment."),
        S("IR.II.B.S2", "Operate and manage an applicant supplied electronic flight bag (EFB), if used.")
      ]
    ),

    T("C", "II_C", "Instrument Flight Deck Check", "IR.II.C",
      "",
      [
        K("IR.II.C.K1", "Purpose of performing an instrument flight deck check and how to detect possible defects."),
        K("IR.II.C.K2", "IFR airworthiness, including aircraft inspection requirements and required equipment for IFR flight."),
        K("IR.II.C.K3", "Required procedures, documentation, and limitations of flying with inoperative equipment.")
      ],
      [
        R("IR.II.C.R1", "Operating with inoperative equipment."),
        R("IR.II.C.R2", "Operating with outdated navigation publications or databases.")
      ],
      [
        S("IR.II.C.S1", "Perform preflight inspection by following the checklist appropriate to the aircraft and determine if the aircraft is in a condition for safe instrument flight.")
      ]
    )

  ]
},

  {
  id: "III",
  roman: "III",
  title: "Air Traffic Control (ATC) Clearances and Procedures",
  phase: "flight",
  tasks: [

    T("A", "III_A", "Compliance with Air Traffic Control Clearances", "IR.III.A",
      "is this the scenario?",
      [
        K("IR.III.A.K1", "Elements and procedures related to ATC clearances and pilot/controller responsibilities for departure.,en route, and arrival phases of flight, including clearance void times"),
        K("IR.III.A.K2", "Pilot-in-Command (PIC) emergency authority."),
        K("IR.III.A.K3", "Lost communication procedures and procedures for flights outside of radar environments."),
      ],
      [
        R("IR.III.A.R1", "Less than full understanding of an ATC clearance."),
        R("IR.III.A.R2", "Inappropriate, incomplete, or incorrect ATC clearances."),
        R("IR.III.A.R3", "ATC clearance inconsistent with aircraft performance or navigation capability."),
        R("IR.III.A.R4", "ATC clearance intended for other aircraft with similar call signs."),
      ],
      [
        S("IR.III.A.S1", "Correctly copy, read back, interpret, and comply with simulated or actual ATC clearances in a timely manner using standard phraseology as provided in the Aeronautical Information Manual (AIM)."),
        S("IR.III.A.S2", "Correctly set communication frequencies, navigation systems (identifying when appropriate), and transponder codes in compliance with the ATC clearance."),
        S("IR.III.A.S3", "Use the current and appropriate paper or electronic navigation publications."),
        S("IR.III.A.S4", "Intercept all courses, radials, and bearings appropriate to the procedure, route, or clearance in a timely manner."),
        S("IR.III.A.S5", "Maintain the applicable airspeed ±10 knots, headings ±10°, altitude ±100 feet; track a course, radial, or bearing within ¾-scale deflection of the course deviation indicator (CDI)."),
        S("IR.III.A.S6", "Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate"),
        S("IR.III.A.S7", "Perform the appropriate checklist items relative to the phase of flight.")

      ]
    ),

    T("B", "III_B", "Holding Procedures", "IR.III.B",
      "",
      [
        K("K1","Elements related to holding procedures, including reporting criteria, appropriate speeds, and recommended entry procedures for standard, nonstandard, published, and non-published holding patterns.")
      ],
      [
        R("R1","Recalculating fuel reserves if assigned an unanticipated expect further clearance (EFC) time."),
        R("R2","Scenarios and circumstances that could result in minimum fuel or the need to declare an emergency."),
        R("R3","Scenarios that could lead to holding, including deteriorating weather at the planned destination."),
        R("R4","Holding entry and wind correction while holding.")
      ],
      [
        S("S1","Use an entry procedure appropriate for a standard, nonstandard, published, or non-published holding pattern."),
        S("S2","Change to the holding airspeed appropriate for the altitude when 3 minutes or less from, but prior to arriving at, the holding fix and set appropriate power as needed for fuel conservation."),
        S("S3","Recognize arrival at the holding fix and promptly initiate entry into the holding pattern."),
        S("S3a","Comply with the holding pattern leg length and other restrictions, if applicable, associated with the holding pattern."),
        S("S4","Maintain airspeed ±10 knots, altitude ±100 feet, selected headings within ±10°, and track a selected course, radial, or bearing within ¾-scale deflection of the course deviation indicator (CDI)."),
        S("S5","Use proper wind correction procedures to maintain the desired pattern and to arrive over the fix as close as possible to a specified time."),
        S("S6","Use a multi-function display (MFD) and other graphical navigation displays, if installed, to monitor position in relation to the desired flightpath during holding."),
        S("S7","Comply with ATC reporting requirements and restrictions associated with the holding pattern."),
        S("S8","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ]
    )

  ]
},

  {
  id: "IV",
  roman: "IV",
  title: "Flight by Reference to Instruments",
  phase: "flight",
  tasks: [

    T("A", "IV_A", "Instrument Flight", "IR.IV.A",
      "",
      [
        K("K1","Elements related to attitude instrument flying during straight-and-level flight, climbs, turns, and descents while conducting various instrument flight procedures."),
        K("K2","Interpretation, operation, and limitations of pitch, bank, and power instruments."),
        K("K3","Normal and abnormal instrument indications and operations.")
      ],
      [
        R("R1","Situations that can affect physiology and degrade instrument cross-check."),
        R("R2","Spatial disorientation and optical illusions."),
        R("R3","Flying unfamiliar aircraft or operating with unfamiliar flight display systems and avionics.")
      ],
      [
        S("S1","Maintain altitude ±100 feet during level flight, selected headings ±10°, airspeed ±10 knots, and bank angles ±5° during turns."),
        S("S2","Use proper instrument cross-check and interpretation, and apply the appropriate pitch, bank, power, and trim corrections when applicable.")
      ]
    ),

    T("B", "IV_B", "Recovery from Unusual Flight Attitudes", "IR.IV.B",
      "",
      [
        K("K1","Procedures for recovery from unusual attitudes in flight."),
        K("K2","Prevention of unusual attitudes, including flight causal, physiological, and environmental factors, and system and equipment failures."),
        K("K3","Procedures available to safely regain visual meteorological conditions (VMC) after flight into inadvertent instrument meteorological conditions or unintended instrument meteorological conditions (IIMC)/(UIMC)."),
        K("K4","Appropriate use of automation, if applicable.")
      ],
      [
        R("R1","Situations that could lead to loss of control in-flight (LOC-I) or unusual attitudes in-flight (e.g., stress, task saturation, inadequate instrument scan distractions, and spatial disorientation)."),
        R("R3","Operating envelope considerations."),
        R("R4","Interpreting flight instruments."),
        R("R5","Assessment of the unusual attitude."),
        R("R6","Control input errors, inducing undesired aircraft attitudes."),
        R("R7","Control application solely by reference to instruments."),
        R("R8","Collision hazards."),
        R("R9","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("S1","Use proper instrument cross-check and interpretation to identify an unusual attitude (including both nose-high and nose-low) in flight, and apply the appropriate flight control, power input, and aircraft configuration in the correct sequence, to return to a stabilized level flight attitude."),
        S("S2","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ]
    )

  ]
},

  {
    id: "V",
    roman: "V",
    title: "Navigation Systems",
    phase: "flight",
    tasks: [
      T(
        "A",
        "V_A",
        "Intercepting and Tracking Navigational Systems and DME Arcs",
        "IR.V.A",
        "Intercept and track courses using installed navigation equipment. If applicable, demonstrate DME arc tracking.",
        [
        K("K1","Ground-based navigation (orientation, course determination, equipment, tests, and regulations), including procedures for intercepting and tracking courses and arcs."),
        K("K2","Satellite-based navigation (orientation, course determination, equipment, tests, regulations, interference, appropriate use of databases, Receiver Autonomous Integrity Monitoring (RAIM), and Wide Area Augmentation System (WAAS)), including procedures for intercepting and tracking courses and arcs.")
      ],
      [
        R("R1","Management of automated navigation and autoflight systems."),
        R("R2","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("R3","Limitations of the navigation system in use.")
      ],
      [
        S("S1","Tune and identify the navigation facility/program the navigation system and verify system accuracy as appropriate for the equipment installed in the aircraft."),
        S("S2","Determine aircraft position relative to the navigational facility or waypoint."),
        S("S3","Set and orient to the course to be intercepted."),
        S("S4","Intercept the specified course at appropriate angle, inbound to or outbound from a navigational facility or waypoint."),
        S("S5","Maintain airspeed ±10 knots, altitude ±100 feet, and selected headings ±5°."),
        S("S6","Apply proper correction to maintain a course, allowing no more than ¾-scale deflection of the course deviation indicator (CDI). If a distance measuring equipment (DME) arc is selected, maintain that arc ±1 nautical mile."),
        S("S7","Recognize navigational system or facility failure, and when required, report the failure to air traffic control (ATC)."),
        S("S8","Use a multi-function display (MFD) and other graphical navigation displays, if installed, to monitor position, track wind drift, and to maintain situational awareness."),
        S("S9","At the discretion of the evaluator, use the autopilot to make appropriate course intercepts, if installed."),
        S("S10","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ]
      ),

      T(
        "B",
        "V_B",
        "Departure, En Route, and Arrival Operations",
        "IR.V.B",
        "ATC issues a holding clearance. Interpret the clearance, determine the entry, and fly the hold.",
        [
        K("K1","Elements related to ATC routes, including departure procedures (DPs) and associated climb gradients; standard terminal arrival (STAR) procedures and associated constraints."),
        K("K2","Pilot/controller responsibilities, communication procedures, and ATC services available to pilots.")
      ],
      [
        R("R1","ATC communications and compliance with published procedures."),
        R("R2","Limitations of traffic avoidance equipment."),
        R("R3","Responsibility to use \"see and avoid\" techniques when possible.")
      ],
      [
        S("S1","Select, identify (as necessary) and use the appropriate communication and navigation facilities associated with the proposed flight."),
        S("S2","Perform the appropriate checklist items relative to the phase of flight."),
        S("S3","Use the current and appropriate paper or electronic navigation publications."),
        S("S4","Establish two-way communications with the proper controlling agency, use proper phraseology, and comply in a timely manner with all ATC instructions and airspace restrictions."),
        S("S5","Intercept all courses, radials, and bearings appropriate to the procedure, route, or clearance in a timely manner."),
        S("S6","Comply with all applicable charted procedures."),
        S("S7","Maintain airspeed ±10 knots, altitude ±100 feet, and selected headings ±10°, and apply proper correction to maintain a course allowing no more than ¾-scale deflection of the course deviation indicator (CDI)."),
        S("S8","Update/interpret weather in flight."),
        S("S9","Use displays of digital weather and aeronautical information, as applicable to maintain situational awareness."),
        S("S10","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ]
      )
    ]
  },

  {
    id: "VI",
    roman: "VI",
    title: "Instrument Approach Procedures",
    phase: "flight",
    tasks: [
      T(
        "A",
        "VI_A",
        "Nonprecision Approach",
        "IR.VI.A",
        "Brief and fly a nonprecision instrument approach to the appropriate minimums.",
        [
        K("K1","Procedures and limitations associated with a non-precision approach, including the differences between Localizer Performance (LP) and Lateral Navigation (LNAV) approach guidance."),
        K("K2","Navigation system indications and annunciations expected during an area navigation (RNAV) approach."),
        K("K3","Ground-based and satellite-based navigation systems used for a non-precision approach."),
        K("K4","A stabilized approach, including energy management concepts.")
      ],
      [
        R("R1","Deviating from the assigned approach procedure."),
        R("R2","Selecting a navigation frequency."),
        R("R3","Management of automated navigation and autoflight systems."),
        R("R4","Aircraft configuration during an approach and missed approach."),
        R("R5","An unstable approach, including excessive descent rates."),
        R("R6","Deteriorating weather conditions on approach."),
        R("R7","Operating below the minimum descent altitude (MDA) without proper visual references.")
      ],
      [
        S("S1","Accomplish the non-precision instrument approaches selected by the evaluator."),
        S("S2","Establish two-way communications with air traffic control (ATC) appropriate for the phase of flight or approach segment, and use proper communication phraseology."),
        S("S3","Select, tune, identify, and confirm the operational status of navigation equipment to be used for the approach."),
        S("S4","Comply with all clearances issued by ATC or the evaluator."),
        S("S5","Recognize if any flight instrumentation is inaccurate or inoperative, and take appropriate action."),
        S("S6","Advise ATC or the evaluator if unable to comply with a clearance."),
        S("S7","Complete the appropriate checklist(s)."),
        S("S8","Establish the appropriate aircraft configuration and airspeed considering meteorological and operating conditions."),
        S("S9","Maintain altitude ±100 feet, selected heading ±10°, airspeed ±10 knots, no more than ¾ scale CDI deflection, and accurately track radials, courses, or bearings, prior to beginning the final approach segment."),
        S("S10","Adjust the published MDA and visibility criteria for the aircraft approach category, as appropriate, for factors that include Notices of Air Missions (NOTAMs), inoperative aircraft or navigation equipment, or inoperative visual aids associated with the landing environment, etc."),
        S("S11","Establish a stabilized descent to the appropriate altitude."),
        S("S12","For the final approach segment, maintain no more than ¾ scale CDI deflection, airspeed ±10 knots, and altitude, if applicable, above MDA +100/-0 feet to the Visual Descent Point (VDP) or missed approach point (MAP)."),
        S("S13","Assess if the required visual references are available, and either initiate the missed approach procedure or continue for landing."),
        S("S14","Use a multi-function display (MFD) and other graphical navigation displays, if installed, to monitor position, track wind drift, and to maintain situational awareness."),
        S("S15","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
]
      ),

      T(
        "B",
        "VI_B",
        "Precision Approach",
        "IR.VI.B",
        "Brief and fly a precision approach using appropriate lateral and vertical guidance.",
        [
        K("K1","Procedures and limitations associated with a precision approach, including determining required descent rates and adjusting minimums in the case of inoperative equipment."),
        K("K2","Navigation system displays, annunciations, and modes of operation."),
        K("K3","Ground-based and satellite-based navigation systems (orientation, course determination, equipment, tests and regulations, interference, appropriate use of navigation data, signal integrity)."),
        K("K4","A stabilized approach, including energy management concepts.")
      ],
      [
        R("R1","Deviating from the assigned approach procedure."),
        R("R2","Selecting a navigation frequency."),
        R("R3","Management of automated navigation and autoflight systems."),
        R("R4","Aircraft configuration during an approach and missed approach."),
        R("R5","An unstable approach, including excessive descent rates."),
        R("R6","Deteriorating weather conditions on approach."),
        R("R7","Continuing to descend below the Decision Altitude (DA)/Decision Height (DH) when the required visual references are not visible.")
      ],
      [
        S("S1","Accomplish the precision instrument approach(es) selected by the evaluator."),
        S("S2","Establish two-way communications with air traffic control (ATC) appropriate for the phase of flight or approach segment, and use proper communication phraseology."),
        S("S3","Select, tune, identify, and confirm the operational status of navigation equipment to be used for the approach."),
        S("S4","Comply with all clearances issued by ATC or the evaluator."),
        S("S5","Recognize if any flight instrumentation is inaccurate or inoperative, and take appropriate action."),
        S("S6","Advise ATC or the evaluator if unable to comply with a clearance."),
        S("S7","Complete the appropriate checklist(s)."),
        S("S8","Establish the appropriate aircraft configuration and airspeed considering meteorological and operating conditions."),
        S("S9","Maintain altitude ±100 feet, selected heading ±10°, airspeed ±10 knots, no more than ¾ scale CDI deflection, and accurately track radials, courses, or bearings, prior to beginning the final approach segment."),
        S("S10","Adjust the published DA/DH and visibility criteria for the aircraft approach category, as appropriate, to account for NOTAMs, inoperative aircraft or navigation equipment, or inoperative visual aids associated with the landing environment."),
        S("S11","Establish a predetermined rate of descent at the point where vertical guidance begins, which approximates that required for the aircraft to follow the vertical guidance."),
        S("S12","Maintain a stabilized final approach from the final approach fix (FAF) to DA/DH allowing no more than ¾-scale deflection of either the vertical or lateral guidance indications, and maintain the desired airspeed ±10 knots."),
        S("S13","Immediately initiate the missed approach procedure when at the DA/DH, and the required visual references for the runway are not unmistakably visible and identifiable."),
        S("S14","Transition to a normal landing approach (missed approach for seaplanes) only when the airplane is in a position from which a descent to a landing on the runway can be made at a normal rate of descent using normal maneuvering."),
        S("S15","Maintain a stabilized visual flight path from the DA/DH to the runway aiming point where a normal landing may be accomplished within the touchdown zone."),
        S("S16","Use a multi-function display (MFD) and other graphical navigation displays, if installed, to monitor position, track wind drift, and to maintain situational awareness."),
        S("S17","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
]
      ),

      
      T(
        "C",
        "VI_C",
        "Missed Approach",
        "IR.VI.C",
        "You arrive at your MDA or DA, as appropriate, and the runway environment is not in sight. Brief and fly the published missed approach procedure.",
        [
        K("K1","Elements related to missed approach procedures and limitations associated with standard instrument approaches, including while using a flight management system (FMS) or autopilot, if equipped.")
      ],
      [
        R("R1","Deviations from prescribed procedures or ATC instructions."),
        R("R2","Holding, diverting, or electing to fly the approach again."),
        R("R3","Aircraft configuration during an approach and missed approach."),
        R("R4","Factors that might lead to executing a missed approach procedure before the MAP or to a go-around below DA, DH, or MDA, as applicable."),
        R("R5","Management of automated navigation and autoflight systems.")
      ],
      [
        S("S1","Promptly initiate the missed approach procedure and report it to ATC."),
        S("S2","Apply the appropriate power setting for the flight condition and establish a pitch attitude necessary to obtain the desired performance."),
        S("S3","Configure the airplane in accordance with airplane manufacturer’s instructions, establish a positive rate of climb, and accelerate to the appropriate airspeed, ±10 knots."),
        S("S4","Follow the recommended checklist items appropriate to the missed approach/go-around procedure."),
        S("S5","Comply with the published or alternate missed approach procedure."),
        S("S6","Advise ATC or the evaluator if unable to comply with a clearance, restriction, or climb gradient."),
        S("S7","Maintain the recommended airspeed ±10 knots; heading, course, or bearing ±10°; and altitude(s) ±100 feet during the missed approach procedure."),
        S("S8","Use an MFD and other graphical navigation displays, if installed, to monitor position and track to help navigate the missed approach."),
        S("S9","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate."),
        S("S10","Request ATC clearance to attempt another approach, proceed to the alternate airport, holding fix, or other clearance limit, as appropriate, or as directed by the evaluator.")
      ]
      ),

      T(
        "D",
        "VI_D",
        "Circling Approach",
        "IR.VI.D",
        "Fly a circling approach from an instrument approach to a runway not aligned with the final approach course.",
        [
        K("K1","Elements related to circling approach procedures and limitations, including approach categories and related airspeed restrictions.")
      ],
      [
        R("R1","Prescribed circling approach procedures."),
        R("R2","Executing a circling approach at night or with marginal visibility."),
        R("R3","Losing visual contact with an identifiable part of the airport."),
        R("R4","Management of automated navigation and autoflight systems."),
        R("R5","Management of altitude, airspeed, or distance while circling."),
        R("R6","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("R7","Executing a missed approach after the MAP while circling.")
      ],
      [
        S("S1","Comply with the circling approach procedure considering turbulence, windshear, and the maneuvering capability and approach category of the aircraft."),
        S("S2","Confirm the direction of traffic and adhere to all restrictions and instructions issued by ATC or the evaluator."),
        S("S3","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate."),
        S("S4","Establish the approach and landing configuration. Maintain a stabilized approach and a descent rate that ensures arrival at the MDA, or the preselected circling altitude above the MDA, prior to the missed approach point."),
        S("S5","Maintain airspeed ±10 knots, desired heading/track ±10°, and altitude +100/-0 feet until descending below the MDA or the preselected circling altitude above the MDA."),
        S("S6","Visually maneuver to a base or downwind leg appropriate for the landing runway and environmental conditions."),
        S("S7","If a missed approach occurs, turn in the appropriate direction using the correct procedure and appropriately configure the airplane."),
        S("S8","If landing, initiate a stabilized descent. Touch down on the first one-third of the selected runway without excessive maneuvering, without exceeding the normal operating limits of the airplane, and without exceeding 30° of bank.")
      ]
      ),
      T(
        "E",
        "VI_E",
        "Landing from an Instrument Approach",
        "IR.VI.C",
        "Brief and fly an approach with vertical guidance, such as an LPV or LNAV/VNAV approach.",
        [
        K("K1","Elements related to the pilot’s responsibilities, and the environmental, operational, and meteorological factors that affect landing from a straight-in or circling approach."),
        K("K2","Airport signs, markings, and lighting, including approach lighting systems."),
        K("K3","Appropriate landing profiles and aircraft configurations.")
      ],
      [
        R("R1","Attempting to land from an unstable approach."),
        R("R2","Flying below the glidepath."),
        R("R3","Transitioning from instrument to visual references for landing."),
        R("R4","Aircraft configuration for landing.")
      ],
      [
        S("S1","Transition at the DA/DH, MDA, or visual descent point (VDP) to a visual flight condition, allowing for safe visual maneuvering and a normal landing."),
        S("S2","Adhere to all ATC or evaluator advisories, such as NOTAMs, windshear, wake turbulence, runway surface, and other operational considerations."),
        S("S3","Complete the appropriate checklist(s)."),
        S("S4","Maintain positive airplane control throughout the landing maneuver."),
        S("S5","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ]
      ),
    ]
  },

  {
    id: "VII",
    roman: "VII",
    title: "Emergency Operations",
    phase: "flight",
    tasks: [
      T(
        "A",
        "VII_A",
        "Loss of Communications",
        "IR.VII.A",
        "During IFR flight, two-way radio communication is lost. Explain and apply the appropriate IFR lost communication procedures.",
        [
        K("K1","Procedures to follow in the event of lost communication during various phases of flight, including techniques for reestablishing communications, when it is acceptable to deviate from an instrument flight rules (IFR) clearance, and when to begin an approach at the destination.")
      ],
      [
        R("R1","Possible reasons for loss of communication."),
        R("R2","Deviation from procedures for lost communications.")
      ],
      [
        S("S1","Recognize a simulated loss of communication."),
        S("S2","Simulate actions to re-establish communication."),
        S("S3","Determine whether to continue to flight plan destination or deviate."),
        S("S4","Determine appropriate time to begin an approach."),
        S("S5","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ]
      ),

      T(
        "B",
        "VII_B",
        "One Engine Inoperative (Simulated) During Straight-and-Level Flight and Turns",
        "IR.VII.B",
        "In a multiengine airplane, demonstrate aircraft control during straight-and-level flight and turns with one engine inoperative.",
        [
        K("K1","Procedures used if engine failure occurs during straight-and-level flight and turns while on instruments.")
      ],
      [
        R("R1","Identification of the inoperative engine."),
        R("R2","Inability to climb or maintain altitude with an inoperative engine."),
        R("R3","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("R4","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("R5","Fuel management during single-engine operation."),
        R("R6","Configuring the aircraft.")
      ],
      [
        S("S1","Promptly recognize an engine failure and maintain positive aircraft control."),
        S("S2","Set the engine controls, reduce drag, identify and verify the inoperative engine, and simulate feathering of the propeller on the inoperative engine (evaluator should then establish zero thrust on the inoperative engine)."),
        S("S3","Establish the best engine-inoperative airspeed and trim the airplane."),
        S("S4","Use flight controls in the proper combination as recommended by the manufacturer, or as required to maintain best performance, and trim as required."),
        S("S5","Verify the prescribed checklist procedures used for securing the inoperative engine."),
        S("S6","Attempt to determine and resolve the reason for the engine failure."),
        S("S7","Monitor engine functions and make necessary adjustments."),
        S("S8","Maintain the specified altitude ±100 feet or minimum sink rate if applicable, airspeed ±10 knots, and the specified heading ±10°."),
        S("S9","Assess the aircraft’s performance capability and decide an appropriate action to ensure a safe landing."),
        S("S10","Maintain control and fly within the aircraft’s operating limitations."),
        S("S11","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ],
        ["AMEL", "AMES"]
      ),

      T(
        "C",
        "VII_C",
        "Instrument Approach and Landing with an inoperative Engine (Simulated)",
        "IR.VII.C",
        "In a multiengine airplane, fly an instrument approach with one engine inoperative.",
        [
        K("K1","Instrument approach procedures with one engine inoperative.")
      ],
      [
        R("R1","Potential engine failure during approach and landing."),
        R("R3","Configuring the airplane."),
        R("R4","Low altitude maneuvering, including stall, spin, or controlled flight into terrain (CFIT)."),
        R("R5","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("R6","Performing a go-around/rejected landing with an engine failure.")
      ],
      [
        S("S1","Promptly recognize an engine failure and maintain positive aircraft control."),
        S("S2","Set the engine controls, reduce drag, identify and verify the inoperative engine, and simulate feathering of the propeller on the inoperative engine (evaluator should then establish zero thrust on the inoperative engine)."),
        S("S3","Use flight controls in the proper combination as recommended by the manufacturer, or as required to maintain best performance, and trim as required."),
        S("S4","Follow the manufacturer’s recommended emergency procedures and complete the appropriate checklist."),
        S("S5","Monitor the operating engine and aircraft systems and make adjustments as necessary."),
        S("S6","Request and follow an actual or a simulated air traffic control (ATC) clearance for an instrument approach."),
        S("S7","Maintain altitude ±100 feet or minimum sink rate if applicable, airspeed ±10 knots, and selected heading ±10°."),
        S("S8","Establish a rate of descent that ensures arrival at the minimum descent altitude (MDA) or decision altitude (DA)/decision height (DH) with the airplane in a position from which a descent to a landing on the intended runway can be made, either straight in or circling as appropriate."),
        S("S9","On final approach segment, maintain vertical (as applicable) and lateral guidance within ¾-scale deflection."),
        S("S10","Maintain control and fly within the aircraft’s operating limitations."),
        S("S11","Comply with the published criteria for the aircraft approach category if circling."),
        S("S12","Execute a landing."),
        S("S13","Complete the appropriate checklist(s)."),
        S("S14","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ],
      ["AMEL","AMES"],
      ),

      T(
        "D",
        "VII_D",
        "Approach with Loss of Primary Flight Instrument Indicators",
        "IR.VII.D",
        "During an instrument approach, primary flight instrument indications are lost. Continue safely using remaining available instruments.",
        [
        K("K1","Recognizing if primary flight instruments are inaccurate or inoperative, and advising ATC or the evaluator."),
        K("K2","Possible failure modes of primary instruments and how to correct or minimize the effect of the loss.")
      ],
      [
        R("R1","Use of secondary flight displays when primary displays have failed."),
        R("R2","Maintaining aircraft control."),
        R("R3","Distractions, task prioritization, loss of situational awareness, or disorientation.")
      ],
      [
        S("S1","Advise ATC or the evaluator if unable to comply with a clearance."),
        S("S2","Complete a non-precision instrument approach without the use of the primary flight instruments using the skill elements of the non-precision approach Task (see Area of Operation VI, Task A)."),
        S("S3","Use single-pilot resource management (SRM) or crew resource management (CRM), as appropriate.")
      ]
      )
    ]
  },

  {
    id: "VIII",
    roman: "VIII",
    title: "Postflight Procedures",
    phase: "ground",
    tasks: [
      T(
        "A",
        "VIII_A",
        "Checking Instruments and Equipment",
        "IR.VIII.A",
        "After completing the IFR flight, describe postflight actions related to aircraft instruments, avionics, discrepancies, and records.",
        [
        K("K1","Procedures for documenting in-flight/postflight discrepancies.")
      ],
      [
        R("R1","Performance and documentation of postflight inspection and aircraft discrepancies.")
      ],
      [
        S("S1","Conduct a postflight inspection and document discrepancies and servicing requirements, if any.")
      ]
      )
    ]
  }
];