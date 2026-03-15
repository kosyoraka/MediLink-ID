#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const sourceEnv = dotenv.parse(
  fs.readFileSync(path.resolve(__dirname, "..", ".env"))
);
const targetEnv = dotenv.parse(
  fs.readFileSync(path.resolve(__dirname, "..", ".env.docker"))
);

const TABLE_CONFIG = [
  { name: "hospitals", conflictColumns: ["id"], naturalKeyColumns: ["name"] },
  { name: "patients", conflictColumns: ["email"], naturalKeyColumns: ["email"] },
  { name: "staff_accounts", conflictColumns: ["email"], naturalKeyColumns: ["email"] },
  { name: "pending_patient_intake", conflictColumns: ["email"], naturalKeyColumns: ["email"] },
  { name: "patient_profiles", conflictColumns: ["patient_id"], naturalKeyColumns: ["patient_id"] },
  { name: "emergency_profiles", conflictColumns: ["patient_id"], naturalKeyColumns: ["patient_id"] },
  { name: "patient_hospital_connections", conflictColumns: ["id"] },
  { name: "patient_provider_connections", conflictColumns: ["id"] },
  { name: "email_verifications", conflictColumns: ["id"] },
  { name: "appointments", conflictColumns: ["id"] },
  { name: "message_conversations", conflictColumns: ["id"] },
  { name: "message_items", conflictColumns: ["id"] },
  { name: "emergency_links", conflictColumns: ["id"] },
  { name: "oauth_identities", conflictColumns: ["provider", "provider_sub"], naturalKeyColumns: ["provider", "provider_sub"] },
  { name: "document_requests", conflictColumns: ["id"] },
  { name: "medical_documents", conflictColumns: ["id"] },
  { name: "document_files", conflictColumns: ["id"] },
  { name: "patient_health_summaries", conflictColumns: ["patient_id"], naturalKeyColumns: ["patient_id"] },
  { name: "patient_medications", conflictColumns: ["id"] },
  { name: "patient_conditions", conflictColumns: ["id"] },
  { name: "medication_change_requests", conflictColumns: ["id"] },
  { name: "medication_intake_logs", conflictColumns: ["id"] },
];

function getTargetSslConfig() {
  return {
    rejectUnauthorized: targetEnv.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
  };
}

async function fetchColumns(client, tableName) {
  const result = await client.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
      order by ordinal_position
    `,
    [tableName]
  );

  return result.rows.map((row) => row.column_name);
}

async function fetchJsonColumns(client, tableName) {
  const result = await client.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and udt_name in ('json', 'jsonb')
    `,
    [tableName]
  );

  return new Set(result.rows.map((row) => row.column_name));
}

async function fetchAllRows(client, tableName, columns) {
  const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
  const result = await client.query(`select ${quotedColumns} from public.${tableName}`);
  return result.rows;
}

async function fetchCount(client, tableName) {
  const result = await client.query(`select count(*)::int as count from public.${tableName}`);
  return result.rows[0].count;
}

async function fetchExistingRowsByNaturalKey(client, tableName, columns) {
  if (!columns || columns.length === 0) return new Map();

  const rows = await fetchAllRows(client, tableName, await fetchColumns(client, tableName));
  const index = new Map();

  for (const row of rows) {
    const key = columns.map((column) => String(row[column] ?? "")).join("::");
    index.set(key, row);
  }

  return index;
}

function remapForeignKeys(tableName, row, idMaps) {
  const next = { ...row };

  const remap = (column, mapName) => {
    if (!next[column]) return;
    next[column] = idMaps[mapName].get(String(next[column])) || next[column];
  };

  remap("patient_id", "patients");
  remap("uploaded_by_patient_id", "patients");
  remap("sender_patient_id", "patients");
  remap("requested_by_patient_id", "patients");

  remap("staff_id", "staff");
  remap("uploaded_by_staff_id", "staff");
  remap("verified_by_staff_id", "staff");
  remap("resolved_by_staff_id", "staff");

  remap("hospital_id", "hospitals");
  remap("provider_id", "hospitals");

  remap("conversation_id", "message_conversations");
  remap("document_id", "medical_documents");
  remap("linked_document_id", "medical_documents");
  remap("replaced_by_document_id", "medical_documents");
  remap("request_id", "document_requests");
  remap("medication_id", "patient_medications");

  if (tableName === "patients") {
    next.email = next.email ? String(next.email).toLowerCase() : next.email;
  }
  if (tableName === "staff_accounts") {
    next.email = next.email ? String(next.email).toLowerCase() : next.email;
  }
  if (tableName === "oauth_identities") {
    next.email = next.email ? String(next.email).toLowerCase() : next.email;
  }

  return next;
}

