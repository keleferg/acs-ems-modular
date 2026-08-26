import { UserCog } from "lucide-react";

export default function AdminPermissionsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-sky-100 p-3 text-sky-800">
          <UserCog aria-hidden className="h-6 w-6" />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-slate-900">Permissions</h1>

          <p className="mt-2 text-slate-600">
            Review portal roles, organization access, and permission rules.
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Permission model</h2>

        <p className="mt-3 text-slate-600">
          Role assignments are currently managed through the Users and Role
          Requests pages.
        </p>
      </section>
    </main>
  );
}
