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

const getDefaultVitals = () => [
  { recordedAt: '2025-10-15T09:00:00.000Z', systolic: 126, diastolic: 84, heartRate: 78, weight: 171, bloodSugar: 108 },
  { recordedAt: '2025-11-12T09:00:00.000Z', systolic: 124, diastolic: 82, heartRate: 76, weight: 169, bloodSugar: 102 },
  { recordedAt: '2025-12-10T09:00:00.000Z', systolic: 122, diastolic: 80, heartRate: 74, weight: 167, bloodSugar: 98 },
  { recordedAt: '2026-01-14T09:00:00.000Z', systolic: 120, diastolic: 80, heartRate: 72, weight: 165, bloodSugar: 95 },
];

const defaultConditionMeta = (name: string): Omit<HealthSummaryCondition, 'id' | 'name'> => {
  const normalized = name.trim().toLowerCase();
  if (normalized.includes('diabetes')) {
    return { status: 'Managed', diagnosed: 'Jan 2020', metric: 'Last A1C: 6.2% (Nov 2025)', provider: 'Dr. Johnson' };
  }
  if (normalized.includes('hypertension')) {
    return { status: 'Well Controlled', diagnosed: 'Mar 2018', metric: 'Blood pressure reviewed at last checkup', provider: 'Dr. Johnson' };
  }
  return { status: 'On File', diagnosed: 'Date not recorded', metric: 'No additional care metrics recorded yet', provider: 'Provider not recorded' };
};

