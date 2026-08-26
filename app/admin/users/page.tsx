"use client";

import { RefreshCw, Save, Search, UserCog } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PortalUser = {
  profile_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  phone: string | null;
  is_active: boolean;
  roles: string[];
};

type RoleSelections = Record<string, string[]>;

const availableRoles = [
  {
    value: "applicant",
    label: "Applicant",
    description: "May submit and manage practical-test requests.",
  },
  {
    value: "instructor",
    label: "Instructor",
    description: "May access students, schools, profile, and calendar.",
  },
  {
    value: "flight_school_staff",
    label: "Flight School Staff",
    description: "May access the School Portal as a staff member.",
  },
  {
    value: "flight_school_admin",
    label: "Flight School Administrator",
    description: "May access and administer an assigned flight school.",
  },
  {
    value: "examiner",
    label: "Examiner",
    description: "May review requests and manage examiner operations.",
  },
  {
    value: "administrator",
    label: "Administrator",
    description: "May manage users, roles, and application settings.",
  },
];

function arraysMatch(first: string[], second: string[]) {
  const firstSorted = [...first].sort();
  const secondSorted = [...second].sort();

  return (
    firstSorted.length === secondSorted.length &&
    firstSorted.every((value, index) => value === secondSorted[index])
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<RoleSelections>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfileId, setSavingProfileId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc("admin_get_portal_users");

    if (error) {
      setErrorMessage(error.message);
      setUsers([]);
      setSelectedRoles({});
    } else {
      const loadedUsers = (data ?? []) as PortalUser[];

      setUsers(loadedUsers);

      setSelectedRoles(
        Object.fromEntries(
          loadedUsers.map((user) => [user.profile_id, [...user.roles]]),
        ),
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return users;

    return users.filter((user) =>
      [
        user.first_name,
        user.last_name,
        user.preferred_name,
        user.email,
        user.phone,
        ...user.roles,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value)),
    );
  }, [search, users]);

  function toggleRole(profileId: string, role: string) {
    setMessage("");
    setErrorMessage("");

    setSelectedRoles((current) => {
      const currentRoles = current[profileId] ?? [];

      const nextRoles = currentRoles.includes(role)
        ? currentRoles.filter((assignedRole) => assignedRole !== role)
        : [...currentRoles, role];

      return {
        ...current,
        [profileId]: nextRoles,
      };
    });
  }

  function resetUserChanges(user: PortalUser) {
    setSelectedRoles((current) => ({
      ...current,
      [user.profile_id]: [...user.roles],
    }));

    setMessage("");
    setErrorMessage("");
  }

  async function saveUserRoles(user: PortalUser) {
    const desiredRoles = selectedRoles[user.profile_id] ?? [];

    const rolesToGrant = desiredRoles.filter(
      (role) => !user.roles.includes(role),
    );

    const rolesToRevoke = user.roles.filter(
      (role) => !desiredRoles.includes(role),
    );

    if (rolesToGrant.length === 0 && rolesToRevoke.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Save all role changes for ${user.email ?? "this user"}?`,
    );

    if (!confirmed) return;

    setSavingProfileId(user.profile_id);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    try {
      for (const role of rolesToGrant) {
        const { error } = await supabase.rpc("admin_grant_user_role", {
          p_profile_id: user.profile_id,
          p_role: role,
        });

        if (error) {
          throw new Error(`Could not grant ${role}: ${error.message}`);
        }
      }

      for (const role of rolesToRevoke) {
        const { error } = await supabase.rpc("admin_revoke_user_role", {
          p_profile_id: user.profile_id,
          p_role: role,
        });

        if (error) {
          throw new Error(`Could not remove ${role}: ${error.message}`);
        }
      }

      setMessage(`Role changes for ${user.email ?? "the user"} were saved.`);

      await loadUsers();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The role changes could not be saved.",
      );

      await loadUsers();
    } finally {
      setSavingProfileId(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
            Administrator Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">Users</h1>

          <p className="mt-2 text-slate-600">
            Select each user&apos;s portal roles, then save all changes for that
            user.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadUsers()}
          disabled={loading || savingProfileId !== null}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
          htmlFor="user-search"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          Search users
        </label>

        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400"
          />

          <input
            id="user-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, email, phone, or role"
            className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </section>

      <section className="mt-6 space-y-5">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
            Loading users…
          </div>
        ) : null}

        {!loading && filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
            No users match the current search.
          </div>
        ) : null}

        {filteredUsers.map((user) => {
          const displayName =
            user.preferred_name?.trim() ||
            [user.first_name, user.last_name].filter(Boolean).join(" ") ||
            user.email ||
            "Unnamed User";

          const currentSelections =
            selectedRoles[user.profile_id] ?? user.roles;

          const hasChanges = !arraysMatch(currentSelections, user.roles);

          const saving = savingProfileId === user.profile_id;

          return (
            <article
              key={user.profile_id}
              className={`rounded-2xl border bg-white p-6 shadow-sm transition ${
                hasChanges
                  ? "border-sky-300 ring-2 ring-sky-100"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-sky-100 p-2.5 text-sky-800">
                      <UserCog aria-hidden className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-slate-900">
                        {displayName}
                      </h2>

                      <p className="truncate text-sm text-slate-600">
                        {user.email ?? "No email address"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    {user.phone ?? "No phone number"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {hasChanges ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
                      Unsaved changes
                    </span>
                  ) : (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800">
                      Saved
                    </span>
                  )}
                </div>
              </div>

              <fieldset className="mt-6">
                <legend className="text-sm font-bold text-slate-900">
                  Portal roles
                </legend>

                <div className="mt-3 overflow-x-auto pb-2">
                  <div className="flex min-w-max items-center gap-5 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                    {availableRoles.map((role) => {
                      const checked = currentSelections.includes(role.value);

                      const checkboxId = `role-${user.profile_id}-${role.value}`;

                      return (
                        <label
                          key={role.value}
                          htmlFor={checkboxId}
                          className="flex cursor-pointer items-center gap-2 whitespace-nowrap"
                        >
                          <input
                            id={checkboxId}
                            type="checkbox"
                            checked={checked}
                            disabled={savingProfileId !== null}
                            onChange={() =>
                              toggleRole(user.profile_id, role.value)
                            }
                            className="h-5 w-5 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                          />

                          <span
                            className={`text-sm font-semibold ${
                              checked ? "text-sky-900" : "text-slate-700"
                            }`}
                          >
                            {role.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </fieldset>

              <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  disabled={!hasChanges || savingProfileId !== null}
                  onClick={() => resetUserChanges(user)}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset
                </button>

                <button
                  type="button"
                  disabled={!hasChanges || savingProfileId !== null}
                  onClick={() => void saveUserRoles(user)}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-5 py-2.5 font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save aria-hidden className="h-4 w-4" />

                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
