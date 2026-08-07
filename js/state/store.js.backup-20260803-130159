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
  appFTN: '',
  appDMS: '',
  appGroundDuration: '',
  appFlightDuration: '',
  appRetest: 'No'
};

export const store = {
  applicant: { ...defaultApplicant },
  activeAreaId: null,
  activeView: 'detailed',
  grades: {},
  checkedElements: {},
  expandedTasks: {},
  eligibility: {},
  checklists: {},
  examinerNotes: {},
  outcomeNotes: '',

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
  store.grades[`${taskCode}.${gradeType}`] = value;
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
  store.applicant = { ...defaultApplicant };
  store.activeAreaId = null;
  store.activeView = 'detailed';
  store.grades = {};
  store.checkedElements = {};
  store.expandedTasks = {};
  store.eligibility = {};
  store.checklists = {};
  store.examinerNotes = {};
  store.outcomeNotes = '';

  // reset ACS Code Decoder selections
  store.selectedAcsCodes = [];

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