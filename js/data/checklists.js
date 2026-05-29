export const CHECKLIST_DATA = [
{ id: "eligibility", title: "Eligibility Checklist", icon: "fa-user-check", items: [
"Verify that the Examiner is current and qualified to conduct the test",
{ text: "Welcome and make introductions", children: ["Facilities overview", "Privacy, Exits", "Restrooms", "Water, snacks"] },
"Telephones off",
"Confirm type of practical test and if a retest",
{ text: "Qualify the applicant", children: ["Application (8710-1)", "Photo/signature Identification (Note type on 8710-1 and return)", "Airman Certificate", "Medical (note date and limitations)", "Foreign License and Letter of Verification of Authenticity (if applicable)", "Knowledge test results and review endorsement (if needed)", "Pilot logbook and/or training records", "Verify flight times and endorsements"] },
"Discuss Pilots Bill of Rights",
"Applicant signs IACRA 8710",
{ text: "Qualify the aircraft", children: ["Review maintenance records per Order 8900.1", "Instrument or ATP Check - GPS Nav Database must be current", "Review currently inoperative equipment"] }
]},
{ id: "pretest", title: "Pretest Briefing", icon: "fa-bullhorn", items: [
{ text: "Advise applicant that:", children: ["The test will be done in accordance with the FAA ACS(s) and FAA Order 8900.1", "Also will use Plan of Action (describe what it is)", "Will be taking notes during test for debriefing", "Note that perfection is not the standard", "Oral questioning will be continued throughout all portions of the test"] },
{ text: "Discuss three possible outcomes", children: ["Temporary certificate", { text: "Letter of discontinuance", sub: ["Conditions leading to letter of discontinuance"] }, { text: "Notice of Disapproval", sub: ["Conditions leading to disapproval"] }] },
{ text: "Any questions before we begin the test?", children: ["Then announce the test has begun"] }
]},
{ id: "preflight", title: "Preflight Briefing", icon: "fa-plane-departure", items: [
"Brief the flight profile (overall scenario)",
{ text: "Applicant remains PIC under 14 CFR Part 61.47 during entire flight", children: ["Exercise PIC authority at all times", "Focus on normal operations"] },
{ text: "Simulated emergencies", children: ["DPE action/announcement", "Engine failure - takeoff and landing"] },
{ text: "Other emergencies", children: ["Feathering", "Actual emergencies", "Engine failure"] },
"Transfer of controls (Three step process)",
{ text: "Collision avoidance (air and ground)", children: ["Looking for reported and unreported traffic", "Clearing prior to maneuvering", "Primary responsibility",] },
{ text: "Preflight duties", children: ["Provide Weight and balance for this specific flight", "Provide Performance for this specific flight"] },
{ text: "Oral questions will continue throughout the test", children: ["Testing with POA will continue IAW ACS(s)"] },
{ text: "Will continue to take notes", children: ["Continue/discontinue if task is unsatisfactory", "Any questions? Are you ready for the flight evaluation?"] },
"Return aircraft documents to the aircraft",
"Observe entire pre-flight preparation and pre-flight inspection (refer to overall scenario and/or scenario triggers for topic questions)"
]},
{ id: "postflight", title: "Post Flight Briefing", icon: "fa-plane-arrival", items: [
{ text: "Ensure that applicant is debriefed in private (Encourage the recommending instructor to be present)", children: ["Reaffirm the outcome of the test", "Use notes taken to debrief performance (Highlight areas that were above standard)"] },
{ text: "Satisfactory practical test outcome", group: "satisfactory", children: ["Complete paperwork", "Have the airman sign the temporary certificate", "Advise that temporary is valid for 120 days", "What to do if certificate is not received", "Offer to sign airman's logbook"] },
{ text: "Unsatisfactory practical test outcome", group: "unsatisfactory", children: ["Allow the applicant time alone while paperwork is completed", "Use the ACS to explain reasons for disapproval", "Advise the applicant of timeframe to retest and to keep the Notice of Disapproval", "Return the knowledge test to the airman if it was provided (if applicable)", "Offer to sign the airman's logbook (not required)"] },
{ text: "Letter of Discontinuance", group: "discontinuance", children: ["Review items that need to be completed", "Return the knowledge test to the airman (if applicable)", "Advise timeframe to retest and to keep Letter of Discontinuance", "Offer to sign the airman's logbook"] }
]}
];
