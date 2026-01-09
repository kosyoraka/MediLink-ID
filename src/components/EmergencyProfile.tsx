import { useEffect, useMemo, useState } from 'react';
import { API_BASE } from "@/config/api";
import {
  ArrowLeft,
  AlertCircle,
  User,
  Droplet,
  AlertTriangle,
  Pill,
  Phone,
  FileText,
  Shield,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Input } from './ui/input';

type SettingsState = {
  personalInfo: boolean;
  bloodType: boolean;
  allergies: boolean;
  conditions: boolean;
  medications: boolean;
  emergencyContacts: boolean;
  advanceDirectives: boolean;
};

type EmergencyProfileApi = {
  patient_id: string;
  email: string | null;

  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  health_card: string | null;

  share_personal_info: boolean;
  share_blood_type: boolean;
  share_allergies: boolean;
  share_medical_conditions: boolean;
  share_current_medications: boolean;
  share_emergency_contacts: boolean;
  share_advance_directives: boolean;

  blood_type: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  current_medications: string | null;

  emergency_contact_full_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;

  dnr_status: string | null;
  living_will: string | null;

  updated_at: string | null;
};

interface EmergencyProfileProps {
  onBack: () => void;
}

//const API_BASE = 'http://localhost:4000';
// ✅ use API_BASE from config everywhere
const res = await fetch(`${API_BASE}/api/...`);

