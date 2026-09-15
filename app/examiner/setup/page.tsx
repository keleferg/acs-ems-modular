"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, LogOut, Search } from "lucide-react";
import {
  ExaminerSetupTestType,
  getExaminerSetupStatus,
} from "@/lib/examiner-setup";
import { createClient } from "@/lib/supabase/client";

type DesigneeForm = {
  profileId: string;
  designeeName: string;
  designationNumber: string;
  designationExpirationDate: string;
  email: string;
  phone: string;
};

type SavedFee = {
  practical_test_type_id: string;
  fee_amount: number;
  is_active: boolean;
};

const emptyDesignee: DesigneeForm = {
  profileId: "",
  designeeName: "",
  designationNumber: "",
  designationExpirationDate: "",
  email: "",
  phone: "",
};

const steps = [
  "Designee Information",
  "Practical Tests Offered",
  "Fees",
  "Complete",
];

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function testDescription(testType: ExaminerSetupTestType) {
  return [
    testType.issuance_name,
    testType.category_name,
    testType.class_name,
    testType.rating_name,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function ExaminerSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [designee, setDesignee] = useState<DesigneeForm>(emptyDesignee);
  const [testTypes, setTestTypes] = useState<ExaminerSetupTestType[]>([]);
  const [feeDrafts, setFeeDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const loadSetup = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/auth/login");
        return;
      }

      const [rolesResult, profileResult, designeeResult, testsResult, feesResult] =
        await Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("profile_id", user.id),
          supabase
            .from("profiles")
            .select("first_name,last_name,preferred_name,email,phone")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("examiner_designee_profiles")
            .select(
              "designee_name,designation_number,designation_expiration_date,email,phone",
            )
            .eq("profile_id", user.id)
            .maybeSingle(),
          supabase.rpc("examiner_get_practical_test_offerings"),
          supabase
            .from("examiner_practical_test_fees")
            .select("practical_test_type_id,fee_amount,is_active")
            .eq("examiner_profile_id", user.id),
        ]);

      if (rolesResult.error) throw rolesResult.error;
      if (profileResult.error) throw profileResult.error;
      if (designeeResult.error) throw designeeResult.error;
      if (testsResult.error) throw testsResult.error;
      if (feesResult.error) throw feesResult.error;

      const hasExaminerRole = (rolesResult.data ?? []).some(
        (row) => row.role === "examiner",
      );

      if (!hasExaminerRole) {
        router.replace("/applicant/dashboard");
        return;
      }

      const profile = profileResult.data;
      const savedDesignee = designeeResult.data;
      const defaultName =
        profile?.preferred_name?.trim() ||
        [profile?.first_name, profile?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();

      setDesignee({
        profileId: user.id,
        designeeName: savedDesignee?.designee_name ?? defaultName ?? "",
        designationNumber: savedDesignee?.designation_number ?? "",
        designationExpirationDate:
          savedDesignee?.designation_expiration_date ?? "",
        email: savedDesignee?.email ?? profile?.email ?? user.email ?? "",
        phone: savedDesignee?.phone ?? profile?.phone ?? "",
      });

      const loadedTests = (testsResult.data ?? []) as ExaminerSetupTestType[];
      setTestTypes(loadedTests);

      const loadedFeeDrafts: Record<string, string> = {};
      for (const fee of (feesResult.data ?? []) as SavedFee[]) {
        if (fee.is_active) {
          loadedFeeDrafts[fee.practical_test_type_id] = String(fee.fee_amount);
        }
      }
      setFeeDrafts(loadedFeeDrafts);

      const status = await getExaminerSetupStatus(supabase, user.id);

      if (status.isComplete) {
        setStep(3);
      } else if (!status.designeeComplete) {
        setStep(0);
      } else if (!status.offeringsComplete) {
        setStep(1);
      } else {
        setStep(2);
      }
    } catch (error) {
      console.error("Examiner setup could not be loaded:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Examiner setup could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadSetup();
  }, [loadSetup]);

  const availableTestTypes = useMemo(
    () =>
      testTypes.filter(
        (testType) =>
          testType.is_active &&
          testType.display_name !== "Pilot Proficiency Check (61.58)",
      ),
    [testTypes],
  );

  const visibleTestTypes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return availableTestTypes;

    return availableTestTypes.filter((testType) =>
      [
        testType.certificate_name,
        testType.display_name,
        testDescription(testType),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [availableTestTypes, search]);

  const groupedTestTypes = useMemo(() => {
    const groups = new Map<string, ExaminerSetupTestType[]>();

    for (const testType of visibleTestTypes) {
      const groupName =
        testType.display_name === "Flight Engineer Proficiency Check (91.529)"
          ? "Flight Engineer"
          : testType.certificate_name;
      groups.set(groupName, [...(groups.get(groupName) ?? []), testType]);
    }

    return [...groups.entries()];
  }, [visibleTestTypes]);

  const offeredTests = useMemo(
    () => testTypes.filter((testType) => testType.is_active && testType.is_offered),
    [testTypes],
  );

  function updateDesignee(field: keyof DesigneeForm, value: string) {
    setDesignee((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
  }

  async function saveDesignee() {
    if (saving) return;
    setErrorMessage("");

    if (
      !designee.designeeName.trim() ||
      !designee.designationNumber.trim() ||
      !designee.designationExpirationDate ||
      !designee.email.trim() ||
      !designee.phone.trim()
    ) {
      setErrorMessage("Complete every required designee and contact field.");
      return;
    }

    if (designee.designationExpirationDate < localDateString()) {
      setErrorMessage(
        "The Designation Expiration Date must be today or a future date.",
      );
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("examiner_designee_profiles").upsert(
        {
          profile_id: designee.profileId,
          designee_name: designee.designeeName.trim(),
          designation_number: designee.designationNumber.trim(),
          designation_expiration_date: designee.designationExpirationDate,
          email: designee.email.trim().toLowerCase(),
          phone: designee.phone.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" },
      );

      if (error) throw error;
      setStep(1);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Designee information could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleTest(testType: ExaminerSetupTestType) {
    if (saving) return;
    setSaving(true);
    setErrorMessage("");

    const nextValue = !testType.is_offered;

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc(
        "examiner_set_practical_test_offering",
        {
          p_practical_test_type_id: testType.id,
          p_is_offered: nextValue,
        },
      );

      if (error) throw error;

      setTestTypes((current) =>
        current.map((item) =>
          item.id === testType.id
            ? { ...item, is_offered: nextValue }
            : item,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The practical-test offering could not be updated.",
      );
    } finally {
      setSaving(false);
    }
  }

  function continueFromOfferings() {
    if (offeredTests.length === 0) {
      setErrorMessage("Select at least one practical test type to continue.");
      return;
    }

    setErrorMessage("");
    setStep(2);
  }

  async function saveFees() {
    if (saving) return;
    setErrorMessage("");

    const invalidTest = offeredTests.find((testType) => {
      const value = feeDrafts[testType.id]?.trim() ?? "";
      const amount = Number(value);
      return !value || !Number.isFinite(amount) || amount < 0;
    });

    if (invalidTest) {
      setErrorMessage(
        `Enter a valid fee of zero or greater for ${invalidTest.display_name}.`,
      );
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();
      const payload = offeredTests.map((testType) => ({
        examiner_profile_id: designee.profileId,
        practical_test_type_id: testType.id,
        fee_amount: Number(feeDrafts[testType.id]),
        is_active: true,
        sort_order: testType.sort_order,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("examiner_practical_test_fees")
        .upsert(payload, {
          onConflict: "examiner_profile_id,practical_test_type_id",
        });

      if (error) throw error;

      const status = await getExaminerSetupStatus(
        supabase,
        designee.profileId,
      );

      if (!status.isComplete) {
        if (!status.designeeComplete) setStep(0);
        else if (!status.offeringsComplete) setStep(1);
        else setStep(2);

        throw new Error(
          "One or more required examiner setup items are still incomplete.",
        );
      }

      setStep(3);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The examiner fee schedule could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/auth/login");
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <p className="text-slate-600">Loading examiner account setup…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:py-12">
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-amber-700">
            Examiner Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Set Up Your Examiner Account
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Complete each required section before entering the Examiner Portal.
            Your account will be checked again whenever your designation expires
            or a required setting becomes incomplete.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <LogOut aria-hidden className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      <ol className="mb-8 grid gap-3 sm:grid-cols-4">
        {steps.map((label, index) => (
          <li
            key={label}
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
              index === step
                ? "border-amber-500 bg-amber-50 text-amber-950"
                : index < step
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <span className="mr-2">{index < step ? "✓" : index + 1}.</span>
            {label}
          </li>
        ))}
      </ol>

      {errorMessage ? (
        <div className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          <CircleAlert aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {step === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Designee and Contact Information
          </h2>
          <p className="mt-2 text-slate-600">
            All fields below are required for an active examiner account.
          </p>

          <div className="mt-7 grid gap-6 sm:grid-cols-2">
            <SetupField
              id="designee-name"
              label="Examiner / designee name"
              value={designee.designeeName}
              onChange={(value) => updateDesignee("designeeName", value)}
            />
            <SetupField
              id="designation-number"
              label="Designation Number"
              value={designee.designationNumber}
              onChange={(value) => updateDesignee("designationNumber", value)}
            />
            <SetupField
              id="designation-expiration"
              label="Designation Expiration Date"
              type="date"
              min={localDateString()}
              value={designee.designationExpirationDate}
              onChange={(value) =>
                updateDesignee("designationExpirationDate", value)
              }
            />
            <SetupField
              id="contact-email"
              label="Contact email"
              type="email"
              value={designee.email}
              onChange={(value) => updateDesignee("email", value)}
            />
            <SetupField
              id="contact-phone"
              label="Contact phone"
              type="tel"
              value={designee.phone}
              onChange={(value) => updateDesignee("phone", value)}
            />
          </div>

          <WizardActions
            saving={saving}
            continueLabel="Save and Continue"
            onContinue={() => void saveDesignee()}
          />
        </section>
      ) : null}

      {step === 1 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Practical Tests Offered
          </h2>
          <p className="mt-2 text-slate-600">
            Select at least one practical test applicants may request from you.
          </p>

          <div className="relative mt-6">
            <Search
              aria-hidden
              className="absolute left-4 top-3.5 h-5 w-5 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search certificate, issuance, category, class, or rating"
              className="w-full rounded-lg border border-slate-300 py-3 pl-12 pr-4 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <p className="mt-4 text-sm font-semibold text-emerald-700">
            {offeredTests.length} selected
          </p>

          <div className="mt-5 max-h-[560px] space-y-5 overflow-y-auto pr-1">
            {groupedTestTypes.map(([group, groupTests]) => (
              <div key={group} className="overflow-hidden rounded-xl border border-slate-200">
                <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-900">
                  {group}
                </h3>
                <div className="divide-y divide-slate-100">
                  {groupTests.map((testType) => (
                    <label
                      key={testType.id}
                      className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                    >
                      <span>
                        <span className="block font-semibold text-slate-900">
                          {testType.display_name}
                        </span>
                        <span className="mt-1 block text-sm text-slate-500">
                          {testDescription(testType)}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={testType.is_offered}
                        disabled={saving}
                        onChange={() => void toggleTest(testType)}
                        className="h-5 w-5 shrink-0 rounded border-slate-300"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <WizardActions
            saving={saving}
            onBack={() => {
              setErrorMessage("");
              setStep(0);
            }}
            continueLabel="Continue to Fees"
            onContinue={continueFromOfferings}
          />
        </section>
      ) : null}

      {step === 2 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">Examiner Fees</h2>
          <p className="mt-2 text-slate-600">
            Enter an active fee for every practical test you selected. A fee of
            $0 is permitted.
          </p>

          <div className="mt-7 space-y-4">
            {offeredTests.map((testType) => (
              <div
                key={testType.id}
                className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {testType.display_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {testDescription(testType)}
                  </p>
                </div>
                <div>
                  <label
                    htmlFor={`fee-${testType.id}`}
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Fee amount
                  </label>
                  <div className="flex rounded-lg border border-slate-300 focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-100">
                    <span className="flex items-center border-r border-slate-300 bg-slate-50 px-3 text-slate-500">
                      $
                    </span>
                    <input
                      id={`fee-${testType.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={feeDrafts[testType.id] ?? ""}
                      onChange={(event) => {
                        setFeeDrafts((current) => ({
                          ...current,
                          [testType.id]: event.target.value,
                        }));
                        setErrorMessage("");
                      }}
                      className="min-w-0 flex-1 rounded-r-lg px-3 py-2 outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <WizardActions
            saving={saving}
            onBack={() => {
              setErrorMessage("");
              setStep(1);
            }}
            continueLabel="Save Fees and Complete Setup"
            onContinue={() => void saveFees()}
          />
        </section>
      ) : null}

      {step === 3 ? (
        <section className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check aria-hidden className="h-9 w-9" />
          </span>
          <h2 className="mt-6 text-3xl font-bold text-slate-900">
            Examiner Setup Complete
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Your designee information, practical-test offerings, fees, and
            designation validity have all been verified.
          </p>
          <button
            type="button"
            onClick={() => {
              router.replace("/examiner/dashboard");
              router.refresh();
            }}
            className="mt-8 rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white hover:bg-amber-700"
          >
            Enter Examiner Portal
          </button>
        </section>
      ) : null}
    </main>
  );
}

function SetupField({
  id,
  label,
  value,
  type = "text",
  min,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  type?: "text" | "date" | "email" | "tel";
  min?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
        <span className="ml-1 text-red-600">*</span>
      </label>
      <input
        id={id}
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
      />
    </div>
  );
}

function WizardActions({
  saving,
  continueLabel,
  onContinue,
  onBack,
}: {
  saving: boolean;
  continueLabel: string;
  onContinue: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onContinue}
        disabled={saving}
        className="rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving…" : continueLabel}
      </button>
    </div>
  );
}
