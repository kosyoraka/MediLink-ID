import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Edit,
  MessageSquare,
  Plus,
  FileText as FileTextIcon,
  Calendar,
  Download,
  Phone,
  AlertCircle,
  Mail,
  MapPin,
  ShieldAlert,
  Clock3,
  Pill,
  Activity,
  Syringe,
  Users,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import type { Patient, EmergencyContact } from '@/lib/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { apiFetch, type ProviderDocument, type ProviderHealthSummary } from '@/lib/api';

interface PatientDetailsProps {
  patient: Patient;
  onNavigate: (page: string, data?: any) => void;
}

type StaffAppointmentRow = {
  id: string;
  startTime: string;
  status: string;
  patientId: string;
  type?: string | null;
};

type PatientProfileResponse = {
  patient_id: string;
  email: string;

  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  health_card: string | null;
  phone_number: string | null;

  home_address_line1: string | null;
  home_address_line2: string | null;
  home_city: string | null;
  home_province: string | null;
  home_postal_code: string | null;

  mailing_same_as_home: boolean | null;
  mailing_address_line1: string | null;
  mailing_address_line2: string | null;
  mailing_city: string | null;
  mailing_province: string | null;
  mailing_postal_code: string | null;

  // emergency fields in patient_profiles
  blood_type: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  current_medications: string | null;
  dnr_status: string | null;
  living_will: string | null;
  emergency_contacts: any | null; // JSONB
  emergency_contact_full_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
  created_at: string | null;
  
};

const calcAge = (dob: string | null) => {
  if (!dob) return 0;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

const buildAddress = (p: PatientProfileResponse | null, fallback: string) => {
  if (!p) return fallback;

  const parts = [
    p.home_address_line1,
    p.home_address_line2,
    p.home_city,
    p.home_province,
    p.home_postal_code,
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : fallback;
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

// Supports:
// - null
// - "Penicillin, Peanuts"
// - '["Penicillin","Peanuts"]' (stringified JSON array)
const parseStringList = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);

  const s = String(value).trim();
  if (!s) return [];

  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      // fall back
    }
  }

  return s.split(',').map((x) => x.trim()).filter(Boolean);
};

const parseEmergencyContacts = (value: unknown): EmergencyContact[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((c: any) => ({
        name: String(c?.name ?? '').trim(),
        relationship: String(c?.relationship ?? '').trim(),
        phone: String(c?.phone ?? '').trim(),
      }))
      .filter((c) => c.name || c.phone || c.relationship);
  }

  const s = String(value).trim();
  if (!s) return [];

  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      return parsed
        .map((c: any) => ({
          name: String(c?.name ?? '').trim(),
          relationship: String(c?.relationship ?? '').trim(),
          phone: String(c?.phone ?? '').trim(),
        }))
        .filter((c) => c.name || c.phone || c.relationship);
    }
  } catch {
    // ignore
  }

  return [];
};

