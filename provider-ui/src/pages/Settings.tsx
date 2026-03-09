import { useEffect, useMemo, useState } from "react";
import { Camera, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";

type StaffSession = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  hospitalId: string;
  hospitalName?: string;
  hospitalCity?: string;
};

function readStaffSession(): StaffSession | null {
  try {
    const raw =
      localStorage.getItem("medilink_staff") ||
      sessionStorage.getItem("medilink_staff_session");
    if (!raw) return null;
    return JSON.parse(raw) as StaffSession;
  } catch {
    return null;
  }
}

export function Settings() {
  const [isLoading, setIsLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [staff, setStaff] = useState<StaffSession | null>(null);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  });

  const [hospitalData, setHospitalData] = useState({
    name: "",
    city: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Notifications: keep as UI-only for now (until you add a DB table)
  const [notifications, setNotifications] = useState({
    emailAppointments: true,
    emailMessages: true,
    pushAppointments: true,
    pushMessages: false,
  });

  // Derived: disable editing email + hospital (recommended for now)
  const canEditEmail = false;
  const canEditHospital = false;

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        // 1) Start with storage (instant UI)
        const session = readStaffSession();
        if (!session) {
          toast.error("No active session found. Please log in again.");
          setIsLoading(false);
          return;
        }
        setStaff(session);

        // Prefill from session
        setProfileData({
          name: session.name || "",
          email: session.email || "",
          phone: session.phone || "",
          role: session.role || "",
        });

        setHospitalData({
          name: session.hospitalName || "",
          city: session.hospitalCity || "",
        });

        // 2) Refresh from DB (source of truth)
        // If you haven’t built this endpoint yet, this will fail gracefully.
        try {
          const fresh = await apiFetch<{
            staff: {
              id: string;
              name: string;
              email: string;
              role: string;
              phone?: string | null;
              hospitalId: string;
              hospitalName: string;
              hospitalCity: string;
            };
          }>("/api/staff/me");

          setStaff(fresh.staff);

          setProfileData({
            name: fresh.staff.name || "",
            email: fresh.staff.email || "",
            phone: fresh.staff.phone || "",
            role: fresh.staff.role || "",
          });

          setHospitalData({
            name: fresh.staff.hospitalName || "",
            city: fresh.staff.hospitalCity || "",
          });

          // Keep storage in sync so Header/Sidebar never shows generic values
          localStorage.setItem("medilink_staff", JSON.stringify(fresh.staff));
          sessionStorage.removeItem("medilink_staff_session");
        } catch {
          // OK: session-based display still works if /api/staff/me isn't wired yet
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const pageTitle = useMemo(() => {
    if (!hospitalData.name) return "Settings";
    return `Settings • ${hospitalData.name}`;
  }, [hospitalData.name]);

  const handleSaveProfile = async () => {
    if (!staff?.id) {
      toast.error("No active staff session. Please log in again.");
      return;
    }

    if (!profileData.name.trim() || !profileData.role.trim()) {
      toast.error("Name and role are required.");
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await apiFetch<{
        staff: {
          id: string;
          name: string;
          email: string;
          role: string;
          phone?: string | null;
          hospitalId: string;
          hospitalName: string;
          hospitalCity: string;
        };
      }>("/api/staff/me", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: profileData.name.trim(),
          role: profileData.role.trim(),
          phone: profileData.phone.trim() || null,
          // email intentionally not editable for now
        }),
      });

      setStaff(updated.staff);
      setProfileData({
        name: updated.staff.name,
        email: updated.staff.email,
        phone: updated.staff.phone || "",
        role: updated.staff.role,
      });

      setHospitalData({
        name: updated.staff.hospitalName,
        city: updated.staff.hospitalCity,
      });

      // keep storage updated for Header + Dashboard welcome
      localStorage.setItem("medilink_staff", JSON.stringify(updated.staff));
      sessionStorage.removeItem("medilink_staff_session");

      toast.success("Profile updated successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    setSavingPassword(true);
    try {
      await apiFetch("/api/staff/me/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      toast.success("Password changed successfully");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e: any) {
      toast.error(e?.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveNotifications = () => {
    // DB table not added yet — keep it local for now
    toast.success("Notification preferences saved");
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-gray-600">Loading settings…</div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{pageTitle}</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      {/* Staff Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative">
              {/* You don’t store photo in DB yet. Keep placeholder */}
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                <Camera className="w-6 h-6" />
              </div>

              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700"
                onClick={() => toast.info("Photo upload coming soon")}
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <Input
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role / Title</label>
                  <Input
                    value={profileData.role}
                    onChange={(e) => setProfileData({ ...profileData, role: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <Input
                    type="email"
                    value={profileData.email}
                    disabled={!canEditEmail}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  />
                  {!canEditEmail && (
                    <p className="text-xs text-gray-500 mt-1">Email changes are disabled for now.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <Input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} className="gap-2" disabled={savingProfile}>
                  <Save className="w-4 h-4" />
                  {savingProfile ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hospital Information (read-only for staff) */}
      <Card>
        <CardHeader>
          <CardTitle>Hospital</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Hospital Name</label>
              <Input value={hospitalData.name} disabled={!canEditHospital} onChange={() => {}} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
              <Input value={hospitalData.city} disabled={!canEditHospital} onChange={() => {}} />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Hospital info is managed by the organization. If you need a change, contact an admin.
          </p>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
            <Input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              placeholder="Enter current password"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleChangePassword} variant="outline" disabled={savingPassword}>
              {savingPassword ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences (local-only for now) */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Email - Appointment Reminders</p>
                <p className="text-sm text-gray-600">Receive email notifications for upcoming appointments</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.emailAppointments}
                onChange={(e) => setNotifications({ ...notifications, emailAppointments: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Email - New Messages</p>
                <p className="text-sm text-gray-600">Get notified when you receive new patient messages</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.emailMessages}
                onChange={(e) => setNotifications({ ...notifications, emailMessages: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Push - Appointment Updates</p>
                <p className="text-sm text-gray-600">Receive push notifications for appointment changes</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.pushAppointments}
                onChange={(e) => setNotifications({ ...notifications, pushAppointments: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Push - New Messages</p>
                <p className="text-sm text-gray-600">Get push notifications for new patient messages</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.pushMessages}
                onChange={(e) => setNotifications({ ...notifications, pushMessages: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300 rounded"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveNotifications} className="gap-2">
              <Save className="w-4 h-4" />
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
