const SCENARIO_DATABASE_PATHS = {
  private: '/data/scenario-engine/private-pilot.json',
  instrument: '/data/scenario-engine/instrument-airplane.json',
  commercial: '/data/scenario-engine/commercial-airplane.json',
  cfi: '/data/scenario-engine/cfi-mei.json'
};

let loadedScenarioDatabases = {};

const SCENARIO_TIME_KEY = 'acs_ems_scenario_times_v1';

export function renderScenarioEngine(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="scenario-engine">
      <h2>Oral / Flight Portion</h2>
      <p>
        Generate a chronological oral exam. The Flight Portion uses the same task layout as Detailed View, excluding AOA I.
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
  const cert =
    document.getElementById('scenarioCertificate')?.value || 'private';

  const rating =
    document.getElementById('scenarioRating')?.value || 'ASEL';

  const scenarioNumber =
    document.getElementById('scenarioNumber')?.value || 'random';

  const output = document.getElementById('scenarioOutput');

  if (!output) return;

  output.innerHTML = `<p>Loading scenario database...</p>`;

  try {
    const db = await loadScenarioDatabase(cert);
    const scenarios = db.Scenario_Master || [];

    let scenario;

    if (scenarioNumber === 'random') {
      const applicableScenarios =
        scenarios.filter(s => isApplicable(s, rating));

      scenario = randomItem(
        applicableScenarios.length ? applicableScenarios : scenarios
      );
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

  const segmentMaps = (db.Scenario_Segment_Map || [])
    .filter(m => m.Scenario_ID === scenarioId)
    .sort((a, b) =>
      Number(a.Segment_Order || 999) -
      Number(b.Segment_Order || 999)
    );

  return segmentMaps
    .map(map => {
      const segment = (db.Evaluation_Segment_Master || [])
        .find(s => s.Segment_ID === map.Segment_ID);

      const items = getItemsForSegment(db, map.Segment_ID, rating);

      const min =
        Number(map.Min_Questions) ||
        Number(map.Min_Q) ||
        Number(map.Min_Items) ||
        3;

      const max =
        Number(map.Max_Questions) ||
        Number(map.Max_Q) ||
        Number(map.Max_Items) ||
        min;

      const count = Math.max(min, Math.min(max, items.length));

      return {
        segment,
        items: pickRandom(items, count)
      };
    })
    .filter(group => group.segment && group.items.length);
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
  const oralItems = generatedSegments.flatMap(group => group.items);
  const times = getSavedScenarioTimes();

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

      ${oralItems.map((item, index) => renderGradedItem({
        number: index + 1,
        title: getItemPrompt(item),
        answer: getItemAnswer(item),
        code: getItemTaskCode(item)
      })).join('')}
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
        <span style="font-weight:700; min-width:28px;">
          ${number}.
        </span>

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

const FLIGHT_TASK_ORDER_KEY = 'acs_ems_flight_task_order_v1';

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

    if (taskCard) {
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
    }
  });

  wireFlightTaskCardEvents();
  wireFlightTaskSortable();
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
      const taskCode = event.target.dataset.taskCheck;
      const checked = event.target.checked;

      window.setDetailedTaskCheckFromFlight?.(taskCode, checked);
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}