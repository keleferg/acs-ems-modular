/*
 * Automatic Plan of Action (Kele, Nov 12 2026). When an applicant submits the pretest qualification,
 * EMS builds the POA from the examiner's template (the knowledge test's missed codes become focus
 * areas), emails the applicant the scenario with a planning assignment and test-day details, and
 * logs each step in the request's History. Runs with the service key: from /api/poa/auto-build
 * right after the submit, and from the poa-auto-build scheduled function as a fallback.
 * Jobs live in public.poa_auto_builds (one per request; queued by a trigger on qualification_wizards).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

import { buildAutoPoaExaminerNoticeEmail, buildScenarioAssignmentApplicantEmail } from "../email/practical-test";
import { loadFocusAreas } from "./focus-load";
import {
  additionalHeldOptions,
  assembleTemplatePoa,
  hasSameRatingContent,
  loadPoaTemplate,
  poaRequirementsFor,
  saveTemplatePoa,
  type GeneratorScenarioOption,
  type LibraryQuestion,
  type PracticalTestType,
} from "./generate-core";
import { buildIfrContext, IFR_FILL_KEYS, type IfrContext } from "./ifr-context";
import { loadIfrInputs } from "./ifr-load";
import { loadAirportFacts, PLACE_CONDITION_KEYS, placeConditions } from "./place-conditions";
import {
  DEPARTURE_RADIUS_NM,
  LEG_RADIUS_NM,
  STOP_FILL_KEYS,
  distanceNm,
  locationFills,
  locationSnapshot,
  parseLegNm,
  pickPoaLocations,
  placeLabel,
  type PoaAirport,
  type PoaLocations,
} from "./locations";
import { fillTemplateText } from "./template-build";

const LABEL = "EMS (automatic)";
const MAX_ATTEMPTS = 3;

type RequestRow = {
  id: string;
  request_number: string;
  status: string | null;
  applicant_name_snapshot: string | null;
  applicant_email_snapshot: string | null;
  applicant_profile_id: string | null;
  assigned_examiner_profile_id: string | null;
  practical_test_type_id: string | null;
  certificate_sought: string | null;
  rating_sought: string | null;
  aircraft_make: string | null;
  aircraft_model: string | null;
  aircraft_registration: string | null;
  aircraft_is_taa: boolean | null;
  flight_airport_id: string | null;
  scheduled_start_at: string | null;
  scheduled_location: string | null;
};

export type AutoBuildResult = { status: "done" | "skipped" | "failed" | "not_queued"; message: string; poaId?: string };

class SkipBuild extends Error {}

async function history(service: SupabaseClient, requestId: string, text: string, type: "email" | "internal_note" = "internal_note") {
  const { error } = await service.from("practical_test_request_history").insert({
    practical_test_request_id: requestId,
    entry_text: text,
    entry_type: type,
    created_by_profile_id: null,
    created_by_label: LABEL,
  });
  if (error) console.error("Auto POA history entry failed:", error);
}

async function logEmail(
  service: SupabaseClient,
  input: { requestId: string; type: string; role: "applicant" | "examiner"; email: string; subject: string; ok: boolean; messageId?: string; error?: string },
) {
  const now = new Date().toISOString();
  const { error } = await service.from("practical_test_email_log").insert({
    practical_test_request_id: input.requestId,
    email_type: input.type,
    recipient_role: input.role,
    recipient_email: input.email,
    subject: input.subject,
    dedupe_key: `${input.type}:${input.requestId}`,
    status: input.ok ? "sent" : "failed",
    provider_message_id: input.messageId ?? null,
    error_message: input.error ?? null,
    attempted_by_profile_id: null,
    attempted_at: now,
    sent_at: input.ok ? now : null,
  });
  if (error) console.error("Auto POA email log failed:", error);
}

async function examinerContact(service: SupabaseClient, examinerId: string) {
  const [{ data: designee }, { data: profile }] = await Promise.all([
    service.from("examiner_designee_profiles").select("designee_name, reply_to_email, email").eq("profile_id", examinerId).maybeSingle(),
    service.from("profiles").select("first_name, last_name, email").eq("id", examinerId).maybeSingle(),
  ]);
  const name = designee?.designee_name?.trim() || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || null;
  const email = designee?.email?.trim() || profile?.email?.trim() || null;
  return { name, email, replyTo: designee?.reply_to_email?.trim() || email };
}

function mailer() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Email is not configured on the server.");
  return { resend: new Resend(apiKey), from };
}

/* ---------------------------------------------------------------- the scenario assignment */

