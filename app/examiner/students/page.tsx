import { redirect } from "next/navigation";

export default function ExaminerStudentsRedirectPage() {
  redirect("/examiner/applicants");
}
