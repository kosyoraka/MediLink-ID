import { apiFetch } from "@/lib/api";
import type { Appointment, AppointmentStatus } from "@/lib/types";

export async function getStaffAppointments(): Promise<Appointment[]> {
  return apiFetch<Appointment[]>("/api/staff/appointments", { method: "GET" });
}

export async function setAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
) {
  return apiFetch<{ message: string }>(`/api/staff/appointments/${appointmentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function createStaffAppointment(body: {
  patientId: string;
  startTime: string;
  localDateTime: string;
  appointmentType: string;
  visitMode: string;
  notes?: string;
}) {
  return apiFetch<{ id: string }>("/api/staff/appointments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getStaffAppointmentAvailability(params: {
  date: string;
  appointmentType: string;
  excludeAppointmentId?: string;
}) {
  const qs = new URLSearchParams({
    date: params.date,
    appointmentType: params.appointmentType,
  });
  if (params.excludeAppointmentId) qs.set("excludeAppointmentId", params.excludeAppointmentId);

  return apiFetch<{
    date: string;
    appointmentType: string;
    durationMinutes: number;
    workingHours: {
      start: string;
      end: string;
      label: string;
    };
    slots: Array<{
      localDateTime: string;
      localTime: string;
      label: string;
      available: boolean;
    }>;
  }>(`/api/staff/appointments/availability?${qs.toString()}`, { method: "GET" });
}

export async function rescheduleStaffAppointment(
  appointmentId: string,
  body: { startTime: string; localDateTime: string }
) {
  return apiFetch<{ ok: boolean; appointment: Appointment }>(`/api/staff/appointments/${appointmentId}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
