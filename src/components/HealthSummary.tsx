import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Droplet,
  Heart,
  Scale,
  ChevronRight,
  Download,
  Share2,
  Edit3,
  Plus,
  Syringe,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { API_BASE } from '@/config/api';
import {
  api,
  type PatientAppointment,
  type HealthSummaryPayload,
  type HealthSummaryCondition,
  type HealthSummaryAllergy,
  type HealthSummaryImmunization,
  type HealthSummaryFamilyHistory,
  type HealthSummaryEmergencyContact,
} from '@/lib/api';

interface HealthSummaryProps {
  onBack: () => void;
  onOpenMedications?: () => void;
}

type ProfileResponse = {
  patient_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  health_card: string | null;
  phone_number: string | null;
  blood_type?: string | null;
  allergies?: string | null;
  medical_conditions?: string | null;
  current_medications?: string | null;
  emergency_contact_full_name?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_contact_phone?: string | null;
  dnr_status?: string | null;
  living_will?: string | null;
  emergency_updated_at?: string | null;
  emergency_created_at?: string | null;
};

type VitalType = 'bloodPressure' | 'heartRate' | 'weight' | 'bloodSugar' | null;
type WeightUnit = 'lbs' | 'kg';
type VitalRange = '1w' | '1m' | '6m' | '1y' | '2y' | '3y' | '4y' | '5y';
type VitalEntryMode = 'current' | 'past';
type EditorType =
  | 'allergies'
  | 'immunizations'
  | 'familyHistory'
  | 'bloodType'
  | 'emergencyContacts'
  | 'advanceDirectives'
  | null;

const immunizationOptions = [
  'COVID-19',
  'Flu Shot',
  'Tetanus',
  'Hepatitis B',
  'HPV',
  'MMR',
  'Polio',
  'Varicella',
  'Pneumococcal',
  'Shingles',
  'Other',
] as const;

const immunizationStatusOptions = [
  'Up to date',
  'Due Soon',
  'Scheduled',
  'Overdue',
  'Completed',
] as const;

const conditionStatusOptions = [
  'Active',
  'Managed',
  'Well Controlled',
  'Monitoring',
  'Stable',
  'Resolved',
  'Inactive',
] as const;

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

const parseList = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  const raw = String(value).trim();
  if (!raw) return [];
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {
      // fall back
    }
  }
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatConditionDate = (value?: string | null) => {
  if (!value) return 'Not recorded';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(value) : value;
};

const toLbs = (weight: number, unit: WeightUnit = 'lbs') => (unit === 'kg' ? weight * 2.20462 : weight);
const fromLbs = (weight: number, unit: WeightUnit = 'lbs') => (unit === 'kg' ? weight / 2.20462 : weight);
const convertWeight = (weight: number, from: WeightUnit = 'lbs', to: WeightUnit = 'lbs') =>
  from === to ? weight : fromLbs(toLbs(weight, from), to);

const formatWeight = (weight: number, unit: WeightUnit = 'lbs') =>
  `${Number(weight.toFixed(unit === 'kg' ? 1 : 0))} ${unit}`;

