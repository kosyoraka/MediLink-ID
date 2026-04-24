import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  Plus,
  RefreshCw,
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
  Trash2,
  Users,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import type { Patient, EmergencyContact } from '@/lib/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  apiFetch,
  type ProviderDocument,
  type ProviderHealthSummaryAllergy,
  type ProviderHealthSummary,
  type ProviderHealthSummaryCondition,
  type ProviderHealthSummaryEmergencyContact,
  type ProviderHealthSummaryFamilyHistory,
  type ProviderHealthSummaryImmunization,
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
  notes?: string | null;
  providerName?: string | null;
  hospitalName?: string | null;
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

const intakeStatusBadge = (value: 'taken' | 'missed' | 'skipped' | null) => {
  if (value === 'taken') {
    return {
      label: 'Taken',
      className: 'bg-emerald-100 text-emerald-700',
      cardClassName: 'border-emerald-200 bg-emerald-50/40',
    };
  }
  if (value === 'missed') {
    return {
      label: 'Missed dose',
      className: 'bg-rose-100 text-rose-700',
      cardClassName: 'border-rose-200 bg-rose-50/40',
    };
  }
  if (value === 'skipped') {
    return {
      label: 'Skipped dose',
      className: 'bg-amber-100 text-amber-800',
      cardClassName: 'border-amber-200 bg-amber-50/50',
    };
  }
  return {
    label: 'No intake logged',
    className: 'bg-gray-100 text-gray-700',
    cardClassName: 'border-gray-200 bg-gray-50',
  };
};

const refillRequestBadge = (value: string | null) => {
  if (value === 'open') {
    return {
      label: 'Refill requested',
      className: 'bg-sky-100 text-sky-700',
      cardClassName: 'border-sky-200 bg-sky-50/40',
    };
  }
  if (value === 'approved') {
    return {
      label: 'Refill approved',
      className: 'bg-emerald-100 text-emerald-700',
      cardClassName: 'border-emerald-200 bg-emerald-50/40',
    };
  }
  if (value === 'denied') {
    return {
      label: 'Refill denied',
      className: 'bg-rose-100 text-rose-700',
      cardClassName: 'border-rose-200 bg-rose-50/40',
    };
  }
  return {
    label: 'No refill request',
    className: 'bg-gray-100 text-gray-700',
    cardClassName: '',
  };
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

const bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
const immunizationStatusOptions = ['Up to date', 'Scheduled', 'Due', 'Declined'] as const;

const emptyProviderAllergy = (): ProviderHealthSummaryAllergy => ({
  id: '',
  name: '',
  severity: 'MODERATE',
  reaction: '',
});

const emptyProviderImmunization = (): ProviderHealthSummaryImmunization => ({
  id: '',
  name: '',
  detail: '',
  dose: '',
  date: '',
  status: 'Up to date',
});

const emptyProviderFamilyHistory = (): ProviderHealthSummaryFamilyHistory => ({
  id: '',
  relation: '',
  condition: '',
});

const emptyProviderEmergencyContact = (): ProviderHealthSummaryEmergencyContact => ({
  id: '',
  name: '',
  relationship: '',
  phone: '',
});

const formatConditionDate = (value?: string | null) => {
  if (!value) return 'Not recorded';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(value) : value;
};

type WeightUnit = 'lbs' | 'kg';
type ProviderVitalType = 'bloodPressure' | 'heartRate' | 'weight' | 'bloodSugar';
type VitalRange = '1w' | '1m' | '6m' | '1y' | '2y' | '3y' | '4y' | '5y';

const vitalRangeOptions: Array<{ key: VitalRange; label: string }> = [
  { key: '1w', label: 'Past Week' },
  { key: '1m', label: '1 Month' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: '2y', label: '2Y' },
  { key: '3y', label: '3Y' },
  { key: '4y', label: '4Y' },
  { key: '5y', label: '5Y' },
];

const toLbs = (weight: number, unit: WeightUnit = 'lbs') => (unit === 'kg' ? weight * 2.20462 : weight);
const fromLbs = (weight: number, unit: WeightUnit = 'lbs') => (unit === 'kg' ? weight / 2.20462 : weight);
const convertWeight = (weight: number, from: WeightUnit = 'lbs', to: WeightUnit = 'lbs') =>
  from === to ? weight : fromLbs(toLbs(weight, from), to);

const formatWeight = (weight: number, unit: WeightUnit = 'lbs') =>
  `${Number(weight.toFixed(unit === 'kg' ? 1 : 0))} ${unit}`;

const getProviderVitalsForType = (
  vitals: ProviderHealthSummary['vitals'],
  type: ProviderVitalType,
  direction: 'asc' | 'desc' = 'desc'
) =>
  vitals
    .filter((entry) => {
      if (entry.type) return entry.type === type;
      if (type === 'bloodPressure') return typeof entry.systolic === 'number' && typeof entry.diastolic === 'number';
      if (type === 'heartRate') return typeof entry.heartRate === 'number';
      if (type === 'weight') return typeof entry.weight === 'number';
      return typeof entry.bloodSugar === 'number';
    })
    .slice()
    .sort((a, b) =>
      direction === 'desc'
        ? new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
        : new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

const getLatestProviderVitalForType = (vitals: ProviderHealthSummary['vitals'], type: ProviderVitalType) =>
  getProviderVitalsForType(vitals, type, 'desc')[0];

const getProviderVitalNumericValue = (
  entry: ProviderHealthSummary['vitals'][number],
  type: ProviderVitalType,
  weightUnit: WeightUnit = 'lbs'
) => {
  if (type === 'bloodPressure') return entry.systolic ?? 0;
  if (type === 'heartRate') return entry.heartRate ?? 0;
  if (type === 'weight') return convertWeight(entry.weight ?? 0, (entry.weightUnit as WeightUnit | undefined) || 'lbs', weightUnit);
  return entry.bloodSugar ?? 0;
};

function TrendChart({
  values,
  labels,
  color = '#2563eb',
}: {
  values: number[];
  labels?: string[];
  color?: string;
}) {
  if (values.length === 0) {
    return <div className="h-20 rounded-xl border border-dashed border-gray-200 bg-gray-50" />;
  }

  const width = 260;
  const height = 102;
  const padding = 14;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const floorMin = Math.floor(min);
  const ceilMax = Math.ceil(max);
  const span = Math.max(1, ceilMax - floorMin);
  const tickStep = Math.max(1, Math.ceil(span / 4));
  const paddedMin = floorMin - tickStep;
  const paddedMax = ceilMax + tickStep;
  const range = paddedMax - paddedMin || 1;
  const stepX = values.length === 1 ? 0 : (width - padding * 2) / (values.length - 1);
  const gridLines = 4;
  const points = values.map((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((value - paddedMin) / range) * (height - padding * 2);
    return `${x},${y}`;
  });
  const yLabels = Array.from({ length: gridLines + 1 }, (_, index) => {
    return `${paddedMax - tickStep * index}`;
  });
  const xLabels = labels && labels.length > 0 ? [labels[0], labels[Math.floor((labels.length - 1) / 2)], labels[labels.length - 1]] : [];

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-[80px] w-11 flex-col justify-between text-[10px] leading-none text-gray-500">
          {yLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[80px] w-full">
          {Array.from({ length: gridLines + 1 }, (_, index) => {
            const y = padding + ((height - padding * 2) / gridLines) * index;
            return (
              <line
                key={`grid-${index}`}
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
                stroke="#d1d5db"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            );
          })}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points.join(' ')}
          />
          {points.map((point, index) => {
            const [cx, cy] = point.split(',');
            return <circle key={`${point}-${index}`} cx={cx} cy={cy} r="3" fill={color} />;
          })}
        </svg>
      </div>
      {xLabels.length === 3 ? (
        <div className="mt-3 grid grid-cols-3 text-[10px] leading-none text-gray-500">
          <span>{xLabels[0]}</span>
          <span className="text-center">{xLabels[1]}</span>
          <span className="text-right">{xLabels[2]}</span>
        </div>
      ) : null}
    </div>
  );
}

const filterVitalsByRange = <T extends { recordedAt: string }>(entries: T[], range: VitalRange) => {
  if (entries.length === 0) return entries;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === '1w') start.setDate(start.getDate() - 7);
  if (range === '1m') start.setMonth(start.getMonth() - 1);
  if (range === '6m') start.setMonth(start.getMonth() - 6);
  if (range === '1y') start.setFullYear(start.getFullYear() - 1);
  if (range === '2y') start.setFullYear(start.getFullYear() - 2);
  if (range === '3y') start.setFullYear(start.getFullYear() - 3);
  if (range === '4y') start.setFullYear(start.getFullYear() - 4);
  if (range === '5y') start.setFullYear(start.getFullYear() - 5);
  return entries.filter((entry) => new Date(entry.recordedAt).getTime() >= start.getTime());
};

