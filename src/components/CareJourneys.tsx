import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  Pill,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  fetchCareJourneysData,
  type CareJourney,
  type CareJourneysData,
} from '@/lib/careJourneys';
import type { PatientDataScreen } from '@/lib/patientDataNavigation';

interface CareJourneysProps {
  onBack: () => void;
  onNavigate: (screen: PatientDataScreen) => void;
}

function JourneyStateIcon({ state }: { state: CareJourney['milestones'][number]['state'] }) {
  if (state === 'completed') {
    return <CheckCircle2 className="w-5 h-5 text-green-600" />;
  }

  if (state === 'current') {
    return <Clock3 className="w-5 h-5 text-blue-600" />;
  }

  return <Circle className="w-5 h-5 text-gray-400" />;
}

function JourneyCard({
  journey,
  onOpen,
}: {
  journey: CareJourney;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="w-full rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-teal-500 hover:bg-teal-50"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-gray-900">{journey.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{journey.durationLabel}</p>
        </div>
        <Badge className="border-0 bg-blue-100 text-blue-700">{journey.currentPhase}</Badge>
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm">
        <Badge className="border-0 bg-green-100 text-green-700">{journey.statusLabel}</Badge>
        <span className="text-gray-500">Updated from your real account data</span>
      </div>

      <p className="mb-4 text-sm text-gray-600">{journey.summary}</p>

      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-gray-600">Journey completeness</span>
        <span className="text-gray-900">{journey.progress}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-teal-600 transition-all"
          style={{ width: `${journey.progress}%` }}
        />
      </div>
    </button>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl text-gray-900">{value}</p>
    </div>
  );
}

