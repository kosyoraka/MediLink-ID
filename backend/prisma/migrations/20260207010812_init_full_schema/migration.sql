-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "provider_name" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "type" TEXT NOT NULL,
    "location_name" TEXT,
    "address" TEXT,
    "join_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "notes" TEXT,
    "visit_summary_available" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "staff_id" UUID,
    "hospital_id" UUID NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_links" (
    "id" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_profiles" (
    "id" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "share_blood_type" BOOLEAN NOT NULL DEFAULT false,
    "share_allergies" BOOLEAN NOT NULL DEFAULT false,
    "share_chronic_conditions" BOOLEAN NOT NULL DEFAULT false,
    "share_current_medications" BOOLEAN NOT NULL DEFAULT false,
    "share_emergency_contacts" BOOLEAN NOT NULL DEFAULT false,
    "blood_type" TEXT,
    "allergies" TEXT,
    "chronic_conditions" TEXT,
    "current_medications" TEXT,
    "emergency_contacts" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "share_personal_info" BOOLEAN NOT NULL DEFAULT true,
    "share_medical_conditions" BOOLEAN NOT NULL DEFAULT true,
    "share_advance_directives" BOOLEAN NOT NULL DEFAULT false,
    "medical_conditions" TEXT,
    "emergency_contact_full_name" TEXT,
    "emergency_contact_relationship" TEXT,
    "emergency_contact_phone" TEXT,
    "dnr_status" TEXT,
    "living_will" TEXT,

    CONSTRAINT "emergency_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospitals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "last_message_preview" TEXT,
    "last_message_at" TIMESTAMPTZ(6),
    "patient_last_read_at" TIMESTAMPTZ(6),
    "staff_last_read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "sender_type" TEXT NOT NULL,
    "sender_patient_id" UUID,
    "sender_staff_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_hospital_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "connected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnected_at" TIMESTAMPTZ(6),
    "source" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_hospital_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_profiles" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "dob" DATE,
    "health_card" TEXT,
    "phone_number" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "home_address_line1" TEXT,
    "home_address_line2" TEXT,
    "home_city" TEXT,
    "home_province" TEXT DEFAULT 'ON',
    "home_postal_code" TEXT,
    "mailing_same_as_home" BOOLEAN DEFAULT true,
    "mailing_address_line1" TEXT,
    "mailing_address_line2" TEXT,
    "mailing_city" TEXT,
    "mailing_province" TEXT DEFAULT 'ON',
    "mailing_postal_code" TEXT,
    "blood_type" TEXT,
    "allergies" TEXT,
    "medical_conditions" TEXT,
    "current_medications" TEXT,
    "dnr_status" TEXT,
    "living_will" TEXT,
    "emergency_contacts" JSONB,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_provider_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "connected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnected_at" TIMESTAMPTZ(6),
    "source" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_provider_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "terms_accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_patient_intake" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "dob" DATE,
    "phone_number" TEXT,
    "home_address" TEXT,
    "insurance" TEXT,
    "health_card" TEXT,
    "blood_type" TEXT,
    "allergies" TEXT,
    "medical_conditions" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_patient_intake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hospital_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_appointments_hospital_time" ON "appointments"("hospital_id", "start_time" DESC);

-- CreateIndex
CREATE INDEX "idx_appointments_patient_time" ON "appointments"("patient_id", "start_time" DESC);

-- CreateIndex
CREATE INDEX "idx_appointments_staff_time" ON "appointments"("staff_id", "start_time" DESC);

-- CreateIndex
CREATE INDEX "idx_email_verifications_code" ON "email_verifications"("code");

-- CreateIndex
CREATE INDEX "idx_email_verifications_staff_id" ON "email_verifications"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_links_token_key" ON "emergency_links"("token");

-- CreateIndex
CREATE INDEX "emergency_links_patient_id_idx" ON "emergency_links"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_profiles_patient_id_key" ON "emergency_profiles"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_name_key" ON "hospitals"("name");

-- CreateIndex
CREATE INDEX "idx_msg_conv_last" ON "message_conversations"("last_message_at" DESC);

-- CreateIndex
CREATE INDEX "idx_msg_conv_patient" ON "message_conversations"("patient_id");

-- CreateIndex
CREATE INDEX "idx_msg_conv_provider" ON "message_conversations"("provider_id");

-- CreateIndex
CREATE INDEX "idx_msg_conv_staff" ON "message_conversations"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_message_conversation" ON "message_conversations"("patient_id", "provider_id", "staff_id");

-- CreateIndex
CREATE INDEX "idx_msg_items_conv_time" ON "message_items"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_patient_id_key" ON "patient_profiles"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_email_key" ON "patients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pending_patient_intake_email_key" ON "pending_patient_intake"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_accounts_email_key" ON "staff_accounts"("email");

-- CreateIndex
CREATE INDEX "idx_staff_accounts_hospital_id" ON "staff_accounts"("hospital_id");

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emergency_links" ADD CONSTRAINT "emergency_links_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "message_items" ADD CONSTRAINT "message_items_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "message_conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_hospital_connections" ADD CONSTRAINT "patient_hospital_connections_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_hospital_connections" ADD CONSTRAINT "patient_hospital_connections_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_accounts" ADD CONSTRAINT "staff_accounts_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
