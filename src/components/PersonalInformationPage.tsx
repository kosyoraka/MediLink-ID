import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Pencil, Lock, MapPin, Phone, User } from "lucide-react";
import { API_BASE } from "@/config/api";
// ✅ use API_BASE from config everywhere
const res = await fetch(`${API_BASE}/api/...`);
//const API_BASE = "http://localhost:4000";

type Address = {
  line1: string;
  line2: string;
  city: string;
  province: "ON";
  postalCode: string;
};

type Model = {
  firstName: string;
  lastName: string;
  dob: string;
  healthCard: string; // locked, not masked
  email: string; // locked
  phone: string;

  home: Address;
  mailing: Address;
  mailingSameAsHome: boolean;
};

type ProfileResponse = {
  patient_id: string;
  email: string;

  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  health_card: string | null;
  phone_number: string | null;

  home_address_line1: string | null;
  home_address_line2: string | null;
  home_city: string | null;
  home_province: string | null;
  home_postal_code: string | null;

  mailing_same_as_home: boolean | null;
  mailing_address_line1: string | null;
  mailing_address_line2: string | null;
  mailing_city: string | null;
  mailing_province: string | null;
  mailing_postal_code: string | null;
};

type RowProps = {
  label: string;
  value: React.ReactNode;
  locked?: boolean;
  onEdit?: () => void;
  editing?: boolean;
  editor?: React.ReactNode;
  onCancel?: () => void;
  onSave?: () => void;
  saving?: boolean;
  icon?: React.ReactNode;
};

