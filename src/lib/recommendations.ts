import {
  api,
  type HealthSummaryPayload,
  type PatientAppointment,
  type PatientEmergencyProfile,
  type PatientMedication,
  type PatientProfile,
  type Provider,
  type RecordDocument,
} from "@/lib/api";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RecommendationActionScreen =
  | "appointments"
  | "health-summary"
  | "records"
  | "manage-providers"
  | "personal-information"
  | "emergency-profile"
  | "medications";

export type RecommendationPriority = "high" | "medium" | "low";

export type RecommendationIcon =
  | "calendar"
  | "activity"
  | "file"
  | "syringe"
  | "shield"
  | "pill"
  | "users";

export interface RecommendationChecklistItem {
  id: string;
  label: string;
  detail: string;
  completed: boolean;
  actionScreen: RecommendationActionScreen;
}

export interface RecommendationActionItem {
  id: string;
  title: string;
  description: string;
  detail: string;
  badge: string;
  priority: RecommendationPriority;
  actionLabel: string;
  actionScreen: RecommendationActionScreen;
  icon: RecommendationIcon;
}

export interface RecommendationImmunizationItem {
  id: string;
  name: string;
  statusLabel: string;
  detail: string;
  dateLabel: string;
  emptyState?: boolean;
  actionLabel?: string;
  actionScreen?: RecommendationActionScreen;
}

export interface RecommendationInsightItem {
  id: string;
  title: string;
  current: string;
  nextStep: string;
  actionLabel: string;
  actionScreen: RecommendationActionScreen;
  icon: RecommendationIcon;
  tone: "blue" | "green" | "orange";
}

export interface RecommendationHighlightItem {
  id: string;
  label: string;
  detail: string;
}

export interface RecommendationsData {
  score: number;
  scoreLabel: string;
  completedCount: number;
  totalCount: number;
  checklist: RecommendationChecklistItem[];
  nextSteps: RecommendationActionItem[];
  immunizations: RecommendationImmunizationItem[];
  insights: RecommendationInsightItem[];
  highlights: RecommendationHighlightItem[];
}

function formatDateLabel(value?: string | null) {
  if (!value) return "No date on file";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date on file";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function hasCompleteProfile(profile: PatientProfile | null) {
  return Boolean(
    profile?.first_name?.trim() &&
      profile?.last_name?.trim() &&
      profile?.dob?.trim() &&
      profile?.phone_number?.trim()
  );
}

function getMissingProfileFields(profile: PatientProfile | null) {
  const missing: string[] = [];
  if (!profile?.first_name?.trim() || !profile?.last_name?.trim()) missing.push("name");
  if (!profile?.dob?.trim()) missing.push("date of birth");
  if (!profile?.phone_number?.trim()) missing.push("phone number");
  return missing;
}

