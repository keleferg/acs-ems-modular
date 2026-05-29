import { getGrade } from '../state/store.js';

export const GRADE_TYPES = ['K', 'R', 'S'];

export function getTaskGrades(task) {
  return Object.fromEntries(GRADE_TYPES.map(type => [type, getGrade(task.filterCode, type)]));
}

export function isNumericGrade(value) {
  return ['1', '2', '3', '4', 1, 2, 3, 4].includes(value);
}

export function calculateTaskStatus(task) {
  const grades = getTaskGrades(task);

  const values = ['K', 'R', 'S'].map(type => grades[type]);

  const isRequired = task.isRequired;

  const numFails = values.filter(v => v === '1').length;
  const numTwos = values.filter(v => v === '2').length;
  const numNP = values.filter(v => v === 'NP').length;

  // 🚨 Rule 1: Any "1" = FAIL
  if (numFails > 0) {
    return 'fail';
  }

  // 🚨 Rule 2: More than two "2"s = FAIL (NEW RULE)
  if (numTwos > 2) {
    return 'fail';
  }

  // 🚨 Rule 3: Required task with any NP = Incomplete
  if (isRequired && numNP > 0) {
    return 'incomplete';
  }

  // 🚨 Rule 4: Optional task with all NP = Not Performed
  if (!isRequired && numNP === values.length) {
    return 'not-required';
  }

  // ✅ Otherwise PASS
  return 'pass';
}

export function summarizeTasks(tasks) {
  const statuses = tasks.map(task => ({ task, status: calculateTaskStatus(task), grades: getTaskGrades(task) }));
  const required = statuses.filter(row => row.task.isRequired);
  const failed = statuses.filter(row => row.status === 'fail');
  const incomplete = required.filter(row => row.status === 'incomplete');
  const passedRequired = required.filter(row => row.status === 'pass');
  const evaluatedElements = statuses.reduce((sum, row) => sum + Object.values(row.grades).filter(isNumericGrade).length, 0);
  const totalElements = required.length * 3;
  const overall = failed.length ? 'UNSATISFACTORY' : incomplete.length ? 'INCOMPLETE' : 'SATISFACTORY';

  return {
    statuses,
    totalRequiredTasks: required.length,
    passedRequiredTasks: passedRequired.length,
    failedTasks: failed.length,
    incompleteRequiredTasks: incomplete.length,
    totalElements,
    evaluatedElements,
    progressPct: totalElements ? Math.round((passedRequired.length / required.length) * 100) : 0,
    overall
  };
}

export function averageGrade(tasks, type) {
  const values = tasks.map(t => getGrade(t.filterCode, type)).filter(isNumericGrade).map(Number);
  if (!values.length) return '--';
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}
