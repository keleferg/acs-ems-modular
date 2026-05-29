import { CHECKLIST_DATA } from '../data/checklists.js';

export function renderChecklists(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="checklists-container">
      ${CHECKLIST_DATA.map((section, sectionIndex) => `
        <div class="checklist-section open" data-checklist-section="${sectionIndex}">
          <div class="checklist-header">
            <div class="checklist-header-left">
              <i class="fas ${section.icon || 'fa-list-check'} section-icon"></i>
              <h3>${escapeHtml(section.title)}</h3>
            </div>

            <div class="checklist-header-right">
              <span class="checklist-progress" data-checklist-progress="${sectionIndex}">
                0/${section.items.length}
              </span>
              <span class="checklist-status-icon" data-checklist-status="${sectionIndex}">
                <i class="fas fa-circle"></i>
              </span>
              <i class="fas fa-chevron-down checklist-chevron"></i>
            </div>
          </div>

          <div class="checklist-body">
            <div class="checklist-items">
              ${section.items.map((item, itemIndex) => `
                <div class="checklist-item">
                  <input
                    type="checkbox"
                    data-checklist-check="${sectionIndex}"
                    id="checklist_${sectionIndex}_${itemIndex}"
                  />
                  <label for="checklist_${sectionIndex}_${itemIndex}">
                    ${escapeHtml(getChecklistItemText(item))}
                  </label>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  bindChecklistCheckboxes(container);
  updateChecklistSectionStatus(container);
}

export function renderEligibility(container, applicant = {}, store = {}) {
  if (!container) return;

  const certificate = applicant.appCertificate || 'Private';
  const rating = applicant.appRating || '';
  const examType = applicant.appExamType || 'Initial';

  const eligibilityData = getEligibilityRequirements(certificate, rating, examType);
  const experienceData = getAeronauticalExperienceRequirements(certificate, rating, examType);
  const endorsementData = getRequiredEndorsements(certificate, rating, examType);

  container.innerHTML = `
    <div class="eligibility-card">
      <h3><i class="fas fa-certificate"></i> Eligibility</h3>

      ${renderEligibilitySection('eligibility_requirements', eligibilityData, store)}
      ${renderEligibilitySection('aeronautical_experience', experienceData, store)}
      ${renderEligibilitySection('required_endorsements', endorsementData, store)}
    </div>
  `;

  bindEligibility(container, store);
  updateEligibilityStatus(container);
}

/* =========================
   ELIGIBILITY DATA
========================= */

function getEligibilityRequirements(cert, rating, type) {
  if (type === 'Additional') {
    return {
      title: 'Eligibility Requirements',
      reference: '14 CFR §61.63',
      items: [
        { text: 'Verify applicant holds the appropriate pilot certificate for the additional rating sought.' },
        { text: 'Verify applicant has received required training from an authorized instructor.' },
        { text: 'Verify applicant has received required endorsement for the practical test.' },
        { text: 'Verify knowledge test report, if required.' },
        { text: 'Verify IACRA / application is complete and accurate.' },
        { text: 'Verify government-issued photo identification.' },
        { text: 'Verify pilot certificate.' },
        { text: 'Verify medical certificate or BasicMed qualification, if applicable.' }
      ]
    };
  }

  if (cert === 'Private') {
    return {
      title: 'Eligibility Requirements',
      reference: '14 CFR §61.103',
      items: [
        { text: 'Be at least 17 years of age' },
        { text: 'Be able to read, speak, write, and understand the English language.' },
        { text: 'Receive a logbook endorsement from an authorized instructor who conducted the training or reviewed the applicant’s home study.' },
        { text: 'Pass the required knowledge test (PAR).' },
        { text: 'Receive flight training and a logbook endorsement from an authorized instructor.' },
        { text: 'Meet the aeronautical experience requirements for the aircraft rating sought.' },
        { text: 'Pass the practical test.' },
        { text: 'Verify IACRA / application is complete and accurate.' },
        { text: 'Verify government-issued photo identification.' }
      ]
    };
  }

  if (cert === 'Instrument') {
    return {
      title: 'Eligibility Requirements',
      reference: '14 CFR §61.65',
      items: [
        { text: 'Hold at least a private pilot certificate or be concurrently applying for a private pilot certificate.' },
        { text: 'Be able to read, speak, write, and understand the English language.' },
        { text: 'Receive and log required ground training or complete an authorized home-study course.' },
        { text: 'Receive required logbook or training record endorsement for the knowledge test.' },
        { text: 'Pass the required instrument knowledge test, unless exempt.' },
        { text: 'Receive and log required instrument flight training from an authorized instructor.' },
        { text: 'Receive endorsement certifying preparation for the practical test.' },
        { text: 'Verify IACRA / application is complete and accurate.' }
      ]
    };
  }

  if (cert === 'Commercial') {
    return {
      title: 'Eligibility Requirements',
      reference: '14 CFR §61.123',
      items: [
        { text: 'Be at least 18 years of age.' },
        { text: 'Be able to read, speak, write, and understand the English language.' },
        { text: 'Hold at least a private pilot certificate.' },
        { text: 'Meet the applicable aeronautical experience requirements.' },
        { text: 'Pass the required knowledge test.' },
        { text: 'Receive required training and logbook endorsements.' },
        { text: 'Pass the practical test.' },
        { text: 'Verify IACRA / application is complete and accurate.' }
      ]
    };
  }

  if (cert === 'ATP') {
    return {
      title: 'Eligibility Requirements',
      reference: '14 CFR §61.153',
      items: [
        { text: 'Be at least 23 years of age. (21 for Restricted ATP)' },
        { text: 'Meet applicable age requirements.' },
        { text: 'Be able to read, speak, write, and understand the English language.' },
        { text: 'Be of good moral character.' },
        { text: 'Hold a commercial pilot certificate with an instrument rating.' },
        { text: 'Meet applicable aeronautical experience requirements.' },
        { text: 'Pass the ATP knowledge test.' },
        { text: 'Pass the ATP practical test.' },
        { text: 'Verify IACRA / application is complete and accurate.' }
      ]
    };
  }

  if (cert === 'CFI') {
    return {
      title: 'Eligibility Requirements',
      reference: '14 CFR §61.183',
      items: [
        { text: 'Be at least 18 years of age.' },
        { text: 'Be able to read, speak, write, and understand the English language.' },
        { text: 'Hold either a commercial pilot certificate or airline transport pilot certificate.' },
        { text: 'Hold an instrument rating if applying for an airplane flight instructor rating.' },
        { text: 'Receive and log ground training on the fundamentals of instruction, if required.' },
        { text: 'Pass required knowledge tests.' },
        { text: 'Receive required logbook endorsements.' },
        { text: 'Pass the practical test.' },
        { text: 'Verify IACRA / application is complete and accurate.' }
      ]
    };
  }

  return {
    title: 'Eligibility Requirements',
    reference: 'Applicable 14 CFR Part 61 requirements',
    items: [
      { text: 'Verify applicable eligibility requirements.' },
      { text: 'Verify applicant identity.' },
      { text: 'Verify certificates and ratings held.' },
      { text: 'Verify endorsements.' },
      { text: 'Verify IACRA / application is complete.' }
    ]
  };
}

function getAeronauticalExperienceRequirements(cert, rating, type) {
  if (type === 'Additional') {
    return {
      title: 'Aeronautical Experience Requirements',
      reference: '14 CFR §61.63',
      items: [
        { text: 'Verify required training for the additional aircraft category, class, or type rating sought.' },
        { text: 'Verify applicant has received training in the areas of operation required for the rating sought.' },
        { text: 'Verify applicant has received required instructor endorsement for the practical test.' },
        { text: 'Verify any required aeronautical experience specific to the additional rating sought.' },
        { text: 'Verify no knowledge test is required unless specifically required by regulation.' },
        { text: 'Verify the applicant is prepared for the required practical test.' }
      ]
    };
  }

  if (cert === 'Private' && rating === 'ASEL') {
    return {
      title: 'Aeronautical Experience Requirements',
      reference: '14 CFR §61.109(a)',
      items: [
        { text: 'At least 40 hours of flight time.', indent: 0 },

        { text: 'At least 20 hours of flight training from an authorized instructor.', indent: 1 },
        { text: '3 hours of cross-country flight training in a single-engine airplane.', indent: 2 },
        { text: '3 hours of night flight training in a single-engine airplane.', indent: 2 },
        { text: 'One night cross-country flight over 100 nautical miles total distance.', indent: 3 },
        { text: '10 takeoffs and 10 landings to a full stop at an airport.', indent: 3 },
        { text: '3 hours of flight training in a single-engine airplane on the control and maneuvering of an airplane solely by reference to instruments, including straight-and-level flight, constant airspeed climbs and descents, turns to a heading, recovery from unusual flight attitudes, radio communications, and the use of navigation systems/facilities and radar services appropriate to instrument flight.', indent: 2 },
        { text: '3 hours of flight training within the preceding 2 calendar months in preparation for the practical test.', indent: 2 },

        { text: 'At least 10 hours of solo flight time in a single-engine airplane.', indent: 1 },
        { text: '5 hours of solo cross-country time.', indent: 2 },
        { text: 'One solo cross-country flight of 150 nautical miles total distance.', indent: 3 },
        { text: 'Full-stop landings at three points.', indent: 4 },
        { text: 'One segment of the flight consisting of a straight-line distance of more than 50 nautical miles between the takeoff and landing locations.', indent: 4 },
        { text: 'Three takeoffs and three landings to a full stop, with each landing involving a flight in the traffic pattern, at an airport with an operating control tower.', indent: 2 }
      ]
    };
  }

  return {
    title: 'Aeronautical Experience Requirements',
    reference: 'Applicable 14 CFR Part 61 requirements',
    items: [
      { text: 'Verify applicable aeronautical experience requirements.' },
      { text: 'Verify required training.' },
      { text: 'Verify required endorsements.' },
      { text: 'Verify practical test preparation.' }
    ]
  };
}

function getRequiredEndorsements(cert, rating, type) {
  if (cert === 'Private' && rating === 'ASEL' && type === 'Initial') {
    return {
      title: 'Required Endorsements',
      reference: 'AC 61-65K',
      items: [
        { text: 'A.1 — Pre-Solo Aeronautical Knowledge — §61.87(b)' },
        { text: 'A.2 — Pre-Solo Flight Training — §61.87(c)' },
        { text: 'A.3 — Solo Flight (First Solo) — §61.87(n)' },
        { text: 'A.4 — Solo Flight (90-Day Renewal) — §61.87(p)' },
        { text: 'A.5 — Solo Cross-Country Training — §61.93(c)(1),(2)' },
        { text: 'A.6 — Solo Cross-Country Authorization — §61.93(c)(3)' },
        { text: 'A.7 — Repeated Solo Cross-Country Authorization — §61.93(b)(2)' },
        { text: 'A.8 — Solo Flight in Class B Airspace — §61.95(a)' },
        { text: 'A.9 — Operations in Class B, C, and D Airspace — §61.95(b)' },
        { text: 'A.34 — Aeronautical Knowledge Test — §61.35(a)(1), §61.103(d), §61.105' },
        { text: 'A.35 — Review of Knowledge Test Deficiencies — §61.39(a)(6)(i)' },
        { text: 'A.36 — Flight Training Received (Within 2 Calendar Months) — §61.39(a)(6)(ii)' },
        { text: 'A.37 — Practical Test — §61.103(f), §61.107(b), §61.109' }
      ]
    };
  }

  if (type === 'Additional') {
    return {
      title: 'Required Endorsements',
      reference: 'AC 61-65K / 14 CFR §61.63',
      items: [
        { text: 'A.76 — To act as PIC of an aircraft in solo operations when the pilot does not hold an appropriate category/class rating — §61.39(d)(2)' },
        { text: 'A.78 — Additional aircraft category or class rating (other than ATP) — §61.63(b) or (c)' },
            ]
    };
  }

  return {
    title: 'Required Endorsements',
    reference: 'AC 61-65K',
    items: [
      { text: 'Verify all applicable endorsements per AC 61-65K for the certificate, rating, and exam type selected.' },
      { text: 'Prerequisites for practical test endorsement — §61.39(a)(6)(i) and (ii).' },
      { text: 'Review of deficiencies on airman knowledge test endorsement — §61.39(a)(6)(iii), if applicable.' }
    ]
  };
}

/* =========================
   RENDERING
========================= */

function renderEligibilitySection(id, data, store) {
  const total = data.items.length;

  const isOpen =
    store.expandedEligibilitySections?.[id] !== false;

  return `
    <div class="checklist-section ${isOpen ? 'open' : ''} elig-section" data-section="${id}">
      <div class="checklist-header elig-header">
        <div class="checklist-header-left">
          <i class="fas fa-list-check section-icon"></i>
          <h3>
            ${escapeHtml(data.title)}
            <span style="display:block;font-size:0.68rem;color:var(--text-muted);font-weight:500;margin-top:3px;">
              ${escapeHtml(data.reference)}
            </span>
          </h3>
        </div>

        <div class="checklist-header-right">
          <span class="checklist-progress" data-progress="${id}">
            0/${total}
          </span>
          <span class="checklist-status-icon" data-status="${id}">
            <i class="fas fa-circle"></i>
          </span>
          <i class="fas fa-chevron-down checklist-chevron"></i>
        </div>
      </div>

      <div class="checklist-body elig-body">
        <div class="checklist-items">
          ${data.items.map((item, index) =>
            renderEligibilityItem(id, index, item, store)
          ).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderEligibilityItem(sectionId, index, item, store) {
  const indent = Number(item.indent || 0);

  const key = `${sectionId}_${index}`;

  const checked =
    store.eligibilityChecks?.[key] === true;

  return `
    <div
      class="elig-item ${checked ? 'checked' : ''}"
      style="margin-left:${indent * 24}px"
    >
      <input
        type="checkbox"
        data-check="${sectionId}"
        data-check-key="${key}"
        id="${key}"
        ${checked ? 'checked' : ''}
      />
      <label for="${key}">
        ${escapeHtml(item.text)}
      </label>
    </div>
  `;
}

/* =========================
   LOGIC
========================= */

function bindEligibility(container, store) {
  container.querySelectorAll('.elig-header').forEach(header => {
    header.addEventListener('click', event => {
      if (event.target.closest('input,label')) return;

      const section =
        header.closest('.elig-section');

      section?.classList.toggle('open');

      const sectionId =
        section?.dataset.section;

      if (sectionId) {
        store.expandedEligibilitySections ??= {};

        store.expandedEligibilitySections[sectionId] =
          section.classList.contains('open');
      }
    });
  });

  container.querySelectorAll('[data-check]').forEach(box => {
    box.addEventListener('change', () => {
      const key = box.dataset.checkKey;

      store.eligibilityChecks ??= {};
      store.eligibilityChecks[key] = box.checked;

      box.closest('.elig-item')
        ?.classList.toggle('checked', box.checked);

      updateEligibilityStatus(container);
    });
  });
}

function updateEligibilityStatus(container) {
  const sections = [...container.querySelectorAll('[data-section]')];

  let allComplete = sections.length > 0;

  sections.forEach(section => {
    const id = section.dataset.section;
    const boxes = [...section.querySelectorAll(`[data-check="${id}"]`)];
    const checked = boxes.filter(box => box.checked).length;
    const complete = boxes.length > 0 && checked === boxes.length;

    const progress = section.querySelector(`[data-progress="${id}"]`);
    const status = section.querySelector(`[data-status="${id}"]`);

    if (progress) {
      progress.textContent = `${checked}/${boxes.length}`;
    }

    if (status) {
      status.innerHTML = complete
        ? '<i class="fas fa-check-circle"></i>'
        : '<i class="fas fa-circle"></i>';

      status.classList.toggle('complete', complete);
    }

    section.classList.toggle('elig-section-complete', complete);
    section.style.borderLeft = complete ? '4px solid #22c55e' : '4px solid transparent';

    if (!complete) allComplete = false;
  });

  const tab = document.querySelector('.view-tab[data-view="eligibility"]');

  if (tab) {
    tab.classList.toggle('tab-complete', allComplete);
    tab.innerHTML = allComplete
      ? '<i class="fas fa-check-circle"></i> Eligibility'
      : '<i class="fas fa-certificate"></i> Eligibility';
  }
}

/* =========================
   REQUIRED BRIEFINGS LOGIC
========================= */

function getChecklistItemText(item) {
  if (typeof item === 'string') return item;
  return item.text || item.label || item.title || '';
}

function bindChecklistCheckboxes(container) {
  container.querySelectorAll('.checklist-header').forEach(header => {
    header.addEventListener('click', event => {
      if (event.target.closest('input,label')) return;
      header.closest('.checklist-section')?.classList.toggle('open');
    });
  });

  container.querySelectorAll('[data-checklist-check]').forEach(box => {
    box.addEventListener('change', () => {
      box.closest('.checklist-item')?.classList.toggle('checked', box.checked);
      updateChecklistSectionStatus(container);
    });
  });
}

function updateChecklistSectionStatus(container) {
  container.querySelectorAll('[data-checklist-section]').forEach(section => {
    const id = section.dataset.checklistSection;
    const boxes = [...section.querySelectorAll('[data-checklist-check]')];
    const checked = boxes.filter(box => box.checked).length;
    const complete = boxes.length > 0 && checked === boxes.length;

    const progress = section.querySelector(`[data-checklist-progress="${id}"]`);
    const status = section.querySelector(`[data-checklist-status="${id}"]`);

    if (progress) {
      progress.textContent = `${checked}/${boxes.length}`;
    }

    if (status) {
      status.innerHTML = complete
        ? '<i class="fas fa-check-circle"></i>'
        : '<i class="fas fa-circle"></i>';

      status.classList.toggle('complete', complete);
    }

    section.classList.toggle('checklist-section-complete', complete);
  });

  updateRequiredBriefingsTabStatus(container);
}

function updateRequiredBriefingsTabStatus(container) {
  const allSections = [...container.querySelectorAll('[data-checklist-section]')];

  const allComplete =
    allSections.length > 0 &&
    allSections.every(section =>
      section.classList.contains('checklist-section-complete')
    );

  const checklistTab = document.querySelector('.view-tab[data-view="checklists"]');

  if (checklistTab) {
    checklistTab.classList.toggle('tab-complete', allComplete);

    checklistTab.innerHTML = allComplete
      ? '<i class="fas fa-check-circle"></i> Required Briefings'
      : '<i class="fas fa-clipboard-check"></i> Required Briefings';
  }
}

/* =========================
   HELPERS
========================= */

function formatRatingLabel(rating) {
  const labels = {
    ASEL: 'ASEL',
    ASES: 'ASES',
    AMEL: 'AMEL',
    AMES: 'AMES',
    GLIDER: 'Glider',
    'Instrument Airplane': 'Instrument Airplane'
  };

  return labels[rating] || rating;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}