function normalizeValueForTarget(column, value, jsonColumns) {
  if (value == null) return value;
  if (!jsonColumns.has(column)) return value;
  return JSON.stringify(value);
}

function buildUpsertQuery(tableName, columns, conflictColumns) {
  const quotedColumns = columns.map((column) => `"${column}"`);
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const updateColumns = columns.filter(
    (column) => column !== "id" && !conflictColumns.includes(column)
  );

  const updateSql =
    updateColumns.length === 0
      ? "NOTHING"
      : `UPDATE SET ${updateColumns
          .map((column) => `"${column}" = EXCLUDED."${column}"`)
          .join(", ")}`;

  return `
    INSERT INTO public.${tableName} (${quotedColumns.join(", ")})
    VALUES (${placeholders.join(", ")})
    ON CONFLICT (${conflictColumns.map((column) => `"${column}"`).join(", ")})
    DO ${updateSql}
  `;
}

async function printReport(sourceClient, targetClient) {
  console.log("GCP -> Supabase report");
  console.log("");

  for (const config of TABLE_CONFIG) {
    const sourceCount = await fetchCount(sourceClient, config.name);
    const targetCount = await fetchCount(targetClient, config.name);
    console.log(`${config.name}: source=${sourceCount}, target=${targetCount}`);
  }

  console.log("");
  console.log("Duplicate-risk checks");

  for (const config of TABLE_CONFIG) {
    if (!config.naturalKeyColumns?.length) continue;

    const sourceColumns = await fetchColumns(sourceClient, config.name);
    const sourceRows = await fetchAllRows(sourceClient, config.name, sourceColumns);
    const targetIndex = await fetchExistingRowsByNaturalKey(
      targetClient,
      config.name,
      config.naturalKeyColumns
    );

    const conflicts = [];
    for (const row of sourceRows) {
      const key = config.naturalKeyColumns.map((column) => String(row[column] ?? "")).join("::");
      if (!key.replace(/:/g, "")) continue;

      const existing = targetIndex.get(key);
      if (!existing) continue;

      if (row.id && existing.id && String(row.id) !== String(existing.id)) {
        conflicts.push({
          key,
          sourceId: row.id,
          targetId: existing.id,
        });
      }
    }

    if (conflicts.length === 0) {
      console.log(`${config.name}: no natural-key conflicts`);
      continue;
    }

    console.log(`${config.name}: ${conflicts.length} natural-key conflict(s)`);
    conflicts.slice(0, 10).forEach((conflict) => {
      console.log(
        `  key=${conflict.key} sourceId=${conflict.sourceId} targetId=${conflict.targetId}`
      );
    });
  }
}