const createDefaultSummary = (profile: ProfileResponse | null): HealthSummaryPayload => {
  const conditionNames = parseList(profile?.medical_conditions);
  const allergyNames = parseList(profile?.allergies);
  const medicationNames = parseList(profile?.current_medications);
  const emergencyContacts =
    profile?.emergency_contact_full_name && profile?.emergency_contact_phone
      ? [
          {
            id: createId(),
            name: profile.emergency_contact_full_name,
            relationship: profile.emergency_contact_relationship || '',
            phone: profile.emergency_contact_phone,
          },
        ]
      : [];
  return {
    vitals: getDefaultVitals(),
    conditions:
      conditionNames.length > 0
        ? conditionNames.map((name) => ({ id: createId(), name, ...defaultConditionMeta(name) }))
        : [
            { id: createId(), name: 'Type 2 Diabetes', ...defaultConditionMeta('Type 2 Diabetes') },
            { id: createId(), name: 'Hypertension', ...defaultConditionMeta('Hypertension') },
          ],
    allergies:
      allergyNames.length > 0
        ? allergyNames.map((name) => ({ id: createId(), name, severity: 'MODERATE', reaction: 'Reaction not specified' }))
        : [
            { id: createId(), name: 'Penicillin', severity: 'SEVERE', reaction: 'Anaphylaxis' },
            { id: createId(), name: 'Shellfish', severity: 'MODERATE', reaction: 'Hives, swelling' },
            { id: createId(), name: 'Latex', severity: 'MILD', reaction: 'Skin irritation' },
          ],
    bloodType: profile?.blood_type || null,
    currentMedications: medicationNames,
    emergencyContacts,
    advanceDirectives: {
      dnrStatus: profile?.dnr_status || '',
      livingWill: profile?.living_will || '',
    },
    immunizations: [
      { id: createId(), name: 'COVID-19', detail: 'Dose 3', status: 'Up to date' },
      { id: createId(), name: 'Flu Shot', detail: 'Oct 2024', status: 'Due Soon' },
      { id: createId(), name: 'Tetanus', detail: '2021', status: 'Current' },
    ],
    familyHistory: [
      { id: createId(), relation: 'Father', condition: 'Heart disease' },
      { id: createId(), relation: 'Mother', condition: 'Type 2 Diabetes' },
      { id: createId(), relation: 'Maternal grandmother', condition: 'Breast Cancer' },
    ],
    updatedAt: null,
  };
};

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
  const [selectedVital, setSelectedVital] = useState<VitalType>(null);
  const [editorType, setEditorType] = useState<EditorType>(null);
  const [conditionEditorOpen, setConditionEditorOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState<HealthSummaryCondition | null>(null);
  const [conditionRequestOpen, setConditionRequestOpen] = useState(false);
  const [requestingCondition, setRequestingCondition] = useState<HealthSummaryCondition | null>(null);
  const [conditionRequestMessage, setConditionRequestMessage] = useState('');
  const [vitalForm, setVitalForm] = useState({ systolic: '120', diastolic: '80', heartRate: '72', weight: '165', bloodSugar: '95' });
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

        const needsSeeding =
          !summaryRes.summary ||
          (summaryRes.summary.vitals.length === 0 &&
            summaryRes.summary.conditions.length === 0 &&
            summaryRes.summary.allergies.length === 0 &&
            !summaryRes.summary.bloodType &&
            summaryRes.summary.currentMedications.length === 0 &&
            summaryRes.summary.emergencyContacts.length === 0 &&
            summaryRes.summary.immunizations.length === 0 &&
            summaryRes.summary.familyHistory.length === 0);

        if (needsSeeding) {
          const seeded = createDefaultSummary(profileRes);
          setSummary(seeded);
          try {
            const saved = await api.updateMyHealthSummary({
              vitals: seeded.vitals,
              conditions: [],
              allergies: seeded.allergies,
              bloodType: seeded.bloodType,
              currentMedications: seeded.currentMedications,
              emergencyContacts: seeded.emergencyContacts,
              advanceDirectives: seeded.advanceDirectives,
              immunizations: seeded.immunizations,
              familyHistory: seeded.familyHistory,
            });
            if (!cancelled) setSummary(saved.summary);
          } catch {
            if (!cancelled) setSummary(seeded);
          }
        } else {
          setSummary(summaryRes.summary);
        }
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

  const sortedVitals = useMemo(
    () => (summary?.vitals || []).slice().sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    [summary]
  );
  const latestVital = sortedVitals[0];
  const previousVital = sortedVitals[1];

  const vitals = latestVital
    ? [
        {
          key: 'bloodPressure' as const,
          label: 'Blood Pressure',
          value: `${latestVital.systolic}/${latestVital.diastolic}`,
          unit: 'mmHg',
          status: bloodPressureStatus(latestVital.systolic, latestVital.diastolic),
          subtext: `Latest log: ${formatDate(latestVital.recordedAt)}`,
          icon: Heart,
          color: 'bg-red-100 text-red-600',
        },
        {
          key: 'heartRate' as const,
          label: 'Heart Rate',
          value: String(latestVital.heartRate),
          unit: 'bpm',
          status: heartRateStatus(latestVital.heartRate, previousVital?.heartRate),
          subtext: `Previous: ${previousVital?.heartRate ?? '—'} bpm`,
          icon: Activity,
          color: 'bg-pink-100 text-pink-600',
        },
        {
          key: 'weight' as const,
          label: 'Weight',
          value: String(latestVital.weight),
          unit: 'lbs',
          status: `${weightDelta(latestVital.weight, previousVital?.weight).label} ${weightDelta(latestVital.weight, previousVital?.weight).value}`,
          subtext: `Previous: ${previousVital?.weight ?? '—'} lbs`,
          icon: Scale,
          color: 'bg-purple-100 text-purple-600',
        },
        {
          key: 'bloodSugar' as const,
          label: 'Blood Sugar',
          value: String(latestVital.bloodSugar),
          unit: 'mg/dL',
          status: bloodSugarStatus(latestVital.bloodSugar),
          subtext: `Previous: ${previousVital?.bloodSugar ?? '—'} mg/dL`,
          icon: Droplet,
          color: 'bg-blue-100 text-blue-600',
        },
      ]
    : [];

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
    const next = {
      ...summary,
      vitals: [
        ...summary.vitals,
        {
          recordedAt: new Date().toISOString(),
          systolic: Number(vitalForm.systolic) || 0,
          diastolic: Number(vitalForm.diastolic) || 0,
          heartRate: Number(vitalForm.heartRate) || 0,
          weight: Number(vitalForm.weight) || 0,
          bloodSugar: Number(vitalForm.bloodSugar) || 0,
        },
      ],
    };
    await saveSummary(next);
    setVitalsOpen(false);
  };

  const openConditionEditor = (condition?: HealthSummaryCondition) => {
    setEditingCondition(condition || null);
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
    if (!conditionForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingCondition?.id) {
        const res = await api.updateMyCondition(editingCondition.id, {
          name: conditionForm.name.trim(),
          status: conditionForm.status.trim(),
          diagnosed: conditionForm.diagnosed.trim(),
          metric: conditionForm.metric.trim(),
          notes: (conditionForm.notes || '').trim(),
          isActive: true,
        });
        setConditions((current) => current.map((item) => (item.id === editingCondition.id ? res.condition : item)));
      } else {
        const res = await api.createMyCondition({
          name: conditionForm.name.trim(),
          status: conditionForm.status.trim(),
          diagnosed: conditionForm.diagnosed.trim(),
          metric: conditionForm.metric.trim(),
          notes: (conditionForm.notes || '').trim(),
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
    } catch (error) {
      console.error('Failed to save condition:', error);
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
    const entries = summary.vitals.slice().sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    return entries.map((entry) => {
      if (selectedVital === 'bloodPressure') return { date: entry.recordedAt, value: `${entry.systolic}/${entry.diastolic} mmHg` };
      if (selectedVital === 'heartRate') return { date: entry.recordedAt, value: `${entry.heartRate} bpm` };
      if (selectedVital === 'weight') return { date: entry.recordedAt, value: `${entry.weight} lbs` };
      return { date: entry.recordedAt, value: `${entry.bloodSugar} mg/dL` };
    });
  }, [selectedVital, summary]);

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
            <Button variant="outline" size="sm" onClick={() => setVitalsOpen(true)}>
              Update Vitals
            </Button>
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
                          <Button type="button" variant="outline" size="sm" onClick={() => restoreCondition(condition.id)}>
                            Restore
                          </Button>
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
              <h3 className="text-gray-900">Update Vitals</h3>
              <button type="button" onClick={() => setVitalsOpen(false)} className="text-sm text-gray-500">Close</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-gray-600">Systolic<input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" value={vitalForm.systolic} onChange={(e) => setVitalForm({ ...vitalForm, systolic: e.target.value })} /></label>
              <label className="text-sm text-gray-600">Diastolic<input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" value={vitalForm.diastolic} onChange={(e) => setVitalForm({ ...vitalForm, diastolic: e.target.value })} /></label>
              <label className="text-sm text-gray-600">Heart Rate<input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" value={vitalForm.heartRate} onChange={(e) => setVitalForm({ ...vitalForm, heartRate: e.target.value })} /></label>
              <label className="text-sm text-gray-600">Weight<input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" value={vitalForm.weight} onChange={(e) => setVitalForm({ ...vitalForm, weight: e.target.value })} /></label>
              <label className="text-sm text-gray-600 col-span-2">Blood Sugar<input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" value={vitalForm.bloodSugar} onChange={(e) => setVitalForm({ ...vitalForm, bloodSugar: e.target.value })} /></label>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setVitalsOpen(false)}>Cancel</Button>
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
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {selectedVitalHistory.map((entry, index) => (
                <div key={`${entry.date}-${index}`} className="rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-medium text-gray-900">{entry.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDateTime(entry.date)}</p>
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
              <button type="button" onClick={() => setConditionEditorOpen(false)} className="text-sm text-gray-500">Close</button>
            </div>
            <p className="text-sm text-gray-500">
              Personal health concerns stay clearly marked as patient-noted until a provider reviews them.
            </p>
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
              <Button variant="outline" className="flex-1" onClick={() => setConditionEditorOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submitConditionEditor}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {conditionRequestOpen && requestingCondition && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900">Request Condition Change</h3>
              <button type="button" onClick={() => setConditionRequestOpen(false)} className="text-sm text-gray-500">Close</button>
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
              <button type="button" onClick={() => setEditorType(null)} className="text-sm text-gray-500">Close</button>
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
