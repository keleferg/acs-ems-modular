// The oral event sets, in order, with the number of questions each should
// hold. The POA generator reads these from poa_event_sets (is_active,
// exam_section "oral", sort_order, minimum_question_count); this copy is
// only for the local design preview.
export const EVENT_SET_SEQUENCE = [
  { code: "PREFLIGHT_PREPARATION", name: "Preflight Preparation", maxQuestionCount: 60 },
  { code: "PREFLIGHT_PROCEDURES", name: "Preflight Procedures", maxQuestionCount: 30 },
  { code: "ENGINE_START_TAXI", name: "Engine Start", maxQuestionCount: 15 },
  { code: "TAXI_BEFORE_TAKEOFF", name: "Taxi & Before Takeoff", maxQuestionCount: 15 },
  { code: "TAKEOFF_CLIMB", name: "Takeoff & Climb", maxQuestionCount: 15 },
  { code: "CRUISE", name: "Cruise", maxQuestionCount: 15 },
  { code: "DESCENT", name: "Descent", maxQuestionCount: 15 },
  { code: "APPROACH_LANDING", name: "Approach & Landing", maxQuestionCount: 15 },
  { code: "AFTER_LANDING_SECURE", name: "After Landing & Postflight Procedures", maxQuestionCount: 15 },
] as const;
