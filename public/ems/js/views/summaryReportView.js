import { getTaskReportStatus, getAreaStatus, getOverallOutcome } from '../logic/reportLogic.js';
import { store } from '../state/store.js';

export function renderSummaryReport() {
  const container = document.getElementById('summaryReportContainer');
  const mode = document.getElementById('reportMode').value;

  const { tasks, grades, applicant } = store;

  const taskReports = tasks.map(task => {
    const g = grades[task.code] || { k: 'NP', r: 'NP', s: 'NP' };

    const status = getTaskReportStatus(task, g, task.isRequired);

    return {
      ...task,
      ...g,
      status
    };
  });

  const outcome = getOverallOutcome(taskReports);

  const areaMap = {};
  taskReports.forEach(t => {
    if (!areaMap[t.areaTitle]) areaMap[t.areaTitle] = [];
    areaMap[t.areaTitle].push(t);
  });

  // ---------- BUILD HTML ----------
  let html = `
    <h2>Practical Test Summary Report</h2>

    <div>
      <strong>Applicant:</strong> ${applicant.name || ''}<br>
      <strong>Certificate / Rating:</strong> ${applicant.appRating || ''}<br>
      <strong>Exam Type:</strong> ${applicant.appExamType || ''}<br>
      <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
      <strong>Examiner:</strong> Fergerstrom, Kele
    </div>

    <h3>Overall Outcome: ${outcome}</h3>
  `;

  // ---------- AREAS ----------
  html += `<h3>Areas of Operation</h3><table border="1"><tr><th>Area</th><th>Status</th></tr>`;

  Object.entries(areaMap).forEach(([area, tasks]) => {
    const status = getAreaStatus(tasks);
    html += `<tr><td>${area}</td><td>${status}</td></tr>`;
  });

  html += `</table>`;

  // ---------- APPLICANT VIEW ----------
  if (mode === 'applicant') {
    const failed = taskReports.filter(t => t.status === 'Failed');

    if (failed.length) {
      html += `<h3>Unsatisfactory Tasks</h3><ul>`;
      failed.forEach(t => {
        html += `<li>${t.code} - ${t.title}</li>`;
      });
      html += `</ul>`;
    }
  }

  // ---------- EXAMINER VIEW ----------
  if (mode === 'examiner') {
    html += `
      <h3>Detailed Task Breakdown</h3>
      <table border="1">
        <tr>
          <th>Task</th>
          <th>K</th>
          <th>R</th>
          <th>S</th>
          <th>Status</th>
        </tr>
    `;

    taskReports.forEach(t => {
      html += `
        <tr>
          <td>${t.code}</td>
          <td>${t.k}</td>
          <td>${t.r}</td>
          <td>${t.s}</td>
          <td>${t.status}</td>
        </tr>
      `;
    });

    html += `</table>`;
  }

  container.innerHTML = html;
}