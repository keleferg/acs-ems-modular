import { InstructorSidebar } from "@/components/portal/instructor-sidebar";

export default function InstructorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <InstructorSidebar>{children}</InstructorSidebar>;
}
