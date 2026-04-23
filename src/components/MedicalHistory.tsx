import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  HeartPulse,
  History,
  Hospital,
  Pencil,
  Pill,
  Plus,
  RefreshCw,
  Scissors,
  Shield,
  Stethoscope,
  Trash2,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { api, type PatientMedicalHistorySectionKey } from '@/lib/api';
import {
  fetchMedicalHistoryData,
  formatDateLabel,
  formatDateRangeLabel,
  type MedicalHistoryConditionItem,
  type MedicalHistoryData,
  type MedicalHistoryEncounterItem,
  type MedicalHistoryMedicationItem,
  type MedicalHistoryRecordItem,
} from '@/lib/medicalHistory';
import type { PatientDataScreen } from '@/lib/patientDataNavigation';

interface MedicalHistoryProps {
  onBack: () => void;
  onNavigate: (screen: PatientDataScreen) => void;
}

type ManagedSectionKey = PatientMedicalHistorySectionKey;
type EditorValue = string | boolean;
type EditorValues = Record<string, EditorValue>;

type EditorField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'select' | 'checkbox';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
};

type SectionConfig = {
  title: string;
  description: string;
  addLabel: string;
  emptyMessage: string;
  icon: ReactNode;
  defaultValues: EditorValues;
  fields: EditorField[];
  sensitive?: boolean;
};

const socialCategoryOptions = [
  { value: 'smoking', label: 'Smoking' },
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'occupation', label: 'Occupation' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'travel', label: 'Travel' },
  { value: 'substance_use', label: 'Substance use' },
  { value: 'diet', label: 'Diet' },
  { value: 'other', label: 'Other' },
];

