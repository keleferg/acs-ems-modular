import { calculateTaskStatus, getTaskGrades } from '../logic/grading.js';

export function renderDebrief(container, areas, store) {
  if (!container) return;

  const tasksWithNotes = areas
    .flatMap(area =>
      area.tasks.map(task => ({
        ...task,
        areaRoman: area.roman,
        areaTitle: area.title,
        note: store.examinerNotes?.[task.filterCode] || '',
        status: calculateTaskStatus(task),
        grades: getTaskGrades(task)
      }))
    )
    .filter(task => task.note.trim().length > 0);

  if (tasksWithNotes.length === 0) {
    container.innerHTML = `
      <div class="summary-area-card">
        <h4>Debrief Notes</h4>
        <p style="color:var(--text-muted);font-family:var(--font-mono);font-size:0.85rem;">
          No examiner notes have been entered yet.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="summary-grid">
      ${tasksWithNotes.map(task => `
        <div class="summary-area-card">
          <h4>
            ${task.code} — ${task.title}
          </h4>

          <p style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted);margin-bottom:10px;">
            Area ${task.areaRoman}: ${task.areaTitle}
          </p>

          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;font-family:var(--font-mono);font-size:0.72rem;">
            <span class="summary-badge ${getStatusClass(task.status)}">
              ${formatStatus(task.status)}
            </span>

            <span class="summary-badge ${getGradeClass(task.grades.K)}">
              K: ${task.grades.K}
            </span>

            <span class="summary-badge ${getGradeClass(task.grades.R)}">
              R: ${task.grades.R}
            </span>

            <span class="summary-badge ${getGradeClass(task.grades.S)}">
              S: ${task.grades.S}
            </span>
          </div>

          <div class="scenario-box">
            <div class="scenario-label">
              <i class="fas fa-comment-dots"></i> Examiner Notes
            </div>
            ${escapeHtml(task.note).replace(/\n/g, '<br>')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function formatStatus(status) {
  return ({
    pass: 'Pass',
    fail: 'Fail',
    incomplete: 'Incomplete',
    'not-required': 'Not Performed'
  })[status] ?? status;
}

function getStatusClass(status) {
  if (status === 'pass') return 'badge-pass';
  if (status === 'fail') return 'badge-fail';
  if (status === 'incomplete') return 'badge-incomplete';
  return 'badge-incomplete';
}

function getGradeClass(grade) {
  if (String(grade) === '1') return 'badge-fail';
  if (String(grade) === '2') return 'badge-incomplete';
  if (String(grade) === '3') return 'badge-pass';
  if (String(grade) === '4') return 'badge-pass';
  return 'badge-incomplete';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}