function planningAssignment(
  testType: PracticalTestType,
  locations: PoaLocations | null,
  instrument: boolean,
  seaplane: boolean,
  ferry: boolean,
  landingSite: string | null,
) {
  const from = locations?.departure ? placeLabel(locations.departure) : "your departure airport";
  // On-demand trips go to a lake or river near a seaplane base ("the remote lake past …").
  const to = landingSite || (locations?.destination ? placeLabel(locations.destination) : "the destination in the scenario");
  const items = instrument
    ? [
        `Plan the IFR flight from ${from} to ${to}: departure procedure, route, altitudes and the approach you expect, with a navigation log.`,
        "Choose an alternate and show that it meets the alternate requirements (check the alternate minimums for the approaches you plan to use).",
        "Get a complete weather briefing for the planned time and be ready to explain your go/no-go decision.",
        "Check NOTAMs and TFRs for the departure, destination, alternate and route.",
        "Compute weight and balance, fuel required with reserves, and takeoff and landing performance.",
        "Bring the charts (or EFB) you will use: en route chart, departure and approach charts for each airport.",
      ]
    : [
        `Plan the flight from ${from} to ${to} as described in the scenario: route, checkpoints, cruising altitudes and a navigation log.`,
        "Get a complete weather briefing for the planned time and be ready to explain your go/no-go decision.",
        "Check NOTAMs and TFRs for the departure, destination and route.",
        "Compute weight and balance, fuel required with reserves, and takeoff and landing performance for the expected conditions.",
        "Know the airspace, airports and services along the route, and have a plan for diverting.",
      ];
  if (seaplane) {
    items.push("Research the water landing areas and seaplane bases you will use: dock or beach, hazards, local rules and fuel availability.");
  }
  if (ferry) {
    items.push("Plan every stop on the route: confirm which stops really have fuel and land at each with your required reserve.");
  }
  if ((testType.certificate_code ?? "").toUpperCase() === "COMMERCIAL") {
    items.push("Be ready to explain which regulations allow the flight in the scenario and what your commercial privileges and limits are.");
  }
  return items;
}

function bringList(seaplane: boolean) {
  return [
    "Government-issued photo ID",
    "Pilot certificate (or student pilot certificate) and medical certificate, if required",
    "Logbook with the required endorsements, and your airman knowledge test report",
    "Completed IACRA application (FTN and application ID)",
    "Aircraft documents: airworthiness and registration certificates, POH/AFM, current weight and balance",
    `Aircraft maintenance records showing the required inspections and AD compliance${seaplane ? " (including the floats)" : ""}`,
    "Your flight planning from the assignment above, and the examiner's fee",
  ];
}

/* ---------------------------------------------------------------- one build */

