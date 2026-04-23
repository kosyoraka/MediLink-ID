import {
  api,
  type HealthSummaryCondition,
  type HealthSummaryPayload,
  type PatientAppointment,
  type PatientMedication,
  type Provider,
  type RecordDocument,
} from '@/lib/api';
import type { PatientDataScreen } from '@/lib/patientDataNavigation';

const DAY_MS = 24 * 60 * 60 * 1000;

type JourneyMilestoneState = 'completed' | 'current' | 'upcoming';

export interface CareJourneyMilestone {
  id: string;
  title: string;
  detail: string;
  dateLabel: string;
  state: JourneyMilestoneState;
  actionLabel?: string;
  actionScreen?: PatientDataScreen;
}

export interface CareJourneySignal {
  id: string;
  label: string;
  value: string;
  detail: string;
}

export interface CareJourneyTeamMember {
  id: string;
  name: string;
  role: string;
  detail: string;
}

export interface CareJourneyQuickAction {
  id: string;
  label: string;
  screen: PatientDataScreen;
  variant?: 'default' | 'outline';
}

export interface CareJourney {
  id: string;
  title: string;
  conditionName: string;
  statusLabel: string;
  progress: number;
  durationLabel: string;
  currentPhase: string;
  summary: string;
  diagnosedLabel: string;
  metricLabel: string;
  sourceLabel: string;
  milestones: CareJourneyMilestone[];
  signals: CareJourneySignal[];
  careTeam: CareJourneyTeamMember[];
  quickActions: CareJourneyQuickAction[];
}

