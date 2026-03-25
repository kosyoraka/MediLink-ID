#!/usr/bin/env node
require("dotenv").config({ path: ".env.docker" });

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const DUMP_PATH = path.resolve(__dirname, "..", "medilink.sql");

const TABLE_CONFIG = [
  { name: "hospitals", conflictColumns: ["id"], naturalKeyColumns: ["name"] },
  { name: "patients", conflictColumns: ["id"], naturalKeyColumns: ["email"] },
  { name: "staff_accounts", conflictColumns: ["id"], naturalKeyColumns: ["email"] },
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
];

function getSslConfig() {
  return {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
  };
}

function decodeCopyValue(value) {
  if (value === "\\N") return null;

  return value.replace(/\\([\\btnrfv])/g, (_, ch) => {
    switch (ch) {
      case "b":
        return "\b";
      case "t":
        return "\t";
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "f":
        return "\f";
      case "v":
        return "\v";
      case "\\":
        return "\\";
      default:
        return ch;
    }
  });
}

function parseLegacyDump(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const tables = new Map();

  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");

    if (!current) {
      const match = line.match(/^COPY public\.([a-z_]+) \((.+)\) FROM stdin;$/);
      if (!match) continue;

      current = {
        name: match[1],
        columns: match[2].split(", ").map((column) => column.trim()),
        rows: [],
      };
      tables.set(current.name, current);
      continue;
    }

    if (line === "\\.") {
      current = null;
      continue;
    }

    const values = line.split("\t").map(decodeCopyValue);
    const row = {};
    current.columns.forEach((column, index) => {
      row[column] = values[index] ?? null;
    });
    current.rows.push(row);
  }

  return tables;
}

async function fetchTargetCount(client, tableName) {
  const result = await client.query(`SELECT COUNT(*)::int AS count FROM public.${tableName}`);
  return result.rows[0].count;
}

async function fetchExistingRowsByNaturalKey(client, tableName, columns) {
  if (!columns || columns.length === 0) return new Map();

  const result = await client.query(
    `SELECT * FROM public.${tableName}`
  );

  const index = new Map();
  for (const row of result.rows) {
    const key = columns.map((column) => String(row[column] ?? "")).join("::");
    index.set(key, row);
  }
  return index;
}

function buildUpsertQuery(tableName, columns, conflictColumns) {
  const quotedColumns = columns.map((column) => `"${column}"`);
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const updateColumns = columns.filter((column) => !conflictColumns.includes(column));

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

async function printReport(client, dumpTables) {
  console.log("Legacy dump -> Supabase report");
  console.log("");

  for (const config of TABLE_CONFIG) {
    const sourceRows = dumpTables.get(config.name)?.rows ?? [];
    const targetCount = await fetchTargetCount(client, config.name);
    console.log(`${config.name}: source=${sourceRows.length}, target=${targetCount}`);
  }

  console.log("");
  console.log("Duplicate-risk checks");

  for (const config of TABLE_CONFIG) {
    if (!config.naturalKeyColumns?.length) continue;

    const sourceRows = dumpTables.get(config.name)?.rows ?? [];
    const targetIndex = await fetchExistingRowsByNaturalKey(
      client,
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

async function applyMigration(client, dumpTables) {
  console.log("Applying legacy dump to Supabase...");

  for (const config of TABLE_CONFIG) {
    const table = dumpTables.get(config.name);
    if (!table || table.rows.length === 0) {
      console.log(`${config.name}: no source rows, skipping`);
      continue;
    }

    const naturalKeyColumns = config.naturalKeyColumns ?? [];
    if (naturalKeyColumns.length > 0) {
      const targetIndex = await fetchExistingRowsByNaturalKey(
        client,
        config.name,
        naturalKeyColumns
      );

      const conflicts = table.rows.filter((row) => {
        const key = naturalKeyColumns.map((column) => String(row[column] ?? "")).join("::");
        if (!key.replace(/:/g, "")) return false;
        const existing = targetIndex.get(key);
        return Boolean(existing?.id && row.id && String(existing.id) !== String(row.id));
      });

      if (conflicts.length > 0) {
        throw new Error(
          `${config.name} has natural-key conflicts. Resolve them before applying migration.`
        );
      }
    }

    const query = buildUpsertQuery(config.name, table.columns, config.conflictColumns);

    for (const row of table.rows) {
      const values = table.columns.map((column) => row[column]);
      await client.query(query, values);
    }

    console.log(`${config.name}: upserted ${table.rows.length} row(s)`);
  }
}

async function main() {
  const mode = process.argv[2] || "report";
  if (!["report", "apply"].includes(mode)) {
    console.error("Usage: node scripts/migrate-legacy-dump.js [report|apply]");
    process.exit(1);
  }

  if (!process.env.SHADOW_DATABASE_URL) {
    throw new Error("Missing env var: SHADOW_DATABASE_URL");
  }

  const dumpTables = parseLegacyDump(DUMP_PATH);
  const client = new Client({
    connectionString: process.env.SHADOW_DATABASE_URL,
    ssl: getSslConfig(),
  });

  await client.connect();

  try {
    if (mode === "report") {
      await printReport(client, dumpTables);
    } else {
      await client.query("BEGIN");
      await applyMigration(client, dumpTables);
      await client.query("COMMIT");
      console.log("Migration completed.");
    }
  } catch (error) {
    if (mode === "apply") {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