function getPastAppointments(appointments: PatientAppointment[]) {
  const now = Date.now();
  return appointments
    .filter((appointment) => {
      const time = new Date(appointment.startTime).getTime();
      return Number.isFinite(time) && time < now && appointment.status !== "Cancelled";
    })
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

function getUpcomingAppointments(appointments: PatientAppointment[]) {
  const now = Date.now();
  return appointments
    .filter((appointment) => {
      const time = new Date(appointment.startTime).getTime();
      return (
        Number.isFinite(time) &&
        time >= now &&
        !["Cancelled", "Completed"].includes(String(appointment.status || ""))
      );
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

function hasRecentVisit(appointments: PatientAppointment[], days: number) {
  const threshold = Date.now() - days * DAY_MS;
  return getPastAppointments(appointments).some(
    (appointment) => new Date(appointment.startTime).getTime() >= threshold
  );
}

function getLatestVitalDate(summary: HealthSummaryPayload | null) {
  if (!summary?.vitals?.length) return null;
  const latest = [...summary.vitals]
    .filter((item) => item.recordedAt)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
  return latest?.recordedAt || null;
}

function hasEmergencyContact(summary: HealthSummaryPayload | null, emergency: PatientEmergencyProfile | null) {
  return Boolean(
    (summary?.emergencyContacts?.length ?? 0) > 0 ||
      (emergency?.emergency_contact_full_name?.trim() &&
        emergency?.emergency_contact_phone?.trim())
  );
}

function hasEmergencyProfileReviewed(emergency: PatientEmergencyProfile | null) {
  return Boolean(
    emergency?.updated_at ||
      emergency?.share_blood_type ||
      emergency?.share_allergies ||
      emergency?.share_medical_conditions ||
      emergency?.share_current_medications ||
      emergency?.share_emergency_contacts
  );
}

function getActiveMedications(medications: PatientMedication[]) {
  return medications.filter((medication) => medication.isActive);
}

function buildChecklist(input: {
  profile: PatientProfile | null;
  providers: Provider[];
  appointments: PatientAppointment[];
  summary: HealthSummaryPayload | null;
  emergency: PatientEmergencyProfile | null;
  documents: RecordDocument[];
}) {
  const recentVisit = hasRecentVisit(input.appointments, 365);
  const hasVitals = Boolean(input.summary?.vitals?.length);
  const hasImmunizations = Boolean(input.summary?.immunizations?.length);
  const emergencyContact = hasEmergencyContact(input.summary, input.emergency);
  const reviewedEmergency = hasEmergencyProfileReviewed(input.emergency);

  return [
    {
      id: "profile",
      label: "Profile basics complete",
      detail: hasCompleteProfile(input.profile)
        ? "Name, date of birth, and phone number are on file."
        : `Still missing ${getMissingProfileFields(input.profile).join(", ")}.`,
      completed: hasCompleteProfile(input.profile),
      actionScreen: "personal-information" as const,
    },
    {
      id: "providers",
      label: "Care team connected",
      detail:
        input.providers.length > 0
          ? `${pluralize(input.providers.length, "provider")} connected.`
          : "No connected providers yet.",
      completed: input.providers.length > 0,
      actionScreen: "manage-providers" as const,
    },
    {
      id: "visit",
      label: "Recent visit on record",
      detail: recentVisit
        ? `Last recorded visit: ${formatDateLabel(getPastAppointments(input.appointments)[0]?.startTime)}.`
        : "No completed or past visit found in the last year.",
      completed: recentVisit,
      actionScreen: "appointments" as const,
    },
    {
      id: "vitals",
      label: "Vitals logged",
      detail: hasVitals
        ? `Latest vital update: ${formatDateLabel(getLatestVitalDate(input.summary))}.`
        : "No vital signs are logged yet.",
      completed: hasVitals,
      actionScreen: "health-summary" as const,
    },
    {
      id: "immunizations",
      label: "Immunizations on file",
      detail: hasImmunizations
        ? `${pluralize(input.summary?.immunizations?.length ?? 0, "immunization")} recorded.`
        : "No immunization records have been added yet.",
      completed: hasImmunizations,
      actionScreen: "health-summary" as const,
    },
    {
      id: "emergency-contact",
      label: "Emergency contact saved",
      detail: emergencyContact
        ? "Emergency contact details are available."
        : "Add an emergency contact for urgent situations.",
      completed: emergencyContact,
      actionScreen: "emergency-profile" as const,
    },
    {
      id: "records",
      label: "Records stored in MediLink",
      detail:
        input.documents.length > 0
          ? `${pluralize(input.documents.length, "record")} available in your library.`
          : "No documents or records are saved yet.",
      completed: input.documents.length > 0,
      actionScreen: "records" as const,
    },
    {
      id: "emergency-profile",
      label: "Emergency sharing reviewed",
      detail: reviewedEmergency
        ? `Emergency profile reviewed ${formatDateLabel(input.emergency?.updated_at)}.`
        : "Review what can be shared in emergency mode.",
      completed: reviewedEmergency,
      actionScreen: "emergency-profile" as const,
    },
  ];
}

function buildNextSteps(input: {
  checklist: RecommendationChecklistItem[];
  summary: HealthSummaryPayload | null;
  emergency: PatientEmergencyProfile | null;
  documents: RecordDocument[];
  appointments: PatientAppointment[];
  medications: PatientMedication[];
}) {
  const activeMedications = getActiveMedications(input.medications);
  const lowRefillMedications = activeMedications.filter(
    (medication) =>
      medication.sourceType === "provider" &&
      medication.latestRefillRequestStatus !== "open" &&
      (medication.refillsRemaining ?? 99) <= 1
  );
  const missedDoseMedications = activeMedications.filter((medication) =>
    ["missed", "skipped"].includes(String(medication.lastIntakeStatus || ""))
  );
  const latestVitalDate = getLatestVitalDate(input.summary);
  const hasStaleVitals =
    latestVitalDate != null && new Date(latestVitalDate).getTime() < Date.now() - 180 * DAY_MS;
  const upcomingAppointments = getUpcomingAppointments(input.appointments);
  const insuranceDocumentCount = input.documents.filter((document) => document.category === "insurance").length;

  const items: RecommendationActionItem[] = input.checklist
    .filter((item) => !item.completed)
    .map((item) => {
      switch (item.id) {
        case "profile":
          return {
            id: "next-profile",
            title: "Complete your profile",
            description: "Add the missing personal details your care team needs to identify and contact you.",
            detail: item.detail,
            badge: "Profile",
            priority: "high",
            actionLabel: "Update Profile",
            actionScreen: "personal-information",
            icon: "shield",
          };
        case "providers":
          return {
            id: "next-providers",
            title: "Connect your providers",
            description: "Link your hospitals or care teams so records, medications, and appointments stay connected.",
            detail: item.detail,
            badge: "Care Team",
            priority: "high",
            actionLabel: "Manage Providers",
            actionScreen: "manage-providers",
            icon: "users",
          };
        case "visit":
          return {
            id: "next-visit",
            title: "Book your next visit",
            description: "A recent visit was not found, so scheduling a check-in would help keep your account current.",
            detail:
              upcomingAppointments.length > 0
                ? `You already have ${pluralize(upcomingAppointments.length, "upcoming appointment")}.`
                : item.detail,
            badge: "Appointments",
            priority: upcomingAppointments.length > 0 ? "medium" : "high",
            actionLabel: "Open Appointments",
            actionScreen: "appointments",
            icon: "calendar",
          };
        case "vitals":
          return {
            id: "next-vitals",
            title: "Add vital signs",
            description: "Log blood pressure, heart rate, weight, or blood sugar so your trends are based on real data.",
            detail: item.detail,
            badge: "Health Summary",
            priority: "medium",
            actionLabel: "Update Health Summary",
            actionScreen: "health-summary",
            icon: "activity",
          };
        case "immunizations":
          return {
            id: "next-immunizations",
            title: "Add immunization records",
            description: "Keep your vaccine history in one place so it shows up across the app.",
            detail: item.detail,
            badge: "Immunizations",
            priority: "medium",
            actionLabel: "Review Immunizations",
            actionScreen: "health-summary",
            icon: "syringe",
          };
        case "emergency-contact":
          return {
            id: "next-emergency-contact",
            title: "Add an emergency contact",
            description: "Save a trusted contact so the right information is available when it matters.",
            detail: item.detail,
            badge: "Emergency",
            priority: "high",
            actionLabel: "Update Emergency Profile",
            actionScreen: "emergency-profile",
            icon: "shield",
          };
        case "records":
          return {
            id: "next-records",
            title: "Upload a health record",
            description: "Adding labs, visit notes, or prescriptions makes your record library more useful.",
            detail: item.detail,
            badge: "Records",
            priority: "low",
            actionLabel: "Open Records",
            actionScreen: "records",
            icon: "file",
          };
        case "emergency-profile":
        default:
          return {
            id: "next-emergency-profile",
            title: "Review emergency sharing",
            description: "Decide what information should appear in your emergency profile.",
            detail: item.detail,
            badge: "Emergency",
            priority: "medium",
            actionLabel: "Review Emergency Profile",
            actionScreen: "emergency-profile",
            icon: "shield",
          };
      }
    });

  if (hasStaleVitals) {
    items.push({
      id: "next-stale-vitals",
      title: "Refresh your vitals",
      description: "Your last vital update is getting old, so adding a new reading would make your trend more useful.",
      detail: `Latest vital entry: ${formatDateLabel(latestVitalDate)}.`,
      badge: "Health Summary",
      priority: "medium",
      actionLabel: "Log a New Reading",
      actionScreen: "health-summary",
      icon: "activity",
    });
  }

  if (lowRefillMedications.length > 0) {
    items.push({
      id: "next-refill",
      title: "Review refill needs",
      description: `${pluralize(lowRefillMedications.length, "active prescription")} ${
        lowRefillMedications.length === 1 ? "is" : "are"
      } low on refills.`,
      detail: lowRefillMedications
        .slice(0, 2)
        .map((medication) => medication.name)
        .join(", "),
      badge: "Medications",
      priority: "high",
      actionLabel: "Open Medications",
      actionScreen: "medications",
      icon: "pill",
    });
  }

  if (missedDoseMedications.length > 0) {
    items.push({
      id: "next-adherence",
      title: "Review recent missed doses",
      description: "Your medication logs show recent missed or skipped doses.",
      detail: missedDoseMedications
        .slice(0, 2)
        .map((medication) => medication.name)
        .join(", "),
      badge: "Medications",
      priority: "medium",
      actionLabel: "Check Medication Logs",
      actionScreen: "medications",
      icon: "pill",
    });
  }

  if (insuranceDocumentCount === 0) {
    items.push({
      id: "next-insurance",
      title: "Add an insurance document",
      description: "Saving an insurance card or benefits document can make record sharing easier later.",
      detail: "No insurance document is currently stored in MediLink.",
      badge: "Records",
      priority: "low",
      actionLabel: "Open Records",
      actionScreen: "records",
      icon: "file",
    });
  }

  const priorityOrder: Record<RecommendationPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  const deduped = Array.from(new Map(items.map((item) => [item.id, item])).values());
  return deduped.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 6);
}

function buildImmunizationItems(summary: HealthSummaryPayload | null): RecommendationImmunizationItem[] {
  if (!summary?.immunizations?.length) {
    return [
      {
        id: "immunization-empty",
        name: "No immunizations on file",
        statusLabel: "Needs review",
        detail: "Add vaccines in your health summary so they appear here and stay easy to reference.",
        dateLabel: "No records yet",
        emptyState: true,
        actionLabel: "Update Health Summary",
        actionScreen: "health-summary",
      },
    ];
  }

  return [...summary.immunizations]
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 5)
    .map((immunization) => ({
      id: immunization.id,
      name: immunization.name || "Immunization",
      statusLabel: immunization.status || "Recorded",
      detail: immunization.detail || immunization.dose || "Saved in your health summary.",
      dateLabel: immunization.date ? `Recorded ${formatDateLabel(immunization.date)}` : "Date not provided",
    }));
}

function buildInsights(input: {
  summary: HealthSummaryPayload | null;
  medications: PatientMedication[];
  documents: RecordDocument[];
  providers: Provider[];
  appointments: PatientAppointment[];
}) {
  const activeMedications = getActiveMedications(input.medications);
  const latestVitalDate = getLatestVitalDate(input.summary);
  const upcomingAppointments = getUpcomingAppointments(input.appointments);
  const lowRefillCount = activeMedications.filter(
    (medication) =>
      medication.sourceType === "provider" &&
      medication.latestRefillRequestStatus !== "open" &&
      (medication.refillsRemaining ?? 99) <= 1
  ).length;

  return [
    {
      id: "insight-vitals",
      title: "Vitals tracking",
      current: input.summary?.vitals?.length
        ? `${pluralize(input.summary.vitals.length, "entry")} logged • last update ${formatDateLabel(latestVitalDate)}`
        : "No vitals logged yet",
      nextStep: input.summary?.vitals?.length
        ? "Add another reading in Health Summary when you want to extend your trend."
        : "Start with blood pressure, heart rate, weight, or blood sugar.",
      actionLabel: "Open Health Summary",
      actionScreen: "health-summary" as const,
      icon: "activity" as const,
      tone: "blue" as const,
    },
    {
      id: "insight-medications",
      title: "Medication management",
      current: activeMedications.length
        ? `${pluralize(activeMedications.length, "active medication")} tracked${
            lowRefillCount ? ` • ${pluralize(lowRefillCount, "low-refill item")}` : ""
          }`
        : "No active medications tracked",
      nextStep: activeMedications.length
        ? "Review adherence logs and refill status to keep your list current."
        : "Add medications here if you want refills and changes to be easier to manage.",
      actionLabel: "Open Medications",
      actionScreen: "medications" as const,
      icon: "pill" as const,
      tone: "green" as const,
    },
    {
      id: "insight-coordination",
      title: "Care coordination",
      current: `${pluralize(input.providers.length, "provider")} connected • ${pluralize(
        input.documents.length,
        "record"
      )} saved • ${pluralize(upcomingAppointments.length, "upcoming appointment")}`,
      nextStep:
        input.providers.length > 0
          ? "Keep records and appointments current so your care history stays centralized."
          : "Connect a provider to start syncing appointments, records, and medication workflows.",
      actionLabel: input.providers.length > 0 ? "Open Records" : "Manage Providers",
      actionScreen: input.providers.length > 0 ? "records" : "manage-providers",
      icon: input.providers.length > 0 ? "file" : "users",
      tone: "orange" as const,
    },
  ];
}

function buildHighlights(checklist: RecommendationChecklistItem[]) {
  const completed = checklist.filter((item) => item.completed);
  if (completed.length === 0) {
    return [
      {
        id: "highlight-starting",
        label: "You’re building your care profile",
        detail: "Complete a few of the next steps above and this section will start filling in automatically.",
      },
    ];
  }

  return completed.slice(0, 4).map((item) => ({
    id: item.id,
    label: item.label,
    detail: item.detail,
  }));
}

export async function fetchRecommendationsData(): Promise<RecommendationsData> {
  const [
    appointmentsData,
    documentsData,
    medicationsData,
    providersData,
    profileData,
    emergencyData,
    summaryData,
  ] = await Promise.all([
    api.listMyAppointments("all").catch(() => ({ appointments: [] as PatientAppointment[] })),
    api.listMyRecords().catch(() => ({ documents: [] as RecordDocument[] })),
    api.listMyMedications().catch(() => ({ medications: [] as PatientMedication[] })),
    api.listMyProviders().catch(() => ({ providers: [] as Provider[] })),
    api.getMyProfile().catch(() => null as PatientProfile | null),
    api.getMyEmergencyProfile().catch(() => null as PatientEmergencyProfile | null),
    api.getMyHealthSummary().catch(() => ({ summary: null as HealthSummaryPayload | null })),
  ]);

  const input = {
    appointments: appointmentsData.appointments || [],
    documents: documentsData.documents || [],
    medications: medicationsData.medications || [],
    providers: providersData.providers || [],
    profile: profileData,
    emergency: emergencyData,
    summary: summaryData.summary,
  };

  const checklist = buildChecklist(input);
  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const score = Math.round((completedCount / totalCount) * 100);
  const scoreLabel =
    score >= 85 ? "Strong foundation" : score >= 60 ? "Good progress" : "More to add";

  return {
    score,
    scoreLabel,
    completedCount,
    totalCount,
    checklist,
    nextSteps: buildNextSteps({
      checklist,
      summary: input.summary,
      emergency: input.emergency,
      documents: input.documents,
      appointments: input.appointments,
      medications: input.medications,
    }),
    immunizations: buildImmunizationItems(input.summary),
    insights: buildInsights(input),
    highlights: buildHighlights(checklist),
  };
}
