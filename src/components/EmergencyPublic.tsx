import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/config/api";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Droplet,
  FileText,
  Phone,
  Pill,
  Shield,
  User,
} from "lucide-react";
import { Button } from "./ui/button";

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

type AccessMode = "patient_code" | "staff_ticket" | "patient_ticket";

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
  const patientAccessTicket = searchParams.get("patientAccessTicket");

  const requestAccess = async (
    mode: AccessMode,
    options?: { patientCode?: string; staffTicket?: string; patientTicket?: string }
  ) => {
    setSubmitting(true);
    setErr("");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const res = await fetch(`${API_BASE}/api/emergency/access`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          token,
          accessMethod: mode,
          patientCode: options?.patientCode,
          staffAccessTicket: options?.staffTicket,
          patientAccessTicket: options?.patientTicket,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load emergency profile");

      setData(json);
      setErr("");

      if (options?.staffTicket || options?.patientTicket) {
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
        if (patientAccessTicket) {
          await requestAccess("patient_ticket", { patientTicket: patientAccessTicket });
          return;
        }

        if (staffAccessTicket) {
          await requestAccess("staff_ticket", { staffTicket: staffAccessTicket });
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [patientAccessTicket, staffAccessTicket, token]);

  const fullName = [data?.first_name, data?.last_name].filter(Boolean).join(" ") || "—";
  const showPersonalInfo = Boolean(data?.first_name || data?.last_name || data?.dob || data?.health_card);
  const allergyLines = (data?.allergies || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
  const conditionLines = (data?.medical_conditions || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
  const medicationLines = (data?.current_medications || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
  const hasContact = Boolean(
    data?.emergency_contact_full_name || data?.emergency_contact_relationship || data?.emergency_contact_phone
  );

  const formatDOB = (dob?: string | null) => {
    if (!dob) return "—";
    const d = new Date(dob);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const formatUpdatedAt = () => {
    return new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    });
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
      <div className="min-h-screen bg-red-600 p-6 text-white">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-3">
            <AlertCircle className="h-8 w-8" />
            <h1 className="text-xl">Emergency Access</h1>
          </div>
          <p className="mb-6 text-sm text-red-100">
          Enter the patient emergency access code or continue with MediLink provider sign-in.
          </p>

          {(initializing || submitting) && (
            <div className="mb-4 rounded-xl bg-white p-4 text-gray-600">
              Verifying access…
            </div>
          )}

          {!initializing && err ? (
            <div className="mb-4 rounded-xl bg-white p-4 text-red-700">{err}</div>
          ) : null}

          {!initializing ? (
            <div className="space-y-4">
              <div className="space-y-3 rounded-xl bg-white p-4 text-gray-900">
                <p className="text-sm">Family / Friends Access</p>
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

              <div className="space-y-3 rounded-xl bg-white p-4 text-gray-900">
                <p className="text-sm">Emergency Responder / Provider Access</p>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-600 p-6 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <div className="w-6" />
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8" />
            <h1 className="text-xl">EMERGENCY MODE</h1>
          </div>
          <div className="w-6" />
        </div>

        <div className="space-y-4">
          {showPersonalInfo ? (
            <div className="rounded-xl bg-white p-6 text-gray-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
                  <User className="h-6 w-6 text-teal-600" />
                </div>
                <h2>Personal Information</h2>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="text-gray-900">{fullName}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="text-gray-900">{formatDOB(data.dob)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-600">Health Card Number</p>
                  <p className="text-gray-900">{data.health_card || "—"}</p>
                </div>
              </div>
            </div>
          ) : null}

          {data.share_allergies && (
            <div className="rounded-xl bg-white p-6 text-gray-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-red-600">ALLERGIES</h2>
              </div>

              {allergyLines.length ? (
                <div className="space-y-2">
                  {allergyLines.map((entry) => (
                    <div key={entry} className="rounded-lg bg-red-50 p-3">
                      <p className="text-gray-900 dark:text-white">{entry}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 p-3">Not provided</div>
              )}
            </div>
          )}

          {data.share_blood_type && (
            <div className="rounded-xl bg-white p-6 text-gray-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Droplet className="h-6 w-6 text-blue-600" />
                </div>
                <h2>Blood Type</h2>
              </div>
              <p className="text-2xl">{data.blood_type || "Not provided"}</p>
            </div>
          )}

          {data.share_medical_conditions && (
            <div className="rounded-xl bg-white p-6 text-gray-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <h2>Medical Conditions</h2>
              </div>

              {conditionLines.length ? (
                <ul className="space-y-2">
                  {conditionLines.map((entry) => (
                    <li key={entry} className="rounded-lg bg-gray-50 p-3">
                      {entry}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg bg-gray-50 p-3">Not provided</div>
              )}
            </div>
          )}

          {data.share_current_medications && (
            <div className="rounded-xl bg-white p-6 text-gray-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Pill className="h-6 w-6 text-green-600" />
                </div>
                <h2>Current Medications</h2>
              </div>

              {medicationLines.length ? (
                <ul className="space-y-2">
                  {medicationLines.map((entry) => (
                    <li key={entry} className="rounded-lg bg-gray-50 p-3">
                      {entry}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg bg-gray-50 p-3">Not provided</div>
              )}
            </div>
          )}

          {data.share_emergency_contacts && (
            <div className="rounded-xl bg-white p-6 text-gray-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                  <Phone className="h-6 w-6 text-orange-600" />
                </div>
                <h2>Emergency Contacts</h2>
              </div>

              {hasContact ? (
                <div className="space-y-2 rounded-lg bg-gray-50 p-4">
                  <p className="text-gray-900">
                    {data.emergency_contact_full_name || "Not provided"}
                    {data.emergency_contact_relationship ? ` (${data.emergency_contact_relationship})` : ""}
                  </p>
                  <p className="text-sm text-gray-600">{data.emergency_contact_phone || "Not provided"}</p>
                  {data.emergency_contact_phone ? (
                    <Button
                      asChild
                      size="sm"
                      className="w-full bg-green-600 text-white hover:bg-green-700"
                    >
                      <a href={`tel:${data.emergency_contact_phone}`}>
                        <Phone className="mr-2 h-4 w-4" />
                        Call {data.emergency_contact_phone}
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" disabled className="w-full">
                      Call
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 p-3">Not provided</div>
              )}
            </div>
          )}

          {data.share_advance_directives && (
            <div className="rounded-xl bg-white p-6 text-gray-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <h2>Advance Directives</h2>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-600">DNR Status</p>
                  <p className="text-gray-900">{data.dnr_status || "Not provided"}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-600">Living Will</p>
                  <p className="text-gray-900">{data.living_will || "Not provided"}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-red-700 p-4">
          <p className="text-sm text-white">Last updated: {formatUpdatedAt()}</p>
        </div>
      </div>
    </div>
  );
}
