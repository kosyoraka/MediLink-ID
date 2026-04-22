import { ArrowLeft, Bell, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, type PatientNotification } from "@/lib/api";
import { groupNotifications } from "@/lib/notifications";

interface NotificationsProps {
  onBack: () => void;
  onNavigate?: (screen: string) => void;
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

export default function Notifications({ onBack, onNavigate }: NotificationsProps) {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listMyNotifications();
        if (!cancelled) {
          setNotifications(data.notifications || []);
        }
        await api.markMyNotificationsRead();
        if (!cancelled) {
          setNotifications((current) =>
            current.map((item) =>
              item.id.startsWith("patient-emergency-access:") ? { ...item, unread: false } : item
            )
          );
        }
      } catch (e) {
        console.error("PATIENT NOTIFICATIONS FETCH ERROR:", e);
        if (!cancelled) setNotifications([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(() => groupNotifications(notifications), [notifications]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-gray-900">Notifications</h2>
        <div className="w-6" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <p className="text-gray-900">Recent activity</p>
            <p className="text-sm text-gray-500">Appointments, messages, and care updates</p>
          </div>
        </div>

        <div className="space-y-6">
          {sections.length === 0 ? (
            <p className="text-sm text-gray-500">No notifications yet.</p>
          ) : null}

          {sections.map((section) => (
            <section key={section.label}>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">{section.label}</p>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => item.screen && onNavigate?.(item.screen)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      item.unread
                        ? "border-teal-200 bg-teal-50/80"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                          item.unread ? "bg-teal-500" : "bg-gray-300"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-gray-900">{item.title}</p>
                            <p className="mt-1 text-sm text-gray-600">{item.detail}</p>
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
