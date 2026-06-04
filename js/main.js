const $ = id => document.getElementById(id);

let modules = {};
let store = null;
let scenarioRendered = false;

const STORAGE_KEY = 'acs_ems_autosave_v1';

function saveToLocalStorage() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(store)
    );
  } catch (err) {
    console.error('Autosave failed:', err);
  }
}

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    const parsed = JSON.parse(saved);

    if (parsed && store) {
      Object.assign(store, parsed);
    }
  } catch (err) {
    console.error('Restore failed:', err);
  }
}

function clearLocalStorageSave() {
  localStorage.removeItem(STORAGE_KEY);
}

const SUBMIT_FLOW_URL =
  'https://default59acb2f988f145c3981040caf9cf42.11.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/6b4230f895f5468d934935b8be9aeba5/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=pLQc99dLY0-biKgS_ZPL-3n4P1bxr2Oexe6mDQLuhsI';

const APPLICANT_LOOKUP_FLOW_URL =
  'https://default59acb2f988f145c3981040caf9cf42.11.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/653a41bf573e4ea0a2a0977f4dec8f10/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=y1FfozAa2FkMgqY2QlUqXxpHyWhfWk6tpjm1LFX4Vbk';

const REQUIRED_BRIEFINGS = [
  {
    id: 'establishEligibility',
    title: 'Establish Eligibility',
    items: [
      'Welcome and make introductions',
      'Facilities overview',
      'Privacy, exits',
      'Restrooms',
      'Water, snacks',
      'Telephones off',
      'Confirm type of practical test and if a retest',
      'Qualify the applicant',
      'Application (8710-1)',
      'Photo/signature Identification (note type on 8710-1 and return)',
      'Airman Certificate',
      'Medical (note date and limitations)',
      'Foreign License and Letter of Verification of Authenticity, if applicable',
      'Knowledge test results and review endorsement, if needed',
      'Pilot logbook and/or training records',
      'Verify flight times and endorsements',
      'Applicant signs IACRA 8710',
      'Qualify the aircraft',
      'Review maintenance records per Order 8900.2',
      'Instrument or ATP current NavData',
      'Inoperative equipment'
    ]
  },
  {
    id: 'pretestBriefing',
    title: 'Pretest Briefing',
    items: [
      'Current navigational charts and/or current NavData on Electronic Flight Bag',
      'The test will be done in accordance with the FAA ACS(s) and FAA Order 8900.2',
      'Plan of Action will be used',
      'Will be taking notes during test for debriefing',
      'Perfection is not the standard',
      'Oral questioning will continue throughout all portions of the test',
      'Three possible outcomes',
      'Temporary certificate',
      'Letter of discontinuance',
      'Conditions leading to letter of discontinuance',
      'Notice of disapproval',
      'Conditions leading to disapproval',
      'Any questions before we begin the test?',
      'Announce: “The test has begun”'
    ]
  },
  {
    id: 'preflightBriefing',
    title: 'Preflight Briefing',
    items: [
      'Brief flight profile / overall scenario',
      'Applicant remains PIC under 14 CFR §61.47 during entire flight',
      'Discuss actual instrument conditions, if applicable',
      'Simulated emergencies',
      'DPE action / announcement',
      'Engine failure — takeoff and landing',
      'Other simulated emergencies',
      'Feathering, if applicable',
      'Actual emergencies',
      'Actual engine failure',
      'Other actual emergencies',
      'Transfer of controls — brief how it will be done',
      'Collision avoidance — air and ground',
      'Looking for reported and unreported traffic',
      'Clearing prior to maneuvering',
      'Primary responsibility',
      'Preflight duties',
      'Weight and balance',
      'Performance',
      'First flight of day',
      'VFR / IFR requirements',
      'Aircraft systems',
      'MEL / KOEL / inoperative equipment',
      'Oral questions will continue throughout the test',
      'Focus on normal operations',
      'Exercise PIC authority at all times',
      'Testing with POA will continue IAW ACS(s)',
      'Will continue to take notes',
      'Continue / discontinue if task is unsatisfactory',
      'Any questions?',
      'Are you ready for the flight evaluation?',
      'Return aircraft documents to the aircraft',
      'Observe entire preflight preparation and preflight inspection'
    ]
  },
  {
    id: 'postFlightBriefing',
    title: 'Post Flight Briefing',
    items: [
      'Ensure applicant is debriefed in private',
      'Encourage recommending instructor to be present',
      'Reaffirm the outcome of the test',
      'Use notes taken to debrief performance',
      'Highlight areas that were above standard'
    ],
    groups: [
      {
        id: 'satisfactory',
        title: 'Satisfactory Outcome',
        outcome: 'SATISFACTORY',
        items: [
          'Complete paperwork',
          'Have airman sign temporary certificate',
          'Advise temporary certificate is valid for 120 days',
          'Explain what to do if certificate is not received',
          'Offer to sign airman’s logbook'
        ]
      },
      {
        id: 'unsatisfactory',
        title: 'Unsatisfactory Outcome',
        outcome: 'UNSATISFACTORY',
        items: [
          'Allow applicant time alone while paperwork is completed',
          'Use ACS to explain reasons for disapproval',
          'Advise timeframe to retest and keep Notice of Disapproval',
          'Return knowledge test, if applicable',
          'Offer to sign airman’s logbook, not required'
        ]
      },
      {
        id: 'discontinuance',
        title: 'Letter of Discontinuance',
        outcome: 'DISCONTINUANCE',
        items: [
          'Review items that need to be completed',
          'Return knowledge test, if applicable',
          'Advise timeframe to retest and keep Letter of Discontinuance',
          'Offer to sign airman’s logbook'
        ]
      }
    ]
  }
];

document.addEventListener('DOMContentLoaded', async () => {
  wireEmergencyStartup();

  try {
    await loadModules();
    initApp();
  } catch (error) {
    console.error('EMS failed to fully load:', error);
    alert('The app shell loaded, but one or more JavaScript modules failed. Open Console for details.');
  }
});

function wireEmergencyStartup() {
  $('ctaBegin')?.addEventListener('click', () => {
    $('landingPage')?.classList.add('fade-out');
    document.body.classList.remove('show-landing');

    setTimeout(() => {
      $('landingPage')?.classList.add('hidden');
    }, 300);
  });

  // NEW BUTTON
  $('viewStatsBtn')?.addEventListener('click', () => {
    window.location.href = './statistics.html';
  });

  $('btnMainMenu')?.addEventListener('click', () => {
    $('landingPage')?.classList.remove('hidden', 'fade-out');
    document.body.classList.add('show-landing');
  });

  $('hamburgerBtn')?.addEventListener('click', () => {
    $('sidebar')?.classList.toggle('open');
    $('sidebarOverlay')?.classList.toggle('show');
  });

  $('sidebarOverlay')?.addEventListener('click', () => {
    $('sidebar')?.classList.remove('open');
    $('sidebarOverlay')?.classList.remove('show');
  });

  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.view-content').forEach(view => view.classList.remove('active'));

      const viewName = tab.dataset.view;
      const viewId = `view${viewName[0].toUpperCase()}${viewName.slice(1)}`;
      $(viewId)?.classList.add('active');
    });
  });
}

