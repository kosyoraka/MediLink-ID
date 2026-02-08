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

interface AppointmentDetailsModalProps {
  appointment: Appointment;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
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
}: AppointmentDetailsModalProps) {
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
                {appointment.type || "—"}
              </p>
            </div>
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
