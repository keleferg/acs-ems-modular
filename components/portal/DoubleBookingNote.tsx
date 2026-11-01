import { doubleBookingMessage, type DoubleBooking } from "@/lib/double-booking";

export default function DoubleBookingNote({ bookings, className = "" }: { bookings?: DoubleBooking[]; className?: string }) {
  if (!bookings?.length) return null;
  return (
    <div className={`rounded-md border border-red-300 bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-800 ${className}`}>
      {bookings.map((booking) => (
        <p key={booking.other_request_id}>⚠ {doubleBookingMessage(booking)}</p>
      ))}
    </div>
  );
}
