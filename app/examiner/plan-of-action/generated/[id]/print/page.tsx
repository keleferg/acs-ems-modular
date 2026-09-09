"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type GeneratedPlan = {
  id: string;
  practical_test_type_id: string;
  title: string;
  scenario_name: string | null;
  selection_method: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
};

type GeneratedQuestion = {
  id: string;
  acs_reference_snapshot: string | null;
  question_snapshot: string | null;
  answer_snapshot: string | null;
  reference_snapshot: string | null;
  topic_snapshot: string | null;
  task_name_snapshot: string | null;
  question_type_snapshot: string | null;
  sort_order: number | null;
};

type PracticalTestType = {
  id: string;
  display_name: string;
  certificate_name: string;
  issuance_name: string;
  rating_name: string;
  category_name: string | null;
  class_name: string | null;
};

function taskCode(value: string | null) {
  const text = String(value || "").trim();

  const match = text.match(
    /^([A-Z]+\.[IVX]+\.[A-Z]+)/i,
  );

  return match
    ? match[1].toUpperCase()
    : "OTHER";
}

function areaCode(value: string) {
  const parts = value.split(".");

  if (parts.length < 2) {
    return "OTHER";
  }

  return `${parts[0]}.${parts[1]}`;
}

function romanAreaName(code: string) {
  const area = code.split(".")[1];

  const names: Record<string, string> = {
    I: "PREFLIGHT PREPARATION",
    II: "PREFLIGHT PROCEDURES",
    III: "AIRPORT AND SEAPLANE BASE OPERATIONS",
    IV: "TAKEOFFS, LANDINGS, AND GO-AROUNDS",
    V: "PERFORMANCE MANEUVERS AND GROUND REFERENCE MANEUVERS",
    VI: "NAVIGATION",
    VII: "SLOW FLIGHT AND STALLS",
    VIII: "HIGH-ALTITUDE OPERATIONS",
    IX: "EMERGENCY OPERATIONS",
    X: "MULTIENGINE OPERATIONS",
    XI: "POSTFLIGHT PROCEDURES",
  };

  return names[area] || "AREA OF OPERATION";
}

function titleForTest(testType: PracticalTestType | null) {
  if (!testType) {
    return "PLAN OF ACTION";
  }

  const cert =
    testType.certificate_name
      .replace("Pilot", "")
      .trim()
      .toUpperCase();

  const className =
    testType.class_name?.toUpperCase() || "";

  const category =
    testType.category_name?.toUpperCase() || "";

  if (
    cert.includes("COMMERCIAL") &&
    className.includes("SINGLE") &&
    className.includes("SEA")
  ) {
    return "COMMERCIAL PILOT / ASES Plan of Action";
  }

  if (
    cert.includes("PRIVATE") &&
    className.includes("SINGLE") &&
    className.includes("SEA")
  ) {
    return "PRIVATE PILOT / ASES Plan of Action";
  }

  if (
    cert.includes("PRIVATE") &&
    className.includes("SINGLE") &&
    className.includes("LAND")
  ) {
    return "PRIVATE PILOT / ASEL Plan of Action";
  }

  if (
    cert.includes("COMMERCIAL") &&
    className.includes("SINGLE") &&
    className.includes("LAND")
  ) {
    return "COMMERCIAL PILOT / ASEL Plan of Action";
  }

  return `${testType.display_name} Plan of Action`;
}

function acsReference(
  questions: GeneratedQuestion[],
) {
  const first = questions
    .map((q) =>
      String(
        q.acs_reference_snapshot || "",
      ).trim(),
    )
    .find(Boolean);

  if (!first) {
    return "Reference: Applicable FAA Airman Certification Standards";
  }

  if (first.startsWith("PA.")) {
    return "Reference: ACS Private Pilot Airplane (FAA-S-ACS-6C) May 2024";
  }

  if (first.startsWith("CA.")) {
    return "Reference: ACS Commercial Pilot Airplane (FAA-S-ACS-7B) May 2024";
  }

  if (first.startsWith("IA.")) {
    return "Reference: ACS Instrument Rating - Airplane (FAA-S-ACS-8C) May 2024";
  }

  return `Reference: Applicable FAA ACS - ${first.split(".")[0]}`;
}

