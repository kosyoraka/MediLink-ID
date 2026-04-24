import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Droplets,
  Dumbbell,
  Footprints,
  GlassWater,
  MoonStar,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';

import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { api, type PatientSocialHistoryEntry } from '@/lib/api';
import {
  encodeNutritionFitnessTrackerNotes,
  fetchNutritionFitnessData,
  getNutritionFitnessEntryCategory,
  stripNutritionFitnessTrackerTag,
  type NutritionFitnessData,
  type NutritionFitnessEditorKind,
  type NutritionFitnessEntryMode,
  type NutritionFitnessHabitItem,
} from '@/lib/nutritionFitness';
import type { PatientDataScreen } from '@/lib/patientDataNavigation';

interface NutritionFitnessProps {
  onBack: () => void;
  onNavigate: (screen: PatientDataScreen) => void;
}

type HabitEditorValues = {
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  detail: string;
};

type ActiveEditorState = {
  kind: NutritionFitnessEditorKind;
  entryMode: NutritionFitnessEntryMode;
  mode: 'create' | 'edit';
  entryId?: string;
} | null;

const trackerOrder: NutritionFitnessEditorKind[] = ['steps', 'workouts', 'calories', 'water', 'sleep'];

const trackerConfig: Record<
  NutritionFitnessEditorKind,
  {
    sectionTitle: string;
    sectionDescription: string;
    routineSectionDescription: string;
    emptyTitle: string;
    emptyDescription: string;
    routineEmptyTitle: string;
    routineEmptyDescription: string;
    title: string;
    addLabel: string;
    addRoutineLabel: string;
    titleLabel: string;
    titlePlaceholder: string;
    titleOptions?: string[];
    routineTitleLabel: string;
    routineTitlePlaceholder: string;
    routineTitleOptions?: string[];
    statusLabel: string;
    statusPlaceholder: string;
    statusOptions: string[];
    routineStatusLabel: string;
    routineStatusPlaceholder: string;
    routineStatusOptions: string[];
    startDateLabel: string;
    routineStartDateLabel: string;
    routineEndDateLabel: string;
    detailLabel: string;
    detailPlaceholder: string;
    routineDetailLabel: string;
    routineDetailPlaceholder: string;
    helperTitle: string;
    helperDescription: string;
    routineHelperDescription: string;
    helperExamples: string[];
    icon: typeof Footprints;
  }
