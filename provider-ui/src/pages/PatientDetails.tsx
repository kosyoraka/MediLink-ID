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
import {
  apiFetch,
  type ProviderDocument,
  type ProviderHealthSummary,
  type ProviderHealthSummaryCondition,
  type ProviderMedication,
} from '@/lib/api';

interface PatientDetailsProps {
  patient: Patient;
  onNavigate: (page: string, data?: any) => void;
  medicationContext?: {
    medicationId?: string;
    medicationChangeRequestId?: string;
  } | null;
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

const intakeStatusLabel = (value: 'taken' | 'missed' | 'skipped' | null) => {
  if (value === 'taken') return 'Taken';
  if (value === 'missed') return 'Missed';
  if (value === 'skipped') return 'Skipped';
  return 'No intake logged';
};

const conditionStatusOptions = [
  'Active',
  'Managed',
  'Well Controlled',
  'Monitoring',
  'Stable',
  'Resolved',
  'Inactive',
] as const;

const formatConditionDate = (value?: string | null) => {
  if (!value) return 'Not recorded';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(value) : value;
};

export function PatientDetails({ patient, onNavigate, medicationContext }: PatientDetailsProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'documents' | 'appointments' | 'emergency'>('history');
  const [profile, setProfile] = useState<PatientProfileResponse | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<StaffAppointmentRow[]>([]);
  const [patientDocuments, setPatientDocuments] = useState<ProviderDocument[]>([]);
  const [patientHealthSummary, setPatientHealthSummary] = useState<ProviderHealthSummary | null>(null);
  const [patientConditions, setPatientConditions] = useState<ProviderHealthSummaryCondition[]>([]);
  const [patientMedications, setPatientMedications] = useState<ProviderMedication[]>([]);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState<ProviderMedication | null>(null);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [editingCondition, setEditingCondition] = useState<ProviderHealthSummaryCondition | null>(null);
  const [pendingMedicationResolve, setPendingMedicationResolve] = useState<{ medicationId: string; requestId: string } | null>(
    medicationContext?.medicationId && medicationContext?.medicationChangeRequestId
      ? { medicationId: medicationContext.medicationId, requestId: medicationContext.medicationChangeRequestId }
      : null
  );
  const [medicationForm, setMedicationForm] = useState({
    name: '',
    dosage: '',
    frequency: '',
    purpose: '',
    pharmacy: '',
    startDate: '',
    endDate: '',
    refillsRemaining: '',
    notes: '',
  });
  const [conditionForm, setConditionForm] = useState({
    name: '',
    status: '',
    diagnosed: '',
    metric: '',
    notes: '',
  });

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

    apiFetch<{ conditions: ProviderHealthSummaryCondition[] }>(`/api/staff/patients/${patient.id}/conditions`)
      .then((data) => {
        if (!alive) return;
        setPatientConditions(data.conditions || []);
      })
      .catch(() => {
        if (!alive) return;
        setPatientConditions([]);
      });

    return () => {
      alive = false;
    };
  }, [patient.id]);

  useEffect(() => {
    if (medicationContext?.medicationId && medicationContext?.medicationChangeRequestId) {
      setPendingMedicationResolve({
        medicationId: medicationContext.medicationId,
        requestId: medicationContext.medicationChangeRequestId,
      });
      setActiveTab('history');
    }
  }, [medicationContext?.medicationId, medicationContext?.medicationChangeRequestId]);

  useEffect(() => {
    let alive = true;

    apiFetch<{ medications: ProviderMedication[] }>(`/api/staff/patients/${patient.id}/medications`)
      .then((data) => {
        if (!alive) return;
        setPatientMedications(data.medications || []);
      })
      .catch(() => {
        if (!alive) return;
        setPatientMedications([]);
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
    medicalConditions: patientConditions.length
      ? patientConditions.map((item) => item.name)
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
}, [profile, patient.emergencyInfo, patientHealthSummary, patientConditions]);

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

  const completedAppointments = useMemo(
    () =>
      patientAppointments
        .filter((appointment) => String(appointment.status).toLowerCase() === 'completed')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    [patientAppointments]
  );

  const activeMedications = useMemo(
    () => patientMedications.filter((medication) => medication.isActive),
    [patientMedications]
  );

  useEffect(() => {
    if (!pendingMedicationResolve) return;
    const targetMedication = patientMedications.find((med) => med.id === pendingMedicationResolve.medicationId);
    if (!targetMedication) return;
    openMedicationModal(targetMedication);
  }, [pendingMedicationResolve, patientMedications]);

  const openMedicationModal = (medication?: ProviderMedication) => {
    if (medication) {
      setEditingMedication(medication);
      setMedicationForm({
        name: medication.name || '',
        dosage: medication.dosage || '',
        frequency: medication.frequency || '',
        purpose: medication.purpose || '',
        pharmacy: medication.pharmacy || '',
        startDate: medication.startDate ? String(medication.startDate).slice(0, 10) : '',
        endDate: medication.endDate ? String(medication.endDate).slice(0, 10) : '',
        refillsRemaining: medication.refillsRemaining == null ? '' : String(medication.refillsRemaining),
        notes: medication.notes || '',
      });
    } else {
      setEditingMedication(null);
      setMedicationForm({
        name: '',
        dosage: '',
        frequency: '',
        purpose: '',
        pharmacy: '',
        startDate: '',
        endDate: '',
        refillsRemaining: '',
        notes: '',
      });
    }
    setShowMedicationModal(true);
  };

  const addMedication = async () => {
    if (!medicationForm.name.trim()) return;
    try {
      const payload = {
        name: medicationForm.name,
        dosage: medicationForm.dosage || undefined,
        frequency: medicationForm.frequency || undefined,
        purpose: medicationForm.purpose || undefined,
        pharmacy: medicationForm.pharmacy || undefined,
        startDate: medicationForm.startDate || undefined,
        endDate: medicationForm.endDate || undefined,
        refillsRemaining: medicationForm.refillsRemaining || undefined,
        notes: medicationForm.notes || undefined,
      };

      if (editingMedication) {
        const res = await apiFetch<{ medication: ProviderMedication }>(`/api/staff/patients/${patient.id}/medications/${editingMedication.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setPatientMedications((current) => current.map((item) => (item.id === editingMedication.id ? res.medication : item)));
        if (pendingMedicationResolve && pendingMedicationResolve.medicationId === editingMedication.id) {
          await apiFetch<{ ok: true }>(`/api/staff/medication-change-requests/${pendingMedicationResolve.requestId}/resolve`, {
            method: 'POST',
          });
          setPendingMedicationResolve(null);
        }
      } else {
        const res = await apiFetch<{ medication: ProviderMedication }>(`/api/staff/patients/${patient.id}/medications`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setPatientMedications((current) => [res.medication, ...current]);
      }
      setMedicationForm({
        name: '',
        dosage: '',
        frequency: '',
        purpose: '',
        pharmacy: '',
        startDate: '',
        endDate: '',
        refillsRemaining: '',
        notes: '',
      });
      setEditingMedication(null);
      setShowMedicationModal(false);
    } catch (error) {
      console.error('Failed to save medication:', error);
    }
  };

  const updateMedication = async (medicationId: string, body: Partial<Pick<ProviderMedication, 'name' | 'isActive' | 'dosage' | 'frequency' | 'purpose' | 'pharmacy' | 'notes' | 'refillsRemaining' | 'startDate' | 'endDate'>>) => {
    try {
      const res = await apiFetch<{ medication: ProviderMedication }>(
        `/api/staff/patients/${patient.id}/medications/${medicationId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        }
      );
      setPatientMedications((current) => current.map((item) => (item.id === medicationId ? res.medication : item)));
    } catch (error) {
      console.error('Failed to update medication:', error);
    }
  };

  const openConditionModal = (condition?: ProviderHealthSummaryCondition) => {
    if (condition) {
      setEditingCondition(condition);
      setConditionForm({
        name: condition.name || '',
        status: condition.status || '',
        diagnosed: /^\d{4}-\d{2}-\d{2}$/.test(condition.diagnosed || '') ? condition.diagnosed : '',
        metric: condition.metric || '',
        notes: condition.notes || '',
      });
    } else {
      setEditingCondition(null);
      setConditionForm({
        name: '',
        status: '',
        diagnosed: '',
        metric: '',
        notes: '',
      });
    }
    setShowConditionModal(true);
  };

  const saveCondition = async () => {
    if (!conditionForm.name.trim()) return;
    try {
      const payload = {
        name: conditionForm.name.trim(),
        status: conditionForm.status.trim() || undefined,
        diagnosed: conditionForm.diagnosed.trim() || undefined,
        metric: conditionForm.metric.trim() || undefined,
        notes: conditionForm.notes.trim() || undefined,
      };

      if (editingCondition) {
        const res = await apiFetch<{ condition: ProviderHealthSummaryCondition }>(
          `/api/staff/patients/${patient.id}/conditions/${editingCondition.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          }
        );
        setPatientConditions((current) => current.map((item) => (item.id === editingCondition.id ? res.condition : item)));
      } else {
        const res = await apiFetch<{ condition: ProviderHealthSummaryCondition }>(`/api/staff/patients/${patient.id}/conditions`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setPatientConditions((current) => [res.condition, ...current]);
      }

      try {
        const refreshed = await apiFetch<{ summary: ProviderHealthSummary }>(`/api/staff/patients/${patient.id}/health-summary`);
        setPatientHealthSummary(refreshed.summary || null);
      } catch {
        // ignore refresh failures
      }

      setEditingCondition(null);
      setShowConditionModal(false);
    } catch (error) {
      console.error('Failed to save condition:', error);
    }
  };

  const markConditionInactive = async (conditionId: string) => {
    try {
      const res = await apiFetch<{ condition: ProviderHealthSummaryCondition }>(
        `/api/staff/patients/${patient.id}/conditions/${conditionId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive: false }),
        }
      );
      if (res.condition.isActive === false) {
        setPatientConditions((current) => current.filter((item) => item.id !== conditionId));
      } else {
        setPatientConditions((current) => current.map((item) => (item.id === conditionId ? res.condition : item)));
      }
      try {
        const refreshed = await apiFetch<{ summary: ProviderHealthSummary }>(`/api/staff/patients/${patient.id}/health-summary`);
        setPatientHealthSummary(refreshed.summary || null);
      } catch {
        // ignore refresh failures
      }
    } catch (error) {
      console.error('Failed to update condition:', error);
    }
  };

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
                    <div className="mt-3 grid grid-cols-1 gap-3">
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
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  Allergies & Sensitivities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patientHealthSummary?.allergies?.length ? (
                  <div className="space-y-3">
                    {patientHealthSummary.allergies.map((item) => (
                      <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-600 mt-1">{item.reaction}</p>
                          </div>
                          <Badge variant="outline">{item.severity}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-4">
                    <p className="text-sm text-gray-600">No structured allergy information has been shared yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileTextIcon className="w-5 h-5 text-slate-600" />
                    Medical Conditions
                  </CardTitle>
                  <Button size="sm" className="gap-2" onClick={() => openConditionModal()}>
                    <Plus className="w-4 h-4" />
                    Add Condition
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {patientConditions.length ? (
                  <div className="space-y-3">
                    {patientConditions.map((item) => (
                      <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-gray-900">{item.name}</p>
                              <Badge
                                className={`border-0 ${
                                  item.sourceType === 'provider'
                                    ? 'bg-teal-100 text-teal-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {item.sourceType === 'provider' ? 'Provider verified' : 'Patient noted'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{item.status}</p>
                            <p className="text-xs text-gray-500 mt-1">Diagnosed: {formatConditionDate(item.diagnosed)}</p>
                            {item.metric ? <p className="text-xs text-gray-500 mt-1">{item.metric}</p> : null}
                            {item.provider ? <p className="text-xs text-gray-500 mt-1">Provider: {item.provider}</p> : null}
                            {item.notes ? <p className="text-xs text-gray-500 mt-1">{item.notes}</p> : null}
                            {item.hospitalName ? <p className="text-xs text-gray-500 mt-1">{item.hospitalName}</p> : null}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button variant="outline" size="sm" onClick={() => openConditionModal(item)}>
                              Edit Condition
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => markConditionInactive(item.id)}>
                              Mark Inactive
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-4">
                    <p className="text-sm text-gray-600">No conditions or patient-noted health concerns are on file yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Pill className="w-5 h-5 text-emerald-600" />
                  Current Medications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">Provider-prescribed medications appear here for the patient automatically.</p>
                  <Button size="sm" className="gap-2" onClick={() => openMedicationModal()}>
                    <Plus className="w-4 h-4" />
                    Add Medication
                  </Button>
                </div>
                {activeMedications.length ? (
                  <div className="space-y-3">
                    {activeMedications.map((medication) => (
                      <div key={medication.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-900">{medication.name}</p>
                              <Badge className={`${medication.sourceType === 'provider' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'} border-0`}>
                                {medication.sourceType === 'provider' ? 'Provider-prescribed' : 'Patient-added'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{[medication.dosage, medication.frequency].filter(Boolean).join(' • ') || 'Details pending'}</p>
                            <p className="text-xs text-gray-500 mt-1">{medication.prescriberName}</p>
                            {medication.hospitalName ? <p className="text-xs text-gray-500 mt-1">{medication.hospitalName}</p> : null}
                            {medication.purpose ? <p className="text-xs text-gray-500 mt-1">Purpose: {medication.purpose}</p> : null}
                            <p className="text-xs text-gray-500 mt-2">
                              Latest intake: {intakeStatusLabel(medication.lastIntakeStatus)}
                              {medication.lastIntakeDate ? ` on ${formatDate(medication.lastIntakeDate)}` : ''}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            {medication.sourceType === 'provider' ? (
                              <Button variant="outline" size="sm" onClick={() => openMedicationModal(medication)}>
                                Edit Medication
                              </Button>
                            ) : null}
                            <Button variant="outline" size="sm" onClick={() => updateMedication(medication.id, { isActive: false })}>
                              Mark Inactive
                            </Button>
                          </div>
                        </div>
                        {medication.recentIntakeLogs.length > 0 ? (
                          <div className="mt-3 rounded-lg bg-white border border-gray-200 p-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Recent Intake Logs</p>
                            <div className="space-y-2">
                              {medication.recentIntakeLogs.slice(0, 3).map((log) => (
                                <div key={log.id} className="flex items-start justify-between gap-3 text-xs text-gray-600">
                                  <span>{formatDate(log.loggedForDate)}</span>
                                  <span className="capitalize">{log.status}</span>
                                  <span className="flex-1 text-right">{log.note || 'No note'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-4">
                    <p className="text-sm text-gray-600">No active medications have been added yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  Blood Type & Emergency Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Blood Type</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900">{emergency.bloodType || '—'}</p>
                </div>
                {patientHealthSummary?.emergencyContacts?.length ? (
                  <div className="space-y-3">
                    {patientHealthSummary.emergencyContacts.map((contact, index) => (
                      <div key={`${contact.name}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="font-medium text-gray-900">{contact.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{contact.relationship}</p>
                        <p className="text-sm text-gray-600 mt-1">{contact.phone}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-4">
                    <p className="text-sm text-gray-600">No emergency contacts have been shared yet.</p>
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
                            <div className="mt-1 space-y-1 text-sm text-gray-600">
                              <p>Dose: {item.dose || 'Not recorded'}</p>
                              <p>Date taken: {item.date ? formatDate(item.date) : 'Not recorded'}</p>
                            </div>
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

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock3 className="w-5 h-5 text-gray-600" />
                  Advance Directives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">DNR Status</p>
                  <p className="mt-1 font-medium text-gray-900">{emergency.advanceDirectives.dnrStatus || '—'}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Living Will</p>
                  <p className="mt-1 font-medium text-gray-900">{emergency.advanceDirectives.livingWill || '—'}</p>
                </div>
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

      {showConditionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900">{editingCondition ? 'Edit Condition' : 'Add Condition'}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowConditionModal(false);
                  setEditingCondition(null);
                }}
                className="text-sm text-gray-500"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Condition name" value={conditionForm.name} onChange={(e) => setConditionForm({ ...conditionForm, name: e.target.value })} />
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2" value={conditionForm.status} onChange={(e) => setConditionForm({ ...conditionForm, status: e.target.value })}>
                <option value="">Select status</option>
                {conditionStatusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2" value={conditionForm.diagnosed} onChange={(e) => setConditionForm({ ...conditionForm, diagnosed: e.target.value })} />
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Metric or care note" value={conditionForm.metric} onChange={(e) => setConditionForm({ ...conditionForm, metric: e.target.value })} />
              <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 min-h-[100px]" placeholder="Notes" value={conditionForm.notes} onChange={(e) => setConditionForm({ ...conditionForm, notes: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => {
                setShowConditionModal(false);
                setEditingCondition(null);
              }}>Cancel</Button>
              <Button className="flex-1" onClick={saveCondition}>{editingCondition ? 'Save Changes' : 'Save Condition'}</Button>
            </div>
          </div>
        </div>
      )}

      {showMedicationModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900">{editingMedication ? 'Edit Medication' : 'Add Medication'}</h3>
              <button type="button" onClick={() => {
                setShowMedicationModal(false);
                setEditingMedication(null);
              }} className="text-sm text-gray-500">Close</button>
            </div>
            <div className="space-y-3">
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Medication name" value={medicationForm.name} onChange={(e) => setMedicationForm({ ...medicationForm, name: e.target.value })} />
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Dosage" value={medicationForm.dosage} onChange={(e) => setMedicationForm({ ...medicationForm, dosage: e.target.value })} />
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Frequency" value={medicationForm.frequency} onChange={(e) => setMedicationForm({ ...medicationForm, frequency: e.target.value })} />
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Purpose" value={medicationForm.purpose} onChange={(e) => setMedicationForm({ ...medicationForm, purpose: e.target.value })} />
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Pharmacy" value={medicationForm.pharmacy} onChange={(e) => setMedicationForm({ ...medicationForm, pharmacy: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2" value={medicationForm.startDate} onChange={(e) => setMedicationForm({ ...medicationForm, startDate: e.target.value })} />
                <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2" value={medicationForm.endDate} onChange={(e) => setMedicationForm({ ...medicationForm, endDate: e.target.value })} />
              </div>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Refills remaining" value={medicationForm.refillsRemaining} onChange={(e) => setMedicationForm({ ...medicationForm, refillsRemaining: e.target.value })} />
              <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 min-h-[100px]" placeholder="Notes" value={medicationForm.notes} onChange={(e) => setMedicationForm({ ...medicationForm, notes: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => {
                setShowMedicationModal(false);
                setEditingMedication(null);
              }}>Cancel</Button>
              <Button className="flex-1" onClick={addMedication}>{editingMedication ? 'Save Changes' : 'Save Medication'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
