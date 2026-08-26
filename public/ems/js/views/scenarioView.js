const SCENARIO_DATABASE_PATHS = {
  private: 'data/scenario-engine/private-pilot.json',
  instrument: 'data/scenario-engine/instrument-airplane.json',
  commercial: 'data/scenario-engine/commercial-airplane.json',
  cfi: 'data/scenario-engine/cfi-mei.json',
  atp: 'data/scenario-engine/atp-airplane.json'
};

let loadedScenarioDatabases = {};

const SCENARIO_TIME_KEY = 'acs_ems_scenario_times_v1';
const FLIGHT_TASK_ORDER_KEY = 'acs_ems_flight_task_order_v1';

let examinerScenarioCatalog = {
  offerings: [],
  plans: []
};

export function renderScenarioEngine(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="scenario-engine">
      <h2>Oral / Flight Portion</h2>
      <p>
        Generate a chronological oral exam from one of your uploaded Plans of Action. The Flight Portion uses the Detailed View task layout, excludes AOA I, and records Skill grades only.
      </p>

      <div class="scenario-controls">
        <label>
          Practical Test
          <select id="scenarioPracticalTest">
            <option value="">
              Loading offered practical tests...
            </option>
          </select>
        </label>

        <label>
          <span id="scenarioCountLabel">
            Scenario (0)
          </span>
          <select id="scenarioPlan">
            <option value="">
              Loading scenarios...
            </option>
          </select>
        </label>

        <button class="btn" id="generateScenarioBtn">
          Generate Oral / Flight Plan
        </button>
      </div>

      <div
        id="scenarioControlMessage"
        style="
          margin-top:8px;
          color:#64748b;
          font-size:.9rem;
        "
      ></div>

      <div id="scenarioOutput" class="scenario-output"></div>
    </div>
  `;

  document
    .getElementById('generateScenarioBtn')
    ?.addEventListener(
      'click',
      generateScenario
    );

  document
    .getElementById('scenarioPracticalTest')
    ?.addEventListener(
      'change',
      updateDatabaseScenarioOptions
    );

  const savedScenario =
    window.getStoredGeneratedScenario?.();

  if (
    savedScenario?.scenario &&
    savedScenario?.generatedSegments
  ) {
    const output =
      document.getElementById('scenarioOutput');

    renderGeneratedScenario(
      output,
      savedScenario.scenario,
      savedScenario.generatedSegments
    );
  }

  void initializeDatabaseScenarioControls();
}

async function initializeDatabaseScenarioControls() {
  const practicalTestSelect =
    document.getElementById(
      'scenarioPracticalTest'
    );

  const scenarioSelect =
    document.getElementById(
      'scenarioPlan'
    );

  const message =
    document.getElementById(
      'scenarioControlMessage'
    );

  if (!practicalTestSelect || !scenarioSelect) {
    return;
  }

  try {
    const service = await import(
      '../services/supabaseService.js'
    );

    const [offerings, plans] =
      await Promise.all([
        service.loadEmtPracticalTestOfferings(),
        service.loadEmtReadyPlanOfActions()
      ]);

    examinerScenarioCatalog = {
      offerings:
        Array.isArray(offerings)
          ? offerings
          : [],
      plans:
        Array.isArray(plans)
          ? plans
          : []
    };

    if (!examinerScenarioCatalog.offerings.length) {
      practicalTestSelect.innerHTML = `
        <option value="">
          No practical tests are offered
        </option>
      `;

      scenarioSelect.innerHTML = `
        <option value="">
          No scenarios available
        </option>
      `;

      setScenarioCount(0);

      if (message) {
        message.textContent =
          'Select practical tests under Examiner Settings → Practical Tests Offered.';
      }

      return;
    }

    practicalTestSelect.innerHTML =
      examinerScenarioCatalog.offerings
        .map(test => `
          <option
            value="${escapeHtml(test.id)}"
          >
            ${escapeHtml(
              test.display_name ||
              buildPracticalTestLabel(test)
            )}
          </option>
        `)
        .join('');

    const savedScenario =
      window.getStoredGeneratedScenario?.()
        ?.scenario;

    const savedTestId =
      savedScenario?.Practical_Test_Type_ID ||
      '';

    const preferredTestId =
      examinerScenarioCatalog.offerings
        .some(test =>
          String(test.id) ===
          String(savedTestId)
        )
        ? savedTestId
        : findBestMatchingPracticalTestId(
            examinerScenarioCatalog.offerings
          );

    if (preferredTestId) {
      practicalTestSelect.value =
        preferredTestId;
    }

    updateDatabaseScenarioOptions();

    if (message) {
      message.textContent = '';
    }
  } catch (error) {
    console.error(
      'Unable to load examiner POA scenarios:',
      error
    );

    practicalTestSelect.innerHTML = `
      <option value="">
        Unable to load practical tests
      </option>
    `;

    scenarioSelect.innerHTML = `
      <option value="">
        Unable to load scenarios
      </option>
    `;

    setScenarioCount(0);

    if (message) {
      message.textContent =
        error instanceof Error
          ? error.message
          : 'Unable to load Plan of Action scenarios.';
    }
  }
}

function updateDatabaseScenarioOptions() {
  const practicalTestSelect =
    document.getElementById(
      'scenarioPracticalTest'
    );

  const scenarioSelect =
    document.getElementById(
      'scenarioPlan'
    );

  if (!practicalTestSelect || !scenarioSelect) {
    return;
  }

  const testId =
    practicalTestSelect.value;

  const plans =
    examinerScenarioCatalog.plans
      .filter(plan =>
        String(
          plan.practical_test_type_id
        ) === String(testId)
      );

  setScenarioCount(plans.length);

  if (!plans.length) {
    scenarioSelect.innerHTML = `
      <option value="">
        No Scenario Ready POAs
      </option>
    `;

    scenarioSelect.disabled = true;
    return;
  }

  scenarioSelect.disabled = false;

  scenarioSelect.innerHTML =
    plans
      .map((plan, index) => `
        <option
          value="${escapeHtml(plan.id)}"
        >
          ${escapeHtml(
            plan.scenario_name ||
            plan.title ||
            `Scenario ${index + 1}`
          )}
        </option>
      `)
      .join('');

  const savedPlanId =
    window.getStoredGeneratedScenario?.()
      ?.scenario
      ?.Plan_Of_Action_ID;

  if (
    savedPlanId &&
    plans.some(plan =>
      String(plan.id) ===
      String(savedPlanId)
    )
  ) {
    scenarioSelect.value =
      savedPlanId;
  }
}

function setScenarioCount(count) {
  const label =
    document.getElementById(
      'scenarioCountLabel'
    );

  if (label) {
    label.textContent =
      `Scenario (${Number(count) || 0})`;
  }
}

function buildPracticalTestLabel(test) {
  return [
    test?.certificate_name,
    test?.issuance_name,
    test?.rating_name ||
      test?.class_name
  ]
    .filter(Boolean)
    .join(' — ');
}

function normalizeScenarioCertificate(value) {
  const text = String(value || '')
    .trim()
    .toLowerCase();

  if (
    text.includes('private')
  ) {
    return 'private';
  }

  if (
    text.includes('commercial')
  ) {
    return 'commercial';
  }

  if (
    text.includes('airline transport') ||
    text === 'atp'
  ) {
    return 'atp';
  }

  if (
    text.includes('flight instructor') ||
    text === 'cfi'
  ) {
    return 'cfi';
  }

  if (
    text.includes('instrument')
  ) {
    return 'instrument';
  }

  return text;
}

function normalizeScenarioRating(value) {
  const text = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, ' ');

  if (
    text.includes(
      'airplane single engine land'
    ) ||
    text.includes(
      'single engine land'
    ) ||
    text === 'asel'
  ) {
    return 'asel';
  }

  if (
    text.includes(
      'airplane multiengine land'
    ) ||
    text.includes(
      'airplane multi engine land'
    ) ||
    text.includes(
      'multiengine land'
    ) ||
    text.includes(
      'multi engine land'
    ) ||
    text === 'amel'
  ) {
    return 'amel';
  }

  if (
    text.includes(
      'airplane single engine sea'
    ) ||
    text.includes(
      'single engine sea'
    ) ||
    text === 'ases'
  ) {
    return 'ases';
  }

  if (
    text.includes(
      'airplane multiengine sea'
    ) ||
    text.includes(
      'airplane multi engine sea'
    ) ||
    text.includes(
      'multiengine sea'
    ) ||
    text.includes(
      'multi engine sea'
    ) ||
    text === 'ames'
  ) {
    return 'ames';
  }

  if (
    text.includes('instrument airplane')
  ) {
    return 'instrument airplane';
  }

  if (
    text.includes('cfii')
  ) {
    return 'cfii';
  }

  if (
    text.includes('mei')
  ) {
    return 'mei';
  }

  return text;
}

function normalizeScenarioIssuance(value) {
  const text = String(value || '')
    .trim()
    .toLowerCase();

  if (
    text.includes('additional')
  ) {
    return 'additional';
  }

  if (
    text.includes('original') ||
    text.includes('initial')
  ) {
    return 'original';
  }

  if (
    text.includes('renewal')
  ) {
    return 'renewal';
  }

  if (
    text.includes('reinstatement')
  ) {
    return 'reinstatement';
  }

  return text;
}

function getCurrentScenarioTestContext() {
  const certificate =
    document.getElementById(
      'appCertificate'
    )?.value || '';

  const rating =
    document.getElementById(
      'appRating'
    )?.value || '';

  const examType =
    document.getElementById(
      'appExamType'
    )?.value || '';

  return {
    certificate:
      normalizeScenarioCertificate(
        certificate
      ),
    rating:
      normalizeScenarioRating(
        rating
      ),
    issuance:
      normalizeScenarioIssuance(
        examType
      )
  };
}

function findBestMatchingPracticalTestId(
  offerings
) {
  const context =
    getCurrentScenarioTestContext();

  let best = null;
  let bestScore = -1;

  for (const test of offerings || []) {
    let score = 0;

    const certificate =
      normalizeScenarioCertificate(
        test.certificate_name
      );

    const ratingCandidates = [
      test.rating_name,
      test.class_name,
      test.category_name,
      test.display_name
    ]
      .filter(Boolean)
      .map(normalizeScenarioRating);

    const issuance =
      normalizeScenarioIssuance(
        test.issuance_name
      );

    if (
      context.certificate &&
      certificate === context.certificate
    ) {
      score += 10;
    }

    if (
      context.rating &&
      ratingCandidates.includes(
        context.rating
      )
    ) {
      score += 12;
    }

    if (
      context.issuance &&
      issuance === context.issuance
    ) {
      score += 4;
    }

    if (score > bestScore) {
      best = test;
      bestScore = score;
    }
  }

  if (bestScore <= 0) {
    return offerings?.[0]?.id || '';
  }

  return best?.id || '';
}

function adaptDatabasePlanToScenario(plan) {
  const data =
    plan?.scenario_data &&
    typeof plan.scenario_data === 'object'
      ? plan.scenario_data
      : {};

  const oralSections =
    Array.isArray(data.oral_sections)
      ? [...data.oral_sections].sort(
          (a, b) =>
            Number(a?.sequence || 999) -
            Number(b?.sequence || 999)
        )
      : [];

  const flightTasks =
    Array.isArray(data.flight_tasks)
      ? [...data.flight_tasks].sort(
          (a, b) =>
            Number(a?.sequence || 999) -
            Number(b?.sequence || 999)
        )
      : [];

  const scenario = {
    Scenario_ID:
      `DB-POA-${plan.id}`,

    Scenario_Name:
      data.scenario_name ||
      plan.scenario_name ||
      plan.title ||
      'Plan of Action',

    Scenario_Brief:
      data.scenario_brief || '',

    Source_Revision:
      data.source_revision || '',

    Practical_Test_Type_ID:
      plan.practical_test_type_id,

    Plan_Of_Action_ID:
      plan.id,

    Database_POA:
      true,

    Flight_Task_Order:
      flightTasks
        .map(task =>
          String(
            task?.task_code || ''
          ).trim()
        )
        .filter(Boolean)
  };

  const generatedSegments =
    oralSections.map(
      (section, sectionIndex) => {
        const questions =
          Array.isArray(section?.questions)
            ? [...section.questions].sort(
                (a, b) =>
                  Number(
                    a?.sequence || 999
                  ) -
                  Number(
                    b?.sequence || 999
                  )
              )
            : [];

        return {
          phase: {
            Phase_ID:
              `DB-PHASE-${sectionIndex + 1}`,
            Phase_Name:
              section?.heading ||
              `Oral Section ${sectionIndex + 1}`
          },

          flows: [
            {
              flow: {
                Flow_Type:
                  'Question_Block',
                Title: '',
                Narrative:
                  section?.narrative || ''
              },

              items: questions.map(
                (question, questionIndex) => {
                  const answerParts = [];

                  const answerNotes =
                    String(
                      question?.answer_notes ||
                      ''
                    ).trim();

                  const references =
                    String(
                      question?.references ||
                      ''
                    ).trim();

                  if (answerNotes) {
                    answerParts.push(
                      answerNotes
                    );
                  }

                  if (references) {
                    answerParts.push(
                      `Reference: ${references}`
                    );
                  }

                  return {
                    Question_ID:
                      `DB-${plan.id}-${sectionIndex + 1}-${questionIndex + 1}`,

                    Question:
                      question?.question || '',

                    Answer:
                      answerParts.join(
                        ' — '
                      ),

                    ACS_Code:
                      question?.acs_code || '',

                    Applicable_Rating:
                      'ALL'
                  };
                }
              )
            }
          ]
        };
      }
    );

  return {
    scenario,
    generatedSegments
  };
}

async function loadScenarioDatabase(type) {
  if (loadedScenarioDatabases[type]) {
    return loadedScenarioDatabases[type];
  }

  const fallbackPaths = {
    private: '/data/scenario-engine/private-pilot.json',
    instrument: '/data/scenario-engine/instrument-airplane.json',
    commercial: '/data/scenario-engine/commercial-airplane.json',
    cfi: '/data/scenario-engine/cfi-mei.json',
    atp: '/data/scenario-engine/atp-airplane.json'
  };

  const normalizedType = String(type || '').trim().toLowerCase();

  const databasePath =
    SCENARIO_DATABASE_PATHS?.[normalizedType] ||
    fallbackPaths[normalizedType];

  if (!databasePath) {
    throw new Error(
      `No scenario database is configured for certificate type: ${normalizedType || '(blank)'}`
    );
  }

  const response = await fetch(databasePath);

  if (!response.ok) {
    throw new Error(
      `Unable to load scenario database: ${databasePath} (HTTP ${response.status})`
    );
  }

  const data = await response.json();

  loadedScenarioDatabases[normalizedType] = data;

  return data;
}

async function generateScenario() {
  const practicalTestId =
    document.getElementById(
      'scenarioPracticalTest'
    )?.value || '';

  const planId =
    document.getElementById(
      'scenarioPlan'
    )?.value || '';

  const output =
    document.getElementById(
      'scenarioOutput'
    );

  if (!output) return;

  if (!practicalTestId) {
    output.innerHTML = `
      <div class="scenario-card">
        <h4>No Practical Test Selected</h4>
        <p>
          Select one of your offered practical tests.
        </p>
      </div>
    `;
    return;
  }

  if (!planId) {
    output.innerHTML = `
      <div class="scenario-card">
        <h4>No Scenario Available</h4>
        <p>
          Upload and parse a Plan of Action for this practical test in the Examiner Portal.
        </p>
      </div>
    `;
    return;
  }

  output.innerHTML =
    `<p>Loading Plan of Action scenario...</p>`;

  try {
    const plan =
      examinerScenarioCatalog.plans.find(
        item =>
          String(item.id) ===
          String(planId) &&
          String(
            item.practical_test_type_id
          ) ===
          String(practicalTestId)
      );

    if (!plan) {
      throw new Error(
        'The selected Plan of Action scenario could not be found.'
      );
    }

    const {
      scenario,
      generatedSegments
    } =
      adaptDatabasePlanToScenario(
        plan
      );

    window.storeGeneratedScenario?.({
      scenario,
      generatedSegments
    });

    renderGeneratedScenario(
      output,
      scenario,
      generatedSegments
    );
  } catch (error) {
    console.error(error);

    output.innerHTML = `
      <div class="scenario-card">
        <h4>Scenario Load Error</h4>
        <p>
          ${escapeHtml(
            error instanceof Error
              ? error.message
              : 'Unable to load the selected scenario.'
          )}
        </p>
      </div>
    `;
  }
}

function buildGeneratedScenario(db, scenario, rating) {
  const scenarioId = scenario.Scenario_ID;

  const phases = (db.Phase_Of_Flight_Master || [])
    .filter(p => p.Active !== 'No')
    .sort((a, b) =>
      Number(a.Phase_Order || 999) -
      Number(b.Phase_Order || 999)
    );

  const flowItems = (db.Scenario_Flow_Master || [])
    .filter(f =>
      f.Scenario_ID === scenarioId &&
      f.Active !== 'No'
    )
    .sort((a, b) =>
      Number(a.Flow_Order || 999) -
      Number(b.Flow_Order || 999)
    );

  return phases.map(phase => {
    const phaseFlows = flowItems
      .filter(f => f.Phase_ID === phase.Phase_ID)
      .map(flow => {
        const items = getItemsForFlow(
          db,
          flow,
          rating
        );

        return {
          flow,
          items
        };
      });

    return {
      phase,
      flows: phaseFlows
    };
  });
}

function getItemsForFlow(db, flow, rating) {
  const banks = [
    db.Question_Bank,
    db.POA_Question_Bank,
    db.Teaching_Exercise_Bank,
    db.Instructor_Decision_Bank,
    db.Endorsement_Scenario_Bank,
    db.MEI_Exercise_Bank
  ].filter(Boolean);

  const items = banks
    .flat()
    .filter(item => isApplicable(item, rating));

  const questionIds = Array.isArray(flow?.Question_IDs)
    ? flow.Question_IDs
    : [];

  if (questionIds.length) {
    const wanted = new Set(questionIds.map(String));

    return items.filter(item =>
      wanted.has(String(item.Question_ID || ''))
    );
  }

  const trigger = String(
    flow?.Scenario_Trigger || ''
  ).trim();

  if (trigger) {
    return items.filter(item =>
      String(item.Scenario_Trigger || '').trim() === trigger
    );
  }

  const segmentId = flow?.Segment_ID;

  if (!segmentId) {
    return [];
  }

  return items.filter(item =>
    item.Segment_ID === segmentId ||
    item.Primary_Segment_ID === segmentId
  );
}

function renderGeneratedScenario(output, scenario, generatedSegments) {
  const times = getSavedScenarioTimes();

  const oralHtml = (generatedSegments || [])
    .map(phaseGroup => {
      const phaseName =
        phaseGroup.phase?.Phase_Name ||
        'Unassigned Phase';

        const seenPhaseQuestions = new Set();

      const flowHtml = (phaseGroup.flows || [])
        .map(flowGroup => {
          const flow = flowGroup.flow || {};
          const flowType = flow.Flow_Type || 'Question_Block';
          const title = flow.Title || '';
          const narrative = flow.Narrative || '';

          const items = dedupeItemsForPhase(
            flowGroup.items || [],
            seenPhaseQuestions
          );

          const questionsHtml = items
            .map(item =>
              renderGradedItem({
                number: '',
                title: getItemPrompt(item),
                answer: getItemAnswer(item),
                code: getItemTaskCode(item)
              })
            )
            .join('');

          if (flowType === 'Narrative') {
            return `
              <div style="
                margin:14px 0;
                padding:12px;
                background:#f8fafc;
                border:1px solid #d0d7de;
                border-radius:8px;
              ">
                ${title ? `<strong>${escapeHtml(title)}</strong>` : ''}
                <p>${escapeHtml(narrative)}</p>
              </div>
            `;
          }

          if (flowType === 'Trigger') {
            return `
              <div style="
                margin:14px 0;
                padding:12px;
                border-left:4px solid #f59e0b;
                background:#fffbeb;
                border-radius:8px;
              ">
                <strong>${escapeHtml(title || 'Trigger Event')}</strong>
                ${narrative ? `<p>${escapeHtml(narrative)}</p>` : ''}
              </div>

              ${questionsHtml}
            `;
          }

          return `
            ${title ? `<h4 style="margin-top:14px;">${escapeHtml(title)}</h4>` : ''}
            ${narrative ? `<p>${escapeHtml(narrative)}</p>` : ''}
            ${questionsHtml}
          `;
        })
        .join('');

      const phaseBodyHtml = flowHtml || `
        <p style="
          margin:8px 0 16px 0;
          color:#64748b;
          font-style:italic;
        ">
          No flow items assigned for this phase.
        </p>
      `;

      return `
        <h3 style="
          margin-top:24px;
          border-bottom:1px solid #d0d7de;
          padding-bottom:4px;
        ">
          ${escapeHtml(phaseName)}
        </h3>

        ${phaseBodyHtml}
      `;
    })
    .join('');

  output.innerHTML = `
    <details class="scenario-card">
      <summary style="
        cursor:pointer;
        font-size:1.35rem;
        font-weight:700;
        padding:8px 0;
        border-bottom:2px solid #d0d7de;
        margin-bottom:14px;
      ">
        Oral Portion
      </summary>

      ${renderTimeRow('oral', times)}

      <h3>Scenario Brief</h3>

      <h4>
        ${escapeHtml(scenario.Scenario_Name || scenario.Name || 'Generated Scenario')}
      </h4>

      <p>
        ${escapeHtml(scenario.Description || scenario.Scenario_Description || '')}
      </p>

      <h3 style="margin-top:22px;">Oral Exam Questions</h3>

      ${oralHtml}
    </details>

    <details class="scenario-card">
      <summary style="
        cursor:pointer;
        font-size:1.35rem;
        font-weight:700;
        padding:8px 0;
        border-bottom:2px solid #d0d7de;
        margin-bottom:14px;
      ">
        Flight Portion
      </summary>

      ${renderTimeRow('flight', times)}

      <div id="flightDetailedContainer"></div>
    </details>
  `;

  wireTimeFields();
  renderFlightPortionDetailed();
}

function renderTimeRow(section, times) {
  const startKey = `${section}Start`;
  const endKey = `${section}End`;

  const duration = calculateDecimalDuration(
    times[startKey],
    times[endKey]
  );

  return `
    <div style="
      display:grid;
      grid-template-columns:repeat(3, minmax(140px, 1fr));
      gap:12px;
      margin:12px 0 20px 0;
      padding:12px;
      border:1px solid #d0d7de;
      border-radius:10px;
      background:#f8fafc;
    ">
      <label>
        Start Time

        <div style="display:flex; gap:6px;">
          <input
            type="time"
            data-scenario-time="${startKey}"
            value="${escapeHtml(times[startKey] || '')}"
            style="width:100%;"
          >

          <button
            type="button"
            data-now-button="${startKey}"
            style="
              padding:6px 10px;
              white-space:nowrap;
              background:#16a34a;
              color:white;
              border:none;
              border-radius:6px;
              font-weight:600;
              cursor:pointer;
            "
          >
            Now
          </button>
        </div>
      </label>

      <label>
        End Time

        <div style="display:flex; gap:6px;">
          <input
            type="time"
            data-scenario-time="${endKey}"
            value="${escapeHtml(times[endKey] || '')}"
            style="width:100%;"
          >

          <button
            type="button"
            data-now-button="${endKey}"
            style="
              padding:6px 10px;
              white-space:nowrap;
              background:#16a34a;
              color:white;
              border:none;
              border-radius:6px;
              font-weight:600;
              cursor:pointer;
            "
          >
            Now
          </button>
        </div>
      </label>

      <label>
        Duration

        <input
          type="text"
          data-scenario-duration="${section}"
          value="${duration ? `${escapeHtml(duration)} hrs` : ''}"
          readonly
          style="width:100%;"
        >
      </label>
    </div>
  `;
}

function renderGradedItem({ number, title, answer, code }) {
  const selected =
    window.getOralQuestionGrade?.(code) || 'NP';

  return `
    <details class="scenario-question">
      <summary style="
        display:flex;
        align-items:center;
        gap:8px;
        cursor:pointer;
      ">
        ${number ? `
          <span style="font-weight:700; min-width:28px;">
            ${number}.
          </span>
        ` : ''}

        <span
          class="scenario-question-grade-radios grade-radio-group"
          role="radiogroup"
          aria-label="Grade for ${escapeHtml(title)}"
          onclick="event.stopPropagation();"
        >
          ${['1', '2', '3', '4', 'NP']
            .map(value => {
              const normalizedSelected =
                selected || 'NP';

              const checked =
                normalizedSelected === value;

              const safeName = String(code || 'oral-question')
                .replace(/[^a-zA-Z0-9_-]/g, '_');

              return `
                <label class="grade-radio-option${checked ? ' selected' : ''}">
                  <input
                    type="radio"
                    name="oral-grade-${safeName}"
                    value="${value}"
                    data-task-code="${escapeHtml(code)}"
                    ${checked ? 'checked' : ''}
                    onchange="
                      this.closest('.grade-radio-group')
                        ?.querySelectorAll('.grade-radio-option')
                        .forEach(option =>
                          option.classList.remove('selected')
                        );
                      this.closest('.grade-radio-option')
                        ?.classList.add('selected');
                      window.setScenarioGradeFromOral?.(this);
                    "
                  >
                  <span>${value}</span>
                </label>
              `;
            })
            .join('')}
        </span>

        <span>${escapeHtml(title)}</span>
      </summary>

      <div class="scenario-answer">
        <em>${escapeHtml(answer)}</em>
      </div>
    </details>
  `;
}

function wireTimeFields() {
  document.querySelectorAll('[data-scenario-time]').forEach(input => {
    input.addEventListener('input', () => {
      const times = getSavedScenarioTimes();

      times[input.dataset.scenarioTime] = input.value;

      saveScenarioTimes(times);
      refreshDurations(times);
    });
  });

  document.querySelectorAll('[data-now-button]').forEach(button => {
    button.addEventListener('click', () => {
      const fieldKey = button.dataset.nowButton;

      const input = document.querySelector(
        `[data-scenario-time="${fieldKey}"]`
      );

      if (!input) return;

      const now = new Date();

      const currentTime =
        `${String(now.getHours()).padStart(2, '0')}:` +
        `${String(now.getMinutes()).padStart(2, '0')}`;

      input.value = currentTime;

      const times = getSavedScenarioTimes();

      times[fieldKey] = currentTime;

      saveScenarioTimes(times);
      refreshDurations(times);
    });
  });
}

function refreshDurations(times) {
  const oralDuration =
    document.querySelector('[data-scenario-duration="oral"]');

  const flightDuration =
    document.querySelector('[data-scenario-duration="flight"]');

  const oralDecimal =
    calculateDecimalDuration(times.oralStart, times.oralEnd);

  const flightDecimal =
    calculateDecimalDuration(times.flightStart, times.flightEnd);

  if (oralDuration) {
    oralDuration.value = oralDecimal ? `${oralDecimal} hrs` : '';
  }

  if (flightDuration) {
    flightDuration.value = flightDecimal ? `${flightDecimal} hrs` : '';
  }

  window.updateApplicantDurationFromScenario?.('oral', oralDecimal);
  window.updateApplicantDurationFromScenario?.('flight', flightDecimal);
}

function normalizeFlightCodeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/\.$/, '')
    .toUpperCase();
}

function expandScenarioFlightCode(rawCode) {
  const code =
    normalizeFlightCodeText(
      rawCode
    );

  if (!code) {
    return [];
  }

  const results = [code];

  const combinedMatch =
    code.match(
      /^([A-Z]+)\.([IVX]+)\.([A-Z])\/([A-Z])$/
    );

  if (combinedMatch) {
    results.push(
      `${combinedMatch[1]}.${combinedMatch[2]}.${combinedMatch[3]}`,
      `${combinedMatch[1]}.${combinedMatch[2]}.${combinedMatch[4]}`
    );
  }

  const parentMatch =
    code.match(
      /^([A-Z]+)\.([IVX]+)\.([A-Z])(?:\.|$)/
    );

  if (parentMatch) {
    results.push(
      `${parentMatch[1]}.${parentMatch[2]}.${parentMatch[3]}`
    );
  }

  return [
    ...new Set(results)
  ];
}

function resolveScenarioFlightTasks(
  scenarioOrder,
  allTasks
) {
  const tasksByCode = new Map(
    (allTasks || []).map(task => [
      normalizeFlightCodeText(
        task.filterCode
      ),
      task
    ])
  );

  const resolved = [];
  const seen = new Set();

  for (
    const rawCode of scenarioOrder || []
  ) {
    const candidates =
      expandScenarioFlightCode(
        rawCode
      );

    for (const candidate of candidates) {
      const task =
        tasksByCode.get(candidate);

      if (!task) {
        continue;
      }

      const filterCode =
        String(task.filterCode);

      if (seen.has(filterCode)) {
        continue;
      }

      seen.add(filterCode);
      resolved.push(task);

      if (
        !candidate.includes('/')
      ) {
        break;
      }
    }
  }

  return resolved;
}

function renderFlightPortionDetailed() {
  const container = document.getElementById('flightDetailedContainer');
  if (!container) return;

  const areas = window.getFlightPortionAreas?.() || [];
  const allTasks = areas.flatMap(area => area.tasks || []);

  const storedScenario =
    window.getStoredGeneratedScenario?.()?.scenario || null;

  const scenarioOrder = Array.isArray(
    storedScenario?.Flight_Task_Order
  )
    ? storedScenario.Flight_Task_Order
    : [];

  const resolvedScenarioTasks =
    scenarioOrder.length
      ? resolveScenarioFlightTasks(
          scenarioOrder,
          allTasks
        )
      : [];

  const resolvedScenarioCodes =
    resolvedScenarioTasks.map(
      task => String(task.filterCode)
    );

  const tasks = scenarioOrder.length
    ? [
        ...resolvedScenarioTasks,
        ...allTasks.filter(task =>
          !resolvedScenarioCodes.includes(
            String(task.filterCode)
          )
        )
      ]
    : allTasks;

  if (!tasks.length) {
    container.innerHTML = '<p>No flight portion tasks are available.</p>';
    return;
  }

  const orderedTasks = scenarioOrder.length
    ? tasks
    : applySavedFlightTaskOrder(tasks);

  container.innerHTML = `
    <div id="flightTaskSortableList"></div>
  `;

  const list = document.getElementById('flightTaskSortableList');

  orderedTasks.forEach(task => {
    const temp = document.createElement('div');

    window.renderFlightDetailedArea?.(temp, {
      roman: '',
      title: '',
      phase: '',
      tasks: [task]
    });

    const taskCard = temp.querySelector('.task-card');

    if (!taskCard) return;

    taskCard.dataset.flightTaskCode = task.filterCode;
    taskCard.style.marginBottom = '10px';

    const header = taskCard.querySelector('.task-header');

    if (header && !header.querySelector('.drag-handle')) {
      const handle = document.createElement('span');
      handle.className = 'drag-handle';
      handle.textContent = '☰';
      handle.title = 'Drag to reorder';
      handle.style.cursor = 'grab';
      handle.style.fontWeight = '700';
      handle.style.fontSize = '1.2rem';
      handle.style.padding = '0 8px';
      handle.style.userSelect = 'none';

      header.insertBefore(handle, header.firstChild);
    }

    list.appendChild(taskCard);
  });

  simplifyFlightTaskCardsToSkillOnly();
  wireFlightTaskCardEvents();
  wireFlightTaskSortable();
}

function simplifyFlightTaskCardsToSkillOnly() {
  const list = document.getElementById('flightTaskSortableList');
  if (!list) return;

  list.querySelectorAll('.task-card').forEach(card => {
    card.querySelectorAll('.grade-item').forEach(item => {
      const select = item.querySelector('[data-grade]');
      const gradeType = select?.dataset.grade;

      if (gradeType === 'K' || gradeType === 'R') {
        item.remove();
      }

      if (gradeType === 'S') {
        const label = item.querySelector('.grade-label');
        if (label) label.textContent = 'Grade';
      }
    });
  });
}

function wireFlightTaskCardEvents() {
  const list = document.getElementById('flightTaskSortableList');
  if (!list) return;

  list.querySelectorAll('[data-toggle-task]').forEach(header => {
    header.addEventListener('click', event => {
      if (
        event.target.closest('select,input,textarea') ||
        event.target.closest('.drag-handle')
      ) {
        return;
      }

      const taskCard = header.closest('.task-card');
      const taskBody = taskCard?.querySelector('.task-body');
      const chevron = taskCard?.querySelector('.chevron');

      const isExpanded = taskBody?.classList.toggle('expanded');

      if (chevron) {
        chevron.classList.toggle('expanded', !!isExpanded);
      }
    });
  });

  list.querySelectorAll('[data-grade]').forEach(select => {
    select.addEventListener('change', event => {
      const taskCode = select.dataset.taskCode;
      const gradeType = select.dataset.grade;
      const value = event.target.value;

      window.setDetailedGradeFromFlight?.(taskCode, gradeType, value);
    });
  });

  list.querySelectorAll('[data-task-check]').forEach(box => {
    box.addEventListener('change', event => {
      event.stopPropagation();

      const taskCode = event.target.dataset.taskCheck;
      const checked = event.target.checked;

      window.setDetailedTaskCheckFromFlight?.(taskCode, checked);

      const card = event.target.closest('.task-card');
      const sSelect = card?.querySelector('[data-grade="S"]');

      if (sSelect) {
        sSelect.value = checked ? '3' : 'NP';
      }
    });
  });

  list.querySelectorAll('[data-examiner-note]').forEach(textarea => {
    textarea.addEventListener('input', event => {
      const taskCode = event.target.dataset.examinerNote;
      const note = event.target.value;

      window.setDetailedExaminerNoteFromFlight?.(taskCode, note);
    });
  });
}

function applySavedFlightTaskOrder(tasks) {
  try {
    const savedOrder =
      JSON.parse(localStorage.getItem(FLIGHT_TASK_ORDER_KEY)) || [];

    if (!Array.isArray(savedOrder) || !savedOrder.length) {
      return tasks;
    }

    const ordered = savedOrder
      .map(code => tasks.find(task => task.filterCode === code))
      .filter(Boolean);

    const missing = tasks.filter(task =>
      !savedOrder.includes(task.filterCode)
    );

    return [...ordered, ...missing];
  } catch {
    return tasks;
  }
}

function saveFlightTaskOrder() {
  const list = document.getElementById('flightTaskSortableList');
  if (!list) return;

  const order = [...list.querySelectorAll('[data-flight-task-code]')]
    .map(card => card.dataset.flightTaskCode)
    .filter(Boolean);

  localStorage.setItem(
    FLIGHT_TASK_ORDER_KEY,
    JSON.stringify(order)
  );
}

function wireFlightTaskSortable() {
  const list = document.getElementById('flightTaskSortableList');

  if (!list || !window.Sortable) return;

  new Sortable(list, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    onEnd: saveFlightTaskOrder
  });
}

function getSavedScenarioTimes() {
  try {
    return JSON.parse(localStorage.getItem(SCENARIO_TIME_KEY)) || {};
  } catch {
    return {};
  }
}

function saveScenarioTimes(times) {
  localStorage.setItem(
    SCENARIO_TIME_KEY,
    JSON.stringify(times)
  );
}

function calculateDecimalDuration(start, end) {
  if (!start || !end) return '';

  const startDate = new Date(`2000-01-01T${start}`);
  const endDate = new Date(`2000-01-01T${end}`);

  let minutes =
    Math.round((endDate - startDate) / 60000);

  if (minutes < 0) {
    minutes += 24 * 60;
  }

  return (minutes / 60).toFixed(1);
}

function isApplicable(item, rating) {
  const value = String(
    item.Applicable_Rating ||
    item.Applicability ||
    item.Rating ||
    'BOTH'
  ).toUpperCase();

  const selectedRating = String(
    rating || ''
  ).toUpperCase();

  if (
    !value ||
    value === 'BOTH' ||
    value === 'ALL'
  ) {
    return true;
  }

  return (
    value === selectedRating ||
    value.includes(selectedRating)
  );
}

function getItemPrompt(item) {
  const prompt = String(
    item.Question ||
    item.Prompt ||
    item.Scenario ||
    ''
  ).trim();

  const trigger = String(
    item.Scenario_Trigger || ''
  ).trim();

  if (!prompt || !trigger) {
    return prompt;
  }

  const suffix = ` (${trigger})`;

  return prompt.endsWith(suffix)
    ? prompt.slice(0, -suffix.length).trim()
    : prompt;
}

function getItemTaskCode(item) {
  return (
    item.Filter_Code ||
    item.filterCode ||
    item.Task_Code ||
    item.ACS_Task ||
    item.Primary_ACS_ID ||
    item.ACS_Element ||
    item.ACS_Code ||
    item.Code ||
    ''
  );
}

function getItemAnswer(item) {
  return (
    item.Answer ||
    item.Correct_Answer ||
    item.Expected_Answer ||
    item.Evaluation_Notes ||
    item.Objectives ||
    item.Teaching_Elements ||
    ''
  );
}

function pickRandom(items, count) {
  const copy = [...items];
  const selected = [];

  while (copy.length && selected.length < count) {
    const index = Math.floor(Math.random() * copy.length);
    selected.push(copy.splice(index, 1)[0]);
  }

  return selected;
}

function randomItem(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function normalizeQuestionKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function shouldIncludeTrigger(triggerMap) {
  if (triggerMap.Required === 'Yes') return true;

  const probability = Number(triggerMap.Probability);

  if (!probability) return false;

  return Math.random() * 100 < probability;
}

function buildTriggeredEvent(db, triggerMap, rating) {
  const event = (db.Event_Master || [])
    .find(e => e.Event_ID === triggerMap.Event_ID);

  if (!event) return null;

  const eventSegmentMaps = (db.Event_Segment_Map || [])
    .filter(m =>
      m.Event_ID === triggerMap.Event_ID &&
      m.Active !== 'No'
    );

  const items = eventSegmentMaps.flatMap(map => {
    const segmentItems = getItemsForSegment(
      db,
      map.Segment_ID,
      rating
    );

    const min = Number(map.Min_Questions) || 0;
    const max = Number(map.Max_Questions) || min;
    const count = Math.max(min, Math.min(max, segmentItems.length));

    return pickRandom(segmentItems, count);
  });

  return {
    event,
    narrative: triggerMap.Narrative || event.Description || '',
    items
  };
}

function dedupeItems(items) {
  const seen = new Set();

  return (items || []).filter(item => {
    const key = normalizeQuestionKey(getItemPrompt(item));

    if (!key) return false;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function dedupeItemsForPhase(items, seen) {
  return (items || []).filter(item => {
    const key = normalizeQuestionKey(getItemPrompt(item));

    if (!key) return false;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}