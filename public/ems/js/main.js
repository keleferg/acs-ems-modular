const $ = (id) => document.getElementById(id);

let modules = {};
let store = null;
let scenarioRendered = false;

const STORAGE_KEY = "acs_ems_autosave_v1";

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error("Autosave failed:", err);
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
    console.error("Restore failed:", err);
  }
}

function clearLocalStorageSave() {
  /*
   * Remove only the EMS evaluation autosave.
   *
   * Do not call localStorage.clear(). Supabase stores the examiner
   * session under separate localStorage keys, and those must remain.
   */
  localStorage.removeItem(STORAGE_KEY);
}

function resetAllEvaluationData() {
  /*
   * Preserve the signed-in Supabase examiner session while clearing
   * every piece of applicant and evaluation data.
   */
  clearLocalStorageSave();

  modules.resetStore();

  scenarioRendered = false;

  /*
   * Clear the request query parameter so the same applicant is not
   * automatically loaded again after a refresh.
   */
  const url = new URL(window.location.href);

  if (url.searchParams.has("request")) {
    url.searchParams.delete("request");

    window.history.replaceState(
      {},
      document.title,
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  /*
   * Clear the currently selected Supabase appointment, but keep the
   * examiner signed in and retain the loaded appointment list.
   */
  const appointmentSelect = $("emtAppointmentSelect");

  if (appointmentSelect) {
    appointmentSelect.value = "";
  }

  setEmtConnectionMessage("Evaluation reset. Examiner sign-in was preserved.");

  /*
   * Reset all applicant and evaluation controls that may not be
   * completely rewritten by a render pass.
   */
  const applicantFieldIds = [
    "appName",
    "appDate",
    "appSchool",
    "appCertificate",
    "appRating",
    "appAircraftClassUsed",
    "appExamType",
    "appRatingHeld",
    "appAmelInstrument",
    "appAircraftType",
    "appNNumber",
    "appInstructor",
    "appInstructorEmail",
    "appEmail",
    "appFTN",
    "appDMS",
    "appGroundDuration",
    "appFlightDuration",
    "appRetest",
  ];

  for (const fieldId of applicantFieldIds) {
    const element = $(fieldId);

    if (!element) continue;

    const defaultValue = modules.defaultApplicant?.[fieldId];

    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      element.value =
        defaultValue === undefined || defaultValue === null
          ? ""
          : String(defaultValue);
    }
  }

  /*
   * Explicitly restore the known applicant defaults.
   */
  if ($("appDate")) {
    $("appDate").value = new Date().toISOString().slice(0, 10);
  }

  if ($("appCertificate")) {
    $("appCertificate").value = "Private";
  }

  if ($("appRating")) {
    $("appRating").value = "ASEL";
  }

  if ($("appAircraftClassUsed")) {
    $("appAircraftClassUsed").value = "ASEL";
  }

  if ($("appExamType")) {
    $("appExamType").value = "Initial";
  }

  if ($("appRetest")) {
    $("appRetest").value = "No";
  }

  document
    .querySelectorAll('input[type="checkbox"], input[type="radio"]')
    .forEach((input) => {
      input.checked = false;
    });

  document.querySelectorAll(".outcome-btn").forEach((button) => {
    button.classList.remove("selected-sat", "selected-unsat", "selected-disc");
  });

  document
    .querySelectorAll('[data-selected="true"], .selected, .active-grade')
    .forEach((element) => {
      element.removeAttribute("data-selected");
      element.classList.remove("selected", "active-grade");
    });

  const outcomeNotes = $("outcomeNotes");

  if (outcomeNotes) {
    outcomeNotes.value = "";
  }

  const testingComplete = $("testingCompleteCheckbox");

  if (testingComplete) {
    testingComplete.checked = false;
  }

  const modal = $("confirmModal");

  if (modal) {
    modal.classList.remove("show");
  }

  ensureStoreDefaults();
  populateRatingDropdown();

  /*
   * Force a clean render after all DOM and state values are reset.
   */
  modules.notify();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

const REQUIRED_BRIEFINGS = [
  {
    id: "establishEligibility",
    title: "Establish Eligibility",
    items: [
      { text: "Welcome and make introductions", indent: 0 },
      { text: "Facilities overview", indent: 1 },
      { text: "Privacy, exits", indent: 1 },
      { text: "Restrooms", indent: 1 },
      { text: "Water, snacks", indent: 1 },

      { text: "Telephones off", indent: 0 },

      { text: "Confirm type of practical test and if a retest", indent: 0 },

      { text: "Qualify the applicant", indent: 0 },
      { text: "Application (8710-1)", indent: 1 },
      {
        text: "Photo/signature Identification (note type on 8710-1 and return)",
        indent: 1,
      },
      { text: "Airman Certificate", indent: 1 },
      { text: "Medical (note date and limitations)", indent: 1 },
      {
        text: "Foreign License and Letter of Verification of Authenticity, if applicable",
        indent: 1,
      },
      {
        text: "Knowledge test results and review endorsement, if needed",
        indent: 1,
      },
      { text: "Pilot logbook and/or training records", indent: 1 },
      { text: "Verify flight times and endorsements", indent: 1 },

      { text: "Discuss Pilots Bill of Rights", indent: 0 },
      { text: "Applicant signs IACRA 8710", indent: 0 },

      { text: "Qualify the aircraft", indent: 0 },
      { text: "Review maintenance records per Order 8900.2", indent: 1 },
      { text: "Instrument or ATP current NavData", indent: 1 },
      { text: "Inoperative equipment", indent: 1 },
    ],
  },

  {
    id: "pretestBriefing",
    title: "Pretest Briefing",
    items: [
      {
        text: "Current navigational charts and/or current NavData on Electronic Flight Bag",
        indent: 0,
      },

      { text: "Advise applicant that:", indent: 0 },
      {
        text: "The test will be done in accordance with the FAA ACS(s) and FAA Order 8900.2",
        indent: 1,
      },
      { text: "Plan of Action will be used", indent: 1 },
      { text: "Will be taking notes during test for debriefing", indent: 1 },
      { text: "Perfection is not the standard", indent: 1 },
      {
        text: "Oral questioning will continue throughout all portions of the test",
        indent: 1,
      },

      { text: "Discuss three possible outcomes", indent: 0 },
      { text: "Temporary certificate", indent: 1 },
      { text: "Letter of discontinuance", indent: 1 },
      { text: "Conditions leading to letter of discontinuance", indent: 2 },
      { text: "Notice of disapproval", indent: 1 },
      { text: "Conditions leading to disapproval", indent: 2 },

      { text: "Any questions before we begin the test?", indent: 0 },
      { text: "Collect Examiner Fee", indent: 0 },
      { text: "Announce: “The test has begun”", indent: 1 },
    ],
  },

  {
    id: "preflightBriefing",
    title: "Preflight Briefing",
    items: [
      { text: "Brief flight profile / overall scenario", indent: 0 },

      {
        text: "Applicant remains PIC under 14 CFR §61.47 during entire flight",
        indent: 0,
      },
      { text: "Exercise PIC authority at all times", indent: 1 },
      { text: "Focus on normal operations", indent: 1 },

      {
        text: "Discuss actual instrument conditions, if applicable",
        indent: 0,
      },

      { text: "Simulated emergencies", indent: 0 },
      { text: "DPE action / announcement", indent: 1 },
      { text: "Engine failure — takeoff and landing", indent: 1 },
      { text: "Other simulated emergencies", indent: 1 },
      { text: "Feathering, if applicable", indent: 2 },

      { text: "Actual emergencies", indent: 0 },
      { text: "Actual engine failure", indent: 1 },
      { text: "Other actual emergencies", indent: 1 },

      { text: "Transfer of controls — brief how it will be done", indent: 0 },

      { text: "Collision avoidance — air and ground", indent: 0 },
      { text: "Looking for reported and unreported traffic", indent: 1 },
      { text: "Clearing prior to maneuvering", indent: 1 },
      { text: "Primary responsibility", indent: 1 },

      { text: "Preflight duties", indent: 0 },
      { text: "Weight and balance", indent: 1 },
      { text: "Performance", indent: 1 },
      { text: "First flight of day", indent: 1 },
      { text: "VFR / IFR requirements", indent: 1 },
      { text: "Aircraft systems", indent: 1 },
      { text: "MEL / KOEL / inoperative equipment", indent: 1 },

      { text: "Oral questions will continue throughout the test", indent: 0 },
      { text: "Testing with POA will continue IAW ACS(s)", indent: 1 },

      { text: "Will continue to take notes", indent: 0 },
      { text: "Continue / discontinue if task is unsatisfactory", indent: 1 },
      { text: "Any questions?", indent: 1 },
      { text: "Are you ready for the flight evaluation?", indent: 1 },

      { text: "Return aircraft documents to the aircraft", indent: 0 },
      {
        text: "Observe entire preflight preparation and preflight inspection",
        indent: 0,
      },
    ],
  },

  {
    id: "postFlightBriefing",
    title: "Post Flight Briefing",
    items: [
      { text: "Ensure applicant is debriefed in private", indent: 0 },
      { text: "Encourage recommending instructor to be present", indent: 1 },
      { text: "Reaffirm the outcome of the test", indent: 1 },
      { text: "Use notes taken to debrief performance", indent: 1 },
      { text: "Highlight areas that were above standard", indent: 2 },
    ],
    groups: [
      {
        id: "satisfactory",
        title: "Satisfactory Outcome",
        outcome: "SATISFACTORY",
        items: [
          { text: "Complete paperwork", indent: 0 },
          { text: "Have airman sign temporary certificate", indent: 0 },
          {
            text: "Advise temporary certificate is valid for 120 days",
            indent: 0,
          },
          {
            text: "Explain what to do if certificate is not received",
            indent: 0,
          },
          { text: "Offer to sign airman’s logbook", indent: 0 },
        ],
      },
      {
        id: "unsatisfactory",
        title: "Unsatisfactory Outcome",
        outcome: "UNSATISFACTORY",
        items: [
          {
            text: "Allow applicant time alone while paperwork is completed",
            indent: 0,
          },
          { text: "Use ACS to explain reasons for disapproval", indent: 0 },
          {
            text: "Advise timeframe to retest and keep Notice of Disapproval",
            indent: 0,
          },
          { text: "Return knowledge test, if applicable", indent: 0 },
          { text: "Offer to sign airman’s logbook, not required", indent: 0 },
        ],
      },
      {
        id: "discontinuance",
        title: "Letter of Discontinuance",
        outcome: "DISCONTINUANCE",
        items: [
          { text: "Review items that need to be completed", indent: 0 },
          { text: "Return knowledge test, if applicable", indent: 0 },
          {
            text: "Advise timeframe to retest and keep Letter of Discontinuance",
            indent: 0,
          },
          { text: "Offer to sign airman’s logbook", indent: 0 },
        ],
      },
    ],
  },
];

document.addEventListener("DOMContentLoaded", async () => {
  wireEmergencyStartup();

  try {
    await loadModules();
  } catch (error) {
    console.error("EMT MODULE LOAD FAILED:", error);
    console.error("Module-load stack:", error?.stack || "(no stack available)");

    alert(
      `EMT module load failed:

${error?.message || error}

Open Console for the full stack.`,
    );

    return;
  }

  try {
    initApp();
  } catch (error) {
    console.error("EMT INIT FAILED:", error);
    console.error(
      "Initialization stack:",
      error?.stack || "(no stack available)",
    );

    alert(
      `EMT initialization failed:

${error?.message || error}

Open Console for the full stack.`,
    );
  }
});

function wireEmergencyStartup() {
  $("ctaBegin")?.addEventListener("click", () => {
    $("landingPage")?.classList.add("fade-out");
    document.body.classList.remove("show-landing");

    setTimeout(() => {
      $("landingPage")?.classList.add("hidden");
    }, 300);
  });

  // NEW BUTTON
  $("viewStatsBtn")?.addEventListener("click", () => {
    window.location.href = "./statistics.html";
  });

  $("btnMainMenu")?.addEventListener("click", () => {
    $("landingPage")?.classList.remove("hidden", "fade-out");
    document.body.classList.add("show-landing");
  });

  $("hamburgerBtn")?.addEventListener("click", () => {
    $("sidebar")?.classList.toggle("open");
    $("sidebarOverlay")?.classList.toggle("show");
  });

  $("sidebarOverlay")?.addEventListener("click", () => {
    $("sidebar")?.classList.remove("open");
    $("sidebarOverlay")?.classList.remove("show");
  });

  document.querySelectorAll(".view-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".view-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      document
        .querySelectorAll(".view-content")
        .forEach((view) => view.classList.remove("active"));

      const viewName = tab.dataset.view;
      const viewId = `view${viewName[0].toUpperCase()}${viewName.slice(1)}`;
      $(viewId)?.classList.add("active");
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
    exportModule,
    supabaseModule,
    ppcModule,
  ] = await Promise.all([
    import("./data/index.js"),
    import("./state/store.js"),
    import("./config/config.js"),
    import("./logic/filtering.js"),
    import("./logic/grading.js"),
    import("./views/headerView.js"),
    import("./views/sidebarView.js"),
    import("./views/detailedView.js"),
    import("./views/summaryView.js"),
    import("./views/debriefView.js"),
    import("./views/outcomeView.js"),
    import("./views/checklistView.js"),
    import("./services/exportService.js"),
    import("./services/supabaseService.js"),
    import("./views/ppcView.js"),
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
    ...exportModule,
    ...supabaseModule,
    ...ppcModule,
  };

  store = modules.store;

  try {
    const scenarioModule = await import("./views/scenarioView.js");
    modules.renderScenarioEngine = scenarioModule.renderScenarioEngine;
    modules.setScenarioDetailedRenderer?.(modules.renderDetailed);
  } catch (error) {
    console.warn(
      "Scenario engine did not load. App will continue without it.",
      error,
    );
  }
}

function initApp() {
  ensureStoreDefaults();

  loadFromLocalStorage();

  ensureStoreDefaults();
  recalculateAllOralAverages();

  populateCertificateDropdown();
  populateRatingDropdown();
  wireFullAppEvents();
  wireEmtConnectionEvents();
  startDynamicGradeRadioObserver();

  modules.bindApplicantForm?.(store, {
    onApplicantChange: handleApplicantChange,
  });

  modules.subscribe?.(() => {
    saveToLocalStorage();
    renderApp();
  });

  renderApp();

  void initializeEmtConnection();
}

const GRADE_RADIO_VALUES = ["1", "2", "3", "4", "NP"];

const GRADE_REASON_CODES = [
  "Application of Knowledge",
  "Application of Procedures",
  "Technical Knowledge",
  "Aircraft Flight Path Management",
  "Problem Solving / Decision Making",
  "Situational Awareness",
  "Workload Management",
];

function gradeRequiresReason(value) {
  return ["1", "2"].includes(String(value || ""));
}

function ensureGradeReasonStores() {
  store.gradeReasons ??= {};
  store.oralGradeReasons ??= {};
}

function normalizeReasonArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map((item) => String(item || "").trim())
        .filter((item) => GRADE_REASON_CODES.includes(item)),
    ),
  ];
}

function cleanStaleGradeReasons() {
  ensureGradeReasonStores();

  Object.keys(store.gradeReasons).forEach((gradeKey) => {
    if (!gradeRequiresReason(store.grades?.[gradeKey])) {
      delete store.gradeReasons[gradeKey];
    } else {
      const reasons = normalizeReasonArray(store.gradeReasons[gradeKey]);

      store.gradeReasons[gradeKey] = reasons.length ? [reasons[0]] : [];
    }
  });

  Object.keys(store.oralGradeReasons).forEach((rawTaskCode) => {
    if (!gradeRequiresReason(store.oralQuestionGrades?.[rawTaskCode])) {
      delete store.oralGradeReasons[rawTaskCode];
    } else {
      const reasons = normalizeReasonArray(store.oralGradeReasons[rawTaskCode]);

      store.oralGradeReasons[rawTaskCode] = reasons.length ? [reasons[0]] : [];
    }
  });
}

function getTaskReasonKeyFromSelect(select) {
  const taskCode = select?.dataset?.taskCode || "";

  const gradeType = select?.dataset?.grade || "";

  if (!taskCode || !gradeType) {
    return "";
  }

  return `${taskCode}.${gradeType}`;
}

function getTaskReasonKeyFromRadio(radio) {
  const taskCode = radio?.dataset?.taskCode || "";

  const gradeType = radio?.dataset?.grade || "";

  if (!taskCode || !gradeType) {
    return "";
  }

  return `${taskCode}.${gradeType}`;
}

function getOralDerivedReasonsForTaskGrade(taskGradeKey) {
  ensureGradeReasonStores();

  const match = String(taskGradeKey || "").match(/^(.*)\.(K|R|S)$/);

  if (!match) {
    return [];
  }

  const [, targetFilterCode, targetGradeType] = match;

  const reasons = new Set();

  Object.entries(store.oralQuestionGrades || {}).forEach(
    ([rawTaskCode, grade]) => {
      if (!gradeRequiresReason(grade)) {
        return;
      }

      const resolved = resolveScenarioGradeTarget(rawTaskCode);

      if (
        resolved.filterCode !== targetFilterCode ||
        resolved.gradeType !== targetGradeType
      ) {
        return;
      }

      normalizeReasonArray(store.oralGradeReasons?.[rawTaskCode]).forEach(
        (reason) => reasons.add(reason),
      );
    },
  );

  return Array.from(reasons);
}

function hasOralContributorsForTaskGrade(taskGradeKey) {
  const match = String(taskGradeKey || "").match(/^(.*)\.(K|R|S)$/);

  if (!match) {
    return false;
  }

  const [, targetFilterCode, targetGradeType] = match;

  return Object.keys(store.oralQuestionGrades || {}).some((rawTaskCode) => {
    const resolved = resolveScenarioGradeTarget(rawTaskCode);

    return (
      resolved.filterCode === targetFilterCode &&
      resolved.gradeType === targetGradeType
    );
  });
}

function createGradeReasonDropdown({ scope, key, grade }) {
  if (!gradeRequiresReason(grade)) {
    return null;
  }

  ensureGradeReasonStores();

  const map = scope === "oral" ? store.oralGradeReasons : store.gradeReasons;

  const existing = normalizeReasonArray(map[key]);

  const inheritedReasons =
    scope === "task" ? getOralDerivedReasonsForTaskGrade(key) : [];

  /*
   * Preserve compatibility with any autosave created by the previous
   * multi-select implementation, but use only one selected reason
   * going forward.
   */
  const selectedReason = existing[0] || inheritedReasons[0] || "";

  const select = document.createElement("select");

  select.className = "grade-reason-select";

  select.dataset.reasonScope = scope;
  select.dataset.reasonKey = key;

  const placeholder = document.createElement("option");

  placeholder.value = "";
  placeholder.textContent = "Select Reason Code";

  select.appendChild(placeholder);

  GRADE_REASON_CODES.forEach((reason) => {
    const option = document.createElement("option");

    option.value = reason;
    option.textContent = reason;

    if (reason === selectedReason) {
      option.selected = true;
    }

    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    ensureGradeReasonStores();

    const selected = String(select.value || "").trim();

    if (selected) {
      map[key] = [selected];
    } else {
      delete map[key];
    }

    saveToLocalStorage();

    window.requestAnimationFrame(syncAllGradeReasonControls);
  });

  return select;
}

function syncTaskSelectReasonControl(select) {
  const gradeKey = getTaskReasonKeyFromSelect(select);

  if (!gradeKey) {
    return;
  }

  const grade = String(select.value || store.grades?.[gradeKey] || "NP");

  const gradeBar = select.closest(".grade-bar");

  if (!gradeBar) {
    return;
  }

  /*
   * Use one dedicated reason-code row beneath the K / R / S controls.
   * This preserves the entire grade line without allowing a reason
   * dropdown to push R or S onto another line.
   */
  let reasonRow = gradeBar.querySelector(":scope > .grade-reason-row");

  if (!reasonRow) {
    reasonRow = document.createElement("div");

    reasonRow.className = "grade-reason-row";

    gradeBar.appendChild(reasonRow);
  }

  let host = reasonRow.querySelector(
    `[data-task-reason-key="${CSS.escape(gradeKey)}"]`,
  );

  if (!gradeRequiresReason(grade)) {
    host?.remove();

    if (!reasonRow.children.length) {
      reasonRow.remove();
    }

    return;
  }

  if (!host) {
    host = document.createElement("div");

    host.className = "grade-reason-host grade-reason-host-task";

    host.dataset.taskReasonKey = gradeKey;

    reasonRow.appendChild(host);
  }

  host.innerHTML = "";

  const gradeType = select.dataset.grade || "";

  const label = document.createElement("div");

  label.className = "grade-reason-grade-label";

  label.textContent = gradeType ? `${gradeType} Reason Code` : "Reason Code";

  host.appendChild(label);

  const dropdown = createGradeReasonDropdown({
    scope: "task",
    key: gradeKey,
    grade,
  });

  if (dropdown) {
    host.appendChild(dropdown);
  }
}

function syncDirectTaskRadioReasonControl(radio) {
  const gradeKey = getTaskReasonKeyFromRadio(radio);

  if (!gradeKey) {
    return;
  }

  const grade = String(store.grades?.[gradeKey] || "NP");

  const group = radio.closest(".grade-radio-group");

  if (!group) {
    return;
  }

  const gradeBar = group.closest(".grade-bar");

  /*
   * Prefer the same dedicated row used by Detailed View.
   * Fall back to the group's parent for any special Flight layout
   * that does not use .grade-bar.
   */
  const layoutParent = gradeBar || group.parentElement;

  if (!layoutParent) {
    return;
  }

  let reasonRow = layoutParent.querySelector(":scope > .grade-reason-row");

  if (!reasonRow) {
    reasonRow = document.createElement("div");

    reasonRow.className = "grade-reason-row";

    layoutParent.appendChild(reasonRow);
  }

  let host = reasonRow.querySelector(
    `[data-task-reason-key="${CSS.escape(gradeKey)}"]`,
  );

  if (!gradeRequiresReason(grade)) {
    host?.remove();

    if (!reasonRow.children.length) {
      reasonRow.remove();
    }

    return;
  }

  if (!host) {
    host = document.createElement("div");

    host.className = "grade-reason-host grade-reason-host-task";

    host.dataset.taskReasonKey = gradeKey;

    reasonRow.appendChild(host);
  }

  host.innerHTML = "";

  const gradeType = radio.dataset.grade || "";

  const label = document.createElement("div");

  label.className = "grade-reason-grade-label";

  label.textContent = gradeType ? `${gradeType} Reason Code` : "Reason Code";

  host.appendChild(label);

  const dropdown = createGradeReasonDropdown({
    scope: "task",
    key: gradeKey,
    grade,
  });

  if (dropdown) {
    host.appendChild(dropdown);
  }
}

function syncOralReasonControl(group) {
  const radio = group.querySelector('input[type="radio"][data-task-code]');

  const rawTaskCode = radio?.dataset?.taskCode || "";

  if (!rawTaskCode) {
    return;
  }

  const grade = String(store.oralQuestionGrades?.[rawTaskCode] || "NP");

  const question = group.closest(".scenario-question");

  const summary = question?.querySelector(":scope > summary");

  if (!question || !summary) {
    return;
  }

  let host = question.querySelector(":scope > .grade-reason-host");

  if (!gradeRequiresReason(grade)) {
    host?.remove();
    return;
  }

  if (!host) {
    host = document.createElement("div");

    host.className = "grade-reason-host grade-reason-host-oral";

    summary.insertAdjacentElement("afterend", host);
  }

  host.innerHTML = "";

  const dropdown = createGradeReasonDropdown({
    scope: "oral",
    key: rawTaskCode,
    grade,
  });

  if (dropdown) {
    host.appendChild(dropdown);
  }
}

function syncAllGradeReasonControls() {
  cleanStaleGradeReasons();

  document
    .querySelectorAll("select[data-grade]")
    .forEach(syncTaskSelectReasonControl);

  /*
   * Individual Oral Portion question radios do not use the hidden
   * select system.
   */
  document
    .querySelectorAll(".scenario-question-grade-radios")
    .forEach(syncOralReasonControl);

  /*
   * Support any Flight Portion grade radios rendered directly rather
   * than from an upgraded select.
   */
  document
    .querySelectorAll(
      '#viewScenario input[type="radio"][data-grade][data-task-code]',
    )
    .forEach((radio) => {
      if (radio.closest(".scenario-question-grade-radios")) {
        return;
      }

      syncDirectTaskRadioReasonControl(radio);
    });
}

function collectMissingGradeReasons() {
  cleanStaleGradeReasons();

  const missing = [];

  /*
   * Validate every independently graded Oral Portion question.
   */
  Object.entries(store.oralQuestionGrades || {}).forEach(
    ([rawTaskCode, grade]) => {
      if (!gradeRequiresReason(grade)) {
        return;
      }

      const reasons = normalizeReasonArray(
        store.oralGradeReasons?.[rawTaskCode],
      );

      if (!reasons.length) {
        missing.push(`Oral question ${rawTaskCode} — Grade ${grade}`);
      }
    },
  );

  /*
   * Validate task K/R/S grades.
   *
   * A Detailed View task grade derived from Oral questions is covered
   * by the reason codes attached to those individual Oral grades, so
   * it is not double-counted here.
   */
  Object.entries(store.grades || {}).forEach(([gradeKey, grade]) => {
    if (!gradeRequiresReason(grade)) {
      return;
    }

    if (hasOralContributorsForTaskGrade(gradeKey)) {
      return;
    }

    const reasons = normalizeReasonArray(store.gradeReasons?.[gradeKey]);

    if (!reasons.length) {
      missing.push(`${gradeKey} — Grade ${grade}`);
    }
  });

  return missing;
}

function escapeGradeRadioValue(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function gradeRadioGroupName(select, index) {
  const taskCode =
    select.dataset.taskCode ||
    select.closest("[data-task-card]")?.dataset.taskCard ||
    select.closest("[data-task-code]")?.dataset.taskCode ||
    "task";

  const gradeType = select.dataset.grade || "grade";

  const safeTaskCode = String(taskCode).replace(/[^a-zA-Z0-9_-]/g, "_");

  const safeGradeType = String(gradeType).replace(/[^a-zA-Z0-9_-]/g, "_");

  return `grade_${safeTaskCode}_${safeGradeType}_${index}`;
}

function syncGradeRadioGroup(select) {
  const wrapper = select
    .closest(".grade-radio-control")
    ?.querySelector(".grade-radio-group");

  if (!wrapper) return;

  const selectedValue = String(select.value || "NP");

  wrapper.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.checked = radio.value === selectedValue;

    radio
      .closest(".grade-radio-option")
      ?.classList.toggle("selected", radio.checked);
  });
}

