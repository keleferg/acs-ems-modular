import { Suspense } from "react";
import { ExaminerSidebar } from "@/components/portal/examiner-sidebar";

export default function ExaminerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">
          {children}
        </div>
      }
    >
      <ExaminerSidebar>{children}</ExaminerSidebar>
    </Suspense>;
}
