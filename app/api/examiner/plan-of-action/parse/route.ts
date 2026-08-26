import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

type ParseRequest = {
  planOfActionId?: string;
};

type PlanRow = {
  id: string;
  examiner_profile_id: string;
  practical_test_type_id: string;
  title: string;
  source_filename: string;
  source_mime_type: string | null;
  storage_bucket: string;
  storage_path: string | null;
};

type PracticalTestTypeRow = {
  id: string;
  certificate_name: string;
  issuance_name: string;
  category_name: string | null;
  class_name: string | null;
  rating_name: string;
  display_name: string;
};

const ScenarioQuestionSchema = z.object({
  sequence: z.number().int().nonnegative(),
  acs_code: z.string(),
  question: z.string(),
  answer_notes: z.string(),
  references: z.string(),
});

const ScenarioSectionSchema = z.object({
  sequence: z.number().int().nonnegative(),
  heading: z.string(),
  narrative: z.string(),
  questions: z.array(ScenarioQuestionSchema),
});

const FlightTaskSchema = z.object({
  sequence: z.number().int().nonnegative(),
  task_code: z.string(),
  task_name: z.string(),
});

const PlanOfActionScenarioSchema = z.object({
  scenario_name: z.string(),
  source_revision: z.string(),
  scenario_brief: z.string(),
  oral_sections: z.array(ScenarioSectionSchema),
  flight_tasks: z.array(FlightTaskSchema),
  parser_notes: z.string(),
});

