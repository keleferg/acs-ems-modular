import {
  VERIFIED_ADDITIONAL_ALTERNATIVE_GROUPS,
  VERIFIED_ADDITIONAL_MAPS,
  VERIFIED_INITIAL_ALTERNATIVE_GROUPS,
} from "./additionalRatingTables.js";

export const CERT_CONFIG = {
  Private: {
    label: "Private Pilot",
    acs: "FAA-S-ACS-6C",
    ratings: ["ASEL", "AMEL", "ASES", "AMES", "GLIDER", "RH"],
    ratingStandards: {
      GLIDER: "FAA-S-8081-22A",
      RH: "FAA-S-ACS-15",
    },
  },
  Instrument: { label: "Instrument", acs: "FAA-S-ACS-6C", ratings: ["Instrument Airplane"] },
  Commercial: {
    label: "Commercial Pilot",
    acs: "FAA-S-ACS-7B",
    ratings: ["ASEL", "AMEL", "ASES", "AMES", "GLIDER", "RH"],
    ratingStandards: {
      GLIDER: "FAA-S-8081-23B",
      RH: "FAA-S-ACS-16",
    },
  },
  ATP: { label: "Airline Transport Pilot", acs: "FAA-S-ACS-11B", ratings: ["ASEL", "AMEL"] },
  CFI: { label: "Flight Instructor", acs: "FAA-S-ACS-25", ratings: ["ASEL", "AMEL"] },
  "Proficiency Check": {
    label: "Proficiency Check",
    acs: "FAA Form 8410-1",
    evaluationMode: "ppc_8410_1",
    ratings: [
      "Pilot Proficiency Check (61.58)",
      "Flight Engineer Proficiency Check (91.529)"
    ]
  },
  "Type Rating": {
    label: "Type Rating",
    acs: "FAA-S-ACS-11B",
    ratings: [],
    preserveLoadedRating: true
  },
  "Flight Engineer": {
    label: "Flight Engineer",
    acs: "FAA-S-8081-21",
    ratings: [
      "Reciprocating Engine Powered",
      "Turbopropeller Powered",
      "Turbojet Powered"
    ]
  }
};

export function getCertificateRatings(certificate, loadedRating = "") {
  const cfg = CERT_CONFIG[certificate];

  if (!cfg) return loadedRating ? [loadedRating] : [];

  const ratings = [...cfg.ratings];
  const normalizedLoadedRating = String(loadedRating || "").trim();

  if (
    cfg.preserveLoadedRating &&
    normalizedLoadedRating &&
    !ratings.includes(normalizedLoadedRating)
  ) {
    ratings.unshift(normalizedLoadedRating);
  }

  return ratings;
}

export function getCertificateStandard(certificate, rating) {
  const cfg = CERT_CONFIG[certificate];
  return cfg?.ratingStandards?.[rating] || cfg?.acs || "";
}

/*
 * The ACS Code Decoder belongs only to evaluations that require an
 * Airman Knowledge Test Report. Additional ratings normally do not require
 * another knowledge test under 14 CFR 61.63 and 61.65(a)(7).
 *
 * An EMS appointment may provide an explicit requirement for an exception.
 * Keep that override here, alongside the rest of the certificate/rating
 * configuration, instead of scattering appointment-specific checks through
 * the ACS renderer.
 */
export function isKnowledgeTestRequired(examType, explicitRequirement = null) {
  if (typeof explicitRequirement === "boolean") {
    return explicitRequirement;
  }

  const normalizedExplicit = String(explicitRequirement ?? "")
    .trim()
    .toLowerCase();

  if (["true", "yes", "required", "1"].includes(normalizedExplicit)) {
    return true;
  }

  if (
    ["false", "no", "not_required", "not required", "0"].includes(
      normalizedExplicit,
    )
  ) {
    return false;
  }

  return String(examType || "").trim().toLowerCase() !== "additional";
}