async function buildForRequest(service: SupabaseClient, request: RequestRow, origin: string) {
  const examinerId = request.assigned_examiner_profile_id;
  if (!examinerId) throw new SkipBuild("no examiner is assigned to the request");
  if (!request.practical_test_type_id) throw new SkipBuild("the request has no practical test type");
  if (!request.flight_airport_id) throw new SkipBuild("the request has no test airport, so real departure and destination airports can't be picked");

  const [{ data: testTypeData }, { data: allTypes }] = await Promise.all([
    service
      .from("practical_test_types")
      .select("id, certificate_code, issuance_code, category_code, class_code, rating_code, certificate_name, issuance_name, category_name, class_name, rating_name, display_name")
      .eq("id", request.practical_test_type_id)
      .maybeSingle(),
    service
      .from("practical_test_types")
      .select("id, certificate_code, issuance_code, category_code, class_code, rating_code, certificate_name, issuance_name, category_name, class_name, rating_name, display_name"),
  ]);
  if (!testTypeData) throw new SkipBuild("the practical test type couldn't be loaded");
  const testType = testTypeData as PracticalTestType;

  // Add-on ratings need the rating already held (the FAA task table depends on it).
  let ratingHeld: string | null = null;
  if (poaRequirementsFor(testType, null).isAdditionalIssuance) {
    const options = additionalHeldOptions(testType);
    if (options.length !== 1) {
      throw new SkipBuild("this is an additional rating and the rating already held must be chosen on the Generate page");
    }
    ratingHeld = options[0];
  }
  const requirements = poaRequirementsFor(testType, ratingHeld);

  const template = await loadPoaTemplate(service, testType, examinerId);
  if (!template) throw new SkipBuild(`there is no approved POA template for ${testType.display_name} yet`);

  // Scenario: the template's scenarios for this test, rotating away from the examiner's last one.
  const { data: scenarioRows } = await service
    .from("poa_scenarios")
    .select("id, scenario_name, scenario_brief, departure, destination, leg_nm, aircraft, initial_conditions, examiner_notes, mission_code, fills, location_needs, is_active, poa_scenario_practical_test_types!inner(practical_test_type_id)")
    .eq("is_active", true)
    .eq("poa_scenario_practical_test_types.practical_test_type_id", testType.id);
  const allScenarios = (scenarioRows ?? []) as unknown as GeneratorScenarioOption[];
  const pool = template.scenarioIds.length ? allScenarios.filter((s) => template.scenarioIds.includes(s.id)) : allScenarios;
  if (!pool.length) throw new SkipBuild("no scenarios are assigned to this practical test");
  const fresh = pool.filter((s) => s.id !== template.previousScenarioId);
  const choices = fresh.length ? fresh : pool;
  const scenario = choices[Math.floor(Math.random() * choices.length)];

  // Question bank (same content for original and add-on tests of the rating), for focus areas.
  const sharedIds = ((allTypes ?? []) as PracticalTestType[]).filter((t) => hasSameRatingContent(t, testType)).map((t) => t.id);
  if (!sharedIds.includes(testType.id)) sharedIds.push(testType.id);
  const { data: questionData } = await service
    .from("poa_questions")
    .select("id, question, answer, reference, topic, task_name, question_type, difficulty, created_at, aircraft_equipment, poa_question_acs_applicability(id, certificate_name, acs_reference), poa_question_practical_test_types!inner(practical_test_type_id)")
    .eq("is_active", true)
    .in("poa_question_practical_test_types.practical_test_type_id", sharedIds);
  const classCode = (testType.class_code ?? "").trim().toUpperCase();
  const airplane = ["ASEL", "AMEL", "ASES", "AMES"].includes(classCode) || (testType.rating_code ?? "").toUpperCase().includes("AIRPLANE");
  const equipment = airplane ? (request.aircraft_is_taa ? "taa" : "six_pack") : null;
  const questions = ((questionData ?? []) as unknown as LibraryQuestion[]).filter((q) => !q.aircraft_equipment || q.aircraft_equipment === equipment);

  // Real places, as the Locations panel picks them.
  const ratingCode = (testType.rating_code ?? "").trim().toUpperCase();
  const instrument = testType.certificate_code === "INSTRUMENT" || testType.certificate_code === "ATP" || ratingCode.startsWith("CFII");
  const seaplane = ["ASES", "AMES"].includes(classCode);
  const [{ data: dataStatus }, nearResult] = await Promise.all([
    service.rpc("poa_location_data_status"),
    service.rpc("examiner_poa_airports_near", {
      p_center_id: request.flight_airport_id,
      p_radius_nm: DEPARTURE_RADIUS_NM + LEG_RADIUS_NM,
      p_test_airport_id: request.flight_airport_id,
    }),
  ]);
  const near = (nearResult.data ?? []) as PoaAirport[];
  const testAirport = near.find((a) => a.id === request.flight_airport_id);
  if (!testAirport) throw new SkipBuild("the test airport isn't in the FAA airport list");
  const status = (dataStatus ?? {}) as { runways?: boolean; approaches?: boolean };
  const within = (center: PoaAirport, radius: number) => near.filter((a) => a.is_exception || distanceNm(center, a) <= radius);
  const locations = pickPoaLocations(testAirport, within(testAirport, DEPARTURE_RADIUS_NM), (dep) => within(dep, LEG_RADIUS_NM), {
    legNm: scenario.leg_nm ?? parseLegNm(scenario.destination),
    destinationKind: seaplane ? "seaplane" : "airport",
    instrument,
    stops: scenario.location_needs?.stops ?? [],
    preferRiver: Boolean(scenario.location_needs?.prefer_river),
    approachDataLoaded: Boolean(status.approaches),
    runwayDataLoaded: Boolean(status.runways),
  });

  let ifrContext: IfrContext | null = null;
  if (instrument && locations.destination) {
    const inputs = await loadIfrInputs(service, locations, equipment);
    if (inputs) ifrContext = buildIfrContext(inputs);
  }

  const made = [request.aircraft_make, request.aircraft_model].filter(Boolean).join(" ").trim();
  const fills: Record<string, string | null | undefined> = {
    ...locationFills(locations, { destination: scenario.destination ?? null, departure: scenario.departure ?? null }),
    aircraft: scenario.aircraft || (made ? `the ${made}` : "the aircraft"),
    ...(scenario.fills ?? {}),
    ...(scenario.location_needs?.stops?.length && !locations.stops?.length ? { "ferry stops": "the stops you plan along the route" } : {}),
    ...(ifrContext?.fills ?? {}),
  };
  // Place conditions (Kele, Nov 19 2026): no freezing weather in the tropics, tower events only at towered fields.
  const placeAvailable = placeConditions(locations, await loadAirportFacts(service, locations));
  const fillCheck = {
    keys: [...IFR_FILL_KEYS, ...STOP_FILL_KEYS, ...PLACE_CONDITION_KEYS],
    available: new Set([
      ...Object.keys(ifrContext?.fills ?? {}),
      ...Object.keys(locationFills(locations, {})).filter((key) => (STOP_FILL_KEYS as readonly string[]).includes(key)),
      ...placeAvailable,
    ]),
  };

  // Weak areas: the knowledge test's missed codes, the previous attempt, and the examiner's own trends.
  const focus = await loadFocusAreas(service, request.id, requirements.prefixes.find((p) => p !== "FI") ?? requirements.prefixes[0] ?? "", { examinerId });
  const focusAreas = focus?.areas ?? [];

  const assembled = assembleTemplatePoa({
    template,
    testType,
    scenario,
    questions,
    equipment,
    fills,
    fillCheck,
    requiredComplianceCodes: requirements.requiredComplianceCodes,
    requiredTaskParents: requirements.requiredTaskParents,
    complianceAcsPrefixes: requirements.prefixes,
    focusAreas,
  });

  const applicant = request.applicant_name_snapshot?.trim() || "Applicant";
  const saved = await saveTemplatePoa(
    service,
    {
      examiner_profile_id: examinerId,
      practical_test_type_id: testType.id,
      title: `${testType.display_name} Plan of Action — ${applicant}`,
      scenario_name: scenario.scenario_name,
      scenario_id: scenario.id,
      compliance_snapshot: assembled.complianceSnapshot,
      cross_country_required: assembled.crossCountryRequired,
      selection_method: "template",
      template_id: template.id,
      template_variants: assembled.variants,
      aircraft_equipment: equipment,
      practical_test_request_id: request.id,
      location_snapshot: locationSnapshot(locations),
      ifr_snapshot: ifrContext ? { ...ifrContext.snapshot, fills: ifrContext.fills } : null,
      focus_snapshot: focus
        ? {
            areas: focusAreas,
            turned_off: [],
            uncovered: assembled.focusPlan.uncovered,
            added: assembled.focusPlan.added.length,
            instructor: focus.instructorName,
            school: focus.schoolName,
            state: focus.stateName,
            automatic: true,
          }
        : null,
      status: "ready",
      notes: `Built automatically when ${applicant} submitted the pretest qualification, from the ${template.name} POA template (v${template.version}).`,
    },
    assembled,
    requirements.requiredFlightTasks as unknown as Array<Record<string, unknown>>,
    "service",
  );

  return { testType, template, scenario, locations, fills, focus, focusAreas, assembled, saved, instrument, seaplane };
}

