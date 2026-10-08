import { notFound } from "next/navigation";
import { QualificationWizard } from "@/components/qualification/qualification-wizard";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <QualificationWizard preview />;
}
