import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  appointment: any;
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
};

export function AppointmentDetailsModal({ appointment, open, onClose, onComplete }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl p-5 border border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {appointment?.doctorName || appointment?.patientName || "Appointment"}
            </h2>
            <p className="text-sm text-gray-600">
              {appointment?.specialty || ""}
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={onClose} className="gap-2">
            <X className="w-4 h-4" />
            Close
          </Button>
        </div>

        <div className="mt-4 space-y-2 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <Badge variant="secondary">{appointment?.status}</Badge>
          </div>

          {appointment?.startTime && (
            <div>
              <span className="font-medium">Time:</span>{" "}
              {new Date(appointment.startTime).toLocaleString()}
            </div>
          )}

          {appointment?.date && (
            <div>
              <span className="font-medium">Date:</span> {String(appointment.date)}
            </div>
          )}

          {(appointment?.locationName || appointment?.location) && (
            <div>
              <span className="font-medium">Location:</span>{" "}
              {appointment.locationName || appointment.location}
            </div>
          )}

          {appointment?.address && (
            <div>
              <span className="font-medium">Address:</span> {appointment.address}
            </div>
          )}

          {appointment?.notes && (
            <div>
              <span className="font-medium">Notes:</span> {appointment.notes}
            </div>
          )}
        </div>

        {onComplete && (
          <div className="mt-5">
            <Button onClick={onComplete} className="w-full">
              Mark Completed
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