> = {
  steps: {
    sectionTitle: 'Steps',
    sectionDescription: 'Log daily step counts or walking totals one entry at a time.',
    routineSectionDescription: 'Set a repeating step goal or walking routine you want to follow over time.',
    emptyTitle: 'No step logs saved yet',
    emptyDescription: 'Add entries like 8,500 steps, 12,000 steps, or daily walking totals here.',
    routineEmptyTitle: 'No step routines saved yet',
    routineEmptyDescription: 'Add routines like 8,000 steps every weekday or a daily after-dinner walk goal.',
    title: 'Step log',
    addLabel: 'Add step log',
    addRoutineLabel: 'Add step routine',
    titleLabel: 'Step log title',
    titlePlaceholder: '10,240 steps',
    titleOptions: ['5,000 steps', '8,000 steps', '10,000 steps', '12,000+ steps'],
    routineTitleLabel: 'Routine name',
    routineTitlePlaceholder: '8,000 steps every weekday',
    routineTitleOptions: ['5,000 steps daily', '8,000 steps daily', '10,000 steps daily', 'After-dinner walk'],
    statusLabel: 'Step goal or result',
    statusPlaceholder: 'Goal reached, under target, recovery day',
    statusOptions: ['Goal reached', 'Almost there', 'Under target', 'Recovery day'],
    routineStatusLabel: 'Routine frequency',
    routineStatusPlaceholder: 'Daily, weekdays, 3 times a week',
    routineStatusOptions: ['Daily', 'Weekdays', 'Weekends', '3 times a week', 'Custom schedule'],
    startDateLabel: 'Log date',
    routineStartDateLabel: 'Routine start date',
    routineEndDateLabel: 'Routine end date (if available)',
    detailLabel: 'Details',
    detailPlaceholder: 'Track total steps, walking distance, or how the day felt physically',
    routineDetailLabel: 'Routine plan',
    routineDetailPlaceholder: 'Describe the target, when you will do it, and how you want to stay on track',
    helperTitle: 'What to log here',
    helperDescription: 'Use one entry per day or per walking session when you want to track steps specifically.',
    routineHelperDescription: 'Use a routine to keep a repeating step target or walking plan on file.',
    helperExamples: ['Daily step total', 'Walking distance', 'Step goal progress', 'How active the day felt'],
    icon: Footprints,
  },
  workouts: {
    sectionTitle: 'Workouts',
    sectionDescription: 'Log each workout, walk, run, gym session, or repeating exercise routine separately.',
    routineSectionDescription: 'Set a recurring workout schedule or exercise plan you want to follow consistently.',
    emptyTitle: 'No workout logs saved yet',
    emptyDescription: 'Add entries like strength training, treadmill workout, evening walk, or bike ride here.',
    routineEmptyTitle: 'No workout routines saved yet',
    routineEmptyDescription: 'Add routines like gym on Mondays, yoga every morning, or a 3-day strength split.',
    title: 'Workout log',
    addLabel: 'Add workout log',
    addRoutineLabel: 'Add workout routine',
    titleLabel: 'Workout title',
    titlePlaceholder: 'Upper-body gym session',
    titleOptions: ['Walk', 'Run', 'Gym workout', 'Strength training', 'Yoga', 'Cycling'],
    routineTitleLabel: 'Routine name',
    routineTitlePlaceholder: '3-day strength split',
    routineTitleOptions: ['Morning walk routine', '3-day strength split', 'Cardio plan', 'Yoga routine'],
    statusLabel: 'Workout type or intensity',
    statusPlaceholder: 'Strength, cardio, light recovery, intense session',
    statusOptions: ['Light', 'Moderate', 'Intense', 'Strength', 'Cardio', 'Recovery'],
    routineStatusLabel: 'Routine frequency',
    routineStatusPlaceholder: 'Daily, 3 times a week, Mondays/Wednesdays',
    routineStatusOptions: ['Daily', 'Weekdays', 'Weekends', '3 times a week', '4 times a week', 'Custom schedule'],
    startDateLabel: 'Workout date',
    routineStartDateLabel: 'Routine start date',
    routineEndDateLabel: 'Routine end date (if available)',
    detailLabel: 'Details',
    detailPlaceholder: 'Track duration, workout type, calories burned, distance, or routine details',
    routineDetailLabel: 'Routine plan',
    routineDetailPlaceholder: 'Describe the workout plan, timing, duration, and anything you want to stay consistent with',
    helperTitle: 'What to log here',
    helperDescription: 'Use one entry for a single workout or keep a repeating routine on file with an optional end date.',
    routineHelperDescription: 'Use a routine for recurring workout plans like gym days, walk schedules, or training programs.',
    helperExamples: ['Workout duration', 'Type of exercise', 'Calories burned', 'Routine or program details'],
    icon: Dumbbell,
  },
  calories: {
    sectionTitle: 'Calories',
    sectionDescription: 'Log meals, snacks, or a full day of calorie intake as separate entries.',
    routineSectionDescription: 'Set meal plans, calorie targets, or nutrition structures you want to follow regularly.',
    emptyTitle: 'No calorie logs saved yet',
    emptyDescription: 'Add entries like breakfast calories, dinner calories, snack totals, or full-day intake here.',
    routineEmptyTitle: 'No meal routines saved yet',
    routineEmptyDescription: 'Add routines like weekday meal prep, 1,800-calorie target, or high-protein lunch plan.',
    title: 'Calorie or meal log',
    addLabel: 'Add calorie log',
    addRoutineLabel: 'Add meal routine',
    titleLabel: 'Calorie or meal title',
    titlePlaceholder: 'Lunch - 620 calories',
    titleOptions: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Daily calories'],
    routineTitleLabel: 'Routine name',
    routineTitlePlaceholder: '1,800-calorie weekday plan',
    routineTitleOptions: ['Breakfast routine', 'Lunch routine', 'Dinner routine', 'Meal prep plan', 'Daily calorie target'],
    statusLabel: 'Meal type or nutrition status',
    statusPlaceholder: 'Breakfast, snack, on plan, higher protein',
    statusOptions: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'On plan', 'Higher protein'],
    routineStatusLabel: 'Routine frequency',
    routineStatusPlaceholder: 'Daily, weekdays, meal prep Sundays',
    routineStatusOptions: ['Daily', 'Weekdays', 'Weekends', 'Meal prep weekly', 'Custom schedule'],
    startDateLabel: 'Meal or log date',
    routineStartDateLabel: 'Routine start date',
    routineEndDateLabel: 'Routine end date (if available)',
    detailLabel: 'Calories and foods',
    detailPlaceholder: 'Track calories, foods eaten, snacks, portions, or full-day intake',
    routineDetailLabel: 'Routine plan',
    routineDetailPlaceholder: 'Describe the calorie target, meal structure, snack plan, or foods you want to stick with',
    helperTitle: 'What to log here',
    helperDescription: 'Use one entry for a meal, snack, or daily calorie summary.',
    routineHelperDescription: 'Use a routine for repeating meal plans, calorie targets, or nutrition goals.',
    helperExamples: ['Meal calories', 'Snack calories', 'Foods eaten', 'Daily calorie total'],
    icon: Droplets,
  },
  water: {
    sectionTitle: 'Water intake',
    sectionDescription: 'Log glasses, bottles, liters, or hydration goals as separate entries.',
    routineSectionDescription: 'Set a repeating hydration target or water routine you want to follow each day.',
    emptyTitle: 'No water logs saved yet',
    emptyDescription: 'Add entries like 2 liters, 8 glasses, hydration goal reached, or low water intake here.',
    routineEmptyTitle: 'No hydration routines saved yet',
    routineEmptyDescription: 'Add routines like 8 glasses daily, one bottle before lunch, or 2 liters every day.',
    title: 'Water intake log',
    addLabel: 'Add water log',
    addRoutineLabel: 'Add hydration routine',
    titleLabel: 'Water intake title',
    titlePlaceholder: '8 glasses of water',
    titleOptions: ['4 glasses', '6 glasses', '8 glasses', '2 liters', '3 liters'],
    routineTitleLabel: 'Routine name',
    routineTitlePlaceholder: '2 liters every day',
    routineTitleOptions: ['6 glasses daily', '8 glasses daily', '2 liters daily', 'Morning hydration routine'],
    statusLabel: 'Hydration status',
    statusPlaceholder: 'Goal reached, catching up, low intake',
    statusOptions: ['Goal reached', 'On track', 'Catching up', 'Low intake'],
    routineStatusLabel: 'Routine frequency',
    routineStatusPlaceholder: 'Daily, weekdays, every morning',
    routineStatusOptions: ['Daily', 'Weekdays', 'Weekends', 'Morning routine', 'Custom schedule'],
    startDateLabel: 'Log date',
    routineStartDateLabel: 'Routine start date',
    routineEndDateLabel: 'Routine end date (if available)',
    detailLabel: 'Details',
    detailPlaceholder: 'Track total water, drinks, hydration goals, or how consistent intake was',
    routineDetailLabel: 'Routine plan',
    routineDetailPlaceholder: 'Describe the hydration target, timing, bottle count, or reminders you want to follow',
    helperTitle: 'What to log here',
    helperDescription: 'Use one entry per day or per hydration checkpoint when you want to track water intake.',
    routineHelperDescription: 'Use a routine for repeating hydration goals like daily bottle targets or reminder habits.',
    helperExamples: ['Glasses or bottles', 'Liters consumed', 'Hydration goal progress', 'Context for low or high intake'],
    icon: GlassWater,
  },
  sleep: {
    sectionTitle: 'Sleep',
    sectionDescription: 'Log each night of sleep or a short sleep pattern period as separate entries.',
    routineSectionDescription: 'Set a bedtime or sleep hygiene routine you want to follow consistently.',
    emptyTitle: 'No sleep logs saved yet',
    emptyDescription: 'Add entries like 7.5 hours of sleep, poor sleep night, or early bedtime routine here.',
    routineEmptyTitle: 'No sleep routines saved yet',
    routineEmptyDescription: 'Add routines like bedtime by 10:30 PM, no screens before bed, or 8-hour sleep goal.',
    title: 'Sleep log',
    addLabel: 'Add sleep log',
    addRoutineLabel: 'Add sleep routine',
    titleLabel: 'Sleep log title',
    titlePlaceholder: '7 hours 45 minutes of sleep',
    titleOptions: ['6 hours of sleep', '7 hours of sleep', '8 hours of sleep', 'Early bedtime', 'Interrupted night'],
    routineTitleLabel: 'Routine name',
    routineTitlePlaceholder: 'Bedtime by 10:30 PM',
    routineTitleOptions: ['10:30 PM bedtime', '8-hour sleep goal', 'No screens before bed', 'Wake up at 6:30 AM'],
    statusLabel: 'Sleep quality or pattern',
    statusPlaceholder: 'Restful, interrupted, late bedtime, improved sleep',
    statusOptions: ['Restful', 'Interrupted', 'Light sleep', 'Deep sleep', 'Late bedtime', 'Improved sleep'],
    routineStatusLabel: 'Routine frequency',
    routineStatusPlaceholder: 'Nightly, weekdays, Sunday to Thursday',
    routineStatusOptions: ['Nightly', 'Weekdays', 'Weekends', 'Sunday to Thursday', 'Custom schedule'],
    startDateLabel: 'Sleep date',
    routineStartDateLabel: 'Routine start date',
    routineEndDateLabel: 'Routine end date (if available)',
    detailLabel: 'Details',
    detailPlaceholder: 'Track hours slept, bedtime, wake time, interruptions, or how rested you felt',
    routineDetailLabel: 'Routine plan',
    routineDetailPlaceholder: 'Describe the bedtime plan, wake-up target, and habits you want to follow for better sleep',
    helperTitle: 'What to log here',
    helperDescription: 'Use one entry per night or for a short pattern you want to keep on file.',
    routineHelperDescription: 'Use a routine for recurring bedtime goals, sleep hygiene habits, or wake-time plans.',
    helperExamples: ['Hours slept', 'Bedtime and wake time', 'Sleep quality', 'Interruptions or naps'],
    icon: MoonStar,
  },
};