export interface CareJourneysData {
  journeys: CareJourney[];
  archivedJourneys: CareJourney[];
  totalActiveConditions: number;
  totalResolvedConditions: number;
  trackedMedicationCount: number;
  linkedProviderCount: number;
  lastUpdatedLabel: string;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateLabel(value?: string | null, fallback = 'Not on file') {
  const date = parseDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

function getConditionKeywords(name: string) {
  const stopWords = new Set([
    'and',
    'type',
    'stage',
    'disease',
    'disorder',
    'chronic',
    'acute',
    'management',
    'control',
    'controlled',
    'condition',
    'of',
    'the',
  ]);

  return normalizeText(name)
    .split(' ')
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function matchesConditionText(conditionName: string, texts: Array<string | null | undefined>) {
  const haystack = normalizeText(texts.filter(Boolean).join(' '));
  if (!haystack) return false;

  const keywords = getConditionKeywords(conditionName);
  if (keywords.length === 0) return haystack.includes(normalizeText(conditionName));

  return keywords.some((keyword) => haystack.includes(keyword));
}

function isResolvedCondition(condition: HealthSummaryCondition) {
  if (condition.isActive === false) return true;
  const status = normalizeText(condition.status);
  return ['resolved', 'inactive', 'completed', 'history'].some((token) => status.includes(token));
}

function getConditionRecordedAt(condition: HealthSummaryCondition) {
  return condition.diagnosed || condition.createdAt || condition.updatedAt || null;
}

function formatDurationLabel(value?: string | null) {
  const date = parseDate(value);
  if (!date) return 'Recently added';

  const diffMs = Math.max(Date.now() - date.getTime(), 0);
  const diffDays = Math.floor(diffMs / DAY_MS);

  if (diffDays < 30) return 'Started this month';

  const diffMonths = Math.max(1, Math.floor(diffDays / 30));
  if (diffMonths < 12) return `${pluralize(diffMonths, 'month')} on record`;

  const diffYears = Math.max(1, Math.floor(diffMonths / 12));
  return `${pluralize(diffYears, 'year')} on record`;
}

function sortByDateDesc<T>(items: T[], getDate: (item: T) => string | null | undefined) {
  return [...items].sort(
    (a, b) => (parseDate(getDate(b))?.getTime() || 0) - (parseDate(getDate(a))?.getTime() || 0)
  );
}

function sortByDateAsc<T>(items: T[], getDate: (item: T) => string | null | undefined) {
  return [...items].sort(
    (a, b) => (parseDate(getDate(a))?.getTime() || Number.MAX_SAFE_INTEGER) - (parseDate(getDate(b))?.getTime() || Number.MAX_SAFE_INTEGER)
  );
}

function getPastAppointments(appointments: PatientAppointment[]) {
  const now = Date.now();
  return sortByDateDesc(
    appointments.filter((appointment) => {
      const time = parseDate(appointment.startTime)?.getTime();
      return Boolean(time && time < now && String(appointment.status || '').toLowerCase() !== 'cancelled');
    }),
    (appointment) => appointment.startTime
  );
}

function getUpcomingAppointments(appointments: PatientAppointment[]) {
  const now = Date.now();
  return sortByDateAsc(
    appointments.filter((appointment) => {
      const time = parseDate(appointment.startTime)?.getTime();
      const status = String(appointment.status || '').toLowerCase();
      return Boolean(time && time >= now && !['cancelled', 'completed'].includes(status));
    }),
    (appointment) => appointment.startTime
  );
}

function isRecent(dateValue?: string | null, days = 180) {
  const time = parseDate(dateValue)?.getTime();
  if (!time) return false;
  return Date.now() - time <= days * DAY_MS;
}

function getLatestVitalDate(summary: HealthSummaryPayload | null) {
  if (!summary?.vitals?.length) return null;
  return sortByDateDesc(summary.vitals, (vital) => vital.recordedAt)[0]?.recordedAt || null;
}

function getLatestRecordDate(records: RecordDocument[]) {
  if (!records.length) return null;
  return sortByDateDesc(records, (record) => record.serviceDate || record.uploadDate)[0]?.serviceDate ||
    sortByDateDesc(records, (record) => record.serviceDate || record.uploadDate)[0]?.uploadDate ||
    null;
}

function getRelatedMedications(condition: HealthSummaryCondition, medications: PatientMedication[]) {
  const matches = medications.filter((medication) =>
    matchesConditionText(condition.name, [
      medication.purpose,
      medication.notes,
      medication.name,
      medication.dosage,
      medication.frequency,
    ])
  );

  return {
    active: matches.filter((medication) => medication.isActive),
    all: matches,
  };
}

function getRelatedRecords(condition: HealthSummaryCondition, records: RecordDocument[]) {
  return records.filter((record) =>
    matchesConditionText(condition.name, [
      record.title,
      record.description,
      record.subtype,
      record.category,
      record.sourceOrganizationName,
    ])
  );
}

function buildCareTeam(input: {
  condition: HealthSummaryCondition;
  providers: Provider[];
  medications: PatientMedication[];
  appointments: PatientAppointment[];
}) {
  const items: CareJourneyTeamMember[] = [];
  const seen = new Set<string>();

  const pushMember = (name: string, role: string, detail: string) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) return;
    const key = normalizeText(trimmed);
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push({
      id: `${key}-${items.length + 1}`,
      name: trimmed,
      role,
      detail,
    });
  };

  pushMember(
    input.condition.provider || '',
    'Condition provider',
    input.condition.verificationStatus === 'patient_noted' ? 'Added to your chart by you' : 'Listed on this condition'
  );

  input.medications.forEach((medication) => {
    pushMember(
      medication.prescriberName,
      'Prescriber',
      medication.hospitalName || medication.pharmacy || medication.purpose || 'Medication on file'
    );
  });

  input.providers.forEach((provider) => {
    pushMember(provider.name, provider.type || 'Connected provider', 'Linked in your MediLink care team');
  });

  input.appointments.forEach((appointment) => {
    pushMember(
      appointment.providerName,
      'Visit provider',
      appointment.hospitalName || appointment.appointmentType || 'Appointment on file'
    );
  });

  return items.slice(0, 4);
}

function buildMilestones(input: {
  condition: HealthSummaryCondition;
  isResolved: boolean;
  hasCareTeam: boolean;
  hasTreatmentPlan: boolean;
  latestVitalDate: string | null;
  latestRelatedRecordDate: string | null;
  latestPastAppointment: PatientAppointment | null;
  nextAppointment: PatientAppointment | null;
}) {
  const hasMonitoring = Boolean(input.latestVitalDate || input.latestRelatedRecordDate);
  const recentMonitoring = isRecent(input.latestVitalDate, 180) || isRecent(input.latestRelatedRecordDate, 180);
  const recentFollowup = isRecent(input.latestPastAppointment?.startTime || input.latestRelatedRecordDate, 365);

  return [
    {
      id: 'documented',
      title: 'Condition documented',
      detail: input.condition.diagnosed
        ? `Diagnosis date on file: ${formatDateLabel(input.condition.diagnosed)}.`
        : 'This condition is saved in your MediLink history.',
      dateLabel: formatDateLabel(getConditionRecordedAt(input.condition)),
      state: 'completed' as const,
      actionLabel: 'Review summary',
      actionScreen: 'health-summary' as const,
    },
    {
      id: 'care-team',
      title: 'Care team linked',
      detail: input.hasCareTeam
        ? 'A provider or connected care team member is attached to this journey.'
        : 'Connect or confirm the provider supporting this condition.',
      dateLabel: input.hasCareTeam ? 'Linked' : 'Needs review',
      state: input.hasCareTeam ? ('completed' as const) : ('current' as const),
      actionLabel: input.hasCareTeam ? 'Manage providers' : 'Connect providers',
      actionScreen: 'manage-providers' as const,
    },
    {
      id: 'treatment',
      title: 'Treatment plan listed',
      detail: input.hasTreatmentPlan
        ? 'Medication, notes, or metrics are attached to this condition.'
        : 'No medication plan or condition metric is linked yet.',
      dateLabel: input.hasTreatmentPlan ? 'On file' : 'Needs review',
      state: input.hasTreatmentPlan ? ('completed' as const) : ('current' as const),
      actionLabel: 'Review medications',
      actionScreen: 'medications' as const,
    },
    {
      id: 'monitoring',
      title: 'Monitoring data added',
      detail: recentMonitoring
        ? `Recent vitals or related records were updated by ${formatDateLabel(input.latestVitalDate || input.latestRelatedRecordDate)}.`
        : hasMonitoring
        ? 'Monitoring data exists, but it looks older than six months.'
        : 'No vitals or related records have been linked yet.',
      dateLabel: formatDateLabel(input.latestVitalDate || input.latestRelatedRecordDate, 'No recent data'),
      state: recentMonitoring
        ? ('completed' as const)
        : hasMonitoring
        ? ('current' as const)
        : ('upcoming' as const),
      actionLabel: recentMonitoring ? 'Open summary' : 'Update summary',
      actionScreen: 'health-summary' as const,
    },
    {
      id: 'followup',
      title: input.isResolved ? 'History preserved' : 'Recent follow-up completed',
      detail: input.isResolved
        ? 'This condition is marked inactive or resolved and remains available in your history.'
        : recentFollowup
        ? `A visit or related record exists from ${formatDateLabel(input.latestPastAppointment?.startTime || input.latestRelatedRecordDate)}.`
        : 'No recent follow-up is visible in the last year.',
      dateLabel: input.isResolved
        ? formatDateLabel(input.condition.updatedAt || input.condition.createdAt, 'History saved')
        : formatDateLabel(input.latestPastAppointment?.startTime || input.latestRelatedRecordDate, 'No recent follow-up'),
      state: input.isResolved
        ? ('completed' as const)
        : recentFollowup
        ? ('completed' as const)
        : ('current' as const),
      actionLabel: 'View records',
      actionScreen: 'records' as const,
    },
    {
      id: 'next-step',
      title: input.isResolved ? 'Status updated in chart' : 'Next check-in booked',
      detail: input.isResolved
        ? 'No active follow-up is required unless you or your provider reopen it.'
        : input.nextAppointment
        ? `Next appointment is booked for ${formatDateLabel(input.nextAppointment.startTime)}.`
        : 'No upcoming appointment is visible for this journey yet.',
      dateLabel: input.isResolved
        ? formatDateLabel(input.condition.updatedAt || input.condition.createdAt, 'Chart updated')
        : formatDateLabel(input.nextAppointment?.startTime, 'Nothing booked'),
      state: input.isResolved
        ? ('completed' as const)
        : input.nextAppointment
        ? ('current' as const)
        : ('upcoming' as const),
      actionLabel: 'Open appointments',
      actionScreen: 'appointments' as const,
    },
  ];
}

function buildSignals(input: {
  condition: HealthSummaryCondition;
  statusLabel: string;
  relatedActiveMedications: PatientMedication[];
  relatedRecords: RecordDocument[];
  latestVitalDate: string | null;
  latestPastAppointment: PatientAppointment | null;
  nextAppointment: PatientAppointment | null;
}) {
  return [
    {
      id: 'status',
      label: 'Condition status',
      value: input.statusLabel,
      detail: input.condition.metric?.trim()
        ? `Metric: ${input.condition.metric.trim()}`
        : `Diagnosed: ${formatDateLabel(input.condition.diagnosed, 'Date not listed')}`,
    },
    {
      id: 'medications',
      label: 'Medication support',
      value:
        input.relatedActiveMedications.length > 0
          ? pluralize(input.relatedActiveMedications.length, 'active medication')
          : 'No linked medication',
      detail:
        input.relatedActiveMedications[0]?.purpose ||
        input.relatedActiveMedications[0]?.dosage ||
        'Review this condition against your medication list.',
    },
    {
      id: 'monitoring',
      label: 'Latest monitoring',
      value: formatDateLabel(input.latestVitalDate, 'No vitals recorded'),
      detail:
        input.relatedRecords.length > 0
          ? `${pluralize(input.relatedRecords.length, 'related record')} stored in MediLink.`
          : 'No condition-specific records matched this journey yet.',
    },
    {
      id: 'followup',
      label: 'Next touchpoint',
      value: input.nextAppointment
        ? formatDateLabel(input.nextAppointment.startTime)
        : input.latestPastAppointment
        ? `Last seen ${formatDateLabel(input.latestPastAppointment.startTime)}`
        : 'Nothing scheduled',
      detail:
        input.nextAppointment?.providerName ||
        input.latestPastAppointment?.providerName ||
        input.latestPastAppointment?.hospitalName ||
        'Use appointments to book or review follow-up.',
    },
  ];
}

function buildSummaryText(input: {
  condition: HealthSummaryCondition;
  relatedActiveMedications: PatientMedication[];
  relatedRecords: RecordDocument[];
  nextAppointment: PatientAppointment | null;
}) {
  const notes = String(input.condition.notes || '').trim();
  if (notes) return notes;

  const parts = [
    input.condition.metric?.trim() ? `Metric: ${input.condition.metric.trim()}` : null,
    input.relatedActiveMedications.length > 0
      ? `${pluralize(input.relatedActiveMedications.length, 'active medication')} linked`
      : null,
    input.relatedRecords.length > 0 ? `${pluralize(input.relatedRecords.length, 'record')} matched` : null,
    input.nextAppointment ? `Next visit ${formatDateLabel(input.nextAppointment.startTime)}` : null,
  ].filter(Boolean);

  return parts.join(' • ') || 'Built from the condition details currently saved in your chart.';
}

function buildCurrentPhase(input: {
  isResolved: boolean;
  progress: number;
  hasTreatmentPlan: boolean;
  hasMonitoring: boolean;
  hasRecentFollowup: boolean;
  hasUpcomingCheckin: boolean;
}) {
  if (input.isResolved) return 'History on file';
  if (input.progress >= 84 && input.hasUpcomingCheckin) return 'Monitoring and maintenance';
  if (input.hasRecentFollowup && input.hasMonitoring) return 'Active follow-up';
  if (input.hasTreatmentPlan) return 'Building consistency';
  return 'Getting started';
}

function buildQuickActions(input: {
  hasCareTeam: boolean;
  hasTreatmentPlan: boolean;
  relatedRecords: RecordDocument[];
}) {
  const actions: CareJourneyQuickAction[] = [
    {
      id: 'appointments',
      label: 'Appointments',
      screen: 'appointments',
    },
    {
      id: 'health-summary',
      label: 'Health Summary',
      screen: 'health-summary',
      variant: 'outline',
    },
  ];

  actions.push({
    id: 'medications',
    label: input.hasTreatmentPlan ? 'Medications' : 'Add treatment details',
    screen: 'medications',
    variant: 'outline',
  });

  actions.push({
    id: 'records',
    label: input.relatedRecords.length > 0 ? 'View records' : 'Upload records',
    screen: 'records',
    variant: 'outline',
  });

  if (!input.hasCareTeam) {
    actions.push({
      id: 'providers',
      label: 'Connect providers',
      screen: 'manage-providers',
      variant: 'outline',
    });
  }

  return actions.slice(0, 4);
}

function buildJourney(input: {
  condition: HealthSummaryCondition;
  providers: Provider[];
  appointments: PatientAppointment[];
  medications: PatientMedication[];
  records: RecordDocument[];
  summary: HealthSummaryPayload | null;
}) {
  const isResolved = isResolvedCondition(input.condition);
  const { active: relatedActiveMedications, all: relatedMedications } = getRelatedMedications(
    input.condition,
    input.medications
  );
  const relatedRecords = sortByDateDesc(getRelatedRecords(input.condition, input.records), (record) => record.serviceDate || record.uploadDate);
  const careTeam = buildCareTeam({
    condition: input.condition,
    providers: input.providers,
    medications: relatedMedications,
    appointments: input.appointments,
  });
  const pastAppointments = getPastAppointments(input.appointments);
  const upcomingAppointments = getUpcomingAppointments(input.appointments);
  const latestPastAppointment = pastAppointments[0] || null;
  const nextAppointment = upcomingAppointments[0] || null;
  const latestVitalDate = getLatestVitalDate(input.summary);
  const latestRelatedRecordDate = getLatestRecordDate(relatedRecords);
  const hasCareTeam = careTeam.length > 0;
  const hasTreatmentPlan =
    relatedActiveMedications.length > 0 ||
    Boolean(input.summary?.currentMedications?.length) ||
    Boolean(input.condition.metric?.trim()) ||
    Boolean(input.condition.notes?.trim());
  const hasMonitoring = Boolean(latestVitalDate || latestRelatedRecordDate);
  const hasRecentFollowup = isRecent(latestPastAppointment?.startTime || latestRelatedRecordDate, 365);
  const hasUpcomingCheckin = Boolean(nextAppointment);
  const progressChecks = [
    true,
    hasCareTeam,
    hasTreatmentPlan,
    isRecent(latestVitalDate, 180) || isRecent(latestRelatedRecordDate, 180),
    hasRecentFollowup,
    isResolved ? true : hasUpcomingCheckin,
  ];
  const completedCount = progressChecks.filter(Boolean).length;
  const progress = isResolved ? 100 : Math.round((completedCount / progressChecks.length) * 100);
  const statusLabel = String(input.condition.status || '').trim() || (isResolved ? 'Resolved' : 'Active');
  const currentPhase = buildCurrentPhase({
    isResolved,
    progress,
    hasTreatmentPlan,
    hasMonitoring,
    hasRecentFollowup,
    hasUpcomingCheckin,
  });

  return {
    id: input.condition.id,
    title: input.condition.name || 'Untitled condition',
    conditionName: input.condition.name || 'Untitled condition',
    statusLabel,
    progress,
    durationLabel: formatDurationLabel(getConditionRecordedAt(input.condition)),
    currentPhase,
    summary: buildSummaryText({
      condition: input.condition,
      relatedActiveMedications,
      relatedRecords,
      nextAppointment,
    }),
    diagnosedLabel: formatDateLabel(input.condition.diagnosed, 'Diagnosis date not listed'),
    metricLabel: input.condition.metric?.trim() || 'No metric recorded',
    sourceLabel:
      input.condition.provider?.trim() ||
      (input.condition.sourceType === 'patient' ? 'Added by patient' : 'Provider documented'),
    milestones: buildMilestones({
      condition: input.condition,
      isResolved,
      hasCareTeam,
      hasTreatmentPlan,
      latestVitalDate,
      latestRelatedRecordDate,
      latestPastAppointment,
      nextAppointment,
    }),
    signals: buildSignals({
      condition: input.condition,
      statusLabel,
      relatedActiveMedications,
      relatedRecords,
      latestVitalDate,
      latestPastAppointment,
      nextAppointment,
    }),
    careTeam,
    quickActions: buildQuickActions({
      hasCareTeam,
      hasTreatmentPlan,
      relatedRecords,
    }),
  } satisfies CareJourney;
}

function getLatestUpdatedLabel(input: {
  conditions: HealthSummaryCondition[];
  medications: PatientMedication[];
  records: RecordDocument[];
  summary: HealthSummaryPayload | null;
  appointments: PatientAppointment[];
}) {
  const timestamps = [
    ...input.conditions.map((condition) => condition.updatedAt || condition.createdAt || condition.diagnosed || null),
    ...input.medications.map((medication) => medication.updatedAt || medication.createdAt || medication.startDate || null),
    ...input.records.map((record) => record.serviceDate || record.uploadDate || null),
    ...input.appointments.map((appointment) => appointment.startTime || null),
    input.summary?.updatedAt || null,
  ].filter(Boolean) as string[];

  const latest = sortByDateDesc(timestamps, (value) => value)[0];
  return formatDateLabel(latest, 'No recent updates');
}

export async function fetchCareJourneysData(): Promise<CareJourneysData> {
  const [conditionsRes, medicationsRes, appointmentsRes, recordsRes, providersRes, summaryRes] =
    await Promise.all([
      api.listMyConditions().catch(() => ({ conditions: [] as HealthSummaryCondition[] })),
      api.listMyMedications().catch(() => ({ medications: [] as PatientMedication[] })),
      api.listMyAppointments('all').catch(() => ({ appointments: [] as PatientAppointment[] })),
      api.listMyRecords().catch(() => ({ documents: [] as RecordDocument[] })),
      api.listMyProviders().catch(() => ({ providers: [] as Provider[] })),
      api.getMyHealthSummary().catch(() => ({ summary: null as HealthSummaryPayload | null })),
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

  return {
    journeys: activeConditions.map((condition) =>
      buildJourney({
        condition,
        providers: providersRes.providers,
        appointments: appointmentsRes.appointments,
        medications: medicationsRes.medications,
        records: recordsRes.documents,
        summary: summaryRes.summary,
      })
    ),
    archivedJourneys: resolvedConditions.map((condition) =>
      buildJourney({
        condition,
        providers: providersRes.providers,
        appointments: appointmentsRes.appointments,
        medications: medicationsRes.medications,
        records: recordsRes.documents,
        summary: summaryRes.summary,
      })
    ),
    totalActiveConditions: activeConditions.length,
    totalResolvedConditions: resolvedConditions.length,
    trackedMedicationCount: medicationsRes.medications.filter((medication) => medication.isActive).length,
    linkedProviderCount: providersRes.providers.length,
    lastUpdatedLabel: getLatestUpdatedLabel({
      conditions,
      medications: medicationsRes.medications,
      records: recordsRes.documents,
      summary: summaryRes.summary,
      appointments: appointmentsRes.appointments,
    }),
  };
}
