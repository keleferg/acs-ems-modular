// Every practical test uses this oral timeline structure. Content is test-specific.
export const EVENT_SET_SEQUENCE = [
  { code: "PREFLIGHT_PREPARATION", name: "Preflight Preparation", maxQuestionCount: 60 },
  { code: "PREFLIGHT_PROCEDURES", name: "Preflight Procedures", maxQuestionCount: 15 },
  { code: "ENGINE_START_TAXI", name: "Engine Start / Taxi", maxQuestionCount: 15 },
  { code: "TAKEOFF_CLIMB", name: "Takeoff / Climb", maxQuestionCount: 15 },
  { code: "CRUISE", name: "Cruise", maxQuestionCount: 15 },
  { code: "DESCENT", name: "Descent", maxQuestionCount: 15 },
  { code: "APPROACH_LANDING", name: "Approach and Landing", maxQuestionCount: 15 },
  { code: "AFTER_LANDING_SECURE", name: "After Landing / Securing", maxQuestionCount: 15 },
] as const;
