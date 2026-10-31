// Legal name in parts (Kele, Oct 31 2026): first, middle, last and suffix are kept separately on the
// applicant profile so names can be compared reliably with IDs, certificates and knowledge-test reports.
// full_legal_name stays as the joined name; the database keeps the two in step.

export type LegalName = { first: string; middle: string; last: string; suffix: string };

export const SUFFIXES = ["", "Jr.", "Sr.", "II", "III", "IV", "V"];

const SUFFIX_PATTERN = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;

/** "NMN" (no middle name) is kept in the middle-name box but left out of the joined name. */
export function isNoMiddleName(middle: string) {
  return middle.trim().replace(/\./g, "").toUpperCase() === "NMN";
}

export function composeLegalName(name: LegalName) {
  return [name.first, isNoMiddleName(name.middle) ? "" : name.middle, name.last, name.suffix].map((part) => part.trim().replace(/\s+/g, " ")).filter(Boolean).join(" ");
}

/** Best guess for an older single-field name: first word, last word, the rest as middle. */
export function splitLegalName(full: string | null | undefined): LegalName {
  const words = String(full ?? "").trim().split(/\s+/).filter(Boolean);
  let suffix = "";
  if (words.length > 2 && SUFFIX_PATTERN.test(words[words.length - 1])) {
    const raw = words.pop() as string;
    suffix = SUFFIXES.find((option) => option.replace(".", "").toLowerCase() === raw.replace(".", "").toLowerCase()) ?? raw;
  }
  if (words.length === 0) return { first: "", middle: "", last: "", suffix };
  if (words.length === 1) return { first: words[0], middle: "", last: "", suffix };
  return { first: words[0], middle: words.slice(1, -1).join(" "), last: words[words.length - 1], suffix };
}

/** For the three-box form: a stored suffix is shown at the end of the last name. */
export function withSuffixInLastName(name: LegalName): LegalName {
  return name.suffix ? { ...name, last: `${name.last} ${name.suffix}`.trim(), suffix: "" } : name;
}

export function legalNameFromRecord(
  record: { legal_first_name?: string | null; legal_middle_name?: string | null; legal_last_name?: string | null; legal_suffix?: string | null; full_legal_name?: string | null } | null | undefined,
  fallback = "",
): LegalName {
  if (record?.legal_first_name || record?.legal_last_name) {
    return withSuffixInLastName({
      first: record.legal_first_name ?? "",
      middle: record.legal_middle_name ?? "",
      last: record.legal_last_name ?? "",
      suffix: record.legal_suffix ?? "",
    });
  }
  return withSuffixInLastName(splitLegalName(record?.full_legal_name || fallback));
}

export function legalNameColumns(name: LegalName) {
  return {
    legal_first_name: name.first.trim(),
    legal_middle_name: isNoMiddleName(name.middle) ? "NMN" : name.middle.trim() || null,
    legal_last_name: name.last.trim(),
    legal_suffix: name.suffix.trim() || null,
    full_legal_name: composeLegalName(name),
  };
}
