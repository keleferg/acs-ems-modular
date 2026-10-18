"use client";

import { useParams } from "next/navigation";

import ExaminerCalendarView from "@/app/examiner/calendar/calendar-view";

/** Admin, view-only: the selected examiner's Calendar. */
export default function AdminExaminerCalendarPage() {
  const { profileId } = useParams<{ profileId: string }>();

  return <ExaminerCalendarView viewExaminer={{ id: profileId }} />;
}
