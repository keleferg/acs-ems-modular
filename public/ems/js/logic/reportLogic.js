export function getTaskReportStatus(grades, isRequired) {
  const values = [
    grades?.k || 'NP',
    grades?.r || 'NP',
    grades?.s || 'NP'
  ];

  if (values.includes('1')) return 'Failed';

  if (isRequired && values.includes('NP')) return 'Incomplete';

  if (!isRequired && values.every(v => v === 'NP')) return 'Not Performed';

  return 'Complete';
}

export function getOverallOutcome(taskReports) {
  if (taskReports.some(t => t.status === 'Failed')) {
    return 'Unsatisfactory';
  }

  if (taskReports.some(t => t.status === 'Incomplete')) {
    return 'Incomplete / Discontinued';
  }

  return 'Satisfactory';
}

export function getAreaStatus(tasks) {
  if (tasks.some(t => t.status === 'Failed')) return 'Failed';
  if (tasks.some(t => t.status === 'Incomplete')) return 'Incomplete';
  return 'Complete';
}