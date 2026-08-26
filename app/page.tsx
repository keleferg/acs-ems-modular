import { redirect } from "next/navigation";

/*
 * DPE EMT WEB ROOT
 *
 * The DPE EMT web application is the Evaluation Management System
 * grading application located at /ems/index.html.
 *
 * Applicant, examiner scheduling, administration, and other portal
 * routes may continue to exist elsewhere in this Next.js project,
 * but they must not replace the DPE EMT grading application as the
 * public root experience.
 */
export default function HomePage() {
  redirect("/ems/index.html");
}
