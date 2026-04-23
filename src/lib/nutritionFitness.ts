import {
  api,
  type HealthSummaryCondition,
  type HealthSummaryPayload,
  type PatientMedicalHistoryPayload,
  type PatientSocialHistoryEntry,
} from '@/lib/api';
import type { PatientDataScreen } from '@/lib/patientDataNavigation';

const DAY_MS = 24 * 60 * 60 * 1000;

type VitalType = 'bloodPressure' | 'heartRate' | 'weight' | 'bloodSugar';
type WeightUnit = 'lbs' | 'kg';
export type NutritionFitnessEditorKind = 'exercise' | 'nutrition';

type NutritionFitnessActionTarget =
  | {
      actionType: 'screen';
      actionScreen: PatientDataScreen;
      actionEditor?: never;
    }
  | {
      actionType: 'editor';
      actionEditor: NutritionFitnessEditorKind;
      actionScreen?: never;
    };

export type NutritionFitnessSummaryCard = NutritionFitnessActionTarget & {
  id: string;
  label: string;
  value: string;
  detail: string;
  actionLabel: string;
};

export type NutritionFitnessSignalItem = NutritionFitnessActionTarget & {
  id: VitalType;
  label: string;
  value: string;
  statusLabel: string;
  detail: string;
  actionLabel: string;
};

export interface NutritionFitnessHabitItem {
  id: string;
  title: string;
  statusLabel: string;
  dateLabel: string;
  detail: string;
  notes: string;
  sourceLabel: string;
  entry: PatientSocialHistoryEntry;
}

export type NutritionFitnessActionItem = NutritionFitnessActionTarget & {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
};

