import "dotenv/config";

import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { pool } from "./db";
import { randomUUID, randomBytes } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import aiRouter from './ai';
import * as jwt from "jsonwebtoken";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { requirePatient } from "./middleware/requirePatient";
//import { requireAuth, requirePatientAuth } from "./middleware/requireAuth";
import { requireAuth, requireStaffAuth, requirePatientAuth } 
  from "./middleware/requireAuth";







const app = express();

const defaultAllowList = new Set([
  "http://localhost:3000",
  "http://10.0.0.203:3000",

  "http://localhost:5173",
  "http://localhost:5174",
  "http://10.0.0.203:5173",
  "http://10.0.0.203:5174",
]);


function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// helper
function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// ------------------- JWT STAFF AUTH MIDDLEWARE -------------------

type StaffJwtPayload = {
  sub: string;         // staff id
  role: "staff";
  hospitalId: string;
  iat?: number;
  exp?: number;
};

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Missing env var: JWT_SECRET");
  return s;
}



function signPatientToken(patient: { id: string; email: string }) {
  const secret = getJwtSecret();

  return jwt.sign(
    { id: patient.id, email: patient.email, role: "patient" },
    secret,
    { expiresIn: "7d" }
  );
}

function signStaffToken(staff: {
  id: string;
  email: string;
  hospitalId: string;
}) {
  return jwt.sign(
    {
      id: staff.id,
      email: staff.email,
      role: "staff",
      providerId: staff.id,
      hospitalId: staff.hospitalId,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "1d" }
  );
}

function getGoogleClientId() {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("Missing env var: GOOGLE_CLIENT_ID");
  return id;
}

const googleClient = new OAuth2Client();
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DOCUMENT_CATEGORIES = new Set([
  "labs",
  "imaging",
  "visits",
  "prescriptions",
  "insurance",
  "other",
]);

const DOCUMENT_REQUEST_STATUSES = new Set([
  "pending",
  "viewed",
  "in_progress",
  "fulfilled",
  "declined",
  "expired",
]);

async function verifyGoogleCredential(idToken: string): Promise<TokenPayload> {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: getGoogleClientId(),
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid Google token payload");
  if (!payload.sub || !payload.email) throw new Error("Missing Google subject/email");
  if (!payload.email_verified) throw new Error("Google email is not verified");

  return payload;
}

//Helper: patient can send only if active connection exists
async function ensureActiveConnection(patientId: string, providerId: string) {
  const r = await pool.query(
    `
    SELECT 1
    FROM patient_provider_connections
    WHERE patient_id = $1
      AND provider_id = $2
      AND disconnected_at IS NULL
    LIMIT 1
    `,
    [patientId, providerId]
  );

  return (r.rowCount ?? 0) > 0;
}



const isDev = process.env.NODE_ENV !== "production";

function getAllowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configured.length > 0 ? new Set(configured) : defaultAllowList;
}

function getFrontendBaseUrl() {
  const configured = process.env.FRONTEND_BASE_URL?.trim();

  if (configured) return configured.replace(/\/+$/, "");
  if (!isDev) {
    throw new Error("Missing env var: FRONTEND_BASE_URL");
  }

  return "http://localhost:5173";
}

