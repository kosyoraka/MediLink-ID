import {
  AlertCircle,
  Calendar,
  Activity,
  Pill,
  MapPin,
  ChevronRight,
  Sun,
  Settings,
  Bell,
  Upload,
  Search,
  TestTube,
  Stethoscope,
  CheckCircle2,
  TrendingUp,
  FileText,
  Wallet, // ✅ NEW icon for Apple Wallet tile
  X,      // ✅ close icon for modal
  ExternalLink,
  Copy,
} from 'lucide-react';

import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useEffect, useMemo, useState } from 'react';
import { API_BASE } from "@/config/api";
import { api, type PatientAppointment } from "@/lib/api";
import { fetchHealthTasks, getTaskTimeLabel, type HealthTask } from "@/lib/healthTasks";
import {
  buildAppointmentNotifications,
  getUnreadCount,
  NOTIFICATIONS_UPDATED_EVENT,
} from "@/lib/notifications";
import { createPortal } from "react-dom";
import { QRCodeCanvas } from "qrcode.react";


interface DashboardProps {
  onNavigate: (screen: string) => void;
  userName?: string;
  userEmail?: string;
  userHealthCard?: string;
}

type ProfileResponse = {
  patient_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  health_card: string | null;
  phone_number: string | null;
};

type EmergencyLinkResponse = {
  token: string;
  url: string;
};