export interface NutritionFitnessData {
  coverageCount: number;
  coverageTotal: number;
  coverageLabel: string;
  overview: string;
  summaryCards: NutritionFitnessSummaryCard[];
  signals: NutritionFitnessSignalItem[];
  exerciseHabits: NutritionFitnessHabitItem[];
  nutritionHabits: NutritionFitnessHabitItem[];
  actionItems: NutritionFitnessActionItem[];
  unsupportedTracking: string[];
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

function formatDateRangeLabel(
  start?: string | null,
  end?: string | null,
  fallback = 'No date range listed'
) {
  if (!start && !end) return fallback;
  if (start && end) return `${formatDateLabel(start)} to ${formatDateLabel(end)}`;
  return start ? `Since ${formatDateLabel(start)}` : `Until ${formatDateLabel(end)}`;
}

function normalizeText(value?: string | null) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function formatLabel(value?: string | null, fallback = 'Not specified') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return fallback;
  return trimmed
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function sortByDateDesc<T>(items: T[], getDate: (item: T) => string | null | undefined) {
  return [...items].sort(
    (a, b) => (parseDate(getDate(b))?.getTime() || 0) - (parseDate(getDate(a))?.getTime() || 0)
  );
}

function isOlderThan(value: string | null | undefined, days: number) {
  const time = parseDate(value)?.getTime();
  return !time || Date.now() - time > days * DAY_MS;
}

function toLbs(weight: number, unit: WeightUnit = 'lbs') {
  return unit === 'kg' ? weight * 2.20462 : weight;
}

function fromLbs(weight: number, unit: WeightUnit = 'lbs') {
  return unit === 'kg' ? weight / 2.20462 : weight;
}

function convertWeight(weight: number, from: WeightUnit = 'lbs', to: WeightUnit = 'lbs') {
  return from === to ? weight : fromLbs(toLbs(weight, from), to);
}

function formatWeight(weight: number, unit: WeightUnit = 'lbs') {
  return `${Number(weight.toFixed(unit === 'kg' ? 1 : 0))} ${unit}`;
}

function getVitalsForType(vitals: HealthSummaryPayload['vitals'], type: VitalType) {
  return vitals
    .filter((entry) => {
      if (entry.type) return entry.type === type;
      if (type === 'bloodPressure') return typeof entry.systolic === 'number' && typeof entry.diastolic === 'number';
      if (type === 'heartRate') return typeof entry.heartRate === 'number';
      if (type === 'weight') return typeof entry.weight === 'number';
      return typeof entry.bloodSugar === 'number';
    })
    .slice()
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

function getLatestVitalForType(vitals: HealthSummaryPayload['vitals'], type: VitalType) {
  return getVitalsForType(vitals, type)[0];
}

function getPreviousVitalForType(vitals: HealthSummaryPayload['vitals'], type: VitalType) {
  return getVitalsForType(vitals, type)[1];
}

function bloodPressureStatus(systolic: number, diastolic: number) {
  if (systolic < 120 && diastolic < 80) return 'normal';
  if (systolic < 130 && diastolic < 80) return 'elevated';
  if (systolic < 140 || diastolic < 90) return 'above normal';
  return 'high';
}

function heartRateStatus(value: number, previous?: number) {
  if (previous && value < previous) return 'improved';
  if (value >= 60 && value <= 100) return 'normal';
  return value > 100 ? 'above normal' : 'below normal';
}

function bloodSugarStatus(value: number) {
  if (value < 70) return 'low';
  if (value <= 99) return 'normal';
  if (value <= 125) return 'elevated';
  return 'high';
}

function weightDelta(current: number, previous?: number) {
  if (!previous || previous === 0) return { label: 'stable', value: '0%' };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.1) return { label: 'stable', value: '0%' };
  return {
    label: pct > 0 ? 'increase' : 'decrease',
    value: `${Math.abs(pct).toFixed(1)}%`,
  };
}

function buildSourceLabel(entry: PatientSocialHistoryEntry) {
  if (entry.verificationStatus === 'provider_documented') return 'Provider documented';
  if (entry.verificationStatus === 'provider_reviewed') return 'Provider reviewed';
  return entry.sourceType === 'provider' ? 'Provider shared' : 'Patient reported';
}

function buildHabitItems(entries: PatientSocialHistoryEntry[], fallbackTitle: string) {
  return sortByDateDesc(entries, (entry) => entry.updatedAt || entry.endDate || entry.startDate || entry.createdAt).map(
    (entry) => ({
      id: entry.id,
      title: String(entry.title || '').trim() || fallbackTitle,
      statusLabel: formatLabel(entry.status, 'On file'),
      dateLabel: formatDateRangeLabel(entry.startDate, entry.endDate, formatDateLabel(entry.updatedAt)),
      detail:
        String(entry.detail || '').trim() ||
        `Saved in your ${fallbackTitle.toLowerCase()} history.`,
      notes: String(entry.notes || '').trim() || 'No extra notes added.',
      sourceLabel: buildSourceLabel(entry),
      entry,
    })
  );
}

function getLatestUpdatedLabel(summary: HealthSummaryPayload | null, history: PatientMedicalHistoryPayload) {
  const timestamps = [
    summary?.updatedAt || null,
    ...(summary?.vitals || []).map((entry) => entry.recordedAt),
    ...history.socialHistory.map((entry) => entry.updatedAt || entry.endDate || entry.startDate || entry.createdAt),
  ].filter(Boolean) as string[];

  const latest = sortByDateDesc(timestamps, (value) => value)[0];
  return formatDateLabel(latest, 'No recent updates');
}

function buildSignals(input: {
  summary: HealthSummaryPayload | null;
  hasGlucoseFocus: boolean;
}) {
  const vitals = input.summary?.vitals || [];
  const latestBloodPressure = getLatestVitalForType(vitals, 'bloodPressure');
  const latestHeartRate = getLatestVitalForType(vitals, 'heartRate');
  const previousHeartRate = getPreviousVitalForType(vitals, 'heartRate');
  const latestWeightVital = getLatestVitalForType(vitals, 'weight');
  const previousWeightVital = getPreviousVitalForType(vitals, 'weight');
  const latestBloodSugar = getLatestVitalForType(vitals, 'bloodSugar');
  const latestWeightUnit: WeightUnit = (latestWeightVital?.weightUnit as WeightUnit | undefined) || 'lbs';
  const latestWeight =
    typeof latestWeightVital?.weight === 'number'
      ? convertWeight(latestWeightVital.weight, (latestWeightVital.weightUnit as WeightUnit | undefined) || 'lbs', latestWeightUnit)
      : 0;
  const previousWeight =
    typeof previousWeightVital?.weight === 'number'
      ? convertWeight(
          previousWeightVital.weight,
          (previousWeightVital.weightUnit as WeightUnit | undefined) || 'lbs',
          latestWeightUnit
        )
      : undefined;
  const nextWeightDelta = weightDelta(latestWeight, previousWeight);

  return [
    {
      id: 'weight' as const,
      label: 'Weight',
      value: latestWeightVital ? formatWeight(latestWeight, latestWeightUnit) : 'Not logged yet',
      statusLabel: latestWeightVital ? `${nextWeightDelta.label} ${nextWeightDelta.value}` : 'missing',
      detail: latestWeightVital
        ? `Latest log: ${formatDateLabel(latestWeightVital.recordedAt)}. Previous: ${
            previousWeight ? formatWeight(previousWeight, latestWeightUnit) : 'not available'
          }.`
        : 'Add a weight entry in Health Summary to start a trend.',
      actionType: 'screen' as const,
      actionLabel: latestWeightVital ? 'Open Health Summary' : 'Log weight',
      actionScreen: 'health-summary' as const,
    },
    {
      id: 'bloodPressure' as const,
      label: 'Blood Pressure',
      value:
        latestBloodPressure && typeof latestBloodPressure.systolic === 'number' && typeof latestBloodPressure.diastolic === 'number'
          ? `${latestBloodPressure.systolic}/${latestBloodPressure.diastolic} mmHg`
          : 'Not logged yet',
      statusLabel:
        latestBloodPressure && typeof latestBloodPressure.systolic === 'number' && typeof latestBloodPressure.diastolic === 'number'
          ? bloodPressureStatus(latestBloodPressure.systolic, latestBloodPressure.diastolic)
          : 'missing',
      detail: latestBloodPressure
        ? `Latest log: ${formatDateLabel(latestBloodPressure.recordedAt)}.`
        : 'Log blood pressure in Health Summary when you have a reading.',
      actionType: 'screen' as const,
      actionLabel: latestBloodPressure ? 'Open Health Summary' : 'Log blood pressure',
      actionScreen: 'health-summary' as const,
    },
    {
      id: 'heartRate' as const,
      label: 'Heart Rate',
      value:
        latestHeartRate && typeof latestHeartRate.heartRate === 'number'
          ? `${latestHeartRate.heartRate} bpm`
          : 'Not logged yet',
      statusLabel:
        latestHeartRate && typeof latestHeartRate.heartRate === 'number'
          ? heartRateStatus(latestHeartRate.heartRate, previousHeartRate?.heartRate)
          : 'missing',
      detail: latestHeartRate
        ? `Latest log: ${formatDateLabel(latestHeartRate.recordedAt)}. Previous: ${previousHeartRate?.heartRate ?? 'not available'} bpm.`
        : 'Add a heart rate entry to keep your wellness snapshot current.',
      actionType: 'screen' as const,
      actionLabel: latestHeartRate ? 'Open Health Summary' : 'Log heart rate',
      actionScreen: 'health-summary' as const,
    },
    {
      id: 'bloodSugar' as const,
      label: 'Blood Sugar',
      value:
        latestBloodSugar && typeof latestBloodSugar.bloodSugar === 'number'
          ? `${latestBloodSugar.bloodSugar} mg/dL`
          : 'Not logged yet',
      statusLabel:
        latestBloodSugar && typeof latestBloodSugar.bloodSugar === 'number'
          ? bloodSugarStatus(latestBloodSugar.bloodSugar)
          : input.hasGlucoseFocus
          ? 'recommended'
          : 'optional',
      detail: latestBloodSugar
        ? `Latest log: ${formatDateLabel(latestBloodSugar.recordedAt)}.`
        : input.hasGlucoseFocus
        ? 'A glucose-related condition is on file, so adding blood sugar logs may help this page stay relevant.'
        : 'Add this if you or your care team track blood sugar.',
      actionType: 'screen' as const,
      actionLabel: latestBloodSugar ? 'Open Health Summary' : 'Log blood sugar',
      actionScreen: 'health-summary' as const,
    },
  ] satisfies NutritionFitnessSignalItem[];
}

function buildSummaryCards(input: {
  signals: NutritionFitnessSignalItem[];
  exerciseHabits: NutritionFitnessHabitItem[];
  nutritionHabits: NutritionFitnessHabitItem[];
  coverageCount: number;
  coverageTotal: number;
}) {
  const vitalTypesTracked = input.signals.filter((signal) => !signal.value.toLowerCase().includes('not logged')).length;

  return [
    {
      id: 'coverage',
      label: 'Tracked areas',
      value: `${input.coverageCount}/${input.coverageTotal}`,
      detail: 'Vitals plus nutrition and exercise history currently on file.',
      actionType: 'screen' as const,
      actionLabel: 'Health Summary',
      actionScreen: 'health-summary' as const,
    },
    {
      id: 'vitals',
      label: 'Vital types',
      value: `${vitalTypesTracked}/4`,
      detail: input.signals.some((signal) => signal.id === 'weight' && !signal.value.toLowerCase().includes('not logged'))
        ? 'Includes your latest weight trend.'
        : 'Add vitals in Health Summary to populate this view.',
      actionType: 'screen' as const,
      actionLabel: 'Open Health Summary',
      actionScreen: 'health-summary' as const,
    },
    {
      id: 'exercise',
      label: 'Exercise habits',
      value: `${input.exerciseHabits.length}`,
      detail:
        input.exerciseHabits[0]?.title ||
        'No movement history added yet.',
      actionType: 'editor' as const,
      actionLabel: input.exerciseHabits.length > 0 ? 'Manage exercise' : 'Add exercise',
      actionEditor: 'exercise' as const,
    },
    {
      id: 'nutrition',
      label: 'Nutrition habits',
      value: `${input.nutritionHabits.length}`,
      detail:
        input.nutritionHabits[0]?.title ||
        'No nutrition history added yet.',
      actionType: 'editor' as const,
      actionLabel: input.nutritionHabits.length > 0 ? 'Manage nutrition' : 'Add nutrition',
      actionEditor: 'nutrition' as const,
    },
  ];
}

function buildActionItems(input: {
  summary: HealthSummaryPayload | null;
  conditions: HealthSummaryCondition[];
  exerciseEntries: PatientSocialHistoryEntry[];
  nutritionEntries: PatientSocialHistoryEntry[];
}) {
  const vitals = input.summary?.vitals || [];
  const latestWeight = getLatestVitalForType(vitals, 'weight');
  const latestBloodPressure = getLatestVitalForType(vitals, 'bloodPressure');
  const latestHeartRate = getLatestVitalForType(vitals, 'heartRate');
  const latestBloodSugar = getLatestVitalForType(vitals, 'bloodSugar');
  const normalizedConditions = input.conditions.map((condition) => normalizeText(condition.name));
  const hasCardioFocus = normalizedConditions.some(
    (name) => name.includes('hypertension') || name.includes('blood pressure') || name.includes('heart') || name.includes('cardio')
  );
  const hasGlucoseFocus = normalizedConditions.some(
    (name) => name.includes('diabetes') || name.includes('prediabetes') || name.includes('glucose') || name.includes('insulin')
  );

  const items: NutritionFitnessActionItem[] = [];

  if (!latestWeight) {
    items.push({
      id: 'log-weight',
      title: 'Add a weight baseline',
      description: 'This page can show weight trends once you log at least one weight entry.',
      priority: 'high',
      actionType: 'screen',
      actionLabel: 'Log weight',
      actionScreen: 'health-summary',
    });
  } else if (isOlderThan(latestWeight.recordedAt, 90)) {
    items.push({
      id: 'refresh-weight',
      title: 'Refresh your weight trend',
      description: `Your latest weight log is from ${formatDateLabel(latestWeight.recordedAt)}.`,
      priority: 'medium',
      actionType: 'screen',
      actionLabel: 'Update weight',
      actionScreen: 'health-summary',
    });
  }

  if (input.exerciseEntries.length === 0) {
    items.push({
      id: 'add-exercise',
      title: 'Add an exercise habit',
      description: 'Save your movement routine here so the exercise section reflects it.',
      priority: 'high',
      actionType: 'editor',
      actionLabel: 'Add exercise',
      actionEditor: 'exercise',
    });
  } else if (isOlderThan(input.exerciseEntries[0]?.updatedAt || input.exerciseEntries[0]?.endDate || input.exerciseEntries[0]?.startDate, 180)) {
    items.push({
      id: 'review-exercise',
      title: 'Review your exercise history',
      description: 'Your movement history looks older, so a quick update would keep this page accurate.',
      priority: 'medium',
      actionType: 'editor',
      actionLabel: 'Review exercise history',
      actionEditor: 'exercise',
    });
  }

  if (input.nutritionEntries.length === 0) {
    items.push({
      id: 'add-nutrition',
      title: 'Add a nutrition habit',
      description: 'Diet-related history is not on file yet, so the nutrition section is still sparse.',
      priority: 'high',
      actionType: 'editor',
      actionLabel: 'Add nutrition',
      actionEditor: 'nutrition',
    });
  } else if (isOlderThan(input.nutritionEntries[0]?.updatedAt || input.nutritionEntries[0]?.endDate || input.nutritionEntries[0]?.startDate, 180)) {
    items.push({
      id: 'review-nutrition',
      title: 'Review your nutrition history',
      description: 'A recent update would make the nutrition view more current.',
      priority: 'medium',
      actionType: 'editor',
      actionLabel: 'Review nutrition history',
      actionEditor: 'nutrition',
    });
  }

  if (!latestBloodPressure && hasCardioFocus) {
    items.push({
      id: 'log-blood-pressure',
      title: 'Log a blood pressure reading',
      description: 'A heart or blood-pressure-related condition is on file, so this signal matters here.',
      priority: 'high',
      actionType: 'screen',
      actionLabel: 'Log blood pressure',
      actionScreen: 'health-summary',
    });
  } else if (latestBloodPressure && isOlderThan(latestBloodPressure.recordedAt, 90) && hasCardioFocus) {
    items.push({
      id: 'refresh-blood-pressure',
      title: 'Update your blood pressure reading',
      description: `Your latest blood pressure log is from ${formatDateLabel(latestBloodPressure.recordedAt)}.`,
      priority: 'medium',
      actionType: 'screen',
      actionLabel: 'Open Health Summary',
      actionScreen: 'health-summary',
    });
  }

  if (!latestHeartRate && !hasCardioFocus) {
    items.push({
      id: 'log-heart-rate',
      title: 'Add a heart rate log',
      description: 'Heart rate is still missing, so your fitness snapshot is incomplete.',
      priority: 'medium',
      actionType: 'screen',
      actionLabel: 'Log heart rate',
      actionScreen: 'health-summary',
    });
  }

  if (!latestBloodSugar && hasGlucoseFocus) {
    items.push({
      id: 'log-blood-sugar',
      title: 'Add a blood sugar reading',
      description: 'A glucose-related condition is on file, so this metric may be useful to keep current.',
      priority: 'medium',
      actionType: 'screen',
      actionLabel: 'Log blood sugar',
      actionScreen: 'health-summary',
    });
  } else if (latestBloodSugar && isOlderThan(latestBloodSugar.recordedAt, 90) && hasGlucoseFocus) {
    items.push({
      id: 'refresh-blood-sugar',
      title: 'Refresh your blood sugar history',
      description: `Your latest blood sugar reading is from ${formatDateLabel(latestBloodSugar.recordedAt)}.`,
      priority: 'medium',
      actionType: 'screen',
      actionLabel: 'Open Health Summary',
      actionScreen: 'health-summary',
    });
  }

  if (items.length === 0) {
    items.push({
      id: 'review-overview',
      title: 'Keep your wellness overview current',
      description: 'Your current data already fills this page well. Review it any time you add new vitals or lifestyle history.',
      priority: 'low',
      actionType: 'screen',
      actionLabel: 'Open Health Summary',
      actionScreen: 'health-summary',
    });
  }

  return items.slice(0, 4);
}

export async function fetchNutritionFitnessData(): Promise<NutritionFitnessData> {
  const [summaryRes, historyRes, conditionsRes] = await Promise.all([
    api.getMyHealthSummary().catch(() => ({ summary: null as HealthSummaryPayload | null })),
    api.getMyMedicalHistory().catch(
      () =>
        ({
          history: {
            surgicalHistory: [],
            hospitalizations: [],
            emergencyVisits: [],
            socialHistory: [],
            reproductiveHistory: [],
            mentalHealthHistory: [],
            auditEvents: [],
          },
        }) as { history: PatientMedicalHistoryPayload }
    ),
    api.listMyConditions().catch(() => ({ conditions: [] as HealthSummaryCondition[] })),
  ]);

  const summary = summaryRes.summary;
  const history = historyRes.history;
  const conditions =
    conditionsRes.conditions.length > 0
      ? conditionsRes.conditions
      : summary?.conditions?.map((condition, index) => ({
          ...condition,
          id: condition.id || `summary-condition-${index + 1}`,
        })) || [];
  const activeConditions = conditions.filter((condition) => {
    const status = normalizeText(condition.status);
    return !['resolved', 'inactive', 'history', 'completed'].some((token) => status.includes(token));
  });
  const normalizedActiveConditions = activeConditions.map((condition) => normalizeText(condition.name));
  const hasGlucoseFocus = normalizedActiveConditions.some(
    (name) => name.includes('diabetes') || name.includes('prediabetes') || name.includes('glucose') || name.includes('insulin')
  );

  const exerciseEntries = sortByDateDesc(
    history.socialHistory.filter((entry) => entry.category === 'exercise'),
    (entry) => entry.updatedAt || entry.endDate || entry.startDate || entry.createdAt
  );
  const nutritionEntries = sortByDateDesc(
    history.socialHistory.filter((entry) => entry.category === 'diet'),
    (entry) => entry.updatedAt || entry.endDate || entry.startDate || entry.createdAt
  );
  const exerciseHabits = buildHabitItems(exerciseEntries, 'Exercise plan');
  const nutritionHabits = buildHabitItems(nutritionEntries, 'Nutrition plan');
  const signals = buildSignals({
    summary,
    hasGlucoseFocus,
  });

  const coverageCount =
    signals.filter((signal) => !signal.value.toLowerCase().includes('not logged')).length +
    (exerciseHabits.length > 0 ? 1 : 0) +
    (nutritionHabits.length > 0 ? 1 : 0);
  const coverageTotal = 6;
  const lastUpdatedLabel = getLatestUpdatedLabel(summary, history);
  const overview =
    coverageCount >= 5
      ? 'You already have a strong wellness picture here from logged vitals and lifestyle history.'
      : coverageCount >= 3
      ? 'This view is useful today, and a few more logs would make it more complete.'
      : 'Add vitals or lifestyle history to turn this into a fuller nutrition and fitness snapshot.';

  return {
    coverageCount,
    coverageTotal,
    coverageLabel: `${coverageCount} of ${coverageTotal} wellness areas currently tracked`,
    overview,
    summaryCards: buildSummaryCards({
      signals,
      exerciseHabits,
      nutritionHabits,
      coverageCount,
      coverageTotal,
    }),
    signals,
    exerciseHabits,
    nutritionHabits,
    actionItems: buildActionItems({
      summary,
      conditions: activeConditions,
      exerciseEntries,
      nutritionEntries,
    }),
    unsupportedTracking: ['Steps', 'Workouts', 'Calories', 'Water intake', 'Sleep'],
    lastUpdatedLabel,
  };
}
