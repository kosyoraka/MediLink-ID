import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Apple,
  ArrowLeft,
  Dumbbell,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { api, type PatientSocialHistoryEntry } from '@/lib/api';
import {
  fetchNutritionFitnessData,
  type NutritionFitnessData,
  type NutritionFitnessEditorKind,
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
  notes: string;
};

type ActiveEditorState = {
  kind: NutritionFitnessEditorKind;
  mode: 'create' | 'edit';
  entryId?: string;
} | null;

const editorCopy: Record<
  NutritionFitnessEditorKind,
  {
    title: string;
    addLabel: string;
    titleLabel: string;
    titlePlaceholder: string;
    statusLabel: string;
    statusPlaceholder: string;
    startDateLabel: string;
    endDateLabel: string;
    detailPlaceholder: string;
    notesPlaceholder: string;
    helperTitle: string;
    helperDescription: string;
    helperExamples: string[];
  }
> = {
  exercise: {
    title: 'Activity log',
    addLabel: 'Add activity log',
    titleLabel: 'Activity title',
    titlePlaceholder: '10,200 steps, treadmill workout, evening walk',
    statusLabel: 'Activity type or progress',
    statusPlaceholder: 'Daily goal hit, active week, current routine',
    startDateLabel: 'Activity date',
    endDateLabel: 'End date (optional for routines)',
    detailPlaceholder: 'Log steps, workout type, duration, distance, calories burned, or activity changes over time',
    notesPlaceholder: 'Anything else you want to remember about this activity or movement routine',
    helperTitle: 'What to log here',
    helperDescription: 'Use one entry for a single activity session or for a repeating routine you want to keep on file.',
    helperExamples: ['Steps for the day', 'Workout or walk duration', 'Calories burned', 'Distance or routine details'],
  },
  nutrition: {
    title: 'Meal or nutrition log',
    addLabel: 'Add nutrition log',
    titleLabel: 'Meal or nutrition title',
    titlePlaceholder: 'Breakfast, afternoon snack, 1,850 calorie day',
    statusLabel: 'Meal type or nutrition status',
    statusPlaceholder: 'On plan, higher protein, meal prep week',
    startDateLabel: 'Meal or log date',
    endDateLabel: 'End date (optional for plans)',
    detailPlaceholder: 'Track meals, snacks, calories, portions, hydration, restrictions, or provider guidance you are following',
    notesPlaceholder: 'Anything else you want to track about this meal, snack, or nutrition plan',
    helperTitle: 'What to log here',
    helperDescription: 'Use one entry for a meal, snack, or a single-day nutrition summary. Longer plans can still use an end date.',
    helperExamples: ['Calories for the meal or day', 'Foods and snacks eaten', 'Portions or hydration', 'Goals or provider guidance'],
  },
};

function emptyEditorValues(): HabitEditorValues {
  return {
    title: '',
    status: '',
    startDate: '',
    endDate: '',
    detail: '',
    notes: '',
  };
}

function getEditorValuesFromEntry(entry: PatientSocialHistoryEntry): HabitEditorValues {
  return {
    title: entry.title || '',
    status: entry.status || '',
    startDate: entry.startDate || '',
    endDate: entry.endDate || '',
    detail: entry.detail || '',
    notes: entry.notes || '',
  };
}

function getCategoryFromKind(kind: NutritionFitnessEditorKind): 'exercise' | 'diet' {
  return kind === 'exercise' ? 'exercise' : 'diet';
}

