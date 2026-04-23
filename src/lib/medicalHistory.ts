import {
  api,
  type HealthSummaryAllergy,
  type HealthSummaryCondition,
  type HealthSummaryFamilyHistory,
  type HealthSummaryImmunization,
  type HealthSummaryPayload,
  type PatientAppointment,
  type PatientEmergencyProfile,
  type PatientEmergencyVisitEntry,
  type PatientHospitalizationEntry,
  type PatientMedicalHistoryAuditEvent,
  type PatientMedicalHistoryPayload,
  type PatientMedication,
  type PatientMentalHealthHistoryEntry,
  type PatientReproductiveHistoryEntry,
  type PatientSocialHistoryEntry,
  type PatientSurgicalHistoryEntry,
  type RecordDocument,
} from '@/lib/api';
import type { PatientDataScreen } from '@/lib/patientDataNavigation';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface MedicalHistorySummaryCard {
  id: string;
  title: string;
  value: string;
  detail: string;
  actionLabel: string;
  actionScreen: PatientDataScreen;
}

export interface MedicalHistoryConditionItem {
  id: string;
  name: string;
  statusLabel: string;
  dateLabel: string;
  detail: string;
  provider: string;
}

export interface MedicalHistoryMedicationItem {
  id: string;
  name: string;
  statusLabel: string;
  dateLabel: string;
  detail: string;
  provider: string;
  adherenceLabel: string;
}

export interface MedicalHistoryEncounterItem {
  id: string;
  title: string;
  dateLabel: string;
  detail: string;
  statusLabel: string;
}

export interface MedicalHistoryRecordItem {
  id: string;
  title: string;
  categoryLabel: string;
  dateLabel: string;
  detail: string;
  statusLabel: string;
}

export interface MedicalHistoryFactItem {
  id: string;
  label: string;
  value: string;
  detail: string;
  actionLabel?: string;
  actionScreen?: PatientDataScreen;
}

