import "dotenv/config";
console.log("DATABASE_URL at startup:", process.env.DATABASE_URL);

import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { pool } from "./db";
import { randomUUID, randomBytes } from "crypto";
import aiRouter from './ai';

const app = express();

const allowList = new Set([
  "http://localhost:3000",
  "http://10.0.0.203:3000",

  "http://localhost:5173",
  "http://localhost:5174",
  "http://10.0.0.203:5173",
  "http://10.0.0.203:5174",
]);

app.use(
  cors({
    origin(origin, cb) {
      // allow curl/postman (no origin) + server-to-server
      if (!origin) return cb(null, true);

      // allow exact matches
      if (allowList.has(origin)) return cb(null, true);

      // allow any localhost port (vite can change ports)
      if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);

      // allow your LAN IP on any port
      if (/^http:\/\/10\.0\.0\.203:\d+$/.test(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
  })
);





app.use(express.json());
app.use('/api/ai', aiRouter);

// IMPORTANT: this should be reachable from iPhone.
// For now you can hardcode your LAN IP, or set FRONTEND_BASE_URL in .env
const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL || "http://10.0.0.203:3000";

// URL-safe token without relying on Node's base64url support
const makeUrlSafeToken = () => {
  return randomBytes(24)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
app.get("/health", (_req, res) => res.status(200).send("ok"));


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
  const { email, password, acceptedTerms } = req.body;

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
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
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
        id,
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
        $1,$1,
        true,true,true,true,
        true,true,false,
        $2,$3,$4,
        NOW()
      )
      ON CONFLICT (patient_id) DO UPDATE SET
        blood_type = EXCLUDED.blood_type,
        allergies = EXCLUDED.allergies,
        medical_conditions = EXCLUDED.medical_conditions,
        updated_at = NOW()
      `,
      [
        id,
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

  return res.status(201).json(result.rows[0]); // { id, email }
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
 * Sign in existing patient
 * POST /api/auth/signin
 */
app.post("/api/auth/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing email or password" });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, password_hash
       FROM patients
       WHERE email = $1`,
      [String(email).toLowerCase()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(String(password), user.password_hash);

    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
    });
  } catch (e: any) {
    console.error("SIGNIN ERROR:", e);
    return res.status(500).json({
      message: e?.message || String(e),
      code: e?.code,
    });
  }
});

/**
 * Create/Update patient profile (upsert)
 * PUT /api/patients/:patientId/profile
 */
