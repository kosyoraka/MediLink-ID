export type StaffNotification = {
  id: string;
  title: string;
  detail: string;
  isoDate: string;
  unread: boolean;
  screen?: string;
  eventDate?: string;
};

export type NotificationSection = {
  label: "Today" | "Yesterday" | "This Week" | "Last Month" | "Older";
  items: StaffNotification[];
};

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getNotificationPeriod(isoDate: string): NotificationSection["label"] {
  const now = new Date();
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return "Older";

  const todayStart = startOfDay(now).getTime();
  const targetStart = startOfDay(target).getTime();
  const dayDiff = Math.floor((todayStart - targetStart) / (24 * 60 * 60 * 1000));

  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff <= 7) return "This Week";
  if (dayDiff <= 31) return "Last Month";
  return "Older";
}

export function groupNotifications(notifications: StaffNotification[]): NotificationSection[] {
  const grouped: Record<NotificationSection["label"], StaffNotification[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    "Last Month": [],
    Older: [],
  };

  notifications.forEach((notification) => {
    grouped[getNotificationPeriod(notification.isoDate)].push(notification);
  });

  return [
    { label: "Today", items: grouped.Today },
    { label: "Yesterday", items: grouped.Yesterday },
    { label: "This Week", items: grouped["This Week"] },
    { label: "Last Month", items: grouped["Last Month"] },
    { label: "Older", items: grouped.Older },
  ].filter((section) => section.items.length > 0);
}

export function getUnreadCount(notifications: StaffNotification[]): number {
  return notifications.filter((notification) => notification.unread).length;
}