async function ensureDocumentsSchema() {
  const sql = await readFile(path.resolve(__dirname, "../004_documents_domain.sql"), "utf8");
  const patchSql = `
    ALTER TABLE document_requests
    ADD COLUMN IF NOT EXISTS conversation_id UUID;

    ALTER TABLE document_requests
    ADD COLUMN IF NOT EXISTS staff_id UUID;
  `;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await pool.query(sql);
      await pool.query(patchSql);
      return;
    } catch (error) {
      if (attempt === 5) {
        console.error("Documents schema setup skipped:", error);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function ensureHealthSummarySchema() {
  const sql = await readFile(path.resolve(__dirname, "../005_health_summary.sql"), "utf8");
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await pool.query(sql);
      return;
    } catch (error) {
      if (attempt === 5) {
        console.error("Health summary schema setup skipped:", error);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function ensureMedicationsSchema() {
  const sql = await readFile(path.resolve(__dirname, "../006_medications.sql"), "utf8");
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await pool.query(sql);
      return;
    } catch (error) {
      if (attempt === 5) {
        console.error("Medications schema setup skipped:", error);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function ensureConditionsSchema() {
  const sql = await readFile(path.resolve(__dirname, "../007_conditions.sql"), "utf8");
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await pool.query(sql);
      return;
    } catch (error) {
      if (attempt === 5) {
        console.error("Conditions schema setup skipped:", error);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

function isUuid(value: string | undefined | null) {
  return Boolean(value && uuidRegex.test(String(value)));
}

function normalizeDocumentCategory(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  return DOCUMENT_CATEGORIES.has(normalized) ? normalized : "";
}

function formatFileSize(size: number | null | undefined) {
  if (!size || size <= 0) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function documentStatusLabel(status: string, uploadedByPatient: boolean, viewer: "patient" | "provider") {
  if (status === "provider_uploaded" || status === "provider_verified" || status === "organization_verified") {
    return "Verified";
  }
  if (status === "patient_uploaded" || uploadedByPatient) {
    return viewer === "patient" ? "Uploaded by you" : "Patient upload";
  }
  if (status === "unverified") return "Pending review";
  if (status === "rejected") return "Needs replacement";
  if (status === "superseded") return "Replaced";
  return "Pending review";
}

function mapDocumentRow(row: any, viewer: "patient" | "provider") {
  const uploadedByPatient = Boolean(row.uploaded_by_patient_id);
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    patientName:
      row.patient_name ||
      [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
      "Patient",
    hospitalId: row.hospital_id ? String(row.hospital_id) : null,
    hospitalName: row.hospital_name || null,
    title: row.title,
    category: row.category,
    subtype: row.subtype || null,
    description: row.description || "",
    sourceType: row.source_type,
    sourceOrganizationName:
      row.source_organization_name ||
      row.hospital_name ||
      (uploadedByPatient ? "Personal upload" : "Provider upload"),
    verificationStatus: row.verification_status,
    verificationLabel: documentStatusLabel(String(row.verification_status), uploadedByPatient, viewer),
    visibilityStatus: row.visibility_status,
    serviceDate: row.service_date,
    uploadDate: row.created_at,
    fileName: row.file_name,
    mimeType: row.mime_type || null,
    fileSizeBytes: row.file_size_bytes ?? null,
    fileSizeLabel: formatFileSize(Number(row.file_size_bytes) || 0),
    fileUrl: row.storage_url,
    requestId: row.request_id ? String(row.request_id) : null,
    uploadedBy:
      viewer === "provider"
        ? uploadedByPatient
          ? "Patient"
          : row.uploaded_by_staff_name || "Provider"
        : uploadedByPatient
        ? "patient"
        : "provider",
    verifiedByName: row.verified_by_staff_name || null,
  };
}

function normalizeHealthSummaryRow(row: any) {
  return {
    vitals: Array.isArray(row?.vitals) ? row.vitals : [],
    conditions: Array.isArray(row?.conditions) ? row.conditions : [],
    allergies: Array.isArray(row?.allergies) ? row.allergies : [],
    bloodType: row?.blood_type || null,
    currentMedications: Array.isArray(row?.current_medications) ? row.current_medications : [],
    emergencyContacts: Array.isArray(row?.emergency_contacts) ? row.emergency_contacts : [],
    advanceDirectives:
      row?.advance_directives && typeof row.advance_directives === "object" && !Array.isArray(row.advance_directives)
        ? row.advance_directives
        : {},
    immunizations: Array.isArray(row?.immunizations) ? row.immunizations : [],
    familyHistory: Array.isArray(row?.family_history) ? row.family_history : [],
    updatedAt: row?.updated_at || null,
  };
}

function summarizeHealthSummaryText(items: any[] | null | undefined, type: "allergy" | "condition") {
  if (!Array.isArray(items) || items.length === 0) return null;

  return items
    .map((item: any) => {
      const name = String(item?.name ?? "").trim();
      if (!name) return "";

      if (type === "allergy") {
        const severity = String(item?.severity ?? "").trim();
        const reaction = String(item?.reaction ?? "").trim();
        return [name, severity ? `(${severity})` : "", reaction ? `- ${reaction}` : ""]
          .filter(Boolean)
          .join(" ")
          .trim();
      }

      const status = String(item?.status ?? "").trim();
      return [name, status ? `(${status})` : ""].filter(Boolean).join(" ").trim();
    })
    .filter(Boolean)
    .join("\n");
}

function summarizeMedicationName(row: any) {
  const name = String(row?.name ?? "").trim();
  const dosage = String(row?.dosage ?? "").trim();
  return [name, dosage].filter(Boolean).join(" ").trim();
}

function mapMedicationRow(row: any) {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    hospitalId: row.hospital_id ? String(row.hospital_id) : null,
    hospitalName: row.hospital_name || null,
    staffId: row.staff_id ? String(row.staff_id) : null,
    sourceType: String(row.source_type),
    verificationStatus: String(row.verification_status),
    name: String(row.name),
    dosage: row.dosage || "",
    frequency: row.frequency || "",
    purpose: row.purpose || "",
    prescriberName:
      row.prescriber_name || row.staff_full_name || (row.source_type === "patient" ? "Added by patient" : "Provider"),
    pharmacy: row.pharmacy || "",
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    refillsRemaining:
      typeof row.refills_remaining === "number" ? row.refills_remaining : row.refills_remaining == null ? null : Number(row.refills_remaining),
    notes: row.notes || "",
    remindersEnabled: Boolean(row.reminders_enabled),
    adherenceStatus: String(row.adherence_status || "not_started"),
    lastIntakeStatus: row.last_intake_status || null,
    lastIntakeDate: row.last_intake_date || null,
    recentIntakeLogs: Array.isArray(row.recent_intake_logs) ? row.recent_intake_logs : [],
    isActive: Boolean(row.is_active),
    lastRefillRequestedAt: row.last_refill_requested_at || null,
    latestRefillRequestId: row.latest_refill_request_id || null,
    latestRefillRequestStatus: row.latest_refill_request_status || null,
    latestRefillRequestNote: row.latest_refill_request_note || "",
    latestRefillRequestCreatedAt: row.latest_refill_request_created_at || null,
    latestRefillRequestResolvedAt: row.latest_refill_request_resolved_at || null,
    latestRefillRequestResolutionNote: row.latest_refill_request_resolution_note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchMedicationById(medicationId: string) {
  const result = await pool.query(
    `
    SELECT
      pm.*,
      h.name AS hospital_name,
      sa.full_name AS staff_full_name,
      latest_log.status AS last_intake_status,
      latest_log.logged_for_date AS last_intake_date,
      COALESCE(logs.recent_intake_logs, '[]'::json) AS recent_intake_logs,
      latest_refill.id AS latest_refill_request_id,
      latest_refill.status AS latest_refill_request_status,
      latest_refill.request_note AS latest_refill_request_note,
      latest_refill.created_at AS latest_refill_request_created_at,
      latest_refill.resolved_at AS latest_refill_request_resolved_at,
      latest_refill.resolution_note AS latest_refill_request_resolution_note
    FROM patient_medications pm
    LEFT JOIN hospitals h ON h.id = pm.hospital_id
    LEFT JOIN staff_accounts sa ON sa.id = pm.staff_id
    LEFT JOIN LATERAL (
      SELECT mil.status, mil.logged_for_date
      FROM medication_intake_logs mil
      WHERE mil.medication_id = pm.id
      ORDER BY mil.logged_for_date DESC, mil.created_at DESC
      LIMIT 1
    ) latest_log ON TRUE
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'id', mil.id,
          'loggedForDate', mil.logged_for_date,
          'status', mil.status,
          'note', mil.note,
          'createdAt', mil.created_at
        )
        ORDER BY mil.logged_for_date DESC, mil.created_at DESC
      ) AS recent_intake_logs
      FROM (
        SELECT *
        FROM medication_intake_logs
        WHERE medication_id = pm.id
        ORDER BY logged_for_date DESC, created_at DESC
        LIMIT 7
      ) mil
    ) logs ON TRUE
    LEFT JOIN LATERAL (
      SELECT mrr.id, mrr.status, mrr.request_note, mrr.created_at, mrr.resolved_at, mrr.resolution_note
      FROM medication_refill_requests mrr
      WHERE mrr.medication_id = pm.id
      ORDER BY mrr.created_at DESC
      LIMIT 1
    ) latest_refill ON TRUE
    WHERE pm.id = $1::uuid
    LIMIT 1
    `,
    [medicationId]
  );

  return result.rows[0] || null;
}

async function syncPatientMedicationSummary(patientId: string) {
  const medsResult = await pool.query(
    `
    SELECT name, dosage
    FROM patient_medications
    WHERE patient_id = $1::uuid
      AND is_active = true
    ORDER BY created_at DESC
    `,
    [patientId]
  );

  const currentMedications = medsResult.rows
    .map((row) => summarizeMedicationName(row))
    .filter(Boolean);

  await pool.query(
    `
    INSERT INTO patient_health_summaries (
      patient_id, current_medications, updated_at
    )
    VALUES ($1::uuid, $2::jsonb, NOW())
    ON CONFLICT (patient_id)
    DO UPDATE SET
      current_medications = EXCLUDED.current_medications,
      updated_at = NOW()
    `,
    [patientId, JSON.stringify(currentMedications)]
  );

  await pool.query(
    `
    UPDATE patient_profiles
    SET current_medications = $2
    WHERE patient_id = $1::uuid
    `,
    [patientId, currentMedications.length ? currentMedications.join(", ") : null]
  );
}

function mapConditionRow(row: any) {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    hospitalId: row.hospital_id ? String(row.hospital_id) : null,
    hospitalName: row.hospital_name || null,
    staffId: row.staff_id ? String(row.staff_id) : null,
    sourceType: String(row.source_type || "provider"),
    verificationStatus: String(row.verification_status || "provider_verified"),
    name: String(row.name || ""),
    status: String(row.status || ""),
    diagnosed: String(row.diagnosed || ""),
    metric: String(row.metric || ""),
    provider: String(row.provider || row.staff_full_name || ""),
    notes: String(row.notes || ""),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function syncPatientConditionSummary(patientId: string) {
  const result = await pool.query(
    `
    SELECT pc.*, h.name AS hospital_name, sa.full_name AS staff_full_name
    FROM patient_conditions pc
    LEFT JOIN hospitals h ON h.id = pc.hospital_id
    LEFT JOIN staff_accounts sa ON sa.id = pc.staff_id
    WHERE pc.patient_id = $1::uuid
      AND pc.is_active = true
    ORDER BY pc.updated_at DESC, pc.created_at DESC
    `,
    [patientId]
  );

  const conditions = result.rows.map(mapConditionRow);
  const conditionNames = conditions.map((item) => item.name).filter(Boolean);

  await pool.query(
    `
    INSERT INTO patient_health_summaries (patient_id, conditions, updated_at)
    VALUES ($1::uuid, $2::jsonb, NOW())
    ON CONFLICT (patient_id)
    DO UPDATE SET
      conditions = EXCLUDED.conditions,
      updated_at = NOW()
    `,
    [patientId, JSON.stringify(conditions)]
  );

  await pool.query(
    `
    UPDATE patient_profiles
    SET medical_conditions = $2
    WHERE patient_id = $1::uuid
    `,
    [patientId, conditionNames.length ? conditionNames.join(", ") : null]
  );

  return conditions;
}

async function seedConditionRowsFromSummary(patientId: string) {
  const existing = await pool.query(
    `SELECT 1 FROM patient_conditions WHERE patient_id = $1::uuid LIMIT 1`,
    [patientId]
  );

  if ((existing.rowCount ?? 0) > 0) return;

  const summary = await pool.query(
    `
    SELECT hs.conditions, pp.medical_conditions
    FROM patient_health_summaries hs
    LEFT JOIN patient_profiles pp ON pp.patient_id = hs.patient_id
    WHERE hs.patient_id = $1::uuid
    LIMIT 1
    `,
    [patientId]
  );

  let conditions = Array.isArray(summary.rows[0]?.conditions) ? summary.rows[0].conditions : [];
  if (conditions.length === 0) {
    const profile = await pool.query(
      `
      SELECT medical_conditions
      FROM patient_profiles
      WHERE patient_id = $1::uuid
      LIMIT 1
      `,
      [patientId]
    );

    const legacyConditions = String(profile.rows[0]?.medical_conditions || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    conditions = legacyConditions.map((name) => ({
      id: randomUUID(),
      name,
      status: "On file",
      diagnosed: "Date not recorded",
      metric: "Imported from existing patient profile",
      provider: "Provider not recorded",
    }));
  }

  for (const item of conditions) {
    const name = String(item?.name || "").trim();
    if (!name) continue;

    await pool.query(
      `
      INSERT INTO patient_conditions (
        id, patient_id, source_type, verification_status, name, status, diagnosed, metric, provider, notes, is_active
      )
      VALUES ($1::uuid, $2::uuid, 'provider', 'provider_verified', $3, $4, $5, $6, $7, $8, true)
      `,
      [
        isUuid(String(item?.id || "")) ? String(item.id) : randomUUID(),
        patientId,
        name,
        item?.status ? String(item.status).trim() : null,
        item?.diagnosed ? String(item.diagnosed).trim() : null,
        item?.metric ? String(item.metric).trim() : null,
        item?.provider ? String(item.provider).trim() : null,
        item?.notes ? String(item.notes).trim() : null,
      ]
    );
  }
}

const documentSelectSql = `
  SELECT
    d.id,
    d.patient_id,
    d.hospital_id,
    d.uploaded_by_patient_id,
    d.uploaded_by_staff_id,
    d.request_id,
    d.source_type,
    d.source_organization_name,
    d.category,
    d.subtype,
    d.title,
    d.description,
    d.verification_status,
    d.visibility_status,
    d.service_date,
    d.created_at,
    d.updated_at,
    h.name AS hospital_name,
    pp.first_name,
    pp.last_name,
    NULLIF(TRIM(COALESCE(pp.first_name, '') || ' ' || COALESCE(pp.last_name, '')), '') AS patient_name,
    uploader.full_name AS uploaded_by_staff_name,
    verifier.full_name AS verified_by_staff_name,
    df.file_name,
    df.mime_type,
    df.file_size_bytes,
    df.storage_url
  FROM medical_documents d
  LEFT JOIN hospitals h ON h.id = d.hospital_id
  LEFT JOIN patient_profiles pp ON pp.patient_id = d.patient_id
  LEFT JOIN staff_accounts uploader ON uploader.id = d.uploaded_by_staff_id
  LEFT JOIN staff_accounts verifier ON verifier.id = d.verified_by_staff_id
  LEFT JOIN LATERAL (
    SELECT file_name, mime_type, file_size_bytes, storage_url
    FROM document_files
    WHERE document_id = d.id
      AND is_primary = true
    ORDER BY created_at DESC
    LIMIT 1
  ) df ON TRUE
`;

app.use(
  cors({
    origin(origin, cb) {
      const allowList = getAllowedOrigins();
      if (!origin) return cb(null, true);

      if (allowList.has(origin)) return cb(null, true);

      if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);

      if (isDev && /^http:\/\/10\.0\.0\.\d+:\d+$/.test(origin)) {
        return cb(null, true);
      }

      return cb(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
  })
);




app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use('/api/ai', aiRouter);

const FRONTEND_BASE_URL = getFrontendBaseUrl();

// URL-safe token without relying on Node's base64url support
const makeUrlSafeToken = () => {
  return randomBytes(24)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};


app.get("/", (req, res) => {
  res.send("MediLink API is running");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});


// ------------------- STAFF SETTINGS / PROFILE -------------------

// GET /api/staff/me
app.get("/api/staff/me", requireStaffAuth, async (req: any, res) => {
  try {
    const staffId = req.staffId;
    if (!staffId) return res.status(401).json({ message: "Unauthorized" });

    const r = await pool.query(
      `
      SELECT
        s.id,
        s.full_name,
        s.email,
        s.role,
        s.phone,
        s.hospital_id,
        h.name AS hospital_name,
        h.city AS hospital_city
      FROM staff_accounts s
      JOIN hospitals h ON h.id = s.hospital_id
      WHERE s.id = $1
      LIMIT 1
      `,
      [staffId]
    );

    if ((r.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Staff not found" });
    }

    const u = r.rows[0];

    return res.json({
      id: u.id,
      name: u.full_name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      hospitalId: u.hospital_id,
      hospitalName: u.hospital_name,
      hospitalCity: u.hospital_city,
    });
  } catch (e) {
    console.error("STAFF ME ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});


// PATCH /api/staff/me
app.patch("/api/staff/me", requireStaffAuth, async (req: any, res) => {
  try {
    const staffId = req.staffId;
    const { fullName, role, phone } = req.body;

    if (!fullName || !role) {
      return res.status(400).json({ message: "Missing fullName or role" });
    }

    await pool.query(
      `
      UPDATE staff_accounts
      SET full_name = $2,
          role = $3,
          phone = $4,
          updated_at = NOW()
      WHERE id = $1
      `,
      [staffId, String(fullName).trim(), String(role).trim(), phone ? String(phone).trim() : null]
    );

    // Return fresh view (same shape as /api/staff/me)
    const r = await pool.query(
      `
      SELECT
        s.id,
        s.full_name,
        s.email,
        s.role,
        s.phone,
        s.hospital_id,
        h.name AS hospital_name,
        h.city AS hospital_city
      FROM staff_accounts s
      JOIN hospitals h ON h.id = s.hospital_id
      WHERE s.id = $1
      LIMIT 1
      `,
      [staffId]
    );

    if ((r.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Staff not found" });
    }

    const u = r.rows[0];

    return res.json({
      staff: {
        id: u.id,
        name: u.full_name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        hospitalId: u.hospital_id,
        hospitalName: u.hospital_name,
        hospitalCity: u.hospital_city,
      },
    });
  } catch (e) {
    console.error("STAFF UPDATE ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/staff/me/change-password
app.post("/api/staff/me/change-password", requireStaffAuth, async (req: any, res) => {
  try {
    const staffId = req.staffId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Missing currentPassword or newPassword" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    // Get existing hash
    const r = await pool.query(
      `SELECT password_hash FROM staff_accounts WHERE id = $1 LIMIT 1`,
      [staffId]
    );

    if ((r.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Staff not found" });
    }

    const { password_hash } = r.rows[0];

    const ok = await bcrypt.compare(String(currentPassword), String(password_hash));
    if (!ok) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(String(newPassword), 12);

    await pool.query(
      `
      UPDATE staff_accounts
      SET password_hash = $2,
          updated_at = NOW()
      WHERE id = $1
      `,
      [staffId, newHash]
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error("STAFF CHANGE PASSWORD ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

//Healthcheck

let startupStatus: "starting" | "ready" | "degraded" = "starting";

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, status: startupStatus });
});
//app.get("/health", (_req, res) => res.status(200).send("ok"));


/**
 * Staff: list patients (minimal fields)
 * GET /api/patients
 */
app.get("/api/patients", async (_req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        p.id as patient_id,
        p.email,
        pp.first_name,
        pp.last_name,
        pp.dob,
        pp.health_card,
        pp.phone_number
      FROM patients p
      LEFT JOIN patient_profiles pp ON pp.patient_id = p.id
      ORDER BY p.id DESC
      LIMIT 200
      `
    );

    return res.status(200).json(result.rows);
  } catch (e: any) {
    console.error("PATIENTS LIST ERROR:", e);
    return res.status(500).json({ message: e?.message || String(e), code: e?.code });
  }
});

/**
 * Staff: create or update a pending patient intake record
 * POST /api/staff/patients/intake
 */
app.post("/api/staff/patients/intake", async (req, res) => {
  const {
    email,
    fullName,
    dob,
    phoneNumber,
    homeAddress,
    insurance,
    healthCard,
    bloodType,
    allergies,
    medicalConditions,
  } = req.body ?? {};

  if (!email) {
    return res.status(400).json({ message: "Missing email" });
  }

  // basic DOB validation (optional)
  if (dob && typeof dob === "string" && Number.isNaN(Date.parse(dob))) {
    return res.status(400).json({ message: "Invalid dob. Use YYYY-MM-DD" });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO pending_patient_intake (
        email, full_name, dob, phone_number, home_address, insurance,
        health_card, blood_type, allergies, medical_conditions
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (email)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        dob = EXCLUDED.dob,
        phone_number = EXCLUDED.phone_number,
        home_address = EXCLUDED.home_address,
        insurance = EXCLUDED.insurance,
        health_card = EXCLUDED.health_card,
        blood_type = EXCLUDED.blood_type,
        allergies = EXCLUDED.allergies,
        medical_conditions = EXCLUDED.medical_conditions
      RETURNING *;
      `,
      [
        String(email).toLowerCase(),
        fullName ?? null,
        dob ?? null,
        phoneNumber ?? null,
        homeAddress ?? null,
        insurance ?? null,
        healthCard ?? null,
        bloodType ?? null,
        allergies ?? null,
        medicalConditions ?? null,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (e: any) {
    console.error("PENDING INTAKE ERROR:", e);
    return res.status(500).json({ message: e?.message || String(e), code: e?.code });
  }
});


app.post("/api/auth/signup", async (req, res) => {
  const { email, password, acceptedTerms, hospitalId } = req.body;


  if (!email || !password) {
    return res.status(400).json({ message: "Missing email or password" });
  }
  if (!acceptedTerms) {
    return res.status(400).json({ message: "You must accept the terms" });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  try {
  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  const emailNorm = String(email).toLowerCase();

  // 1) create patient account
  const result = await pool.query(
    `INSERT INTO patients (id, email, password_hash, terms_accepted_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, email`,
    [id, emailNorm, passwordHash]
  );
  await pool.query(
  `
  INSERT INTO patient_profiles (patient_id)
  VALUES ($1::uuid)
  ON CONFLICT (patient_id) DO NOTHING
  `,
  [id]
);

  // ✅ connect patient to chosen hospital (so booking/staff list works)
if (hospitalId) {
  const h = await pool.query(
    `SELECT 1 FROM hospitals WHERE id = $1::uuid`,
    [hospitalId]
  );

  if ((h.rowCount ?? 0) === 0) {
    return res.status(400).json({ message: "Invalid hospitalId" });
  }

  await pool.query(
    `
    INSERT INTO patient_hospital_connections (id, patient_id, hospital_id, connected_at)
    VALUES (gen_random_uuid(), $1::uuid, $2::uuid, NOW())
    ON CONFLICT (patient_id, hospital_id) DO NOTHING
    `,
    [id, hospitalId]
  );
}


  // 2) check for pending intake created by staff
  const intakeRes = await pool.query(
    `SELECT *
     FROM pending_patient_intake
     WHERE email = $1
     LIMIT 1`,
    [emailNorm]
  );

  if ((intakeRes.rowCount ?? 0) > 0) {
    const intake = intakeRes.rows[0];

    // Split full name safely (no funky SQL string parsing)
    const full = String(intake.full_name ?? "").trim();
    const parts = full ? full.split(/\s+/) : [];
    const firstName = parts.length ? parts[0] : null;
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;

    // 3) upsert patient profile from pending intake
    await pool.query(
  `
  INSERT INTO patient_profiles (
    patient_id,
    first_name,
    last_name,
    dob,
    phone_number,
    home_address,
    insurance,
    health_card
  )
  VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8)
  ON CONFLICT (patient_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    dob = EXCLUDED.dob,
    phone_number = EXCLUDED.phone_number,
    home_address = EXCLUDED.home_address,
    insurance = EXCLUDED.insurance,
    health_card = EXCLUDED.health_card
  `,
  [
    id, // ✅ patient_id must be the patient's UUID
    firstName,
    lastName,
    intake.dob ?? null,
    intake.phone_number ?? null,
    intake.home_address ?? null,
    intake.insurance ?? null,
    intake.health_card ?? null,
  ]
);



    // 4) upsert emergency profile from pending intake
    // NOTE: This assumes your emergency_profiles has blood_type, allergies, medical_conditions columns (as in your backend code).
    // 4) upsert emergency profile from pending intake
    console.log("RUNNING EMERGENCY UPSERT (line ~900)");

await pool.query(
  `
  INSERT INTO emergency_profiles (
    id, patient_id,
    share_personal_info, share_blood_type, share_allergies, share_medical_conditions,
    share_current_medications, share_emergency_contacts, share_advance_directives,
    blood_type, allergies, medical_conditions,
    updated_at
  )
  VALUES (
    $1::text, $2::uuid,
    true,true,true,true,
    true,true,false,
    $3,$4,$5,
    NOW()
  )
  ON CONFLICT (patient_id) DO UPDATE SET
  share_personal_info = true,
  share_blood_type = true,
  share_allergies = true,
  share_medical_conditions = true,
  share_current_medications = true,
  share_emergency_contacts = true,
  share_advance_directives = false,
  blood_type = EXCLUDED.blood_type,
  allergies = EXCLUDED.allergies,
  medical_conditions = EXCLUDED.medical_conditions,
  updated_at = NOW()

  `,
  [
    `ep_${id}`, // text id (since emergency_profiles.id is TEXT)
    id,         // patient_id (UUID)
    intake.blood_type ?? null,
    intake.allergies ?? null,
    intake.medical_conditions ?? null,
  ]
);


    // 5) remove pending intake once applied
    await pool.query(
      `DELETE FROM pending_patient_intake WHERE email = $1`,
      [emailNorm]
    );
  }

  //return res.status(201).json(result.rows[0]); // { id, email }
  const created = result.rows[0]; // { id, email }
  const token = signPatientToken({ id: created.id, email: created.email });

  return res.status(201).json({
    ...created, // keeps {id, email} exactly the same
    token,      // adds token (new)
  });

} catch (e: any) {
  if (e?.code === "23505") {
    return res.status(409).json({ message: "Email already in use" });
  }

  console.error("SIGNUP ERROR:", e);
  return res.status(500).json({
    message: e?.message || String(e),
    code: e?.code,
  });
}

});

/**
 * Google sign-in/sign-up for patients.
 * POST /api/auth/google
 * body: { credential: string, acceptedTerms?: boolean, hospitalId?: string }
 */
app.post("/api/auth/google", async (req, res) => {
  const { credential, acceptedTerms, hospitalId } = req.body ?? {};

  if (!credential || typeof credential !== "string") {
    return res.status(400).json({ message: "Missing Google credential" });
  }

  try {
    const payload = await verifyGoogleCredential(credential);
    const googleSub = String(payload.sub);
    const emailNorm = String(payload.email).trim().toLowerCase();
    const googleFirstName = payload.given_name ? String(payload.given_name).trim() : "";
    const googleLastName = payload.family_name ? String(payload.family_name).trim() : "";

    // 1) Existing Google-linked patient
    const linked = await pool.query(
      `
      SELECT p.id, p.email
      FROM oauth_identities oi
      JOIN patients p ON p.id = oi.patient_id
      WHERE oi.provider = 'google'
        AND oi.provider_sub = $1
        AND oi.patient_id IS NOT NULL
      LIMIT 1
      `,
      [googleSub]
    );

    if ((linked.rowCount ?? 0) > 0) {
      const user = linked.rows[0];
      return res.status(200).json({
        id: user.id,
        email: user.email,
        token: signPatientToken({ id: user.id, email: user.email }),
        authProvider: "google",
        firstName: googleFirstName,
        lastName: googleLastName,
      });
    }

    // 2) Existing patient by email -> link Google account
    const existing = await pool.query(
      `SELECT id, email FROM patients WHERE email = $1 LIMIT 1`,
      [emailNorm]
    );

    let patientId: string;
    let patientEmail: string;

    if ((existing.rowCount ?? 0) > 0) {
      patientId = existing.rows[0].id;
      patientEmail = existing.rows[0].email;
    } else {
      // 3) New patient account through Google
      if (!acceptedTerms) {
        return res.status(400).json({
          message: "You must accept the terms to create a new account",
        });
      }

      patientId = randomUUID();
      patientEmail = emailNorm;
      const passwordHash = await bcrypt.hash(randomUUID(), 12);

      await pool.query(
        `
        INSERT INTO patients (id, email, password_hash, terms_accepted_at)
        VALUES ($1, $2, $3, NOW())
        `,
        [patientId, patientEmail, passwordHash]
      );

      await pool.query(
        `
        INSERT INTO patient_profiles (patient_id)
        VALUES ($1::uuid)
        ON CONFLICT (patient_id) DO NOTHING
        `,
        [patientId]
      );

      if (hospitalId) {
        const h = await pool.query(
          `SELECT 1 FROM hospitals WHERE id = $1::uuid`,
          [hospitalId]
        );

        if ((h.rowCount ?? 0) === 0) {
          return res.status(400).json({ message: "Invalid hospitalId" });
        }

        await pool.query(
          `
          INSERT INTO patient_hospital_connections (id, patient_id, hospital_id, connected_at)
          VALUES (gen_random_uuid(), $1::uuid, $2::uuid, NOW())
          ON CONFLICT (patient_id, hospital_id) DO NOTHING
          `,
          [patientId, hospitalId]
        );
      }
    }

    // Link Google identity (idempotent)
    await pool.query(
      `
      INSERT INTO oauth_identities (
        id,
        provider,
        provider_sub,
        email,
        email_verified,
        patient_id,
        created_at,
        updated_at
      )
      VALUES (gen_random_uuid(), 'google', $1, $2, true, $3::uuid, NOW(), NOW())
      ON CONFLICT (provider, provider_sub)
      DO UPDATE SET
        email = EXCLUDED.email,
        email_verified = EXCLUDED.email_verified,
        patient_id = EXCLUDED.patient_id,
        updated_at = NOW()
      `,
      [googleSub, patientEmail, patientId]
    );

    return res.status(200).json({
      id: patientId,
      email: patientEmail,
      token: signPatientToken({ id: patientId, email: patientEmail }),
      authProvider: "google",
      firstName: googleFirstName,
      lastName: googleLastName,
    });
  } catch (e: any) {
    console.error("PATIENT GOOGLE AUTH ERROR:", e);
    if (e?.code === "42P01") {
      return res.status(500).json({
        message: "Missing oauth_identities table. Apply Google auth migration first.",
      });
    }
    return res.status(500).json({
      message: e?.message || "Google authentication failed",
      code: e?.code,
    });
  }
});

/**
 * Sign in existing patient
 * POST /api/auth/signin
 */

// POST /api/staff/auth/signin
app.post("/api/auth/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing email or password" });
  }

  const emailNorm = String(email).trim().toLowerCase();

  try {
    const result = await pool.query(
      `
      SELECT id, email, password_hash
      FROM patients
      WHERE email = $1
      LIMIT 1
      `,
      [emailNorm]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(String(password), user.password_hash);

    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signPatientToken({ id: user.id, email: user.email });

    return res.status(200).json({
      id: user.id,
      email: user.email,
      token,
    });
  } catch (e: any) {
    console.error("PATIENT SIGNIN ERROR:", e);
    return res.status(500).json({
      message: e?.message || String(e),
      code: e?.code,
    });
  }
});




// ------------------- STAFF AUTH -------------------

// POST /api/staff/auth/signup
app.post("/api/staff/auth/signup", async (req, res) => {
  const { hospitalId, fullName, email, password, role, phone } = req.body;

  if (!hospitalId || !fullName || !email || !password || !role) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  const id = randomUUID();
  const emailNorm = String(email).trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  // demo code for now (later: send via email)
  const code = String(Math.floor(100000 + Math.random() * 900000));

  try {
    // Ensure hospital exists (nice error instead of FK fail)
    const h = await pool.query(`SELECT id FROM hospitals WHERE id = $1 LIMIT 1`, [hospitalId]);
    if ((h.rowCount ?? 0) === 0) {
      return res.status(400).json({ message: "Invalid hospital selected" });
    }

    // 1) Create staff account
    await pool.query(
      `
      INSERT INTO staff_accounts (
        id, hospital_id, full_name, email, role, phone, password_hash, email_verified, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,false, NOW(), NOW())
      `,
      [id, hospitalId, fullName, emailNorm, role, phone ?? null, passwordHash]
    );

    // 2) Create email verification (10 min expiry)
    // Your email_verifications table references staff_accounts via staff_id FK
    await pool.query(
      `
      INSERT INTO email_verifications (staff_id, code, expires_at, created_at)
      VALUES ($1, $2, NOW() + interval '10 minutes', NOW())
      `,
      [id, code]
    );

    return res.status(201).json({
      staffId: id,
      email: emailNorm,
      verification: { code }, // demo only
    });
  } catch (e: any) {
    if (e?.code === "23505") {
      return res.status(409).json({ message: "Email already in use" });
    }
    console.error("STAFF SIGNUP ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/staff/auth/verify-email
app.post("/api/staff/auth/verify-email", async (req, res) => {
  const { staffId, code } = req.body;

  if (!staffId || !code) {
    return res.status(400).json({ message: "Missing staffId or code" });
  }

  try {
    const vr = await pool.query(
      `
      SELECT code, expires_at
      FROM email_verifications
      WHERE staff_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [staffId]
    );

    if ((vr.rowCount ?? 0) === 0) {
      return res.status(400).json({ message: "No verification code found" });
    }

    const row = vr.rows[0];
    if (String(row.code) !== String(code)) {
      return res.status(400).json({ message: "Invalid code" });
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: "Code expired" });
    }

    await pool.query(`UPDATE staff_accounts SET email_verified = true, updated_at = NOW() WHERE id = $1`, [staffId]);
    await pool.query(`DELETE FROM email_verifications WHERE staff_id = $1`, [staffId]);

    return res.json({ ok: true });
  } catch (e: any) {
    console.error("STAFF VERIFY ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * Google sign-in/sign-up for staff.
 * POST /api/staff/auth/google
 * body: { credential: string, hospitalId?: string, fullName?: string, role?: string, phone?: string }
 */
app.post("/api/staff/auth/google", async (req, res) => {
  const { credential, hospitalId, fullName, role, phone } = req.body ?? {};

  if (!credential || typeof credential !== "string") {
    return res.status(400).json({ message: "Missing Google credential" });
  }

  try {
    const payload = await verifyGoogleCredential(credential);
    const googleSub = String(payload.sub);
    const emailNorm = String(payload.email).trim().toLowerCase();

    // 1) Existing Google-linked staff
    const linked = await pool.query(
      `
      SELECT
        s.id,
        s.full_name,
        s.email,
        s.role,
        s.phone,
        s.hospital_id,
        h.name AS hospital_name,
        h.city AS hospital_city
      FROM oauth_identities oi
      JOIN staff_accounts s ON s.id = oi.staff_id
      JOIN hospitals h ON h.id = s.hospital_id
      WHERE oi.provider = 'google'
        AND oi.provider_sub = $1
        AND oi.staff_id IS NOT NULL
      LIMIT 1
      `,
      [googleSub]
    );

    let staff: any = null;

    if ((linked.rowCount ?? 0) > 0) {
      staff = linked.rows[0];
    } else {
      // 2) Existing staff by email -> link Google identity
      const existing = await pool.query(
        `
        SELECT
          s.id,
          s.full_name,
          s.email,
          s.role,
          s.phone,
          s.hospital_id,
          h.name AS hospital_name,
          h.city AS hospital_city
        FROM staff_accounts s
        JOIN hospitals h ON h.id = s.hospital_id
        WHERE s.email = $1
        LIMIT 1
        `,
        [emailNorm]
      );

      if ((existing.rowCount ?? 0) > 0) {
        staff = existing.rows[0];
      } else {
        // 3) New staff account requires hospital + profile fields
        if (!hospitalId || !fullName || !role) {
          return res.status(400).json({
            message: "hospitalId, fullName, and role are required for first-time Google staff signup",
          });
        }

        const h = await pool.query(
          `SELECT id, name, city FROM hospitals WHERE id = $1::uuid LIMIT 1`,
          [hospitalId]
        );
        if ((h.rowCount ?? 0) === 0) {
          return res.status(400).json({ message: "Invalid hospital selected" });
        }

        const staffId = randomUUID();
        const passwordHash = await bcrypt.hash(randomUUID(), 12);

        await pool.query(
          `
          INSERT INTO staff_accounts (
            id, hospital_id, full_name, email, role, phone, password_hash, email_verified, created_at, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,true, NOW(), NOW())
          `,
          [
            staffId,
            hospitalId,
            String(fullName).trim(),
            emailNorm,
            String(role).trim(),
            phone ? String(phone).trim() : null,
            passwordHash,
          ]
        );

        staff = {
          id: staffId,
          full_name: String(fullName).trim(),
          email: emailNorm,
          role: String(role).trim(),
          phone: phone ? String(phone).trim() : null,
          hospital_id: h.rows[0].id,
          hospital_name: h.rows[0].name,
          hospital_city: h.rows[0].city,
        };
      }

      await pool.query(
        `
        INSERT INTO oauth_identities (
          id,
          provider,
          provider_sub,
          email,
          email_verified,
          staff_id,
          created_at,
          updated_at
        )
        VALUES (gen_random_uuid(), 'google', $1, $2, true, $3::uuid, NOW(), NOW())
        ON CONFLICT (provider, provider_sub)
        DO UPDATE SET
          email = EXCLUDED.email,
          email_verified = EXCLUDED.email_verified,
          staff_id = EXCLUDED.staff_id,
          updated_at = NOW()
        `,
        [googleSub, staff.email, staff.id]
      );
    }

    const token = signStaffToken({
      id: staff.id,
      email: staff.email,
      hospitalId: staff.hospital_id,
    });

    return res.status(200).json({
      token,
      staff: {
        id: staff.id,
        name: staff.full_name,
        email: staff.email,
        role: staff.role,
        phone: staff.phone,
        hospitalId: staff.hospital_id,
        hospitalName: staff.hospital_name,
        hospitalCity: staff.hospital_city,
      },
      authProvider: "google",
    });
  } catch (e: any) {
    console.error("STAFF GOOGLE AUTH ERROR:", e);
    if (e?.code === "42P01") {
      return res.status(500).json({
        message: "Missing oauth_identities table. Apply Google auth migration first.",
      });
    }
    return res.status(500).json({
      message: e?.message || "Google authentication failed",
      code: e?.code,
    });
  }
});

/**
 * Sign in existing staff
 * POST /api/staff/auth/signin
 */
app.post("/api/staff/auth/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing email or password" });
  }

  try {
    const emailNorm = String(email).toLowerCase().trim();

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.full_name,
        s.email,
        s.role,
        s.phone,
        s.password_hash,
        s.email_verified,
        s.hospital_id,
        h.name AS hospital_name,
        h.city AS hospital_city
      FROM staff_accounts s
      JOIN hospitals h ON h.id = s.hospital_id
      WHERE s.email = $1
      LIMIT 1
      `,
      [emailNorm]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const staff = result.rows[0];

    // 🔒 Require verified email
    if (!staff.email_verified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    const ok = await bcrypt.compare(String(password), staff.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // ✅ JWT GENERATED HERE (THIS IS THE LINE YOU ASKED ABOUT)
    // const token = jwt.sign(
    //   {
    //     sub: staff.id,
    //     role: "staff",
    //     hospitalId: staff.hospital_id,
    //   },
    //   process.env.JWT_SECRET!,
    //   { expiresIn: "7d" }
    // );
    // IMPORTANT: include provider_id (or hospital_id) in the token
const token = signStaffToken({
  id: staff.id,
  email: staff.email,
  hospitalId: staff.hospital_id,
});


// return res.json({
//   token,
//   staff: {
//     id: staff.id,
//     email: staff.email,
//     providerId: staff.provider_id,
//     hospitalId: staff.hospital_id,
//   },
// });
    return res.status(200).json({
      token,
      staff: {
        id: staff.id,
        name: staff.full_name,
        email: staff.email,
        role: staff.role,
        phone: staff.phone,
        hospitalId: staff.hospital_id,
        hospitalName: staff.hospital_name,
        hospitalCity: staff.hospital_city,
      },
    });
  } catch (e: any) {
    console.error("STAFF SIGNIN ERROR:", e);
    return res.status(500).json({
      message: e?.message || "Server error",
      code: e?.code,
    });
  }
});


/**
 * Create/Update patient profile (upsert)
 * PUT /api/patients/:patientId/profile
 */
/**
 * Create/Update patient profile (upsert)
 * PUT /api/patients/:patientId/profile
 */
app.put("/api/patients/:patientId/profile", async (req, res) => {
  const { patientId } = req.params;

  const {
    firstName,
    lastName,
    dob,
    healthCard,
    phoneNumber,
    homeAddress,
    mailingAddress,
    mailingSameAsHome,
  } = req.body ?? {};

  if (!patientId) return res.status(400).json({ message: "Missing patientId" });

  if (dob && typeof dob === "string" && Number.isNaN(Date.parse(dob))) {
    return res.status(400).json({ message: "Invalid dob. Use YYYY-MM-DD" });
  }

  const normalizePostal = (v: any) =>
    typeof v === "string" ? v.trim().toUpperCase() : null;

  try {
    const exists = await pool.query(`SELECT 1 FROM patients WHERE id = $1`, [patientId]);
    if (exists.rowCount === 0) return res.status(404).json({ message: "Patient not found" });

    const mailSame = typeof mailingSameAsHome === "boolean" ? mailingSameAsHome : true;

    const h = homeAddress ?? {};
    const m = mailingAddress ?? {};

    const result = await pool.query(
      `INSERT INTO patient_profiles (
         id, patient_id,
         first_name, last_name, dob, health_card, phone_number,
         home_address_line1, home_address_line2, home_city, home_province, home_postal_code,
         mailing_same_as_home,
         mailing_address_line1, mailing_address_line2, mailing_city, mailing_province, mailing_postal_code
       )
       VALUES (
         $1::text, $2::uuid,
         $3, $4, $5, $6, $7,
         $8, $9, $10, $11, $12,
         $13,
         $14, $15, $16, $17, $18
       )
       ON CONFLICT (patient_id)
       DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         dob = EXCLUDED.dob,
         health_card = EXCLUDED.health_card,
         phone_number = EXCLUDED.phone_number,

         home_address_line1 = EXCLUDED.home_address_line1,
         home_address_line2 = EXCLUDED.home_address_line2,
         home_city = EXCLUDED.home_city,
         home_province = EXCLUDED.home_province,
         home_postal_code = EXCLUDED.home_postal_code,

         mailing_same_as_home = EXCLUDED.mailing_same_as_home,
         mailing_address_line1 = EXCLUDED.mailing_address_line1,
         mailing_address_line2 = EXCLUDED.mailing_address_line2,
         mailing_city = EXCLUDED.mailing_city,
         mailing_province = EXCLUDED.mailing_province,
         mailing_postal_code = EXCLUDED.mailing_postal_code
       RETURNING
         patient_id, first_name, last_name, dob, health_card, phone_number,
         home_address_line1, home_address_line2, home_city, home_province, home_postal_code,
         mailing_same_as_home,
         mailing_address_line1, mailing_address_line2, mailing_city, mailing_province, mailing_postal_code,
         created_at`,
      [
        randomUUID(), // $1 -> patient_profiles.id (TEXT column, UUID string is fine)
        patientId,    // $2 -> patient_profiles.patient_id (UUID)

        firstName ?? null,        // $3
        lastName ?? null,         // $4
        dob ?? null,              // $5
        healthCard ?? null,       // $6
        phoneNumber ?? null,      // $7

        h.line1 ?? null,          // $8
        h.line2 ?? null,          // $9
        h.city ?? null,           // $10
        (h.province ?? "ON") || "ON", // $11
        normalizePostal(h.postalCode), // $12

        mailSame,                 // $13

        (mailSame ? h.line1 : m.line1) ?? null, // $14
        (mailSame ? h.line2 : m.line2) ?? null, // $15
        (mailSame ? h.city : m.city) ?? null,   // $16
        ((mailSame ? h.province : m.province) ?? "ON") || "ON", // $17
        normalizePostal(mailSame ? h.postalCode : m.postalCode), // $18
      ]
    );

    return res.status(200).json(result.rows[0]);
  } catch (e: any) {
    console.error("PROFILE UPSERT ERROR:", e);
    return res.status(500).json({ message: e?.message || String(e), code: e?.code });
  }
});


/**
 * Get patient + profile info
 * GET /api/patients/:patientId/profile
 */
app.get("/api/patients/:id/profile", async (req, res) => {
  try {
    const patientId = String(req.params.id);

    // optional but highly recommended (prevents "invalid uuid" crashes)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      return res.status(400).json({ message: "Invalid patient id format" });
    }

    const result = await pool.query(
      `
      WITH pid AS (SELECT $1::uuid AS id)
      SELECT
        p.id as patient_id,
        p.email,

        pp.first_name,
        pp.last_name,
        pp.dob,
        pp.health_card,
        pp.phone_number,

        pp.home_address_line1,
        pp.home_address_line2,
        pp.home_city,
        pp.home_province,
        pp.home_postal_code,

        pp.mailing_same_as_home,
        pp.mailing_address_line1,
        pp.mailing_address_line2,
        pp.mailing_city,
        pp.mailing_province,
        pp.mailing_postal_code,

        ep.share_personal_info,
        ep.share_blood_type,
        ep.share_allergies,
        ep.share_medical_conditions,
        ep.share_current_medications,
        ep.share_emergency_contacts,
        ep.share_advance_directives,

        ep.blood_type,
        ep.allergies,
        ep.medical_conditions,
        ep.current_medications,
        ep.emergency_contacts,
        ep.dnr_status,
        ep.living_will,
        ep.emergency_contact_full_name,
        ep.emergency_contact_relationship,
        ep.emergency_contact_phone,

        ep.created_at as emergency_created_at,
        ep.updated_at as emergency_updated_at,
        pp.created_at as profile_created_at

      FROM pid
      JOIN patients p ON p.id = pid.id
      LEFT JOIN patient_profiles pp ON pp.patient_id = p.id
      LEFT JOIN emergency_profiles ep ON ep.patient_id = p.id
      LIMIT 1
      `,
      [patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const profileRow = result.rows[0];
    const summaryResult = await pool.query(
      `
      SELECT vitals, conditions, allergies, blood_type, current_medications, emergency_contacts, advance_directives, immunizations, family_history, updated_at
      FROM patient_health_summaries
      WHERE patient_id = $1::uuid
      LIMIT 1
      `,
      [patientId]
    );

    const summary = summaryResult.rowCount ? normalizeHealthSummaryRow(summaryResult.rows[0]) : null;

    return res.status(200).json({
      ...profileRow,
      blood_type: summary?.bloodType ?? profileRow.blood_type ?? null,
      allergies: summarizeHealthSummaryText(summary?.allergies, "allergy") || profileRow.allergies || null,
      medical_conditions: summarizeHealthSummaryText(summary?.conditions, "condition") || profileRow.medical_conditions || null,
      current_medications:
        (summary?.currentMedications || []).length > 0
          ? summary?.currentMedications.join(", ")
          : profileRow.current_medications || null,
      emergency_contacts:
        (summary?.emergencyContacts || []).length > 0 ? summary?.emergencyContacts : profileRow.emergency_contacts,
      dnr_status:
        typeof summary?.advanceDirectives?.dnrStatus === "string" && summary.advanceDirectives.dnrStatus.trim()
          ? summary.advanceDirectives.dnrStatus
          : profileRow.dnr_status || null,
      living_will:
        typeof summary?.advanceDirectives?.livingWill === "string" && summary.advanceDirectives.livingWill.trim()
          ? summary.advanceDirectives.livingWill
          : profileRow.living_will || null,
    });
  } catch (e: any) {
    console.error("PATIENT PROFILE ERROR:", e);
    return res.status(500).json({ message: e?.message || String(e), code: e?.code });
  }
});





/**
 * Get emergency profile (personal info + toggles + emergency data)
 * GET /api/patients/:patientId/emergency-profile
 */
app.get("/api/patients/:patientId/emergency-profile", async (req, res) => {
  const { patientId } = req.params;

  try {
    const personal = await pool.query(
      `SELECT
         p.id as patient_id,
         p.email,
         pp.first_name,
         pp.last_name,
         pp.dob,
         pp.health_card,
         pp.blood_type,
         pp.current_medications
       FROM patients p
       LEFT JOIN patient_profiles pp ON pp.patient_id = p.id
       WHERE p.id = $1`,
      [patientId]
    );

    if (personal.rowCount === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const emergency = await pool.query(
      `SELECT
        share_personal_info,
         share_blood_type,
         share_allergies,
         share_medical_conditions,
         share_current_medications,
         share_emergency_contacts,
         share_advance_directives,
         emergency_contact_full_name,
         emergency_contact_relationship,
         emergency_contact_phone,
         dnr_status,
         living_will,
         updated_at
       FROM emergency_profiles
       WHERE patient_id = $1`,
      [patientId]
    );

    const defaults = {
      share_personal_info: true,
      share_blood_type: true,
      share_allergies: true,
      share_medical_conditions: true,
      share_current_medications: true,
      share_emergency_contacts: true,
      share_advance_directives: false,
      emergency_contact_full_name: null,
      emergency_contact_relationship: null,
      emergency_contact_phone: null,
      dnr_status: null,
      living_will: null,
      updated_at: null,
    };

    const summaryResult = await pool.query(
      `
      SELECT vitals, conditions, allergies, blood_type, current_medications, emergency_contacts, advance_directives, immunizations, family_history, updated_at
      FROM patient_health_summaries
      WHERE patient_id = $1::uuid
      LIMIT 1
      `,
      [patientId]
    );

    const summary = summaryResult.rowCount ? normalizeHealthSummaryRow(summaryResult.rows[0]) : null;
    const pData = personal.rows[0];
    const eData = emergency.rowCount ? emergency.rows[0] : defaults;

    return res.status(200).json({
      ...pData,
      ...eData,
      blood_type: summary?.bloodType ?? pData.blood_type ?? null,
      allergies: summarizeHealthSummaryText(summary?.allergies, "allergy"),
      medical_conditions: summarizeHealthSummaryText(summary?.conditions, "condition"),
      current_medications:
        Array.isArray(summary?.currentMedications) && summary.currentMedications.length > 0
          ? summary.currentMedications.join("\n")
          : pData.current_medications ?? null,
      emergency_contact_full_name:
        summary?.emergencyContacts?.[0]?.name || eData.emergency_contact_full_name || null,
      emergency_contact_relationship:
        summary?.emergencyContacts?.[0]?.relationship || eData.emergency_contact_relationship || null,
      emergency_contact_phone:
        summary?.emergencyContacts?.[0]?.phone || eData.emergency_contact_phone || null,
      dnr_status:
        typeof summary?.advanceDirectives?.dnrStatus === "string" && summary.advanceDirectives.dnrStatus.trim()
          ? summary.advanceDirectives.dnrStatus
          : eData.dnr_status,
      living_will:
        typeof summary?.advanceDirectives?.livingWill === "string" && summary.advanceDirectives.livingWill.trim()
          ? summary.advanceDirectives.livingWill
          : eData.living_will,
      health_summary_updated_at: summary?.updatedAt || null,
    });
  } catch (e: any) {
    console.error("EMERGENCY GET ERROR:", e);
    return res.status(500).json({ message: e?.message || String(e), code: e?.code });
  }
});

/**
 * Upsert emergency profile (toggles + emergency data)
 * PUT /api/patients/:patientId/emergency-profile
 */
/**
 * Upsert emergency profile (toggles + emergency data)
 * PUT /api/patients/:patientId/emergency-profile
 */
app.put("/api/patients/:patientId/emergency-profile", async (req, res) => {
  const { patientId } = req.params;

  const {
    sharePersonalInfo,
    shareBloodType,
    shareAllergies,
    shareMedicalConditions,
    shareChronicConditions,
    shareCurrentMedications,
    shareEmergencyContacts,
    shareAdvanceDirectives,
    bloodType,
    allergies,
    medicalConditions,
    currentMedications,
    emergencyContactFullName,
    emergencyContactRelationship,
    emergencyContactPhone,
    dnrStatus,
    livingWill,
  } = req.body ?? {};

  try {
    const exists = await pool.query(`SELECT 1 FROM patients WHERE id = $1`, [patientId]);
    if (exists.rowCount === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const result = await pool.query(
      `INSERT INTO emergency_profiles (
         id, patient_id,
         share_personal_info, share_blood_type, share_allergies, share_medical_conditions,
         share_current_medications, share_emergency_contacts, share_advance_directives,
         blood_type, allergies, medical_conditions, current_medications,
         emergency_contact_full_name, emergency_contact_relationship, emergency_contact_phone,
         dnr_status, living_will,
         updated_at
       )
       VALUES (
         $1::text, $2::uuid,
         $3,$4,$5,$6,$7,$8,$9,
         $10,$11,$12,$13,
         $14,$15,$16,
         $17,$18,
         NOW()
       )
       ON CONFLICT (patient_id)
       DO UPDATE SET
         share_personal_info = EXCLUDED.share_personal_info,
         share_blood_type = EXCLUDED.share_blood_type,
         share_allergies = EXCLUDED.share_allergies,
         share_medical_conditions = EXCLUDED.share_medical_conditions,
         share_current_medications = EXCLUDED.share_current_medications,
         share_emergency_contacts = EXCLUDED.share_emergency_contacts,
         share_advance_directives = EXCLUDED.share_advance_directives,
         blood_type = EXCLUDED.blood_type,
         allergies = EXCLUDED.allergies,
         medical_conditions = EXCLUDED.medical_conditions,
         current_medications = EXCLUDED.current_medications,
         emergency_contact_full_name = EXCLUDED.emergency_contact_full_name,
         emergency_contact_relationship = EXCLUDED.emergency_contact_relationship,
         emergency_contact_phone = EXCLUDED.emergency_contact_phone,
         dnr_status = EXCLUDED.dnr_status,
         living_will = EXCLUDED.living_will,
         updated_at = NOW()
       RETURNING *`,
      [
        randomUUID(), // $1 -> emergency_profiles.id (TEXT column, UUID string is fine)
        patientId,    // $2 -> emergency_profiles.patient_id (UUID)

        //!!sharePersonalInfo,        // $3
        true,                       // $3 always share personal info
        !!shareBloodType,           // $4
        !!shareAllergies,           // $5
        !!(shareMedicalConditions ?? shareChronicConditions),   // $6
        !!shareCurrentMedications,  // $7
        !!shareEmergencyContacts,   // $8
        !!shareAdvanceDirectives,   // $9

        bloodType ?? null,              // $10
        allergies ?? null,              // $11
        medicalConditions ?? null,      // $12
        currentMedications ?? null,     // $13

        emergencyContactFullName ?? null,         // $14
        emergencyContactRelationship ?? null,     // $15
        emergencyContactPhone ?? null,            // $16

        dnrStatus ?? null,            // $17
        livingWill ?? null,           // $18
      ]
    );

    return res.status(200).json(result.rows[0]);
  } catch (e: any) {
    console.error("EMERGENCY UPSERT ERROR:", e);
    return res.status(500).json({ message: e?.message || String(e), code: e?.code });
  }
});


/**
 * Create/Get emergency link for wallet/QR/NFC
 * GET /api/patients/:patientId/emergency-link
 */
app.get("/api/patients/:patientId/emergency-link", async (req, res) => {
  const { patientId } = req.params;
  if (!patientId) return res.status(400).json({ message: "Missing patientId" });

  try {
    const exists = await pool.query(`SELECT 1 FROM patients WHERE id = $1`, [patientId]);
    if (exists.rowCount === 0) return res.status(404).json({ message: "Patient not found" });

    // Try existing active token
    const existing = await pool.query(
      `SELECT token
       FROM emergency_links
       WHERE patient_id = $1 AND revoked = false
       ORDER BY created_at DESC
       LIMIT 1`,
      [patientId]
    );

    let token = existing.rowCount ? existing.rows[0].token : null;

    if (!token) {
      token = makeUrlSafeToken();
      await pool.query(
        `INSERT INTO emergency_links (id, patient_id, token)
         VALUES ($1, $2, $3)`,
        [randomUUID(), patientId, token]
      );
    }

    const url = `${FRONTEND_BASE_URL}/e/${token}`;
    return res.status(200).json({ token, url });
  } catch (e: any) {
    console.error("EMERGENCY LINK ERROR:", e);
    return res.status(500).json({ message: e?.message || String(e), code: e?.code });
  }
});

/**
 * Public emergency fetch by token (no login)
 * GET /api/emergency/by-token/:token
 */
app.get("/api/emergency/by-token/:token", async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ message: "Missing token" });

  try {
    const link = await pool.query(
      `SELECT patient_id, revoked
       FROM emergency_links
       WHERE token = $1
       LIMIT 1`,
      [token]
    );

    if (link.rowCount === 0) return res.status(404).json({ message: "Invalid or expired link" });
    if (link.rows[0].revoked) return res.status(403).json({ message: "Link revoked" });

    const patientId = link.rows[0].patient_id;

    // Personal info
    const personal = await pool.query(
      `SELECT
         p.id as patient_id,
         p.email,
         pp.first_name,
         pp.last_name,
         pp.dob,
         pp.health_card,
         pp.blood_type,
         pp.current_medications
       FROM patients p
       LEFT JOIN patient_profiles pp ON pp.patient_id = p.id
       WHERE p.id = $1`,
      [patientId]
    );

    if (personal.rowCount === 0) return res.status(404).json({ message: "Patient not found" });

    // Emergency sharing + emergency-only fields
    const emergency = await pool.query(
      `SELECT
         share_personal_info,
         share_blood_type,
         share_allergies,
         share_medical_conditions,
         share_current_medications,
         share_emergency_contacts,
         share_advance_directives,
         emergency_contact_full_name,
         emergency_contact_relationship,
         emergency_contact_phone,
         dnr_status,
         living_will,
         updated_at
       FROM emergency_profiles
       WHERE patient_id = $1`,
      [patientId]
    );

    const defaults = {
      share_personal_info: true,
      share_blood_type: true,
      share_allergies: true,
      share_medical_conditions: true,
      share_current_medications: true,
      share_emergency_contacts: true,
      share_advance_directives: false,
      emergency_contact_full_name: null,
      emergency_contact_relationship: null,
      emergency_contact_phone: null,
      dnr_status: null,
      living_will: null,
      updated_at: null,
    };

    const summaryResult = await pool.query(
      `
      SELECT vitals, conditions, allergies, blood_type, current_medications, emergency_contacts, advance_directives, immunizations, family_history, updated_at
      FROM patient_health_summaries
      WHERE patient_id = $1::uuid
      LIMIT 1
      `,
      [patientId]
    );

    const summary = summaryResult.rowCount ? normalizeHealthSummaryRow(summaryResult.rows[0]) : null;
    const eData = emergency.rowCount ? emergency.rows[0] : defaults;
    const pData = personal.rows[0];

    // Respect toggles: if share_personal_info is false, blank personal fields
    const personalOut = eData.share_personal_info
      ? { ...pData }
      : {
          ...pData,
          first_name: null,
          last_name: null,
          dob: null,
          health_card: null,
          email: null,
        };

    return res.status(200).json({
      ...personalOut,
      ...eData,
      blood_type: summary?.bloodType ?? pData.blood_type ?? null,
      allergies: summarizeHealthSummaryText(summary?.allergies, "allergy"),
      medical_conditions: summarizeHealthSummaryText(summary?.conditions, "condition"),
      current_medications:
        Array.isArray(summary?.currentMedications) && summary.currentMedications.length > 0
          ? summary.currentMedications.join("\n")
          : pData.current_medications ?? null,
      emergency_contact_full_name:
        summary?.emergencyContacts?.[0]?.name || eData.emergency_contact_full_name || null,
      emergency_contact_relationship:
        summary?.emergencyContacts?.[0]?.relationship || eData.emergency_contact_relationship || null,
      emergency_contact_phone:
        summary?.emergencyContacts?.[0]?.phone || eData.emergency_contact_phone || null,
      dnr_status:
        typeof summary?.advanceDirectives?.dnrStatus === "string" && summary.advanceDirectives.dnrStatus.trim()
          ? summary.advanceDirectives.dnrStatus
          : eData.dnr_status,
      living_will:
        typeof summary?.advanceDirectives?.livingWill === "string" && summary.advanceDirectives.livingWill.trim()
          ? summary.advanceDirectives.livingWill
          : eData.living_will,
      health_summary_updated_at: summary?.updatedAt || null,
    });
  } catch (e: any) {
    console.error("EMERGENCY BY TOKEN ERROR:", e);
    return res.status(500).json({ message: e?.message || String(e), code: e?.code });
  }
});

app.get("/api/hospitals", async (_req, res) => {
  const result = await pool.query(
    "SELECT id, name, city FROM hospitals ORDER BY name ASC"
  );
  res.json(result.rows);
});

/**
 * Provider directory (public)
 * For now: hospitals only, and ID matches staff hospital_id.
 */
app.get("/api/providers", async (_req, res) => {
  try {
    const r = await pool.query(
      `
      SELECT
        id,
        name,
        'Hospital'::text AS type
      FROM hospitals
      ORDER BY name ASC
      `
    );

    return res.json({ providers: r.rows });
  } catch (e: any) {
    console.error("PROVIDERS DIRECTORY ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});


app.get("/api/patients/me/providers", requirePatient, async (req: any, res) => {
  try {
    const patientId = req.patientId;

    const r = await pool.query(
      `
      SELECT
        h.id,
        h.name,
        'Hospital'::text AS type,
        c.connected_at
      FROM patient_provider_connections c
      JOIN hospitals h ON h.id = c.provider_id
      WHERE c.patient_id = $1
        AND c.disconnected_at IS NULL
      ORDER BY c.connected_at DESC
      `,
      [patientId]
    );

    return res.json({ providers: r.rows });
  } catch (e: any) {
    console.error("MY PROVIDERS ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});


/**
 * Connect provider (history-preserving)
 * POST /api/patients/me/providers
 * body: { providerId: string, source?: 'signup' | 'settings' }
 */
app.post("/api/patients/me/providers", requirePatient, async (req: any, res) => {
  const patientId = req.patientId;
  const { providerId } = req.body ?? {};

  if (!providerId) {
    return res.status(400).json({ message: "Missing providerId" });
  }

  try {
    // Ensure provider exists (in hospitals for MVP)
    const h = await pool.query(`SELECT id FROM hospitals WHERE id = $1 LIMIT 1`, [providerId]);
    if ((h.rowCount ?? 0) === 0) {
      return res.status(400).json({ message: "Invalid providerId" });
    }

    // If already connected (active), do nothing (idempotent)
    const existing = await pool.query(
      `
      SELECT id
      FROM patient_provider_connections
      WHERE patient_id = $1
        AND provider_id = $2
        AND disconnected_at IS NULL
      LIMIT 1
      `,
      [patientId, providerId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      return res.json({ ok: true, alreadyConnected: true });
    }

    // 1) Create staff/provider-level connection
    await pool.query(
      `
      INSERT INTO patient_provider_connections (id, patient_id, provider_id, created_at)
      VALUES ($1, $2, $3, NOW())
      `,
      [randomUUID(), patientId, providerId]
    );

    // 2) ALSO create hospital-level connection (so booking/staff list works)
    // If your patient_hospital_connections has a unique constraint on (patient_id, hospital_id),
    // ON CONFLICT will work. If not, I give you a fallback below.
    await pool.query(
      `
      INSERT INTO patient_hospital_connections (id, patient_id, hospital_id, connected_at)
      VALUES ($1, $2::uuid, $3::uuid, NOW())
      ON CONFLICT (patient_id, hospital_id) DO NOTHING
      `,
      [randomUUID(), patientId, providerId]
    );

    return res.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/patients/me/providers ERROR:", e);
    return res.status(500).json({ message: e?.message || "Failed to connect provider" });
  }
});


/**
 * Disconnect provider (ends future access; keeps history)
 * DELETE /api/patients/me/providers/:providerId
 */
app.delete("/api/patients/me/providers/:providerId", requirePatient, async (req: any, res) => {
  const patientId = req.patientId;
  const providerId = String(req.params.providerId);

  try {
    const result = await pool.query(
      `
      UPDATE patient_provider_connections
      SET disconnected_at = NOW()
      WHERE patient_id = $1::uuid
        AND provider_id = $2::uuid
        AND disconnected_at IS NULL
      `,
      [patientId, providerId]
    );

    // Idempotent: if already disconnected, still return ok
    return res.json({ ok: true, updated: result.rowCount });
  } catch (e: any) {
    console.error("DELETE /api/patients/me/providers/:providerId ERROR:", e);
    return res.status(500).json({ message: e?.message || "Failed to disconnect provider" });
  }
});

// ------------------- STAFF SETTINGS / PROFILE -------------------
/**
 * Staff: list CONNECTED + DISCONNECTED patients for the staff's hospital (provider)
 * GET /api/staff/patients/connected
 *
 * Active connection = disconnected_at IS NULL
 * Inactive = disconnected_at IS NOT NULL
 */
// GET /api/staff/patients/connected
// GET /api/staff/patients/connected
app.get("/api/staff/patients/connected", requireStaffAuth, async (req: any, res) => {
  try {
    const hospitalId = req.staffHospitalId as string;

    if (!hospitalId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const r = await pool.query(
      `
      WITH latest AS (
        SELECT DISTINCT ON (c.patient_id)
          c.patient_id,
          c.connected_at,
          c.disconnected_at
        FROM patient_provider_connections c
        WHERE c.provider_id = $1::uuid
        ORDER BY c.patient_id, c.connected_at DESC
      )
      SELECT
        p.id AS patient_id,
        p.email,
        pp.first_name,
        pp.last_name,
        pp.dob,
        pp.health_card,
        pp.phone_number,
        latest.connected_at,
        latest.disconnected_at,
        CASE
          WHEN latest.disconnected_at IS NULL THEN 'Active'
          ELSE 'Inactive'
        END AS connection_status
      FROM latest
      JOIN patients p ON p.id = latest.patient_id
      LEFT JOIN patient_profiles pp ON pp.patient_id = p.id
      ORDER BY latest.connected_at DESC
      LIMIT 200
      `,
      [hospitalId]
    );

    return res.json(r.rows);
  } catch (e: any) {
    console.error("CONNECTED PATIENTS ERROR:", e);
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});




// GET /api/patients/me/messages/conversations
app.get("/api/patients/me/messages/conversations", requirePatient, async (req: any, res) => {
  try {
    const patientId = req.patientId as string;

    const r = await pool.query(
      `
      SELECT
        c.id,
        c.provider_id,
        h.name AS provider_name,
        c.staff_id,
        sa.full_name AS staff_name,
        sa.role AS staff_role,

        c.last_message_preview,
        c.last_message_at,

        -- unread for patient: staff messages after patient_last_read_at
        (
          SELECT COUNT(*)
          FROM message_items mi
          WHERE mi.conversation_id = c.id
            AND mi.sender_type = 'staff'
            AND mi.created_at > COALESCE(c.patient_last_read_at, '1970-01-01'::timestamptz)
        )::int AS unread_count
      FROM message_conversations c
      JOIN hospitals h ON h.id = c.provider_id
      JOIN staff_accounts sa ON sa.id = c.staff_id
      WHERE c.patient_id = $1::uuid
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      `,
      [patientId]
    );

    return res.json({ conversations: r.rows });
  } catch (e: any) {
    console.error("PATIENT LIST CONVERSATIONS ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET /api/patients/me/providers/:providerId/staff
app.get("/api/patients/me/providers/:providerId/staff", requirePatient, async (req: any, res) => {
  try {
    const patientId = req.patientId as string;
    const providerId = String(req.params.providerId);

    // Must be actively connected to view staff list
    const ok = await ensureActiveConnection(patientId, providerId);
    if (!ok) return res.status(403).json({ message: "Not connected to this provider" });

    const r = await pool.query(
      `
      SELECT
        id,
        full_name,
        role
      FROM staff_accounts
      WHERE hospital_id = $1::uuid
        AND email_verified = true
      ORDER BY full_name ASC
      `,
      [providerId]
    );

    return res.json({ staff: r.rows });
  } catch (e: any) {
    console.error("PATIENT PROVIDER STAFF LIST ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/patients/me/messages/conversations/start
// body: { providerId, staffId }
app.post("/api/patients/me/messages/conversations/start", requirePatient, async (req: any, res) => {
  try {
    const patientId = req.patientId as string;
    const { providerId, staffId } = req.body ?? {};

    if (!providerId || !staffId) {
      return res.status(400).json({ message: "Missing providerId or staffId" });
    }

    // Must be actively connected to start
    const ok = await ensureActiveConnection(patientId, providerId);
    if (!ok) return res.status(403).json({ message: "You are not actively connected to this provider" });

    // Ensure staff belongs to provider org
    const staffCheck = await pool.query(
      `SELECT 1 FROM staff_accounts WHERE id = $1::uuid AND hospital_id = $2::uuid LIMIT 1`,
      [staffId, providerId]
    );
    if ((staffCheck.rowCount ?? 0) === 0) {
      return res.status(400).json({ message: "Invalid staff for this provider" });
    }

    // Upsert conversation (enforced by unique constraint)
    const conv = await pool.query(
      `
      INSERT INTO message_conversations (patient_id, provider_id, staff_id, created_at, updated_at)
      VALUES ($1::uuid, $2::uuid, $3::uuid, NOW(), NOW())
      ON CONFLICT (patient_id, provider_id, staff_id)
      DO UPDATE SET updated_at = NOW()
      RETURNING id
      `,
      [patientId, providerId, staffId]
    );

    return res.json({ conversationId: conv.rows[0].id });
  } catch (e: any) {
    console.error("PATIENT START CONVERSATION ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// GET /api/patients/me/messages/conversations/:id/messages
app.get("/api/patients/me/messages/conversations/:id/messages", requirePatient, async (req: any, res) => {
  try {
    const patientId = req.patientId as string;
    const conversationId = String(req.params.id);

    const owner = await pool.query(
      `SELECT provider_id FROM message_conversations WHERE id = $1::uuid AND patient_id = $2::uuid LIMIT 1`,
      [conversationId, patientId]
    );
    if ((owner.rowCount ?? 0) === 0) return res.status(404).json({ message: "Conversation not found" });

    const msgs = await pool.query(
      `
      SELECT id, sender_type, body, created_at
      FROM message_items
      WHERE conversation_id = $1::uuid
      ORDER BY created_at ASC
      `,
      [conversationId]
    );

    return res.json({ messages: msgs.rows });
  } catch (e: any) {
    console.error("PATIENT GET MESSAGES ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/patients/me/messages/conversations/:id/messages
// body: { body: string }
app.post("/api/patients/me/messages/conversations/:id/messages", requirePatient, async (req: any, res) => {
  try {
    const patientId = req.patientId as string;
    const conversationId = String(req.params.id);
    const { body } = req.body ?? {};

    if (!body || !String(body).trim()) {
      return res.status(400).json({ message: "Missing message body" });
    }

    const conv = await pool.query(
      `
      SELECT provider_id
      FROM message_conversations
      WHERE id = $1::uuid AND patient_id = $2::uuid
      LIMIT 1
      `,
      [conversationId, patientId]
    );
    if ((conv.rowCount ?? 0) === 0) return res.status(404).json({ message: "Conversation not found" });

    const providerId = conv.rows[0].provider_id;

    // Must be actively connected to send
    const ok = await ensureActiveConnection(patientId, providerId);
    if (!ok) return res.status(403).json({ message: "Messaging disabled: provider connection is inactive" });

    const msg = await pool.query(
      `
      INSERT INTO message_items (conversation_id, sender_type, sender_patient_id, body)
      VALUES ($1::uuid, 'patient', $2::uuid, $3)
      RETURNING id, sender_type, body, created_at
      `,
      [conversationId, patientId, String(body).trim()]
    );

    await pool.query(
      `
      UPDATE message_conversations
      SET last_message_preview = $2,
          last_message_at = NOW(),
          updated_at = NOW()
      WHERE id = $1::uuid
      `,
      [conversationId, String(body).trim().slice(0, 200)]
    );

    return res.status(201).json({ message: msg.rows[0] });
  } catch (e: any) {
    console.error("PATIENT SEND MESSAGE ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/patients/me/messages/conversations/:id/read
app.post("/api/patients/me/messages/conversations/:id/read", requirePatient, async (req: any, res) => {
  try {
    const patientId = req.patientId as string;
    const conversationId = String(req.params.id);

    const r = await pool.query(
      `
      UPDATE message_conversations
      SET patient_last_read_at = NOW(), updated_at = NOW()
      WHERE id = $1::uuid AND patient_id = $2::uuid
      `,
      [conversationId, patientId]
    );

    if ((r.rowCount ?? 0) === 0) return res.status(404).json({ message: "Conversation not found" });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("PATIENT MARK READ ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

//staf routes
// GET /api/staff/messages/conversations
// GET /api/staff/messages/conversations
app.get("/api/staff/messages/conversations", requireStaffAuth, async (req: any, res) => {
  try {
    const staffId = req.staffId as string;
    const hospitalId = req.staffHospitalId as string;

    const r = await pool.query(
      `
      SELECT
        c.id,
        c.patient_id,
        p.email AS patient_email,

        COALESCE(
          NULLIF(TRIM(pp.first_name || ' ' || pp.last_name), ''),
          p.email,
          'Patient'
        ) AS patient_name,

        c.last_message_preview,
        c.last_message_at,

        (
          SELECT COUNT(*)
          FROM medication_change_requests mcr
          WHERE mcr.conversation_id = c.id
            AND mcr.status = 'open'
        )::int AS open_medication_change_count,

        (
          SELECT COUNT(*)
          FROM medication_refill_requests mrr
          WHERE mrr.conversation_id = c.id
            AND mrr.status = 'open'
        )::int AS open_medication_refill_count,

        (
          SELECT mcr.id
          FROM medication_change_requests mcr
          WHERE mcr.conversation_id = c.id
            AND mcr.status = 'open'
          ORDER BY mcr.created_at DESC
          LIMIT 1
        ) AS active_medication_change_request_id,

        (
          SELECT mcr.medication_id
          FROM medication_change_requests mcr
          WHERE mcr.conversation_id = c.id
            AND mcr.status = 'open'
          ORDER BY mcr.created_at DESC
          LIMIT 1
        ) AS active_medication_change_medication_id,

        (
          SELECT mrr.id
          FROM medication_refill_requests mrr
          WHERE mrr.conversation_id = c.id
            AND mrr.status = 'open'
          ORDER BY mrr.created_at DESC
          LIMIT 1
        ) AS active_medication_refill_request_id,

        (
          SELECT mrr.medication_id
          FROM medication_refill_requests mrr
          WHERE mrr.conversation_id = c.id
            AND mrr.status = 'open'
          ORDER BY mrr.created_at DESC
          LIMIT 1
        ) AS active_medication_refill_medication_id,

        (
          SELECT COUNT(*)
          FROM message_items mi
          WHERE mi.conversation_id = c.id
            AND mi.sender_type = 'patient'
            AND mi.created_at > COALESCE(c.staff_last_read_at, '1970-01-01'::timestamptz)
        )::int AS unread_count
      FROM message_conversations c
      JOIN patients p ON p.id = c.patient_id
      LEFT JOIN patient_profiles pp ON pp.patient_id = p.id
      WHERE c.staff_id = $1
        AND c.provider_id = $2
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      `,
      [staffId, hospitalId]
    );

    return res.json({ conversations: r.rows });
  } catch (e: any) {
    console.error("STAFF LIST CONVERSATIONS ERROR:", e);
    return res.status(500).json({ message: e?.message || "Server error" });
  }
});


// GET /api/staff/messages/conversations/:id/messages
app.get("/api/staff/messages/conversations/:id/messages", requireStaffAuth, async (req: any, res) => {
  try {
    const staffId = req.staffId as string;
    const hospitalId = req.staffHospitalId as string;
    const conversationId = String(req.params.id);

    const ok = await pool.query(
      `
      SELECT 1
      FROM message_conversations
      WHERE id = $1::uuid
        AND staff_id = $2::uuid
        AND provider_id = $3::uuid
      LIMIT 1
      `,
      [conversationId, staffId, hospitalId]
    );
    if ((ok.rowCount ?? 0) === 0) return res.status(404).json({ message: "Conversation not found" });

    const msgs = await pool.query(
      `
      SELECT id, sender_type, body, created_at
      FROM message_items
      WHERE conversation_id = $1::uuid
      ORDER BY created_at ASC
      `,
      [conversationId]
    );

    return res.json({ messages: msgs.rows });
  } catch (e: any) {
    console.error("STAFF GET MESSAGES ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/staff/messages/conversations/:id/messages
app.post("/api/staff/messages/conversations/:id/messages", requireStaffAuth, async (req: any, res) => {
  try {
    const staffId = req.staffId as string;
    const hospitalId = req.staffHospitalId as string;
    const conversationId = String(req.params.id);
    const { body } = req.body ?? {};

    if (!body || !String(body).trim()) {
      return res.status(400).json({ message: "Missing message body" });
    }

    const conv = await pool.query(
      `
      SELECT patient_id, provider_id
      FROM message_conversations
      WHERE id = $1::uuid
        AND staff_id = $2::uuid
        AND provider_id = $3::uuid
      LIMIT 1
      `,
      [conversationId, staffId, hospitalId]
    );
    if ((conv.rowCount ?? 0) === 0) return res.status(404).json({ message: "Conversation not found" });

    const msg = await pool.query(
      `
      INSERT INTO message_items (conversation_id, sender_type, sender_staff_id, body)
      VALUES ($1::uuid, 'staff', $2::uuid, $3)
      RETURNING id, sender_type, body, created_at
      `,
      [conversationId, staffId, String(body).trim()]
    );

    await pool.query(
      `
      UPDATE message_conversations
      SET last_message_preview = $2,
          last_message_at = NOW(),
          updated_at = NOW()
      WHERE id = $1::uuid
      `,
      [conversationId, String(body).trim().slice(0, 200)]
    );

    return res.status(201).json({ message: msg.rows[0] });
  } catch (e: any) {
    console.error("STAFF SEND MESSAGE ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /api/staff/messages/conversations/:id/read
app.post("/api/staff/messages/conversations/:id/read", requireStaffAuth, async (req: any, res) => {
  try {
    const staffId = req.staffId as string;
    const hospitalId = req.staffHospitalId as string;
    const conversationId = String(req.params.id);

    const r = await pool.query(
      `
      UPDATE message_conversations
      SET staff_last_read_at = NOW(), updated_at = NOW()
      WHERE id = $1::uuid
        AND staff_id = $2::uuid
        AND provider_id = $3::uuid
      `,
      [conversationId, staffId, hospitalId]
    );

    if ((r.rowCount ?? 0) === 0) return res.status(404).json({ message: "Conversation not found" });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("STAFF MARK READ ERROR:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/staff/medication-change-requests/summary", requireStaffAuth, async (req: any, res) => {
  try {
    const hospitalId = req.staffHospitalId as string;

    const result = await pool.query(
      `
      SELECT COUNT(*)::int AS open_count
      FROM medication_change_requests
      WHERE hospital_id = $1::uuid
        AND status = 'open'
      `,
      [hospitalId]
    );

    return res.json({ openCount: Number(result.rows[0]?.open_count || 0) });
  } catch (e: any) {
    console.error("GET /api/staff/medication-change-requests/summary error:", e);
    return res.status(500).json({ message: e?.message || "Failed to load medication change requests" });
  }
});

app.get("/api/staff/medication-refill-requests/summary", requireStaffAuth, async (req: any, res) => {
  try {
    const hospitalId = req.staffHospitalId as string;

    const result = await pool.query(
      `
      SELECT COUNT(*)::int AS open_count
      FROM medication_refill_requests
      WHERE hospital_id = $1::uuid
        AND status = 'open'
      `,
      [hospitalId]
    );

    return res.json({ openCount: Number(result.rows[0]?.open_count || 0) });
  } catch (e: any) {
    console.error("GET /api/staff/medication-refill-requests/summary error:", e);
    return res.status(500).json({ message: e?.message || "Failed to load medication refill requests" });
  }
});

app.post("/api/staff/medication-change-requests/:id/resolve", requireStaffAuth, async (req: any, res) => {
  try {
    const hospitalId = req.staffHospitalId as string;
    const staffId = req.staffId as string;
    const requestId = String(req.params.id || "");

    if (!isUuid(requestId)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const staffResult = await pool.query(
      `
      SELECT full_name
      FROM staff_accounts
      WHERE id = $1::uuid
      LIMIT 1
      `,
      [staffId]
    );

    const result = await pool.query(
      `
      UPDATE medication_change_requests
      SET status = 'resolved',
          resolved_at = NOW(),
          resolved_by_staff_id = $3::uuid,
          updated_at = NOW()
      WHERE id = $1::uuid
        AND hospital_id = $2::uuid
        AND status = 'open'
      RETURNING id, conversation_id
      `,
      [requestId, hospitalId, staffId]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Medication change request not found" });
    }

    const doctorName = String(staffResult.rows[0]?.full_name || "Your provider").trim();
    const resolutionMessage = `Dr. ${doctorName} has resolved the medication change request.`;
    const conversationId = String(result.rows[0].conversation_id || "");

    if (conversationId) {
      await pool.query(
        `
        INSERT INTO message_items (conversation_id, sender_type, sender_staff_id, body)
        VALUES ($1::uuid, 'staff', $2::uuid, $3)
        `,
        [conversationId, staffId, resolutionMessage]
      );

      await pool.query(
        `
        UPDATE message_conversations
        SET last_message_preview = $2,
            last_message_at = NOW(),
            updated_at = NOW()
        WHERE id = $1::uuid
        `,
        [conversationId, resolutionMessage.slice(0, 200)]
      );
    }

    return res.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/staff/medication-change-requests/:id/resolve error:", e);
    return res.status(500).json({ message: e?.message || "Failed to resolve medication change request" });
  }
});

app.post("/api/staff/medication-refill-requests/:id/resolve", requireStaffAuth, async (req: any, res) => {
  try {
    const hospitalId = req.staffHospitalId as string;
    const staffId = req.staffId as string;
    const requestId = String(req.params.id || "");
    const resolution = String(req.body?.resolution || "").trim().toLowerCase();
    const resolutionNote = String(req.body?.resolutionNote || "").trim();

    if (!isUuid(requestId)) {
      return res.status(400).json({ message: "Invalid request id" });
    }
    if (!["approved", "denied"].includes(resolution)) {
      return res.status(400).json({ message: "Invalid resolution" });
    }

    const staffResult = await pool.query(
      `
      SELECT full_name
      FROM staff_accounts
      WHERE id = $1::uuid
      LIMIT 1
      `,
      [staffId]
    );

    const result = await pool.query(
      `
      UPDATE medication_refill_requests
      SET status = $4,
          resolution_note = NULLIF($5, ''),
          resolved_at = NOW(),
          resolved_by_staff_id = $3::uuid,
          updated_at = NOW()
      WHERE id = $1::uuid
        AND hospital_id = $2::uuid
        AND status = 'open'
      RETURNING id, conversation_id, medication_id
      `,
      [requestId, hospitalId, staffId, resolution, resolutionNote]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Medication refill request not found" });
    }

    const doctorName = String(staffResult.rows[0]?.full_name || "Your provider").trim();
    const actionText = resolution === "approved" ? "approved" : "denied";
    const resolutionMessage = resolutionNote
      ? `Dr. ${doctorName} has ${actionText} the refill request. Note: ${resolutionNote}`
      : `Dr. ${doctorName} has ${actionText} the refill request.`;
    const conversationId = String(result.rows[0].conversation_id || "");

    if (conversationId) {
      await pool.query(
        `
        INSERT INTO message_items (conversation_id, sender_type, sender_staff_id, body)
        VALUES ($1::uuid, 'staff', $2::uuid, $3)
        `,
        [conversationId, staffId, resolutionMessage]
      );

      await pool.query(
        `
        UPDATE message_conversations
        SET last_message_preview = $2,
            last_message_at = NOW(),
            updated_at = NOW()
        WHERE id = $1::uuid
        `,
        [conversationId, resolutionMessage.slice(0, 200)]
      );
    }

    const fresh = await fetchMedicationById(String(result.rows[0].medication_id || ""));
    return res.json({ ok: true, resolution, medication: fresh ? mapMedicationRow(fresh) : null });
  } catch (e: any) {
    console.error("POST /api/staff/medication-refill-requests/:id/resolve error:", e);
    return res.status(500).json({ message: e?.message || "Failed to resolve medication refill request" });
  }
});

// GET patient appointments (scoped to logged-in patient)
// GET /api/patient/appointments?status=upcoming|today|completed|cancelled|all
// GET /api/patient/appointments?status=upcoming|today|completed|cancelled|all
// GET patient appointments (logged-in patient)
// GET /api/patient/appointments?status=upcoming|today|completed|cancelled|all
// GET patient appointments (logged-in patient)
app.get("/api/patient/appointments", requirePatientAuth, async (req, res) => {
  try {
    const patientId = req.user?.id;
    if (!patientId) return res.status(401).json({ message: "Unauthorized" });

    const status = String(req.query.status || "upcoming");

    const whereStatus =
      status === "all"
        ? ""
        : status === "completed"
        ? "AND a.status = 'Completed'"
        : status === "cancelled"
        ? "AND a.status = 'Cancelled'"
        : status === "today"
        ? "AND a.start_time::date = CURRENT_DATE AND a.status NOT IN ('Cancelled')"
        : // upcoming (default)
          "AND a.start_time >= NOW() AND a.status NOT IN ('Completed','Cancelled')";

    const result = await pool.query(
  `
  SELECT
    a.id,
    a.patient_id,
    a.staff_id,
    a.hospital_id,
    a.provider_name,
    a.specialty,
    a.type,
    a.start_time,
    a.status,
    a.notes,
    h.name AS hospital_name
  FROM appointments a
  LEFT JOIN hospitals h ON h.id = a.hospital_id
  WHERE a.patient_id = $1
  ${whereStatus}
  ORDER BY a.start_time DESC
  `,
  [patientId]
);

const mapped = result.rows.map((r) => ({
  id: String(r.id),
  patientId: String(r.patient_id),
  staffId: r.staff_id ? String(r.staff_id) : null,
  hospitalId: String(r.hospital_id),

  // who the patient is seeing (staff name)
  providerName: r.provider_name,

  // hospital display name
  hospitalName: r.hospital_name ?? null,

  appointmentType: r.specialty,   // "Consultation" etc
  visitMode: r.type,              // "in-person" | "virtual" | "phone"
  startTime: r.start_time,
  status: r.status,
  notes: r.notes ?? "",
}));

return res.json({ appointments: mapped });

  } catch (err: any) {
    console.error("GET /api/patient/appointments failed:", err);
    return res.status(500).json({ message: err?.message || "Failed to fetch appointments" });
  }
});






// Cancel an appointment
// PATCH /api/appointments/:id/cancel
app.patch("/api/appointments/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE appointments
      SET status = 'Cancelled'
      WHERE id = $1
      RETURNING id, status
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /api/appointments/:id/cancel failed:", err);
    return res.status(500).json({ message: "Failed to cancel appointment" });
  }
});

// GET connected providers for a patient
// GET /api/patient/providers?patientId=<uuid>
// GET /api/patient/providers?patientId=...
// GET connected providers (hospitals) for a patient
// GET /api/patient/providers?patientId=...
app.get("/api/patient/providers", async (req, res) => {
  try {
    const patientId = req.query.patientId as string;
    if (!patientId) {
      return res.status(400).json({ message: "Missing patientId" });
    }

    const result = await pool.query(
      `
      SELECT
        h.id AS id,
        h.name AS name,
        'Hospital' AS type,
        MIN(phc.connected_at) AS connected_at
      FROM patient_hospital_connections phc
      JOIN hospitals h ON h.id = phc.hospital_id
      WHERE phc.patient_id = $1
        AND phc.disconnected_at IS NULL
      GROUP BY h.id, h.name
      ORDER BY h.name ASC;
      `,
      [patientId]
    );

    res.json({ providers: result.rows });
  } catch (err) {
    console.error("GET /api/patient/providers failed:", err);
    res.status(500).json({ message: "Failed to fetch providers" });
  }
});




// GET staff in a connected provider (hospital) for a patient
// GET /api/patient/provider-staff?patientId=<uuid>&providerId=<hospital_uuid>
app.get("/api/patient/provider-staff", async (req, res) => {
  try {
    const patientId = req.query.patientId as string;
    const providerId = req.query.providerId as string; // this is hospitals.id

    if (!patientId || !providerId) {
      return res.status(400).json({ message: "Missing patientId or providerId" });
    }

    // Enforce: patient must be connected to this hospital via at least one active staff connection
    const access = await pool.query(
      `
      SELECT 1
      FROM patient_provider_connections ppc
      JOIN staff_accounts s ON s.id = ppc.provider_id
      WHERE ppc.patient_id::uuid = $1::uuid
        AND ppc.disconnected_at IS NULL
        AND s.hospital_id = $2::uuid
      LIMIT 1;
      `,
      [patientId, providerId]
    );

    if ((access.rowCount ?? 0) === 0) {
      return res.status(403).json({ message: "You are not connected to this provider" });
    }

    // Return ALL staff in that hospital
    const staff = await pool.query(
      `
      SELECT
        s.id,
        s.full_name,
        s.role
      FROM staff_accounts s
      WHERE s.hospital_id = $1::uuid
      ORDER BY s.full_name;
      `,
      [providerId]
    );

    // Same shape as Messages expects:
    res.json({ staff: staff.rows });
  } catch (err) {
    console.error("GET /api/patient/provider-staff failed:", err);
    res.status(500).json({ message: "Failed to fetch provider staff" });
  }
});


// POST create appointment to a specific provider
// POST /api/patient/appointments
// POST create appointment to a specific provider
// POST /api/patient/appointments

// POST book appointment (patient)
// POST /api/patient/appointments
// POST /api/patient/appointments
// POST /api/patient/appointments
// Body expects: hospitalId (provider/hospital), staffId (chosen staff), startTime, appointmentType, visitMode, notes
app.post("/api/patient/appointments", requirePatientAuth, async (req, res) => {
  // return res.status(500).json({
  //   message: "NEW_PATIENT_APPT_ROUTE_HIT",
  //   marker: "NEW_PATIENT_APPT_ROUTE_HIT",
  //   body: req.body,
  //   user: req.user,
  // });
  console.log("BOOK APPT BODY:", req.body);
 console.log("BOOK APPT USER:", req.user);

  const patientId = req.user?.id;
  if (!patientId) return res.status(401).json({ message: "Unauthorized" });

  const {
    hospitalId,     // connected provider (hospital) id
    staffId,        // chosen staff_accounts.id
    startTime,      // ISO string
    appointmentType, // "Consultation" | "Lab Test" | etc (TEMP stored in specialty)
    visitMode,      // "in-person" | "virtual" | "phone" (TEMP stored in type)
    notes,
  } = req.body ?? {};

  if (!hospitalId || !staffId || !startTime || !appointmentType || !visitMode) {
    return res.status(400).json({
      message: "Missing hospitalId, staffId, startTime, appointmentType, or visitMode",
    });
  }

  try {
    // 1) Ensure patient is connected to this hospital (provider)
    const connected = await pool.query(
  `
  SELECT 1
  FROM patient_provider_connections
  WHERE patient_id = $1::uuid
    AND provider_id = $2::uuid
    AND disconnected_at IS NULL
  LIMIT 1
  `,
  [patientId, hospitalId]
);


    if ((connected.rowCount ?? 0) === 0) {
      return res.status(403).json({ message: "You are not connected to this provider" });
    }

    // 2) Make sure staff belongs to this hospital
    const staffRes = await pool.query(
      `
      SELECT s.id, s.full_name, s.role, s.hospital_id
      FROM staff_accounts s
      WHERE s.id = $1
      LIMIT 1
      `,
      [staffId]
    );

    if ((staffRes.rowCount ?? 0) === 0) {
      return res.status(400).json({ message: "Invalid staffId" });
    }

    const staff = staffRes.rows[0];

    if (String(staff.hospital_id) !== String(hospitalId)) {
      return res.status(403).json({ message: "Selected staff does not belong to this provider" });
    }

    // 3) Insert appointment
    const id = randomUUID();

    const insert = await pool.query(
      `
      INSERT INTO appointments (
        id, patient_id, staff_id, hospital_id,
        provider_name, specialty,
        start_time, type,
        status, notes, created_at
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,
        $7,$8,
        'Scheduled',$9, NOW()
      )
      RETURNING id
      `,
      [
        id,
        patientId,
        staffId,
        hospitalId,
        staff.full_name,          // provider_name (TEMP)
        appointmentType,          // TEMP stored in specialty
        startTime,
        visitMode,                // TEMP stored in type
        notes ?? null,
      ]
    );

    return res.status(201).json({ id: insert.rows[0].id });
  } catch (err: any) {
    console.error("POST /api/patient/appointments error:", err);
    return res.status(500).json({ message: err?.message || "Failed to create appointment" });
  }
});






// GET provider appointments
// GET /api/staff/appointments?staffId=<uuid>

// GET /api/staff/appointments
// GET /api/staff/appointments
// GET staff appointments (scoped to logged-in staff)
// GET /api/staff/appointments
app.get("/api/staff/appointments", requireStaffAuth, async (req: any, res) => {
  const staffId = req.staffId as string;

  if (!staffId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        a.id,
        a.patient_id,
        COALESCE(
          NULLIF(TRIM(pp.first_name || ' ' || pp.last_name), ''),
          p.email,
          'Patient'
        ) AS patient_name,
        a.start_time,
        a.type,
        a.status,
        a.notes
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      LEFT JOIN patient_profiles pp ON pp.patient_id = p.id
      WHERE a.staff_id = $1
      ORDER BY a.start_time ASC
      `,
      [staffId]
    );

    // IMPORTANT: use the SAME basis for date+time (local time), not UTC+local mixed
    const mapped = result.rows.map((row) => {
      const dt = new Date(row.start_time);

      const date = dt.toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
      const time = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      return {
      id: String(row.id),
      patientId: String(row.patient_id),
      patientName: row.patient_name,
      patientPhoto: null,
      startTime: new Date(row.start_time).toISOString(),
      type: row.type,       // mode
      status: row.status,
      notes: row.notes ?? "",
      appointmentType: row.type_or_specialty_here
     };

    });

    return res.json(mapped);
  } catch (err: any) {
    console.error("GET /api/staff/appointments error:", err);
    return res.status(500).json({ message: err?.message || "Failed to fetch appointments" });
  }
});






// PATCH /api/staff/appointments/:id/status
app.patch("/api/staff/appointments/:id/status", requireStaffAuth, async (req: any, res) => {
  const staffId = req.staffId as string;
  const { id } = req.params;
  const { status } = req.body;

  if (!staffId) return res.status(401).json({ message: "Unauthorized" });
  if (!status) return res.status(400).json({ message: "Missing status" });

  const allowed = ["Scheduled", "Confirmed", "Completed", "Cancelled"];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const updated = await pool.query(
      `
      UPDATE appointments
      SET status = $1
      WHERE id = $2
        AND staff_id = $3
      RETURNING id
      `,
      [status, id, staffId]
    );

    if ((updated.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    return res.json({ message: "Status updated" });
  } catch (err: any) {
    console.error("PATCH /api/staff/appointments/:id/status error:", err);
    return res.status(500).json({ message: err?.message || "Failed to update status" });
  }
});




/**
 * Get hospitals the authenticated patient is connected to (hospital-level access)
 * GET /api/patient/hospitals
 */
app.get("/api/patient/hospitals", requirePatientAuth, async (req: any, res) => {
  try {
    const patientId = req.patientId as string;
    if (!patientId) return res.status(401).json({ message: "Unauthorized" });

    const result = await pool.query(
      `
      SELECT
        h.id AS "hospitalId",
        h.name AS "hospitalName",
        h.city AS "hospitalCity"
      FROM patient_hospital_connections phc
      JOIN hospitals h ON h.id = phc.hospital_id
      WHERE phc.patient_id = $1
        AND phc.disconnected_at IS NULL
      ORDER BY h.name ASC
      `,
      [patientId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/patient/hospitals failed:", err);
    res.status(500).json({ message: "Failed to fetch patient hospitals" });
  }
});


/**
 * Get all staff in a hospital the patient has access to
 * GET /api/patient/hospital-staff?patientId=...&hospitalId=...
 */
app.get("/api/patient/hospital-staff", async (req, res) => {
  try {
    const patientId = req.query.patientId as string;
    const hospitalId = req.query.hospitalId as string;

    if (!patientId) return res.status(400).json({ message: "Missing patientId" });
    if (!hospitalId) return res.status(400).json({ message: "Missing hospitalId" });

    const access = await pool.query(
      `
      SELECT 1
      FROM patient_hospital_connections
      WHERE patient_id = $1
        AND hospital_id = $2::uuid
        AND disconnected_at IS NULL
      LIMIT 1
      `,
      [patientId, hospitalId]
    );

    if ((access.rowCount ?? 0) === 0) {
      return res.status(403).json({ message: "You are not connected to this hospital" });
    }

    const staff = await pool.query(
      `
      SELECT
        s.id AS "providerId",
        s.full_name AS "fullName",
        s.email,
        s.role,
        s.hospital_id AS "hospitalId"
      FROM staff_accounts s
      WHERE s.hospital_id = $1::uuid
      ORDER BY s.full_name ASC
      `,
      [hospitalId]
    );

    // IMPORTANT: return [] if none; frontend already handles "No staff available"
    res.json(staff.rows);
  } catch (err) {
    console.error("GET /api/patient/hospital-staff failed:", err);
    res.status(500).json({ message: "Failed to fetch hospital staff" });
  }
});


// GET /api/patient/booking/providers?patientId=...
// GET /api/patient/booking/providers?patientId=...
// GET /api/patient/booking/providers?patientId=...
app.get("/api/patient/booking/providers", async (req, res) => {
  try {
    const patientId = req.query.patientId as string;
    if (!patientId) return res.status(400).json({ message: "Missing patientId" });

    const result = await pool.query(
      `
      SELECT
        h.id AS id,
        h.name AS name,
        'Hospital' AS type,
        MIN(phc.connected_at) AS connected_at
      FROM patient_hospital_connections phc
      JOIN hospitals h ON h.id = phc.hospital_id
      WHERE phc.patient_id = $1
        AND phc.disconnected_at IS NULL
      GROUP BY h.id, h.name
      ORDER BY h.name;
      `,
      [patientId]
    );

    res.json({ providers: result.rows });
  } catch (err) {
    console.error("GET /api/patient/booking/providers failed:", err);
    res.status(500).json({ message: "Failed to load booking providers" });
  }
});



// GET /api/patient/booking/provider-staff?providerId=...
// GET /api/patient/booking/provider-staff?patientId=...&providerId=...
// GET /api/patient/booking/provider-staff?patientId=...&providerId=...
app.get("/api/patient/booking/provider-staff", async (req, res) => {
  try {
    const patientId = req.query.patientId as string;
    const providerId = req.query.providerId as string; // hospitals.id

    if (!patientId || !providerId) {
      return res.status(400).json({ message: "Missing patientId or providerId" });
    }

    // hospital access check (hospital-based)
    const access = await pool.query(
  `
  SELECT 1
  FROM patient_provider_connections
  WHERE patient_id = $1::uuid
    AND provider_id = $2::uuid
    AND disconnected_at IS NULL
  LIMIT 1;
  `,
  [patientId, providerId]
);


    if ((access.rowCount ?? 0) === 0) {
      return res.status(403).json({ message: "You are not connected to this hospital" });
    }

    // Return ALL staff in that hospital (can be 0 rows => UI shows "No staff available")
    const staff = await pool.query(
      `
      SELECT
        s.id,
        s.full_name,
        s.role
      FROM staff_accounts s
      WHERE s.hospital_id = $1::uuid
      ORDER BY s.full_name;
      `,
      [providerId]
    );

    res.json({ staff: staff.rows });
  } catch (err) {
    console.error("GET /api/patient/booking/provider-staff failed:", err);
    res.status(500).json({ message: "Failed to load staff" });
  }
});




// ------------------- DOCUMENTS / RECORDS -------------------

app.get("/api/patient/records", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  const category = normalizeDocumentCategory(req.query.category);
  const source = String(req.query.source || "all").trim().toLowerCase();
  const verification = String(req.query.verification || "all").trim().toLowerCase();
  const search = String(req.query.search || "").trim();

  const values: any[] = [patientId];
  const where: string[] = [`d.patient_id = $1::uuid`];

  if (category) {
    values.push(category);
    where.push(`d.category = $${values.length}`);
  }

  if (source === "patient") {
    where.push(`d.uploaded_by_patient_id IS NOT NULL`);
  } else if (source === "provider") {
    where.push(`d.uploaded_by_staff_id IS NOT NULL`);
  }

  if (verification === "verified") {
    where.push(`d.verification_status IN ('provider_uploaded', 'provider_verified', 'organization_verified')`);
  } else if (verification === "pending") {
    where.push(`d.verification_status IN ('unverified', 'patient_uploaded')`);
  } else if (verification === "patient_uploaded") {
    where.push(`d.verification_status = 'patient_uploaded'`);
  }

  if (search) {
    values.push(`%${search}%`);
    where.push(`(
      d.title ILIKE $${values.length}
      OR COALESCE(d.subtype, '') ILIKE $${values.length}
      OR COALESCE(d.source_organization_name, '') ILIKE $${values.length}
      OR COALESCE(h.name, '') ILIKE $${values.length}
    )`);
  }

  try {
    const result = await pool.query(
      `
      ${documentSelectSql}
      WHERE ${where.join(" AND ")}
      ORDER BY d.service_date DESC NULLS LAST, d.created_at DESC
      `,
      values
    );

    return res.json({
      documents: result.rows.map((row) => mapDocumentRow(row, "patient")),
    });
  } catch (e: any) {
    console.error("GET /api/patient/records error:", e);
    return res.status(500).json({ message: e?.message || "Failed to fetch records" });
  }
});

app.get("/api/patient/records/:id", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  const documentId = String(req.params.id || "");
  if (!isUuid(documentId)) {
    return res.status(400).json({ message: "Invalid document id" });
  }

  try {
    const result = await pool.query(
      `
      ${documentSelectSql}
      WHERE d.id = $1::uuid
        AND d.patient_id = $2::uuid
      LIMIT 1
      `,
      [documentId, patientId]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Document not found" });
    }

    return res.json({ document: mapDocumentRow(result.rows[0], "patient") });
  } catch (e: any) {
    console.error("GET /api/patient/records/:id error:", e);
    return res.status(500).json({ message: e?.message || "Failed to fetch document" });
  }
});

app.post("/api/patient/records/upload", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  const {
    hospitalId,
    category,
    subtype,
    title,
    description,
    sourceOrganizationName,
    serviceDate,
    fileName,
    mimeType,
    fileSizeBytes,
    fileDataUrl,
  } = req.body ?? {};

  const normalizedCategory = normalizeDocumentCategory(category);
  if (!normalizedCategory || !title || !fileName || !fileDataUrl) {
    return res.status(400).json({ message: "category, title, fileName, and fileDataUrl are required" });
  }

  if (serviceDate && Number.isNaN(Date.parse(String(serviceDate)))) {
    return res.status(400).json({ message: "Invalid serviceDate" });
  }

  if (hospitalId && !isUuid(String(hospitalId))) {
    return res.status(400).json({ message: "Invalid hospitalId" });
  }

  try {
    let hospitalName: string | null = null;
    if (hospitalId) {
      const connection = await pool.query(
        `
        SELECT h.name
        FROM hospitals h
        WHERE h.id = $2::uuid
          AND (
            EXISTS (
              SELECT 1
              FROM patient_hospital_connections phc
              WHERE phc.patient_id = $1::uuid
                AND phc.hospital_id = $2::uuid
                AND phc.disconnected_at IS NULL
            )
            OR EXISTS (
              SELECT 1
              FROM patient_provider_connections ppc
              WHERE ppc.patient_id = $1::uuid
                AND ppc.provider_id = $2::uuid
                AND ppc.disconnected_at IS NULL
            )
          )
        LIMIT 1
        `,
        [patientId, hospitalId]
      );

      if ((connection.rowCount ?? 0) === 0) {
        return res.status(403).json({ message: "You are not connected to this hospital" });
      }
      hospitalName = connection.rows[0].name || null;
    }

    const documentId = randomUUID();
    await pool.query(
      `
      INSERT INTO medical_documents (
        id, patient_id, hospital_id, uploaded_by_patient_id, source_type, source_organization_name,
        category, subtype, title, description, verification_status, visibility_status, service_date
      )
      VALUES (
        $1::uuid, $2::uuid, $3::uuid, $2::uuid, 'patient', $4,
        $5, $6, $7, $8, 'patient_uploaded', 'patient_and_connected_providers', $9
      )
      `,
      [
        documentId,
        patientId,
        hospitalId || null,
        String(sourceOrganizationName || hospitalName || "Personal upload").trim(),
        normalizedCategory,
        subtype ? String(subtype).trim() : null,
        String(title).trim(),
        description ? String(description).trim() : null,
        serviceDate || null,
      ]
    );

    await pool.query(
      `
      INSERT INTO document_files (
        id, document_id, file_name, mime_type, file_size_bytes, storage_url, is_primary
      )
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, true)
      `,
      [
        randomUUID(),
        documentId,
        String(fileName).trim(),
        mimeType ? String(mimeType).trim() : null,
        Number(fileSizeBytes) || null,
        String(fileDataUrl),
      ]
    );

    const fresh = await pool.query(
      `
      ${documentSelectSql}
      WHERE d.id = $1::uuid
      LIMIT 1
      `,
      [documentId]
    );

    return res.status(201).json({ document: mapDocumentRow(fresh.rows[0], "patient") });
  } catch (e: any) {
    console.error("POST /api/patient/records/upload error:", e);
    return res.status(500).json({ message: e?.message || "Failed to upload document" });
  }
});

app.get("/api/patient/record-requests", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  try {
    const result = await pool.query(
      `
      SELECT
        r.id,
        r.patient_id,
        r.hospital_id,
        r.category,
        r.subtype,
        r.message,
        r.status,
        r.linked_document_id,
        r.created_at,
        r.updated_at,
        r.resolved_at,
        h.name AS hospital_name
      FROM document_requests r
      JOIN hospitals h ON h.id = r.hospital_id
      WHERE r.patient_id = $1::uuid
      ORDER BY r.created_at DESC
      `,
      [patientId]
    );

    return res.json({
      requests: result.rows.map((row) => ({
        id: String(row.id),
        hospitalId: String(row.hospital_id),
        hospitalName: row.hospital_name,
        category: row.category,
        subtype: row.subtype || null,
        message: row.message || "",
        status: row.status,
        linkedDocumentId: row.linked_document_id ? String(row.linked_document_id) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        resolvedAt: row.resolved_at,
      })),
    });
  } catch (e: any) {
    console.error("GET /api/patient/record-requests error:", e);
    return res.status(500).json({ message: e?.message || "Failed to fetch requests" });
  }
});

app.post("/api/patient/record-requests", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  const { hospitalId, category, subtype, message } = req.body ?? {};

  const normalizedCategory = normalizeDocumentCategory(category);
  if (!isUuid(String(hospitalId)) || !normalizedCategory) {
    return res.status(400).json({ message: "hospitalId and category are required" });
  }

  try {
    const connected = await pool.query(
      `
      SELECT h.name
      FROM hospitals h
      WHERE h.id = $2::uuid
        AND (
          EXISTS (
            SELECT 1
            FROM patient_hospital_connections phc
            WHERE phc.patient_id = $1::uuid
              AND phc.hospital_id = $2::uuid
              AND phc.disconnected_at IS NULL
          )
          OR EXISTS (
            SELECT 1
            FROM patient_provider_connections ppc
            WHERE ppc.patient_id = $1::uuid
              AND ppc.provider_id = $2::uuid
              AND ppc.disconnected_at IS NULL
          )
        )
      LIMIT 1
      `,
      [patientId, hospitalId]
    );

    if ((connected.rowCount ?? 0) === 0) {
      return res.status(403).json({ message: "You are not actively connected to this hospital" });
    }

    const staffResult = await pool.query(
      `
      SELECT id
      FROM staff_accounts
      WHERE hospital_id = $1::uuid
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [hospitalId]
    );

    if ((staffResult.rowCount ?? 0) === 0) {
      return res.status(400).json({ message: "No provider contact is available for this hospital" });
    }

    const staffId = String(staffResult.rows[0].id);
    const conversationResult = await pool.query(
      `
      INSERT INTO message_conversations (patient_id, provider_id, staff_id, created_at, updated_at)
      VALUES ($1::uuid, $2::uuid, $3::uuid, NOW(), NOW())
      ON CONFLICT (patient_id, provider_id, staff_id)
      DO UPDATE SET updated_at = NOW()
      RETURNING id
      `,
      [patientId, hospitalId, staffId]
    );

    const conversationId = String(conversationResult.rows[0].id);
    const requestSummary = `Medical record request for ${normalizedCategory}${subtype ? ` • ${String(subtype).trim()}` : ""}`;
    const requestMessage = message ? `${requestSummary}: ${String(message).trim()}` : requestSummary;

    await pool.query(
      `
      INSERT INTO message_items (conversation_id, sender_type, sender_patient_id, body)
      VALUES ($1::uuid, 'patient', $2::uuid, $3)
      `,
      [conversationId, patientId, requestMessage]
    );

    await pool.query(
      `
      UPDATE message_conversations
      SET last_message_preview = $2,
          last_message_at = NOW(),
          updated_at = NOW()
      WHERE id = $1::uuid
      `,
      [conversationId, requestMessage.slice(0, 200)]
    );

    const requestId = randomUUID();
    await pool.query(
      `
      INSERT INTO document_requests (
        id, patient_id, hospital_id, staff_id, conversation_id, category, subtype, message, status
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8, 'pending')
      `,
      [
        requestId,
        patientId,
        hospitalId,
        staffId,
        conversationId,
        normalizedCategory,
        subtype ? String(subtype).trim() : null,
        message ? String(message).trim() : null,
      ]
    );

    return res.status(201).json({
      request: {
        id: requestId,
        hospitalId: String(hospitalId),
        hospitalName: connected.rows[0].name,
        category: normalizedCategory,
        subtype: subtype ? String(subtype).trim() : null,
        message: message ? String(message).trim() : "",
        status: "pending",
      },
    });
  } catch (e: any) {
    console.error("POST /api/patient/record-requests error:", e);
    return res.status(500).json({ message: e?.message || "Failed to create request" });
  }
});

app.get("/api/patient/conditions", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  try {
    await seedConditionRowsFromSummary(patientId);
    await syncPatientConditionSummary(patientId);
    const result = await pool.query(
      `
      SELECT pc.*, h.name AS hospital_name, sa.full_name AS staff_full_name
      FROM patient_conditions pc
      LEFT JOIN hospitals h ON h.id = pc.hospital_id
      LEFT JOIN staff_accounts sa ON sa.id = pc.staff_id
      WHERE pc.patient_id = $1::uuid
      ORDER BY pc.is_active DESC, pc.updated_at DESC, pc.created_at DESC
      `,
      [patientId]
    );
    const conditions = result.rows.map(mapConditionRow);
    return res.json({ conditions });
  } catch (e: any) {
    console.error("GET /api/patient/conditions error:", e);
    return res.status(500).json({ message: e?.message || "Failed to load conditions" });
  }
});

app.post("/api/patient/conditions", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  const { name, status, diagnosed, metric, notes } = req.body ?? {};

  if (!String(name || "").trim()) {
    return res.status(400).json({ message: "Condition name is required" });
  }

  try {
    const created = await pool.query(
      `
      INSERT INTO patient_conditions (
        id, patient_id, source_type, verification_status, name, status, diagnosed, metric, provider, notes, is_active
      )
      VALUES ($1::uuid, $2::uuid, 'patient', 'patient_noted', $3, $4, $5, $6, 'Patient noted', $7, true)
      RETURNING *
      `,
      [
        randomUUID(),
        patientId,
        String(name).trim(),
        status ? String(status).trim() : null,
        diagnosed ? String(diagnosed).trim() : null,
        metric ? String(metric).trim() : null,
        notes ? String(notes).trim() : null,
      ]
    );

    await syncPatientConditionSummary(patientId);
    return res.status(201).json({ condition: mapConditionRow(created.rows[0]) });
  } catch (e: any) {
    console.error("POST /api/patient/conditions error:", e);
    return res.status(500).json({ message: e?.message || "Failed to add health concern" });
  }
});

app.patch("/api/patient/conditions/:id", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  const conditionId = String(req.params.id || "");
  const { name, status, diagnosed, metric, notes, isActive } = req.body ?? {};

  if (!isUuid(conditionId)) {
    return res.status(400).json({ message: "Invalid condition id" });
  }

  try {
    const updated = await pool.query(
      `
      UPDATE patient_conditions
      SET
        name = COALESCE($3, name),
        status = COALESCE($4, status),
        diagnosed = COALESCE($5, diagnosed),
        metric = COALESCE($6, metric),
        notes = COALESCE($7, notes),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
      WHERE id = $1::uuid
        AND patient_id = $2::uuid
        AND source_type = 'patient'
      RETURNING *
      `,
      [
        conditionId,
        patientId,
        name == null ? null : String(name).trim(),
        status == null ? null : String(status).trim(),
        diagnosed == null ? null : String(diagnosed).trim(),
        metric == null ? null : String(metric).trim(),
        notes == null ? null : String(notes).trim(),
        typeof isActive === "boolean" ? isActive : null,
      ]
    );

    if ((updated.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Health concern not found" });
    }

    await syncPatientConditionSummary(patientId);
    return res.json({ condition: mapConditionRow(updated.rows[0]) });
  } catch (e: any) {
    console.error("PATCH /api/patient/conditions/:id error:", e);
    return res.status(500).json({ message: e?.message || "Failed to update health concern" });
  }
});

app.post("/api/patient/conditions/:id/request-change", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  const conditionId = String(req.params.id || "");
  const message = String(req.body?.message || "").trim();

  if (!isUuid(conditionId)) {
    return res.status(400).json({ message: "Invalid condition id" });
  }
  if (!message) {
    return res.status(400).json({ message: "Please include the change request details" });
  }

  try {
    const conditionResult = await pool.query(
      `
      SELECT id, source_type, name, hospital_id, staff_id
      FROM patient_conditions
      WHERE id = $1::uuid
        AND patient_id = $2::uuid
        AND is_active = true
      LIMIT 1
      `,
      [conditionId, patientId]
    );

    if ((conditionResult.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Condition not found" });
    }

    const condition = conditionResult.rows[0];
    if (String(condition.source_type || "") !== "provider") {
      return res.status(400).json({ message: "Change requests are only available for provider-managed conditions" });
    }
    if (!condition.hospital_id) {
      return res.status(400).json({ message: "No provider is linked to this condition yet" });
    }

    const ok = await ensureActiveConnection(patientId, String(condition.hospital_id));
    if (!ok) return res.status(403).json({ message: "You are not actively connected to this provider" });

    let staffId = condition.staff_id ? String(condition.staff_id) : "";
    if (!staffId) {
      const fallbackStaff = await pool.query(
        `SELECT id FROM staff_accounts WHERE hospital_id = $1::uuid ORDER BY created_at ASC LIMIT 1`,
        [condition.hospital_id]
      );
      if ((fallbackStaff.rowCount ?? 0) === 0) {
        return res.status(400).json({ message: "No provider contact is available for this condition" });
      }
      staffId = String(fallbackStaff.rows[0].id);
    }

    const conversationResult = await pool.query(
      `
      INSERT INTO message_conversations (patient_id, provider_id, staff_id, created_at, updated_at)
      VALUES ($1::uuid, $2::uuid, $3::uuid, NOW(), NOW())
      ON CONFLICT (patient_id, provider_id, staff_id)
      DO UPDATE SET updated_at = NOW()
      RETURNING id
      `,
      [patientId, condition.hospital_id, staffId]
    );

    const conversationId = String(conversationResult.rows[0].id);
    const body = `Condition change request for ${String(condition.name || "condition").trim()}: ${message}`;

    await pool.query(
      `INSERT INTO message_items (conversation_id, sender_type, sender_patient_id, body) VALUES ($1::uuid, 'patient', $2::uuid, $3)`,
      [conversationId, patientId, body]
    );

    await pool.query(
      `
      UPDATE message_conversations
      SET last_message_preview = $2,
          last_message_at = NOW(),
          updated_at = NOW()
      WHERE id = $1::uuid
      `,
      [conversationId, body.slice(0, 200)]
    );

    return res.status(201).json({ ok: true, conversationId });
  } catch (e: any) {
    console.error("POST /api/patient/conditions/:id/request-change error:", e);
    return res.status(500).json({ message: e?.message || "Failed to request condition change" });
  }
});

app.get("/api/patient/medications", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;

  try {
    await syncPatientMedicationSummary(patientId);

    const result = await pool.query(
      `
      SELECT
        pm.*,
        h.name AS hospital_name,
        sa.full_name AS staff_full_name,
        latest_log.status AS last_intake_status,
        latest_log.logged_for_date AS last_intake_date,
        COALESCE(logs.recent_intake_logs, '[]'::json) AS recent_intake_logs,
        latest_refill.id AS latest_refill_request_id,
        latest_refill.status AS latest_refill_request_status,
        latest_refill.request_note AS latest_refill_request_note,
        latest_refill.created_at AS latest_refill_request_created_at,
        latest_refill.resolved_at AS latest_refill_request_resolved_at,
        latest_refill.resolution_note AS latest_refill_request_resolution_note
      FROM patient_medications pm
      LEFT JOIN hospitals h ON h.id = pm.hospital_id
      LEFT JOIN staff_accounts sa ON sa.id = pm.staff_id
      LEFT JOIN LATERAL (
        SELECT mil.status, mil.logged_for_date
        FROM medication_intake_logs mil
        WHERE mil.medication_id = pm.id
        ORDER BY mil.logged_for_date DESC, mil.created_at DESC
        LIMIT 1
      ) latest_log ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', mil.id,
            'loggedForDate', mil.logged_for_date,
            'status', mil.status,
            'note', mil.note,
            'createdAt', mil.created_at
          )
          ORDER BY mil.logged_for_date DESC, mil.created_at DESC
        ) AS recent_intake_logs
        FROM (
          SELECT *
          FROM medication_intake_logs
          WHERE medication_id = pm.id
          ORDER BY logged_for_date DESC, created_at DESC
        LIMIT 7
      ) mil
    ) logs ON TRUE
      LEFT JOIN LATERAL (
        SELECT mrr.id, mrr.status, mrr.request_note, mrr.created_at, mrr.resolved_at, mrr.resolution_note
        FROM medication_refill_requests mrr
        WHERE mrr.medication_id = pm.id
        ORDER BY mrr.created_at DESC
        LIMIT 1
      ) latest_refill ON TRUE
      WHERE pm.patient_id = $1::uuid
      ORDER BY pm.is_active DESC, COALESCE(pm.start_date, DATE(pm.created_at)) DESC, pm.created_at DESC
      `,
      [patientId]
    );

    return res.json({ medications: result.rows.map(mapMedicationRow) });
  } catch (e: any) {
    console.error("GET /api/patient/medications error:", e);
    return res.status(500).json({ message: e?.message || "Failed to fetch medications" });
  }
});

app.post("/api/patient/medications", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  const { name, dosage, frequency, purpose, pharmacy, startDate, notes } = req.body ?? {};

  if (!String(name || "").trim()) {
    return res.status(400).json({ message: "Medication name is required" });
  }
  if (startDate && Number.isNaN(Date.parse(String(startDate)))) {
    return res.status(400).json({ message: "Invalid startDate" });
  }

  try {
    const insert = await pool.query(
      `
      INSERT INTO patient_medications (
        id, patient_id, source_type, verification_status, name, dosage, frequency, purpose, pharmacy, start_date, notes
      )
      VALUES ($1::uuid, $2::uuid, 'patient', 'patient_added', $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        randomUUID(),
        patientId,
        String(name).trim(),
        dosage ? String(dosage).trim() : null,
        frequency ? String(frequency).trim() : null,
        purpose ? String(purpose).trim() : null,
        pharmacy ? String(pharmacy).trim() : null,
        startDate || null,
        notes ? String(notes).trim() : null,
      ]
    );

    await syncPatientMedicationSummary(patientId);
    return res.status(201).json({ medication: mapMedicationRow({ ...insert.rows[0], hospital_name: null }) });
  } catch (e: any) {
    console.error("POST /api/patient/medications error:", e);
    return res.status(500).json({ message: e?.message || "Failed to add medication" });
  }
});

app.patch("/api/patient/medications/:id", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  const medicationId = String(req.params.id || "");
  const { remindersEnabled, adherenceStatus, isActive, name, dosage, frequency, purpose, pharmacy, startDate, notes } = req.body ?? {};

  if (!isUuid(medicationId)) {
    return res.status(400).json({ message: "Invalid medication id" });
  }

  const allowedAdherence = new Set(["not_started", "on_track", "missed_doses", "stopped"]);
  if (adherenceStatus != null && !allowedAdherence.has(String(adherenceStatus))) {
    return res.status(400).json({ message: "Invalid adherenceStatus" });
  }
  if (startDate && Number.isNaN(Date.parse(String(startDate)))) {
    return res.status(400).json({ message: "Invalid startDate" });
  }

  try {
    const existing = await pool.query(
      `
      SELECT source_type
      FROM patient_medications
      WHERE id = $1::uuid
        AND patient_id = $2::uuid
      LIMIT 1
      `,
      [medicationId, patientId]
    );

    if ((existing.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Medication not found" });
    }

    if (
      String(existing.rows[0].source_type || "patient") !== "patient" &&
      [name, dosage, frequency, purpose, pharmacy, startDate, notes].some((value) => value != null)
    ) {
      return res.status(403).json({ message: "Only personal medications can be edited here" });
    }

    const result = await pool.query(
      `
      UPDATE patient_medications
      SET
        name = CASE WHEN source_type = 'patient' THEN COALESCE($3, name) ELSE name END,
        dosage = CASE WHEN source_type = 'patient' THEN COALESCE($4, dosage) ELSE dosage END,
        frequency = CASE WHEN source_type = 'patient' THEN COALESCE($5, frequency) ELSE frequency END,
        purpose = CASE WHEN source_type = 'patient' THEN COALESCE($6, purpose) ELSE purpose END,
        pharmacy = CASE WHEN source_type = 'patient' THEN COALESCE($7, pharmacy) ELSE pharmacy END,
        start_date = CASE WHEN source_type = 'patient' THEN COALESCE($8, start_date) ELSE start_date END,
        notes = CASE WHEN source_type = 'patient' THEN COALESCE($9, notes) ELSE notes END,
        reminders_enabled = COALESCE($10, reminders_enabled),
        adherence_status = COALESCE($11, adherence_status),
        is_active = COALESCE($12, is_active),
        updated_at = NOW()
      WHERE id = $1::uuid
        AND patient_id = $2::uuid
      RETURNING *
      `,
      [
        medicationId,
        patientId,
        name == null ? null : String(name).trim(),
        dosage == null ? null : String(dosage).trim(),
        frequency == null ? null : String(frequency).trim(),
        purpose == null ? null : String(purpose).trim(),
        pharmacy == null ? null : String(pharmacy).trim(),
        startDate || null,
        notes == null ? null : String(notes).trim(),
        typeof remindersEnabled === "boolean" ? remindersEnabled : null,
        adherenceStatus ? String(adherenceStatus) : null,
        typeof isActive === "boolean" ? isActive : null,
      ]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Medication not found" });
    }

    await syncPatientMedicationSummary(patientId);
    const fresh = await fetchMedicationById(medicationId);
    return res.json({ medication: mapMedicationRow(fresh || result.rows[0]) });
  } catch (e: any) {
    console.error("PATCH /api/patient/medications/:id error:", e);
    return res.status(500).json({ message: e?.message || "Failed to update medication" });
  }
});

app.post("/api/patient/medications/:id/intake-logs", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  const medicationId = String(req.params.id || "");
  const { status, loggedForDate, note } = req.body ?? {};

  if (!isUuid(medicationId)) {
    return res.status(400).json({ message: "Invalid medication id" });
  }

  const normalizedStatus = String(status || "").trim().toLowerCase();
  if (!["taken", "missed", "skipped"].includes(normalizedStatus)) {
    return res.status(400).json({ message: "Invalid intake status" });
  }

  const intakeDate = loggedForDate ? String(loggedForDate) : new Date().toISOString().slice(0, 10);
  if (Number.isNaN(Date.parse(intakeDate))) {
    return res.status(400).json({ message: "Invalid loggedForDate" });
  }

  try {
    const medResult = await pool.query(
      `
      SELECT *
      FROM patient_medications
      WHERE id = $1::uuid
        AND patient_id = $2::uuid
      LIMIT 1
      `,
      [medicationId, patientId]
    );

    if ((medResult.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Medication not found" });
    }

    const logResult = await pool.query(
      `
      INSERT INTO medication_intake_logs (
        id, medication_id, patient_id, logged_for_date, status, note
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::date, $5, $6)
      RETURNING id, medication_id, patient_id, logged_for_date, status, note, created_at
      `,
      [
        randomUUID(),
        medicationId,
        patientId,
        intakeDate,
        normalizedStatus,
        note ? String(note).trim() : null,
      ]
    );

    const mappedMedication = await fetchMedicationById(medicationId);

    return res.status(201).json({
      log: {
        id: String(logResult.rows[0].id),
        loggedForDate: logResult.rows[0].logged_for_date,
        status: logResult.rows[0].status,
        note: logResult.rows[0].note || "",
        createdAt: logResult.rows[0].created_at,
      },
      medication: mapMedicationRow(mappedMedication),
    });
  } catch (e: any) {
    console.error("POST /api/patient/medications/:id/intake-logs error:", e);
    return res.status(500).json({ message: e?.message || "Failed to log medication intake" });
  }
});

app.post("/api/patient/medications/:id/refill-request", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  const medicationId = String(req.params.id || "");
  const requestNote = String(req.body?.note || "").trim();

  if (!isUuid(medicationId)) {
    return res.status(400).json({ message: "Invalid medication id" });
  }

  try {
    const medicationResult = await pool.query(
      `
      SELECT pm.id, pm.source_type, pm.name, pm.hospital_id, pm.staff_id, pm.last_refill_requested_at
      FROM patient_medications pm
      WHERE pm.id = $1::uuid
        AND patient_id = $2::uuid
      LIMIT 1
      `,
      [medicationId, patientId]
    );

    if ((medicationResult.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Medication not found" });
    }

    const medication = medicationResult.rows[0];
    if (String(medication.source_type || "") !== "provider") {
      return res.status(400).json({ message: "Refill requests are only available for provider-prescribed medications" });
    }
    if (!medication.hospital_id) {
      return res.status(400).json({ message: "No provider is linked to this medication yet" });
    }

    const ok = await ensureActiveConnection(patientId, String(medication.hospital_id));
    if (!ok) {
      return res.status(403).json({ message: "You are not actively connected to this provider" });
    }

    const existingOpen = await pool.query(
      `
      SELECT id
      FROM medication_refill_requests
      WHERE medication_id = $1::uuid
        AND patient_id = $2::uuid
        AND status = 'open'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [medicationId, patientId]
    );

    if ((existingOpen.rowCount ?? 0) > 0) {
      const fresh = await fetchMedicationById(medicationId);
      return res.status(200).json({
        ok: true,
        alreadyOpen: true,
        medication: mapMedicationRow(fresh || medication),
      });
    }

    let staffId = medication.staff_id ? String(medication.staff_id) : "";
    if (!staffId) {
      const fallbackStaff = await pool.query(
        `
        SELECT id
        FROM staff_accounts
        WHERE hospital_id = $1::uuid
        ORDER BY created_at ASC
        LIMIT 1
        `,
        [medication.hospital_id]
      );

      if ((fallbackStaff.rowCount ?? 0) === 0) {
        return res.status(400).json({ message: "No provider contact is available for this medication" });
      }
      staffId = String(fallbackStaff.rows[0].id);
    }

    const conversationResult = await pool.query(
      `
      INSERT INTO message_conversations (patient_id, provider_id, staff_id, created_at, updated_at)
      VALUES ($1::uuid, $2::uuid, $3::uuid, NOW(), NOW())
      ON CONFLICT (patient_id, provider_id, staff_id)
      DO UPDATE SET updated_at = NOW()
      RETURNING id
      `,
      [patientId, medication.hospital_id, staffId]
    );

    const conversationId = String(conversationResult.rows[0].id);
    const refillBody = requestNote
      ? `Refill request for ${String(medication.name || "medication").trim()}: ${requestNote}`
      : `Refill request for ${String(medication.name || "medication").trim()}.`;

    await pool.query(
      `
      INSERT INTO message_items (conversation_id, sender_type, sender_patient_id, body)
      VALUES ($1::uuid, 'patient', $2::uuid, $3)
      `,
      [conversationId, patientId, refillBody]
    );

    await pool.query(
      `
      INSERT INTO medication_refill_requests (
        id, medication_id, patient_id, hospital_id, staff_id, conversation_id, requested_by_patient_id, request_note, status
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $3::uuid, NULLIF($7, ''), 'open')
      `,
      [randomUUID(), medicationId, patientId, medication.hospital_id, staffId, conversationId, requestNote]
    );

    await pool.query(
      `
      UPDATE patient_medications
      SET last_refill_requested_at = NOW(), updated_at = NOW()
      WHERE id = $1::uuid
      `,
      [medicationId]
    );

    await pool.query(
      `
      UPDATE message_conversations
      SET last_message_preview = $2,
          last_message_at = NOW(),
          updated_at = NOW()
      WHERE id = $1::uuid
      `,
      [conversationId, refillBody.slice(0, 200)]
    );

    const fresh = await fetchMedicationById(medicationId);
    return res.status(201).json({ ok: true, conversationId, medication: mapMedicationRow(fresh || medication) });
  } catch (e: any) {
    console.error("POST /api/patient/medications/:id/refill-request error:", e);
    return res.status(500).json({ message: e?.message || "Failed to request refill" });
  }
});

app.post("/api/patient/medications/:id/request-change", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  const medicationId = String(req.params.id || "");
  const message = String(req.body?.message || "").trim();

  if (!isUuid(medicationId)) {
    return res.status(400).json({ message: "Invalid medication id" });
  }
  if (!message) {
    return res.status(400).json({ message: "Please include the change request details" });
  }

  try {
    const medicationResult = await pool.query(
      `
      SELECT pm.id, pm.source_type, pm.name, pm.hospital_id, pm.staff_id
      FROM patient_medications pm
      WHERE pm.id = $1::uuid
        AND pm.patient_id = $2::uuid
      LIMIT 1
      `,
      [medicationId, patientId]
    );

    if ((medicationResult.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Medication not found" });
    }

    const medication = medicationResult.rows[0];
    if (String(medication.source_type || "") !== "provider") {
      return res.status(400).json({ message: "Change requests are only available for provider-prescribed medications" });
    }
    if (!medication.hospital_id) {
      return res.status(400).json({ message: "No provider is linked to this medication yet" });
    }

    const ok = await ensureActiveConnection(patientId, String(medication.hospital_id));
    if (!ok) {
      return res.status(403).json({ message: "You are not actively connected to this provider" });
    }

    let staffId = medication.staff_id ? String(medication.staff_id) : "";
    if (!staffId) {
      const fallbackStaff = await pool.query(
        `
        SELECT id
        FROM staff_accounts
        WHERE hospital_id = $1::uuid
        ORDER BY created_at ASC
        LIMIT 1
        `,
        [medication.hospital_id]
      );

      if ((fallbackStaff.rowCount ?? 0) === 0) {
        return res.status(400).json({ message: "No provider contact is available for this medication" });
      }
      staffId = String(fallbackStaff.rows[0].id);
    }

    const conversationResult = await pool.query(
      `
      INSERT INTO message_conversations (patient_id, provider_id, staff_id, created_at, updated_at)
      VALUES ($1::uuid, $2::uuid, $3::uuid, NOW(), NOW())
      ON CONFLICT (patient_id, provider_id, staff_id)
      DO UPDATE SET updated_at = NOW()
      RETURNING id
      `,
      [patientId, medication.hospital_id, staffId]
    );

    const conversationId = String(conversationResult.rows[0].id);
    const body = `Medication change request for ${String(medication.name || "medication").trim()}: ${message}`;

    await pool.query(
      `
      INSERT INTO message_items (conversation_id, sender_type, sender_patient_id, body)
      VALUES ($1::uuid, 'patient', $2::uuid, $3)
      `,
      [conversationId, patientId, body]
    );

    await pool.query(
      `
      INSERT INTO medication_change_requests (
        id, medication_id, patient_id, hospital_id, staff_id, conversation_id, requested_by_patient_id, message, status
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $3::uuid, $7, 'open')
      `,
      [randomUUID(), medicationId, patientId, medication.hospital_id, staffId, conversationId, message]
    );

    await pool.query(
      `
      UPDATE message_conversations
      SET last_message_preview = $2,
          last_message_at = NOW(),
          updated_at = NOW()
      WHERE id = $1::uuid
      `,
      [conversationId, body.slice(0, 200)]
    );

    return res.status(201).json({ ok: true, conversationId });
  } catch (e: any) {
    console.error("POST /api/patient/medications/:id/request-change error:", e);
    return res.status(500).json({ message: e?.message || "Failed to request medication change" });
  }
});

app.get("/api/patient/health-summary", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;

  try {
    await seedConditionRowsFromSummary(patientId);
    await syncPatientConditionSummary(patientId);
    await syncPatientMedicationSummary(patientId);
    const result = await pool.query(
      `
      SELECT patient_id, vitals, conditions, allergies, blood_type, current_medications, emergency_contacts, advance_directives, immunizations, family_history, updated_at
      FROM patient_health_summaries
      WHERE patient_id = $1::uuid
      LIMIT 1
      `,
      [patientId]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.json({
        summary: {
          vitals: [],
          conditions: [],
          allergies: [],
          bloodType: null,
          currentMedications: [],
          emergencyContacts: [],
          advanceDirectives: {},
          immunizations: [],
          familyHistory: [],
          updatedAt: null,
        },
      });
    }

    return res.json({ summary: normalizeHealthSummaryRow(result.rows[0]) });
  } catch (e: any) {
    console.error("GET /api/patient/health-summary error:", e);
    return res.status(500).json({ message: e?.message || "Failed to fetch health summary" });
  }
});

app.put("/api/patient/health-summary", requirePatientAuth, async (req: any, res) => {
  const patientId = req.patientId;
  const {
    vitals = [],
    allergies = [],
    bloodType = null,
    currentMedications = [],
    emergencyContacts = [],
    advanceDirectives = {},
    immunizations = [],
    familyHistory = [],
  } = req.body ?? {};

  if (
    !Array.isArray(vitals) ||
    !Array.isArray(allergies) ||
    !Array.isArray(currentMedications) ||
    !Array.isArray(emergencyContacts) ||
    typeof advanceDirectives !== "object" ||
    Array.isArray(advanceDirectives) ||
    !Array.isArray(immunizations) ||
    !Array.isArray(familyHistory)
  ) {
    return res.status(400).json({ message: "Invalid health summary payload" });
  }

  try {
    await seedConditionRowsFromSummary(patientId);
    const syncedConditions = await syncPatientConditionSummary(patientId);
    const result = await pool.query(
      `
      INSERT INTO patient_health_summaries (
        patient_id, vitals, conditions, allergies, blood_type, current_medications, emergency_contacts, advance_directives, immunizations, family_history, updated_at
      )
      VALUES (
        $1::uuid, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, NOW()
      )
      ON CONFLICT (patient_id) DO UPDATE SET
        vitals = EXCLUDED.vitals,
        conditions = EXCLUDED.conditions,
        allergies = EXCLUDED.allergies,
        blood_type = EXCLUDED.blood_type,
        current_medications = EXCLUDED.current_medications,
        emergency_contacts = EXCLUDED.emergency_contacts,
        advance_directives = EXCLUDED.advance_directives,
        immunizations = EXCLUDED.immunizations,
        family_history = EXCLUDED.family_history,
        updated_at = NOW()
      RETURNING patient_id, vitals, conditions, allergies, blood_type, current_medications, emergency_contacts, advance_directives, immunizations, family_history, updated_at
      `,
      [
        patientId,
        JSON.stringify(vitals),
        JSON.stringify(syncedConditions),
        JSON.stringify(allergies),
        bloodType ? String(bloodType).trim() : null,
        JSON.stringify(currentMedications),
        JSON.stringify(emergencyContacts),
        JSON.stringify(advanceDirectives),
        JSON.stringify(immunizations),
        JSON.stringify(familyHistory),
      ]
    );

    return res.json({ summary: normalizeHealthSummaryRow(result.rows[0]) });
  } catch (e: any) {
    console.error("PUT /api/patient/health-summary error:", e);
    return res.status(500).json({ message: e?.message || "Failed to save health summary" });
  }
});

app.get("/api/staff/patients/:id/medications", requireStaffAuth, async (req: any, res) => {
  const staffHospitalId = req.staffHospitalId;
  const patientId = String(req.params.id || "");

  if (!isUuid(patientId)) {
    return res.status(400).json({ message: "Invalid patient id" });
  }

  try {
    const relation = await pool.query(
      `
      SELECT 1
      WHERE EXISTS (
        SELECT 1
        FROM patient_hospital_connections phc
        WHERE phc.patient_id = $1::uuid
          AND phc.hospital_id = $2::uuid
          AND phc.disconnected_at IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM patient_provider_connections ppc
        WHERE ppc.patient_id = $1::uuid
          AND ppc.provider_id = $2::uuid
          AND ppc.disconnected_at IS NULL
      )
      LIMIT 1
      `,
      [patientId, staffHospitalId]
    );

    if ((relation.rowCount ?? 0) === 0) {
      return res.status(403).json({ message: "This patient is not linked to your hospital" });
    }

    await syncPatientMedicationSummary(patientId);

    const result = await pool.query(
      `
      SELECT
        pm.*,
        h.name AS hospital_name,
        sa.full_name AS staff_full_name,
        latest_log.status AS last_intake_status,
        latest_log.logged_for_date AS last_intake_date,
        COALESCE(logs.recent_intake_logs, '[]'::json) AS recent_intake_logs,
        latest_refill.id AS latest_refill_request_id,
        latest_refill.status AS latest_refill_request_status,
        latest_refill.request_note AS latest_refill_request_note,
        latest_refill.created_at AS latest_refill_request_created_at,
        latest_refill.resolved_at AS latest_refill_request_resolved_at,
        latest_refill.resolution_note AS latest_refill_request_resolution_note
      FROM patient_medications pm
      LEFT JOIN hospitals h ON h.id = pm.hospital_id
      LEFT JOIN staff_accounts sa ON sa.id = pm.staff_id
      LEFT JOIN LATERAL (
        SELECT mil.status, mil.logged_for_date
        FROM medication_intake_logs mil
        WHERE mil.medication_id = pm.id
        ORDER BY mil.logged_for_date DESC, mil.created_at DESC
        LIMIT 1
      ) latest_log ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', mil.id,
            'loggedForDate', mil.logged_for_date,
            'status', mil.status,
            'note', mil.note,
            'createdAt', mil.created_at
          )
          ORDER BY mil.logged_for_date DESC, mil.created_at DESC
        ) AS recent_intake_logs
        FROM (
          SELECT *
          FROM medication_intake_logs
          WHERE medication_id = pm.id
          ORDER BY logged_for_date DESC, created_at DESC
        LIMIT 7
      ) mil
    ) logs ON TRUE
      LEFT JOIN LATERAL (
        SELECT mrr.id, mrr.status, mrr.request_note, mrr.created_at, mrr.resolved_at, mrr.resolution_note
        FROM medication_refill_requests mrr
        WHERE mrr.medication_id = pm.id
        ORDER BY mrr.created_at DESC
        LIMIT 1
      ) latest_refill ON TRUE
      WHERE pm.patient_id = $1::uuid
      ORDER BY pm.is_active DESC, COALESCE(pm.start_date, DATE(pm.created_at)) DESC, pm.created_at DESC
      `,
      [patientId]
    );

    return res.json({ medications: result.rows.map(mapMedicationRow) });
  } catch (e: any) {
    console.error("GET /api/staff/patients/:id/medications error:", e);
    return res.status(500).json({ message: e?.message || "Failed to fetch patient medications" });
  }
});

app.get("/api/staff/patients/:id/conditions", requireStaffAuth, async (req: any, res) => {
  const hospitalId = req.staffHospitalId;
  const patientId = String(req.params.id || "");

  if (!isUuid(patientId)) {
    return res.status(400).json({ message: "Invalid patient id" });
  }

  try {
    await seedConditionRowsFromSummary(patientId);
    const relation = await pool.query(
      `
      SELECT 1
      WHERE EXISTS (
        SELECT 1 FROM patient_hospital_connections phc
        WHERE phc.patient_id = $1::uuid
          AND phc.hospital_id = $2::uuid
          AND phc.disconnected_at IS NULL
      )
      OR EXISTS (
        SELECT 1 FROM patient_provider_connections ppc
        WHERE ppc.patient_id = $1::uuid
          AND ppc.provider_id = $2::uuid
          AND ppc.disconnected_at IS NULL
      )
      LIMIT 1
      `,
      [patientId, hospitalId]
    );

    if ((relation.rowCount ?? 0) === 0) {
      return res.status(403).json({ message: "This patient is not linked to your hospital" });
    }

    const result = await pool.query(
      `
      SELECT pc.*, h.name AS hospital_name, sa.full_name AS staff_full_name
      FROM patient_conditions pc
      LEFT JOIN hospitals h ON h.id = pc.hospital_id
      LEFT JOIN staff_accounts sa ON sa.id = pc.staff_id
      WHERE pc.patient_id = $1::uuid
      ORDER BY pc.is_active DESC, pc.updated_at DESC, pc.created_at DESC
      `,
      [patientId]
    );

    return res.json({ conditions: result.rows.map(mapConditionRow) });
  } catch (e: any) {
    console.error("GET /api/staff/patients/:id/conditions error:", e);
    return res.status(500).json({ message: e?.message || "Failed to load conditions" });
  }
});

app.post("/api/staff/patients/:id/conditions", requireStaffAuth, async (req: any, res) => {
  const hospitalId = req.staffHospitalId;
  const staffId = req.staffId;
  const patientId = String(req.params.id || "");
  const { name, status, diagnosed, metric, notes } = req.body ?? {};

  if (!isUuid(patientId)) {
    return res.status(400).json({ message: "Invalid patient id" });
  }
  if (!String(name || "").trim()) {
    return res.status(400).json({ message: "Condition name is required" });
  }

  try {
    const relation = await pool.query(
      `
      SELECT sa.full_name
      FROM staff_accounts sa
      WHERE sa.id = $3::uuid
        AND (
          EXISTS (
            SELECT 1 FROM patient_hospital_connections phc
            WHERE phc.patient_id = $1::uuid
              AND phc.hospital_id = $2::uuid
              AND phc.disconnected_at IS NULL
          )
          OR EXISTS (
            SELECT 1 FROM patient_provider_connections ppc
            WHERE ppc.patient_id = $1::uuid
              AND ppc.provider_id = $2::uuid
              AND ppc.disconnected_at IS NULL
          )
        )
      LIMIT 1
      `,
      [patientId, hospitalId, staffId]
    );

    if ((relation.rowCount ?? 0) === 0) {
      return res.status(403).json({ message: "This patient is not linked to your hospital" });
    }

    const created = await pool.query(
      `
      INSERT INTO patient_conditions (
        id, patient_id, hospital_id, staff_id, source_type, verification_status, name, status, diagnosed, metric, provider, notes, is_active
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'provider', 'provider_verified', $5, $6, $7, $8, $9, $10, true)
      RETURNING *
      `,
      [
        randomUUID(),
        patientId,
        hospitalId,
        staffId,
        String(name).trim(),
        status ? String(status).trim() : null,
        diagnosed ? String(diagnosed).trim() : null,
        metric ? String(metric).trim() : null,
        relation.rows[0].full_name || null,
        notes ? String(notes).trim() : null,
      ]
    );

    await syncPatientConditionSummary(patientId);
    return res.status(201).json({ condition: mapConditionRow({ ...created.rows[0], staff_full_name: relation.rows[0].full_name }) });
  } catch (e: any) {
    console.error("POST /api/staff/patients/:id/conditions error:", e);
    return res.status(500).json({ message: e?.message || "Failed to add condition" });
  }
});

app.patch("/api/staff/patients/:patientId/conditions/:conditionId", requireStaffAuth, async (req: any, res) => {
  const hospitalId = req.staffHospitalId;
  const staffId = req.staffId;
  const patientId = String(req.params.patientId || "");
  const conditionId = String(req.params.conditionId || "");
  const { name, status, diagnosed, metric, notes, isActive } = req.body ?? {};

  if (!isUuid(patientId) || !isUuid(conditionId)) {
    return res.status(400).json({ message: "Invalid patient or condition id" });
  }

  try {
    const relation = await pool.query(
      `
      SELECT sa.full_name
      FROM staff_accounts sa
      WHERE sa.id = $3::uuid
        AND (
          EXISTS (
            SELECT 1 FROM patient_hospital_connections phc
            WHERE phc.patient_id = $1::uuid
              AND phc.hospital_id = $2::uuid
              AND phc.disconnected_at IS NULL
          )
          OR EXISTS (
            SELECT 1 FROM patient_provider_connections ppc
            WHERE ppc.patient_id = $1::uuid
              AND ppc.provider_id = $2::uuid
              AND ppc.disconnected_at IS NULL
          )
        )
      LIMIT 1
      `,
      [patientId, hospitalId, staffId]
    );

    if ((relation.rowCount ?? 0) === 0) {
      return res.status(403).json({ message: "This patient is not linked to your hospital" });
    }

    const updated = await pool.query(
      `
      UPDATE patient_conditions
      SET
        hospital_id = COALESCE(hospital_id, $3::uuid),
        staff_id = $4::uuid,
        source_type = 'provider',
        verification_status = 'provider_verified',
        provider = COALESCE($5, provider),
        name = COALESCE($6, name),
        status = COALESCE($7, status),
        diagnosed = COALESCE($8, diagnosed),
        metric = COALESCE($9, metric),
        notes = COALESCE($10, notes),
        is_active = COALESCE($11, is_active),
        updated_at = NOW()
      WHERE id = $1::uuid
        AND patient_id = $2::uuid
      RETURNING *
      `,
      [
        conditionId,
        patientId,
        hospitalId,
        staffId,
        relation.rows[0].full_name || null,
        name == null ? null : String(name).trim(),
        status == null ? null : String(status).trim(),
        diagnosed == null ? null : String(diagnosed).trim(),
        metric == null ? null : String(metric).trim(),
        notes == null ? null : String(notes).trim(),
        typeof isActive === "boolean" ? isActive : null,
      ]
    );

    if ((updated.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Condition not found" });
    }

    await syncPatientConditionSummary(patientId);
    return res.json({ condition: mapConditionRow({ ...updated.rows[0], staff_full_name: relation.rows[0].full_name }) });
  } catch (e: any) {
    console.error("PATCH /api/staff/patients/:patientId/conditions/:conditionId error:", e);
    return res.status(500).json({ message: e?.message || "Failed to update condition" });
  }
});

app.post("/api/staff/patients/:id/medications", requireStaffAuth, async (req: any, res) => {
  const staffId = req.staffId;
  const staffHospitalId = req.staffHospitalId;
  const patientId = String(req.params.id || "");
  const { name, dosage, frequency, purpose, pharmacy, startDate, endDate, refillsRemaining, notes, isActive = true } = req.body ?? {};

  if (!isUuid(patientId)) {
    return res.status(400).json({ message: "Invalid patient id" });
  }
  if (!String(name || "").trim()) {
    return res.status(400).json({ message: "Medication name is required" });
  }
  if (startDate && Number.isNaN(Date.parse(String(startDate)))) {
    return res.status(400).json({ message: "Invalid startDate" });
  }
  if (endDate && Number.isNaN(Date.parse(String(endDate)))) {
    return res.status(400).json({ message: "Invalid endDate" });
  }

  try {
    const relation = await pool.query(
      `
      SELECT sa.full_name
      FROM staff_accounts sa
      WHERE sa.id = $3::uuid
        AND (
          EXISTS (
            SELECT 1
            FROM patient_hospital_connections phc
            WHERE phc.patient_id = $1::uuid
              AND phc.hospital_id = $2::uuid
              AND phc.disconnected_at IS NULL
          )
          OR EXISTS (
            SELECT 1
            FROM patient_provider_connections ppc
            WHERE ppc.patient_id = $1::uuid
              AND ppc.provider_id = $2::uuid
              AND ppc.disconnected_at IS NULL
          )
        )
      LIMIT 1
      `,
      [patientId, staffHospitalId, staffId]
    );

    if ((relation.rowCount ?? 0) === 0) {
      return res.status(403).json({ message: "This patient is not linked to your hospital" });
    }

    const insert = await pool.query(
      `
      INSERT INTO patient_medications (
        id, patient_id, hospital_id, staff_id, source_type, verification_status,
        name, dosage, frequency, purpose, prescriber_name, pharmacy, start_date, end_date, refills_remaining, notes, is_active
      )
      VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4::uuid, 'provider', 'provider_prescribed',
        $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING *
      `,
      [
        randomUUID(),
        patientId,
        staffHospitalId,
        staffId,
        String(name).trim(),
        dosage ? String(dosage).trim() : null,
        frequency ? String(frequency).trim() : null,
        purpose ? String(purpose).trim() : null,
        relation.rows[0].full_name || null,
        pharmacy ? String(pharmacy).trim() : null,
        startDate || null,
        endDate || null,
        refillsRemaining == null || refillsRemaining === "" ? null : Number(refillsRemaining),
        notes ? String(notes).trim() : null,
        typeof isActive === "boolean" ? isActive : true,
      ]
    );

    await syncPatientMedicationSummary(patientId);
    const fresh = await fetchMedicationById(String(insert.rows[0].id));
    return res.status(201).json({ medication: mapMedicationRow(fresh || { ...insert.rows[0], staff_full_name: relation.rows[0].full_name }) });
  } catch (e: any) {
    console.error("POST /api/staff/patients/:id/medications error:", e);
    return res.status(500).json({ message: e?.message || "Failed to add medication" });
  }
});

app.patch("/api/staff/patients/:patientId/medications/:medicationId", requireStaffAuth, async (req: any, res) => {
  const staffHospitalId = req.staffHospitalId;
  const patientId = String(req.params.patientId || "");
  const medicationId = String(req.params.medicationId || "");
  const { name, dosage, frequency, purpose, pharmacy, startDate, endDate, refillsRemaining, notes, isActive } = req.body ?? {};

  if (!isUuid(patientId) || !isUuid(medicationId)) {
    return res.status(400).json({ message: "Invalid patient or medication id" });
  }
  if (startDate && Number.isNaN(Date.parse(String(startDate)))) {
    return res.status(400).json({ message: "Invalid startDate" });
  }
  if (endDate && Number.isNaN(Date.parse(String(endDate)))) {
    return res.status(400).json({ message: "Invalid endDate" });
  }

  try {
    const relation = await pool.query(
      `
      SELECT 1
      WHERE EXISTS (
        SELECT 1
        FROM patient_hospital_connections phc
        WHERE phc.patient_id = $1::uuid
          AND phc.hospital_id = $2::uuid
          AND phc.disconnected_at IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM patient_provider_connections ppc
        WHERE ppc.patient_id = $1::uuid
          AND ppc.provider_id = $2::uuid
          AND ppc.disconnected_at IS NULL
      )
      LIMIT 1
      `,
      [patientId, staffHospitalId]
    );

    if ((relation.rowCount ?? 0) === 0) {
      return res.status(403).json({ message: "This patient is not linked to your hospital" });
    }

    const result = await pool.query(
      `
      UPDATE patient_medications
      SET
        name = COALESCE($3, name),
        dosage = COALESCE($4, dosage),
        frequency = COALESCE($5, frequency),
        purpose = COALESCE($6, purpose),
        pharmacy = COALESCE($7, pharmacy),
        start_date = COALESCE($8, start_date),
        end_date = COALESCE($9, end_date),
        refills_remaining = COALESCE($10, refills_remaining),
        notes = COALESCE($11, notes),
        is_active = COALESCE($12, is_active),
        updated_at = NOW()
      WHERE id = $1::uuid
        AND patient_id = $2::uuid
        AND source_type = 'provider'
      RETURNING *
      `,
      [
        medicationId,
        patientId,
        name == null ? null : String(name).trim(),
        dosage == null ? null : String(dosage).trim(),
        frequency == null ? null : String(frequency).trim(),
        purpose == null ? null : String(purpose).trim(),
        pharmacy == null ? null : String(pharmacy).trim(),
        startDate || null,
        endDate || null,
        refillsRemaining == null || refillsRemaining === "" ? null : Number(refillsRemaining),
        notes == null ? null : String(notes).trim(),
        typeof isActive === "boolean" ? isActive : null,
      ]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Medication not found" });
    }

    await syncPatientMedicationSummary(patientId);
    const fresh = await fetchMedicationById(medicationId);
    return res.json({ medication: mapMedicationRow(fresh || result.rows[0]) });
  } catch (e: any) {
    console.error("PATCH /api/staff/patients/:patientId/medications/:medicationId error:", e);
    return res.status(500).json({ message: e?.message || "Failed to update medication" });
  }
});

app.get("/api/staff/patients/:id/health-summary", requireStaffAuth, async (req: any, res) => {
  const staffHospitalId = req.staffHospitalId;
  const patientId = String(req.params.id || "");

  if (!isUuid(patientId)) {
    return res.status(400).json({ message: "Invalid patient id" });
  }

  try {
    await seedConditionRowsFromSummary(patientId);
    await syncPatientConditionSummary(patientId);
    await syncPatientMedicationSummary(patientId);
    const relation = await pool.query(
      `
      SELECT 1
      WHERE EXISTS (
        SELECT 1
        FROM patient_hospital_connections phc
        WHERE phc.patient_id = $1::uuid
          AND phc.hospital_id = $2::uuid
          AND phc.disconnected_at IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM patient_provider_connections ppc
        WHERE ppc.patient_id = $1::uuid
          AND ppc.provider_id = $2::uuid
          AND ppc.disconnected_at IS NULL
      )
      LIMIT 1
      `,
      [patientId, staffHospitalId]
    );

    if ((relation.rowCount ?? 0) === 0) {
      return res.status(403).json({ message: "This patient is not linked to your hospital" });
    }

    const result = await pool.query(
      `
      SELECT patient_id, vitals, conditions, allergies, blood_type, current_medications, emergency_contacts, advance_directives, immunizations, family_history, updated_at
      FROM patient_health_summaries
      WHERE patient_id = $1::uuid
      LIMIT 1
      `,
      [patientId]
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.json({
        summary: {
          vitals: [],
          conditions: [],
          allergies: [],
          bloodType: null,
          currentMedications: [],
          emergencyContacts: [],
          advanceDirectives: {},
          immunizations: [],
          familyHistory: [],
          updatedAt: null,
        },
      });
    }

    return res.json({ summary: normalizeHealthSummaryRow(result.rows[0]) });
  } catch (e: any) {
    console.error("GET /api/staff/patients/:id/health-summary error:", e);
    return res.status(500).json({ message: e?.message || "Failed to fetch patient health summary" });
  }
});

app.get("/api/staff/documents", requireStaffAuth, async (req: any, res) => {
  const hospitalId = req.staffHospitalId;
  const category = normalizeDocumentCategory(req.query.category);
  const patientId = String(req.query.patientId || "").trim();
  const verification = String(req.query.verification || "all").trim().toLowerCase();
  const search = String(req.query.search || "").trim();
  const source = String(req.query.source || "all").trim().toLowerCase();

  const values: any[] = [hospitalId];
  const where: string[] = [
    `(
      d.hospital_id = $1::uuid
      OR EXISTS (
        SELECT 1
        FROM patient_provider_connections ppc
        WHERE ppc.patient_id = d.patient_id
          AND ppc.provider_id = $1::uuid
          AND ppc.disconnected_at IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM patient_hospital_connections phc
        WHERE phc.patient_id = d.patient_id
          AND phc.hospital_id = $1::uuid
          AND phc.disconnected_at IS NULL
      )
    )`,
    `(d.hospital_id IS NOT NULL OR d.uploaded_by_staff_id IS NOT NULL OR d.category = 'insurance')`,
  ];

  if (category) {
    values.push(category);
    where.push(`d.category = $${values.length}`);
  }

  if (isUuid(patientId)) {
    values.push(patientId);
    where.push(`d.patient_id = $${values.length}::uuid`);
  }

  if (verification === "verified") {
    where.push(`d.verification_status IN ('provider_uploaded', 'provider_verified', 'organization_verified')`);
  } else if (verification === "pending") {
    where.push(`d.verification_status IN ('unverified', 'patient_uploaded')`);
  } else if (verification === "rejected") {
    where.push(`d.verification_status = 'rejected'`);
  }

  if (source === "patient") {
    where.push(`d.uploaded_by_patient_id IS NOT NULL`);
  } else if (source === "provider") {
    where.push(`d.uploaded_by_staff_id IS NOT NULL`);
  }

  if (search) {
    values.push(`%${search}%`);
    where.push(`(
      d.title ILIKE $${values.length}
      OR COALESCE(d.subtype, '') ILIKE $${values.length}
      OR COALESCE(d.source_organization_name, '') ILIKE $${values.length}
      OR COALESCE(pp.first_name, '') ILIKE $${values.length}
      OR COALESCE(pp.last_name, '') ILIKE $${values.length}
    )`);
  }

  try {
    const result = await pool.query(
      `
      ${documentSelectSql}
      WHERE ${where.join(" AND ")}
      ORDER BY d.service_date DESC NULLS LAST, d.created_at DESC
      `,
      values
    );

    return res.json({
      documents: result.rows.map((row) => mapDocumentRow(row, "provider")),
    });
  } catch (e: any) {
    console.error("GET /api/staff/documents error:", e);
    return res.status(500).json({ message: e?.message || "Failed to fetch documents" });
  }
});

app.post("/api/staff/documents/upload", requireStaffAuth, async (req: any, res) => {
  const staffId = req.staffId;
  const hospitalId = req.staffHospitalId;
  const {
    patientId,
    category,
    subtype,
    title,
    description,
    sourceOrganizationName,
    serviceDate,
    fileName,
    mimeType,
    fileSizeBytes,
    fileDataUrl,
    requestId,
  } = req.body ?? {};

  const normalizedCategory = normalizeDocumentCategory(category);
  if (!isUuid(String(patientId)) || !normalizedCategory || !title || !fileName || !fileDataUrl) {
    return res.status(400).json({ message: "patientId, category, title, fileName, and fileDataUrl are required" });
  }

  if (requestId && !isUuid(String(requestId))) {
    return res.status(400).json({ message: "Invalid requestId" });
  }

  try {
    const relation = await pool.query(
      `
      SELECT h.name
      FROM hospitals h
      WHERE h.id = $2::uuid
        AND (
          EXISTS (
            SELECT 1
            FROM patient_hospital_connections phc
            WHERE phc.patient_id = $1::uuid
              AND phc.hospital_id = $2::uuid
              AND phc.disconnected_at IS NULL
          )
          OR EXISTS (
            SELECT 1
            FROM patient_provider_connections ppc
            WHERE ppc.patient_id = $1::uuid
              AND ppc.provider_id = $2::uuid
              AND ppc.disconnected_at IS NULL
          )
          OR EXISTS (
            SELECT 1
            FROM document_requests dr
            WHERE dr.id = $3::uuid
              AND dr.patient_id = $1::uuid
              AND dr.hospital_id = $2::uuid
              AND dr.status IN ('pending', 'viewed', 'in_progress')
          )
        )
      LIMIT 1
      `,
      [patientId, hospitalId, requestId || null]
    );

    if ((relation.rowCount ?? 0) === 0) {
      return res.status(403).json({ message: "This patient is not linked to your hospital" });
    }

    const documentId = randomUUID();
    await pool.query(
      `
      INSERT INTO medical_documents (
        id, patient_id, hospital_id, uploaded_by_staff_id, request_id, source_type, source_organization_name,
        category, subtype, title, description, verification_status, visibility_status, service_date, verified_at, verified_by_staff_id
      )
      VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, 'provider', $6,
        $7, $8, $9, $10, 'provider_uploaded', 'patient_and_connected_providers', $11, NOW(), $4::uuid
      )
      `,
      [
        documentId,
        patientId,
        hospitalId,
        staffId,
        requestId || null,
        String(sourceOrganizationName || relation.rows[0].name || "Provider upload").trim(),
        normalizedCategory,
        subtype ? String(subtype).trim() : null,
        String(title).trim(),
        description ? String(description).trim() : null,
        serviceDate || null,
      ]
    );

    await pool.query(
      `
      INSERT INTO document_files (
        id, document_id, file_name, mime_type, file_size_bytes, storage_url, is_primary
      )
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, true)
      `,
      [
        randomUUID(),
        documentId,
        String(fileName).trim(),
        mimeType ? String(mimeType).trim() : null,
        Number(fileSizeBytes) || null,
        String(fileDataUrl),
      ]
    );

    if (requestId) {
      const requestUpdate = await pool.query(
        `
        UPDATE document_requests
        SET status = 'fulfilled',
            linked_document_id = $2::uuid,
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = $1::uuid
          AND hospital_id = $3::uuid
        RETURNING conversation_id
        `,
        [requestId, documentId, hospitalId]
      );

      const conversationId = String(requestUpdate.rows[0]?.conversation_id || "");
      if (conversationId) {
        const staffNameResult = await pool.query(
          `
          SELECT full_name
          FROM staff_accounts
          WHERE id = $1::uuid
          LIMIT 1
          `,
          [staffId]
        );

        const providerName = String(staffNameResult.rows[0]?.full_name || "Your provider").trim();
        const fulfillmentMessage = `Dr. ${providerName} has fulfilled the medical record request.`;

        await pool.query(
          `
          INSERT INTO message_items (conversation_id, sender_type, sender_staff_id, body)
          VALUES ($1::uuid, 'staff', $2::uuid, $3)
          `,
          [conversationId, staffId, fulfillmentMessage]
        );

        await pool.query(
          `
          UPDATE message_conversations
          SET last_message_preview = $2,
              last_message_at = NOW(),
              updated_at = NOW()
          WHERE id = $1::uuid
          `,
          [conversationId, fulfillmentMessage.slice(0, 200)]
        );
      }
    }

    const fresh = await pool.query(
      `
      ${documentSelectSql}
      WHERE d.id = $1::uuid
      LIMIT 1
      `,
      [documentId]
    );

    return res.status(201).json({ document: mapDocumentRow(fresh.rows[0], "provider") });
  } catch (e: any) {
    console.error("POST /api/staff/documents/upload error:", e);
    return res.status(500).json({ message: e?.message || "Failed to upload document" });
  }
});

app.get("/api/staff/document-requests", requireStaffAuth, async (req: any, res) => {
  const hospitalId = req.staffHospitalId;
  const status = String(req.query.status || "all").trim().toLowerCase();

  const values: any[] = [hospitalId];
  const where: string[] = [`r.hospital_id = $1::uuid`];

  if (status !== "all" && DOCUMENT_REQUEST_STATUSES.has(status)) {
    values.push(status);
    where.push(`r.status = $${values.length}`);
  }

  try {
    const result = await pool.query(
      `
      SELECT
        r.id,
        r.patient_id,
        r.hospital_id,
        r.category,
        r.subtype,
        r.message,
        r.status,
        r.linked_document_id,
        r.created_at,
        r.updated_at,
        r.resolved_at,
        h.name AS hospital_name,
        NULLIF(TRIM(COALESCE(pp.first_name, '') || ' ' || COALESCE(pp.last_name, '')), '') AS patient_name
      FROM document_requests r
      JOIN hospitals h ON h.id = r.hospital_id
      LEFT JOIN patient_profiles pp ON pp.patient_id = r.patient_id
      WHERE ${where.join(" AND ")}
      ORDER BY r.created_at DESC
      `,
      values
    );

    return res.json({
      requests: result.rows.map((row) => ({
        id: String(row.id),
        patientId: String(row.patient_id),
        patientName: row.patient_name || "Patient",
        hospitalId: String(row.hospital_id),
        hospitalName: row.hospital_name,
        category: row.category,
        subtype: row.subtype || null,
        message: row.message || "",
        status: row.status,
        linkedDocumentId: row.linked_document_id ? String(row.linked_document_id) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        resolvedAt: row.resolved_at,
      })),
    });
  } catch (e: any) {
    console.error("GET /api/staff/document-requests error:", e);
    return res.status(500).json({ message: e?.message || "Failed to fetch requests" });
  }
});


// GET connected providers for the logged-in patient
// GET /api/patient/connected-providers
app.get("/api/patient/connected-providers", requireAuth, async (req, res) => {
  const patientId = req.user?.id;

  if (!patientId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const result = await pool.query(
      `
      SELECT
        s.id,
        s.full_name,
        s.email,
        s.role,
        s.phone,
        s.hospital_id,
        h.name AS hospital_name,
        h.city AS hospital_city
      FROM patient_provider_connections c
      JOIN staff_accounts s ON s.id = c.provider_id
      JOIN hospitals h ON h.id = s.hospital_id
      WHERE c.patient_id = $1
        AND c.disconnected_at IS NULL
      ORDER BY s.full_name ASC
      `,
      [patientId]
    );

    const mapped = result.rows.map((r) => ({
      id: String(r.id),
      name: r.full_name,
      email: r.email,
      role: r.role,
      phone: r.phone,
      hospitalId: String(r.hospital_id),
      hospitalName: r.hospital_name,
      hospitalCity: r.hospital_city,
    }));

    return res.json(mapped);
  } catch (err: any) {
    console.error("GET /api/patient/connected-providers error:", err);
    return res.status(500).json({ message: err?.message || "Failed to fetch connected providers" });
  }
});

const port = Number(process.env.PORT || 4000);

async function initializeSchemas() {
  await ensureDocumentsSchema();
  await ensureHealthSummarySchema();
  await ensureMedicationsSchema();
  await ensureConditionsSchema();
}

function startServer() {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Backend running on http://0.0.0.0:${port}`);
  });
}

startServer();

initializeSchemas()
  .then(() => {
    startupStatus = "ready";
  })
  .catch((error) => {
    startupStatus = "degraded";
    console.error("Backend schema bootstrap failed:", error);
  });

// const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// app.listen(PORT, () => {
//   console.log(`API running on port ${PORT}`);
// });
