"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PracticalTestType = {
  id: string;
  certificate_name: string;
  issuance_name: string;
  category_name: string | null;
  class_name: string | null;
  rating_name: string;
  display_name: string | null;
  is_active: boolean;
  sort_order: number;
};

type PracticalTestFee = {
  id: string;
  practical_test_type_id: string;
  fee_amount: number;
  fee_label: string | null;
  applicant_note: string | null;
  internal_note: string | null;
  is_active: boolean;
  sort_order: number;
};

type EditableFee = {
  id: string | null;
  amount: string;
  feeLabel: string;
  applicantNote: string;
  internalNote: string;
  isActive: boolean;
};

type FeeRow = {
  testType: PracticalTestType;
  fee: EditableFee;
};

function emptyFee(): EditableFee {
  return {
    id: null,
    amount: "",
    feeLabel: "",
    applicantNote: "",
    internalNote: "",
    isActive: true,
  };
}

function formatCurrency(value: string | number | null) {
  if (value === null || value === "") {
    return "Not configured";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Not configured";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function buildTestDescription(testType: PracticalTestType) {
  return [
    testType.issuance_name,
    testType.category_name,
    testType.class_name,
    testType.rating_name,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function ExaminerFeesPage() {
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [profileId, setProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [certificateFilter, setCertificateFilter] = useState("all");
  const [showInactiveTypes, setShowInactiveTypes] = useState(false);
  const [expandedTypeId, setExpandedTypeId] = useState<string | null>(null);
  const [savingTypeId, setSavingTypeId] = useState<string | null>(null);
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [groupFeeDrafts, setGroupFeeDrafts] = useState<Record<string, string>>(
    {},
  );
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadFees() {
      setLoading(true);
      setPageError("");

      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setPageError(
          "Your login session could not be verified. Please sign in again.",
        );
        setLoading(false);
        return;
      }

      setProfileId(user.id);

      const { data: roleRows, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("profile_id", user.id)
        .in("role", ["examiner", "administrator"]);

      if (cancelled) return;

      if (roleError) {
        setPageError(
          `Your examiner access could not be verified: ${roleError.message}`,
        );
        setLoading(false);
        return;
      }

      if (!roleRows || roleRows.length === 0) {
        setPageError(
          "Examiner or administrator access is required to manage the fee schedule.",
        );
        setLoading(false);
        return;
      }

      const [typesResult, feesResult] = await Promise.all([
        supabase
          .from("practical_test_types")
          .select(
            `
            id,
            certificate_name,
            issuance_name,
            category_name,
            class_name,
            rating_name,
            display_name,
            is_active,
            sort_order
          `,
          )
          .eq("is_offered", true)
          .order("sort_order", { ascending: true })
          .order("certificate_name", { ascending: true })
          .order("issuance_name", { ascending: true })
          .order("rating_name", { ascending: true }),

        supabase.from("examiner_practical_test_fees").select(`
            id,
            practical_test_type_id,
            fee_amount,
            fee_label,
            applicant_note,
            internal_note,
            is_active,
            sort_order
          `)
          .eq("examiner_profile_id", user.id),
      ]);

      if (cancelled) return;

      if (typesResult.error) {
        setPageError(
          `Practical-test types could not be loaded: ${typesResult.error.message}`,
        );
        setLoading(false);
        return;
      }

      if (feesResult.error) {
        setPageError(
          `The fee schedule could not be loaded: ${feesResult.error.message}`,
        );
        setLoading(false);
        return;
      }

      const feesByType = new Map(
        ((feesResult.data ?? []) as PracticalTestFee[]).map((fee) => [
          fee.practical_test_type_id,
          fee,
        ]),
      );

      const mergedRows = ((typesResult.data ?? []) as PracticalTestType[]).map(
        (testType): FeeRow => {
          const savedFee = feesByType.get(testType.id);

          return {
            testType,
            fee: savedFee
              ? {
                  id: savedFee.id,
                  amount: String(savedFee.fee_amount),
                  feeLabel: savedFee.fee_label ?? "",
                  applicantNote: savedFee.applicant_note ?? "",
                  internalNote: savedFee.internal_note ?? "",
                  isActive: savedFee.is_active,
                }
              : emptyFee(),
          };
        },
      );

      setRows(mergedRows);
      setLoading(false);
    }

    void loadFees();

    return () => {
      cancelled = true;
    };
  }, []);

  const certificateOptions = useMemo(
    () =>
      [...new Set(rows.map((row) => row.testType.certificate_name))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [rows],
  );

  const visibleRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (!showInactiveTypes && !row.testType.is_active) return false;

      if (
        certificateFilter !== "all" &&
        row.testType.certificate_name !== certificateFilter
      ) {
        return false;
      }

      if (!normalizedSearch) return true;

      return [
        row.testType.certificate_name,
        buildTestDescription(row.testType),
        row.testType.display_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [rows, search, certificateFilter, showInactiveTypes]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, FeeRow[]>();

    for (const row of visibleRows) {
      const certificate = row.testType.certificate_name;
      const existing = groups.get(certificate) ?? [];
      existing.push(row);
      groups.set(certificate, existing);
    }

    return [...groups.entries()];
  }, [visibleRows]);

  const configuredCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.fee.amount.trim() !== "" &&
          Number.isFinite(Number(row.fee.amount)),
      ).length,
    [rows],
  );

  const publishedCount = useMemo(
    () =>
      rows.filter((row) => row.fee.amount.trim() !== "" && row.fee.isActive)
        .length,
    [rows],
  );

  function updateFee(testTypeId: string, updates: Partial<EditableFee>) {
    setRows((current) =>
      current.map((row) =>
        row.testType.id === testTypeId
          ? {
              ...row,
              fee: {
                ...row.fee,
                ...updates,
              },
            }
          : row,
      ),
    );

    setRowErrors((current) => {
      const next = { ...current };
      delete next[testTypeId];
      return next;
    });

    setMessage("");
  }

  async function saveFee(row: FeeRow) {
    if (savingTypeId || savingGroup) return;

    const testTypeId = row.testType.id;
    const amountText = row.fee.amount.trim();

    setSavingTypeId(testTypeId);
    setMessage("");
    setRowErrors((current) => {
      const next = { ...current };
      delete next[testTypeId];
      return next;
    });

    const supabase = createClient();

    try {
      if (!amountText) {
        if (row.fee.id) {
          const { error } = await supabase
            .from("examiner_practical_test_fees")
            .delete()
            .eq("id", row.fee.id);

          if (error) throw error;
        }

        updateFee(testTypeId, emptyFee());
        setMessage(
          `Fee removed for ${row.testType.display_name ?? buildTestDescription(row.testType)}.`,
        );
        setExpandedTypeId(null);
        return;
      }

      const amount = Number(amountText);

      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("Enter a valid fee amount of zero or greater.");
      }

      if (!profileId) {
        throw new Error(
          "Examiner profile could not be determined.",
        );
      }

      const feePayload = {
        examiner_profile_id: profileId,
        practical_test_type_id: testTypeId,
        fee_amount: amount,
        fee_label: row.fee.feeLabel.trim() || null,
        applicant_note: row.fee.applicantNote.trim() || null,
        internal_note: row.fee.internalNote.trim() || null,
        is_active: row.fee.isActive,
        sort_order: row.testType.sort_order,
      };

      const { data, error } = await supabase
        .from("examiner_practical_test_fees")
        .upsert(feePayload, {
          onConflict: "examiner_profile_id,practical_test_type_id",
        })
        .select(
          `
          id,
          practical_test_type_id,
          fee_amount,
          fee_label,
          applicant_note,
          internal_note,
          is_active,
          sort_order
        `,
        )
        .single();

      if (error) throw error;

      const savedFee = data as PracticalTestFee;

      updateFee(testTypeId, {
        id: savedFee.id,
        amount: String(savedFee.fee_amount),
        feeLabel: savedFee.fee_label ?? "",
        applicantNote: savedFee.applicant_note ?? "",
        internalNote: savedFee.internal_note ?? "",
        isActive: savedFee.is_active,
      });

      setMessage(
        `Fee saved for ${row.testType.display_name ?? buildTestDescription(row.testType)}.`,
      );
      setExpandedTypeId(null);
    } catch (error) {
      const errorText =
        error instanceof Error ? error.message : "The fee could not be saved.";

      setRowErrors((current) => ({
        ...current,
        [testTypeId]: errorText,
      }));
    } finally {
      setSavingTypeId(null);
    }
  }

  async function applyGroupFee(certificate: string, groupRows: FeeRow[]) {
    if (savingTypeId || savingGroup) return;

    const amountText = (groupFeeDrafts[certificate] ?? "").trim();
    const amount = Number(amountText);

    if (!amountText || !Number.isFinite(amount) || amount < 0) {
      setPageError(
        `Enter a valid group fee of zero or greater for ${certificate}.`,
      );
      return;
    }

    setSavingGroup(certificate);
    setPageError("");
    setMessage("");

    const supabase = createClient();

    if (!profileId) {
      setPageError(
        "Examiner profile could not be determined.",
      );
      setSavingGroup(null);
      return;
    }

    const payload = groupRows.map((row) => ({
      examiner_profile_id: profileId,
      practical_test_type_id: row.testType.id,
      fee_amount: amount,
      fee_label: row.fee.feeLabel.trim() || null,
      applicant_note: row.fee.applicantNote.trim() || null,
      internal_note: row.fee.internalNote.trim() || null,
      is_active: true,
      sort_order: row.testType.sort_order,
    }));

    const { data, error } = await supabase
      .from("examiner_practical_test_fees")
      .upsert(payload, {
        onConflict: "examiner_profile_id,practical_test_type_id",
      }).select(`
        id,
        practical_test_type_id,
        fee_amount,
        fee_label,
        applicant_note,
        internal_note,
        is_active,
        sort_order
      `);

    if (error) {
      setPageError(
        `The ${certificate} group fee could not be saved: ${error.message}`,
      );
      setSavingGroup(null);
      return;
    }

    const savedByType = new Map(
      ((data ?? []) as PracticalTestFee[]).map((fee) => [
        fee.practical_test_type_id,
        fee,
      ]),
    );

    setRows((current) =>
      current.map((row) => {
        const savedFee = savedByType.get(row.testType.id);

        if (!savedFee) return row;

        return {
          ...row,
          fee: {
            id: savedFee.id,
            amount: String(savedFee.fee_amount),
            feeLabel: savedFee.fee_label ?? "",
            applicantNote: savedFee.applicant_note ?? "",
            internalNote: savedFee.internal_note ?? "",
            isActive: savedFee.is_active,
          },
        };
      }),
    );

    setMessage(
      `${formatCurrency(amount)} was applied to all ${groupRows.length} offered ${certificate} practical tests.`,
    );
    setSavingGroup(null);
  }

  return (
    <main>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
          Settings
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">Fee Schedule</h2>

        <p className="mt-2 text-slate-600">
          Configure fees for offered practical tests. Apply one fee to an entire
          certificate group, then adjust individual tests when needed.
        </p>
      </div>

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          {message}
        </div>
      ) : null}

      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {pageError}
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Offered tests</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {rows.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Fees configured</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {configuredCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Published fees</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {publishedCount}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_240px_auto] xl:items-end">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Search
            </label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search certificate, issuance, category, class, or rating"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Certificate
            </label>
            <select
              value={certificateFilter}
              onChange={(event) => setCertificateFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
            >
              <option value="all">All certificates</option>
              {certificateOptions.map((certificate) => (
                <option key={certificate} value={certificate}>
                  {certificate}
                </option>
              ))}
            </select>
          </div>

          <label className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={showInactiveTypes}
              onChange={(event) => setShowInactiveTypes(event.target.checked)}
              className="h-4 w-4"
            />
            Show inactive test types
          </label>
        </div>
      </section>

      {loading ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-slate-600">
          Loading fee schedule…
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          {groupedRows.map(([certificate, groupRows]) => (
            <section
              key={certificate}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {certificate}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {groupRows.length} offered practical test
                      {groupRows.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div>
                      <label
                        htmlFor={`group-fee-${certificate}`}
                        className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600"
                      >
                        Group fee
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                          $
                        </span>
                        <input
                          id={`group-fee-${certificate}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={groupFeeDrafts[certificate] ?? ""}
                          onChange={(event) =>
                            setGroupFeeDrafts((current) => ({
                              ...current,
                              [certificate]: event.target.value,
                            }))
                          }
                          placeholder="0.00"
                          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 sm:w-44"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void applyGroupFee(certificate, groupRows)}
                      disabled={Boolean(savingTypeId || savingGroup)}
                      className="rounded-lg bg-amber-600 px-5 py-2.5 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingGroup === certificate
                        ? "Applying…"
                        : "Apply to Group"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {groupRows.map((row) => {
                  const expanded = expandedTypeId === row.testType.id;
                  const hasConfiguredFee = row.fee.amount.trim() !== "";
                  const saving = savingTypeId === row.testType.id;

                  return (
                    <article key={row.testType.id}>
                      <div className="flex flex-col gap-4 px-5 py-4 hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTypeId(expanded ? null : row.testType.id)
                          }
                          className="min-w-0 flex-1 text-left"
                          aria-expanded={expanded}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {row.testType.display_name ??
                                buildTestDescription(row.testType)}
                            </p>

                            {!row.testType.is_active ? (
                              <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                Inactive
                              </span>
                            ) : null}

                            {hasConfiguredFee && row.fee.isActive ? (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                Published
                              </span>
                            ) : null}

                            {hasConfiguredFee && !row.fee.isActive ? (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                Hidden
                              </span>
                            ) : null}

                            {!hasConfiguredFee ? (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                Not Configured
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            {buildTestDescription(row.testType)}
                          </p>
                        </button>

                        <div className="flex shrink-0 items-center gap-4">
                          <p className="min-w-28 text-right text-lg font-bold text-slate-900">
                            {hasConfiguredFee
                              ? formatCurrency(row.fee.amount)
                              : "—"}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTypeId(
                                expanded ? null : row.testType.id,
                              )
                            }
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                          >
                            {expanded ? "Close" : "Edit"}
                          </button>
                        </div>
                      </div>

                      {expanded ? (
                        <div className="border-t border-slate-200 bg-slate-50 px-5 py-6">
                          <div className="grid gap-6 lg:grid-cols-2">
                            <div>
                              <label
                                htmlFor={`fee-${row.testType.id}`}
                                className="mb-2 block text-sm font-semibold text-slate-800"
                              >
                                Fee amount
                              </label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                                  $
                                </span>
                                <input
                                  id={`fee-${row.testType.id}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={row.fee.amount}
                                  onChange={(event) =>
                                    updateFee(row.testType.id, {
                                      amount: event.target.value,
                                    })
                                  }
                                  placeholder="0.00"
                                  className="w-full rounded-lg border border-slate-300 py-3 pl-9 pr-4 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                                />
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                Individual changes override the group fee.
                              </p>
                            </div>

                            <div>
                              <label
                                htmlFor={`label-${row.testType.id}`}
                                className="mb-2 block text-sm font-semibold text-slate-800"
                              >
                                Fee label
                              </label>
                              <input
                                id={`label-${row.testType.id}`}
                                value={row.fee.feeLabel}
                                onChange={(event) =>
                                  updateFee(row.testType.id, {
                                    feeLabel: event.target.value,
                                  })
                                }
                                placeholder="Example: Standard practical-test fee"
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`applicant-note-${row.testType.id}`}
                                className="mb-2 block text-sm font-semibold text-slate-800"
                              >
                                Applicant-facing note
                              </label>
                              <textarea
                                id={`applicant-note-${row.testType.id}`}
                                rows={4}
                                value={row.fee.applicantNote}
                                onChange={(event) =>
                                  updateFee(row.testType.id, {
                                    applicantNote: event.target.value,
                                  })
                                }
                                placeholder="This note will be visible to applicants."
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`internal-note-${row.testType.id}`}
                                className="mb-2 block text-sm font-semibold text-slate-800"
                              >
                                Internal examiner note
                              </label>
                              <textarea
                                id={`internal-note-${row.testType.id}`}
                                rows={4}
                                value={row.fee.internalNote}
                                onChange={(event) =>
                                  updateFee(row.testType.id, {
                                    internalNote: event.target.value,
                                  })
                                }
                                placeholder="Private note for examiners and administrators."
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                              />
                            </div>
                          </div>

                          <label className="mt-6 flex items-start gap-3 rounded-lg border border-slate-300 bg-white px-4 py-4">
                            <input
                              type="checkbox"
                              checked={row.fee.isActive}
                              onChange={(event) =>
                                updateFee(row.testType.id, {
                                  isActive: event.target.checked,
                                })
                              }
                              className="mt-1 h-4 w-4"
                            />
                            <span>
                              <span className="block text-sm font-semibold text-slate-900">
                                Publish this fee
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">
                                Published fees can be shown to applicants during
                                the request process.
                              </span>
                            </span>
                          </label>

                          {rowErrors[row.testType.id] ? (
                            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                              {rowErrors[row.testType.id]}
                            </div>
                          ) : null}

                          <div className="mt-6 flex justify-end">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void saveFee(row)}
                              className="rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {saving
                                ? "Saving Fee…"
                                : hasConfiguredFee
                                  ? "Save Fee Changes"
                                  : "Add Fee"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {groupedRows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
              No practical-test records match the current filters.
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
