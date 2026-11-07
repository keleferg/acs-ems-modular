// Priority order for applicants who requested the same Open Offer (Kele, Nov 7 2026 15:17).
//
// Responses are grouped by the hour: a group starts with the earliest remaining response and holds
// every response made within one hour of it. Inside a group, the applicant whose practical test
// request was submitted earliest comes first (ties: whoever responded first). Groups keep their
// time order, so someone who responds more than an hour after a group started ranks after that
// whole group, however old their request is.
//
// Examples: two requests both submitted a month ago → whoever responded first is #1.
// A 2-week-old request responds, then a 3-week-old request responds more than an hour later →
// the 2-week request is #1. Had the 3-week request responded within the hour, it would be #1.
//
// The order is advice only: the examiner can accept any of them.

export const PRIORITY_WINDOW_MS = 60 * 60 * 1000;

export type PriorityCandidate = {
  responded_at: string | null;
  request_submitted_at: string | null;
};

function time(value: string | null) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

export function orderByPriority<T extends PriorityCandidate>(candidates: T[]): T[] {
  const byResponse = [...candidates].sort((a, b) => time(a.responded_at) - time(b.responded_at));
  const ordered: T[] = [];
  let index = 0;
  while (index < byResponse.length) {
    const windowStart = time(byResponse[index].responded_at);
    const group: T[] = [];
    while (index < byResponse.length && time(byResponse[index].responded_at) - windowStart <= PRIORITY_WINDOW_MS) {
      group.push(byResponse[index]);
      index += 1;
    }
    if (group.length === 0) {
      // responded_at missing: keep it, at the end, in its own group
      group.push(byResponse[index]);
      index += 1;
    }
    group.sort(
      (a, b) =>
        time(a.request_submitted_at) - time(b.request_submitted_at) ||
        time(a.responded_at) - time(b.responded_at),
    );
    ordered.push(...group);
  }
  return ordered;
}