function _S(s) {
  return [...new Set(
    s
      .split(",")
      .map(x => x.trim())
      .filter(Boolean)
      .flatMap(code => [code, code.replace("_", "."), code.replace(".", "_")])
  )];
}

const _d1 = _S("I_D,I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_C,IV_D,IV_E,IV_F,IV_M,IV_N,V_A,V_B,VI_A,VI_B,VI_C,VI_D,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,VIII_C,VIII_D,VIII_E,VIII_F,IX_A,IX_B,IX_C,IX_D,XI_A,XII_A");
const _d2 = _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_C,IV_D,IV_E,IV_F,IV_M,IV_N,V_A,V_B,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,VIII_C,VIII_D,VIII_E,VIII_F,IX_A,IX_B,IX_C,IX_D,XI_A,XII_A");
const _d3 = _S("I_D,I_F,I_G,I_I,II_A,II_B,II_C,II_E,II_F,III_B,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,IV_K,IV_L,IV_M,IV_N,V_A,V_B,VI_A,VI_B,VI_C,VI_D,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,VIII_C,VIII_D,VIII_E,VIII_F,IX_A,IX_B,IX_C,IX_D,XI_A,XII_B");
const _d4 = _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_E,IV_F,IV_N,V_A,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,VIII_C,VIII_D,VIII_E,VIII_F,IX_A,IX_C,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XII_A");
const _d5 = _S("I_D,I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_E,IV_F,IV_N,V_A,V_B,VI_A,VI_B,VI_C,VI_D,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,VIII_C,VIII_D,VIII_E,VIII_F,IX_A,IX_C,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XI_A,XII_A");
const _d6 = _S("I_F,I_G,I_I,II_A,II_B,II_C,II_E,II_F,III_B,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,IV_K,IV_L,IV_N,V_A,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,VIII_C,VIII_D,VIII_E,VIII_F,IX_A,IX_C,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XII_B");
const _d7 = _S("I_D,I_F,I_G,I_I,II_A,II_B,II_C,II_E,II_F,III_B,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,IV_K,IV_L,IV_N,V_A,V_B,VI_A,VI_B,VI_C,VI_D,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,VIII_C,VIII_D,VIII_E,VIII_F,IX_A,IX_C,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XI_A,XII_B");

const COMMERCIAL_AMEL_FROM_ASES = _S(
  "I_F,I_G," +
  "II_A,II_B,II_C,II_D,II_F," +
  "III_B," +
  "IV_A,IV_B,IV_E,IV_F," +
  "V_A," +
  "VII_A,VII_B,VII_C,VII_D,VII_E," +
  "IX_E,IX_F,IX_G," +
  "X_A,X_B,X_C,X_D," +
  "XII_A"
);

const COMMERCIAL_ASES_FROM_ASEL_OR_AMEL = _S("I_F,I_G,I_I,II_A,II_B,II_E,II_F,III_B,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,IV_K,IV_L,XI_B");
const COMMERCIAL_AMES_FROM_ASEL_OR_ASES = _S("I_F,I_G,II_A,II_B,II_F,IV_A,IV_B,IV_J,IV_K,IV_L,IV_M,IV_N,IV_O,V_A,VII_A,VII_B,VII_C,IX_E,IX_F,IX_G,X_A,X_B,X_C");

const _d11 = _S("II_C,II_K,III_B,IX_E,IX_F,X_I,XII_B,XII_C,XIV_A,II_A,II_B,II_D,II_E,II_F,II_G,II_H,II_I,II_J,II_L,II_M,II_N,II_O,V_A,V_B,V_C,V_D,V_F,VI_A,VI_B,VII_A,VII_B,VII_C,VII_D,VII_E,VII_F,VII_M,VII_N,VII_O,VIII_A,VIII_B,VIII_C,VIII_D,IX_A,IX_B,IX_C,IX_D,X_A,X_B,X_C,X_D,X_E,X_F,X_G,X_H,XI_A,XI_B,XI_C,XI_D,XI_E");
const _d12 = _S("II_C,II_K,II_P,III_B,IX_A,IX_E,X_A,XII_G,XIII_A,XIII_B,XIII_C,XIV_A,II_A,II_B,II_D,II_E,II_F,II_G,II_H,II_I,II_J,II_L,II_M,II_N,II_O,V_A,V_B,V_C,V_D,V_F,VI_A,VI_B,VII_A,VII_B,VII_E,VII_F,VII_N,VIII_A,VIII_B,VIII_C,VIII_D,X_C,X_D,X_E,XI_A,XI_B,XI_C,XI_D,XI_E,XII_A,XII_C,XII_E,XII_F");