export default function CareJourneys({ onBack, onNavigate }: CareJourneysProps) {
  const [data, setData] = useState<CareJourneysData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const next = await fetchCareJourneysData();
        if (cancelled) return;
        setData(next);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Unable to load care journeys');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedJourney =
    data?.journeys.find((journey) => journey.id === selectedJourneyId) ||
    data?.archivedJourneys.find((journey) => journey.id === selectedJourneyId) ||
    null;

  if (selectedJourney) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-cyan-600 to-teal-700 p-6 text-white">
          <div className="mb-4 flex items-center gap-3">
            <button onClick={() => setSelectedJourneyId(null)} className="text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-white">{selectedJourney.title}</h1>
              <p className="text-sm text-cyan-100">{selectedJourney.durationLabel}</p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge className="border-0 bg-white/20 text-white">{selectedJourney.statusLabel}</Badge>
            <Badge className="border-0 bg-white/20 text-white">{selectedJourney.currentPhase}</Badge>
          </div>

          <p className="text-sm text-cyan-100">{selectedJourney.summary}</p>
        </div>

        <div className="-mt-4 space-y-6 p-6">
          <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-gray-900">Journey snapshot</h3>
                <p className="mt-1 text-sm text-gray-600">
                  This view is derived from your condition list, appointments, records, medications, and health summary.
                </p>
              </div>
              <div className="rounded-full bg-white px-4 py-3 text-center shadow-sm">
                <p className="text-2xl text-gray-900">{selectedJourney.progress}%</p>
                <p className="text-xs text-gray-500">complete</p>
              </div>
            </div>

            <div className="mb-4 h-2 rounded-full bg-white/80">
              <div
                className="h-2 rounded-full bg-teal-600 transition-all"
                style={{ width: `${selectedJourney.progress}%` }}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Diagnosed</p>
                <p className="mt-1 text-gray-900">{selectedJourney.diagnosedLabel}</p>
              </div>
              <div className="rounded-lg bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Metric or target</p>
                <p className="mt-1 text-gray-900">{selectedJourney.metricLabel}</p>
              </div>
              <div className="rounded-lg bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Source</p>
                <p className="mt-1 text-gray-900">{selectedJourney.sourceLabel}</p>
              </div>
              <div className="rounded-lg bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Current phase</p>
                <p className="mt-1 text-gray-900">{selectedJourney.currentPhase}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <h3 className="text-gray-900">Journey milestones</h3>
            </div>

            <div className="space-y-3">
              {selectedJourney.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="mb-2 flex items-start gap-3">
                    <JourneyStateIcon state={milestone.state} />
                    <div className="flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h4 className="text-gray-900">{milestone.title}</h4>
                        <Badge
                          className={
                            milestone.state === 'completed'
                              ? 'border-0 bg-green-100 text-green-700'
                              : milestone.state === 'current'
                              ? 'border-0 bg-blue-100 text-blue-700'
                              : 'border-0 bg-gray-200 text-gray-700'
                          }
                        >
                          {milestone.state}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{milestone.detail}</p>
                      <p className="mt-2 text-xs text-gray-500">{milestone.dateLabel}</p>
                    </div>
                  </div>

                  {milestone.actionLabel && milestone.actionScreen && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onNavigate(milestone.actionScreen!)}
                    >
                      {milestone.actionLabel}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-gray-900">Current signals</h3>
            <div className="space-y-3">
              {selectedJourney.signals.map((signal) => (
                <div key={signal.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">{signal.label}</p>
                  <p className="mt-1 text-lg text-gray-900">{signal.value}</p>
                  <p className="mt-2 text-sm text-gray-600">{signal.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="text-gray-900">Care team</h3>
            </div>

            {selectedJourney.careTeam.length > 0 ? (
              <div className="space-y-3">
                {selectedJourney.careTeam.map((member) => (
                  <div key={member.id} className="rounded-lg bg-gray-50 p-4">
                    <p className="text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.role}</p>
                    <p className="mt-1 text-sm text-gray-500">{member.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                No connected provider or prescriber details were matched to this journey yet.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-gray-900">Quick actions</h3>
            <div className="flex flex-wrap gap-3">
              {selectedJourney.quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant || 'default'}
                  className={
                    action.variant === 'outline'
                      ? undefined
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }
                  onClick={() => onNavigate(action.screen)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-cyan-600 to-teal-700 p-6 text-white">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white">Care Journeys</h1>
        </div>
        <p className="text-cyan-100">
          Condition-based timelines built from the real data already saved in your MediLink account.
        </p>
      </div>

      <div className="-mt-4 space-y-6 p-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Journeys are now generated from your condition list, medications, appointments, health summary, and uploaded
          records. If a condition has little supporting data yet, the page will show that clearly instead of guessing.
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            icon={<Stethoscope className="w-4 h-4 text-teal-600" />}
            label="Active journeys"
            value={loading ? '...' : data?.totalActiveConditions ?? 0}
          />
          <SummaryCard
            icon={<ShieldCheck className="w-4 h-4 text-teal-600" />}
            label="Resolved history"
            value={loading ? '...' : data?.totalResolvedConditions ?? 0}
          />
          <SummaryCard
            icon={<Pill className="w-4 h-4 text-teal-600" />}
            label="Tracked meds"
            value={loading ? '...' : data?.trackedMedicationCount ?? 0}
          />
          <SummaryCard
            icon={<Users className="w-4 h-4 text-teal-600" />}
            label="Linked providers"
            value={loading ? '...' : data?.linkedProviderCount ?? 0}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Last history update reflected here: {loading ? 'Loading...' : data?.lastUpdatedLabel || 'No updates yet'}</span>
          </div>
        </div>

        {loading && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
            Loading care journeys...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-white p-6">
            <div className="mb-4 flex items-start gap-3">
              <AlertCircle className="mt-0.5 w-5 h-5 text-red-600" />
              <div>
                <h3 className="text-gray-900">Could not load care journeys</h3>
                <p className="mt-1 text-sm text-gray-600">{error}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        )}

        {!loading && !error && data && data.journeys.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-start gap-3">
              <FileText className="mt-0.5 w-5 h-5 text-teal-600" />
              <div>
                <h3 className="text-gray-900">No active condition journeys yet</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Once conditions are added to your chart, this page can build timelines around follow-up, medications,
                  monitoring, and next steps.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={() => onNavigate('health-summary')}>
                Review health summary
              </Button>
              <Button variant="outline" onClick={() => onNavigate('manage-providers')}>
                Connect providers
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && data && data.journeys.length > 0 && (
          <div>
            <h3 className="mb-3 text-gray-900">Active journeys</h3>
            <div className="space-y-3">
              {data.journeys.map((journey) => (
                <JourneyCard
                  key={journey.id}
                  journey={journey}
                  onOpen={() => setSelectedJourneyId(journey.id)}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && !error && data && data.archivedJourneys.length > 0 && (
          <div>
            <h3 className="mb-3 text-gray-900">Archived condition history</h3>
            <div className="space-y-3">
              {data.archivedJourneys.map((journey) => (
                <JourneyCard
                  key={journey.id}
                  journey={journey}
                  onOpen={() => setSelectedJourneyId(journey.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
