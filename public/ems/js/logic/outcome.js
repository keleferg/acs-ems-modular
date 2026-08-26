export function determinePracticalTestOutcome(summary) {
  if (summary.failedTasks > 0) return 'unsatisfactory';
  if (summary.incompleteRequiredTasks > 0) return 'discontinuance';
  return 'satisfactory';
}