function HabitEditor({
  kind,
  values,
  saving,
  error,
  submitLabel,
  onChange,
  onSave,
  onCancel,
}: {
  kind: NutritionFitnessEditorKind;
  values: HabitEditorValues;
  saving: boolean;
  error: string | null;
  submitLabel: string;
  onChange: (key: keyof HabitEditorValues, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const copy = editorCopy[kind];

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
      <div className="mb-4 flex items-center gap-2">
        {kind === 'exercise' ? (
          <Dumbbell className="h-5 w-5 text-teal-700" />
        ) : (
          <Apple className="h-5 w-5 text-teal-700" />
        )}
        <h4 className="text-gray-900">{copy.title} editor</h4>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-4 rounded-lg border border-white/70 bg-white/80 p-3">
        <p className="text-sm font-medium text-gray-900">{copy.helperTitle}</p>
        <p className="mt-1 text-sm text-gray-600">{copy.helperDescription}</p>
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
          {copy.titleLabel}
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            value={values.title}
            placeholder={copy.titlePlaceholder}
            onChange={(event) => onChange('title', event.target.value)}
          />
        </label>

        <label className="text-sm text-gray-700">
          {copy.statusLabel}
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            value={values.status}
            placeholder={copy.statusPlaceholder}
            onChange={(event) => onChange('status', event.target.value)}
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm text-gray-700">
            {copy.startDateLabel}
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              value={values.startDate}
              onChange={(event) => onChange('startDate', event.target.value)}
            />
          </label>

          <label className="text-sm text-gray-700">
            {copy.endDateLabel}
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              value={values.endDate}
              onChange={(event) => onChange('endDate', event.target.value)}
            />
          </label>
        </div>

        <label className="text-sm text-gray-700">
          Details
          <textarea
            className="mt-1 min-h-[100px] w-full rounded-lg border border-gray-200 px-3 py-2"
            value={values.detail}
            placeholder={copy.detailPlaceholder}
            onChange={(event) => onChange('detail', event.target.value)}
          />
        </label>

        <label className="text-sm text-gray-700">
          Notes
          <textarea
            className="mt-1 min-h-[80px] w-full rounded-lg border border-gray-200 px-3 py-2"
            value={values.notes}
            placeholder={copy.notesPlaceholder}
            onChange={(event) => onChange('notes', event.target.value)}
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
  kind,
  item,
  isEditing,
  editor,
  onEdit,
  onDelete,
}: {
  kind: NutritionFitnessEditorKind;
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
          <div className="space-y-1 text-sm text-gray-500">
            <p>{kind === 'exercise' ? 'Routine notes' : 'Nutrition notes'}: {item.notes}</p>
            <p>Source: {item.sourceLabel}</p>
          </div>
        </>
      )}
    </div>
  );
}

function HabitSection({
  kind,
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
  addLabel,
  createEditor,
  editingEntryId,
  renderEditEditor,
  onAdd,
  onEdit,
  onDelete,
}: {
  kind: NutritionFitnessEditorKind;
  title: string;
  description: string;
  items: NutritionFitnessHabitItem[];
  emptyTitle: string;
  emptyDescription: string;
  addLabel: string;
  createEditor?: ReactNode;
  editingEntryId?: string;
  renderEditEditor: (item: NutritionFitnessHabitItem) => ReactNode;
  onAdd: () => void;
  onEdit: (item: NutritionFitnessHabitItem) => void;
  onDelete: (item: NutritionFitnessHabitItem) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
        <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      {createEditor ? <div className="mb-3">{createEditor}</div> : null}

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <HabitCard
              key={item.id}
              kind={kind}
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
          <h4 className="text-gray-900">{emptyTitle}</h4>
          <p className="mt-2 text-sm text-gray-600">{emptyDescription}</p>
        </div>
      )}
    </div>
  );
}

