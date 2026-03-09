import "dotenv/config";
console.log("DATABASE_URL at startup:", process.env.DATABASE_URL);

import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { pool } from "./db";
import { randomUUID, randomBytes } from "crypto";
import aiRouter from './ai';
import * as jwt from "jsonwebtoken";
import { requirePatient } from "./middleware/requirePatient";
//import { requireAuth, requirePatientAuth } from "./middleware/requireAuth";
import { requireAuth, requireStaffAuth, requirePatientAuth } 
  from "./middleware/requireAuth";







const app = express();

const allowList = new Set([
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

app.use(
  cors({
    origin(origin, cb) {
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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
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
const token = jwt.sign(
  {
    id: staff.id,               // used everywhere
    email: staff.email,
    role: "staff",
    providerId: staff.id,       // ✅ THIS IS THE KEY FIX
    hospitalId: staff.hospital_id,
  },
  process.env.JWT_SECRET as string,
  { expiresIn: "1d" }
);


// return res.json({
//   token,
//   staff: {
//     id: staff.id,
//     email: staff.email,
//     providerId: staff.provider_id,
//     hospitalId: staff.hospital_id,
//   },
// });
return res.json({
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
        !!shareMedicalConditions,   // $6
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
 * Get hospitals the patient is connected to (hospital-level access)
 * GET /api/patient/hospitals?patientId=...
 */
app.get("/api/patient/hospitals", async (req, res) => {
  try {
    const patientId = req.query.patientId as string;
    if (!patientId) return res.status(400).json({ message: "Missing patientId" });

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
// app.listen(port, () => {
//   console.log(`Backend running on http://localhost:${port}`);
// });
app.listen(port, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${port}`);
});

// const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// app.listen(PORT, () => {
//   console.log(`API running on port ${PORT}`);
// });