const sectionConfigs: Record<ManagedSectionKey, SectionConfig> = {
  surgical: {
    title: 'Surgical history',
    description: 'Track procedures, facilities, and recovery notes in structured form.',
    addLabel: 'Add surgery',
    emptyMessage: 'No surgeries have been saved yet.',
    icon: <Scissors className="w-5 h-5 text-red-600" />,
    defaultValues: {
      procedureName: '',
      surgeryDate: '',
      facility: '',
      surgeon: '',
      indication: '',
      complications: '',
      notes: '',
    },
    fields: [
      { key: 'procedureName', label: 'Procedure name', type: 'text', placeholder: 'Appendectomy' },
      { key: 'surgeryDate', label: 'Surgery date', type: 'date' },
      { key: 'facility', label: 'Facility', type: 'text', placeholder: 'Toronto General Hospital' },
      { key: 'surgeon', label: 'Surgeon', type: 'text', placeholder: 'Dr. Singh' },
      { key: 'indication', label: 'Reason for surgery', type: 'text', placeholder: 'Acute appendicitis' },
      { key: 'complications', label: 'Complications', type: 'text', placeholder: 'None' },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Extra context or recovery notes' },
    ],
  },
  hospitalizations: {
    title: 'Hospitalizations',
    description: 'Save admissions, length of stay, diagnosis, and discharge details.',
    addLabel: 'Add hospitalization',
    emptyMessage: 'No hospitalizations have been saved yet.',
    icon: <Hospital className="w-5 h-5 text-blue-600" />,
    defaultValues: {
      reason: '',
      admissionDate: '',
      dischargeDate: '',
      facility: '',
      attendingProvider: '',
      diagnosis: '',
      treatmentSummary: '',
      notes: '',
    },
    fields: [
      { key: 'reason', label: 'Reason for admission', type: 'text', placeholder: 'Pneumonia' },
      { key: 'admissionDate', label: 'Admission date', type: 'date' },
      { key: 'dischargeDate', label: 'Discharge date', type: 'date' },
      { key: 'facility', label: 'Hospital', type: 'text', placeholder: 'Sunnybrook Hospital' },
      { key: 'attendingProvider', label: 'Attending provider', type: 'text', placeholder: 'Dr. Johnson' },
      { key: 'diagnosis', label: 'Diagnosis', type: 'text', placeholder: 'Community-acquired pneumonia' },
      { key: 'treatmentSummary', label: 'Treatment summary', type: 'textarea', placeholder: 'IV antibiotics, oxygen, monitoring' },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Any follow-up or discharge notes' },
    ],
  },
  emergency: {
    title: 'Emergency visits',
    description: 'Store urgent visits with reason, diagnosis, treatment, and disposition.',
    addLabel: 'Add ER visit',
    emptyMessage: 'No emergency visits have been saved yet.',
    icon: <AlertCircle className="w-5 h-5 text-red-600" />,
    defaultValues: {
      reason: '',
      visitDate: '',
      visitTime: '',
      facility: '',
      diagnosis: '',
      treatment: '',
      disposition: '',
      notes: '',
    },
    fields: [
      { key: 'reason', label: 'Reason for visit', type: 'text', placeholder: 'Severe migraine' },
      { key: 'visitDate', label: 'Visit date', type: 'date' },
      { key: 'visitTime', label: 'Visit time', type: 'text', placeholder: '11:30 PM' },
      { key: 'facility', label: 'Facility', type: 'text', placeholder: 'Toronto Western ER' },
      { key: 'diagnosis', label: 'Diagnosis', type: 'text', placeholder: 'Migraine with aura' },
      { key: 'treatment', label: 'Treatment', type: 'textarea', placeholder: 'IV fluids, pain management' },
      { key: 'disposition', label: 'Disposition', type: 'text', placeholder: 'Discharged home' },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Any follow-up instructions' },
    ],
  },
  social: {
    title: 'Social history',
    description: 'Capture smoking, alcohol, exercise, occupation, travel, and other lifestyle history.',
    addLabel: 'Add social history',
    emptyMessage: 'No social history entries have been saved yet.',
    icon: <Briefcase className="w-5 h-5 text-amber-600" />,
    defaultValues: {
      category: 'other',
      title: '',
      status: '',
      startDate: '',
      endDate: '',
      detail: '',
      notes: '',
    },
    fields: [
      { key: 'category', label: 'Category', type: 'select', options: socialCategoryOptions },
      { key: 'title', label: 'Title', type: 'text', placeholder: 'Former smoker' },
      { key: 'status', label: 'Status', type: 'text', placeholder: 'Quit in 2018' },
      { key: 'startDate', label: 'Start date', type: 'date' },
      { key: 'endDate', label: 'End date', type: 'date' },
      { key: 'detail', label: 'Details', type: 'textarea', placeholder: '5 pack-years, quit successfully' },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Extra context' },
    ],
  },
  reproductive: {
    title: 'Reproductive history',
    description: 'Keep reproductive events and outcomes in a structured, privacy-protected section.',
    addLabel: 'Add reproductive history',
    emptyMessage: 'No reproductive history entries have been saved yet.',
    icon: <Shield className="w-5 h-5 text-pink-600" />,
    sensitive: true,
    defaultValues: {
      eventType: 'general',
      title: '',
      eventDate: '',
      outcome: '',
      detail: '',
      notes: '',
      isSensitive: true,
    },
    fields: [
      { key: 'eventType', label: 'Event type', type: 'text', placeholder: 'Pregnancy, contraception, menopause' },
      { key: 'title', label: 'Title', type: 'text', placeholder: 'Pregnancy history' },
      { key: 'eventDate', label: 'Event date', type: 'date' },
      { key: 'outcome', label: 'Outcome', type: 'text', placeholder: '2 live births' },
      { key: 'detail', label: 'Details', type: 'textarea', placeholder: 'Relevant medical context' },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Optional care notes' },
      { key: 'isSensitive', label: 'Mark as sensitive', type: 'checkbox' },
    ],
  },
  mental: {
    title: 'Mental health history',
    description: 'Track diagnoses, treatment, providers, and mental-health care notes.',
    addLabel: 'Add mental health entry',
    emptyMessage: 'No mental health entries have been saved yet.',
    icon: <HeartPulse className="w-5 h-5 text-indigo-600" />,
    sensitive: true,
    defaultValues: {
      conditionName: '',
      diagnosedDate: '',
      status: '',
      providerName: '',
      treatment: '',
      notes: '',
      isSensitive: true,
    },
    fields: [
      { key: 'conditionName', label: 'Condition or concern', type: 'text', placeholder: 'Generalized anxiety disorder' },
      { key: 'diagnosedDate', label: 'Diagnosed date', type: 'date' },
      { key: 'status', label: 'Status', type: 'text', placeholder: 'Active, stable, in remission' },
      { key: 'providerName', label: 'Provider', type: 'text', placeholder: 'Dr. Chen' },
      { key: 'treatment', label: 'Treatment', type: 'textarea', placeholder: 'CBT, sertraline 50mg daily' },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Optional care notes' },
      { key: 'isSensitive', label: 'Mark as sensitive', type: 'checkbox' },
    ],
  },
};

