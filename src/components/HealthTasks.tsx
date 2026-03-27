import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Calendar,
  TestTube,
  Pill,
  FileText,
  Activity,
  ChevronRight,
  X,
  Bell,
  Users,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { api, type PatientAppointment, type PatientMedication, type Provider, type RecordDocument } from '@/lib/api';

interface HealthTasksProps {
  onBack: () => void;
  onNavigate?: (screen: 'appointments' | 'documents' | 'medications' | 'recommendations' | 'manage-providers') => void;
}

type TaskTab = 'all' | 'urgent' | 'this-week' | 'upcoming';

interface Task {
  id: string;
  category: 'appointment' | 'test' | 'medication' | 'document' | 'preventive' | 'followup' | 'provider';
  title: string;
  description: string;
  dueLabel: string;
  dueAt: string | null;
  priority: 'urgent' | 'soon' | 'routine';
  provider?: string;
  estimatedTime: string;
  overdue?: boolean;
  actionScreen?: 'appointments' | 'documents' | 'medications' | 'recommendations' | 'manage-providers';
}

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDueLabel(dateValue: string | null) {
  if (!dateValue) return 'No due date';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTaskTimeLabel(task: Task) {
  if (task.overdue) return task.dueLabel;
  return `Due: ${task.dueLabel}`;
}

function getTaskStatusMeta(dateValue: string | null, priority: Task['priority']) {
  if (!dateValue) return { overdue: false, dueLabel: 'No due date', priority };

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return { overdue: false, dueLabel: 'No due date', priority };

  const diffDays = Math.floor((date.getTime() - Date.now()) / DAY_MS);

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    const overdueLabel =
      overdueDays >= 30
        ? `Overdue by ${Math.floor(overdueDays / 30)} month${Math.floor(overdueDays / 30) === 1 ? '' : 's'}`
        : `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`;
    return { overdue: true, dueLabel: overdueLabel, priority: 'urgent' as const };
  }

  if (diffDays <= 2) return { overdue: false, dueLabel: formatDueLabel(dateValue), priority: 'urgent' as const };
  if (diffDays <= 7 && priority === 'routine') return { overdue: false, dueLabel: formatDueLabel(dateValue), priority: 'soon' as const };

  return { overdue: false, dueLabel: formatDueLabel(dateValue), priority };
}

function getCategoryIcon(category: Task['category']) {
  switch (category) {
    case 'appointment':
      return Calendar;
    case 'test':
      return TestTube;
    case 'medication':
      return Pill;
    case 'document':
      return FileText;
    case 'preventive':
      return Activity;
    case 'provider':
      return Users;
    default:
      return Activity;
  }
}

