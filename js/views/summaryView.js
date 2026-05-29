import { calculateTaskStatus } from '../logic/grading.js';

export function renderSummary(container, areas) {
  if (!container) return;

  container.innerHTML = `
    <div class="summary-grid">
      ${areas.map(area => {
        const statuses = area.tasks.map(calculateTaskStatus);
        const required = area.tasks.filter(t => t.isRequired);

        const passed = area.tasks.filter(t =>
          t.isRequired && calculateTaskStatus(t) === 'pass'
        ).length;

        const pct = required.length
          ? Math.round((passed / required.length) * 100)
          : 0;

        return `
          <div class="summary-area-card">
            <h4>${area.roman}. ${area.title}</h4>

            <div class="summary-progress">
              <div class="summary-progress-fill" style="width:${pct}%"></div>
            </div>

            <div class="summary-dots">
              ${statuses.map(status => `
                <span
                  class="summary-dot ${getDotClass(status)}"
                  title="${formatStatus(status)}"
                ></span>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function getDotClass(status) {
  if (status === 'pass') return 'dot-pass';
  if (status === 'fail') return 'dot-fail';
  if (status === 'incomplete') return 'dot-incomplete';
  if (status === 'not-required') return 'dot-not-required';

  return 'dot-not-required';
}

function formatStatus(status) {
  return ({
    pass: 'Pass',
    fail: 'Fail',
    incomplete: 'Incomplete',
    'not-required': 'Not Required'
  })[status] ?? status;
}