export const ADDITIONAL_MAPS = {
  Private: {
    ASEL_from_ASES: _S("I_F,I_G,II_A,II_B,II_D,II_F,III_B,IV_A,IV_B,IV_C,IV_D,IV_E,IV_F,IX_A,IX_B,IX_C,XII_A"),
    ASEL_from_AMEL: _S("I_F,I_G,II_A,II_B,II_F,IV_A,IV_B,IV_C,IV_D,IV_E,IV_F,IV_M,IX_A,IX_B,IX_C"),
    ASEL_from_AMES: _S("I_F,I_G,II_A,II_B,II_D,II_F,III_B,IV_A,IV_B,IV_C,IV_D,IV_E,IV_F,IV_M,IX_A,IX_B,IX_C,XII_A"),
    ASEL_from_RH: _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_C,IV_D,IV_E,IV_F,IV_M,IV_N,V_A,V_B,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,IX_A,IX_B,IX_C,IX_D,XII_A"),
    ASEL_from_RG: _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_C,IV_D,IV_E,IV_F,IV_M,IV_N,V_A,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,IX_A,IX_B,IX_C,IX_D,XII_A"),
    ASEL_from_GLIDER: _d1,
    ASEL_from_BALLOON: _d1,
    ASEL_from_AIRSHIP: _d2,
    ASEL_from_PL: _d2,


    ASES_from_ASEL: _S("I_F,I_G,I_I,II_A,II_B,II_E,II_F,III_B,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,IV_K,IV_L,IX_A,IX_B,XII_B"),
    ASES_from_AMEL: _S("I_F,I_G,I_I,II_A,II_B,II_E,II_F,III_B,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,IV_K,IV_L,IV_M,IX_A,IX_B,XII_B"),
    ASES_from_AMES: _S("I_F,I_G,II_A,II_B,II_F,IV_A,IV_B,IV_M,IX_A,IX_B"),
    ASES_from_RH: _S("I_F,I_G,I_I,II_A,II_B,II_C,II_E,II_F,III_B,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,IV_K,IV_L,IV_M,IV_N,V_A,V_B,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,IX_A,IX_B,IX_C,IX_D,XII_B"),
    ASES_from_RG: _S("I_D,I_F,I_G,I_I,II_A,II_B,II_C,II_E,II_F,III_B,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,IV_K,IV_L,IV_M,IV_N,V_A,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,IX_A,IX_B,IX_C,IX_D,XII_B"),
    ASES_from_GLIDER: _d3,
    ASES_from_BALLOON: _d3,
    ASES_from_AIRSHIP: _S("I_D,I_F,I_G,I_I,II_A,II_B,II_C,II_E,II_F,III_B,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,IV_K,IV_L,IV_M,IV_N,V_A,V_B,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,IX_A,IX_B,IX_C,IX_D,XI_A,XII_B"),
    ASES_from_PL: _S("I_F,I_G,I_I,II_A,II_B,II_C,II_E,II_F,III_B,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,IV_K,IV_L,IV_M,IV_N,V_A,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,IX_A,IX_B,IX_C,IX_D,XII_B"),


    AMEL_from_ASEL: _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,IV_A,IV_B,IV_E,IV_F,V_A,VII_A,VII_B,VII_C,VII_D,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D"),
    AMEL_from_ASES: _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_E,IV_F,V_A,VII_A,VII_B,VII_C,VII_D,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XII_A"),
    AMEL_from_AMES: _S("I_F,I_G,II_A,II_D,III_B,IV_A,IV_B,IV_E,IV_F,XII_A"),
    AMEL_from_RH: _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_E,IV_F,IV_N,V_A,V_B,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,VIII_C,VIII_D,VIII_E,VIII_F,IX_A,IX_C,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XII_A"),
    AMEL_from_RG: _d4,
    AMEL_from_GLIDER: _d5,
    AMEL_from_BALLOON: _d5,
    AMEL_from_AIRSHIP: _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_E,IV_F,IV_N,V_A,V_B,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,VIII_C,VIII_D,VIII_E,VIII_F,IX_A,IX_C,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XI_A,XII_A"),
    AMEL_from_PL: _d4,

    AMES_from_ASEL: _S("I_F,I_G,I_I,II_A,II_B,II_E,II_F,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,IV_K,IV_L,V_A,VII_A,VII_B,VII_C,VII_D,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XII_B"),
    AMES_from_AMEL: _S("I_F,I_G,I_I,II_A,II_B,II_E,II_F,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,IV_K,IV_L,XII_B"),
    AMES_from_ASES: _S("I_F,I_G,II_A,II_B,II_E,II_F,IV_A,IV_B,V_A,VII_A,VII_B,VII_C,VII_D,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D"),
    AMES_from_RH: _S("I_F,I_G,I_I,II_A,II_B,II_C,II_E,II_F,III_B,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,IV_K,IV_L,IV_N,V_A,V_B,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,IX_A,IX_C,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XII_B"),
    AMES_from_RG: _d6,
    AMES_from_GLIDER: _d7,
    AMES_from_BALLOON: _d7,
    AMES_from_AIRSHIP: _S("I_F,I_G,I_I,II_A,II_B,II_C,II_E,II_F,III_B,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,IV_K,IV_L,IV_N,V_A,V_B,VII_A,VII_B,VII_C,VII_D,VIII_A,VIII_B,IX_A,IX_C,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XI_A,XII_B"),
    AMES_from_PL: _d6
  },

  Instrument: {
    "Instrument Airplane_from_Instrument Helicopter": _S("II_A,II_C,IV_A,IV_B,VI_A,VI_B,VI_C,VI_D,VI_E,VII_A,VII_B,VII_C,VII_D,VIII_A")
  },

  Commercial: {
    ASEL_from_AMEL: _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,IV_A,IV_B,IV_C,IV_D,IV_E,IV_F,IV_G,IV_I,VII_A,VII_B,VII_C,VII_D,IX_B,IX_C"),
    ASEL_from_ASES: _S("I_F,I_G,II_A,II_B,II_D,II_F,IV_A,IV_B,IV_C,IV_D,IV_E,IV_F,IV_G,IV_I,VII_A,VII_B,VII_C,VII_D,IX_B,IX_C"),

    ASES_from_ASEL: COMMERCIAL_ASES_FROM_ASEL_OR_AMEL,
    ASES_from_AMEL: COMMERCIAL_ASES_FROM_ASEL_OR_AMEL,

    AMEL_from_ASEL: _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,IV_A,IV_B,IV_E,IV_F,V_A,VII_A,VII_B,VII_C,VII_D,VII_E,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D"),
    AMEL_from_ASES: _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_E,IV_F,V_A,VII_A,VII_B,VII_C,VII_D,VII_E,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XI_A"),
    AMEL_from_AMES: _S("I_F,I_G,II_A,II_D,III_B,IV_A,IV_B,IV_E,IV_F,XI_A"),
    AMEL_from_RH: _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_E,IV_F,IV_N,V_A,VII_A,VII_B,VII_C,VII_D,VII_E,VIII_A,VIII_B,IX_A,IX_C,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XI_A"),
    AMEL_from_RG: _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_D,III_F,IV_B,V_A,VI_A,VII_A,VII_B,VII_C,VII_D,VII_E,VIII_A,VIII_B,IX_A,IX_C,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XI_A"),
    AMEL_from_PL: _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_E,IV_F,IV_N,V_A,VII_A,VII_B,VII_C,VII_D,VII_E,IX_A,IX_C,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XI_A"),
    AMEL_from_GLIDER: _S("I_D,I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_E,IV_F,IV_N,V_A,VI_A,VI_B,VI_C,VI_D,VII_A,VII_B,VII_C,VII_D,VII_E,VIII_A,VIII_B,IX_A,IX_C,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XI_A"),
    AMEL_from_BALLOON: _S("I_D,I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_E,IV_F,IV_N,V_A,VI_A,VI_B,VI_C,VI_D,VII_A,VII_B,VII_C,VII_D,VII_E,VIII_A,VIII_B,IX_A,IX_C,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XI_A"),
    AMEL_from_AIRSHIP: _S("I_F,I_G,II_A,II_B,II_C,II_D,II_F,III_B,IV_A,IV_B,IV_E,IV_F,IV_N,V_A,VII_A,VII_B,VII_C,VII_D,VII_E,VIII_A,VIII_B,IX_A,IX_C,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,XI_A"),

    AMES_from_ASEL: _S("I_F,I_G,I_I,II_A,II_B,II_E,II_F,IV_A,IV_B,IV_G,IV_H,IV_I,IV_J,V_A,VII_A,VII_B,VII_C,VII_D,IX_E,IX_F,IX_G,X_A,X_B,X_C,X_D,X_E,X_F,X_G,X_H,XI_B"),
    AMES_from_AMEL: _S("I_F,I_G,II_A,II_B,II_F,IV_A,IV_B,IV_J,IV_K,IV_L,IV_M,IV_N,IV_O,V_A,XI_A"),
    AMES_from_ASES: COMMERCIAL_AMES_FROM_ASEL_OR_ASES
  },

  ATP: {
    ASEL_from_AMEL: _S("I_F,I_G,II_A,II_B,II_E,III_A,III_B,III_D,IV_A,IV_B,V_A,V_B,V_C,V_D,V_E,V_F,VI_A,VI_B,IX_A"),
    AMEL_from_ASEL: _S("I_F,I_G,II_A,II_B,II_E,III_A,III_B,III_C,III_D,IV_A,IV_B,IV_C,V_A,V_B,V_C,V_D,V_E,V_F,VI_A,VI_B,VI_D,IX_A")
  },

  CFI: {
    ASEL_from_AMEL: _S("II_C,II_K,IX_B,IX_F,X_I,XII_B,XII_C,VII_A,VII_B,VII_C,VII_D,VII_E,VII_F,VII_M,VII_N,VII_O,IX_C,IX_D,X_A,X_B,X_C,X_D,X_E,X_F,X_G,X_H"),
    ASEL_from_RH: _d11,
    ASEL_from_RG: _S("II_C,II_K,III_B,IX_E,IX_F,X_I,XII_B,XII_C,XIV_A,II_A,II_B,II_D,II_E,II_F,II_G,II_H,II_I,II_J,II_L,II_M,II_N,II_O,V_A,V_B,V_C,V_D,V_F,VII_A,VII_B,VII_C,VII_D,VII_E,VII_F,VII_M,VII_N,VII_O,VIII_A,VIII_B,VIII_C,VIII_D,IX_A,IX_B,IX_C,IX_D,X_A,X_B,X_C,X_D,X_E,X_F,X_G,X_H,XI_A,XI_B,XI_C,XI_D,XI_E"),
    ASEL_from_GLIDER: _d11,

    AMEL_from_ASEL: _S("II_C,II_K,II_P,IX_A,X_A,XII_G,XIII_A,XIII_B,XIII_C,V_A,V_B,V_C,V_D,V_F,VII_A,VII_B,VII_E,VII_F,VII_N,X_C,X_D,X_E,XII_A,XII_C,XII_E,XII_F"),
    AMEL_from_RH: _d12,
    AMEL_from_RG: _S("II_C,II_K,II_P,III_B,IX_A,IX_E,X_A,XII_G,XIII_A,XIII_B,XIII_C,XIV_A,II_A,II_B,II_D,II_E,II_F,II_G,II_H,II_I,II_J,II_L,II_M,II_N,II_O,V_A,V_B,V_C,V_D,V_F,VII_A,VII_B,VII_E,VII_F,VII_N,VIII_A,VIII_B,VIII_C,VIII_D,X_C,X_D,X_E,XI_A,XI_B,XI_C,XI_D,XI_E,XII_A,XII_C,XII_E,XII_F"),
    AMEL_from_GLIDER: _d12
  }
};


