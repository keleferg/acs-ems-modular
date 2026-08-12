export const defaultApplicant = {
  appName: '',
  appDate: new Date().toISOString().slice(0, 10),
  appSchool: '',
  appCertificate: 'Private',
  appRating: 'ASEL',
  appExamType: 'Initial',
  appRatingHeld: '',
  appAmelInstrument: '',
  appAircraftType: '',
  appNNumber: '',
  appExaminer: 'Fergerstrom, Kele',
  appInstructor: '',
  appInstructorEmail: '',
  appEmail: '',
  appFTN: '',
  appDMS: '',
  practicalTestRequestId: '',
  requestNumber: '',
  scheduledStartAt: '',
  scheduledEndAt: '',
  scheduledLocation: '',
  appGroundDuration: '',
  appFlightDuration: '',
  appRetest: 'No'
};

export const store = {
  applicant: { ...defaultApplicant },
  activeAreaId: null,
  activeView: 'detailed',
  grades: {},

  /*
   * Reason codes for Detailed View / Flight K-R-S grades.
   * Keys match store.grades keys, such as PA.II.B.K.
   */
  gradeReasons: {},

  /*
   * Reason codes for individual Oral Portion questions.
   * Keys match store.oralQuestionGrades keys, such as PA.I.A.K1.
   */
  oralGradeReasons: {},

  checkedElements: {},
  expandedTasks: {},
  eligibility: {},
  checklists: {},
  examinerNotes: {},
  outcomeNotes: '',

  /*
   * Individual Oral / Flight Portion question grades.
   *
   * Keys are full ACS element codes such as PA.I.A.K1.
   * Parent task grades remain in store.grades.
   */
  oralQuestionGrades: {},

  // ACS Code Decoder selections
  selectedAcsCodes: []
};

const listeners = new Set();

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notify() {
  listeners.forEach(listener => listener(store));
}

export function updateApplicant(field, value) {
  store.applicant[field] = value;
  notify();
}

export function setActiveArea(areaId) {
  store.activeAreaId = areaId;
  notify();
}

export function setActiveView(view) {
  store.activeView = view;
  notify();
}

export function setGrade(taskCode, gradeType, value) {
  const gradeKey = `${taskCode}.${gradeType}`;

  store.grades[gradeKey] = value;
  store.gradeReasons ??= {};

  /*
   * Reason codes apply only to grades 1 and 2.
   * Clear any stale reason selections when the grade changes to
   * 3, 4, or NP.
   */
  if (!['1', '2'].includes(String(value))) {
    delete store.gradeReasons[gradeKey];
  }

  notify();
}

export function getGrade(taskCode, gradeType) {
  return store.grades[`${taskCode}.${gradeType}`] ?? 'NP';
}

export function toggleTask(taskCode, force) {
  store.expandedTasks[taskCode] =
    typeof force === 'boolean' ? force : !store.expandedTasks[taskCode];

  notify();
}

export function resetStore() {
  /*
   * Completely rebuild the evaluation state in place.
   *
   * The store object itself must remain the same object because other
   * modules hold a reference to it. Deleting and rebuilding its
   * properties clears both the original fields and any dynamically
   * added evaluation fields.
   *
   * Supabase authentication is not stored in this object and is
   * therefore preserved.
   */
  for (const key of Object.keys(store)) {
    delete store[key];
  }

  Object.assign(store, {
    applicant: { ...defaultApplicant },
    activeAreaId: null,
    activeView: 'detailed',

    grades: {},
    gradeReasons: {},
    oralGradeReasons: {},
    checkedElements: {},
    expandedTasks: {},

    eligibility: {},
    eligibilityChecks: {},
    expandedEligibilitySections: {},

    checklists: {},
    requiredBriefings: {},
    expandedBriefings: {},

    examinerNotes: {},
    outcomeNotes: '',
    oralQuestionGrades: {},
    practicalTestOutcome: '',
    discontinuanceManuallySelected: false,

    selectedAcsCodes: [],
    retestSelectedTasks: [],

    scenarioState: {},
    scenarioAnswers: {},
    selectedScenario: null,

    testingComplete: false
  });

  notify();
}

export function setTaskComplete(taskCode, value) {
  store.checkedElements[taskCode] = value;
  notify();
}

export function isTaskComplete(taskCode) {
  return store.checkedElements[taskCode] || false;
}

/* =====================================================
   ACS CODE DECODER STATE
   ===================================================== */

export function toggleAcsCode(code) {
  if (!code) return;

  if (store.selectedAcsCodes.includes(code)) {
    store.selectedAcsCodes = store.selectedAcsCodes.filter(c => c !== code);
  } else {
    store.selectedAcsCodes.push(code);
  }

  notify();
}

export function selectAcsCode(code) {
  if (!code) return;

  if (!store.selectedAcsCodes.includes(code)) {
    store.selectedAcsCodes.push(code);
    notify();
  }
}

export function deselectAcsCode(code) {
  if (!code) return;

  store.selectedAcsCodes = store.selectedAcsCodes.filter(c => c !== code);
  notify();
}

export function isAcsCodeSelected(code) {
  return store.selectedAcsCodes.includes(code);
}

export function clearSelectedAcsCodes() {
  store.selectedAcsCodes = [];
  notify();
}