async function loadModules() {
  const [
    dataModule,
    storeModule,
    configModule,
    filteringModule,
    gradingModule,
    headerModule,
    sidebarModule,
    detailedModule,
    summaryModule,
    debriefModule,
    outcomeModule,
    checklistModule,
    exportModule
  ] = await Promise.all([
    import('./data/index.js'),
    import('./state/store.js'),
    import('./config/config.js'),
    import('./logic/filtering.js'),
    import('./logic/grading.js'),
    import('./views/headerView.js'),
    import('./views/sidebarView.js'),
    import('./views/detailedView.js'),
    import('./views/summaryView.js'),
    import('./views/debriefView.js'),
    import('./views/outcomeView.js'),
    import('./views/checklistView.js'),
    import('./services/exportService.js')
  ]);

  modules = {
    ...dataModule,
    ...storeModule,
    ...configModule,
    ...filteringModule,
    ...gradingModule,
    ...headerModule,
    ...sidebarModule,
    ...detailedModule,
    ...summaryModule,
    ...debriefModule,
    ...outcomeModule,
    ...checklistModule,
    ...exportModule
  };

  store = modules.store;

  try {
    const scenarioModule = await import('./views/scenarioView.js');
    modules.renderScenarioEngine = scenarioModule.renderScenarioEngine;
    modules.setScenarioDetailedRenderer?.(modules.renderDetailed);
  } catch (error) {
    console.warn('Scenario engine did not load. App will continue without it.', error);
  }
}

function initApp() {
  ensureStoreDefaults();

  loadFromLocalStorage();

  ensureStoreDefaults();

  populateRatingDropdown();
  wireFullAppEvents();

  modules.bindApplicantForm?.(store, {
    onApplicantChange: handleApplicantChange
  });

  modules.subscribe?.(() => {
    saveToLocalStorage();
    renderApp();
  });

  renderApp();
}

function ensureStoreDefaults() {
  store.applicant ??= {};
  store.applicant.appCertificate ??= 'Private';
  store.applicant.appRating ??= 'ASEL';
  store.applicant.appAircraftClassUsed ??= 'ASEL';
  store.applicant.appExamType ??= 'Initial';
  store.applicant.appRatingHeld ??= '';
  store.applicant.appAmelInstrument ??= '';
  store.showAllTasksReferenceMode ??= false;
  

  store.checkedElements ??= {};
  store.grades ??= {};
  store.expandedTasks ??= {};
  store.examinerNotes ??= {};
  store.outcomeNotes ??= '';
  store.selectedScenario ??= 'Scenario 1';
  store.activeView ??= 'detailed';
  store.selectedAcsCodes ??= [];
  store.acsDecoderOpen ??= false;

  store.requiredBriefings ??= {};
  store.expandedBriefings ??= {};
  store.eligibilityChecks ??= {};
  store.expandedEligibilitySections ??= {};
  store.practicalTestOutcome ??= '';
}

function formatRatingLabel(rating) {
  const labels = {
    ASEL: 'ASEL',
    AMEL: 'AMEL',
    ASES: 'ASES',
    AMES: 'AMES',
    GLIDER: 'Glider',
    'Instrument Airplane': 'Instrument Airplane'
  };

  return labels[rating] || rating;
}

function populateRatingDropdown() {
  const certificate = store.applicant.appCertificate || 'Private';
  const cfg = modules.CERT_CONFIG?.[certificate];
  const ratingSelect = $('appRating');

  if (!cfg || !ratingSelect) return;

  ratingSelect.disabled = certificate === 'Instrument';

  ratingSelect.innerHTML = cfg.ratings
    .map(rating => `<option value="${rating}">${formatRatingLabel(rating)}</option>`)
    .join('');

  if (!cfg.ratings.includes(store.applicant.appRating)) {
    store.applicant.appRating = cfg.ratings[0];
  }

  ratingSelect.value = store.applicant.appRating;
}

