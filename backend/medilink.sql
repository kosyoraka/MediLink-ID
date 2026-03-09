--
-- PostgreSQL database dump
--

\restrict nGWezqMe3uWzCfDLMh9Y3vOZsdbJsr4cGUyaIpMMr0eYWUWJIc43W3fHdoZ8lhw

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg13+1)
-- Dumped by pg_dump version 16.11 (Debian 16.11-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: medilink
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    provider_name text NOT NULL,
    specialty text NOT NULL,
    start_time timestamp with time zone NOT NULL,
    type text NOT NULL,
    location_name text,
    address text,
    join_url text,
    status text DEFAULT 'Scheduled'::text NOT NULL,
    notes text,
    visit_summary_available boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    staff_id uuid,
    hospital_id uuid NOT NULL,
    CONSTRAINT appointments_status_check CHECK ((status = ANY (ARRAY['Scheduled'::text, 'Confirmed'::text, 'Completed'::text, 'Cancelled'::text]))),
    CONSTRAINT appointments_type_check CHECK ((type = ANY (ARRAY['in-person'::text, 'virtual'::text, 'phone'::text])))
);


ALTER TABLE public.appointments OWNER TO medilink;

--
-- Name: email_verifications; Type: TABLE; Schema: public; Owner: medilink
--

CREATE TABLE public.email_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_verifications OWNER TO medilink;

--
-- Name: emergency_links; Type: TABLE; Schema: public; Owner: medilink
--

CREATE TABLE public.emergency_links (
    id text NOT NULL,
    patient_id uuid NOT NULL,
    token text NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.emergency_links OWNER TO medilink;

--
-- Name: emergency_profiles; Type: TABLE; Schema: public; Owner: medilink
--

CREATE TABLE public.emergency_profiles (
    id text NOT NULL,
    patient_id uuid NOT NULL,
    share_blood_type boolean DEFAULT false NOT NULL,
    share_allergies boolean DEFAULT false NOT NULL,
    share_chronic_conditions boolean DEFAULT false NOT NULL,
    share_current_medications boolean DEFAULT false NOT NULL,
    share_emergency_contacts boolean DEFAULT false NOT NULL,
    blood_type text,
    allergies text,
    chronic_conditions text,
    current_medications text,
    emergency_contacts jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    share_personal_info boolean DEFAULT true NOT NULL,
    share_medical_conditions boolean DEFAULT true NOT NULL,
    share_advance_directives boolean DEFAULT false NOT NULL,
    medical_conditions text,
    emergency_contact_full_name text,
    emergency_contact_relationship text,
    emergency_contact_phone text,
    dnr_status text,
    living_will text
);


ALTER TABLE public.emergency_profiles OWNER TO medilink;

--
-- Name: hospitals; Type: TABLE; Schema: public; Owner: medilink
--

CREATE TABLE public.hospitals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    city text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.hospitals OWNER TO medilink;

--
-- Name: message_conversations; Type: TABLE; Schema: public; Owner: medilink
--

CREATE TABLE public.message_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    last_message_preview text,
    last_message_at timestamp with time zone,
    patient_last_read_at timestamp with time zone,
    staff_last_read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.message_conversations OWNER TO medilink;

--
-- Name: message_items; Type: TABLE; Schema: public; Owner: medilink
--

CREATE TABLE public.message_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_type text NOT NULL,
    sender_patient_id uuid,
    sender_staff_id uuid,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_items_sender_ids_check CHECK ((((sender_type = 'patient'::text) AND (sender_patient_id IS NOT NULL) AND (sender_staff_id IS NULL)) OR ((sender_type = 'staff'::text) AND (sender_staff_id IS NOT NULL) AND (sender_patient_id IS NULL)) OR ((sender_type = 'system'::text) AND (sender_patient_id IS NULL) AND (sender_staff_id IS NULL)))),
    CONSTRAINT message_items_sender_type_check CHECK ((sender_type = ANY (ARRAY['patient'::text, 'staff'::text, 'system'::text])))
);


ALTER TABLE public.message_items OWNER TO medilink;

--
-- Name: patient_hospital_connections; Type: TABLE; Schema: public; Owner: medilink
--

CREATE TABLE public.patient_hospital_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    hospital_id uuid NOT NULL,
    connected_at timestamp with time zone DEFAULT now() NOT NULL,
    disconnected_at timestamp with time zone,
    source text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.patient_hospital_connections OWNER TO medilink;

--
-- Name: patient_profiles; Type: TABLE; Schema: public; Owner: medilink
--

CREATE TABLE public.patient_profiles (
    id text DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    first_name text,
    last_name text,
    dob date,
    health_card text,
    phone_number text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    home_address_line1 text,
    home_address_line2 text,
    home_city text,
    home_province text DEFAULT 'ON'::text,
    home_postal_code text,
    mailing_same_as_home boolean DEFAULT true,
    mailing_address_line1 text,
    mailing_address_line2 text,
    mailing_city text,
    mailing_province text DEFAULT 'ON'::text,
    mailing_postal_code text,
    blood_type text,
    allergies text,
    medical_conditions text,
    current_medications text,
    dnr_status text,
    living_will text,
    emergency_contacts jsonb
);


ALTER TABLE public.patient_profiles OWNER TO medilink;

--
-- Name: patient_provider_connections; Type: TABLE; Schema: public; Owner: medilink
--

CREATE TABLE public.patient_provider_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    connected_at timestamp with time zone DEFAULT now() NOT NULL,
    disconnected_at timestamp with time zone,
    source text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.patient_provider_connections OWNER TO medilink;

--
-- Name: patients; Type: TABLE; Schema: public; Owner: medilink
--

