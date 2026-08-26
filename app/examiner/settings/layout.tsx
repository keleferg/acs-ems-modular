"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const settingsLinks = [
  {
    href: "/examiner/settings/practical-tests",
    label: "Practical Tests Offered",
    description: "Certificates and ratings available to applicants",
  },
  {
    href: "/examiner/settings/fees",
    label: "Fees",
    description: "Published practical-test fees",
  },
  {
    href: "/examiner/settings/locations",
    label: "Locations",
    description: "Flight schools and test locations",
  },
  {
    href: "/examiner/settings/aircraft",
    label: "Aircraft Authorized",
    description: "Aircraft categories and limitations",
  },
  {
    href: "/examiner/settings/type-ratings",
    label: "Type Ratings Authorized",
    description: "Authorized aircraft type ratings",
  },
  {
    href: "/examiner/settings/designee",
    label: "Designee Information",
    description: "Examiner identity and designation details",
  },
  {
    href: "/examiner/availability",
    label: "Availability",
    description: "Weekly availability and blocked periods",
  },
];

export default function ExaminerSettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
          Examiner Portal
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Settings
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Manage the examiner configuration used throughout the
          practical-test request and scheduling system.
        </p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">
              Settings Navigation
            </h2>
          </div>

          <nav className="p-2">
            {settingsLinks.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-4 py-3 transition ${
                    active
                      ? "bg-amber-50 text-amber-950"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`block text-sm font-semibold ${
                      active
                        ? "text-amber-900"
                        : "text-slate-900"
                    }`}
                  >
                    {item.label}
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {item.description}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
