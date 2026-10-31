import { formatDate, SECTION_NAMES, SECTION_ORDER, type Report, type Status } from "@/lib/qualification/report";

// Downloadable qualification report summary (Kele, Oct 31 2026): the same items as the
// Validate Qualifications page, as a letter-size PDF built in the browser with pdf-lib.

const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

/** The standard PDF fonts only cover Windows-1252; replace anything else. */
function clean(value: string) {
  return value
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/[→⇒]/g, "->")
    .replace(/[   ]/g, " ")
    .replace(/[\r\t]/g, " ")
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (ch === "\n" || (code >= 0x20 && code <= 0x7e) || (code >= 0xa1 && code <= 0xff) || WIN_ANSI_EXTRA.has(ch)) return ch;
      return "?";
    })
    .join("");
}

const STATUS_LABEL: Record<Status, string> = { pass: "Pass", check: "Check", issue: "Issue", na: "N/A" };

export async function downloadQualificationReportPdf(report: Report & { storedAt?: string | null }) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const M = 36;
  const SIZE = 8;
  const LINE = 10;
  const colors = {
    text: rgb(0.06, 0.09, 0.16),
    muted: rgb(0.39, 0.45, 0.55),
    rule: rgb(0.8, 0.83, 0.87),
    band: rgb(0.95, 0.96, 0.97),
    pass: rgb(0.08, 0.5, 0.24),
    check: rgb(0.92, 0.7, 0.03),
    issue: rgb(0.86, 0.15, 0.15),
    na: rgb(0.6, 0.64, 0.7),
    amber: rgb(0.71, 0.33, 0.04),
  };

  // Columns: status | item | entered | issue / check
  const cols = { status: M, item: M + 40, entered: M + 210, note: M + 420 };
  const widths = { item: 164, entered: 204, note: PAGE_W - M - cols.note };

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  function wrap(text: string, width: number, f = font, size = SIZE) {
    const lines: string[] = [];
    for (const paragraph of clean(text).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const attempt = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(attempt, size) <= width) {
          line = attempt;
          continue;
        }
        if (line) lines.push(line);
        // A single word wider than the column is cut.
        let rest = word;
        while (f.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
          let cut = rest.length - 1;
          while (cut > 1 && f.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut -= 1;
          lines.push(rest.slice(0, cut));
          rest = rest.slice(cut);
        }
        line = rest;
      }
      lines.push(line);
    }
    return lines.length ? lines : [""];
  }

  function text(value: string, x: number, yPos: number, options: { f?: typeof font; size?: number; color?: ReturnType<typeof rgb> } = {}) {
    page.drawText(clean(value), { x, y: yPos, size: options.size ?? SIZE, font: options.f ?? font, color: options.color ?? colors.text });
  }

  function newPage() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - M;
    tableHeader();
  }

  function ensure(height: number) {
    if (y - height < M + 16) newPage();
  }

  function tableHeader() {
    text("STATUS", cols.status, y, { f: bold, size: 7, color: colors.muted });
    text("ITEM", cols.item, y, { f: bold, size: 7, color: colors.muted });
    text("ENTERED", cols.entered, y, { f: bold, size: 7, color: colors.muted });
    text("ISSUE / CHECK", cols.note, y, { f: bold, size: 7, color: colors.muted });
    y -= 4;
    page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 0.8, color: colors.muted });
    y -= LINE;
  }

  // Header
  const { request, wizard, instructorReview } = report;
  const qualified = wizard.status === "accepted" || wizard.status === "closed";
  text("QUALIFICATION REPORT SUMMARY", M, y, { f: bold, size: 8, color: colors.amber });
  y -= 18;
  text(request.applicant_name_snapshot ?? "Applicant", M, y, { f: bold, size: 16 });
  y -= 13;
  text(`${request.request_number} · ${report.ruleSetName || `${request.certificate_sought ?? ""} — ${request.rating_sought ?? ""}`}`, M, y, { size: 9, color: colors.muted });

  const details = [
    `Test: ${formatDate(request.scheduled_start_at, true)}${request.scheduled_location ? ` · ${request.scheduled_location}` : ""}`,
    `Submitted: ${formatDate(wizard.applicant_submitted_at, true)}`,
    `Instructor: ${instructorReview?.instructor_name ?? wizard.instructor_name ?? "—"}${
      instructorReview?.status === "certified" && instructorReview.certified_at
        ? ` (certified ${formatDate(instructorReview.certified_at)})`
        : instructorReview?.status === "waived"
          ? " (certification skipped by the examiner)"
          : ""
    }`,
    `Status: ${qualified ? "Qualified" : wizard.status.replaceAll("_", " ")}${wizard.accepted_at ? ` · accepted ${formatDate(wizard.accepted_at, true)}` : ""}`,
  ];
  let dy = PAGE_H - M - 18;
  for (const line of details) {
    const w = font.widthOfTextAtSize(clean(line), 8.5);
    text(line, PAGE_W - M - w, dy, { size: 8.5 });
    dy -= 11;
  }
  y = Math.min(y, dy) - 10;

  // Qualified / not yet banner
  const bannerColor = qualified ? colors.pass : colors.amber;
  page.drawRectangle({ x: M, y: y - 8, width: PAGE_W - 2 * M, height: 20, color: qualified ? rgb(0.92, 0.98, 0.94) : rgb(1, 0.97, 0.9), borderColor: bannerColor, borderWidth: 0.8 });
  text(
    qualified
      ? `QUALIFIED — the examiner accepted this qualification package${wizard.accepted_at ? ` on ${formatDate(wizard.accepted_at)}` : ""}.`
      : "NOT YET QUALIFIED — the examiner has not accepted this qualification package.",
    M + 8,
    y - 1,
    { f: bold, size: 9, color: bannerColor },
  );
  y -= 26;

  const counts = report.rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] ?? 0) + 1 }), {} as Record<Status, number>);
  text(
    `${counts.pass ?? 0} pass · ${counts.check ?? 0} check manually · ${counts.issue ?? 0} known issue${(counts.issue ?? 0) === 1 ? "" : "s"}${counts.na ? ` · ${counts.na} not applicable` : ""}`,
    M,
    y,
    { size: 9 },
  );
  y -= 16;
  tableHeader();

  const sections = SECTION_ORDER.filter((code) => report.rows.some((row) => row.requirement.section_code === code));
  const extra = [...new Set(report.rows.map((row) => row.requirement.section_code))].filter((code) => !SECTION_ORDER.includes(code));

  for (const section of [...sections, ...extra]) {
    ensure(LINE * 3);
    page.drawRectangle({ x: M, y: y - 3, width: PAGE_W - 2 * M, height: LINE + 1, color: colors.band });
    text((SECTION_NAMES[section] ?? section.replaceAll("_", " ")).toUpperCase(), M + 3, y, { f: bold, size: 7, color: colors.muted });
    y -= LINE + 3;

    for (const row of report.rows.filter((item) => item.requirement.section_code === section)) {
      const title = `${row.requirement.title}${row.requirement.regulation_citation ? ` (${row.requirement.regulation_citation})` : ""}`;
      const itemLines = wrap(title, widths.item, bold);
      const enteredLines = wrap(`${row.entered || "—"}${row.pictures ? ` · ${row.pictures} picture${row.pictures === 1 ? "" : "s"}` : ""}`, widths.entered);
      const noteLines = wrap(row.note || "", widths.note);
      const height = Math.max(itemLines.length, enteredLines.length, noteLines.length) * LINE;
      ensure(height + 4);

      const statusColor = colors[row.status];
      page.drawCircle({ x: cols.status + 4, y: y + 2.5, size: 3.2, color: statusColor });
      text(STATUS_LABEL[row.status], cols.status + 10, y, { f: bold, size: 7, color: row.status === "check" ? colors.amber : statusColor });
      itemLines.forEach((line, i) => text(line, cols.item, y - i * LINE, { f: bold }));
      enteredLines.forEach((line, i) => text(line, cols.entered, y - i * LINE, { color: colors.text }));
      noteLines.forEach((line, i) => text(line, cols.note, y - i * LINE, { color: row.status === "issue" ? colors.issue : row.status === "check" ? colors.amber : colors.muted, f: row.status === "issue" ? bold : font }));

      y -= height;
      page.drawLine({ start: { x: M, y: y + 6 }, end: { x: PAGE_W - M, y: y + 6 }, thickness: 0.4, color: colors.rule });
      y -= 3;
    }
  }

  ensure(LINE * 3);
  y -= 6;
  for (const line of wrap(
    `Pass: meets the automatic checks (and has its picture). Check: the system can't verify it, so it was checked against the pictures or records. Issue: a known problem, shown at right. ${report.storedAt ? `Stored when the test was completed, ${formatDate(report.storedAt, true)} HST. ` : ""}Generated ${formatDate(new Date().toISOString(), true)} HST.`,
    PAGE_W - 2 * M,
    font,
    7,
  )) {
    text(line, M, y, { size: 7, color: colors.muted });
    y -= 9;
  }

  // Page numbers
  const pages = pdf.getPages();
  pages.forEach((p, index) => {
    const label = clean(`${request.request_number} · Page ${index + 1} of ${pages.length}`);
    p.drawText(label, { x: PAGE_W - M - font.widthOfTextAtSize(label, 7), y: M - 14, size: 7, font, color: colors.muted });
  });

  const bytes = await pdf.save();
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Qualification-Report-${(request.request_number || "request").replace(/[^A-Za-z0-9-]+/g, "-")}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
