import {
  api,
  type HealthSummaryPayload,
  type PatientAppointment,
  type PatientConversationSummary,
  type PatientEmergencyProfile,
  type PatientMedication,
  type PatientProfile,
  type Provider,
  type RecordDocument,
} from '@/lib/api';

export type HealthTaskScreen =
  | 'appointments'
  | 'records'
  | 'medications'
  | 'manage-providers'
  | 'messages'
  | 'health-summary'
  | 'personal-information'
  | 'emergency-profile';

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

function buildInsuranceTasks(documents: RecordDocument[], profile: PatientProfile | null): HealthTask[] {
  const insuranceDocuments = documents.filter((document) => document.category === 'insurance');
  if (insuranceDocuments.length > 0) return [];

  const hasInsuranceText = Boolean(profile?.insurance && String(profile.insurance).trim());
  return [
    {
      id: 'insurance-upload',
      category: 'document',
      title: 'Add insurance document',
      description: hasInsuranceText
        ? 'Upload a copy of your insurance card or benefits document'
        : 'Add your insurance details and upload a supporting document',
      dueLabel: 'Any time',
      dueAt: null,
      priority: 'soon',
      estimatedTime: '5 minutes',
      actionScreen: 'records',
    },
  ];
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

function buildProfileTasks(profile: PatientProfile | null): HealthTask[] {
  if (!profile) return [];

  const missing: string[] = [];
  if (!profile.first_name?.trim() || !profile.last_name?.trim()) missing.push('name');
  if (!profile.dob?.trim()) missing.push('date of birth');
  if (!profile.phone_number?.trim()) missing.push('phone number');
  if (!profile.home_address_line1?.trim() || !profile.home_city?.trim() || !profile.home_postal_code?.trim()) {
    missing.push('home address');
  }

  if (missing.length === 0) return [];

  return [
    {
      id: 'profile-complete',
      category: 'followup',
      title: 'Complete profile information',
      description: `Add your ${missing.join(', ')} so your care team can identify and contact you correctly`,
      dueLabel: 'Any time',
      dueAt: null,
      priority: 'urgent',
      estimatedTime: '5 minutes',
      actionScreen: 'personal-information',
    },
  ];
}

function buildEmergencyTasks(emergency: PatientEmergencyProfile | null, summary: HealthSummaryPayload | null): HealthTask[] {
  if (!emergency && !summary) return [];

  const tasks: HealthTask[] = [];
  const hasEmergencyContact =
    Boolean(emergency?.emergency_contact_full_name?.trim() && emergency?.emergency_contact_phone?.trim()) ||
    Boolean(summary?.emergencyContacts?.length);
  const hasBloodType = Boolean(emergency?.blood_type?.trim() || summary?.bloodType?.trim());
  const shareFlags = [
    emergency?.share_blood_type,
    emergency?.share_allergies,
    emergency?.share_medical_conditions,
    emergency?.share_current_medications,
    emergency?.share_emergency_contacts,
  ];
  const hasSharingConfigured = shareFlags.some(Boolean);

  if (!hasEmergencyContact) {
    tasks.push({
      id: 'emergency-contact',
      category: 'followup',
      title: 'Add emergency contact',
      description: 'Add someone providers can reach if there is an emergency',
      dueLabel: 'Any time',
      dueAt: null,
      priority: 'urgent',
      estimatedTime: '3 minutes',
      actionScreen: 'health-summary',
    });
  }

  if (!hasSharingConfigured || !hasBloodType) {
    const missingBits = [
      !hasBloodType ? 'blood type' : null,
      !hasSharingConfigured ? 'information to share in emergencies' : null,
    ].filter(Boolean);

    tasks.push({
      id: 'emergency-profile',
      category: 'preventive',
      title: 'Complete emergency profile',
      description: `Update your ${missingBits.join(' and ')}`,
      dueLabel: 'Any time',
      dueAt: emergency?.updated_at || null,
      priority: 'soon',
      estimatedTime: '4 minutes',
      actionScreen: 'emergency-profile',
    });
  }

  return tasks;
}

function buildMessageTasks(conversations: PatientConversationSummary[]): HealthTask[] {
  return conversations
    .filter((conversation) => conversation.unread_count > 0)
    .slice(0, 3)
    .map((conversation) => ({
      id: `message-${conversation.id}`,
      category: 'followup' as const,
      title: `Review new message from ${conversation.staff_name || conversation.provider_name}`,
      description: conversation.last_message_preview || `You have ${conversation.unread_count} unread message${conversation.unread_count === 1 ? '' : 's'}`,
      dueLabel: formatDueLabel(conversation.last_message_at),
      dueAt: conversation.last_message_at,
      priority: 'urgent' as const,
      provider: conversation.provider_name || undefined,
      estimatedTime: '2 minutes',
      actionScreen: 'messages',
    }));
}

function buildHealthSummaryTasks(summary: HealthSummaryPayload | null): HealthTask[] {
  if (!summary) return [];

  const tasks: HealthTask[] = [];

  if (!summary.immunizations.length) {
    tasks.push({
      id: 'summary-immunizations',
      category: 'preventive',
      title: 'Update immunization record',
      description: 'Add your vaccines so your health summary stays current',
      dueLabel: 'Any time',
      dueAt: summary.updatedAt,
      priority: 'soon',
      estimatedTime: '4 minutes',
      actionScreen: 'health-summary',
    });
  }

  if (!summary.vitals.length) {
    tasks.push({
      id: 'summary-vitals',
      category: 'preventive',
      title: 'Update vital signs',
      description: 'Add blood pressure, heart rate, weight, or blood sugar to keep your summary current',
      dueLabel: 'Any time',
      dueAt: summary.updatedAt,
      priority: 'soon',
      estimatedTime: '4 minutes',
      actionScreen: 'health-summary',
    });
  }

  if (!summary.bloodType || !summary.allergies.length) {
    const missing = [
      !summary.bloodType ? 'blood type' : null,
      !summary.allergies.length ? 'allergies' : null,
    ].filter(Boolean);
    tasks.push({
      id: 'summary-basics',
      category: 'preventive',
      title: 'Fill in health summary details',
      description: `Add your ${missing.join(' and ')} to complete your health summary`,
      dueLabel: 'Any time',
      dueAt: summary.updatedAt,
      priority: 'soon',
      estimatedTime: '4 minutes',
      actionScreen: 'health-summary',
    });
  }

  return tasks;
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
  const [appointmentsData, documentsData, medicationsData, providersData, profileData, emergencyData, summaryData, conversationsData] = await Promise.all([
    api.listMyAppointments('all').catch(() => ({ appointments: [] as PatientAppointment[] })),
    api.listMyRecords().catch(() => ({ documents: [] as RecordDocument[] })),
    api.listMyMedications().catch(() => ({ medications: [] as PatientMedication[] })),
    api.listMyProviders().catch(() => ({ providers: [] as Provider[] })),
    api.getMyProfile().catch(() => null as PatientProfile | null),
    api.getMyEmergencyProfile().catch(() => null as PatientEmergencyProfile | null),
    api.getMyHealthSummary().catch(() => ({ summary: null as HealthSummaryPayload | null })),
    api.listPatientConversations().catch(() => ({ conversations: [] as PatientConversationSummary[] })),
  ]);

  return dedupeTasks([
    ...buildAppointmentTasks(appointmentsData.appointments || []),
    ...buildMedicationTasks(medicationsData.medications || []),
    ...buildProviderTasks(providersData.providers || []),
    ...buildProfileTasks(profileData),
    ...buildEmergencyTasks(emergencyData, summaryData.summary),
    ...buildHealthSummaryTasks(summaryData.summary),
    ...buildMessageTasks(conversationsData.conversations || []),
    ...buildInsuranceTasks(documentsData.documents || [], profileData),
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
