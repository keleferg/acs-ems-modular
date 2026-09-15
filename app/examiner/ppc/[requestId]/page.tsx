import { Suspense } from "react";

import PpcEvaluationClient from "./ppc-evaluation-client";

function PpcEvaluationLoading() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        Loading FAA Form 8410-1 proficiency check…
      </div>
    </main>
  );
}

export default function PpcEvaluationPage() {
  return (
    <Suspense fallback={<PpcEvaluationLoading />}>
      <PpcEvaluationClient />
    </Suspense>
  );
}
