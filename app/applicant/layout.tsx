import { ApplicantSidebar } from "@/components/portal/applicant-sidebar";

export default function ApplicantLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ApplicantSidebar>
      {children}
    </ApplicantSidebar>
  );
}