/*
 * FAA additional-rating alternative task requirements.
 *
 * Each group represents ONE requirement which can be satisfied by
 * completing any one of the listed options.
 *
 * Example:
 *
 *   options: [
 *     ["V_B", "V_C"],
 *     ["V_D", "V_E"],
 *   ]
 *
 * means:
 *
 *   V.B + V.C
 *      OR
 *   V.D + V.E
 */

/*
 * FAA Initial practical-test alternative Task requirements.
 *
 * Commercial ASEL Area V:
 *
 *   A OR B
 *      AND
 *   C OR D
 *      AND
 *   E
 *
 * Task E remains an ordinary required Task.
 */
export const INITIAL_ALTERNATIVE_GROUPS = {
  Commercial: {
    ASEL: [
      {
        id: "COMMERCIAL_ASEL_INITIAL_AREA_V_AB",
        label: "Area V — Task A or B",
        options: [
          ["V_A"],
          ["V_B"],
        ],
      },
      {
        id: "COMMERCIAL_ASEL_INITIAL_AREA_V_CD",
        label: "Area V — Task C or D",
        options: [
          ["V_C"],
          ["V_D"],
        ],
      },
    ],

    ASES: [
      {
        id: "COMMERCIAL_ASES_INITIAL_AREA_V_AB",
        label: "Area V — Task A or B",
        options: [
          ["V_A"],
          ["V_B"],
        ],
      },
      {
        id: "COMMERCIAL_ASES_INITIAL_AREA_V_CD",
        label: "Area V — Task C or D",
        options: [
          ["V_C"],
          ["V_D"],
        ],
      },
    ],
  },
};

