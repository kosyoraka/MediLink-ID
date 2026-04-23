import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, MapPin, Plus, Video, ChevronRight } from "lucide-react";
import { api, type AppointmentAvailabilitySlot } from "@/lib/api";

type AppointmentTab = "upcoming" | "past";

type ApiAppointment = {
  id: string;
  doctorName: string;
  staffId?: string | null;
  specialty: string | null; // currently used as appointment type (Consultation/Lab Test/etc)
  startTime: string;
  durationMinutes?: number;
  type: "in-person" | "virtual" | "phone" | string; // visit mode (we’ll split cleanly later)
  locationName: string | null;
  address: string | null;
  joinUrl: string | null;
  status: "Scheduled" | "Pending" | "Confirmed" | "Completed" | "Cancelled";
  notes: string | null;
  visitSummaryAvailable: boolean;
  providerId?: string | null;
  providerName?: string | null;
  hospitalName?: string | null;
};

type Provider = {
  id: string; // hospital id
  name: string; // hospital name
  type: string; // "Hospital"
};

type StaffUser = {
  id: string;
  full_name: string;
  role: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";


const APPT_TYPES = ["Consultation", "Check-up", "Follow-up", "Lab Test"] as const;

function toDateInputValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatWhen(iso: string) {
  const d = new Date(iso);

  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  

  return { date, time, d };
}

function getTabForAppointment(a: ApiAppointment): AppointmentTab {
  const { d } = formatWhen(a.startTime);
  const now = new Date();

  if (a.status === "Completed" || a.status === "Cancelled") return "past";
  if (d < now) return "past";
  return "upcoming";
}

function StatusPill({ status }: { status: ApiAppointment["status"] }) {
  const base = "px-2 py-1 rounded-full text-xs font-medium border";

  if (status === "Scheduled" || status === "Pending") {
    return (
      <span className={`${base} bg-yellow-50 text-yellow-700 border-yellow-200`}>
        Waiting for confirmation
      </span>
    );
  }
  if (status === "Confirmed") {
    return (
      <span className={`${base} bg-green-50 text-green-700 border-green-200`}>Confirmed</span>
    );
  }
  if (status === "Completed") {
    return (
      <span className={`${base} bg-gray-50 text-gray-700 border-gray-200`}>Completed</span>
    );
  }
  if (status === "Cancelled") {
    return (
      <span className={`${base} bg-red-50 text-red-700 border-red-200`}>Cancelled</span>
    );
  }

  return <span className={`${base} bg-gray-50 text-gray-700 border-gray-200`}>{status}</span>;
}

export default function Appointments() {
  const [activeTab, setActiveTab] = useState<AppointmentTab>("upcoming");
  const [showBooking, setShowBooking] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<ApiAppointment | null>(null);

  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [loading, setLoading] = useState(false);

  // booking: providers + staff
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  // booking fields
  const [selectedApptType, setSelectedApptType] = useState<string>("");
  const [providerId, setProviderId] = useState<string>(""); // hospital id
  const [staffId, setStaffId] = useState<string>(""); // staff id
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<AppointmentAvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availabilityDuration, setAvailabilityDuration] = useState<number | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string>("");
  const [rescheduleTarget, setRescheduleTarget] = useState<ApiAppointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleSlot, setRescheduleSlot] = useState<string>("");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");
  const [rescheduleSlots, setRescheduleSlots] = useState<AppointmentAvailabilitySlot[]>([]);
  const [rescheduleDuration, setRescheduleDuration] = useState<number | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string>("");

  const [selectedVisitMode, setSelectedVisitMode] = useState<"in-person" | "virtual" | "phone">(
  "in-person"
  );
  const [notes, setNotes] = useState<string>("");

  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === providerId) || null,
    [providers, providerId]
  );

  const uniqueProviders = useMemo(() => {
  const map = new Map<string, Provider>();
  for (const p of providers) map.set(p.id, p);
  return Array.from(map.values());
}, [providers]);


//   async function loadAppointments() {
//   try {
//     setLoading(true);

