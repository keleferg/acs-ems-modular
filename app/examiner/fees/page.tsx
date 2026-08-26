import { redirect } from "next/navigation";

export default function LegacyExaminerFeesPage() {
  redirect("/examiner/settings/fees");
}
