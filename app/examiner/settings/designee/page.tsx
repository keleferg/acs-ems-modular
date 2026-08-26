"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DesigneeProfile = {
  id: string | null;
  profile_id: string;

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

function emptyProfile(profileId: string): DesigneeProfile {
  return {
    id: null,
    profile_id: profileId,

    designee_name: "",
    business_name: "",
    designation_number: "",

    email: "",
    reply_to_email: "",
    phone: "",
    website: "",

    mailing_address_line1: "",
    mailing_address_line2: "",
    mailing_address_city: "",
    mailing_address_state: "",
    mailing_address_postal_code: "",
    mailing_address_country: "United States",

    email_signature: "",
  };
}

function cleaned(value: string) {
  return value.trim() || null;
}

export default function DesigneeInformationSettingsPage() {
  const [profile, setProfile] = useState<DesigneeProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(
        "Your login session could not be verified. Please sign in again.",
      );
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("examiner_designee_profiles")
      .select(
        `
        id,
        profile_id,
        designee_name,
        business_name,
        designation_number,
        email,
        reply_to_email,
        phone,
        website,
        mailing_address_line1,
        mailing_address_line2,
        mailing_address_city,
        mailing_address_state,
        mailing_address_postal_code,
        mailing_address_country,
        email_signature
      `,
      )
      .eq("profile_id", user.id)
      .maybeSingle();

    if (error) {
      setErrorMessage(
        `Designee information could not be loaded: ${error.message}`,
      );
      setProfile(null);
    } else if (!data) {
      setProfile(emptyProfile(user.id));
    } else {
      setProfile({
        id: data.id,
        profile_id: data.profile_id,

        designee_name: data.designee_name ?? "",
        business_name: data.business_name ?? "",
        designation_number: data.designation_number ?? "",

        email: data.email ?? "",
        reply_to_email: data.reply_to_email ?? "",
        phone: data.phone ?? "",
        website: data.website ?? "",

        mailing_address_line1: data.mailing_address_line1 ?? "",
        mailing_address_line2: data.mailing_address_line2 ?? "",
        mailing_address_city: data.mailing_address_city ?? "",
        mailing_address_state: data.mailing_address_state ?? "",
        mailing_address_postal_code: data.mailing_address_postal_code ?? "",
        mailing_address_country:
          data.mailing_address_country ?? "United States",

        email_signature: data.email_signature ?? "",
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  function updateField(field: keyof DesigneeProfile, value: string) {
    setProfile((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );

    setMessage("");
    setErrorMessage("");
  }

  async function saveProfile() {
    if (!profile || saving) return;

    if (!profile.designee_name.trim()) {
      setErrorMessage("Enter the examiner or designee name.");
      return;
    }

    if (!profile.email.trim()) {
      setErrorMessage("Enter the examiner contact email.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    const payload = {
      profile_id: profile.profile_id,

      designee_name: cleaned(profile.designee_name),
      business_name: cleaned(profile.business_name),
      designation_number: cleaned(profile.designation_number),

      email: cleaned(profile.email),
      reply_to_email: cleaned(profile.reply_to_email),
      phone: cleaned(profile.phone),
      website: cleaned(profile.website),

      mailing_address_line1: cleaned(profile.mailing_address_line1),
      mailing_address_line2: cleaned(profile.mailing_address_line2),
      mailing_address_city: cleaned(profile.mailing_address_city),
      mailing_address_state: cleaned(profile.mailing_address_state),
      mailing_address_postal_code: cleaned(profile.mailing_address_postal_code),
      mailing_address_country:
        cleaned(profile.mailing_address_country) ?? "United States",

      email_signature: cleaned(profile.email_signature),

      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("examiner_designee_profiles")
      .upsert(payload, {
        onConflict: "profile_id",
      })
      .select(
        `
        id,
        profile_id,
        designee_name,
        business_name,
        designation_number,
        email,
        reply_to_email,
        phone,
        website,
        mailing_address_line1,
        mailing_address_line2,
        mailing_address_city,
        mailing_address_state,
        mailing_address_postal_code,
        mailing_address_country,
        email_signature
      `,
      )
      .single();

    if (error) {
      setErrorMessage(
        `Designee information could not be saved: ${error.message}`,
      );
      setSaving(false);
      return;
    }

    setProfile({
      id: data.id,
      profile_id: data.profile_id,

      designee_name: data.designee_name ?? "",
      business_name: data.business_name ?? "",
      designation_number: data.designation_number ?? "",

      email: data.email ?? "",
      reply_to_email: data.reply_to_email ?? "",
      phone: data.phone ?? "",
      website: data.website ?? "",

      mailing_address_line1: data.mailing_address_line1 ?? "",
      mailing_address_line2: data.mailing_address_line2 ?? "",
      mailing_address_city: data.mailing_address_city ?? "",
      mailing_address_state: data.mailing_address_state ?? "",
      mailing_address_postal_code: data.mailing_address_postal_code ?? "",
      mailing_address_country: data.mailing_address_country ?? "United States",

      email_signature: data.email_signature ?? "",
    });

    setMessage("Designee information saved.");
    setSaving(false);
  }

  return (
    <main>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Settings
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Designee Information
          </h2>

          <p className="mt-2 max-w-3xl text-slate-600">
            Manage the identity and contact information used in practical-test
            confirmations and applicant communications.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void saveProfile()}
          disabled={loading || saving || !profile}
          className="rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Designee Information"}
        </button>
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

      {loading ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
          Loading designee information…
        </div>
      ) : null}

      {!loading && profile ? (
        <div className="mt-8 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">
              Designee Identity
            </h3>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="designee-name"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Examiner / designee name
                  <span className="ml-1 text-red-600">*</span>
                </label>

                <input
                  id="designee-name"
                  value={profile.designee_name}
                  onChange={(event) =>
                    updateField("designee_name", event.target.value)
                  }
                  placeholder="Kele Fergerstrom"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label
                  htmlFor="business-name"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Business name
                </label>

                <input
                  id="business-name"
                  value={profile.business_name}
                  onChange={(event) =>
                    updateField("business_name", event.target.value)
                  }
                  placeholder="Aviation Training Solutions"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label
                  htmlFor="designation-number"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Designation number
                </label>

                <input
                  id="designation-number"
                  value={profile.designation_number}
                  onChange={(event) =>
                    updateField("designation_number", event.target.value)
                  }
                  placeholder="DPE designation number"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label
                  htmlFor="website"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Website
                </label>

                <input
                  id="website"
                  type="url"
                  value={profile.website}
                  onChange={(event) =>
                    updateField("website", event.target.value)
                  }
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">
              Contact Information
            </h3>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Contact email
                  <span className="ml-1 text-red-600">*</span>
                </label>

                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="examiner@example.com"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label
                  htmlFor="reply-to-email"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Email reply-to address
                </label>

                <input
                  id="reply-to-email"
                  type="email"
                  value={profile.reply_to_email}
                  onChange={(event) =>
                    updateField("reply_to_email", event.target.value)
                  }
                  placeholder="Defaults to contact email"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Phone
                </label>

                <input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="(808) 555-1234"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">
              Mailing Address
            </h3>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label
                  htmlFor="address-line-1"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Address line 1
                </label>

                <input
                  id="address-line-1"
                  value={profile.mailing_address_line1}
                  onChange={(event) =>
                    updateField("mailing_address_line1", event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="address-line-2"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Address line 2
                </label>

                <input
                  id="address-line-2"
                  value={profile.mailing_address_line2}
                  onChange={(event) =>
                    updateField("mailing_address_line2", event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  City
                </label>

                <input
                  id="city"
                  value={profile.mailing_address_city}
                  onChange={(event) =>
                    updateField("mailing_address_city", event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label
                  htmlFor="state"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  State
                </label>

                <input
                  id="state"
                  value={profile.mailing_address_state}
                  onChange={(event) =>
                    updateField("mailing_address_state", event.target.value)
                  }
                  maxLength={30}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label
                  htmlFor="postal-code"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Postal code
                </label>

                <input
                  id="postal-code"
                  value={profile.mailing_address_postal_code}
                  onChange={(event) =>
                    updateField(
                      "mailing_address_postal_code",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label
                  htmlFor="country"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Country
                </label>

                <input
                  id="country"
                  value={profile.mailing_address_country}
                  onChange={(event) =>
                    updateField("mailing_address_country", event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">
              Email Signature
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              This signature will be appended to practical-test appointment and
              status emails.
            </p>

            <textarea
              value={profile.email_signature}
              onChange={(event) =>
                updateField("email_signature", event.target.value)
              }
              rows={7}
              placeholder={`Mahalo,\nKele Fergerstrom\nDesignated Pilot Examiner`}
              className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
            />
          </section>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={saving}
              className="rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Designee Information"}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