function upgradeGradeSelectsToRadios(root = document) {
  const selects = Array.from(
    root.querySelectorAll(
      'select[data-grade]:not([data-radio-upgraded="true"])',
    ),
  );

  selects.forEach((select, index) => {
    select.dataset.radioUpgraded = "true";

    const groupName = gradeRadioGroupName(select, index);

    const currentValue = String(select.value || "NP");

    const radioGroup = document.createElement("span");

    radioGroup.className = "grade-radio-group";
    radioGroup.setAttribute("role", "radiogroup");

    const taskCode = select.dataset.taskCode || "";

    const gradeType = select.dataset.grade || "";

    radioGroup.setAttribute(
      "aria-label",
      `${gradeType} grade${taskCode ? ` for ${taskCode}` : ""}`,
    );

    radioGroup.innerHTML = GRADE_RADIO_VALUES.map((value) => {
      const escapedValue = escapeGradeRadioValue(value);

      const checked = currentValue === value ? " checked" : "";

      const selectedClass = currentValue === value ? " selected" : "";

      return `
            <label class="grade-radio-option${selectedClass}">
              <input
                type="radio"
                name="${groupName}"
                value="${escapedValue}"
                ${checked}
              >
              <span>${escapedValue}</span>
            </label>
          `;
    }).join("");

    const control = document.createElement("span");

    control.className = "grade-radio-control";

    select.parentNode.insertBefore(control, select);

    control.appendChild(select);
    control.appendChild(radioGroup);

    select.classList.add("grade-select-radio-source");

    radioGroup.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.addEventListener("change", (event) => {
        if (!event.target.checked) {
          return;
        }

        select.value = event.target.value;

        syncGradeRadioGroup(select);

        select.dispatchEvent(
          new Event("change", {
            bubbles: true,
          }),
        );
      });
    });

    select.addEventListener("change", () => {
      syncGradeRadioGroup(select);
    });

    syncGradeRadioGroup(select);
  });

  /*
   * Keep reason-code controls synchronized whenever grade controls
   * are upgraded or refreshed.
   */
  window.requestAnimationFrame(syncAllGradeReasonControls);
}

function startDynamicGradeRadioObserver() {
  if (window.emsGradeRadioObserver) {
    return;
  }

  let upgradeScheduled = false;

  const scheduleUpgrade = () => {
    if (upgradeScheduled) {
      return;
    }

    upgradeScheduled = true;

    window.requestAnimationFrame(() => {
      upgradeScheduled = false;

      upgradeGradeSelectsToRadios(document);

      document.querySelectorAll("select[data-grade]").forEach((select) => {
        syncGradeRadioGroup(select);
      });
    });
  };

  const observer = new MutationObserver((mutations) => {
    const containsGradeControl = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) => {
        if (!(node instanceof Element)) {
          return false;
        }

        return (
          node.matches?.("select[data-grade]") ||
          node.querySelector?.("select[data-grade]")
        );
      }),
    );

    if (containsGradeControl) {
      scheduleUpgrade();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.emsGradeRadioObserver = observer;

  /*
   * The Oral / Flight Portion can update grade selects directly when
   * its task checkbox is changed. Resynchronize the visible radios
   * after those existing handlers finish.
   */
  document.addEventListener("change", (event) => {
    if (
      !event.target.closest?.("#viewScenario") &&
      !event.target.closest?.("#scenario-root")
    ) {
      return;
    }

    window.setTimeout(scheduleUpgrade, 0);
  });

  scheduleUpgrade();
}

function ensureStoreDefaults() {
  store.applicant ??= {};
  store.applicant.appCertificate ??= "Private";
  store.applicant.appRating ??= "ASEL";
  store.applicant.appAircraftClassUsed ??= "ASEL";
  store.applicant.appExamType ??= "Initial";
  store.applicant.knowledgeTestRequired ??=
    modules.isKnowledgeTestRequired?.(store.applicant.appExamType) ??
    store.applicant.appExamType !== "Additional";
  store.applicant.appRatingHeld ??= "";
  store.applicant.appAmelInstrument ??= "";
  store.applicant.appEmail ??= "";
  store.applicant.appInstructorEmail ??= "";
  store.applicant.feeAmount ??= null;
  store.applicant.practicalTestRequestId ??= "";
  store.applicant.requestNumber ??= "";
  store.applicant.scheduledStartAt ??= "";
  store.applicant.scheduledEndAt ??= "";
  store.applicant.scheduledLocation ??= "";
  store.showAllTasksReferenceMode ??= false;
  store.practicalTestOutcome ??= "";
  store.discontinuanceManuallySelected ??= false;

  store.checkedElements ??= {};
  store.grades ??= {};
  store.expandedTasks ??= {};
  store.examinerNotes ??= {};
  store.outcomeNotes ??= "";
  store.selectedScenario ??= "Scenario 1";
  store.activeView ??= "detailed";
  store.selectedAcsCodes ??= [];
  store.aktUploadStatus ??= "";
  store.acsDecoderOpen ??= false;

  store.evaluationMode ??= store.applicant.evaluationMode || "acs";
  store.applicant.evaluationMode = store.evaluationMode;

  store.requiredBriefings ??= {};
  store.expandedBriefings ??= {};
  store.eligibilityChecks ??= {};
  store.expandedEligibilitySections ??= {};
  store.oralQuestionGrades ??= {};

  store.ppcPacket ??= null;
  store.ppcGrades ??= {};
  store.ppcExpandedTasks ??= {};
  store.ppcLoading ??= false;
  store.ppcLoadError ??= "";
  store.ppcAircraftConfiguration ??= "airplane";
  store.ppcLastSyncedAt ??= "";
  store.ppcActiveSectionId ??= null;
  store.ppcActiveView ??= "detailed";
  store.ppcOutcomeNotes ??= "";
  store.ppcPracticalTestOutcome ??= "";
  store.ppcEventCompleted ??= false;
  store.ppcEventEmailError ??= "";
}

function formatRatingLabel(rating) {
  const labels = {
    ASEL: "ASEL",
    AMEL: "AMEL",
    ASES: "ASES",
    AMES: "AMES",
    GLIDER: "Glider",
    "Instrument Airplane": "Instrument Airplane",
    "Pilot Proficiency Check (61.58)":
      "Pilot Proficiency Check (61.58)",
    "Flight Engineer Proficiency Check (91.529)":
      "Flight Engineer Proficiency Check (91.529)",
    "Reciprocating Engine Powered": "Reciprocating Engine Powered",
    "Turbopropeller Powered": "Turbopropeller Powered",
    "Turbojet Powered": "Turbojet Powered",
  };

  return labels[rating] || rating;
}

function populateCertificateDropdown() {
  const certificateSelect = $("appCertificate");

  if (!certificateSelect) return;

  const currentCertificate = store.applicant.appCertificate || "Private";

  certificateSelect.innerHTML = Object.entries(modules.CERT_CONFIG || {})
    .map(
      ([value, cfg]) =>
        `<option value="${escapeHtml(value)}">${escapeHtml(cfg.label || value)}</option>`,
    )
    .join("");

  if (
    currentCertificate &&
    !Object.prototype.hasOwnProperty.call(
      modules.CERT_CONFIG || {},
      currentCertificate,
    )
  ) {
    const option = document.createElement("option");
    option.value = currentCertificate;
    option.textContent = currentCertificate;
    certificateSelect.appendChild(option);
  }

  certificateSelect.value = currentCertificate;
}

function populateRatingDropdown() {
  const certificate = store.applicant.appCertificate || "Private";
  const cfg = modules.CERT_CONFIG?.[certificate];
  const ratingSelect = $("appRating");

  if (!cfg || !ratingSelect) return;

  ratingSelect.disabled = certificate === "Instrument";

  const ratings = modules.getCertificateRatings
    ? modules.getCertificateRatings(certificate, store.applicant.appRating)
    : [...cfg.ratings];

  ratingSelect.innerHTML = ratings
    .map(
      (rating) =>
        `<option value="${rating}">${formatRatingLabel(rating)}</option>`,
    )
    .join("");

  if (!ratings.includes(store.applicant.appRating)) {
    store.applicant.appRating = ratings[0] || "";
  }

  ratingSelect.value = store.applicant.appRating;
}

function applyApplicantLookupData(data) {
  /*
   * Appointment-specific values must replace the prior appointment,
   * including when the new value is blank.
   */

  /*
   * Evaluation durations must never carry from one appointment into
   * another. A blank value from appointmentToApplicantData is
   * authoritative and explicitly clears the prior evaluation.
   */
  for (const durationField of ["appGroundDuration", "appFlightDuration"]) {
    if (Object.prototype.hasOwnProperty.call(data, durationField)) {
      const value = String(data[durationField] || "").trim();

      store.applicant[durationField] = value;

      const input = $(durationField);

      if (input) {
        input.value = value;
      }
    }
  }
  for (const durationField of ["appGroundDuration", "appFlightDuration"]) {
    if (Object.prototype.hasOwnProperty.call(data, durationField)) {
      const value = String(data[durationField] || "").trim();

      store.applicant[durationField] = value;

      const input = $(durationField);

      if (input) {
        input.value = value;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, "appDMS")) {
    const dms = String(data.appDMS || "").trim();

    store.applicant.appDMS = dms;

    const dmsInput = $("appDMS");

    if (dmsInput) {
      dmsInput.value = dms;
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, "appRating")) {
    const rating = String(data.appRating || "").trim();

    store.applicant.appRating = rating;

    const ratingInput = $("appRating");

    if (ratingInput && rating) {
      if (
        ratingInput.tagName === "SELECT" &&
        !Array.from(ratingInput.options).some(
          (option) => option.value === rating,
        )
      ) {
        const option = document.createElement("option");

        option.value = rating;
        option.textContent = rating;

        ratingInput.appendChild(option);
      }

      ratingInput.value = rating;
    }
  }

  /*
   * Appointment evaluation-family metadata is authoritative.
   *
   * PPC and ACS use the same applicant store. Empty PPC values are
   * meaningful when an ACS appointment is selected: they explicitly
   * clear the PPC identity from the previously loaded appointment.
   *
   * Do this before the normal field map because that map intentionally
   * ignores empty strings for ordinary form fields.
   */
  if (Object.prototype.hasOwnProperty.call(data, "evaluationMode")) {
    setEvaluationMode(data.evaluationMode || "acs");
  }

  if (Object.prototype.hasOwnProperty.call(data, "ppcType")) {
    store.applicant.ppcType = data.ppcType || "";
  }

  if (Object.prototype.hasOwnProperty.call(data, "knowledgeTestRequired")) {
    store.applicant.knowledgeTestRequired = data.knowledgeTestRequired;
  }

  /*
   * A normal ACS appointment must completely sever itself from any
   * previously loaded PPC state.
   */
  if (!isCurrentEmtPpc()) {
    store.applicant.ppcType = "";
    store.applicant.ppcTypeRatingDesignation = "";
    store.applicant.ppcAircraftTypeCertificateHolder = "";
    store.applicant.ppcAircraftCivilModelDesignation = "";

    store.ppcPacket = null;
    store.ppcGrades = {};
    store.ppcExpandedTasks = {};
    store.ppcAircraftConfiguration = null;
    store.ppcLastSyncedAt = null;
  }

  if (Object.prototype.hasOwnProperty.call(data, "ppcTypeRatingDesignation")) {
    store.applicant.ppcTypeRatingDesignation =
      data.ppcTypeRatingDesignation || "";
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "ppcAircraftTypeCertificateHolder",
    )
  ) {
    store.applicant.ppcAircraftTypeCertificateHolder =
      data.ppcAircraftTypeCertificateHolder || "";
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "ppcAircraftCivilModelDesignation",
    )
  ) {
    store.applicant.ppcAircraftCivilModelDesignation =
      data.ppcAircraftCivilModelDesignation || "";
  }

  const certificateValue =
    data.appCertificate ||
    (data.RatingSought?.Value === "Instrument"
      ? "Instrument"
      : {
          "Private Pilot": "Private",
          "Instrument Rating": "Instrument",
          "Commercial Pilot": "Commercial",
          "Airline Transport Pilot": "ATP",
          "Flight Instructor": "CFI",
        }[data.GradeofCertificateSought?.Value] ||
        data.GradeofCertificateSought?.Value);

  const examTypeValue = normalizeEmtExamType(
    data.appExamType || data.IssuanceType?.Value || data.IssuanceType,
  );

  const fieldMap = {
    appName: data.appName || data.Name,
    appDate: data.appDate || data.FinalizedDateandTime?.slice(0, 10),
    appSchool: data.appSchool || data.FlightSchool?.Value || data.FlightSchool,
    appCertificate: certificateValue,
    appRating: data.appRating || data.RatingSought?.Value,
    appExamType: examTypeValue,
    appAircraftType: data.appAircraftType || data.TypeofAircraft,
    appNNumber: data.appNNumber || data.AircraftRegistration,
    appInstructor: data.appInstructor || data.RecommendingInstructorName,
    appInstructorEmail:
      data.appInstructorEmail || data.RecommendingInstructorEmail,
    appEmail: data.appEmail || data.ApplicantEmail,
    appFTN: data.appFTN || data.FTNNumber,
    appDMS: data.appDMS || data.DMSPreapprovalNumber,
    feeAmount: data.feeAmount ?? data.fee_amount ?? data.FeeAmount ?? null,
    practicalTestRequestId: data.practicalTestRequestId || "",
    requestNumber: data.requestNumber || "",
    scheduledStartAt: data.scheduledStartAt || "",
    scheduledEndAt: data.scheduledEndAt || "",
    scheduledLocation: data.scheduledLocation || "",

    appRetest:
      data.appRetest ||
      data.Retest?.Value ||
      data.Retest ||
      data.IsRetest?.Value ||
      data.IsRetest ||
      data.Title ||
      "No",
  };

  Object.entries(fieldMap).forEach(([fieldId, value]) => {
    if (value === undefined || value === null || value === "") return;

    const input = $(fieldId);

    if (input) {
      /*
       * Appointment data from EMS is the source of truth.
       * For select controls, preserve values that are not already
       * present in EMT's static option list by adding them dynamically.
       */
      if (
        input.tagName === "SELECT" &&
        !Array.from(input.options).some(
          (option) => option.value === String(value),
        )
      ) {
        const option = document.createElement("option");
        option.value = String(value);
        option.textContent = String(value);
        input.appendChild(option);
      }

      input.value = value;
    }

    store.applicant[fieldId] = value;
  });

  populateRatingDropdown();

  /*
   * Data application ends here.
   * loadAppointmentIntoEmt() exclusively owns rendering.
   */
  if (!isCurrentEmtPpc()) {
    store.activeAreaId = null;
    scenarioRendered = false;
    restoreAcsChrome();
  }
}

function normalizeEmtCertificate(value) {
  const normalized = String(value || "").trim();

  const map = {
    Private: "Private",
    "Private Pilot": "Private",
    Instrument: "Instrument",
    "Instrument Rating": "Instrument",
    Commercial: "Commercial",
    "Commercial Pilot": "Commercial",
    ATP: "ATP",
    "Airline Transport Pilot": "ATP",
    CFI: "CFI",
    "Flight Instructor": "CFI",
    "Proficiency Check": "Proficiency Check",
    "Pilot Proficiency Check (61.58)": "Proficiency Check",
    "Flight Engineer Proficiency Check (91.529)": "Proficiency Check",
    "Type Rating": "Type Rating",
    "Flight Engineer": "Flight Engineer",
  };

  return map[normalized] || normalized;
}

