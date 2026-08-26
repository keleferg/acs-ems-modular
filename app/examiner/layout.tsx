import { ExaminerSidebar } from "@/components/portal/examiner-sidebar";

export default function ExaminerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ExaminerSidebar>{children}</ExaminerSidebar>;
}
