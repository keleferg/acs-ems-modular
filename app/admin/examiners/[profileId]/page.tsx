"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  FileClock,
  Loader2,
  Mail,
  MapPin,
  Plane,
  Save,
  Search,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  phone: string | null;
  timezone: string | null;
  is_active: boolean;
  created_at: string | null;
};

type DesigneeProfile = {
  id?: string;
  profile_id: string;
  designee_name: string | null;
  business_name: string | null;
  designation_number: string | null;
  email: string | null;
  reply_to_email: string | null;
  phone: string | null;
  website: string | null;
  mailing_address_line1: string | null;
  mailing_address_line2: string | null;
  mailing_address_city: string | null;
  mailing_address_state: string | null;
  mailing_address_postal_code: string | null;
  mailing_address_country: string | null;
  email_signature: string | null;
};

type Statistics = {
  total_tests: number;
  upcoming_tests: number;
  completed_tests: number;
  last_activity_at: string | null;
};

type ConfigurationCounts = {
  type_ratings: number;
  weekly_availability: number;
  blocked_periods: number;
  fees: number;
};

type ExaminerDetail = {
  profile: Profile;
  designee: DesigneeProfile | null;
  statistics: Statistics;
  configuration_counts: ConfigurationCounts;
};

type PracticalTestAuthorization = {
  id: string;
  certificate_name: string;
  issuance_name: string;
  category_name: string | null;
  class_name: string | null;
  rating_name: string;
  display_name: string;
  sort_order: number;
  is_offered: boolean;
};

type TypeRatingAuthorization = {
  id: string;
  designation: string;
  sort_order: number;
  is_active: boolean;
  authorization_notes: string | null;
};

type ExaminerAuthorizations = {
  practical_tests: PracticalTestAuthorization[];
  type_ratings: TypeRatingAuthorization[];
};

type AircraftAuthorization = {
  id: string;
  manufacturer_model: string;
  manufacturer: string;
  model: string;
  type_designator: string;
  aircraft_class: string | null;
  engine_type: string | null;
  is_authorized: boolean;
  authorization_notes: string | null;
};

type LocationAuthorization = {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  timezone: string;
  is_authorized: boolean;
  authorization_notes: string | null;
};

type ExaminerFee = {
  practical_test_type_id: string;
  display_name: string;
  certificate_name: string;
  issuance_name: string;
  rating_name: string;
  fee_amount: string;
  is_active: boolean;
  uses_default: boolean;
};

type AdminWeeklyAvailability = {
  id: string | null;
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
  notes: string;
};

type AdminBlockedPeriod = {
  id: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  reason: string | null;
  internal_notes: string | null;
};

type AdminAvailabilityData = {
  weekly: AdminWeeklyAvailability[];
  blocked_periods: AdminBlockedPeriod[];
};

type DesigneeForm = {
  designee_name: string;
  business_name: string;
  designation_number: string;
  email: string;
  reply_to_email: string;
  phone: string;
  website: string;
  mailing_address_line1: string;
  mailing_address_line2: string;
  mailing_address_city: string;
  mailing_address_state: string;
  mailing_address_postal_code: string;
  mailing_address_country: string;
  email_signature: string;
};

function clean(value: string | null | undefined) {
  return value ?? "";
}

function toForm(
  profileId: string,
  designee: DesigneeProfile | null,
): DesigneeForm {
  return {
    designee_name: clean(designee?.designee_name),
    business_name: clean(designee?.business_name),
    designation_number: clean(designee?.designation_number),
    email: clean(designee?.email),
    reply_to_email: clean(designee?.reply_to_email),
    phone: clean(designee?.phone),
    website: clean(designee?.website),
    mailing_address_line1: clean(
      designee?.mailing_address_line1,
    ),
    mailing_address_line2: clean(
      designee?.mailing_address_line2,
    ),
    mailing_address_city: clean(
      designee?.mailing_address_city,
    ),
    mailing_address_state: clean(
      designee?.mailing_address_state,
    ),
    mailing_address_postal_code: clean(
      designee?.mailing_address_postal_code,
    ),
    mailing_address_country:
      clean(designee?.mailing_address_country) ||
      "United States",
    email_signature: clean(designee?.email_signature),
  };
}

function profileName(profile: Profile) {
  const preferred = profile.preferred_name?.trim();
  const first = preferred || profile.first_name?.trim();
  const last = profile.last_name?.trim();

  return (
    [first, last].filter(Boolean).join(" ") ||
    profile.email ||
    "Unnamed Examiner"
  );
}

function examinerName(detail: ExaminerDetail) {
  return (
    detail.designee?.designee_name?.trim() ||
    profileName(detail.profile)
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "No activity";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "No activity";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Honolulu",
  }).format(date);
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}

