"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Double-booking check (Kele, Nov 1 2026): another examiner has the same applicant's request for
// the same practical test as Scheduled, Confirmed or Completed. Checked when the page opens and
// every minute after that (examiner_get_double_bookings only returns the other examiner's name
// and the status).

export type DoubleBooking = {
  request_id: string;
  other_request_id: string;
  other_examiner_name: string;
  other_status: string;
};

export type DoubleBookingMap = Record<string, DoubleBooking[]>;

export function doubleBookingMessage(booking: DoubleBooking) {
  const name = booking.other_examiner_name.startsWith("another")
    ? booking.other_examiner_name
    : `Examiner ${booking.other_examiner_name}`;
  return booking.other_status === "completed"
    ? `This test has been completed with ${name}.`
    : `This test has been scheduled with ${name}.`;
}

export function useDoubleBookings(enabled = true, intervalMs = 60_000): DoubleBookingMap {
  const [map, setMap] = useState<DoubleBookingMap>({});

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function check() {
      const { data, error } = await createClient().rpc("examiner_get_double_bookings", {});
      if (cancelled) return;
      if (error) {
        console.error("Double-booking check failed:", error);
        return;
      }
      const next: DoubleBookingMap = {};
      for (const row of (data ?? []) as DoubleBooking[]) {
        (next[row.request_id] ??= []).push(row);
      }
      setMap(next);
    }

    void check();
    const timer = window.setInterval(() => void check(), intervalMs);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, intervalMs]);

  return map;
}
