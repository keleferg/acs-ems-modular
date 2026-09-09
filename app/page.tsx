import { redirect } from "next/navigation";

/*
 * DPE EMS PUBLIC ROOT
 *
 * EMS is the Evaluation Management System. It owns scheduling,
 * applicant/examiner/admin portals, the POA question library,
 * scenario/trigger management, POA generation/editing, and PDF export.
 *
 * EMT is the grading application only. The EMT grading experience remains
 * available at /ems/index.html and consumes the frozen POA created in EMS.
 */
export default function HomePage() {
  redirect("/auth/login");
}
