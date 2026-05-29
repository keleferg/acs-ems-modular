function T(id, fc, title, code, scenario, k, r, s, ratings) {
  const obj = { id, filterCode: fc, title, code, scenario, knowledge: k, risk: r, skill: s };
  if (ratings) obj.ratings = ratings;
  return obj;
}
function K(code, text) { return { code, text }; }
function R(code, text) { return { code, text }; }
function S(code, text) { return { code, text }; }

export const CFI_DATA = [
{
  id: "I",
  roman: "I",
  title: "Fundamentals of Instructing",
  phase: "ground",
  tasks: [
    T("A","I_A","Effects of Human Behavior and Communication on the Learning Process","FI.I.A",
      "Objective: To determine the applicant understands human behavior and effective communication, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("FI.I.A.K1","Elements of human behavior, including:"),
        K("FI.I.A.K1a","a. Definitions of human behavior"),
        K("FI.I.A.K1b","b. Instructor and learner relationship"),
        K("FI.I.A.K1c","c. Motivation"),
        K("FI.I.A.K1d","d. Human needs"),
        K("FI.I.A.K1e","e. Defense mechanisms"),
        K("FI.I.A.K2","Learner emotional reactions, including:"),
        K("FI.I.A.K2a","a. Anxiety and stress"),
        K("FI.I.A.K2b","b. Impatience"),
        K("FI.I.A.K2c","c. Worry or lack of interest"),
        K("FI.I.A.K2d","d. Physical discomfort, illness, fatigue, and dehydration"),
        K("FI.I.A.K2e","e. Apathy due to inadequate instruction"),
        K("FI.I.A.K3","Teaching the adult learner."),
        K("FI.I.A.K4","Effective communication, including:"),
        K("FI.I.A.K4a","a. Basic elements of communication"),
        K("FI.I.A.K4b","b. Barriers to effective communication"),
        K("FI.I.A.K4c","c. Developing communication skills")
      ],
      [
        R("FI.I.A.R1","Recognizing and accommodating human behavior."),
        R("FI.I.A.R2","Barriers to communication.")
      ],
      [
        S("FI.I.A.S1","Give examples of how human behavior affects motivation and learning."),
        S("FI.I.A.S2","Describe what the instructor can do to deal with:"),
        S("FI.I.A.S2a","a. Serious abnormal emotional behavior"),
        S("FI.I.A.S2b","b. Defense mechanisms"),
        S("FI.I.A.S3","Use effective communication in ground and flight instruction.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","I_B","Learning Process","FI.I.B",
      "Objective: To determine the applicant understands the learning process, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("FI.I.B.K1","Definitions of learning."),
        K("FI.I.B.K2","Learning theory as it applies to ground and flight instruction, including:"),
        K("FI.I.B.K2a","a. Behaviorism"),
        K("FI.I.B.K2b","b. Cognitive Theory"),
        K("FI.I.B.K3","Perceptions and insight."),
        K("FI.I.B.K4","Acquiring knowledge."),
        K("FI.I.B.K5","Laws of learning."),
        K("FI.I.B.K6","Domains of learning, including:"),
        K("FI.I.B.K6a","a. Cognitive"),
        K("FI.I.B.K6b","b. Affective"),
        K("FI.I.B.K6c","c. Psychomotor"),
        K("FI.I.B.K7","Characteristics of learning."),
        K("FI.I.B.K8","Scenario-based training (SBT)."),
        K("FI.I.B.K9","Acquiring skill knowledge, including:"),
        K("FI.I.B.K9a","a. Stages"),
        K("FI.I.B.K9b","b. Knowledge of results"),
        K("FI.I.B.K9c","c. How to develop skills"),
        K("FI.I.B.K9d","d. Learning plateaus"),
        K("FI.I.B.K10","Types of practice."),
        K("FI.I.B.K11","Evaluation versus critique."),
        K("FI.I.B.K12","Distractions, interruptions, fixation, and inattention."),
        K("FI.I.B.K13","Errors."),
        K("FI.I.B.K14","Memory, including:"),
        K("FI.I.B.K14a","a. Sensory"),
        K("FI.I.B.K14b","b. Short-Term Memory (STM) and Long-Term Memory (LTM)"),
        K("FI.I.B.K14c","c. How usage affects memory"),
        K("FI.I.B.K14d","d. Forgetting"),
        K("FI.I.B.K15","Retention of learning."),
        K("FI.I.B.K16","Transfer of learning.")
      ],
      [
        R("FI.I.B.R1","Inadequate or incomplete instruction."),
        R("FI.I.B.R2","Lack of learner motivation."),
        R("FI.I.B.R3","Recognizing and correcting learner errors.")
      ],
      [
        S("FI.I.B.S1","Apply educational theories to ground and flight instruction."),
        S("FI.I.B.S2","Recognize and correct conditions that undermine the learning process."),
        S("FI.I.B.S3","Plan for and use techniques, including realistic distractions that teach flight students how to manage a workload.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )    ,

    T("C","I_C","Course Development, Lesson Plans, and Classroom Training Techniques","FI.I.C",
      "Objective: To determine the applicant understands the teaching process, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("FI.I.C.K1","Teaching, including:"),
        K("FI.I.C.K1a","a. Process"),
        K("FI.I.C.K1b","b. Essential skills"),
        K("FI.I.C.K2","Course of training."),
        K("FI.I.C.K3","Preparation of a lesson, including:"),
        K("FI.I.C.K3a","a. Training objectives and completion standards"),
        K("FI.I.C.K3b","b. Performance-based objectives"),
        K("FI.I.C.K3c","c. Importance of Airman Certification Standards (ACS) in aviation training curricula"),
        K("FI.I.C.K3d","d. Decision-based objectives"),
        K("FI.I.C.K4","Organization of material."),
        K("FI.I.C.K5","Training delivery methods, including:"),
        K("FI.I.C.K5a","a. Lecture"),
        K("FI.I.C.K5b","b. Discussion"),
        K("FI.I.C.K5c","c. Guided discussion"),
        K("FI.I.C.K5d","d. Cooperative or group learning"),
        K("FI.I.C.K5e","e. Demonstration-performance"),
        K("FI.I.C.K5f","f. Drill and practice"),
        K("FI.I.C.K6","Electronic learning (e-Learning)."),
        K("FI.I.C.K7","Instructional aids and training technologies, including:"),
        K("FI.I.C.K7a","a. Characteristics of effective instructional aids"),
        K("FI.I.C.K7b","b. Reasons for use"),
        K("FI.I.C.K7c","c. Guidelines for use"),
        K("FI.I.C.K7d","d. Types"),
        K("FI.I.C.K8","Integrated flight instruction."),
        K("FI.I.C.K9","Problem-based instruction."),
        K("FI.I.C.K10","Planning instructional activity, including:"),
        K("FI.I.C.K10a","a. Blocks of learning"),
        K("FI.I.C.K10b","b. Training syllabus"),
        K("FI.I.C.K10c","c. Lesson plans")
      ],
      [
        R("FI.I.C.R1","Selection of teaching method.")
      ],
      [
        S("FI.I.C.S1","Prepare an instructional lesson plan using teaching methods and materials appropriate for Task and learner characteristics, including:"),
        S("FI.I.C.S1a","a. Aeronautical knowledge ground lesson applicable for a classroom"),
        S("FI.I.C.S1b","b. Maneuver introduction and ground lesson")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("D","I_D","Student Evaluation, Assessment, and Testing","FI.I.D",
      "Objective: To determine the applicant understands evaluation and testing, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("FI.I.D.K1","Purpose and characteristics of effective assessment."),
        K("FI.I.D.K2","Traditional assessments."),
        K("FI.I.D.K3","Authentic assessments, including:"),
        K("FI.I.D.K3a","a. Learner-centered assessment"),
        K("FI.I.D.K3b","b. Maneuver or procedure grades"),
        K("FI.I.D.K3c","c. Assessing risk management skills"),
        K("FI.I.D.K4","Choosing an effective assessment method."),
        K("FI.I.D.K5","Purposes and types of critiques."),
        K("FI.I.D.K6","Oral assessment, including:"),
        K("FI.I.D.K6a","a. Characteristics of effective questions"),
        K("FI.I.D.K6b","b. Types of questions to avoid"),
        K("FI.I.D.K6c","c. Answering learner questions"),
        K("FI.I.D.K7","Assessment of piloting ability.")
      ],
      [
        R("FI.I.D.R1","Delivering an assessment.")
      ],
      [
        S("FI.I.D.S1","Use appropriate methods and techniques to assess learner performance in ground or flight training.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("E","I_E","Elements of Effective Teaching in a Professional Environment","FI.I.E",
      "Objective: To determine the applicant understands effects of instructor behavior on effective teaching, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("FI.I.E.K1","Aviation instructor responsibilities, including:"),
        K("FI.I.E.K1a","a. Helping learners"),
        K("FI.I.E.K1b","b. Providing adequate instruction"),
        K("FI.I.E.K1c","c. Training to established standards of performance"),
        K("FI.I.E.K1d","d. Emphasizing the positive"),
        K("FI.I.E.K1e","e. Minimizing learner frustrations"),
        K("FI.I.E.K2","Flight instructor responsibilities, including supervision and surveillance during training."),
        K("FI.I.E.K3","Flight instructor qualifications and professionalism."),
        K("FI.I.E.K4","Professional development."),
        K("FI.I.E.K5","Instructor ethics and conduct.")
      ],
      [
        R("FI.I.E.R1","Fulfilling instructor responsibilities."),
        R("FI.I.E.R2","Exhibiting professionalism.")
      ],
      [
        S("FI.I.E.S1","Deliver ground or flight instruction on an evaluator-assigned Task in a manner consistent with instructor responsibilities and professional characteristics as stated in K1 through K5.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("F","I_F","Elements of Effective Teaching that Include Risk Management and Accident Prevention","FI.I.F",
      "Objective: To determine the applicant understands teaching practical risk management, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("FI.I.F.K1","Teaching risk identification, assessment, and mitigation."),
        K("FI.I.F.K2","Teaching risk management tools, including:"),
        K("FI.I.F.K2a","a. Pilot/Aircraft/enVironment/External Pressures (PAVE) checklist"),
        K("FI.I.F.K2b","b. Flight Risk Assessment Tools (FRATs)"),
        K("FI.I.F.K3","When and how to introduce risk management."),
        K("FI.I.F.K4","Risk management teaching techniques by phase of instruction."),
        K("FI.I.F.K5","Managing risk during flight instruction, including:"),
        K("FI.I.F.K5a","a. Common flight instruction risks"),
        K("FI.I.F.K5b","b. Best practices"),
        K("FI.I.F.K5c","c. Special considerations while teaching takeoffs and landings"),
        K("FI.I.F.K6","Aeronautical Decision-Making (ADM) to include using Crew Resource Management (CRM) or Single-Pilot Resource Management (SRM), as appropriate.")
      ],
      [
        R("FI.I.F.R1","Hazards associated with providing flight instruction."),
        R("FI.I.F.R2","Obstacles to maintaining situational awareness during flight instruction."),
        R("FI.I.F.R3","Recognizing and managing hazards arising from human behavior, including hazardous attitudes.")
      ],
      [
        S("FI.I.F.S1","Use scenario-based training (SBT) to demonstrate, teach, and assess risk management and Aeronautical Decision-Making (ADM) skills in the context of a Task specified by the evaluator."),
        S("FI.I.F.S2","Identify, assess, and mitigate risks commonly associated with flight instruction by maintaining:"),
        S("FI.I.F.S2a","a. Awareness and oversight of the learner’s actions, with timely and appropriate supervision, intervention, or mitigation as needed"),
        S("FI.I.F.S2b","b. Awareness of the learner’s cognitive/physiological state, with timely action to mitigate anxiety, fatigue, or other obstruction to learning"),
        S("FI.I.F.S2c","c. Overall situational awareness of the aircraft’s dynamic state, its position in space, and vigilance for unexpected events or changing circumstances that occur in the environment"),
        S("FI.I.F.S3","Model and teach safety practices, including maintaining:"),
        S("FI.I.F.S3a","a. Collision avoidance while simultaneously providing instruction"),
        S("FI.I.F.S3b","b. Avoidance of unnecessary distractions"),
        S("FI.I.F.S3c","c. Coordinated flight"),
        S("FI.I.F.S3d","d. Awareness of who is manipulating controls through positive exchange of flight controls"),
        S("FI.I.F.S3e","e. Continuous awareness of the aircraft’s dynamic state and position in the NAS")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},

{
  id: "II",
  roman: "II",
  title: "Technical Subject Areas",
  phase: "ground",
  tasks: [
    T("A","II_A","Human Factors","AI.II.A",
      "Objective: To determine the applicant understands personal health, flight physiology, aeromedical and human factors, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.II.A.K1","Symptoms, recognition, causes, effects, and corrective actions associated with aeromedical and physiological issues, including:"),
        K("AI.II.A.K1a","a. Hypoxia"),
        K("AI.II.A.K1b","b. Hyperventilation"),
        K("AI.II.A.K1c","c. Middle ear and sinus problems"),
        K("AI.II.A.K1d","d. Spatial disorientation"),
        K("AI.II.A.K1e","e. Motion sickness"),
        K("AI.II.A.K1f","f. Carbon monoxide poisoning"),
        K("AI.II.A.K1g","g. Stress"),
        K("AI.II.A.K1h","h. Fatigue"),
        K("AI.II.A.K1i","i. Dehydration and nutrition"),
        K("AI.II.A.K1j","j. Hypothermia"),
        K("AI.II.A.K1k","k. Optical illusions"),
        K("AI.II.A.K1l","l. Dissolved nitrogen in the bloodstream after scuba dives"),
        K("AI.II.A.K2","Regulations regarding use of alcohol and drugs."),
        K("AI.II.A.K3","Effects of alcohol, drugs, and over-the-counter medications."),
        K("AI.II.A.K4","Aeronautical Decision-Making (ADM) to include using Crew Resource Management (CRM) or Single-Pilot Resource Management (SRM), as appropriate.")
      ],
      [
        R("AI.II.A.R1","Aeromedical and physiological issues."),
        R("AI.II.A.R2","Hazardous attitudes."),
        R("AI.II.A.R3","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AI.II.A.R4","Confirmation and expectation bias.")
      ],
      [
        S("AI.II.A.S1","Associate the symptoms and effects for at least three of the conditions listed in K1a through K1l with the cause(s) and corrective action(s)."),
        S("AI.II.A.S2","Perform self-assessment, including fitness for flight and personal minimums, for actual flight or a scenario given by the evaluator.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","II_B","Visual Scanning and Collision Avoidance","AI.II.B",
      "Objective: To determine the applicant understands visual scanning and collision avoidance, can apply that knowledge, manage associated risks, demonstrate pilot-in-command skills, and provide effective instruction.",
      [
        K("AI.II.B.K1","Environmental conditions that degrade vision."),
        K("AI.II.B.K2","Vestibular and visual illusions."),
        K("AI.II.B.K3","“See and Avoid” responsibilities."),
        K("AI.II.B.K4","Visual scanning procedure and the importance of peripheral vision."),
        K("AI.II.B.K5","Aircraft blind spots and clearing procedures."),
        K("AI.II.B.K6","Visual cues of an impending mid-air collision."),
        K("AI.II.B.K7","Situations that create the greatest collision risk."),
        K("AI.II.B.K8","Division of attention inside and outside the aircraft.")
      ],
      [
        R("AI.II.B.R1","Distractions to visual scanning."),
        R("AI.II.B.R2","Relaxed intermediate focal distance."),
        R("AI.II.B.R3","High volume operational environments."),
        R("AI.II.B.R4","Collision reaction time."),
        R("AI.II.B.R5","Use of a safety pilot.")
      ],
      [
        S("AI.II.B.S1","Effectively scan using short regularly spaced eye movements."),
        S("AI.II.B.S2","Scan around physical obstructions."),
        S("AI.II.B.S3","Use appropriate visual scanning techniques."),
        S("AI.II.B.S4","Use electronic traffic alert systems, if available.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("C","II_C","Runway Incursion Avoidance","AI.II.C",
      "Objective: To determine the applicant understands runway incursion avoidance, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.II.C.K1","Runway incursion definition."),
        K("AI.II.C.K2","Taxi instructions/clearances."),
        K("AI.II.C.K3","The importance of recording taxi instructions and reviewing taxi routes on the airport diagram."),
        K("AI.II.C.K4","Airport markings, signs, and lights including the importance of hold lines associated with runways."),
        K("AI.II.C.K5","Appropriate flight deck activities during taxiing, including taxi route planning, briefing the location of Hot Spots, communicating and coordinating with ATC."),
        K("AI.II.C.K6","Communication and operational procedures at uncontrolled airports.")
      ],
      [
        R("AI.II.C.R1","Distractions, task prioritization, loss of situational awareness, or disorientation."),
        R("AI.II.C.R2","Confirmation or expectation bias as related to taxi instructions."),
        R("AI.II.C.R3","Entering or crossing runways."),
        R("AI.II.C.R4","Night taxi operations."),
        R("AI.II.C.R5","Low visibility taxi operations."),
        R("AI.II.C.R6","Runway incursion after landing."),
        R("AI.II.C.R7","Operating on taxiways between parallel runways.")
      ],
      [
        S("AI.II.C.S1","Deliver instruction on the elements and techniques for runway incursion avoidance.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("D","II_D","Principles of Flight","AI.II.D",
      "Objective: To determine the applicant understands aerodynamics appropriate to the desired instructor certificate, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.II.D.K1","Airfoil design characteristics."),
        K("AI.II.D.K2","Airplane stability, maneuverability and controllability."),
        K("AI.II.D.K3","Turning tendency (e.g., torque, p-factor, spiraling slipstream, and gyroscopic precession)."),
        K("AI.II.D.K4","Forces acting on an airplane."),
        K("AI.II.D.K5","Load factors in airplane design."),
        K("AI.II.D.K6","Wingtip vortices and appropriate precautions.")
      ],
      [
        R("AI.II.D.R1","The basic aerodynamic principles of flight.")
      ],
      [
        S("AI.II.D.S1","Deliver instruction on principles of flight, including at least three of the elements listed in K1 through K6.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )    ,

    T("E","II_E","National Airspace System","AI.II.E",
      "Objective: To determine the applicant understands the National Airspace System (NAS), can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.II.E.K1","National Airspace System (NAS) definitions and operating rules."),
        K("AI.II.E.K2","Classes of airspace."),
        K("AI.II.E.K3","Special use airspace."),
        K("AI.II.E.K4","Temporary flight restrictions (TFRs)."),
        K("AI.II.E.K5","Special flight rules areas."),
        K("AI.II.E.K6","Mode C veil."),
        K("AI.II.E.K7","Terminal Radar Service Area (TRSA)."),
        K("AI.II.E.K8","Airport advisory areas."),
        K("AI.II.E.K9","National security areas."),
        K("AI.II.E.K10","Air Defense Identification Zones (ADIZ)."),
        K("AI.II.E.K11","Wildlife areas in national parks and forests."),
        K("AI.II.E.K12","Special Flight Rules Area (SFRA)."),
        K("AI.II.E.K13","Operations in Class A airspace."),
        K("AI.II.E.K14","ADS-B requirements."),
        K("AI.II.E.K15","Basic VFR weather minimums."),
        K("AI.II.E.K16","Cloud clearance requirements."),
        K("AI.II.E.K17","Equipment requirements."),
        K("AI.II.E.K18","Communication requirements."),
        K("AI.II.E.K19","Transponder requirements."),
        K("AI.II.E.K20","Airspace restrictions and prohibitions."),
        K("AI.II.E.K21","ATC services."),
        K("AI.II.E.K22","Notices to Air Missions (NOTAMs)."),
        K("AI.II.E.K23","Chart symbols."),
        K("AI.II.E.K24","Special conservation areas."),
        K("AI.II.E.K25","Flight restrictions in the proximity of space flight operations."),
        K("AI.II.E.K26","Interception procedures.")
      ],
      [
        R("AI.II.E.R1","Airspace violations."),
        R("AI.II.E.R2","Not recognizing airspace boundaries."),
        R("AI.II.E.R3","Operating without proper equipment."),
        R("AI.II.E.R4","Failure to comply with ATC clearances or instructions."),
        R("AI.II.E.R5","Failure to comply with NOTAMs and TFRs.")
      ],
      [
        S("AI.II.E.S1","Deliver instruction on the NAS, including at least three of the elements listed in K1 through K26."),
        S("AI.II.E.S2","Interpret charts and publications related to the NAS."),
        S("AI.II.E.S3","Explain requirements for operation in various classes of airspace.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("F","II_F","Navigation and Flight Planning","AI.II.F",
      "Objective: To determine the applicant understands navigation and flight planning, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.II.F.K1","Sectional charts."),
        K("AI.II.F.K2","Chart supplements."),
        K("AI.II.F.K3","Pilotage."),
        K("AI.II.F.K4","Dead reckoning."),
        K("AI.II.F.K5","Diversion procedures."),
        K("AI.II.F.K6","Lost procedures."),
        K("AI.II.F.K7","Radio navigation systems and radar services."),
        K("AI.II.F.K8","Magnetic variation and compass deviation."),
        K("AI.II.F.K9","Time, speed, and distance calculations."),
        K("AI.II.F.K10","Fuel requirements."),
        K("AI.II.F.K11","VFR cruising altitudes."),
        K("AI.II.F.K12","Flight plan filing procedures."),
        K("AI.II.F.K13","Global Positioning System (GPS) and avionics systems."),
        K("AI.II.F.K14","Electronic flight planning resources."),
        K("AI.II.F.K15","Navigation logs.")
      ],
      [
        R("AI.II.F.R1","Fuel exhaustion."),
        R("AI.II.F.R2","Navigation errors."),
        R("AI.II.F.R3","Improper use of navigation systems."),
        R("AI.II.F.R4","Loss of situational awareness."),
        R("AI.II.F.R5","Weather-related hazards.")
      ],
      [
        S("AI.II.F.S1","Deliver instruction on navigation and flight planning."),
        S("AI.II.F.S2","Demonstrate use of aeronautical charts and publications."),
        S("AI.II.F.S3","Teach pilotage, dead reckoning, and electronic navigation."),
        S("AI.II.F.S4","Prepare and explain a navigation log."),
        S("AI.II.F.S5","Teach diversion and lost procedures.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("G","II_G","Weather Information","AI.II.G",
      "Objective: To determine the applicant understands weather theory and services, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.II.G.K1","Atmospheric composition and circulation."),
        K("AI.II.G.K2","Wind and currents."),
        K("AI.II.G.K3","Atmospheric stability."),
        K("AI.II.G.K4","Temperature and dew point."),
        K("AI.II.G.K5","Moisture and clouds."),
        K("AI.II.G.K6","Fog."),
        K("AI.II.G.K7","Precipitation."),
        K("AI.II.G.K8","Air masses and fronts."),
        K("AI.II.G.K9","Thunderstorms."),
        K("AI.II.G.K10","Turbulence."),
        K("AI.II.G.K11","Icing."),
        K("AI.II.G.K12","Wake turbulence."),
        K("AI.II.G.K13","Windshear and microbursts."),
        K("AI.II.G.K14","Weather hazards."),
        K("AI.II.G.K15","Surface analysis charts."),
        K("AI.II.G.K16","Radar and satellite weather products."),
        K("AI.II.G.K17","METARs and TAFs."),
        K("AI.II.G.K18","PIREPs."),
        K("AI.II.G.K19","SIGMETs and AIRMETs."),
        K("AI.II.G.K20","Winds and temperatures aloft."),
        K("AI.II.G.K21","Graphical weather products."),
        K("AI.II.G.K22","Flight service."),
        K("AI.II.G.K23","Weather decision-making.")
      ],
      [
        R("AI.II.G.R1","Adverse weather."),
        R("AI.II.G.R2","Inadequate weather planning."),
        R("AI.II.G.R3","Continued VFR into IMC."),
        R("AI.II.G.R4","Thunderstorm penetration."),
        R("AI.II.G.R5","Icing encounters."),
        R("AI.II.G.R6","Weather interpretation errors.")
      ],
      [
        S("AI.II.G.S1","Deliver instruction on weather theory and aviation weather services."),
        S("AI.II.G.S2","Interpret aviation weather reports, forecasts, and charts."),
        S("AI.II.G.S3","Teach weather-related decision-making."),
        S("AI.II.G.S4","Identify hazardous weather conditions and mitigation strategies.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )    ,

    T("H","II_H","Cross-Country Flight Planning","AI.II.H",
      "Objective: To determine the applicant understands cross-country flight planning, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.II.H.K1","Route selection."),
        K("AI.II.H.K2","Chart selection and use."),
        K("AI.II.H.K3","Weather analysis and interpretation."),
        K("AI.II.H.K4","Aircraft performance and limitations."),
        K("AI.II.H.K5","Fuel requirements and reserves."),
        K("AI.II.H.K6","Weight and balance."),
        K("AI.II.H.K7","Alternates and diversion planning."),
        K("AI.II.H.K8","NOTAMs and TFRs."),
        K("AI.II.H.K9","Navigation systems and avionics."),
        K("AI.II.H.K10","Flight plan filing procedures."),
        K("AI.II.H.K11","Risk management and ADM."),
        K("AI.II.H.K12","Use of current aeronautical publications.")
      ],
      [
        R("AI.II.H.R1","Fuel exhaustion."),
        R("AI.II.H.R2","Adverse weather encounters."),
        R("AI.II.H.R3","Navigation errors."),
        R("AI.II.H.R4","Airspace violations."),
        R("AI.II.H.R5","Improper aircraft loading."),
        R("AI.II.H.R6","Inadequate preflight planning.")
      ],
      [
        S("AI.II.H.S1","Deliver instruction on cross-country flight planning."),
        S("AI.II.H.S2","Prepare a complete cross-country flight plan."),
        S("AI.II.H.S3","Teach route, fuel, and weather planning."),
        S("AI.II.H.S4","Explain alternate and diversion considerations."),
        S("AI.II.H.S5","Teach use of navigation logs and aeronautical charts.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("I","II_I","National Airspace System and Radar Services","AI.II.I",
      "Objective: To determine the applicant understands ATC and radar services, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.II.I.K1","ATC system organization."),
        K("AI.II.I.K2","Radar services."),
        K("AI.II.I.K3","VFR radar advisories."),
        K("AI.II.I.K4","ATC clearances and instructions."),
        K("AI.II.I.K5","Communication procedures."),
        K("AI.II.I.K6","Lost communication procedures."),
        K("AI.II.I.K7","Traffic pattern operations."),
        K("AI.II.I.K8","Airport operations."),
        K("AI.II.I.K9","Light gun signals."),
        K("AI.II.I.K10","Wake turbulence avoidance."),
        K("AI.II.I.K11","Airport signs, markings, and lighting."),
        K("AI.II.I.K12","Runway incursion avoidance.")
      ],
      [
        R("AI.II.I.R1","Communication misunderstandings."),
        R("AI.II.I.R2","Runway incursions."),
        R("AI.II.I.R3","Failure to comply with ATC instructions."),
        R("AI.II.I.R4","Loss of situational awareness."),
        R("AI.II.I.R5","Traffic conflicts.")
      ],
      [
        S("AI.II.I.S1","Deliver instruction on ATC and radar services."),
        S("AI.II.I.S2","Teach proper radio communication procedures."),
        S("AI.II.I.S3","Explain ATC clearances and instructions."),
        S("AI.II.I.S4","Teach runway incursion avoidance procedures."),
        S("AI.II.I.S5","Explain radar services available to VFR pilots.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("J","II_J","Performance and Limitations","AI.II.J",
      "Objective: To determine the applicant understands aircraft performance and limitations, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.II.J.K1","Performance charts and tables."),
        K("AI.II.J.K2","Density altitude."),
        K("AI.II.J.K3","Pressure altitude."),
        K("AI.II.J.K4","Effects of temperature and humidity."),
        K("AI.II.J.K5","Takeoff and landing performance."),
        K("AI.II.J.K6","Climb and cruise performance."),
        K("AI.II.J.K7","Weight and balance."),
        K("AI.II.J.K8","Center of gravity effects."),
        K("AI.II.J.K9","Aircraft limitations."),
        K("AI.II.J.K10","Aircraft systems limitations."),
        K("AI.II.J.K11","Load factors."),
        K("AI.II.J.K12","Maneuvering speed."),
        K("AI.II.J.K13","Stability and controllability.")
      ],
      [
        R("AI.II.J.R1","Operating beyond aircraft limitations."),
        R("AI.II.J.R2","Improper loading."),
        R("AI.II.J.R3","Performance degradation due to environmental conditions."),
        R("AI.II.J.R4","Loss of aircraft controllability."),
        R("AI.II.J.R5","Exceeding structural limitations.")
      ],
      [
        S("AI.II.J.S1","Deliver instruction on aircraft performance and limitations."),
        S("AI.II.J.S2","Calculate and interpret performance data."),
        S("AI.II.J.S3","Teach the effects of weight and balance."),
        S("AI.II.J.S4","Explain the effects of atmospheric conditions on aircraft performance."),
        S("AI.II.J.S5","Teach operational limitations and their importance.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )    ,

    T("K","II_K","Logbooks and Documents","AI.II.K",
      "Objective: To determine the applicant understands logbooks and required documents, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.II.K.K1","Pilot logbook entries and endorsements."),
        K("AI.II.K.K2","Aircraft maintenance records."),
        K("AI.II.K.K3","Required aircraft documents."),
        K("AI.II.K.K4","Airworthiness requirements."),
        K("AI.II.K.K5","Required inspections."),
        K("AI.II.K.K6","Airworthiness Directives."),
        K("AI.II.K.K7","Special flight permits."),
        K("AI.II.K.K8","Minimum equipment requirements."),
        K("AI.II.K.K9","Required pilot documents."),
        K("AI.II.K.K10","Medical certification requirements."),
        K("AI.II.K.K11","Recordkeeping requirements.")
      ],
      [
        R("AI.II.K.R1","Operating an unairworthy aircraft."),
        R("AI.II.K.R2","Incomplete or inaccurate records."),
        R("AI.II.K.R3","Expired inspections or certificates."),
        R("AI.II.K.R4","Improper maintenance documentation.")
      ],
      [
        S("AI.II.K.S1","Deliver instruction on aircraft and pilot records."),
        S("AI.II.K.S2","Teach required inspections and documentation."),
        S("AI.II.K.S3","Explain maintenance record entries."),
        S("AI.II.K.S4","Teach proper logbook endorsement procedures."),
        S("AI.II.K.S5","Determine aircraft airworthiness from records.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("L","II_L","Principles of Flight","AI.II.L",
      "Objective: To determine the applicant understands principles of flight, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.II.L.K1","Forces acting on an airplane."),
        K("AI.II.L.K2","Stability and controllability."),
        K("AI.II.L.K3","Aerodynamic principles."),
        K("AI.II.L.K4","Stalls and spins."),
        K("AI.II.L.K5","Load factors."),
        K("AI.II.L.K6","Effects of weight and balance."),
        K("AI.II.L.K7","Adverse yaw."),
        K("AI.II.L.K8","Ground effect."),
        K("AI.II.L.K9","Torque and P-factor."),
        K("AI.II.L.K10","Left-turning tendencies."),
        K("AI.II.L.K11","Critical angle of attack."),
        K("AI.II.L.K12","Drag and lift relationships."),
        K("AI.II.L.K13","Factors affecting stalls."),
        K("AI.II.L.K14","Stability axes."),
        K("AI.II.L.K15","Aircraft design characteristics.")
      ],
      [
        R("AI.II.L.R1","Loss of aircraft control."),
        R("AI.II.L.R2","Aerodynamic stalls."),
        R("AI.II.L.R3","Exceeding aircraft limitations."),
        R("AI.II.L.R4","Improper control inputs."),
        R("AI.II.L.R5","Spatial disorientation.")
      ],
      [
        S("AI.II.L.S1","Deliver instruction on principles of flight."),
        S("AI.II.L.S2","Explain aerodynamic concepts using appropriate terminology."),
        S("AI.II.L.S3","Teach factors affecting aircraft performance and controllability."),
        S("AI.II.L.S4","Explain stall and spin awareness concepts."),
        S("AI.II.L.S5","Relate aerodynamic principles to practical flight operations.")
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
    T("A","III_A","Airport and Seaplane Base Operations","AI.III.A",
      "Objective: To determine the applicant understands airport and seaplane base operations, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.III.A.K1","Airport signs, markings, and lighting."),
        K("AI.III.A.K2","Runway incursion avoidance."),
        K("AI.III.A.K3","Traffic patterns."),
        K("AI.III.A.K4","Airport communications."),
        K("AI.III.A.K5","Wake turbulence avoidance."),
        K("AI.III.A.K6","Right-of-way rules."),
        K("AI.III.A.K7","Noise abatement procedures."),
        K("AI.III.A.K8","Seaplane base operations."),
        K("AI.III.A.K9","Waterway operations and hazards."),
        K("AI.III.A.K10","Collision avoidance procedures.")
      ],
      [
        R("AI.III.A.R1","Runway incursions."),
        R("AI.III.A.R2","Traffic conflicts."),
        R("AI.III.A.R3","Wake turbulence encounters."),
        R("AI.III.A.R4","Loss of situational awareness."),
        R("AI.III.A.R5","Water hazards and obstructions.")
      ],
      [
        S("AI.III.A.S1","Deliver instruction on airport and seaplane base operations."),
        S("AI.III.A.S2","Teach runway incursion avoidance procedures."),
        S("AI.III.A.S3","Demonstrate proper airport communications."),
        S("AI.III.A.S4","Teach traffic pattern operations."),
        S("AI.III.A.S5","Explain wake turbulence avoidance procedures.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )    ,

    T("K","II_K","Logbooks and Documents","AI.II.K",
      "Objective: To determine the applicant understands logbooks and required documents, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.II.K.K1","Pilot logbook entries and endorsements."),
        K("AI.II.K.K2","Aircraft maintenance records."),
        K("AI.II.K.K3","Required aircraft documents."),
        K("AI.II.K.K4","Airworthiness requirements."),
        K("AI.II.K.K5","Required inspections."),
        K("AI.II.K.K6","Airworthiness Directives."),
        K("AI.II.K.K7","Special flight permits."),
        K("AI.II.K.K8","Minimum equipment requirements."),
        K("AI.II.K.K9","Required pilot documents."),
        K("AI.II.K.K10","Medical certification requirements."),
        K("AI.II.K.K11","Recordkeeping requirements.")
      ],
      [
        R("AI.II.K.R1","Operating an unairworthy aircraft."),
        R("AI.II.K.R2","Incomplete or inaccurate records."),
        R("AI.II.K.R3","Expired inspections or certificates."),
        R("AI.II.K.R4","Improper maintenance documentation.")
      ],
      [
        S("AI.II.K.S1","Deliver instruction on aircraft and pilot records."),
        S("AI.II.K.S2","Teach required inspections and documentation."),
        S("AI.II.K.S3","Explain maintenance record entries."),
        S("AI.II.K.S4","Teach proper logbook endorsement procedures."),
        S("AI.II.K.S5","Determine aircraft airworthiness from records.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("L","II_L","Principles of Flight","AI.II.L",
      "Objective: To determine the applicant understands principles of flight, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.II.L.K1","Forces acting on an airplane."),
        K("AI.II.L.K2","Stability and controllability."),
        K("AI.II.L.K3","Aerodynamic principles."),
        K("AI.II.L.K4","Stalls and spins."),
        K("AI.II.L.K5","Load factors."),
        K("AI.II.L.K6","Effects of weight and balance."),
        K("AI.II.L.K7","Adverse yaw."),
        K("AI.II.L.K8","Ground effect."),
        K("AI.II.L.K9","Torque and P-factor."),
        K("AI.II.L.K10","Left-turning tendencies."),
        K("AI.II.L.K11","Critical angle of attack."),
        K("AI.II.L.K12","Drag and lift relationships."),
        K("AI.II.L.K13","Factors affecting stalls."),
        K("AI.II.L.K14","Stability axes."),
        K("AI.II.L.K15","Aircraft design characteristics.")
      ],
      [
        R("AI.II.L.R1","Loss of aircraft control."),
        R("AI.II.L.R2","Aerodynamic stalls."),
        R("AI.II.L.R3","Exceeding aircraft limitations."),
        R("AI.II.L.R4","Improper control inputs."),
        R("AI.II.L.R5","Spatial disorientation.")
      ],
      [
        S("AI.II.L.S1","Deliver instruction on principles of flight."),
        S("AI.II.L.S2","Explain aerodynamic concepts using appropriate terminology."),
        S("AI.II.L.S3","Teach factors affecting aircraft performance and controllability."),
        S("AI.II.L.S4","Explain stall and spin awareness concepts."),
        S("AI.II.L.S5","Relate aerodynamic principles to practical flight operations.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},

{
  id: "IV",
  roman: "IV",
  title: "Fundamentals of Flight",
  phase: "flight",
  tasks: [
    T("A","IV_A","Straight-and-Level Flight","AI.IV.A",
      "Objective: To determine the applicant understands straight-and-level flight, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.IV.A.K1","Elements related to straight-and-level flight."),
        K("AI.IV.A.K2","Pitch, bank, and power relationships."),
        K("AI.IV.A.K3","Trim procedures."),
        K("AI.IV.A.K4","Effects of configuration changes."),
        K("AI.IV.A.K5","Instrument indications."),
        K("AI.IV.A.K6","Division of attention."),
        K("AI.IV.A.K7","Coordination of flight controls.")
      ],
      [
        R("AI.IV.A.R1","Collision hazards."),
        R("AI.IV.A.R2","Loss of aircraft control."),
        R("AI.IV.A.R3","Fixation and omission."),
        R("AI.IV.A.R4","Improper trim usage.")
      ],
      [
        S("AI.IV.A.S1","Deliver instruction on straight-and-level flight."),
        S("AI.IV.A.S2","Maintain coordinated straight-and-level flight."),
        S("AI.IV.A.S3","Demonstrate proper trim technique."),
        S("AI.IV.A.S4","Teach visual scanning techniques."),
        S("AI.IV.A.S5","Explain attitude and power relationships.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","IV_B","Turns","AI.IV.B",
      "Objective: To determine the applicant understands turns, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.IV.B.K1","Types of turns."),
        K("AI.IV.B.K2","Turn coordination."),
        K("AI.IV.B.K3","Effects of bank angle and load factor."),
        K("AI.IV.B.K4","Overbanking tendency."),
        K("AI.IV.B.K5","Adverse yaw."),
        K("AI.IV.B.K6","Turn performance."),
        K("AI.IV.B.K7","Wake turbulence considerations.")
      ],
      [
        R("AI.IV.B.R1","Excessive bank angles."),
        R("AI.IV.B.R2","Loss of coordination."),
        R("AI.IV.B.R3","Collision hazards."),
        R("AI.IV.B.R4","Stall/spin awareness.")
      ],
      [
        S("AI.IV.B.S1","Deliver instruction on turns."),
        S("AI.IV.B.S2","Demonstrate coordinated turns."),
        S("AI.IV.B.S3","Teach rollout lead points."),
        S("AI.IV.B.S4","Explain aerodynamic forces in turns."),
        S("AI.IV.B.S5","Maintain altitude and airspeed within standards.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("C","IV_C","Climbs","AI.IV.C",
      "Objective: To determine the applicant understands climbs, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.IV.C.K1","Types of climbs."),
        K("AI.IV.C.K2","Pitch and power relationships."),
        K("AI.IV.C.K3","Effects of density altitude."),
        K("AI.IV.C.K4","Vy and Vx concepts."),
        K("AI.IV.C.K5","Engine cooling considerations."),
        K("AI.IV.C.K6","Right-turning tendencies.")
      ],
      [
        R("AI.IV.C.R1","Stall awareness."),
        R("AI.IV.C.R2","Traffic conflicts."),
        R("AI.IV.C.R3","Obstacle clearance."),
        R("AI.IV.C.R4","Engine overheating.")
      ],
      [
        S("AI.IV.C.S1","Deliver instruction on climbs."),
        S("AI.IV.C.S2","Demonstrate normal and best-rate climbs."),
        S("AI.IV.C.S3","Teach climb airspeed control."),
        S("AI.IV.C.S4","Explain effects of density altitude."),
        S("AI.IV.C.S5","Maintain directional control.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("D","IV_D","Descents","AI.IV.D",
      "Objective: To determine the applicant understands descents, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.IV.D.K1","Types of descents."),
        K("AI.IV.D.K2","Power and pitch relationships."),
        K("AI.IV.D.K3","Descent planning."),
        K("AI.IV.D.K4","Collision avoidance during descents."),
        K("AI.IV.D.K5","Effects of drag devices.")
      ],
      [
        R("AI.IV.D.R1","Collision hazards."),
        R("AI.IV.D.R2","Excessive airspeed."),
        R("AI.IV.D.R3","Loss of situational awareness.")
      ],
      [
        S("AI.IV.D.S1","Deliver instruction on descents."),
        S("AI.IV.D.S2","Demonstrate normal descents."),
        S("AI.IV.D.S3","Teach descent planning."),
        S("AI.IV.D.S4","Maintain coordinated flight."),
        S("AI.IV.D.S5","Control descent rate and airspeed.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),
  ]
},
{
  id: "V",
  roman: "V",
  title: "Takeoffs, Landings, and Go-Arounds",
  phase: "flight",
  tasks: [
    T("A","V_A","Normal and Crosswind Takeoff and Climb","AI.V.A",
      "Objective: To determine the applicant understands normal and crosswind takeoff and climb procedures, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.V.A.K1","Takeoff principles."),
        K("AI.V.A.K2","Crosswind considerations."),
        K("AI.V.A.K3","Runway conditions."),
        K("AI.V.A.K4","Obstacle clearance."),
        K("AI.V.A.K5","Aircraft configuration."),
        K("AI.V.A.K6","Wake turbulence avoidance.")
      ],
      [
        R("AI.V.A.R1","Runway incursions."),
        R("AI.V.A.R2","Crosswind loss of control."),
        R("AI.V.A.R3","Obstacle conflicts."),
        R("AI.V.A.R4","Improper takeoff configuration.")
      ],
      [
        S("AI.V.A.S1","Deliver instruction on normal and crosswind takeoffs."),
        S("AI.V.A.S2","Demonstrate proper crosswind corrections."),
        S("AI.V.A.S3","Teach runway alignment and directional control."),
        S("AI.V.A.S4","Establish appropriate climb configuration."),
        S("AI.V.A.S5","Maintain proper airspeed and climb profile.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","V_B","Normal and Crosswind Approach and Landing","AI.V.B",
      "Objective: To determine the applicant understands normal and crosswind approach and landing procedures, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.V.B.K1","Approach and landing principles."),
        K("AI.V.B.K2","Crosswind landing techniques."),
        K("AI.V.B.K3","Stabilized approach concepts."),
        K("AI.V.B.K4","Roundout and flare."),
        K("AI.V.B.K5","Go-around considerations."),
        K("AI.V.B.K6","Runway conditions and hazards.")
      ],
      [
        R("AI.V.B.R1","Runway excursions."),
        R("AI.V.B.R2","Crosswind loss of control."),
        R("AI.V.B.R3","Unstable approaches."),
        R("AI.V.B.R4","Wake turbulence.")
      ],
      [
        S("AI.V.B.S1","Deliver instruction on normal and crosswind landings."),
        S("AI.V.B.S2","Demonstrate stabilized approach procedures."),
        S("AI.V.B.S3","Teach crosswind correction techniques."),
        S("AI.V.B.S4","Perform proper flare and touchdown."),
        S("AI.V.B.S5","Maintain directional control during rollout.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("C","V_C","Go-Around/Rejected Landing","AI.V.C",
      "Objective: To determine the applicant understands go-around and rejected landing procedures, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.V.C.K1","Go-around procedures."),
        K("AI.V.C.K2","Reasons for discontinuing an approach."),
        K("AI.V.C.K3","Configuration management."),
        K("AI.V.C.K4","Power application and pitch control."),
        K("AI.V.C.K5","Positive rate and climb considerations.")
      ],
      [
        R("AI.V.C.R1","Loss of aircraft control."),
        R("AI.V.C.R2","Improper configuration."),
        R("AI.V.C.R3","Obstacle and traffic conflicts."),
        R("AI.V.C.R4","Delayed decision-making.")
      ],
      [
        S("AI.V.C.S1","Deliver instruction on go-around procedures."),
        S("AI.V.C.S2","Demonstrate proper go-around technique."),
        S("AI.V.C.S3","Teach configuration changes during go-around."),
        S("AI.V.C.S4","Maintain aircraft control during transition to climb."),
        S("AI.V.C.S5","Establish proper climb attitude and airspeed.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},

{
  id: "VI",
  roman: "VI",
  title: "Performance Maneuvers",
  phase: "flight",
  tasks: [
    T("A","VI_A","Steep Turns","AI.VI.A",
      "Objective: To determine the applicant understands steep turns, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.VI.A.K1","Load factors."),
        K("AI.VI.A.K2","Overbanking tendency."),
        K("AI.VI.A.K3","Coordination of controls."),
        K("AI.VI.A.K4","Performance effects of increased bank."),
        K("AI.VI.A.K5","Division of attention.")
      ],
      [
        R("AI.VI.A.R1","Stall/spin awareness."),
        R("AI.VI.A.R2","Collision hazards."),
        R("AI.VI.A.R3","Loss of altitude control.")
      ],
      [
        S("AI.VI.A.S1","Deliver instruction on steep turns."),
        S("AI.VI.A.S2","Demonstrate coordinated steep turns."),
        S("AI.VI.A.S3","Maintain altitude, airspeed, and bank angle."),
        S("AI.VI.A.S4","Teach division of attention."),
        S("AI.VI.A.S5","Roll out on assigned heading.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","VI_B","Ground Reference Maneuvers","AI.VI.B",
      "Objective: To determine the applicant understands ground reference maneuvers, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.VI.B.K1","Effects of wind drift."),
        K("AI.VI.B.K2","Division of attention."),
        K("AI.VI.B.K3","Coordination of flight controls."),
        K("AI.VI.B.K4","Selection of suitable reference points."),
        K("AI.VI.B.K5","Traffic pattern considerations.")
      ],
      [
        R("AI.VI.B.R1","Collision hazards."),
        R("AI.VI.B.R2","Low altitude maneuvering."),
        R("AI.VI.B.R3","Loss of situational awareness.")
      ],
      [
        S("AI.VI.B.S1","Deliver instruction on ground reference maneuvers."),
        S("AI.VI.B.S2","Demonstrate proper wind correction."),
        S("AI.VI.B.S3","Maintain coordinated flight."),
        S("AI.VI.B.S4","Teach visual division of attention."),
        S("AI.VI.B.S5","Maintain appropriate altitude and airspeed.")
      ],
      ["ASEL","ASES"]
    )
  ]
},

{
  id: "VII",
  roman: "VII",
  title: "Navigation",
  phase: "flight",
  tasks: [
    T("A","VII_A","Pilotage and Dead Reckoning","AI.VII.A",
      "Objective: To determine the applicant understands pilotage and dead reckoning, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.VII.A.K1","Sectional chart interpretation."),
        K("AI.VII.A.K2","Pilotage principles."),
        K("AI.VII.A.K3","Dead reckoning procedures."),
        K("AI.VII.A.K4","Time, speed, and distance calculations."),
        K("AI.VII.A.K5","Wind correction."),
        K("AI.VII.A.K6","Checkpoint selection.")
      ],
      [
        R("AI.VII.A.R1","Navigation errors."),
        R("AI.VII.A.R2","Loss of situational awareness."),
        R("AI.VII.A.R3","Fuel exhaustion."),
        R("AI.VII.A.R4","Weather hazards.")
      ],
      [
        S("AI.VII.A.S1","Deliver instruction on pilotage and dead reckoning."),
        S("AI.VII.A.S2","Teach use of visual checkpoints."),
        S("AI.VII.A.S3","Demonstrate wind correction techniques."),
        S("AI.VII.A.S4","Maintain course within practical test standards."),
        S("AI.VII.A.S5","Teach diversion procedures.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","VII_B","Navigation Systems and Radar Services","AI.VII.B",
      "Objective: To determine the applicant understands navigation systems and radar services, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.VII.B.K1","VOR operations."),
        K("AI.VII.B.K2","GPS operations."),
        K("AI.VII.B.K3","Radar services."),
        K("AI.VII.B.K4","ATC communication procedures."),
        K("AI.VII.B.K5","Navigation system limitations.")
      ],
      [
        R("AI.VII.B.R1","Improper use of navigation equipment."),
        R("AI.VII.B.R2","Loss of situational awareness."),
        R("AI.VII.B.R3","Incorrect interpretation of navigation information.")
      ],
      [
        S("AI.VII.B.S1","Deliver instruction on navigation systems."),
        S("AI.VII.B.S2","Teach proper use of navigation equipment."),
        S("AI.VII.B.S3","Demonstrate radar service procedures."),
        S("AI.VII.B.S4","Maintain situational awareness."),
        S("AI.VII.B.S5","Teach navigation system limitations.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},

{
  id: "VIII",
  roman: "VIII",
  title: "Slow Flight, Stalls, and Spins",
  phase: "flight",
  tasks: [
    T("A","VIII_A","Slow Flight","AI.VIII.A",
      "Objective: To determine the applicant understands slow flight, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.VIII.A.K1","Relationship of angle of attack and airspeed."),
        K("AI.VIII.A.K2","Flight characteristics in slow flight."),
        K("AI.VIII.A.K3","Stall warning indications."),
        K("AI.VIII.A.K4","Coordination of controls."),
        K("AI.VIII.A.K5","Effects of configuration changes.")
      ],
      [
        R("AI.VIII.A.R1","Stall/spin awareness."),
        R("AI.VIII.A.R2","Loss of aircraft control."),
        R("AI.VIII.A.R3","Distractions and task saturation.")
      ],
      [
        S("AI.VIII.A.S1","Deliver instruction on slow flight."),
        S("AI.VIII.A.S2","Demonstrate slow flight procedures."),
        S("AI.VIII.A.S3","Maintain coordinated flight."),
        S("AI.VIII.A.S4","Teach recognition of stall indications."),
        S("AI.VIII.A.S5","Maintain altitude, heading, and airspeed.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("B","VIII_B","Power-Off Stalls","AI.VIII.B",
      "Objective: To determine the applicant understands power-off stalls, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.VIII.B.K1","Aerodynamics of stalls."),
        K("AI.VIII.B.K2","Recognition of stall indications."),
        K("AI.VIII.B.K3","Causes of power-off stalls."),
        K("AI.VIII.B.K4","Recovery procedures."),
        K("AI.VIII.B.K5","Secondary stalls.")
      ],
      [
        R("AI.VIII.B.R1","Loss of aircraft control."),
        R("AI.VIII.B.R2","Stall/spin awareness."),
        R("AI.VIII.B.R3","Excessive altitude loss.")
      ],
      [
        S("AI.VIII.B.S1","Deliver instruction on power-off stalls."),
        S("AI.VIII.B.S2","Demonstrate stall recognition."),
        S("AI.VIII.B.S3","Teach proper recovery procedures."),
        S("AI.VIII.B.S4","Maintain coordination during recovery."),
        S("AI.VIII.B.S5","Avoid secondary stalls.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("C","VIII_C","Power-On Stalls","AI.VIII.C",
      "Objective: To determine the applicant understands power-on stalls, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.VIII.C.K1","Aerodynamics of power-on stalls."),
        K("AI.VIII.C.K2","Recognition of stall indications."),
        K("AI.VIII.C.K3","Causes of power-on stalls."),
        K("AI.VIII.C.K4","Recovery procedures."),
        K("AI.VIII.C.K5","Left-turning tendencies.")
      ],
      [
        R("AI.VIII.C.R1","Loss of aircraft control."),
        R("AI.VIII.C.R2","Stall/spin awareness."),
        R("AI.VIII.C.R3","Improper recovery technique.")
      ],
      [
        S("AI.VIII.C.S1","Deliver instruction on power-on stalls."),
        S("AI.VIII.C.S2","Demonstrate stall recognition."),
        S("AI.VIII.C.S3","Teach proper recovery procedures."),
        S("AI.VIII.C.S4","Maintain coordination during recovery."),
        S("AI.VIII.C.S5","Manage left-turning tendencies.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    ),

    T("D","VIII_D","Spin Awareness","AI.VIII.D",
      "Objective: To determine the applicant understands spin awareness, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.VIII.D.K1","Aerodynamics of spins."),
        K("AI.VIII.D.K2","Spin entry conditions."),
        K("AI.VIII.D.K3","Spin recovery procedures."),
        K("AI.VIII.D.K4","Incipient spins."),
        K("AI.VIII.D.K5","Spin avoidance.")
      ],
      [
        R("AI.VIII.D.R1","Unintentional spins."),
        R("AI.VIII.D.R2","Loss of aircraft control."),
        R("AI.VIII.D.R3","Improper recovery procedures.")
      ],
      [
        S("AI.VIII.D.S1","Deliver instruction on spin awareness."),
        S("AI.VIII.D.S2","Teach spin entry conditions."),
        S("AI.VIII.D.S3","Explain spin recovery procedures."),
        S("AI.VIII.D.S4","Teach spin avoidance."),
        S("AI.VIII.D.S5","Emphasize stall/spin accident prevention.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},
{
  id: "IX",
  roman: "IX",
  title: "Basic Instrument Maneuvers",
  phase: "flight",
  tasks: [
    T("A","IX_A","Basic Instrument Flight","AI.IX.A",
      "Objective: To determine the applicant understands basic instrument flight, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.IX.A.K1","Instrument interpretation."),
        K("AI.IX.A.K2","Attitude instrument flying."),
        K("AI.IX.A.K3","Instrument cross-check."),
        K("AI.IX.A.K4","Control and performance concepts."),
        K("AI.IX.A.K5","Partial panel operations.")
      ],
      [
        R("AI.IX.A.R1","Spatial disorientation."),
        R("AI.IX.A.R2","Fixation and omission."),
        R("AI.IX.A.R3","Loss of aircraft control.")
      ],
      [
        S("AI.IX.A.S1","Deliver instruction on basic instrument flight."),
        S("AI.IX.A.S2","Demonstrate instrument scan techniques."),
        S("AI.IX.A.S3","Teach attitude instrument flying."),
        S("AI.IX.A.S4","Maintain aircraft control by reference to instruments."),
        S("AI.IX.A.S5","Teach recovery from unusual attitudes.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},
{
  id: "X",
  roman: "X",
  title: "Emergency Operations",
  phase: "flight",
  tasks: [
    T("A","X_A","Emergency Approach and Landing","AI.X.A",
      "Objective: To determine the applicant understands emergency approach and landing procedures, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.X.A.K1","Emergency procedures."),
        K("AI.X.A.K2","Emergency landing site selection."),
        K("AI.X.A.K3","Glide performance."),
        K("AI.X.A.K4","Checklist usage."),
        K("AI.X.A.K5","Emergency communications.")
      ],
      [
        R("AI.X.A.R1","Collision hazards."),
        R("AI.X.A.R2","Low altitude maneuvering."),
        R("AI.X.A.R3","Improper emergency procedures."),
        R("AI.X.A.R4","Task saturation.")
      ],
      [
        S("AI.X.A.S1","Deliver instruction on emergency procedures."),
        S("AI.X.A.S2","Demonstrate emergency approach procedures."),
        S("AI.X.A.S3","Teach emergency landing site selection."),
        S("AI.X.A.S4","Use emergency checklists."),
        S("AI.X.A.S5","Maintain aircraft control throughout the maneuver.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
},
{
  id: "XI",
  roman: "XI",
  title: "Multiengine Operations",
  phase: "flight",
  tasks: [
    T("A","XI_A","Multiengine Operations","AI.XI.A",
      "Objective: To determine the applicant understands multiengine operations, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.XI.A.K1","Critical engine."),
        K("AI.XI.A.K2","VMC factors."),
        K("AI.XI.A.K3","Single-engine performance."),
        K("AI.XI.A.K4","Engine-out procedures."),
        K("AI.XI.A.K5","Feathering procedures.")
      ],
      [
        R("AI.XI.A.R1","Loss of directional control."),
        R("AI.XI.A.R2","VMC rollover."),
        R("AI.XI.A.R3","Improper engine-out procedures.")
      ],
      [
        S("AI.XI.A.S1","Deliver instruction on multiengine operations."),
        S("AI.XI.A.S2","Demonstrate engine-out procedures."),
        S("AI.XI.A.S3","Teach VMC concepts."),
        S("AI.XI.A.S4","Maintain directional control."),
        S("AI.XI.A.S5","Teach single-engine performance considerations.")
      ],
      ["AMEL","AMES"]
    )
  ]
},

{
  id: "XII",
  roman: "XII",
  title: "Postflight Procedures",
  phase: "flight",
  tasks: [
    T("A","XII_A","Postflight Procedures","AI.XII.A",
      "Objective: To determine the applicant understands postflight procedures, can apply that knowledge, manage associated risks, demonstrate appropriate skills, and provide effective instruction.",
      [
        K("AI.XII.A.K1","Aircraft securing procedures."),
        K("AI.XII.A.K2","Postflight inspections."),
        K("AI.XII.A.K3","Maintenance discrepancy reporting."),
        K("AI.XII.A.K4","Shutdown procedures.")
      ],
      [
        R("AI.XII.A.R1","Failure to secure aircraft."),
        R("AI.XII.A.R2","Failure to identify discrepancies."),
        R("AI.XII.A.R3","Ramp hazards.")
      ],
      [
        S("AI.XII.A.S1","Deliver instruction on postflight procedures."),
        S("AI.XII.A.S2","Demonstrate aircraft shutdown and securing procedures."),
        S("AI.XII.A.S3","Teach postflight inspection procedures."),
        S("AI.XII.A.S4","Identify and report maintenance discrepancies."),
        S("AI.XII.A.S5","Maintain safety during ramp operations.")
      ],
      ["ASEL","ASES","AMEL","AMES"]
    )
  ]
}
  ]



