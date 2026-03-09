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
