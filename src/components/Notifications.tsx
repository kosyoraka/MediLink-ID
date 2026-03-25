import { ArrowLeft, Activity, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, type PatientAppointment } from "@/lib/api";
import {
  buildAppointmentNotifications,
  getReadNotificationIds,
  markNotificationRead,
  type AppNotification,
} from "@/lib/notifications";

interface NotificationsProps {
  onBack: () => void;
}

export default function Notifications({ onBack }: NotificationsProps) {
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listMyAppointments("all");
        if (cancelled) return;
        setAppointments(data.appointments || []);
        setReadIds(getReadNotificationIds());
      } catch (e) {
        console.error("NOTIFICATIONS APPOINTMENTS FETCH ERROR:", e);
        if (!cancelled) setAppointments([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const notifications = useMemo(() => buildAppointmentNotifications(appointments), [appointments]);

  const sections = useMemo(() => {
    const grouped: Record<string, AppNotification[]> = {
      Yesterday: [],
      "Last Week": [],
      "Last Month": [],
      Older: [],
    };

    notifications.forEach((n) => {
      grouped[n.period].push(n);
    });

    return [
      { label: "Yesterday", items: grouped["Yesterday"] },
      { label: "Last Week", items: grouped["Last Week"] },
      { label: "Last Month", items: grouped["Last Month"] },
      { label: "Older", items: grouped["Older"] },
    ].filter((s) => s.items.length > 0);
  }, [notifications]);

  const onNotificationClick = (notificationId: string) => {
    if (readIds.has(notificationId)) return;
    markNotificationRead(notificationId);
    setReadIds(getReadNotificationIds());
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-gray-900">Notifications</h2>
        <div className="w-6" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Activity className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Recent Activity</p>
          </div>
        </div>

        <div className="space-y-5">
          {sections.length === 0 && (
            <p className="text-sm text-gray-500">No notifications yet.</p>
          )}

          {sections.map((section) => (
            <div key={section.label}>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                {section.label}
              </p>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNotificationClick(item.id)}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-lg ${
                      readIds.has(item.id) ? "bg-gray-50" : item.bgColor
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${item.dotColor}`} />
                    <div className="flex-1">
                      <p className="text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.detail}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
