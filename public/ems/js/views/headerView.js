import { CERT_CONFIG } from '../config/config.js';
import { getAvailableHeldRatings, getFilterMessage } from '../logic/filtering.js';

const $ = id => document.getElementById(id);

export function bindApplicantForm(store, handlers) {
  Object.keys(store.applicant).forEach(id => {
    const el = $(id);
    if (!el) return;

    el.value = store.applicant[id] ?? '';

    el.addEventListener('input', event =>
      handlers.onApplicantChange(id, event.target.value)
    );

    el.addEventListener('change', event =>
      handlers.onApplicantChange(id, event.target.value)
    );
  });
}

export function renderHeader(store) {
  const cert = store.applicant.appCertificate;
  const rating = store.applicant.appRating;
  const cfg = CERT_CONFIG[cert];

  if (!cfg) return;

  $('pageSubtitle').textContent = `${cfg.label} ACS (${cfg.acs})`;
  $('sidebarRating').textContent = `${cfg.label} ${formatRating(rating)}`;

  renderRatingDropdown(store, cfg);
  renderAdditionalRatingFields(store, cert);

  const banner = $('filterBanner');
  const message = getFilterMessage(store.applicant);

  banner.style.display = message ? 'block' : 'none';
  banner.innerHTML = message
    ? `
      <div class="banner-row">
        <div>
          <strong>${message}</strong>
          <div class="filter-detail">
            Logic: required additional-rating tasks must be graded; non-required tasks remain Not Performed unless graded.
            Any failed task, required or optional, makes the overall outcome unsatisfactory.
          </div>
        </div>
      </div>
    `
    : '';
}

function renderRatingDropdown(store, cfg) {
  const ratingSelect = $('appRating');
  if (!ratingSelect) return;

  const currentRating = store.applicant.appRating || ratingSelect.value;

  ratingSelect.innerHTML = cfg.ratings
    .map(r => `<option value="${r}">${formatRating(r)}</option>`)
    .join('');

  const selectedRating = cfg.ratings.includes(currentRating)
    ? currentRating
    : cfg.ratings[0];

  ratingSelect.value = selectedRating;
  store.applicant.appRating = selectedRating;
}

function renderAdditionalRatingFields(store, cert) {
  const isAdditional = store.applicant.appExamType === 'Additional';
  const rating = store.applicant.appRating;

  const ratingHeldGroup = $('ratingHeldGroup');
  const amelInstrumentGroup = $('amelInstrumentGroup');

  if (ratingHeldGroup) {
    ratingHeldGroup.classList.toggle('hidden', !isAdditional);
  }

  /*
    Show AME Instrument Privileges dropdown when:
    1. Airplane multiengine rating is selected for an additional rating, OR
    2. Instrument Airplane additional rating is selected.

    This supports:
    - Private/Commercial AMEL additional tests
    - Instrument Airplane additional tests from Instrument Helicopter
  */
  const showAmeInstrument =
    isAdditional &&
    (
      rating === 'AMEL' ||
      (
        cert === 'Instrument' &&
        rating === 'Instrument Airplane'
      )
    );

  if (amelInstrumentGroup) {
    amelInstrumentGroup.classList.toggle('hidden', !showAmeInstrument);
  }

  renderHeldRatingDropdown(store, cert, rating, isAdditional);
}

function renderHeldRatingDropdown(store, cert, rating, isAdditional) {
  const heldSelect = $('appRatingHeld');
  if (!heldSelect) return;

  if (!isAdditional) {
    heldSelect.innerHTML = `<option value="">Select...</option>`;
    heldSelect.value = '';
    store.applicant.appRatingHeld = '';
    return;
  }

  const heldOptions = getAvailableHeldRatings(cert, rating);

  heldSelect.innerHTML =
    `<option value="">Select...</option>` +
    heldOptions
      .map(r => `<option value="${r}">${formatHeldRating(r)}</option>`)
      .join('');

  if (heldOptions.includes(store.applicant.appRatingHeld)) {
    heldSelect.value = store.applicant.appRatingHeld;
  } else {
    heldSelect.value = '';
    store.applicant.appRatingHeld = '';
  }
}

function formatRating(value) {
  const labels = {
    ASEL: 'ASEL',
    ASES: 'ASES',
    AMEL: 'AMEL',
    AMES: 'AMES',
    GLIDER: 'Glider',
    'Instrument Airplane': 'Instrument Airplane'
  };

  return labels[value] ?? value;
}

function formatHeldRating(value) {
  const labels = {
    RH: 'Rotorcraft Helicopter',
    RG: 'Rotorcraft Gyroplane',
    GLIDER: 'Glider',
    BALLOON: 'Balloon',
    AIRSHIP: 'Airship',
    PL: 'Powered Lift',
    ASEL: 'ASEL',
    ASES: 'ASES',
    AMEL: 'AMEL',
    AMES: 'AMES',
    'Instrument Helicopter': 'Instrument Helicopter'
  };

  return labels[value] ?? value;
}

export function renderStats(summary, averages) {
  $('statTotal').textContent = summary.totalElements;
  $('statEvaluated').textContent = summary.evaluatedElements;
  $('statPassed').textContent = `${summary.passedRequiredTasks}/${summary.totalRequiredTasks}`;
  $('statOverall').innerHTML = statusBadge(summary.overall);
  $('summOverall').outerHTML = statusBadge(summary.overall, 'summOverall');
  $('summPassed').textContent = summary.passedRequiredTasks;
  $('summFailed').textContent = summary.failedTasks;
  $('summAvgK').textContent = averages.K;
  $('summAvgR').textContent = averages.R;
  $('summAvgS').textContent = averages.S;
  $('progressPct').textContent = `${summary.progressPct}%`;
  $('progressFill').style.width = `${summary.progressPct}%`;
}

function statusBadge(status, id = '') {
  const cls =
    status === 'SATISFACTORY'
      ? 'badge-pass'
      : status === 'UNSATISFACTORY'
        ? 'badge-fail'
        : 'badge-incomplete';

  return `<span ${id ? `id="${id}"` : ''} class="summary-badge ${cls}">${status}</span>`;
}