function PoaHeader({
  title,
  reference,
}: {
  title: string;
  reference: string;
}) {
  return (
    <div className="poa-header">
      <div className="poa-title">
        {title}
      </div>

      <div className="examiner-line">
        Kele Fergerstrom - DPE # 999995215
      </div>

      <div className="reference-line">
        {reference}
      </div>
    </div>
  );
}

function CheckboxLine({
  children,
  indent = 0,
}: {
  children: React.ReactNode;
  indent?: number;
}) {
  return (
    <div
      className="check-line"
      style={{
        paddingLeft: `${indent * 22}px`,
      }}
    >
      <span className="box">□</span>
      <span>{children}</span>
    </div>
  );
}

function GeneratedPoaPrintContent() {
  const params = useParams<{ id: string }>();

  const id =
    typeof params?.id === "string"
      ? params.id
      : "";

  const [plan, setPlan] =
    useState<GeneratedPlan | null>(null);

  const [questions, setQuestions] =
    useState<GeneratedQuestion[]>([]);

  const [testType, setTestType] =
    useState<PracticalTestType | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    async function load() {
      const supabase = createClient();

      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setErrorMessage(
            "You must be signed in as an examiner.",
          );
          setLoading(false);
        }

        return;
      }

      const {
        data: planData,
        error: planError,
      } = await supabase
        .from("generated_plan_of_actions")
        .select(`
          id,
          practical_test_type_id,
          title,
          scenario_name,
          selection_method,
          status,
          notes,
          created_at
        `)
        .eq("id", id)
        .eq("examiner_profile_id", user.id)
        .single();

      if (planError || !planData) {
        if (!cancelled) {
          setErrorMessage(
            planError?.message ||
              "Generated Plan of Action could not be loaded.",
          );
          setLoading(false);
        }

        return;
      }

      const [
        questionResult,
        testTypeResult,
      ] = await Promise.all([
        supabase
          .from(
            "generated_plan_of_action_questions",
          )
          .select(`
            id,
            acs_reference_snapshot,
            question_snapshot,
            answer_snapshot,
            reference_snapshot,
            topic_snapshot,
            task_name_snapshot,
            question_type_snapshot,
            sort_order
          `)
          .eq(
            "generated_plan_of_action_id",
            id,
          )
          .order("sort_order", {
            ascending: true,
          }),

        supabase
          .from("practical_test_types")
          .select(`
            id,
            display_name,
            certificate_name,
            issuance_name,
            rating_name,
            category_name,
            class_name
          `)
          .eq(
            "id",
            planData.practical_test_type_id,
          )
          .single(),
      ]);

      if (questionResult.error) {
        if (!cancelled) {
          setErrorMessage(
            `Questions could not be loaded: ${questionResult.error.message}`,
          );
          setLoading(false);
        }

        return;
      }

      if (!cancelled) {
        setPlan(planData as GeneratedPlan);

        setQuestions(
          (questionResult.data ??
            []) as GeneratedQuestion[],
        );

        setTestType(
          testTypeResult.data
            ? (testTypeResult.data as PracticalTestType)
            : null,
        );

        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const taskGroups = useMemo(() => {
    const result = new Map<
      string,
      {
        code: string;
        name: string;
        questions: GeneratedQuestion[];
      }
    >();

    for (const question of questions) {
      const code = taskCode(
        question.acs_reference_snapshot,
      );

      const existing = result.get(code);

      if (existing) {
        existing.questions.push(question);
      } else {
        result.set(code, {
          code,
          name:
            question.task_name_snapshot ||
            "",
          questions: [question],
        });
      }
    }

    return [...result.values()];
  }, [questions]);

  const groupedAreas = useMemo(() => {
    const areas = new Map<
      string,
      typeof taskGroups
    >();

    for (const group of taskGroups) {
      const code = areaCode(group.code);

      const existing =
        areas.get(code) || [];

      existing.push(group);

      areas.set(code, existing);
    }

    return [...areas.entries()];
  }, [taskGroups]);

  if (loading) {
    return (
      <main className="loading">
        Loading Plan of Action…
      </main>
    );
  }

  if (!plan || errorMessage) {
    return (
      <main className="loading error">
        {errorMessage ||
          "Plan of Action was not found."}
      </main>
    );
  }

  const documentTitle =
    titleForTest(testType);

  const reference =
    acsReference(questions);

  return (
    <>
      <div className="screen-toolbar">
        <button
          type="button"
          onClick={() => window.print()}
        >
          <Printer size={16} />
          Print / Save PDF
        </button>

        <span>
          {questions.length} questions
        </span>
      </div>

      <main className="document">

        {/* ==================================================
            PAGE 1 - FIXED APPROVED CHECKLIST
            ================================================== */}

        <section className="page fixed-page">
          <PoaHeader
            title={documentTitle}
            reference={reference}
          />

          <h2 className="center-heading small">
            Evaluator’s Checklist for FAA Practical Test
          </h2>

          <div className="blue-rule" />

          <h3 className="appointment-title">
            FAA Practical Test Appointment
          </h3>

          <div className="form-fields">
            <div>
              Date of Test___________
              Location:____________________________________
            </div>

            <div>
              Applicant Name_______________________________________________
            </div>

            <div>
              Address_____________________________________________________
            </div>

            <div>
              Telephone___________________________________________________
            </div>

            <div>
              Email_______________________________________________________
            </div>

            <div>
              School (Part 141?)___________________________________________
            </div>

            <div>
              Instructor Name______________________________________________
            </div>

            <div>
              Instructor Telephone_________________________________________
            </div>

            <div>
              Practical Test Type__________________________________________
            </div>

            <div>
              Retest?__________ If yes, Notice of Disapproval_______________
            </div>

            <div>
              Aircraft Make/Model/Equipment________________ Registration______
            </div>
          </div>

          <h3 className="blue-heading">
            Documentation
          </h3>

          <CheckboxLine>
            Class and date of medical, if applicable (current?)
          </CheckboxLine>

          <CheckboxLine>
            Foreign student requirements; TSA; Letter of Verification of Authenticity
          </CheckboxLine>

          <CheckboxLine>
            Valid knowledge test results. Deficiencies reviewed?
          </CheckboxLine>

          <CheckboxLine>
            Aircraft - certificates, maintenance records, logbooks, and equipment
          </CheckboxLine>

          <CheckboxLine>
            IACRA Application (8710-1) completed and signed by instructor (if required)
          </CheckboxLine>

          <CheckboxLine>
            Special considerations - drug convictions, medical deficiencies
          </CheckboxLine>

          <CheckboxLine>
            Identification - photo/signature ID (current)
          </CheckboxLine>

          <CheckboxLine>
            Flight time records and requirements (mark required times and cross-countries)
          </CheckboxLine>

          <CheckboxLine>
            Required endorsements
          </CheckboxLine>

          <h3 className="blue-heading">
            Airman Certification Standards
          </h3>

          <CheckboxLine>
            Familiar with the ACS?
          </CheckboxLine>

          <CheckboxLine>
            Which one/date do you have?
          </CheckboxLine>

          <h3 className="blue-heading">
            Practical Test Flight Planning
          </h3>

          <CheckboxLine>
            Assign cross-country plan - location, time of departure (night?)
          </CheckboxLine>

          <CheckboxLine>
            Weight and balance computations
          </CheckboxLine>

          <CheckboxLine>
            Aircraft performance computations
          </CheckboxLine>

          <CheckboxLine>
            Flight planning facilities and weather briefing
          </CheckboxLine>

          <CheckboxLine>
            Review technology utilization (Advisory Circular) and information technology
          </CheckboxLine>

          <h3 className="blue-heading">
            Administrative
          </h3>

          <CheckboxLine>
            Fee schedule and fee policy (must notify of fees before accepting application)
          </CheckboxLine>

          <CheckboxLine>
            Ask for FTN for IACRA (to review knowledge test report for Plan of Action)
          </CheckboxLine>

          <CheckboxLine>
            How to contact me
          </CheckboxLine>
        </section>

        {/* ==================================================
            PAGE 2 - FIXED APPROVED ELIGIBILITY / BRIEFING
            ================================================== */}

        <section className="page fixed-page">
          <PoaHeader
            title={documentTitle}
            reference={reference}
          />

          <div className="page-two-content">
            <h2 className="blue-section">
              Establish Eligibility
            </h2>

            <CheckboxLine>
              Welcome and make introductions
            </CheckboxLine>

            <CheckboxLine>
              Facilities overview
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Privacy, Exits
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Restrooms
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Water, snacks
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Telephones off
            </CheckboxLine>

            <CheckboxLine>
              Confirm type of practical test and if a retest
            </CheckboxLine>

            <CheckboxLine>
              Qualify the applicant
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Application (8710-1)
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Photo/signature Identification (Note type on 8710-1 and return)
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Airman Certificate
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Medical (note date and limitations)
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Foreign License and Letter of Verification of Authenticity (if applicable)
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Knowledge test results and review endorsement (if needed)
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Pilot logbook and/or training records
            </CheckboxLine>

            <CheckboxLine indent={2}>
              Verify flight times and endorsements
            </CheckboxLine>

            <CheckboxLine>
              Applicant signs IACRA 8710
            </CheckboxLine>

            <CheckboxLine>
              Qualify the aircraft
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Review maintenance records per Order 8900.1
            </CheckboxLine>

            <CheckboxLine indent={2}>
              Instrument or ATP current NavData
            </CheckboxLine>

            <CheckboxLine indent={2}>
              Inoperative equipment
            </CheckboxLine>

            <h2 className="blue-section briefing">
              Pre-Test Briefing
            </h2>

            <CheckboxLine>
              Current navigational charts and/or current NavData on Electronic Flight Bag
            </CheckboxLine>

            <CheckboxLine>
              Advise applicant that
            </CheckboxLine>

            <CheckboxLine indent={1}>
              The test will be done in accordance with the FAA ACS(s) and FAA Order 8900.1
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Also will use Plan of Action (describe what it is)
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Will be taking notes during test for debriefing
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Note that perfection is not the standard
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Oral questioning will be continued throughout all portions of the test
            </CheckboxLine>

            <CheckboxLine indent={1}>
              Three possible outcomes
            </CheckboxLine>

            <CheckboxLine indent={2}>
              Temporary certificate
            </CheckboxLine>
          </div>
        </section>

        {/* ==================================================
            PAGE 3+ - GENERATED FROZEN POA CONTENT
            ================================================== */}

        <section className="dynamic-pages">
          <div className="running-header">
            <PoaHeader
              title={documentTitle}
              reference={reference}
            />
          </div>

          <h2 className="section-title">
            SECTION I — ORAL / GROUND PORTION
          </h2>

          {groupedAreas.map(
            ([area, groups]) => (
              <section
                key={area}
                className="area-block"
              >
                <h2 className="area-title">
                  AREA OF OPERATION{" "}
                  {area.split(".")[1]}:{" "}
                  {romanAreaName(area)}
                </h2>

                {groups.map((group) => (
                  <section
                    key={group.code}
                    className="task-block"
                  >
                    <h3 className="task-title">
                      {group.code} —{" "}
                      {(
                        group.name ||
                        "ACS TASK"
                      ).toUpperCase()}
                    </h3>

                    {group.questions.map(
                      (question) => (
                        <article
                          key={question.id}
                          className="question-block"
                        >
                          <div className="question-line">
                            <span className="question-box">
                              □
                            </span>

                            <span>
                              {
                                question.question_snapshot
                              }
                            </span>
                          </div>

                          {question.answer_snapshot ? (
                            <div className="guidance">
                              <em>
                                Examiner guidance:
                              </em>{" "}
                              {
                                question.answer_snapshot
                              }
                            </div>
                          ) : null}

                          <div className="acs-reference">
                            {question.acs_reference_snapshot ? (
                              <>
                                <em>
                                  ACS:
                                </em>{" "}
                                {
                                  question.acs_reference_snapshot
                                }
                              </>
                            ) : null}

                            {question.reference_snapshot ? (
                              <>
                                {"   "}
                                <em>
                                  Reference:
                                </em>{" "}
                                {
                                  question.reference_snapshot
                                }
                              </>
                            ) : null}
                          </div>
                        </article>
                      ),
                    )}

                    <div className="notes-line">
                      Examiner Notes: ________________________________________________
                    </div>
                  </section>
                ))}
              </section>
            ),
          )}

          <section className="postflight-block">
            <h2 className="section-title">
              SECTION III — POSTFLIGHT / DEBRIEF
            </h2>

            <CheckboxLine>
              Review unresolved ACS items and any AKTR deficiency items.
            </CheckboxLine>

            <CheckboxLine>
              Record aircraft discrepancies and examiner notes.
            </CheckboxLine>

            <CheckboxLine>
              Complete practical-test outcome and required administrative actions.
            </CheckboxLine>
          </section>
        </section>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #d9dde3;
          color: #111;
          font-family: Arial, Helvetica, sans-serif;
        }

        .screen-toolbar {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #111827;
          color: #fff;
        }

        .screen-toolbar button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 0;
          border-radius: 8px;
          padding: 10px 16px;
          background: #fff;
          color: #111827;
          font-weight: 700;
          cursor: pointer;
        }

        .loading {
          padding: 40px;
        }

        .error {
          color: #b91c1c;
        }

        .document {
          width: 8.5in;
          margin: 24px auto;
          background: white;
        }

        .page {
          width: 8.5in;
          min-height: 11in;
          padding: 0.48in 0.55in 0.55in;
          background: white;
          page-break-after: always;
        }

        .poa-header {
          border: 1px solid #333;
          padding: 2px 8px 4px;
          text-align: center;
          line-height: 1.16;
        }

        .poa-title {
          font-size: 13.5pt;
          font-weight: 700;
        }

        .examiner-line,
        .reference-line {
          font-size: 12.5pt;
        }

        .center-heading.small {
          margin: 24px 0 8px;
          text-align: center;
          font-size: 12pt;
          font-weight: 400;
        }

        .blue-rule {
          border-top: 1px solid #3970a8;
        }

        .appointment-title {
          margin: 6px 0 26px;
          text-align: center;
          font-size: 12pt;
          font-weight: 400;
        }

        .form-fields {
          margin: 0 7px 14px;
          font-size: 11.5pt;
          line-height: 1.32;
        }

        .blue-heading,
        .blue-section {
          margin: 12px 0 5px;
          color: #376b9f;
          font-size: 12pt;
          font-weight: 400;
        }

        .blue-section {
          font-size: 14pt;
          font-weight: 700;
        }

        .page-two-content {
          padding: 1.05in 5px 0;
        }

        .briefing {
          margin-top: 28px;
        }

        .check-line {
          display: flex;
          gap: 10px;
          margin: 3px 0;
          font-size: 11.2pt;
          line-height: 1.23;
        }

        .box {
          flex: 0 0 14px;
          font-size: 11pt;
        }

        .dynamic-pages {
          width: 8.5in;
          min-height: 11in;
          padding: 0.48in 0.55in 0.6in;
          background: white;
        }

        .running-header {
          margin-bottom: 22px;
        }

        .section-title {
          margin: 18px 0 20px;
          font-size: 14pt;
          font-weight: 800;
        }

        .area-block {
          break-inside: auto;
        }

        .area-title {
          margin: 20px 0 18px;
          font-size: 16pt;
          font-weight: 800;
          break-after: avoid-page;
        }

        .task-block {
          margin-bottom: 18px;
        }

        .task-title {
          margin: 13px 0 12px;
          font-size: 13pt;
          font-weight: 800;
          break-after: avoid-page;
        }

        .question-block {
          margin: 0 0 10px;
          break-inside: avoid-page;
        }

        .question-line {
          display: flex;
          gap: 8px;
          font-size: 10.7pt;
          line-height: 1.42;
        }

        .question-box {
          flex: 0 0 14px;
        }

        .guidance {
          margin: 4px 0 2px 18px;
          font-size: 9.3pt;
          line-height: 1.38;
        }

        .acs-reference {
          margin-left: 18px;
          font-size: 8.7pt;
          line-height: 1.35;
        }

        .notes-line {
          margin-top: 8px;
          font-size: 9.5pt;
          break-after: avoid-page;
        }

        .postflight-block {
          margin-top: 28px;
        }

        @media screen {
          .page,
          .dynamic-pages {
            box-shadow:
              0 6px 20px
              rgba(0, 0, 0, 0.12);
          }

          .dynamic-pages {
            margin-top: 24px;
          }
        }

        @media print {
          @page {
            size: Letter portrait;
            margin: 0;
          }

          body {
            background: white;
          }

          .screen-toolbar {
            display: none !important;
          }

          .document {
            width: auto;
            margin: 0;
          }

          .page,
          .dynamic-pages {
            box-shadow: none;
          }

          .dynamic-pages {
            page-break-before: always;
          }

          /*
           * Chromium repeats this element at the top
           * only when the browser lays a new page from
           * the same section. The visual header remains
           * identical to the approved POA header.
           */
          .running-header {
            break-after: avoid;
          }
        }
      `}</style>
    </>
  );
}

export default function GeneratedPoaPrintPage() {
  return (
    <Suspense
      fallback={
        <main className="loading">
          Loading Plan of Action…
        </main>
      }
    >
      <GeneratedPoaPrintContent />
    </Suspense>
  );
}