CREATE TABLE public.patients (
    id uuid NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    terms_accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.patients OWNER TO medilink;

--
-- Name: pending_patient_intake; Type: TABLE; Schema: public; Owner: medilink
--

CREATE TABLE public.pending_patient_intake (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    full_name text,
    dob date,
    phone_number text,
    home_address text,
    insurance text,
    health_card text,
    blood_type text,
    allergies text,
    medical_conditions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.pending_patient_intake OWNER TO medilink;

--
-- Name: staff_accounts; Type: TABLE; Schema: public; Owner: medilink
--

CREATE TABLE public.staff_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    phone text,
    password_hash text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_accounts OWNER TO medilink;

--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: medilink
--

COPY public.appointments (id, patient_id, provider_name, specialty, start_time, type, location_name, address, join_url, status, notes, visit_summary_available, created_at, staff_id, hospital_id) FROM stdin;
0d6a1196-109c-4d2c-8c86-d7fe99a1c870	c26d46f5-b99c-4840-a3df-26f06f376307	Dr Cozy	Follow-up	2026-01-24 00:30:00+00	phone	\N	\N	\N	Cancelled	Test	f	2026-01-23 18:32:41.943001+00	85039904-4f2f-4e90-bcf2-f248bb7cb58f	654ea310-e250-4954-8cf5-b5e144d6fa6a
f0e9223b-a554-49da-b8f3-7e700976fcd1	c26d46f5-b99c-4840-a3df-26f06f376307	Dr Cozy	Check-up	2026-01-23 23:00:00+00	phone	\N	\N	\N	Cancelled	Test demo	f	2026-01-23 20:57:39.294345+00	85039904-4f2f-4e90-bcf2-f248bb7cb58f	654ea310-e250-4954-8cf5-b5e144d6fa6a
76a8c3c9-735f-4403-a75a-461e36246ea9	40d9a756-8d5a-4f72-961b-fe67099ca92b	Kennie Oraka	Check-up	2026-01-24 01:30:00+00	in-person	\N	\N	\N	Completed	Note	f	2026-01-23 21:26:35.85907+00	86bf9555-8826-4113-ac16-6e2497bd0e77	c5b86233-90cc-4c6f-8457-c6786d5e3ffd
335ff69f-f44a-4cc8-9868-6c7385b225d8	40d9a756-8d5a-4f72-961b-fe67099ca92b	Kennie Oraka	Check-up	2026-01-23 21:27:00+00	in-person	\N	\N	\N	Cancelled	\N	f	2026-01-23 21:28:05.025558+00	86bf9555-8826-4113-ac16-6e2497bd0e77	c5b86233-90cc-4c6f-8457-c6786d5e3ffd
fbdcf8ba-d692-4426-9f46-62aa11e446e8	2f734265-6f76-4916-961c-d53fee39b94c	Dr Kosy Cozy	Consultation	2026-01-22 14:53:00+00	virtual	\N	\N	\N	Completed	Hello	f	2026-01-22 10:53:29.988128+00	fb936e41-16aa-43c1-8de5-c615f549d3fe	654ea310-e250-4954-8cf5-b5e144d6fa6a
eacac6ef-c037-400f-bf67-2ce0da3ffc94	2f734265-6f76-4916-961c-d53fee39b94c	Dr Kosy Cozy	Consultation	2026-01-30 02:54:00+00	in-person	\N	\N	\N	Cancelled	I’m lactose intolerant 	f	2026-01-22 10:52:19.501049+00	fb936e41-16aa-43c1-8de5-c615f549d3fe	654ea310-e250-4954-8cf5-b5e144d6fa6a
a631f45f-d679-4e79-94ef-457d2814d4e9	40d9a756-8d5a-4f72-961b-fe67099ca92b	Timi OIa	Follow-up	2026-01-23 23:50:00+00	in-person	\N	\N	\N	Cancelled	\N	f	2026-01-23 21:48:56.828819+00	f45fe1a5-e92d-497b-94a7-19c954d4622f	c5b86233-90cc-4c6f-8457-c6786d5e3ffd
3988235d-70cf-422e-9007-8c6ca82bc49c	c26d46f5-b99c-4840-a3df-26f06f376307	Dr Cozy	Consultation	2026-01-30 18:30:00+00	in-person	\N	\N	\N	Completed	Headache	f	2026-01-23 18:30:54.073912+00	85039904-4f2f-4e90-bcf2-f248bb7cb58f	654ea310-e250-4954-8cf5-b5e144d6fa6a
6a1e4ad0-a17e-4835-99d3-376caa6dd974	40d9a756-8d5a-4f72-961b-fe67099ca92b	Timi OIa	Consultation	2026-01-24 01:50:00+00	in-person	\N	\N	\N	Completed	test	f	2026-01-23 21:48:17.960053+00	f45fe1a5-e92d-497b-94a7-19c954d4622f	c5b86233-90cc-4c6f-8457-c6786d5e3ffd
d4c87b25-f7a2-4dbd-a5f8-e5ec6b1df596	c26d46f5-b99c-4840-a3df-26f06f376307	Dr Cozy	Check-up	2026-01-23 18:32:00+00	virtual	\N	\N	\N	Cancelled	Test	f	2026-01-23 18:32:10.77513+00	85039904-4f2f-4e90-bcf2-f248bb7cb58f	654ea310-e250-4954-8cf5-b5e144d6fa6a
\.


--
-- Data for Name: email_verifications; Type: TABLE DATA; Schema: public; Owner: medilink
--

COPY public.email_verifications (id, staff_id, code, expires_at, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: emergency_links; Type: TABLE DATA; Schema: public; Owner: medilink
--

COPY public.emergency_links (id, patient_id, token, revoked, created_at) FROM stdin;
f8c0820b-4e73-4639-8b0d-510f671fb514	2f734265-6f76-4916-961c-d53fee39b94c	SC82NuL7T_W6W8i8LTzd4XZXqhUsbIzm	f	2026-01-22 10:40:33.291924
2b1a00b1-ab39-4778-9bdf-a3974bde5c80	c26d46f5-b99c-4840-a3df-26f06f376307	vfDe3dcjG7NQOJzAHU0NivcQCv_BSAf4	f	2026-01-23 18:38:17.585123
cb91c81b-260a-4a59-9e96-3280e799dbf6	40d9a756-8d5a-4f72-961b-fe67099ca92b	79zFkBsSjyQV503a3htivgmTVwk0f-m3	f	2026-01-23 21:10:25.137413
\.


--
-- Data for Name: emergency_profiles; Type: TABLE DATA; Schema: public; Owner: medilink
--

COPY public.emergency_profiles (id, patient_id, share_blood_type, share_allergies, share_chronic_conditions, share_current_medications, share_emergency_contacts, blood_type, allergies, chronic_conditions, current_medications, emergency_contacts, created_at, updated_at, share_personal_info, share_medical_conditions, share_advance_directives, medical_conditions, emergency_contact_full_name, emergency_contact_relationship, emergency_contact_phone, dnr_status, living_will) FROM stdin;
7e8c2861-3712-402c-89ee-7d4eb40a51f2	2f734265-6f76-4916-961c-d53fee39b94c	t	t	f	t	t	O Positive	Penicillin 	\N	Twice Panadol 	\N	2026-01-22 10:37:35.074767+00	2026-01-22 10:38:53.358007+00	t	t	t	Placenta	Ken	Bro 	4373443522	\N	\N
63c79405-6ab1-413b-b1fa-bafd091630c0	c26d46f5-b99c-4840-a3df-26f06f376307	t	t	f	t	t	O Negative	Dust	\N	Tylenol	\N	2026-01-23 18:19:02.620592+00	2026-01-23 20:55:14.147178+00	t	t	t	Headache	Cozy	Wife	2345676789	N/A	N/A
7b93e3ce-9b7e-4203-b5d6-db041f8792c7	40d9a756-8d5a-4f72-961b-fe67099ca92b	t	t	f	t	t	AB Negative	Dust, Cheese, Milk, Pollen	\N	Tylenol	\N	2026-01-23 21:06:26.487234+00	2026-01-23 21:42:47.428916+00	t	t	t	Headache	Timi	Bro	4326783456	Pray for me	N/A
\.


--
-- Data for Name: hospitals; Type: TABLE DATA; Schema: public; Owner: medilink
--

COPY public.hospitals (id, name, city, created_at) FROM stdin;
38befca2-3052-4bfd-9602-dd739fa1e122	Sunnybrook Hospital	Toronto, ON	2026-01-16 04:29:42.360102+00
c5b86233-90cc-4c6f-8457-c6786d5e3ffd	Mount Sinai Hospital	Toronto, ON	2026-01-16 04:29:42.360102+00
6ccfed7f-45d4-4648-8fe0-63164c52a91b	Toronto General Hospital	Toronto, ON	2026-01-16 04:29:42.360102+00
63260a65-131a-42d1-bcc5-3430c5cc72b1	The Hospital for Sick Children (SickKids)	Toronto, ON	2026-01-16 04:29:42.360102+00
0f818bf5-71c9-4079-82be-0d583f8a1b10	St. Michael's Hospital	Toronto, ON	2026-01-16 04:29:42.360102+00
a34350cb-f80f-4e66-b4ff-106f31a254d7	Women's College Hospital	Toronto, ON	2026-01-16 04:29:42.360102+00
d29ce4bf-269b-4233-a778-aab75a43f4ac	Toronto Western Hospital	Toronto, ON	2026-01-16 04:29:42.360102+00
22096727-42e3-4e5a-a858-36dc99bfe0ae	St. Joseph's Health Centre	Toronto, ON	2026-01-16 04:29:42.360102+00
b6f7e523-fb41-4661-98df-fcb2ecbc4f83	North York General Hospital	Toronto, ON	2026-01-16 04:29:42.360102+00
bd630ce6-308b-49ee-8fe2-7a1bf93e6710	Scarborough Health Network	Toronto, ON	2026-01-16 04:29:42.360102+00
c59fdad0-a074-4c5c-95ba-4068b0009e1b	Trillium Health Partners	Mississauga, ON	2026-01-16 04:29:42.360102+00
d3ace720-dc9b-4515-9b98-5c6e54543a46	William Osler Health System	Brampton, ON	2026-01-16 04:29:42.360102+00
790e883e-1dad-4ca8-84c4-957f27195c2b	Humber River Hospital	Toronto, ON	2026-01-16 04:29:42.360102+00
2be82ca2-df58-4f71-a4ab-f5dd47dedf9f	Michael Garron Hospital	Toronto, ON	2026-01-16 04:29:42.360102+00
a927c30e-9919-484e-83d0-0cfe77e965f6	The Ottawa Hospital	Ottawa, ON	2026-01-16 04:29:42.360102+00
81ff36aa-3ab0-4073-b4e1-4402e0eec018	Children's Hospital of Eastern Ontario (CHEO)	Ottawa, ON	2026-01-16 04:29:42.360102+00
39447776-e366-4329-8817-60ed98a87e71	Kingston Health Sciences Centre	Kingston, ON	2026-01-16 04:29:42.360102+00
654ea310-e250-4954-8cf5-b5e144d6fa6a	Hamilton Health Sciences	Hamilton, ON	2026-01-16 04:29:42.360102+00
002ca54f-1053-4f5f-b311-a1b7cb30d314	St. Joseph's Healthcare Hamilton	Hamilton, ON	2026-01-16 04:29:42.360102+00
28b87631-391d-4f31-a4f2-fcb40126f3cd	London Health Sciences Centre	London, ON	2026-01-16 04:29:42.360102+00
fc49a5b4-33d0-4683-b087-5020a323fdef	St. Joseph's Health Care London	London, ON	2026-01-16 04:29:42.360102+00
2f1ef20c-5303-4646-a9c8-0cd35b0f139d	Windsor Regional Hospital	Windsor, ON	2026-01-16 04:29:42.360102+00
f4307fd3-4f32-45a8-9dc1-159c15a225e6	Grand River Hospital	Kitchener, ON	2026-01-16 04:29:42.360102+00
228bd9ec-1024-4058-b468-ac9012868811	Royal Victoria Regional Health Centre	Barrie, ON	2026-01-16 04:29:42.360102+00
\.


--
-- Data for Name: message_conversations; Type: TABLE DATA; Schema: public; Owner: medilink
--

COPY public.message_conversations (id, patient_id, provider_id, staff_id, last_message_preview, last_message_at, patient_last_read_at, staff_last_read_at, created_at, updated_at) FROM stdin;
51e43656-251c-4b2a-9c1b-d812d812df11	40d9a756-8d5a-4f72-961b-fe67099ca92b	c5b86233-90cc-4c6f-8457-c6786d5e3ffd	f45fe1a5-e92d-497b-94a7-19c954d4622f	reply	2026-01-23 21:47:37.852808+00	2026-01-23 21:47:43.212911+00	2026-01-23 21:47:34.449331+00	2026-01-23 21:47:29.346686+00	2026-01-23 21:47:43.212911+00
5ecaa967-d8f2-4963-a49f-87263a320217	e9056c9e-cee3-4aa7-b14d-20da49dfcfd1	6ccfed7f-45d4-4648-8fe0-63164c52a91b	ac0f5640-f121-4cb7-80db-ffb26d54e2da	testinggg	2026-01-21 02:16:37.579132+00	2026-01-21 02:14:51.417351+00	2026-01-21 02:16:54.804497+00	2026-01-19 06:11:10.458372+00	2026-01-21 02:16:54.804497+00
9d4b98d6-b511-46de-92da-9133d7c443cc	42cf2b14-a782-41ee-b45a-31dc0b0b90d3	6ccfed7f-45d4-4648-8fe0-63164c52a91b	ac0f5640-f121-4cb7-80db-ffb26d54e2da	TEST	2026-01-22 04:39:25.979234+00	2026-01-22 04:39:25.991658+00	\N	2026-01-22 04:39:25.965145+00	2026-01-22 04:39:25.991658+00
b54b3ed8-0431-499e-9447-7b3fe8e2bce7	293abaec-bd9a-4b41-8230-6e4d97a645a7	6ccfed7f-45d4-4648-8fe0-63164c52a91b	ac0f5640-f121-4cb7-80db-ffb26d54e2da	test	2026-01-22 05:06:20.326928+00	2026-01-22 05:06:25.443342+00	2026-01-22 05:06:17.680631+00	2026-01-22 05:05:28.075856+00	2026-01-22 05:06:25.443342+00
afe63342-b507-44eb-aa33-b5636f1a7d47	2f734265-6f76-4916-961c-d53fee39b94c	654ea310-e250-4954-8cf5-b5e144d6fa6a	fb936e41-16aa-43c1-8de5-c615f549d3fe	yo bro	2026-01-22 10:49:53.066235+00	2026-01-22 10:50:24.869943+00	2026-01-22 10:51:00.779995+00	2026-01-22 10:49:18.856124+00	2026-01-22 10:51:00.779995+00
f61ef177-00bc-4129-a6f6-3de5fd90ab21	9e2430c6-1926-43d0-8596-925a86fbe23a	39447776-e366-4329-8817-60ed98a87e71	ea43242a-39e8-48e9-8087-a361c5f17c38	Test message	2026-01-19 06:42:34.989896+00	2026-01-20 04:27:56.087621+00	\N	2026-01-19 06:42:34.977793+00	2026-01-20 04:27:56.087621+00
273800d2-8f28-43b9-9a92-bd2863ad0034	9e2430c6-1926-43d0-8596-925a86fbe23a	6ccfed7f-45d4-4648-8fe0-63164c52a91b	ac0f5640-f121-4cb7-80db-ffb26d54e2da	test yo	2026-01-20 04:41:44.075037+00	2026-01-20 04:30:45.205884+00	2026-01-20 04:41:38.424365+00	2026-01-19 06:42:22.125363+00	2026-01-20 04:41:44.075037+00
9caa3b2c-d1ec-4aec-a232-c298ab6fa5be	c26d46f5-b99c-4840-a3df-26f06f376307	654ea310-e250-4954-8cf5-b5e144d6fa6a	85039904-4f2f-4e90-bcf2-f248bb7cb58f	messages	2026-01-23 20:56:43.433071+00	2026-01-23 20:56:48.229199+00	2026-01-23 20:56:37.973979+00	2026-01-23 18:29:54.664879+00	2026-01-23 20:56:48.229199+00
1b5a19df-a161-4295-a0ae-4ba0918f1e11	40d9a756-8d5a-4f72-961b-fe67099ca92b	c5b86233-90cc-4c6f-8457-c6786d5e3ffd	86bf9555-8826-4113-ac16-6e2497bd0e77	test	2026-01-23 21:25:31.801395+00	2026-01-23 21:25:39.212105+00	2026-01-23 21:25:14.42146+00	2026-01-23 21:25:03.526296+00	2026-01-23 21:25:39.212105+00
\.


--
-- Data for Name: message_items; Type: TABLE DATA; Schema: public; Owner: medilink
--

COPY public.message_items (id, conversation_id, sender_type, sender_patient_id, sender_staff_id, body, created_at) FROM stdin;
cf561db8-c4e9-4f6f-a1ed-5783b4e3605e	afe63342-b507-44eb-aa33-b5636f1a7d47	patient	2f734265-6f76-4916-961c-d53fee39b94c	\N	Hey Shawty	2026-01-22 10:49:18.888395+00
e9524935-6315-49e7-99d5-6956782aa102	afe63342-b507-44eb-aa33-b5636f1a7d47	staff	\N	fb936e41-16aa-43c1-8de5-c615f549d3fe	yo bro	2026-01-22 10:49:53.062285+00
94298393-49b1-458b-b38f-cd69974a3514	9caa3b2c-d1ec-4aec-a232-c298ab6fa5be	patient	c26d46f5-b99c-4840-a3df-26f06f376307	\N	Tests	2026-01-23 18:29:54.675918+00
d281b4d6-6f90-4e27-99e6-c08b0be8e3c5	9caa3b2c-d1ec-4aec-a232-c298ab6fa5be	staff	\N	85039904-4f2f-4e90-bcf2-f248bb7cb58f	hello	2026-01-23 18:30:12.018098+00
dd4fc865-2d8c-4bff-9720-04ed3cf6fd34	9caa3b2c-d1ec-4aec-a232-c298ab6fa5be	staff	\N	85039904-4f2f-4e90-bcf2-f248bb7cb58f	yo bro	2026-01-23 20:55:51.366302+00
8a73e85c-86bd-4816-b8bb-3bf8135ebc9c	9caa3b2c-d1ec-4aec-a232-c298ab6fa5be	patient	c26d46f5-b99c-4840-a3df-26f06f376307	\N	reply	2026-01-23 20:56:03.593135+00
d6ebf1b1-1cf7-421e-9d89-9fea2aec574c	9caa3b2c-d1ec-4aec-a232-c298ab6fa5be	patient	c26d46f5-b99c-4840-a3df-26f06f376307	\N	tew	2026-01-23 20:56:27.965775+00
472c3b10-8113-48e7-84b8-3a77b96ff443	9caa3b2c-d1ec-4aec-a232-c298ab6fa5be	patient	c26d46f5-b99c-4840-a3df-26f06f376307	\N	messages	2026-01-23 20:56:31.871255+00
2ccd7d4d-2fb0-412b-8536-cbd23a079766	9caa3b2c-d1ec-4aec-a232-c298ab6fa5be	staff	\N	85039904-4f2f-4e90-bcf2-f248bb7cb58f	twe	2026-01-23 20:56:41.271318+00
2b6505f8-3fc2-4d16-a196-4e1dee5cf5b3	9caa3b2c-d1ec-4aec-a232-c298ab6fa5be	staff	\N	85039904-4f2f-4e90-bcf2-f248bb7cb58f	messages	2026-01-23 20:56:43.430076+00
03b2fd3d-1d69-4c7c-a084-dba38c36e183	1b5a19df-a161-4295-a0ae-4ba0918f1e11	patient	40d9a756-8d5a-4f72-961b-fe67099ca92b	\N	Test message	2026-01-23 21:25:03.536538+00
93e5fc4f-6a21-4573-9f13-5bf6358c8e8e	1b5a19df-a161-4295-a0ae-4ba0918f1e11	staff	\N	86bf9555-8826-4113-ac16-6e2497bd0e77	test	2026-01-23 21:25:31.798174+00
a6056334-8347-4802-80bb-21bc46fa8244	51e43656-251c-4b2a-9c1b-d812d812df11	patient	40d9a756-8d5a-4f72-961b-fe67099ca92b	\N	Test	2026-01-23 21:47:29.353254+00
375e770d-1d2b-416f-9751-f5654afb82aa	51e43656-251c-4b2a-9c1b-d812d812df11	staff	\N	f45fe1a5-e92d-497b-94a7-19c954d4622f	reply	2026-01-23 21:47:37.848553+00
\.


--
-- Data for Name: patient_hospital_connections; Type: TABLE DATA; Schema: public; Owner: medilink
--

COPY public.patient_hospital_connections (id, patient_id, hospital_id, connected_at, disconnected_at, source, created_at) FROM stdin;
\.


--
-- Data for Name: patient_profiles; Type: TABLE DATA; Schema: public; Owner: medilink
--

COPY public.patient_profiles (id, patient_id, first_name, last_name, dob, health_card, phone_number, created_at, home_address_line1, home_address_line2, home_city, home_province, home_postal_code, mailing_same_as_home, mailing_address_line1, mailing_address_line2, mailing_city, mailing_province, mailing_postal_code, blood_type, allergies, medical_conditions, current_medications, dnr_status, living_will, emergency_contacts) FROM stdin;
6dbb4167-f533-4f39-a1a6-c024ab6f8665	2f734265-6f76-4916-961c-d53fee39b94c	Kosy	Tester	2000-01-22	1234567890	8176261212	2026-01-22 10:36:50.301923+00	10 York Street		North York	ON	M5V5J8	t	10 York Street		North York	ON	M5V5J8	\N	\N	\N	\N	\N	\N	\N
16cbe298-e7d9-452c-85db-c30549da11d4	c26d46f5-b99c-4840-a3df-26f06f376307	Tims	Test	2016-07-23	1234567234	4167362100	2026-01-23 18:17:31.613397+00	4700 keele st		Toronto	ON	M3J 1P3	t	4700 keele st		Toronto	ON	M3J 1P3	\N	\N	\N	\N	\N	\N	\N
7127a14b-2353-4b95-a6cc-9129a3643559	40d9a756-8d5a-4f72-961b-fe67099ca92b	Andrew	Bean	2006-07-23	1234567234	4167362145	2026-01-23 21:04:31.430747+00	4700 keele st		Toronto	ON	M3J 1P3	t	4700 keele st		Toronto	ON	M3J 1P3	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: patient_provider_connections; Type: TABLE DATA; Schema: public; Owner: medilink
--

COPY public.patient_provider_connections (id, patient_id, provider_id, connected_at, disconnected_at, source, created_at) FROM stdin;
5af65e42-e8c2-45a2-84ed-5a94528b0aca	c26d46f5-b99c-4840-a3df-26f06f376307	654ea310-e250-4954-8cf5-b5e144d6fa6a	2026-01-23 18:29:11.27735+00	2026-01-23 19:21:49.32506+00	\N	2026-01-23 18:29:11.27735+00
6e087afe-bdaa-4183-a9fc-191e46f24c9f	c26d46f5-b99c-4840-a3df-26f06f376307	654ea310-e250-4954-8cf5-b5e144d6fa6a	2026-01-23 19:22:22.29408+00	2026-01-23 20:55:23.835721+00	\N	2026-01-23 19:22:22.29408+00
9cc51fdb-bfdb-4a6b-9712-94e7b32fc6fb	c26d46f5-b99c-4840-a3df-26f06f376307	654ea310-e250-4954-8cf5-b5e144d6fa6a	2026-01-23 20:55:31.418857+00	\N	\N	2026-01-23 20:55:31.418857+00
cbb8030c-233b-4958-8884-226d8ab93df6	40d9a756-8d5a-4f72-961b-fe67099ca92b	002ca54f-1053-4f5f-b311-a1b7cb30d314	2026-01-23 21:05:51.059633+00	\N	\N	2026-01-23 21:05:51.059633+00
c5432f65-05a7-48c9-929a-fec2161c2f1c	40d9a756-8d5a-4f72-961b-fe67099ca92b	a927c30e-9919-484e-83d0-0cfe77e965f6	2026-01-23 21:05:59.941814+00	\N	\N	2026-01-23 21:05:59.941814+00
46cfcdc1-aa32-46c3-8b60-e571d9515068	40d9a756-8d5a-4f72-961b-fe67099ca92b	a34350cb-f80f-4e66-b4ff-106f31a254d7	2026-01-23 21:06:07.496422+00	\N	\N	2026-01-23 21:06:07.496422+00
555b8c33-1778-4d4a-a33e-d54751e56a14	40d9a756-8d5a-4f72-961b-fe67099ca92b	b6f7e523-fb41-4661-98df-fcb2ecbc4f83	2026-01-23 21:13:20.340329+00	\N	\N	2026-01-23 21:13:20.340329+00
82c08f11-c6d2-420e-8553-fba816143452	40d9a756-8d5a-4f72-961b-fe67099ca92b	654ea310-e250-4954-8cf5-b5e144d6fa6a	2026-01-23 21:13:49.658056+00	\N	\N	2026-01-23 21:13:49.658056+00
a264eecd-78ba-4f16-9962-c19f6b7cd039	40d9a756-8d5a-4f72-961b-fe67099ca92b	c5b86233-90cc-4c6f-8457-c6786d5e3ffd	2026-01-23 21:24:11.152748+00	2026-01-23 21:24:23.503419+00	\N	2026-01-23 21:24:11.152748+00
48b7026c-5adb-4c9a-81b4-972e7afadd05	40d9a756-8d5a-4f72-961b-fe67099ca92b	c5b86233-90cc-4c6f-8457-c6786d5e3ffd	2026-01-23 21:24:38.49365+00	2026-01-23 21:46:57.100577+00	\N	2026-01-23 21:24:38.49365+00
b5e28769-f19d-4cd8-a011-1182da795b0f	40d9a756-8d5a-4f72-961b-fe67099ca92b	c5b86233-90cc-4c6f-8457-c6786d5e3ffd	2026-01-23 21:47:08.536872+00	\N	\N	2026-01-23 21:47:08.536872+00
f6f00b83-5d9c-4684-838e-628b00aafdf0	2f734265-6f76-4916-961c-d53fee39b94c	f4307fd3-4f32-45a8-9dc1-159c15a225e6	2026-01-22 10:37:25.879566+00	\N	\N	2026-01-22 10:37:25.879566+00
d22b9fe4-ea69-450f-acb9-61d10448a5e0	2f734265-6f76-4916-961c-d53fee39b94c	39447776-e366-4329-8817-60ed98a87e71	2026-01-22 10:37:28.33705+00	\N	\N	2026-01-22 10:37:28.33705+00
729c973d-dbfa-4e5b-bd84-caa8c774a627	2f734265-6f76-4916-961c-d53fee39b94c	654ea310-e250-4954-8cf5-b5e144d6fa6a	2026-01-22 10:37:23.849609+00	2026-01-22 10:44:57.002959+00	\N	2026-01-22 10:37:23.849609+00
80070932-ed07-435c-a71b-b1af375f5f97	2f734265-6f76-4916-961c-d53fee39b94c	654ea310-e250-4954-8cf5-b5e144d6fa6a	2026-01-22 10:45:18.802174+00	\N	\N	2026-01-22 10:45:18.802174+00
ba90ca87-f482-4110-a85f-19eebbf72944	c26d46f5-b99c-4840-a3df-26f06f376307	81ff36aa-3ab0-4073-b4e1-4402e0eec018	2026-01-23 18:18:33.755913+00	\N	\N	2026-01-23 18:18:33.755913+00
172b3ac6-cc4f-47aa-9cd3-f8c698f4929d	c26d46f5-b99c-4840-a3df-26f06f376307	c5b86233-90cc-4c6f-8457-c6786d5e3ffd	2026-01-23 18:18:40.341061+00	\N	\N	2026-01-23 18:18:40.341061+00
b3a0bf17-b6c2-49a3-a0ee-ea5a700fc3a1	c26d46f5-b99c-4840-a3df-26f06f376307	b6f7e523-fb41-4661-98df-fcb2ecbc4f83	2026-01-23 18:18:43.691608+00	\N	\N	2026-01-23 18:18:43.691608+00
611af230-fadc-488e-aab0-2f767d209611	c26d46f5-b99c-4840-a3df-26f06f376307	654ea310-e250-4954-8cf5-b5e144d6fa6a	2026-01-23 18:18:50.622994+00	2026-01-23 18:28:53.539298+00	\N	2026-01-23 18:18:50.622994+00
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: medilink
--

COPY public.patients (id, email, password_hash, terms_accepted_at, created_at) FROM stdin;
2f734265-6f76-4916-961c-d53fee39b94c	kosy@gmail.com	$2b$12$wO4FAsqKK/mT1TrLTiu0KOVBZpScd2HxElyC7MwT4ddXGGVrBRGVq	2026-01-22 10:36:50.29866+00	2026-01-22 10:36:50.29866+00
c26d46f5-b99c-4840-a3df-26f06f376307	kosy@test.com	$2b$12$0iYcV2YiM2J60PCKUU1jWeXotkgSjM2LQiDtfa/pTeqWog6z2Iua6	2026-01-23 18:17:31.609875+00	2026-01-23 18:17:31.609875+00
40d9a756-8d5a-4f72-961b-fe67099ca92b	jelly@gmail.com	$2b$12$NzHRth3hYSgwiO1gQMxKNu/3h.81wA5RDnQBnNMXx0jX4zHMv7FL.	2026-01-23 21:04:31.428938+00	2026-01-23 21:04:31.428938+00
\.


--
-- Data for Name: pending_patient_intake; Type: TABLE DATA; Schema: public; Owner: medilink
--

COPY public.pending_patient_intake (id, email, full_name, dob, phone_number, home_address, insurance, health_card, blood_type, allergies, medical_conditions, created_at) FROM stdin;
\.


--
-- Data for Name: staff_accounts; Type: TABLE DATA; Schema: public; Owner: medilink
--

COPY public.staff_accounts (id, hospital_id, full_name, email, role, phone, password_hash, email_verified, created_at, updated_at) FROM stdin;
fb936e41-16aa-43c1-8de5-c615f549d3fe	654ea310-e250-4954-8cf5-b5e144d6fa6a	Dr Kosy Cozy	kosy@hospital.com	Head Physician	4167362100	$2b$12$8jgJGcLMrivjoKFT/W3cvuHJHIFGmZnvkHDuO0Fu7T4gyTkeiwd0W	t	2026-01-22 10:43:28.110728+00	2026-01-22 10:43:50.131285+00
85039904-4f2f-4e90-bcf2-f248bb7cb58f	654ea310-e250-4954-8cf5-b5e144d6fa6a	Dr Cozy	kosy2@hospital.com	Head Physician	4167362100	$2b$12$b7drmSz1bZjtraRJvwm2../Qway6tYVGNc6HG/PW.Pj9rSy7RS4G6	t	2026-01-23 18:27:18.806794+00	2026-01-23 18:27:37.494173+00
86bf9555-8826-4113-ac16-6e2497bd0e77	c5b86233-90cc-4c6f-8457-c6786d5e3ffd	Kennie Oraka	kennie@hospital.com	Head Physician	4167362100	$2b$12$UI3ZQS2B.6wHTM8XRzGur.ShVknsRypEAlDF7vkfxVx74QMXU801G	t	2026-01-23 21:22:59.168654+00	2026-01-23 21:23:15.197162+00
f45fe1a5-e92d-497b-94a7-19c954d4622f	c5b86233-90cc-4c6f-8457-c6786d5e3ffd	Timi OIa	test2@medilink.ca	Head Physician	4167362100	$2b$12$GLQNJtUGOjDiRp6f6Ellj.siOkA9XktNSgt5/o9.lBfgsmK9gfQa6	t	2026-01-23 21:46:04.094737+00	2026-01-23 21:46:22.048368+00
\.


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: email_verifications email_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT email_verifications_pkey PRIMARY KEY (id);


--
-- Name: emergency_links emergency_links_pkey; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.emergency_links
    ADD CONSTRAINT emergency_links_pkey PRIMARY KEY (id);


--
-- Name: emergency_links emergency_links_token_key; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.emergency_links
    ADD CONSTRAINT emergency_links_token_key UNIQUE (token);


--
-- Name: emergency_profiles emergency_profiles_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.emergency_profiles
    ADD CONSTRAINT emergency_profiles_patient_id_key UNIQUE (patient_id);


--
-- Name: emergency_profiles emergency_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.emergency_profiles
    ADD CONSTRAINT emergency_profiles_pkey PRIMARY KEY (id);


--
-- Name: hospitals hospitals_name_key; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_name_key UNIQUE (name);


--
-- Name: hospitals hospitals_pkey; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_pkey PRIMARY KEY (id);


--
-- Name: message_conversations message_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.message_conversations
    ADD CONSTRAINT message_conversations_pkey PRIMARY KEY (id);


--
-- Name: message_items message_items_pkey; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.message_items
    ADD CONSTRAINT message_items_pkey PRIMARY KEY (id);


--
-- Name: patient_hospital_connections patient_hospital_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.patient_hospital_connections
    ADD CONSTRAINT patient_hospital_connections_pkey PRIMARY KEY (id);


--
-- Name: patient_profiles patient_profiles_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.patient_profiles
    ADD CONSTRAINT patient_profiles_patient_id_key UNIQUE (patient_id);


--
-- Name: patient_profiles patient_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.patient_profiles
    ADD CONSTRAINT patient_profiles_pkey PRIMARY KEY (id);


--
-- Name: patient_provider_connections patient_provider_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.patient_provider_connections
    ADD CONSTRAINT patient_provider_connections_pkey PRIMARY KEY (id);


--
-- Name: patients patients_email_key; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_email_key UNIQUE (email);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: pending_patient_intake pending_patient_intake_email_key; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.pending_patient_intake
    ADD CONSTRAINT pending_patient_intake_email_key UNIQUE (email);


--
-- Name: pending_patient_intake pending_patient_intake_pkey; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.pending_patient_intake
    ADD CONSTRAINT pending_patient_intake_pkey PRIMARY KEY (id);


--
-- Name: staff_accounts staff_accounts_email_key; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.staff_accounts
    ADD CONSTRAINT staff_accounts_email_key UNIQUE (email);


--
-- Name: staff_accounts staff_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.staff_accounts
    ADD CONSTRAINT staff_accounts_pkey PRIMARY KEY (id);


--
-- Name: message_conversations uniq_message_conversation; Type: CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.message_conversations
    ADD CONSTRAINT uniq_message_conversation UNIQUE (patient_id, provider_id, staff_id);


--
-- Name: emergency_links_patient_id_idx; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX emergency_links_patient_id_idx ON public.emergency_links USING btree (patient_id);


--
-- Name: idx_appointments_hospital_time; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_appointments_hospital_time ON public.appointments USING btree (hospital_id, start_time DESC);


--
-- Name: idx_appointments_patient_time; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_appointments_patient_time ON public.appointments USING btree (patient_id, start_time DESC);


--
-- Name: idx_appointments_staff_time; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_appointments_staff_time ON public.appointments USING btree (staff_id, start_time DESC);


--
-- Name: idx_email_verifications_code; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_email_verifications_code ON public.email_verifications USING btree (code);


--
-- Name: idx_email_verifications_staff_id; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_email_verifications_staff_id ON public.email_verifications USING btree (staff_id);


--
-- Name: idx_msg_conv_last; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_msg_conv_last ON public.message_conversations USING btree (last_message_at DESC);


--
-- Name: idx_msg_conv_patient; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_msg_conv_patient ON public.message_conversations USING btree (patient_id);


--
-- Name: idx_msg_conv_provider; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_msg_conv_provider ON public.message_conversations USING btree (provider_id);


--
-- Name: idx_msg_conv_staff; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_msg_conv_staff ON public.message_conversations USING btree (staff_id);


--
-- Name: idx_msg_items_conv_time; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_msg_items_conv_time ON public.message_items USING btree (conversation_id, created_at);


--
-- Name: idx_phc_hospital_active; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_phc_hospital_active ON public.patient_hospital_connections USING btree (hospital_id) WHERE (disconnected_at IS NULL);


--
-- Name: idx_phc_patient_active; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_phc_patient_active ON public.patient_hospital_connections USING btree (patient_id) WHERE (disconnected_at IS NULL);


--
-- Name: idx_ppc_patient_active; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_ppc_patient_active ON public.patient_provider_connections USING btree (patient_id) WHERE (disconnected_at IS NULL);


--
-- Name: idx_ppc_provider_active; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_ppc_provider_active ON public.patient_provider_connections USING btree (provider_id) WHERE (disconnected_at IS NULL);


--
-- Name: idx_staff_accounts_hospital_id; Type: INDEX; Schema: public; Owner: medilink
--

CREATE INDEX idx_staff_accounts_hospital_id ON public.staff_accounts USING btree (hospital_id);


--
-- Name: patient_profiles_patient_id_uq; Type: INDEX; Schema: public; Owner: medilink
--

CREATE UNIQUE INDEX patient_profiles_patient_id_uq ON public.patient_profiles USING btree (patient_id);


--
-- Name: uniq_phc_active; Type: INDEX; Schema: public; Owner: medilink
--

CREATE UNIQUE INDEX uniq_phc_active ON public.patient_hospital_connections USING btree (patient_id, hospital_id) WHERE (disconnected_at IS NULL);


--
-- Name: uniq_phc_patient_hospital_active; Type: INDEX; Schema: public; Owner: medilink
--

CREATE UNIQUE INDEX uniq_phc_patient_hospital_active ON public.patient_hospital_connections USING btree (patient_id, hospital_id) WHERE (disconnected_at IS NULL);


--
-- Name: email_verifications email_verifications_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT email_verifications_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_accounts(id) ON DELETE CASCADE;


--
-- Name: emergency_links emergency_links_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.emergency_links
    ADD CONSTRAINT emergency_links_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: message_items message_items_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.message_items
    ADD CONSTRAINT message_items_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.message_conversations(id) ON DELETE CASCADE;


--
-- Name: patient_hospital_connections patient_hospital_connections_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.patient_hospital_connections
    ADD CONSTRAINT patient_hospital_connections_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE RESTRICT;


--
-- Name: patient_hospital_connections patient_hospital_connections_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.patient_hospital_connections
    ADD CONSTRAINT patient_hospital_connections_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: staff_accounts staff_accounts_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medilink
--

ALTER TABLE ONLY public.staff_accounts
    ADD CONSTRAINT staff_accounts_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict nGWezqMe3uWzCfDLMh9Y3vOZsdbJsr4cGUyaIpMMr0eYWUWJIc43W3fHdoZ8lhw