/* ---------------------------------------------------------------- the job */

/** Runs the queued build for one request (no-op unless it's waiting). */
export async function runAutoPoaBuild(service: SupabaseClient, requestId: string, origin: string): Promise<AutoBuildResult> {
  const { data: job } = await service.from("poa_auto_builds").select("*").eq("practical_test_request_id", requestId).maybeSingle();
  if (!job || !["pending", "failed"].includes(job.status) || (job.attempts ?? 0) >= MAX_ATTEMPTS) {
    return { status: "not_queued", message: "No automatic POA build is waiting for this request." };
  }
  // Claim it (another run may have started it a moment ago).
  const { data: claimed } = await service
    .from("poa_auto_builds")
    .update({ status: "running", attempts: (job.attempts ?? 0) + 1, started_at: new Date().toISOString(), last_error: null })
    .eq("id", job.id)
    .eq("status", job.status)
    .select("id")
    .maybeSingle();
  if (!claimed) return { status: "not_queued", message: "The build is already running." };

  const { data: requestData } = await service
    .from("practical_test_requests")
    .select("id, request_number, status, applicant_name_snapshot, applicant_email_snapshot, applicant_profile_id, assigned_examiner_profile_id, practical_test_type_id, certificate_sought, rating_sought, aircraft_make, aircraft_model, aircraft_registration, aircraft_is_taa, flight_airport_id, scheduled_start_at, scheduled_location")
    .eq("id", requestId)
    .maybeSingle();
  const request = requestData as RequestRow | null;
  const base = origin.replace(/\/$/, "");
  if (!request) {
    await service.from("poa_auto_builds").update({ status: "skipped", last_error: "Request not found." }).eq("id", job.id);
    return { status: "skipped", message: "Request not found." };
  }
  const examiner = request.assigned_examiner_profile_id ? await examinerContact(service, request.assigned_examiner_profile_id) : null;
  const applicant = request.applicant_name_snapshot?.trim() || "Applicant";

  const noticeExaminer = async (heading: string, lines: string[]) => {
    if (!examiner?.email) return;
    try {
      const { resend, from } = mailer();
      const email = buildAutoPoaExaminerNoticeEmail({
        examinerName: examiner.name,
        applicantName: applicant,
        requestNumber: request.request_number,
        heading,
        lines,
        requestUrl: `${base}/examiner/requests`,
      });
      const result = await resend.emails.send({ from, to: [examiner.email], subject: email.subject, html: email.html, text: email.text });
      await logEmail(service, { requestId, type: "auto_poa_examiner", role: "examiner", email: examiner.email, subject: email.subject, ok: !result.error, messageId: result.data?.id, error: result.error?.message });
    } catch (error) {
      console.error("Auto POA examiner notice failed:", error);
    }
  };

  let built: Awaited<ReturnType<typeof buildForRequest>>;
  try {
    built = await buildForRequest(service, request, base);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof SkipBuild) {
      await service.from("poa_auto_builds").update({ status: "skipped", last_error: message, completed_at: new Date().toISOString() }).eq("id", job.id);
      await history(service, requestId, `Plan of Action not built automatically: ${message}. Build it from the request (Build POA).`);
      await noticeExaminer("Build the Plan of Action by hand", [
        `${applicant} submitted the pretest qualification, but EMS couldn't build the Plan of Action automatically: ${message}.`,
        "Open the request and use Build POA. The scenario email was not sent.",
      ]);
      return { status: "skipped", message };
    }
    const attempts = (job.attempts ?? 0) + 1;
    await service.from("poa_auto_builds").update({ status: "failed", last_error: message }).eq("id", job.id);
    if (attempts >= MAX_ATTEMPTS) {
      await history(service, requestId, `Automatic Plan of Action failed after ${attempts} tries: ${message}. Build it from the request (Build POA).`);
      await noticeExaminer("Automatic Plan of Action failed", [
        `EMS couldn't build the Plan of Action for ${applicant} (${message}).`,
        "Open the request and use Build POA. The scenario email was not sent.",
      ]);
    }
    return { status: "failed", message };
  }

  const { scenario, saved, focusAreas, assembled, locations, fills, testType, template } = built;
  const code = saved.versionCode ?? "the new POA";
  await service
    .from("poa_auto_builds")
    .update({ status: "built", generated_plan_of_action_id: saved.id, completed_at: new Date().toISOString() })
    .eq("id", job.id);

  // History: what the knowledge test report gave, and the POA that was built.
  const testCodes = focusAreas.filter((area) => area.source === "knowledge_test").map((area) => area.code);
  const focusCount = [...assembled.focusByItem.values()].filter((sources) => sources.includes("knowledge_test")).length;
  await history(
    service,
    requestId,
    testCodes.length
      ? `Knowledge test report read: ${testCodes.length} incorrectly answered area${testCodes.length === 1 ? "" : "s"} (${testCodes.join(", ")}). ${focusCount} POA question${focusCount === 1 ? "" : "s"} cover them.`
      : "Knowledge test report read: no incorrectly answered areas were entered.",
  );
  const route = [locations.departure ? placeLabel(locations.departure) : null, locations.destination ? placeLabel(locations.destination) : null].filter(Boolean).join(" → ");
  await history(
    service,
    requestId,
    `Plan of Action ${code} built automatically from the ${template.name} template: scenario "${scenario.scenario_name}"${route ? ` (${route})` : ""}, ${assembled.questionRows.length} questions, ${assembled.triggerCount} triggers.`,
  );

  // The scenario assignment to the applicant (copy to the examiner).
  let applicantEmail = request.applicant_email_snapshot?.trim() || null;
  if (!applicantEmail && request.applicant_profile_id) {
    const { data: profile } = await service.from("profiles").select("email").eq("id", request.applicant_profile_id).maybeSingle();
    applicantEmail = profile?.email?.trim() || null;
  }
  if (!applicantEmail) {
    await service.from("poa_auto_builds").update({ status: "done", last_error: "No applicant email." }).eq("id", job.id);
    await history(service, requestId, "Scenario assignment not emailed: the request has no applicant email.");
    return { status: "done", message: "POA built; no applicant email.", poaId: saved.id };
  }
  const email = buildScenarioAssignmentApplicantEmail({
    applicantName: applicant,
    requestNumber: request.request_number,
    certificateSought: request.certificate_sought ?? testType.certificate_name,
    ratingSought: request.rating_sought ?? testType.rating_name,
    examinerName: examiner?.name ?? null,
    scheduledStartAt: request.scheduled_start_at,
    scheduledLocation: request.scheduled_location,
    scenarioName: scenario.scenario_name,
    scenarioBrief: fillTemplateText(scenario.scenario_brief ?? scenario.scenario_name, fills),
    planning: planningAssignment(
      testType,
      locations,
      built.instrument,
      built.seaplane,
      scenario.mission_code === "ferry",
      scenario.mission_code === "on_demand" && fills["landing site"] ? fillTemplateText(String(fills["landing site"]), fills) : null,
    ),
    bring: bringList(built.seaplane),
    portalUrl: `${base}/applicant/requests`,
  });
  try {
    const { resend, from } = mailer();
    const result = await resend.emails.send({
      from,
      to: [applicantEmail],
      bcc: examiner?.email ? [examiner.email] : undefined,
      replyTo: examiner?.replyTo ?? undefined,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    const ok = !result.error;
    await logEmail(service, { requestId, type: "scenario_assignment_applicant", role: "applicant", email: applicantEmail, subject: email.subject, ok, messageId: result.data?.id, error: result.error?.message });
    await service
      .from("poa_auto_builds")
      .update({ status: ok ? "done" : "built", email_sent_at: ok ? new Date().toISOString() : null, last_error: ok ? null : result.error?.message ?? "Email failed." })
      .eq("id", job.id);
    await history(
      service,
      requestId,
      ok
        ? `Scenario assignment emailed to ${applicantEmail}: "${scenario.scenario_name}" with the planning assignment and test-day details (copy to the examiner).`
        : `Scenario assignment email to ${applicantEmail} failed: ${result.error?.message ?? "unknown error"}.`,
      "email",
    );
    return { status: "done", message: ok ? "POA built and scenario emailed." : "POA built; the email failed.", poaId: saved.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await service.from("poa_auto_builds").update({ status: "built", last_error: message }).eq("id", job.id);
    await history(service, requestId, `Scenario assignment email to ${applicantEmail} failed: ${message}.`, "email");
    return { status: "done", message: `POA built; the email failed (${message}).`, poaId: saved.id };
  }
}

/** Runs every waiting build (the scheduled fallback). */
export async function runPendingAutoPoaBuilds(service: SupabaseClient, origin: string, limit = 5) {
  const { data } = await service
    .from("poa_auto_builds")
    .select("practical_test_request_id")
    .in("status", ["pending", "failed"])
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(limit);
  const results: AutoBuildResult[] = [];
  for (const row of data ?? []) {
    results.push(await runAutoPoaBuild(service, row.practical_test_request_id as string, origin));
  }
  return results;
}
