import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Appointment } from "@/lib/types";
import { Calendar, Clock, FileText, User } from "lucide-react";
import { useEffect, useState } from "react";
import { getStaffAppointmentAvailability, rescheduleStaffAppointment } from "@/lib/appointmentsApi";

interface AppointmentDetailsModalProps {
  appointment: Appointment;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  onRescheduled?: () => void;
}

function formatPrettyDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrettyTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AppointmentDetailsModal({
  appointment,
  open,
  onClose,
  onComplete,
  onRescheduled,
}: AppointmentDetailsModalProps) {
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [slots, setSlots] = useState<Array<{ localDateTime: string; label: string; available: boolean }>>([]);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(appointment.durationMinutes ?? null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [error, setError] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "default";
      case "Completed":
        return "success";
      case "Cancelled":
        return "error";
      case "Scheduled":
      case "Pending":
        return "warning";
      default:
        return "secondary";
    }
  };

  const startTime = appointment.startTime
    ? new Date(appointment.startTime)
    : null;

  useEffect(() => {
    if (!open) return;
    const initialDate = startTime
      ? new Date(startTime.getTime() - startTime.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
      : "";
    setRescheduleDate(initialDate);
    setRescheduleSlot("");
    setError("");
  }, [open, appointment.id]);

  useEffect(() => {
    if (!open || !rescheduleDate) return;

    let cancelled = false;

    (async () => {
      try {
        setLoadingSlots(true);
        setError("");
        const data = await getStaffAppointmentAvailability({
          date: rescheduleDate,
          appointmentType: appointment.appointmentType || appointment.type || "Consultation",
          excludeAppointmentId: appointment.id,
        });
        if (cancelled) return;
        setSlots(data.slots || []);
        setDurationMinutes(data.durationMinutes ?? null);
      } catch (e: any) {
        if (cancelled) return;
        setSlots([]);
        setError(e?.message || "Failed to load available times");
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, rescheduleDate, appointment.id, appointment.appointmentType, appointment.type]);

  async function handleReschedule() {
    if (!rescheduleSlot) {
      setError("Choose an available time.");
      return;
    }

    try {
      setRescheduling(true);
      setError("");
      await rescheduleStaffAppointment(appointment.id, {
        startTime: new Date(rescheduleSlot).toISOString(),
        localDateTime: rescheduleSlot,
      });
      onRescheduled?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to reschedule appointment");
    } finally {
      setRescheduling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Patient */}
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Patient</p>
              <p className="font-medium text-gray-900">
                {appointment.patientName}
              </p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-medium text-gray-900">
                {startTime ? formatPrettyDate(startTime.toISOString()) : "—"}
              </p>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Time</p>
              <p className="font-medium text-gray-900">
                {startTime ? formatPrettyTime(startTime.toISOString()) : "—"}
              </p>
            </div>
          </div>

          {/* Appointment Type (Consultation / Lab Test / etc) */}
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Appointment Type</p>
              <p className="font-medium text-gray-900">
                {appointment.appointmentType || appointment.type || "—"}
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-600">Reschedule appointment</p>
                <p className="text-xs text-gray-500">
                  {durationMinutes ? `${durationMinutes} minutes • ` : ""}6:00 AM - 6:00 PM
                </p>
              </div>
            </div>

            <input
              type="date"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              value={rescheduleDate}
              onChange={(event) => {
                setRescheduleDate(event.target.value);
                setRescheduleSlot("");
              }}
            />

            {loadingSlots ? (
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-4 text-sm text-gray-500">
                Loading available times…
              </div>
            ) : slots.filter((slot) => slot.available).length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-4 text-sm text-amber-800">
                No open time slots are available for that day.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots
                  .filter((slot) => slot.available)
                  .map((slot) => (
                    <button
                      key={slot.localDateTime}
                      type="button"
                      onClick={() => setRescheduleSlot(slot.localDateTime)}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                        rescheduleSlot === slot.localDateTime
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
              </div>
            )}

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          {/* Status */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <Badge variant={getStatusColor(appointment.status)}>
              {appointment.status}
            </Badge>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Notes</p>
              <div className="p-3 bg-gray-50 rounded-md text-gray-900 text-sm">
                {appointment.notes}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>

            {appointment.status !== "Completed" &&
              appointment.status !== "Cancelled" && (
                <Button
                  variant="outline"
                  onClick={handleReschedule}
                  disabled={rescheduling || !rescheduleSlot}
                  className="flex-1"
                >
                  {rescheduling ? "Rescheduling…" : "Reschedule"}
                </Button>
              )}

            {appointment.status !== "Completed" &&
              appointment.status !== "Cancelled" && (
                <Button onClick={onComplete} className="flex-1">
                  Mark as Completed
                </Button>
              )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