const buildTrendLabels = (dates: string[], range: VitalRange) =>
  dates.map((value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    if (range === '1w') return String(d.getDate());
    if (range === '1m') {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString(undefined, { month: 'short' });
  });

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const formatMonthYear = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const groupVitalLogs = <T extends { date: string; value: string }>(entries: T[]) => {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const pastWeek = new Date(today);
  pastWeek.setDate(pastWeek.getDate() - 7);

  const groups = new Map<string, T[]>();

  entries.forEach((entry) => {
    const entryDate = new Date(entry.date);
    const entryDay = startOfDay(entryDate);
    let label = '';

    if (entryDay.getTime() === today.getTime()) {
      label = 'Today';
    } else if (entryDay.getTime() === yesterday.getTime()) {
      label = 'Yesterday';
    } else if (entryDay.getTime() > pastWeek.getTime()) {
      label = 'Past Week';
    } else if (entryDate.getFullYear() === now.getFullYear()) {
      label = formatMonthYear(entry.date);
    } else {
      label = String(entryDate.getFullYear());
    }

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)?.push(entry);
  });

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
};

export function PatientDetails({ patient, onNavigate, medicationContext }: PatientDetailsProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'documents' | 'appointments' | 'emergency'>('history');
  const [profile, setProfile] = useState<PatientProfileResponse | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<StaffAppointmentRow[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<StaffAppointmentRow | null>(null);
  const [patientDocuments, setPatientDocuments] = useState<ProviderDocument[]>([]);
  const [patientHealthSummary, setPatientHealthSummary] = useState<ProviderHealthSummary | null>(null);
  const [patientConditions, setPatientConditions] = useState<ProviderHealthSummaryCondition[]>([]);
  const [patientMedications, setPatientMedications] = useState<ProviderMedication[]>([]);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState<ProviderMedication | null>(null);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [editingCondition, setEditingCondition] = useState<ProviderHealthSummaryCondition | null>(null);
  const [summaryEditor, setSummaryEditor] = useState<null | 'allergy' | 'blood-contact' | 'immunization' | 'family-history' | 'advance-directives'>(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showAddVitalForm, setShowAddVitalForm] = useState(false);
  const [resolvingRefillRequestId, setResolvingRefillRequestId] = useState<string | null>(null);
  const [vitalRange, setVitalRange] = useState<VitalRange>('1y');
  const [expandedProviderVitalGroups, setExpandedProviderVitalGroups] = useState<Record<string, boolean>>({});
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
  const [allergyForm, setAllergyForm] = useState<ProviderHealthSummaryAllergy>(emptyProviderAllergy());
  const [bloodTypeInput, setBloodTypeInput] = useState('');
  const [emergencyContactForm, setEmergencyContactForm] = useState<ProviderHealthSummaryEmergencyContact>(emptyProviderEmergencyContact());
  const [immunizationForm, setImmunizationForm] = useState<ProviderHealthSummaryImmunization>(emptyProviderImmunization());
  const [familyHistoryForm, setFamilyHistoryForm] = useState<ProviderHealthSummaryFamilyHistory>(emptyProviderFamilyHistory());
  const [advanceDirectiveForm, setAdvanceDirectiveForm] = useState({ dnrStatus: '', livingWill: '' });
  const [vitalEntryForm, setVitalEntryForm] = useState({
    systolic: '',
    diastolic: '',
    heartRate: '',
    weight: '',
    weightUnit: 'lbs' as WeightUnit,
    bloodSugar: '',
    recordedAt: '',
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
            notes: row.notes ? String(row.notes) : '',
            providerName: row.providerName ?? row.provider_name ?? null,
            hospitalName: row.hospitalName ?? row.hospital_name ?? null,
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
  const adherenceAlerts = useMemo(
    () =>
      activeMedications
        .filter(
          (medication) =>
            medication.lastIntakeStatus === 'missed' || medication.lastIntakeStatus === 'skipped'
        )
        .sort((a, b) => {
          const aTime = new Date(a.lastIntakeDate || 0).getTime();
          const bTime = new Date(b.lastIntakeDate || 0).getTime();
          return bTime - aTime;
        }),
    [activeMedications]
  );
  const refillAlerts = useMemo(
    () =>
      activeMedications
        .filter((medication) => medication.latestRefillRequestStatus === 'open')
        .sort((a, b) => {
          const aTime = new Date(a.latestRefillRequestCreatedAt || a.lastRefillRequestedAt || 0).getTime();
          const bTime = new Date(b.latestRefillRequestCreatedAt || b.lastRefillRequestedAt || 0).getTime();
          return bTime - aTime;
        }),
    [activeMedications]
  );
  const latestInsuranceDocument = useMemo(
    () =>
      patientDocuments
        .filter((document) => document.category === 'insurance')
        .sort((a, b) => {
          const aTime = new Date(a.uploadDate || a.serviceDate || 0).getTime();
          const bTime = new Date(b.uploadDate || b.serviceDate || 0).getTime();
          return bTime - aTime;
        })[0] || null,
    [patientDocuments]
  );
  const insuranceSnapshot = useMemo(() => {
    if (!latestInsuranceDocument) return '—';
    const label = latestInsuranceDocument.title?.trim() || latestInsuranceDocument.subtype?.trim() || 'Insurance';
    return `Available - ${label}`;
  }, [latestInsuranceDocument]);

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

  const resolveRefillRequest = async (
    medication: ProviderMedication,
    resolution: 'approved' | 'denied'
  ) => {
    if (!medication.latestRefillRequestId) return;
    try {
      setResolvingRefillRequestId(medication.latestRefillRequestId);
      const res = await apiFetch<{ ok: true; resolution: 'approved' | 'denied'; medication: ProviderMedication | null }>(
        `/api/staff/medication-refill-requests/${medication.latestRefillRequestId}/resolve`,
        {
          method: 'POST',
          body: JSON.stringify({ resolution }),
        }
      );
      if (res.medication) {
        setPatientMedications((current) =>
          current.map((item) => (item.id === medication.id ? res.medication! : item))
        );
      }
    } catch (error) {
      console.error('Failed to resolve refill request:', error);
    } finally {
      setResolvingRefillRequestId(null);
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
      setPatientConditions((current) => current.map((item) => (item.id === conditionId ? res.condition : item)));
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

  const restoreCondition = async (conditionId: string) => {
    try {
      const res = await apiFetch<{ condition: ProviderHealthSummaryCondition }>(
        `/api/staff/patients/${patient.id}/conditions/${conditionId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive: true }),
        }
      );
      setPatientConditions((current) => current.map((item) => (item.id === conditionId ? res.condition : item)));
      try {
        const refreshed = await apiFetch<{ summary: ProviderHealthSummary }>(`/api/staff/patients/${patient.id}/health-summary`);
        setPatientHealthSummary(refreshed.summary || null);
      } catch {
        // ignore refresh failures
      }
    } catch (error) {
      console.error('Failed to restore condition:', error);
    }
  };

  const deleteCondition = async (conditionId: string) => {
    if (!window.confirm('Delete this condition permanently?')) return;
    try {
      await apiFetch<{ ok: boolean }>(`/api/staff/patients/${patient.id}/conditions/${conditionId}`, {
        method: 'DELETE',
      });
      setPatientConditions((current) => current.filter((item) => item.id !== conditionId));
      try {
        const refreshed = await apiFetch<{ summary: ProviderHealthSummary }>(`/api/staff/patients/${patient.id}/health-summary`);
        setPatientHealthSummary(refreshed.summary || null);
      } catch {
        // ignore refresh failures
      }
    } catch (error) {
      console.error('Failed to delete condition:', error);
    }
  };

  const saveStructuredSummary = async (nextSummary: ProviderHealthSummary) => {
    try {
      const res = await apiFetch<{ summary: ProviderHealthSummary }>(`/api/staff/patients/${patient.id}/health-summary`, {
        method: 'PUT',
        body: JSON.stringify({
          vitals: nextSummary.vitals || [],
          allergies: nextSummary.allergies || [],
          bloodType: nextSummary.bloodType || null,
          currentMedications: nextSummary.currentMedications || [],
          emergencyContacts: nextSummary.emergencyContacts || [],
          advanceDirectives: nextSummary.advanceDirectives || {},
          immunizations: nextSummary.immunizations || [],
          familyHistory: nextSummary.familyHistory || [],
        }),
      });
      setPatientHealthSummary(res.summary || null);
      setSummaryEditor(null);
    } catch (error) {
      console.error('Failed to save structured health summary:', error);
    }
  };

  const openSummaryEditor = (type: NonNullable<typeof summaryEditor>) => {
    setSummaryEditor(type);
    if (type === 'allergy') {
      setAllergyForm(emptyProviderAllergy());
    }
    if (type === 'blood-contact') {
      setBloodTypeInput(patientHealthSummary?.bloodType || '');
      setEmergencyContactForm(emptyProviderEmergencyContact());
    }
    if (type === 'immunization') {
      setImmunizationForm(emptyProviderImmunization());
    }
    if (type === 'family-history') {
      setFamilyHistoryForm(emptyProviderFamilyHistory());
    }
    if (type === 'advance-directives') {
      setAdvanceDirectiveForm({
        dnrStatus: patientHealthSummary?.advanceDirectives?.dnrStatus || '',
        livingWill: patientHealthSummary?.advanceDirectives?.livingWill || '',
      });
    }
  };

  const removeSummaryItem = async (
    type: 'allergies' | 'emergencyContacts' | 'immunizations' | 'familyHistory',
    idOrFallback: string
  ) => {
    if (!patientHealthSummary) return;

    if (type === 'allergies') {
      await saveStructuredSummary({
        ...patientHealthSummary,
        allergies: patientHealthSummary.allergies.filter((item) => item.id !== idOrFallback),
      });
    }

    if (type === 'emergencyContacts') {
      await saveStructuredSummary({
        ...patientHealthSummary,
        emergencyContacts: patientHealthSummary.emergencyContacts.filter(
          (item) => (item.id || `${item.name}-${item.phone}`) !== idOrFallback
        ),
      });
    }

    if (type === 'immunizations') {
      await saveStructuredSummary({
        ...patientHealthSummary,
        immunizations: patientHealthSummary.immunizations.filter((item) => item.id !== idOrFallback),
      });
    }

    if (type === 'familyHistory') {
      await saveStructuredSummary({
        ...patientHealthSummary,
        familyHistory: patientHealthSummary.familyHistory.filter((item) => item.id !== idOrFallback),
      });
    }
  };

  const submitSummaryEditor = async () => {
    if (!patientHealthSummary || !summaryEditor) return;

    if (summaryEditor === 'allergy' && allergyForm.name.trim()) {
      await saveStructuredSummary({
        ...patientHealthSummary,
        allergies: [
          ...(patientHealthSummary.allergies || []),
          { ...allergyForm, id: crypto.randomUUID() },
        ],
      });
    }

    if (summaryEditor === 'blood-contact') {
      const nextContacts =
        emergencyContactForm.name.trim() && emergencyContactForm.phone.trim()
          ? [
              ...(patientHealthSummary.emergencyContacts || []),
              { ...emergencyContactForm, id: crypto.randomUUID() },
            ]
          : patientHealthSummary.emergencyContacts || [];

      await saveStructuredSummary({
        ...patientHealthSummary,
        bloodType: bloodTypeInput.trim() || null,
        emergencyContacts: nextContacts,
      });
    }

    if (summaryEditor === 'immunization' && immunizationForm.name.trim()) {
      await saveStructuredSummary({
        ...patientHealthSummary,
        immunizations: [
          ...(patientHealthSummary.immunizations || []),
          {
            ...immunizationForm,
            id: crypto.randomUUID(),
            detail: [immunizationForm.dose, immunizationForm.date].filter(Boolean).join(' • '),
          },
        ],
      });
    }

    if (summaryEditor === 'family-history' && familyHistoryForm.relation.trim() && familyHistoryForm.condition.trim()) {
      await saveStructuredSummary({
        ...patientHealthSummary,
        familyHistory: [
          ...(patientHealthSummary.familyHistory || []),
          { ...familyHistoryForm, id: crypto.randomUUID() },
        ],
      });
    }

    if (summaryEditor === 'advance-directives') {
      await saveStructuredSummary({
        ...patientHealthSummary,
        advanceDirectives: {
          dnrStatus: advanceDirectiveForm.dnrStatus.trim(),
          livingWill: advanceDirectiveForm.livingWill.trim(),
        },
      });
    }
  };

  const submitProviderVitals = async () => {
    const currentSummary: ProviderHealthSummary = patientHealthSummary || {
      vitals: [],
      conditions: [],
      allergies: [],
      bloodType: null,
      currentMedications: [],
      emergencyContacts: [],
      advanceDirectives: {},
      immunizations: [],
      familyHistory: [],
      updatedAt: null,
    };

    const nextEntry = {
      recordedAt: vitalEntryForm.recordedAt
        ? new Date(vitalEntryForm.recordedAt).toISOString()
        : new Date().toISOString(),
      ...(vitalEntryForm.systolic && vitalEntryForm.diastolic
        ? {
            type: 'bloodPressure' as const,
            systolic: Number(vitalEntryForm.systolic),
            diastolic: Number(vitalEntryForm.diastolic),
          }
        : {}),
      ...(vitalEntryForm.heartRate ? { heartRate: Number(vitalEntryForm.heartRate) } : {}),
      ...(vitalEntryForm.weight
        ? {
            weight: Number(vitalEntryForm.weight),
            weightUnit: vitalEntryForm.weightUnit,
          }
        : {}),
      ...(vitalEntryForm.bloodSugar ? { bloodSugar: Number(vitalEntryForm.bloodSugar) } : {}),
    };

    const hasValues =
      typeof nextEntry.systolic === 'number' ||
      typeof nextEntry.heartRate === 'number' ||
      typeof nextEntry.weight === 'number' ||
      typeof nextEntry.bloodSugar === 'number';

    if (!hasValues) return;

    await saveStructuredSummary({
      ...currentSummary,
      vitals: [...(currentSummary.vitals || []), nextEntry],
    });

    setVitalEntryForm({
      systolic: '',
      diastolic: '',
      heartRate: '',
      weight: '',
      weightUnit: 'lbs',
      bloodSugar: '',
      recordedAt: '',
    });
    setShowAddVitalForm(false);
    setShowVitalsModal(true);
  };

  const allSharedVitals = patientHealthSummary?.vitals || [];
  const latestSharedBloodPressure = useMemo(
    () => getLatestProviderVitalForType(allSharedVitals, 'bloodPressure') || null,
    [allSharedVitals]
  );
  const latestSharedHeartRate = useMemo(
    () => getLatestProviderVitalForType(allSharedVitals, 'heartRate') || null,
    [allSharedVitals]
  );
  const latestSharedWeight = useMemo(
    () => getLatestProviderVitalForType(allSharedVitals, 'weight') || null,
    [allSharedVitals]
  );
  const latestSharedBloodSugar = useMemo(
    () => getLatestProviderVitalForType(allSharedVitals, 'bloodSugar') || null,
    [allSharedVitals]
  );
  const latestSharedVitalAt = useMemo(() => {
    const latest = allSharedVitals
      .slice()
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
    return latest?.recordedAt || null;
  }, [allSharedVitals]);
  const providerWeightUnit: WeightUnit = (latestSharedWeight?.weightUnit as WeightUnit | undefined) || 'lbs';
  const providerVitalSections = useMemo(() => {
    const makeSection = (key: ProviderVitalType, label: string, latestLabel: string) => {
      const allEntries = getProviderVitalsForType(allSharedVitals, key, 'asc');
      const entries = filterVitalsByRange(allEntries, vitalRange);
      const historyDescAll = getProviderVitalsForType(allSharedVitals, key, 'desc');
      return {
        key,
        label,
        latest: latestLabel,
        values: entries.map((entry) => getProviderVitalNumericValue(entry, key, providerWeightUnit)),
        labels: buildTrendLabels(entries.map((entry) => entry.recordedAt), vitalRange),
        logs: groupVitalLogs(
          historyDescAll.map((entry) => {
            if (key === 'bloodPressure') {
              return { date: entry.recordedAt, value: `${entry.systolic ?? '—'}/${entry.diastolic ?? '—'} mmHg` };
            }
            if (key === 'heartRate') {
              return { date: entry.recordedAt, value: `${entry.heartRate ?? '—'} bpm` };
            }
            if (key === 'weight') {
              return {
                date: entry.recordedAt,
                value: formatWeight(
                  convertWeight(entry.weight ?? 0, (entry.weightUnit as WeightUnit | undefined) || 'lbs', providerWeightUnit),
                  providerWeightUnit
                ),
              };
            }
            return { date: entry.recordedAt, value: `${entry.bloodSugar ?? '—'} mg/dL` };
          })
        ),
      };
    };
    return [
      makeSection(
        'bloodPressure',
        'Blood Pressure',
        latestSharedBloodPressure ? `${latestSharedBloodPressure.systolic ?? '—'}/${latestSharedBloodPressure.diastolic ?? '—'} mmHg` : '—'
      ),
      makeSection(
        'heartRate',
        'Heart Rate',
        latestSharedHeartRate && typeof latestSharedHeartRate.heartRate === 'number' ? `${latestSharedHeartRate.heartRate} bpm` : '—'
      ),
      makeSection(
        'weight',
        'Weight',
        latestSharedWeight && typeof latestSharedWeight.weight === 'number'
          ? formatWeight(
              convertWeight(
                latestSharedWeight.weight,
                (latestSharedWeight.weightUnit as WeightUnit | undefined) || 'lbs',
                providerWeightUnit
              ),
              providerWeightUnit
            )
          : '—'
      ),
      makeSection(
        'bloodSugar',
        'Blood Sugar',
        latestSharedBloodSugar && typeof latestSharedBloodSugar.bloodSugar === 'number' ? `${latestSharedBloodSugar.bloodSugar} mg/dL` : '—'
      ),
    ];
  }, [allSharedVitals, latestSharedBloodPressure, latestSharedHeartRate, latestSharedWeight, latestSharedBloodSugar, providerWeightUnit, vitalRange]);
  const activeConditions = useMemo(
    () => patientConditions.filter((condition) => condition.isActive !== false),
    [patientConditions]
  );
  const pastConditions = useMemo(
    () => patientConditions.filter((condition) => condition.isActive === false),
    [patientConditions]
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

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row">
              {patient.photo ? (
                <img src={patient.photo} alt={displayName} className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                  {initials(displayName) || 'P'}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                      <Badge variant={patient.status === 'Active' ? 'success' : 'secondary'}>{patient.status}</Badge>
                    </div>
                    <p className="text-gray-600 mt-1">{patient.patientId}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Button size="sm" className="gap-2" onClick={() => onNavigate("messages", { patientId: patient.id })}>
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="min-w-0 rounded-xl border border-gray-200 p-4">
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
                        <div className="min-w-0">
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="font-medium text-gray-900 break-words">{displayAddress || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 rounded-xl border border-gray-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Care Snapshot</p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Last visit</p>
                        <p className="mt-1 font-medium text-gray-900">{lastVisit ? formatDate(lastVisit) : '—'}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Next appointment</p>
                        <p className="mt-1 font-medium text-gray-900 break-words">
                          {nextAppointment ? formatDateTime(nextAppointment.startTime) : 'None scheduled'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Insurance</p>
                        <p className="mt-1 font-medium text-gray-900 break-words">{insuranceSnapshot}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
      </Card>

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
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Vitals and Trends
                  </CardTitle>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setShowVitalsModal(true);
                      setShowAddVitalForm(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Add Vitals
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {latestSharedBloodPressure || latestSharedHeartRate || latestSharedWeight || latestSharedBloodSugar ? (
                  <button
                    type="button"
                    onClick={() => setShowVitalsModal(true)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-blue-300"
                  >
                    <p className="text-sm text-gray-600">Latest shared vitals</p>
                    <div className="mt-2 space-y-1 text-sm text-gray-900">
                      <p>Blood pressure: {latestSharedBloodPressure ? `${latestSharedBloodPressure.systolic ?? '—'}/${latestSharedBloodPressure.diastolic ?? '—'} mmHg` : '—'}</p>
                      <p>Heart rate: {latestSharedHeartRate && typeof latestSharedHeartRate.heartRate === 'number' ? `${latestSharedHeartRate.heartRate} bpm` : '—'}</p>
                      <p>
                        Weight:{' '}
                        {latestSharedWeight && typeof latestSharedWeight.weight === 'number'
                          ? formatWeight(
                              convertWeight(
                                latestSharedWeight.weight,
                                (latestSharedWeight.weightUnit as WeightUnit | undefined) || 'lbs',
                                providerWeightUnit
                              ),
                              providerWeightUnit
                            )
                          : '—'}
                      </p>
                      <p>Blood sugar: {latestSharedBloodSugar && typeof latestSharedBloodSugar.bloodSugar === 'number' ? `${latestSharedBloodSugar.bloodSugar} mg/dL` : '—'}</p>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Logged {formatDateTime(latestSharedVitalAt)}</p>
                    <p className="mt-3 text-xs font-medium text-blue-700">View all trends and logs</p>
                  </button>
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
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                    Allergies & Sensitivities
                  </CardTitle>
                  <Button size="sm" className="gap-2" onClick={() => openSummaryEditor('allergy')}>
                    <Plus className="w-4 h-4" />
                    Add Allergy
                  </Button>
                </div>
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
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline">{item.severity}</Badge>
                            <button
                              type="button"
                              onClick={() => removeSummaryItem('allergies', item.id)}
                              className="text-xs text-red-600"
                            >
                              Remove
                            </button>
                          </div>
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
                    {activeConditions.map((item) => (
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
                            {item.sourceType === 'provider' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteCondition(item.id)}
                                className="gap-2 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </Button>
                            ) : null}
                            <Button variant="outline" size="sm" onClick={() => markConditionInactive(item.id)}>
                              Mark Inactive
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pastConditions.length > 0 ? (
                      <div className="pt-2">
                        <h4 className="text-sm text-gray-500 mb-3">Past Conditions</h4>
                        <div className="space-y-3">
                          {pastConditions.map((item) => (
                            <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 opacity-80">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-gray-900">{item.name}</p>
                                    <Badge className="bg-gray-200 text-gray-700 border-0">Inactive</Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{item.status}</p>
                                  <p className="text-xs text-gray-500 mt-1">Diagnosed: {formatConditionDate(item.diagnosed)}</p>
                                  {item.metric ? <p className="text-xs text-gray-500 mt-1">{item.metric}</p> : null}
                                  {item.provider ? <p className="text-xs text-gray-500 mt-1">Provider: {item.provider}</p> : null}
                                  {item.notes ? <p className="text-xs text-gray-500 mt-1">{item.notes}</p> : null}
                                  {item.hospitalName ? <p className="text-xs text-gray-500 mt-1">{item.hospitalName}</p> : null}
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Button variant="outline" size="sm" onClick={() => restoreCondition(item.id)}>
                                    Restore
                                  </Button>
                                  {item.sourceType === 'provider' ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => deleteCondition(item.id)}
                                      className="gap-2 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
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
                {adherenceAlerts.length ? (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 text-amber-700" />
                      <div className="min-w-0">
                        <p className="font-medium text-amber-900">Adherence alerts need provider review</p>
                        <p className="mt-1 text-sm text-amber-800">
                          {adherenceAlerts.length === 1
                            ? 'One active medication has a missed or skipped patient intake log.'
                            : `${adherenceAlerts.length} active medications have missed or skipped patient intake logs.`}
                        </p>
                        <div className="mt-3 space-y-2">
                          {adherenceAlerts.slice(0, 3).map((medication) => (
                            <div
                              key={medication.id}
                              className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900">{medication.name}</p>
                                <p className="text-xs text-gray-600">
                                  {intakeStatusLabel(medication.lastIntakeStatus)} on {formatDate(medication.lastIntakeDate)}
                                </p>
                                {medication.recentIntakeLogs[0]?.note ? (
                                  <p className="mt-1 text-xs text-gray-500">
                                    Latest note: {medication.recentIntakeLogs[0].note}
                                  </p>
                                ) : null}
                              </div>
                              <Badge className={`${intakeStatusBadge(medication.lastIntakeStatus).className} border-0`}>
                                {intakeStatusBadge(medication.lastIntakeStatus).label}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                {refillAlerts.length ? (
                  <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
                    <div className="flex items-start gap-3">
                      <RefreshCw className="mt-0.5 h-5 w-5 text-sky-700" />
                      <div className="min-w-0">
                        <p className="font-medium text-sky-900">Refill requests are waiting for review</p>
                        <p className="mt-1 text-sm text-sky-800">
                          {refillAlerts.length === 1
                            ? 'One active medication has a patient refill request.'
                            : `${refillAlerts.length} active medications have patient refill requests.`}
                        </p>
                        <div className="mt-3 space-y-2">
                          {refillAlerts.slice(0, 3).map((medication) => (
                            <div
                              key={medication.id}
                              className="flex items-start justify-between gap-3 rounded-lg border border-sky-200 bg-white px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900">{medication.name}</p>
                                <p className="text-xs text-gray-600">
                                  Requested on {formatDateTime(medication.latestRefillRequestCreatedAt || medication.lastRefillRequestedAt)}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Refills remaining: {medication.refillsRemaining ?? '—'}
                                </p>
                                {medication.latestRefillRequestNote ? (
                                  <p className="mt-1 text-xs text-gray-500">
                                    Patient note: {medication.latestRefillRequestNote}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={`${refillRequestBadge(medication.latestRefillRequestStatus).className} border-0`}>
                                  {refillRequestBadge(medication.latestRefillRequestStatus).label}
                                </Badge>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => resolveRefillRequest(medication, 'approved')}
                                    disabled={resolvingRefillRequestId === medication.latestRefillRequestId}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => resolveRefillRequest(medication, 'denied')}
                                    disabled={resolvingRefillRequestId === medication.latestRefillRequestId}
                                  >
                                    Deny
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                {activeMedications.length ? (
                  <div className="space-y-3">
                    {activeMedications.map((medication) => (
                      <div
                        key={medication.id}
                        className={`rounded-xl border p-4 ${
                          medication.lastIntakeStatus === 'missed' || medication.lastIntakeStatus === 'skipped'
                            ? intakeStatusBadge(medication.lastIntakeStatus).cardClassName
                            : medication.lastRefillRequestedAt
                            ? refillRequestBadge(medication.lastRefillRequestedAt).cardClassName
                            : intakeStatusBadge(medication.lastIntakeStatus).cardClassName
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-900">{medication.name}</p>
                              <Badge className={`${medication.sourceType === 'provider' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'} border-0`}>
                                {medication.sourceType === 'provider' ? 'Provider-prescribed' : 'Patient-added'}
                              </Badge>
                              <Badge className={`${intakeStatusBadge(medication.lastIntakeStatus).className} border-0`}>
                                {intakeStatusBadge(medication.lastIntakeStatus).label}
                              </Badge>
                              {medication.latestRefillRequestStatus ? (
                                <Badge className={`${refillRequestBadge(medication.latestRefillRequestStatus).className} border-0`}>
                                  {refillRequestBadge(medication.latestRefillRequestStatus).label}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{[medication.dosage, medication.frequency].filter(Boolean).join(' • ') || 'Details pending'}</p>
                            <p className="text-xs text-gray-500 mt-1">{medication.prescriberName}</p>
                            {medication.hospitalName ? <p className="text-xs text-gray-500 mt-1">{medication.hospitalName}</p> : null}
                            {medication.purpose ? <p className="text-xs text-gray-500 mt-1">Purpose: {medication.purpose}</p> : null}
                            <p className="text-xs text-gray-600 mt-2">
                              Latest intake: {intakeStatusLabel(medication.lastIntakeStatus)}
                              {medication.lastIntakeDate ? ` on ${formatDate(medication.lastIntakeDate)}` : ''}
                            </p>
                            {medication.latestRefillRequestStatus === 'open' ? (
                              <p className="text-xs text-sky-700 mt-1">
                                Refill requested on {formatDateTime(medication.latestRefillRequestCreatedAt || medication.lastRefillRequestedAt)}
                              </p>
                            ) : null}
                            {medication.latestRefillRequestStatus === 'approved' ? (
                              <p className="text-xs text-emerald-700 mt-1">
                                Refill approved {medication.latestRefillRequestResolvedAt ? `on ${formatDateTime(medication.latestRefillRequestResolvedAt)}` : ''}
                              </p>
                            ) : null}
                            {medication.latestRefillRequestStatus === 'denied' ? (
                              <p className="text-xs text-rose-700 mt-1">
                                Refill denied {medication.latestRefillRequestResolvedAt ? `on ${formatDateTime(medication.latestRefillRequestResolvedAt)}` : ''}
                              </p>
                            ) : null}
                            {medication.latestRefillRequestResolutionNote ? (
                              <p className="text-xs text-gray-500 mt-1">
                                Resolution note: {medication.latestRefillRequestResolutionNote}
                              </p>
                            ) : null}
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
                            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Recent Patient Intake Logs</p>
                            <div className="space-y-2">
                              {medication.recentIntakeLogs.slice(0, 3).map((log) => (
                                <div key={log.id} className="flex items-start justify-between gap-3 text-xs text-gray-600">
                                  <span>{formatDate(log.loggedForDate)}</span>
                                  <span>
                                    <Badge className={`${intakeStatusBadge(log.status).className} border-0 text-[10px]`}>
                                      {intakeStatusBadge(log.status).label}
                                    </Badge>
                                  </span>
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
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                    Blood Type
                  </CardTitle>
                  <Button size="sm" className="gap-2" onClick={() => openSummaryEditor('blood-contact')}>
                    <Plus className="w-4 h-4" />
                    Update
                  </Button>
                </div>
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
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">{contact.name}</p>
                            <p className="text-sm text-gray-600 mt-1">{contact.relationship}</p>
                            <p className="text-sm text-gray-600 mt-1">{contact.phone}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSummaryItem('emergencyContacts', contact.id || `${contact.name}-${contact.phone}`)}
                            className="text-xs text-red-600"
                          >
                            Remove
                          </button>
                        </div>
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
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                    Emergency Contacts
                  </CardTitle>
                  <Button size="sm" className="gap-2" onClick={() => openSummaryEditor('blood-contact')}>
                    <Plus className="w-4 h-4" />
                    Add Contact
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {patientHealthSummary?.emergencyContacts?.length ? (
                  <div className="space-y-3">
                    {patientHealthSummary.emergencyContacts.map((contact, index) => (
                      <div key={`${contact.name}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">{contact.name}</p>
                            <p className="text-sm text-gray-600 mt-1">{contact.relationship}</p>
                            <p className="text-sm text-gray-600 mt-1">{contact.phone}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSummaryItem('emergencyContacts', contact.id || `${contact.name}-${contact.phone}`)}
                            className="text-xs text-red-600"
                          >
                            Remove
                          </button>
                        </div>
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
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Syringe className="w-5 h-5 text-green-600" />
                    Immunization Record
                  </CardTitle>
                  <Button size="sm" className="gap-2" onClick={() => openSummaryEditor('immunization')}>
                    <Plus className="w-4 h-4" />
                    Add Immunization
                  </Button>
                </div>
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
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="secondary">{item.status}</Badge>
                            <button
                              type="button"
                              onClick={() => removeSummaryItem('immunizations', item.id)}
                              className="text-xs text-red-600"
                            >
                              Remove
                            </button>
                          </div>
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
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Family Health History
                  </CardTitle>
                  <Button size="sm" className="gap-2" onClick={() => openSummaryEditor('family-history')}>
                    <Plus className="w-4 h-4" />
                    Add History
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {patientHealthSummary?.familyHistory?.length ? (
                  <div className="space-y-3">
                    {patientHealthSummary.familyHistory.map((item) => (
                      <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-gray-900">{item.condition}</p>
                            <p className="text-xs text-gray-500 mt-1">{item.relation}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSummaryItem('familyHistory', item.id)}
                            className="text-xs text-red-600"
                          >
                            Remove
                          </button>
                        </div>
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
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock3 className="w-5 h-5 text-gray-600" />
                    Advance Directives
                  </CardTitle>
                  <Button size="sm" className="gap-2" onClick={() => openSummaryEditor('advance-directives')}>
                    <Plus className="w-4 h-4" />
                    Update
                  </Button>
                </div>
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
                .map((appointment) => {
                  return (
                    <Card
                      key={appointment.id}
                      className="cursor-pointer transition hover:border-blue-200 hover:bg-blue-50/30"
                      onClick={() => setSelectedAppointment(appointment)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              <p className="font-medium text-gray-900">{formatDateTime(appointment.startTime)}</p>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">{appointment.type || 'Appointment'}</p>
                            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span>{appointment.hospitalName || appointment.providerName || 'Provider location'}</span>
                            </div>
                            {appointment.notes ? (
                              <p className="mt-3 text-sm text-gray-500">{appointment.notes}</p>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            <Badge variant="outline">{appointment.status}</Badge>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedAppointment(appointment);
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>

          {selectedAppointment ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Date & Time</p>
                <p className="mt-1 font-medium text-gray-900">
                  {formatDateTime(selectedAppointment.startTime)}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Visit Mode</p>
                  <p className="mt-1 font-medium capitalize text-gray-900">
                    {String(selectedAppointment.type || 'Appointment').replace('-', ' ')}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="mt-2">
                    <Badge variant="outline">{selectedAppointment.status}</Badge>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Location</p>
                <p className="mt-1 font-medium text-gray-900">
                  {selectedAppointment.hospitalName || selectedAppointment.providerName || 'Provider location'}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Notes</p>
                <p className="mt-1 text-sm leading-6 text-gray-900">
                  {selectedAppointment.notes?.trim() || 'No notes were added for this appointment.'}
                </p>
              </div>

              <Button type="button" onClick={() => setSelectedAppointment(null)} className="w-full">
                Close
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

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
              <CardTitle className="text-lg">Shared Clinical Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Allergies</p>
                {emergency.allergies.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {emergency.allergies.map((item, index) => (
                      <p key={`${item}-${index}`} className="text-sm font-medium text-gray-900">
                        {item}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">None shared</p>
                )}
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Medical Conditions</p>
                {emergency.medicalConditions.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {emergency.medicalConditions.map((item, index) => (
                      <p key={`${item}-${index}`} className="text-sm font-medium text-gray-900">
                        {item}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">None shared</p>
                )}
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Current Medications</p>
                {emergency.currentMedications.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {emergency.currentMedications.map((item, index) => (
                      <p key={`${item}-${index}`} className="text-sm font-medium text-gray-900">
                        {item}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">None shared</p>
                )}
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

      {showVitalsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-5 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-900 text-lg">Shared Vital Trends</h3>
                <p className="text-sm text-gray-500">Patient-reported vital history and trend view</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowAddVitalForm((current) => !current)}
                >
                  <Plus className="w-4 h-4" />
                  {showAddVitalForm ? 'Hide Form' : 'Add Vitals'}
                </Button>
                <button type="button" onClick={() => setShowVitalsModal(false)} className="text-sm text-gray-500">
                  Close
                </button>
              </div>
            </div>
            {showAddVitalForm ? (
              <div className="rounded-2xl border border-gray-200 p-4 space-y-4">
                <div>
                  <h4 className="text-gray-900 font-medium">Log provider-checked vitals</h4>
                  <p className="text-sm text-gray-500 mt-1">Add any values measured during a visit or hospital check.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="Systolic"
                    value={vitalEntryForm.systolic}
                    onChange={(e) => setVitalEntryForm((current) => ({ ...current, systolic: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="Diastolic"
                    value={vitalEntryForm.diastolic}
                    onChange={(e) => setVitalEntryForm((current) => ({ ...current, diastolic: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="Heart rate (bpm)"
                    value={vitalEntryForm.heartRate}
                    onChange={(e) => setVitalEntryForm((current) => ({ ...current, heartRate: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="Weight"
                    value={vitalEntryForm.weight}
                    onChange={(e) => setVitalEntryForm((current) => ({ ...current, weight: e.target.value }))}
                  />
                  <select
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    value={vitalEntryForm.weightUnit}
                    onChange={(e) => setVitalEntryForm((current) => ({ ...current, weightUnit: e.target.value as WeightUnit }))}
                  >
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="Blood sugar (mg/dL)"
                    value={vitalEntryForm.bloodSugar}
                    onChange={(e) => setVitalEntryForm((current) => ({ ...current, bloodSugar: e.target.value }))}
                  />
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    value={vitalEntryForm.recordedAt}
                    onChange={(e) => setVitalEntryForm((current) => ({ ...current, recordedAt: e.target.value }))}
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowAddVitalForm(false)}>
                    Cancel
                  </Button>
                  <Button className="gap-2" onClick={submitProviderVitals}>
                    <Plus className="w-4 h-4" />
                    Save Vitals
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {vitalRangeOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setVitalRange(option.key)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    vitalRange === option.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {providerVitalSections.map((section) => (
                <div key={section.key} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm text-gray-500">{section.label}</p>
                      <p className="text-lg font-semibold text-gray-900">{section.latest}</p>
                    </div>
                      <p className="text-xs text-gray-500">{latestSharedVitalAt ? `Latest: ${formatDateTime(latestSharedVitalAt)}` : 'No logs yet'}</p>
                  </div>
                  <TrendChart
                    values={section.values}
                    labels={section.labels}
                  />
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {section.logs.length > 0 ? (
                      section.logs.map((group) => (
                        <div key={`${section.key}-${group.label}`} className="space-y-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedProviderVitalGroups((current) => ({
                                ...current,
                                [`${section.key}-${group.label}`]: !current[`${section.key}-${group.label}`],
                              }))
                            }
                            className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-left"
                          >
                            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{group.label}</span>
                            <span className="text-xs text-gray-500">
                              {group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}
                            </span>
                          </button>
                          {expandedProviderVitalGroups[`${section.key}-${group.label}`] ? (
                            group.items.map((log, index) => (
                              <div key={`${section.key}-${group.label}-${log.date}-${index}`} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                                <span className="text-sm text-gray-900">{log.value}</span>
                                <span className="text-xs text-gray-500">{formatDateTime(log.date)}</span>
                              </div>
                            ))
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-500">
                        No shared logs yet.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
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

      {summaryEditor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900">
                {summaryEditor === 'allergy'
                  ? 'Add Allergy'
                  : summaryEditor === 'blood-contact'
                  ? 'Update Blood Type & Emergency Contacts'
                  : summaryEditor === 'immunization'
                  ? 'Add Immunization'
                  : summaryEditor === 'family-history'
                  ? 'Add Family History'
                  : 'Update Advance Directives'}
              </h3>
              <button type="button" onClick={() => setSummaryEditor(null)} className="text-sm text-gray-500">
                Close
              </button>
            </div>

            {summaryEditor === 'allergy' && (
              <div className="space-y-3">
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Allergy"
                  value={allergyForm.name}
                  onChange={(e) => setAllergyForm({ ...allergyForm, name: e.target.value })}
                />
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={allergyForm.severity}
                  onChange={(e) => setAllergyForm({ ...allergyForm, severity: e.target.value as ProviderHealthSummaryAllergy['severity'] })}
                >
                  <option value="MILD">Mild</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="SEVERE">Severe</option>
                </select>
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Reaction"
                  value={allergyForm.reaction}
                  onChange={(e) => setAllergyForm({ ...allergyForm, reaction: e.target.value })}
                />
              </div>
            )}

            {summaryEditor === 'blood-contact' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Blood Type</p>
                  <select
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    value={bloodTypeInput}
                    onChange={(e) => setBloodTypeInput(e.target.value)}
                  >
                    <option value="">Select blood type</option>
                    {bloodTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Add Emergency Contact</p>
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="Full name"
                    value={emergencyContactForm.name}
                    onChange={(e) => setEmergencyContactForm({ ...emergencyContactForm, name: e.target.value })}
                  />
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="Relationship"
                    value={emergencyContactForm.relationship}
                    onChange={(e) => setEmergencyContactForm({ ...emergencyContactForm, relationship: e.target.value })}
                  />
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="Phone number"
                    value={emergencyContactForm.phone}
                    onChange={(e) => setEmergencyContactForm({ ...emergencyContactForm, phone: e.target.value })}
                  />
                </div>
              </div>
            )}

            {summaryEditor === 'immunization' && (
              <div className="space-y-3">
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Immunization name"
                  value={immunizationForm.name}
                  onChange={(e) => setImmunizationForm({ ...immunizationForm, name: e.target.value })}
                />
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Dose"
                  value={immunizationForm.dose || ''}
                  onChange={(e) => setImmunizationForm({ ...immunizationForm, dose: e.target.value })}
                />
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={immunizationForm.date || ''}
                  onChange={(e) => setImmunizationForm({ ...immunizationForm, date: e.target.value })}
                />
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={immunizationForm.status}
                  onChange={(e) => setImmunizationForm({ ...immunizationForm, status: e.target.value })}
                >
                  {immunizationStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {summaryEditor === 'family-history' && (
              <div className="space-y-3">
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Relationship"
                  value={familyHistoryForm.relation}
                  onChange={(e) => setFamilyHistoryForm({ ...familyHistoryForm, relation: e.target.value })}
                />
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Condition"
                  value={familyHistoryForm.condition}
                  onChange={(e) => setFamilyHistoryForm({ ...familyHistoryForm, condition: e.target.value })}
                />
              </div>
            )}

            {summaryEditor === 'advance-directives' && (
              <div className="space-y-3">
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="DNR status"
                  value={advanceDirectiveForm.dnrStatus}
                  onChange={(e) => setAdvanceDirectiveForm({ ...advanceDirectiveForm, dnrStatus: e.target.value })}
                />
                <textarea
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 min-h-[120px]"
                  placeholder="Living will or responder instructions"
                  value={advanceDirectiveForm.livingWill}
                  onChange={(e) => setAdvanceDirectiveForm({ ...advanceDirectiveForm, livingWill: e.target.value })}
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSummaryEditor(null)}>
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={submitSummaryEditor}>
                <Plus className="w-4 h-4" />
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
