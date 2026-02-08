import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Calendar,
  MessageSquare,
  FileText,
  UserPlus,
  Upload,
  CalendarCheck,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { recentActivities } from "@/lib/mockData";
import { getRelativeTime } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

interface DashboardProps {
  onNavigate: (page: string, data?: any) => void;
  onAddPatientClick?: () => void;
}

type StoredStaff = {
  name: string;
  email: string;
  role: string;
  phone?: string;
  hospitalId: string;
  hospitalName: string;
  emailVerified?: boolean;
};

function getStoredStaff(): StoredStaff | null {
  try {
    const raw = localStorage.getItem("medilink_staff");
    if (!raw) return null;
    return JSON.parse(raw) as StoredStaff;
  } catch {
    return null;
  }
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

type PatientListRow = {
  patient_id: string;
};

type StaffConversationRow = {
  id: string;
  unread_count: number;
};

type StaffConversationsResponse = {
  conversations: StaffConversationRow[];
};

// ✅ minimal shape we need for counting "today"
type StaffAppointmentRow = {
  id: string;
  startTime: string; // ISO string
  status: string;    // Scheduled | Confirmed | Completed | Cancelled
};

export function Dashboard({ onNavigate, onAddPatientClick }: DashboardProps) {
  const staff = getStoredStaff();

  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);

  // ✅ NEW: real appointments from DB (for Today's Appointments count)
  const [appointments, setAppointments] = useState<StaffAppointmentRow[]>([]);

  // Patients count (existing)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const rows = await apiFetch<PatientListRow[]>("/api/patients");
        if (!alive) return;
        setPatientCount(rows.length);
      } catch {
        if (!alive) return;
        setPatientCount(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ Unread messages (real DB)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await apiFetch<StaffConversationsResponse>(
          "/api/staff/messages/conversations"
        );

        if (!alive) return;

        const total = (data.conversations || []).reduce(
          (sum, c) => sum + (Number(c.unread_count) || 0),
          0
        );

        setUnreadMessages(total);
      } catch {
        if (!alive) return;
        setUnreadMessages(0);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ Appointments (real DB)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // IMPORTANT: use the SAME route your provider appointments page uses
        // If your backend route is different, change it here.
        const data = await apiFetch<any>("/api/staff/appointments");

        if (!alive) return;

        // supports either:
        // - array: [...]
        // - object: { appointments: [...] }
        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.appointments)
          ? data.appointments
          : [];

        setAppointments(
          rows.map((r: any) => ({
            id: String(r.id),
            startTime: String(r.startTime ?? r.start_time),
            status: String(r.status),
          }))
        );
      } catch {
        if (!alive) return;
        setAppointments([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ this is what your dashboard should count
  const todayAppointments = useMemo(() => {
    return appointments.filter(
      (a) =>
        isTodayISO(a.startTime) &&
        a.status !== "Completed" &&
        a.status !== "Cancelled"
    );
  }, [appointments]);

  const recentDocuments = 12; // Mock count

  const firstName =
    staff?.name?.trim()?.split(/\s+/)?.[0] || staff?.name || "there";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "default";
      case "Pending":
        return "warning";
      case "Completed":
        return "success";
      case "Cancelled":
        return "error";
      default:
        return "secondary";
    }
  };

  const getActivityIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      "calendar-check": CalendarCheck,
      "file-text": FileText,
      "user-plus": UserPlus,
      "message-square": MessageSquare,
      calendar: Calendar,
    };
    const Icon = icons[iconName] || Calendar;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Welcome back, {firstName}!
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigate("patients")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Patients</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {patientCount === null ? "—" : patientCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigate("appointments")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today&apos;s Appointments</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {todayAppointments.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigate("messages")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unread Messages</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{unreadMessages}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigate("documents")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recent Documents</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{recentDocuments}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Appointments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Today&apos;s Appointments</CardTitle>
              <Button variant="outline" size="sm" onClick={() => onNavigate("appointments")}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayAppointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No appointments scheduled for today</p>
                  </div>
                ) : (
                  todayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => onNavigate("appointments")}
                    >
                      <img
                        src={appointment.patientPhoto}
                        alt={appointment.patientName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{appointment.patientName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <p className="text-sm text-gray-600">{appointment.time}</p>
                          <span className="text-gray-400">•</span>
                          <p className="text-sm text-gray-600">{appointment.type}</p>
                        </div>
                      </div>
                      <Badge variant={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity + Quick Actions */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600">
                      {getActivityIcon(activity.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {getRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={onAddPatientClick}
              >
                <UserPlus className="w-4 h-4" />
                Add New Patient
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline">
                <Upload className="w-4 h-4" />
                Upload Document
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
