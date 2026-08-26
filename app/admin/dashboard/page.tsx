"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PortalUser = {
  profile_id: string;
  roles: string[];
};

type RoleRequest = {
  request_id: string;
  status: string;
};

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const [usersResult, requestsResult] = await Promise.all([
      supabase.rpc("admin_get_portal_users"),
      supabase.rpc("admin_get_portal_role_requests", {
        p_status: "pending",
      }),
    ]);

    if (usersResult.error) {
      setErrorMessage(usersResult.error.message);
    } else {
      setUsers((usersResult.data ?? []) as PortalUser[]);
    }

    if (requestsResult.error) {
      setErrorMessage((current) =>
        current
          ? `${current} ${requestsResult.error.message}`
          : requestsResult.error.message,
      );
    } else {
      setRequests((requestsResult.data ?? []) as RoleRequest[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const examinerCount = users.filter((user) =>
    user.roles.includes("examiner"),
  ).length;

  const instructorCount = users.filter((user) =>
    user.roles.includes("instructor"),
  ).length;

  const summaryCards = [
    {
      label: "Portal Users",
      value: users.length,
      icon: Users,
    },
    {
      label: "Pending Role Requests",
      value: requests.length,
      icon: ClipboardCheck,
    },
    {
      label: "Examiners",
      value: examinerCount,
      icon: ShieldCheck,
    },
    {
      label: "Instructors",
      value: instructorCount,
      icon: GraduationCap,
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
          Administrator Portal
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Administrator Dashboard
        </h1>

        <p className="mt-2 text-slate-600">
          Manage users, portal access, schools, instructors, examiners, and
          permissions.
        </p>
      </div>

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-600">
                  {card.label}
                </p>

                <Icon aria-hidden className="h-5 w-5 text-sky-700" />
              </div>

              <p className="mt-4 text-3xl font-bold text-slate-900">
                {loading ? "—" : card.value}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Pending role requests
            </h2>

            <Link
              href="/admin/role-requests"
              className="text-sm font-semibold text-sky-700 hover:underline"
            >
              Review requests
            </Link>
          </div>

          <p className="mt-5 text-slate-600">
            {loading
              ? "Loading requests…"
              : requests.length === 0
                ? "There are no pending role requests."
                : `${requests.length} role request${
                    requests.length === 1 ? "" : "s"
                  } require review.`}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">User access</h2>

            <Link
              href="/admin/users"
              className="text-sm font-semibold text-sky-700 hover:underline"
            >
              Manage users
            </Link>
          </div>

          <p className="mt-5 text-slate-600">
            Grant or revoke Applicant, Instructor, School, Examiner, and
            Administrator access.
          </p>
        </article>
      </section>
    </main>
  );
}