function getMimeType(
  filename: string,
  storedMimeType: string | null,
) {
  if (storedMimeType) {
    return storedMimeType;
  }

  const lower = filename.toLowerCase();

  if (lower.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  if (lower.endsWith(".doc")) {
    return "application/msword";
  }

  if (lower.endsWith(".md")) {
    return "text/markdown";
  }

  return "text/plain";
}

function buildFileDataUrl(
  mimeType: string,
  arrayBuffer: ArrayBuffer,
) {
  const base64 =
    Buffer.from(arrayBuffer).toString("base64");

  return `data:${mimeType};base64,${base64}`;
}

function buildSystemPrompt() {
  return `
You are parsing an FAA Designated Pilot Examiner Plan of Action into structured practical-test scenario data.

STRICT SOURCE RULES:

1. Use only information actually present in the supplied Plan of Action.
2. Do not invent FAA requirements, ACS codes, questions, answers, references, maneuvers, scenario events, or flight tasks.
3. Preserve the examiner's intended chronology and organization.
4. If an ACS code is explicitly present, preserve it exactly.
5. If no ACS code is supplied for a question or task, return an empty string for acs_code or task_code. Do not guess one.
6. Preserve useful scenario narrative and triggers.
7. Questions should remain faithful to the source. You may clean formatting artifacts, but do not materially rewrite the examiner's intent.
8. answer_notes must contain only answer/reference material supported by the source document. If none is supplied, return an empty string.
9. references must contain only references explicitly present in the source. If none are present, return an empty string.
10. Flight tasks must remain in the order shown by the Plan of Action.
11. The flight_tasks array represents ACS TASKS and maneuver/profile tasks, not individual Knowledge, Risk, or Skill elements.
12. For a flight task, task_code should normally be a TASK-level ACS identifier such as PA.II.B, PA.IV.A, PA.VII.B, or PA.IX.A.
13. If the source shows an element-level identifier such as PA.II.B.S2, PA.II.C.R1, PA.I.F.K1, or PA.II.B.K1/S2, reduce it to the parent TASK identifier only when the parent task clearly belongs to that same flight task. Example: PA.II.B.S2 becomes PA.II.B.
14. Preserve legitimate combined task notation from the source, such as PA.IV.E/F or PA.VIII.B/C, when the source clearly means multiple tasks.
15. PDF tables and columns can place an ACS element code visually near the wrong maneuver. Never attach a code to a flight task merely because it is nearby in extracted text. The code and task name must clearly belong together in the source.
16. If the maneuver/task is clearly present but its task-level ACS code cannot be determined reliably from the source, preserve the task_name and return an empty task_code. Do not guess.
17. Do not include administrative, narrative, setup, examiner-action, or non-ACS profile instructions as flight tasks. Examples include retrieving documents, moving paperwork, setup notes, examiner instructions, or general briefing text unless the source clearly identifies the item as an evaluated ACS task.
18. Do not turn oral questions into flight tasks unless the source explicitly identifies them as part of the evaluated flight sequence/profile.
19. Prefer one flight_tasks entry per evaluated ACS Task. Do not create separate flight task entries for individual K/R/S elements of the same Task.
20. Do not manufacture missing sections merely to make the scenario look complete.
21. parser_notes should briefly identify source limitations or unclear portions, not add regulatory advice.

The structured result will be used by an examiner during an actual practical test, so fidelity to the uploaded source is more important than filling gaps.
`.trim();
}

function normalizeParsedFlightTaskCode(
  rawCode: string,
) {
  let code = String(rawCode || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/\.$/, "")
    .toUpperCase();

  if (!code) {
    return "";
  }

  const combinedTaskMatch = code.match(
    /^([A-Z]+)\.([IVX]+)\.([A-Z])\/([A-Z])$/,
  );

  if (combinedTaskMatch) {
    return (
      `${combinedTaskMatch[1]}.` +
      `${combinedTaskMatch[2]}.` +
      `${combinedTaskMatch[3]}/` +
      `${combinedTaskMatch[4]}`
    );
  }

  const taskMatch = code.match(
    /^([A-Z]+)\.([IVX]+)\.([A-Z])$/,
  );

  if (taskMatch) {
    return (
      `${taskMatch[1]}.` +
      `${taskMatch[2]}.` +
      `${taskMatch[3]}`
    );
  }

  const elementMatch = code.match(
    /^([A-Z]+)\.([IVX]+)\.([A-Z])\.(?:K|R|S)\d/i,
  );

  if (elementMatch) {
    return (
      `${elementMatch[1]}.` +
      `${elementMatch[2]}.` +
      `${elementMatch[3]}`
    );
  }

  const combinedElementMatch = code.match(
    /^([A-Z]+)\.([IVX]+)\.([A-Z])\.(?:K|R|S)\d+(?:\/(?:K|R|S)?\d+)+$/i,
  );

  if (combinedElementMatch) {
    return (
      `${combinedElementMatch[1]}.` +
      `${combinedElementMatch[2]}.` +
      `${combinedElementMatch[3]}`
    );
  }

  return code;
}

function isLikelyAdministrativeFlightEntry(
  taskName: string,
  taskCode: string,
) {
  if (taskCode) {
    return false;
  }

  const name = String(taskName || "")
    .trim()
    .toLowerCase();

  if (!name) {
    return true;
  }

  const administrativePatterns = [
    "applicant completes the preflight",
    "ensure documents are back",
    "documents are back in the airplane",
    "return documents",
    "examiner briefing",
    "examiner completes",
    "paperwork",
  ];

  return administrativePatterns.some(
    pattern => name.includes(pattern),
  );
}

function normalizeParsedFlightTasks(
  flightTasks: Array<{
    sequence: number;
    task_code: string;
    task_name: string;
  }>,
) {
  const normalized: Array<{
    sequence: number;
    task_code: string;
    task_name: string;
  }> = [];

  const seen = new Set<string>();

  for (const task of flightTasks || []) {
    const taskName = String(
      task?.task_name || "",
    ).trim();

    const taskCode =
      normalizeParsedFlightTaskCode(
        task?.task_code || "",
      );

    if (
      isLikelyAdministrativeFlightEntry(
        taskName,
        taskCode,
      )
    ) {
      continue;
    }

    if (!taskName) {
      continue;
    }

    const dedupeKey =
      `${taskCode}::${taskName.toLowerCase()}`;

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);

    normalized.push({
      sequence: normalized.length + 1,
      task_code: taskCode,
      task_name: taskName,
    });
  }

  return normalized;
}

function buildUserPrompt(
  plan: PlanRow,
  testType: PracticalTestTypeRow,
) {
  return `
PRACTICAL TEST:

Display Name:
${testType.display_name}

Certificate:
${testType.certificate_name}

Issuance:
${testType.issuance_name}

Category:
${testType.category_name || ""}

Class:
${testType.class_name || ""}

Rating:
${testType.rating_name}

UPLOADED FILE:
${plan.source_filename}

EXAMINER-SUPPLIED TITLE:
${plan.title}

The uploaded Plan of Action file is attached directly to this message.

Parse that attached file into the required structured scenario.
`.trim();
}

function getQuestionTypeFromAcsCode(
  rawCode: string,
) {
  const code = String(rawCode || "")
    .trim()
    .toUpperCase();

  if (/\.(?:R)\d+(?:$|\/)/.test(code)) {
    return "risk_management";
  }

  if (/\.(?:S)\d+(?:$|\/)/.test(code)) {
    return "skill";
  }

  return "knowledge";
}