app.put("/api/patients/:patientId/profile", async (req, res) => {
  const { patientId } = req.params;

  // Expect camelCase from frontend
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

  // Optional postal validation (very light)
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
         $1, $1,
         $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11,
         $12,
         $13, $14, $15, $16, $17
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
        patientId,
        firstName ?? null,
        lastName ?? null,
        dob ?? null,
        healthCard ?? null,
        phoneNumber ?? null,

        h.line1 ?? null,
        h.line2 ?? null,
        h.city ?? null,
        (h.province ?? "ON") || "ON",
        normalizePostal(h.postalCode),

        mailSame,

        (mailSame ? h.line1 : m.line1) ?? null,
        (mailSame ? h.line2 : m.line2) ?? null,
        (mailSame ? h.city : m.city) ?? null,
        ((mailSame ? h.province : m.province) ?? "ON") || "ON",
        normalizePostal(mailSame ? h.postalCode : m.postalCode),
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

    const result = await pool.query(
      `
      SELECT
        p.id as patient_id,
        p.email,

        -- patient_profiles
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

        -- emergency_profiles (THIS is where your toggle + emergency data is)
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
        ep.emergency_contacts,
        ep.emergency_contact_full_name,
        ep.emergency_contact_relationship,
        ep.emergency_contact_phone,


        ep.created_at as emergency_created_at,
        ep.updated_at as emergency_updated_at,

        -- keep a timestamp available for profile too
        pp.created_at as profile_created_at

      FROM patients p
      LEFT JOIN patient_profiles pp ON pp.patient_id = p.id
      LEFT JOIN emergency_profiles ep ON ep.patient_id = p.id
      WHERE p.id = $1
      LIMIT 1
      `,
      [patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    return res.status(200).json(result.rows[0]);
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
         pp.health_card
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
         blood_type,
         allergies,
         medical_conditions,
         current_medications,
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
      blood_type: null,
      allergies: null,
      medical_conditions: null,
      current_medications: null,
      emergency_contact_full_name: null,
      emergency_contact_relationship: null,
      emergency_contact_phone: null,
      dnr_status: null,
      living_will: null,
      updated_at: null,
    };

    return res.status(200).json({
      ...personal.rows[0],
      ...(emergency.rowCount ? emergency.rows[0] : defaults),
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
app.put("/api/patients/:patientId/emergency-profile", async (req, res) => {
  const { patientId } = req.params;

  const {
    sharePersonalInfo,
    shareBloodType,
    shareAllergies,
    shareMedicalConditions,
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
         $1, $1,
         $2,$3,$4,$5,$6,$7,$8,
         $9,$10,$11,$12,
         $13,$14,$15,
         $16,$17,
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
        patientId,
        !!sharePersonalInfo,
        !!shareBloodType,
        !!shareAllergies,
        !!shareMedicalConditions,
        !!shareCurrentMedications,
        !!shareEmergencyContacts,
        !!shareAdvanceDirectives,
        bloodType ?? null,
        allergies ?? null,
        medicalConditions ?? null,
        currentMedications ?? null,
        emergencyContactFullName ?? null,
        emergencyContactRelationship ?? null,
        emergencyContactPhone ?? null,
        dnrStatus ?? null,
        livingWill ?? null,
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
         pp.health_card
       FROM patients p
       LEFT JOIN patient_profiles pp ON pp.patient_id = p.id
       WHERE p.id = $1`,
      [patientId]
    );

    if (personal.rowCount === 0) return res.status(404).json({ message: "Patient not found" });

    // Emergency sharing + fields
    const emergency = await pool.query(
      `SELECT
         share_personal_info,
         share_blood_type,
         share_allergies,
         share_medical_conditions,
         share_current_medications,
         share_emergency_contacts,
         share_advance_directives,
         blood_type,
         allergies,
         medical_conditions,
         current_medications,
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
      blood_type: null,
      allergies: null,
      medical_conditions: null,
      current_medications: null,
      emergency_contact_full_name: null,
      emergency_contact_relationship: null,
      emergency_contact_phone: null,
      dnr_status: null,
      living_will: null,
      updated_at: null,
    };

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
    });
  } catch (e: any) {
    console.error("EMERGENCY BY TOKEN ERROR:", e);
    return res.status(500).json({ message: e?.message || String(e), code: e?.code });
  }
});
// /**
//  * Public emergency view by token (for QR)
//  * GET /api/emergency/:token
//  */
// app.get("/api/emergency/:token", async (req, res) => {
//   const { token } = req.params;

//   try {
//     // Prevent caching (very important for Safari)
//     res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
//     res.setHeader("Pragma", "no-cache");
//     res.setHeader("Expires", "0");

//     // 1) token -> patient_id
//     const link = await pool.query(
//       `SELECT patient_id
//        FROM emergency_links
//        WHERE token = $1 AND revoked = FALSE
//        LIMIT 1`,
//       [token]
//     );

//     if (link.rowCount === 0) {
//       return res.status(404).json({ message: "Invalid or revoked emergency link" });
//     }

//     const patientId = link.rows[0].patient_id;

//     // 2) Pull personal + emergency data
//     const personal = await pool.query(
//       `SELECT
//          p.id as patient_id,
//          p.email,
//          pp.first_name,
//          pp.last_name,
//          pp.dob,
//          pp.health_card
//        FROM patients p
//        LEFT JOIN patient_profiles pp ON pp.patient_id = p.id
//        WHERE p.id = $1`,
//       [patientId]
//     );

//     const emergency = await pool.query(
//       `SELECT
//          share_personal_info,
//          share_blood_type,
//          share_allergies,
//          share_medical_conditions,
//          share_current_medications,
//          share_emergency_contacts,
//          share_advance_directives,
//          blood_type,
//          allergies,
//          medical_conditions,
//          current_medications,
//          emergency_contact_full_name,
//          emergency_contact_relationship,
//          emergency_contact_phone,
//          dnr_status,
//          living_will,
//          updated_at
//        FROM emergency_profiles
//        WHERE patient_id = $1`,
//       [patientId]
//     );

//     // Defaults if emergency profile not created yet
//     const defaults = {
//       share_personal_info: true,
//       share_blood_type: true,
//       share_allergies: true,
//       share_medical_conditions: true,
//       share_current_medications: true,
//       share_emergency_contacts: true,
//       share_advance_directives: false,
//       blood_type: null,
//       allergies: null,
//       medical_conditions: null,
//       current_medications: null,
//       emergency_contact_full_name: null,
//       emergency_contact_relationship: null,
//       emergency_contact_phone: null,
//       dnr_status: null,
//       living_will: null,
//       updated_at: null,
//     };

//     const e = emergency.rowCount ? emergency.rows[0] : defaults;
//     const p = personal.rows[0];

//     // 3) Apply share toggles (THIS is usually what’s missing)
//     const response: any = { updated_at: e.updated_at };

//     if (e.share_personal_info) {
//       response.first_name = p.first_name;
//       response.last_name = p.last_name;
//       response.dob = p.dob;
//       response.health_card = p.health_card;
//     }

//     if (e.share_blood_type) response.blood_type = e.blood_type;
//     if (e.share_allergies) response.allergies = e.allergies;
//     if (e.share_medical_conditions) response.medical_conditions = e.medical_conditions;
//     if (e.share_current_medications) response.current_medications = e.current_medications;

//     if (e.share_emergency_contacts) {
//       response.emergency_contact_full_name = e.emergency_contact_full_name;
//       response.emergency_contact_relationship = e.emergency_contact_relationship;
//       response.emergency_contact_phone = e.emergency_contact_phone;
//     }

//     if (e.share_advance_directives) {
//       response.dnr_status = e.dnr_status;
//       response.living_will = e.living_will;
//     }

//     return res.status(200).json(response);
//   } catch (err: any) {
//     console.error("PUBLIC EMERGENCY ERROR:", err);
//     return res.status(500).json({ message: err?.message || String(err) });
//   }
// });


// const port = Number(process.env.PORT || 4000);
// app.listen(port, () => {
//   console.log(`Backend running on http://localhost:${port}`);
// });
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

