const $ = id => document.getElementById(id);

let modules = {};
let store = null;
let scenarioRendered = false;

const FLOW_URL =
  'https://default59acb2f988f145c3981040caf9cf42.11.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/6b4230f895f5468d934935b8be9aeba5/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=pLQc99dLY0-biKgS_ZPL-3n4P1bxr2Oexe6mDQLuhsI';

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
  } catch (error) {
    console.warn('Scenario engine did not load. App will continue without it.', error);
  }
}

function initApp() {
  ensureStoreDefaults();
  populateRatingDropdown();
  wireFullAppEvents();

  modules.bindApplicantForm?.(store, {
    onApplicantChange: handleApplicantChange
  });

  modules.subscribe?.(renderApp);

  renderApp();
}

function ensureStoreDefaults() {
  store.applicant ??= {};
  store.applicant.appCertificate ??= 'Private';
  store.applicant.appRating ??= 'ASEL';
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

  store.requiredBriefings ??= {};
  store.expandedBriefings ??= {};
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
  return modules.buildVisibleAreas(dataset, store.applicant);
}

function getCurrentTasks(areas = getCurrentAreas()) {
  return modules.getFlatTasks(areas);
}

function renderApp() {
  ensureStoreDefaults();

  const areas = getCurrentAreas();

  if (!store.activeAreaId || !areas.some(area => area.id === store.activeAreaId)) {
    store.activeAreaId = areas[0]?.id ?? null;
  }

  modules.renderHeader?.(store);
  renderTestingCompleteCheckbox();

  const flatTasks = getCurrentTasks(areas);
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

  if (typeof modules.renderScenarioEngine === 'function' && !scenarioRendered) {
    modules.renderScenarioEngine('scenario-root');
    scenarioRendered = true;
  }

  modules.renderSummary?.($('viewSummary'), areas);
  modules.renderDebrief?.($('viewDebrief'), areas, store);
  modules.renderOutcome?.(summary);

  syncPracticalTestOutcomeFromOutcomeTab(summary);
  renderRequiredBriefings($('viewChecklists'));
  wireReportActionButtons();

  modules.renderEligibility?.($('viewEligibility'), store.applicant);

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

  if (text.includes('UNSATISFACTORY')) {
    return 'UNSATISFACTORY';
  }

  if (
    text.includes('DISCONTINUE') ||
    text.includes('DISCONTINUANCE') ||
    text.includes('DISCONTINUED')
  ) {
    return 'DISCONTINUANCE';
  }

  if (text.includes('SATISFACTORY')) {
    return 'SATISFACTORY';
  }

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
    summary,
    areas
  };

  try {
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    const response = await fetch(FLOW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Flow failed with status ${response.status}`);
    }

    alert('Submitted to SharePoint successfully.');
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

  const reportTitle = isApplicant
    ? 'Applicant Practical Test Report'
    : 'Designee Practical Test Report';

  const reportWindow = window.open('', '_blank');

  if (!reportWindow) {
    alert('Popup blocked. Please allow popups for this site.');
    return;
  }

  // 🔹 Determine task status
  const getTaskStatus = task => {
    const row = summary.statuses?.find(item =>
      item.task?.filterCode === task.filterCode
    );

    if (!row) return 'Incomplete';

    if (row.status === 'fail') return 'Unsatisfactory';
    if (row.status === 'incomplete') return 'Incomplete';
    return 'Satisfactory';
  };

  const getStatusClass = status => {
    if (status === 'Satisfactory') return 'status-sat';
    if (status === 'Unsatisfactory') return 'status-unsat';
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

/* STATUS COLORS */
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
</style>
</head>

<body>

<button class="print-button" onclick="window.print()">Print / Save PDF</button>

<h1>${escapeReport(reportTitle)}</h1>

<div class="top-report-grid">

  <div>
    <h2>Applicant Information</h2>
    <table>
      <tr><th>Name</th><td>${escapeReport(applicant.appName)}</td></tr>
      <tr><th>Date</th><td>${escapeReport(formatDateMMDDYYYY(applicant.appDate))}</td></tr>
      <tr><th>Certificate</th><td>${escapeReport(applicant.appCertificate)}</td></tr>
      <tr><th>Rating</th><td>${escapeReport(formatRatingLabel(applicant.appRating))}</td></tr>
      <tr><th>Exam Type</th><td>${escapeReport(applicant.appExamType)}</td></tr>
      <tr><th>Aircraft</th><td>${escapeReport(applicant.appAircraftType)}</td></tr>
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

    return `
      <tr>
        <td>${escapeReport(task.code)}</td>
        <td>${escapeReport(task.title)}</td>
        <td class="${getStatusClass(status)}">${status}</td>
        <td>${note ? escapeReport(note).replace(/\\n/g, '<br>') : ''}</td>
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
</table>

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