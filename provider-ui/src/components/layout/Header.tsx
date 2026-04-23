import { Bell, Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

interface HeaderProps {
  onLogout: () => void;
  onMenuClick: () => void;
  onNotificationsClick: () => void;
  unreadCount: number;
}

type StoredStaff = {
  name: string;
  role: string;
  hospitalName: string;
  hospitalCity: string;
};

function getStoredStaff(): StoredStaff | null {
  try {
    const raw =
      localStorage.getItem("medilink_staff") ||
      sessionStorage.getItem("medilink_staff_session");

    if (!raw) return null;
    return JSON.parse(raw) as StoredStaff;
  } catch {
    return null;
  }
}

export function Header({ onLogout, onMenuClick, onNotificationsClick, unreadCount }: HeaderProps) {
  const staff = getStoredStaff();

  const hospitalName = staff?.hospitalName || "Hospital";
  const hospitalCity = staff?.hospitalCity || "";
  const staffName = staff?.name || "Staff";
  const staffRole = staff?.role || "";

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left: Hospital context */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="font-semibold text-gray-900 leading-tight">
            {hospitalName}
          </h2>
          {hospitalCity && (
            <p className="text-sm text-gray-600">{hospitalCity}</p>
          )}
        </div>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-4">
        <ThemeToggle />

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100" onClick={onNotificationsClick}>
          <Bell className="w-5 h-5 text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Info */}
        <div className="hidden md:flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-500" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{staffName}</p>
            {staffRole && (
              <p className="text-xs text-gray-600">{staffRole}</p>
            )}
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          className="gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