export default function AdminManageExaminerPage() {
  const params = useParams<{ profileId: string }>();
  const profileId = params.profileId;

  const [detail, setDetail] =
    useState<ExaminerDetail | null>(null);

  const [form, setForm] =
    useState<DesigneeForm | null>(null);

  const [authorizations, setAuthorizations] =
    useState<ExaminerAuthorizations>({
      practical_tests: [],
      type_ratings: [],
    });

  const [typeRatingSearch, setTypeRatingSearch] =
    useState("");

  const [aircraftSearch, setAircraftSearch] =
    useState("");

  const [aircraftResults, setAircraftResults] =
    useState<AircraftAuthorization[]>([]);

  const [locations, setLocations] =
    useState<LocationAuthorization[]>([]);

  const [examinerFees, setExaminerFees] =
    useState<ExaminerFee[]>([]);

  const [weeklyAvailability, setWeeklyAvailability] =
    useState<AdminWeeklyAvailability[]>([]);

  const [blockedPeriods, setBlockedPeriods] =
    useState<AdminBlockedPeriod[]>([]);

  const [savingWeek, setSavingWeek] =
    useState(false);

  const [blockAllDay, setBlockAllDay] =
    useState(false);

  const [blockDate, setBlockDate] =
    useState("");

  const [blockStart, setBlockStart] =
    useState("");

  const [blockEnd, setBlockEnd] =
    useState("");

  const [blockReason, setBlockReason] =
    useState("");

  const [blockNotes, setBlockNotes] =
    useState("");

  const [savingBlock, setSavingBlock] =
    useState(false);

  const [deletingBlockId, setDeletingBlockId] =
    useState<string | null>(null);

  const [loadingAircraft, setLoadingAircraft] =
    useState(false);

  const [savingAuthorizationKey, setSavingAuthorizationKey] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] =
    useState(false);

  const [message, setMessage] = useState("");
  const [pageError, setPageError] = useState("");

  const loadExaminer = useCallback(async () => {
    setLoading(true);
    setPageError("");

    const supabase = createClient();

    const [detailResult, authorizationResult] =
      await Promise.all([
        supabase.rpc(
          "admin_get_examiner_detail",
          {
            p_profile_id: profileId,
          },
        ),
        supabase.rpc(
          "admin_get_examiner_authorizations",
          {
            p_profile_id: profileId,
          },
        ),
      ]);

    if (detailResult.error) {
      setPageError(
        `Examiner information could not be loaded: ${detailResult.error.message}`,
      );
      setLoading(false);
      return;
    }

    if (authorizationResult.error) {
      setPageError(
        `Examiner authorizations could not be loaded: ${authorizationResult.error.message}`,
      );
      setLoading(false);
      return;
    }

    const loaded =
      detailResult.data as ExaminerDetail;

    const loadedAuthorizations =
      authorizationResult.data as ExaminerAuthorizations;

    setDetail(loaded);
    setForm(toForm(profileId, loaded.designee));

    setAuthorizations({
      practical_tests:
        loadedAuthorizations?.practical_tests ?? [],
      type_ratings:
        loadedAuthorizations?.type_ratings ?? [],
    });

    const locationResult = await supabase.rpc(
      "admin_get_examiner_location_authorizations",
      {
        p_profile_id: profileId,
      },
    );

    if (locationResult.error) {
      setPageError(
        `Examiner locations could not be loaded: ${locationResult.error.message}`,
      );
      setLoading(false);
      return;
    }

    setLocations(
      (locationResult.data ?? []) as LocationAuthorization[],
    );

    const [feeResult, availabilityResult] =
      await Promise.all([
        supabase.rpc(
          "admin_get_examiner_fee_schedule",
          {
            p_profile_id: profileId,
          },
        ),
        supabase.rpc(
          "admin_get_examiner_availability",
          {
            p_profile_id: profileId,
          },
        ),
      ]);

    if (feeResult.error) {
      setPageError(
        `Examiner fees could not be loaded: ${feeResult.error.message}`,
      );
      setLoading(false);
      return;
    }

    const loadedFees =
      (feeResult.data ?? []) as Array<
        Omit<ExaminerFee, "fee_amount"> & {
          fee_amount: number | null;
        }
      >;

    setExaminerFees(
      loadedFees.map((fee) => ({
        ...fee,
        fee_amount:
          fee.fee_amount === null
            ? ""
            : String(fee.fee_amount),
      })),
    );

    if (availabilityResult.error) {
      setPageError(
        `Examiner availability could not be loaded: ${availabilityResult.error.message}`,
      );
      setLoading(false);
      return;
    }

    const availability =
      availabilityResult.data as AdminAvailabilityData;

    const loadedWeekly =
      availability?.weekly ?? [];

    setWeeklyAvailability(
      Array.from({ length: 7 }, (_, day) => {
        const existing =
          loadedWeekly.find(
            (item) => item.day_of_week === day,
          );

        if (existing) {
          return {
            ...existing,
            start_time:
              existing.start_time ?? "",
            end_time:
              existing.end_time ?? "",
            notes:
              existing.notes ?? "",
          };
        }

        return {
          id: null,
          day_of_week: day,
          is_available: false,
          start_time: "08:00",
          end_time: "17:00",
          notes: "",
        };
      }),
    );

    setBlockedPeriods(
      availability?.blocked_periods ?? [],
    );

    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    void loadExaminer();
  }, [loadExaminer]);

  function setField(
    key: keyof DesigneeForm,
    value: string,
  ) {
    setForm((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  }

  async function saveDesignee() {
    if (!form) return;

    if (!form.designee_name.trim()) {
      setPageError(
        "Enter the examiner or designee name.",
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setPageError("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_save_examiner_designee_profile",
      {
        p_profile_id: profileId,
        p_designee_name: form.designee_name,
        p_business_name: form.business_name,
        p_designation_number: form.designation_number,
        p_email: form.email,
        p_reply_to_email: form.reply_to_email,
        p_phone: form.phone,
        p_website: form.website,
        p_mailing_address_line1:
          form.mailing_address_line1,
        p_mailing_address_line2:
          form.mailing_address_line2,
        p_mailing_address_city:
          form.mailing_address_city,
        p_mailing_address_state:
          form.mailing_address_state,
        p_mailing_address_postal_code:
          form.mailing_address_postal_code,
        p_mailing_address_country:
          form.mailing_address_country,
        p_email_signature: form.email_signature,
      },
    );

    if (error) {
      setPageError(
        `Designee information could not be saved: ${error.message}`,
      );
      setSaving(false);
      return;
    }

    await loadExaminer();

    setMessage("Designee information saved.");
    setSaving(false);
  }

  function updateExaminerFee(
    practicalTestTypeId: string,
    value: string,
  ) {
    setExaminerFees((current) =>
      current.map((fee) =>
        fee.practical_test_type_id ===
        practicalTestTypeId
          ? {
              ...fee,
              fee_amount: value,
              uses_default: false,
            }
          : fee,
      ),
    );

    setMessage("");
    setPageError("");
  }

  async function saveExaminerFee(
    fee: ExaminerFee,
  ) {
    const amount = Number(
      fee.fee_amount.trim(),
    );

    if (
      !fee.fee_amount.trim() ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setPageError(
        "Enter a valid fee amount of zero or greater.",
      );
      return;
    }

    const key =
      `fee-${fee.practical_test_type_id}`;

    setSavingAuthorizationKey(key);
    setMessage("");
    setPageError("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_set_examiner_fee",
      {
        p_profile_id: profileId,
        p_practical_test_type_id:
          fee.practical_test_type_id,
        p_fee_amount: amount,
        p_is_active: fee.is_active,
      },
    );

    if (error) {
      setPageError(
        `Fee could not be saved: ${error.message}`,
      );
      setSavingAuthorizationKey(null);
      return;
    }

    setExaminerFees((current) =>
      current.map((item) =>
        item.practical_test_type_id ===
        fee.practical_test_type_id
          ? {
              ...item,
              fee_amount:
                amount.toFixed(2),
              uses_default: false,
            }
          : item,
      ),
    );

    setMessage(
      `Fee saved for ${fee.display_name}.`,
    );

    setSavingAuthorizationKey(null);
  }

  function updateWeeklyAvailability(
    day: number,
    changes: Partial<AdminWeeklyAvailability>,
  ) {
    setWeeklyAvailability((current) =>
      current.map((item) =>
        item.day_of_week === day
          ? {
              ...item,
              ...changes,
            }
          : item,
      ),
    );

    setMessage("");
    setPageError("");
  }

  async function saveWeeklyAvailability() {
    for (const day of weeklyAvailability) {
      if (
        day.is_available &&
        (
          !day.start_time ||
          !day.end_time ||
          day.end_time <= day.start_time
        )
      ) {
        setPageError(
          "Each available day must have a valid start and end time.",
        );
        return;
      }
    }

    setSavingWeek(true);
    setMessage("");
    setPageError("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_save_examiner_weekly_availability",
      {
        p_profile_id: profileId,
        p_rows: weeklyAvailability.map(
          (day) => ({
            day_of_week: day.day_of_week,
            is_available:
              day.is_available,
            start_time:
              day.is_available
                ? day.start_time
                : null,
            end_time:
              day.is_available
                ? day.end_time
                : null,
            notes:
              day.notes.trim() || null,
          }),
        ),
      },
    );

    if (error) {
      setPageError(
        `Weekly availability could not be saved: ${error.message}`,
      );
      setSavingWeek(false);
      return;
    }

    setMessage(
      "Weekly availability saved.",
    );

    setSavingWeek(false);
  }

  function hawaiiDateTimeToIso(
    value: string,
  ) {
    if (!value) return null;

    return new Date(
      `${value}:00-10:00`,
    ).toISOString();
  }

  function hawaiiAllDayRange(
    date: string,
  ) {
    if (!date) return null;

    const start = new Date(
      `${date}T00:00:00-10:00`,
    );

    const end = new Date(
      start.getTime() +
        24 * 60 * 60 * 1000,
    );

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  async function addBlockedPeriod() {
    let startsAt: string | null = null;
    let endsAt: string | null = null;

    if (blockAllDay) {
      const range =
        hawaiiAllDayRange(blockDate);

      startsAt =
        range?.start ?? null;

      endsAt =
        range?.end ?? null;
    } else {
      startsAt =
        hawaiiDateTimeToIso(blockStart);

      endsAt =
        hawaiiDateTimeToIso(blockEnd);
    }

    if (!startsAt || !endsAt) {
      setPageError(
        blockAllDay
          ? "Select the date to block."
          : "Enter the blocked start and end times.",
      );
      return;
    }

    if (
      new Date(endsAt).getTime() <=
      new Date(startsAt).getTime()
    ) {
      setPageError(
        "Blocked period end must be after start.",
      );
      return;
    }

    setSavingBlock(true);
    setMessage("");
    setPageError("");

    const supabase = createClient();

    const { data, error } =
      await supabase.rpc(
        "admin_add_examiner_blocked_period",
        {
          p_profile_id: profileId,
          p_starts_at: startsAt,
          p_ends_at: endsAt,
          p_all_day: blockAllDay,
          p_reason:
            blockReason.trim() || null,
          p_internal_notes:
            blockNotes.trim() || null,
        },
      );

    if (error) {
      setPageError(
        `Blocked period could not be added: ${error.message}`,
      );
      setSavingBlock(false);
      return;
    }

    const newPeriod: AdminBlockedPeriod = {
      id: data as string,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: blockAllDay,
      reason:
        blockReason.trim() || null,
      internal_notes:
        blockNotes.trim() || null,
    };

    setBlockedPeriods((current) =>
      [...current, newPeriod].sort(
        (a, b) =>
          new Date(a.starts_at).getTime() -
          new Date(b.starts_at).getTime(),
      ),
    );

    setBlockDate("");
    setBlockStart("");
    setBlockEnd("");
    setBlockReason("");
    setBlockNotes("");
    setMessage("Blocked period added.");
    setSavingBlock(false);
  }

  async function deleteBlockedPeriod(
    periodId: string,
  ) {
    if (deletingBlockId) return;

    setDeletingBlockId(periodId);
    setMessage("");
    setPageError("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_delete_examiner_blocked_period",
      {
        p_profile_id: profileId,
        p_period_id: periodId,
      },
    );

    if (error) {
      setPageError(
        `Blocked period could not be removed: ${error.message}`,
      );
      setDeletingBlockId(null);
      return;
    }

    setBlockedPeriods((current) =>
      current.filter(
        (period) =>
          period.id !== periodId,
      ),
    );

    setMessage("Blocked period removed.");
    setDeletingBlockId(null);
  }

  async function searchAircraft() {
    setLoadingAircraft(true);
    setPageError("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "admin_search_examiner_aircraft_authorizations",
      {
        p_profile_id: profileId,
        p_search: aircraftSearch,
        p_limit: 50,
      },
    );

    if (error) {
      setPageError(
        `Aircraft could not be loaded: ${error.message}`,
      );
      setLoadingAircraft(false);
      return;
    }

    setAircraftResults(
      (data ?? []) as AircraftAuthorization[],
    );

    setLoadingAircraft(false);
  }

  async function setAircraftAuthorization(
    aircraft: AircraftAuthorization,
  ) {
    const key = `aircraft-${aircraft.id}`;

    setSavingAuthorizationKey(key);
    setMessage("");
    setPageError("");

    const nextValue =
      !aircraft.is_authorized;

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_set_examiner_aircraft_authorization",
      {
        p_profile_id: profileId,
        p_faa_aircraft_type_id: aircraft.id,
        p_is_active: nextValue,
        p_authorization_notes:
          aircraft.authorization_notes,
      },
    );

    if (error) {
      setPageError(
        `Aircraft authorization could not be changed: ${error.message}`,
      );
      setSavingAuthorizationKey(null);
      return;
    }

    setAircraftResults((current) =>
      current.map((item) =>
        item.id === aircraft.id
          ? {
              ...item,
              is_authorized: nextValue,
            }
          : item,
      ),
    );

    setMessage(
      nextValue
        ? `${aircraft.manufacturer_model} authorized.`
        : `${aircraft.manufacturer_model} removed.`,
    );

    setSavingAuthorizationKey(null);
  }

  async function setLocationAuthorization(
    location: LocationAuthorization,
  ) {
    const key = `location-${location.id}`;

    setSavingAuthorizationKey(key);
    setMessage("");
    setPageError("");

    const nextValue =
      !location.is_authorized;

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_set_examiner_location_authorization",
      {
        p_profile_id: profileId,
        p_test_location_id: location.id,
        p_is_active: nextValue,
        p_authorization_notes:
          location.authorization_notes,
      },
    );

    if (error) {
      setPageError(
        `Location authorization could not be changed: ${error.message}`,
      );
      setSavingAuthorizationKey(null);
      return;
    }

    setLocations((current) =>
      current.map((item) =>
        item.id === location.id
          ? {
              ...item,
              is_authorized: nextValue,
            }
          : item,
      ),
    );

    setMessage(
      nextValue
        ? `${location.name} enabled.`
        : `${location.name} disabled.`,
    );

    setSavingAuthorizationKey(null);
  }

  async function setPracticalTestOffering(
    practicalTest: PracticalTestAuthorization,
  ) {
    const key = `practical-${practicalTest.id}`;

    setSavingAuthorizationKey(key);
    setMessage("");
    setPageError("");

    const nextValue = !practicalTest.is_offered;

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_set_examiner_practical_test_offering",
      {
        p_profile_id: profileId,
        p_practical_test_type_id: practicalTest.id,
        p_is_offered: nextValue,
      },
    );

    if (error) {
      setPageError(
        `Practical-test authorization could not be changed: ${error.message}`,
      );
      setSavingAuthorizationKey(null);
      return;
    }

    setAuthorizations((current) => ({
      ...current,
      practical_tests: current.practical_tests.map(
        (item) =>
          item.id === practicalTest.id
            ? {
                ...item,
                is_offered: nextValue,
              }
            : item,
      ),
    }));

    setMessage(
      nextValue
        ? `${practicalTest.display_name} enabled.`
        : `${practicalTest.display_name} disabled.`,
    );

    setSavingAuthorizationKey(null);
  }

  async function setTypeRatingAuthorization(
    typeRating: TypeRatingAuthorization,
  ) {
    const key = `type-${typeRating.id}`;

    setSavingAuthorizationKey(key);
    setMessage("");
    setPageError("");

    const nextValue = !typeRating.is_active;

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_set_examiner_type_rating_authorization",
      {
        p_profile_id: profileId,
        p_type_rating_designation_id:
          typeRating.id,
        p_is_active: nextValue,
        p_authorization_notes:
          typeRating.authorization_notes,
      },
    );

    if (error) {
      setPageError(
        `Type-rating authorization could not be changed: ${error.message}`,
      );
      setSavingAuthorizationKey(null);
      return;
    }

    setAuthorizations((current) => ({
      ...current,
      type_ratings: current.type_ratings.map(
        (item) =>
          item.id === typeRating.id
            ? {
                ...item,
                is_active: nextValue,
              }
            : item,
      ),
    }));

    setMessage(
      nextValue
        ? `${typeRating.designation} authorization enabled.`
        : `${typeRating.designation} authorization disabled.`,
    );

    setSavingAuthorizationKey(null);
  }

  async function toggleActive() {
    if (!detail || changingStatus) return;

    const newStatus = !detail.profile.is_active;

    setChangingStatus(true);
    setMessage("");
    setPageError("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_set_examiner_active",
      {
        p_profile_id: profileId,
        p_is_active: newStatus,
      },
    );

    if (error) {
      setPageError(
        `Examiner status could not be changed: ${error.message}`,
      );
      setChangingStatus(false);
      return;
    }

    await loadExaminer();

    setMessage(
      newStatus
        ? "Examiner account activated."
        : "Examiner account deactivated.",
    );

    setChangingStatus(false);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex min-h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading examiner…
          </div>
        </div>
      </main>
    );
  }

  if (!detail || !form) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/admin/examiners"
          className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Examiners
        </Link>

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          {pageError || "Examiner could not be loaded."}
        </div>
      </main>
    );
  }

  const name = examinerName(detail);

  const profileComplete = Boolean(
    detail.designee?.designee_name?.trim() &&
      detail.designee?.designation_number?.trim(),
  );

  const normalizedTypeRatingSearch =
    typeRatingSearch.trim().toLowerCase();

  const filteredTypeRatings =
    authorizations.type_ratings.filter(
      (item) =>
        !normalizedTypeRatingSearch ||
        item.designation
          .toLowerCase()
          .includes(normalizedTypeRatingSearch),
    );

  const offeredPracticalTestCount =
    authorizations.practical_tests.filter(
      (item) => item.is_offered,
    ).length;

  const activeTypeRatingCount =
    authorizations.type_ratings.filter(
      (item) => item.is_active,
    ).length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <Link
        href="/admin/examiners"
        className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Examiners
      </Link>

      <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sky-100 text-lg font-bold text-sky-800">
            {initials(name) || (
              <UserRound className="h-7 w-7" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
              Manage Examiner
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-950">
                {name}
              </h1>

              {detail.profile.is_active ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                  Inactive
                </span>
              )}

              {profileComplete ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Profile Complete
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                  <CircleAlert className="h-3.5 w-3.5" />
                  Profile Incomplete
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              {detail.profile.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {detail.profile.email}
                </span>
              ) : null}

              {detail.designee?.designation_number ? (
                <span className="font-semibold">
                  DPE #{detail.designee.designation_number}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={changingStatus}
          onClick={() => void toggleActive()}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
            detail.profile.is_active
              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          {changingStatus ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : detail.profile.is_active ? (
            <ToggleRight className="h-5 w-5" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}

          {detail.profile.is_active
            ? "Deactivate Examiner"
            : "Activate Examiner"}
        </button>
      </div>

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-900">
          {message}
        </div>
      ) : null}

      {pageError ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">
          {pageError}
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Upcoming Tests
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {detail.statistics.upcoming_tests}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Completed Tests
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {detail.statistics.completed_tests}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Total Assigned
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {detail.statistics.total_tests}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Last Activity
          </p>
          <p className="mt-2 text-sm font-bold text-slate-950">
            {formatDateTime(
              detail.statistics.last_activity_at,
            )}
          </p>
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-bold text-slate-950">
              Designee Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              This information is shared with the examiner&apos;s existing
              portal settings and email/report workflows.
            </p>
          </div>

          <div className="p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Examiner / designee name"
                value={form.designee_name}
                onChange={(value) =>
                  setField("designee_name", value)
                }
                placeholder="Examiner name"
              />

              <Field
                label="Business name"
                value={form.business_name}
                onChange={(value) =>
                  setField("business_name", value)
                }
                placeholder="Business name"
              />

              <Field
                label="DPE designation number"
                value={form.designation_number}
                onChange={(value) =>
                  setField("designation_number", value)
                }
                placeholder="Designation number"
              />

              <Field
                label="Phone"
                value={form.phone}
                onChange={(value) =>
                  setField("phone", value)
                }
                placeholder="Phone"
              />

              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) =>
                  setField("email", value)
                }
                placeholder="Examiner email"
              />

              <Field
                label="Reply-to email"
                type="email"
                value={form.reply_to_email}
                onChange={(value) =>
                  setField("reply_to_email", value)
                }
                placeholder="Reply-to email"
              />

              <Field
                label="Website"
                value={form.website}
                onChange={(value) =>
                  setField("website", value)
                }
                placeholder="Website"
              />
            </div>

            <div className="mt-7 border-t border-slate-200 pt-6">
              <h3 className="font-bold text-slate-950">
                Mailing Address
              </h3>

              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field
                    label="Address line 1"
                    value={form.mailing_address_line1}
                    onChange={(value) =>
                      setField(
                        "mailing_address_line1",
                        value,
                      )
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <Field
                    label="Address line 2"
                    value={form.mailing_address_line2}
                    onChange={(value) =>
                      setField(
                        "mailing_address_line2",
                        value,
                      )
                    }
                  />
                </div>

                <Field
                  label="City"
                  value={form.mailing_address_city}
                  onChange={(value) =>
                    setField(
                      "mailing_address_city",
                      value,
                    )
                  }
                />

                <Field
                  label="State"
                  value={form.mailing_address_state}
                  onChange={(value) =>
                    setField(
                      "mailing_address_state",
                      value,
                    )
                  }
                />

                <Field
                  label="Postal code"
                  value={form.mailing_address_postal_code}
                  onChange={(value) =>
                    setField(
                      "mailing_address_postal_code",
                      value,
                    )
                  }
                />

                <Field
                  label="Country"
                  value={form.mailing_address_country}
                  onChange={(value) =>
                    setField(
                      "mailing_address_country",
                      value,
                    )
                  }
                />
              </div>
            </div>

            <div className="mt-7 border-t border-slate-200 pt-6">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">
                  Email signature
                </span>

                <textarea
                  rows={5}
                  value={form.email_signature}
                  onChange={(event) =>
                    setField(
                      "email_signature",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDesignee()}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                {saving
                  ? "Saving…"
                  : "Save Designee Information"}
              </button>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-950">
              Portal Account
            </h2>

            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Login Email
                </dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {detail.profile.email ||
                    "Not specified"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Phone
                </dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {detail.profile.phone ||
                    "Not specified"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Time Zone
                </dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {detail.profile.timezone ||
                    "Pacific/Honolulu"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold text-slate-950">
                Examiner Configuration
              </h2>
            </div>

            <div className="divide-y divide-slate-200">
              <div className="flex items-center gap-3 px-5 py-4">
                <ClipboardCheck className="h-5 w-5 text-sky-700" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    Practical Tests
                  </p>
                  <p className="text-xs text-slate-500">
                    Certificates and ratings offered
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>

              <div className="flex items-center gap-3 px-5 py-4">
                <Plane className="h-5 w-5 text-sky-700" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    Aircraft &amp; Type Ratings
                  </p>
                  <p className="text-xs text-slate-500">
                    {
                      detail.configuration_counts
                        .type_ratings
                    }{" "}
                    type-rating authorization
                    {detail.configuration_counts
                      .type_ratings === 1
                      ? ""
                      : "s"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>

              <div className="flex items-center gap-3 px-5 py-4">
                <MapPin className="h-5 w-5 text-sky-700" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    Locations
                  </p>
                  <p className="text-xs text-slate-500">
                    Test locations and schools
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>

              <div className="flex items-center gap-3 px-5 py-4">
                <BadgeDollarSign className="h-5 w-5 text-sky-700" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    Fees
                  </p>
                  <p className="text-xs text-slate-500">
                    {
                      detail.configuration_counts
                        .fees
                    }{" "}
                    configured fee
                    {detail.configuration_counts
                      .fees === 1
                      ? ""
                      : "s"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>

              <div className="flex items-center gap-3 px-5 py-4">
                <CalendarClock className="h-5 w-5 text-sky-700" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    Availability
                  </p>
                  <p className="text-xs text-slate-500">
                    {
                      detail.configuration_counts
                        .weekly_availability
                    }{" "}
                    weekly schedule row
                    {detail.configuration_counts
                      .weekly_availability === 1
                      ? ""
                      : "s"}
                    {" · "}
                    {
                      detail.configuration_counts
                        .blocked_periods
                    }{" "}
                    blocked period
                    {detail.configuration_counts
                      .blocked_periods === 1
                      ? ""
                      : "s"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500">
              These configuration areas are linked to the existing
              examiner settings tables. Direct administrator editing
              of each section is the next build step.
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <FileClock className="mt-0.5 h-5 w-5 text-sky-700" />

              <div>
                <h2 className="font-bold text-slate-950">
                  Activity
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Last examiner activity:
                </p>

                <p className="mt-1 font-semibold text-slate-950">
                  {formatDateTime(
                    detail.statistics.last_activity_at,
                  )}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">
            Fee Schedule
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Set this examiner&apos;s published fee for each
            practical test they currently offer.
          </p>
        </div>

        <div className="max-h-[520px] divide-y divide-slate-200 overflow-y-auto">
          {examinerFees.map((fee) => {
            const saving =
              savingAuthorizationKey ===
              `fee-${fee.practical_test_type_id}`;

            return (
              <div
                key={fee.practical_test_type_id}
                className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-950">
                    {fee.display_name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {[
                      fee.certificate_name,
                      fee.issuance_name,
                      fee.rating_name,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>

                  {fee.uses_default ? (
                    <p className="mt-1 text-xs font-semibold text-amber-700">
                      Using system default
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      $
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={fee.fee_amount}
                      onChange={(event) =>
                        updateExaminerFee(
                          fee.practical_test_type_id,
                          event.target.value,
                        )
                      }
                      className="w-32 rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-right text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={Boolean(
                      savingAuthorizationKey,
                    )}
                    onClick={() =>
                      void saveExaminerFee(fee)
                    }
                    className="inline-flex min-w-24 items-center justify-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving…"
                      : "Save"}
                  </button>
                </div>
              </div>
            );
          })}

          {examinerFees.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              Enable at least one Practical Test before configuring fees.
            </div>
          ) : null}
        </div>
      </section>


      <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Weekly Availability
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Set the examiner&apos;s recurring practical-test
                working hours.
              </p>
            </div>

            <button
              type="button"
              disabled={savingWeek}
              onClick={() =>
                void saveWeeklyAvailability()
              }
              className="rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {savingWeek
                ? "Saving…"
                : "Save Availability"}
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {weeklyAvailability.map((day) => {
            const names = [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ];

            return (
              <div
                key={day.day_of_week}
                className="grid gap-4 px-6 py-4 md:grid-cols-[150px_110px_140px_140px_minmax(180px,1fr)] md:items-center"
              >
                <p className="font-bold text-slate-950">
                  {names[day.day_of_week]}
                </p>

                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={day.is_available}
                    onChange={(event) =>
                      updateWeeklyAvailability(
                        day.day_of_week,
                        {
                          is_available:
                            event.target.checked,
                        },
                      )
                    }
                    className="h-4 w-4"
                  />

                  Available
                </label>

                <input
                  type="time"
                  value={day.start_time}
                  disabled={!day.is_available}
                  onChange={(event) =>
                    updateWeeklyAvailability(
                      day.day_of_week,
                      {
                        start_time:
                          event.target.value,
                      },
                    )
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                />

                <input
                  type="time"
                  value={day.end_time}
                  disabled={!day.is_available}
                  onChange={(event) =>
                    updateWeeklyAvailability(
                      day.day_of_week,
                      {
                        end_time:
                          event.target.value,
                      },
                    )
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                />

                <input
                  type="text"
                  value={day.notes}
                  onChange={(event) =>
                    updateWeeklyAvailability(
                      day.day_of_week,
                      {
                        notes:
                          event.target.value,
                      },
                    )
                  }
                  placeholder="Optional notes"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            );
          })}
        </div>
      </section>


      <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">
            Blocked Periods
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Add dates or time periods when this examiner
            cannot be scheduled.
          </p>
        </div>

        <div className="p-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={blockAllDay}
              onChange={(event) =>
                setBlockAllDay(
                  event.target.checked,
                )
              }
              className="h-4 w-4"
            />

            All-day block
          </label>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {blockAllDay ? (
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Date
                </span>

                <input
                  type="date"
                  value={blockDate}
                  onChange={(event) =>
                    setBlockDate(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">
                    Start
                  </span>

                  <input
                    type="datetime-local"
                    value={blockStart}
                    onChange={(event) =>
                      setBlockStart(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">
                    End
                  </span>

                  <input
                    type="datetime-local"
                    value={blockEnd}
                    onChange={(event) =>
                      setBlockEnd(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </label>
              </>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Reason
              </span>

              <input
                type="text"
                value={blockReason}
                onChange={(event) =>
                  setBlockReason(
                    event.target.value,
                  )
                }
                placeholder="Optional reason"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Internal Notes
              </span>

              <input
                type="text"
                value={blockNotes}
                onChange={(event) =>
                  setBlockNotes(
                    event.target.value,
                  )
                }
                placeholder="Optional administrator note"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={savingBlock}
              onClick={() =>
                void addBlockedPeriod()
              }
              className="rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {savingBlock
                ? "Adding…"
                : "Add Blocked Period"}
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-200 border-t border-slate-200">
          {blockedPeriods.map((period) => (
            <div
              key={period.id}
              className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold text-slate-950">
                  {period.all_day
                    ? "All Day"
                    : new Date(
                        period.starts_at,
                      ).toLocaleString()}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {period.all_day
                    ? new Date(
                        period.starts_at,
                      ).toLocaleDateString()
                    : `Through ${new Date(
                        period.ends_at,
                      ).toLocaleString()}`}
                </p>

                {period.reason ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {period.reason}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                disabled={
                  deletingBlockId !== null
                }
                onClick={() =>
                  void deleteBlockedPeriod(
                    period.id,
                  )
                }
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {deletingBlockId === period.id
                  ? "Removing…"
                  : "Remove"}
              </button>
            </div>
          ))}

          {blockedPeriods.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">
              No blocked periods are currently configured.
            </div>
          ) : null}
        </div>
      </section>


      <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">
            Aircraft Authorized
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Search the FAA aircraft catalog and select aircraft
            this examiner is authorized to use for practical
            tests.
          </p>

          <div className="mt-5 flex gap-3">
            <label className="relative block flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={aircraftSearch}
                onChange={(event) =>
                  setAircraftSearch(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void searchAircraft();
                  }
                }}
                placeholder="Search manufacturer, model, or type designator…"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <button
              type="button"
              onClick={() =>
                void searchAircraft()
              }
              disabled={loadingAircraft}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {loadingAircraft ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}

              Search
            </button>
          </div>
        </div>

        <div className="max-h-[520px] divide-y divide-slate-200 overflow-y-auto">
          {aircraftResults.map((aircraft) => {
            const saving =
              savingAuthorizationKey ===
              `aircraft-${aircraft.id}`;

            return (
              <div
                key={aircraft.id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-950">
                    {aircraft.manufacturer_model}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {[
                      aircraft.type_designator,
                      aircraft.aircraft_class,
                      aircraft.engine_type,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={Boolean(
                    savingAuthorizationKey,
                  )}
                  onClick={() =>
                    void setAircraftAuthorization(
                      aircraft,
                    )
                  }
                  className={`inline-flex min-w-28 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-50 ${
                    aircraft.is_authorized
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : aircraft.is_authorized ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}

                  {aircraft.is_authorized
                    ? "Authorized"
                    : "Authorize"}
                </button>
              </div>
            );
          })}

          {!loadingAircraft &&
          aircraftResults.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              Search the FAA aircraft catalog to manage
              examiner aircraft authorizations.
            </div>
          ) : null}
        </div>
      </section>


      <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Test Locations
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select the active test locations available to
                this examiner.
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
              {
                locations.filter(
                  (item) => item.is_authorized,
                ).length
              } enabled
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {locations.map((location) => {
            const saving =
              savingAuthorizationKey ===
              `location-${location.id}`;

            return (
              <div
                key={location.id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-950">
                    {location.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {[
                      location.code,
                      location.address,
                      location.timezone,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={Boolean(
                    savingAuthorizationKey,
                  )}
                  onClick={() =>
                    void setLocationAuthorization(
                      location,
                    )
                  }
                  className={`inline-flex min-w-28 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-50 ${
                    location.is_authorized
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : location.is_authorized ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}

                  {location.is_authorized
                    ? "Enabled"
                    : "Enable"}
                </button>
              </div>
            );
          })}

          {locations.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              No active test locations are configured.
            </div>
          ) : null}
        </div>
      </section>


      <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Practical Tests Authorized
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select the practical tests this examiner is authorized
                and willing to administer.
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
              {offeredPracticalTestCount} enabled
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {authorizations.practical_tests.map(
            (practicalTest) => {
              const saving =
                savingAuthorizationKey ===
                `practical-${practicalTest.id}`;

              return (
                <div
                  key={practicalTest.id}
                  className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-950">
                      {practicalTest.display_name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {[
                        practicalTest.certificate_name,
                        practicalTest.issuance_name,
                        practicalTest.category_name,
                        practicalTest.class_name,
                        practicalTest.rating_name,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={Boolean(
                      savingAuthorizationKey,
                    )}
                    onClick={() =>
                      void setPracticalTestOffering(
                        practicalTest,
                      )
                    }
                    className={`inline-flex min-w-28 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
                      practicalTest.is_offered
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : practicalTest.is_offered ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}

                    {practicalTest.is_offered
                      ? "Enabled"
                      : "Enable"}
                  </button>
                </div>
              );
            },
          )}

          {authorizations.practical_tests.length ===
          0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">
              No active practical-test types are currently available.
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Type Ratings Authorized
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage FAA type-rating designations this examiner
                is authorized to administer.
              </p>

              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-sky-700">
                {activeTypeRatingCount} active authorization
                {activeTypeRatingCount === 1 ? "" : "s"}
              </p>
            </div>

            <label className="relative block w-full lg:w-80">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={typeRatingSearch}
                onChange={(event) =>
                  setTypeRatingSearch(
                    event.target.value,
                  )
                }
                placeholder="Search type ratings…"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>
        </div>

        <div className="max-h-[620px] divide-y divide-slate-200 overflow-y-auto">
          {filteredTypeRatings.map((typeRating) => {
            const saving =
              savingAuthorizationKey ===
              `type-${typeRating.id}`;

            return (
              <div
                key={typeRating.id}
                className="flex items-center justify-between gap-4 px-6 py-3.5"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-950">
                    {typeRating.designation}
                  </p>

                  {typeRating.authorization_notes ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {typeRating.authorization_notes}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  disabled={Boolean(
                    savingAuthorizationKey,
                  )}
                  onClick={() =>
                    void setTypeRatingAuthorization(
                      typeRating,
                    )
                  }
                  className={`inline-flex min-w-28 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
                    typeRating.is_active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : typeRating.is_active ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}

                  {typeRating.is_active
                    ? "Authorized"
                    : "Authorize"}
                </button>
              </div>
            );
          })}

          {filteredTypeRatings.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              No type ratings match your search.
            </div>
          ) : null}
        </div>
      </section>

    </main>
  );
}
