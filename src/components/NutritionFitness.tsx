import { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Apple,
  ArrowLeft,
  Calendar,
  ClipboardList,
  Dumbbell,
  Heart,
  RefreshCw,
  Scale,
  Sparkles,
  Waves,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  fetchNutritionFitnessData,
  type NutritionFitnessActionItem,
  type NutritionFitnessData,
  type NutritionFitnessHabitItem,
  type NutritionFitnessSignalItem,
  type NutritionFitnessSummaryCard,
} from '@/lib/nutritionFitness';
import type { PatientDataScreen } from '@/lib/patientDataNavigation';

interface NutritionFitnessProps {
  onBack: () => void;
  onNavigate: (screen: PatientDataScreen) => void;
}

const summaryIconMap: Record<NutritionFitnessSummaryCard['id'], typeof ClipboardList> = {
  coverage: ClipboardList,
  vitals: Activity,
  exercise: Dumbbell,
  nutrition: Apple,
  updated: Calendar,
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

function SummaryCard({
  item,
  onNavigate,
}: {
  item: NutritionFitnessSummaryCard;
  onNavigate: (screen: PatientDataScreen) => void;
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
      <Button size="sm" variant="outline" onClick={() => onNavigate(item.actionScreen)}>
        {item.actionLabel}
      </Button>
    </div>
  );
}

function SignalCard({
  item,
  onNavigate,
}: {
  item: NutritionFitnessSignalItem;
  onNavigate: (screen: PatientDataScreen) => void;
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
      <Button size="sm" variant="outline" onClick={() => onNavigate(item.actionScreen)}>
        {item.actionLabel}
      </Button>
    </div>
  );
}

function HabitCard({ item }: { item: NutritionFitnessHabitItem }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-gray-900">{item.title}</h4>
          <p className="mt-1 text-sm text-gray-500">{item.dateLabel}</p>
        </div>
        <Badge className="border-0 bg-gray-100 text-gray-700">{item.statusLabel}</Badge>
      </div>

      <p className="mb-3 text-sm text-gray-600">{item.detail}</p>
      <div className="space-y-1 text-sm text-gray-500">
        <p>Notes: {item.notes}</p>
        <p>Source: {item.sourceLabel}</p>
      </div>
    </div>
  );
}

function HabitSection({
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  items: NutritionFitnessHabitItem[];
  emptyTitle: string;
  emptyDescription: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <HabitCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6">
          <h4 className="text-gray-900">{emptyTitle}</h4>
          <p className="mt-2 text-sm text-gray-600">{emptyDescription}</p>
          <Button className="mt-4 bg-teal-600 text-white hover:bg-teal-700" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

function ActionCard({
  item,
  onNavigate,
}: {
  item: NutritionFitnessActionItem;
  onNavigate: (screen: PatientDataScreen) => void;
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

      <Button size="sm" className="bg-teal-600 text-white hover:bg-teal-700" onClick={() => onNavigate(item.actionScreen)}>
        {item.actionLabel}
      </Button>
    </div>
  );
}

export default function NutritionFitness({ onBack, onNavigate }: NutritionFitnessProps) {
  const [data, setData] = useState<NutritionFitnessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const next = await fetchNutritionFitnessData();
        if (cancelled) return;
        setData(next);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Unable to load nutrition and fitness data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

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
              <p className="text-2xl text-gray-900">{loading ? '...' : `${data?.coverageCount ?? 0}/${data?.coverageTotal ?? 0}`}</p>
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
            This page only shows data already stored in MediLink. Daily tracker data is not automatically synced here yet.
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
            <Button variant="outline" onClick={() => setReloadToken((value) => value + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.summaryCards.map((item) => (
                <SummaryCard key={item.id} item={item} onNavigate={onNavigate} />
              ))}
            </div>

            <div>
              <h3 className="mb-3 text-gray-900">Wellness signals</h3>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {data.signals.map((item) => (
                  <SignalCard key={item.id} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </div>

            <HabitSection
              title="Movement history"
              description="Exercise-related history saved in your account appears here."
              items={data.exerciseHabits}
              emptyTitle="No exercise history saved yet"
              emptyDescription="Add movement routines, activity notes, or exercise changes in Medical History to make this section useful."
              actionLabel="Open Medical History"
              onAction={() => onNavigate('medical-history')}
            />

            <HabitSection
              title="Nutrition history"
              description="Diet-related entries from your Medical History feed this section."
              items={data.nutritionHabits}
              emptyTitle="No nutrition history saved yet"
              emptyDescription="Add diet-related history in Medical History so this page can reflect your current nutrition habits."
              actionLabel="Open Medical History"
              onAction={() => onNavigate('medical-history')}
            />

            <div>
              <h3 className="mb-3 text-gray-900">Suggested next steps</h3>
              <div className="space-y-3">
                {data.actionItems.map((item) => (
                  <ActionCard key={item.id} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5">
              <h3 className="text-gray-900">Where to add more data</h3>
              <p className="mt-2 text-sm text-gray-600">
                Use Health Summary for vitals like weight, blood pressure, heart rate, and blood sugar. Use Medical
                History for exercise and diet habits.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => onNavigate('health-summary')}>
                  Open Health Summary
                </Button>
                <Button variant="outline" onClick={() => onNavigate('medical-history')}>
                  Open Medical History
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