export default function EmergencyProfile({ onBack }: EmergencyProfileProps) {
  const patientId = useMemo(() => localStorage.getItem('patientId') || '', []);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Personal info (from DB)
  const [fullName, setFullName] = useState<string>('Not provided');
  const [dob, setDob] = useState<string | null>(null);
  const [healthCard, setHealthCard] = useState<string>('Not provided');

  // Toggles (from DB)
  const [settings, setSettings] = useState<SettingsState>({
    personalInfo: true,
    bloodType: true,
    allergies: true,
    conditions: true,
    medications: true,
    emergencyContacts: true,
    advanceDirectives: false,
  });

  // Emergency data (from DB)
  const [bloodType, setBloodType] = useState<string>('');
  const [allergies, setAllergies] = useState<string>('');
  const [conditions, setConditions] = useState<string>('');
  const [medications, setMedications] = useState<string>('');

  const [emergencyContactFullName, setEmergencyContactFullName] = useState<string>('');
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState<string>('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>('');

  const [dnrStatus, setDnrStatus] = useState<string>('');
  const [livingWill, setLivingWill] = useState<string>('');

  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Format DOB to show full date + age
  const formatDOBWithAge = (dobStr: string | null) => {
    if (!dobStr) return 'Not provided';

    const birthDate = new Date(dobStr);
    if (Number.isNaN(birthDate.getTime())) return 'Not provided';

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = birthDate.toLocaleDateString('en-US', options);

    return `${formattedDate} (${age} years old)`;
  };

  const formatUpdatedAt = (iso: string | null) => {
    if (!iso) return 'Not provided';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Not provided';
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const parseLines = (text: string) =>
    text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

  // GET: load from DB
  useEffect(() => {
    const run = async () => {
      setError(null);
      setSaveMsg(null);

      if (!patientId) {
        setLoading(false);
        setError('No patientId found. Please sign in again.');
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/patients/${patientId}/emergency-profile`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = (await res.json()) as EmergencyProfileApi;

        if (!res.ok) {
          setError((data as any)?.message || `Failed to load emergency profile (${res.status})`);
          setLoading(false);
          return;
        }

        // Personal info
        const fn = data.first_name?.trim() || '';
        const ln = data.last_name?.trim() || '';
        const name = `${fn} ${ln}`.trim();
        setFullName(name || 'Not provided');
        setDob(data.dob ?? null);
        setHealthCard(data.health_card?.trim() || 'Not provided');

        // Toggles
        setSettings({
          personalInfo: !!data.share_personal_info,
          bloodType: !!data.share_blood_type,
          allergies: !!data.share_allergies,
          conditions: !!data.share_medical_conditions,
          medications: !!data.share_current_medications,
          emergencyContacts: !!data.share_emergency_contacts,
          advanceDirectives: !!data.share_advance_directives,
        });

        // Emergency data
        setBloodType(data.blood_type ?? '');
        setAllergies(data.allergies ?? '');
        setConditions(data.medical_conditions ?? '');
        setMedications(data.current_medications ?? '');

        setEmergencyContactFullName(data.emergency_contact_full_name ?? '');
        setEmergencyContactRelationship(data.emergency_contact_relationship ?? '');
        setEmergencyContactPhone(data.emergency_contact_phone ?? '');

        setDnrStatus(data.dnr_status ?? '');
        setLivingWill(data.living_will ?? '');

        setUpdatedAt(data.updated_at ?? null);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [patientId]);

  const toggleSetting = (key: keyof SettingsState) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // PUT: save to DB
  const handleSave = async () => {
    setError(null);
    setSaveMsg(null);

    if (!patientId) {
      setError('No patientId found. Please sign in again.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        sharePersonalInfo: settings.personalInfo,
        shareBloodType: settings.bloodType,
        shareAllergies: settings.allergies,
        shareMedicalConditions: settings.conditions,
        shareCurrentMedications: settings.medications,
        shareEmergencyContacts: settings.emergencyContacts,
        shareAdvanceDirectives: settings.advanceDirectives,

        bloodType: bloodType || null,
        allergies: allergies || null,
        medicalConditions: conditions || null,
        currentMedications: medications || null,

        emergencyContactFullName: emergencyContactFullName || null,
        emergencyContactRelationship: emergencyContactRelationship || null,
        emergencyContactPhone: emergencyContactPhone || null,

        dnrStatus: dnrStatus || null,
        livingWill: livingWill || null,
      };

      const res = await fetch(`${API_BASE}/api/patients/${patientId}/emergency-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || `Failed to save (${res.status})`);
        return;
      }

      // Backend returns updated row; grab updated_at if present
      if (data?.updated_at) setUpdatedAt(data.updated_at);
      setSaveMsg('Saved');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
      // hide "Saved" after a bit
      setTimeout(() => setSaveMsg(null), 1500);
    }
  };

  // Emergency Mode view (now uses DB values, no hardcoded lists)
  if (isEmergencyMode) {
    const allergyLines = parseLines(allergies);
    const conditionLines = parseLines(conditions);
    const medicationLines = parseLines(medications);

    const hasContact =
      !!emergencyContactFullName.trim() ||
      !!emergencyContactRelationship.trim() ||
      !!emergencyContactPhone.trim();

    return (
      <div className="min-h-screen bg-red-600 text-white p-6">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setIsEmergencyMode(false)} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8" />
            <h1 className="text-white">EMERGENCY MODE</h1>
          </div>
          <div className="w-6" />
        </div>

        <div className="space-y-4">
          {settings.personalInfo && (
            <div className="bg-white text-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-teal-600" />
                </div>
                <h2>Personal Information</h2>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="text-gray-900">{fullName}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="text-gray-900">{formatDOBWithAge(dob)}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Health Card Number</p>
                  <p className="text-gray-900">{healthCard}</p>
                </div>
              </div>
            </div>
          )}

          {settings.allergies && (
            <div className="bg-white text-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-red-600">ALLERGIES</h2>
              </div>

              {allergyLines.length ? (
                <div className="space-y-2">
                  {allergyLines.map((a, idx) => (
                    <div key={idx} className="bg-red-50 rounded-lg p-3">
                      <p className="text-red-900">{a}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3">Not provided</div>
              )}
            </div>
          )}

          {settings.bloodType && (
            <div className="bg-white text-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Droplet className="w-6 h-6 text-blue-600" />
                </div>
                <h2>Blood Type</h2>
              </div>
              <p className="text-2xl">{bloodType?.trim() ? bloodType : 'Not provided'}</p>
            </div>
          )}

          {settings.conditions && (
            <div className="bg-white text-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <h2>Medical Conditions</h2>
              </div>

              {conditionLines.length ? (
                <ul className="space-y-2">
                  {conditionLines.map((c, idx) => (
                    <li key={idx} className="bg-gray-50 rounded-lg p-3">
                      {c}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3">Not provided</div>
              )}
            </div>
          )}

          {settings.medications && (
            <div className="bg-white text-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Pill className="w-6 h-6 text-green-600" />
                </div>
                <h2>Current Medications</h2>
              </div>

              {medicationLines.length ? (
                <ul className="space-y-2">
                  {medicationLines.map((m, idx) => (
                    <li key={idx} className="bg-gray-50 rounded-lg p-3">
                      {m}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3">Not provided</div>
              )}
            </div>
          )}

          {settings.emergencyContacts && (
            <div className="bg-white text-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Phone className="w-6 h-6 text-orange-600" />
                </div>
                <h2>Emergency Contacts</h2>
              </div>

              {hasContact ? (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-gray-900">
                    {emergencyContactFullName?.trim() || 'Not provided'}
                    {emergencyContactRelationship?.trim() ? ` (${emergencyContactRelationship.trim()})` : ''}
                  </p>
                  <p className="text-sm text-gray-600">{emergencyContactPhone?.trim() || 'Not provided'}</p>

                  {emergencyContactPhone?.trim() ? (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white w-full">
                      <Phone className="w-4 h-4 mr-2" />
                      Call {emergencyContactPhone.trim()}
                    </Button>
                  ) : (
                    <Button size="sm" disabled className="w-full">
                      Call
                    </Button>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3">Not provided</div>
              )}
            </div>
          )}

          {settings.advanceDirectives && (
            <div className="bg-white text-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h2>Advance Directives</h2>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">DNR Status</p>
                  <p className="text-gray-900">{dnrStatus?.trim() ? dnrStatus : 'Not provided'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Living Will</p>
                  <p className="text-gray-900">{livingWill?.trim() ? livingWill : 'Not provided'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-red-700 rounded-xl p-4">
          <p className="text-sm text-white">Last updated: {formatUpdatedAt(updatedAt)}</p>
        </div>
      </div>
    );
  }

  // Normal view
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-gray-900">Emergency Profile</h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-gray-700">Loading…</div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-xl border border-red-200 p-4 text-red-700">{error}</div>
        )}

        {/* Test Emergency Mode */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-gray-900 mb-1">Test Emergency Mode</h3>
              <p className="text-sm text-gray-600">
                See what first responders will see when they access your emergency profile
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsEmergencyMode(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            disabled={!!error || !patientId}
          >
            Preview Emergency View
          </Button>
        </div>

        {/* NFC Setup */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-3 mb-4">
            <Smartphone className="w-6 h-6 text-teal-600 flex-shrink-0" />
            <div>
              <h3 className="text-gray-900 mb-1">How Emergency Access Works</h3>
              <p className="text-sm text-gray-600 mb-4">
                First responders can access your critical health information by tapping their device to yours
              </p>
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>Enable NFC on your phone (usually in Settings)</li>
                <li>Keep MediLink ID installed and emergency profile updated</li>
                <li>Information accessible even when phone is locked</li>
                <li>First responder taps their device to yours</li>
                <li>Your critical health info appears instantly</li>
              </ol>
            </div>
          </div>
          <Button variant="outline" className="w-full">
            View Video Tutorial
          </Button>
        </div>

        {/* Add to Wallet */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-3 mb-4">
            <Wallet className="w-6 h-6 text-teal-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-gray-900 mb-1">Quick Access from Lock Screen</h3>
              <p className="text-sm text-gray-600">
                Add your emergency profile to your digital wallet for instant access, even when your phone is locked
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button className="w-full bg-black hover:bg-gray-900 text-white h-12 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
              </svg>
              <span>Add to Apple Wallet</span>
            </Button>

            <Button variant="outline" className="w-full h-12 flex items-center justify-center gap-2 border-gray-300">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Add to Google Wallet</span>
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Your emergency card will be accessible from your device&apos;s lock screen or wallet app
          </p>
        </div>

        {/* Information to Share (toggles) */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-gray-900">Information to Share</h3>
            <p className="text-sm text-gray-600">Choose what to display in emergency mode</p>
          </div>

          <div className="divide-y divide-gray-200">
            {[
              { key: 'personalInfo', icon: User, label: 'Personal Information', desc: 'Name, DOB, Health Card', locked: true },
              { key: 'bloodType' as const, icon: Droplet, label: 'Blood Type', desc: 'For transfusions' },
              { key: 'allergies' as const, icon: AlertTriangle, label: 'Allergies', desc: 'Drug and environmental' },
              { key: 'conditions' as const, icon: FileText, label: 'Medical Conditions', desc: 'Chronic conditions' },
              { key: 'medications' as const, icon: Pill, label: 'Current Medications', desc: 'All active prescriptions' },
              { key: 'emergencyContacts' as const, icon: Phone, label: 'Emergency Contacts', desc: 'People to notify' },
              { key: 'advanceDirectives' as const, icon: Shield, label: 'Advance Directives (Notes for Emergency Responders)', desc: 'DNR status, living will' },
            ].map((item) => (
              <div key={item.key} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <Switch
                checked={item.key === 'personalInfo' ? true : settings[item.key]}
                disabled={item.key === 'personalInfo'}
                onCheckedChange={() => {
                  if (item.key === 'personalInfo') return;
                  toggleSetting(item.key);
                  }}
                  />
              </div>
            ))}
          </div>
        </div>

        {/* Update Emergency Information (now bound to DB state) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-gray-900 mb-4">Update Emergency Information</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Blood Type</label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">Select…</option>
                <option value="O Positive">O Positive</option>
                <option value="O Negative">O Negative</option>
                <option value="A Positive">A Positive</option>
                <option value="A Negative">A Negative</option>
                <option value="B Positive">B Positive</option>
                <option value="B Negative">B Negative</option>
                <option value="AB Positive">AB Positive</option>
                <option value="AB Negative">AB Negative</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Allergies (one per line)</label>
              <textarea
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="w-full min-h-[90px] p-3 border border-gray-300 rounded-lg"
                placeholder="e.g. Penicillin (Severe)"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Medical Conditions (one per line)</label>
              <textarea
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                className="w-full min-h-[90px] p-3 border border-gray-300 rounded-lg"
                placeholder="e.g. Type 2 Diabetes"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Current Medications (one per line)</label>
              <textarea
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                className="w-full min-h-[90px] p-3 border border-gray-300 rounded-lg"
                placeholder="e.g. Metformin 500mg - Twice daily"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Primary Emergency Contact</label>
              <Input
                value={emergencyContactFullName}
                onChange={(e) => setEmergencyContactFullName(e.target.value)}
                placeholder="Full Name"
                className="mb-2"
              />
              <Input
                value={emergencyContactRelationship}
                onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                placeholder="Relationship"
                className="mb-2"
              />
              <Input
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="Phone Number"
                type="tel"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Advance Directives (Notes for Emergency Responders)</label>
              <Input
                value={dnrStatus}
                onChange={(e) => setDnrStatus(e.target.value)}
                placeholder="DNR Status (optional)"
                className="mb-2"
              />
              <Input
                value={livingWill}
                onChange={(e) => setLivingWill(e.target.value)}
                placeholder="Living Will (optional)"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !!error || !patientId}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>

            {saveMsg && <p className="text-sm text-green-700">{saveMsg}</p>}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700">
              <span className="text-gray-900">Privacy &amp; Security:</span> Emergency information is encrypted and only
              accessible when emergency mode is activated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