function SummaryCard({
  icon,
  title,
  value,
  detail,
  actionLabel,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  detail: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
        {icon}
        <span>{title}</span>
      </div>
      <p className="text-2xl text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{detail}</p>
      <Button size="sm" variant="outline" className="mt-4 w-full" onClick={onClick}>
        {actionLabel}
      </Button>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function ConditionCard({ item }: { item: MedicalHistoryConditionItem }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-gray-900">{item.name}</h4>
          <p className="mt-1 text-sm text-gray-500">{item.dateLabel}</p>
        </div>
        <Badge className="border-0 bg-blue-100 text-blue-700">{item.statusLabel}</Badge>
      </div>
      <p className="mb-2 text-sm text-gray-600">{item.detail}</p>
      <p className="text-sm text-gray-500">Provider: {item.provider}</p>
    </div>
  );
}

function MedicationCard({ item }: { item: MedicalHistoryMedicationItem }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-gray-900">{item.name}</h4>
          <p className="mt-1 text-sm text-gray-500">{item.dateLabel}</p>
        </div>
        <Badge
          className={
            item.statusLabel === 'Current'
              ? 'border-0 bg-green-100 text-green-700'
              : 'border-0 bg-gray-200 text-gray-700'
          }
        >
          {item.statusLabel}
        </Badge>
      </div>
      <p className="mb-2 text-sm text-gray-600">{item.detail}</p>
      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        <span>Prescriber: {item.provider}</span>
        <span>Adherence: {item.adherenceLabel}</span>
      </div>
    </div>
  );
}

function EncounterCard({ item }: { item: MedicalHistoryEncounterItem }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-gray-900">{item.title}</h4>
          <p className="mt-1 text-sm text-gray-500">{item.dateLabel}</p>
        </div>
        <Badge className="border-0 bg-purple-100 text-purple-700">{item.statusLabel}</Badge>
      </div>
      <p className="text-sm text-gray-600">{item.detail}</p>
    </div>
  );
}

function RecordCard({ item }: { item: MedicalHistoryRecordItem }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-gray-900">{item.title}</h4>
          <p className="mt-1 text-sm text-gray-500">{item.dateLabel}</p>
        </div>
        <Badge className="border-0 bg-amber-100 text-amber-700">{item.categoryLabel}</Badge>
      </div>
      <p className="mb-2 text-sm text-gray-600">{item.detail}</p>
      <p className="text-xs text-gray-500">{item.statusLabel}</p>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
      {message}
    </div>
  );
}

