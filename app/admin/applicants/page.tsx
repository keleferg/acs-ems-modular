"use client";

import { createClient } from "@/lib/supabase/client";
import {
  Archive,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type ApplicantInfoProfile = {
  id: string;
  created_by_profile_id: string;
  linked_applicant_profile_id: string | null;
  full_legal_name: string;
  email: string | null;
  phone: string | null;
  ftn_number: string | null;
  pilot_certificate_number: string | null;
  flight_school_id: string | null;
  flight_school_name_other: string | null;
  mailing_address_line_1: string | null;
  mailing_address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  admin_notes: string | null;
  status: "active" | "inactive" | "archived";
  created_at: string;
  updated_at: string;
};

type FlightSchool = {
  id: string;
  name: string;
};

type Draft = {
  fullLegalName: string;
  email: string;
  phone: string;
  ftnNumber: string;
  pilotCertificateNumber: string;
  flightSchoolId: string;
  otherFlightSchool: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  adminNotes: string;
  status: ApplicantInfoProfile["status"];
};

const EMPTY_DRAFT: Draft = {
  fullLegalName: "",
  email: "",
  phone: "",
  ftnNumber: "",
  pilotCertificateNumber: "",
  flightSchoolId: "",
  otherFlightSchool: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "United States",
  adminNotes: "",
  status: "active",
};

function nullable(value: string) {
  const clean = value.trim();
  return clean || null;
}

function profileToDraft(profile: ApplicantInfoProfile): Draft {
  return {
    fullLegalName: profile.full_legal_name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    ftnNumber: profile.ftn_number ?? "",
    pilotCertificateNumber: profile.pilot_certificate_number ?? "",
    flightSchoolId: profile.flight_school_id ?? "",
    otherFlightSchool: profile.flight_school_name_other ?? "",
    address1: profile.mailing_address_line_1 ?? "",
    address2: profile.mailing_address_line_2 ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    postalCode: profile.postal_code ?? "",
    country: profile.country ?? "United States",
    adminNotes: profile.admin_notes ?? "",
    status: profile.status,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function AdminApplicantsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [records, setRecords] = useState<ApplicantInfoProfile[]>([]);
  const [schools, setSchools] = useState<FlightSchool[]>([]);
  const [adminId, setAdminId] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("Your administrator session could not be verified.");
      setLoading(false);
      return;
    }

    setAdminId(user.id);

    const [recordResult, schoolResult] = await Promise.all([
      supabase
        .from("admin_applicant_info_profiles")
        .select("*")
        .order("updated_at", { ascending: false }),

      supabase
        .from("flight_schools")
        .select("id,name")
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
    ]);

    if (recordResult.error) {
      setErrorMessage(
        `Applicant Info could not be loaded: ${recordResult.error.message}`,
      );
      setLoading(false);
      return;
    }

    if (schoolResult.error) {
      console.warn("Flight schools could not be loaded:", schoolResult.error);
    }

    setRecords((recordResult.data ?? []) as ApplicantInfoProfile[]);
    setSchools((schoolResult.data ?? []) as FlightSchool[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const visibleRecords = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return records;

    return records.filter((record) =>
      [
        record.full_legal_name,
        record.email,
        record.phone,
        record.ftn_number,
        record.pilot_certificate_number,
        record.flight_school_name_other,
        record.city,
        record.state,
        record.admin_notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [records, search]);

  function startCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setMessage("");
    setErrorMessage("");
    setFormOpen(true);
  }

  function startEdit(record: ApplicantInfoProfile) {
    setEditingId(record.id);
    setDraft(profileToDraft(record));
    setMessage("");
    setErrorMessage("");
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormOpen(false);
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!adminId || saving) return;

    if (!draft.fullLegalName.trim()) {
      setErrorMessage("Full legal name is required.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const selectedSchool = schools.find(
      (school) => school.id === draft.flightSchoolId,
    );

    const payload = {
      created_by_profile_id: adminId,
      full_legal_name: draft.fullLegalName.trim(),
      email: nullable(draft.email)?.toLowerCase() ?? null,
      phone: nullable(draft.phone),
      ftn_number: nullable(draft.ftnNumber),
      pilot_certificate_number: nullable(draft.pilotCertificateNumber),
      flight_school_id: nullable(draft.flightSchoolId),
      flight_school_name_other: draft.flightSchoolId
        ? (selectedSchool?.name ?? null)
        : nullable(draft.otherFlightSchool),
      mailing_address_line_1: nullable(draft.address1),
      mailing_address_line_2: nullable(draft.address2),
      city: nullable(draft.city),
      state: nullable(draft.state),
      postal_code: nullable(draft.postalCode),
      country: nullable(draft.country) ?? "United States",
      admin_notes: nullable(draft.adminNotes),
      status: draft.status,
    };

    const result = editingId
      ? await supabase
          .from("admin_applicant_info_profiles")
          .update(payload)
          .eq("id", editingId)
          .select("id")
          .single()
      : await supabase
          .from("admin_applicant_info_profiles")
          .insert(payload)
          .select("id")
          .single();

    if (result.error) {
      setErrorMessage(
        `Applicant Info profile could not be saved: ${result.error.message}`,
      );
      setSaving(false);
      return;
    }

    const savedId = result.data.id;

    if (draft.email.trim()) {
      const { error: linkError } = await supabase.rpc(
        "admin_try_link_applicant_info_profile",
        {
          p_admin_profile_id: savedId,
        },
      );

      if (linkError) {
        console.warn("Automatic EMS applicant linking deferred:", linkError);
      }
    }

    const wasEditing = Boolean(editingId);

    closeForm();
    await loadRecords();

    setMessage(
      wasEditing
        ? "Applicant Info profile updated."
        : "Applicant Info profile created.",
    );

    setSaving(false);
  }

  async function tryLink(record: ApplicantInfoProfile) {
    setLinkingId(record.id);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_try_link_applicant_info_profile",
      {
        p_admin_profile_id: record.id,
      },
    );

    if (error) {
      setErrorMessage(
        `EMS applicant link could not be checked: ${error.message}`,
      );
    } else if (data) {
      setMessage(
        `${record.full_legal_name} is now linked to the matching EMS applicant account.`,
      );
      await loadRecords();
    } else {
      setMessage(
        `No EMS applicant account currently matches ${record.email || "this Applicant Info profile"}.`,
      );
    }

    setLinkingId(null);
  }

  async function archiveProfile(record: ApplicantInfoProfile) {
    if (
      !window.confirm(
        `Archive Applicant Info profile for ${record.full_legal_name}?`,
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("admin_applicant_info_profiles")
      .update({ status: "archived" })
      .eq("id", record.id);

    if (error) {
      setErrorMessage(
        `Applicant Info profile could not be archived: ${error.message}`,
      );
      return;
    }

    setMessage(`${record.full_legal_name} archived.`);
    await loadRecords();
  }

  async function deleteProfile(record: ApplicantInfoProfile) {
    if (
      !window.confirm(
        `Permanently delete the Applicant Info profile for ${record.full_legal_name}?\n\nThis will NOT delete a real EMS applicant login, practical-test request, evaluation, or report.`,
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("admin_applicant_info_profiles")
      .delete()
      .eq("id", record.id);

    if (error) {
      setErrorMessage(
        `Applicant Info profile could not be deleted: ${error.message}`,
      );
      return;
    }

    setMessage(`${record.full_legal_name} deleted.`);
    await loadRecords();
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Administrator Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Applicant Info
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Build and maintain Applicant Info profiles even before the applicant
            creates an EMS account.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void loadRecords()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            Create Applicant Info Profile
          </button>
        </div>
      </div>

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-900">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {formOpen ? (
        <form
          onSubmit={saveProfile}
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-start justify-between gap-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {editingId
                  ? "Edit Applicant Info Profile"
                  : "New Applicant Info Profile"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                This is an administrative Applicant Info record and does not
                require an EMS login.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Full Legal Name"
              required
              value={draft.fullLegalName}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  fullLegalName: value,
                }))
              }
            />

            <Field
              label="Email"
              type="email"
              value={draft.email}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  email: value,
                }))
              }
            />

            <Field
              label="Phone"
              value={draft.phone}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  phone: value,
                }))
              }
            />

            <Field
              label="FTN"
              value={draft.ftnNumber}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  ftnNumber: value,
                }))
              }
            />

            <Field
              label="FAA Certificate Number"
              value={draft.pilotCertificateNumber}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  pilotCertificateNumber: value,
                }))
              }
            />

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Status
              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target
                      .value as ApplicantInfoProfile["status"],
                  }))
                }
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Flight School
              <select
                value={draft.flightSchoolId}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    flightSchoolId: event.target.value,
                  }))
                }
                className="h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-900"
              >
                <option value="">Other / None</option>

                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>

            {!draft.flightSchoolId ? (
              <Field
                label="Other Flight School"
                value={draft.otherFlightSchool}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    otherFlightSchool: value,
                  }))
                }
              />
            ) : null}
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Mailing Address
            </h3>

            <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Field
                label="Address Line 1"
                value={draft.address1}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    address1: value,
                  }))
                }
              />

              <Field
                label="Address Line 2"
                value={draft.address2}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    address2: value,
                  }))
                }
              />

              <Field
                label="City"
                value={draft.city}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    city: value,
                  }))
                }
              />

              <Field
                label="State"
                value={draft.state}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    state: value,
                  }))
                }
              />

              <Field
                label="Postal Code"
                value={draft.postalCode}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    postalCode: value,
                  }))
                }
              />

              <Field
                label="Country"
                value={draft.country}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    country: value,
                  }))
                }
              />
            </div>
          </div>

          <div className="mt-6">
            <TextArea
              label="Administrator Notes"
              value={draft.adminNotes}
              rows={5}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  adminNotes: value,
                }))
              }
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : editingId
                  ? "Save Applicant Info"
                  : "Create Applicant Info"}
            </button>
          </div>
        </form>
      ) : null}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search applicant name, email, FTN, certificate number, school, location, or notes..."
            className="h-12 w-full rounded-xl border border-slate-300 pl-12 pr-4 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          />
        </div>
      </section>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">
          Loading Applicant Info…
        </div>
      ) : null}

      {!loading && visibleRecords.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <UserRound className="mx-auto h-10 w-10 text-slate-400" />

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            No Applicant Info profiles found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Create an Applicant Info profile to begin.
          </p>
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {visibleRecords.map((record) => {
          const schoolName =
            schools.find((school) => school.id === record.flight_school_id)
              ?.name ??
            record.flight_school_name_other ??
            "—";

          return (
            <article
              key={record.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-950">
                      {record.full_legal_name}
                    </h2>

                    <StatusBadge status={record.status} />

                    {record.linked_applicant_profile_id ? (
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
                        Linked EMS Applicant
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        Admin-Created Profile
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                    <span>{record.email || "No email"}</span>
                    <span>{record.phone || "No phone"}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!record.linked_applicant_profile_id && record.email ? (
                    <button
                      type="button"
                      disabled={linkingId === record.id}
                      onClick={() => void tryLink(record)}
                      className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800"
                    >
                      <Link2 className="h-4 w-4" />
                      {linkingId === record.id
                        ? "Checking…"
                        : "Link EMS Applicant"}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => startEdit(record)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>

                  {record.status !== "archived" ? (
                    <button
                      type="button"
                      onClick={() => void archiveProfile(record)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void deleteProfile(record)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <Info label="FTN" value={record.ftn_number} />

                <Info
                  label="FAA Certificate"
                  value={record.pilot_certificate_number}
                />

                <Info label="Flight School" value={schoolName} />

                <Info
                  label="Last Updated"
                  value={formatDate(record.updated_at)}
                />

                <Info
                  label="Address"
                  value={[
                    record.mailing_address_line_1,
                    record.mailing_address_line_2,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />

                <Info
                  label="City / State"
                  value={[record.city, record.state, record.postal_code]
                    .filter(Boolean)
                    .join(" ")}
                />
              </div>

              {record.admin_notes ? (
                <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                    Administrator Notes
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {record.admin_notes}
                  </p>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}

      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-slate-300 px-3 font-normal text-slate-900"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}

      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-300 px-3 py-3 font-normal text-slate-900"
      />
    </label>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-800">
        {value?.trim() || "—"}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: ApplicantInfoProfile["status"] }) {
  const style =
    status === "active"
      ? "bg-emerald-100 text-emerald-800"
      : status === "archived"
        ? "bg-slate-200 text-slate-700"
        : "bg-amber-100 text-amber-800";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