const getVitalsForType = (
  vitals: HealthSummaryPayload['vitals'],
  type: Exclude<VitalType, null>,
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

const getLatestVitalForType = (vitals: HealthSummaryPayload['vitals'], type: Exclude<VitalType, null>) =>
  getVitalsForType(vitals, type, 'desc')[0];

const getPreviousVitalForType = (vitals: HealthSummaryPayload['vitals'], type: Exclude<VitalType, null>) =>
  getVitalsForType(vitals, type, 'desc')[1];

const getVitalNumericValue = (
  entry: HealthSummaryPayload['vitals'][number],
  type: Exclude<VitalType, null>,
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
  color = '#0f766e',
}: {
  values: number[];
  labels?: string[];
  color?: string;
}) {
  if (values.length === 0) {
    return <div className="h-24 rounded-xl bg-gray-50 border border-dashed border-gray-200" />;
  }

  const width = 280;
  const height = 110;
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
        <div className="flex h-[88px] w-11 flex-col justify-between text-[10px] leading-none text-gray-500">
          {yLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[88px] w-full">
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
            return <circle key={`${point}-${index}`} cx={cx} cy={cy} r="3.5" fill={color} />;
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

const latestProfileDate = (profile: ProfileResponse | null, summary: HealthSummaryPayload | null) =>
  formatDateTime(summary?.updatedAt || profile?.emergency_updated_at || profile?.emergency_created_at);

const createId = () => Math.random().toString(36).slice(2, 10);

const emptySummary = (): HealthSummaryPayload => ({
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
});

const bloodPressureStatus = (systolic: number, diastolic: number) => {
  if (systolic < 120 && diastolic < 80) return 'normal';
  if (systolic < 130 && diastolic < 80) return 'elevated';
  if (systolic < 140 || diastolic < 90) return 'above normal';
  return 'high';
};

const heartRateStatus = (value: number, previous?: number) => {
  if (previous && value < previous) return 'improved';
  if (value >= 60 && value <= 100) return 'normal';
  return value > 100 ? 'above normal' : 'below normal';
};

const bloodSugarStatus = (value: number) => {
  if (value < 70) return 'low';
  if (value <= 99) return 'normal';
  if (value <= 125) return 'elevated';
  return 'high';
};

const weightDelta = (current: number, previous?: number) => {
  if (!previous || previous === 0) return { label: 'stable', value: '0%' };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.1) return { label: 'stable', value: '0%' };
  return { label: pct > 0 ? 'increase' : 'decrease', value: `${Math.abs(pct).toFixed(1)}%` };
};

const severityColor = (severity: HealthSummaryAllergy['severity']) => {
  if (severity === 'SEVERE') return 'bg-red-100 text-red-700';
  if (severity === 'MODERATE') return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
};

const emptyCondition = (): HealthSummaryCondition => ({
  id: createId(),
  name: '',
  status: '',
  diagnosed: '',
  metric: '',
  provider: '',
  notes: '',
  sourceType: 'patient',
  verificationStatus: 'patient_noted',
  isActive: true,
});
const emptyAllergy = (): HealthSummaryAllergy => ({ id: createId(), name: '', severity: 'MODERATE', reaction: '' });
const emptyImmunization = (): HealthSummaryImmunization => ({ id: createId(), name: '', detail: '', dose: '', date: '', status: 'Up to date' });
const emptyFamilyHistory = (): HealthSummaryFamilyHistory => ({ id: createId(), relation: '', condition: '' });
const emptyEmergencyContact = (): HealthSummaryEmergencyContact => ({ id: createId(), name: '', relationship: '', phone: '' });
const initials = (firstName?: string | null, lastName?: string | null) =>
  `${firstName?.trim()?.[0] || ''}${lastName?.trim()?.[0] || ''}`.toUpperCase() || 'ML';

export default function HealthSummary({ onBack, onOpenMedications }: HealthSummaryProps) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [summary, setSummary] = useState<HealthSummaryPayload | null>(null);
  const [conditions, setConditions] = useState<HealthSummaryCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [editingVital, setEditingVital] = useState<VitalType>(null);
  const [vitalEntryMode, setVitalEntryMode] = useState<VitalEntryMode>('current');
  const [pastVitalDate, setPastVitalDate] = useState('');
  const [selectedVital, setSelectedVital] = useState<VitalType>(null);
  const [selectedVitalRange, setSelectedVitalRange] = useState<VitalRange>('1y');
  const [expandedVitalGroups, setExpandedVitalGroups] = useState<Record<string, boolean>>({});
  const [editorType, setEditorType] = useState<EditorType>(null);
  const [conditionEditorOpen, setConditionEditorOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState<HealthSummaryCondition | null>(null);
  const [conditionRequestOpen, setConditionRequestOpen] = useState(false);
  const [requestingCondition, setRequestingCondition] = useState<HealthSummaryCondition | null>(null);
  const [conditionRequestMessage, setConditionRequestMessage] = useState('');
  const [conditionEditorError, setConditionEditorError] = useState<string | null>(null);
  const [vitalForm, setVitalForm] = useState({
    systolic: '120',
    diastolic: '80',
    heartRate: '72',
    weight: '165',
    weightUnit: 'lbs' as WeightUnit,
    bloodSugar: '95',
  });
  const [conditionForm, setConditionForm] = useState<HealthSummaryCondition>(emptyCondition());
  const [allergyForm, setAllergyForm] = useState<HealthSummaryAllergy>(emptyAllergy());
  const [immunizationForm, setImmunizationForm] = useState<HealthSummaryImmunization>(emptyImmunization());
  const [familyHistoryForm, setFamilyHistoryForm] = useState<HealthSummaryFamilyHistory>(emptyFamilyHistory());
  const [bloodTypeInput, setBloodTypeInput] = useState('');
  const [emergencyContactForm, setEmergencyContactForm] = useState<HealthSummaryEmergencyContact>(emptyEmergencyContact());
  const [advanceDirectiveForm, setAdvanceDirectiveForm] = useState({ dnrStatus: '', livingWill: '' });

  useEffect(() => {
    const patientId = localStorage.getItem('patientId');
    if (!patientId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [profileRes, appointmentsRes, summaryRes, conditionsRes] = await Promise.all([
          fetch(`${API_BASE}/api/patients/${patientId}/profile`).then((res) => (res.ok ? res.json() : null)),
          api.listMyAppointments('all').catch(() => ({ appointments: [] as PatientAppointment[] })),
          api.getMyHealthSummary().catch(() => ({ summary: emptySummary() })),
          api.listMyConditions().catch(() => ({ conditions: [] as HealthSummaryCondition[] })),
        ]);

        if (cancelled) return;
        setProfile(profileRes);
        setAppointments(appointmentsRes.appointments || []);
        setConditions(conditionsRes.conditions || []);

        setSummary(summaryRes.summary || emptySummary());
      } catch (error) {
        console.error('HEALTH SUMMARY LOAD ERROR:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveSummary = async (next: HealthSummaryPayload) => {
    setSummary(next);
    setSaving(true);
    try {
      const saved = await api.updateMyHealthSummary({
        vitals: next.vitals,
        conditions: [],
        allergies: next.allergies,
        bloodType: next.bloodType,
        currentMedications: next.currentMedications,
        emergencyContacts: next.emergencyContacts,
        advanceDirectives: next.advanceDirectives,
        immunizations: next.immunizations,
        familyHistory: next.familyHistory,
      });
      setSummary(saved.summary);
    } catch (error) {
      console.error('Failed to save health summary:', error);
    } finally {
      setSaving(false);
    }
  };

  const medications = summary?.currentMedications || [];

  const lastCheckup = useMemo(() => {
    const pastAppointments = appointments
      .filter((appointment) => new Date(appointment.startTime).getTime() < Date.now())
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return pastAppointments[0]?.startTime || null;
  }, [appointments]);

  const patientName = useMemo(() => {
    const full = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
    return full || 'MediLink Patient';
  }, [profile?.first_name, profile?.last_name]);

  const patientSnapshot = [
    { label: 'Date of Birth', value: formatDate(profile?.dob) },
    { label: 'Health Card', value: profile?.health_card || '—' },
  ];

  const allVitals = summary?.vitals || [];
  const latestBloodPressure = getLatestVitalForType(allVitals, 'bloodPressure');
  const previousBloodPressure = getPreviousVitalForType(allVitals, 'bloodPressure');
  const latestHeartRate = getLatestVitalForType(allVitals, 'heartRate');
  const previousHeartRate = getPreviousVitalForType(allVitals, 'heartRate');
  const latestWeightVital = getLatestVitalForType(allVitals, 'weight');
  const previousWeightVital = getPreviousVitalForType(allVitals, 'weight');
  const latestBloodSugar = getLatestVitalForType(allVitals, 'bloodSugar');
  const previousBloodSugar = getPreviousVitalForType(allVitals, 'bloodSugar');
  const latestWeightUnit: WeightUnit = (latestWeightVital?.weightUnit as WeightUnit | undefined) || 'lbs';
  const latestWeight =
    typeof latestWeightVital?.weight === 'number'
      ? convertWeight(latestWeightVital.weight, (latestWeightVital.weightUnit as WeightUnit | undefined) || 'lbs', latestWeightUnit)
      : 0;
  const previousWeight =
    typeof previousWeightVital?.weight === 'number'
      ? convertWeight(previousWeightVital.weight, (previousWeightVital.weightUnit as WeightUnit | undefined) || 'lbs', latestWeightUnit)
      : undefined;

  const vitals = [
        {
          key: 'bloodPressure' as const,
          label: 'Blood Pressure',
          value: latestBloodPressure ? `${latestBloodPressure.systolic ?? '—'}/${latestBloodPressure.diastolic ?? '—'}` : '—',
          unit: 'mmHg',
          status:
            latestBloodPressure && typeof latestBloodPressure.systolic === 'number' && typeof latestBloodPressure.diastolic === 'number'
              ? bloodPressureStatus(latestBloodPressure.systolic, latestBloodPressure.diastolic)
              : 'no data',
          subtext: latestBloodPressure ? `Latest log: ${formatDate(latestBloodPressure.recordedAt)}` : 'No logs yet',
          icon: Heart,
          color: 'bg-red-100 text-red-600',
        },
        {
          key: 'heartRate' as const,
          label: 'Heart Rate',
          value: latestHeartRate && typeof latestHeartRate.heartRate === 'number' ? String(latestHeartRate.heartRate) : '—',
          unit: 'bpm',
          status:
            latestHeartRate && typeof latestHeartRate.heartRate === 'number'
              ? heartRateStatus(latestHeartRate.heartRate, previousHeartRate?.heartRate)
              : 'no data',
          subtext: `Previous: ${previousHeartRate?.heartRate ?? '—'} bpm`,
          icon: Activity,
          color: 'bg-pink-100 text-pink-600',
        },
        {
          key: 'weight' as const,
          label: 'Weight',
          value: latestWeightVital ? String(Number(latestWeight.toFixed(latestWeightUnit === 'kg' ? 1 : 0))) : '—',
          unit: latestWeightUnit,
          status: latestWeightVital ? `${weightDelta(latestWeight, previousWeight).label} ${weightDelta(latestWeight, previousWeight).value}` : 'no data',
          subtext: `Previous: ${previousWeight ? formatWeight(previousWeight, latestWeightUnit) : '—'}`,
          icon: Scale,
          color: 'bg-purple-100 text-purple-600',
        },
        {
          key: 'bloodSugar' as const,
          label: 'Blood Sugar',
          value: latestBloodSugar && typeof latestBloodSugar.bloodSugar === 'number' ? String(latestBloodSugar.bloodSugar) : '—',
          unit: 'mg/dL',
          status:
            latestBloodSugar && typeof latestBloodSugar.bloodSugar === 'number'
              ? bloodSugarStatus(latestBloodSugar.bloodSugar)
              : 'no data',
          subtext: `Previous: ${previousBloodSugar?.bloodSugar ?? '—'} mg/dL`,
          icon: Droplet,
          color: 'bg-blue-100 text-blue-600',
        },
      ];

  const quickStats = [
    { label: 'Last Checkup', value: loading ? 'Loading…' : formatDate(lastCheckup), action: null },
    { label: 'Active Meds', value: loading ? '—' : String(medications.length), action: onOpenMedications || null },
    {
      label: 'Allergies',
      value: loading ? '—' : summary && summary.allergies.length > 0 ? `${summary.allergies.length} Known` : 'None',
      action: null,
    },
    { label: 'Blood Type', value: loading ? '—' : summary?.bloodType || '—', action: null },
  ];

  const openEditor = (type: EditorType) => {
    setEditorType(type);
    if (type === 'allergies') setAllergyForm(emptyAllergy());
    if (type === 'immunizations') setImmunizationForm(emptyImmunization());
    if (type === 'familyHistory') setFamilyHistoryForm(emptyFamilyHistory());
    if (type === 'bloodType') {
      setBloodTypeInput(summary?.bloodType || '');
    }
    if (type === 'emergencyContacts') setEmergencyContactForm(emptyEmergencyContact());
    if (type === 'advanceDirectives') {
      setAdvanceDirectiveForm({
        dnrStatus: summary?.advanceDirectives?.dnrStatus || '',
        livingWill: summary?.advanceDirectives?.livingWill || '',
      });
    }
  };

  const submitVitals = async () => {
    if (!summary) return;
    if (vitalEntryMode === 'past' && !pastVitalDate) return;
    const nextEntryBase = {
      recordedAt:
        vitalEntryMode === 'past' && pastVitalDate
          ? new Date(`${pastVitalDate}T12:00:00`).toISOString()
          : new Date().toISOString(),
    };
    let nextEntry: HealthSummaryPayload['vitals'][number] | null = null;

    if (editingVital === 'bloodPressure') {
      nextEntry = {
        ...nextEntryBase,
        type: 'bloodPressure',
        systolic: Number(vitalForm.systolic) || 0,
        diastolic: Number(vitalForm.diastolic) || 0,
      };
    }
    if (editingVital === 'heartRate') {
      nextEntry = {
        ...nextEntryBase,
        type: 'heartRate',
        heartRate: Number(vitalForm.heartRate) || 0,
      };
    }
    if (editingVital === 'weight') {
      nextEntry = {
        ...nextEntryBase,
        type: 'weight',
        weight: Number(vitalForm.weight) || 0,
        weightUnit: vitalForm.weightUnit,
      };
    }
    if (editingVital === 'bloodSugar') {
      nextEntry = {
        ...nextEntryBase,
        type: 'bloodSugar',
        bloodSugar: Number(vitalForm.bloodSugar) || 0,
      };
    }
    if (!nextEntry) return;

    const next = {
      ...summary,
      vitals: [
        ...summary.vitals,
        nextEntry,
      ],
    };
    await saveSummary(next);
    setVitalsOpen(false);
    setEditingVital(null);
    setVitalEntryMode('current');
    setPastVitalDate('');
  };

  const openConditionEditor = (condition?: HealthSummaryCondition) => {
    setEditingCondition(condition || null);
    setConditionEditorError(null);
    setConditionForm(
      condition
        ? {
            ...emptyCondition(),
            ...condition,
            diagnosed: /^\d{4}-\d{2}-\d{2}$/.test(condition.diagnosed || '') ? condition.diagnosed : '',
          }
        : emptyCondition()
    );
    setConditionEditorOpen(true);
  };

  const submitConditionEditor = async () => {
    const name = conditionForm.name.trim();
    const status = conditionForm.status.trim();
    const diagnosed = conditionForm.diagnosed.trim();
    const metric = conditionForm.metric.trim();
    const notes = (conditionForm.notes || '').trim();

    if (!name) {
      setConditionEditorError('Condition name is required.');
      return;
    }

    setConditionEditorError(null);
    setSaving(true);
    try {
      if (editingCondition?.id) {
        const res = await api.updateMyCondition(editingCondition.id, {
          name,
          status: status || undefined,
          diagnosed: diagnosed || undefined,
          metric: metric || undefined,
          notes: notes || undefined,
          isActive: true,
        });
        setConditions((current) => current.map((item) => (item.id === editingCondition.id ? res.condition : item)));
      } else {
        const res = await api.createMyCondition({
          name,
          status: status || undefined,
          diagnosed: diagnosed || undefined,
          metric: metric || undefined,
          notes: notes || undefined,
        });
        setConditions((current) => [res.condition, ...current]);
      }
      try {
        const refreshed = await api.getMyHealthSummary();
        setSummary(refreshed.summary);
      } catch {
        // ignore summary refresh failures
      }
      setConditionEditorOpen(false);
      setEditingCondition(null);
      setConditionForm(emptyCondition());
    } catch (error) {
      console.error('Failed to save condition:', error);
      setConditionEditorError(error instanceof Error ? error.message : 'Unable to save this health concern right now.');
    } finally {
      setSaving(false);
    }
  };

  const archiveCondition = async (conditionId: string) => {
    setSaving(true);
    try {
      const res = await api.updateMyCondition(conditionId, { isActive: false });
      setConditions((current) => current.map((item) => (item.id === conditionId ? res.condition : item)));
      try {
        const refreshed = await api.getMyHealthSummary();
        setSummary(refreshed.summary);
      } catch {
        // ignore summary refresh failures
      }
    } catch (error) {
      console.error('Failed to archive condition:', error);
    } finally {
      setSaving(false);
    }
  };

  const restoreCondition = async (conditionId: string) => {
    setSaving(true);
    try {
      const res = await api.updateMyCondition(conditionId, { isActive: true });
      setConditions((current) => current.map((item) => (item.id === conditionId ? res.condition : item)));
      try {
        const refreshed = await api.getMyHealthSummary();
        setSummary(refreshed.summary);
      } catch {
        // ignore summary refresh failures
      }
    } catch (error) {
      console.error('Failed to restore condition:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteCondition = async (conditionId: string) => {
    if (!window.confirm('Delete this health concern permanently?')) return;
    setSaving(true);
    try {
      await api.deleteMyCondition(conditionId);
      setConditions((current) => current.filter((item) => item.id !== conditionId));
      try {
        const refreshed = await api.getMyHealthSummary();
        setSummary(refreshed.summary);
      } catch {
        // ignore summary refresh failures
      }
    } catch (error) {
      console.error('Failed to delete condition:', error);
      setConditionEditorError(error instanceof Error ? error.message : 'Unable to delete this health concern right now.');
    } finally {
      setSaving(false);
    }
  };

  const openConditionRequest = (condition: HealthSummaryCondition) => {
    setRequestingCondition(condition);
    setConditionRequestMessage('');
    setConditionRequestOpen(true);
  };

  const submitConditionRequest = async () => {
    if (!requestingCondition?.id || !conditionRequestMessage.trim()) return;
    setSaving(true);
    try {
      await api.requestConditionChange(requestingCondition.id, {
        message: conditionRequestMessage.trim(),
      });
      setConditionRequestOpen(false);
      setRequestingCondition(null);
      setConditionRequestMessage('');
    } catch (error) {
      console.error('Failed to request condition change:', error);
    } finally {
      setSaving(false);
    }
  };

  const submitEditor = async () => {
    if (!summary || !editorType) return;
    if (editorType === 'allergies' && allergyForm.name.trim()) {
      await saveSummary({ ...summary, allergies: [...summary.allergies, { ...allergyForm, id: createId() }] });
    }
    if (editorType === 'immunizations' && immunizationForm.name.trim()) {
      await saveSummary({ ...summary, immunizations: [...summary.immunizations, { ...immunizationForm, id: createId() }] });
    }
    if (editorType === 'familyHistory' && familyHistoryForm.condition.trim()) {
      await saveSummary({ ...summary, familyHistory: [...summary.familyHistory, { ...familyHistoryForm, id: createId() }] });
    }
    if (editorType === 'bloodType') {
      await saveSummary({
        ...summary,
        bloodType: bloodTypeInput.trim() || null,
      });
    }
    if (editorType === 'emergencyContacts' && emergencyContactForm.name.trim() && emergencyContactForm.phone.trim()) {
      await saveSummary({
        ...summary,
        emergencyContacts: [...summary.emergencyContacts, { ...emergencyContactForm, id: createId() }],
      });
    }
    if (editorType === 'advanceDirectives') {
      await saveSummary({
        ...summary,
        advanceDirectives: {
          dnrStatus: advanceDirectiveForm.dnrStatus.trim(),
          livingWill: advanceDirectiveForm.livingWill.trim(),
        },
      });
    }
    setEditorType(null);
  };

  const removeItem = async (type: Exclude<EditorType, null>, id: string) => {
    if (!summary) return;
    if (type === 'allergies') await saveSummary({ ...summary, allergies: summary.allergies.filter((item) => item.id !== id) });
    if (type === 'immunizations') await saveSummary({ ...summary, immunizations: summary.immunizations.filter((item) => item.id !== id) });
    if (type === 'familyHistory') await saveSummary({ ...summary, familyHistory: summary.familyHistory.filter((item) => item.id !== id) });
    if (type === 'emergencyContacts') await saveSummary({ ...summary, emergencyContacts: summary.emergencyContacts.filter((item) => item.id !== id) });
  };

  const shareSummary = async () => {
    const text = `Health Summary\nLast checkup: ${formatDate(lastCheckup)}\nActive meds: ${medications.length}\nConditions: ${conditions.length}\nAllergies: ${summary?.allergies.length ?? 0}\nBlood type: ${summary?.bloodType || '—'}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'MediLink Health Summary', text });
        return;
      } catch {
        // ignore
      }
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const selectedVitalHistory = useMemo(() => {
    if (!summary || !selectedVital) return [];
    const entries = getVitalsForType(summary.vitals, selectedVital, 'desc');
    const displayWeightUnit: WeightUnit = ((entries[0]?.weightUnit as WeightUnit | undefined) || 'lbs');
    return entries.map((entry) => {
      if (selectedVital === 'bloodPressure') return { date: entry.recordedAt, value: `${entry.systolic ?? '—'}/${entry.diastolic ?? '—'} mmHg` };
      if (selectedVital === 'heartRate') return { date: entry.recordedAt, value: `${entry.heartRate ?? '—'} bpm` };
      if (selectedVital === 'weight') {
        return {
          date: entry.recordedAt,
          value: formatWeight(
            convertWeight(entry.weight ?? 0, (entry.weightUnit as WeightUnit | undefined) || 'lbs', displayWeightUnit),
            displayWeightUnit
          ),
        };
      }
      return { date: entry.recordedAt, value: `${entry.bloodSugar ?? '—'} mg/dL` };
    });
  }, [selectedVital, summary]);
  const selectedVitalTrendEntries = useMemo(() => {
    if (!summary || !selectedVital) return [];
    return filterVitalsByRange(
      getVitalsForType(summary.vitals, selectedVital, 'asc'),
      selectedVitalRange
    );
  }, [selectedVital, selectedVitalRange, summary]);
  const selectedVitalDisplayWeightUnit: WeightUnit = useMemo(
    () => ((getLatestVitalForType(summary?.vitals || [], 'weight')?.weightUnit as WeightUnit | undefined) || 'lbs'),
    [summary]
  );
  const groupedSelectedVitalHistory = useMemo(
    () => groupVitalLogs(selectedVitalHistory),
    [selectedVitalHistory]
  );

  const selectedVitalTrendValues = useMemo(() => {
    if (!selectedVital) return [];
    return selectedVitalTrendEntries.map((entry) =>
      getVitalNumericValue(entry, selectedVital, selectedVitalDisplayWeightUnit)
    );
  }, [selectedVital, selectedVitalDisplayWeightUnit, selectedVitalTrendEntries]);

  const selectedVitalTrendLabels = useMemo(() => {
    return buildTrendLabels(
      selectedVitalTrendEntries.map((entry) => entry.recordedAt),
      selectedVitalRange
    );
  }, [selectedVitalRange, selectedVitalTrendEntries]);

  const activeConditions = useMemo(
    () => conditions.filter((condition) => condition.isActive !== false),
    [conditions]
  );
  const pastConditions = useMemo(
    () => conditions.filter((condition) => condition.isActive === false),
    [conditions]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-white">Health Summary</h1>
            <p className="text-teal-100 text-sm">Your comprehensive health overview</p>
          </div>
        </div>
      </div>

      <div className="p-6 -mt-4 space-y-6 pb-10">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">
              {initials(profile?.first_name, profile?.last_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-gray-900">{patientName}</h2>
                  <p className="text-sm text-gray-500">Official health summary record</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 md:grid-cols-4">
                {patientSnapshot.map((item) => (
                  <div key={item.label} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">{item.label}</p>
                    <p className="text-sm text-gray-900 mt-1 break-words">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">Quick Stats</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {quickStats.map((stat) => {
              const isClickable = Boolean(stat.action);
              return (
                <button
                  key={stat.label}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => stat.action?.()}
                  className={`rounded-xl bg-gray-50 p-4 text-left ${isClickable ? 'hover:bg-teal-50 transition-colors' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    {isClickable && <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                  <p className="text-gray-900">{stat.value}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-gray-900 mb-4">Vital Signs</h3>
          <div className="grid grid-cols-2 gap-3">
            {vitals.map((vital) => (
              <button
                key={vital.key}
                type="button"
                onClick={() => setSelectedVital(vital.key)}
                className="rounded-xl border border-gray-200 p-4 bg-gray-50 text-left hover:border-teal-300 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full ${vital.color} flex items-center justify-center mb-3`}>
                  <vital.icon className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-600 mb-1">{vital.label}</p>
                <p className="text-xl text-gray-900">{vital.value}</p>
                <p className="text-xs text-gray-500">{vital.unit}</p>
                <p className="text-xs text-gray-500 mt-2 capitalize">{vital.status}</p>
                <p className="text-xs text-gray-400 mt-1">{vital.subtext}</p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingVital(vital.key);
                      setVitalEntryMode('current');
                      setPastVitalDate('');
                      const latestBloodPressureEntry = getLatestVitalForType(allVitals, 'bloodPressure');
                      const latestHeartRateEntry = getLatestVitalForType(allVitals, 'heartRate');
                      const latestWeightEntry = getLatestVitalForType(allVitals, 'weight');
                      const latestBloodSugarEntry = getLatestVitalForType(allVitals, 'bloodSugar');
                      setVitalForm({
                        systolic: String(latestBloodPressureEntry?.systolic ?? 120),
                        diastolic: String(latestBloodPressureEntry?.diastolic ?? 80),
                        heartRate: String(latestHeartRateEntry?.heartRate ?? 72),
                        weight: String(latestWeightEntry?.weight ?? 165),
                        weightUnit: ((latestWeightEntry?.weightUnit as WeightUnit | undefined) || 'lbs'),
                        bloodSugar: String(latestBloodSugarEntry?.bloodSugar ?? 95),
                      });
                      setVitalsOpen(true);
                    }}
                    className="text-xs text-teal-700 font-medium"
                  >
                    Update {vital.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-gray-900">Medical Conditions</h3>
            <Button variant="outline" size="sm" onClick={() => openConditionEditor()} className="gap-2">
              <Edit3 className="w-4 h-4" />
              Add Health Concern
            </Button>
          </div>
          <div className="space-y-3">
            {activeConditions.map((condition) => (
              <div
                key={condition.id}
                className={`p-4 rounded-lg ${condition.sourceType === 'provider' ? 'bg-blue-50' : 'bg-amber-50'}`}
              >
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div className="space-y-2">
                    <h4 className="text-gray-900">{condition.name}</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {condition.status ? (
                        <Badge className="bg-green-100 text-green-700 border-0">{condition.status}</Badge>
                      ) : null}
                      <Badge
                        className={`border-0 ${
                          condition.sourceType === 'provider'
                            ? 'bg-teal-100 text-teal-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {condition.sourceType === 'provider' ? 'Provider verified' : 'Patient noted'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Diagnosed: {formatConditionDate(condition.diagnosed)}</p>
                  <p>{condition.metric || 'No care metrics recorded yet'}</p>
                  <p>Provider: {condition.provider || 'Provider not recorded'}</p>
                  {condition.hospitalName ? <p>Hospital: {condition.hospitalName}</p> : null}
                  {condition.notes ? <p>{condition.notes}</p> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {condition.sourceType === 'provider' ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => openConditionRequest(condition)}>
                      Request Change
                    </Button>
                  ) : (
                    <>
                      <Button type="button" variant="outline" size="sm" onClick={() => openConditionEditor(condition)}>
                        Edit Concern
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => deleteCondition(condition.id)}
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                      <button
                        type="button"
                        onClick={() => archiveCondition(condition.id)}
                        className="text-xs text-red-600"
                      >
                        Mark Inactive
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {activeConditions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-4">
                <p className="text-sm text-gray-600">No active conditions or health concerns are on file yet.</p>
              </div>
            ) : null}
            {pastConditions.length > 0 ? (
              <div className="pt-2">
                <h4 className="text-sm text-gray-500 mb-3">Past Conditions</h4>
                <div className="space-y-3">
                  {pastConditions.map((condition) => (
                    <div key={condition.id} className="p-4 rounded-lg bg-gray-50 border border-gray-200 opacity-80">
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <div className="space-y-2">
                          <h4 className="text-gray-900">{condition.name}</h4>
                          <div className="flex flex-wrap items-center gap-2">
                            {condition.status ? (
                              <Badge className="bg-gray-200 text-gray-700 border-0">{condition.status}</Badge>
                            ) : null}
                            <Badge className="bg-gray-200 text-gray-700 border-0">Inactive</Badge>
                          </div>
                        </div>
                        {condition.sourceType !== 'provider' ? (
                          <div className="flex flex-col gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => restoreCondition(condition.id)}>
                              Restore
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => deleteCondition(condition.id)}
                              className="gap-2 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Diagnosed: {formatConditionDate(condition.diagnosed)}</p>
                        <p>{condition.metric || 'No care metrics recorded yet'}</p>
                        <p>Provider: {condition.provider || 'Provider not recorded'}</p>
                        {condition.hospitalName ? <p>Hospital: {condition.hospitalName}</p> : null}
                        {condition.notes ? <p>{condition.notes}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="text-gray-900">Allergies & Sensitivities</h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => openEditor('allergies')} className="gap-2">
              <Edit3 className="w-4 h-4" />
              Add or Edit
            </Button>
          </div>
          <div className="space-y-2">
            {(summary?.allergies || []).map((allergy) => (
              <div key={allergy.id} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-orange-600" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-gray-900">{allergy.name}</p>
                    <Badge className={`${severityColor(allergy.severity)} border-0`}>{allergy.severity}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{allergy.reaction}</p>
                  <button type="button" onClick={() => removeItem('allergies', allergy.id)} className="mt-2 text-xs text-red-600">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-gray-900">Blood Type</h3>
            <Button variant="outline" size="sm" onClick={() => openEditor('bloodType')} className="gap-2">
              <Edit3 className="w-4 h-4" />
              Update
            </Button>
          </div>
          <div className="rounded-xl bg-teal-50 p-4">
            <p className="text-sm text-gray-600 mb-1">Current blood type on file</p>
            <p className="text-3xl text-gray-900">{summary?.bloodType || '—'}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-gray-900">Current Medications</h3>
              <p className="text-sm text-gray-500 mt-1">Review your active medications here and manage them in the Medications tab.</p>
            </div>
            {onOpenMedications ? (
              <Button variant="outline" size="sm" onClick={onOpenMedications} className="gap-2">
                <ChevronRight className="w-4 h-4" />
                Open Medications
              </Button>
            ) : null}
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            {medications.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {medications.map((medication) => (
                  <div key={medication} className="inline-flex items-center rounded-full bg-white border border-gray-200 px-3 py-1">
                    <span className="text-sm text-gray-800">{medication}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No active medications listed.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-gray-900">Emergency Contacts</h3>
            <Button variant="outline" size="sm" onClick={() => openEditor('emergencyContacts')} className="gap-2">
              <Edit3 className="w-4 h-4" />
              Add or Edit
            </Button>
          </div>
          <div className="space-y-3">
            {(summary?.emergencyContacts || []).length > 0 ? (
              summary?.emergencyContacts.map((contact) => (
                <div key={contact.id || `${contact.name}-${contact.phone}`} className="rounded-xl bg-gray-50 p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-gray-900">{contact.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{contact.relationship || 'Relationship not specified'}</p>
                    <p className="text-sm text-gray-600">{contact.phone}</p>
                  </div>
                  <button type="button" onClick={() => contact.id && removeItem('emergencyContacts', contact.id)} className="text-xs text-red-600">
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">No emergency contacts added yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-gray-900">Advance Directives</h3>
            <Button variant="outline" size="sm" onClick={() => openEditor('advanceDirectives')} className="gap-2">
              <Edit3 className="w-4 h-4" />
              Edit
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-600 mb-1">DNR Status</p>
              <p className="text-gray-900">{summary?.advanceDirectives?.dnrStatus || 'Not specified'}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-600 mb-1">Living Will</p>
              <p className="text-gray-900">{summary?.advanceDirectives?.livingWill || 'Not specified'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Syringe className="w-5 h-5 text-green-600" />
              <h3 className="text-gray-900">Immunization Record</h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => openEditor('immunizations')} className="gap-2">
              <Edit3 className="w-4 h-4" />
              Add or Edit
            </Button>
          </div>
          <div className="space-y-3">
            {(summary?.immunizations || []).map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-gray-900">{item.name}</p>
                    <div className="mt-1 space-y-1 text-sm text-gray-600">
                      <p> Dose: {item.dose || 'Not recorded'}</p>
                      <p> Date taken: {item.date ? formatDate(item.date) : 'Not recorded'}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{item.status}</Badge>
                </div>
                <button type="button" onClick={() => removeItem('immunizations', item.id)} className="mt-3 text-xs text-red-600">Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <h3 className="text-gray-900">Family Health History</h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => openEditor('familyHistory')} className="gap-2">
              <Edit3 className="w-4 h-4" />
              Add or Edit
            </Button>
          </div>
          <div className="space-y-2">
            {(summary?.familyHistory || []).map((item) => (
              <div key={item.id} className="rounded-xl bg-gray-50 p-4 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-900">{item.condition} ({item.relation})</p>
                <button type="button" onClick={() => removeItem('familyHistory', item.id)} className="text-xs text-red-600">Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => window.print()}>
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
          <Button className="flex-1 gap-2" onClick={shareSummary}>
            <Share2 className="w-4 h-4" />
            Share Summary
          </Button>
        </div>

        <div className="text-xs text-gray-500">{saving ? 'Saving changes…' : `Profile updated ${latestProfileDate(profile, summary)}`}</div>
      </div>

      {vitalsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900">
                {editingVital
                  ? `Update ${vitals.find((item) => item.key === editingVital)?.label || 'Vital'}`
                  : 'Update Vitals'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setVitalsOpen(false);
                  setEditingVital(null);
                }}
                className="text-sm text-gray-500"
              >
                Close
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVitalEntryMode('current')}
                className={`rounded-full px-3 py-1 text-xs ${
                  vitalEntryMode === 'current' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Current
              </button>
              <button
                type="button"
                onClick={() => setVitalEntryMode('past')}
                className={`rounded-full px-3 py-1 text-xs ${
                  vitalEntryMode === 'past' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Past Entry
              </button>
            </div>
            {vitalEntryMode === 'past' ? (
              <label className="block text-sm text-gray-600">
                Date
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={pastVitalDate}
                  onChange={(e) => setPastVitalDate(e.target.value)}
                />
              </label>
            ) : null}
            {editingVital === 'bloodPressure' && (
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-gray-600">Systolic<input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" value={vitalForm.systolic} onChange={(e) => setVitalForm({ ...vitalForm, systolic: e.target.value })} /></label>
                <label className="text-sm text-gray-600">Diastolic<input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" value={vitalForm.diastolic} onChange={(e) => setVitalForm({ ...vitalForm, diastolic: e.target.value })} /></label>
              </div>
            )}
            {editingVital === 'heartRate' && (
              <label className="block text-sm text-gray-600">Heart Rate<input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" value={vitalForm.heartRate} onChange={(e) => setVitalForm({ ...vitalForm, heartRate: e.target.value })} /></label>
            )}
            {editingVital === 'weight' && (
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <label className="block text-sm text-gray-600">
                  Weight
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" value={vitalForm.weight} onChange={(e) => setVitalForm({ ...vitalForm, weight: e.target.value })} />
                </label>
                <label className="block text-sm text-gray-600">
                  Unit
                  <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" value={vitalForm.weightUnit} onChange={(e) => setVitalForm({ ...vitalForm, weightUnit: e.target.value as WeightUnit })}>
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </label>
              </div>
            )}
            {editingVital === 'bloodSugar' && (
              <label className="block text-sm text-gray-600">Blood Sugar<input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" value={vitalForm.bloodSugar} onChange={(e) => setVitalForm({ ...vitalForm, bloodSugar: e.target.value })} /></label>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setVitalsOpen(false);
                  setEditingVital(null);
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={submitVitals}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {selectedVital && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900">{vitals.find((item) => item.key === selectedVital)?.label} History</h3>
              <button type="button" onClick={() => setSelectedVital(null)} className="text-sm text-gray-500">Close</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {vitalRangeOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedVitalRange(option.key)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    selectedVitalRange === option.key ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Trend</p>
              <TrendChart
                values={selectedVitalTrendValues}
                labels={selectedVitalTrendLabels}
              />
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {groupedSelectedVitalHistory.map((group) => (
                <div key={group.label} className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedVitalGroups((current) => ({
                        ...current,
                        [group.label]: !current[group.label],
                      }))
                    }
                    className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-left"
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      {group.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </button>
                  {expandedVitalGroups[group.label] ? (
                    group.items.map((entry, index) => (
                      <div key={`${group.label}-${entry.date}-${index}`} className="rounded-xl border border-gray-200 p-4">
                        <p className="text-sm font-medium text-gray-900">{entry.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDateTime(entry.date)}</p>
                      </div>
                    ))
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {conditionEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900">{editingCondition ? 'Edit Health Concern' : 'Add Health Concern'}</h3>
            </div>
            <p className="text-sm text-gray-500">
              Personal health concerns stay clearly marked as patient-noted until a provider reviews them.
            </p>
            {conditionEditorError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {conditionEditorError}
              </div>
            ) : null}
            <div className="space-y-3">
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Condition name" value={conditionForm.name} onChange={(e) => setConditionForm({ ...conditionForm, name: e.target.value })} />
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2" value={conditionForm.status} onChange={(e) => setConditionForm({ ...conditionForm, status: e.target.value })}>
                <option value="">Select status</option>
                {conditionStatusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2" value={conditionForm.diagnosed || ''} onChange={(e) => setConditionForm({ ...conditionForm, diagnosed: e.target.value })} />
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Metric or care note" value={conditionForm.metric} onChange={(e) => setConditionForm({ ...conditionForm, metric: e.target.value })} />
              <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 min-h-[96px]" placeholder="Notes for your provider" value={conditionForm.notes || ''} onChange={(e) => setConditionForm({ ...conditionForm, notes: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setConditionEditorOpen(false);
                  setConditionEditorError(null);
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={submitConditionEditor} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {conditionRequestOpen && requestingCondition && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900">Request Condition Change</h3>
            </div>
            <p className="text-sm text-gray-500">
              Your provider manages official diagnoses. Send a quick note and they can review and update {requestingCondition.name}.
            </p>
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 min-h-[120px]"
              placeholder="What should be changed?"
              value={conditionRequestMessage}
              onChange={(e) => setConditionRequestMessage(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConditionRequestOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submitConditionRequest}>Send Request</Button>
            </div>
          </div>
        </div>
      )}

      {editorType && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900 capitalize">
                {editorType === 'familyHistory'
                  ? 'Add family history'
                  : editorType === 'bloodType'
                  ? 'Update blood type'
                  : editorType === 'emergencyContacts'
                  ? 'Add emergency contact'
                  : editorType === 'advanceDirectives'
                  ? 'Update advance directives'
                  : `Add ${editorType.slice(0, -1)}`}
              </h3>
            </div>

            {editorType === 'allergies' && (
              <div className="space-y-3">
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Allergy" value={allergyForm.name} onChange={(e) => setAllergyForm({ ...allergyForm, name: e.target.value })} />
                <select className="w-full rounded-lg border border-gray-200 px-3 py-2" value={allergyForm.severity} onChange={(e) => setAllergyForm({ ...allergyForm, severity: e.target.value as HealthSummaryAllergy['severity'] })}>
                  <option value="MILD">Mild</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="SEVERE">Severe</option>
                </select>
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Reaction" value={allergyForm.reaction} onChange={(e) => setAllergyForm({ ...allergyForm, reaction: e.target.value })} />
              </div>
            )}

            {editorType === 'immunizations' && (
              <div className="space-y-3">
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={immunizationOptions.includes(immunizationForm.name as any) ? immunizationForm.name : 'Other'}
                  onChange={(e) =>
                    setImmunizationForm({
                      ...immunizationForm,
                      name: e.target.value === 'Other' ? '' : e.target.value,
                    })
                  }
                >
                  <option value="">Select immunization</option>
                  {immunizationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {(!immunizationOptions.includes(immunizationForm.name as any) || immunizationForm.name === '') && (
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="Enter immunization name"
                    value={immunizationForm.name}
                    onChange={(e) => setImmunizationForm({ ...immunizationForm, name: e.target.value })}
                  />
                )}
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Dose"
                  value={immunizationForm.dose || ''}
                  onChange={(e) => setImmunizationForm({ ...immunizationForm, dose: e.target.value, detail: [e.target.value, immunizationForm.date].filter(Boolean).join(' • ') })}
                />
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={immunizationForm.date || ''}
                  onChange={(e) => setImmunizationForm({ ...immunizationForm, date: e.target.value, detail: [immunizationForm.dose, e.target.value].filter(Boolean).join(' • ') })}
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

            {editorType === 'familyHistory' && (
              <div className="space-y-3">
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Relationship" value={familyHistoryForm.relation} onChange={(e) => setFamilyHistoryForm({ ...familyHistoryForm, relation: e.target.value })} />
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Condition" value={familyHistoryForm.condition} onChange={(e) => setFamilyHistoryForm({ ...familyHistoryForm, condition: e.target.value })} />
              </div>
            )}

            {editorType === 'bloodType' && (
              <div className="space-y-3">
                <select className="w-full rounded-lg border border-gray-200 px-3 py-2" value={bloodTypeInput} onChange={(e) => setBloodTypeInput(e.target.value)}>
                  <option value="">Select blood type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
                <p className="text-xs text-gray-500">Choose the blood type that should appear across your health summary and emergency record.</p>
              </div>
            )}

            {editorType === 'emergencyContacts' && (
              <div className="space-y-3">
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Full name" value={emergencyContactForm.name} onChange={(e) => setEmergencyContactForm({ ...emergencyContactForm, name: e.target.value })} />
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Relationship" value={emergencyContactForm.relationship} onChange={(e) => setEmergencyContactForm({ ...emergencyContactForm, relationship: e.target.value })} />
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="Phone number" value={emergencyContactForm.phone} onChange={(e) => setEmergencyContactForm({ ...emergencyContactForm, phone: e.target.value })} />
              </div>
            )}

            {editorType === 'advanceDirectives' && (
              <div className="space-y-3">
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2" placeholder="DNR status" value={advanceDirectiveForm.dnrStatus} onChange={(e) => setAdvanceDirectiveForm({ ...advanceDirectiveForm, dnrStatus: e.target.value })} />
                <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 min-h-[120px]" placeholder="Living will or responder instructions" value={advanceDirectiveForm.livingWill} onChange={(e) => setAdvanceDirectiveForm({ ...advanceDirectiveForm, livingWill: e.target.value })} />
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditorType(null)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={submitEditor}><Plus className="w-4 h-4" />Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