export default function Dashboard({
  onNavigate,
  userName = '',
  userEmail = '',
  userHealthCard = ''
}: DashboardProps) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  // ✅ Emergency link modal state
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [emergencyUrl, setEmergencyUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [healthTasks, setHealthTasks] = useState<HealthTask[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    const patientId = localStorage.getItem('patientId');
    if (!patientId) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/patients/${patientId}/profile`);
        if (!res.ok) return;
        const data = (await res.json()) as ProfileResponse;
        setProfile(data);
      } catch (e) {
        console.error('DASHBOARD PROFILE FETCH ERROR:', e);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listMyAppointments("all");
        if (cancelled) return;
        setAppointments(data.appointments || []);
      } catch (e) {
        console.error("DASHBOARD APPOINTMENTS FETCH ERROR:", e);
        if (!cancelled) setAppointments([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tasks = await fetchHealthTasks();
        if (cancelled) return;
        setHealthTasks(tasks);
      } catch (e) {
        console.error("DASHBOARD HEALTH TASKS FETCH ERROR:", e);
        if (!cancelled) setHealthTasks([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncUnread = () => {
      setUnreadNotificationCount(getUnreadCount(buildAppointmentNotifications(appointments)));
    };
    syncUnread();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, syncUnread);
    return () => window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, syncUnread);
  }, [appointments]);

  const displayName = useMemo(() => {
    const dbName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
    return dbName || userName || profile?.email || 'Guest User';
  }, [profile, userName]);

  const displayEmail = useMemo(() => {
    return profile?.email || userEmail || 'user@email.com';
  }, [profile, userEmail]);

  const displayHealthCard = useMemo(() => {
    return profile?.health_card || userHealthCard || '0000-000-000';
  }, [profile, userHealthCard]);

  const nextAppointment = useMemo(() => {
    const now = Date.now();
    return [...appointments]
      .filter((a) => {
        const ts = new Date(a.startTime).getTime();
        const status = String(a.status || "").toLowerCase();
        return ts >= now && status !== "cancelled" && status !== "completed";
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] || null;
  }, [appointments]);

  const nextAppointmentStatusLabel = useMemo(() => {
    if (!nextAppointment) return "";
    const status = String(nextAppointment.status || "").toLowerCase().trim();
    return status === "confirmed" ? "Confirmed" : "Waiting for confirmation";
  }, [nextAppointment]);

  const dashboardHealthTasks = useMemo(() => healthTasks.slice(0, 3), [healthTasks]);

  const urgentHealthTaskCount = useMemo(
    () => healthTasks.filter((task) => task.priority === 'urgent').length,
    [healthTasks]
  );

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return 'GU';
  };

  const maskHealthCard = (healthCard: string) => {
    const digits = healthCard.replace(/\D/g, '');
    if (digits.length >= 3) return `****${digits.slice(-3)}`;
    return '****';
  };

  const formatAppointmentDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };

  const formatAppointmentTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  const openDirections = () => {
    if (!nextAppointment) return;
    const query = encodeURIComponent(nextAppointment.hospitalName || nextAppointment.providerName || "Hospital");
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
  };

  // ✅ Fetch emergency link + open modal
  const openWalletModal = async () => {
    const patientId = localStorage.getItem('patientId');
    if (!patientId) {
      setWalletError('You must be signed in to create a Wallet emergency link.');
      setIsWalletModalOpen(true);
      return;
    }

    setWalletError('');
    setCopied(false);
    setWalletLoading(true);
    setIsWalletModalOpen(true);

    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}/emergency-link`);
      const data = (await res.json()) as EmergencyLinkResponse;

      if (!res.ok) {
        throw new Error((data as any)?.message || 'Failed to create emergency link');
      }

      const origin = window.location.origin; // e.g. http://localhost:5173
      setEmergencyUrl(`${origin}/e/${data.token}`);

    } catch (e: any) {
      setWalletError(e?.message || 'Failed to create emergency link');
      setEmergencyUrl('');
    } finally {
      setWalletLoading(false);
    }
  };

  const copyLink = async () => {
    if (!emergencyUrl) return;

    try {
      await navigator.clipboard.writeText(emergencyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older Safari
      const el = document.createElement('textarea');
      el.value = emergencyUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const openLink = () => {
    if (!emergencyUrl) return;
    window.open(emergencyUrl, '_blank', 'noopener,noreferrer');
  };
  const formatDOB = (dob?: string | null) => {
  if (!dob) return "—";
  const d = new Date(dob);
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
};


  const quickActions = [
    { icon: Calendar, label: 'Appointments', color: 'bg-blue-100 text-blue-600', action: 'appointments' },
    { icon: Pill, label: 'Medications', color: 'bg-purple-100 text-purple-600', action: 'medications' },
    { icon: Search, label: 'Find Care AI', color: 'bg-orange-100 text-orange-600', action: 'symptom-checker' },
    { icon: FileText, label: 'Medical History', color: 'bg-pink-100 text-pink-600', action: 'medical-history' },

    // ✅ REPLACED: Book Lab -> Apple Wallet (opens modal)
    { icon: Wallet, label: 'Emergency ID', color: 'bg-teal-100 text-teal-600', onClick: openWalletModal },
  ] as const;

  const quickLinksGrid = (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => onNavigate('health-summary')}
        className="bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
      >
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-3">
          <Stethoscope className="w-5 h-5 text-blue-600" />
        </div>
        <p className="text-gray-900 text-sm">Health Summary</p>
      </button>

      <button
        onClick={() => onNavigate('care-journeys')}
        className="bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
      >
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-3">
          <Activity className="w-5 h-5 text-purple-600" />
        </div>
        <p className="text-gray-900 text-sm">Care Journeys</p>
      </button>

      <button
        onClick={() => onNavigate('recommendations')}
        className="bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
      >
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
        <p className="text-gray-900 text-sm">Recommendations</p>
      </button>

      <button
        onClick={() => onNavigate('nutrition-fitness')}
        className="bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
      >
        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mb-3">
          <Upload className="w-5 h-5 text-orange-600" />
        </div>
        <p className="text-gray-900 text-sm">Nutrition & Fitness</p>
      </button>
    </div>
  );

  const healthScoreCard = (
    <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl border border-green-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-gray-900 mb-1">Health Score</h3>
          <p className="text-sm text-gray-600">Great job staying on track!</p>
        </div>
        <div className="relative w-24 h-24">
          <svg className="transform -rotate-90 w-24 h-24">
            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-200" />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - 0.87)}`}
              className="text-green-600"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl text-gray-900">87</span>
            <span className="text-xs text-gray-500">/100</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600">Checkups</span>
          </div>
          <p className="text-gray-900">4/5</p>
        </div>
        <div className="bg-white rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-gray-600">Overdue</span>
          </div>
          <p className="text-gray-900">1</p>
        </div>
        <div className="bg-white rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Pill className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-600">Adherence</span>
          </div>
          <p className="text-gray-900">95%</p>
        </div>
        <div className="bg-white rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-gray-600">Upcoming</span>
          </div>
          <p className="text-gray-900">2</p>
        </div>
      </div>

      <Button variant="outline" className="w-full bg-white border-green-600 text-green-700 hover:bg-green-50">
        <TrendingUp className="w-4 h-4 mr-2" />
        Improve Your Score
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-400 via-teal-500 to-blue-500 text-white p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-teal-600">{getInitials(displayName)}</span>
            </div>
            <div>
              <div className="flex items-center">
                <h2>{displayName}</h2>
              </div>
              <button className="text-sm text-teal-100">Health Card: {maskHealthCard(displayHealthCard)}</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative" onClick={() => onNavigate('notifications')}>
              <Bell className="w-6 h-6 text-white" />
              {unreadNotificationCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-red-500 text-white border-0 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {unreadNotificationCount}
                </Badge>
              )}
            </button>
            <button onClick={() => onNavigate('more')}>
              <Settings className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-teal-100 text-sm mb-4">
          <Sun className="w-4 h-4" />
          <span>{today} • Toronto, ON</span>
        </div>

        {/* Quick Action Bar */}
        <div className="flex items-start justify-between gap-1">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                if ('onClick' in action && action.onClick) return action.onClick();
                if ('action' in action && action.action) return onNavigate(action.action);
              }}
              className="flex-1 min-w-0 flex flex-col items-center gap-1.5"
            >
              <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span
                className="text-white text-center leading-none"
                style={{ fontSize: "12px" }}
              >
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

