import { api, type PatientAppointment, type PatientMedication, type Provider, type RecordDocument } from '@/lib/api';

export type HealthTaskScreen = 'appointments' | 'documents' | 'medications' | 'recommendations' | 'manage-providers';

export interface HealthTask {
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
  actionScreen?: HealthTaskScreen;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDueLabel(dateValue: string | null) {
  if (!dateValue) return 'No due date';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getTaskTimeLabel(task: HealthTask) {
  if (task.overdue) return task.dueLabel;
  return `Due: ${task.dueLabel}`;
}

function getTaskStatusMeta(dateValue: string | null, priority: HealthTask['priority']) {
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

function buildAppointmentTasks(appointments: PatientAppointment[]): HealthTask[] {
  return appointments
    .filter((appointment) => ['Pending', 'Scheduled'].includes(appointment.status))
    .map((appointment) => {
      const visitMode = String(appointment.visitMode || '').replace('-', ' ');
      const statusMeta = getTaskStatusMeta(appointment.startTime, 'urgent');

      return {
        id: `appointment-${appointment.id}`,
        category: 'appointment',
        title: `Confirm ${appointment.appointmentType || 'appointment'}`,
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

function buildDocumentTasks(documents: RecordDocument[]): HealthTask[] {
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

function buildMedicationTasks(medications: PatientMedication[]): HealthTask[] {
  const tasks: HealthTask[] = [];

  medications
    .filter((medication) => medication.isActive)
    .forEach((medication) => {
      if (medication.latestRefillRequestStatus !== 'open' && (medication.refillsRemaining ?? 99) <= 1 && medication.sourceType === 'provider') {
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
          title: 'Update medication routine',
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

function buildProviderTasks(providers: Provider[]): HealthTask[] {
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
      estimatedTime: '5 minutes',
      actionScreen: 'manage-providers',
    },
  ];
}

function dedupeTasks(tasks: HealthTask[]) {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    if (seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });
}

export async function fetchHealthTasks(): Promise<HealthTask[]> {
  const [appointmentsData, documentsData, medicationsData, providersData] = await Promise.all([
    api.listMyAppointments('all').catch(() => ({ appointments: [] as PatientAppointment[] })),
    api.listMyRecords().catch(() => ({ documents: [] as RecordDocument[] })),
    api.listMyMedications().catch(() => ({ medications: [] as PatientMedication[] })),
    api.listMyProviders().catch(() => ({ providers: [] as Provider[] })),
  ]);

  return dedupeTasks([
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
}