export default function NutritionFitness({ onBack, onNavigate }: NutritionFitnessProps) {
  const [data, setData] = useState<NutritionFitnessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEditor, setActiveEditor] = useState<ActiveEditorState>(null);
  const [editorValues, setEditorValues] = useState<HabitEditorValues>(emptyEditorValues());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadNutritionFitness = async () => {
    try {
      setLoading(true);
      setError(null);
      const next = await fetchNutritionFitnessData();
      setData(next);
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
    setActiveEditor({ kind, mode: 'create' });
    setEditorValues(emptyEditorValues());
    setSaveError(null);
  };

  const openEditEditor = (kind: NutritionFitnessEditorKind, entry: PatientSocialHistoryEntry) => {
    setActiveEditor({ kind, mode: 'edit', entryId: entry.id });
    setEditorValues(getEditorValuesFromEntry(entry));
    setSaveError(null);
  };

  const closeEditor = () => {
    setActiveEditor(null);
    setEditorValues(emptyEditorValues());
    setSaveError(null);
  };

  const exerciseItems = data?.exerciseHabits || [];
  const nutritionItems = data?.nutritionHabits || [];

  const handleSaveEditor = async () => {
    if (!activeEditor) return;

    if (!editorValues.title.trim()) {
      setSaveError(`Please add a ${editorCopy[activeEditor.kind].titleLabel.toLowerCase()}.`);
      return;
    }

    setSaving(true);
    setSaveError(null);

    const payload = {
      category: getCategoryFromKind(activeEditor.kind),
      title: editorValues.title.trim(),
      status: editorValues.status.trim(),
      startDate: editorValues.startDate || null,
      endDate: editorValues.endDate || null,
      detail: editorValues.detail.trim(),
      notes: editorValues.notes.trim(),
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
    const label = item.title || editorCopy[kind].title.toLowerCase();
    if (!window.confirm(`Delete "${label}" from your ${kind} history?`)) {
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
      values={editorValues}
      saving={saving}
      error={saveError}
      submitLabel={activeEditor?.mode === 'edit' ? 'Save changes' : editorCopy[kind].addLabel}
      onChange={(key, value) => setEditorValues((current) => ({ ...current, [key]: value }))}
      onSave={handleSaveEditor}
      onCancel={closeEditor}
    />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-emerald-100 bg-white p-6 text-gray-900 dark:border-white/10 dark:bg-gradient-to-br dark:from-emerald-600 dark:via-teal-600 dark:to-cyan-700 dark:text-white">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={onBack} className="text-gray-700 dark:text-white">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-gray-900 dark:text-white">Nutrition & Fitness</h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-emerald-100">
          Built from the vitals and lifestyle history currently saved in your MediLink account.
        </p>
      </div>

      <div className="-mt-4 space-y-6 p-6">
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-6">
          <div className="mb-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-emerald-700">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm">Wellness Snapshot</span>
              </div>
              <h3 className="text-gray-900">What MediLink can show today</h3>
              <p className="mt-2 text-sm text-gray-600">
                {loading
                  ? 'Reviewing your vitals plus nutrition and exercise history...'
                  : data?.overview || 'Loading your current wellness data.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <Badge className="border-0 bg-white text-gray-700">
              {loading ? 'Checking updates...' : `Last updated ${data?.lastUpdatedLabel}`}
            </Badge>
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-gray-900">Current scope</h3>
          <p className="mt-2 text-sm text-blue-900">
            This page uses data already stored in MediLink. Device-synced daily tracking is still not connected here yet.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(data?.unsupportedTracking || ['Steps', 'Workouts', 'Calories', 'Water intake', 'Sleep']).map((item) => (
              <Badge key={item} className="border-0 bg-white text-blue-700">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        {loading && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
            Loading nutrition and fitness data...
          </div>
        )}

        {!loading && error && (
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
        )}

        {!loading && !error && data && (
          <>
            <HabitSection
              kind="exercise"
              title="Activity, steps & workouts"
              description="Use one entry per day, workout, walk, step count, or repeating routine."
              items={exerciseItems}
              emptyTitle="No activity logs saved yet"
              emptyDescription="Add entries like steps, workouts, walks, calories burned, or recurring exercise plans here."
              addLabel="Add activity log"
              createEditor={
                activeEditor?.kind === 'exercise' && activeEditor.mode === 'create' ? renderEditor('exercise') : undefined
              }
              editingEntryId={activeEditor?.kind === 'exercise' && activeEditor.mode === 'edit' ? activeEditor.entryId : undefined}
              renderEditEditor={() => renderEditor('exercise')}
              onAdd={() => openCreateEditor('exercise')}
              onEdit={(item) => openEditEditor('exercise', item.entry)}
              onDelete={(item) => void handleDeleteEntry('exercise', item)}
            />

            <HabitSection
              kind="nutrition"
              title="Meals, calories & snacks"
              description="Use one entry per meal, snack, calorie summary, or longer nutrition plan."
              items={nutritionItems}
              emptyTitle="No meal or nutrition logs saved yet"
              emptyDescription="Add entries like breakfast, lunch, dinner, snacks, calories, hydration, or meal plans here."
              addLabel="Add nutrition log"
              createEditor={
                activeEditor?.kind === 'nutrition' && activeEditor.mode === 'create'
                  ? renderEditor('nutrition')
                  : undefined
              }
              editingEntryId={activeEditor?.kind === 'nutrition' && activeEditor.mode === 'edit' ? activeEditor.entryId : undefined}
              renderEditEditor={() => renderEditor('nutrition')}
              onAdd={() => openCreateEditor('nutrition')}
              onEdit={(item) => openEditEditor('nutrition', item.entry)}
              onDelete={(item) => void handleDeleteEntry('nutrition', item)}
            />

            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5">
              <h3 className="text-gray-900">Where to add more data</h3>
              <p className="mt-2 text-sm text-gray-600">
                Use Health Summary for vitals like weight, blood pressure, heart rate, and blood sugar. Use this page
                for exercise and nutrition habits.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => onNavigate('health-summary')}>
                  Open Health Summary
                </Button>
                <Button variant="outline" onClick={() => openCreateEditor('exercise')}>
                  Add activity log
                </Button>
                <Button variant="outline" onClick={() => openCreateEditor('nutrition')}>
                  Add nutrition log
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
