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

  const statuses = tasks.map(task => ({

    task,

    status: calculateTaskStatus(task),

    grades: getTaskGrades(task)

  }));

  const required =
    statuses.filter(row => row.task.isRequired);

  const failed =
    statuses.filter(row => row.status === 'fail');

  const incomplete =
    required.filter(
      row => row.status === 'incomplete'
    );

  const passedRequired =
    required.filter(
      row => row.status === 'pass'
    );

  /*
   * Each alternative group is attached to every task
   * participating in that group. Collapse by group ID.
   */
  const alternativeGroupMap = new Map();

  tasks.forEach(task => {

    (
      task.alternativeRequirementGroups || []
    ).forEach(group => {

      if (group?.id) {
        alternativeGroupMap.set(
          group.id,
          group
        );
      }

    });

  });

  const statusByCode = new Map(
    statuses.map(row => [
      row.task.filterCode,
      row
    ])
  );

  const alternativeRequirements =
    Array
      .from(alternativeGroupMap.values())
      .map(group => {

        const options =
          Array.isArray(group.options)
            ? group.options
            : [];

        const optionStatuses =
          options.map(option => {

            const codes =
              Array.isArray(option)
                ? option
                : [];

            const complete =
              codes.length > 0 &&
              codes.every(code => {

                const row =
                  statusByCode.get(code);

                if (!row) {
                  return false;
                }

                const allElementsEvaluated =
                  Object
                    .values(row.grades)
                    .every(isNumericGrade);

                return (
                  allElementsEvaluated &&
                  row.status !== 'fail'
                );

              });

            return {
              codes,
              complete
            };

          });

        const satisfiedOptionIndex =
          optionStatuses.findIndex(
            option => option.complete
          );

        return {

          ...group,

          optionStatuses,

          satisfied:
            satisfiedOptionIndex >= 0,

          satisfiedOptionIndex

        };

      });

  const incompleteAlternativeGroups =
    alternativeRequirements.filter(
      group => !group.satisfied
    );

  const satisfiedAlternativeGroups =
    alternativeRequirements.filter(
      group => group.satisfied
    );

  const evaluatedElements =
    statuses.reduce(
      (sum, row) =>
        sum +
        Object
          .values(row.grades)
          .filter(isNumericGrade)
          .length,
      0
    );

  /*
   * Each alternative group counts as one FAA
   * completion requirement.
   */
  const totalRequirementUnits =
    required.length +
    alternativeRequirements.length;

  const passedRequirementUnits =
    passedRequired.length +
    satisfiedAlternativeGroups.length;

  const alternativeElementMinimum =
    alternativeRequirements.reduce(
      (sum, group) => {

        const lengths =
          (group.options || [])

            .filter(option =>
              Array.isArray(option) &&
              option.length > 0
            )

            .map(option =>
              option.length
            );

        if (!lengths.length) {
          return sum;
        }

        return (
          sum +
          Math.min(...lengths) * 3
        );

      },
      0
    );

  const totalElements =
    required.length * 3 +
    alternativeElementMinimum;

  const overall =

    failed.length

      ? 'UNSATISFACTORY'

      : (
          incomplete.length ||
          incompleteAlternativeGroups.length
        )

        ? 'INCOMPLETE'

        : 'SATISFACTORY';

  return {

    statuses,

    totalRequiredTasks:
      totalRequirementUnits,

    passedRequiredTasks:
      passedRequirementUnits,

    failedTasks:
      failed.length,

    incompleteRequiredTasks:
      incomplete.length +
      incompleteAlternativeGroups.length,

    alternativeRequirements,

    incompleteAlternativeGroups,

    satisfiedAlternativeGroups,

    totalElements,

    evaluatedElements,

    progressPct:
      totalRequirementUnits

        ? Math.round(
            (
              passedRequirementUnits /
              totalRequirementUnits
            ) * 100
          )

        : 0,

    overall

  };

}

export function averageGrade(tasks, type) {
  const values = tasks.map(t => getGrade(t.filterCode, type)).filter(isNumericGrade).map(Number);
  if (!values.length) return '--';
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}
