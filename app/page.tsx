import { redirect } from "next/navigation";

/*
 * DPE EMS PUBLIC ROOT
 *
 * EMS is the Evaluation Management System. It owns scheduling,
 * applicant/examiner/admin portals, the POA question library,
 * scenario/trigger management, POA generation/editing, and PDF export.
 *
 * EMT is the grading application only and is a separate system
 * (dpe-emt-web / dpe-emt-ipad). See BOUNDARY.md. EMS links to EMT by URL
 * and never contains grading code.
 */
export default function HomePage() {
  redirect("/auth/login");
}
