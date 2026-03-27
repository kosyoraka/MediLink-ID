import { Bell, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { groupNotifications, type StaffNotification } from "@/lib/notifications";

interface NotificationsProps {
  onNavigate: (page: string, data?: any) => void;
}

function formatNotificationTime(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAppointmentTime(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function Notifications({ onNavigate }: NotificationsProps) {
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{ notifications: StaffNotification[] }>("/api/staff/notifications");
        if (!cancelled) setNotifications(data.notifications || []);
      } catch (error) {
        console.error("STAFF NOTIFICATIONS FETCH ERROR:", error);
        if (!cancelled) setNotifications([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(() => groupNotifications(notifications), [notifications]);

  return (
    <div className="p-4 lg:p-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
            <Bell className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">Patient activity, confirmations, and action items</p>
          </div>
        </div>

        <div className="space-y-6">
          {sections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
              No notifications yet.
            </div>
          ) : null}

          {sections.map((section) => (
            <section key={section.label}>
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-gray-400">{section.label}</p>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => item.screen && onNavigate(item.screen)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      item.unread
                        ? "border-blue-200 bg-blue-50/70"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                          item.unread ? "bg-blue-500" : "bg-gray-300"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">{item.title}</p>
                            <p className="mt-1 text-sm text-gray-600">{item.detail}</p>
                            {item.id.startsWith("staff-appointment:") ? (
                              <p className="mt-1 text-xs text-gray-500">{formatAppointmentTime(item.isoDate)}</p>
                            ) : null}
                          </div>
                          {item.screen ? <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" /> : null}
                        </div>
                        <p className="mt-3 text-xs text-gray-400">{formatNotificationTime(item.isoDate)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