async function applyMigration(sourceClient, targetClient) {
  console.log("Applying GCP source data to Supabase...");

  const idMaps = {
    patients: new Map(),
    staff: new Map(),
    hospitals: new Map(),
    message_conversations: new Map(),
    document_requests: new Map(),
    medical_documents: new Map(),
    patient_medications: new Map(),
  };

  for (const config of TABLE_CONFIG) {
    const sourceColumns = await fetchColumns(sourceClient, config.name);
    const targetColumns = await fetchColumns(targetClient, config.name);
    const targetJsonColumns = await fetchJsonColumns(targetClient, config.name);
    const sharedColumns = sourceColumns.filter((column) => targetColumns.includes(column));
    const rawRows = await fetchAllRows(sourceClient, config.name, sharedColumns);
    const rows = rawRows.map((row) => remapForeignKeys(config.name, row, idMaps));

    if (rows.length === 0) {
      console.log(`${config.name}: no source rows, skipping`);
      continue;
    }

    const naturalKeyColumns = config.naturalKeyColumns ?? [];
    if (naturalKeyColumns.length > 0) {
      const targetIndex = await fetchExistingRowsByNaturalKey(
        targetClient,
        config.name,
        naturalKeyColumns
      );

      const conflicts = rows.filter((row) => {
        const key = naturalKeyColumns.map((column) => String(row[column] ?? "")).join("::");
        if (!key.replace(/:/g, "")) return false;
        const existing = targetIndex.get(key);
        const mergesOnNaturalKey =
          config.conflictColumns.length === naturalKeyColumns.length &&
          config.conflictColumns.every((column) => naturalKeyColumns.includes(column));

        if (mergesOnNaturalKey) return false;
        return Boolean(existing?.id && row.id && String(existing.id) !== String(row.id));
      });

      if (conflicts.length > 0) {
        throw new Error(
          `${config.name} has natural-key conflicts. Resolve them before applying migration.`
        );
      }
    }

    const query = buildUpsertQuery(config.name, sharedColumns, config.conflictColumns);
    const returnColumns = [];
    if (targetColumns.includes("id")) returnColumns.push("id");
    if (targetColumns.includes("patient_id")) returnColumns.push("patient_id");
    if (targetColumns.includes("email")) returnColumns.push("email");
    if (targetColumns.includes("name")) returnColumns.push("name");
    if (targetColumns.includes("provider")) returnColumns.push("provider");
    if (targetColumns.includes("provider_sub")) returnColumns.push("provider_sub");

    const returningQuery =
      returnColumns.length === 0
        ? query
        : `${query} RETURNING ${returnColumns
            .map((column) => `"${column}"`)
            .join(", ")}`;

    for (const row of rows) {
      const values = sharedColumns.map((column) =>
        normalizeValueForTarget(column, row[column], targetJsonColumns)
      );
      const result = await targetClient.query(returningQuery, values);
      const inserted = result.rows[0] || {};

      if (config.name === "patients" && row.id && inserted.id) {
        idMaps.patients.set(String(row.id), String(inserted.id));
      }
      if (config.name === "staff_accounts" && row.id && inserted.id) {
        idMaps.staff.set(String(row.id), String(inserted.id));
      }
      if (config.name === "hospitals" && row.id && inserted.id) {
        idMaps.hospitals.set(String(row.id), String(inserted.id));
      }
      if (config.name === "message_conversations" && row.id && inserted.id) {
        idMaps.message_conversations.set(String(row.id), String(inserted.id));
      }
      if (config.name === "document_requests" && row.id && inserted.id) {
        idMaps.document_requests.set(String(row.id), String(inserted.id));
      }
      if (config.name === "medical_documents" && row.id && inserted.id) {
        idMaps.medical_documents.set(String(row.id), String(inserted.id));
      }
      if (config.name === "patient_medications" && row.id && inserted.id) {
        idMaps.patient_medications.set(String(row.id), String(inserted.id));
      }
    }

    console.log(`${config.name}: upserted ${rows.length} row(s)`);
  }
}

async function main() {
  const mode = process.argv[2] || "report";
  if (!["report", "apply"].includes(mode)) {
    console.error("Usage: node scripts/migrate-gcp-to-supabase.js [report|apply]");
    process.exit(1);
  }

  if (!sourceEnv.DATABASE_URL) {
    throw new Error("Missing source env var: DATABASE_URL");
  }

  if (!targetEnv.SHADOW_DATABASE_URL) {
    throw new Error("Missing target env var: SHADOW_DATABASE_URL");
  }

  const sourceClient = new Client({
    connectionString: sourceEnv.DATABASE_URL,
    ssl: false,
  });

  const targetClient = new Client({
    connectionString: targetEnv.SHADOW_DATABASE_URL,
    ssl: getTargetSslConfig(),
  });

  await sourceClient.connect();
  await targetClient.connect();

  try {
    if (mode === "report") {
      await printReport(sourceClient, targetClient);
    } else {
      await targetClient.query("BEGIN");
      await applyMigration(sourceClient, targetClient);
      await targetClient.query("COMMIT");
      console.log("Migration completed.");
    }
  } catch (error) {
    if (mode === "apply") {
      await targetClient.query("ROLLBACK");
    }
    throw error;
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
