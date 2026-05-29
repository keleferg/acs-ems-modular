export function renderScenarioEngine(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div class="scenario-engine">
      <h2>DPE Scenario Engine</h2>
      <p>Generate a scenario-based oral exam tied to ACS task areas.</p>

      <div class="scenario-controls">
        <label>
          Certificate
          <select id="scenarioCertificate">
            <option value="Private">Private Pilot</option>
            <option value="Instrument">Instrument Rating</option>
            <option value="Commercial">Commercial Pilot</option>
          </select>
        </label>

        <label>
          Scenario
          <select id="scenarioType">
            <option value="xc">Cross-Country Planning</option>
            <option value="weather">Weather / ADM</option>
            <option value="systems">Aircraft Systems</option>
            <option value="emergency">Emergency / Abnormal</option>
            <option value="dpe">Full DPE Mode</option>
          </select>
        </label>

        <button class="btn" id="generateScenarioBtn">
          Generate Oral Exam
        </button>
      </div>

      <div id="scenarioOutput" class="scenario-output"></div>
    </div>
  `;

  document.getElementById('generateScenarioBtn')?.addEventListener('click', generateScenario);
}

function generateScenario() {
  const cert = document.getElementById('scenarioCertificate')?.value || 'Private';
  const type = document.getElementById('scenarioType')?.value || 'xc';
  const output = document.getElementById('scenarioOutput');

  if (!output) return;

  const questions = getScenarioQuestions(cert, type);

  output.innerHTML = `
    <h3>${cert} — ${labelScenario(type)}</h3>

    <div class="scenario-card">
      <h4>Scenario Setup</h4>
      <p>${getScenarioSetup(cert, type)}</p>
    </div>

    <div class="scenario-card">
      <h4>Oral Exam Questions</h4>
      ${questions.map((q, index) => `
        <div class="scenario-question">
          <strong>${index + 1}. ${q.code}</strong>
          <p>${q.question}</p>
          <details>
            <summary>Expected Answer / Evaluation Notes</summary>
            <p>${q.answer}</p>
          </details>
        </div>
      `).join('')}
    </div>
  `;
}

function labelScenario(type) {
  const labels = {
    xc: 'Cross-Country Planning',
    weather: 'Weather / ADM',
    systems: 'Aircraft Systems',
    emergency: 'Emergency / Abnormal',
    dpe: 'Full DPE Mode'
  };

  return labels[type] || type;
}

function getScenarioSetup(cert, type) {
  const setups = {
    Private: {
      xc: 'The applicant has planned a day VFR cross-country flight with marginal weather, changing winds aloft, and a destination near controlled airspace.',
      weather: 'The applicant is preparing for a local VFR flight with lowering ceilings, gusty winds, and possible convective activity nearby.',
      systems: 'During preflight, the applicant discovers an aircraft system discrepancy and must determine airworthiness and risk.',
      emergency: 'During cruise flight, the aircraft develops an abnormal indication requiring troubleshooting, diversion planning, and passenger management.',
      dpe: 'Conduct a full Private Pilot oral scenario beginning with eligibility, aircraft documents, weather, cross-country planning, airspace, performance, systems, risk management, and emergency decision-making.'
    },
    Instrument: {
      xc: 'The applicant has filed an IFR cross-country with forecast marginal ceilings, an alternate requirement, and multiple approach options at destination.',
      weather: 'The applicant is evaluating IFR weather including ceilings, visibility, icing risk, thunderstorms, and alternate minimums.',
      systems: 'During an IFR flight, the applicant experiences an instrument or navigation system abnormality requiring workload management and decision-making.',
      emergency: 'The applicant is cleared for an approach, goes missed, and then experiences a communications or navigation abnormality.',
      dpe: 'Conduct a full Instrument Rating oral scenario covering IFR regulations, weather interpretation, flight planning, clearances, lost communications, holds, approaches, alternates, and risk management.'
    },
    Commercial: {
      xc: 'The applicant is conducting a commercial cross-country operation with passenger expectations, performance constraints, and weather-related go/no-go pressure.',
      weather: 'The applicant must evaluate commercial pilot decision-making with deteriorating weather, customer pressure, and regulatory limitations.',
      systems: 'The applicant must explain aircraft systems, performance implications, and operational limitations in a commercial pilot context.',
      emergency: 'The applicant encounters an abnormal event requiring commercial-level ADM, diversion planning, and passenger communication.',
      dpe: 'Conduct a full Commercial Pilot oral scenario covering privileges and limitations, complex operating decisions, performance, systems, weather, risk management, and commercial judgment.'
    }
  };

  return setups[cert]?.[type] || 'Scenario setup unavailable.';
}

function getScenarioQuestions(cert, type) {
  const bank = {
    Private: {
      xc: [
        {
          code: 'PA.I.A.K1',
          question: 'What documents and endorsements must the applicant have before acting as PIC on this flight?',
          answer: 'Evaluate pilot certificate, medical/basic med as applicable, photo ID, required endorsements, currency, and limitations.'
        },
        {
          code: 'PA.I.C.K1',
          question: 'How did you determine whether the aircraft is airworthy for this cross-country?',
          answer: 'Aircraft must have required documents, inspections, AD compliance, required equipment, and no unresolved discrepancies that make it unairworthy.'
        },
        {
          code: 'PA.I.E.K1',
          question: 'What weather products did you use, and what risks did they reveal?',
          answer: 'Applicant should discuss METARs, TAFs, winds aloft, prog charts, AIRMETs/SIGMETs, radar/satellite, NOTAMs, and risk trends.'
        },
        {
          code: 'PA.I.F.K1',
          question: 'How did you calculate fuel, time enroute, and reserve requirements?',
          answer: 'Applicant should calculate using POH performance, winds aloft, route distance, climb/cruise/descent fuel, and regulatory reserve.'
        }
      ],
      weather: [
        {
          code: 'PA.I.E.K1',
          question: 'What would cause you to delay or cancel this VFR flight?',
          answer: 'Evaluate ceilings, visibility, winds, convective activity, pilot capability, terrain, night risk, and personal minimums.'
        },
        {
          code: 'PA.I.E.R1',
          question: 'What are the main risks of continuing VFR into deteriorating weather?',
          answer: 'Reduced visibility, loss of horizon, controlled flight into terrain, airspace violations, spatial disorientation, and decision pressure.'
        }
      ],
      systems: [
        {
          code: 'PA.I.C.K1',
          question: 'If an instrument required by 91.205 is inoperative, can you fly?',
          answer: 'Only if permitted by regulation/MEL or properly deactivated, placarded, and determined not required for the flight.'
        },
        {
          code: 'PA.VII.B.K1',
          question: 'Explain the electrical system and what failures would affect this flight.',
          answer: 'Applicant should describe alternator, battery, bus, circuit protection, warning indications, and load-shedding considerations.'
        }
      ],
      emergency: [
        {
          code: 'PA.IX.A.K1',
          question: 'What immediate actions would you take after an engine failure in cruise?',
          answer: 'Maintain aircraft control, establish best glide, select landing area, troubleshoot, communicate, secure if needed, and prepare for landing.'
        },
        {
          code: 'PA.IX.A.R1',
          question: 'What risk factors affect your choice of forced landing site?',
          answer: 'Wind, terrain, obstacles, distance, glide capability, surface, population, and survivability.'
        }
      ],
      dpe: []
    },
    Instrument: {
      xc: [
        {
          code: 'IR.I.B.K1',
          question: 'When is an alternate required for this IFR flight?',
          answer: 'Apply 91.169 and the 1-2-3 rule, then determine if destination weather requires filing an alternate.'
        },
        {
          code: 'IR.I.C.K1',
          question: 'How do you determine whether the destination approach is legally usable?',
          answer: 'Review approach chart, NOTAMs, equipment requirements, weather minimums, aircraft capability, and database currency.'
        },
        {
          code: 'IR.II.A.K1',
          question: 'What IFR weather risks are present on this flight?',
          answer: 'Ceilings, visibility, icing, turbulence, thunderstorms, freezing levels, alternates, and approach minimums.'
        }
      ],
      weather: [
        {
          code: 'IR.II.A.K1',
          question: 'How would you identify and avoid icing conditions?',
          answer: 'Use AIRMETs, freezing levels, PIREPs, clouds/precipitation, forecasts, aircraft limitations, and exit strategy.'
        },
        {
          code: 'IR.II.A.R1',
          question: 'Why is embedded convection especially hazardous under IFR?',
          answer: 'Reduced visual avoidance, severe turbulence, hail, lightning, wind shear, icing, and limited escape options.'
        }
      ],
      systems: [
        {
          code: 'IR.I.C.K1',
          question: 'What navigation equipment is required for the planned route and approach?',
          answer: 'Applicant should identify route/approach requirements, GPS/VOR/LOC capability, database currency, RAIM/WAAS, and backups.'
        },
        {
          code: 'IR.VI.A.K1',
          question: 'What would you do if the attitude indicator failed in IMC?',
          answer: 'Transition to partial panel, maintain control using remaining instruments, advise ATC, request assistance, and consider diversion.'
        }
      ],
      emergency: [
        {
          code: 'IR.VI.B.K1',
          question: 'Explain lost communications procedures in IMC.',
          answer: 'Apply AVEF for route and MEA for altitude while considering clearance limits, EFC, and approach timing.'
        },
        {
          code: 'IR.V.A.K1',
          question: 'What is your decision process after going missed at minimums?',
          answer: 'Execute published missed, maintain control, communicate, navigate, reassess fuel/weather/alternate, and avoid rushing.'
        }
      ],
      dpe: []
    },
    Commercial: {
      xc: [
        {
          code: 'CA.I.A.K1',
          question: 'What commercial pilot privileges and limitations apply to this operation?',
          answer: 'Applicant should distinguish commercial pilot privileges from operations requiring an operating certificate and discuss compensation/hire limits.'
        },
        {
          code: 'CA.I.F.K1',
          question: 'How did you calculate performance and determine the flight can be completed safely?',
          answer: 'Use POH data, weight and balance, density altitude, runway length, climb performance, fuel planning, and reserves.'
        }
      ],
      weather: [
        {
          code: 'CA.I.E.K1',
          question: 'How does commercial pressure affect your go/no-go decision?',
          answer: 'Applicant should identify external pressure, passenger/customer expectations, operational risk, and PIC authority.'
        },
        {
          code: 'CA.I.E.R1',
          question: 'What risks would make you decline the flight?',
          answer: 'Weather below minimums, aircraft limitations, pilot fatigue, performance margins, fuel concerns, and lack of safe alternatives.'
        }
      ],
      systems: [
        {
          code: 'CA.VII.B.K1',
          question: 'Explain how a system malfunction could affect performance and dispatch decision-making.',
          answer: 'Applicant should connect systems knowledge to aircraft airworthiness, limitations, redundancy, and operational risk.'
        }
      ],
      emergency: [
        {
          code: 'CA.IX.A.K1',
          question: 'How would you manage passengers during an emergency diversion?',
          answer: 'Aviate, navigate, communicate, manage workload, brief passengers, coordinate with ATC, and prioritize safety over schedule.'
        }
      ],
      dpe: []
    }
  };

  if (type === 'dpe') {
    return [
      ...(bank[cert]?.xc || []),
      ...(bank[cert]?.weather || []),
      ...(bank[cert]?.systems || []),
      ...(bank[cert]?.emergency || [])
    ];
  }

  return bank[cert]?.[type] || [];
}