import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

import { getStaffAppointments, setAppointmentStatus } from "@/lib/appointmentsApi";
import type { Appointment } from "@/lib/types";
import { AppointmentDetailsModal } from "@/components/modals/AppointmentDetailsModal";

interface AppointmentsProps {
  onNavigate: (page: string, data?: any) => void;
}

/* ---------- helpers ---------- */

function formatPrettyDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
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

function isTodayISO(iso: string) {
  const d = new Date(iso);
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

function isFutureISO(iso: string) {
  return new Date(iso).getTime() > Date.now();
}

function needsConfirmation(status: string) {
  return status === "Pending" || status === "Scheduled";
}

/* ---------- component ---------- */

export function Appointments({ onNavigate }: AppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const loadAppointments = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await getStaffAppointments();
      setAppointments(data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load appointments");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (filterStatus === "all") return true;
      if (filterStatus === "today") return isTodayISO(a.startTime);
      if (filterStatus === "upcoming")
        return isFutureISO(a.startTime) &&
          a.status !== "Completed" &&
          a.status !== "Cancelled";
      if (filterStatus === "pending_confirmation")
        return isFutureISO(a.startTime) && needsConfirmation(a.status);
      if (filterStatus === "completed") return a.status === "Completed";
      if (filterStatus === "cancelled") return a.status === "Cancelled";
      return true;
    });
  }, [appointments, filterStatus]);

  const pendingConfirmations = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          const ts = new Date(appointment.startTime).getTime();
          return !Number.isNaN(ts) && ts >= Date.now() && needsConfirmation(appointment.status);
        })
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [appointments]
  );

  const updateStatus = async (
    id: string,
    status: string,
    successMsg: string
  ) => {
    const prev = appointments;

    setAppointments((cur) =>
      cur.map((a) => (a.id === id ? { ...a, status } : a))
    );

    try {
      await setAppointmentStatus(id, status as any);
      toast.success(successMsg);
    } catch (e: any) {
      setAppointments(prev);
      toast.error(e?.message || "Update failed");
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadAppointments(true);
      toast.success("Appointments refreshed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Appointments
          </h1>
          <p className="text-gray-600 mt-1">
            Manage and track patient appointments
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="pending_confirmation">Pending Confirmation</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <Input type="date" disabled />
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-6 text-gray-600">
            Loading appointments…
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600 font-medium">
              Couldn’t load appointments
            </div>
            <div className="text-sm text-gray-600 mt-1">{error}</div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <>
          {pendingConfirmations.length > 0 ? (
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <h3 className="text-gray-900">Pending Confirmations</h3>
                </div>

                <div className="space-y-3">
                  {pendingConfirmations.map((a) => (
                    <div key={`pending-${a.id}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{a.patientName}</p>
                          <p className="mt-1 text-xs text-gray-600">
                            {formatPrettyDate(a.startTime)} • {formatPrettyTime(a.startTime)} • {a.type}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(a.status)}>{a.status}</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(a.id, "Confirmed", "Appointment confirmed")}
                          >
                            Confirm
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="text-sm text-gray-600">
            Showing {filteredAppointments.length} appointments
          </div>

          <div className="space-y-4">
            {filteredAppointments.map((a) => {
              const initials =
                (a.patientName || "Patient")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "P";

              return (
                <Card key={a.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-lg">
                          {initials}
                        </div>

                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {a.patientName}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <Calendar className="w-3 h-3" />
                            <span>{formatPrettyDate(a.startTime)}</span>
                            <span className="text-gray-400">•</span>
                            <Clock className="w-3 h-3" />
                            <span>{formatPrettyTime(a.startTime)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <p className="text-gray-600">Type</p>
                          <p className="font-medium">{a.type}</p>
                        </div>
                        <Badge variant={getStatusColor(a.status)}>
                          {a.status}
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        {a.status !== "Completed" && a.status !== "Cancelled" && (
  <>
    {/* Confirm only makes sense before it's confirmed */}
    {a.status !== "Confirmed" && (
      <Button
        size="sm"
        variant="outline"
        onClick={() => updateStatus(a.id, "Confirmed", "Appointment confirmed")}
      >
        Confirm
      </Button>
    )}

    {/* Complete usually after confirm (you can loosen this if you want) */}
    {a.status === "Confirmed" && (
      <Button
        size="sm"
        onClick={() => updateStatus(a.id, "Completed", "Marked completed")}
      >
        <CheckCircle className="w-3 h-3 mr-1" />
        Complete
      </Button>
    )}

    {/* Allow cancelling anytime before completed */}
    <Button
      size="sm"
      variant="destructive"
      onClick={() => updateStatus(a.id, "Cancelled", "Cancelled")}
    >
      <XCircle className="w-3 h-3 mr-1" />
      Cancel
    </Button>
  </>
)}


                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedAppointment(a)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {selectedAppointment && (
        <AppointmentDetailsModal
          appointment={selectedAppointment}
          open
          onClose={() => setSelectedAppointment(null)}
          onComplete={() => {
            updateStatus(
              selectedAppointment.id,
              "Completed",
              "Marked completed"
            );
            setSelectedAppointment(null);
          }}
          onRescheduled={async () => {
            await loadAppointments(true);
            toast.success("Appointment rescheduled");
            setSelectedAppointment(null);
          }}
        />
      )}
    </div>
  );
}
