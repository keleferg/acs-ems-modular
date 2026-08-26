import { calculateTaskStatus } from '../logic/grading.js';

export function renderSummary(container, areas, store = window.store) {
  if (!container) return;

  const selectedAcsCodes =
    store?.selectedAcsCodes ||
    window.getSelectedAcsCodes?.() ||
    [];

  container.innerHTML = `
    <div class="summary-grid">
      ${areas.map(area => {
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
              ${area.tasks.map(task => {
                const status = calculateTaskStatus(task);

                const isAktFlagged =
                  selectedAcsCodes.includes(task.code) ||
                  selectedAcsCodes.includes(task.filterCode);

                return `
                  <span
                    class="summary-dot ${getDotClass(status)} ${isAktFlagged ? 'dot-akt-flagged' : ''}"
                    title="${escapeHtml(task.code || task.filterCode || '')} — ${formatStatus(status)}${isAktFlagged ? ' — AKTR Deficiency' : ''}"
                  ></span>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <style>
      .summary-dot.dot-akt-flagged {
        border: 2px solid #ff4fa3 !important;
        box-shadow: 0 0 0 2px #ffd6e8 !important;
        outline: none !important;
      }
    </style>
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}