import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/config/api";

type EmergencyPublicResponse = {
  patient_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  health_card: string | null;
  share_personal_info: boolean;
  share_blood_type: boolean;
  share_allergies: boolean;
  share_medical_conditions: boolean;
  share_current_medications: boolean;
  share_emergency_contacts: boolean;
  share_advance_directives: boolean;
  blood_type: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  current_medications: string | null;
  emergency_contact_full_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
  dnr_status: string | null;
  living_will: string | null;
};

type AccessMode = "patient_code" | "staff_ticket" | "patient_session";

function getPatientToken() {
  return (
    localStorage.getItem("patient_token") ||
    localStorage.getItem("patientToken") ||
    localStorage.getItem("token") ||
    null
  );
}

function getProviderOrigin() {
  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:5174`;
  }
  if (hostname === "medilinkid.com" || hostname === "www.medilinkid.com") {
    return `${protocol}//provider.medilinkid.com`;
  }
  if (hostname.startsWith("provider.")) {
    return `${protocol}//${hostname}`;
  }
  return `${protocol}//provider.${hostname}`;
}

export default function EmergencyPublic({ token }: { token: string }) {
  const [data, setData] = useState<EmergencyPublicResponse | null>(null);
  const [err, setErr] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const staffAccessTicket = searchParams.get("staffAccessTicket");

  const requestAccess = async (mode: AccessMode, options?: { patientCode?: string; staffTicket?: string }) => {
    setSubmitting(true);
    setErr("");

    try {
      const tokenValue = getPatientToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (mode === "patient_session" && tokenValue) {
        headers.Authorization = `Bearer ${tokenValue}`;
      }

      const res = await fetch(`${API_BASE}/api/emergency/access`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          token,
          accessMethod: mode,
          patientCode: options?.patientCode,
          staffAccessTicket: options?.staffTicket,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load emergency profile");

      setData(json);
      setErr("");

      if (options?.staffTicket) {
        const cleanUrl = `${window.location.origin}/e/${token}`;
        window.history.replaceState({}, "", cleanUrl);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
      setData(null);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const patientToken = getPatientToken();
        if (staffAccessTicket) {
          await requestAccess("staff_ticket", { staffTicket: staffAccessTicket });
          return;
        }

        if (patientToken) {
          await requestAccess("patient_session");
          return;
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [staffAccessTicket, token]);

  const fullName = [data?.first_name, data?.last_name].filter(Boolean).join(" ") || "—";
  const showPersonalInfo = Boolean(data?.first_name || data?.last_name || data?.dob || data?.health_card);

  const formatDOB = (dob?: string | null) => {
    if (!dob) return "—";
    const d = new Date(dob);
    return d.toLocaleDateString("en-CA");
  };

  const continueWithProviderLogin = () => {
    const providerOrigin = getProviderOrigin();
    const returnTo = `${window.location.origin}/e/${token}`;
    window.location.href = `${providerOrigin}/?emergencyToken=${encodeURIComponent(token)}&returnTo=${encodeURIComponent(returnTo)}`;
  };

  const submitPatientCode = async () => {
    await requestAccess("patient_code", { patientCode: accessCode.trim() });
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-xl text-gray-900 mb-2">Emergency Access</h1>
        <p className="text-sm text-gray-600 mb-6">
          Enter the patient emergency access code or continue with MediLink provider sign-in.
        </p>

        {(initializing || submitting) && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 text-gray-600">
            Verifying access…
          </div>
        )}

        {!initializing && err ? (
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 mb-4 text-red-700">{err}</div>
        ) : null}

        {!initializing ? (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm text-gray-900">Family / Friends Access</p>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter patient access code"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-teal-500"
              />
              <button
                type="button"
                onClick={submitPatientCode}
                className="w-full rounded-xl bg-teal-600 px-4 py-3 text-white"
                disabled={submitting}
              >
                Continue with Access Code
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-sm text-gray-900">Emergency Responder / Provider Access</p>
              <button
                type="button"
                onClick={continueWithProviderLogin}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900"
              >
                Continue with MediLink Provider Sign-In
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-xl text-gray-900 mb-4">Emergency Profile</h1>

      {showPersonalInfo ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <div className="text-sm text-gray-500">Patient</div>
          <div className="text-gray-900">{fullName}</div>
          <div className="text-sm text-gray-600">DOB: {formatDOB(data.dob)}</div>
          <div className="text-sm text-gray-600">Health Card: {data.health_card || "—"}</div>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {data.share_blood_type && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Blood Type</div>
            <div className="text-gray-900">{data.blood_type || "—"}</div>
          </div>
        )}

        {data.share_allergies && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Allergies</div>
            <div className="text-gray-900 whitespace-pre-wrap">{data.allergies || "—"}</div>
          </div>
        )}

        {data.share_medical_conditions && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Medical Conditions</div>
            <div className="text-gray-900 whitespace-pre-wrap">{data.medical_conditions || "—"}</div>
          </div>
        )}

        {data.share_current_medications && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Current Medications</div>
            <div className="text-gray-900 whitespace-pre-wrap">{data.current_medications || "—"}</div>
          </div>
        )}

        {data.share_emergency_contacts && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Emergency Contact</div>
            <div className="text-gray-900">{data.emergency_contact_full_name || "—"}</div>
            <div className="text-sm text-gray-600">
              {data.emergency_contact_relationship || "—"} • {data.emergency_contact_phone || "—"}
            </div>
          </div>
        )}

        {data.share_advance_directives && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Advance Directives</div>
            <div className="text-gray-900">
              DNR: {data.dnr_status || "—"} <br />
              Living Will: {data.living_will || "—"}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-6">MediLink emergency view • Protected emergency access</p>
    </div>
  );
}
