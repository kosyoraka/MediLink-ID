import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  FileText,
  Pill,
  RefreshCw,
  Shield,
  Syringe,
  Users,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  fetchRecommendationsData,
  type RecommendationActionItem,
  type RecommendationActionScreen,
  type RecommendationIcon,
  type RecommendationInsightItem,
  type RecommendationsData,
} from "@/lib/recommendations";

interface RecommendationsProps {
  onBack: () => void;
  onNavigate: (screen: RecommendationActionScreen) => void;
}

const iconMap: Record<RecommendationIcon, typeof Calendar> = {
  calendar: Calendar,
  activity: Activity,
  file: FileText,
  syringe: Syringe,
  shield: Shield,
  pill: Pill,
  users: Users,
};

const priorityClasses = {
  high: {
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
  },
  medium: {
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
  low: {
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
} as const;

const insightToneClasses = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  orange: "bg-orange-100 text-orange-600",
} as const;

function ActionCard({
  item,
  onNavigate,
}: {
  item: RecommendationActionItem;
  onNavigate: (screen: RecommendationActionScreen) => void;
}) {
  const Icon = iconMap[item.icon];
  const styles = priorityClasses[item.priority];

  return (
    <div className={`bg-white rounded-xl border-2 p-5 ${styles.border}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="text-gray-900">{item.title}</h4>
            <Badge className={`${styles.badge} border-0 shrink-0`}>{item.badge}</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
          <p className="text-sm text-gray-500">{item.detail}</p>
        </div>
      </div>

      <Button
        size="sm"
        className="bg-teal-600 hover:bg-teal-700 text-white"
        onClick={() => onNavigate(item.actionScreen)}
      >
        {item.actionLabel}
      </Button>
    </div>
  );
}

function InsightCard({
  item,
  onNavigate,
}: {
  item: RecommendationInsightItem;
  onNavigate: (screen: RecommendationActionScreen) => void;
}) {
  const Icon = iconMap[item.icon];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${insightToneClasses[item.tone]}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-gray-900 mb-2">{item.title}</h4>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600">Current: {item.current}</p>
            <p className="text-gray-600">Next step: {item.nextStep}</p>
          </div>
        </div>
      </div>
      <Button size="sm" variant="outline" className="w-full" onClick={() => onNavigate(item.actionScreen)}>
        {item.actionLabel}
      </Button>
    </div>
  );
}

export default function Recommendations({ onBack, onNavigate }: RecommendationsProps) {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const next = await fetchRecommendationsData();
        if (cancelled) return;
        setData(next);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Unable to load recommendations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const score = data?.score ?? 0;
  const scoreProgress = Math.max(0, Math.min(score, 100)) / 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-green-600 to-green-700 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white">Recommendations</h1>
        </div>
        <p className="text-green-100">Built from the information currently saved in your MediLink account.</p>
      </div>

      <div className="p-6 -mt-4 space-y-6">
        <div className="bg-gradient-to-br from-teal-50 to-green-50 rounded-xl border border-teal-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-gray-900 dark:text-gray-100 mb-1">Care Readiness Score</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {loading
                  ? "Reviewing your profile, records, appointments, and health summary..."
                  : data?.scoreLabel || "Loading"}
              </p>
            </div>
            <div className="relative w-20 h-20">
              <svg className="transform -rotate-90 w-20 h-20">
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 35}`}
                  strokeDashoffset={`${2 * Math.PI * 35 * (1 - scoreProgress)}`}
                  className="text-green-600"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl text-gray-900 dark:text-gray-100">{loading ? "…" : `${score}%`}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">
              Completed: {loading ? "…" : `${data?.completedCount ?? 0}/${data?.totalCount ?? 0}`}
            </span>
            <span className="text-gray-600 dark:text-gray-300">
              Pending: {loading ? "…" : `${(data?.totalCount ?? 0) - (data?.completedCount ?? 0)}`}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          This page uses your actual MediLink profile, records, appointments, medications, and health summary. It
          helps surface follow-ups, but it is not a diagnosis or a substitute for professional medical advice.
        </div>

        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
            Loading recommendations...
          </div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="text-gray-900 mb-1">Could not load recommendations</h3>
                <p className="text-sm text-gray-600">{error}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div>
              <h3 className="text-gray-900 mb-3">Recommended Next Steps</h3>
              <div className="space-y-3">
                {data.nextSteps.length > 0 ? (
                  data.nextSteps.map((item) => (
                    <ActionCard key={item.id} item={item} onNavigate={onNavigate} />
                  ))
                ) : (
                  <div className="bg-white rounded-xl border border-green-200 p-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="text-gray-900 mb-1">No urgent follow-ups right now</h4>
                        <p className="text-sm text-gray-600">
                          Your current MediLink data looks well covered. You can still review records, appointments,
                          and your health summary whenever you want.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Syringe className="w-5 h-5 text-gray-600" />
                <h3 className="text-gray-900">Immunizations</h3>
              </div>
              <div className="space-y-3">
                {data.immunizations.map((immunization) => (
                  <div key={immunization.id} className="flex items-start justify-between gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-gray-900 mb-1">{immunization.name}</p>
                      <p className="text-sm text-gray-600 mb-1">{immunization.detail}</p>
                      <p className="text-xs text-gray-500">{immunization.dateLabel}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`${immunization.emptyState ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"} border-0`}>
                        {immunization.statusLabel}
                      </Badge>
                      {immunization.actionLabel && immunization.actionScreen && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onNavigate(immunization.actionScreen!)}
                        >
                          {immunization.actionLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-gray-900 mb-3">Care Insights</h3>
              <div className="space-y-3">
                {data.insights.map((item) => (
                  <InsightCard key={item.id} item={item} onNavigate={onNavigate} />
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl border border-blue-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="text-gray-900 dark:text-gray-100">What’s Already On Track</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {data.completedCount} of {data.totalCount} account areas already look complete.
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                {data.highlights.map((item) => (
                  <p key={item.id}>
                    ✓ {item.label}
                    <span className="text-gray-500 dark:text-gray-400"> - {item.detail}</span>
                  </p>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