export const ADDITIONAL_ALTERNATIVE_GROUPS = {
  Commercial: {
    ASEL_from_AMEL: [
      {
        id: "COMMERCIAL_ASEL_FROM_AMEL_AREA_V",
        label: "Area V — B + (C or D) + E",
        options: [
          ["V_B", "V_C", "V_E"],
          ["V_B", "V_D", "V_E"],
        ],
      },
    ],
  },
};

for (const [certificate, maps] of Object.entries(VERIFIED_ADDITIONAL_MAPS)) {
  ADDITIONAL_MAPS[certificate] = {
    ...(ADDITIONAL_MAPS[certificate] || {}),
    ...maps,
  };
}

for (const [certificate, ratings] of Object.entries(VERIFIED_INITIAL_ALTERNATIVE_GROUPS)) {
  INITIAL_ALTERNATIVE_GROUPS[certificate] = {
    ...(INITIAL_ALTERNATIVE_GROUPS[certificate] || {}),
    ...ratings,
  };
}

for (const [certificate, maps] of Object.entries(VERIFIED_ADDITIONAL_ALTERNATIVE_GROUPS)) {
  ADDITIONAL_ALTERNATIVE_GROUPS[certificate] = {
    ...(ADDITIONAL_ALTERNATIVE_GROUPS[certificate] || {}),
    ...maps,
  };
}

export function hasRequiredTask(certificate, additionalKey, taskCode) {
  const required = ADDITIONAL_MAPS?.[certificate]?.[additionalKey] ?? [];
  return _S(taskCode).some(code => required.includes(code));
}
