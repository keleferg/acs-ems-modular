import { calculateTaskStatus, getTaskGrades } from '../logic/grading.js';

const gradeOptions = value =>
  ['NP', '1', '2', '3', '4']
    .map(v => `<option value="${v}" ${String(value) === v ? 'selected' : ''}>${v}</option>`)
    .join('');

export function renderDetailed(container, area, store, handlers) {
  if (!area) {
    container.innerHTML = '<p>No tasks are available for this selection.</p>';
    return;
  }

  container.innerHTML = `
    <div class="area-header">
      <h2>${area.roman}. ${area.title}</h2>
      <div class="area-meta">
        <span>${area.phase}</span>
        <span>${area.tasks.length} tasks shown</span>
      </div>
    </div>
    ${area.tasks.map(task => renderTask(task, store)).join('')}
  `;

  container.querySelectorAll('[data-toggle-task]').forEach(el => {
    el.addEventListener('click', event => {
      if (event.target.closest('select,input,textarea')) return;
      handlers.onToggleTask(el.dataset.toggleTask);
    });
  });

  container.querySelectorAll('[data-grade]').forEach(select => {
    select.addEventListener('change', event => {
      handlers.onGradeChange(
        select.dataset.taskCode,
        select.dataset.grade,
        event.target.value
      );
    });
  });

  container.querySelectorAll('[data-task-check]').forEach(box => {
    box.addEventListener('change', event => {
      if (handlers.onTaskCheck) {
        handlers.onTaskCheck(
          event.target.dataset.taskCheck,
          event.target.checked
        );
      }
    });
  });

  container.querySelectorAll('[data-examiner-note]').forEach(textarea => {
    textarea.addEventListener('input', event => {
      if (handlers.onExaminerNoteChange) {
        handlers.onExaminerNoteChange(
          event.target.dataset.examinerNote,
          event.target.value
        );
      }
    });
  });
}

function renderTask(task, store) {
  const status = calculateTaskStatus(task);
  const grades = getTaskGrades(task);
  const expanded = store.expandedTasks[task.filterCode];

  const manuallyChecked = store.checkedElements?.[task.filterCode] === true;
  const isChecked = manuallyChecked || status === 'pass';

  const examinerNote = store.examinerNotes?.[task.filterCode] || '';

  const hasUserInteraction =
  store.checkedElements?.[task.filterCode] ||
  ['K','R','S'].some(type => {
    const val = store.grades?.[`${task.filterCode}.${type}`];
    return val && val !== 'NP';
  });

const requiredClass = task.isAdditional
  ? (task.isRequired
      ? 'required-addon'
      : (hasUserInteraction ? '' : 'not-addon-required')
    )
  : '';

  const requiredLabel = task.isAdditional
    ? (task.isRequired ? 'Required Additional Task' : 'Not Required / Optional')
    : 'Required Task';

  return `
  <div class="task-card ${requiredClass}" data-task-card="${task.filterCode}">
    <div class="task-header" data-toggle-task="${task.filterCode}">
      <input
        type="checkbox"
        class="task-checkbox"
        data-task-check="${task.filterCode}"
        ${isChecked ? 'checked' : ''}
      />

      <span data-acs-code="${task.code}">
  ${task.code}
</span>
      <span class="task-title">${task.title}</span>
      <span class="element-count">${requiredLabel}</span>
      <span class="task-status-badge ${status}">${formatStatus(status)}</span>
      <i class="fas fa-chevron-down chevron ${expanded ? 'expanded' : ''}"></i>
    </div>

    <div class="grade-bar">
      ${['K', 'R', 'S'].map(type => `
        <span class="grade-item">
          <span class="grade-label ${type.toLowerCase()}-label">${type}</span>
          <select
            class="grade-select"
            data-grade="${type}"
            data-task-code="${task.filterCode}"
          >
            ${gradeOptions(grades[type])}
          </select>
        </span>
      `).join('')}

      <span class="grade-avg">${task.filterCode}</span>
    </div>

    <div class="task-body ${expanded ? 'expanded' : ''}">
      <div class="scenario-box">
        <div class="scenario-label">
          <i class="fas fa-clipboard-question"></i> Scenario
        </div>
        ${task.scenario || ''}
      </div>

      ${renderElements('knowledge', 'Knowledge', task.knowledge)}
      ${renderElements('risk', 'Risk Management', task.risk)}
      ${renderElements('skill', 'Skill', task.skill)}

      <div class="notes-section">
        <label>Examiner Notes</label>
        <textarea
          data-examiner-note="${task.filterCode}"
          placeholder="Enter examiner notes for this task..."
        >${examinerNote}</textarea>
      </div>
    </div>
  </div>`;
}

function renderElements(kind, title, items = []) {
  return `
  <div class="element-section">
    <div class="element-section-title ${kind}">${title}</div>
    ${items.map(item => `
      <div class="element-item">
        <span class="element-code">${item.code}</span>
        <span class="element-text">${item.text}</span>
      </div>
    `).join('')}
  </div>`;
}

function formatStatus(status) {
  return ({
    pass: 'Pass',
    fail: 'Fail',
    incomplete: 'Incomplete',
    'not-required': 'Not Performed'
  })[status] ?? status;
}