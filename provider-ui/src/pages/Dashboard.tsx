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
  ClipboardList,
  Activity,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRelativeTime } from "@/lib/utils";
import { apiFetch, type ProviderDocument, type ProviderDocumentRequest } from "@/lib/api";

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

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
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
  startTime: string; 
  status: string;
  patientName?: string | null;
  patientPhoto?: string | null;
  type?: string | null;
};


export function Dashboard({ onNavigate, onAddPatientClick }: DashboardProps) {
  const staff = getStoredStaff();

  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);

  // ✅ NEW: real appointments from DB (for Today's Appointments count)
  const [appointments, setAppointments] = useState<StaffAppointmentRow[]>([]);
  const [documents, setDocuments] = useState<ProviderDocument[]>([]);
  const [requests, setRequests] = useState<ProviderDocumentRequest[]>([]);

  // Patients count (existing)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const rows = await apiFetch<PatientListRow[]>("/api/staff/patients/connected");
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

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const [documentData, requestData] = await Promise.all([
          apiFetch<{ documents: ProviderDocument[] }>("/api/staff/documents"),
          apiFetch<{ requests: ProviderDocumentRequest[] }>("/api/staff/document-requests?status=pending"),
        ]);

        if (!alive) return;
        setDocuments(documentData.documents || []);
        setRequests(requestData.requests || []);
      } catch {
        if (!alive) return;
        setDocuments([]);
        setRequests([]);
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
    patientName: String(r.patientName ?? r.patient_name ?? "Patient"),
    patientPhoto: (r.patientPhoto ?? r.patient_photo ?? null) as string | null,
    type: String(r.type ?? r.appointmentType ?? "Appointment"),
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

  const recentDocuments = useMemo(() => {
    const cutoff = Date.now() - 4 * 60 * 60 * 1000;
    return documents.filter((doc) => {
      const ts = new Date(doc.uploadDate).getTime();
      return !Number.isNaN(ts) && ts >= cutoff;
    }).length;
  }, [documents]);

  const upcomingToday = useMemo(
    () =>
      todayAppointments.filter((appointment) => {
        const ts = new Date(appointment.startTime).getTime();
        return !Number.isNaN(ts) && ts >= Date.now();
      }).length,
    [todayAppointments]
  );

  const pendingAppointments = useMemo(
    () => todayAppointments.filter((appointment) => appointment.status === "Pending").length,
    [todayAppointments]
  );

  const recentDocumentItems = useMemo(() => documents.slice(0, 3), [documents]);

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
                <p className="text-xs text-gray-500 mt-1">Uploaded in the last 4 hours</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Upcoming today</p>
                    <p className="mt-1 text-xl font-semibold text-gray-900">{upcomingToday}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Pending confirmations</p>
                    <p className="mt-1 text-xl font-semibold text-gray-900">{pendingAppointments}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Record requests</p>
                    <p className="mt-1 text-xl font-semibold text-gray-900">{requests.length}</p>
                  </div>
                </div>

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
                      {(() => {
  // pull whatever fields exist (supports multiple backend shapes)
  const patientName =
    (appointment as any).patientName ??
    (appointment as any).patient_name ??
    (appointment as any).patient_full_name ??
    "Patient";

  const patientPhoto =
    (appointment as any).patientPhoto ??
    (appointment as any).patient_photo ??
    (appointment as any).patient_avatar ??
    null;

  const apptType =
    (appointment as any).type ??
    (appointment as any).appointmentType ??
    (appointment as any).reason ??
    "Appointment";

  const timeText = formatTime(appointment.startTime);

  return (
    <>
      {patientPhoto ? (
        <img
          src={patientPhoto}
          alt={patientName}
          className="w-12 h-12 rounded-full object-cover"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold">
          {initials(patientName) || "?"}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{patientName}</p>
        <div className="flex items-center gap-2 mt-1">
          <Clock className="w-3 h-3 text-gray-500" />
          <p className="text-sm text-gray-600">{timeText}</p>
          <span className="text-gray-400">•</span>
          <p className="text-sm text-gray-600 truncate">{apptType}</p>
        </div>
      </div>
    </>
  );
})()}
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
              <CardTitle>Recent Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentDocumentItems.length === 0 ? (
                  <div className="text-sm text-gray-500">No recent document activity yet.</div>
                ) : (
                  recentDocumentItems.map((doc) => (
                    <button
                      key={doc.id}
                      className="flex w-full items-start gap-3 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
                      onClick={() => onNavigate("documents")}
                    >
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 text-orange-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 line-clamp-1">{doc.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {doc.patientName} • {getRelativeTime(doc.uploadDate)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle>Work Queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-blue-600" />
                    <p className="text-sm text-gray-900">Pending record requests</p>
                  </div>
                  <Badge variant="outline">{requests.length}</Badge>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-gray-900">Unread conversations</p>
                  </div>
                  <Badge variant="outline">{unreadMessages}</Badge>
                </div>
              </div>
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
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => onNavigate("documents")}
              >
                <FileText className="w-4 h-4" />
                Review Requests
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
