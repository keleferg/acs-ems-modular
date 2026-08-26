import { Suspense } from "react";
import { AdminSidebar } from "@/components/portal/admin-sidebar";

function AdminPortalFallback() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="w-[220px] shrink-0 bg-slate-950" />

        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />

            <div className="mt-8 space-y-4">
              <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
              <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminPortalFallback />}>
      <AdminSidebar>{children}</AdminSidebar>
    </Suspense>
  );
}
