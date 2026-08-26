"use client";

import { Check, ClipboardCheck, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RoleRequest = {
  request_id: string;
  profile_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  requested_role: string;
  status: string;
  requested_flight_school_id: string | null;
  flight_school_name: string | null;
  requested_school_name: string | null;
  instructor_certificate_number: string | null;
  instructor_certificate_expiration_date: string | null;
  request_notes: string | null;
  granted_role: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
};

function requestedRoleLabel(role: string) {
  if (role === "applicant") return "Applicant";
  if (role === "instructor") return "Instructor";
  if (role === "school") return "School";
  return role;
}

export default function AdminRoleRequestsPage() {
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [schoolGrantRoles, setSchoolGrantRoles] = useState<
    Record<string, string>
  >({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "admin_get_portal_role_requests",
      {
        p_status: statusFilter,
      },
    );

    if (error) {
      setErrorMessage(error.message);
      setRequests([]);
    } else {
      const rows = (data ?? []) as RoleRequest[];

      setRequests(rows);

      setSchoolGrantRoles((current) => {
        const next = { ...current };

        for (const request of rows) {
          if (
            request.requested_role === "school" &&
            !next[request.request_id]
          ) {
            next[request.request_id] = "flight_school_staff";
          }
        }

        return next;
      });
    }

    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function reviewRequest(
    request: RoleRequest,
    decision: "approved" | "denied",
  ) {
    setSavingRequestId(request.request_id);
    setMessage("");
    setErrorMessage("");

    const grantedRole =
      request.requested_role === "school" && decision === "approved"
        ? (schoolGrantRoles[request.request_id] ?? "flight_school_staff")
        : null;

    const supabase = createClient();

    const { error } = await supabase.rpc("admin_review_portal_role_request", {
      p_request_id: request.request_id,
      p_decision: decision,
      p_granted_role: grantedRole,
      p_review_notes: reviewNotes[request.request_id]?.trim() || null,
    });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setMessage(
        decision === "approved"
          ? "The role request was approved."
          : "The role request was denied.",
      );

      await loadRequests();
    }

    setSavingRequestId(null);
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
            Administrator Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Role Requests
          </h1>

          <p className="mt-2 text-slate-600">
            Approve or deny Applicant, Instructor, and School Portal access
            requests.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadRequests()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw aria-hidden className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label
          htmlFor="role-request-status"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          Request status
        </label>

        <select
          id="role-request-status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="all">All requests</option>
        </select>
      </section>

      <section className="mt-6 space-y-5">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
            Loading role requests…
          </div>
        ) : null}

        {!loading && requests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
            No role requests match this status.
          </div>
        ) : null}

        {requests.map((request) => {
          const name =
            [request.first_name, request.last_name].filter(Boolean).join(" ") ||
            request.email ||
            "Unnamed User";

          const pending = request.status === "pending";

          return (
            <article
              key={request.request_id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-sky-100 p-2.5 text-sky-800">
                    <ClipboardCheck aria-hidden className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{name}</h2>

                    <p className="text-sm text-slate-600">
                      {request.email ?? "No email"}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-sky-800">
                      Requested {requestedRoleLabel(request.requested_role)}{" "}
                      access
                    </p>
                  </div>
                </div>

                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {request.status}
                </span>
              </div>

              <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Submitted
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {new Date(request.created_at).toLocaleString()}
                  </dd>
                </div>

                {request.requested_role === "school" ? (
                  <>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Selected school
                      </dt>
                      <dd className="mt-1 text-sm text-slate-900">
                        {request.flight_school_name ?? "Not selected"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Other school name
                      </dt>
                      <dd className="mt-1 text-sm text-slate-900">
                        {request.requested_school_name ?? "Not provided"}
                      </dd>
                    </div>
                  </>
                ) : null}

                {request.requested_role === "instructor" ? (
                  <>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Instructor certificate
                      </dt>
                      <dd className="mt-1 text-sm text-slate-900">
                        {request.instructor_certificate_number ??
                          "Not provided"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Certificate expiration
                      </dt>
                      <dd className="mt-1 text-sm text-slate-900">
                        {request.instructor_certificate_expiration_date ??
                          "Not provided"}
                      </dd>
                    </div>
                  </>
                ) : null}

                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Request notes
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                    {request.request_notes ?? "No notes provided"}
                  </dd>
                </div>
              </dl>

              {pending ? (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  {request.requested_role === "school" ? (
                    <div className="mb-5">
                      <label
                        htmlFor={`school-role-${request.request_id}`}
                        className="mb-2 block text-sm font-semibold text-slate-800"
                      >
                        School permission level
                      </label>

                      <select
                        id={`school-role-${request.request_id}`}
                        value={
                          schoolGrantRoles[request.request_id] ??
                          "flight_school_staff"
                        }
                        onChange={(event) =>
                          setSchoolGrantRoles((current) => ({
                            ...current,
                            [request.request_id]: event.target.value,
                          }))
                        }
                        className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-4 py-3"
                      >
                        <option value="flight_school_staff">
                          Flight School Staff
                        </option>

                        <option value="flight_school_admin">
                          Flight School Administrator
                        </option>
                      </select>
                    </div>
                  ) : null}

                  <div>
                    <label
                      htmlFor={`review-notes-${request.request_id}`}
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      Administrator review notes
                    </label>

                    <textarea
                      id={`review-notes-${request.request_id}`}
                      value={reviewNotes[request.request_id] ?? ""}
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [request.request_id]: event.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={Boolean(savingRequestId)}
                      onClick={() => void reviewRequest(request, "approved")}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                      <Check aria-hidden className="h-4 w-4" />
                      {savingRequestId === request.request_id
                        ? "Saving…"
                        : "Approve"}
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(savingRequestId)}
                      onClick={() => void reviewRequest(request, "denied")}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-5 py-3 font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
                    >
                      <X aria-hidden className="h-4 w-4" />
                      Deny
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 border-t border-slate-200 pt-5 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold">Granted role:</span>{" "}
                    {request.granted_role ?? "No role granted"}
                  </p>

                  <p className="mt-2">
                    <span className="font-semibold">Review notes:</span>{" "}
                    {request.review_notes ?? "No review notes"}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
