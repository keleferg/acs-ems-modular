import { store } from '../state/store.js';
import {
  getTaskReportStatus,
  getOverallOutcome,
  getAreaStatus
} from '../logic/reportLogic.js';

export function renderReportActions() {
  const container = document.getElementById('testReportActionsContainer');

  if (!container) return;

  container.innerHTML = `
    <div id="testReportActions" class="report-actions-grid">
      <div class="report-action-card">
        <h3>Applicant Report</h3>

        <button id="printApplicantReportBtn">
          Save / Print Applicant Test Report
        </button>

        <button id="emailApplicantReportBtn">
          Email Applicant Test Report
        </button>
      </div>

      <div class="report-action-card">
        <h3>Designee Report</h3>

        <button id="printDesigneeReportBtn">
          Save / Print Designee Test Report
        </button>

        <button id="emailDesigneeReportBtn">
          Email Designee Test Report
        </button>
      </div>
    </div>
  `;

  document.getElementById('printApplicantReportBtn')?.addEventListener('click', () => {
    openPrintableReport('applicant');
  });

  document.getElementById('printDesigneeReportBtn')?.addEventListener('click', () => {
    openPrintableReport('designee');
  });

  document.getElementById('emailApplicantReportBtn')?.addEventListener('click', () => {
    openEmailDialog('applicant');
  });

  document.getElementById('emailDesigneeReportBtn')?.addEventListener('click', () => {
    openEmailDialog('designee');
  });
}

function buildTaskReports() {
  const tasks = store.tasks || [];
  const grades = store.grades || {};

  return tasks.map(task => {
    const taskGrades = grades[task.code] || grades[task.id] || {
      k: 'NP',
      r: 'NP',
      s: 'NP'
    };

    const isRequired = task.isRequired !== false;

    return {
      ...task,
      k: taskGrades.k || 'NP',
      r: taskGrades.r || 'NP',
      s: taskGrades.s || 'NP',
      status: getTaskReportStatus(taskGrades, isRequired)
    };
  });
}

function openPrintableReport(type) {
  const isApplicant = type === 'applicant';
  const applicant = store.applicant || {};
  const taskReports = buildTaskReports();
  const outcome = getOverallOutcome(taskReports);

  const failedOrIncomplete = taskReports.filter(t =>
    t.status === 'Failed' || t.status === 'Incomplete'
  );

  const areaMap = {};

  taskReports.forEach(task => {
    const area = task.areaTitle || task.area || 'Unassigned Area';

    if (!areaMap[area]) {
      areaMap[area] = [];
    }

    areaMap[area].push(task);
  });

  const reportTitle = isApplicant
    ? 'Applicant Practical Test Report'
    : 'Designee Practical Test Report';

  const failedIncompleteHtml = failedOrIncomplete.length
    ? failedOrIncomplete.map(t => `
        <tr>
          <td>${t.code || t.id || ''}</td>
          <td>${t.title || ''}</td>
          <td>${t.status}</td>
        </tr>
      `).join('')
    : `
        <tr>
          <td colspan="3">No incomplete or failed tasks.</td>
        </tr>
      `;

  const areaSummaryHtml = Object.entries(areaMap).map(([area, tasks]) => `
    <tr>
      <td>${area}</td>
      <td>${getAreaStatus(tasks)}</td>
    </tr>
  `).join('');

  const designeeDetailsHtml = taskReports.map(t => `
    <tr>
      <td>${t.code || t.id || ''}</td>
      <td>${t.title || ''}</td>
      <td>${t.k}</td>
      <td>${t.r}</td>
      <td>${t.s}</td>
      <td>${t.status}</td>
    </tr>
  `).join('');

  const reportHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 32px;
            color: #111;
          }

          h1 {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }

          h2 {
            margin-top: 28px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 6px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }

          th,
          td {
            border: 1px solid #999;
            padding: 8px;
            text-align: left;
            vertical-align: top;
          }

          th {
            background: #eee;
          }

          .print-button {
            margin-bottom: 20px;
            padding: 10px 16px;
            font-size: 15px;
          }

          .signature {
            margin-top: 60px;
          }

          .small-text {
            font-size: 13px;
            color: #555;
          }

          @media print {
            .print-button {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <button class="print-button" onclick="window.print()">
          Print / Save as PDF
        </button>

        <h1>${reportTitle}</h1>

        <h2>Applicant Information</h2>
        <p>
          <strong>Applicant:</strong> ${applicant.name || applicant.applicantName || ''}<br>
          <strong>Certificate:</strong> ${applicant.appCertificate || ''}<br>
          <strong>Rating:</strong> ${applicant.appRating || ''}<br>
          <strong>Exam Type:</strong> ${applicant.appExamType || ''}<br>
          <strong>Aircraft:</strong> ${applicant.aircraft || applicant.appAircraft || ''}<br>
          <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
          <strong>Examiner:</strong> ${applicant.examiner || 'Fergerstrom, Kele'}
        </p>

        <h2>Overall Outcome</h2>
        <p><strong>${outcome}</strong></p>

        <h2>Areas of Operation Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Area of Operation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${areaSummaryHtml}
          </tbody>
        </table>

        <h2>Incomplete / Failed Tasks</h2>
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${failedIncompleteHtml}
          </tbody>
        </table>

        ${
          isApplicant
            ? `
              <h2>Applicant Summary</h2>
              <p>
                This report summarizes the practical test outcome and identifies
                any task areas that were incomplete or unsatisfactory, if applicable.
              </p>
            `
            : `
              <h2>Designee Detailed Task Report</h2>
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Description</th>
                    <th>K</th>
                    <th>R</th>
                    <th>S</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${designeeDetailsHtml}
                </tbody>
              </table>
            `
        }

        <div class="signature">
          <p>__________________________________________</p>
          <p>Examiner Signature / Date</p>
        </div>

        <p class="small-text">
          Generated by the Practical Test Evaluation System.
        </p>
      </body>
    </html>
  `;

  const reportWindow = window.open('', '_blank');

  reportWindow.document.open();
  reportWindow.document.write(reportHtml);
  reportWindow.document.close();
}

function openEmailDialog(type) {
  const isApplicant = type === 'applicant';

  const email = prompt(
    isApplicant
      ? 'Enter applicant email address:'
      : 'Enter designee report email address:'
  );

  if (!email) return;

  const subject = encodeURIComponent(
    isApplicant
      ? 'Applicant Practical Test Report'
      : 'Designee Practical Test Report'
  );

  const body = encodeURIComponent(
    isApplicant
      ? 'The Applicant Practical Test Report is ready for review. Please save or print the report from the test application.'
      : 'The Designee Practical Test Report is ready for review. Please save or print the report from the test application.'
  );

  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}