function normalizeQuestionForComparison(
  value: string,
) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function setParseError(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  id: string,
  message: string,
) {
  await supabase
    .from("examiner_plan_of_actions")
    .update({
      parse_status: "error",
      parse_error: message.slice(0, 4000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function POST(request: Request) {
  let body: ParseRequest;

  try {
    body = (await request.json()) as ParseRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request body.",
      },
      {
        status: 400,
      },
    );
  }

  const planOfActionId =
    body.planOfActionId?.trim();

  if (!planOfActionId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "A Plan of Action ID is required.",
      },
      {
        status: 400,
      },
    );
  }

  const apiKey =
    process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "OPENAI_API_KEY is not configured on the server.",
      },
      {
        status: 503,
      },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        ok: false,
        error: "Authentication is required.",
      },
      {
        status: 401,
      },
    );
  }

  const {
    data: planData,
    error: planError,
  } = await supabase
    .from("examiner_plan_of_actions")
    .select(`
      id,
      examiner_profile_id,
      practical_test_type_id,
      title,
      source_filename,
      source_mime_type,
      storage_bucket,
      storage_path
    `)
    .eq("id", planOfActionId)
    .eq("examiner_profile_id", user.id)
    .maybeSingle();

  if (planError || !planData) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "The Plan of Action could not be found or does not belong to this examiner.",
      },
      {
        status: 404,
      },
    );
  }

  const plan = planData as PlanRow;

  if (!plan.storage_path) {
    await setParseError(
      supabase,
      plan.id,
      "The uploaded file does not have a saved storage path.",
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "The uploaded POA does not have a storage path.",
      },
      {
        status: 400,
      },
    );
  }

  const {
    data: testTypeData,
    error: testTypeError,
  } = await supabase
    .from("practical_test_types")
    .select(`
      id,
      certificate_name,
      issuance_name,
      category_name,
      class_name,
      rating_name,
      display_name
    `)
    .eq("id", plan.practical_test_type_id)
    .maybeSingle();

  if (testTypeError || !testTypeData) {
    await setParseError(
      supabase,
      plan.id,
      "The associated practical-test type could not be loaded.",
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "The associated practical-test type could not be loaded.",
      },
      {
        status: 404,
      },
    );
  }

  const testType =
    testTypeData as PracticalTestTypeRow;

  const { error: processingError } =
    await supabase
      .from("examiner_plan_of_actions")
      .update({
        parse_status: "processing",
        parse_error: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", plan.id)
      .eq("examiner_profile_id", user.id);

  if (processingError) {
    return NextResponse.json(
      {
        ok: false,
        error:
          `The POA could not be marked for processing: ${processingError.message}`,
      },
      {
        status: 500,
      },
    );
  }

  try {
    const {
      data: fileBlob,
      error: downloadError,
    } = await supabase.storage
      .from(plan.storage_bucket)
      .download(plan.storage_path);

    if (downloadError || !fileBlob) {
      throw new Error(
        `The uploaded POA file could not be downloaded: ${
          downloadError?.message ||
          "Unknown storage error."
        }`,
      );
    }

    const arrayBuffer =
      await fileBlob.arrayBuffer();

    if (arrayBuffer.byteLength === 0) {
      throw new Error(
        "The uploaded POA file is empty.",
      );
    }

    if (arrayBuffer.byteLength > 50 * 1024 * 1024) {
      throw new Error(
        "The uploaded POA exceeds the 50 MB file-input limit.",
      );
    }

    const mimeType = getMimeType(
      plan.source_filename,
      plan.source_mime_type,
    );

    const fileData = buildFileDataUrl(
      mimeType,
      arrayBuffer,
    );

    const openai = new OpenAI({
      apiKey,
    });

    const model =
      process.env.OPENAI_POA_MODEL?.trim() ||
      "gpt-5.6";

    const response =
      await openai.responses.parse({
        model,
        input: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "user",
            content: [
              {
                type: "input_file",
                filename: plan.source_filename,
                file_data: fileData,
                detail:
                  mimeType === "application/pdf"
                    ? "high"
                    : undefined,
              },
              {
                type: "input_text",
                text: buildUserPrompt(
                  plan,
                  testType,
                ),
              },
            ],
          },
        ],
        text: {
          format: zodTextFormat(
            PlanOfActionScenarioSchema,
            "plan_of_action_scenario",
          ),
        },
      });

    const scenario =
      response.output_parsed;

    if (!scenario) {
      throw new Error(
        "The parser did not return structured scenario data.",
      );
    }

    if (
      scenario.oral_sections.length === 0 &&
      scenario.flight_tasks.length === 0
    ) {
      throw new Error(
        "The POA was parsed, but no oral sections or flight tasks were identified.",
      );
    }

    const normalizedFlightTasks =
      normalizeParsedFlightTasks(
        scenario.flight_tasks,
      );

    const normalizedScenario = {
      schema_version: 1,
      generated_at:
        new Date().toISOString(),
      generated_by:
        "openai_poa_parser",
      model,
      practical_test_type_id:
        plan.practical_test_type_id,
      certificate_name:
        testType.certificate_name,
      issuance_name:
        testType.issuance_name,
      category_name:
        testType.category_name,
      class_name:
        testType.class_name,
      rating_name:
        testType.rating_name,
      ...scenario,
      flight_tasks:
        normalizedFlightTasks,
    };

    /*
     * Sync oral questions into the POA Question Library
     * review queue.
     *
     * Reparse behavior:
     * - pending drafts from this source POA are replaced;
     * - approved/rejected review history remains intact;
     * - questions already approved into the permanent
     *   library from this POA are not proposed again.
     */

    const {
      data: existingApprovedQuestions,
      error: existingApprovedQuestionsError,
    } = await supabase
      .from("poa_questions")
      .select("question")
      .eq(
        "examiner_profile_id",
        user.id,
      )
      .eq(
        "source_plan_of_action_id",
        plan.id,
      );

    if (existingApprovedQuestionsError) {
      throw new Error(
        `Existing library questions could not be checked: ${existingApprovedQuestionsError.message}`,
      );
    }

    const approvedQuestionSet =
      new Set(
        (
          existingApprovedQuestions ?? []
        ).map((row) =>
          normalizeQuestionForComparison(
            row.question,
          ),
        ),
      );

    const {
      error: clearDraftError,
    } = await supabase
      .from("poa_question_drafts")
      .delete()
      .eq(
        "examiner_profile_id",
        user.id,
      )
      .eq(
        "source_plan_of_action_id",
        plan.id,
      )
      .eq(
        "review_status",
        "pending",
      );

    if (clearDraftError) {
      throw new Error(
        `Existing pending question drafts could not be replaced: ${clearDraftError.message}`,
      );
    }

    const draftRows = [];

    for (
      const section of
      scenario.oral_sections
    ) {
      for (
        const oralQuestion of
        section.questions
      ) {
        const question =
          String(
            oralQuestion.question || "",
          ).trim();

        if (!question) {
          continue;
        }

        const normalizedQuestion =
          normalizeQuestionForComparison(
            question,
          );

        if (
          approvedQuestionSet.has(
            normalizedQuestion,
          )
        ) {
          continue;
        }

        draftRows.push({
          examiner_profile_id:
            user.id,

          source_plan_of_action_id:
            plan.id,

          acs_reference:
            String(
              oralQuestion.acs_code || "",
            ).trim(),

          question,

          answer:
            String(
              oralQuestion.answer_notes ||
                "",
            ).trim() || null,

          reference:
            String(
              oralQuestion.references || "",
            ).trim() || null,

          topic:
            String(
              section.heading || "",
            ).trim() || null,

          task_name: null,

          question_type:
            getQuestionTypeFromAcsCode(
              oralQuestion.acs_code,
            ),

          difficulty:
            "standard",

          /*
           * Question applicability is ACS /
           * certificate level, not individual
           * category/class/rating level.
           */
          acs_applicability: [
            {
              certificate_name:
                testType.certificate_name,

              acs_reference:
                String(
                  oralQuestion.acs_code || "",
                ).trim(),
            },
          ],

          /*
           * Retained temporarily for backwards
           * compatibility with existing records.
           * New Question Library logic does not
           * use rating-level applicability.
           */
          proposed_practical_test_type_ids:
            [],

          review_status:
            "pending",
        });
      }
    }

    if (draftRows.length > 0) {
      const {
        error: draftInsertError,
      } = await supabase
        .from("poa_question_drafts")
        .insert(draftRows);

      if (draftInsertError) {
        throw new Error(
          `Question drafts could not be created: ${draftInsertError.message}`,
        );
      }
    }

    const {
      error: saveError,
    } = await supabase
      .from("examiner_plan_of_actions")
      .update({
        scenario_name:
          scenario.scenario_name,
        source_text: null,
        scenario_data:
          normalizedScenario,
        parse_status: "ready",
        parse_error: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", plan.id)
      .eq(
        "examiner_profile_id",
        user.id,
      );

    if (saveError) {
      throw new Error(
        `The generated scenario could not be saved: ${saveError.message}`,
      );
    }

    const questionCount =
      scenario.oral_sections.reduce(
        (total, section) =>
          total +
          section.questions.length,
        0,
      );

    return NextResponse.json({
      ok: true,
      planOfActionId: plan.id,
      scenarioName:
        scenario.scenario_name,
      oralSections:
        scenario.oral_sections.length,
      oralQuestions:
        questionCount,
      flightTasks:
        normalizedFlightTasks.length,
      draftQuestions:
        draftRows.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown POA parsing error.";

    console.error(
      "POA parse failed:",
      error,
    );

    await setParseError(
      supabase,
      plan.id,
      message,
    );

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}
