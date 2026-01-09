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
  CalendarPlus,
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

      setEmergencyUrl(data.url);
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
    { icon: CalendarPlus, label: 'Schedule', color: 'bg-blue-100 text-blue-600' },
    { icon: Upload, label: 'Upload', color: 'bg-purple-100 text-purple-600' },
    { icon: Search, label: 'Find Care AI', color: 'bg-orange-100 text-orange-600', action: 'symptom-checker' },
    { icon: FileText, label: 'Medical History', color: 'bg-pink-100 text-pink-600', action: 'medical-history' },

    // ✅ REPLACED: Book Lab -> Apple Wallet (opens modal)
    { icon: Wallet, label: 'Emergency ID', color: 'bg-teal-100 text-teal-600', onClick: openWalletModal },
  ] as const;

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
            <button className="relative">
              <Bell className="w-6 h-6 text-white" />
              <Badge className="absolute -top-1 -right-1 bg-red-500 text-white border-0 h-5 w-5 flex items-center justify-center p-0 text-xs">
                2
              </Badge>
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
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                if ('onClick' in action && action.onClick) return action.onClick();
                if ('action' in action && action.action) return onNavigate(action.action);
              }}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div className={`w-14 h-14 rounded-full ${action.color} flex items-center justify-center`}>
                <action.icon className="w-6 h-6" />
              </div>
              <span className="text-xs text-white">{action.label}</span>
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


      {/* Health Score Card */}
      <div className="px-6 mb-4">
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
      </div>

      {/* To-Do List Widget */}
      <div className="px-6 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">Your Health To-Dos</h3>
            <Badge className="bg-red-100 text-red-700 border-0">3</Badge>
          </div>

          <div className="space-y-3 mb-4">
            {[
              { task: 'Complete Annual Physical', due: 'Due: Dec 1', urgent: false },
              { task: 'Schedule Mammogram', due: 'Overdue by 2 months', urgent: true },
              { task: 'Review new lab results', due: '3 days ago', urgent: false },
            ].map((item, index) => (
              <button
                key={index}
                className="w-full flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 ${item.urgent ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900">{item.task}</p>
                  <p className={`text-sm ${item.urgent ? 'text-red-600' : 'text-gray-500'}`}>{item.due}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>

          <button onClick={() => onNavigate('health-tasks')} className="w-full text-center text-teal-600">
            View All Tasks (7)
          </button>
        </div>
      </div>

      {/* Priority Cards */}
      <div className="px-6 space-y-4">
        {/* Next Appointment */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">Next Appointment</p>
              <h3 className="text-gray-900 mb-1">Dr. Sarah Johnson</h3>
              <p className="text-gray-600">Tomorrow, Nov 19 • 2:30 PM</p>
              <p className="text-sm text-gray-500">Sunnybrook Health Sciences Centre</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              <MapPin className="w-4 h-4 mr-1" />
              Directions
            </Button>
            <Button size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white">
              View Details
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Recent Activity</p>
                <h3 className="text-gray-900">Updates & Results</h3>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-gray-900">New lab results from LifeLabs</p>
                <p className="text-sm text-gray-500">2 hours ago</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-gray-900">Prescription ready for pickup</p>
                <p className="text-sm text-gray-500">Yesterday • Shoppers Drug Mart</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-gray-900">Appointment confirmed</p>
                <p className="text-sm text-gray-500">Nov 15 • Dr. Sarah Johnson</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>

          <button className="w-full text-center text-teal-600 mt-4">
            View All Activity
          </button>
        </div>

        {/* Quick Links Grid */}
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
            onClick={() => onNavigate('documents')}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-500 hover:bg-teal-50 transition-all"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mb-3">
              <Upload className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-gray-900 text-sm">Documents</p>
          </button>
        </div>
      </div>
    </div>
  );
}