function getAppointmentDmsPreapprovalNumber(appointment) {
  const candidates = [
    appointment?.dms_preapproval_number,
    appointment?.dms_preapproval,
    appointment?.dms_number,
    appointment?.dms_preapproval_no,
    appointment?.dms_preapproval_code,
  ];

  for (const candidate of candidates) {
    const value = String(candidate ?? "").trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function normalizeEmtRating(appointment) {
  const values = [
    appointment.class_sought,
    appointment.rating_sought,
    appointment.category_sought,
    appointment.practical_test_type_name,
    appointment.practical_test_display_name,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim());

  /*
   * EMS may describe the same rating several ways:
   *
   *   Airplane — Single-Engine Sea
   *   Airplane - Single Engine Sea
   *   Single-Engine Sea
   *   ASES
   *
   * Normalize punctuation before matching so they all resolve to the
   * EMT rating codes used by the ACS datasets.
   */
  const joined = values
    .join(" ")
    .toLowerCase()
    .replace(/[—–-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (joined.includes("ases") || joined.includes("single engine sea")) {
    return "ASES";
  }

  if (
    joined.includes("ames") ||
    joined.includes("multi engine sea") ||
    joined.includes("multiengine sea")
  ) {
    return "AMES";
  }

  if (
    joined.includes("amel") ||
    joined.includes("multi engine land") ||
    joined.includes("multiengine land")
  ) {
    return "AMEL";
  }

  if (joined.includes("asel") || joined.includes("single engine land")) {
    return "ASEL";
  }

  if (joined.includes("instrument airplane")) {
    return "Instrument Airplane";
  }

  return appointment.class_sought || appointment.rating_sought || "";
}

function normalizeEmtExamType(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (
    normalized === "additional" ||
    normalized === "additional_rating" ||
    normalized.includes("additional_rating")
  ) {
    return "Additional";
  }

  /*
   * The EMT form has two ACS choices: Initial and Additional.
   * Supabase stores original issuances as `original`; older payloads
   * may use Initial or Original Issuance. PPC remains in its separate
   * evaluation mode and uses Initial for this shared informational field.
   */
  return "Initial";
}

function formatEmtAppointmentLabel(appointment) {
  const start = appointment.scheduled_start_at
    ? new Date(appointment.scheduled_start_at)
    : null;

  const dateLabel =
    start && !Number.isNaN(start.getTime())
      ? start.toLocaleString([], {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "Date not finalized";

  const testLabel = [
    appointment.certificate_sought,
    appointment.class_sought || appointment.rating_sought,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    appointment.request_number || "Request",
    appointment.applicant_name || "Applicant",
    dateLabel,
    testLabel,
  ]
    .filter(Boolean)
    .join(" · ");
}

/* ============================================================
   PPC / FAA FORM 8410-1 EVALUATION ROUTING

   PPC evaluations are a separate FAA 8410-1 evaluation family.

   Normal practical test:
     ACS engine → K/R/S → 1/2/3/4/NP

   Proficiency Check:
     FAA 8410-1 → S/U/W

   Do not route PPC appointments through ACS_DATASETS.
   ============================================================ */

function getEmtPpcType(appointment) {
  const values = [
    appointment?.certificate_code,
    appointment?.practical_test_certificate_code,
    appointment?.practical_test_type_certificate_code,
    appointment?.certificate_sought,
    appointment?.rating_sought,
    appointment?.class_sought,
    appointment?.issuance_type,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim());

  const joined = values.join(" ").toLowerCase();

  if (
    joined.includes("pilot_ppc_6158") ||
    joined.includes("pilot proficiency check") ||
    joined.includes("61.58") ||
    joined.includes("ppc_6158")
  ) {
    return "pilot";
  }

  if (
    joined.includes("flight_engineer_ppc_91529") ||
    joined.includes("flight engineer proficiency check") ||
    joined.includes("91.529") ||
    joined.includes("ppc_91529")
  ) {
    return "flight_engineer";
  }

  const issuance = String(appointment?.issuance_type || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (issuance === "proficiency_check") {
    const certificate = String(
      appointment?.certificate_sought || "",
    ).toLowerCase();

    if (certificate.includes("flight engineer")) {
      return "flight_engineer";
    }

    /*
     * The only other currently-supported proficiency-check family
     * is the Pilot 61.58 PPC.
     */
    return "pilot";
  }

  return "";
}

function isEmtPpcAppointment(appointment) {
  return Boolean(getEmtPpcType(appointment));
}

function appointmentToApplicantData(appointment) {
  /*
   * Pure appointment -> EMT applicant mapping.
   * Evaluation routing/rendering happens elsewhere.
   */
  const appointmentIsPpc = isEmtPpcAppointment(appointment);

  const aircraftType = [appointment.aircraft_make, appointment.aircraft_model]
    .filter(Boolean)
    .join(" ")
    .trim();

  const examType = normalizeEmtExamType(
    appointment.issuance_type ||
      appointment.issuance_name ||
      appointment.issuance_code,
  );

  const explicitKnowledgeTestRequirement =
    appointment.knowledge_test_required ??
    appointment.requires_knowledge_test ??
    appointment.airman_knowledge_test_required ??
    null;

  return {
    appName: appointment.applicant_name,
    appEmail: appointment.applicant_email,
    appDate:
      appointment.scheduled_start_at?.slice(0, 10) ||
      new Date().toISOString().slice(0, 10),
    appSchool: appointment.flight_school_name,
    appCertificate: appointmentIsPpc
      ? "Proficiency Check"
      : normalizeEmtCertificate(appointment.certificate_sought),
    appRating: appointmentIsPpc
      ? getEmtPpcType(appointment) === "flight_engineer"
        ? "Flight Engineer Proficiency Check (91.529)"
        : "Pilot Proficiency Check (61.58)"
      : normalizeEmtRating(appointment),
    appExamType: examType,
    knowledgeTestRequired:
      modules.isKnowledgeTestRequired?.(
        examType,
        explicitKnowledgeTestRequirement,
      ) ?? examType !== "Additional",
    appAircraftType: aircraftType || appointment.aircraft_description,
    appNNumber: appointment.aircraft_registration,
    appInstructor: appointment.instructor_name,
    appInstructorEmail: appointment.instructor_email,
    appFTN: appointment.ftn_number,
    appDMS: getAppointmentDmsPreapprovalNumber(appointment),

    /*
     * Durations are evaluation-specific. Do not carry them from the
     * previously selected applicant into a new appointment.
     */
    appGroundDuration: "",
    appFlightDuration: "",

    /*
     * Ground and flight duration belong to the selected evaluation,
     * not to the next appointment. Explicitly clear them whenever a
     * different EMS appointment is loaded so values cannot bleed
     * between applicants.
     */

    feeAmount: appointment.fee_amount,
    appRetest: appointment.is_retest ? "Yes" : "No",
    practicalTestRequestId: appointment.request_id,
    requestNumber: appointment.request_number,
    scheduledStartAt: appointment.scheduled_start_at,
    scheduledEndAt: appointment.scheduled_end_at,
    scheduledLocation: appointment.scheduled_location,

    evaluationMode: appointmentIsPpc ? "ppc_8410_1" : "acs",

    ppcType: appointmentIsPpc ? getEmtPpcType(appointment) : "",

    ppcTypeRatingDesignation:
      appointment.ppc_type_rating_designation ||
      appointment.type_rating_designation ||
      "",

    ppcAircraftTypeCertificateHolder:
      appointment.ppc_aircraft_type_certificate_holder || "",

    ppcAircraftCivilModelDesignation:
      appointment.ppc_aircraft_civil_model_designation || "",
  };
}
async function loadAppointmentIntoEmt(appointment) {
  if (!appointment?.request_id) {
    throw new Error("A valid EMT appointment is required.");
  }

  /*
   * Every appointment change gets a new generation number.
   * If an older PPC request finishes later, it is stale and must not
   * become authoritative again.
   */
  window.emtAppointmentLoadGeneration =
    (window.emtAppointmentLoadGeneration || 0) + 1;

  const generation = window.emtAppointmentLoadGeneration;
  const isPpc = isEmtPpcAppointment(appointment);

  /*
   * AKTR deficiencies belong to one applicant/evaluation only. Never let
   * codes or upload feedback carry into the next selected appointment.
   */
  store.selectedAcsCodes = [];
  store.aktUploadStatus = "";
  store.ppc8410AirmanName = "";
  store.ppc8410EmployedBy = "";
  store.ppc8410BasedAt = "";
  store.ppc8410Remarks = null;
  store.ppc8410Region = "";
  store.ppc8410DistrictOffice = "";
  store.ppc8410SignatureDataUrl = "";
  store.ppcEventCompleted = false;
  store.ppcEventEmailError = "";

  if (isPpc) {
    /*
     * Explicitly enter PPC before anything can render.
     */
    setEvaluationMode("ppc_8410_1");
    store.applicant.ppcType = getEmtPpcType(appointment);

    store.ppcPacket = null;
    store.ppcGrades = {};
    store.ppcExpandedTasks = {};
    store.ppcAircraftConfiguration = null;
    store.ppcLastSyncedAt = null;
    store.ppcLoading = true;
    store.ppcActiveSectionId = null;
    store.ppcActiveView = "detailed";
    store.ppcOutcomeNotes = "";
    store.ppcPracticalTestOutcome = "";

    store.activeAreaId = null;
    scenarioRendered = false;

    const applicantData = appointmentToApplicantData(appointment);
    applyApplicantLookupData(applicantData);

    /*
     * Show PPC loading state.
     */
    renderApp();

    await loadPpcEvaluationIntoEmt(appointment.request_id, generation);

    /*
     * Another appointment may have been selected while the PPC RPC
     * was running. Never allow this old response to own the UI again.
     */
    if (generation !== window.emtAppointmentLoadGeneration) {
      return;
    }

    setEvaluationMode("ppc_8410_1");
    store.ppcLoading = false;

    renderApp();
    return;
  }

  /*
   * Explicitly enter ACS FIRST.
   *
   * This happens before applicant mapping or rendering so no remaining
   * PPC packet/type/async callback can route renderApp() back to PPC.
   */
  setEvaluationMode("acs");
  store.applicant.ppcType = "";

  exitPpcModeForAcsAppointment();

  const applicantData = appointmentToApplicantData(appointment);

  /*
   * Force the mapped appointment to remain ACS regardless of any old
   * PPC fields that may exist in persisted state.
   */
  applicantData.evaluationMode = "acs";
  applicantData.ppcType = "";

  applyApplicantLookupData(applicantData);

  /*
   * Reassert ACS after application as a hard boundary.
   */
  setEvaluationMode("acs");
  store.applicant.ppcType = "";

  store.ppcPacket = null;
  store.ppcGrades = {};
  store.ppcExpandedTasks = {};
  store.ppcAircraftConfiguration = null;
  store.ppcLastSyncedAt = null;
  store.ppcLoading = false;
  store.ppcLoadError = "";
  store.ppcActiveSectionId = null;
  store.ppcActiveView = "detailed";
  store.ppcOutcomeNotes = "";
  store.ppcPracticalTestOutcome = "";

  store.activeAreaId = null;
  scenarioRendered = false;

  restoreAcsChrome();

  /*
   * Exactly one normal ACS render.
   */
  renderApp();
}

function setEmtConnectionMessage(message, isError = false) {
  const appointmentMessage = $("emtAppointmentMessage");

  const landingMessage = $("emtLandingAuthMessage");

  const text = message || "";

  const color = isError ? "var(--danger)" : "var(--text-muted)";

  if (appointmentMessage) {
    appointmentMessage.textContent = text;

    appointmentMessage.style.color = color;
  }

  if (landingMessage) {
    landingMessage.textContent = text;

    landingMessage.style.color = isError ? "#ff8a80" : "rgba(255,255,255,.72)";
  }
}

function getEmtExaminerDisplayName(user) {
  if (!user) {
    return "";
  }

  const metadata = user.user_metadata || {};

  const candidates = [
    metadata.preferred_name,
    metadata.first_name,
    metadata.given_name,
    metadata.full_name,
    metadata.name,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || "").trim();

    if (value) {
      /*
       * For a full name, use the first name for the landing greeting.
       */
      return value.split(/\s+/)[0];
    }
  }

  const email = String(user.email || "").trim();

  if (email) {
    const prefix = email.split("@")[0];

    return prefix
      .split(/[._-]+/)[0]
      .replace(/^./, (character) => character.toUpperCase());
  }

  return "Examiner";
}

function showEmtSignedInState(user) {
  const loginFields = $("emtLoginFields");

  const appointmentFields = $("emtAppointmentFields");

  const signOutButton = $("btnEmtSignOut");

  const status = $("emtAuthStatus");

  const signedInLanding = $("emtSignedInLanding");

  const welcome = $("emtWelcome");

  const protectedContent = $("landingProtectedContent");

  const isSignedIn = Boolean(user);

  if (loginFields) {
    loginFields.style.display = isSignedIn ? "none" : "grid";
  }

  if (signedInLanding) {
    signedInLanding.style.display = isSignedIn ? "flex" : "none";
  }

  if (appointmentFields) {
    appointmentFields.style.display = isSignedIn ? "block" : "none";
  }

  if (signOutButton) {
    signOutButton.style.display = isSignedIn ? "inline-flex" : "none";
  }

  if (protectedContent) {
    protectedContent.style.display = isSignedIn ? "block" : "none";
  }

  if (welcome) {
    welcome.textContent = isSignedIn
      ? `Welcome ${getEmtExaminerDisplayName(user)}`
      : "";
  }

  if (status) {
    status.textContent = isSignedIn
      ? `Signed in as ${user.email || "examiner"}`
      : "Not signed in";
  }

  /*
   * Do not leave stale authentication messages visible.
   */
  if (isSignedIn) {
    const landingMessage = $("emtLandingAuthMessage");

    if (landingMessage) {
      landingMessage.textContent = "";
    }
  }
}
async function refreshEmtAppointments() {
  const select = $("emtAppointmentSelect");
  const button = $("btnLoadEmtAppointments");

  if (!select) return;

  const originalText = button?.innerHTML;

  try {
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading';
    }

    setEmtConnectionMessage("Loading appointments...");

    const appointments = await modules.loadEmtAppointments();

    window.emtAppointmentsById = new Map(
      appointments.map((appointment) => [appointment.request_id, appointment]),
    );

    const currentRequestId = store.applicant?.practicalTestRequestId || "";

    select.innerHTML = `
      <option value="">Select an appointment...</option>
      ${appointments
        .map((appointment) => {
          const selected =
            appointment.request_id === currentRequestId ? " selected" : "";

          return `
            <option
              value="${appointment.request_id}"
              ${selected}
            >
              ${formatEmtAppointmentLabel(appointment)}
            </option>
          `;
        })
        .join("")}
    `;

    const requestedRequestId =
      new URLSearchParams(window.location.search).get("request")?.trim() || "";

    if (requestedRequestId) {
      const requestedAppointment =
        window.emtAppointmentsById.get(requestedRequestId);

      if (requestedAppointment) {
        select.value = requestedRequestId;

        await loadAppointmentIntoEmt(requestedAppointment);

        setEmtConnectionMessage(
          `${
            requestedAppointment.request_number || "Appointment"
          } loaded from Supabase.`,
        );

        return;
      }

      setEmtConnectionMessage(
        "The requested appointment was not found or is not assigned to this examiner.",
        true,
      );

      return;
    }

    setEmtConnectionMessage(
      appointments.length
        ? `${appointments.length} appointment${
            appointments.length === 1 ? "" : "s"
          } available.`
        : "No accepted, scheduled, or confirmed appointments were found.",
    );
  } catch (error) {
    console.error("Unable to load EMT appointments:", error);

    setEmtConnectionMessage(
      error instanceof Error ? error.message : "Unable to load appointments.",
      true,
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }
}

async function initializeEmtConnection() {
  try {
    const user = await modules.getCurrentEmtUser();

    showEmtSignedInState(user);

    if (user) {
      await refreshEmtAppointments();
    }
  } catch (error) {
    console.error("Unable to initialize EMT Web App connection:", error);

    showEmtSignedInState(null);

    setEmtConnectionMessage(
      error instanceof Error
        ? error.message
        : "Unable to check sign-in status.",
      true,
    );
  }
}

function wireEmtConnectionEvents() {
  $("emtLoginPassword")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    $("btnEmtSignIn")?.click();
  });

  $("btnEmtSignIn")?.addEventListener("click", async () => {
    const email = $("emtLoginEmail")?.value?.trim() || "";
    const password = $("emtLoginPassword")?.value || "";
    const button = $("btnEmtSignIn");
    const originalText = button?.innerHTML;

    if (!email || !password) {
      setEmtConnectionMessage("Enter your examiner email and password.", true);
      return;
    }

    try {
      if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In';
      }

      const user = await modules.signInEmtExaminer(email, password);

      showEmtSignedInState(user);

      if ($("emtLoginPassword")) {
        $("emtLoginPassword").value = "";
      }

      await refreshEmtAppointments();
    } catch (error) {
      console.error("Examiner sign-in failed:", error);

      setEmtConnectionMessage(
        error instanceof Error ? error.message : "Sign-in failed.",
        true,
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = originalText;
      }
    }
  });

  $("btnEmtSignOut")?.addEventListener("click", async () => {
    try {
      await modules.signOutEmtExaminer();

      showEmtSignedInState(null);

      document.body.classList.add("show-landing");

      const select = $("emtAppointmentSelect");

      if (select) {
        select.innerHTML = '<option value="">Select an appointment...</option>';
      }

      setEmtConnectionMessage("");
    } catch (error) {
      console.error("Examiner sign-out failed:", error);

      setEmtConnectionMessage(
        error instanceof Error ? error.message : "Sign-out failed.",
        true,
      );
    }
  });

  $("btnLoadEmtAppointments")?.addEventListener(
    "click",
    refreshEmtAppointments,
  );

  $("emtAppointmentSelect")?.addEventListener("change", async (event) => {
    const requestId = event.target.value;

    if (!requestId) return;

    const appointment = window.emtAppointmentsById?.get(requestId);

    if (!appointment) {
      setEmtConnectionMessage(
        "The selected appointment could not be loaded.",
        true,
      );
      return;
    }

    await loadAppointmentIntoEmt(appointment);

    setEmtConnectionMessage(
      `${appointment.request_number || "Appointment"} loaded into the gradesheet.`,
    );
  });
}

function handleApplicantChange(field, value) {
  if (field === "appCertificate") {
    const cfg = modules.CERT_CONFIG?.[value];

    if (cfg) {
      store.applicant.appCertificate = value;
      store.applicant.appRating = cfg.ratings[0] || "";
      store.applicant.appRatingHeld = "";
      populateRatingDropdown();
    }
  }

  if (field === "appRating") {
    store.applicant.appRating = value;
    store.applicant.appRatingHeld = "";
  }

  if (field === "appExamType") {
    store.applicant.appExamType = value;
    store.applicant.knowledgeTestRequired =
      modules.isKnowledgeTestRequired?.(value) ?? value !== "Additional";
    store.applicant.appRatingHeld = "";

    // NEW
    store.retestSelectedTasks ??= [];

    if (value === "Retest") {
      store.retestSelectedTasks = [];
    }
  }

  modules.updateApplicant(field, value);
}

function isCurrentEmtPpc() {
  /*
   * One source of truth for evaluation family.
   *
   * Do NOT infer PPC from:
   * - selected appointment DOM
   * - old PPC packet
   * - old ppcType
   * - previously selected request
   *
   * The appointment loader explicitly sets evaluationMode.
   */
  return store?.evaluationMode === "ppc_8410_1";
}

function setEvaluationMode(mode) {
  const normalizedMode = mode === "ppc_8410_1" ? "ppc_8410_1" : "acs";

  store.evaluationMode = normalizedMode;
  store.applicant ??= {};
  store.applicant.evaluationMode = normalizedMode;
}

function syncEvaluationModeFieldVisibility() {
  const evaluationMode = isCurrentEmtPpc() ? "ppc_8410_1" : "acs";

  document.querySelectorAll("[data-hide-evaluation-mode]").forEach((field) => {
    const hiddenModes = String(field.dataset.hideEvaluationMode || "")
      .split(/\s+/)
      .filter(Boolean);

    const shouldHide = hiddenModes.includes(evaluationMode);

    /*
     * .form-group has an explicit display rule in the EMT stylesheet,
     * so the HTML hidden attribute alone is not authoritative here.
     *
     * Set display directly for evaluation-mode fields and remove the
     * inline override when returning to ACS so the normal stylesheet
     * resumes control.
     */
    field.hidden = shouldHide;
    field.classList.toggle("hidden", shouldHide);

    if (shouldHide) {
      field.style.setProperty("display", "none", "important");
    } else {
      field.style.removeProperty("display");
    }
  });
}

function buildPpcGradePayload() {
  const packet = store.ppcPacket;

  if (!packet?.tasks?.length) {
    return [];
  }

  return packet.tasks
    .map((task) => {
      const local = store.ppcGrades?.[task.id] || {};

      const grade = local.grade_value || task.grade_value || "";

      const remarks = local.remarks ?? task.remarks ?? "";

      if (!grade) {
        return null;
      }

      return {
        ppc_task_id: task.id,

        grade_value: grade,

        remarks: String(remarks || "").trim() || null,
      };
    })
    .filter(Boolean);
}

function seedPpcGradesFromPacket(packet) {
  store.ppcGrades ??= {};

  for (const task of packet?.tasks || []) {
    /*
     * Preserve local/offline work if it already exists.
     * Otherwise seed from the database packet.
     */
    if (!store.ppcGrades[task.id]) {
      store.ppcGrades[task.id] = {
        grade_value: task.grade_value || "",

        remarks: task.remarks || "",
      };
    }
  }
}

async function loadPpcEvaluationIntoEmt(
  practicalTestRequestId,
  expectedGeneration = window.emtAppointmentLoadGeneration,
) {
  if (!practicalTestRequestId) {
    return false;
  }

  /*
   * DATA LOADER ONLY.
   *
   * Do not notify or render from here. Appointment routing owns the UI.
   */
  store.ppcLoading = true;
  store.ppcLoadError = "";

  try {
    const packet = await modules.loadPpcEvaluation(practicalTestRequestId);

    /*
     * Discard a PPC result if another appointment was selected while
     * the request was running.
     */
    if (
      expectedGeneration !== window.emtAppointmentLoadGeneration ||
      !isCurrentEmtPpc() ||
      store.applicant.practicalTestRequestId !== practicalTestRequestId
    ) {
      return false;
    }

    store.ppcPacket = packet;

    if (packet?.aircraft_configuration) {
      store.ppcAircraftConfiguration = packet.aircraft_configuration;
    }

    seedPpcGradesFromPacket(packet);

    if (packet?.certificate_code === "FLIGHT_ENGINEER_PPC_91529") {
      store.applicant.ppcType = "flight_engineer";
    } else if (packet?.certificate_code === "PILOT_PPC_6158") {
      store.applicant.ppcType = "pilot";
    }

    if (packet?.aircraft_used) {
      store.applicant.appAircraftType = packet.aircraft_used;
    }

    store.ppcLoading = false;
    store.ppcLoadError = "";

    const sections = modules.getPpcSections?.(packet) || [];

    if (
      !store.ppcActiveSectionId ||
      !sections.some((section) => section.id === store.ppcActiveSectionId)
    ) {
      store.ppcActiveSectionId = sections[0]?.id || null;
    }

    setEmtConnectionMessage(
      `${store.applicant.requestNumber || "PPC"} loaded in FAA 8410-1 grading mode.`,
    );

    return true;
  } catch (error) {
    console.error("Unable to load PPC evaluation:", error);

    /*
     * A stale PPC request must not modify a newer ACS appointment.
     */
    if (
      expectedGeneration !== window.emtAppointmentLoadGeneration ||
      !isCurrentEmtPpc()
    ) {
      return false;
    }

    store.ppcLoading = false;
    store.ppcLoadError =
      error instanceof Error ? error.message : "Unable to load PPC evaluation.";

    setEmtConnectionMessage(
      store.ppcPacket?.tasks?.length
        ? "PPC is using the locally cached task set because the server could not be reached."
        : store.ppcLoadError,
      !store.ppcPacket?.tasks?.length,
    );

    return false;
  }
}

function queuePpcDraftSync() {
  if (!isCurrentEmtPpc()) {
    return;
  }

  /*
   * Local storage is already updated by modules.notify().
   * Network sync is secondary so the EMT remains usable offline.
   */
  window.clearTimeout(ppcDraftSaveTimer);

  ppcDraftSaveTimer = window.setTimeout(async () => {
    const requestId = store.applicant?.practicalTestRequestId;

    if (!requestId || !store.ppcPacket) {
      return;
    }

    try {
      const result = await modules.savePpcEvaluation({
        practicalTestRequestId: requestId,

        grades: buildPpcGradePayload(),

        finalize: false,

        startedAt: store.applicant?.scheduledStartAt || null,

        aircraftUsed:
          store.applicant?.appAircraftType ||
          store.ppcPacket?.aircraft_used ||
          null,

        examinerNotes: store.ppcOutcomeNotes || null,

        aircraftConfiguration:
          store.applicant?.ppcType === "pilot"
            ? store.ppcAircraftConfiguration || "airplane"
            : null,
      });

      store.ppcLastSyncedAt = result?.saved_at || new Date().toISOString();

      saveToLocalStorage();

      setEmtConnectionMessage(
        `${store.applicant.requestNumber || "PPC"} saved.`,
      );
    } catch (error) {
      console.warn("PPC draft network sync deferred:", error);

      setEmtConnectionMessage(
        `${store.applicant.requestNumber || "PPC"} saved locally. Server sync will be retried when changes are made with connectivity.`,
      );
    }
  }, 700);
}

function setPpcTaskGrade(taskId, grade) {
  /* PPC MUTATION GUARD */
  if (!isCurrentEmtPpc()) {
    return;
  }

  const task = store.ppcPacket?.tasks?.find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  if (grade === "W" && !task.waiver_allowed) {
    alert("Waiver is not authorized for this FAA 8410-1 task.");
    return;
  }

  store.ppcGrades ??= {};

  store.ppcGrades[taskId] = {
    ...store.ppcGrades[taskId],

    grade_value: grade,

    remarks: store.ppcGrades[taskId]?.remarks ?? task.remarks ?? "",
  };

  modules.notify();
  queuePpcDraftSync();
}

function setPpcTaskRemarks(taskId, remarks) {
  /* PPC MUTATION GUARD */
  if (!isCurrentEmtPpc()) {
    return;
  }

  store.ppcGrades ??= {};

  const task = store.ppcPacket?.tasks?.find((item) => item.id === taskId);

  store.ppcGrades[taskId] = {
    ...store.ppcGrades[taskId],

    grade_value:
      store.ppcGrades[taskId]?.grade_value || task?.grade_value || "",

    remarks,
  };

  /*
   * Do not force a full render on every keystroke.
   * Save locally immediately and debounce network synchronization.
   */
  saveToLocalStorage();
  queuePpcDraftSync();
}

function togglePpcTask(taskId) {
  /* PPC MUTATION GUARD */
  if (!isCurrentEmtPpc()) {
    return;
  }

  store.ppcExpandedTasks ??= {};

  store.ppcExpandedTasks[taskId] = !store.ppcExpandedTasks[taskId];

  modules.notify();
}

function configurePpcChrome(summary) {
  /*
   * Never allow PPC chrome to be re-applied during an ACS evaluation.
   */
  if (!isCurrentEmtPpc()) {
    return;
  }

  document.body.classList.add("emt-ppc-mode");

  const packet = store.ppcPacket;

  const isFlightEngineer =
    packet?.certificate_code === "FLIGHT_ENGINEER_PPC_91529" ||
    store.applicant?.ppcType === "flight_engineer";

  const title = isFlightEngineer
    ? "Flight Engineer Proficiency Check (91.529)"
    : "Pilot Proficiency Check (61.58)";

  const subtitle = document.getElementById("pageSubtitle");

  if (subtitle) {
    subtitle.textContent = `${title} · FAA Form 8410-1`;
  }

  const sidebarRating = document.getElementById("sidebarRating");

  if (sidebarRating) {
    sidebarRating.textContent = title;
  }

  const decoder = document.getElementById("acsCodeDecoder");

  if (decoder) {
    decoder.style.display = "none";
  }

  const filterBanner = document.getElementById("filterBanner");

  if (filterBanner) {
    filterBanner.style.display = "none";
  }

  document.querySelectorAll(".grade-scale-bar").forEach((element) => {
    element.innerHTML = `
        <div class="grade-chip g3">
          S Satisfactory
        </div>

        <div class="grade-chip g1">
          U Unsatisfactory
        </div>

        <div class="grade-chip">
          W Waived
        </div>
      `;
  });

  /*
   * ACS POA/Oral Flight engine is a different evaluation family.
   */
  const scenarioTab = document.querySelector('.view-tab[data-view="scenario"]');

  if (scenarioTab) {
    scenarioTab.style.display = "none";
  }

  /*
   * Keep the normal EMT navigation shell: Eligibility,
   * Required Briefings, Detailed, Summary, Debrief and Outcome.
   */
  modules.renderPpcStats?.(summary);
}

function exitPpcModeForAcsAppointment() {
  /*
   * Tear down PPC state only.
   *
   * Do not destroy shared sidebar or grading DOM. The ACS renderer
   * immediately replaces PPC content after appointment data is loaded.
   */
  store.ppcPacket = null;
  store.ppcGrades = {};
  store.ppcExpandedTasks = {};
  store.ppcAircraftConfiguration = null;
  store.ppcLastSyncedAt = null;
  store.ppcLoading = false;

  setEvaluationMode("acs");
  store.applicant.ppcType = "";
  store.applicant.ppcTypeRatingDesignation = "";
  store.applicant.ppcAircraftTypeCertificateHolder = "";
  store.applicant.ppcAircraftCivilModelDesignation = "";

  store.activeAreaId = null;
  scenarioRendered = false;

  restoreAcsChrome();
}

function restoreAcsChrome() {
  document.body.classList.remove("emt-ppc-mode");

  /*
   * PPC presents different summary fields and therefore replaces the
   * contents of the shared summary bar. The original ACS stats renderer
   * expects every one of these IDs to exist. Recreate the original ACS
   * structure before renderStats() runs so an ACS appointment can finish
   * its render instead of stopping with PPC sidebar/task DOM still visible.
   */
  const gradeSummaryBar = document.getElementById("gradeSummaryBar");

  if (
    gradeSummaryBar &&
    [
      "summOverall",
      "summPassed",
      "summFailed",
      "summAvgK",
      "summAvgR",
      "summAvgS",
    ].some((id) => !document.getElementById(id))
  ) {
    gradeSummaryBar.innerHTML = `
      <div class="summary-item">
        <span>Overall:</span>
        <span class="summary-badge badge-incomplete" id="summOverall">
          INCOMPLETE
        </span>
      </div>
      <div class="summary-item">
        <span>Passed:</span> <span id="summPassed">0</span>
      </div>
      <div class="summary-item">
        <span>Failed:</span> <span id="summFailed">0</span>
      </div>
      <div class="summary-item">
        <span>Avg K:</span> <span id="summAvgK">--</span>
      </div>
      <div class="summary-item">
        <span>Avg R:</span> <span id="summAvgR">--</span>
      </div>
      <div class="summary-item">
        <span>Avg S:</span> <span id="summAvgS">--</span>
      </div>
    `;
  }

  /*
   * PPC replaces the normal 1–4 / NP legend with S/U/W.
   * Restore the original ACS legend whenever normal ACS mode renders.
   */
  document.querySelectorAll(".grade-scale-bar").forEach((element) => {
    element.innerHTML = `
      <div class="grade-chip g1">1 Unsatisfactory</div>
      <div class="grade-chip g2">2 Standard w/ Debrief</div>
      <div class="grade-chip g3">3 Meets Standard</div>
      <div class="grade-chip g4">4 Above Standard</div>
      <div class="grade-chip gnp">NP Not Performed</div>
    `;
  });

  /*
   * A finalized PPC replaces the normal outcome actions with its 8410
   * review action. Restore the original ACS controls as part of the same
   * boundary teardown.
   */
  const outcomeActions = document.getElementById("outcomeOnlyActions");

  if (
    outcomeActions &&
    (!document.getElementById("btnSaveHTML") ||
      !document.getElementById("btnSaveEvaluation"))
  ) {
    outcomeActions.innerHTML = `
      <button class="btn" id="btnSaveHTML">
        <i class="fas fa-file-pdf"></i> Save/Print Checkride Report
      </button>

      <button
        class="btn btn-accent"
        id="btnSaveEvaluation"
        type="button"
        title="Save the evaluation and mark the scheduling request completed"
      >
        <i class="fas fa-database"></i>
        Submit Practical Test to Database
      </button>
    `;

    document
      .getElementById("btnSaveHTML")
      ?.addEventListener("click", generateCheckrideReport);

    document
      .getElementById("btnSaveEvaluation")
      ?.addEventListener("click", submitPracticalTestToDatabase);
  }

  /*
   * PPC owns a different Outcome view and replaces this container in full.
   * The original ACS outcome renderer updates the controls already present;
   * it does not recreate them. Restore the source-of-truth ACS structure
   * before renderOutcome() runs.
   */
  const outcomeView = document.getElementById("viewOutcome");

  if (
    outcomeView &&
    (!document.getElementById("outcomeButtons") ||
      !document.getElementById("incompleteTasksContent") ||
      !document.getElementById("testReportActions") ||
      !document.getElementById("outcomeNotes"))
  ) {
    outcomeView.innerHTML = `
      <div class="outcome-section">
        <h3 style="font-family:var(--font-mono);margin-bottom:4px;">
          Practical Test Outcome
        </h3>

        <p
          id="outcomeAutoLabel"
          style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted);margin:0 0 14px;"
        >
          <i class="fas fa-sync-alt"></i> Auto-selected from Overall Grade
        </p>

        <div class="outcome-buttons" id="outcomeButtons">
          <button class="outcome-btn" data-outcome="satisfactory">
            <i class="fas fa-check-circle"></i> Satisfactory
          </button>

          <button class="outcome-btn" data-outcome="unsatisfactory">
            <i class="fas fa-times-circle"></i> Unsatisfactory
          </button>

          <button class="outcome-btn" data-outcome="discontinuance">
            <i class="fas fa-pause-circle"></i> Discontinuance
          </button>
        </div>

        <div class="outcome-notes">
          <label>Outcome Notes</label>
          <textarea
            id="outcomeNotes"
            placeholder="Enter outcome notes, letters of discontinuance details, areas for retest, etc."
          ></textarea>
        </div>

        <div class="incomplete-tasks-list" id="incompleteTasksList">
          <h4>
            <i class="fas fa-exclamation-triangle"></i>
            Incomplete / Failed Tasks
          </h4>
          <div id="incompleteTasksContent"></div>
        </div>

        <div id="testReportActionsContainer">
          <div id="testReportActions" class="report-actions-grid">
            <div class="report-action-card">
              <h3><i class="fas fa-user"></i> Applicant Report</h3>

              <button id="printApplicantReportBtn" class="btn">
                <i class="fas fa-file-pdf"></i>
                Save / Print Applicant Test Report
              </button>

              <button id="emailApplicantReportBtn" class="btn">
                <i class="fas fa-envelope"></i>
                Email Applicant Test Report
              </button>
            </div>

            <div class="report-action-card">
              <h3><i class="fas fa-user-tie"></i> Designee Report</h3>

              <button id="printDesigneeReportBtn" class="btn">
                <i class="fas fa-file-pdf"></i>
                Save / Print Designee Test Report
              </button>

              <button
                id="regenerateStoredReportsBtn"
                type="button"
                class="btn btn-secondary"
                style="margin-left:8px;"
              >
                <i class="fas fa-rotate"></i>
                Regenerate Stored Reports
              </button>

              <button id="emailDesigneeReportBtn" class="btn">
                <i class="fas fa-envelope"></i>
                Email Designee Test Report
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const saveButton = document.getElementById("btnSaveEvaluation");

  if (saveButton) {
    saveButton.innerHTML = `
      <i class="fas fa-database"></i>
      Submit Practical Test to Database
    `;

    saveButton.title =
      "Save the evaluation and mark the scheduling request completed";
  }

  const reportButton = document.getElementById("btnSaveHTML");

  if (reportButton) {
    reportButton.style.display = "";
  }

  const decoder = document.getElementById("acsCodeDecoder");

  if (decoder) {
    decoder.style.display = "";
  }

  const scenarioTab = document.querySelector('.view-tab[data-view="scenario"]');

  if (scenarioTab) {
    scenarioTab.style.display = "";
  }
}

function renderPpcOutcome(summary) {
  const container = document.getElementById("viewOutcome");

  if (!container) return;

  const failed = summary.statuses.filter((row) => row.status === "fail");

  const incomplete = summary.statuses.filter(
    (row) => row.status === "incomplete",
  );

  const resultClass =
    summary.overall === "SATISFACTORY"
      ? "selected-sat"
      : summary.overall === "UNSATISFACTORY"
        ? "selected-unsat"
        : "";

  container.innerHTML = `
    <div class="outcome-section">
      <h3
        style="
          font-family:var(--font-mono);
          margin-bottom:4px;
        "
      >
        Proficiency Check Outcome
      </h3>

      <p
        style="
          font-family:var(--font-mono);
          font-size:.78rem;
          color:var(--text-muted);
          margin:0 0 14px;
        "
      >
        Automatically determined from FAA 8410-1 task grades.
      </p>

      <div class="outcome-buttons">
        <button
          class="outcome-btn ${
            resultClass === "selected-sat" ? "selected-sat" : ""
          }"
          disabled
        >
          <i class="fas fa-check-circle"></i>
          Satisfactory
        </button>

        <button
          class="outcome-btn ${
            resultClass === "selected-unsat" ? "selected-unsat" : ""
          }"
          disabled
        >
          <i class="fas fa-times-circle"></i>
          Unsatisfactory
        </button>
      </div>

      <div
        style="
          margin-top:16px;
          padding:14px;
          border:1px solid #d0d7de;
          border-radius:10px;
          background:#f8fafc;
        "
      >
        <strong>
          ${summary.overall}
        </strong>

        <div style="margin-top:6px;">
          ${summary.graded} of
          ${summary.total}
          applicable FAA 8410-1 tasks graded.
        </div>
      </div>

      ${
        failed.length
          ? `
            <div
              class="incomplete-tasks-list"
              style="margin-top:16px;"
            >
              <h4>
                <i class="fas fa-exclamation-triangle"></i>
                Unsatisfactory Tasks
              </h4>

              ${failed
                .map(
                  ({ task }) => `
                    <div>
                      Task ${escapeHtml(task.task_number)} —
                      ${escapeHtml(task.task_name)}
                    </div>
                  `,
                )
                .join("")}
            </div>
          `
          : ""
      }

      ${
        incomplete.length
          ? `
            <div
              class="incomplete-tasks-list"
              style="margin-top:16px;"
            >
              <h4>
                <i class="fas fa-circle-exclamation"></i>
                Tasks Remaining
              </h4>

              <div>
                ${incomplete.length}
                task${incomplete.length === 1 ? "" : "s"}
                still require a grade.
              </div>
            </div>
          `
          : ""
      }

      <div class="outcome-notes">
        <label>
          Examiner / Outcome Notes
        </label>

        <textarea
          id="outcomeNotes"
          placeholder="Enter PPC outcome notes..."
        >${escapeHtml(store.ppcOutcomeNotes || "")}</textarea>
      </div>
    </div>
  `;

  const notes = document.getElementById("outcomeNotes");

  if (notes) {
    notes.addEventListener("input", () => {
      store.ppcOutcomeNotes = notes.value;

      saveToLocalStorage();
      queuePpcDraftSync();
    });
  }
}

function renderPpcApp() {
  /*
   * HARD PPC RENDER BOUNDARY
   *
   * A stale PPC callback is never allowed to modify shared EMT DOM
   * after the examiner has selected a normal ACS appointment.
   */
  if (!isCurrentEmtPpc()) {
    return;
  }

  const packet = store.ppcPacket;

  if (store.ppcLoading && !packet) {
    configurePpcChrome({
      total: 0,
      graded: 0,
      satisfactory: 0,
      unsatisfactory: 0,
      waived: 0,
      overall: "INCOMPLETE",
      progressPct: 0,
    });

    const detail = document.getElementById("viewDetailed");

    if (detail) {
      detail.innerHTML = `
        <div
          style="
            padding:24px;
            border:1px solid #d0d7de;
            border-radius:10px;
          "
        >
          <i class="fas fa-spinner fa-spin"></i>
          Loading FAA 8410-1 task set...
        </div>
      `;
    }

    return;
  }

  if (!packet?.tasks?.length) {
    configurePpcChrome({
      total: 0,
      graded: 0,
      satisfactory: 0,
      unsatisfactory: 0,
      waived: 0,
      overall: "INCOMPLETE",
      progressPct: 0,
    });

    const detail = document.getElementById("viewDetailed");

    if (detail) {
      detail.innerHTML = `
        <div
          style="
            padding:24px;
            border:1px solid #ef4444;
            border-radius:10px;
          "
        >
          <strong>
            FAA 8410-1 tasks could not be loaded.
          </strong>

          <div style="margin-top:8px;">
            ${escapeHtml(
              store.ppcLoadError || "No cached PPC task set is available.",
            )}
          </div>
        </div>
      `;
    }

    return;
  }

  const sections = modules.getPpcSections(packet);

  if (
    !store.ppcActiveSectionId ||
    !sections.some((section) => section.id === store.ppcActiveSectionId)
  ) {
    store.ppcActiveSectionId = sections[0]?.id || null;
  }

  const summary = modules.summarizePpc(packet, store.ppcGrades);

  configurePpcChrome(summary);

  modules.renderPpcSidebar(
    sections,
    summary,
    store.ppcActiveSectionId,
    (sectionId) => {
      if (!isCurrentEmtPpc()) {
        return;
      }

      store.ppcActiveSectionId = sectionId;
      modules.notify();
    },
    store.ppcGrades,
  );

  syncActiveView();

  const activeSection = sections.find(
    (section) => section.id === store.ppcActiveSectionId,
  );

  modules.renderPpcDetailed(
    document.getElementById("viewDetailed"),
    activeSection,
    store,
    {
      onGradeChange: setPpcTaskGrade,

      onToggleTask: togglePpcTask,

      onRemarksChange: setPpcTaskRemarks,
    },
  );

  modules.renderPpcSummary(
    document.getElementById("viewSummary"),
    packet,
    store.ppcGrades,
  );

  /*
   * Debrief can continue to use the EMT notes workflow.
   * The normal ACS Debrief renderer is intentionally not given
   * fake ACS tasks.
   */
  const debrief = document.getElementById("viewDebrief");

  if (debrief) {
    const unsat = summary.statuses.filter((row) => row.status === "fail");

    debrief.innerHTML = `
      <div class="summary-area-card">
        <h3>
          PPC Debrief Notes
        </h3>

        ${
          unsat.length
            ? unsat
                .map(({ task }) => {
                  const note =
                    store.ppcGrades?.[task.id]?.remarks || task.remarks || "";

                  return `
                      <div
                        style="
                          padding:10px 0;
                          border-bottom:1px solid #e5e7eb;
                        "
                      >
                        <strong>
                          Task ${escapeHtml(task.task_number)} —
                          ${escapeHtml(task.task_name)}
                        </strong>

                        <div>
                          ${escapeHtml(note || "No examiner note entered.")}
                        </div>
                      </div>
                    `;
                })
                .join("")
            : `
              <p>
                No unsatisfactory PPC tasks.
              </p>
            `
        }
      </div>
    `;
  }

  renderPpcOutcome(summary);

  store.ppcPracticalTestOutcome =
    summary.overall === "SATISFACTORY" || summary.overall === "UNSATISFACTORY"
      ? summary.overall
      : "";

  /*
   * Keep the existing Eligibility and Required Briefings tabs
   * operational for now.
   */
  renderRequiredBriefings(document.getElementById("viewChecklists"));

  modules.renderEligibility?.(
    document.getElementById("viewEligibility"),
    store.applicant,
    store,
  );

  if (["finalized", "completed"].includes(packet.evaluation_status)) {
    renderCompletedPpcActions();
  } else {
    const saveButton = document.getElementById("btnSaveEvaluation");

    if (saveButton) {
      saveButton.innerHTML = `
        <i class="fas fa-file-signature"></i>
        Complete PPC
      `;

      saveButton.title = "Finalize the PPC grades in EMT";
    }

    const reportButton = document.getElementById("btnSaveHTML");

    if (reportButton) {
      reportButton.style.display = "none";
    }
  }
}

function ensurePpc8410ReviewOverlay() {
  let overlay = document.getElementById("emtPpc8410Overlay");

  if (overlay) {
    return overlay;
  }

  overlay = document.createElement("div");

  overlay.id = "emtPpc8410Overlay";

  overlay.innerHTML = `
    <style>
      #emtPpc8410Overlay {
        position: fixed;
        inset: 0;
        z-index: 100000;
        background: rgba(15, 23, 42, .88);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 18px;
      }

      #emtPpc8410Overlay.show {
        display: flex;
      }

      .emt-8410-window {
        width: min(1180px, 98vw);
        height: min(94vh, 1000px);
        background: white;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow:
          0 25px 60px
          rgba(0,0,0,.35);
      }

      .emt-8410-toolbar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        background: #0b315b;
        color: white;
      }

      .emt-8410-toolbar h3 {
        flex: 1;
        margin: 0;
        font-size: 1rem;
      }

      .emt-8410-toolbar button {
        border: 0;
        border-radius: 7px;
        padding: 8px 13px;
        cursor: pointer;
        font-weight: 700;
      }

      .emt-8410-close {
        background: #e5e7eb;
        color: #111827;
      }

      .emt-8410-download {
        background: #d6a740;
        color: #10233f;
      }

      #emtPpc8410Frame {
        width: 100%;
        flex: 1;
        border: 0;
        background: #ddd;
      }

      .emt-8410-status {
        padding: 8px 14px;
        border-top: 1px solid #d1d5db;
        color: #4b5563;
        font-size: .82rem;
      }
    </style>

    <div class="emt-8410-window">
      <div class="emt-8410-toolbar">
        <h3>
          FAA Form 8410-1 — Review
        </h3>

        <button
          type="button"
          id="emtPpc8410Download"
          class="emt-8410-download"
        >
          <i class="fas fa-file-arrow-down"></i>
          Save PDF
        </button>

        <button
          type="button"
          id="emtPpc8410Close"
          class="emt-8410-close"
        >
          Close
        </button>
      </div>

      <iframe
        id="emtPpc8410Frame"
        title="FAA Form 8410-1 Preview"
      ></iframe>

      <div
        style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
          padding:12px 14px;
          border-top:1px solid #d1d5db;
          background:#f8fafc;
        "
      >

        <label
          style="
            grid-column:1 / -1;
            display:flex;
            flex-direction:column;
            gap:5px;
            font-size:.78rem;
            font-weight:700;
            color:#334155;
          "
        >
          Name of Airman

          <input
            id="emtPpc8410AirmanName"
            type="text"
            autocomplete="off"
            placeholder="Last Name, First Name, Middle Initial"
            style="
              width:100%;
              box-sizing:border-box;
              padding:8px 10px;
              border:1px solid #cbd5e1;
              border-radius:6px;
              font:inherit;
              font-weight:400;
            "
          />
        </label>