function getCategoryColor(category: Task['category']) {
  switch (category) {
    case 'appointment':
      return 'bg-blue-100 text-blue-600';
    case 'test':
      return 'bg-green-100 text-green-600';
    case 'medication':
      return 'bg-purple-100 text-purple-600';
    case 'document':
      return 'bg-orange-100 text-orange-600';
    case 'preventive':
      return 'bg-teal-100 text-teal-600';
    case 'provider':
      return 'bg-sky-100 text-sky-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function buildAppointmentTasks(appointments: PatientAppointment[]): Task[] {
  return appointments
    .filter((appointment) => !['Completed', 'Cancelled'].includes(appointment.status))
    .map((appointment) => {
      const visitMode = String(appointment.visitMode || '').replace('-', ' ');
      const rawPriority = ['Pending', 'Scheduled'].includes(appointment.status) ? 'urgent' : 'soon';
      const statusMeta = getTaskStatusMeta(appointment.startTime, rawPriority);

      return {
        id: `appointment-${appointment.id}`,
        category: 'appointment',
        title:
          appointment.status === 'Pending' || appointment.status === 'Scheduled'
            ? `Confirm ${appointment.appointmentType || 'appointment'}`
            : `${appointment.appointmentType || 'Appointment'} coming up`,
        description: `${visitMode || 'Visit'} with ${appointment.providerName || appointment.hospitalName || 'your provider'}`,
        dueLabel: statusMeta.dueLabel,
        dueAt: appointment.startTime,
        priority: statusMeta.priority,
        provider: appointment.hospitalName || appointment.providerName || undefined,
        estimatedTime: '5 minutes',
        overdue: statusMeta.overdue,
        actionScreen: 'appointments',
      };
    });
}

function buildDocumentTasks(documents: RecordDocument[]): Task[] {
  return documents
    .filter((document) => {
      const created = new Date(document.uploadDate).getTime();
      return !Number.isNaN(created) && Date.now() - created <= 30 * DAY_MS;
    })
    .slice(0, 4)
    .map((document) => {
      const dueAt = document.serviceDate || document.uploadDate;
      const statusMeta = getTaskStatusMeta(dueAt, 'routine');
      const categoryLabel =
        document.category === 'labs'
          ? 'Review new lab results'
          : document.category === 'visits'
          ? 'Review visit summary'
          : document.category === 'imaging'
          ? 'Review imaging result'
          : `Review ${document.title}`;

      return {
        id: `document-${document.id}`,
        category: document.category === 'labs' ? 'followup' : 'document',
        title: categoryLabel,
        description: document.title,
        dueLabel: statusMeta.dueLabel,
        dueAt,
        priority: statusMeta.priority,
        provider: document.hospitalName || document.sourceOrganizationName || undefined,
        estimatedTime: '3 minutes',
        overdue: statusMeta.overdue,
        actionScreen: 'documents',
      };
    });
}

function buildMedicationTasks(medications: PatientMedication[]): Task[] {
  const tasks: Task[] = [];

  medications
    .filter((medication) => medication.isActive)
    .forEach((medication) => {
      if (medication.latestRefillRequestStatus === 'open') {
        tasks.push({
          id: `medication-refill-open-${medication.id}`,
          category: 'medication',
          title: 'Refill request awaiting review',
          description: `${medication.name} refill request has been sent to your provider`,
          dueLabel: formatDueLabel(medication.latestRefillRequestCreatedAt),
          dueAt: medication.latestRefillRequestCreatedAt,
          priority: 'soon',
          provider: medication.hospitalName || medication.prescriberName || medication.pharmacy || undefined,
          estimatedTime: '2 minutes',
          actionScreen: 'medications',
        });
      } else if ((medication.refillsRemaining ?? 99) <= 1 && medication.sourceType === 'provider') {
        tasks.push({
          id: `medication-refill-${medication.id}`,
          category: 'medication',
          title: 'Refill prescription',
          description: `${medication.name}${medication.refillsRemaining === 0 ? ' has no refills remaining' : ' is running low on refills'}`,
          dueLabel: 'Soon',
          dueAt: medication.endDate || medication.updatedAt,
          priority: 'urgent',
          provider: medication.hospitalName || medication.pharmacy || medication.prescriberName || undefined,
          estimatedTime: '2 minutes',
          actionScreen: 'medications',
        });
      }

      if (medication.lastIntakeStatus === 'missed' || medication.lastIntakeStatus === 'skipped') {
        tasks.push({
          id: `medication-intake-${medication.id}`,
          category: 'followup',
          title: 'Review medication routine',
          description: `${medication.name} shows a recent ${medication.lastIntakeStatus} dose`,
          dueLabel: formatDueLabel(medication.lastIntakeDate),
          dueAt: medication.lastIntakeDate,
          priority: 'soon',
          provider: medication.hospitalName || medication.prescriberName || undefined,
          estimatedTime: '3 minutes',
          actionScreen: 'medications',
        });
      }
    });

  return tasks;
}

function buildProviderTasks(providers: Provider[]): Task[] {
  if (providers.length > 0) return [];
  return [
    {
      id: 'provider-connect',
      category: 'provider',
      title: 'Connect your providers',
      description: 'Link your care team so appointments, medications, and records stay in sync',
      dueLabel: 'Any time',
      dueAt: null,
      priority: 'soon',
      provider: undefined,
      estimatedTime: '5 minutes',
      actionScreen: 'manage-providers',
    },
  ];
}

function dedupeTasks(tasks: Task[]) {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    if (seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });
}

