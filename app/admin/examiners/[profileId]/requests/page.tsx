"use client";

import { useParams } from "next/navigation";

import ExaminerRequestsWorkspace from "@/app/examiner/requests/requests-workspace";

/** Admin, view-only: the selected examiner's Requests. */
export default function AdminExaminerRequestsPage() {
  const { profileId } = useParams<{ profileId: string }>();

  return <ExaminerRequestsWorkspace viewExaminer={{ id: profileId }} />;
}
