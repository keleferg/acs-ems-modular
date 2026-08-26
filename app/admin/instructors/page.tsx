import { GraduationCap } from "lucide-react";

export default function AdminInstructorsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-sky-100 p-3 text-sky-800">
          <GraduationCap aria-hidden className="h-6 w-6" />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-slate-900">Instructors</h1>

          <p className="mt-2 text-slate-600">
            Manage instructor profiles, certificates, schools, and student
            relationships.
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Instructor management
        </h2>

        <p className="mt-3 text-slate-600">
          Instructor directory and relationship tools will be added in the next
          phase.
        </p>
      </section>
    </main>
  );
}
