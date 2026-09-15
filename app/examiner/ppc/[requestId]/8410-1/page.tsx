import { Suspense } from "react";

import Ppc8410Client from "./ppc-8410-client";

function Loading8410() {
  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        Preparing FAA Form 8410-1…
      </div>
    </main>
  );
}

export default function Ppc8410Page() {
  return (
    <Suspense fallback={<Loading8410 />}>
      <Ppc8410Client />
    </Suspense>
  );
}
