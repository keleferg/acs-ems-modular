import { ADDITIONAL_MAPS } from '../config/config.js';

export function getFlatTasks(areas = []) {
  return areas.flatMap(area =>
    area.tasks.map(task => ({
      ...task,
      areaId: area.id,
      areaTitle: area.title,
      areaRoman: area.roman,
      phase: area.phase
    }))
  );
}

export function taskAppliesToRating(task, rating) {
  if (!Array.isArray(task.ratings) || task.ratings.length === 0) {
    return true;
  }

  return task.ratings.includes(rating);
}

export function getAdditionalKey(applicant) {
  if (applicant.appExamType !== 'Additional' || !applicant.appRatingHeld) {
    return null;
  }

  return `${applicant.appRating}_from_${applicant.appRatingHeld}`;
}

export function getRequiredAdditionalCodes(applicant) {
  const key = getAdditionalKey(applicant);

  if (!key) {
    return null;
  }

  return new Set(
    ADDITIONAL_MAPS?.[applicant.appCertificate]?.[key] ?? []
  );
}

export function getAvailableHeldRatings(certificate, rating) {
  const maps = ADDITIONAL_MAPS?.[certificate] ?? {};
  const prefix = `${rating}_from_`;

  return Object.keys(maps)
    .filter(key => key.startsWith(prefix))
    .map(key => key.replace(prefix, ''))
    .sort();
}

function normalizeTaskCode(area, task) {
  const rawCode = task.filterCode || `${area.id}_${task.id}`;

  return rawCode
    .replace('CA.', '')
    .replace('PA.', '')
    .replace('IR.', '')
    .replaceAll('.', '_')
    .toUpperCase();
}

function shouldRemoveForAmeInstrumentPrivileges(applicant, code) {
  /*
    Instrument Rating Airplane Additional:

    If AME Instrument Privileges is selected as "No",
    remove:
    - VII_C Instrument Approach and Landing with an Inoperative Engine
    - VII_D Approach with Loss of Primary Flight Instrument Indicators
  */
  if (
    applicant.appCertificate === 'Instrument' &&
    applicant.appRating === 'Instrument Airplane' &&
    applicant.appExamType === 'Additional' &&
    applicant.appAmelInstrument === 'No' &&
    ['VII_C', 'VII_D'].includes(code)
  ) {
    return true;
  }

  return false;
}

function shouldMakeNotRequiredForAmeInstrumentPrivileges(applicant, code) {
  /*
    Airplane Multiengine Additional:

    If AME Instrument Privileges is selected as "No",
    keep the tasks visible but mark these as not required:
    - X_C
    - X_D
  */
  if (
    applicant.appRating === 'AMEL' &&
    applicant.appAmelInstrument === 'No' &&
    ['X_C', 'X_D'].includes(code)
  ) {
    return true;
  }

  return false;
}

export function buildVisibleAreas(areas, applicant) {
  const requiredSet = getRequiredAdditionalCodes(applicant);
  const isAdditional = applicant.appExamType === 'Additional';

  return areas
    .map(area => {
      const tasks = area.tasks
        .map(task => {
          const code = normalizeTaskCode(area, task);

          if (shouldRemoveForAmeInstrumentPrivileges(applicant, code)) {
            return null;
          }

          const appliesToRating = taskAppliesToRating(
            task,
            applicant.appRating
          );

          let isRequired = isAdditional
            ? requiredSet
              ? requiredSet.has(code)
              : false
            : appliesToRating;

          if (shouldMakeNotRequiredForAmeInstrumentPrivileges(applicant, code)) {
            isRequired = false;
          }

          /*
            Initial-rating logic:

            For an Initial practical test, show ONLY tasks that apply to the
            selected rating/class. Example: Private / ASEL / Initial should
            only show tasks tagged ASEL, plus untagged common tasks.

            Additional-rating logic:

            For Additional ratings, show tasks that normally apply to the
            selected rating OR tasks specifically required by the FAA
            additional-rating table.

            Special Instrument Additional exception:

            If AME Instrument Privileges = No, VII_C and VII_D are removed
            before this display logic is applied.
          */
          const shouldShow = isAdditional
            ? appliesToRating || isRequired
            : appliesToRating;

          if (!shouldShow) {
            return null;
          }

          return {
            ...task,
            areaId: area.id,
            areaTitle: area.title,
            areaRoman: area.roman,
            phase: area.phase,
            filterCode: code,
            isRequired,
            isAdditional
          };
        })
        .filter(Boolean);

      return {
        ...area,
        tasks
      };
    })
    .filter(area => area.tasks.length > 0);
}

export function getFilterMessage(applicant) {
  if (applicant.appExamType !== 'Additional') {
    return '';
  }

  if (!applicant.appRatingHeld) {
    return 'Select the rating already held to activate additional-rating task filtering.';
  }

  const required = getRequiredAdditionalCodes(applicant);

  if (!required || required.size === 0) {
    return `No additional-rating map found for ${applicant.appRating} from ${applicant.appRatingHeld}.`;
  }

  if (
    applicant.appCertificate === 'Instrument' &&
    applicant.appRating === 'Instrument Airplane' &&
    applicant.appAmelInstrument === 'No'
  ) {
    return `Additional Rating Filter: ${applicant.appRating} from ${applicant.appRatingHeld}. AME Instrument Privileges: No — Area VII Tasks C and D are removed.`;
  }

  return `Additional Rating Filter: ${applicant.appRating} from ${applicant.appRatingHeld}. Required tasks are green; non-required tasks may be graded, but ungraded NP tasks will not make the area incomplete.`;
}