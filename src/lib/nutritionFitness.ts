import {
  api,
  type HealthSummaryPayload,
  type PatientMedicalHistoryPayload,
  type PatientSocialHistoryEntry,
} from '@/lib/api';

const TRACKER_NOTE_PATTERN = /^\[tracker:(steps|workouts|calories|water|sleep)\]\s*/i;

export type NutritionFitnessTrackerKind = 'steps' | 'workouts' | 'calories' | 'water' | 'sleep';
export type NutritionFitnessEditorKind = NutritionFitnessTrackerKind;

export interface NutritionFitnessHabitItem {
  id: string;
  title: string;
  statusLabel: string;
  dateLabel: string;
  detail: string;
  notes: string;
  sourceLabel: string;
  trackerKind: NutritionFitnessTrackerKind;
  entry: PatientSocialHistoryEntry;
}

export interface NutritionFitnessData {
  lastUpdatedLabel: string;
  trackerEntries: Record<NutritionFitnessTrackerKind, NutritionFitnessHabitItem[]>;
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

function formatDateRangeLabel(start?: string | null, end?: string | null, fallback = 'No date listed') {
  if (!start && !end) return fallback;
  if (start && end) return `${formatDateLabel(start)} to ${formatDateLabel(end)}`;
  return start ? formatDateLabel(start) : formatDateLabel(end);
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

function buildSourceLabel(entry: PatientSocialHistoryEntry) {
  if (entry.verificationStatus === 'provider_documented') return 'Provider documented';
  if (entry.verificationStatus === 'provider_reviewed') return 'Provider reviewed';
  return entry.sourceType === 'provider' ? 'Provider shared' : 'Patient reported';
}

export function stripNutritionFitnessTrackerTag(notes?: string | null) {
  return String(notes || '').replace(TRACKER_NOTE_PATTERN, '').trim();
}

export function encodeNutritionFitnessTrackerNotes(kind: NutritionFitnessTrackerKind, notes?: string | null) {
  const cleaned = stripNutritionFitnessTrackerTag(notes);
  return cleaned ? `[tracker:${kind}] ${cleaned}` : `[tracker:${kind}]`;
}

function detectTrackerKind(entry: PatientSocialHistoryEntry): NutritionFitnessTrackerKind {
  const notesMatch = String(entry.notes || '').match(TRACKER_NOTE_PATTERN);
  if (notesMatch?.[1]) {
    return notesMatch[1].toLowerCase() as NutritionFitnessTrackerKind;
  }

  const combined = normalizeText([entry.title, entry.status, entry.detail, entry.notes].filter(Boolean).join(' '));

  if (combined.includes('sleep') || combined.includes('bedtime') || combined.includes('rest')) {
    return 'sleep';
  }

  if (combined.includes('water') || combined.includes('hydration') || combined.includes('hydrated') || combined.includes('fluid')) {
    return 'water';
  }

  if (combined.includes('step') || combined.includes('steps')) {
    return 'steps';
  }

  if (
    combined.includes('calorie') ||
    combined.includes('meal') ||
    combined.includes('snack') ||
    combined.includes('breakfast') ||
    combined.includes('lunch') ||
    combined.includes('dinner')
  ) {
    return 'calories';
  }

  if (entry.category === 'diet') return 'calories';
  if (entry.category === 'other') return 'sleep';
  return 'workouts';
}

function toHabitItem(entry: PatientSocialHistoryEntry): NutritionFitnessHabitItem {
  const trackerKind = detectTrackerKind(entry);
  return {
    id: entry.id,
    title: String(entry.title || '').trim() || formatLabel(trackerKind),
    statusLabel: formatLabel(entry.status, 'On file'),
    dateLabel: formatDateRangeLabel(entry.startDate, entry.endDate, formatDateLabel(entry.updatedAt)),
    detail: String(entry.detail || '').trim() || 'No details added yet.',
    notes: stripNutritionFitnessTrackerTag(entry.notes) || 'No extra notes added.',
    sourceLabel: buildSourceLabel(entry),
    trackerKind,
    entry,
  };
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

export function getNutritionFitnessEntryCategory(kind: NutritionFitnessTrackerKind): PatientSocialHistoryEntry['category'] {
  if (kind === 'steps' || kind === 'workouts') return 'exercise';
  if (kind === 'calories' || kind === 'water') return 'diet';
  return 'other';
}

export async function fetchNutritionFitnessData(): Promise<NutritionFitnessData> {
  const [summaryRes, historyRes] = await Promise.all([
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
  ]);

  const trackerEntries = sortByDateDesc(
    historyRes.history.socialHistory.filter((entry) => ['exercise', 'diet', 'other'].includes(entry.category)),
    (entry) => entry.updatedAt || entry.endDate || entry.startDate || entry.createdAt
  ).map(toHabitItem);

  return {
    lastUpdatedLabel: getLatestUpdatedLabel(summaryRes.summary, historyRes.history),
    trackerEntries: {
      steps: trackerEntries.filter((entry) => entry.trackerKind === 'steps'),
      workouts: trackerEntries.filter((entry) => entry.trackerKind === 'workouts'),
      calories: trackerEntries.filter((entry) => entry.trackerKind === 'calories'),
      water: trackerEntries.filter((entry) => entry.trackerKind === 'water'),
      sleep: trackerEntries.filter((entry) => entry.trackerKind === 'sleep'),
    },
  };
}