<label
          style="
            display:flex;
            flex-direction:column;
            gap:5px;
            font-size:.78rem;
            font-weight:700;
            color:#334155;
          "
        >
          Employed By
          <input
            id="emtPpc8410EmployedBy"
            type="text"
            autocomplete="off"
            style="
              padding:8px 10px;
              border:1px solid #cbd5e1;
              border-radius:6px;
              font:inherit;
              font-weight:400;
            "
          />
        </label>

        <label
          style="
            display:flex;
            flex-direction:column;
            gap:5px;
            font-size:.78rem;
            font-weight:700;
            color:#334155;
          "
        >
          Based At
          <input
            id="emtPpc8410BasedAt"
            type="text"
            autocomplete="off"
            placeholder="City and State"
            style="
              padding:8px 10px;
              border:1px solid #cbd5e1;
              border-radius:6px;
              font:inherit;
              font-weight:400;
            "
          />
        </label>

        <label
          style="
            grid-column:1 / -1;
            display:flex;
            flex-direction:column;
            gap:5px;
            font-size:.78rem;
            font-weight:700;
            color:#334155;
          "
        >
          Remarks

          <textarea
            id="emtPpc8410Remarks"
            rows="7"
            autocomplete="off"
            placeholder="Enter remarks as they should appear on FAA Form 8410-1"
            style="
              width:100%;
              min-height:135px;
              resize:vertical;
              padding:10px;
              border:1px solid #cbd5e1;
              border-radius:6px;
              font:inherit;
              font-weight:400;
              line-height:1.35;
            "
          ></textarea>
        </label>

        <label
          style="
            display:flex;
            flex-direction:column;
            gap:5px;
            font-size:.78rem;
            font-weight:700;
            color:#334155;
          "
        >
          Region

          <input
            id="emtPpc8410Region"
            type="text"
            autocomplete="off"
            placeholder="FAA Region"
            style="
              padding:8px 10px;
              border:1px solid #cbd5e1;
              border-radius:6px;
              font:inherit;
              font-weight:400;
            "
          />
        </label>

        <label
          style="
            display:flex;
            flex-direction:column;
            gap:5px;
            font-size:.78rem;
            font-weight:700;
            color:#334155;
          "
        >
          District Office

          <input
            id="emtPpc8410DistrictOffice"
            type="text"
            autocomplete="off"
            placeholder="FAA District Office"
            style="
              padding:8px 10px;
              border:1px solid #cbd5e1;
              border-radius:6px;
              font:inherit;
              font-weight:400;
            "
          />
        </label>

        <div
          style="
            grid-column:1 / -1;
            display:flex;
            flex-direction:column;
            gap:7px;
          "
        >
          <div
            style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:10px;
            "
          >
            <strong
              style="
                font-size:.78rem;
                color:#334155;
              "
            >
              Inspector's Signature
            </strong>

            <button
              type="button"
              id="emtPpc8410ClearSignature"
              style="
                border:1px solid #cbd5e1;
                background:white;
                border-radius:6px;
                padding:6px 10px;
                cursor:pointer;
                font-weight:700;
                color:#334155;
              "
            >
              Clear Signature
            </button>
          </div>

          <canvas
            id="emtPpc8410Signature"
            width="900"
            height="180"
            style="
              display:block;
              width:100%;
              height:135px;
              background:white;
              border:1px solid #94a3b8;
              border-radius:8px;
              touch-action:none;
              cursor:crosshair;
            "
          ></canvas>

          <div
            style="
              font-size:.72rem;
              color:#64748b;
            "
          >
            Sign above using your finger, Apple Pencil, stylus, or mouse.
          </div>
        </div>
      </div>

      <div
        id="emtPpc8410Status"
        class="emt-8410-status"
      >
        Generated from the finalized EMT PPC grades.
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("emtPpc8410Close")?.addEventListener("click", () => {
    overlay.classList.remove("show");
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      overlay.classList.remove("show");
    }
  });

  return overlay;
}