//     const token =
//       localStorage.getItem("patient_token") ||
//       localStorage.getItem("patientToken") ||
//       localStorage.getItem("token");

//     const patientId = localStorage.getItem("patientId");

//     if (!token || !patientId) {
//       console.warn("Missing token or patientId in storage");
//       setAppointments([]);
//       return;
//     }

//     const res = await fetch(`${API_BASE}/api/patient/appointments?patientId=${patientId}`, {
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//     });

//     const payload = await res.json().catch(() => []);

//     if (!res.ok) {
//       throw new Error(payload?.message || `HTTP ${res.status}`);
//     }

//     setAppointments(Array.isArray(payload) ? payload : []);
//   } catch (e) {
//     console.error("Failed to load appointments:", e);
//     setAppointments([]);
//   } finally {
//     setLoading(false);
//   }
// }
async function loadAppointments() {
  try {
    setLoading(true);

    const token =
      localStorage.getItem("patient_token") ||
      localStorage.getItem("patientToken") ||
      localStorage.getItem("token");

    if (!token) {
      console.warn("Missing patient token");
      setAppointments([]);
      return;
    }

    const res = await fetch(`${API_BASE}/api/patient/appointments?status=all`, {

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

   const payload = await res.json().catch(() => ({} as any));

if (!res.ok) {
  throw new Error(payload?.message || `HTTP ${res.status}`);
}

// ✅ map backend → UI shape
const rows = Array.isArray(payload?.appointments) ? payload.appointments : [];

setAppointments(
  rows.map((r: any) => ({
    id: r.id,
    doctorName: r.providerName ?? "Provider",     // ✅ staff name
    staffId: r.staffId ?? null,
    specialty: r.appointmentType ?? null,         // ✅ type label
    startTime: r.startTime,
    durationMinutes: r.durationMinutes ?? null,
    type: r.visitMode,                            // ✅ in-person/virtual/phone

    locationName: r.hospitalName ?? null,         // ✅ hospital name now shows
    address: null,
    joinUrl: null,

    status: r.status,
    notes: r.notes ?? null,
    visitSummaryAvailable: false,
    providerId: r.hospitalId ?? null,
    providerName: r.providerName ?? null,
    hospitalName: r.hospitalName ?? null,
  }))
);





  } catch (e) {
    console.error("Failed to load appointments:", e);
    setAppointments([]);
  } finally {
    setLoading(false);
  }
}



  async function loadProviders() {
    try {
      setProvidersLoading(true);
      const data = await api.listMyProviders(); // connected providers
      setProviders(data.providers || []);
    } catch (e) {
      console.error("Failed to load providers:", e);
      setProviders([]);
    } finally {
      setProvidersLoading(false);
    }
  }

  async function loadProviderStaff(nextProviderId: string) {
    if (!nextProviderId) {
      setStaff([]);
      setStaffId("");
      return;
    }

   try {
  setStaffLoading(true);

  const patientId = localStorage.getItem("patientId");
  if (!patientId) {
    console.error("Failed to load provider staff: patientId missing in localStorage");
    setStaff([]);
    setStaffId("");
    return;
  }

  const res = await fetch(
    `${API_BASE}/api/patient/booking/provider-staff?patientId=${encodeURIComponent(
      patientId
    )}&providerId=${encodeURIComponent(nextProviderId)}`
  );

  const payload = await res.json().catch(() => ({} as any));

  if (!res.ok) {
    console.error("Failed to load provider staff:", payload?.message || res.status);
    setStaff([]);
    setStaffId("");
    return;
  }

  const staffList = payload.staff || [];
  setStaff(staffList);
  setStaffId(staffList[0]?.id || "");
} catch (e) {
  console.error("Failed to load provider staff:", e);
  setStaff([]);
  setStaffId("");
} finally {
  setStaffLoading(false);
}
 }

  useEffect(() => {
  loadAppointments();
  loadProviders();

  // Poll appointments so provider status changes show up automatically
  const t = setInterval(() => {
    loadAppointments();
  }, 8000); // 8s is a nice demo cadence

  return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  useEffect(() => {
    // when provider changes, reload staff
    setStaff([]);
    setStaffId("");
    if (providerId) loadProviderStaff(providerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  useEffect(() => {
    setSelectedSlot("");
    setAvailableSlots([]);
    setAvailabilityError("");
    setAvailabilityDuration(null);

    if (!staffId || !selectedApptType || !selectedDate) return;

    let cancelled = false;

    (async () => {
      try {
        setSlotsLoading(true);
        const data = await api.getMyAppointmentAvailability({
          staffId,
          date: selectedDate,
          appointmentType: selectedApptType,
        });
        if (cancelled) return;
        setAvailableSlots(data.slots || []);
        setAvailabilityDuration(data.durationMinutes ?? null);
      } catch (e: any) {
        if (cancelled) return;
        setAvailableSlots([]);
        setAvailabilityDuration(null);
        setAvailabilityError(e?.message || "Failed to load available times");
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [staffId, selectedApptType, selectedDate]);

  useEffect(() => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTarget.staffId) {
      setRescheduleSlots([]);
      setRescheduleDuration(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setRescheduleLoading(true);
        setRescheduleError("");
        const data = await api.getMyAppointmentAvailability({
          staffId: String(rescheduleTarget.staffId || ""),
          date: rescheduleDate,
          appointmentType: rescheduleTarget.specialty || "Consultation",
        });
        if (cancelled) return;
        setRescheduleSlots(data.slots || []);
        setRescheduleDuration(data.durationMinutes ?? null);
      } catch (e: any) {
        if (cancelled) return;
        setRescheduleSlots([]);
        setRescheduleDuration(null);
        setRescheduleError(e?.message || "Failed to load available times");
      } finally {
        if (!cancelled) setRescheduleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rescheduleTarget, rescheduleDate]);

  const filteredAppointments = useMemo(() => {
    return appointments
      .map((a) => ({ ...a, _tab: getTabForAppointment(a) }))
      .filter((a) => a._tab === activeTab)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [appointments, activeTab]);

  function openDirections(appointment: ApiAppointment) {
    const query = encodeURIComponent(
      appointment.address ||
        appointment.locationName ||
        appointment.hospitalName ||
        appointment.providerName ||
        "Hospital"
    );
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
  }

  function resetBooking() {
    setSelectedApptType("");
    setProviderId("");
    setStaffId("");
    setStaff([]);
    setSelectedDate("");
    setSelectedSlot("");
    setAvailableSlots([]);
    setAvailabilityDuration(null);
    setAvailabilityError("");
    setSelectedVisitMode("in-person");
    setNotes("");
  }

  async function createAppointment() {
    if (!selectedApptType) return alert("Choose appointment type.");
    if (!providerId) return alert("Choose a provider/hospital.");
    if (!staffId) return alert("Choose staff.");
    if (!selectedDate) return alert("Pick a date.");
    if (!selectedSlot) return alert("Choose an available time.");

    const startTimeIso = new Date(selectedSlot).toISOString();

    const token =
      localStorage.getItem("patient_token") ||
      localStorage.getItem("patientToken") ||
      localStorage.getItem("token") ||
      null;

    if (!token) {
      alert("You are not logged in. Please sign in again.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/patient/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
  hospitalId: providerId,
  staffId,
  startTime: startTimeIso,
  localDateTime: selectedSlot,
  appointmentType: selectedApptType,
  visitMode: selectedVisitMode, // now includes phone because you did option B
  notes: notes || null,
})






      });

      const payload = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        alert(payload?.message || "Failed to create appointment");
        return;
      }

      await loadAppointments();
      setShowBooking(false);
      setActiveTab("upcoming");
      resetBooking();
    } catch (e) {
      console.error("Create appointment failed:", e);
      alert("Failed to create appointment");
    }
  }

  function openRescheduleRequest(appointment: ApiAppointment) {
    setRescheduleTarget(appointment);
    setRescheduleDate(toDateInputValue(new Date(appointment.startTime)));
    setRescheduleSlot("");
    setRescheduleReason("");
    setRescheduleError("");
    setRescheduleSlots([]);
    setRescheduleDuration(appointment.durationMinutes ?? null);
  }

  async function submitRescheduleRequest() {
    if (!rescheduleTarget) return;
    if (!rescheduleSlot) {
      setRescheduleError("Choose an available time.");
      return;
    }

    try {
      setRescheduleSubmitting(true);
      setRescheduleError("");
      const result = await api.requestAppointmentReschedule(rescheduleTarget.id, {
        startTime: new Date(rescheduleSlot).toISOString(),
        localDateTime: rescheduleSlot,
        reason: rescheduleReason.trim() || undefined,
      });
      if (result.appointment) {
        setAppointments((current) =>
          current.map((appointment) =>
            appointment.id === result.appointment.id
              ? {
                  ...appointment,
                  startTime: result.appointment.startTime,
                  status: result.appointment.status as ApiAppointment["status"],
                  notes: result.appointment.notes || null,
                  durationMinutes: result.appointment.durationMinutes,
                  specialty: result.appointment.appointmentType ?? appointment.specialty,
                  type: result.appointment.visitMode ?? appointment.type,
                }
              : appointment
          )
        );
      }
      alert("Reschedule request sent. Waiting for provider confirmation.");
      closeRescheduleRequest();
    } catch (e: any) {
      setRescheduleError(e?.message || "Failed to send reschedule request");
    } finally {
      setRescheduleSubmitting(false);
    }
  }

  function closeRescheduleRequest() {
    setRescheduleTarget(null);
    setRescheduleDate("");
    setRescheduleSlot("");
    setRescheduleReason("");
    setRescheduleSlots([]);
    setRescheduleDuration(null);
    setRescheduleError("");
    setRescheduleLoading(false);
    setRescheduleSubmitting(false);
  }

  // ---------------- Booking Screen ----------------
  if (showBooking) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-gray-900 text-2xl font-bold mb-6">Book New Appointment</h1>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm text-gray-600 mb-2">Appointment type</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={selectedApptType}
              onChange={(e) => setSelectedApptType(e.target.value)}
            >
              <option value="">Select type…</option>
              {APPT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
  <label className="block text-sm text-gray-600 mb-2">Visit mode</label>
  <select
    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
    value={selectedVisitMode}
    onChange={(e) => setSelectedVisitMode(e.target.value as any)}
  >
    <option value="in-person">In-person</option>
    <option value="virtual">Virtual</option>
    <option value="phone">Phone</option>
  </select>
</div>


          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm text-gray-600 mb-2">Choose a connected provider</label>

            {providersLoading ? (
              <div className="text-sm text-gray-600">Loading providers…</div>
            ) : (
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
              >
                <option value="" disabled>
                  Choose a provider…
                </option>
                {uniqueProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {!providersLoading && providers.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">No connected providers found.</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm text-gray-600 mb-2">Choose staff</label>

            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              disabled={!providerId || staffLoading}
            >
              {!providerId ? (
                <option value="">Select a provider first</option>
              ) : staffLoading ? (
                <option value="">Loading staff…</option>
              ) : staff.length === 0 ? (
                <option value="">No staff available</option>
              ) : (
                staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} {s.role ? `- ${s.role}` : ""}
                  </option>
                ))
              )}
            </select>

            {providerId && !staffLoading && staff.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">No staff available for this provider.</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Pick a date</label>
              <input
                type="date"
                min={toDateInputValue(new Date())}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Available time</label>

              {!selectedDate || !staffId || !selectedApptType ? (
                <div className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500">
                  Choose appointment type, provider, staff, and date to see available slots.
                </div>
              ) : slotsLoading ? (
                <div className="rounded-lg border border-gray-200 px-3 py-4 text-sm text-gray-500">
                  Loading available times…
                </div>
              ) : availabilityError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-4 text-sm text-red-700">
                  {availabilityError}
                </div>
              ) : availableSlots.filter((slot) => slot.available).length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-4 text-sm text-amber-800">
                  No open time slots are available for that day.
                </div>
              ) : (
                <select
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={selectedSlot}
                  onChange={(event) => setSelectedSlot(event.target.value)}
                >
                  <option value="">Select a time…</option>
                  {availableSlots
                    .filter((slot) => slot.available)
                    .map((slot) => (
                      <option key={slot.localDateTime} value={slot.localDateTime}>
                        {slot.label}
                      </option>
                    ))}
                </select>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm text-gray-600 mb-2">Notes (optional)</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any details for the provider…"
            />
          </div>

          <button
            onClick={createAppointment}
            disabled={
              providersLoading ||
              staffLoading ||
              !selectedApptType ||
              !providerId ||
              !staffId ||
              !selectedDate ||
              !selectedSlot
            }
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-xl py-3 font-medium transition-colors"
          >
            Book Appointment
          </button>

          <button
            onClick={() => {
              setShowBooking(false);
              resetBooking();
            }}
            className="w-full bg-white border border-gray-200 hover:border-gray-300 text-gray-800 rounded-xl py-3 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---------------- Main Screen ----------------
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-gray-900 text-2xl font-bold">Appointments</h1>
          <button
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-3 py-2 text-sm flex items-center gap-2"
            onClick={() => setShowBooking(true)}
          >
            <Plus className="w-4 h-4" />
            Book
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 py-2 rounded-lg transition-colors text-sm font-medium ${
              activeTab === "upcoming" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`flex-1 py-2 rounded-lg transition-colors text-sm font-medium ${
              activeTab === "past" ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            Past
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading && <div className="text-sm text-gray-600">Loading appointments…</div>}

        {filteredAppointments.map((a) => {
          const { date, time } = formatWhen(a.startTime);
          const visitMode = String(a.type).toLowerCase();
          const isVirtual = visitMode === "virtual";
          const hasDirections = visitMode === "in-person";

          return (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-gray-900 font-semibold mb-1">{a.doctorName}</h3>

                {/* appointment type (currently coming from specialty) */}
<p className="text-sm text-gray-600 mb-2">
  {a.specialty || "Appointment"}
</p>

{/* visit mode (in-person / virtual / phone) */}
<p className="text-xs text-gray-500 mb-2">
  Visit: {a.type ? String(a.type).replace("-", " ") : "in person"}
</p>


                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-gray-600">
                      <CalendarIcon className="w-4 h-4" />
                      <span className="text-sm">
                        {date} at {time}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      {isVirtual ? (
                        <>
                          <Video className="w-4 h-4" />
                          <span className="text-sm">{a.locationName || "Virtual Appointment"}</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">
                            {a.locationName || "Hospital"}
                            {a.address ? ` — ${a.address}` : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {a.notes ? (
                    <p className="text-xs text-gray-500 mt-3">
                      <span className="font-medium text-gray-600">Notes:</span> {a.notes}
                    </p>
                  ) : null}
                </div>

                <div className="ml-3">
                  <StatusPill status={a.status} />
                </div>
              </div>

              {activeTab === "upcoming" ? (
                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-white border border-gray-200 hover:border-gray-300 rounded-lg py-2 text-sm text-gray-700"
                    onClick={() => {
                      if (isVirtual && a.joinUrl) window.open(a.joinUrl, "_blank");
                      else if (hasDirections) openDirections(a);
                      else setSelectedSummary(a);
                    }}
                  >
                    {isVirtual ? "Join" : hasDirections ? "Directions" : "Details"}
                  </button>

                  <button
                    className="flex-1 bg-white border border-gray-200 hover:border-gray-300 rounded-lg py-2 text-sm text-gray-700"
                    onClick={() => alert("Add to Calendar coming next.")}
                  >
                    Add to Calendar
                  </button>

                  <button
                    className="bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
                    onClick={() => openRescheduleRequest(a)}
                  >
                    Reschedule
                  </button>
                </div>
              ) : (
                <button
                  className="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-lg py-2 text-sm text-gray-700 flex items-center justify-center gap-2"
                  onClick={() => setSelectedSummary(a)}
                >
                  View Visit Summary
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}

        {!loading && filteredAppointments.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No {activeTab} appointments</p>
          </div>
        )}
      </div>

      {rescheduleTarget
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] overflow-y-auto bg-gray-50"
              role="dialog"
              aria-modal="true"
            >
              <div
                className="min-h-screen"
              >
                <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
                  <div className="mx-auto flex w-full max-w-md items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">
                        Reschedule Request
                      </p>
                      <h3 className="mt-1 text-gray-900">{rescheduleTarget.specialty || "Appointment"}</h3>
                      <p className="text-sm text-gray-500">{rescheduleTarget.doctorName}</p>
                    </div>

                    <button
                      type="button"
                      onClick={closeRescheduleRequest}
                      className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                      aria-label="Cancel reschedule"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <div className="mx-auto w-full max-w-md space-y-4 p-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-600">Current appointment</p>
                    <p className="mt-2 font-medium text-gray-900">
                      {formatWhen(rescheduleTarget.startTime).date} at {formatWhen(rescheduleTarget.startTime).time}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Preferred new date</label>
                      <input
                        type="date"
                        min={toDateInputValue(new Date())}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        value={rescheduleDate}
                        onChange={(event) => {
                          setRescheduleDate(event.target.value);
                          setRescheduleSlot("");
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Available time</label>

                      {rescheduleLoading ? (
                        <div className="rounded-lg border border-gray-200 px-3 py-4 text-sm text-gray-500">
                          Loading available times…
                        </div>
                      ) : rescheduleSlots.filter((slot) => slot.available).length === 0 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-4 text-sm text-amber-800">
                          No open time slots are available for that day.
                        </div>
                      ) : (
                        <select
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                          value={rescheduleSlot}
                          onChange={(event) => setRescheduleSlot(event.target.value)}
                        >
                          <option value="">Select a time…</option>
                          {rescheduleSlots
                            .filter((slot) => slot.available)
                            .map((slot) => (
                              <option key={slot.localDateTime} value={slot.localDateTime}>
                                {slot.label}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Reason for rescheduling</label>
                      <textarea
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[96px]"
                        value={rescheduleReason}
                        onChange={(event) => setRescheduleReason(event.target.value)}
                        placeholder="Tell your provider why you need a new time."
                      />
                    </div>

                    {rescheduleError ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                        {rescheduleError}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={submitRescheduleRequest}
                    disabled={rescheduleSubmitting || !rescheduleSlot}
                    className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:bg-gray-300"
                  >
                    {rescheduleSubmitting ? "Sending request…" : "Send Reschedule Request"}
                  </button>

                  <button
                    type="button"
                    onClick={closeRescheduleRequest}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:border-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {selectedSummary
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 p-4 sm:items-center"
              role="dialog"
              aria-modal="true"
              onClick={() => setSelectedSummary(null)}
            >
              <div
                className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between border-b border-gray-100 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">
                      Visit Summary
                    </p>
                    <h3 className="mt-1 text-gray-900">{selectedSummary.specialty || "Appointment"}</h3>
                    <p className="text-sm text-gray-500">{selectedSummary.doctorName}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSummary(null)}
                    className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                    aria-label="Close"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-4 p-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-600">When</p>
                    <p className="mt-2 font-medium text-gray-900">{formatWhen(selectedSummary.startTime).date}</p>
                    <p className="text-sm text-gray-600">{formatWhen(selectedSummary.startTime).time}</p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-600">Visit Details</p>
                        <p className="mt-2 font-medium capitalize text-gray-900">
                          {String(selectedSummary.type || "in-person").replace("-", " ")}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {selectedSummary.locationName ||
                            selectedSummary.hospitalName ||
                            selectedSummary.providerName ||
                            (String(selectedSummary.type).toLowerCase() === "virtual"
                              ? "Virtual appointment"
                              : "Provider location")}
                        </p>
                      </div>
                      <StatusPill status={selectedSummary.status} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                    <p className="text-sm text-teal-900">Summary Notes</p>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {selectedSummary.notes?.trim()
                        ? selectedSummary.notes
                        : "No visit summary has been added yet."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSummary(null)}
                    className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