async function lookupApplicantByDMS() {
  console.log('Lookup button clicked');

  const dms = $('appDMS')?.value?.trim();

  if (!dms) {
    alert('Enter a DMS Preapproval Number first.');
    return;
  }

  const button = $('btnLookupApplicant');
  const originalText = button?.innerHTML;

  try {
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Looking up...';
    }

    const response = await fetch(APPLICANT_LOOKUP_FLOW_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ searchValue: dms })
    });

    if (!response.ok) {
      throw new Error(`Lookup failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.found === false || data.found === 'False') {
      alert('No applicant found for that DMS Preapproval Number.');
      return;
    }

    const applicant =
      typeof data.applicant === 'string'
        ? JSON.parse(data.applicant)
        : data.applicant;

    applyApplicantLookupData(applicant || data);

    

    modules.notify();

  } catch (error) {
    console.error(error);
    alert('Applicant lookup failed. Check the Power Automate run history and browser console.');
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }
}


  function applyApplicantLookupData(data) {
  const certificateValue =
    data.RatingSought?.Value === 'Instrument'
      ? 'Instrument'
      : ({
          'Private Pilot': 'Private',
          'Instrument Rating': 'Instrument',
          'Commercial Pilot': 'Commercial',
          'Airline Transport Pilot': 'ATP',
          'Flight Instructor': 'CFI'
        }[data.GradeofCertificateSought?.Value] ||
        data.GradeofCertificateSought?.Value);

  const examTypeValue =
    ({
      'Original Issuance': 'Initial',
      'Additional Rating': 'Additional'
    }[data.IssuanceType?.Value] ||
    data.IssuanceType?.Value);

  const fieldMap = {
    appName: data.appName || data.Name,
    appDate: data.appDate || data.FinalizedDateandTime?.slice(0, 10),
    appSchool: data.appSchool || data.FlightSchool?.Value || data.FlightSchool,
    appCertificate: certificateValue,
    appRating: data.appRating || data.RatingSought?.Value,
    appExamType: examTypeValue,
    appAircraftType: data.appAircraftType || data.TypeofAircraft,
    appInstructor: data.appInstructor || data.RecommendingInstructorName,
    appFTN: data.appFTN || data.FTNNumber,
    appDMS: data.appDMS || data.DMSPreapprovalNumber,
    appRetest: data.appRetest || data.Title
  };

  Object.entries(fieldMap).forEach(([fieldId, value]) => {
    if (value === undefined || value === null || value === '') return;

    const input = $(fieldId);

    if (input) {
      input.value = value;
    }

    store.applicant[fieldId] = value;
  });

  populateRatingDropdown();
}

function handleApplicantChange(field, value) {
  if (field === 'appCertificate') {
    const cfg = modules.CERT_CONFIG?.[value];

    if (cfg) {
      store.applicant.appCertificate = value;
      store.applicant.appRating = cfg.ratings[0];
      store.applicant.appRatingHeld = '';
      populateRatingDropdown();
    }
  }

  if (field === 'appRating') {
    store.applicant.appRating = value;
    store.applicant.appRatingHeld = '';
  }

  if (field === 'appExamType') {
    store.applicant.appExamType = value;
    store.applicant.appRatingHeld = '';
  }

  modules.updateApplicant(field, value);
}

function getDatasetKey() {
  if (
    store.applicant.appCertificate === 'Private' &&
    store.applicant.appRating === 'GLIDER'
  ) {
    return 'PrivateGlider';
  }

  return store.applicant.appCertificate;
}

function getCurrentAreas() {
  const datasetKey = getDatasetKey();
  const dataset = modules.ACS_DATASETS?.[datasetKey] ?? [];

  const applicantForFiltering = {
    ...store.applicant,

    // For Instrument Airplane, use Aircraft Class used for test
    // instead of the Rating dropdown for task filtering.
    appRating:
      store.applicant.appCertificate === 'Instrument'
        ? store.applicant.appAircraftClassUsed || 'ASEL'
        : store.applicant.appRating
  };

  return modules.buildVisibleAreas(dataset, applicantForFiltering);
}

function getCurrentTasks(areas = getCurrentAreas()) {
  return modules.getFlatTasks(areas);
}

function renderApp() {
  ensureStoreDefaults();
// Show Aircraft Class ONLY for Instrument
const aircraftClassGroup = document.getElementById('aircraftClassUsedGroup');

if (aircraftClassGroup) {
  const isInstrument =
    store.applicant.appCertificate === 'Instrument';

  aircraftClassGroup.style.display = isInstrument ? 'block' : 'none';
}
  const areas = getCurrentAreas();

  if (!store.activeAreaId || !areas.some(area => area.id === store.activeAreaId)) {
    store.activeAreaId = areas[0]?.id ?? null;
  }

  modules.renderHeader?.(store);
  renderTestingCompleteCheckbox();

  const flatTasks = getCurrentTasks(areas);
  renderAcsCodeDecoder(flatTasks);

  const summary = modules.summarizeTasks(flatTasks);

  const averages = {
    K: modules.averageGrade(flatTasks, 'K'),
    R: modules.averageGrade(flatTasks, 'R'),
    S: modules.averageGrade(flatTasks, 'S')
  };

  modules.renderStats?.(summary, averages);

  const summaryByArea = Object.fromEntries(
    areas.map(area => {
      const areaSummary = modules.summarizeTasks(area.tasks);
      return [area.id, { complete: areaSummary.overall === 'SATISFACTORY' }];
    })
  );

  modules.renderSidebar?.(
    areas,
    summaryByArea,
    store.activeAreaId,
    areaId => modules.setActiveArea(areaId)
  );

  syncActiveView();

  const activeArea = areas.find(area => area.id === store.activeAreaId);

  modules.renderDetailed?.($('viewDetailed'), activeArea, store, {
    onGradeChange: (taskCode, gradeType, value) =>
      modules.setGrade(taskCode, gradeType, value),

    onToggleTask: taskCode =>
      modules.toggleTask(taskCode),

    onTaskCheck: (taskCode, checked) =>
      handleTaskCheck(taskCode, checked),

    onExaminerNoteChange: (taskCode, note) =>
      handleExaminerNoteChange(taskCode, note)
  });

  applyAcsCodeHighlights();

  if (typeof modules.renderScenarioEngine === 'function' && !scenarioRendered) {
    modules.renderScenarioEngine('scenario-root');
    scenarioRendered = true;
  }

  modules.renderSummary?.($('viewSummary'), areas, store);
  modules.renderDebrief?.($('viewDebrief'), areas, store);
  modules.renderOutcome?.(summary);

  syncPracticalTestOutcomeFromOutcomeTab(summary);
  renderRequiredBriefings($('viewChecklists'));
  wireReportActionButtons();

  modules.renderEligibility?.(
  $('viewEligibility'),
  store.applicant,
  store
);

  const outcomeNotes = $('outcomeNotes');
  if (outcomeNotes) {
    outcomeNotes.value = store.outcomeNotes || '';
    outcomeNotes.oninput = event => {
      store.outcomeNotes = event.target.value;
    };
  }
}

function syncActiveView() {
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === store.activeView);
  });

  document.querySelectorAll('.view-content').forEach(view => {
    view.classList.remove('active');
  });

  const activeId = `view${store.activeView[0].toUpperCase()}${store.activeView.slice(1)}`;
  $(activeId)?.classList.add('active');

  const outcomeOnlyActions = $('outcomeOnlyActions');

  if (outcomeOnlyActions) {
    outcomeOnlyActions.style.display =
      store.activeView === 'outcome' ? 'flex' : 'none';
  }
}  

function wireFullAppEvents() {
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.onclick = () => {
      scenarioRendered = false;
      modules.setActiveView(tab.dataset.view);
    };
  });

  document.addEventListener('change', event => {
    if (isOutcomeTabField(event.target)) {
      syncPracticalTestOutcomeFromOutcomeTab();
      updatePostFlightOutcomeGroups(document);
    }
  });

  $('btnLookupApplicant')?.addEventListener('click', lookupApplicantByDMS);

  document.addEventListener('click', () => {
    setTimeout(() => {
      syncPracticalTestOutcomeFromOutcomeTab();
      updatePostFlightOutcomeGroups(document);
    }, 0);
  });

  $('btnExpandAll')?.addEventListener('click', () => {
    getCurrentTasks().forEach(task => {
      store.expandedTasks[task.filterCode] = true;
    });

    modules.notify();
  });

  $('btnCollapseAll')?.addEventListener('click', () => {
    store.expandedTasks = {};
    modules.notify();
  });

  $('btnExportJSON')?.addEventListener('click', exportJsonSave);
  $('btnSaveHTML')?.addEventListener('click', generateCheckrideReport);
  $('btnSharePoint')?.addEventListener('click', submitToSharePoint);

  $('btnReset')?.addEventListener('click', () => {
    $('confirmModal')?.classList.add('show');
  });

  $('modalCancel')?.addEventListener('click', () => {
    $('confirmModal')?.classList.remove('show');
  });

  $('modalConfirm')?.addEventListener('click', () => {
    $('confirmModal')?.classList.remove('show');

    clearLocalStorageSave();

    modules.resetStore();
    ensureStoreDefaults();
    populateRatingDropdown();
    modules.notify();
});
}

function wireReportActionButtons() {
  const printApplicantBtn = $('printApplicantReportBtn');
  const emailApplicantBtn = $('emailApplicantReportBtn');
  const printDesigneeBtn = $('printDesigneeReportBtn');
  const emailDesigneeBtn = $('emailDesigneeReportBtn');

  if (printApplicantBtn && !printApplicantBtn.dataset.wired) {
    printApplicantBtn.dataset.wired = 'true';
    printApplicantBtn.addEventListener('click', () => {
      generatePracticalTestReport('applicant');
    });
  }

  if (emailApplicantBtn && !emailApplicantBtn.dataset.wired) {
    emailApplicantBtn.dataset.wired = 'true';
    emailApplicantBtn.addEventListener('click', () => {
      openEmailReportDialog('applicant');
    });
  }

  if (printDesigneeBtn && !printDesigneeBtn.dataset.wired) {
    printDesigneeBtn.dataset.wired = 'true';
    printDesigneeBtn.addEventListener('click', () => {
      generatePracticalTestReport('designee');
    });
  }

  if (emailDesigneeBtn && !emailDesigneeBtn.dataset.wired) {
    emailDesigneeBtn.dataset.wired = 'true';
    emailDesigneeBtn.addEventListener('click', () => {
      openEmailReportDialog('designee');
    });
  }
}

function openEmailReportDialog(reportType) {
  const isApplicant = reportType === 'applicant';

  const email = prompt(
    isApplicant
      ? 'Enter applicant email address:'
      : 'Enter designee report email address:'
  );

  if (!email) return;

  const subject = encodeURIComponent(
    isApplicant
      ? 'Applicant Practical Test Report'
      : 'Designee Practical Test Report'
  );

  const body = encodeURIComponent(
    isApplicant
      ? 'The Applicant Practical Test Report is ready. Please open the EMS app and use the Save / Print Applicant Test Report button to generate the PDF.'
      : 'The Designee Practical Test Report is ready. Please open the EMS app and use the Save / Print Designee Test Report button to generate the PDF.'
  );

  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

function isOutcomeTabField(element) {
  if (!element) return false;

  return (
    element.id === 'practicalTestOutcome' ||
    element.id === 'testOutcome' ||
    element.id === 'finalOutcome' ||
    element.id === 'outcome' ||
    element.name === 'practicalTestOutcome' ||
    element.name === 'testOutcome' ||
    element.name === 'finalOutcome' ||
    element.name === 'outcome' ||
    !!element.closest?.('#viewOutcome')
  );
}

function normalizePracticalTestOutcome(value) {
  const text = String(value || '').toUpperCase().trim();

  if (!text) return '';
  if (text.includes('INCOMPLETE')) return '';
  if (text.includes('UNSATISFACTORY')) return 'UNSATISFACTORY';

  if (
    text.includes('DISCONTINUE') ||
    text.includes('DISCONTINUANCE') ||
    text.includes('DISCONTINUED')
  ) {
    return 'DISCONTINUANCE';
  }

  if (text.includes('SATISFACTORY')) return 'SATISFACTORY';

  return '';
}

function syncPracticalTestOutcomeFromOutcomeTab(summary = null) {
  const outcomeView = $('viewOutcome');
  let detected = '';

  const select =
    outcomeView?.querySelector('select#practicalTestOutcome') ||
    outcomeView?.querySelector('select#testOutcome') ||
    outcomeView?.querySelector('select#finalOutcome') ||
    outcomeView?.querySelector('select#outcome') ||
    outcomeView?.querySelector('select[name="practicalTestOutcome"]') ||
    outcomeView?.querySelector('select[name="testOutcome"]') ||
    outcomeView?.querySelector('select[name="finalOutcome"]') ||
    outcomeView?.querySelector('select[name="outcome"]');

  if (select) {
    detected = normalizePracticalTestOutcome(
      select.value ||
      select.options?.[select.selectedIndex]?.textContent
    );
  }

  if (!detected) {
    const checked =
      outcomeView?.querySelector('input[name="practicalTestOutcome"]:checked') ||
      outcomeView?.querySelector('input[name="testOutcome"]:checked') ||
      outcomeView?.querySelector('input[name="finalOutcome"]:checked') ||
      outcomeView?.querySelector('input[name="outcome"]:checked');

    if (checked) {
      detected = normalizePracticalTestOutcome(
        checked.value ||
        checked.closest('label')?.innerText ||
        checked.parentElement?.innerText
      );
    }
  }

  if (!detected) {
    const outcomeControl = outcomeView?.querySelector(
      '[data-outcome].active, [data-outcome].selected, [data-outcome][aria-pressed="true"], ' +
      '[data-practical-test-outcome].active, [data-practical-test-outcome].selected, [data-practical-test-outcome][aria-pressed="true"]'
    );

    if (outcomeControl) {
      detected = normalizePracticalTestOutcome(
        outcomeControl.dataset.outcome ||
        outcomeControl.dataset.practicalTestOutcome ||
        outcomeControl.innerText
      );
    }
  }

  if (!detected && summary?.overall) {
    detected = normalizePracticalTestOutcome(summary.overall);
  }

  if (detected) {
    store.practicalTestOutcome = detected;
  }

  return store.practicalTestOutcome || '';
}

function handleTaskCheck(taskCode, checked) {
  store.checkedElements[taskCode] = checked;

  ['K', 'R', 'S'].forEach(type => {
    store.grades[`${taskCode}.${type}`] = checked ? '3' : 'NP';
  });

  modules.notify();
}

function handleExaminerNoteChange(taskCode, note) {
  store.examinerNotes[taskCode] = note;
}

function isBriefingItemChecked(sectionId, index) {
  return !!store.requiredBriefings?.[sectionId]?.[index];
}

function setBriefingItemChecked(sectionId, index, checked) {
  store.requiredBriefings ??= {};
  store.requiredBriefings[sectionId] ??= {};
  store.requiredBriefings[sectionId][index] = checked;
  modules.notify();
}

function getSelectedPostFlightOutcome() {
  syncPracticalTestOutcomeFromOutcomeTab();
  return store.practicalTestOutcome || '';
}

function isBriefingGroupDisabled(group) {
  const selectedOutcome = getSelectedPostFlightOutcome();

  if (!selectedOutcome) return false;

  return group.outcome !== selectedOutcome;
}

function getBriefingStatus(section) {
  let total = section.items?.length || 0;
  let completed = section.items?.filter((_, index) =>
    isBriefingItemChecked(section.id, index)
  ).length || 0;

  if (section.groups?.length) {
    section.groups.forEach(group => {
      if (isBriefingGroupDisabled(group)) return;

      const groupKey = `${section.id}.${group.id}`;

      total += group.items.length;

      completed += group.items.filter((_, index) =>
        isBriefingItemChecked(groupKey, index)
      ).length;
    });
  }

  return {
    total,
    completed,
    complete: total > 0 && completed === total
  };
}

function renderPostFlightOutcomeStatus() {
  const outcomeLabel = {
    SATISFACTORY: 'Satisfactory',
    UNSATISFACTORY: 'Unsatisfactory',
    DISCONTINUANCE: 'Letter of Discontinuance'
  }[store.practicalTestOutcome] || 'Not selected';

  return `
    <div class="postflight-outcome-selector">
      <strong>Practical Test Outcome:</strong>
      <span>${escapeHtml(outcomeLabel)}</span>
      <div style="font-size:0.85rem;color:#6b7280;margin-top:4px;">
        Automatically linked from the Outcome tab.
      </div>
    </div>
  `;
}

function renderRequiredBriefings(container) {
  if (!container) return;

  syncPracticalTestOutcomeFromOutcomeTab();

  container.innerHTML = `
    <div class="checklists-container">
      <style>
        .postflight-outcome-selector {
          margin: 12px 0 14px 0;
          padding: 12px;
          border: 1px solid #d0d7de;
          border-radius: 10px;
          background: #f8fafc;
        }

        .briefing-group {
          margin-top: 14px;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          padding-top: 10px;
        }

        .briefing-group-title {
          margin: 0 0 8px 0;
          padding: 8px 10px;
          border-radius: 8px;
          background: #f3f4f6;
          font-weight: 700;
          color: #374151;
        }

        .briefing-disabled-note {
          font-size: 0.82rem;
          font-weight: 600;
          color: #6b7280;
          margin-left: 8px;
        }
      </style>

      ${REQUIRED_BRIEFINGS.map(section => {
        const status = getBriefingStatus(section);
        const isOpen = store.expandedBriefings?.[section.id] !== false;

        return `
          <div 
            class="checklist-section ${status.complete ? 'checklist-section-complete' : ''} ${isOpen ? 'open' : ''}"
            data-briefing-section-card="${escapeHtml(section.id)}"
          >
            <div class="checklist-header" data-briefing-toggle="${escapeHtml(section.id)}">
              <div class="checklist-header-left">
                <i class="fas fa-clipboard-check section-icon"></i>
                <h3>${escapeHtml(section.title)}</h3>
              </div>

              <div class="checklist-header-right">
                <span class="checklist-progress">${status.completed} / ${status.total}</span>
                <i class="fas ${status.complete ? 'fa-circle-check' : 'fa-circle'} checklist-status-icon ${status.complete ? 'complete' : ''}"></i>
                <i class="fas fa-chevron-down checklist-chevron"></i>
              </div>
            </div>

            <div class="checklist-body">
              ${section.id === 'postFlightBriefing' ? renderPostFlightOutcomeStatus() : ''}

              <div class="checklist-items">
                ${(section.items || []).map((item, index) => {
                  const checked = isBriefingItemChecked(section.id, index);
                  const itemKey = `${section.id}_${index}`;

                  return `
                    <div class="checklist-item ${checked ? 'checked' : ''}">
                      <input
                        type="checkbox"
                        id="briefing_${escapeHtml(itemKey)}"
                        data-required-briefing-section="${escapeHtml(section.id)}"
                        data-required-briefing-index="${index}"
                        ${checked ? 'checked' : ''}
                      />
                      <label for="briefing_${escapeHtml(itemKey)}">${escapeHtml(item)}</label>
                    </div>
                  `;
                }).join('')}

                ${(section.groups || []).map(group => {
                  const groupDisabled = isBriefingGroupDisabled(group);
                  const groupKey = `${section.id}.${group.id}`;
                  const disabledStyle = groupDisabled
                    ? 'opacity:0.35; filter:grayscale(100%); pointer-events:none;'
                    : 'opacity:1; filter:none; pointer-events:auto;';

                  return `
                    <div 
                      class="briefing-group" 
                      data-briefing-outcome="${group.outcome}"
                      style="${disabledStyle}"
                    >
                      <div class="briefing-group-title" style="${groupDisabled ? 'background:#e5e7eb;color:#6b7280;' : ''}">
                        ${escapeHtml(group.title)}
                        ${groupDisabled ? '<span class="briefing-disabled-note">Disabled by selected outcome</span>' : ''}
                      </div>

                      ${group.items.map((item, index) => {
                        const checked = isBriefingItemChecked(groupKey, index);
                        const itemKey = `${groupKey}_${index}`;

                        return `
                          <div class="checklist-item ${checked ? 'checked' : ''}">
                            <input
                              type="checkbox"
                              id="briefing_${escapeHtml(itemKey)}"
                              data-required-briefing-section="${escapeHtml(groupKey)}"
                              data-required-briefing-index="${index}"
                              ${checked ? 'checked' : ''}
                              ${groupDisabled ? 'disabled' : ''}
                            />
                            <label for="briefing_${escapeHtml(itemKey)}">${escapeHtml(item)}</label>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('[data-briefing-toggle]').forEach(header => {
    header.addEventListener('click', event => {
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'LABEL' ||
        event.target.tagName === 'SELECT'
      ) {
        return;
      }

      const sectionId = header.dataset.briefingToggle;

      store.expandedBriefings ??= {};
      store.expandedBriefings[sectionId] = store.expandedBriefings?.[sectionId] === false;

      modules.notify();
    });
  });

  container.querySelectorAll('[data-required-briefing-section]').forEach(input => {
    input.addEventListener('change', event => {
      const sectionId = event.target.dataset.requiredBriefingSection;
      const index = Number(event.target.dataset.requiredBriefingIndex);

      setBriefingItemChecked(sectionId, index, event.target.checked);
    });
  });

  updatePostFlightOutcomeGroups(container);
}

function updatePostFlightOutcomeGroups(container = document) {
  syncPracticalTestOutcomeFromOutcomeTab();

  const selectedOutcome = store.practicalTestOutcome || '';
  const groups = container.querySelectorAll('[data-briefing-outcome]');

  groups.forEach(group => {
    const groupOutcome = group.dataset.briefingOutcome;
    const disabled = !!selectedOutcome && groupOutcome !== selectedOutcome;

    group.style.opacity = disabled ? '0.35' : '1';
    group.style.filter = disabled ? 'grayscale(100%)' : 'none';
    group.style.pointerEvents = disabled ? 'none' : 'auto';

    const title = group.querySelector('.briefing-group-title');

    if (title) {
      title.style.background = disabled ? '#e5e7eb' : '#f3f4f6';
      title.style.color = disabled ? '#6b7280' : '#374151';

      const existingNote = title.querySelector('.briefing-disabled-note');

      if (existingNote) {
        existingNote.remove();
      }

      if (disabled) {
        const note = document.createElement('span');
        note.className = 'briefing-disabled-note';
        note.textContent = ' Disabled by selected outcome';
        title.appendChild(note);
      }
    }

    group.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.disabled = disabled;
      input.style.cursor = disabled ? 'not-allowed' : 'pointer';
    });

    group.querySelectorAll('label').forEach(label => {
      label.style.cursor = disabled ? 'not-allowed' : 'pointer';
    });
  });
}

function renderTestingCompleteCheckbox() {
  const applicantBox =
    document.querySelector('.applicant-info-card') ||
    document.querySelector('.applicant-card') ||
    document.querySelector('.applicant-info') ||
    document.querySelector('#applicantInfo') ||
    document.querySelector('#applicantInfoBox');

  if (!applicantBox) return;

  if (document.getElementById('testingCompleteBox')) return;

  const testingBox = document.createElement('div');
  testingBox.id = 'testingCompleteBox';
  testingBox.style.marginTop = '12px';
  testingBox.style.padding = '12px';
  testingBox.style.border = '1px solid #d0d7de';
  testingBox.style.borderRadius = '10px';
  testingBox.style.background = '#fffbe6';

  testingBox.innerHTML = `
    <label style="display:flex; align-items:center; gap:10px; font-weight:700; cursor:pointer;">
      <input type="checkbox" id="markAllCompleteForTesting" />
      Mark all items complete for testing
    </label>
    <div style="font-size:0.85rem; color:#6b7280; margin-top:4px;">
      Testing shortcut only — checks all ACS tasks and Required Briefings.
    </div>
  `;

  applicantBox.insertAdjacentElement('afterend', testingBox);

  document
    .getElementById('markAllCompleteForTesting')
    ?.addEventListener('change', event => {
      if (event.target.checked) {
        markAllItemsCompleteForTesting();
      }
    });
}

function markAllItemsCompleteForTesting() {
  const areas = getCurrentAreas();
  const tasks = getCurrentTasks(areas);

  tasks.forEach(task => {
    store.checkedElements[task.filterCode] = true;

    ['K', 'R', 'S'].forEach(type => {
      store.grades[`${task.filterCode}.${type}`] = '3';
    });
  });

  REQUIRED_BRIEFINGS.forEach(section => {
    store.requiredBriefings[section.id] ??= {};

    (section.items || []).forEach((_, index) => {
      store.requiredBriefings[section.id][index] = true;
    });

    (section.groups || []).forEach(group => {
      const groupKey = `${section.id}.${group.id}`;
      store.requiredBriefings[groupKey] ??= {};

      group.items.forEach((_, index) => {
        store.requiredBriefings[groupKey][index] = true;
      });
    });
  });

  updatePostFlightOutcomeGroups();
  modules.notify();
}

function renderAcsCodeDecoder(tasks) {
  let container = document.getElementById('acsCodeDecoder');

  if (!container) {
    const applicantBox =
      document.querySelector('.applicant-info-card') ||
      document.querySelector('.applicant-card') ||
      document.querySelector('.applicant-info') ||
      document.querySelector('#applicantInfo') ||
      document.querySelector('#applicantInfoBox');

    if (!applicantBox) return;

    container = document.createElement('div');
    container.id = 'acsCodeDecoder';

    applicantBox.insertAdjacentElement('afterend', container);
  }

  const codes = [...new Set(
    tasks
      .map(task => task.code)
      .filter(Boolean)
  )].sort();

  const isOpen = store.acsDecoderOpen !== false;

  container.innerHTML = `
    <div style="
      margin-top:12px;
      padding:12px;
      border:1px solid #d0d7de;
      border-radius:10px;
      background:#f8fafc;
      color:#000000;
    ">
      <div
        id="acsDecoderHeader"
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          cursor:pointer;
          font-weight:700;
          user-select:none;
          color:#000000;
        "
      >
        <span>ACS Code Decoder</span>
        <span style="font-size:0.9rem;color:#000000;">${isOpen ? '▲' : '▼'}</span>
      </div>

      <div style="
        font-size:0.85rem;
        color:#000000;
        margin-top:4px;
        margin-bottom:10px;
      ">
        For exams that require a written test, check all tasks found deficient on the Airman Knowledge Test Report. This will highlight them in the Detailed View for quick identification.
      </div>

      <div style="
        margin-bottom:12px;
        padding:10px;
        background:white;
        border:1px solid #e5e7eb;
        border-radius:8px;
        color:#000000;
      ">
        <label style="
          font-weight:600;
          display:block;
          margin-bottom:6px;
          color:#000000;
        ">
          Upload Airman Knowledge Test Report
        </label>

        <input
          type="file"
          id="aktReportUpload"
          accept=".pdf,.txt"
          style="color:#000000;"
        >

        <div
          id="aktUploadStatus"
          style="
            margin-top:6px;
            font-size:0.85rem;
            color:#000000;
          "
        ></div>
      </div>

      <div
        id="acsDecoderBody"
        style="
          display:${isOpen ? 'grid' : 'none'};
          grid-template-columns:repeat(auto-fill,minmax(110px,1fr));
          gap:6px;
          color:#000000;
        "
      >
        ${codes.map(code => `
          <label style="
            display:flex;
            align-items:center;
            gap:6px;
            background:#ffffff;
            padding:6px;
            border-radius:6px;
            cursor:pointer;
            border:1px solid #e5e7eb;
            font-size:0.9rem;
            color:#000000;
            font-weight:500;
          ">
            <input
              type="checkbox"
              value="${escapeHtml(code)}"
              ${store.selectedAcsCodes.includes(code) ? 'checked' : ''}
            />
            <span style="color:#000000;">${escapeHtml(code)}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelector('#acsDecoderHeader')?.addEventListener('click', () => {
    store.acsDecoderOpen = store.acsDecoderOpen === false;
    modules.notify();
  });

  container.querySelectorAll('#acsDecoderBody input[type="checkbox"]').forEach(box => {
    box.addEventListener('change', event => {
      const code = event.target.value;

      if (typeof modules.toggleAcsCode === 'function') {
        modules.toggleAcsCode(code);
      } else {
        toggleAcsCodeFallback(code);
      }
    });
  });

  container
    .querySelector('#aktReportUpload')
    ?.addEventListener(
      'change',
      handleAKTReportUpload
    );
}

async function handleAKTReportUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const status = document.getElementById('aktUploadStatus');
  status.textContent = 'Reading report...';

  try {
    let text = '';

    if (
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    ) {
      text = await extractPdfText(file);
    } else {
      text = await file.text();
    }

    const matches = extractAcsCodesFromText(text);

    if (!matches.length) {
      status.textContent = 'No ACS codes found. The report may need clearer OCR.';
      return;
    }

    store.selectedAcsCodes = [
      ...new Set([
        ...(store.selectedAcsCodes || []),
        ...matches
      ])
    ];

    status.textContent =
      `Selected ${matches.length} ACS code(s): ${matches.join(', ')}`;

    modules.notify();

  } catch (err) {
    console.error(err);
    status.textContent = 'Unable to read Airman Knowledge Test Report.';
  }
}

function extractAcsCodesFromText(text) {
  const cleaned = String(text || '')
    .toUpperCase()
    .replace(/[|]/g, 'I')
    .replace(/\s+/g, ' ')
    .replace(/P A\./g, 'PA.')
    .replace(/P\.A\./g, 'PA.')
    .replace(/PAI/g, 'PA.I')
    .replace(/PAI\./g, 'PA.I.')
    .replace(/PA\.\s*/g, 'PA.')
    .replace(/IR\.\s*/g, 'IR.')
    .replace(/CA\.\s*/g, 'CA.')
    .replace(/ATP\.\s*/g, 'ATP.')
    .replace(/FI\.\s*/g, 'FI.')
    .replace(/\.\s*/g, '.');

  const elementRegex =
    /\b(?:PA|IR|CA|ATP|FI)\.[IVXLC]+\.[A-Z]\.[KRS]\d+[A-Z]?\b/g;

  const taskRegex =
    /\b(?:PA|IR|CA|ATP|FI)\.[IVXLC]+\.[A-Z]\b/g;

  const elementMatches = cleaned.match(elementRegex) || [];
  const taskMatches = cleaned.match(taskRegex) || [];

  const allMatches = [...elementMatches, ...taskMatches];

  const taskCodes = allMatches.map(code => {
    const parts = code.split('.');
    return parts.slice(0, 3).join('.');
  });

  console.log('AKTR raw OCR text:', text);
  console.log('AKTR cleaned text:', cleaned);
  console.log('AKTR matched ACS codes:', taskCodes);

  return [...new Set(taskCodes)];
}

async function extractPdfText(file) {
  if (!window.pdfjsLib) {
    throw new Error('PDF.js is not loaded.');
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: buffer
  }).promise;

  let text = '';

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    const content = await page.getTextContent();

    text += content.items
      .map(item => item.str)
      .join(' ');

    text += '\n';
  }

  const pdfTextMatches = extractAcsCodesFromText(text);

  if (pdfTextMatches.length > 0) {
    return text;
  }

  if (!window.Tesseract) {
    throw new Error('Tesseract OCR is not loaded.');
  }

  let ocrText = '';

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    const viewport = page.getViewport({
      scale: 2.5
    });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport
    }).promise;

    const result = await Tesseract.recognize(
      canvas,
      'eng',
      {
        logger: message => {
          const status = document.getElementById('aktUploadStatus');

          if (
            status &&
            message.status === 'recognizing text' &&
            typeof message.progress === 'number'
          ) {
            status.textContent =
              `OCR reading report... ${Math.round(message.progress * 100)}%`;
          }
        }
      }
    );

    ocrText += result.data.text + '\n';
  }

  return ocrText;
}

function toggleAcsCodeFallback(code) {
  store.selectedAcsCodes ??= [];

  if (store.selectedAcsCodes.includes(code)) {
    store.selectedAcsCodes = store.selectedAcsCodes.filter(item => item !== code);
  } else {
    store.selectedAcsCodes.push(code);
  }

  modules.notify();
}


async function testApplicantReportFlow() {
  const flowUrl = 'https://default59acb2f988f145c3981040caf9cf42.11.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/f14216e9ffbb4101b5f5c7967895a81f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=V1LRs5VLQeeDdkG7H0U_e15ChR9hO66xGlCdXTK-m2o';

  const payload = {
    itemId: 7,
    email: 'kele@fergerstrom.net',
    recommendingInstructorEmail: 'kele.fergerstrom@icloud.com',
    applicantName: 'Test Applicant',
    pdfFileName: 'TestReport.pdf',
    pdfBase64: 'dGVzdA=='
  };

  try {
    const response = await fetch(flowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('Flow status:', response.status);
    console.log(await response.text());

    alert('Flow triggered. Check Power Automate run history.');
  } catch (error) {
    console.error('Flow trigger failed:', error);
    alert('Flow trigger failed. Check console.');
  }
}

function applyAcsCodeHighlights() {
  document.querySelectorAll('[data-acs-code]').forEach(el => {
    const code = el.dataset.acsCode;

    if (store.selectedAcsCodes?.includes(code)) {
      el.style.background = '#ffd6e8';
      el.style.border = '2px solid #ff4fa3';
      el.style.borderRadius = '6px';
      el.style.padding = '2px 6px';
    } else {
      el.style.background = '';
      el.style.border = '';
      el.style.borderRadius = '';
      el.style.padding = '';
    }
  });
}

function exportJsonSave() {
  const areas = getCurrentAreas();
  const tasks = getCurrentTasks(areas);

  modules.downloadJson('acs-ems-save.json', {
    exportedAt: new Date().toISOString(),
    datasetKey: getDatasetKey(),
    applicant: store.applicant,
    grades: store.grades,
    checkedElements: store.checkedElements,
    examinerNotes: store.examinerNotes,
    expandedTasks: store.expandedTasks,
    requiredBriefings: store.requiredBriefings,
    expandedBriefings: store.expandedBriefings,
    practicalTestOutcome: store.practicalTestOutcome,
    outcomeNotes: store.outcomeNotes,
    selectedScenario: store.selectedScenario,
    selectedAcsCodes: store.selectedAcsCodes,
    acsDecoderOpen: store.acsDecoderOpen,
    summary: modules.summarizeTasks(tasks),
    areas
  });
}

async function submitToSharePoint() {
  const areas = getCurrentAreas();
  const tasks = getCurrentTasks(areas);
  const summary = modules.summarizeTasks(tasks);

  const button = $('btnSharePoint');
  const originalText = button?.innerHTML;

  const payload = {
    submittedAt: new Date().toISOString(),
    datasetKey: getDatasetKey(),
    applicant: store.applicant,
    grades: store.grades,
    checkedElements: store.checkedElements,
    examinerNotes: store.examinerNotes,
    expandedTasks: store.expandedTasks,
    requiredBriefings: store.requiredBriefings,
    expandedBriefings: store.expandedBriefings,
    practicalTestOutcome: store.practicalTestOutcome,
    outcomeNotes: store.outcomeNotes,
    selectedScenario: store.selectedScenario,
    selectedAcsCodes: store.selectedAcsCodes,
    acsDecoderOpen: store.acsDecoderOpen,
    summary,
    areas
  };

  try {
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    const response = await fetch(SUBMIT_FLOW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Flow failed with status ${response.status}`);
    }

    const result = await response.json();

    console.log('SharePoint Item ID:', result.itemId);

    await fetch('https://default59acb2f988f145c3981040caf9cf42.11.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/f14216e9ffbb4101b5f5c7967895a81f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=V1LRs5VLQeeDdkG7H0U_e15ChR9hO66xGlCdXTK-m2o', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        itemId: Number(result.itemId),
        email: 'kele@fergerstrom.net',
        recommendingInstructorEmail: 'kele.fergerstrom@icloud.com',
        applicantName: store.applicant.appName || 'Test Applicant',
        pdfFileName: `Applicant_Report_Test_${Date.now()}.pdf`,
        pdfBase64: 'dGVzdA=='
      })
    });

    alert(`Submitted to SharePoint successfully. Item ID: ${result.itemId}. PDF flow triggered.`);
  } catch (error) {
    console.error(error);
    alert('Submission failed. Check Power Automate run history and browser console.');
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }
}

function generatePracticalTestReport(reportType = 'applicant') {
  const isApplicant = reportType === 'applicant';

  const areas = getCurrentAreas();
  const tasks = getCurrentTasks(areas);
  const summary = modules.summarizeTasks(tasks);
  const applicant = store.applicant;
  const notes = store.examinerNotes ?? {};
  const applicantName = applicant.appName || '';
const aircraftDisplay = [
  applicant.appAircraftType,
  applicant.appNNumber
].filter(Boolean).join(' / ');

  const reportTitle = isApplicant
    ? 'Applicant Practical Test Report'
    : 'Designee Practical Test Report';

  const reportWindow = window.open('', '_blank');

  if (!reportWindow) {
    alert('Popup blocked. Please allow popups for this site.');
    return;
  }

  const getTaskStatus = task => {
  const row = summary.statuses?.find(item =>
    item.task?.filterCode === task.filterCode
  );

  const k = store.grades?.[`${task.filterCode}.K`] || 'NP';
  const r = store.grades?.[`${task.filterCode}.R`] || 'NP';
  const s = store.grades?.[`${task.filterCode}.S`] || 'NP';

  const hasGrade = [k, r, s].some(value => value && value !== 'NP');

  if (row?.status === 'not-required' && !hasGrade) {
    return 'Not Required';
  }

  if (row?.status === 'not-required' && hasGrade) {
    if ([k, r, s].includes('2') || [k, r, s].includes('1')) {
      return 'Unsatisfactory';
    }

    if ([k, r, s].includes('3') || [k, r, s].includes('4')) {
      return 'Satisfactory';
    }

    return 'Not Required';
  }

  if (!row) return 'Incomplete';

  if (row.status === 'fail') return 'Unsatisfactory';
  if (row.status === 'incomplete') return 'Incomplete';
  return 'Satisfactory';
};

  const getStatusClass = status => {
  if (status === 'Satisfactory') return 'status-sat';
  if (status === 'Unsatisfactory') return 'status-unsat';
  if (status === 'Not Required') return 'status-notreq';
  return 'status-inc';
};

  reportWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
<title>${escapeReport(reportTitle)}</title>

<style>
body { font-family: Arial; padding: 32px; }
h1 { border-bottom: 3px solid #000; }
h2 { 
  margin-top: 24px; 
  border-bottom: 1px solid #ccc; 
}

.acs-highlight {
  background: #ffd6e8 !important;
}

.top-report-grid {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 24px;
  margin-top: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

th, td {
  border: 1px solid #ccc;
  padding: 6px;
  vertical-align: top;
}

th {
  background: #f0f0f0;
}

.badge {
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: bold;
}

.pass { background: green; color: white; }
.fail { background: red; color: white; }
.incomplete { background: orange; }

.status-sat {
  background: #d4edda;
  color: #155724;
  font-weight: bold;
}

.status-unsat {
  background: #f8d7da;
  color: #721c24;
  font-weight: bold;
}

.status-inc {
  background: #fff3cd;
  color: #856404;
  font-weight: bold;
}

.print-button {
  margin-bottom: 20px;
}

@media print {
  .print-button { display:none; }
}

.status-notreq {
  background: #e5e7eb;
  color: #374151;
  font-weight: bold;
}
</style>
</head>

<body>

<button class="print-button" onclick="window.print()">Print / Save PDF</button>

<h1>${escapeReport(reportTitle)}</h1>

<div class="top-report-grid">

  <div>
    <h2>Applicant Information</h2>
    <table>
      <tr><th>Name</th><td>${escapeReport(applicantName)}</td></tr>
      <tr><th>Date</th><td>${escapeReport(formatDateMMDDYYYY(applicant.appDate))}</td></tr>
      <tr><th>Certificate</th><td>${escapeReport(applicant.appCertificate)}</td></tr>
      <tr><th>Rating</th><td>${escapeReport(formatRatingLabel(applicant.appRating))}</td></tr>
      <tr><th>Exam Type</th><td>${escapeReport(applicant.appExamType)}</td></tr>
      <tr><th>Aircraft</th><td>${escapeReport(aircraftDisplay)}</td></tr>
      <tr><th>Examiner</th><td>${escapeReport(applicant.appExaminer)}</td></tr>
    </table>
  </div>

  <div>
    <h2>Overall Result</h2>

    <p>
      <span class="badge ${
        summary.overall === 'SATISFACTORY'
          ? 'pass'
          : summary.overall === 'UNSATISFACTORY'
          ? 'fail'
          : 'incomplete'
      }">
        ${escapeReport(summary.overall)}
      </span>
    </p>

    <table>
  <tr><th>Tasks Passed</th><td>${summary.passedRequiredTasks}</td></tr>
  <tr><th>Failed</th><td>${summary.failedTasks}</td></tr>
  <tr><th>Incomplete</th><td>${summary.incompleteRequiredTasks}</td></tr>
  <tr><th>Ground Duration</th><td>${escapeReport(applicant.appGroundDuration)}</td></tr>
  <tr><th>Flight Duration</th><td>${escapeReport(applicant.appFlightDuration)}</td></tr>
</table>
  </div>

</div>

<h2>Task Summary</h2>

<table>
  <tr>
    <th>Task</th>
    <th>Title</th>
    <th>Status</th>
    <th>Examiner Note</th>
  </tr>

  ${tasks.map(task => {
  const status = getTaskStatus(task);
  const note = notes[task.filterCode] || '';

  const isHighlighted = store.selectedAcsCodes?.includes(task.code);

  return `
    <tr>
      <td class="${isHighlighted ? 'acs-highlight' : ''}">
  ${escapeReport(task.code)}
</td>
<td class="${isHighlighted ? 'acs-highlight' : ''}">
  ${escapeReport(task.title)}
</td>
<td class="${getStatusClass(status)}">
  ${escapeReport(status)}
</td>
<td>
  ${note ? escapeReport(note).replace(/\n/g, '<br>') : ''}
</td>
    </tr>
  `;
}).join('')}
</table>

<h2>Outcome Notes</h2>
<div style="
  border:1px solid #ccc;
  padding:10px;
  min-height:80px;
  background:#fafafa;
">
  ${escapeReport(store.outcomeNotes || 'None').replace(/\n/g, '<br>')}
</div>

${
  !isApplicant
    ? `
<h2>Detailed K / R / S Breakdown</h2>

<table>
<tr>
  <th>Task</th>
  <th>Title</th>
  <th>K</th>
  <th>R</th>
  <th>S</th>
</tr>

${tasks.map(t => `
<tr>
<td>${escapeReport(t.code)}</td>
<td>${escapeReport(t.title)}</td>
<td>${escapeReport(store.grades?.[t.filterCode + '.K'] || 'NP')}</td>
<td>${escapeReport(store.grades?.[t.filterCode + '.R'] || 'NP')}</td>
<td>${escapeReport(store.grades?.[t.filterCode + '.S'] || 'NP')}</td>
</tr>
`).join('')}

</table>
`
    : ''
}

</body>
</html>
`);

  reportWindow.document.close();
}

function generateCheckrideReport() {
  generatePracticalTestReport('designee');
}

function formatDateMMDDYYYY(dateStr) {
  if (!dateStr) return '';

  const parts = dateStr.split('-');

  if (parts.length !== 3) return dateStr;

  const [yyyy, mm, dd] = parts;
  return `${mm}/${dd}/${yyyy}`;
}

function escapeReport(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

window.updateApplicantDurationFromScenario = function(section, decimalHours) {
  if (!store) return;

  const value = decimalHours ? String(decimalHours) : '';

  if (section === 'oral') {
    store.applicant.appGroundDuration = value;

    const input = document.getElementById('appGroundDuration');
    if (input) input.value = value;
  }

  if (section === 'flight') {
    store.applicant.appFlightDuration = value;

    const input = document.getElementById('appFlightDuration');
    if (input) input.value = value;
  }

  saveToLocalStorage();
};

window.getFlightPortionAreas = function() {
  const areas = getCurrentAreas();

  return areas.filter(area =>
    String(area.roman || '').trim() !== 'I'
  );
};

window.getFlightPortionTasks = function() {
  return window.getFlightPortionAreas()
    .flatMap(area => area.tasks);
};

window.getFlightPortionAreas = function() {
  const areas = getCurrentAreas();

  return areas.filter(area =>
    String(area.roman || '').trim() !== 'I'
  );
};

window.renderFlightDetailedArea = function(container, area) {
  if (!container || !modules.renderDetailed) return;

  modules.renderDetailed(container, area, store, {
    onGradeChange: (taskCode, gradeType, value) =>
      modules.setGrade(taskCode, gradeType, value),

    onToggleTask: taskCode =>
      modules.toggleTask(taskCode),

    onTaskCheck: (taskCode, checked) =>
      handleTaskCheck(taskCode, checked),

    onExaminerNoteChange: (taskCode, note) =>
      handleExaminerNoteChange(taskCode, note)
  });

  applyAcsCodeHighlights();
};

window.setDetailedGradeFromFlight = function(taskCode, gradeType, value) {
  if (!taskCode || !gradeType || !store) return;

  modules.setGrade(taskCode, gradeType, value);
};

window.setDetailedTaskCheckFromFlight = function(taskCode, checked) {
  if (!taskCode || !store) return;

  handleTaskCheck(taskCode, checked);
};

window.setDetailedExaminerNoteFromFlight = function(taskCode, note) {
  if (!taskCode || !store) return;

  handleExaminerNoteChange(taskCode, note);
  saveToLocalStorage();
};

window.setScenarioGradeFromOral = function(select) {
  const rawTaskCode = select.dataset.taskCode;
  const grade = select.value;

  const parts = rawTaskCode ? rawTaskCode.split('.') : [];

  const taskCode =
    parts.length >= 3
      ? parts.slice(0, 3).join('.')
      : rawTaskCode || '';

  const gradeType =
    parts.length >= 4
      ? parts[3].charAt(0).toUpperCase()
      : '';

  const areas = getCurrentAreas();
  const tasks = getCurrentTasks(areas);

  const matchingTask = tasks.find(task =>
    task.code === taskCode ||
    task.filterCode === taskCode ||
    task.code === rawTaskCode ||
    task.filterCode === rawTaskCode
  );

  console.log('Scenario grade selected:', {
    rawTaskCode,
    taskCode,
    gradeType,
    grade,
    matchingTask,
    filterCode: matchingTask?.filterCode
  });

  if (!matchingTask || !grade || !gradeType || !store) return;

  const filterCode = matchingTask.filterCode;

  store.checkedElements[filterCode] = true;

  store.grades[`${filterCode}.${gradeType}`] = grade;

  console.log('Single K/R/S grade after update:', {
    filterCode,
    gradeType,
    value: store.grades[`${filterCode}.${gradeType}`]
  });

  modules.notify();
};

window.storeGeneratedScenario = function(payload) {
  if (!store) return;

  store.generatedScenario = payload;
};

window.getStoredGeneratedScenario = function() {
  return store?.generatedScenario || null;
};

window.getScenarioGradeFromDetailedView = function(rawTaskCode) {
  const parts = rawTaskCode ? rawTaskCode.split('.') : [];

  const taskCode =
    parts.length >= 3
      ? parts.slice(0, 3).join('.')
      : rawTaskCode || '';

  const gradeType =
    parts.length >= 4
      ? parts[3].charAt(0).toUpperCase()
      : '';

  if (!taskCode || !gradeType || !store) return '';

  const areas = getCurrentAreas();
  const tasks = getCurrentTasks(areas);

  const matchingTask = tasks.find(task =>
    task.code === taskCode ||
    task.filterCode === taskCode
  );

  if (!matchingTask) return '';

  return store.grades?.[`${matchingTask.filterCode}.${gradeType}`] || '';
};