function formatPpc8410AirmanName(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  // Preserve manually corrected FAA-style names.
  if (raw.includes(",")) {
    return raw;
  }

  const parts = raw.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[1]}, ${parts[0]}`;
  }

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const middleName = parts.slice(1, -1)[0] || "";

  const middleInitial = middleName ? middleName.charAt(0).toUpperCase() : "";

  return `${lastName}, ${firstName}${middleInitial ? ` ${middleInitial}` : ""}`;
}

function getPpc8410GradeMap() {
  const map = new Map();

  for (const task of store.ppcPacket?.tasks || []) {
    const grade =
      store.ppcGrades?.[task.id]?.grade_value || task.grade_value || "";

    map.set(Number(task.task_number), grade);
  }

  return map;
}

function getPpc8410Remarks() {
  const lines = [];

  for (const task of store.ppcPacket?.tasks || []) {
    const note = store.ppcGrades?.[task.id]?.remarks || task.remarks || "";

    if (String(note).trim()) {
      lines.push(
        `${task.task_number}. ${task.task_name}: ${String(note).trim()}`,
      );
    }
  }

  if (String(store.ppcOutcomeNotes || "").trim()) {
    lines.push(String(store.ppcOutcomeNotes).trim());
  }

  return lines.join("\n");
}

function wrap8410Text(text, maxChars = 58) {
  const output = [];

  for (const paragraph of String(text || "").split("\n")) {
    const words = paragraph.split(/\s+/);

    let line = "";

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;

      if (candidate.length > maxChars && line) {
        output.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }

    if (line) {
      output.push(line);
    }
  }

  return output;
}

function formatPpc8410Date(value) {
  const text = String(value || "").trim();

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (iso) {
    return `${iso[2]}/${iso[3]}/${iso[1]}`;
  }

  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    return [
      String(parsed.getMonth() + 1).padStart(2, "0"),
      String(parsed.getDate()).padStart(2, "0"),
      parsed.getFullYear(),
    ].join("/");
  }

  return text;
}

function getPpc8410ReviewFields() {
  const applicant = store.applicant || {};
  const designeeProfile = store.ppcExaminerDesigneeProfile || {};
  const isFlightEngineer =
    applicant.ppcType === "flight_engineer" ||
    store.ppcPacket?.certificate_code === "FLIGHT_ENGINEER_PPC_91529";

  const examinerName =
    designeeProfile.designeeName || applicant.appExaminer || "";
  const designationNumber = designeeProfile.designationNumber || "";

  return {
    date_of_check: formatPpc8410Date(
      applicant.appDate || new Date().toISOString().slice(0, 10),
    ),
    location: applicant.scheduledLocation || "",
    name_of_airman:
      store.ppc8410AirmanName ||
      formatPpc8410AirmanName(applicant.appName || ""),
    type_of_check: isFlightEngineer
      ? "Flight Engineer Proficiency Check (91.529)"
      : "Pilot Proficiency Check (61.58)",
    employed_by: store.ppc8410EmployedBy || "",
    based_at: store.ppc8410BasedAt || "",
    type_aircraft_simulator_used: [
      applicant.ppcTypeRatingDesignation || applicant.appAircraftType || "",
      applicant.appNNumber || "",
    ]
      .filter(Boolean)
      .join(" / "),
    name_of_check_airman: [
      examinerName,
      designationNumber ? `DPE ${designationNumber}` : "",
    ]
      .filter(Boolean)
      .join(" - "),
    block_time: applicant.appBlockTime || applicant.appFlightDuration || "",
    remarks: String(
      store.ppc8410Remarks ?? getPpc8410Remarks() ?? "",
    ).trim(),
    check_airman_performance: "",
    region: store.ppc8410Region || "",
    district_office: store.ppc8410DistrictOffice || "",
  };
}

async function generatePpc8410PdfBlob() {
  if (!window.PDFLib) {
    throw new Error("PDF library did not load.");
  }

  if (!store.ppcPacket?.tasks?.length) {
    throw new Error("PPC task data is not loaded.");
  }

  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;

  /*
   * The original form is calibrated against
   * its 768 x 1024 rendered layout.
   */
  const X = (px) => (px / 768) * width;

  const Y = (pxFromTop) => height - (pxFromTop / 1024) * height;

  const drawText = (value, x, y, size = 7, options = {}) => {
    const text = String(value || "").trim();

    if (!text) {
      return;
    }

    page.drawText(text, {
      x: X(x),
      y: Y(y),
      size,
      font: options.bold ? bold : font,
      color: rgb(0, 0, 0),
    });
  };

  /*
   * Center text inside a rectangular area expressed in the
   * same 768 x 1024 reference coordinates used by the form.
   *
   * Font size is automatically reduced when necessary so
   * longer values stay inside their FAA form cell.
   */
  const drawCenteredInBox = (
    value,
    left,
    right,
    top,
    bottom,
    maxSize = 7,
    options = {},
  ) => {
    const text = String(value || "").trim();

    if (!text) {
      return;
    }

    const selectedFont = options.bold ? bold : font;

    const leftPt = X(left);
    const rightPt = X(right);

    const boxWidth = rightPt - leftPt - X(options.horizontalPadding ?? 8) * 2;

    let size = maxSize;

    while (size > 5 && selectedFont.widthOfTextAtSize(text, size) > boxWidth) {
      size -= 0.25;
    }

    const textWidth = selectedFont.widthOfTextAtSize(text, size);

    const x = leftPt + (rightPt - leftPt - textWidth) / 2;

    /*
     * PDF-Lib positions text from its baseline.
     * Use the font's ascent/descent geometry to visually
     * center the glyphs within the usable portion of the cell.
     */
    const topPt = Y(top);
    const bottomPt = Y(bottom);

    const boxCenterY = (topPt + bottomPt) / 2;

    const textHeight = selectedFont.heightAtSize(size, {
      descender: true,
    });

    const y = boxCenterY - textHeight / 2 + size * 0.18;

    page.drawText(text, {
      x,
      y,
      size,
      font: selectedFont,
      color: rgb(0, 0, 0),
    });
  };

  const applicant = store.applicant || {};

  const isFlightEngineer =
    applicant.ppcType === "flight_engineer" ||
    store.ppcPacket?.certificate_code === "FLIGHT_ENGINEER_PPC_91529";

  /*
   * Select the appropriate FAA Form 8410-1 base form.
   *
   * Pilot 61.58:
   *   Flight Engineer side crossed out.
   *
   * Flight Engineer 91.529:
   *   Pilot side crossed out.
   */
  const templatePath = isFlightEngineer
    ? "/forms/faa-form-8410-1-flight-engineer.pdf"
    : "/forms/faa-form-8410-1-pilot.pdf";

  const response = await fetch(`${templatePath}?v=20260831-dual-8410-v2`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `${
        isFlightEngineer ? "Flight Engineer" : "Pilot"
      } FAA Form 8410-1 template could not be loaded.`,
    );
  }

  const template = await response.arrayBuffer();

  const pdf = await PDFDocument.load(template);

  const page = pdf.getPages()[0];

  if (!page) {
    throw new Error("FAA Form 8410-1 template contains no page.");
  }

  const { width, height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const checkLabel = isFlightEngineer
    ? "FE Proficiency Check"
    : "Pilot Proficiency Check";

  /*
   * FAA Form 8410-1 is used as a fixed background.
   *
   * All evaluation data is stamped directly onto the page.
   * This deliberately avoids AcroForm fields and PDF widgets,
   * which caused duplicate appearances and inconsistent layout.
   */
  const date = formatPpc8410Date(
    applicant.appDate || new Date().toISOString().slice(0, 10),
  );

  /*
   * LOCATION comes exclusively from the scheduled airport /
   * location carried by the practical-test request.
   */
  const location = applicant.scheduledLocation || "";

  const typeOfCheck = isFlightEngineer ? "91.529" : "61.58";

  const aircraftType =
    applicant.ppcTypeRatingDesignation ||
    applicant.appAircraftType ||
    store.ppcPacket?.aircraft_used ||
    "";

  const tailNumber = applicant.appNNumber || "";

  const aircraftAndTail = [aircraftType, tailNumber]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" / ");

  /*
   * Pull examiner name and DPE designation number from the same
   * Designee Information profile used by the Examiner Portal.
   */
  let designeeProfile = store.ppcExaminerDesigneeProfile || null;

  if (
    !designeeProfile &&
    typeof modules.loadCurrentExaminerDesigneeProfile === "function"
  ) {
    try {
      designeeProfile = await modules.loadCurrentExaminerDesigneeProfile();

      store.ppcExaminerDesigneeProfile = designeeProfile;
    } catch (error) {
      console.warn(
        "Unable to load examiner designation information for FAA 8410-1.",
        error,
      );
    }
  }

  const examinerName =
    designeeProfile?.designeeName || applicant.appExaminer || "";

  const designationNumber = designeeProfile?.designationNumber || "";

  const checkAirman = [
    examinerName,
    designationNumber ? `DPE ${designationNumber}` : "",
  ]
    .filter(Boolean)
    .join(" - ");

  /*
   * BLOCK TIME comes from Flight Information only.
   * Do not substitute ground duration.
   */
  const blockTime = applicant.appBlockTime || applicant.appFlightDuration || "";

  const employedBy = String(store.ppc8410EmployedBy || "").trim();

  const basedAt = String(store.ppc8410BasedAt || "").trim();

  /*
   * ==========================================================
   * FAA FORM 8410-1 HEADER DATA
   * ==========================================================
   *
   * Placement calibrated directly from the examiner-approved
   * "resset" reference PDF.
   *
   * Values sit below the printed FAA field labels rather than
   * being centered in the entire cell.
   */

  // DATE OF CHECK
  drawText(date, 495, 61, 7, { bold: true });

  // LOCATION
  drawText(location, 495, 92, 7);

  // NAME OF AIRMAN
  const airmanNameFor8410 = String(
    store.ppc8410AirmanName || formatPpc8410AirmanName(applicant.appName || ""),
  ).trim();

  drawText(airmanNameFor8410, 62, 124, 7);

  // TYPE OF CHECK
  drawText(typeOfCheck, 495, 124, 7, { bold: true });

  // EMPLOYED BY
  drawText(employedBy, 62, 155, 7);

  // BASED AT
  drawText(basedAt, 270, 155, 7);

  // TYPE AIRCRAFT / SIMULATOR USED
  drawText(aircraftAndTail, 495, 155, 7);

  // NAME OF CHECK AIRMAN
  drawText(checkAirman, 62, 186, 7);

  // BLOCK TIME
  drawText(blockTime, 495, 186, 7);

  /*
   * ==========================================================
   * REMARKS
   * ==========================================================
   */

  const formRemarks = String(
    store.ppc8410Remarks ?? getPpc8410Remarks() ?? "",
  ).trim();

  const wrap8410Remarks = (value, maxCharacters = 54) => {
    const paragraphs = String(value || "")
      .replace(/\r/g, "")
      .split("\n");

    const lines = [];

    for (const paragraph of paragraphs) {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);

      if (!words.length) {
        lines.push("");
        continue;
      }

      let line = "";

      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;

        if (!line || candidate.length <= maxCharacters) {
          line = candidate;
        } else {
          lines.push(line);
          line = word;
        }
      }

      if (line) {
        lines.push(line);
      }
    }

    return lines;
  };

  const remarkLines = wrap8410Remarks(formRemarks, 54).slice(0, 18);

  remarkLines.forEach((line, index) => {
    drawText(line, 409, 665 + index * 11, 6.5);
  });

  const gradeMap = getPpc8410GradeMap();

  /*
   * FAA 8410-1 grade positions.
   *
   * S/U are marked in their respective boxes.
   * W is centered over the S/U pair because the
   * form provides the waiver convention without
   * a dedicated third column.
   */
  const pilotY = {
    1: 276.5,
    2: 292,
    3: 307.2,
    4: 322.4,

    5: 353.4,
    6: 369,
    7: 384.5,
    8: 399.7,
    9: 414.9,

    10: 445.9,
    11: 461.4,
    12: 476.9,
    13: 492.5,
    14: 508,
    15: 523.5,
    16: 539,

    17: 570,
    18: 585.2,
    19: 600.4,
    20: 616.3,

    21: 647,
    22: 662.5,
    23: 678,
    24: 693.5,
    25: 709,
    26: 724.2,

    27: 755,
    28: 770.5,
    29: 786,
    30: 801.5,
    31: 817,
    32: 832.5,
  };

  /*
   * FAA Form 8410-1 Flight Engineer grade-row centers.
   *
   * These values were measured directly from the current
   * Flight Engineer base PDF and converted into the generator's
   * 768 x 1024 reference coordinate system.
   *
   * Do not replace this with a constant interval: the printed
   * row geometry varies slightly from row to row.
   */
  const feY = {
    1: 260.525,
    2: 276.040,
    3: 291.879,
    4: 307.394,
    5: 322.586,
    6: 338.101,
    7: 353.616,
    8: 369.131,
    9: 384.646,
    10: 399.838,
    11: 415.030,
    12: 430.545,
    13: 446.061,
    14: 461.576,
    15: 477.091,
    16: 492.606,
    17: 508.121,
    18: 523.636,
    19: 539.152,
    20: 554.667,
    21: 570.182,
    22: 585.374,
  };

  const yMap = isFlightEngineer ? feY : pilotY;

  const gradeX = isFlightEngineer
    ? {
        // Centers of the printed Flight Engineer grade columns
        // on the current 768px FAA 8410-1 FE template.
        S: 681,
        U: 705,
        W: 693,
      }
    : {
        // Center of the printed Pilot S / U columns.
        S: 352,
        U: 386,
        W: 369,
      };

  for (const [number, grade] of gradeMap.entries()) {
    const y = yMap[number];

    if (!isFlightEngineer) {
      /*
       * FAA Form 8410-1 Pilot PPC task applicability:
       *
       * Airplane:
       *   Tasks 1-29
       *
       * Multi-engine helicopter:
       *   Tasks 1-31
       *
       * Single-engine helicopter:
       *   Tasks 1-32
       *
       * The current evaluation packet takes precedence over
       * locally cached state so an older evaluation cannot
       * contaminate the aircraft configuration.
       */
      const rawConfiguration = String(
        store.ppcPacket?.aircraft_configuration ||
          store.ppcAircraftConfiguration ||
          "airplane",
      )
        .trim()
        .toLowerCase()
        .replace(/[\\s-]+/g, "_");

      let configuration = "airplane";

      if (
        rawConfiguration === "helicopter_single" ||
        rawConfiguration === "single_engine_helicopter" ||
        (rawConfiguration.includes("helicopter") &&
          rawConfiguration.includes("single"))
      ) {
        configuration = "helicopter_single";
      } else if (
        rawConfiguration === "helicopter_multi" ||
        rawConfiguration === "multi_engine_helicopter" ||
        rawConfiguration.includes("helicopter")
      ) {
        configuration = "helicopter_multi";
      }

      /*
       * 30 Hovering Maneuvers
       * 31 Rapid Decelerations
       * 32 Autorotations
       */
      if (configuration === "airplane" && number >= 30) {
        continue;
      }

      if (configuration === "helicopter_multi" && number === 32) {
        continue;
      }
    }

    if (!y || !["S", "U", "W"].includes(grade)) {
      continue;
    }

    const gradeText = String(grade);
    const gradeSize = 8;
    const gradeWidth = bold.widthOfTextAtSize(gradeText, gradeSize);

    /*
     * FE grade rows are calibrated correctly, but the rendered
     * glyph sits slightly high because PDF text uses a baseline.
     *
     * Lower FE grades 4 reference pixels while leaving the
     * already-calibrated Pilot grade placement unchanged.
     */
    const gradeY = isFlightEngineer ? y + 4 : y + 3;

    page.drawText(gradeText, {
      x: X(gradeX[grade]) - gradeWidth / 2,
      y: Y(gradeY),
      size: gradeSize,
      font: bold,
      color: rgb(0, 0, 0),
    });
  }

  /*
   * FAA Form 8410-1 — Pilot Airplane PPC
   *
   * Tasks 30, 31, and 32 are helicopter-only.
   * For an Airplane check, explicitly identify them as N/A.
   *
   * This is PDF presentation only; it does not create grades
   * for these non-applicable tasks.
   */
  if (!isFlightEngineer) {
    const naRawConfiguration = String(
      store.ppcPacket?.aircraft_configuration ||
        store.ppcAircraftConfiguration ||
        "airplane",
    )
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    const isAirplanePpc =
      !naRawConfiguration.includes("helicopter") &&
      !naRawConfiguration.includes("rotorcraft");

    if (isAirplanePpc) {
      for (const number of [30, 31, 32]) {
        const y = pilotY[number];

        if (!y) {
          continue;
        }

        /*
         * Center N/A across the S/U grade area for the
         * non-applicable helicopter task.
         */
        /*
         * Center N/A on the same horizontal centerline used
         * by the Pilot S grade. Because N/A is wider than S,
         * calculate its actual width instead of using the
         * normal grade's left-edge coordinate.
         */
        const naText = "N/A";
        const naSize = 8;
        const naWidth = bold.widthOfTextAtSize(naText, naSize);

        page.drawText(naText, {
          x: X(350) - naWidth / 2,
          y: Y(y + 3),
          size: naSize,
          font: bold,
          color: rgb(0, 0, 0),
        });
      }
    }
  }

  const overall = String(store.ppcPracticalTestOutcome || "").toUpperCase();

  /*
   * ----------------------------------------------------------
   * RESULT OF CHECK
   * ----------------------------------------------------------
   *
   * Mark only the airman's result.
   * CHECK AIRMAN'S PERFORMANCE remains intentionally blank.
   */

  if (overall === "SATISFACTORY") {
    drawText("X", 197, 887, 8, {
      bold: true,
    });
  } else if (overall === "UNSATISFACTORY") {
    drawText("X", 197, 903, 8, {
      bold: true,
    });
  }

  /*
   * We intentionally do NOT auto-mark
   * CHECK AIRMAN'S PERFORMANCE.
   *
   * That field is separate from the airman's PPC
   * result and should not simply mirror the check result.
   */

  /*
   * ----------------------------------------------------------
   * REGION / DISTRICT OFFICE / INSPECTOR SIGNATURE
   * ----------------------------------------------------------
   */

  const region = String(store.ppc8410Region || "").trim();

  const districtOffice = String(store.ppc8410DistrictOffice || "").trim();

  /*
   * Center Region and District Office in their FAA 8410-1
   * value areas using 12 pt text.
   *
   * Coordinates use the existing 768 x 1024 reference system.
   */
  const drawBottomFieldCentered = (value, left, right, top, bottom) => {
    const text = String(value || "").trim();

    if (!text) {
      return;
    }

    const size = 12;
    const textWidth = font.widthOfTextAtSize(text, size);

    const leftPt = X(left);
    const rightPt = X(right);

    const x = leftPt + (rightPt - leftPt - textWidth) / 2;

    const topPt = Y(top);
    const bottomPt = Y(bottom);

    const fieldCenterY = (topPt + bottomPt) / 2;

    const textHeight = font.heightAtSize(size, {
      descender: true,
    });

    const y = fieldCenterY - textHeight / 2 + size * 0.18;

    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  };

  if (region) {
    drawBottomFieldCentered(region, 21, 205, 914, 958);
  }

  if (districtOffice) {
    drawBottomFieldCentered(districtOffice, 205, 391, 914, 958);
  }

  if (store.ppc8410SignatureDataUrl) {
    try {
      const signatureBytes = await fetch(store.ppc8410SignatureDataUrl).then(
        (response) => response.arrayBuffer(),
      );

      const signatureImage = await pdf.embedPng(signatureBytes);

      const originalWidth = signatureImage.width;
      const originalHeight = signatureImage.height;

      const targetWidth = X(210);
      const targetHeight = (originalHeight / originalWidth) * targetWidth;

      const maxHeight = 28;

      const renderedHeight = Math.min(targetHeight, maxHeight);

      const renderedWidth = (originalWidth / originalHeight) * renderedHeight;

      page.drawImage(signatureImage, {
        x: X(410),
        y: Y(930) - renderedHeight / 2,
        width: renderedWidth,
        height: renderedHeight,
      });
    } catch (error) {
      console.error("FAA 8410-1 signature stamping failed:", error);
    }
  }

  const bytes = await pdf.save();

  return new Blob([bytes], {
    type: "application/pdf",
  });
}

let currentPpc8410BlobUrl = "";

async function reviewPpc8410InsideEmt() {
  const overlay = ensurePpc8410ReviewOverlay();

  const status = document.getElementById("emtPpc8410Status");

  const frame = document.getElementById("emtPpc8410Frame");

  const download = document.getElementById("emtPpc8410Download");

  overlay.classList.add("show");

  const airmanNameInput = document.getElementById("emtPpc8410AirmanName");

  const employedByInput = document.getElementById("emtPpc8410EmployedBy");

  const basedAtInput = document.getElementById("emtPpc8410BasedAt");

  const remarksInput = document.getElementById("emtPpc8410Remarks");

  const regionInput = document.getElementById("emtPpc8410Region");

  const districtOfficeInput = document.getElementById(
    "emtPpc8410DistrictOffice",
  );

  const signatureCanvas = document.getElementById("emtPpc8410Signature");

  const clearSignatureButton = document.getElementById(
    "emtPpc8410ClearSignature",
  );

  if (airmanNameInput) {
    if (!String(store.ppc8410AirmanName || "").trim()) {
      store.ppc8410AirmanName = formatPpc8410AirmanName(
        store.applicant?.appName || "",
      );
    }

    airmanNameInput.value = store.ppc8410AirmanName || "";

    airmanNameInput.oninput = (event) => {
      store.ppc8410AirmanName = event.target.value;
      saveToLocalStorage();
    };
  }

  if (employedByInput) {
    employedByInput.value = store.ppc8410EmployedBy || "";

    employedByInput.oninput = (event) => {
      store.ppc8410EmployedBy = event.target.value;

      saveToLocalStorage();
    };
  }

  if (basedAtInput) {
    basedAtInput.value = store.ppc8410BasedAt || "";

    basedAtInput.oninput = (event) => {
      store.ppc8410BasedAt = event.target.value;

      saveToLocalStorage();
    };
  }

  if (regionInput) {
    regionInput.value = store.ppc8410Region || "";

    regionInput.oninput = (event) => {
      store.ppc8410Region = event.target.value;
      saveToLocalStorage();
    };
  }

  if (districtOfficeInput) {
    districtOfficeInput.value = store.ppc8410DistrictOffice || "";

    districtOfficeInput.oninput = (event) => {
      store.ppc8410DistrictOffice = event.target.value;
      saveToLocalStorage();
    };
  }

  if (remarksInput) {
    if (store.ppc8410Remarks === undefined || store.ppc8410Remarks === null) {
      store.ppc8410Remarks = getPpc8410Remarks() || "";
    }

    remarksInput.value = store.ppc8410Remarks;

    remarksInput.oninput = (event) => {
      store.ppc8410Remarks = event.target.value;

      saveToLocalStorage();
    };
  }

  if (signatureCanvas) {
    const context = signatureCanvas.getContext("2d");

    if (context) {
      context.lineWidth = 3;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#000000";

      const restoreSignature = () => {
        context.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);

        if (!store.ppc8410SignatureDataUrl) {
          return;
        }

        const image = new Image();

        image.onload = () => {
          context.drawImage(
            image,
            0,
            0,
            signatureCanvas.width,
            signatureCanvas.height,
          );
        };

        image.src = store.ppc8410SignatureDataUrl;
      };

      restoreSignature();

      let drawing = false;

      const pointFromEvent = (event) => {
        const rect = signatureCanvas.getBoundingClientRect();

        return {
          x: ((event.clientX - rect.left) / rect.width) * signatureCanvas.width,
          y:
            ((event.clientY - rect.top) / rect.height) * signatureCanvas.height,
        };
      };

      signatureCanvas.onpointerdown = (event) => {
        event.preventDefault();

        drawing = true;

        signatureCanvas.setPointerCapture?.(event.pointerId);

        const point = pointFromEvent(event);

        context.beginPath();
        context.moveTo(point.x, point.y);
      };

      signatureCanvas.onpointermove = (event) => {
        if (!drawing) {
          return;
        }

        event.preventDefault();

        const point = pointFromEvent(event);

        context.lineTo(point.x, point.y);
        context.stroke();
      };

      const finishSignature = async (event) => {
        if (!drawing) {
          return;
        }

        event?.preventDefault?.();

        drawing = false;

        context.closePath();

        store.ppc8410SignatureDataUrl = signatureCanvas.toDataURL("image/png");

        saveToLocalStorage();
      };

      signatureCanvas.onpointerup = finishSignature;
      signatureCanvas.onpointercancel = finishSignature;
      signatureCanvas.onpointerleave = (event) => {
        if (drawing && event.buttons === 0) {
          finishSignature(event);
        }
      };

      if (clearSignatureButton) {
        clearSignatureButton.onclick = async () => {
          context.clearRect(
            0,
            0,
            signatureCanvas.width,
            signatureCanvas.height,
          );

          store.ppc8410SignatureDataUrl = "";

          saveToLocalStorage();
        };
      }
    }
  }

  if (status) {
    status.textContent = "Generating FAA Form 8410-1 from EMT grades...";
  }

  try {
    const blob = await generatePpc8410PdfBlob();

    if (currentPpc8410BlobUrl) {
      URL.revokeObjectURL(currentPpc8410BlobUrl);
    }

    currentPpc8410BlobUrl = URL.createObjectURL(blob);

    if (frame) {
      frame.src = currentPpc8410BlobUrl;
    }

    if (status) {
      status.textContent =
        "FAA Form 8410-1 generated from the finalized EMT S/U/W grades.";
    }

    if (download) {
      download.onclick = () => {
        const link = document.createElement("a");

        const requestNumber = store.applicant?.requestNumber || "PPC";

        link.href = currentPpc8410BlobUrl;

        link.download = `${requestNumber}-FAA-8410-1.pdf`;

        document.body.appendChild(link);

        link.click();
        link.remove();
      };
    }

    const regenerateFromEditableFields = async () => {
      try {
        if (status) {
          status.textContent = "Updating FAA Form 8410-1...";
        }

        const updatedBlob = await generatePpc8410PdfBlob();

        if (currentPpc8410BlobUrl) {
          URL.revokeObjectURL(currentPpc8410BlobUrl);
        }

        currentPpc8410BlobUrl = URL.createObjectURL(updatedBlob);

        if (frame) {
          frame.src = currentPpc8410BlobUrl;
        }

        if (status) {
          status.textContent = "FAA Form 8410-1 updated.";
        }
      } catch (error) {
        console.error("FAA 8410-1 editable-field update failed:", error);
      }
    };

    if (airmanNameInput) {
      airmanNameInput.onchange = regenerateFromEditableFields;
    }

    if (employedByInput) {
      employedByInput.onchange = regenerateFromEditableFields;
    }

    if (basedAtInput) {
      basedAtInput.onchange = regenerateFromEditableFields;
    }

    if (remarksInput) {
      remarksInput.onchange = regenerateFromEditableFields;
    }

    if (regionInput) {
      regionInput.onchange = regenerateFromEditableFields;
    }

    if (districtOfficeInput) {
      districtOfficeInput.onchange = regenerateFromEditableFields;
    }

    if (signatureCanvas) {
      signatureCanvas.addEventListener(
        "pointerup",
        regenerateFromEditableFields,
        { once: false },
      );
    }

    if (clearSignatureButton) {
      clearSignatureButton.addEventListener(
        "click",
        regenerateFromEditableFields,
        { once: false },
      );
    }
  } catch (error) {
    console.error("FAA 8410-1 generation failed:", error);

    if (status) {
      status.textContent =
        error instanceof Error
          ? error.message
          : "FAA 8410-1 generation failed.";
    }

    alert(
      `FAA 8410-1 generation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

function renderCompletedPpcActions() {
  const actions = document.getElementById("outcomeOnlyActions");

  if (!actions) {
    return;
  }

  actions.style.display = "flex";

  actions.innerHTML = `
    <button
      class="btn btn-accent"
      id="btnReviewPpc8410"
      type="button"
    >
      <i class="fas fa-file-signature"></i>
      Review FAA 8410-1
    </button>

    <button
      class="btn"
      id="btnCompletePpcEvent"
      type="button"
      ${store.ppcEventCompleted ? "disabled" : ""}
    >
      <i class="fas fa-check-circle"></i>
      ${store.ppcEventCompleted ? "Event Completed" : "Complete Event"}
    </button>
  `;

  document
    .getElementById("btnReviewPpc8410")
    ?.addEventListener("click", reviewPpc8410InsideEmt);

  document
    .getElementById("btnCompletePpcEvent")
    ?.addEventListener("click", completePpcEventInEmt);
}

