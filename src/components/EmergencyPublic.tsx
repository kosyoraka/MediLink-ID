import { useEffect, useState } from "react";
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

export default function EmergencyPublic({ token }: { token: string }) {
  const [data, setData] = useState<EmergencyPublicResponse | null>(null);
  const [err, setErr] = useState("");
  //const res = await fetch(`${API_BASE}/api/emergency/${token}`, { cache: "no-store" });


  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/emergency/by-token/${token}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to load emergency profile");
        setData(json);
      } catch (e: any) {
        setErr(e?.message || "Failed to load");
      }
    })();
  }, [token]);

  if (err) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-xl text-gray-900 mb-2">Emergency Profile</h1>
        <p className="text-red-600">{err}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-xl text-gray-900 mb-2">Emergency Profile</h1>
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || "—";
  const formatDOB = (dob?: string | null) => {
  if (!dob) return "—";
  const d = new Date(dob);
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
};


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-xl text-gray-900 mb-4">Emergency Profile</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <div className="text-sm text-gray-500">Patient</div>
        <div className="text-gray-900">{fullName}</div>
        <div className="text-sm text-gray-600">DOB: {formatDOB(data.dob)}</div>
        <div className="text-sm text-gray-600">Health Card: {data.health_card || "—"}</div>
      </div>

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

      <p className="text-xs text-gray-400 mt-6">
        MediLink emergency view • Token-based access
      </p>
    </div>
  );
}