const trackerChips = ['Steps', 'Workouts', 'Calories', 'Water intake', 'Sleep'];

function emptyEditorValues(): HabitEditorValues {
  return {
    title: '',
    status: '',
    startDate: '',
    endDate: '',
    detail: '',
  };
}

function getEditorValuesFromEntry(entry: PatientSocialHistoryEntry): HabitEditorValues {
  return {
    title: entry.title || '',
    status: entry.status || '',
    startDate: entry.startDate || '',
    endDate: entry.endDate || '',
    detail: entry.detail || '',
  };
}

function HabitEditor({
  kind,
  entryMode,
  values,
  saving,
  error,
  submitLabel,
  onChange,
  onSave,
  onCancel,
}: {
  kind: NutritionFitnessEditorKind;
  entryMode: NutritionFitnessEntryMode;
  values: HabitEditorValues;
  saving: boolean;
  error: string | null;
  submitLabel: string;
  onChange: (key: keyof HabitEditorValues, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const copy = trackerConfig[kind];
  const Icon = copy.icon;
  const isRoutine = entryMode === 'routine';
  const titleOptions = isRoutine ? copy.routineTitleOptions : copy.titleOptions;
  const statusOptions = isRoutine ? copy.routineStatusOptions : copy.statusOptions;

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-teal-700" />
        <h4 className="text-gray-900">{copy.title} editor</h4>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-4 rounded-lg border border-white/70 bg-white/80 p-3">
        <p className="text-sm font-medium text-gray-900">{copy.helperTitle}</p>
        <p className="mt-1 text-sm text-gray-600">{isRoutine ? copy.routineHelperDescription : copy.helperDescription}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {copy.helperExamples.map((example) => (
            <Badge key={example} className="border-0 bg-teal-100 text-teal-800">
              {example}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm text-gray-700">
          {isRoutine ? copy.routineTitleLabel : copy.titleLabel}
          {titleOptions ? (
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
              value={values.title}
              onChange={(event) => onChange('title', event.target.value)}
            >
              <option value="">Choose an option...</option>
              {titleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              value={values.title}
              placeholder={isRoutine ? copy.routineTitlePlaceholder : copy.titlePlaceholder}
              onChange={(event) => onChange('title', event.target.value)}
            />
          )}
        </label>

        <label className="text-sm text-gray-700">
          {isRoutine ? copy.routineStatusLabel : copy.statusLabel}
          <select
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 bg-white"
            value={values.status}
            onChange={(event) => onChange('status', event.target.value)}
          >
            <option value="">Choose an option...</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-gray-700">
          {isRoutine ? copy.routineStartDateLabel : copy.startDateLabel}
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            value={values.startDate}
            onChange={(event) => onChange('startDate', event.target.value)}
          />
        </label>

        {isRoutine ? (
          <label className="text-sm text-gray-700">
            {copy.routineEndDateLabel}
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              value={values.endDate}
              onChange={(event) => onChange('endDate', event.target.value)}
            />
          </label>
        ) : null}

        <label className="text-sm text-gray-700">
          {isRoutine ? copy.routineDetailLabel : copy.detailLabel}
          <textarea
            className="mt-1 min-h-[100px] w-full rounded-lg border border-gray-200 px-3 py-2"
            value={values.detail}
            placeholder={isRoutine ? copy.routineDetailPlaceholder : copy.detailPlaceholder}
            onChange={(event) => onChange('detail', event.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : submitLabel}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function HabitCard({
  item,
  isEditing,
  editor,
  onEdit,
  onDelete,
}: {
  item: NutritionFitnessHabitItem;
  isEditing: boolean;
  editor?: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-gray-900">{item.title}</h4>
          <p className="mt-1 text-sm text-gray-500">{item.dateLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-0 bg-gray-100 text-gray-700">{item.statusLabel}</Badge>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {isEditing ? (
        editor
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-600">{item.detail}</p>
          <p className="text-sm text-gray-500">Source: {item.sourceLabel}</p>
        </>
      )}
    </div>
  );
}

function TrackerSection({
  kind,
  items,
  entryMode,
  createEditor,
  editingEntryId,
  renderEditEditor,
  onAdd,
  onEdit,
  onDelete,
}: {
  kind: NutritionFitnessEditorKind;
  items: NutritionFitnessHabitItem[];
  entryMode: NutritionFitnessEntryMode;
  createEditor?: ReactNode;
  editingEntryId?: string;
  renderEditEditor: (item: NutritionFitnessHabitItem) => ReactNode;
  onAdd: () => void;
  onEdit: (item: NutritionFitnessHabitItem) => void;
  onDelete: (item: NutritionFitnessHabitItem) => void;
}) {
  const copy = trackerConfig[kind];
  const Icon = copy.icon;
  const isRoutine = entryMode === 'routine';

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-teal-700" />
            <h3 className="text-gray-900">{copy.sectionTitle}</h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {isRoutine ? copy.routineHelperDescription : copy.sectionDescription}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isRoutine ? (
            <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              {copy.addLabel}
            </Button>
          ) : (
            <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              {copy.addRoutineLabel}
            </Button>
          )}
        </div>
      </div>

      {createEditor ? <div className="mb-3">{createEditor}</div> : null}

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <HabitCard
              key={item.id}
              item={item}
              isEditing={editingEntryId === item.entry.id}
              editor={editingEntryId === item.entry.id ? renderEditEditor(item) : undefined}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6">
          <h4 className="text-gray-900">{copy.emptyTitle}</h4>
          <p className="mt-2 text-sm text-gray-600">{copy.emptyDescription}</p>
        </div>
      )}
    </div>
  );
}

export default function NutritionFitness({ onBack, onNavigate }: NutritionFitnessProps) {
  const [data, setData] = useState<NutritionFitnessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<NutritionFitnessEntryMode>('log');
  const [activeEditor, setActiveEditor] = useState<ActiveEditorState>(null);
  const [editorValues, setEditorValues] = useState<HabitEditorValues>(emptyEditorValues());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadNutritionFitness = async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await fetchNutritionFitnessData());
    } catch (err: any) {
      setError(err?.message || 'Unable to load nutrition and fitness data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNutritionFitness();
  }, []);

  const openCreateEditor = (kind: NutritionFitnessEditorKind) => {
    setActiveEditor({ kind, entryMode: viewMode, mode: 'create' });
    setEditorValues(emptyEditorValues());
    setSaveError(null);
  };

  const openEditEditor = (kind: NutritionFitnessEditorKind, entry: PatientSocialHistoryEntry) => {
    const entryMode = activeEditor?.entryMode ?? viewMode;
    setActiveEditor({ kind, entryMode, mode: 'edit', entryId: entry.id });
    setEditorValues(getEditorValuesFromEntry(entry));
    setSaveError(null);
  };

  const closeEditor = () => {
    setActiveEditor(null);
    setEditorValues(emptyEditorValues());
    setSaveError(null);
  };

  const handleSaveEditor = async () => {
    if (!activeEditor) return;

    if (!editorValues.title.trim()) {
      setSaveError(`Please add a ${trackerConfig[activeEditor.kind].titleLabel.toLowerCase()}.`);
      return;
    }

    setSaving(true);
    setSaveError(null);

    const payload = {
      category: getNutritionFitnessEntryCategory(activeEditor.kind),
      title: editorValues.title.trim(),
      status: editorValues.status.trim(),
      startDate: editorValues.startDate || null,
      endDate: activeEditor.entryMode === 'routine' ? editorValues.endDate || null : null,
      detail: editorValues.detail.trim(),
      notes: encodeNutritionFitnessTrackerNotes(activeEditor.kind, activeEditor.entryMode),
    };

    try {
      if (activeEditor.mode === 'create') {
        await api.createMyMedicalHistoryEntry('social', payload);
      } else if (activeEditor.entryId) {
        await api.updateMyMedicalHistoryEntry('social', activeEditor.entryId, payload);
      }

      closeEditor();
      await loadNutritionFitness();
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save this entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (kind: NutritionFitnessEditorKind, item: NutritionFitnessHabitItem) => {
    const label = item.title || trackerConfig[kind].title.toLowerCase();
    if (!window.confirm(`Delete "${label}" from your ${trackerConfig[kind].sectionTitle.toLowerCase()} logs?`)) {
      return;
    }

    try {
      await api.deleteMyMedicalHistoryEntry('social', item.entry.id);
      if (activeEditor?.entryId === item.entry.id) {
        closeEditor();
      }
      await loadNutritionFitness();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete this entry');
    }
  };

  const renderEditor = (kind: NutritionFitnessEditorKind) => (
    <HabitEditor
      kind={kind}
      entryMode={activeEditor?.entryMode ?? viewMode}
      values={editorValues}
      saving={saving}
      error={saveError}
      submitLabel={
        activeEditor?.mode === 'edit'
          ? 'Save changes'
          : (activeEditor?.entryMode ?? viewMode) === 'routine'
            ? trackerConfig[kind].addRoutineLabel
            : trackerConfig[kind].addLabel
      }
      onChange={(key, value) => setEditorValues((current) => ({ ...current, [key]: value }))}
      onSave={handleSaveEditor}
      onCancel={closeEditor}
    />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-emerald-100 bg-white p-6 text-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={onBack} className="text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-gray-900">Nutrition & Fitness</h1>
        </div>
        <p className="text-sm text-gray-600">
          Built from the vitals and lifestyle history currently saved in your MediLink account.
        </p>
      </div>

      <div className="space-y-6 p-6">
        <div className="rounded-xl border border-emerald-200 bg-white p-5">
          <p className="text-sm text-gray-600">
            Use Health Summary for vitals like weight, blood pressure, heart rate, and blood sugar. Use this page for
            exercise and nutrition habits.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => onNavigate('health-summary')}>
              Open Health Summary
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-gray-900">Current scope</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {trackerChips.map((item) => (
              <Badge key={item} className="border-0 bg-white text-blue-700">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
            Loading nutrition and fitness data...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-xl border border-red-200 bg-white p-6">
            <div className="mb-4 flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
              <div>
                <h3 className="text-gray-900">Could not load Nutrition & Fitness</h3>
                <p className="mt-1 text-sm text-gray-600">{error}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => void loadNutritionFitness()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : null}

        {!loading && !error && data ? (
          <div className="space-y-6">
            <div className="flex gap-2 rounded-xl border border-gray-200 bg-white p-2">
              <Button
                variant={viewMode === 'log' ? 'default' : 'ghost'}
                className={viewMode === 'log' ? 'bg-teal-600 text-white hover:bg-teal-700' : ''}
                onClick={() => {
                  setViewMode('log');
                  setActiveEditor(null);
                }}
              >
                Logs
              </Button>
              <Button
                variant={viewMode === 'routine' ? 'default' : 'ghost'}
                className={viewMode === 'routine' ? 'bg-teal-600 text-white hover:bg-teal-700' : ''}
                onClick={() => {
                  setViewMode('routine');
                  setActiveEditor(null);
                }}
              >
                Routines
              </Button>
            </div>
            {trackerOrder.map((kind) => (
              <TrackerSection
                key={kind}
                kind={kind}
                entryMode={viewMode}
                items={viewMode === 'log' ? data.trackerLogs[kind] : data.trackerRoutines[kind]}
                createEditor={
                  activeEditor?.kind === kind &&
                  activeEditor.mode === 'create' &&
                  activeEditor.entryMode === viewMode
                    ? renderEditor(kind)
                    : undefined
                }
                editingEntryId={
                  activeEditor?.kind === kind &&
                  activeEditor.mode === 'edit' &&
                  activeEditor.entryMode === viewMode
                    ? activeEditor.entryId
                    : undefined
                }
                renderEditEditor={() => renderEditor(kind)}
                onAdd={() => openCreateEditor(kind)}
                onEdit={(item) => openEditEditor(kind, item.entry)}
                onDelete={(item) => void handleDeleteEntry(kind, item)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
