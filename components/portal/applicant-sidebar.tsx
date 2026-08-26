"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  ClipboardCheck,
  FilePlus2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
};

type PortalOption = {
  label: string;
  href: string;
  icon: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean;
  }>;
};

const applicantNavigation = [
  {
    label: "Dashboard",
    href: "/applicant/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My Requests",
    href: "/applicant/requests",
    icon: FileText,
  },
  {
    label: "New Request",
    href: "/applicant/requests/new",
    icon: FilePlus2,
  },
  {
    label: "Pretest Qualification",
    href: "/applicant/qualification",
    icon: ClipboardCheck,
  },
  {
    label: "Reports",
    href: "/applicant/reports",
    icon: BarChart3,
  },
  {
    label: "My Profile",
    href: "/applicant/profile",
    icon: UserRound,
  },
];

function isNavigationItemActive(
  pathname: string,
  href: string,
) {
  if (pathname === href) {
    return true;
  }

  if (
    href === "/applicant/dashboard" ||
    href === "/applicant/requests/new"
  ) {
    return false;
  }

  return pathname.startsWith(`${href}/`);
}

export function ApplicantSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] =
    useState(false);
  const [portalMenuOpen, setPortalMenuOpen] =
    useState(false);
  const [checkingSetup, setCheckingSetup] =
    useState(true);
  const [loadingAccount, setLoadingAccount] =
    useState(true);
  const [signingOut, setSigningOut] =
    useState(false);
  const [profile, setProfile] =
    useState<ProfileRow | null>(null);
  const [roles, setRoles] = useState<string[]>(
    [],
  );

  const isSetupPage =
    pathname === "/applicant/setup";

  useEffect(() => {
    setMobileOpen(false);
    setPortalMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function loadApplicantAccount() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (userError || !user) {
        router.replace("/auth/login");
        return;
      }

      const [
        applicantResult,
        profileResult,
        rolesResult,
      ] = await Promise.all([
        supabase
          .from("applicant_profiles")
          .select("setup_completed_at")
          .eq("profile_id", user.id)
          .maybeSingle(),

        supabase
          .from("profiles")
          .select(
            "first_name,last_name,preferred_name,email",
          )
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("user_roles")
          .select("role")
          .eq("profile_id", user.id),
      ]);

      if (cancelled) {
        return;
      }

      if (applicantResult.error) {
        console.error(
          "Unable to verify applicant setup:",
          applicantResult.error,
        );
      }

      if (profileResult.error) {
        console.error(
          "Unable to load applicant profile:",
          profileResult.error,
        );
      }

      if (rolesResult.error) {
        console.error(
          "Unable to load applicant roles:",
          rolesResult.error,
        );
      }

      const setupComplete = Boolean(
        applicantResult.data?.setup_completed_at,
      );

      if (!isSetupPage && !setupComplete) {
        router.replace("/applicant/setup");
        return;
      }

      const loadedRoles = (
        rolesResult.data ?? []
      ).map((row) => row.role);

      setProfile(profileResult.data ?? null);
      setRoles(loadedRoles);
      setLoadingAccount(false);
      setCheckingSetup(false);
    }

    void loadApplicantAccount();

    return () => {
      cancelled = true;
    };
  }, [isSetupPage, router]);

  const portalOptions =
    useMemo<PortalOption[]>(() => {
      const options: PortalOption[] = [];

      if (roles.includes("examiner")) {
        options.push({
          label: "Examiner Portal",
          href: "/examiner/dashboard",
          icon: GraduationCap,
        });
      }

      if (roles.includes("instructor")) {
        options.push({
          label: "Instructor Portal",
          href: "/instructor/dashboard",
          icon: GraduationCap,
        });
      }

      if (
        roles.includes("flight_school_staff") ||
        roles.includes("flight_school_admin")
      ) {
        options.push({
          label: "School Portal",
          href: "/school/dashboard",
          icon: GraduationCap,
        });
      }

      if (roles.includes("administrator")) {
        options.push({
          label: "Administrator Portal",
          href: "/admin/dashboard",
          icon: ShieldCheck,
        });
      }

      return options;
    }, [roles]);

  const displayName =
    profile?.preferred_name?.trim() ||
    [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    profile?.email ||
    "Applicant";

  async function signOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);

    const supabase = createClient();
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Unable to sign out:",
        error,
      );
      setSigningOut(false);
      return;
    }

    router.replace("/auth/login");
    router.refresh();
  }

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-slate-100">
        <main className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <p className="text-slate-600">
              Loading applicant portal…
            </p>
          </div>
        </main>
      </div>
    );
  }

  /*
   * Keep account setup focused and uncluttered.
   * The full applicant sidebar appears after setup is complete.
   */
  if (isSetupPage) {
    return (
      <div className="min-h-screen bg-slate-100">
        {children}
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className="border-b border-slate-800 px-5 py-5">
        <Link
          href="/applicant/dashboard"
          className="block"
          aria-label="Aviation Training Solutions Applicant Portal"
        >
          <Image
            src="/ats-logo-horizontal.png"
            alt="Aviation Training Solutions"
            width={1265}
            height={371}
            priority
            className="h-12 w-auto object-contain"
          />
        </Link>

        <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-sky-400">
          Applicant Portal
        </p>
      </div>

      <div className="border-b border-slate-800 p-4">
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setPortalMenuOpen(
                (current) => !current,
              )
            }
            className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-left transition hover:border-slate-600 hover:bg-slate-800"
            aria-expanded={portalMenuOpen}
          >
            <span className="min-w-0">
              <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                Current portal
              </span>

              <span className="mt-1 block truncate text-sm font-semibold text-white">
                Applicant Portal
              </span>
            </span>

            <ChevronDown
              aria-hidden
              className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                portalMenuOpen
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

          {portalMenuOpen ? (
            <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
              <Link
                href="/applicant/dashboard"
                className="flex items-center gap-3 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-300"
              >
                <UserRound
                  aria-hidden
                  className="h-4 w-4"
                />
                Applicant Portal
              </Link>

              {portalOptions.map((portal) => {
                const Icon = portal.icon;

                return (
                  <Link
                    key={portal.href}
                    href={portal.href}
                    className="flex items-center gap-3 border-t border-slate-800 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
                  >
                    <Icon
                      aria-hidden
                      className="h-4 w-4"
                    />
                    {portal.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {applicantNavigation.map((item) => {
          const Icon = item.icon;
          const active =
            isNavigationItemActive(
              pathname,
              item.href,
            );

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon
                aria-hidden
                className="h-5 w-5 shrink-0"
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="rounded-xl bg-slate-900 p-3">
          <p className="truncate text-sm font-semibold text-white">
            {loadingAccount
              ? "Loading account…"
              : displayName}
          </p>

          <p className="mt-1 truncate text-xs text-slate-400">
            {profile?.email ?? ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-red-950/40 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut
            aria-hidden
            className="h-5 w-5"
          />

          {signingOut
            ? "Signing Out…"
            : "Sign Out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        {sidebarContent}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() =>
              setMobileOpen(false)
            }
            className="absolute inset-0 bg-slate-950/70"
          />

          <aside className="relative h-full w-72 max-w-[85vw] shadow-2xl">
            <button
              type="button"
              onClick={() =>
                setMobileOpen(false)
              }
              aria-label="Close menu"
              className="absolute right-3 top-3 z-50 rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <X
                aria-hidden
                className="h-5 w-5"
              />
            </button>

            {sidebarContent}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <button
              type="button"
              onClick={() =>
                setMobileOpen(true)
              }
              aria-label="Open navigation"
              className="rounded-lg border border-slate-300 p-2 text-slate-700"
            >
              <Menu
                aria-hidden
                className="h-5 w-5"
              />
            </button>

            <p className="text-sm font-bold text-slate-900">
              Applicant Portal
            </p>

            <div className="w-10" />
          </div>
        </header>

        <div className="min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
