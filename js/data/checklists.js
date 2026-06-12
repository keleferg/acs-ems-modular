export const CHECKLIST_DATA = [
  {
    id: "eligibility",
    title: "Eligibility Checklist",
    icon: "fa-user-check",
    items: [
      {
        text: "Verify that the Examiner is current and qualified to conduct the test",
        indent: 0
      },
      {
        text: "Welcome and make introductions",
        indent: 0
      },
      {
        text: "Facilities overview",
        indent: 1
      },
      {
        text: "Privacy, Exits",
        indent: 1
      },
      {
        text: "Restrooms",
        indent: 1
      },
      {
        text: "Water, snacks",
        indent: 1
      },
      {
        text: "Telephones off",
        indent: 0
      },
      {
        text: "Confirm type of practical test and if a retest",
        indent: 0
      },
      {
        text: "Qualify the applicant",
        indent: 0
      },
      {
        text: "Application (8710-1)",
        indent: 1
      },
      {
        text: "Photo/signature Identification (Note type on 8710-1 and return)",
        indent: 1
      },
      {
        text: "Airman Certificate",
        indent: 1
      },
      {
        text: "Medical (note date and limitations)",
        indent: 1
      },
      {
        text: "Foreign License and Letter of Verification of Authenticity (if applicable)",
        indent: 1
      },
      {
        text: "Knowledge test results and review endorsement (if needed)",
        indent: 1
      },
      {
        text: "Pilot logbook and/or training records",
        indent: 1
      },
      {
        text: "Verify flight times and endorsements",
        indent: 1
      },
      {
        text: "Discuss Pilots Bill of Rights",
        indent: 0
      },
      {
        text: "Applicant signs IACRA 8710",
        indent: 0
      },
      {
        text: "Qualify the aircraft",
        indent: 0
      },
      {
        text: "Review maintenance records per Order 8900.1",
        indent: 1
      },
      {
        text: "Instrument or ATP Check - GPS Nav Database must be current",
        indent: 1
      },
      {
        text: "Review currently inoperative equipment",
        indent: 1
      }
    ]
  },
  {
    id: "pretest",
    title: "Pretest Briefing",
    icon: "fa-bullhorn",
    items: [
      {
        text: "Advise applicant that:",
        indent: 0
      },
      {
        text: "The test will be done in accordance with the FAA ACS(s) and FAA Order 8900.1",
        indent: 1
      },
      {
        text: "Also will use Plan of Action (describe what it is)",
        indent: 1
      },
      {
        text: "Will be taking notes during test for debriefing",
        indent: 1
      },
      {
        text: "Note that perfection is not the standard",
        indent: 1
      },
      {
        text: "Oral questioning will be continued throughout all portions of the test",
        indent: 1
      },
      {
        text: "Discuss three possible outcomes",
        indent: 0
      },
      {
        text: "Temporary certificate",
        indent: 1
      },
      {
        text: "Letter of discontinuance",
        indent: 1
      },
      {
        text: "Conditions leading to letter of discontinuance",
        indent: 2
      },
      {
        text: "Notice of Disapproval",
        indent: 1
      },
      {
        text: "Conditions leading to disapproval",
        indent: 2
      },
      {
        text: "Any questions before we begin the test?",
        indent: 0
      },
      {
        text: "Then announce the test has begun",
        indent: 1
      }
    ]
  },
  {
    id: "preflight",
    title: "Preflight Briefing",
    icon: "fa-plane-departure",
    items: [
      {
        text: "Brief the flight profile (overall scenario)",
        indent: 0
      },
      {
        text: "Applicant remains PIC under 14 CFR Part 61.47 during entire flight",
        indent: 0
      },
      {
        text: "Exercise PIC authority at all times",
        indent: 1
      },
      {
        text: "Focus on normal operations",
        indent: 1
      },
      {
        text: "Simulated emergencies",
        indent: 0
      },
      {
        text: "DPE action/announcement",
        indent: 1
      },
      {
        text: "Engine failure - takeoff and landing",
        indent: 1
      },
      {
        text: "Other emergencies",
        indent: 0
      },
      {
        text: "Feathering",
        indent: 1
      },
      {
        text: "Actual emergencies",
        indent: 1
      },
      {
        text: "Engine failure",
        indent: 1
      },
      {
        text: "Transfer of controls (Three step process)",
        indent: 0
      },
      {
        text: "Collision avoidance (air and ground)",
        indent: 0
      },
      {
        text: "Looking for reported and unreported traffic",
        indent: 1
      },
      {
        text: "Clearing prior to maneuvering",
        indent: 1
      },
      {
        text: "Primary responsibility",
        indent: 1
      },
      {
        text: "Preflight duties",
        indent: 0
      },
      {
        text: "Provide Weight and balance for this specific flight",
        indent: 1
      },
      {
        text: "Provide Performance for this specific flight",
        indent: 1
      },
      {
        text: "Oral questions will continue throughout the test",
        indent: 0
      },
      {
        text: "Testing with POA will continue IAW ACS(s)",
        indent: 1
      },
      {
        text: "Will continue to take notes",
        indent: 0
      },
      {
        text: "Continue/discontinue if task is unsatisfactory",
        indent: 1
      },
      {
        text: "Any questions? Are you ready for the flight evaluation?",
        indent: 1
      },
      {
        text: "Return aircraft documents to the aircraft",
        indent: 0
      },
      {
        text: "Observe entire pre-flight preparation and pre-flight inspection (refer to overall scenario and/or scenario triggers for topic questions)",
        indent: 0
      }
    ]
  },
  {
    id: "postflight",
    title: "Post Flight Briefing",
    icon: "fa-plane-arrival",
    items: [
      {
        text: "Ensure that applicant is debriefed in private (Encourage the recommending instructor to be present)",
        indent: 0
      },
      {
        text: "Reaffirm the outcome of the test",
        indent: 1
      },
      {
        text: "Use notes taken to debrief performance (Highlight areas that were above standard)",
        indent: 1
      },
      {
        text: "Satisfactory practical test outcome",
        indent: 0,
        group: "satisfactory"
      },
      {
        text: "Complete paperwork",
        indent: 1,
        group: "satisfactory"
      },
      {
        text: "Have the airman sign the temporary certificate",
        indent: 1,
        group: "satisfactory"
      },
      {
        text: "Advise that temporary is valid for 120 days",
        indent: 1,
        group: "satisfactory"
      },
      {
        text: "What to do if certificate is not received",
        indent: 1,
        group: "satisfactory"
      },
      {
        text: "Offer to sign airman's logbook",
        indent: 1,
        group: "satisfactory"
      },
      {
        text: "Unsatisfactory practical test outcome",
        indent: 0,
        group: "unsatisfactory"
      },
      {
        text: "Allow the applicant time alone while paperwork is completed",
        indent: 1,
        group: "unsatisfactory"
      },
      {
        text: "Use the ACS to explain reasons for disapproval",
        indent: 1,
        group: "unsatisfactory"
      },
      {
        text: "Advise the applicant of timeframe to retest and to keep the Notice of Disapproval",
        indent: 1,
        group: "unsatisfactory"
      },
      {
        text: "Return the knowledge test to the airman if it was provided (if applicable)",
        indent: 1,
        group: "unsatisfactory"
      },
      {
        text: "Offer to sign the airman's logbook (not required)",
        indent: 1,
        group: "unsatisfactory"
      },
      {
        text: "Letter of Discontinuance",
        indent: 0,
        group: "discontinuance"
      },
      {
        text: "Review items that need to be completed",
        indent: 1,
        group: "discontinuance"
      },
      {
        text: "Return the knowledge test to the airman (if applicable)",
        indent: 1,
        group: "discontinuance"
      },
      {
        text: "Advise timeframe to retest and to keep Letter of Discontinuance",
        indent: 1,
        group: "discontinuance"
      },
      {
        text: "Offer to sign the airman's logbook",
        indent: 1,
        group: "discontinuance"
      }
    ]
  }
];