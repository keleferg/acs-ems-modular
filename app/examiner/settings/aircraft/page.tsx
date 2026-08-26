export default function AircraftAuthorizedSettingsPage() {
  return (
    <main>
      <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
        Settings
      </p>

      <h2 className="mt-2 text-3xl font-bold text-slate-900">
        Aircraft Authorized
      </h2>

      <p className="mt-2 text-slate-600">
        Manage the aircraft categories, classes, and specific
        aircraft that may be used for practical tests.
      </p>

      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h3 className="text-lg font-bold text-slate-900">
          Aircraft authorization configuration
        </h3>

        <p className="mt-2 text-slate-600">
          The database structure and management controls for
          authorized aircraft will be added here.
        </p>
      </div>
    </main>
  );
}