export default function HealthTasks({ onBack, onNavigate }: HealthTasksProps) {
  const [activeTab, setActiveTab] = useState<TaskTab>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dismissedTaskIds, setDismissedTaskIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        setLoading(true);
        setError(null);

        const [appointmentsData, documentsData, medicationsData, providersData] = await Promise.all([
          api.listMyAppointments('all').catch(() => ({ appointments: [] as PatientAppointment[] })),
          api.listMyRecords().catch(() => ({ documents: [] as RecordDocument[] })),
          api.listMyMedications().catch(() => ({ medications: [] as PatientMedication[] })),
          api.listMyProviders().catch(() => ({ providers: [] as Provider[] })),
        ]);

        if (!alive) return;

        const derivedTasks = dedupeTasks([
          ...buildAppointmentTasks(appointmentsData.appointments || []),
          ...buildDocumentTasks(documentsData.documents || []),
          ...buildMedicationTasks(medicationsData.medications || []),
          ...buildProviderTasks(providersData.providers || []),
        ]).sort((a, b) => {
          const priorityOrder = { urgent: 0, soon: 1, routine: 2 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
          const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        });

        setTasks(derivedTasks);
      } catch (nextError: any) {
        if (!alive) return;
        setError(nextError?.message || 'Failed to load health tasks');
        setTasks([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const visibleTasks = useMemo(() => {
    const remaining = tasks.filter((task) => !dismissedTaskIds.includes(task.id));
    return remaining.filter((task) => {
      if (activeTab === 'urgent') return task.priority === 'urgent';
      if (activeTab === 'this-week') return task.priority === 'urgent' || task.priority === 'soon';
      if (activeTab === 'upcoming') return !task.overdue && task.priority !== 'urgent';
      return true;
    });
  }, [activeTab, tasks, dismissedTaskIds]);

  const remainingTasks = useMemo(
    () => tasks.filter((task) => !dismissedTaskIds.includes(task.id)),
    [tasks, dismissedTaskIds]
  );

  const urgentCount = useMemo(
    () => tasks.filter((task) => !dismissedTaskIds.includes(task.id) && task.priority === 'urgent').length,
    [tasks, dismissedTaskIds]
  );

  const handleDismiss = (taskId: string) => {
    setDismissedTaskIds((current) => [...current, taskId]);
  };

  const handleTaskAction = (task: Task) => {
    if (!task.actionScreen) return;
    onNavigate?.(task.actionScreen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-gray-600" type="button">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-gray-900">Health To-Dos</h1>
            <p className="text-sm text-gray-600">{remainingTasks.length} tasks</p>
          </div>
          <Badge className="bg-red-100 text-red-700 border-0">{urgentCount} Urgent</Badge>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'urgent', label: 'Urgent' },
            { key: 'this-week', label: 'This Week' },
            { key: 'upcoming', label: 'Upcoming' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TaskTab)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            Loading health tasks...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {!loading &&
          visibleTasks.map((task) => {
            const Icon = getCategoryIcon(task.category);
            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl border-2 ${
                  task.priority === 'urgent' ? 'border-red-200' : 'border-gray-200'
                } p-4`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      task.priority === 'urgent' ? 'bg-red-500' : task.priority === 'soon' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}
                  />

                  <div className={`w-10 h-10 rounded-full ${getCategoryColor(task.category)} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 mb-1">{task.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {task.overdue ? (
                        <Badge className="bg-red-100 text-red-700 border-0">{task.dueLabel}</Badge>
                      ) : (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{getTaskTimeLabel(task)}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{task.estimatedTime}</span>
                      </div>
                    </div>

                    {task.provider ? <p className="text-sm text-gray-500">{task.provider}</p> : null}
                  </div>

                  <button
                    onClick={() => handleDismiss(task.id)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    type="button"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                    type="button"
                    onClick={() => handleTaskAction(task)}
                    disabled={!task.actionScreen}
                  >
                    Do This Now
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button size="sm" variant="outline" className="flex-shrink-0" type="button">
                    <Bell className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}

        {!loading && visibleTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-900 mb-2">All caught up!</p>
            <p className="text-gray-500">You have no pending health tasks.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