function HistoryEditor({
  section,
  values,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  section: ManagedSectionKey;
  values: EditorValues;
  saving: boolean;
  onChange: (key: string, value: EditorValue) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const config = sectionConfigs[section];

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
      <div className="mb-4 flex items-center gap-2">
        {config.icon}
        <h4 className="text-gray-900">{config.title} editor</h4>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {config.fields.map((field) => {
          if (field.type === 'textarea') {
            return (
              <label key={field.key} className="text-sm text-gray-700">
                {field.label}
                <textarea
                  className="mt-1 min-h-[100px] w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder={field.placeholder}
                  value={String(values[field.key] ?? '')}
                  onChange={(event) => onChange(field.key, event.target.value)}
                />
              </label>
            );
          }

          if (field.type === 'select') {
            return (
              <label key={field.key} className="text-sm text-gray-700">
                {field.label}
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={String(values[field.key] ?? '')}
                  onChange={(event) => onChange(field.key, event.target.value)}
                >
                  {(field.options || []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          }

          if (field.type === 'checkbox') {
            return (
              <label key={field.key} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(values[field.key])}
                  onChange={(event) => onChange(field.key, event.target.checked)}
                />
                <span>{field.label}</span>
              </label>
            );
          }

          return (
            <label key={field.key} className="text-sm text-gray-700">
              {field.label}
              <input
                type={field.type}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                placeholder={field.placeholder}
                value={String(values[field.key] ?? '')}
                onChange={(event) => onChange(field.key, event.target.value)}
              />
            </label>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save entry'}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function getInitialValues(section: ManagedSectionKey) {
  return { ...sectionConfigs[section].defaultValues };
}

function getFormValuesFromEntry(section: ManagedSectionKey, entry: any): EditorValues {
  switch (section) {
    case 'surgical':
      return {
        procedureName: entry.procedureName || '',
        surgeryDate: entry.surgeryDate || '',
        facility: entry.facility || '',
        surgeon: entry.surgeon || '',
        indication: entry.indication || '',
        complications: entry.complications || '',
        notes: entry.notes || '',
      };
    case 'hospitalizations':
      return {
        reason: entry.reason || '',
        admissionDate: entry.admissionDate || '',
        dischargeDate: entry.dischargeDate || '',
        facility: entry.facility || '',
        attendingProvider: entry.attendingProvider || '',
        diagnosis: entry.diagnosis || '',
        treatmentSummary: entry.treatmentSummary || '',
        notes: entry.notes || '',
      };
    case 'emergency':
      return {
        reason: entry.reason || '',
        visitDate: entry.visitDate || '',
        visitTime: entry.visitTime || '',
        facility: entry.facility || '',
        diagnosis: entry.diagnosis || '',
        treatment: entry.treatment || '',
        disposition: entry.disposition || '',
        notes: entry.notes || '',
      };
    case 'social':
      return {
        category: entry.category || 'other',
        title: entry.title || '',
        status: entry.status || '',
        startDate: entry.startDate || '',
        endDate: entry.endDate || '',
        detail: entry.detail || '',
        notes: entry.notes || '',
      };
    case 'reproductive':
      return {
        eventType: entry.eventType || 'general',
        title: entry.title || '',
        eventDate: entry.eventDate || '',
        outcome: entry.outcome || '',
        detail: entry.detail || '',
        notes: entry.notes || '',
        isSensitive: Boolean(entry.isSensitive),
      };
    case 'mental':
      return {
        conditionName: entry.conditionName || '',
        diagnosedDate: entry.diagnosedDate || '',
        status: entry.status || '',
        providerName: entry.providerName || '',
        treatment: entry.treatment || '',
        notes: entry.notes || '',
        isSensitive: Boolean(entry.isSensitive),
      };
  }
}

function renderManagedEntryDetails(section: ManagedSectionKey, entry: any) {
  switch (section) {
    case 'surgical':
      return (
        <>
          <p className="text-sm text-gray-600">{entry.indication || 'No indication listed'}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>Facility: {entry.facility || 'Not listed'}</span>
            <span>Surgeon: {entry.surgeon || 'Not listed'}</span>
            <span>Complications: {entry.complications || 'None listed'}</span>
          </div>
          {entry.notes ? <p className="mt-2 text-sm text-gray-500">{entry.notes}</p> : null}
        </>
      );
    case 'hospitalizations':
      return (
        <>
          <p className="text-sm text-gray-600">{entry.diagnosis || entry.reason}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>Hospital: {entry.facility || 'Not listed'}</span>
            <span>Attending: {entry.attendingProvider || 'Not listed'}</span>
          </div>
          {entry.treatmentSummary ? <p className="mt-2 text-sm text-gray-500">{entry.treatmentSummary}</p> : null}
          {entry.notes ? <p className="mt-2 text-sm text-gray-500">{entry.notes}</p> : null}
        </>
      );
    case 'emergency':
      return (
        <>
          <p className="text-sm text-gray-600">{entry.diagnosis || entry.reason}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>Facility: {entry.facility || 'Not listed'}</span>
            <span>Treatment: {entry.treatment || 'Not listed'}</span>
            <span>Disposition: {entry.disposition || 'Not listed'}</span>
          </div>
          {entry.notes ? <p className="mt-2 text-sm text-gray-500">{entry.notes}</p> : null}
        </>
      );
    case 'social':
      return (
        <>
          <p className="text-sm text-gray-600">{entry.detail || 'No details listed'}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>Status: {entry.status || 'Not listed'}</span>
            <span>Range: {formatDateRangeLabel(entry.startDate, entry.endDate, 'No date range')}</span>
          </div>
          {entry.notes ? <p className="mt-2 text-sm text-gray-500">{entry.notes}</p> : null}
        </>
      );
    case 'reproductive':
      return (
        <>
          <p className="text-sm text-gray-600">{entry.detail || 'No details listed'}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>Outcome: {entry.outcome || 'Not listed'}</span>
            <span>Sensitive: {entry.isSensitive ? 'Yes' : 'No'}</span>
          </div>
          {entry.notes ? <p className="mt-2 text-sm text-gray-500">{entry.notes}</p> : null}
        </>
      );
    case 'mental':
      return (
        <>
          <p className="text-sm text-gray-600">{entry.treatment || 'No treatment listed'}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>Status: {entry.status || 'Not listed'}</span>
            <span>Provider: {entry.providerName || 'Not listed'}</span>
            <span>Sensitive: {entry.isSensitive ? 'Yes' : 'No'}</span>
          </div>
          {entry.notes ? <p className="mt-2 text-sm text-gray-500">{entry.notes}</p> : null}
        </>
      );
  }
}

function getEntryTitle(section: ManagedSectionKey, entry: any) {
  switch (section) {
    case 'surgical':
      return entry.procedureName || 'Untitled surgery';
    case 'hospitalizations':
      return entry.reason || 'Untitled hospitalization';
    case 'emergency':
      return entry.reason || 'Untitled emergency visit';
    case 'social':
      return entry.title || 'Untitled social history entry';
    case 'reproductive':
      return entry.title || 'Untitled reproductive history entry';
    case 'mental':
      return entry.conditionName || 'Untitled mental health entry';
  }
}

function getEntryDate(section: ManagedSectionKey, entry: any) {
  switch (section) {
    case 'surgical':
      return formatDateLabel(entry.surgeryDate);
    case 'hospitalizations':
      return formatDateRangeLabel(entry.admissionDate, entry.dischargeDate);
    case 'emergency':
      return entry.visitTime
        ? `${formatDateLabel(entry.visitDate)} • ${entry.visitTime}`
        : formatDateLabel(entry.visitDate);
    case 'social':
      return formatDateRangeLabel(entry.startDate, entry.endDate);
    case 'reproductive':
      return formatDateLabel(entry.eventDate);
    case 'mental':
      return formatDateLabel(entry.diagnosedDate);
  }
}

function getEntryBadge(section: ManagedSectionKey, entry: any) {
  switch (section) {
    case 'social':
      return entry.category || 'other';
    case 'reproductive':
      return entry.eventType || 'general';
    case 'mental':
      return entry.status || 'Tracked';
    default:
      return entry.sourceType === 'provider' ? 'Provider' : 'Patient';
  }
}

export default function MedicalHistory({ onBack, onNavigate }: MedicalHistoryProps) {
  const [data, setData] = useState<MedicalHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeEditor, setActiveEditor] = useState<{
    section: ManagedSectionKey;
    mode: 'create' | 'edit';
    entryId?: string;
  } | null>(null);
  const [editorValues, setEditorValues] = useState<EditorValues>({});
  const [sensitiveVisible, setSensitiveVisible] = useState({
    reproductive: false,
    mental: false,
  });

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const next = await fetchMedicalHistoryData();
      setData(next);
    } catch (err: any) {
      setError(err?.message || 'Unable to load medical history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const openCreateEditor = (section: ManagedSectionKey) => {
    setActiveEditor({ section, mode: 'create' });
    setEditorValues(getInitialValues(section));
  };

  const openEditEditor = (section: ManagedSectionKey, entry: any) => {
    setActiveEditor({ section, mode: 'edit', entryId: entry.id });
    setEditorValues(getFormValuesFromEntry(section, entry));
  };

  const closeEditor = () => {
    setActiveEditor(null);
    setEditorValues({});
  };

  const handleSaveEditor = async () => {
    if (!activeEditor) return;

    setSaving(true);
    try {
      if (activeEditor.mode === 'create') {
        await api.createMyMedicalHistoryEntry(activeEditor.section, editorValues);
      } else if (activeEditor.entryId) {
        await api.updateMyMedicalHistoryEntry(activeEditor.section, activeEditor.entryId, editorValues);
      }

      closeEditor();
      await loadHistory();
    } catch (err: any) {
      alert(err?.message || 'Failed to save medical history entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (section: ManagedSectionKey, entry: any) => {
    const label = getEntryTitle(section, entry);
    if (!window.confirm(`Delete "${label}" from ${sectionConfigs[section].title.toLowerCase()}?`)) {
      return;
    }

    try {
      await api.deleteMyMedicalHistoryEntry(section, entry.id);
      if (activeEditor?.entryId === entry.id) {
        closeEditor();
      }
      await loadHistory();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete medical history entry');
    }
  };

  const renderManagedSection = (section: ManagedSectionKey, entries: any[]) => {
    const config = sectionConfigs[section];
    const isSensitiveHidden =
      Boolean(config.sensitive) &&
      !sensitiveVisible[section as keyof typeof sensitiveVisible];

    return (
      <section key={section}>
        <SectionHeader
          title={config.title}
          description={config.description}
          actions={
            <>
              {config.sensitive ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSensitiveVisible((current) => ({
                      ...current,
                      [section]: !current[section as keyof typeof current],
                    }))
                  }
                >
                  {isSensitiveHidden ? (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Show
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide
                    </>
                  )}
                </Button>
              ) : null}
              <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700" onClick={() => openCreateEditor(section)}>
                <Plus className="w-4 h-4 mr-2" />
                {config.addLabel}
              </Button>
            </>
          }
        />

        {activeEditor?.section === section && activeEditor.mode === 'create' && (
          <div className="mb-3">
            <HistoryEditor
              section={section}
              values={editorValues}
              saving={saving}
              onChange={(key, value) => setEditorValues((current) => ({ ...current, [key]: value }))}
              onSave={handleSaveEditor}
              onCancel={closeEditor}
            />
          </div>
        )}

        {isSensitiveHidden ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Sensitive details are hidden on this device until you choose to reveal them.
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-gray-900">{getEntryTitle(section, entry)}</h4>
                    <p className="mt-1 text-sm text-gray-500">{getEntryDate(section, entry)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-0 bg-blue-100 text-blue-700">{getEntryBadge(section, entry)}</Badge>
                    <Button size="sm" variant="outline" onClick={() => openEditEditor(section, entry)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteEntry(section, entry)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>

                {activeEditor?.section === section &&
                activeEditor.mode === 'edit' &&
                activeEditor.entryId === entry.id ? (
                  <HistoryEditor
                    section={section}
                    values={editorValues}
                    saving={saving}
                    onChange={(key, value) => setEditorValues((current) => ({ ...current, [key]: value }))}
                    onSave={handleSaveEditor}
                    onCancel={closeEditor}
                  />
                ) : (
                  renderManagedEntryDetails(section, entry)
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyCard message={config.emptyMessage} />
        )}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-gray-900">Medical History</h1>
            <p className="text-sm text-gray-500">
              Data-backed view of your chart plus editable structured history sections.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          This page now reads from your real conditions, medications, appointments, records, emergency profile,
          health summary, and dedicated medical-history tables for surgery, hospitalizations, ER visits, social
          history, reproductive history, mental health history, and audit history.
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Last update reflected here: {loading ? 'Loading...' : data?.lastUpdatedLabel || 'No updates yet'}</span>
          </div>
        </div>

        {loading && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
            Loading medical history...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-white p-6">
            <div className="mb-4 flex items-start gap-3">
              <AlertCircle className="mt-0.5 w-5 h-5 text-red-600" />
              <div>
                <h3 className="text-gray-900">Could not load medical history</h3>
                <p className="mt-1 text-sm text-gray-600">{error}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => void loadHistory()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {data.summaryCards.map((card) => (
                <SummaryCard
                  key={card.id}
                  icon={
                    card.id === 'conditions' ? (
                      <Stethoscope className="w-4 h-4 text-teal-600" />
                    ) : card.id === 'medications' ? (
                      <Pill className="w-4 h-4 text-teal-600" />
                    ) : card.id === 'encounters' ? (
                      <Clock3 className="w-4 h-4 text-teal-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-teal-600" />
                    )
                  }
                  title={card.title}
                  value={card.value}
                  detail={card.detail}
                  actionLabel={card.actionLabel}
                  onClick={() => onNavigate(card.actionScreen)}
                />
              ))}
            </div>

            <section>
              <SectionHeader
                title="Conditions and problem list"
                description="Active and resolved conditions come from your condition records and health summary."
                actions={
                  <Button size="sm" variant="outline" onClick={() => onNavigate('health-summary')}>
                    Open health summary
                  </Button>
                }
              />

              <div className="space-y-3">
                {data.activeConditions.length > 0 ? (
                  data.activeConditions.map((item) => <ConditionCard key={item.id} item={item} />)
                ) : (
                  <EmptyCard message="No active conditions are currently listed in your chart." />
                )}
              </div>

              {data.resolvedConditions.length > 0 && (
                <div className="mt-4">
                  <p className="mb-3 text-sm text-gray-500">Resolved or inactive history</p>
                  <div className="space-y-3">
                    {data.resolvedConditions.map((item) => (
                      <ConditionCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section>
              <SectionHeader
                title="Medication history and allergies"
                description="Medication history is pulled from your medication list. Allergies still come from your health summary."
                actions={
                  <Button size="sm" variant="outline" onClick={() => onNavigate('medications')}>
                    Open medications
                  </Button>
                }
              />

              <div className="space-y-3">
                {data.activeMedications.length > 0 ? (
                  data.activeMedications.map((item) => <MedicationCard key={item.id} item={item} />)
                ) : (
                  <EmptyCard message="No current medications are saved yet." />
                )}
              </div>

              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  <h4 className="text-gray-900">Allergies</h4>
                </div>
                {data.allergies.length > 0 ? (
                  <div className="space-y-2">
                    {data.allergies.map((allergy) => (
                      <div key={allergy.id} className="rounded-lg bg-gray-50 p-3">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="text-gray-900">{allergy.name}</p>
                          <Badge className="border-0 bg-red-100 text-red-700">{allergy.severity}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{allergy.reaction || 'Reaction not listed'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyCard message="No allergies are saved in your health summary." />
                )}
              </div>

              {data.pastMedications.length > 0 && (
                <div className="mt-4">
                  <p className="mb-3 text-sm text-gray-500">Past medications</p>
                  <div className="space-y-3">
                    {data.pastMedications.map((item) => (
                      <MedicationCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section>
              <SectionHeader
                title="Encounters and records"
                description="Past appointments are shown as encounter history, and uploaded or provider-linked files appear below."
                actions={
                  <Button size="sm" variant="outline" onClick={() => onNavigate('records')}>
                    View records
                  </Button>
                }
              />

              <div className="space-y-3">
                {data.encounters.length > 0 ? (
                  data.encounters.slice(0, 5).map((item) => <EncounterCard key={item.id} item={item} />)
                ) : (
                  <EmptyCard message="No past appointments are available in this account yet." />
                )}
              </div>

              <div className="mt-4 space-y-3">
                {data.records.length > 0 ? (
                  data.records.slice(0, 6).map((item) => <RecordCard key={item.id} item={item} />)
                ) : (
                  <EmptyCard message="No uploaded or linked records are currently saved." />
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={() => onNavigate('appointments')}>
                  Open appointments
                </Button>
                <Button variant="outline" onClick={() => onNavigate('records')}>
                  View full records
                </Button>
              </div>
            </section>

            {renderManagedSection('surgical', data.surgicalHistory)}
            {renderManagedSection('hospitalizations', data.hospitalizations)}
            {renderManagedSection('emergency', data.emergencyVisits)}
            {renderManagedSection('social', data.socialHistory)}
            {renderManagedSection('reproductive', data.reproductiveHistory)}
            {renderManagedSection('mental', data.mentalHealthHistory)}

            <section>
              <SectionHeader
                title="Supporting history"
                description="These facts are supported today through your health summary and emergency profile."
                actions={
                  <Button size="sm" variant="outline" onClick={() => onNavigate('emergency-profile')}>
                    Emergency profile
                  </Button>
                }
              />

              <div className="space-y-3">
                {data.keyFacts.map((fact) => (
                  <div key={fact.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-500">{fact.label}</p>
                        <p className="mt-1 text-gray-900">{fact.value}</p>
                      </div>
                      {fact.actionLabel && fact.actionScreen ? (
                        <Button size="sm" variant="outline" onClick={() => onNavigate(fact.actionScreen!)}>
                          {fact.actionLabel}
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-sm text-gray-600">{fact.detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h4 className="text-gray-900">Immunizations</h4>
                </div>
                {data.immunizations.length > 0 ? (
                  <div className="space-y-2">
                    {data.immunizations.map((immunization) => (
                      <div key={immunization.id} className="rounded-lg bg-gray-50 p-3">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="text-gray-900">{immunization.name}</p>
                          <Badge className="border-0 bg-green-100 text-green-700">{immunization.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{immunization.detail}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {immunization.date ? `Date: ${immunization.date}` : 'No date recorded'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyCard message="No immunizations are currently recorded in your health summary." />
                )}
              </div>

              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-gray-900">Family history</h4>
                </div>
                {data.familyHistory.length > 0 ? (
                  <div className="space-y-2">
                    {data.familyHistory.map((item) => (
                      <div key={item.id} className="rounded-lg bg-gray-50 p-3">
                        <p className="text-gray-900">{item.condition}</p>
                        <p className="text-sm text-gray-600">{item.relation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyCard message="No family history is currently stored in your health summary." />
                )}
              </div>
            </section>

            <section>
              <SectionHeader
                title="Edit audit"
                description="Every create, update, and delete in the structured medical-history sections is logged here."
              />

              {data.auditEvents.length > 0 ? (
                <div className="space-y-3">
                  {data.auditEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <History className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-gray-900">{event.summary}</p>
                            <p className="mt-1 text-sm text-gray-500">{formatDateLabel(event.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="border-0 bg-gray-100 text-gray-700">{event.sectionType}</Badge>
                          <Badge
                            className={
                              event.actionType === 'created'
                                ? 'border-0 bg-green-100 text-green-700'
                                : event.actionType === 'updated'
                                ? 'border-0 bg-blue-100 text-blue-700'
                                : 'border-0 bg-red-100 text-red-700'
                            }
                          >
                            {event.actionType}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Actor: {event.actorType}
                        {event.entryId ? ` • Entry ID: ${event.entryId}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 w-5 h-5 text-amber-700" />
                    <div>
                      <p className="text-gray-900">No structured history edits logged yet</p>
                      <p className="mt-1 text-sm text-gray-600">
                        The audit feed starts populating once you create, update, or delete entries in the new sections.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