async function completePpcEventInEmt() {
  const requestId = store.applicant?.practicalTestRequestId || "";
  const packet = store.ppcPacket;

  if (!requestId || !packet?.practical_test_id) {
    alert("The finalized PPC practical-test record is unavailable.");
    return;
  }

  if (!["finalized", "completed"].includes(packet.evaluation_status)) {
    alert("Complete the PPC grading before completing the event.");
    return;
  }

  /*
   * The PDF currently reviewed and signed in EMT is authoritative.
   *
   * Do not reuse an older archived 8410 simply because one exists.
   * Until the event itself is completed, the examiner may refresh the
   * archived document with the current reviewed/signed version.
   */
  if (!String(store.ppc8410SignatureDataUrl || "").trim()) {
    alert(
      "Open Review FAA 8410-1 and add the examiner signature before completing the event.",
    );
    return;
  }

  const requestNumber = store.applicant?.requestNumber || "this PPC";
  const confirmed = window.confirm(
    `Complete ${requestNumber}?\n\nThis will archive the signed FAA Form 8410-1, mark the practical-test request Completed, and email the PDF to the applicant.`,
  );

  if (!confirmed) {
    return;
  }

  const button = document.getElementById("btnCompletePpcEvent");
  const originalHtml = button?.innerHTML || "";
  let completionData = null;

  try {
    if (button) {
      button.disabled = true;
      button.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        Archiving FAA 8410-1
      `;
    }

    /*
     * Always archive the exact PDF currently being reviewed in EMT.
     * The database prevents replacement after the event is completed.
     */
    const pdfBlob = await generatePpc8410PdfBlob();

    await modules.archiveFinalizedPpc8410({
      practicalTestRequestId: requestId,
      requestNumber,
      pdfBlob,
      reviewFields: getPpc8410ReviewFields(),
      signatureDataUrl: store.ppc8410SignatureDataUrl,
    });

    if (button) {
      button.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        Completing Event
      `;
    }

    completionData = await modules.completePpcEvent(requestId);

    if (
      completionData?.request_status !== "completed" ||
      completionData?.evaluation_status !== "completed"
    ) {
      throw new Error("Supabase did not return a completed PPC event status.");
    }

    store.ppcPacket = {
      ...packet,
      evaluation_status: "completed",
    };
    store.ppcEventCompleted = true;
    store.ppcEventEmailError = "";

    if (button) {
      button.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        Emailing Applicant
      `;
    }

    const emailResult = await modules.emailCompletedPpc8410(requestId);

    store.databaseSubmission = {
      ...(store.databaseSubmission || {}),
      practicalTestId: completionData.practical_test_id,
      status: "completed",
      completedAt: completionData.completed_at || new Date().toISOString(),
      ppc8410EmailSent: Boolean(emailResult?.sent || emailResult?.skipped),
    };

    saveToLocalStorage();

    setEmtConnectionMessage(
      `${requestNumber} was completed and the signed FAA 8410-1 was emailed to the applicant.`,
    );

    alert(
      `${requestNumber} was completed successfully.\n\nThe PPC data and signed FAA Form 8410-1 were saved, the practical-test request was marked Completed, and the PDF was emailed to the applicant.`,
    );

    modules.notify();
    await refreshEmtAppointments();
  } catch (error) {
    console.error("PPC event completion failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "The PPC event could not be completed.";

    if (completionData?.request_status === "completed") {
      store.ppcPacket = {
        ...packet,
        evaluation_status: "completed",
      };
      store.ppcEventEmailError = message;
      store.ppcEventCompleted = false;
      saveToLocalStorage();

      setEmtConnectionMessage(
        `${requestNumber} was completed, but the applicant email failed: ${message}`,
        true,
      );

      alert(
        `${requestNumber} was saved and marked Completed, but the applicant email failed.\n\n${message}\n\nUse Complete Event again to retry the email without duplicating the event.`,
      );
    } else {
      setEmtConnectionMessage(message, true);
      alert(`PPC event completion failed: ${message}`);
    }

    modules.notify();
  } finally {
    if (button?.isConnected && !store.ppcEventCompleted) {
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  }
}

async function finalizePpcEvaluationInEmt() {
  const packet = store.ppcPacket;

  if (!packet?.tasks?.length) {
    alert("The FAA 8410-1 task set is not loaded.");
    return;
  }

  const summary = modules.summarizePpc(packet, store.ppcGrades);

  if (summary.graded !== summary.total) {
    alert(
      `All applicable FAA 8410-1 tasks must be graded before completing the PPC.\n\n${summary.graded} of ${summary.total} tasks are graded.`,
    );

    return;
  }

  const label =
    store.applicant?.ppcType === "flight_engineer"
      ? "Flight Engineer Proficiency Check (91.529)"
      : "Pilot Proficiency Check (61.58)";

  const confirmed = window.confirm(
    `Complete ${label}?\n\nResult: ${summary.overall}\n\nThe S / U / W grades will be finalized and used to generate FAA Form 8410-1.`,
  );

  if (!confirmed) {
    return;
  }

  const button = document.getElementById("btnSaveEvaluation");

  const oldHtml = button?.innerHTML || "";

  try {
    if (button) {
      button.disabled = true;
      button.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        Finalizing PPC
      `;
    }

    const result = await modules.savePpcEvaluation({
      practicalTestRequestId: store.applicant.practicalTestRequestId,

      grades: buildPpcGradePayload(),

      finalize: true,

      startedAt: store.applicant?.scheduledStartAt || null,

      aircraftUsed:
        store.applicant?.appAircraftType || packet.aircraft_used || null,

      examinerNotes: store.ppcOutcomeNotes || null,

      aircraftConfiguration:
        store.applicant?.ppcType === "pilot"
          ? store.ppcAircraftConfiguration || "airplane"
          : null,
    });

    store.ppcPacket = {
      ...packet,
      practical_test_id: result?.practical_test_id || packet.practical_test_id,

      evaluation_status: result?.evaluation_status || "finalized",

      result: result?.result || null,

      approved_status: result?.approved_status || null,
    };

    /*
     * PPC grades are now finalized.
     *
     * Keep the examiner inside EMT and immediately transition to the
     * FAA Form 8410-1 review generated from the finalized S / U / W grades.
     */
    store.ppcLastSyncedAt = result?.saved_at || new Date().toISOString();

    saveToLocalStorage();

    setEmtConnectionMessage(
      `${store.applicant.requestNumber || "PPC"} finalized in EMT.`,
    );

    modules.notify();

    renderCompletedPpcActions();

    await reviewPpc8410InsideEmt();
  } catch (error) {
    console.error("PPC finalization failed:", error);

    alert(
      `PPC finalization failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = oldHtml;
    }
  }
}

function getDatasetKey() {
  if (
    store.applicant.appCertificate === "Private" &&
    store.applicant.appRating === "GLIDER"
  ) {
    return "PrivateGlider";
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
      store.applicant.appCertificate === "Instrument"
        ? store.applicant.appAircraftClassUsed || "ASEL"
        : store.applicant.appRating,
  };

  return modules.buildVisibleAreas(dataset, applicantForFiltering);
}

function getCurrentTasks(areas = getCurrentAreas()) {
  return modules.getFlatTasks(areas);
}

function renderApp() {
  /*
   * PPC / ACS HARD ROUTING BOUNDARY
   *
   * PPC uses the FAA 8410-1 renderer.
   * Every other evaluation uses the original EMT ACS render engine.
   */
  ensureStoreDefaults();
  syncEvaluationModeFieldVisibility();

  if (isCurrentEmtPpc()) {
    renderPpcApp();
    return;
  }

  /*
   * Remove PPC-only chrome before the original ACS renderer owns
   * the page again.
   */
  restoreAcsChrome();

  // Show Aircraft Class ONLY for Instrument
  const aircraftClassGroup = document.getElementById("aircraftClassUsedGroup");

  if (aircraftClassGroup) {
    const isInstrument = store.applicant.appCertificate === "Instrument";

    aircraftClassGroup.style.display = isInstrument ? "block" : "none";
  }
  const areas = getCurrentAreas();

  if (
    !store.activeAreaId ||
    !areas.some((area) => area.id === store.activeAreaId)
  ) {
    store.activeAreaId = areas[0]?.id ?? null;
  }

  modules.renderHeader?.(store);

  const flatTasks = getCurrentTasks(areas);
  renderAcsCodeDecoder(flatTasks);

  const summary = modules.summarizeTasks(flatTasks);

  const averages = {
    K: modules.averageGrade(flatTasks, "K"),
    R: modules.averageGrade(flatTasks, "R"),
    S: modules.averageGrade(flatTasks, "S"),
  };

  modules.renderStats?.(summary, averages);

  const summaryByArea = Object.fromEntries(
    areas.map((area) => {
      const areaSummary = modules.summarizeTasks(area.tasks);
      return [area.id, { complete: areaSummary.overall === "SATISFACTORY" }];
    }),
  );

  modules.renderSidebar?.(areas, summaryByArea, store.activeAreaId, (areaId) =>
    modules.setActiveArea(areaId),
  );

  syncActiveView();

  const activeArea = areas.find((area) => area.id === store.activeAreaId);

  modules.renderDetailed?.($("viewDetailed"), activeArea, store, {
    onGradeChange: (taskCode, gradeType, value) =>
      modules.setGrade(taskCode, gradeType, value),

    onToggleTask: (taskCode) => modules.toggleTask(taskCode),

    onTaskCheck: (taskCode, checked) =>
      handleTaskCheck(taskCode, checked, { setAllGradesToThree: true }),

    onExaminerNoteChange: (taskCode, note) =>
      handleExaminerNoteChange(taskCode, note),
  });

  applyAcsCodeHighlights();

  if (typeof modules.renderScenarioEngine === "function" && !scenarioRendered) {
    modules.renderScenarioEngine("scenario-root");

    scenarioRendered = true;

    window.requestAnimationFrame(() => {
      upgradeGradeSelectsToRadios(document);

      syncScenarioGradesFromStore();
    });
  }

  modules.renderSummary?.($("viewSummary"), areas, store);
  modules.renderDebrief?.($("viewDebrief"), areas, store);
  modules.renderOutcome?.(summary);

  syncPracticalTestOutcomeFromOutcomeTab(summary);
  renderRequiredBriefings($("viewChecklists"));
  wireReportActionButtons();

  modules.renderEligibility?.($("viewEligibility"), store.applicant, store);

  const outcomeNotes = $("outcomeNotes");
  if (outcomeNotes) {
    outcomeNotes.value = store.outcomeNotes || "";
    outcomeNotes.oninput = (event) => {
      store.outcomeNotes = event.target.value;
    };
  }

  /*
   * Preserve the existing grading handlers and data model while
   * presenting every task grade as radio buttons.
   */
  upgradeGradeSelectsToRadios(document);

  /*
   * The scenario engine remains mounted between renders. Refresh all
   * visible Oral / Flight grades from the same store used by Detailed
   * View.
   */
  syncScenarioGradesFromStore();
  syncAllGradeReasonControls();
}

function syncActiveView() {
  const activeView = isCurrentEmtPpc()
    ? store.ppcActiveView || "detailed"
    : store.activeView || "detailed";

  document.querySelectorAll(".view-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === activeView);
  });

  document.querySelectorAll(".view-content").forEach((view) => {
    view.classList.remove("active");
  });

  const activeId = `view${activeView[0].toUpperCase()}${activeView.slice(1)}`;
  $(activeId)?.classList.add("active");

  const outcomeOnlyActions = $("outcomeOnlyActions");

  if (outcomeOnlyActions) {
    outcomeOnlyActions.style.display =
      activeView === "outcome" ? "flex" : "none";
  }
}

function wireFullAppEvents() {
  /*
   * Some existing grading actions update select values directly,
   * including task and Flight Portion checkboxes. Synchronize the
   * visible radio groups after those handlers finish.
   */
  document.addEventListener("change", (event) => {
    if (!event.target.matches('input[type="checkbox"], select[data-grade]')) {
      return;
    }

    window.setTimeout(() => {
      document.querySelectorAll("select[data-grade]").forEach((select) => {
        syncGradeRadioGroup(select);
      });

      upgradeGradeSelectsToRadios(document);
    }, 0);
  });

  document.querySelectorAll(".view-tab").forEach((tab) => {
    tab.onclick = () => {
      scenarioRendered = false;

      if (isCurrentEmtPpc()) {
        store.ppcActiveView = tab.dataset.view;
        modules.notify();
      } else {
        modules.setActiveView(tab.dataset.view);
      }
    };
  });

  document.addEventListener("change", (event) => {
    if (!isOutcomeTabField(event.target)) return;

    const selectedOutcome = normalizePracticalTestOutcome(
      event.target.value ||
        event.target.options?.[event.target.selectedIndex]?.textContent ||
        event.target.closest("label")?.innerText ||
        event.target.parentElement?.innerText,
    );

    if (selectedOutcome === "DISCONTINUANCE") {
      store.discontinuanceManuallySelected = true;
      store.practicalTestOutcome = "DISCONTINUANCE";
    } else {
      store.discontinuanceManuallySelected = false;
      syncPracticalTestOutcomeFromOutcomeTab();
    }

    updatePostFlightOutcomeGroups(document);
    modules.notify();
  });

  document.addEventListener("click", () => {
    setTimeout(() => {
      updatePostFlightOutcomeGroups(document);
    }, 0);
  });

  document.addEventListener("click", (event) => {
    const btn = event.target.closest(".outcome-btn");
    if (!btn) return;

    const selectedOutcome = btn.dataset.outcome;

    if (selectedOutcome === "discontinuance") {
      store.discontinuanceManuallySelected = true;
      store.practicalTestOutcome = "DISCONTINUANCE";

      document.querySelectorAll(".outcome-btn").forEach((button) => {
        button.classList.remove(
          "selected-sat",
          "selected-unsat",
          "selected-disc",
        );
      });

      btn.classList.add("selected-disc");

      updatePostFlightOutcomeGroups(document);
      modules.notify();
    }
  });

  $("btnExpandAll")?.addEventListener("click", () => {
    if (isCurrentEmtPpc()) {
      store.ppcExpandedTasks ??= {};

      for (const task of store.ppcPacket?.tasks || []) {
        store.ppcExpandedTasks[task.id] = true;
      }

      modules.notify();
      return;
    }

    getCurrentTasks().forEach((task) => {
      store.expandedTasks[task.filterCode] = true;
    });

    modules.notify();
  });

  $("btnCollapseAll")?.addEventListener("click", () => {
    store.expandedTasks = {};
    modules.notify();
  });

  $("btnExportJSON")?.addEventListener("click", exportJsonSave);
  $("btnSaveHTML")?.addEventListener("click", generateCheckrideReport);

  $("btnSaveEvaluation")?.addEventListener(
    "click",
    submitPracticalTestToDatabase,
  );

  $("btnReset")?.addEventListener("click", () => {
    $("confirmModal")?.classList.add("show");
  });

  $("modalCancel")?.addEventListener("click", () => {
    $("confirmModal")?.classList.remove("show");
  });

  $("modalConfirm")?.addEventListener("click", () => {
    resetAllEvaluationData();
  });
}

function normalizeDatabasePracticalTestResult(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (normalized === "SATISFACTORY") {
    return "pass";
  }

  if (normalized === "UNSATISFACTORY") {
    return "fail";
  }

  if (normalized === "DISCONTINUANCE" || normalized === "DISCONTINUED") {
    return "letter_of_discontinuance";
  }

  if (normalized === "NO SHOW") {
    return "no_show";
  }

  return null;
}

function parseEvaluationFeeAmount() {
  const rawValue = store.applicant?.feeAmount ?? store.feeAmount ?? null;

  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return null;
  }

  const numericValue = Number(String(rawValue).replace(/[$,\s]/g, ""));

  return Number.isFinite(numericValue) ? numericValue : null;
}

function buildEvaluationStateForDatabase() {
  const applicant = store.applicant || {};

  /*
   * Save only the applicant and appointment fields needed for the
   * completed evaluation. Personally identifying account information
   * remains in the linked practical-test request rather than being
   * duplicated inside evaluation_state.
   */
  const limitedApplicant = {
    appDate: applicant.appDate || "",
    appSchool: applicant.appSchool || "",
    appCertificate: applicant.appCertificate || "",
    appRating: applicant.appRating || "",
    appExamType: applicant.appExamType || "",
    appAircraftType: applicant.appAircraftType || "",
    appInstructor: applicant.appInstructor || "",
    scheduledLocation: applicant.scheduledLocation || "",
    appGroundDuration: applicant.appGroundDuration || "",
    appFlightDuration: applicant.appFlightDuration || "",
    appRetest: applicant.appRetest || "No",
  };

  /*
   * Serialize to plain JSON while replacing the full applicant object
   * with the approved limited field set.
   */
  return JSON.parse(
    JSON.stringify({
      ...store,
      applicant: limitedApplicant,
      databaseMetadata: {
        schemaVersion: 3,
        submittedFrom: "ems-web",
        submittedAt: new Date().toISOString(),
      },
    }),
  );
}

async function submitPracticalTestToDatabase() {
  if (isCurrentEmtPpc()) {
    await finalizePpcEvaluationInEmt();
    return;
  }

  const requestId = store.applicant?.practicalTestRequestId || "";

  if (!requestId) {
    alert(
      "Load an accepted or confirmed DPE EMT appointment before submitting the practical test.",
    );
    return;
  }

  const missingGradeReasons = collectMissingGradeReasons();

  if (missingGradeReasons.length) {
    const preview = missingGradeReasons
      .slice(0, 8)
      .map((item) => `• ${item}`)
      .join("\n");

    const additional =
      missingGradeReasons.length > 8
        ? `\n• ...and ${missingGradeReasons.length - 8} more`
        : "";

    alert(
      `Reason Code Required\n\nEvery grade of 1 or 2 must have a reason code selected.\n\n${preview}${additional}`,
    );

    syncAllGradeReasonControls();
    return;
  }

  const result = normalizeDatabasePracticalTestResult(
    store.practicalTestOutcome,
  );

  if (!result) {
    alert(
      "Select a final Practical Test Outcome before submitting the practical test.",
    );
    return;
  }

  const requestNumber = store.applicant?.requestNumber || "this practical test";

  const confirmed = window.confirm(
    `Submit ${requestNumber} to the database and complete the practical test?\n\nThis will save the evaluation and grading data, create both Practical Test Reports, release the Applicant Report, and then mark the request Completed.`,
  );

  if (!confirmed) return;

  const button = $("btnSaveEvaluation");

  const originalHtml = button?.innerHTML || "";

  try {
    if (button) {
      button.disabled = true;
      button.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Submitting Practical Test';
    }

    const resultData = await modules.submitEmtPracticalTest({
      practicalTestRequestId: requestId,

      evaluationState: buildEvaluationStateForDatabase(),

      result,

      startedAt: store.applicant?.scheduledStartAt || null,

      aircraftUsed:
        [store.applicant?.appAircraftType, store.applicant?.appNNumber]
          .filter(Boolean)
          .join(" · ") || null,

      feeAmount: parseEvaluationFeeAmount(),

      examinerNotes: store.outcomeNotes || null,

      dmsPreapprovalNumber: store.applicant?.appDMS || null,
    });

    const practicalTestId = resultData?.practical_test_id || null;

    if (!practicalTestId) {
      throw new Error(
        "The practical test was finalized, but no practical-test ID was returned.",
      );
    }

    const generatedAt = resultData?.saved_at || new Date().toISOString();

    const finalRequestNumber = resultData?.request_number || requestNumber;

    if (button) {
      button.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Creating Applicant Report';
    }

    const applicantReportPdf = await generateApplicantReportPdfBlob();

    if (button) {
      button.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Uploading Applicant Report';
    }

    const applicantReportRow = await modules.uploadApplicantPracticalTestReport(
      {
        practicalTestId,
        requestNumber: finalRequestNumber,
        pdfBlob: applicantReportPdf,
        generatedAt,
        releaseToApplicant: true,
      },
    );

    if (button) {
      button.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Creating Designee Report';
    }

    const designeeReportPdf = await generateDesigneeReportPdfBlob();

    if (button) {
      button.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Uploading Designee Report';
    }

    const designeeReportRow = await modules.uploadDesigneePracticalTestReport({
      practicalTestId,
      requestNumber: finalRequestNumber,
      pdfBlob: designeeReportPdf,
      generatedAt,
    });

    if (button) {
      button.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Completing Practical Test';
    }

    const completionData =
      await modules.finalizeEmtPracticalTest(practicalTestId);

    if (
      completionData?.request_status !== "completed" ||
      completionData?.evaluation_status !== "completed"
    ) {
      throw new Error(
        "The reports were saved, but the practical test did not return a Completed status.",
      );
    }

    store.databaseSubmission = {
      practicalTestId,
      status: "completed",
      submittedAt: completionData?.completed_at || generatedAt,
      applicantReportId: applicantReportRow?.id || null,
      applicantReportReleasedAt:
        applicantReportRow?.released_to_applicant_at || null,
      designeeReportId: designeeReportRow?.id || null,
      completedAt: completionData?.completed_at || null,
    };

    saveToLocalStorage();

    setEmtConnectionMessage(
      `${requestNumber} was submitted successfully. Grading data and both reports were saved, the Applicant Report was released, and the scheduling request is Completed.`,
    );

    alert(
      `${requestNumber} was submitted successfully.\n\nThe evaluation and grading data were saved, both Practical Test Reports were stored, the Applicant Report was released to the applicant, and the scheduling request was changed to Completed.`,
    );

    /*
     * Refresh the appointment list. Completed requests should disappear
     * from the accepted/scheduled/confirmed appointment selector.
     */
    await refreshEmtAppointments();
  } catch (error) {
    console.error("Practical-test submission failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "The practical test could not be submitted.";

    setEmtConnectionMessage(message, true);

    alert(`Practical-test submission failed: ${message}`);
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  }
}

async function regenerateStoredPracticalTestReports() {
  const practicalTestId =
    store.databaseSubmission?.practicalTestId || store.practicalTestId || null;

  const requestNumber = store.applicant?.requestNumber || "";

  if (!practicalTestId) {
    alert(
      "A submitted practical test must be loaded before stored reports can be regenerated.",
    );
    return;
  }

  if (!requestNumber) {
    alert("The practical-test request number is unavailable.");
    return;
  }

  const button = document.getElementById("regenerateStoredReportsBtn");

  const originalHtml = button?.innerHTML || "";

  if (button) {
    button.disabled = true;
  }

  try {
    if (button) {
      button.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Creating Applicant Report';
    }

    /*
     * Generate using the CURRENT working report builders.
     */
    const applicantPdf = await generateApplicantReportPdfBlob();

    if (button) {
      button.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Uploading Applicant Report';
    }

    const generatedAt = new Date().toISOString();

    await modules.uploadApplicantPracticalTestReport({
      practicalTestId,
      requestNumber,
      pdfBlob: applicantPdf,
      generatedAt,
      releaseToApplicant: true,
    });

    if (button) {
      button.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Creating Designee Report';
    }

    const designeePdf = await generateDesigneeReportPdfBlob();

    if (button) {
      button.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Uploading Designee Report';
    }

    await modules.uploadDesigneePracticalTestReport({
      practicalTestId,
      requestNumber,
      pdfBlob: designeePdf,
      generatedAt,
    });

    store.databaseSubmission ??= {};

    store.databaseSubmission.reportsRegeneratedAt = generatedAt;

    saveToLocalStorage();

    alert(
      `${requestNumber} reports were regenerated successfully.\n\nThe prior stored Applicant and Designee reports were superseded, and the web portals will now use the new PDFs.`,
    );
  } catch (error) {
    console.error("Stored report regeneration failed:", error);

    alert(
      `Stored report regeneration failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  }
}

function wireReportActionButtons() {
  const printApplicantBtn = $("printApplicantReportBtn");
  const emailApplicantBtn = $("emailApplicantReportBtn");
  const printDesigneeBtn = $("printDesigneeReportBtn");
  const emailDesigneeBtn = $("emailDesigneeReportBtn");
  const regenerateStoredReportsBtn = $("regenerateStoredReportsBtn");

  if (printApplicantBtn && !printApplicantBtn.dataset.wired) {
    printApplicantBtn.dataset.wired = "true";
    printApplicantBtn.addEventListener("click", () => {
      generatePracticalTestReport("applicant");
    });
  }

  if (emailApplicantBtn && !emailApplicantBtn.dataset.wired) {
    emailApplicantBtn.dataset.wired = "true";
    emailApplicantBtn.addEventListener("click", () => {
      openEmailReportDialog("applicant");
    });
  }

  if (printDesigneeBtn && !printDesigneeBtn.dataset.wired) {
    printDesigneeBtn.dataset.wired = "true";
    printDesigneeBtn.addEventListener("click", () => {
      generatePracticalTestReport("designee");
    });
  }

  if (regenerateStoredReportsBtn && !regenerateStoredReportsBtn.dataset.wired) {
    regenerateStoredReportsBtn.dataset.wired = "true";

    regenerateStoredReportsBtn.addEventListener("click", () => {
      void regenerateStoredPracticalTestReports();
    });
  }

  if (emailDesigneeBtn && !emailDesigneeBtn.dataset.wired) {
    emailDesigneeBtn.dataset.wired = "true";
    emailDesigneeBtn.addEventListener("click", () => {
      openEmailReportDialog("designee");
    });
  }
}

function openEmailReportDialog(reportType) {
  const isApplicant = reportType === "applicant";

  const email = prompt(
    isApplicant
      ? "Enter applicant email address:"
      : "Enter designee report email address:",
  );

  if (!email) return;

  const subject = encodeURIComponent(
    isApplicant
      ? "Applicant Practical Test Report"
      : "Designee Practical Test Report",
  );

  const body = encodeURIComponent(
    isApplicant
      ? "The Applicant Practical Test Report is ready. Please open the EMS app and use the Save / Print Applicant Test Report button to generate the PDF."
      : "The Designee Practical Test Report is ready. Please open the EMS app and use the Save / Print Designee Test Report button to generate the PDF.",
  );

  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

function isOutcomeTabField(element) {
  if (!element) return false;

  return (
    element.id === "practicalTestOutcome" ||
    element.id === "testOutcome" ||
    element.id === "finalOutcome" ||
    element.id === "outcome" ||
    element.name === "practicalTestOutcome" ||
    element.name === "testOutcome" ||
    element.name === "finalOutcome" ||
    element.name === "outcome" ||
    !!element.closest?.("#viewOutcome")
  );
}

function normalizePracticalTestOutcome(value) {
  const text = String(value || "")
    .toUpperCase()
    .trim();

  if (!text) return "";

  if (
    text.includes("DISCONTINUANCE") ||
    text.includes("DISCONTINUE") ||
    text.includes("DISCONTINUED")
  ) {
    return "DISCONTINUANCE";
  }

  if (text.includes("UNSATISFACTORY")) return "UNSATISFACTORY";

  if (text.includes("SATISFACTORY")) return "SATISFACTORY";

  if (text.includes("INCOMPLETE")) return "";

  return "";
}

function syncPracticalTestOutcomeFromOutcomeTab(summary = null) {
  if (store.discontinuanceManuallySelected) {
    store.practicalTestOutcome = "DISCONTINUANCE";
    return store.practicalTestOutcome;
  }

  if (summary?.overall) {
    const summaryOutcome = normalizePracticalTestOutcome(summary.overall);

    if (
      summaryOutcome === "SATISFACTORY" ||
      summaryOutcome === "UNSATISFACTORY"
    ) {
      store.practicalTestOutcome = summaryOutcome;
      return store.practicalTestOutcome;
    }

    store.practicalTestOutcome = "";
    return "";
  }

  return store.practicalTestOutcome || "";
}

function handleTaskCheck(taskCode, checked, options = {}) {
  store.checkedElements[taskCode] = checked;

  if (options.setAllGradesToThree) {
    ensureGradeReasonStores();

    ["K", "R", "S"].forEach((type) => {
      const gradeKey = `${taskCode}.${type}`;

      store.grades[gradeKey] = checked ? "3" : "NP";

      delete store.gradeReasons[gradeKey];
    });
  }

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
  return store.practicalTestOutcome || "";
}

function isBriefingGroupDisabled(group) {
  const selectedOutcome = getSelectedPostFlightOutcome();

  if (!selectedOutcome) return false;

  return group.outcome !== selectedOutcome;
}

function getBriefingStatus(section) {
  let total = section.items?.length || 0;
  let completed =
    section.items?.filter((_, index) =>
      isBriefingItemChecked(section.id, index),
    ).length || 0;

  if (section.groups?.length) {
    section.groups.forEach((group) => {
      if (isBriefingGroupDisabled(group)) return;

      const groupKey = `${section.id}.${group.id}`;

      total += group.items.length;

      completed += group.items.filter((_, index) =>
        isBriefingItemChecked(groupKey, index),
      ).length;
    });
  }

  return {
    total,
    completed,
    complete: total > 0 && completed === total,
  };
}

function renderPostFlightOutcomeStatus() {
  const outcomeLabel =
    {
      SATISFACTORY: "Satisfactory",
      UNSATISFACTORY: "Unsatisfactory",
      DISCONTINUANCE: "Letter of Discontinuance",
    }[store.practicalTestOutcome] || "Not selected";

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

function getBriefingItemText(item) {
  if (item.text !== "Collect Examiner Fee") {
    return item.text;
  }

  const rawFee = store.applicant?.feeAmount ?? store.feeAmount ?? null;

  if (rawFee === null || rawFee === undefined || rawFee === "") {
    return "Collect Examiner Fee";
  }

  const fee = Number(rawFee);

  if (!Number.isFinite(fee)) {
    return "Collect Examiner Fee";
  }

  return `Collect Examiner Fee - ${fee.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  })}`;
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

      ${REQUIRED_BRIEFINGS.map((section) => {
        const status = getBriefingStatus(section);
        const isOpen = store.expandedBriefings?.[section.id] !== false;

        return `
          <div 
            class="checklist-section ${status.complete ? "checklist-section-complete" : ""} ${isOpen ? "open" : ""}"
            data-briefing-section-card="${escapeHtml(section.id)}"
          >
            <div class="checklist-header" data-briefing-toggle="${escapeHtml(section.id)}">
              <div class="checklist-header-left">
                <input
                  type="checkbox"
                  class="briefing-master-check"
                  data-briefing-master-check="${escapeHtml(section.id)}"
                  ${status.complete ? "checked" : ""}
                  title="Check or uncheck all items in this section"
                  onclick="event.stopPropagation();"
                />

                <i class="fas fa-clipboard-check section-icon"></i>
                <h3>${escapeHtml(section.title)}</h3>
              </div>

              <div class="checklist-header-right">
                <span class="checklist-progress">${status.completed} / ${status.total}</span>
                <i class="fas ${status.complete ? "fa-circle-check" : "fa-circle"} checklist-status-icon ${status.complete ? "complete" : ""}"></i>
                <i class="fas fa-chevron-down checklist-chevron"></i>
              </div>
            </div>

            <div class="checklist-body">
              ${section.id === "postFlightBriefing" ? renderPostFlightOutcomeStatus() : ""}

              <div class="checklist-items">
                ${(section.items || [])
                  .map((item, index) => {
                    const checked = isBriefingItemChecked(section.id, index);
                    const itemKey = `${section.id}_${index}`;

                    return `
                    <div
                      class="checklist-item ${checked ? "checked" : ""}"
                      style="margin-left:${(item.indent || 0) * 24}px;"
                    >
                      <input
                        type="checkbox"
                        id="briefing_${escapeHtml(itemKey)}"
                        data-required-briefing-section="${escapeHtml(section.id)}"
                        data-required-briefing-index="${index}"
                        ${checked ? "checked" : ""}
                      />

                      <label for="briefing_${escapeHtml(itemKey)}">
                        ${escapeHtml(getBriefingItemText(item))}
                      </label>
                    </div>
                  `;
                  })
                  .join("")}

                ${(section.groups || [])
                  .map((group) => {
                    const groupDisabled = isBriefingGroupDisabled(group);
                    const groupKey = `${section.id}.${group.id}`;
                    const disabledStyle = groupDisabled
                      ? "opacity:0.35; filter:grayscale(100%); pointer-events:none;"
                      : "opacity:1; filter:none; pointer-events:auto;";

                    return `
                    <div 
                      class="briefing-group" 
                      data-briefing-outcome="${group.outcome}"
                      style="${disabledStyle}"
                    >
                      <div class="briefing-group-title" style="${groupDisabled ? "background:#e5e7eb;color:#6b7280;" : ""}">
                        ${escapeHtml(group.title)}
                        ${groupDisabled ? '<span class="briefing-disabled-note">Disabled by selected outcome</span>' : ""}
                      </div>

                      ${group.items
                        .map((item, index) => {
                          const checked = isBriefingItemChecked(
                            groupKey,
                            index,
                          );
                          const itemKey = `${groupKey}_${index}`;

                          return `
                          <div
                            class="checklist-item ${checked ? "checked" : ""}"
                            style="margin-left:${Number(item.indent || 0) * 24}px;"
                          >
                            <input
                              type="checkbox"
                              id="briefing_${escapeHtml(itemKey)}"
                              data-required-briefing-section="${escapeHtml(groupKey)}"
                              data-required-briefing-index="${index}"
                              ${checked ? "checked" : ""}
                              ${groupDisabled ? "disabled" : ""}
                            />
                            <label for="briefing_${escapeHtml(itemKey)}">${escapeHtml(item.text)}</label>
                          </div>
                        `;
                        })
                        .join("")}
                    </div>
                  `;
                  })
                  .join("")}
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  container.querySelectorAll("[data-briefing-toggle]").forEach((header) => {
    header.addEventListener("click", (event) => {
      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "LABEL" ||
        event.target.tagName === "SELECT"
      ) {
        return;
      }

      const sectionId = header.dataset.briefingToggle;

      store.expandedBriefings ??= {};
      store.expandedBriefings[sectionId] =
        store.expandedBriefings?.[sectionId] === false;

      modules.notify();
    });
  });

  container
    .querySelectorAll("[data-briefing-master-check]")
    .forEach((master) => {
      master.addEventListener("change", (event) => {
        event.stopPropagation();

        const sectionId = event.target.dataset.briefingMasterCheck;
        const checked = event.target.checked;

        const section = REQUIRED_BRIEFINGS.find(
          (item) => item.id === sectionId,
        );
        if (!section) return;

        store.requiredBriefings ??= {};
        store.requiredBriefings[section.id] ??= {};

        (section.items || []).forEach((_, index) => {
          store.requiredBriefings[section.id][index] = checked;
        });

        (section.groups || []).forEach((group) => {
          if (isBriefingGroupDisabled(group)) return;

          const groupKey = `${section.id}.${group.id}`;
          store.requiredBriefings[groupKey] ??= {};

          group.items.forEach((_, index) => {
            store.requiredBriefings[groupKey][index] = checked;
          });
        });

        modules.notify();
      });
    });

  container
    .querySelectorAll("[data-required-briefing-section]")
    .forEach((input) => {
      input.addEventListener("change", (event) => {
        const sectionId = event.target.dataset.requiredBriefingSection;
        const index = Number(event.target.dataset.requiredBriefingIndex);

        setBriefingItemChecked(sectionId, index, event.target.checked);
      });
    });

  updatePostFlightOutcomeGroups(container);
}

function updatePostFlightOutcomeGroups(container = document) {
  syncPracticalTestOutcomeFromOutcomeTab();

  const selectedOutcome = store.practicalTestOutcome || "";
  const groups = container.querySelectorAll("[data-briefing-outcome]");

  groups.forEach((group) => {
    const groupOutcome = group.dataset.briefingOutcome;
    const disabled = !!selectedOutcome && groupOutcome !== selectedOutcome;

    group.style.opacity = disabled ? "0.35" : "1";
    group.style.filter = disabled ? "grayscale(100%)" : "none";
    group.style.pointerEvents = disabled ? "none" : "auto";

    const title = group.querySelector(".briefing-group-title");

    if (title) {
      title.style.background = disabled ? "#e5e7eb" : "#f3f4f6";
      title.style.color = disabled ? "#6b7280" : "#374151";

      const existingNote = title.querySelector(".briefing-disabled-note");

      if (existingNote) {
        existingNote.remove();
      }

      if (disabled) {
        const note = document.createElement("span");
        note.className = "briefing-disabled-note";
        note.textContent = " Disabled by selected outcome";
        title.appendChild(note);
      }
    }

    group.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.disabled = disabled;
      input.style.cursor = disabled ? "not-allowed" : "pointer";
    });

    group.querySelectorAll("label").forEach((label) => {
      label.style.cursor = disabled ? "not-allowed" : "pointer";
    });
  });
}

function renderAcsCodeDecoder(tasks) {
  let container = document.getElementById("acsCodeDecoder");

  if (!container) {
    const applicantBox =
      document.querySelector(".applicant-info-card") ||
      document.querySelector(".applicant-card") ||
      document.querySelector(".applicant-info") ||
      document.querySelector("#applicantInfo") ||
      document.querySelector("#applicantInfoBox");

    if (!applicantBox) return;

    container = document.createElement("div");
    container.id = "acsCodeDecoder";

    applicantBox.insertAdjacentElement("afterend", container);
  }

  const isAdditionalExam =
    normalizeEmtExamType(store.applicant.appExamType) === "Additional";

  const knowledgeTestRequired =
    modules.isKnowledgeTestRequired?.(
      store.applicant.appExamType,
      store.applicant.knowledgeTestRequired,
    ) ?? !isAdditionalExam;

  /*
   * Additional ratings do not require the ACS Code Decoder.
   * This is an explicit EMT UI rule and takes precedence over
   * any previously stored knowledgeTestRequired value.
   */
  if (isAdditionalExam || !knowledgeTestRequired) {
    container.style.display = "none";
    store.selectedAcsCodes = [];
    store.aktUploadStatus = "";
    return;
  }

  container.style.display = "";

  const codes = [
    ...new Set(tasks.map((task) => task.code).filter(Boolean)),
  ].sort();

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
        <span style="font-size:0.9rem;color:#000000;">${isOpen ? "▲" : "▼"}</span>
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
        <div style="
          font-weight:600;
          display:block;
          margin-bottom:6px;
          color:#000000;
        ">
          Add Airman Knowledge Test Report
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
          <label for="aktReportUpload" style="
            display:inline-flex;
            align-items:center;
            gap:6px;
            padding:7px 10px;
            border:1px solid #cbd5e1;
            border-radius:6px;
            background:#ffffff;
            cursor:pointer;
            color:#000000;
          ">
            <i class="fas fa-file-arrow-up"></i>
            Choose File
          </label>
          <input
            type="file"
            id="aktReportUpload"
            accept=".pdf,.txt,image/*"
            style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);"
          >

          <label for="aktReportCamera" style="
            display:inline-flex;
            align-items:center;
            gap:6px;
            padding:7px 10px;
            border:1px solid #cbd5e1;
            border-radius:6px;
            background:#ffffff;
            cursor:pointer;
            color:#000000;
          ">
            <i class="fas fa-camera"></i>
            Take Picture
          </label>
          <input
            type="file"
            id="aktReportCamera"
            accept="image/*"
            capture="environment"
            style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);"
          >
        </div>

        <div style="margin-top:6px;font-size:0.8rem;color:#475569;">
          PDF, text, or image. Review the matched ACS codes below and uncheck any that were read incorrectly.
        </div>

        <div
          id="aktUploadStatus"
          style="
            margin-top:6px;
            font-size:0.85rem;
            color:#000000;
          "
        >${escapeHtml(store.aktUploadStatus || "")}</div>
      </div>

      <div
        id="acsDecoderBody"
        style="
          display:${isOpen ? "grid" : "none"};
          grid-template-columns:repeat(auto-fill,minmax(110px,1fr));
          gap:6px;
          color:#000000;
        "
      >
        ${codes
          .map(
            (code) => `
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
              ${store.selectedAcsCodes.includes(code) ? "checked" : ""}
            />
            <span style="color:#000000;">${escapeHtml(code)}</span>
          </label>
        `,
          )
          .join("")}
      </div>
    </div>
  `;

  container
    .querySelector("#acsDecoderHeader")
    ?.addEventListener("click", () => {
      store.acsDecoderOpen = store.acsDecoderOpen === false;
      modules.notify();
    });

  container
    .querySelectorAll('#acsDecoderBody input[type="checkbox"]')
    .forEach((box) => {
      box.addEventListener("change", (event) => {
        const code = event.target.value;

        if (typeof modules.toggleAcsCode === "function") {
          modules.toggleAcsCode(code);
        } else {
          toggleAcsCodeFallback(code);
        }
      });
    });

  container
    .querySelector("#aktReportUpload")
    ?.addEventListener("change", handleAKTReportUpload);

  container
    .querySelector("#aktReportCamera")
    ?.addEventListener("change", handleAKTReportUpload);
}

async function handleAKTReportUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const status = document.getElementById("aktUploadStatus");
  setAktUploadStatus("Reading report...", status);

  try {
    let text = "";

    if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      text = await extractPdfText(file);
    } else if (
      file.type.startsWith("image/") ||
      /\.(?:jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(file.name)
    ) {
      text = await extractImageText(file);
    } else {
      text = await file.text();
    }

    const matches = extractAcsCodesFromText(text);

    if (!matches.length) {
      setAktUploadStatus(
        "No ACS codes found. Try a clearer, closer picture with the full codes visible.",
        status,
      );
      return;
    }

    store.selectedAcsCodes = [
      ...new Set([...(store.selectedAcsCodes || []), ...matches]),
    ];

    setAktUploadStatus(
      `Found and selected ${matches.length} ACS code(s): ${matches.join(", ")}. Review the selections below.`,
      status,
    );

    modules.notify();
  } catch (err) {
    console.error(err);
    setAktUploadStatus("Unable to read Airman Knowledge Test Report.", status);
  }
}

function setAktUploadStatus(message, statusElement = null) {
  store.aktUploadStatus = String(message || "");

  const status = statusElement || document.getElementById("aktUploadStatus");
  if (status) status.textContent = store.aktUploadStatus;
}

async function extractImageText(file) {
  if (!window.Tesseract) {
    throw new Error("Tesseract OCR is not loaded.");
  }

  const result = await Tesseract.recognize(file, "eng", {
    logger: (message) => {
      if (
        message.status === "recognizing text" &&
        typeof message.progress === "number"
      ) {
        setAktUploadStatus(
          `OCR reading report... ${Math.round(message.progress * 100)}%`,
        );
      }
    },
  });

  return result.data.text;
}

function extractAcsCodesFromText(text) {
  const cleaned = String(text || "")
    .toUpperCase()
    .replace(/[|]/g, "I")
    .replace(/\s+/g, " ")
    .replace(/P A\./g, "PA.")
    .replace(/P\.A\./g, "PA.")
    .replace(/PAI/g, "PA.I")
    .replace(/PAI\./g, "PA.I.")
    .replace(/PA\.\s*/g, "PA.")
    .replace(/IR\.\s*/g, "IR.")
    .replace(/CA\.\s*/g, "CA.")
    .replace(/ATP\.\s*/g, "ATP.")
    .replace(/FI\.\s*/g, "FI.")
    .replace(/\.\s*/g, ".");

  const elementRegex =
    /\b(?:PA|IR|CA|ATP|FI)\.[IVXLC]+\.[A-Z]\.[KRS]\d+[A-Z]?\b/g;

  const taskRegex = /\b(?:PA|IR|CA|ATP|FI)\.[IVXLC]+\.[A-Z]\b/g;

  const elementMatches = cleaned.match(elementRegex) || [];
  const taskMatches = cleaned.match(taskRegex) || [];

  const allMatches = [...elementMatches, ...taskMatches];

  const taskCodes = allMatches.map((code) => {
    const parts = code.split(".");
    return parts.slice(0, 3).join(".");
  });

  console.log("AKTR raw OCR text:", text);
  console.log("AKTR cleaned text:", cleaned);
  console.log("AKTR matched ACS codes:", taskCodes);

  return [...new Set(taskCodes)];
}

async function extractPdfText(file) {
  if (!window.pdfjsLib) {
    throw new Error("PDF.js is not loaded.");
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: buffer,
  }).promise;

  let text = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    const content = await page.getTextContent();

    text += content.items.map((item) => item.str).join(" ");

    text += "\n";
  }

  const pdfTextMatches = extractAcsCodesFromText(text);

  if (pdfTextMatches.length > 0) {
    return text;
  }

  if (!window.Tesseract) {
    throw new Error("Tesseract OCR is not loaded.");
  }

  let ocrText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    const viewport = page.getViewport({
      scale: 2.5,
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    const result = await Tesseract.recognize(canvas, "eng", {
      logger: (message) => {
        const status = document.getElementById("aktUploadStatus");

        if (
          status &&
          message.status === "recognizing text" &&
          typeof message.progress === "number"
        ) {
          status.textContent = `OCR reading report... ${Math.round(message.progress * 100)}%`;
        }
      },
    });

    ocrText += result.data.text + "\n";
  }

  return ocrText;
}

function toggleAcsCodeFallback(code) {
  store.selectedAcsCodes ??= [];

  if (store.selectedAcsCodes.includes(code)) {
    store.selectedAcsCodes = store.selectedAcsCodes.filter(
      (item) => item !== code,
    );
  } else {
    store.selectedAcsCodes.push(code);
  }

  modules.notify();
}

async function testApplicantReportFlow() {
  const flowUrl =
    "https://default59acb2f988f145c3981040caf9cf42.11.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/f14216e9ffbb4101b5f5c7967895a81f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=V1LRs5VLQeeDdkG7H0U_e15ChR9hO66xGlCdXTK-m2o";

  const payload = {
    itemId: 7,
    email: "kele@fergerstrom.net",
    recommendingInstructorEmail: "kele.fergerstrom@icloud.com",
    applicantName: "Test Applicant",
    pdfFileName: "TestReport.pdf",
    pdfBase64: "dGVzdA==",
  };

  try {
    const response = await fetch(flowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("Flow status:", response.status);
    console.log(await response.text());

    alert("Flow triggered. Check Power Automate run history.");
  } catch (error) {
    console.error("Flow trigger failed:", error);
    alert("Flow trigger failed. Check console.");
  }
}

function applyAcsCodeHighlights() {
  document.querySelectorAll("[data-acs-code]").forEach((el) => {
    const code = el.dataset.acsCode;

    if (store.selectedAcsCodes?.includes(code)) {
      el.style.background = "#ffd6e8";
      el.style.border = "2px solid #ff4fa3";
      el.style.borderRadius = "6px";
      el.style.padding = "2px 6px";
    } else {
      el.style.background = "";
      el.style.border = "";
      el.style.borderRadius = "";
      el.style.padding = "";
    }
  });
}

function exportJsonSave() {
  const areas = getCurrentAreas();
  const tasks = getCurrentTasks(areas);

  modules.downloadJson("acs-ems-save.json", {
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
    areas,
  });
}

async function submitToSharePoint() {
  const areas = getCurrentAreas();
  const tasks = getCurrentTasks(areas);
  const summary = modules.summarizeTasks(tasks);

  const button = $("btnSharePoint");
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
    areas,
  };

  try {
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    const response = await fetch(SUBMIT_FLOW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Flow failed with status ${response.status}`);
    }

    const result = await response.json();

    console.log("SharePoint Item ID:", result.itemId);

    const reportHtml = buildPracticalTestReportHtml("applicant");

    await fetch(
      "https://default59acb2f988f145c3981040caf9cf42.11.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/f14216e9ffbb4101b5f5c7967895a81f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=V1LRs5VLQeeDdkG7H0U_e15ChR9hO66xGlCdXTK-m2o",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: Number(result.itemId),
          email: store.applicant.appEmail || "kele@fergerstrom.net",
          recommendingInstructorEmail:
            store.applicant.appInstructorEmail ||
            store.applicant.recommendingInstructorEmail ||
            "kele.fergerstrom@icloud.com",
          applicantName: store.applicant.appName || "Applicant",
          pdfFileName: `Applicant_Practical_Test_Report_${Date.now()}.pdf`,
          reportHtml,
        }),
      },
    );

    alert(
      `Submitted to SharePoint successfully. Item ID: ${result.itemId}. Report HTML sent to PDF/email flow.`,
    );
  } catch (error) {
    console.error(error);
    alert(
      "Submission failed. Check Power Automate run history and browser console.",
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }
}

function buildPracticalTestReportHtml(reportType = "applicant") {
  const isApplicant = reportType === "applicant";

  const areas = getCurrentAreas();

  const tasks = getCurrentTasks(areas);

  const summary = modules.summarizeTasks(tasks);

  const applicant = store.applicant || {};

  const notes = store.examinerNotes || {};

  const applicantName = applicant.appName || "";

  const getTaskKeys = (task) => {
    const keys = [
      task.filterCode,
      task.code,
      task.id,
      `${task.areaId}_${task.id}`,
      String(task.code || "").replaceAll(".", "_"),
      String(task.filterCode || "").replaceAll("_", "."),
    ];

    return [...new Set(keys.filter(Boolean))];
  };

  const getExaminerNote = (task) => {
    for (const key of getTaskKeys(task)) {
      const note = notes[key];

      if (note !== null && note !== undefined && String(note).trim()) {
        return String(note).trim();
      }
    }

    return "";
  };

  const aircraftDisplay = [applicant.appAircraftType, applicant.appNNumber]
    .filter(Boolean)
    .join(" / ");

  const reportTitle = isApplicant
    ? "Applicant Practical Test Report"
    : "Designee Practical Test Report";

  const getTaskStatus = (task) => {
    const row = summary.statuses?.find(
      (item) => item.task?.filterCode === task.filterCode,
    );

    const k = store.grades?.[`${task.filterCode}.K`] || "NP";

    const r = store.grades?.[`${task.filterCode}.R`] || "NP";

    const s = store.grades?.[`${task.filterCode}.S`] || "NP";

    const values = [k, r, s];

    const hasGrade = values.some((value) => value && value !== "NP");

    if (row?.status === "not-required" && !hasGrade) {
      return "Not Required";
    }

    if (row?.status === "not-required" && hasGrade) {
      if (values.includes("1") || values.includes("2")) {
        return "Unsatisfactory";
      }

      if (values.includes("3") || values.includes("4")) {
        return "Satisfactory";
      }

      return "Not Required";
    }

    if (!row) {
      return "Incomplete";
    }

    if (row.status === "fail") {
      return "Unsatisfactory";
    }

    if (row.status === "incomplete") {
      return "Incomplete";
    }

    return "Satisfactory";
  };

  const getStatusPresentation = (status) => {
    if (status === "Satisfactory") {
      return {
        symbol: "✓",
        className: "task-status-sat",
        label: "Satisfactory",
      };
    }

    if (status === "Unsatisfactory") {
      return {
        symbol: "×",
        className: "task-status-unsat",
        label: "Unsatisfactory",
      };
    }

    return {
      symbol: "!",
      className: "task-status-inc",
      label: status === "Not Required" ? "Not Required" : "Incomplete",
    };
  };

  const isAcsHighlighted = (task) => {
    const selected = store.selectedAcsCodes || [];

    return (
      selected.includes(task.code) ||
      selected.includes(task.filterCode) ||
      selected.includes(String(task.filterCode || "").replaceAll("_", ".")) ||
      selected.includes(String(task.code || "").replaceAll(".", "_"))
    );
  };

  const taskRows = tasks
    .map((task) => {
      const status = getTaskStatus(task);

      const presentation = getStatusPresentation(status);

      const note = getExaminerNote(task);

      const highlighted = isAcsHighlighted(task);

      return `
        <tr>
          <td class="task-code-cell ${highlighted ? "acs-highlight" : ""}">
            <span
              class="task-status-icon ${presentation.className}"
              title="${escapeReport(presentation.label)}"
              aria-label="${escapeReport(presentation.label)}"
            >
              ${presentation.symbol}
            </span>

            <span class="task-code-text">
              ${escapeReport(task.code || "")}
            </span>
          </td>

          <td class="task-title-cell ${highlighted ? "acs-highlight" : ""}">
            ${escapeReport(task.title || "")}
          </td>

          <td class="examiner-comment-cell">
            ${note ? escapeReport(note).replace(/\n/g, "<br>") : ""}
          </td>
        </tr>
      `;
    })
    .join("");

  const detailRows = tasks
    .map((task) => {
      const note = getExaminerNote(task);

      return `
        <tr>
          <td>
            ${escapeReport(task.code || "")}
          </td>

          <td>
            ${escapeReport(task.title || "")}
          </td>

          <td>
            ${escapeReport(store.grades?.[`${task.filterCode}.K`] || "NP")}
          </td>

          <td>
            ${escapeReport(store.grades?.[`${task.filterCode}.R`] || "NP")}
          </td>

          <td>
            ${escapeReport(store.grades?.[`${task.filterCode}.S`] || "NP")}
          </td>

          <td>
            ${note ? escapeReport(note).replace(/\n/g, "<br>") : ""}
          </td>
        </tr>
      `;
    })
    .join("");

  const overall = String(
    summary.overall || store.practicalTestOutcome || "INCOMPLETE",
  ).toUpperCase();

  const overallClass =
    overall === "SATISFACTORY"
      ? "overall-sat"
      : overall === "UNSATISFACTORY"
        ? "overall-unsat"
        : "overall-inc";

  const overallSymbol =
    overall === "SATISFACTORY" ? "✓" : overall === "UNSATISFACTORY" ? "×" : "!";

  const requestNumber =
    applicant.requestNumber || store.databaseSubmission?.requestNumber || "";

  const generatedAt = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const groundDuration = applicant.appGroundDuration
    ? `${escapeReport(applicant.appGroundDuration)} hrs`
    : "—";

  const flightDuration = applicant.appFlightDuration
    ? `${escapeReport(applicant.appFlightDuration)} hrs`
    : "—";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">

  <title>
    ${escapeReport(reportTitle)}
  </title>

  <style>
    @page {
      size: letter portrait;
      margin: 0.26in;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      color: #10233f;
      background: #ffffff;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
    }

    body {
      font-size: 9pt;
      line-height: 1.15;
    }

    .print-controls {
      padding: 12px;
      background: #eef3f8;
      border-bottom: 1px solid #ccd6e0;
    }

    .print-controls button {
      border: 0;
      border-radius: 6px;
      padding: 8px 14px;
      margin-right: 8px;
      background: #073b78;
      color: white;
      font-weight: 700;
      cursor: pointer;
    }

    .report-page {
      position: relative;
      width: 100%;
      overflow: visible;
      padding-bottom: 0;
    }

    .report-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .report-header {
      display: flex;
      align-items: center;
      min-height: 0.58in;
      padding: 9px 16px;
      border-radius: 10px;
      background:
        linear-gradient(
          90deg,
          #063668,
          #0b4d91
        );
      color: #ffffff;
    }

    .header-airplane {
      flex: 0 0 auto;
      margin-right: 13px;
      font-size: 24pt;
      line-height: 1;
      transform: rotate(-8deg);
    }

    .header-title {
      flex: 1 1 auto;
      margin: 0;
      font-size: 22pt;
      line-height: 1;
      font-weight: 800;
      letter-spacing: -0.3px;
    }

    .header-page {
      flex: 0 0 auto;
      font-size: 8pt;
      font-weight: 700;
    }

    .section-card {
      margin-top: 12px;
      border: 1px solid #9fb2c8;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
    }

    .section-title {
      padding: 6px 11px;
      background:
        linear-gradient(
          90deg,
          #073b78,
          #0c4e90
        );
      color: #ffffff;
      font-size: 11pt;
      font-weight: 800;
    }

    .applicant-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 5px 34px;
      padding: 12px 15px 14px;
    }

    .information-row {
      display: grid;
      grid-template-columns:
        104px 1fr;
      align-items: baseline;
      min-height: 23px;
      border-bottom:
        1px solid #d8e0e8;
    }

    .information-label {
      padding: 4px 6px 3px 0;
      font-weight: 800;
      color: #12233b;
    }

    .information-value {
      padding: 4px 0 3px;
      color: #18314f;
    }

    .overall-result {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0.55in;
      margin-top: 12px;
      border: 1.5px solid;
      border-radius: 8px;
      text-align: center;
    }

    .overall-result.overall-sat {
      border-color: #15803d;
      background: #edf9f0;
      color: #12652e;
    }

    .overall-result.overall-unsat {
      border-color: #c51f2d;
      background: #fff0f1;
      color: #a51120;
    }

    .overall-result.overall-inc {
      border-color: #d59a00;
      background: #fff9e6;
      color: #916700;
    }

    .overall-result-symbol {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      margin-right: 12px;
      border-radius: 50%;
      color: #ffffff;
      background: currentColor;
      font-size: 0;
    }

    .overall-result-symbol::after {
      content: attr(data-symbol);
      color: #ffffff;
      font-size: 21pt;
      font-weight: 900;
      line-height: 1;
    }

    .overall-result-content {
      display: flex;
      align-items: baseline;
      gap: 9px;
    }

    .overall-result-label {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.35px;
    }

    .overall-result-value {
      font-size: 17pt;
      font-weight: 900;
      line-height: 1;
    }

    .metric-grid {
      display: grid;
      grid-template-columns:
        repeat(5, 1fr);
      gap: 8px;
      margin-top: 12px;
    }

    .metric-card {
      min-height: 0.82in;
      padding: 8px 5px 7px;
      border: 1px solid #c6d0dc;
      border-radius: 7px;
      text-align: center;
      background: #fbfcfe;
    }

    .metric-card.metric-sat {
      border-color: #2eb85c;
      background: #f1fbf4;
    }

    .metric-label {
      min-height: 27px;
      font-size: 8pt;
      line-height: 1.05;
      font-weight: 800;
    }

    .metric-value {
      margin-top: 6px;
      font-size: 18pt;
      line-height: 1;
      font-weight: 900;
      color: #10233f;
    }

    .metric-sat .metric-value {
      color: #15803d;
    }

    .metric-unsat .metric-value {
      color: #dc2626;
    }

    .metric-inc .metric-value {
      color: #b77900;
    }

    .metric-duration .metric-value {
      color: #164e8c;
      font-size: 15pt;
    }

    .outcome-notes-card {
      margin-top: 10px;
      min-height: 0.64in;
      padding: 9px 12px;
      border: 1px solid #aab9c9;
      border-radius: 8px;
      background: #fbfcfe;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .outcome-notes-title {
      margin-bottom: 4px;
      color: #0b3f78;
      font-weight: 800;
    }

    .page-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      padding-top: 5px;
      border-top: 1px solid #0b4d91;
      font-size: 7pt;
      color: #39516d;
    }

    .task-section-title {
      margin: 8px 0 5px;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #0b4d91;
      color: #0b3f78;
      font-size: 13pt;
      font-weight: 900;
    }

    .task-summary-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 6.35pt;
      line-height: 1.04;
    }

    .task-summary-table thead {
      display: table-header-group;
    }

    .task-summary-table th {
      padding: 3px 4px;
      border: 1px solid #365b83;
      background: #073b78;
      color: #ffffff;
      font-size: 6.8pt;
      text-align: left;
      font-weight: 800;
    }

    .task-summary-table td {
      padding: 1.35px 3.5px;
      border: 1px solid #cbd4de;
      vertical-align: middle;
      overflow-wrap: anywhere;
    }

    .task-summary-table tbody tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .task-summary-table tbody tr:nth-child(even) {
      background: #f6f8fa;
    }

    .task-code-cell {
      width: 17%;
      white-space: nowrap;
      font-weight: 700;
    }

    .task-title-cell {
      width: 42%;
    }

    .examiner-comment-cell {
      width: 41%;
      color: #263d56;
    }

    .task-status-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 13px;
      height: 13px;
      margin-right: 4px;
      border-radius: 50%;
      color: #ffffff;
      font-size: 8pt;
      line-height: 1;
      font-weight: 900;
      vertical-align: middle;
    }

    .task-status-sat {
      background: #15803d;
    }

    .task-status-unsat {
      background: #dc2626;
    }

    .task-status-inc {
      background: #e6a700;
      color: #ffffff;
    }

    .task-code-text {
      vertical-align: middle;
    }

    .acs-highlight {
      background: #ffe2ee !important;
    }

    .detail-page {
      font-size: 7pt;
      break-before: page;
      page-break-before: always;
    }

    .detail-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 6.5pt;
    }

    .detail-table th {
      background: #073b78;
      color: white;
    }

    .detail-table th,
    .detail-table td {
      border: 1px solid #cbd4de;
      padding: 2px 3px;
      vertical-align: top;
      white-space: normal;
      word-break: normal;
      overflow-wrap: break-word;
    }

    /*
     * Detailed K / R / S column widths
     *
     * Task is approximately 60% of its former equal-width size.
     * K, R, and S are each one quarter of their former equal-width size.
     * The recovered space is assigned to Title and Examiner Comment.
     */
    .detail-task-column {
      width: 10%;
    }

    .detail-title-column {
      width: 42.5%;
    }

    .detail-grade-column {
      width: 4.1667%;
    }

    .detail-comment-column {
      width: 35%;
    }

    .detail-table th:nth-child(1),
    .detail-table td:nth-child(1) {
      white-space: nowrap;
    }

    .detail-table th:nth-child(3),
    .detail-table th:nth-child(4),
    .detail-table th:nth-child(5),
    .detail-table td:nth-child(3),
    .detail-table td:nth-child(4),
    .detail-table td:nth-child(5) {
      padding-left: 1px;
      padding-right: 1px;
      text-align: center;
      white-space: nowrap;
    }

    .detail-table th:nth-child(6),
    .detail-table td:nth-child(6) {
      padding-left: 5px;
      padding-right: 5px;
    }

    @media print {
      .print-controls {
        display: none;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .report-page {
        min-height: 0;
      }
    }
  </style>
</head>

<body>
  <div class="print-controls">
    <button onclick="window.print()">
      Print / Save PDF
    </button>

    <button onclick="window.close()">
      Close Report
    </button>
  </div>

  <section class="report-page page-one">
    <header class="report-header">
      <div class="header-airplane">
        ✈
      </div>

      <h1 class="header-title">
        ${escapeReport(reportTitle)}
      </h1>

      <div class="header-page">
        ${isApplicant ? "" : "Page 1 of 2"}
      </div>
    </header>

    <div class="section-card">
      <div class="section-title">
        Applicant Information
      </div>

      <div class="applicant-grid">
        <div>
          <div class="information-row">
            <div class="information-label">
              Name:
            </div>

            <div class="information-value">
              ${escapeReport(applicantName)}
            </div>
          </div>

          <div class="information-row">
            <div class="information-label">
              Date:
            </div>

            <div class="information-value">
              ${escapeReport(formatDateMMDDYYYY(applicant.appDate))}
            </div>
          </div>

          <div class="information-row">
            <div class="information-label">
              Certificate:
            </div>

            <div class="information-value">
              ${escapeReport(applicant.appCertificate)}
            </div>
          </div>

          <div class="information-row">
            <div class="information-label">
              Rating:
            </div>

            <div class="information-value">
              ${escapeReport(formatRatingLabel(applicant.appRating))}
            </div>
          </div>

          <div class="information-row">
            <div class="information-label">
              Exam Type:
            </div>

            <div class="information-value">
              ${escapeReport(applicant.appExamType)}
            </div>
          </div>
        </div>

        <div>
          <div class="information-row">
            <div class="information-label">
              Aircraft:
            </div>

            <div class="information-value">
              ${escapeReport(aircraftDisplay)}
            </div>
          </div>

          <div class="information-row">
            <div class="information-label">
              Examiner:
            </div>

            <div class="information-value">
              ${escapeReport(applicant.appExaminer)}
            </div>
          </div>

          <div class="information-row">
            <div class="information-label">
              Retest:
            </div>

            <div class="information-value">
              ${escapeReport(applicant.appRetest || "No")}
            </div>
          </div>

          <div class="information-row">
            <div class="information-label">
              Location:
            </div>

            <div class="information-value">
              ${escapeReport(applicant.scheduledLocation || "")}
            </div>
          </div>

          <div class="information-row">
            <div class="information-label">
              Instructor:
            </div>

            <div class="information-value">
              ${escapeReport(applicant.appInstructor || "")}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="overall-result ${overallClass}">
      <span
        class="overall-result-symbol"
        data-symbol="${overallSymbol}"
      ></span>

      <div class="overall-result-content">
        <span class="overall-result-label">
          Overall Result
        </span>

        <span class="overall-result-value">
          ${escapeReport(overall)}
        </span>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric-card metric-sat">
        <div class="metric-label">
          Satisfactory Items
        </div>

        <div class="metric-value">
          ${summary.passedRequiredTasks}
        </div>
      </div>

      <div class="metric-card metric-unsat">
        <div class="metric-label">
          Unsatisfactory Items
        </div>

        <div class="metric-value">
          ${summary.failedTasks}
        </div>
      </div>

      <div class="metric-card metric-inc">
        <div class="metric-label">
          Incomplete
        </div>

        <div class="metric-value">
          ${summary.incompleteRequiredTasks}
        </div>
      </div>

      <div class="metric-card metric-duration">
        <div class="metric-label">
          Ground Duration
        </div>

        <div class="metric-value">
          ${groundDuration}
        </div>
      </div>

      <div class="metric-card metric-duration">
        <div class="metric-label">
          Flight Duration
        </div>

        <div class="metric-value">
          ${flightDuration}
        </div>
      </div>
    </div>

    <div class="task-section-title">
      Task Summary
    </div>

    <table class="task-summary-table">
      <thead>
        <tr>
          <th class="task-code-cell">
            Task
          </th>

          <th class="task-title-cell">
            Title
          </th>

          <th class="examiner-comment-cell">
            Examiner Comments
          </th>
        </tr>
      </thead>

      <tbody>
        ${taskRows}
      </tbody>
    </table>

    <div class="outcome-notes-card">
      <div class="outcome-notes-title">
        Outcome Notes:
      </div>

      <div>
        ${escapeReport(store.outcomeNotes || "None").replace(/\n/g, "<br>")}
      </div>
    </div>

    <footer class="page-footer">
      <span>
        Request Number:
        ${escapeReport(requestNumber)}
      </span>

      <span>
        ${isApplicant ? "" : "Page 1 of 2"}
      </span>
    </footer>
  </section>

  ${
    !isApplicant
      ? `
        <section class="report-page detail-page">
          <header class="report-header">
            <div class="header-airplane">
              ✈
            </div>

            <h1 class="header-title">
              Designee Detailed K / R / S Report
            </h1>

            <div class="header-page">
              Page 2 of 2
            </div>
          </header>

          <div class="task-section-title">
            Detailed K / R / S Breakdown
          </div>

          <table class="detail-table">
            <colgroup>
              <col class="detail-task-column">
              <col class="detail-title-column">
              <col class="detail-grade-column">
              <col class="detail-grade-column">
              <col class="detail-grade-column">
              <col class="detail-comment-column">
            </colgroup>

            <thead>
              <tr>
                <th>Task</th>
                <th>Title</th>
                <th>K</th>
                <th>R</th>
                <th>S</th>
                <th>Examiner Comment</th>
              </tr>
            </thead>

            <tbody>
              ${detailRows}
            </tbody>
          </table>

          <footer class="page-footer">
            <span>
              Request Number:
              ${escapeReport(requestNumber)}
            </span>

            <span>
              Generated:
              ${escapeReport(generatedAt)}
            </span>

            <span>
              Page 2 of 2
            </span>
          </footer>
        </section>
      `
      : ""
  }
</body>
</html>
`;
}

function buildDesigneePracticalTestReportHtml() {
  /*
   * The Applicant Practical Test Report is the visual master.
   *
   * Build that known-good report first, then add K / R / S columns
   * directly into the normal Task Summary table.
   *
   * There is intentionally NO separate Detailed K/R/S page.
   */
  const applicantHtml = buildPracticalTestReportHtml("applicant");

  const parser = new DOMParser();

  const documentCopy = parser.parseFromString(applicantHtml, "text/html");

  /*
   * Change only the report identity.
   */
  documentCopy.title = "Designee Practical Test Report";

  const title = documentCopy.querySelector(".header-title");

  if (title) {
    title.textContent = "Designee Practical Test Report";
  }

  /*
   * Locate the same Task Summary table used by the good Applicant
   * report.
   */
  let taskTable = documentCopy.querySelector(".task-summary table");

  if (!taskTable) {
    taskTable =
      Array.from(documentCopy.querySelectorAll("table")).find((table) => {
        const headerText = String(
          table.querySelector("thead")?.textContent || "",
        );

        return (
          headerText.includes("Task") &&
          headerText.includes("Title") &&
          headerText.includes("Examiner Comments")
        );
      }) || null;
  }

  if (!taskTable) {
    throw new Error("The Applicant Task Summary table could not be found.");
  }

  taskTable.classList.add("designee-task-table");

  const headerRow = taskTable.querySelector("thead tr");

  if (!headerRow) {
    throw new Error("The Task Summary header could not be found.");
  }

  /*
   * Applicant table is:
   *
   * Task | Title | Examiner Comments
   *
   * Insert K/R/S immediately before Examiner Comments.
   */
  const commentHeader = headerRow.lastElementChild;

  if (!commentHeader) {
    throw new Error("The Examiner Comments column could not be found.");
  }

  ["K", "R", "S"].forEach((gradeType) => {
    const th = documentCopy.createElement("th");

    th.textContent = gradeType;

    th.className = "designee-grade-header";

    headerRow.insertBefore(th, commentHeader);
  });

  /*
   * Current ACS task list so the printed task code can be connected
   * back to store.grades.
   */
  const tasks = getCurrentTasks(getCurrentAreas());

  const normalizeCode = (value) =>
    String(value || "")
      .trim()
      .replaceAll("_", ".");

  const getTaskForPrintedCode = (printedCode) => {
    const normalizedPrinted = normalizeCode(printedCode);

    return (
      tasks.find((task) => {
        const taskCode = normalizeCode(task.code);

        const filterCode = normalizeCode(task.filterCode);

        return (
          taskCode === normalizedPrinted || filterCode === normalizedPrinted
        );
      }) || null
    );
  };

  const getGrade = (task, printedCode, gradeType) => {
    const candidates = [
      task?.filterCode,
      task?.code,
      printedCode,
      String(printedCode || "").replaceAll(".", "_"),
      String(printedCode || "").replaceAll("_", "."),
    ].filter(Boolean);

    for (const code of [...new Set(candidates)]) {
      const value = store.grades?.[`${code}.${gradeType}`];

      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value);
      }
    }

    return "NP";
  };

  taskTable.querySelectorAll("tbody tr").forEach((row) => {
    const codeElement = row.querySelector(".task-code-text");

    /*
     * Fallback in case the Applicant report row does not contain the
     * task-code span for some future certificate type.
     */
    const firstCell = row.querySelector("td");

    const printedCode = String(
      codeElement?.textContent || firstCell?.textContent || "",
    )
      .replace(/^[✓×!]\s*/, "")
      .trim();

    const task = getTaskForPrintedCode(printedCode);

    const commentCell = row.lastElementChild;

    if (!commentCell) {
      return;
    }

    ["K", "R", "S"].forEach((gradeType) => {
      const td = documentCopy.createElement("td");

      td.className = "designee-grade-cell";

      td.textContent = getGrade(task, printedCode, gradeType);

      row.insertBefore(td, commentCell);
    });
  });

  /*
   * Keep the same visual language as the Applicant report but assign
   * sensible widths to the six-column Designee task table.
   */
  const style = documentCopy.createElement("style");

  style.textContent = `
    .designee-task-table {
      width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
    }

    .designee-task-table th:nth-child(1),
    .designee-task-table td:nth-child(1) {
      width: 14% !important;
    }

    .designee-task-table th:nth-child(2),
    .designee-task-table td:nth-child(2) {
      width: 34% !important;
    }

    .designee-task-table th:nth-child(3),
    .designee-task-table td:nth-child(3),
    .designee-task-table th:nth-child(4),
    .designee-task-table td:nth-child(4),
    .designee-task-table th:nth-child(5),
    .designee-task-table td:nth-child(5) {
      width: 5% !important;
      min-width: 5% !important;
      max-width: 5% !important;

      padding-left: 2px !important;
      padding-right: 2px !important;

      text-align: center !important;
      vertical-align: middle !important;
      white-space: nowrap !important;

      font-weight: 700 !important;
    }

    .designee-task-table th:nth-child(6),
    .designee-task-table td:nth-child(6) {
      width: 37% !important;
    }

    .designee-grade-header {
      text-align: center !important;
    }

    /*
     * Allow the same Applicant-report table to flow naturally onto
     * additional pages.
     */
    .designee-task-table tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .designee-task-table thead {
      display: table-header-group;
    }

    @media print {
      .designee-task-table thead {
        display: table-header-group;
      }
    }
  `;

  documentCopy.head.appendChild(style);

  return "<!DOCTYPE html>\n" + documentCopy.documentElement.outerHTML;
}

function generatePracticalTestReport(reportType = "applicant") {
  const html =
    reportType === "designee"
      ? buildDesigneePracticalTestReportHtml()
      : buildPracticalTestReportHtml("applicant");
  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    alert("Popup blocked. Please allow popups for this site.");
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
}

async function generateApplicantReportPdfBlob() {
  if (typeof window.html2pdf !== "function") {
    throw new Error(
      "The PDF generator did not load. Refresh the EMS app and try again.",
    );
  }

  const reportHtml = buildPracticalTestReportHtml("applicant");

  const frame = document.createElement("iframe");

  frame.setAttribute("aria-hidden", "true");

  frame.style.position = "fixed";
  frame.style.left = "-100000px";
  frame.style.top = "0";
  frame.style.width = "816px";
  frame.style.height = "1056px";
  frame.style.border = "0";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";

  document.body.appendChild(frame);

  try {
    const frameDocument = frame.contentDocument;

    if (!frameDocument) {
      throw new Error("The temporary report document could not be created.");
    }

    frameDocument.open();
    frameDocument.write(reportHtml);
    frameDocument.close();

    await new Promise((resolve) => {
      const finish = () => window.setTimeout(resolve, 150);

      if (frame.contentWindow?.document?.readyState === "complete") {
        finish();
      } else {
        frame.addEventListener("load", finish, {
          once: true,
        });
      }
    });

    if (frameDocument.fonts?.ready) {
      await frameDocument.fonts.ready;
    }

    const images = Array.from(frameDocument.images || []);

    await Promise.all(
      images.map((image) => {
        if (image.complete) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          image.addEventListener("load", resolve, {
            once: true,
          });

          image.addEventListener("error", resolve, {
            once: true,
          });
        });
      }),
    );

    /*
     * IMPORTANT:
     * The EMT browser report is the approved visual source.
     *
     * Capture ONLY the actual report page, not the iframe body.
     * The body contains browser-only layout/controls that are not part
     * of the printable report and were corrupting the archived PDFs.
     */
    frameDocument.querySelector(".print-controls")?.remove();

    const reportPage = frameDocument.querySelector(".report-page");

    if (!reportPage) {
      throw new Error("The printable report page could not be found.");
    }

    /*
     * html2pdf uses screen CSS, so explicitly apply the layout that the
     * browser uses when printing the good EMT report.
     */
    const storedPdfStyle = frameDocument.createElement("style");

    storedPdfStyle.textContent = `
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 816px !important;
        min-width: 816px !important;
        max-width: 816px !important;
        background: #ffffff !important;
        overflow: visible !important;
      }

      .print-controls {
        display: none !important;
      }

      .report-page {
        display: block !important;
        position: static !important;
        float: none !important;

        width: 816px !important;
        min-width: 816px !important;
        max-width: 816px !important;

        min-height: 0 !important;

        margin: 0 !important;
        box-sizing: border-box !important;

        break-before: auto !important;
        page-break-before: auto !important;

        break-after: auto !important;
        page-break-after: auto !important;
      }

      table {
        max-width: 100% !important;
      }

      thead {
        display: table-header-group !important;
      }

      tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    `;

    frameDocument.head.appendChild(storedPdfStyle);

    /*
     * Force the browser to calculate the final printable dimensions
     * before html2canvas captures the page.
     */
    void reportPage.offsetHeight;

    const pdfBlob = await window
      .html2pdf()
      .set({
        margin: 0,
        filename: "Applicant-Practical-Test-Report.pdf",
        image: {
          type: "jpeg",
          quality: 0.98,
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        },
        jsPDF: {
          unit: "in",
          format: "letter",
          orientation: "portrait",
        },
        pagebreak: {
          mode: ["css", "legacy"],
        },
      })
      .from(reportPage)
      .outputPdf("blob");

    if (!(pdfBlob instanceof Blob) || pdfBlob.size === 0) {
      throw new Error("The generated Applicant Report PDF was empty.");
    }

    return pdfBlob;
  } finally {
    frame.remove();
  }
}

async function generateDesigneeReportPdfBlob() {
  if (typeof window.html2pdf !== "function") {
    throw new Error(
      "The PDF generator did not load. Refresh the EMS app and try again.",
    );
  }

  /*
   * Use the exact same PDF-generation architecture as the working
   * Applicant Practical Test Report.
   */
  const reportHtml = buildDesigneePracticalTestReportHtml();

  const frame = document.createElement("iframe");

  frame.setAttribute("aria-hidden", "true");

  frame.style.position = "fixed";

  frame.style.left = "-100000px";

  frame.style.top = "0";

  frame.style.width = "816px";

  frame.style.height = "1056px";

  frame.style.border = "0";

  frame.style.opacity = "0";

  frame.style.pointerEvents = "none";

  document.body.appendChild(frame);

  try {
    const frameDocument = frame.contentDocument;

    if (!frameDocument) {
      throw new Error(
        "The temporary Designee Report document could not be created.",
      );
    }

    frameDocument.open();
    frameDocument.write(reportHtml);
    frameDocument.close();

    await new Promise((resolve) => {
      const finish = () => window.setTimeout(resolve, 150);

      if (frame.contentWindow?.document?.readyState === "complete") {
        finish();
      } else {
        frame.addEventListener("load", finish, {
          once: true,
        });
      }
    });

    if (frameDocument.fonts?.ready) {
      await frameDocument.fonts.ready;
    }

    const images = Array.from(frameDocument.images || []);

    await Promise.all(
      images.map((image) => {
        if (image.complete) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          image.addEventListener("load", resolve, {
            once: true,
          });

          image.addEventListener("error", resolve, {
            once: true,
          });
        });
      }),
    );

    /*
     * Same as Applicant PDF generation: remove interactive browser
     * controls before the PDF is captured.
     */
    frameDocument.querySelector(".print-controls")?.remove();

    /*
     * IMPORTANT:
     * The EMT browser report is the approved visual source.
     *
     * Capture ONLY the actual report page, not the iframe body.
     * The body contains browser-only layout/controls that are not part
     * of the printable report and were corrupting the archived PDFs.
     */
    frameDocument.querySelector(".print-controls")?.remove();

    const reportPage = frameDocument.querySelector(".report-page");

    if (!reportPage) {
      throw new Error("The printable report page could not be found.");
    }

    /*
     * html2pdf uses screen CSS, so explicitly apply the layout that the
     * browser uses when printing the good EMT report.
     */
    const storedPdfStyle = frameDocument.createElement("style");

    storedPdfStyle.textContent = `
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 816px !important;
        min-width: 816px !important;
        max-width: 816px !important;
        background: #ffffff !important;
        overflow: visible !important;
      }

      .print-controls {
        display: none !important;
      }

      .report-page {
        display: block !important;
        position: static !important;
        float: none !important;

        width: 816px !important;
        min-width: 816px !important;
        max-width: 816px !important;

        min-height: 0 !important;

        margin: 0 !important;
        box-sizing: border-box !important;

        break-before: auto !important;
        page-break-before: auto !important;

        break-after: auto !important;
        page-break-after: auto !important;
      }

      table {
        max-width: 100% !important;
      }

      thead {
        display: table-header-group !important;
      }

      tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    `;

    frameDocument.head.appendChild(storedPdfStyle);

    /*
     * Force the browser to calculate the final printable dimensions
     * before html2canvas captures the page.
     */
    void reportPage.offsetHeight;

    const pdfBlob = await window
      .html2pdf()
      .set({
        margin: 0,

        filename: "Designee-Practical-Test-Report.pdf",

        image: {
          type: "jpeg",
          quality: 0.98,
        },

        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        },

        jsPDF: {
          unit: "in",
          format: "letter",
          orientation: "portrait",
        },

        pagebreak: {
          mode: ["css", "legacy"],
        },
      })
      .from(reportPage)
      .outputPdf("blob");

    if (!(pdfBlob instanceof Blob) || pdfBlob.size === 0) {
      throw new Error("The generated Designee Report PDF was empty.");
    }

    return pdfBlob;
  } finally {
    frame.remove();
  }
}

