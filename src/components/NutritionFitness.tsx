import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertCircle,
  Apple,
  ArrowLeft,
  ClipboardList,
  Dumbbell,
  Heart,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  Sparkles,
  Trash2,
  Waves,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { api, type PatientSocialHistoryEntry } from '@/lib/api';
import {
  fetchNutritionFitnessData,
  type NutritionFitnessActionItem,
  type NutritionFitnessData,
  type NutritionFitnessEditorKind,
  type NutritionFitnessHabitItem,
  type NutritionFitnessSignalItem,
  type NutritionFitnessSummaryCard,
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

const summaryIconMap: Record<string, typeof ClipboardList> = {
  coverage: ClipboardList,
  vitals: Activity,
  exercise: Dumbbell,
  nutrition: Apple,
};

const signalIconMap: Record<NutritionFitnessSignalItem['id'], typeof Activity> = {
  weight: Scale,
  bloodPressure: Heart,
  heartRate: Activity,
  bloodSugar: Waves,
};

const actionPriorityClasses = {
  high: {
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
  },
  medium: {
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
  },
  low: {
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
  },
} as const;

const editorCopy: Record<
  NutritionFitnessEditorKind,
  {
    title: string;
    addLabel: string;
    titleLabel: string;
    titlePlaceholder: string;
    statusPlaceholder: string;
    detailPlaceholder: string;
    notesPlaceholder: string;
  }
> = {
  exercise: {
    title: 'Exercise habit',
    addLabel: 'Add exercise habit',
    titleLabel: 'Exercise title',
    titlePlaceholder: 'Walk 30 minutes, 5 days a week',
    statusPlaceholder: 'Current routine',
    detailPlaceholder: 'Cardio, strength, mobility, frequency, intensity, or changes over time',
    notesPlaceholder: 'Anything else you want to remember about this routine',
  },
  nutrition: {
    title: 'Nutrition habit',
    addLabel: 'Add nutrition habit',
    titleLabel: 'Nutrition title',
    titlePlaceholder: 'Mediterranean-style eating plan',
    statusPlaceholder: 'Current approach',
    detailPlaceholder: 'Meals, restrictions, goals, or provider guidance you are following',
    notesPlaceholder: 'Anything else you want to track about this nutrition habit',
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

function getSignalBadgeClass(statusLabel: string) {
  const normalized = statusLabel.toLowerCase();

  if (normalized.includes('normal') || normalized.includes('improved') || normalized.includes('stable')) {
    return 'bg-green-100 text-green-700';
  }

  if (
    normalized.includes('high') ||
    normalized.includes('low') ||
    normalized.includes('missing') ||
    normalized.includes('recommended')
  ) {
    return 'bg-red-100 text-red-700';
  }

  if (normalized.includes('elevated') || normalized.includes('above')) {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-blue-100 text-blue-700';
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
          Status
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            value={values.status}
            placeholder={copy.statusPlaceholder}
            onChange={(event) => onChange('status', event.target.value)}
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm text-gray-700">
            Start date
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              value={values.startDate}
              onChange={(event) => onChange('startDate', event.target.value)}
            />
          </label>

          <label className="text-sm text-gray-700">
            End date
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

function SummaryCard({
  item,
  onAction,
}: {
  item: NutritionFitnessSummaryCard;
  onAction: (item: NutritionFitnessSummaryCard) => void;
}) {
  const Icon = summaryIconMap[item.id] || ClipboardList;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-600">{item.label}</p>
          <p className="mt-1 text-2xl text-gray-900">{item.value}</p>
        </div>
      </div>

      <p className="mb-3 text-sm text-gray-600">{item.detail}</p>
      <Button size="sm" variant="outline" onClick={() => onAction(item)}>
        {item.actionLabel}
      </Button>
    </div>
  );
}

function SignalCard({
  item,
  onAction,
}: {
  item: NutritionFitnessSignalItem;
  onAction: (item: NutritionFitnessSignalItem) => void;
}) {
  const Icon = signalIconMap[item.id];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-gray-600">{item.label}</p>
            <p className="mt-1 text-lg text-gray-900">{item.value}</p>
          </div>
        </div>
        <Badge className={`border-0 ${getSignalBadgeClass(item.statusLabel)}`}>{item.statusLabel}</Badge>
      </div>

      <p className="mb-4 text-sm text-gray-600">{item.detail}</p>
      <Button size="sm" variant="outline" onClick={() => onAction(item)}>
        {item.actionLabel}
      </Button>
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

function ActionCard({
  item,
  onAction,
}: {
  item: NutritionFitnessActionItem;
  onAction: (item: NutritionFitnessActionItem) => void;
}) {
  const styles = actionPriorityClasses[item.priority];

  return (
    <div className={`rounded-xl border-2 bg-white p-5 ${styles.border}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-gray-900">{item.title}</h4>
          <p className="mt-2 text-sm text-gray-600">{item.description}</p>
        </div>
        <Badge className={`border-0 ${styles.badge}`}>{item.priority}</Badge>
      </div>

      <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700" onClick={() => onAction(item)}>
        {item.actionLabel}
      </Button>
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

  const handleAction = (
    item: NutritionFitnessSummaryCard | NutritionFitnessSignalItem | NutritionFitnessActionItem
  ) => {
    if (item.actionType === 'screen') {
      onNavigate(item.actionScreen);
      return;
    }

    const matchingItems = item.actionEditor === 'exercise' ? exerciseItems : nutritionItems;

    if (matchingItems.length > 0) {
      openEditEditor(item.actionEditor, matchingItems[0].entry);
      return;
    }

    openCreateEditor(item.actionEditor);
  };

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
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-white">Nutrition & Fitness</h1>
        </div>
        <p className="text-sm text-emerald-100">
          Built from the vitals and lifestyle history currently saved in your MediLink account.
        </p>
      </div>

      <div className="-mt-4 space-y-6 p-6">
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
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
            <div className="rounded-full bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-2xl text-gray-900">
                {loading ? '...' : `${data?.coverageCount ?? 0}/${data?.coverageTotal ?? 0}`}
              </p>
              <p className="text-xs text-gray-500">areas tracked</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <Badge className="border-0 bg-white text-gray-700">
              {loading ? 'Checking tracked areas...' : data?.coverageLabel}
            </Badge>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.summaryCards.map((item) => (
                <SummaryCard key={item.id} item={item} onAction={handleAction} />
              ))}
            </div>

            <div>
              <h3 className="mb-3 text-gray-900">Wellness signals</h3>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {data.signals.map((item) => (
                  <SignalCard key={item.id} item={item} onAction={handleAction} />
                ))}
              </div>
            </div>

            <HabitSection
              kind="exercise"
              title="Movement history"
              description="Exercise habits are managed directly on this page now."
              items={exerciseItems}
              emptyTitle="No exercise history saved yet"
              emptyDescription="Add movement routines, activity changes, or provider guidance here to make this section useful."
              addLabel="Add exercise habit"
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
              title="Nutrition history"
              description="Diet and nutrition habits are managed directly on this page now."
              items={nutritionItems}
              emptyTitle="No nutrition history saved yet"
              emptyDescription="Add diet-related history, eating patterns, or guidance here so this section reflects your current approach."
              addLabel="Add nutrition habit"
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

            <div>
              <h3 className="mb-3 text-gray-900">Suggested next steps</h3>
              <div className="space-y-3">
                {data.actionItems.map((item) => (
                  <ActionCard key={item.id} item={item} onAction={handleAction} />
                ))}
              </div>
            </div>

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
                  Add exercise habit
                </Button>
                <Button variant="outline" onClick={() => openCreateEditor('nutrition')}>
                  Add nutrition habit
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