export interface MedicalHistoryData {
  summaryCards: MedicalHistorySummaryCard[];
  activeConditions: MedicalHistoryConditionItem[];
  resolvedConditions: MedicalHistoryConditionItem[];
  activeMedications: MedicalHistoryMedicationItem[];
  pastMedications: MedicalHistoryMedicationItem[];
  allergies: HealthSummaryAllergy[];
  immunizations: HealthSummaryImmunization[];
  familyHistory: HealthSummaryFamilyHistory[];
  encounters: MedicalHistoryEncounterItem[];
  records: MedicalHistoryRecordItem[];
  keyFacts: MedicalHistoryFactItem[];
  surgicalHistory: PatientSurgicalHistoryEntry[];
  hospitalizations: PatientHospitalizationEntry[];
  emergencyVisits: PatientEmergencyVisitEntry[];
  socialHistory: PatientSocialHistoryEntry[];
  reproductiveHistory: PatientReproductiveHistoryEntry[];
  mentalHealthHistory: PatientMentalHealthHistoryEntry[];
  auditEvents: PatientMedicalHistoryAuditEvent[];
  lastUpdatedLabel: string;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sortByDateDesc<T>(items: T[], getDate: (item: T) => string | null | undefined) {
  return [...items].sort(
    (a, b) => (parseDate(getDate(b))?.getTime() || 0) - (parseDate(getDate(a))?.getTime() || 0)
  );
}

export function formatDateLabel(value?: string | null, fallback = 'Not on file') {
  const date = parseDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateRangeLabel(
  start?: string | null,
  end?: string | null,
  fallback = 'Not on file'
) {
  if (!start && !end) return fallback;
  if (start && end) return `${formatDateLabel(start)} to ${formatDateLabel(end)}`;
  return start ? formatDateLabel(start) : `Until ${formatDateLabel(end)}`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function normalizeText(value?: string | null) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isResolvedCondition(condition: HealthSummaryCondition) {
  if (condition.isActive === false) return true;
  const status = normalizeText(condition.status);
  return ['resolved', 'inactive', 'completed', 'history'].some((token) => status.includes(token));
}

function formatConditionItem(condition: HealthSummaryCondition): MedicalHistoryConditionItem {
  return {
    id: condition.id,
    name: condition.name || 'Untitled condition',
    statusLabel: String(condition.status || '').trim() || (isResolvedCondition(condition) ? 'Resolved' : 'Active'),
    dateLabel: formatDateLabel(condition.diagnosed || condition.createdAt || condition.updatedAt),
    detail:
      String(condition.metric || '').trim() ||
      String(condition.notes || '').trim() ||
      'No extra notes have been added yet.',
    provider:
      String(condition.provider || '').trim() ||
      (condition.sourceType === 'patient' ? 'Added by patient' : 'Provider documented'),
  };
}

function formatMedicationItem(medication: PatientMedication): MedicalHistoryMedicationItem {
  const dateLabel = medication.isActive
    ? `Started ${formatDateLabel(medication.startDate, 'date unknown')}`
    : medication.endDate
    ? `${formatDateLabel(medication.startDate, 'Start unknown')} to ${formatDateLabel(medication.endDate)}`
    : `Updated ${formatDateLabel(medication.updatedAt)}`;

  return {
    id: medication.id,
    name: medication.name,
    statusLabel: medication.isActive ? 'Current' : 'Past',
    dateLabel,
    detail:
      [medication.dosage, medication.frequency, medication.purpose].filter(Boolean).join(' • ') ||
      medication.notes ||
      'No extra medication details listed.',
    provider: medication.prescriberName || medication.hospitalName || medication.pharmacy || 'No prescriber listed',
    adherenceLabel: medication.adherenceStatus.replace(/_/g, ' '),
  };
}

function formatEncounterItem(appointment: PatientAppointment): MedicalHistoryEncounterItem {
  return {
    id: appointment.id,
    title: appointment.appointmentType || 'Appointment',
    dateLabel: formatDateLabel(appointment.startTime),
    detail:
      [
        appointment.providerName || appointment.hospitalName || 'Provider not listed',
        appointment.visitMode ? `${appointment.visitMode.replace('-', ' ')} visit` : null,
      ]
        .filter(Boolean)
        .join(' • ') || 'Visit details not available',
    statusLabel: appointment.status || 'Recorded',
  };
}

function formatRecordCategory(category: RecordDocument['category']) {
  switch (category) {
    case 'labs':
      return 'Lab result';
    case 'imaging':
      return 'Imaging';
    case 'visits':
      return 'Visit note';
    case 'prescriptions':
      return 'Prescription';
    case 'insurance':
      return 'Insurance';
    default:
      return 'Other record';
  }
}

function formatRecordItem(record: RecordDocument): MedicalHistoryRecordItem {
  return {
    id: record.id,
    title: record.title,
    categoryLabel: formatRecordCategory(record.category),
    dateLabel: formatDateLabel(record.serviceDate || record.uploadDate),
    detail:
      [record.sourceOrganizationName, record.description || record.subtype].filter(Boolean).join(' • ') ||
      'No extra document details listed.',
    statusLabel: record.verificationLabel || record.verificationStatus || 'On file',
  };
}

function getLatestUpdatedLabel(input: {
  conditions: HealthSummaryCondition[];
  medications: PatientMedication[];
  appointments: PatientAppointment[];
  records: RecordDocument[];
  summary: HealthSummaryPayload | null;
  emergency: PatientEmergencyProfile | null;
  history: PatientMedicalHistoryPayload;
}) {
  const timestamps = [
    ...input.conditions.map((condition) => condition.updatedAt || condition.createdAt || condition.diagnosed || null),
    ...input.medications.map((medication) => medication.updatedAt || medication.createdAt || medication.startDate || null),
    ...input.appointments.map((appointment) => appointment.startTime || null),
    ...input.records.map((record) => record.serviceDate || record.uploadDate || null),
    ...input.history.surgicalHistory.map((entry) => entry.updatedAt || entry.surgeryDate || entry.createdAt),
    ...input.history.hospitalizations.map(
      (entry) => entry.updatedAt || entry.dischargeDate || entry.admissionDate || entry.createdAt
    ),
    ...input.history.emergencyVisits.map((entry) => entry.updatedAt || entry.visitDate || entry.createdAt),
    ...input.history.socialHistory.map((entry) => entry.updatedAt || entry.endDate || entry.startDate || entry.createdAt),
    ...input.history.reproductiveHistory.map((entry) => entry.updatedAt || entry.eventDate || entry.createdAt),
    ...input.history.mentalHealthHistory.map(
      (entry) => entry.updatedAt || entry.diagnosedDate || entry.createdAt
    ),
    ...input.history.auditEvents.map((entry) => entry.createdAt),
    input.summary?.updatedAt || null,
    input.emergency?.updated_at || null,
  ].filter(Boolean) as string[];

  const latest = sortByDateDesc(timestamps, (value) => value)[0];
  return formatDateLabel(latest, 'No recent updates');
}

function buildKeyFacts(input: {
  summary: HealthSummaryPayload | null;
  emergency: PatientEmergencyProfile | null;
  activeConditions: HealthSummaryCondition[];
  activeMedications: PatientMedication[];
}) {
  const emergencyContactName =
    input.summary?.emergencyContacts?.[0]?.name ||
    input.emergency?.emergency_contact_full_name ||
    'No emergency contact';
  const emergencyContactPhone =
    input.summary?.emergencyContacts?.[0]?.phone ||
    input.emergency?.emergency_contact_phone ||
    'Add one in Emergency Profile';
  const currentMedicationSummary = input.summary?.currentMedications?.length
    ? input.summary.currentMedications.slice(0, 2).join(', ')
    : input.activeMedications.length > 0
    ? input.activeMedications
        .slice(0, 2)
        .map((medication) => medication.name)
        .join(', ')
    : 'No medication summary saved';
  const bloodType = input.summary?.bloodType || input.emergency?.blood_type || 'Not recorded';

  return [
    {
      id: 'blood-type',
      label: 'Blood type',
      value: bloodType,
      detail:
        bloodType === 'Not recorded'
          ? 'Add or confirm this in your emergency profile.'
          : 'Visible in your health summary.',
      actionLabel: 'Emergency profile',
      actionScreen: 'emergency-profile' as const,
    },
    {
      id: 'emergency-contact',
      label: 'Emergency contact',
      value: emergencyContactName,
      detail: emergencyContactPhone,
      actionLabel: 'Update contact',
      actionScreen: 'emergency-profile' as const,
    },
    {
      id: 'medication-summary',
      label: 'Medication snapshot',
      value: currentMedicationSummary,
      detail: `${pluralize(input.activeMedications.length, 'active medication')} currently tracked.`,
      actionLabel: 'Open medications',
      actionScreen: 'medications' as const,
    },
    {
      id: 'conditions-summary',
      label: 'Condition snapshot',
      value:
        input.activeConditions.length > 0
          ? input.activeConditions
              .slice(0, 2)
              .map((condition) => condition.name)
              .join(', ')
          : 'No active conditions listed',
      detail: `${pluralize(input.activeConditions.length, 'active condition')} reflected in this history view.`,
      actionLabel: 'Health summary',
      actionScreen: 'health-summary' as const,
    },
  ];
}

function buildSummaryCards(input: {
  activeConditions: HealthSummaryCondition[];
  resolvedConditions: HealthSummaryCondition[];
  activeMedications: PatientMedication[];
  encounters: PatientAppointment[];
  records: RecordDocument[];
  history: PatientMedicalHistoryPayload;
}) {
  const recentEncounters = input.encounters.filter((appointment) => {
    const time = parseDate(appointment.startTime)?.getTime();
    return Boolean(
      time && Date.now() - time <= 365 * DAY_MS && String(appointment.status || '').toLowerCase() !== 'cancelled'
    );
  });

  const structuredHistoryCount =
    input.history.surgicalHistory.length +
    input.history.hospitalizations.length +
    input.history.emergencyVisits.length +
    input.history.socialHistory.length +
    input.history.reproductiveHistory.length +
    input.history.mentalHealthHistory.length;

  return [
    {
      id: 'conditions',
      title: 'Conditions',
      value: `${input.activeConditions.length}`,
      detail: `${input.resolvedConditions.length} resolved or inactive`,
      actionLabel: 'Health summary',
      actionScreen: 'health-summary' as const,
    },
    {
      id: 'medications',
      title: 'Current meds',
      value: `${input.activeMedications.length}`,
      detail: input.activeMedications.length > 0 ? input.activeMedications[0].name : 'No current medications',
      actionLabel: 'Open medications',
      actionScreen: 'medications' as const,
    },
    {
      id: 'encounters',
      title: 'Recent visits',
      value: `${recentEncounters.length}`,
      detail: `${structuredHistoryCount} structured history entries saved`,
      actionLabel: 'Appointments',
      actionScreen: 'appointments' as const,
    },
    {
      id: 'records',
      title: 'Records saved',
      value: `${input.records.length}`,
      detail: input.records.length > 0 ? input.records[0].title : 'No uploaded records yet',
      actionLabel: 'View records',
      actionScreen: 'records' as const,
    },
  ];
}

export async function fetchMedicalHistoryData(): Promise<MedicalHistoryData> {
  const [conditionsRes, medicationsRes, appointmentsRes, recordsRes, summaryRes, emergencyRes, historyRes] =
    await Promise.all([
      api.listMyConditions().catch(() => ({ conditions: [] as HealthSummaryCondition[] })),
      api.listMyMedications().catch(() => ({ medications: [] as PatientMedication[] })),
      api.listMyAppointments('all').catch(() => ({ appointments: [] as PatientAppointment[] })),
      api.listMyRecords().catch(() => ({ documents: [] as RecordDocument[] })),
      api.getMyHealthSummary().catch(() => ({ summary: null as HealthSummaryPayload | null })),
      api.getMyEmergencyProfile().catch(() => null as PatientEmergencyProfile | null),
      api.getMyMedicalHistory().catch(
        () =>
          ({
            history: {
              surgicalHistory: [] as PatientSurgicalHistoryEntry[],
              hospitalizations: [] as PatientHospitalizationEntry[],
              emergencyVisits: [] as PatientEmergencyVisitEntry[],
              socialHistory: [] as PatientSocialHistoryEntry[],
              reproductiveHistory: [] as PatientReproductiveHistoryEntry[],
              mentalHealthHistory: [] as PatientMentalHealthHistoryEntry[],
              auditEvents: [] as PatientMedicalHistoryAuditEvent[],
            },
          }) as { history: PatientMedicalHistoryPayload }
      ),
    ]);

  const conditions =
    conditionsRes.conditions.length > 0
      ? conditionsRes.conditions
      : summaryRes.summary?.conditions?.map((condition, index) => ({
          ...condition,
          id: condition.id || `summary-condition-${index + 1}`,
        })) || [];

  const activeConditions = sortByDateDesc(
    conditions.filter((condition) => !isResolvedCondition(condition)),
    (condition) => condition.updatedAt || condition.createdAt || condition.diagnosed
  );
  const resolvedConditions = sortByDateDesc(
    conditions.filter((condition) => isResolvedCondition(condition)),
    (condition) => condition.updatedAt || condition.createdAt || condition.diagnosed
  );
  const activeMedications = sortByDateDesc(
    medicationsRes.medications.filter((medication) => medication.isActive),
    (medication) => medication.updatedAt || medication.createdAt || medication.startDate
  );
  const pastMedications = sortByDateDesc(
    medicationsRes.medications.filter((medication) => !medication.isActive),
    (medication) => medication.endDate || medication.updatedAt || medication.createdAt
  );
  const encounters = sortByDateDesc(
    appointmentsRes.appointments.filter((appointment) => {
      const time = parseDate(appointment.startTime)?.getTime();
      return Boolean(time && time < Date.now());
    }),
    (appointment) => appointment.startTime
  );
  const records = sortByDateDesc(recordsRes.documents, (record) => record.serviceDate || record.uploadDate);

  return {
    summaryCards: buildSummaryCards({
      activeConditions,
      resolvedConditions,
      activeMedications,
      encounters,
      records,
      history: historyRes.history,
    }),
    activeConditions: activeConditions.map(formatConditionItem),
    resolvedConditions: resolvedConditions.map(formatConditionItem),
    activeMedications: activeMedications.map(formatMedicationItem),
    pastMedications: pastMedications.map(formatMedicationItem),
    allergies: summaryRes.summary?.allergies || [],
    immunizations: summaryRes.summary?.immunizations || [],
    familyHistory: summaryRes.summary?.familyHistory || [],
    encounters: encounters.map(formatEncounterItem),
    records: records.map(formatRecordItem),
    keyFacts: buildKeyFacts({
      summary: summaryRes.summary,
      emergency: emergencyRes,
      activeConditions,
      activeMedications,
    }),
    surgicalHistory: historyRes.history.surgicalHistory,
    hospitalizations: historyRes.history.hospitalizations,
    emergencyVisits: historyRes.history.emergencyVisits,
    socialHistory: historyRes.history.socialHistory,
    reproductiveHistory: historyRes.history.reproductiveHistory,
    mentalHealthHistory: historyRes.history.mentalHealthHistory,
    auditEvents: historyRes.history.auditEvents,
    lastUpdatedLabel: getLatestUpdatedLabel({
      conditions,
      medications: medicationsRes.medications,
      appointments: appointmentsRes.appointments,
      records,
      summary: summaryRes.summary,
      emergency: emergencyRes,
      history: historyRes.history,
    }),
  };
}
