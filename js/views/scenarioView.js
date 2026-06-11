const SCENARIO_DATABASE_PATHS = {
  private: 'data/scenario-engine/private-pilot.json',
  instrument: 'data/scenario-engine/instrument-airplane.json',
  commercial: 'data/scenario-engine/commercial-airplane.json',
  cfi: 'data/scenario-engine/cfi-mei.json'
};

let loadedScenarioDatabases = {};

const SCENARIO_TIME_KEY = 'acs_ems_scenario_times_v1';
const FLIGHT_TASK_ORDER_KEY = 'acs_ems_flight_task_order_v1';

export function renderScenarioEngine(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="scenario-engine">
      <h2>Oral / Flight Portion</h2>
      <p>
        Generate a chronological oral exam. The Flight Portion uses the Detailed View task layout, excludes AOA I, and records Skill grades only.
      </p>

      <div class="scenario-controls">
        <label>
          Certificate
          <select id="scenarioCertificate">
            <option value="private">Private Pilot</option>
            <option value="instrument">Instrument Rating Airplane</option>
            <option value="commercial">Commercial Pilot Airplane</option>
            <option value="cfi">Flight Instructor Airplane / MEI</option>
          </select>
        </label>

        <label>
          Rating
          <select id="scenarioRating">
            <option value="ASEL">ASEL</option>
            <option value="AMEL">AMEL</option>
            <option value="ASES">ASES</option>
            <option value="AMES">AMES</option>
            <option value="CFI-ASEL">CFI-ASEL</option>
            <option value="CFI-AMEL">CFI-AMEL</option>
            <option value="MEI">MEI</option>
            <option value="Both">Both</option>
            <option value="All">All</option>
          </select>
        </label>

        <label>
          Scenario
          <select id="scenarioNumber">
            <option value="random">Random</option>
            <option value="1">Scenario 1</option>
            <option value="2">Scenario 2</option>
            <option value="3">Scenario 3</option>
            <option value="4">Scenario 4</option>
            <option value="5">Scenario 5</option>
          </select>
        </label>

        <button class="btn" id="generateScenarioBtn">
          Generate Oral / Flight Plan
        </button>
      </div>

      <div id="scenarioOutput" class="scenario-output"></div>
    </div>
  `;

  document
    .getElementById('generateScenarioBtn')
    ?.addEventListener('click', generateScenario);

  const savedScenario = window.getStoredGeneratedScenario?.();

  if (savedScenario?.scenario && savedScenario?.generatedSegments) {
    const output = document.getElementById('scenarioOutput');

    renderGeneratedScenario(
      output,
      savedScenario.scenario,
      savedScenario.generatedSegments
    );
  }
}

async function loadScenarioDatabase(type) {
  if (loadedScenarioDatabases[type]) {
    return loadedScenarioDatabases[type];
  }

  const path = SCENARIO_DATABASE_PATHS[type];
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Unable to load scenario database: ${path}`);
  }

  const data = await response.json();
  loadedScenarioDatabases[type] = data;
  return data;
}

async function generateScenario() {
  const cert = document.getElementById('scenarioCertificate')?.value || 'private';
  const rating = document.getElementById('scenarioRating')?.value || 'ASEL';
  const scenarioNumber = document.getElementById('scenarioNumber')?.value || 'random';
  const output = document.getElementById('scenarioOutput');

  if (!output) return;

  output.innerHTML = `<p>Loading scenario database...</p>`;

  try {
    const db = await loadScenarioDatabase(cert);
    const scenarios = db.Scenario_Master || [];

    let scenario;

    if (scenarioNumber === 'random') {
      const applicableScenarios = scenarios.filter(s => isApplicable(s, rating));
      scenario = randomItem(applicableScenarios.length ? applicableScenarios : scenarios);
    } else {
      scenario =
        scenarios.find(s => String(s.Scenario_Number) === String(scenarioNumber)) ||
        scenarios.find(s => String(s.Scenario_ID || '').endsWith(`00${scenarioNumber}`)) ||
        scenarios[Number(scenarioNumber) - 1];
    }

    if (!scenario) {
      output.innerHTML = `<p>No scenario found.</p>`;
      return;
    }

    const generated = buildGeneratedScenario(db, scenario, rating);

    window.storeGeneratedScenario?.({
      scenario,
      generatedSegments: generated
    });

    renderGeneratedScenario(output, scenario, generated);
  } catch (error) {
    console.error(error);

    output.innerHTML = `
      <div class="scenario-card">
        <h4>Scenario Load Error</h4>
        <p>${escapeHtml(error.message)}</p>
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
        const items = flow.Segment_ID
          ? getItemsForSegment(db, flow.Segment_ID, rating)
          : [];

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

function getItemsForSegment(db, segmentId, rating) {
  const banks = [
    db.Question_Bank,
    db.Teaching_Exercise_Bank,
    db.Instructor_Decision_Bank,
    db.Endorsement_Scenario_Bank,
    db.MEI_Exercise_Bank
  ].filter(Boolean);

  return banks
    .flat()
    .filter(item =>
      (
        item.Segment_ID === segmentId ||
        item.Primary_Segment_ID === segmentId
      ) &&
      isApplicable(item, rating)
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
    window.getScenarioGradeFromDetailedView?.(code) || '';

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

        <select
          class="scenario-grade-select"
          data-task-code="${escapeHtml(code)}"
          onclick="event.stopPropagation();"
          onchange="window.setScenarioGradeFromOral?.(this)"
        >
          <option value="">--</option>
          <option value="1" ${selected === '1' ? 'selected' : ''}>1</option>
          <option value="2" ${selected === '2' ? 'selected' : ''}>2</option>
          <option value="3" ${selected === '3' ? 'selected' : ''}>3</option>
          <option value="4" ${selected === '4' ? 'selected' : ''}>4</option>
        </select>

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

function renderFlightPortionDetailed() {
  const container = document.getElementById('flightDetailedContainer');
  if (!container) return;

  const areas = window.getFlightPortionAreas?.() || [];
  const tasks = areas.flatMap(area => area.tasks || []);

  if (!tasks.length) {
    container.innerHTML = '<p>No flight portion tasks are available.</p>';
    return;
  }

  const orderedTasks = applySavedFlightTaskOrder(tasks);

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
    item.Applicability ||
    item.Rating ||
    ''
  );

  if (!value) return true;

  return (
    value === 'All' ||
    value === 'Both' ||
    value === rating ||
    value.includes(rating)
  );
}

function getItemPrompt(item) {
  return (
    item.Question ||
    item.Prompt ||
    item.Scenario ||
    ''
  );
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