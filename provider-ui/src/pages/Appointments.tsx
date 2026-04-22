import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
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

function isPastAppointment(appointment: Appointment) {
  const ts = new Date(appointment.startTime).getTime();
  if (Number.isNaN(ts)) return false;
  if (appointment.status === "Completed" || appointment.status === "Cancelled") return true;
  return ts < Date.now();
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function endOfWeek(date: Date) {
  return endOfDay(addDays(startOfWeek(date), 6));
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    needsAttention: true,
    upcoming: true,
    past: false,
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "pending-confirmations": true,
    today: true,
    "this-week": true,
    "next-week": false,
    later: false,
    yesterday: true,
    "last-week": false,
    "last-month": false,
  });

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

  const groupedAppointments = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const nextWeekStart = startOfDay(addDays(weekEnd, 1));
    const nextWeekEnd = endOfWeek(nextWeekStart);
    const monthEnd = endOfMonth(now);
    const yesterdayStart = startOfDay(addDays(now, -1));
    const yesterdayEnd = endOfDay(addDays(now, -1));
    const lastWeekEnd = endOfDay(addDays(weekStart, -1));
    const lastWeekStart = startOfWeek(lastWeekEnd);
    const lastMonthDate = addDays(startOfMonth(now), -1);
    const lastMonthStart = startOfMonth(lastMonthDate);
    const lastMonthEnd = endOfMonth(lastMonthDate);

    const needsAttentionIds = new Set(pendingConfirmations.map((appointment) => appointment.id));

    const upcomingBase = filteredAppointments
      .filter((appointment) => !isPastAppointment(appointment) && !needsAttentionIds.has(appointment.id))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const pastBase = filteredAppointments
      .filter((appointment) => isPastAppointment(appointment))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    const upcomingGroups = [
      {
        key: "today",
        label: "Today",
        items: upcomingBase.filter((appointment) => {
          const ts = new Date(appointment.startTime).getTime();
          return ts >= todayStart.getTime() && ts <= todayEnd.getTime();
        }),
      },
      {
        key: "this-week",
        label: "This Week",
        items: upcomingBase.filter((appointment) => {
          const ts = new Date(appointment.startTime).getTime();
          return ts > todayEnd.getTime() && ts >= weekStart.getTime() && ts <= weekEnd.getTime();
        }),
      },
      {
        key: "next-week",
        label: "Next Week",
        items: upcomingBase.filter((appointment) => {
          const ts = new Date(appointment.startTime).getTime();
          return ts >= nextWeekStart.getTime() && ts <= nextWeekEnd.getTime();
        }),
      },
      {
        key: "later",
        label: "Later",
        items: upcomingBase.filter((appointment) => {
          const ts = new Date(appointment.startTime).getTime();
          return ts > nextWeekEnd.getTime();
        }),
      },
    ].filter((group) => group.items.length > 0);

    const olderMap = new Map<string, Appointment[]>();
    pastBase.forEach((appointment) => {
      const date = new Date(appointment.startTime);
      const ts = date.getTime();

      if (ts >= yesterdayStart.getTime() && ts <= yesterdayEnd.getTime()) return;
      if (ts >= lastWeekStart.getTime() && ts <= lastWeekEnd.getTime()) return;
      if (ts >= lastMonthStart.getTime() && ts <= lastMonthEnd.getTime()) return;

      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const bucket = olderMap.get(key) || [];
      bucket.push(appointment);
      olderMap.set(key, bucket);
    });

    const olderGroups = Array.from(olderMap.entries())
      .sort((a, b) => {
        const [aYear, aMonth] = a[0].split("-").map(Number);
        const [bYear, bMonth] = b[0].split("-").map(Number);
        return new Date(bYear, bMonth).getTime() - new Date(aYear, aMonth).getTime();
      })
      .map(([key, items]) => {
        const [year, month] = key.split("-").map(Number);
        return {
          key: `older-${key}`,
          label: getMonthLabel(new Date(year, month, 1)),
          items: items.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
        };
      });

    const pastGroups = [
      {
        key: "yesterday",
        label: "Yesterday",
        items: pastBase.filter((appointment) => {
          const ts = new Date(appointment.startTime).getTime();
          return ts >= yesterdayStart.getTime() && ts <= yesterdayEnd.getTime();
        }),
      },
      {
        key: "last-week",
        label: "Last Week",
        items: pastBase.filter((appointment) => {
          const ts = new Date(appointment.startTime).getTime();
          return ts >= lastWeekStart.getTime() && ts <= lastWeekEnd.getTime();
        }),
      },
      {
        key: "last-month",
        label: "Last Month",
        items: pastBase.filter((appointment) => {
          const ts = new Date(appointment.startTime).getTime();
          return ts >= lastMonthStart.getTime() && ts <= lastMonthEnd.getTime();
        }),
      },
      ...olderGroups,
    ].filter((group) => group.items.length > 0);

    return {
      upcomingGroups,
      pastGroups,
    };
  }, [filteredAppointments, pendingConfirmations]);

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

  const toggleSection = (key: string) => {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((current) => ({ ...current, [key]: !current[key] }));
  };

  const renderAppointmentCard = (a: Appointment, isPastSection = false) => {
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
              {!isPastSection && a.status !== "Completed" && a.status !== "Cancelled" && (
                <>
                  {a.status !== "Confirmed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(a.id, "Confirmed", "Appointment confirmed")}
                    >
                      Confirm
                    </Button>
                  )}

                  {a.status === "Confirmed" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(a.id, "Completed", "Marked completed")}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complete
                    </Button>
                  )}

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
  };

  const renderGroupedSection = (
    title: string,
    groups: Array<{ key: string; label: string; items: Appointment[] }>,
    options?: { sectionKey: string; past?: boolean }
  ) => {
    if (groups.length === 0) return null;

    const totalCount = groups.reduce((sum, group) => sum + group.items.length, 0);
    const isSectionOpen = openSections[options?.sectionKey || ""] ?? false;

    return (
      <div className="rounded-2xl border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => toggleSection(options?.sectionKey || "")}
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm font-medium text-gray-900"
        >
          <span className="flex items-center gap-2">
            {isSectionOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
            {title}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
            {totalCount}
          </span>
        </button>

        {isSectionOpen ? (
          <div className="space-y-4 border-t border-gray-100 px-4 py-4">
            {groups.map((group) => {
              const isGroupOpen = openGroups[group.key] ?? false;
              return (
                <div
                  key={group.key}
                  className="rounded-xl border border-gray-200 bg-gray-50"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-gray-900"
                  >
                    <span className="flex items-center gap-2">
                      {isGroupOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                      {group.label}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs text-gray-600">
                      {group.items.length}
                    </span>
                  </button>

                  {isGroupOpen ? (
                    <div className="space-y-4 border-t border-gray-200 px-3 py-3">
                      {group.items.map((appointment) => renderAppointmentCard(appointment, Boolean(options?.past)))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
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
          <div className="text-sm text-gray-600">
            Showing {filteredAppointments.length} appointments
          </div>

          <div className="space-y-6">
            {renderGroupedSection(
              "Needs Attention",
              pendingConfirmations.length > 0
                ? [{ key: "pending-confirmations", label: "Pending Confirmations", items: pendingConfirmations }]
                : [],
              { sectionKey: "needsAttention" }
            )}

            {renderGroupedSection("Upcoming", groupedAppointments.upcomingGroups, {
              sectionKey: "upcoming",
            })}

            {renderGroupedSection("Past", groupedAppointments.pastGroups, {
              sectionKey: "past",
              past: true,
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
          onRescheduled={(updatedAppointment) => {
            setAppointments((current) =>
              current.map((appointment) =>
                appointment.id === updatedAppointment.id ? updatedAppointment : appointment
              )
            );
            toast.success("Appointment rescheduled");
            setSelectedAppointment(null);
          }}
        />
      )}
    </div>
  );
}
