"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type PracticalTestType = {
  id: string;
  certificate_name: string;
  issuance_name: string;
  category_name: string | null;
  class_name: string | null;
  rating_name: string;
  display_name: string;
  is_active: boolean;
  is_offered: boolean;
  sort_order: number;
};

export default function PracticalTestsSettingsPage() {
  const [testTypes, setTestTypes] = useState<
    PracticalTestType[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [certificateFilter, setCertificateFilter] =
    useState("all");
  const [showInactive, setShowInactive] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "examiner_get_practical_test_offerings",
    );

    if (error) {
      console.error(error);

      setErrorMessage(
        "Practical-test settings could not be loaded. Examiner access may be required.",
      );

      setTestTypes([]);
    } else {
      setTestTypes(
        (data ?? []) as PracticalTestType[],
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const certificateOptions = useMemo(
    () =>
      [
        ...new Set(
          testTypes.map(
            (testType) => testType.certificate_name,
          ),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [testTypes],
  );

  const visibleTestTypes = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return testTypes.filter((testType) => {
      if (!showInactive && !testType.is_active) {
        return false;
      }

      if (
        certificateFilter !== "all" &&
        testType.certificate_name !==
          certificateFilter
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        testType.certificate_name,
        testType.issuance_name,
        testType.category_name,
        testType.class_name,
        testType.rating_name,
        testType.display_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [
    testTypes,
    search,
    certificateFilter,
    showInactive,
  ]);

  const groupedTestTypes = useMemo(() => {
    const groups = new Map<
      string,
      PracticalTestType[]
    >();

    for (const testType of visibleTestTypes) {
      const existing =
        groups.get(testType.certificate_name) ?? [];

      existing.push(testType);
      groups.set(testType.certificate_name, existing);
    }

    return [...groups.entries()];
  }, [visibleTestTypes]);

  async function togglePracticalTest(
    testType: PracticalTestType,
  ) {
    setSavingId(testType.id);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();
    const nextValue = !testType.is_offered;

    const { data, error } = await supabase.rpc(
      "examiner_set_practical_test_offering",
      {
        p_practical_test_type_id: testType.id,
        p_is_offered: nextValue,
      },
    );

    if (error) {
      console.error(error);

      setErrorMessage(
        `The practical-test offering could not be updated: ${error.message}`,
      );
    } else {
      setTestTypes((current) =>
        current.map((item) =>
          item.id === testType.id
            ? {
                ...item,
                is_offered: nextValue,
              }
            : item,
        ),
      );

      setMessage(
        `${testType.display_name} is now ${
          data.is_offered ? "offered" : "not offered"
        }.`,
      );
    }

    setSavingId("");
  }

  const offeredCount = testTypes.filter(
    (testType) =>
      testType.is_active && testType.is_offered,
  ).length;

  return (
    <main>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
          Settings
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Practical Tests Offered
        </h2>

        <p className="mt-2 text-slate-600">
          Select the practical-test actions that applicants
          may request. Only active and offered records appear
          in the applicant request wizard.
        </p>
      </div>

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Catalog records
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {testTypes.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Currently offered
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {offeredCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Hidden or unavailable
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {testTypes.length - offeredCount}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1fr_240px_auto] xl:items-end">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Search
            </label>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search certificate, issuance, category, class, or rating"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Certificate
            </label>

            <select
              value={certificateFilter}
              onChange={(event) =>
                setCertificateFilter(event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
            >
              <option value="all">
                All certificates
              </option>

              {certificateOptions.map((certificate) => (
                <option
                  key={certificate}
                  value={certificate}
                >
                  {certificate}
                </option>
              ))}
            </select>
          </div>

          <label className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) =>
                setShowInactive(event.target.checked)
              }
              className="h-4 w-4"
            />

            Show inactive catalog records
          </label>
        </div>
      </section>

      {loading ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-slate-600">
          Loading practical-test settings…
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          {groupedTestTypes.map(
            ([certificate, options]) => (
              <section
                key={certificate}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    {certificate}
                  </h3>
                </div>

                <div className="divide-y divide-slate-100">
                  {options.map((testType) => (
                    <label
                      key={testType.id}
                      className="flex cursor-pointer items-center justify-between gap-5 px-5 py-4 hover:bg-slate-50"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {testType.display_name}
                          </p>

                          {!testType.is_active ? (
                            <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                              Inactive
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {[
                            testType.issuance_name,
                            testType.category_name,
                            testType.class_name,
                            testType.rating_name,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        checked={testType.is_offered}
                        disabled={
                          savingId === testType.id ||
                          !testType.is_active
                        }
                        onChange={() =>
                          void togglePracticalTest(
                            testType,
                          )
                        }
                        className="h-5 w-5 shrink-0 rounded border-slate-300"
                      />
                    </label>
                  ))}
                </div>
              </section>
            ),
          )}

          {groupedTestTypes.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
              No practical-test records match the current
              filters.
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
