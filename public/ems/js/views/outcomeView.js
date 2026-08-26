import { determinePracticalTestOutcome } from '../logic/outcome.js';

export function renderOutcome(summary) {
  const outcome =
    window.store?.discontinuanceManuallySelected
      ? 'discontinuance'
      : determinePracticalTestOutcome(summary);

  document.querySelectorAll('.outcome-btn').forEach(btn => {
    btn.classList.remove(
      'selected-sat',
      'selected-unsat',
      'selected-disc'
    );

    if (
      outcome === 'satisfactory' &&
      btn.dataset.outcome === 'satisfactory'
    ) {
      btn.classList.add('selected-sat');
    }

    if (
      outcome === 'unsatisfactory' &&
      btn.dataset.outcome === 'unsatisfactory'
    ) {
      btn.classList.add('selected-unsat');
    }

    if (
      outcome === 'discontinuance' &&
      btn.dataset.outcome === 'discontinuance'
    ) {
      btn.classList.add('selected-disc');
    }
  });

  const content = document.getElementById('incompleteTasksContent');

  if (content) {
    const flagged = summary.statuses.filter(row =>
      row.status === 'fail' ||
      (row.task.isRequired && row.status === 'incomplete')
    );

    content.innerHTML = flagged.length
      ? flagged.map(row => `
          <div class="incomplete-task-item">
            <span class="itask-status ${
              row.status === 'fail'
                ? 'badge-fail'
                : 'badge-incomplete'
            }">
              ${row.status}
            </span>
            ${row.task.code} - ${row.task.title}
          </div>
        `).join('')
      : `
          <div class="incomplete-task-item">
            <span class="itask-status badge-pass">Clear</span>
            No incomplete or failed required tasks.
          </div>
        `;
  }

  const spBtn = document.getElementById('btnSharePoint');

  if (spBtn) {
    spBtn.disabled = summary.overall === 'INCOMPLETE';
    spBtn.title = spBtn.disabled
      ? 'Complete all required tasks first'
      : 'Ready to submit';
  }
}