async function generateApplicantReportPdfBase64() {
  const pdfBlob = await generateApplicantReportPdfBlob();

  const bytes = new Uint8Array(await pdfBlob.arrayBuffer());

  let binary = "";

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return {
    pdfBase64: window.btoa(binary),
    reportHtml: buildPracticalTestReportHtml("applicant"),
  };
}

function generateCheckrideReport() {
  generatePracticalTestReport("designee");
}

function formatDateMMDDYYYY(dateStr) {
  if (!dateStr) return "";

  const parts = dateStr.split("-");

  if (parts.length !== 3) return dateStr;

  const [yyyy, mm, dd] = parts;
  return `${mm}/${dd}/${yyyy}`;
}

function escapeReport(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.updateApplicantDurationFromScenario = function (section, decimalHours) {
  if (!store) return;

  const value = decimalHours ? String(decimalHours) : "";

  if (section === "oral") {
    store.applicant.appGroundDuration = value;

    const input = document.getElementById("appGroundDuration");
    if (input) input.value = value;
  }

  if (section === "flight") {
    store.applicant.appFlightDuration = value;

    const input = document.getElementById("appFlightDuration");
    if (input) input.value = value;
  }

  saveToLocalStorage();
};

window.getFlightPortionAreas = function () {
  const areas = getCurrentAreas();

  return areas.filter((area) => String(area.roman || "").trim() !== "I");
};

window.getFlightPortionTasks = function () {
  return window.getFlightPortionAreas().flatMap((area) => area.tasks);
};

window.getFlightPortionAreas = function () {
  const areas = getCurrentAreas();

  return areas.filter((area) => String(area.roman || "").trim() !== "I");
};

window.renderFlightDetailedArea = function (container, area) {
  if (!container || !modules.renderDetailed) return;

  modules.renderDetailed(container, area, store, {
    onGradeChange: (taskCode, gradeType, value) =>
      modules.setGrade(taskCode, gradeType, value),

    onToggleTask: (taskCode) => modules.toggleTask(taskCode),

    onTaskCheck: (taskCode, checked) => handleTaskCheck(taskCode, checked),

    onExaminerNoteChange: (taskCode, note) =>
      handleExaminerNoteChange(taskCode, note),
  });

  applyAcsCodeHighlights();
};

function resolveScenarioGradeTarget(rawTaskCode) {
  const parts = rawTaskCode ? String(rawTaskCode).split(".") : [];

  const taskCode =
    parts.length >= 3 ? parts.slice(0, 3).join(".") : rawTaskCode || "";

  const gradeType =
    parts.length >= 4 ? String(parts[3]).charAt(0).toUpperCase() : "";

  const tasks = getCurrentTasks(getCurrentAreas());

  const matchingTask = tasks.find(
    (task) =>
      task.code === taskCode ||
      task.filterCode === taskCode ||
      task.code === rawTaskCode ||
      task.filterCode === rawTaskCode,
  );

  return {
    matchingTask,
    filterCode: matchingTask?.filterCode || "",
    gradeType,
  };
}

function updateVisibleRadioGroup(radio, selectedValue) {
  const group = radio.closest(".grade-radio-group");

  if (!group) return;

  group.querySelectorAll('input[type="radio"]').forEach((input) => {
    const selected = String(input.value) === String(selectedValue);

    input.checked = selected;

    input
      .closest(".grade-radio-option")
      ?.classList.toggle("selected", selected);
  });
}

function getOralQuestionGrade(rawTaskCode) {
  if (!rawTaskCode || !store) {
    return "NP";
  }

  return store.oralQuestionGrades?.[rawTaskCode] || "NP";
}

function getOralGradesForParent(filterCode, gradeType) {
  if (!filterCode || !gradeType || !store?.oralQuestionGrades) {
    return [];
  }

  return Object.entries(store.oralQuestionGrades)
    .map(([rawTaskCode, value]) => {
      const resolved = resolveScenarioGradeTarget(rawTaskCode);

      return {
        filterCode: resolved.filterCode,
        gradeType: resolved.gradeType,
        value: String(value || "NP"),
      };
    })
    .filter(
      (item) => item.filterCode === filterCode && item.gradeType === gradeType,
    )
    .map((item) => item.value);
}

function calculateRoundedOralAverage(filterCode, gradeType) {
  const numericGrades = getOralGradesForParent(filterCode, gradeType)
    .filter((value) => ["1", "2", "3", "4"].includes(value))
    .map(Number);

  if (!numericGrades.length) {
    return "NP";
  }

  const total = numericGrades.reduce((sum, value) => sum + value, 0);

  const average = total / numericGrades.length;

  /*
   * Math.round uses conventional rounding:
   * 2.49 -> 2
   * 2.50 -> 3
   */
  const rounded = Math.round(average);

  return String(Math.max(1, Math.min(4, rounded)));
}

function applyOralAverageToDetailed(filterCode, gradeType) {
  if (!filterCode || !gradeType || !store) {
    return;
  }

  const roundedGrade = calculateRoundedOralAverage(filterCode, gradeType);

  store.grades[`${filterCode}.${gradeType}`] = roundedGrade;

  const hasNumericTaskGrade = ["K", "R", "S"].some((type) =>
    ["1", "2", "3", "4"].includes(
      String(store.grades[`${filterCode}.${type}`] || "NP"),
    ),
  );

  store.checkedElements[filterCode] = hasNumericTaskGrade;
}

window.getOralQuestionGrade = getOralQuestionGrade;

function recalculateAllOralAverages() {
  if (!store?.oralQuestionGrades) {
    return;
  }

  const parentKeys = new Set();

  Object.keys(store.oralQuestionGrades).forEach((rawTaskCode) => {
    const { filterCode, gradeType } = resolveScenarioGradeTarget(rawTaskCode);

    if (filterCode && gradeType) {
      parentKeys.add(`${filterCode}::${gradeType}`);
    }
  });

  parentKeys.forEach((parentKey) => {
    const [filterCode, gradeType] = parentKey.split("::");

    applyOralAverageToDetailed(filterCode, gradeType);
  });
}

function syncScenarioGradesFromStore() {
  if (!store?.grades) return;

  /*
   * ORAL QUESTION RADIOS
   *
   * Each oral question displays its own independent grade. The parent
   * Detailed View grade is calculated separately from the average.
   */
  document
    .querySelectorAll(
      '.scenario-question-grade-radios input[type="radio"][data-task-code]',
    )
    .forEach((radio) => {
      const rawTaskCode = radio.dataset.taskCode || "";

      const storedGrade = getOralQuestionGrade(rawTaskCode);

      updateVisibleRadioGroup(radio, storedGrade);
    });

  /*
   * FLIGHT TASK K/R/S CONTROLS
   *
   * These controls use the task filter code directly.
   */
  document
    .querySelectorAll("#viewScenario select[data-grade][data-task-code]")
    .forEach((select) => {
      const taskCode = select.dataset.taskCode;

      const gradeType = select.dataset.grade;

      if (!taskCode || !gradeType) {
        return;
      }

      const storedGrade = store.grades[`${taskCode}.${gradeType}`] || "NP";

      select.value = storedGrade;

      syncGradeRadioGroup(select);
    });

  /*
   * Support Flight Portion radio inputs that may be rendered directly
   * rather than through a hidden select.
   */
  document
    .querySelectorAll(
      '#viewScenario input[type="radio"][data-grade][data-task-code]',
    )
    .forEach((radio) => {
      const taskCode = radio.dataset.taskCode;

      const gradeType = radio.dataset.grade;

      if (!taskCode || !gradeType) {
        return;
      }

      const storedGrade = store.grades[`${taskCode}.${gradeType}`] || "NP";

      updateVisibleRadioGroup(radio, storedGrade);
    });

  /*
   * Keep Flight Portion task checkboxes aligned with the shared task
   * state. A task is also considered selected when it has any numeric
   * K, R, or S grade.
   */
  document
    .querySelectorAll("#viewScenario [data-task-check]")
    .forEach((checkbox) => {
      const taskCode = checkbox.dataset.taskCheck;

      if (!taskCode) return;

      const hasNumericGrade = ["K", "R", "S"].some((type) =>
        ["1", "2", "3", "4"].includes(
          String(store.grades[`${taskCode}.${type}`] || "NP"),
        ),
      );

      checkbox.checked = Boolean(
        store.checkedElements?.[taskCode] || hasNumericGrade,
      );
    });
}

window.setDetailedGradeFromFlight = function (taskCode, gradeType, value) {
  if (!taskCode || !gradeType || !store) {
    return;
  }

  const normalizedValue = value || "NP";

  store.grades[`${taskCode}.${gradeType}`] = normalizedValue;

  const hasNumericGrade = ["K", "R", "S"].some((type) =>
    ["1", "2", "3", "4"].includes(
      String(store.grades[`${taskCode}.${type}`] || "NP"),
    ),
  );

  store.checkedElements[taskCode] = hasNumericGrade;

  modules.notify();
  saveToLocalStorage();

  window.requestAnimationFrame(() => {
    syncScenarioGradesFromStore();
  });
};

window.setDetailedTaskCheckFromFlight = function (taskCode, checked) {
  if (!taskCode || !store) return;

  store.checkedElements[taskCode] = checked;

  ensureGradeReasonStores();

  const gradeKey = `${taskCode}.S`;

  if (checked) {
    store.grades[gradeKey] = "3";
  } else {
    store.grades[gradeKey] = "NP";
  }

  delete store.gradeReasons[gradeKey];

  modules.notify();
  saveToLocalStorage();
};

window.setDetailedExaminerNoteFromFlight = function (taskCode, note) {
  if (!taskCode || !store) return;

  handleExaminerNoteChange(taskCode, note);
  saveToLocalStorage();
};

window.setScenarioGradeFromOral = function (input) {
  const rawTaskCode = input?.dataset?.taskCode || "";

  const grade = input?.value || "NP";

  const { matchingTask, filterCode, gradeType } =
    resolveScenarioGradeTarget(rawTaskCode);

  if (!matchingTask || !filterCode || !gradeType || !store) {
    return;
  }

  store.oralQuestionGrades ??= {};

  /*
   * Save this question independently. Do not overwrite other questions
   * associated with the same parent task.
   */
  store.oralQuestionGrades[rawTaskCode] = grade;

  ensureGradeReasonStores();

  if (!gradeRequiresReason(grade)) {
    delete store.oralGradeReasons[rawTaskCode];
  }

  /*
   * Recalculate only the matching parent task and K/R/S grade.
   */
  applyOralAverageToDetailed(filterCode, gradeType);

  modules.notify();
  saveToLocalStorage();

  window.requestAnimationFrame(() => {
    syncScenarioGradesFromStore();
  });
};

window.storeGeneratedScenario = function (payload) {
  if (!store) return;

  store.generatedScenario = payload;
};

window.getStoredGeneratedScenario = function () {
  return store?.generatedScenario || null;
};

window.getScenarioGradeFromDetailedView = function (rawTaskCode) {
  const parts = rawTaskCode ? rawTaskCode.split(".") : [];

  const taskCode =
    parts.length >= 3 ? parts.slice(0, 3).join(".") : rawTaskCode || "";

  const gradeType = parts.length >= 4 ? parts[3].charAt(0).toUpperCase() : "";

  if (!taskCode || !gradeType || !store) return "";

  const areas = getCurrentAreas();
  const tasks = getCurrentTasks(areas);

  const matchingTask = tasks.find(
    (task) => task.code === taskCode || task.filterCode === taskCode,
  );

  if (!matchingTask) return "";

  return store.grades?.[`${matchingTask.filterCode}.${gradeType}`] || "";
};