export function PatientDetails({ patient, onNavigate }: PatientDetailsProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'documents' | 'appointments' | 'emergency'>('history');
  const [profile, setProfile] = useState<PatientProfileResponse | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<StaffAppointmentRow[]>([]);
  const [patientDocuments, setPatientDocuments] = useState<ProviderDocument[]>([]);
  const [patientHealthSummary, setPatientHealthSummary] = useState<ProviderHealthSummary | null>(null);

  useEffect(() => {
    let alive = true;

    apiFetch<PatientProfileResponse>(`/api/patients/${patient.id}/profile`)
      .then((data) => {
        if (!alive) return;
        setProfile(data);
      })
      .catch((e) => {
        console.error('Failed to load patient profile:', e);
        if (!alive) return;
        setProfile(null);
      });

    return () => {
      alive = false;
    };
  }, [patient.id]);

  useEffect(() => {
    let alive = true;

    apiFetch<{ summary: ProviderHealthSummary }>(`/api/staff/patients/${patient.id}/health-summary`)
      .then((data) => {
        if (!alive) return;
        setPatientHealthSummary(data.summary || null);
      })
      .catch(() => {
        if (!alive) return;
        setPatientHealthSummary(null);
      });

    return () => {
      alive = false;
    };
  }, [patient.id]);

  useEffect(() => {
    let alive = true;

    apiFetch<{ documents: ProviderDocument[] }>(`/api/staff/documents?patientId=${encodeURIComponent(patient.id)}`)
      .then((data) => {
        if (!alive) return;
        setPatientDocuments(data.documents || []);
      })
      .catch(() => {
        if (!alive) return;
        setPatientDocuments([]);
      });

    return () => {
      alive = false;
    };
  }, [patient.id]);

  useEffect(() => {
    let alive = true;

    apiFetch<any>('/api/staff/appointments')
      .then((data) => {
        if (!alive) return;

        const rows = Array.isArray(data) ? data : Array.isArray(data?.appointments) ? data.appointments : [];
        const normalized = rows
          .map((row: any) => ({
            id: String(row.id),
            startTime: String(row.startTime ?? row.start_time ?? ''),
            status: String(row.status ?? ''),
            patientId: String(row.patientId ?? row.patient_id ?? ''),
            type: String(row.type ?? row.appointmentType ?? 'Appointment'),
          }))
          .filter((row: StaffAppointmentRow) => row.patientId === patient.id);

        setPatientAppointments(normalized);
      })
      .catch(() => {
        if (!alive) return;
        setPatientAppointments([]);
      });

    return () => {
      alive = false;
    };
  }, [patient.id]);

  const displayName = useMemo(() => {
    const n = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim();
    return n || patient.name;
  }, [profile, patient.name]);

  const displayDob = useMemo(() => profile?.dob ?? patient.dateOfBirth, [profile, patient.dateOfBirth]);

  const displayAge = useMemo(() => {
    const fromDb = calcAge(profile?.dob ?? null);
    return fromDb || patient.age;
  }, [profile, patient.age]);

  const displayPhone = useMemo(() => profile?.phone_number ?? patient.phone, [profile, patient.phone]);
  const displayEmail = useMemo(() => profile?.email ?? patient.email, [profile, patient.email]);
  const displayHealthCard = useMemo(
    () => profile?.health_card ?? patient.emergencyInfo.healthCardNumber,
    [profile, patient.emergencyInfo.healthCardNumber]
  );

  const displayAddress = useMemo(() => buildAddress(profile, patient.address), [profile, patient.address]);

  const emergency = useMemo(() => {
  const emergencyContacts =
    patientHealthSummary?.emergencyContacts && patientHealthSummary.emergencyContacts.length > 0
      ? patientHealthSummary.emergencyContacts
      : profile?.emergency_contacts
      ? parseEmergencyContacts(profile.emergency_contacts)
      : (profile?.emergency_contact_full_name ||
         profile?.emergency_contact_phone ||
         profile?.emergency_contact_relationship)
        ? [
            {
              name: String(profile.emergency_contact_full_name ?? '').trim(),
              relationship: String(profile.emergency_contact_relationship ?? '').trim(),
              phone: String(profile.emergency_contact_phone ?? '').trim(),
            },
          ].filter((c) => c.name || c.phone || c.relationship)
        : (patient.emergencyInfo.emergencyContacts ?? []);

  return {
    bloodType: (patientHealthSummary?.bloodType ?? '').trim() || (profile?.blood_type ?? '').trim() || patient.emergencyInfo.bloodType || '—',
    allergies: patientHealthSummary?.allergies?.length
      ? patientHealthSummary.allergies.map((item) => item.name)
      : profile?.allergies
      ? parseStringList(profile.allergies)
      : (patient.emergencyInfo.allergies ?? []),
    medicalConditions: patientHealthSummary?.conditions?.length
      ? patientHealthSummary.conditions.map((item) => item.name)
      : profile?.medical_conditions
      ? parseStringList(profile.medical_conditions)
      : (patient.emergencyInfo.medicalConditions ?? []),
    currentMedications: patientHealthSummary?.currentMedications?.length
      ? patientHealthSummary.currentMedications
      : profile?.current_medications
      ? parseStringList(profile.current_medications)
      : (patient.emergencyInfo.currentMedications ?? []),

    // ✅ use the computed fallback contacts
    emergencyContacts,

    advanceDirectives: {
      dnrStatus:
        (patientHealthSummary?.advanceDirectives?.dnrStatus ?? '').trim() ||
        (profile?.dnr_status ?? '').trim() ||
        patient.emergencyInfo.advanceDirectives?.dnrStatus ||
        '—',
      livingWill:
        (patientHealthSummary?.advanceDirectives?.livingWill ?? '').trim() ||
        (profile?.living_will ?? '').trim() ||
        patient.emergencyInfo.advanceDirectives?.livingWill ||
        '—',
    },
    lastUpdated: profile?.created_at || patient.emergencyInfo.lastUpdated || new Date().toISOString(),
  };
}, [profile, patient.emergencyInfo, patientHealthSummary]);

  const nextAppointment = useMemo(() => {
    const now = Date.now();
    return patientAppointments
      .filter((appointment) => {
        const ts = new Date(appointment.startTime).getTime();
        return !Number.isNaN(ts) && ts >= now && appointment.status !== 'Cancelled' && appointment.status !== 'Completed';
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] || null;
  }, [patientAppointments]);

  const lastVisit = useMemo(() => {
    const pastAppointments = patientAppointments
      .filter((appointment) => {
        const ts = new Date(appointment.startTime).getTime();
        return !Number.isNaN(ts) && ts < Date.now();
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    if (pastAppointments.length > 0) return pastAppointments[0].startTime;

    const visitDates = patient.visitRecords
      .map((visit) => new Date(visit.date).getTime())
      .filter((ts) => !Number.isNaN(ts))
      .sort((a, b) => b - a);

    if (visitDates.length > 0) return new Date(visitDates[0]).toISOString();
    return patient.lastVisit || null;
  }, [patient.lastVisit, patient.visitRecords, patientAppointments]);

  const emergencyFlags = useMemo(() => {
    const flags: string[] = [];
    if (emergency.allergies.length > 0) flags.push(`${emergency.allergies.length} allergies on file`);
    if (emergency.medicalConditions.length > 0) flags.push(`${emergency.medicalConditions.length} chronic conditions`);
    if (emergency.currentMedications.length > 0) flags.push(`${emergency.currentMedications.length} current medications`);

    const dnr = emergency.advanceDirectives.dnrStatus.trim().toLowerCase();
    if (dnr && dnr !== '—' && dnr !== 'no dnr') flags.push(`Advance directive: ${emergency.advanceDirectives.dnrStatus}`);

    return flags;
  }, [emergency]);

  const completedAppointments = useMemo(
    () =>
      patientAppointments
        .filter((appointment) => String(appointment.status).toLowerCase() === 'completed')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    [patientAppointments]
  );

  const latestSharedVital = useMemo(
    () =>
      (patientHealthSummary?.vitals || [])
        .slice()
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0] || null,
    [patientHealthSummary]
  );
  const tabs = [
    { id: 'history', label: 'Health Summary' },
    { id: 'documents', label: 'Documents' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'emergency', label: 'Emergency Info' },
  ] as const;

  const getDocumentIcon = (_type: string) => FileTextIcon;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <Button variant="ghost" onClick={() => onNavigate('patients')} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Patients
      </Button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {patient.photo ? (
                <img src={patient.photo} alt={displayName} className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                  {initials(displayName) || 'P'}
                </div>
              )}

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                      <Badge variant={patient.status === 'Active' ? 'success' : 'secondary'}>{patient.status}</Badge>
                    </div>
                    <p className="text-gray-600 mt-1">{patient.patientId}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Edit className="w-4 h-4" />
                      Edit Patient
                    </Button>
                    <Button size="sm" className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Patient Snapshot</p>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-gray-600">DOB</p>
                          <p className="font-medium text-gray-900">{formatDate(displayDob)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Age</p>
                          <p className="font-medium text-gray-900">{displayAge} years</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium text-gray-900">{displayPhone || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium text-gray-900 break-all">{displayEmail || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="font-medium text-gray-900">{displayAddress || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Care Snapshot</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Connection</p>
                        <p className="mt-1 font-medium text-gray-900">{patient.status}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Last visit</p>
                        <p className="mt-1 font-medium text-gray-900">{lastVisit ? formatDate(lastVisit) : '—'}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Next appointment</p>
                        <p className="mt-1 font-medium text-gray-900">
                          {nextAppointment ? formatDateTime(nextAppointment.startTime) : 'None scheduled'}
                        </p>
                      </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Insurance</p>
                    <p className="mt-1 font-medium text-gray-900 line-clamp-2">{patient.insurance || '—'}</p>
                  </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              Medical Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-red-50 border border-red-100 p-4">
              <p className="text-xs uppercase tracking-wide text-red-700">Allergies</p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {emergency.allergies.length > 0 ? emergency.allergies.join(', ') : 'No allergies on file'}
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs uppercase tracking-wide text-blue-700">Chronic Conditions</p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {emergency.medicalConditions.length > 0 ? emergency.medicalConditions.join(', ') : 'No chronic conditions on file'}
              </p>
            </div>

            <div className="rounded-xl bg-green-50 border border-green-100 p-4">
              <p className="text-xs uppercase tracking-wide text-green-700">Current Medications</p>
              <p className="mt-2 text-sm font-medium text-gray-900">
                {emergency.currentMedications.length > 0 ? emergency.currentMedications.join(', ') : 'No medications on file'}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Emergency Flags</p>
                  <p className="mt-1 text-sm text-gray-600">Items staff should notice quickly</p>
                </div>
                <Badge variant={emergencyFlags.length > 0 ? 'warning' : 'secondary'}>
                  {emergencyFlags.length}
                </Badge>
              </div>
              <div className="mt-3 space-y-2">
                {emergencyFlags.length > 0 ? (
                  emergencyFlags.map((flag, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-900">{flag}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">No critical flags recorded.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Activity</p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock3 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Documents on file</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{patientDocuments.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Appointments in history</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{patientAppointments.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Blood type</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{emergency.bloodType}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'history' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Health Summary</h2>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Vitals and Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Last completed appointment</p>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {completedAppointments[0] ? formatDateTime(completedAppointments[0].startTime) : 'No completed appointment yet'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Upcoming appointment</p>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {nextAppointment ? formatDateTime(nextAppointment.startTime) : 'No upcoming appointment scheduled'}
                  </p>
                </div>
                {latestSharedVital ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Latest shared vitals</p>
                    <div className="mt-2 space-y-1 text-sm text-gray-900">
                      <p>Blood pressure: {latestSharedVital.systolic}/{latestSharedVital.diastolic} mmHg</p>
                      <p>Heart rate: {latestSharedVital.heartRate} bpm</p>
                      <p>Weight: {latestSharedVital.weight} lbs</p>
                      <p>Blood sugar: {latestSharedVital.bloodSugar} mg/dL</p>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Logged {formatDateTime(latestSharedVital.recordedAt)}</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-4">
                    <p className="text-sm text-gray-600">Patient-reported vitals</p>
                    <p className="mt-2 text-sm text-gray-500">
                      This patient has not shared any vitals entries yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Syringe className="w-5 h-5 text-green-600" />
                  Immunization Record
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patientHealthSummary?.immunizations?.length ? (
                  <div className="space-y-3">
                    {patientHealthSummary.immunizations.map((item) => (
                      <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-600 mt-1">{item.detail}</p>
                          </div>
                          <Badge variant="secondary">{item.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-4">
                    <p className="text-sm text-gray-600">Immunization status</p>
                    <p className="mt-2 text-sm text-gray-500">
                      No structured immunization record has been shared with this provider yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Family Health History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patientHealthSummary?.familyHistory?.length ? (
                  <div className="space-y-3">
                    {patientHealthSummary.familyHistory.map((item) => (
                      <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm text-gray-900">{item.condition}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.relation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-4">
                    <p className="text-sm text-gray-600">Shared family history</p>
                    <p className="mt-2 text-sm text-gray-500">
                      No family health history has been shared with this provider yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Patient Documents</h2>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Upload Document
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patientDocuments.map((doc) => {
              const Icon = getDocumentIcon(doc.category);
              return (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{doc.fileSizeLabel}</p>
                        <Badge variant="secondary" className="mt-2">
                          {doc.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-2">Uploaded: {formatDate(doc.uploadDate)}</p>
                      {doc.description && <p className="text-xs text-gray-600 mb-3">{doc.description}</p>}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => window.open(doc.fileUrl, '_blank', 'noopener,noreferrer')}
                      >
                        <Download className="w-3 h-3" />
                        Open Document
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {patientDocuments.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                <FileTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No documents uploaded yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Appointment History</h2>
          {patientAppointments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No appointments recorded for this patient yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {patientAppointments
                .slice()
                .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                .map((appointment) => (
                  <Card key={appointment.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <p className="font-medium text-gray-900">{formatDateTime(appointment.startTime)}</p>
                          </div>
                          <p className="mt-2 text-sm text-gray-600">{appointment.type || 'Appointment'}</p>
                        </div>
                        <Badge variant="outline">{appointment.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'emergency' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Emergency Information</h2>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Critical Emergency Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Health Card Number</p>
                <p className="mt-1 font-medium text-gray-900">{displayHealthCard}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Blood Type</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{emergency.bloodType}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="mt-1 font-medium text-gray-900">{formatDateTime(emergency.lastUpdated)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Pill className="w-5 h-5 text-green-600" />
                Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {emergency.emergencyContacts.length > 0 ? (
                emergency.emergencyContacts.map((contact, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {contact.name} ({contact.relationship})
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{contact.phone}</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Phone className="w-4 h-4" />
                      Call {contact.phone}
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600">No emergency contacts on file.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Advance Directives</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">DNR Status</p>
                <p className="font-medium text-gray-900 mt-1">{emergency.advanceDirectives.dnrStatus}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Living Will</p>
                <p className="font-medium text-gray-900 mt-1">{emergency.advanceDirectives.livingWill}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