{/* ✅ Apple Wallet / Emergency QR Modal (Portal: prevents “87” bleed-through) */}
{isWalletModalOpen &&
  createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h3 className="text-gray-900">Emergency Identification</h3>
            <p className="text-xs text-gray-500">
              This is your Emergency ID. It will be converted to a real Apple Wallet pass.
            </p>
          </div>

          <button
            onClick={() => setIsWalletModalOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Close"
            type="button"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Loading */}
          {walletLoading && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
              Creating your emergency access link…
            </div>
          )}

          {/* Error */}
          {!walletLoading && walletError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {walletError}
            </div>
          )}

          {/* Success */}
          {!walletLoading && !walletError && emergencyUrl && (
            <>
              {/* Emergency URL card */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 text-teal-700" />
                  <p className="text-sm text-teal-900">Emergency Access</p>
                </div>
                <p className="text-xs text-teal-800 break-all">{emergencyUrl}</p>
              </div>

              {/* QR Code */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-3">
                <QRCodeCanvas
                  value={emergencyUrl}
                  size={190}
                  level="H"
                  includeMargin
                />
                <p className="text-xs text-gray-500 text-center">
                  Scan to open the emergency responder view
                </p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={copyLink} variant="outline" className="w-full">
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? "Copied" : "Copy"}
                </Button>

                <Button
                  onClick={openLink}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </Button>
              </div>

              {/* Footer note */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-600">
                 <span className="font-semibold text-gray-800">
    Add to Apple Wallet
  </span>{" "}
  — coming soon
              </div>
            </>
          )}

          {/* If nothing yet (rare) */}
          {!walletLoading && !walletError && !emergencyUrl && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
              No link available yet. Try again.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )}


      {/* Quick Links Card (moved to top) */}
      <div className="px-6 mt-3 mb-4">
        {quickLinksGrid}
      </div>

      {/* To-Do List Widget */}
      <div className="px-6 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">Your Health To-Dos</h3>
            <Badge className="bg-red-100 text-red-700 border-0">{urgentHealthTaskCount}</Badge>
          </div>

          <div className="space-y-3 mb-4">
            {dashboardHealthTasks.map((task) => (
              <button
                key={task.id}
                className="w-full flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                onClick={() => onNavigate(task.actionScreen || 'health-tasks')}
                type="button"
              >
                <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 ${task.priority === 'urgent' ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900">{task.title}</p>
                  <p className={`text-sm ${task.priority === 'urgent' ? 'text-red-600' : 'text-gray-500'}`}>{getTaskTimeLabel(task)}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>

          {dashboardHealthTasks.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">You have no pending health tasks.</div>
          ) : null}

          <button onClick={() => onNavigate('health-tasks')} className="w-full text-center text-teal-600" type="button">
            View All Tasks ({healthTasks.length})
          </button>
        </div>
      </div>

      {/* Priority Cards */}
      <div className="px-6 space-y-4">
        {/* Next Appointment */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          {nextAppointment ? (
            <>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Next Appointment</p>
                  <h3 className="text-gray-900 mb-1">{nextAppointment.providerName}</h3>
                  <p className="text-gray-600">
                    {formatAppointmentDate(nextAppointment.startTime)} • {formatAppointmentTime(nextAppointment.startTime)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {nextAppointment.hospitalName || "Hospital"}
                  </p>
                  <div className="mt-2">
                    <Badge
                      className={
                        nextAppointmentStatusLabel === "Confirmed"
                          ? "bg-green-100 text-green-700 border-0"
                          : "bg-yellow-100 text-yellow-700 border-0"
                      }
                    >
                      {nextAppointmentStatusLabel}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={openDirections}>
                  <MapPin className="w-4 h-4 mr-1" />
                  Directions
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => onNavigate("appointments")}
                >
                  View Details
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-1">Next Appointment</p>
              <h3 className="text-gray-900 mb-1">No upcoming appointments</h3>
              <p className="text-gray-600 mb-4">Book your next visit to stay on track.</p>
              <Button
                size="sm"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => onNavigate("appointments")}
              >
                Schedule Appointment
              </Button>
            </>
          )}
        </div>

        {/* Health Score Card (moved lower) */}
        {healthScoreCard}
      </div>
    </div>
  );
}
