import { Settings } from "lucide-react";

export default function AdminSystemSettingsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-sky-100 p-3 text-sky-800">
          <Settings aria-hidden className="h-6 w-6" />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>

          <p className="mt-2 text-slate-600">
            Manage application-wide configuration, notifications, defaults, and
            system behavior.
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Application configuration
        </h2>

        <p className="mt-3 text-slate-600">
          Global settings will be added as system requirements are defined.
        </p>
      </section>
    </main>
  );
}
