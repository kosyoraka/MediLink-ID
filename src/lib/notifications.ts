import type { PatientAppointment } from "./api";

export type AppNotification = {
  id: string;
  title: string;
  detail: string;
  isoDate: string;
  period: "Yesterday" | "Last Week" | "Last Month" | "Older";
  dotColor: string;
  bgColor: string;
};

const READ_NOTIFICATIONS_KEY = "medilink_read_notification_ids";
export const NOTIFICATIONS_UPDATED_EVENT = "medilink-notifications-updated";

function getPeriod(d: Date): AppNotification["period"] {
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor(diffMs / dayMs);

  if (days <= 1) return "Yesterday";
  if (days <= 7) return "Last Week";
  if (days <= 31) return "Last Month";
  return "Older";
}

export function buildAppointmentNotifications(
  appointments: PatientAppointment[]
): AppNotification[] {
  return [...appointments]
    .filter((a) => {
      const status = String(a.status || "").toLowerCase().trim();
      const isActive =
        status === "confirmed" ||
        status === "scheduled" ||
        status === "pending" ||
        status === "completed";
      return isActive;
    })
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .map((a) => {
      const when = new Date(a.startTime);
      const whenText = when.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const status = String(a.status || "").toLowerCase().trim();
      const isConfirmed = status === "confirmed";
      const isCompleted = status === "completed";

      return {
        id: `appointment:${a.id}`,
        title: isCompleted
          ? "Appointment completed"
          : isConfirmed
          ? "Appointment confirmed"
          : "Waiting for confirmation",
        detail: `${whenText} • ${a.providerName}`,
        isoDate: a.startTime,
        period: getPeriod(when),
        dotColor: isCompleted ? "bg-gray-600" : isConfirmed ? "bg-purple-600" : "bg-yellow-600",
        bgColor: isCompleted ? "bg-gray-50" : isConfirmed ? "bg-purple-50" : "bg-yellow-50",
      };
    });
}

export function getReadNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_NOTIFICATIONS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map(String));
  } catch {
    return new Set();
  }
}

function persistReadIds(next: Set<string>) {
  localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify([...next]));
}

export function markNotificationRead(id: string) {
  const ids = getReadNotificationIds();
  ids.add(id);
  persistReadIds(ids);
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}

export function getUnreadCount(notifications: AppNotification[]): number {
  const readIds = getReadNotificationIds();
  return notifications.filter((n) => !readIds.has(n.id)).length;
}
