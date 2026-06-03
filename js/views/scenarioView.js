const SCENARIO_DATABASE_PATHS = {
  private: '/data/scenario-engine/private-pilot.json',
  instrument: '/data/scenario-engine/instrument-airplane.json',
  commercial: '/data/scenario-engine/commercial-airplane.json',
  cfi: '/data/scenario-engine/cfi-mei.json'
};

let loadedScenarioDatabases = {};

export function renderScenarioEngine(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="scenario-engine">
      <h2>DPE Scenario Engine</h2>
      <p>Generate a scenario-based oral exam using Scenario, Evaluation Segment, Event, and Question mappings.</p>

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
          Generate Oral Exam
        </button>
      </div>

      <div id="scenarioOutput" class="scenario-output"></div>
    </div>
  `;

  document
  .getElementById('generateScenarioBtn')
  ?.addEventListener('click', generateScenario);

const savedScenario = window.getStoredGeneratedScenario?.();

if (
  savedScenario?.scenario &&
  savedScenario?.generatedSegments
) {
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
  console.log('Selected scenario:', scenario);
console.log('Scenario ID:', scenarioId);
console.log('Scenario segment maps:', db.Scenario_Segment_Map);

  const segmentMaps = (db.Scenario_Segment_Map || [])
    .filter(m => m.Scenario_ID === scenarioId);

  return segmentMaps.map(map => {
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
  }).filter(group => group.segment && group.items.length);
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
      (item.Segment_ID === segmentId || item.Primary_Segment_ID === segmentId) &&
      isApplicable(item, rating)
    );
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

function renderGeneratedScenario(output, scenario, generatedSegments) {
  const allItems = generatedSegments.flatMap(group => group.items);

  output.innerHTML = `
  <div class="scenario-card">
    <h3>${escapeHtml(scenario.Scenario_Name || scenario.Name || 'Generated Scenario')}</h3>
    <p>${escapeHtml(scenario.Description || scenario.Scenario_Description || '')}</p>
  </div>

  <div class="scenario-card">
    <h4>Oral Exam Questions</h4>

    ${allItems.map(item => `
      <details class="scenario-question">

        <summary style="
          display:flex;
          align-items:center;
          gap:8px;
          cursor:pointer;
        ">

          <select
            class="scenario-grade-select"
            data-task-code="${escapeHtml(getItemTaskCode(item))}"
            onclick="event.stopPropagation();"
            onchange="window.setScenarioGradeFromOral?.(this)"
          >
            <option value="">--</option>
            <option value="1" ${window.getScenarioGradeFromDetailedView?.(getItemTaskCode(item)) === '1' ? 'selected' : ''}>1</option>
            <option value="2" ${window.getScenarioGradeFromDetailedView?.(getItemTaskCode(item)) === '2' ? 'selected' : ''}>2</option>
            <option value="3" ${window.getScenarioGradeFromDetailedView?.(getItemTaskCode(item)) === '3' ? 'selected' : ''}>3</option>
            <option value="4" ${window.getScenarioGradeFromDetailedView?.(getItemTaskCode(item)) === '4' ? 'selected' : ''}>4</option>
          </select>

          <span>
            ${escapeHtml(getItemPrompt(item))}
          </span>

        </summary>

        <div class="scenario-answer">
          <em>${escapeHtml(getItemAnswer(item))}</em>
        </div>

      </details>
    `).join('')}

  </div>
`;
}

function getItemId(item) {
  return (
    item.Question_ID ||
    item.Exercise_ID ||
    item.Decision_ID ||
    item.Endorsement_ID ||
    item.MEI_ID ||
    ''
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

function getScenarioGradeValue(item) {
  const rawTaskCode = getItemTaskCode(item);
  const parts = rawTaskCode ? rawTaskCode.split('.') : [];

  const taskCode =
    parts.length >= 3
      ? parts.slice(0, 3).join('.')
      : rawTaskCode || '';

  const gradeType =
    parts.length >= 4
      ? parts[3].charAt(0).toUpperCase()
      : '';

  if (!window.getScenarioGradeFromDetailedView || !taskCode || !gradeType) {
    return '';
  }

  return window.getScenarioGradeFromDetailedView(taskCode, gradeType) || '';
}