function Row({
  label,
  value,
  locked,
  onEdit,
  editing,
  editor,
  onCancel,
  onSave,
  saving,
  icon,
}: RowProps) {
  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex items-center gap-2">
        {icon ? <span className="text-gray-600">{icon}</span> : null}
        <div className="font-medium text-gray-900">{label}</div>

        {!locked ? (
          <button
            type="button"
            onClick={onEdit}
            className="ml-1 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <span className="ml-1 inline-flex items-center gap-1 text-sm text-gray-500">
            <Lock className="w-4 h-4" />
            Locked
          </span>
        )}
      </div>

      <div className="mt-2 text-sm text-gray-700">
        {editing ? (
          <div className="space-y-3">
            {editor}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                disabled={!!saving}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onSave}
                className="px-4 py-2 border border-gray-900 text-gray-900 rounded-lg hover:bg-gray-900 hover:text-white disabled:opacity-60"
                disabled={!!saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function AddressCard({
  title,
  address,
  onEdit,
  editing,
  editor,
  disabledEdit,
}: {
  title: string;
  address: Address;
  onEdit: () => void;
  editing: boolean;
  editor: React.ReactNode;
  disabledEdit?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium text-gray-900">
          <MapPin className="w-4 h-4 text-gray-600" />
          {title}
        </div>
        <button
          type="button"
          onClick={onEdit}
          disabled={disabledEdit}
          className={`inline-flex items-center gap-1 text-sm ${
            disabledEdit ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>
      </div>

      {!editing ? (
        <div className="p-4 text-sm text-gray-700 space-y-1">
          <div>{address.line1 || "—"}</div>
          {address.line2 ? <div>{address.line2}</div> : null}
          <div>
            {(address.city || "—")}, {address.province} {address.postalCode || "—"}
          </div>
        </div>
      ) : (
        <div className="p-4">{editor}</div>
      )}
    </div>
  );
}

export default function PersonalInformationPage({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<Model>({
    firstName: "",
    lastName: "",
    dob: "",
    healthCard: "",
    email: "",
    phone: "",

    home: { line1: "", line2: "", city: "", province: "ON", postalCode: "" },
    mailing: { line1: "", line2: "", city: "", province: "ON", postalCode: "" },
    mailingSameAsHome: true,
  });

  const [draft, setDraft] = useState<Model>(data);
  const [editKey, setEditKey] = useState<
    null | "firstName" | "lastName" | "dob" | "phone" | "home" | "mailing"
  >(null);

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("");

  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (editKey && editKey !== "home" && editKey !== "mailing") {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editKey]);

  const loadProfile = async () => {
    const patientId = localStorage.getItem("patientId");
    const emailLS = localStorage.getItem("email") || "";

    if (!patientId) return;

    const res = await fetch(`${API_BASE}/api/patients/${patientId}/profile`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error(`GET profile failed: ${res.status}`);

    const p: ProfileResponse = await res.json();

    const home: Address = {
      line1: p.home_address_line1 ?? "",
      line2: p.home_address_line2 ?? "",
      city: p.home_city ?? "",
      province: "ON",
      postalCode: (p.home_postal_code ?? "").toUpperCase(),
    };

    const mailSame = p.mailing_same_as_home ?? true;

    const mailing: Address = mailSame
      ? home
      : {
          line1: p.mailing_address_line1 ?? "",
          line2: p.mailing_address_line2 ?? "",
          city: p.mailing_city ?? "",
          province: "ON",
          postalCode: (p.mailing_postal_code ?? "").toUpperCase(),
        };

    const next: Model = {
      firstName: p.first_name ?? "",
      lastName: p.last_name ?? "",
      dob: p.dob ?? "",
      healthCard: p.health_card ?? "",
      email: p.email || emailLS || "",
      phone: p.phone_number ?? "",

      home,
      mailing,
      mailingSameAsHome: mailSame,
    };

    setData(next);
    setDraft(next);
  };

  useEffect(() => {
    loadProfile().catch(() => {
      // keep blanks; avoid crashing
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (key: typeof editKey) => {
    setDraft(data);
    setEditKey(key);
    setStatus("");
  };

  const cancel = () => {
    setDraft(data);
    setEditKey(null);
    setStatus("");
  };

  const saveToBackend = async (next: Model) => {
    const patientId = localStorage.getItem("patientId");
    if (!patientId) throw new Error("Missing patientId");

    // ✅ This matches your backend contract (camelCase + PUT)
    const body = {
      firstName: next.firstName,
      lastName: next.lastName,
      dob: next.dob,
      healthCard: next.healthCard, // keep locked value
      phoneNumber: next.phone,

      homeAddress: {
        line1: next.home.line1,
        line2: next.home.line2,
        city: next.home.city,
        province: next.home.province,
        postalCode: next.home.postalCode,
      },
      mailingSameAsHome: next.mailingSameAsHome,
      mailingAddress: {
        line1: next.mailing.line1,
        line2: next.mailing.line2,
        city: next.mailing.city,
        province: next.mailing.province,
        postalCode: next.mailing.postalCode,
      },
    };

    const res = await fetch(`${API_BASE}/api/patients/${patientId}/profile`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Save failed: ${res.status} ${text}`);
    }
  };

  const save = async () => {
    const prev = data;
    const next = draft;

    // optimistic UI
    setData(next);
    setEditKey(null);
    setSaving(true);

    try {
      await saveToBackend(next);
      setStatus("Saved ✓");
    } catch (e: any) {
      setData(prev);
      setStatus(e?.message || "Save failed");
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(""), 2000);
    }
  };

  const addressEditor = (which: "home" | "mailing") => {
    const a = draft[which];

    return (
      <div className="space-y-3">
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2"
          placeholder="Address line 1"
          value={a.line1}
          onChange={(e) =>
            setDraft((p) => ({
              ...p,
              [which]: { ...p[which], line1: e.target.value },
            }))
          }
        />
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2"
          placeholder="Address line 2 (optional)"
          value={a.line2}
          onChange={(e) =>
            setDraft((p) => ({
              ...p,
              [which]: { ...p[which], line2: e.target.value },
            }))
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="border border-gray-200 rounded-lg px-3 py-2 md:col-span-1"
            placeholder="City"
            value={a.city}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                [which]: { ...p[which], city: e.target.value },
              }))
            }
          />
          <input className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500" value="ON" disabled />
          <input
            className="border border-gray-200 rounded-lg px-3 py-2"
            placeholder="Postal code (e.g., M5V 2T6)"
            value={a.postalCode}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                [which]: { ...p[which], postalCode: e.target.value.toUpperCase() },
              }))
            }
          />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={cancel}
            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="px-4 py-2 border border-gray-900 text-gray-900 rounded-lg hover:bg-gray-900 hover:text-white disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );
  };

  const editorFor = (key: "firstName" | "lastName" | "dob" | "phone") => {
    if (key === "dob") {
      return (
        <input
          ref={inputRef}
          type="date"
          className="w-full border border-gray-200 rounded-lg px-3 py-2"
          value={draft.dob}
          onChange={(e) => setDraft((p) => ({ ...p, dob: e.target.value }))}
        />
      );
    }

    const value = key === "phone" ? draft.phone : (draft as any)[key];

    return (
      <input
        ref={inputRef}
        className="w-full border border-gray-200 rounded-lg px-3 py-2"
        value={value}
        onChange={(e) =>
          setDraft((p) => ({
            ...p,
            ...(key === "phone" ? { phone: e.target.value } : { [key]: e.target.value }),
          }))
        }
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-green-400 via-teal-500 to-blue-500 text-white p-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl bg-white/10 hover:bg-white/20 p-2"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Personal information</h1>
            {status ? <p className="text-sm text-teal-100">{status}</p> : <p className="text-sm text-teal-100">Update your details</p>}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Personal info */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Row
            icon={<User className="w-4 h-4" />}
            label="Legal full name (First name)"
            value={data.firstName || "—"}
            onEdit={() => startEdit("firstName")}
            editing={editKey === "firstName"}
            editor={editorFor("firstName")}
            onCancel={cancel}
            onSave={save}
            saving={saving}
          />

          <Row
            icon={<User className="w-4 h-4" />}
            label="Last name"
            value={data.lastName || "—"}
            onEdit={() => startEdit("lastName")}
            editing={editKey === "lastName"}
            editor={editorFor("lastName")}
            onCancel={cancel}
            onSave={save}
            saving={saving}
          />

          <Row
            icon={<User className="w-4 h-4" />}
            label="Date of birth"
            value={data.dob || "—"}
            onEdit={() => startEdit("dob")}
            editing={editKey === "dob"}
            editor={editorFor("dob")}
            onCancel={cancel}
            onSave={save}
            saving={saving}
          />

          <Row
            icon={<User className="w-4 h-4" />}
            label="Health card number"
            value={data.healthCard || "—"}
            locked
          />
        </div>

        {/* Contact info */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Row icon={<User className="w-4 h-4" />} label="Email" value={data.email || "—"} locked />

          <Row
            icon={<Phone className="w-4 h-4" />}
            label="Phone number"
            value={data.phone || "—"}
            onEdit={() => startEdit("phone")}
            editing={editKey === "phone"}
            editor={editorFor("phone")}
            onCancel={cancel}
            onSave={save}
            saving={saving}
          />
        </div>

        {/* Addresses */}
        <div className="space-y-4">
          <AddressCard
            title="Home address"
            address={data.home}
            onEdit={() => startEdit("home")}
            editing={editKey === "home"}
            editor={addressEditor("home")}
          />

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={data.mailingSameAsHome}
                onChange={async (e) => {
                  const checked = e.target.checked;

                  const next: Model = {
                    ...data,
                    mailingSameAsHome: checked,
                    mailing: checked ? data.home : data.mailing,
                  };

                  // optimistic
                  setData(next);
                  setDraft(next);

                  setSaving(true);
                  try {
                    await saveToBackend(next);
                    setStatus("Saved ✓");
                  } catch (err: any) {
                    setStatus(err?.message || "Save failed");
                  } finally {
                    setSaving(false);
                    setTimeout(() => setStatus(""), 2000);
                  }
                }}
              />
              Mailing address is the same as home address
            </label>
          </div>

          <AddressCard
            title="Mailing address"
            address={data.mailing}
            onEdit={() => startEdit("mailing")}
            editing={editKey === "mailing"}
            editor={addressEditor("mailing")}
            disabledEdit={data.mailingSameAsHome}
          />
        </div>
      </div>
    </div>
  );
}
