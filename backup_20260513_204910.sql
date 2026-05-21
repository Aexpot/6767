--
-- PostgreSQL database dump
--

\restrict phQdUEhIUx82NRLMnEaAuNnZURDlAMbSHx4D9ZtVSCpqzaNhlQxs1ICjQEy9vIv

-- Dumped from database version 14.22 (Ubuntu 14.22-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.22 (Ubuntu 14.22-0ubuntu0.22.04.1)

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
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_faq_updated_at(); Type: FUNCTION; Schema: public; Owner: x0vpn_user
--

CREATE FUNCTION public.update_faq_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_faq_updated_at() OWNER TO x0vpn_user;

--
-- Name: update_news_updated_at(); Type: FUNCTION; Schema: public; Owner: x0vpn_user
--

CREATE FUNCTION public.update_news_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_news_updated_at() OWNER TO x0vpn_user;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_2fa; Type: TABLE; Schema: public; Owner: x0vpn_user
--

CREATE TABLE public.admin_2fa (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    secret character varying(255) NOT NULL,
    is_enabled boolean DEFAULT false,
    backup_codes text[],
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_2fa OWNER TO x0vpn_user;

--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: x0vpn_user
--

CREATE TABLE public.admin_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id character varying(255),
    details jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_logs OWNER TO x0vpn_user;

--
-- Name: admin_sessions; Type: TABLE; Schema: public; Owner: x0vpn_user
--

CREATE TABLE public.admin_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(255) NOT NULL,
    ip_address character varying(45),
    user_agent text,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_sessions OWNER TO x0vpn_user;

--
-- Name: allowed_ips; Type: TABLE; Schema: public; Owner: x0vpn_user
--

CREATE TABLE public.allowed_ips (
    id integer NOT NULL,
    ip_address character varying(45) NOT NULL,
    description text,
    created_by_telegram_id bigint,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.allowed_ips OWNER TO x0vpn_user;

--
-- Name: allowed_ips_id_seq; Type: SEQUENCE; Schema: public; Owner: x0vpn_user
--

CREATE SEQUENCE public.allowed_ips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.allowed_ips_id_seq OWNER TO x0vpn_user;

--
-- Name: allowed_ips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: x0vpn_user
--

ALTER SEQUENCE public.allowed_ips_id_seq OWNED BY public.allowed_ips.id;


--
-- Name: faq; Type: TABLE; Schema: public; Owner: x0vpn_user
--

CREATE TABLE public.faq (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    category text DEFAULT 'general'::text,
    order_index integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.faq OWNER TO x0vpn_user;

--
-- Name: news; Type: TABLE; Schema: public; Owner: x0vpn_user
--

CREATE TABLE public.news (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    category text DEFAULT 'general'::text,
    is_published boolean DEFAULT false,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.news OWNER TO x0vpn_user;

--
-- Name: notification_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    notification_type text NOT NULL,
    user_id uuid,
    subscription_id uuid,
    sent_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notification_log OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    subscription_id uuid,
    amount_rub numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    payment_provider text NOT NULL,
    provider_payment_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pally_payment_id text,
    pally_payment_url text,
    photo_url text,
    external_id text,
    CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: promocode_uses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promocode_uses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    promocode_id uuid NOT NULL,
    user_id uuid NOT NULL,
    discount_amount numeric(10,2),
    used_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.promocode_uses OWNER TO postgres;

--
-- Name: promocodes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promocodes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code text NOT NULL,
    discount_type text NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    max_uses integer,
    current_uses integer DEFAULT 0,
    is_active boolean DEFAULT true,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT promocodes_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'days'::text])))
);


ALTER TABLE public.promocodes OWNER TO postgres;

--
-- Name: referrals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referrals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_id uuid NOT NULL,
    reward_amount numeric(10,2) DEFAULT 0,
    is_rewarded boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.referrals OWNER TO postgres;

--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_plans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    duration_months integer NOT NULL,
    price_rub numeric(10,2) NOT NULL,
    traffic_gb integer,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    sort_order integer DEFAULT 0,
    updated_at timestamp without time zone DEFAULT now(),
    is_popular boolean DEFAULT false,
    price_per_month numeric(10,2)
);


ALTER TABLE public.subscription_plans OWNER TO postgres;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    starts_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    vpn_username text,
    vpn_password text,
    config_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    devices_count integer DEFAULT 1,
    auto_renew boolean DEFAULT false,
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'trial'::text, 'pending'::text])))
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id integer DEFAULT 1 NOT NULL,
    maintenance_mode boolean DEFAULT false,
    maintenance_message text DEFAULT 'Ведутся технические работы. Пожалуйста, попробуйте позже.'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT single_row CHECK ((id = 1))
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    telegram_id bigint NOT NULL,
    username text,
    first_name text,
    last_name text,
    language_code text DEFAULT 'ru'::text,
    is_admin boolean DEFAULT false,
    is_banned boolean DEFAULT false,
    referral_code text,
    referred_by uuid,
    balance_rub numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    photo_url text,
    trial_used boolean DEFAULT false,
    trial_started_at timestamp without time zone,
    trial_expires_at timestamp without time zone,
    channel_subscribed boolean DEFAULT false,
    channel_subscribed_at timestamp without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: allowed_ips id; Type: DEFAULT; Schema: public; Owner: x0vpn_user
--

ALTER TABLE ONLY public.allowed_ips ALTER COLUMN id SET DEFAULT nextval('public.allowed_ips_id_seq'::regclass);


--
-- Data for Name: admin_2fa; Type: TABLE DATA; Schema: public; Owner: x0vpn_user
--

COPY public.admin_2fa (id, user_id, secret, is_enabled, backup_codes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_logs; Type: TABLE DATA; Schema: public; Owner: x0vpn_user
--

COPY public.admin_logs (id, admin_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at) FROM stdin;
80813ec4-504a-43db-9852-391b5fee1a00	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 14:38:22.497897
de1972c1-7f83-4986-82f9-276ad306c9e7	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 14:38:25.076738
0f3770a1-5390-4e33-923d-8f68f1fbf620	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 14:38:26.777468
a506ae9b-edfa-4041-9c1f-65f3e2e46f3a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 14:42:48.548137
af3f94eb-36d2-4d36-987d-0ae0ff70982b	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 14:42:50.347403
8ac37337-3af5-41de-ac20-3e6dbab902b4	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 14:43:17.216318
d67995a4-8932-42e6-84ac-cd9e31f29d1b	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 14:45:42.485704
44d15d44-4309-4bd6-bfa3-33776cf2de11	6961be39-eacd-42d7-84f9-0a2a51d9741e	user_update	user	997bf74d-760b-47a3-91e4-52996a566fe8	{"is_admin": true}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 14:45:45.143113
3a4b9b59-d8db-4f60-a47c-757c61b17c05	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 14:45:45.259833
14d3df14-c8ee-4cc8-b996-73833c608360	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 14:46:43.909514
f7a2bc68-97fb-4c6b-95bf-c819cc4c0186	6961be39-eacd-42d7-84f9-0a2a51d9741e	promocode_update	promocode	a6b892fe-59c0-4e8c-9f87-31e77480904e	{"is_active": false}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 14:46:49.091478
cae80ab8-bab7-4fd9-b466-62b01f6c3115	6961be39-eacd-42d7-84f9-0a2a51d9741e	promocode_update	promocode	a6b892fe-59c0-4e8c-9f87-31e77480904e	{"is_active": true}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 14:46:50.113633
cfccb109-79e6-4521-8380-72944104b18c	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 15:06:01.208888
7c964850-5f5f-4caa-a7f0-b3745ebbb1db	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 15:06:02.199468
5eea2395-3cd4-4ad6-a585-a824087521c1	6961be39-eacd-42d7-84f9-0a2a51d9741e	user_update	user	dca94e89-f180-487d-a366-28c42b98a1fa	{"is_banned": true}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 15:06:05.566055
28d710f4-c871-49ec-a0ed-8221254fc65e	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 15:06:05.625765
f1476f00-5c10-46e3-9e01-325c6678e17e	6961be39-eacd-42d7-84f9-0a2a51d9741e	user_update	user	7af4ffe7-7e65-46e4-98e9-504619e252d2	{"is_banned": true}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 15:06:18.106066
4ff63876-a0ad-4429-9b4c-c4d7e4ed0cc8	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 15:06:18.213406
a0615501-ffa1-4d90-8d9f-82eb555eb22f	6961be39-eacd-42d7-84f9-0a2a51d9741e	user_update	user	dca94e89-f180-487d-a366-28c42b98a1fa	{"is_banned": false}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 15:06:20.601341
295db7af-df2b-446b-aea6-7d10aefcd3b2	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 15:06:20.67508
9836b7e9-3f5d-4f9c-bec9-c681e1892baa	6961be39-eacd-42d7-84f9-0a2a51d9741e	user_update	user	7af4ffe7-7e65-46e4-98e9-504619e252d2	{"is_banned": false}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 15:06:48.433271
52142ad9-a6ed-4a96-929b-8d317f57fc75	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 15:06:48.506035
d9674cc9-9916-4861-9054-e68d9cc5bb1b	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 15:06:55.454014
94887366-0840-48ac-87d4-d76c0f23cca3	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:15:57.639696
5abbccbc-9f16-463c-8773-2fb1928dfe5a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:15:58.45092
1549575f-2257-4379-91f8-f69b7dd5eb29	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:18:08.932503
d74a0149-b511-452d-8cef-7aa5f8e33975	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:18:09.787564
11bbcb57-ff9e-464b-88b7-46fb2aa796f7	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:20:12.486589
fcf5a483-2ec3-40ae-86f7-93eb607dde95	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:20:13.986968
ef486925-a661-45dd-b683-9ffe212433ce	6961be39-eacd-42d7-84f9-0a2a51d9741e	user_update	user	6961be39-eacd-42d7-84f9-0a2a51d9741e	{"is_admin": false}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:20:18.811402
28b09468-30a5-4f87-8f3c-724fc95435b9	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:20:18.891776
58ed298b-98e3-490e-9933-9e3f996483e3	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:24:16.91295
a1789d7a-0c45-42d2-a833-70b7518621f5	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:24:18.135322
71f79592-06fc-4070-8744-558b903bcaf1	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:24:20.909757
0c0b2926-b929-4d6f-87f7-1bc5e3cbd673	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:24:21.783338
8f839af6-0cd3-49d5-8c96-417bb041de4f	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:24:30.286443
6b1dde6e-1898-47e1-86c4-cfdee4743cd4	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:24:31.085015
1c33c7d3-a9bb-42ce-96f3-ba0855a2f774	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:24:31.553481
d91c16d4-13ff-4346-825a-ba45ee6d465d	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:24:31.963349
7e5aa441-38c6-4916-bcb8-b855f3b32ab4	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:28:19.418317
f37e1afc-d202-4fbd-958d-17d3012a175e	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:28:24.535457
8ddb6156-b659-46d3-a06c-0bd92347eb26	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:28:26.080163
e3964a3c-e23f-4a56-9a75-cdcba55c4a30	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:28:30.064055
9ba6cb69-dbeb-4b73-aef3-6f1929c5dd70	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:28:35.463065
ae6f3d0e-7a30-48b9-99b7-bc07b64ed1e6	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:30:51.556191
9598732c-0435-4647-a23c-fa4589745411	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:30:59.573706
ae62549c-c120-4940-a038-138ee5d03a4e	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:31:00.479553
bf01c15a-f2ff-4dd9-b7d9-2a105d8d89de	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:31:12.17923
79d10e52-386f-467a-bae0-bc9f6c490761	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:31:17.374649
13b46da8-05e6-4f7f-b971-f55d0b060dd0	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:31:18.412783
79895eba-2d0e-4c81-9f33-0da58b5cb692	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:31:51.96387
105f647c-74ec-433f-8316-1c40f55f9abd	6961be39-eacd-42d7-84f9-0a2a51d9741e	user_update	user	6961be39-eacd-42d7-84f9-0a2a51d9741e	{"is_admin": true}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:31:54.223942
c2405bf5-bdc3-40c4-b6e6-6046be3d4c1b	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:31:54.28361
da16a215-c15b-4c3f-8058-ed405c5b8e8d	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:20.077317
393294ed-e592-4462-b5d4-1aeb36f0f8ac	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:20.221192
c542c031-1825-4dc5-8e98-777738b40f8d	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:20.856046
7f480eb6-7381-420f-a222-7d1f5f6079e8	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:20.935393
580ec5a6-6408-410a-b4d4-c38c530c400d	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:23.060157
21a1f9c9-21eb-4b87-8080-162ce68390d8	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:23.132489
3ffd5eed-5460-4a97-9fc9-80515201be71	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:23.780613
131ed0ee-a074-4204-abd2-af13922ef458	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:23.862658
c18c3b4c-8a13-455c-a2d0-dae1befc344a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "banned", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:24.647559
143f815a-77b2-4059-a38e-a553f144aca7	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "banned", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:24.721705
2e07117d-79bb-4780-bc9e-649c24ac7707	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:25.259424
5b403239-a43c-4631-9fde-a6f243ccdbb6	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:25.350677
a90d1c00-4467-41dc-aabc-5e718da5b7b5	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "banned", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:26.733142
4af53bbd-a9f5-4201-83bf-dbb44d8c2b70	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "banned", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:26.822403
d3491086-e54d-48b6-94ba-0e78d2983151	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:27.349124
616006a6-81a7-4323-b98c-08d7e118dd8f	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:33:27.416361
e5828d51-8813-43da-8519-0be8512ff86a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:33:44.675445
13f5018b-50ab-4f8b-a0c1-80422fa20d64	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:33:46.457805
882f8ba4-ff95-4f88-b5b9-42d2f6ca8f2a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:34:05.146232
d6a7110b-a086-464f-aabe-0d34e597a7d7	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:34:17.908167
06553cd0-f745-48ce-928a-9a6eaf2fce16	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:34:44.562048
df3f3965-fdc6-49b6-a206-1f77385b30c7	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 16:34:46.267839
d21db0a5-45c0-47b7-ad5e-cb6442ba4ea0	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:35:09.176566
6f40018b-92b3-4aa9-8e11-7ac9bc3547e5	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:36:09.548191
85130e34-db45-4f27-9e16-4f862fc80bed	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:39:12.708374
5b1bf734-8939-4828-9baf-c002d8698572	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:40:36.069391
ecaebe31-5e92-40a5-80ce-d3cf34978a62	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:42:08.004602
c05eb2d3-69bb-403b-8746-1520aed21216	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 100, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:46:22.684603
699a2233-0498-4991-b4d2-1625af800eb4	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:49:15.942522
04c967e4-72c7-4611-87e9-800579f8a64a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:49:19.457852
8856f8cc-647a-4238-beca-c47afc994ac6	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:49:25.062813
27af31b3-9c24-463e-916b-b02a6b9e2d8a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:49:45.886521
91c66267-269b-4dd4-b7bc-5958ad7dd7d5	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:49:46.623765
309400be-92a5-4f1d-9fcd-60c580719c2e	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:50:41.559769
d9cea5c7-dc14-40cd-85d1-70a6f3eb64df	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:51:06.368708
b4316bf3-d4f7-494c-950a-0c5416993386	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:51:42.280318
b61f3be6-b3b7-4297-8f5e-b5ff5ab9fef0	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:51:43.186774
acc1de0d-8790-43f0-8c8c-bf0a9989df44	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:51:48.468047
93ad349b-9800-4922-9b82-4fa3b7f9c79f	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:52:44.71663
3b6b833a-53bc-4479-b87d-d68fc33064fc	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:52:45.712386
c11cb913-abc9-421c-ad86-8b3dd7d6cc5f	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:53:26.253303
0dfb4a68-33dc-4162-80ba-96fe52144ff8	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:53:27.015013
5649d2d5-fb2c-4bdd-987a-9897c1de0816	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "banned", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:53:27.979344
eef5dbcb-8257-47af-8f7f-6760f589076f	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:53:28.695511
7b47c8f8-7041-41dd-a6b4-5654dbad1a0a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:53:31.301776
37d6b940-8f1c-466e-a1ba-5ceefcf9fd5e	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:53:44.784763
4851f440-5e3b-4a3f-97f2-cef716e4c221	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:53:53.656502
cd5a56d8-d78d-406f-a8d3-e27ac1326434	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:54:17.2982
ba16dd3a-a7bd-463b-b421-8c39c274e38e	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:55:18.348728
08038673-94dd-4388-9de1-3fb33526a492	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:55:20.428088
475f1081-222e-40d7-b0db-8ba3c7d4843a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:55:21.167611
e743ca47-134f-4d26-8681-231fe8b2b4a9	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:55:23.689318
ed410c93-f9af-4618-a92a-870a49d973e9	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:55:51.915337
e19688e1-e043-49d4-8bf0-64b9cba0e7df	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:55:52.731911
ae9e8b20-265a-484d-88f7-d16922f93ec1	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "banned", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:56:22.003135
72514148-b47e-4bc3-991b-f3c09d367dac	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:56:22.777503
446078ca-218f-4eb2-872b-50be15210a18	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:56:23.860455
b2d34a2d-fb76-460f-b1e3-14311c969a7f	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 16:56:24.728649
27801f81-cbed-4d6d-8cfe-65c280e718a9	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 17:01:29.14996
47013916-9a63-4790-b64a-6e236c166718	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 17:01:35.020071
4ccf4416-51d8-459a-b773-e3eeae48fd34	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 17:01:52.124277
1fd7959e-2f81-4391-b098-246f70b12500	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 17:01:54.068002
4af134d2-ec15-4351-95c2-f56506719d90	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 17:02:02.409666
95467161-a854-420c-b445-99aa77db5650	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 17:02:09.997824
beb942fe-b938-4f2c-a2c7-db28468d663b	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 17:02:10.079589
c98ae883-710b-434b-b87d-711c0e767adf	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 17:02:10.24795
ce2036b1-9079-4b84-be05-6afbcfeb59b0	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 17:02:10.321356
59c2feb0-88c3-45a3-9928-6659acf72bb1	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "banned", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 17:02:12.778097
866675f2-3ec5-4777-b3e0-3ff66f2e675e	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "banned", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 17:02:12.85687
c37843b8-b0c0-4f6d-8f50-beae89718258	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 17:02:13.237489
9683f178-b9d3-4697-9e7d-19504f7675e1	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 17:02:13.357888
464c7c61-e382-4d14-b799-548c2dd7755d	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 17:02:14.628531
3ab5480c-3acb-40a7-a5d3-e721c0cf4ef0	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_export	\N	\N	{"count": 4, "filter": "admin"}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 17:02:15.470565
27360c88-539e-45da-a481-3c43d54e223a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 17:03:33.134228
9cb75968-d72e-44a4-b0ab-279ecf434542	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 17:03:33.719658
14955ec3-bebc-4c7f-8414-493870a0421c	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 17:20:33.975936
40815ea9-342b-43ef-bf90-c9e9ed2cd0a1	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 17:20:55.341549
1b06e0f0-04f1-4e29-9e74-1bee7ba340d4	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-17 17:22:28.11204
b88effbe-509d-4558-9e74-e1e3a95367b5	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 17:23:03.135648
8ee5e296-ca55-42ac-bb04-8542523432b7	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-17 17:23:05.090387
38f4d592-0952-4866-b746-2be93ec1461a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-17 17:37:57.84847
e8a0ebcc-24d1-450b-9642-4d2a0ede92e9	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-17 17:37:58.909311
83343080-96d1-40e0-933f-69c3d504fa8a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-17 17:38:04.818547
fe917e6f-80ec-4e53-a120-255e5634f700	6961be39-eacd-42d7-84f9-0a2a51d9741e	broadcast_send	\N	\N	{"total": 4, "failed": 0, "success": 4, "has_image": true, "message_preview": "."}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-17 17:38:39.937813
292051cb-d19f-4362-b248-462543e6acbc	6961be39-eacd-42d7-84f9-0a2a51d9741e	broadcast_send	\N	\N	{"total": 4, "failed": 0, "success": 4, "has_image": true, "message_preview": "1"}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-17 17:38:41.175016
b9773535-3588-4c87-ab89-04bccb6f0818	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:00:01.354637
885cda8b-fde2-4748-a855-6d34959b9db5	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:00:04.389047
d446a841-dad9-47e8-8b5d-faacc9648cea	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:00:53.474753
4e258f0e-3b91-4f84-9970-fba4f3c64aec	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:00:54.865732
cc060ecb-7d89-4cfa-bb64-4cbf654a3a32	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:00:57.918269
70ef2d2c-e2a2-49f9-acf3-3277b312592c	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-18 12:01:16.913906
6dd57fcf-f12d-4380-997f-7a1f35884b45	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-18 12:01:18.964532
211f120f-3a21-4521-970f-80043b68e53a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-18 12:01:25.354051
a44e9349-c2a1-4e5f-aad0-b2779a114330	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-18 12:01:29.134764
f6519896-cb78-4277-b928-93c518867bce	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-18 12:01:30.993537
68e32738-9da9-475c-88cf-175486f79642	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-18 12:01:32.555585
27c1c159-c10a-4c01-8f08-4eeb3e280953	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "banned", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-18 12:01:33.370922
b1c04f21-256e-4e60-b966-ac99a7b7ebc0	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:01:55.336654
b045ba1b-d44e-4026-a57e-98b4e2cf3e28	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:01:56.92438
e995add3-7750-4dad-85ec-5111a58b4747	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:01:58.343573
5394c0a9-23ab-463c-a3c1-9f06813b54ec	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:02:04.531842
c1e10747-8892-42e0-b105-6e2f5e87058c	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "admin", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:02:04.62978
284ac27b-cf3f-46e5-b3b4-ce8f519829ed	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:02:43.353898
3e564f1b-12cf-4649-a3c4-d642d5213765	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:03:36.856557
45cbb5d1-e4e2-4881-b6ca-d6b2c97a677e	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:03:43.624131
e83a56a8-f2b0-43ea-bc13-8a36310204c4	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:03:44.89668
2a0e4b3c-af26-4620-8135-3c7123dcd8e9	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:03:44.975477
414d00ae-2a54-4749-81ba-12ff45f55b81	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:03:45.318868
116394ae-34e7-485b-8f39-04ab8f2cacd7	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:03:45.420849
70ce2f51-8434-4b6d-8b42-391c6e127239	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:03:45.854211
8ad7bac7-f5ad-4261-b618-95117c7f0613	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:03:45.936643
6be0b1cd-552e-468a-83ba-56b464bf56eb	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:04:18.646097
785dcea2-2443-49e2-bddc-3b6ef777d2ac	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:04:47.530254
0fe66429-b608-4d7f-a665-6f936927ab75	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:04:50.096118
e7985fe5-cd97-4edf-b868-4bf908096a6f	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:05:21.138694
0e77cf2b-c9d8-44c2-ab9a-96a3ecc26310	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:05:37.861775
9d405d92-7d59-4e56-a317-786b7901e7b5	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:05:39.813731
601df8d0-abd4-48e2-bf83-78e0201bf7ab	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:05:44.344986
de273470-f157-4a4b-9b82-2dddfb30dd2d	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:06:00.646944
2865863b-1fb9-4388-8760-df293ecfefaf	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:06:05.30054
8181f00d-474c-4625-81d3-eae1be4bfb3d	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "banned", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-18 12:06:16.221609
6d295322-52fa-4481-b257-3dc6a9ef16be	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "banned", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	2026-04-18 12:06:24.241516
e60725a4-6389-4326-8cf2-43a36241138b	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:12:29.519873
053db209-2003-4b60-a040-8cc686a4c90d	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:14:29.510017
7a966269-54f9-43f2-b78b-bbbd4131c933	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:14:33.121373
935a5bb1-8b9f-4423-89ee-0d468f051702	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:14:35.537369
4a8a4ac1-389c-4759-a62c-b336fba6a87b	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:14:38.919261
1a643117-9070-42c6-ab98-3c41c8f892bc	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:15:27.320293
05573ac4-b927-4d4a-8b8f-d220fe159c42	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:15:28.68567
b7becd2f-1638-4347-ad17-040b60902e36	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:15:31.025038
b0acc90b-d3f6-4a05-a63f-03b66d497b65	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:15:36.645506
08b5db18-b601-4bd8-9b3b-047efe48b5fb	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:15:56.09856
bb2171f2-9300-4cd3-b4df-9847b8f7dbfe	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:15:58.718048
3624e78b-8aa2-48d9-bfbe-2f1821f4dc17	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:16:25.480677
87e534f7-77f3-4da9-85a3-6cc7fb16ba70	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:16:26.257961
61ec2b55-ce24-419c-99b5-ade59b333d32	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:16:29.842063
3e2f1ba7-e329-4bbd-8714-37d4e423de8e	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:16:34.264398
6514bc84-ecf6-4033-a4fa-84746c2b58b7	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:16:43.988425
258e333c-6cbf-4d2e-96ae-a422224e5cd0	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:16:46.158669
1606b038-45f7-449e-af59-c069bd0b1797	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:16:56.231814
ef4858a9-c4d8-4684-b6e9-1944405173e7	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:17:24.679185
5ab620e8-b0dc-433b-a540-95f0e16eb2b1	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:17:25.342591
050d099f-92bb-4a19-aeae-9ad78443e15c	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:21:32.6717
610e2ae4-01a6-405d-b8b1-33e8c9816f5d	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:25:08.837437
b8cada0a-a0c5-46c9-996f-68a158218b86	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:25:20.686014
7a1e38da-c1c4-4ec2-a9aa-d29d2f0a8a22	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:25:35.159607
9ef17594-2e69-452b-8934-3a25ed60ea60	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:26:10.535836
ac8a9548-80e8-4da9-bbb3-d1025861a6e0	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:26:23.34327
d3903070-9fc3-4fd3-864a-c71e7e2ddf0c	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:28:12.280335
ac2b77ab-f64f-4c19-bbf8-c0a790e7fa1b	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:30:39.898039
ca52114f-3864-44df-8a24-74e1eb866392	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:30:40.597018
cfc916de-9f1d-45bd-a08d-5f8b06d84adb	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:32:32.070973
9b83ecde-8d04-48c2-85b9-b31351f85b6c	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:32:32.747088
24e99cc3-6f27-477a-8d72-86707cffff24	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:32:37.629889
26ea1bd3-00e8-4acf-baf6-373a2a29c8ac	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:32:40.913028
9f56e36a-58f2-44c5-891b-ed663f9005f5	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:32:48.607014
bad54fa3-f52a-473b-baff-9485614d8436	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:32:51.697243
d26bebb5-d2a1-496a-bd83-fd7ed1c1fc7b	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:33:43.868156
35a16b54-acfe-44a6-bf08-d5d743e835c5	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:35:15.596375
c1d0ad52-47b3-444d-b682-e3de3f763dc8	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:41:01.098574
4b5f4c8a-c2ee-4d8f-9874-08e40f01525b	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:41:08.425405
ad44e450-a9f5-4678-b745-6658ff284ace	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:41:09.540922
9860381c-e7a5-496e-9e60-037c24af62ee	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:41:14.312564
a6bb0430-3e9d-4a13-85a6-399e7a745a73	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:46:56.591498
6124f33a-0e0f-4512-ad8f-08387ff0bf0c	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:47:02.018263
3a77da93-d685-4711-aa58-3770fe725b19	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:50:14.789545
988fae82-0a83-48b8-8671-fdb502526367	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:53:29.229971
cae77d91-926d-484b-8ce2-b86f7121ebb1	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:53:46.903343
d1798da2-ab03-4bdf-b61d-f71b683283dd	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:54:24.036064
d6180490-1207-446f-9ec3-1e75120f3bb8	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:59:27.170391
7dc0a719-23a8-4ccc-82bd-37efbffc8ac4	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 12:59:52.016334
434ea8d7-fdc6-4b52-a603-5f11d255eb62	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 13:06:43.92491
7dc9dfca-6d7c-47fb-aca2-9f2c3a261b2b	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 13:07:02.160822
5cbd3425-8484-4e93-b31a-da71f4ee0645	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 13:09:43.046876
139e0e16-1144-4b78-b5f0-cbbaf67e1791	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	2026-04-18 13:10:21.343212
22b4f81b-d410-4761-bdd8-44599965bdc8	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-18 18:58:00.50851
bac7fe75-2456-4ea5-95be-a51b45075b95	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-18 18:58:02.010115
116c19df-1008-444e-bd10-7e79677d6a5a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-18 18:58:14.819525
453591a7-1eb7-4b0b-a59c-77d9f99a54be	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-18 18:58:19.876451
a7dffaa5-612e-4cba-ad8a-971078c988ff	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-18 18:58:22.890082
1e89e828-671b-4e2a-94ed-78268ccfe7f7	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:19:15.520216
9b16e5c6-37ca-4735-b96e-58e07e829ff7	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:19:16.681446
eae8809e-98a7-4c00-8645-7e3516a6926a	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:19:18.768171
f33bd825-bfa2-40c3-a0cc-ab3828805868	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:19:27.776185
282e17b9-9546-4630-bb23-e41cbdf6e6ff	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:19:27.922315
ce0f46c1-6541-4f66-9e42-4bad58062737	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:19:28.783162
e9f8d4d8-f2ae-458e-9362-414f48af1e50	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "inactive", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:19:28.921969
9ea9bf83-c428-4aa4-a3f8-10563b288456	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "banned", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:19:30.266906
cf12576c-ce23-4acf-85a6-40e78fd275cd	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "banned", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:19:30.441296
109eb2c3-6e52-4df7-ba63-774f433f5187	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:19:31.535066
e0d9aa3e-83d4-4f38-8888-d63274673ed7	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:19:31.689299
647d7cd5-4fcb-4e9c-b830-7b5afb4c7b17	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:19:42.642161
1301ac72-8d5e-4b47-9510-e318ff5d5817	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:19:47.512756
e8662189-ebb7-4264-b766-00c86fdede01	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:20:37.677754
05f32f9a-130e-445d-b817-6efb8f4bad0a	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:22:07.26989
0f6a56bc-1411-4ff6-b0d4-31ee091fd196	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-18 19:24:22.264938
85e1878d-8b81-41f5-8130-8da1d51df24d	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:39:15.700333
756a8a4e-e5b8-41de-b96a-c7d7f35120e9	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:39:16.96607
6035285d-5873-4567-9271-db2627666e5a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-18 19:41:41.669839
0b9c7930-9dd1-4e52-8c00-5b7b01a5e689	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-18 19:41:42.133178
bbd5f8bf-d7e6-48ba-98aa-ddeb32ffd7d8	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:41:47.715677
082c40c2-491d-4a05-967d-b5e41fa4c85d	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-18 19:41:49.533725
72966bef-72d8-43cb-bd2f-74172a46bb61	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-18 19:42:03.516627
02d3a116-357f-4300-8555-c5270656b182	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-18 19:42:03.521772
fecbc178-223c-445d-bea9-e50136d5e2f4	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-19 17:27:16.484417
479acb7e-ced7-49eb-aa19-fb38ebf5642d	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.177 Mobile Safari/537.36 Telegram-Android/12.6.4 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-04-19 17:27:17.414751
f9e0a01d-f3c8-4893-80d9-e281f57f05ef	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-19 17:29:37.251777
dd96f100-c993-4f39-9cb3-7ef37f4d0fec	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	31.144.149.102	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-23 10:49:16.985141
926c267d-7522-4ff7-a41d-943d3494b887	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	31.144.149.102	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-23 10:49:20.656457
e2d21924-1494-42d5-af6f-5523c633490c	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	31.144.149.102	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-23 10:49:35.245018
8395f835-a69e-4138-9bdc-f19217175e5f	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	31.144.149.102	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-04-23 10:49:42.670011
9ec0942a-ce21-4f1d-83ae-c5686437b8dc	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-02 19:52:34.089244
75690455-038d-4b6f-9b2a-cfe3c4843496	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	46.133.162.216	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-02 19:52:35.569407
48dd4422-9df6-495d-92ce-15083967eb31	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	46.133.162.216	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-02 19:53:39.433319
c49fddd7-5f6f-4b04-b91e-17e634a06d3f	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	31.134.78.157	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-08 20:07:04.188599
5bd17020-6faf-4d37-91ff-d183eef6e3b5	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	31.134.78.157	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-08 20:07:05.485851
2066b13a-d799-4297-8070-2937250d4814	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	31.134.78.157	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-08 20:07:10.759366
c54c7817-9703-4444-a97d-5351919b1893	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	31.134.78.157	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-08 20:07:22.927033
56b4d773-e93a-4897-9dc4-005a8e1e2673	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	31.134.78.157	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-08 20:07:23.7339
93f957be-964f-42f9-b1c2-cdbd8c51f40f	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:23:54.076376
b3048596-8669-4ca5-99cf-a1fadeb60bd5	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:23:55.207567
750ea40c-d9f2-4e52-9582-8fb18060f2f6	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:26:16.582931
2dc585e8-ae86-4058-a4df-8ffffb984492	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:26:17.521259
cd95b25a-de27-46cd-bad5-34b3a418bf55	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:26:32.709035
d4fe9372-3b26-4701-9c6a-c7a8dd82f244	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:26:34.26154
924d54b3-1208-45d9-acd1-21345b128126	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:26:37.631821
aad9e2f0-57b5-4388-a7d8-d9095a0285d2	6961be39-eacd-42d7-84f9-0a2a51d9741e	user_update	user	e2e73fb4-19b0-4edc-9c79-87d42d6c3e0c	{"is_admin": true}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:27:20.465018
56f44d2e-6c2f-4d03-bd7a-d0363f195063	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:27:20.556374
a993e7ff-f69a-41cb-95e3-afe1bfcc7d8c	6961be39-eacd-42d7-84f9-0a2a51d9741e	user_update	user	e2e73fb4-19b0-4edc-9c79-87d42d6c3e0c	{"is_admin": false}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:27:22.828182
044efdb1-9335-48f9-abb0-c38853cfd298	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:27:22.888777
3e23735f-9788-47db-ab8a-fae63e6706cd	6961be39-eacd-42d7-84f9-0a2a51d9741e	user_update	user	e2e73fb4-19b0-4edc-9c79-87d42d6c3e0c	{"is_banned": true}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:27:25.18593
b34ad5f1-8be1-40ee-beae-55a25211d898	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:27:25.262354
ae3897d1-6a40-4f2b-b35d-ecc31d85def2	6961be39-eacd-42d7-84f9-0a2a51d9741e	user_update	user	e2e73fb4-19b0-4edc-9c79-87d42d6c3e0c	{"is_banned": false}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:27:30.916212
df8699a8-1266-4059-9c14-2349b3a6b462	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:27:30.98217
2b795e36-2de5-4050-971d-d5e1e06687f8	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:32:06.124695
7a61e2bf-0ec3-48fb-b323-dcc986ddcb02	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:32:06.927213
0db54f20-8f6a-4e8b-82df-e9eec39b93a4	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:53:41.187443
3d504ebc-6bef-4a66-be4e-45e119e5c9de	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:53:41.235192
bc9c0076-c8fd-472e-88ab-94bba1c15b0d	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:53:44.634709
f3c09be7-42ed-4bbf-a595-7eea0043e355	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:53:47.695115
16ceff13-7fac-430d-93c4-36e49195725c	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:53:47.820371
7dc626f7-3c93-42dd-9613-78349cc2426d	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:54:48.671537
ca61bd28-7649-493c-89ba-51812f2b53b9	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:54:50.111855
561c39d9-6b94-486c-b8ab-2f9b1bc58938	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:59:23.783439
a660bdaf-8652-4cf6-9d23-a93ef086fe20	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 11:59:24.755949
8c7f4542-e798-489e-aee3-026a21d58989	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 12:49:41.024733
44e613f0-9d18-4bb8-a4ed-654d56aebded	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 12:49:42.046764
5d949106-bf55-4332-9afc-117bc860f78f	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	194.87.55.141	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 15:24:49.1894
47b13774-a184-4bc5-b057-aad25c269360	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	194.87.55.141	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 15:24:50.604522
eca7cd1c-765c-4d0c-9641-6d7f15a897ac	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 15:41:33.759806
41b75197-63ef-4e9a-bedf-30628b056016	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 15:41:34.354301
49cd1c10-007c-4808-8310-d607d64a8bd3	6961be39-eacd-42d7-84f9-0a2a51d9741e	broadcast_send	\N	\N	{"total": 27, "failed": 2, "success": 25, "has_image": false, "message_preview": "Если не выдалась пробная подписка напишите в поддержку. \\r\\n\\r\\nhttps://t.me/notfound_x0\\r\\n"}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 15:41:59.87274
91a2cbc2-076f-4bac-8531-305c0111e91c	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 15:43:10.692817
a48f7d20-8ead-4362-be04-30ab82e5ce9a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 15:43:12.249524
9d127f96-66a6-4b75-8d88-15d23ea124c8	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 15:43:16.4845
fc95d1f0-b9bb-40a7-bc90-ec998465e029	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 15:43:27.669185
1fcbd39d-e6f5-4175-9d5d-de683192ba06	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:03:24.2715
a2367b48-5317-4a49-b951-0a1763273bbf	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:03:25.047067
bb01ecb7-9638-4366-ae92-4c4b4955d414	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:13:22.522784
8e564522-4fc5-4a7e-a275-9423f2e7e778	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:13:24.196677
78066215-9cce-420b-bd67-c9af97ba4d99	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:13:38.944999
526a95d9-95a1-43ec-b034-b3b8e04270f8	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:13:39.575319
4089a3c7-b0ea-44b3-be44-b263ed50cb79	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:28:42.474504
dbc456f9-d287-4eb1-8a8b-095da9e16436	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:28:43.295951
c694d052-64eb-498e-8b3d-3b989f55b63b	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:30:29.100319
607f7526-1ce2-4ff5-a3e7-cd299770acd4	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:30:29.358102
c582b47a-f9df-42c0-adc7-17cf4001b296	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:31:40.760833
012e4160-bf01-4687-9295-492fa9f4dd57	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	194.87.55.141	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:31:41.486575
7617d6bc-5567-41f0-8f30-ccfc0248836f	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	194.87.55.141	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:35:54.840594
3f2e4450-b62a-4f0d-954d-513d0bb3820c	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "active", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:35:55.036733
f6cd5369-119d-4d15-916b-818e177ae671	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	194.87.55.141	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:35:55.186144
eade35f9-93a8-455a-b3fb-f5ad9a33dddf	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	194.87.55.141	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:35:55.359846
8beedeb5-05c1-4077-aa27-c3e2379fb819	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 2, "limit": 20, "filter": "all", "search": ""}	194.87.55.141	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:36:35.35855
68e8d1b9-6f16-4879-817f-a44671820174	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	194.87.55.141	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:36:52.52396
7a0e2b49-4f0f-4905-be6a-7456109870ee	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:37:08.768999
275ca71b-384d-451a-8983-277400133c98	6961be39-eacd-42d7-84f9-0a2a51d9741e	promocode_delete	promocode	a6b892fe-59c0-4e8c-9f87-31e77480904e	\N	194.87.55.141	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:37:15.979306
54916fa8-442b-4b72-a9ee-4e4d742e911d	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36 Telegram-Android/12.7.2 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-05-13 16:55:20.595241
67a32b97-190b-45a0-8942-8fdfd081c523	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36 Telegram-Android/12.7.2 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-05-13 16:55:22.278728
09ed2c5f-72a6-4f99-883e-55029b837f53	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 2, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36 Telegram-Android/12.7.2 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-05-13 16:55:38.064095
a31a77d9-5b1b-43d1-a9d1-ca1004f1f773	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 16:59:53.98584
977d6b57-a6fe-4592-901f-664068c6e1a9	6961be39-eacd-42d7-84f9-0a2a51d9741e	broadcast_send	\N	\N	{"total": 28, "failed": 3, "success": 25, "has_image": false, "message_preview": "Технический перерыв окончен\\r\\n\\r\\nВсем пользователям была выдана тестовая подписка на 3 дня.\\r\\n"}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 17:00:21.172319
90772dfc-eeb8-4e40-a000-178c76890acd	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 17:04:49.195883
1236d6e6-c327-4b27-b80b-c6645aa6555c	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 17:04:50.659313
37f16069-7167-4de5-9f52-9cc54be291a7	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 17:05:12.215634
f91d991d-39d2-4c9a-80b9-c595cf0194ac	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 17:05:21.046643
e7311855-02ba-44b3-b7b1-0c9889b3ef9f	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 17:06:26.876348
d3ae37fe-44b9-4623-aaaa-26eff2dcfea3	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36 Telegram-Android/12.2.10 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-05-13 17:07:35.065339
82768bde-79b4-49e5-a1df-c37e14b15bd8	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36 Telegram-Android/12.2.10 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-05-13 17:07:40.858074
daae1589-3d58-49a4-bfc5-ec239df79eff	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36 Telegram-Android/12.2.10 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-05-13 17:15:10.417469
2b7e6af3-a1a6-43cd-b2d9-831b3c2260ef	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36 Telegram-Android/12.2.10 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-05-13 17:23:28.929364
6d98367d-9d80-4606-87a0-ee1dee620515	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36 Telegram-Android/12.2.10 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-05-13 17:23:38.515671
f80b9be3-b6b2-47ec-843e-8561150198c8	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36 Telegram-Android/12.2.10 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-05-13 17:23:54.449468
4b02b962-759f-43b8-831d-5080f6d687fb	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	193.23.220.63	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 17:23:55.655697
70b49855-c4aa-400d-8949-08379e146731	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	193.23.220.63	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 17:23:57.237003
b62d4a06-6b91-43c8-ba19-ae4f8fae15ee	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36 Telegram-Android/12.2.10 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-05-13 17:25:29.041092
557692ce-4fd8-4505-bf4a-ba1c030c4837	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36 Telegram-Android/12.2.10 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-05-13 17:25:31.399658
a2632c5e-2f97-4056-8ac1-ab633028f5b3	dca94e89-f180-487d-a366-28c42b98a1fa	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	150.251.152.77	Mozilla/5.0 (Linux; Android 16; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36 Telegram-Android/12.2.10 (Xiaomi 24095PCADG; Android 16; SDK 36; HIGH)	2026-05-13 17:27:46.806194
488924fc-8637-436d-9a04-efd364620f19	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	193.23.220.63	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 17:28:04.233312
1b74dfde-5185-47c7-a0c7-9cfcf1aa9e3c	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	193.23.220.63	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 17:28:05.075487
7b9ccf6d-3434-4c82-aafd-b87deab15192	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	193.23.220.63	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 17:28:28.357132
1a0fea60-d94d-4937-917f-00dcbe5e0325	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	193.23.220.63	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 17:28:29.995679
b8d80de9-88dd-4e6f-a776-40ee8f9cfd92	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	193.23.220.63	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 17:28:42.741489
2ea22d60-743c-4c6f-8b16-afa699103d75	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	193.23.220.63	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	2026-05-13 17:28:46.579916
16d48bf3-e621-493e-8c26-edd4c9adda23	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	169.197.141.249	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 17:53:29.718441
a59f5614-13ec-4b76-9772-c5035bf6e578	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 19:32:42.478683
e05a8ab0-cd0d-4a1d-a420-3aef366e0a8a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 19:32:46.697208
4b8b9179-87cc-4e5a-b740-a91eb28edb8d	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 19:33:03.87879
7f097a83-f233-4f83-a603-97d170be0892	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 19:45:32.069905
67d5932f-6a0e-463c-99c0-7f18da73aa1f	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 19:45:35.978403
45c27827-feeb-4650-b763-f3a8eec6ebc1	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": "S"}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 19:45:40.167417
393e388c-fb23-4e0b-b645-9248f733836e	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": "Su"}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 19:45:40.595747
ab4af4c3-4903-4ab3-8862-742da097e18b	6961be39-eacd-42d7-84f9-0a2a51d9741e	user_update	user	4e499bb0-6cc1-4320-b298-90cfa27d26d4	{"is_admin": true}	31.144.40.37	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 19:45:42.832115
e8042777-ed77-48f7-a552-5373cddb15f2	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": "Su"}	31.144.40.37	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 19:45:42.921399
4c23a7ec-f819-4abb-affa-6718dab727a4	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 19:57:49.030677
3b35aaef-3a7b-4a96-9a78-087a0b7e6663	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 19:57:51.434961
977b8a85-723f-496b-a01c-479f967f45c2	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 20:13:53.577545
457bdb06-f513-4781-8fc7-5c1c7438c55a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 20:13:58.397373
d90e00e1-47f0-4e74-a381-2271834d621a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 20:14:12.924668
97982b28-fe6b-4cf9-b4bc-240c9077517a	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 20:14:37.787051
e5569893-03ef-4f04-85b5-6c3e8d9ad7b5	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 20:15:32.820701
3bdb4b3e-0e65-4b05-8fcd-5b7d664906f0	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 20:15:59.477994
4422587f-75eb-40eb-84a0-3941835418f5	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 20:16:00.56679
5d9261d9-8cdb-4759-81a1-7728505e5634	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 20:16:20.564242
2ef9d234-33be-467d-ad60-87f07ddc79ec	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 20:16:26.980667
27a882ad-ea33-4f4c-b7b5-6a6b12a9ddf7	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 20:18:25.34581
e745c2ce-419d-437e-9993-c30df17c229b	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 20:48:08.672771
3d73c3a0-c242-495d-bf5e-cafe4299dd95	6961be39-eacd-42d7-84f9-0a2a51d9741e	users_list_view	\N	\N	{"page": 1, "limit": 20, "filter": "all", "search": ""}	176.111.187.61	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148	2026-05-13 20:48:09.598556
\.


--
-- Data for Name: admin_sessions; Type: TABLE DATA; Schema: public; Owner: x0vpn_user
--

COPY public.admin_sessions (id, user_id, token, ip_address, user_agent, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: allowed_ips; Type: TABLE DATA; Schema: public; Owner: x0vpn_user
--

COPY public.allowed_ips (id, ip_address, description, created_by_telegram_id, created_at, updated_at) FROM stdin;
1	178.66.85.0	TECNO KL7 user - bypass Telegram check	7068245628	2026-05-13 19:52:42.231243	2026-05-13 19:52:42.231243
\.


--
-- Data for Name: faq; Type: TABLE DATA; Schema: public; Owner: x0vpn_user
--

COPY public.faq (id, question, answer, category, order_index, is_active, created_at, updated_at) FROM stdin;
8e248eb3-76f4-4209-99fa-21919a8645be	Как продлить подписку?	Перейдите в раздел "Профиль" и нажмите кнопку "Продлить подписку". Выберите удобный способ оплаты.	subscription	3	t	2026-04-17 17:11:08.057289+00	2026-04-17 17:11:08.057289+00
fa6f65ce-fe0a-43ec-93d1-70c1b9c79c0e	Как использовать реферальную программу?	В разделе "Профиль" найдите вашу реферальную ссылку. Делитесь ей с друзьями и получайте бонусы за каждого приглашенного пользователя.	referral	5	t	2026-04-17 17:11:08.057289+00	2026-04-17 17:11:08.057289+00
5baf1f58-8554-49ee-82d1-a687c00f5f55	Что делать если VPN не подключается?	Проверьте интернет-соединение, попробуйте переподключиться или обратитесь в поддержку через раздел "Поддержка"	troubleshooting	4	t	2026-04-17 17:11:08.057289+00	2026-04-18 12:53:40.374916+00
51862466-a15f-4d60-ab3f-de3112dc88d2	Сколько устройств можно подключить?	В зависимости от вашего тарифа вы можете подключить от 1 до 5 устройств одновременно	subscription	2	t	2026-04-17 17:11:08.057289+00	2026-04-18 12:54:00.25937+00
786f745a-abc3-4e1f-b973-d89afa5ec424	Как начать пользоваться VPN?	Перейдите в раздел "Настройки" и следуйте инструкциям для вашего устройства. Мы поддерживаем Windows, macOS, iOS и	setup	1	t	2026-04-17 17:11:08.057289+00	2026-04-18 12:59:35.120748+00
\.


--
-- Data for Name: news; Type: TABLE DATA; Schema: public; Owner: x0vpn_user
--

COPY public.news (id, title, content, category, is_published, published_at, created_at, updated_at) FROM stdin;
02fbe47d-2cde-48b1-a3d7-a574c6710da1	Добро пожаловать в xOVPN!	Мы рады приветствовать вас в нашем VPN сервисе. Наслаждайтесь безопасным и быстрым интернетом!	announcement	t	2026-04-17 17:16:41.402565+00	2026-04-17 17:16:41.402565+00	2026-04-17 17:16:41.402565+00
c53a80db-0fa1-4b76-af4d-58a31fc84bb1	Новые серверы добавлены	Мы добавили новые серверы в Европе и Азии для улучшения скорости подключения.	update	t	2026-04-16 17:16:41.402565+00	2026-04-17 17:16:41.402565+00	2026-04-17 17:16:41.402565+00
\.


--
-- Data for Name: notification_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_log (id, notification_type, user_id, subscription_id, sent_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, user_id, subscription_id, amount_rub, payment_method, payment_provider, provider_payment_id, status, metadata, created_at, updated_at, pally_payment_id, pally_payment_url, photo_url, external_id) FROM stdin;
0c7d8de3-4125-4e64-b265-257bf2806ee5	6961be39-eacd-42d7-84f9-0a2a51d9741e	8fb74c98-097e-40be-808a-843a37234896	155.22	crypto	crystalpay	\N	failed	{"plan_name": "1 месяц", "invoice_url": "https://pay.crystalpay.io/?i=715325347_zYjKyTTedocGcp", "promocode_id": "a6b892fe-59c0-4e8c-9f87-31e77480904e", "devices_count": 1, "discount_amount": 43.78, "duration_months": 1, "crystalpay_payment": {"state": "payed", "paid_at": "2026-04-17T14:06:38.814Z", "payment_id": "715325347_zYjKyTTedocGcp"}}	2026-04-17 14:06:33.63353+00	2026-04-17 16:54:04.751942+00	\N	\N	\N	715325347_zYjKyTTedocGcp
9300cafb-5e1b-4f86-85f5-41568bf7c4e5	6961be39-eacd-42d7-84f9-0a2a51d9741e	e99afbb0-5029-466b-9d81-30c49a7c5a08	740.22	crypto	crystalpay	\N	failed	{"plan_name": "6 месяцев", "invoice_url": "https://pay.crystalpay.io/?i=715325347_MxnnEqTDxElHXn", "promocode_id": "a6b892fe-59c0-4e8c-9f87-31e77480904e", "devices_count": 1, "discount_amount": 208.78, "duration_months": 6, "crystalpay_payment": {"state": "payed", "paid_at": "2026-04-17T14:06:13.030Z", "payment_id": "715325347_MxnnEqTDxElHXn"}}	2026-04-17 14:06:07.433736+00	2026-04-17 16:54:06.803264+00	\N	\N	\N	715325347_MxnnEqTDxElHXn
661a4656-e4b6-4e2a-8a2e-932599ec0b57	6961be39-eacd-42d7-84f9-0a2a51d9741e	be39be77-ad2e-4cf2-aff6-45ec5fa07c00	949.00	crypto	crystalpay	\N	failed	{"plan_name": "6 месяцев", "invoice_url": "https://pay.crystalpay.io/?i=715325347_NAggjtOEFIPGYW", "promocode_id": null, "devices_count": 1, "discount_amount": 0, "duration_months": 6, "crystalpay_payment": {"state": "payed", "paid_at": "2026-04-17T14:04:32.268Z", "payment_id": "715325347_NAggjtOEFIPGYW"}}	2026-04-17 14:04:17.122995+00	2026-04-17 16:54:08.151197+00	\N	\N	\N	715325347_NAggjtOEFIPGYW
81dbad97-7fdc-4f05-a1ed-fe57c7bd0bb6	dca94e89-f180-487d-a366-28c42b98a1fa	ff22229f-f534-4efb-b82b-889e40235700	83.00	crypto	crystalpay	\N	pending	{"plan_name": "1 месяц", "invoice_url": "https://pay.crystalpay.io/?i=715325347_eKacxUqObnTixx", "promocode_id": null, "devices_count": 1, "discount_amount": 0, "duration_months": 1}	2026-04-18 19:17:44.708208+00	2026-04-18 19:17:44.708208+00	\N	\N	\N	715325347_eKacxUqObnTixx
697b3e39-511d-4e14-9ad7-6f568a8cff59	6961be39-eacd-42d7-84f9-0a2a51d9741e	4f67a704-8dfd-4faa-935e-8e0fec941999	83.00	crypto	crystalpay	\N	completed	{"plan_name": "1 месяц", "invoice_url": "https://pay.crystalpay.io/?i=715325347_DJgDWrjbTakhxV", "promocode_id": null, "devices_count": 1, "discount_amount": 0, "duration_months": 1, "crystalpay_payment": {"state": "payed", "paid_at": "2026-04-18T19:19:30.539Z", "payment_id": "715325347_DJgDWrjbTakhxV"}}	2026-04-18 19:19:22.0536+00	2026-04-18 19:19:30.540621+00	\N	\N	\N	715325347_DJgDWrjbTakhxV
d72baf06-d33d-42ba-acc4-1e5242665451	dca94e89-f180-487d-a366-28c42b98a1fa	026a1e0b-5286-4162-b8ae-66799877009f	1.00	crypto	crystalpay	\N	pending	{"plan_name": "1 месяц", "invoice_url": "https://pay.crystalpay.io/?i=715325347_USmnIdaZjmFVNs", "promocode_id": null, "devices_count": 1, "discount_amount": 0, "duration_months": 1}	2026-04-18 19:21:17.442669+00	2026-04-18 19:21:17.442669+00	\N	\N	\N	715325347_USmnIdaZjmFVNs
79962eae-dcc8-4c9f-9b9b-5286cee6655e	dca94e89-f180-487d-a366-28c42b98a1fa	c5f920b8-abc8-4712-915d-6325ba265d6b	10.00	crypto	crystalpay	\N	pending	{"plan_name": "1 месяц", "invoice_url": "https://pay.crystalpay.io/?i=715325347_wvUcwvaUfBiSTy", "promocode_id": null, "devices_count": 1, "discount_amount": 0, "duration_months": 1}	2026-04-18 19:22:31.833236+00	2026-04-18 19:22:31.833236+00	\N	\N	\N	715325347_wvUcwvaUfBiSTy
201e73ed-547a-463c-8209-9b7bb58a6745	6961be39-eacd-42d7-84f9-0a2a51d9741e	d895fd78-897a-4f63-9dc3-c5d9b320f73c	10.00	crypto	crystalpay	\N	pending	{"plan_name": "1 месяц", "invoice_url": "https://pay.crystalpay.io/?i=715325347_zCshRllEnGmXyK", "promocode_id": null, "devices_count": 1, "discount_amount": 0, "duration_months": 1}	2026-04-18 19:23:40.90097+00	2026-04-18 19:23:40.90097+00	\N	\N	\N	715325347_zCshRllEnGmXyK
7cd54dd1-18c3-4c1a-a569-f92d544f4cd2	6961be39-eacd-42d7-84f9-0a2a51d9741e	a0908702-1907-4d52-b5d8-c8f30778fb31	10.00	crypto	crystalpay	\N	pending	{"plan_name": "1 месяц", "invoice_url": "https://pay.crystalpay.io/?i=715325347_qadbXWzFvDyBOn", "promocode_id": null, "devices_count": 1, "discount_amount": 0, "duration_months": 1}	2026-04-18 19:25:07.502827+00	2026-04-18 19:25:07.502827+00	\N	\N	\N	715325347_qadbXWzFvDyBOn
f9665dc1-697d-4d79-9b8c-db99bcd708b9	dca94e89-f180-487d-a366-28c42b98a1fa	234d318f-3346-42e5-a2f7-dd8282a7340f	740.00	crypto	crystalpay	\N	completed	{"plan_name": "1 год", "invoice_url": "https://pay.crystalpay.io/?i=715325347_JErDpYKgdhDcQx", "promocode_id": null, "devices_count": 1, "discount_amount": 0, "duration_months": 12, "crystalpay_payment": {"state": "payed", "paid_at": "2026-04-18T19:40:01.696Z", "payment_id": "715325347_JErDpYKgdhDcQx"}}	2026-04-18 19:39:53.909533+00	2026-04-18 19:40:01.697421+00	\N	\N	\N	715325347_JErDpYKgdhDcQx
\.


--
-- Data for Name: promocode_uses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promocode_uses (id, promocode_id, user_id, discount_amount, used_at) FROM stdin;
\.


--
-- Data for Name: promocodes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promocodes (id, code, discount_type, discount_value, max_uses, current_uses, is_active, expires_at, created_at, updated_at) FROM stdin;
39dce18b-e0e5-4d49-9882-fc81a6d9b376	NEW2026	percentage	20.00	\N	0	t	2026-05-20 00:00:00+00	2026-05-13 16:42:57.189877+00	2026-05-13 16:42:57.189877+00
\.


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.referrals (id, referrer_id, referred_id, reward_amount, is_rewarded, created_at) FROM stdin;
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscription_plans (id, name, duration_months, price_rub, traffic_gb, description, is_active, created_at, sort_order, updated_at, is_popular, price_per_month) FROM stdin;
a107a00c-c369-4272-a283-b22641462a2a	3 месяца	3	250.00	\N	\N	t	2026-04-17 13:56:12.402737+00	2	2026-05-13 15:47:45.108906	f	83.33
731d6c3d-d2d3-4720-8b68-bbda45d1743d	6 месяцев	6	420.00	\N	\N	t	2026-04-17 13:56:12.402737+00	3	2026-05-13 15:47:45.108906	f	70.00
4ff726c2-d06a-4423-b2c3-e1ba5c444004	1 год	12	740.00	\N	\N	t	2026-04-17 13:56:12.402737+00	4	2026-05-13 15:47:45.108906	f	61.67
c974ba66-5f10-4d6f-b59d-d683e6de0838	1 месяц	1	67.00	\N	\N	t	2026-04-17 13:56:12.402737+00	1	2026-05-13 17:28:58.073617	f	10.00
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscriptions (id, user_id, plan_id, status, starts_at, expires_at, vpn_username, vpn_password, config_url, created_at, updated_at, devices_count, auto_renew) FROM stdin;
06f89880-9b9e-4996-b353-a6179ec4c0b5	895f66cf-e261-4f8a-82a9-24404b8462b4	c974ba66-5f10-4d6f-b59d-d683e6de0838	trial	2026-05-13 20:17:41.781+00	2026-05-16 20:17:41.781+00	\N	\N	\N	2026-05-13 20:17:41.78703+00	2026-05-13 20:17:41.78703+00	1	f
e7f941f0-bb72-4ebf-9e87-c4c65c5728dc	290db189-2ad0-4c34-8487-08df83d8bb8c	c974ba66-5f10-4d6f-b59d-d683e6de0838	trial	2026-05-13 20:17:59.647+00	2026-05-16 20:17:59.647+00	\N	\N	\N	2026-05-13 20:17:59.653125+00	2026-05-13 20:17:59.653125+00	1	f
f3ddb3c0-3ae3-476b-8484-9cbbc9b7e09b	60ea83d8-01d9-4761-86e7-df665ab73eee	c974ba66-5f10-4d6f-b59d-d683e6de0838	trial	2026-05-13 20:30:57.02+00	2026-05-16 20:30:57.02+00	\N	\N	\N	2026-05-13 20:30:57.027402+00	2026-05-13 20:30:57.027402+00	1	f
8fb74c98-097e-40be-808a-843a37234896	6961be39-eacd-42d7-84f9-0a2a51d9741e	c974ba66-5f10-4d6f-b59d-d683e6de0838	active	2026-04-17 16:53:50.733529+00	2026-05-17 16:53:50.732+00	\N	\N	\N	2026-04-17 14:06:33.502644+00	2026-04-17 16:53:50.733529+00	1	f
e99afbb0-5029-466b-9d81-30c49a7c5a08	6961be39-eacd-42d7-84f9-0a2a51d9741e	731d6c3d-d2d3-4720-8b68-bbda45d1743d	active	2026-04-17 16:53:51.599259+00	2026-10-17 16:53:51.598+00	\N	\N	\N	2026-04-17 14:06:07.276555+00	2026-04-17 16:53:51.599259+00	1	f
be39be77-ad2e-4cf2-aff6-45ec5fa07c00	6961be39-eacd-42d7-84f9-0a2a51d9741e	731d6c3d-d2d3-4720-8b68-bbda45d1743d	active	2026-04-17 16:53:52.606941+00	2026-11-17 16:53:52.606+00	\N	\N	\N	2026-04-17 14:04:16.893237+00	2026-04-18 19:19:30.573888+00	1	f
4f67a704-8dfd-4faa-935e-8e0fec941999	6961be39-eacd-42d7-84f9-0a2a51d9741e	c974ba66-5f10-4d6f-b59d-d683e6de0838	active	2026-04-17 16:53:52.606+00	2026-11-17 16:53:52.606+00	\N	\N	\N	2026-04-18 19:19:21.915832+00	2026-04-18 19:19:30.578961+00	1	f
234d318f-3346-42e5-a2f7-dd8282a7340f	dca94e89-f180-487d-a366-28c42b98a1fa	4ff726c2-d06a-4423-b2c3-e1ba5c444004	active	2026-04-18 19:40:01.725+00	2027-04-18 19:40:01.725+00	\N	\N	\N	2026-04-18 19:39:53.496776+00	2026-04-18 19:40:01.728576+00	1	f
026974ea-9509-4694-a360-65a7e95fb5b7	6961be39-eacd-42d7-84f9-0a2a51d9741e	731d6c3d-d2d3-4720-8b68-bbda45d1743d	pending	2026-04-17 14:05:21.991481+00	\N	\N	\N	\N	2026-04-17 14:05:21.991481+00	2026-05-13 15:52:44.944658+00	1	f
bf9a6808-a272-4aee-9bb8-13d8dea57fc2	6961be39-eacd-42d7-84f9-0a2a51d9741e	731d6c3d-d2d3-4720-8b68-bbda45d1743d	pending	2026-04-17 14:05:24.064495+00	\N	\N	\N	\N	2026-04-17 14:05:24.064495+00	2026-05-13 15:52:44.944658+00	1	f
ff22229f-f534-4efb-b82b-889e40235700	dca94e89-f180-487d-a366-28c42b98a1fa	c974ba66-5f10-4d6f-b59d-d683e6de0838	pending	2026-04-18 19:17:44.510368+00	\N	\N	\N	\N	2026-04-18 19:17:44.510368+00	2026-05-13 15:52:44.944658+00	1	f
026a1e0b-5286-4162-b8ae-66799877009f	dca94e89-f180-487d-a366-28c42b98a1fa	c974ba66-5f10-4d6f-b59d-d683e6de0838	pending	2026-04-18 19:21:17.297355+00	\N	\N	\N	\N	2026-04-18 19:21:17.297355+00	2026-05-13 15:52:44.944658+00	1	f
c5f920b8-abc8-4712-915d-6325ba265d6b	dca94e89-f180-487d-a366-28c42b98a1fa	c974ba66-5f10-4d6f-b59d-d683e6de0838	pending	2026-04-18 19:22:31.63476+00	\N	\N	\N	\N	2026-04-18 19:22:31.63476+00	2026-05-13 15:52:44.944658+00	1	f
d895fd78-897a-4f63-9dc3-c5d9b320f73c	6961be39-eacd-42d7-84f9-0a2a51d9741e	c974ba66-5f10-4d6f-b59d-d683e6de0838	pending	2026-04-18 19:23:40.75612+00	\N	\N	\N	\N	2026-04-18 19:23:40.75612+00	2026-05-13 15:52:44.944658+00	1	f
a0908702-1907-4d52-b5d8-c8f30778fb31	6961be39-eacd-42d7-84f9-0a2a51d9741e	c974ba66-5f10-4d6f-b59d-d683e6de0838	pending	2026-04-18 19:25:07.315787+00	\N	\N	\N	\N	2026-04-18 19:25:07.315787+00	2026-05-13 15:52:44.944658+00	1	f
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, maintenance_mode, maintenance_message, created_at, updated_at) FROM stdin;
1	f		2026-04-17 13:20:19.596026+00	2026-05-13 19:32:32.481224+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, telegram_id, username, first_name, last_name, language_code, is_admin, is_banned, referral_code, referred_by, balance_rub, created_at, updated_at, photo_url, trial_used, trial_started_at, trial_expires_at, channel_subscribed, channel_subscribed_at) FROM stdin;
895f66cf-e261-4f8a-82a9-24404b8462b4	8329401174	x0vpn_support	x0VPN	Support	uk	f	f	3TR3Z2UAAL7	\N	0.00	2026-05-13 20:17:41.709483+00	2026-05-13 20:17:41.782022+00	https://t.me/i/userpic/320/oZ_rNmu7GYM7QONxA6uMgSANV9H4-Trd0PiquvLxKgG50MQK9iOconmHJKTNSlnd.svg	t	2026-05-13 20:17:41.781	2026-05-16 20:17:41.781	t	2026-05-13 20:17:41.772997
290db189-2ad0-4c34-8487-08df83d8bb8c	7505383725	lololo2311	🥶🥶🥶		en	f	f	3G4IF59714O	\N	0.00	2026-05-13 20:17:59.494871+00	2026-05-13 20:17:59.647823+00	https://t.me/i/userpic/320/o72LIdsDEj2INQu5TP5I1uPP4_FMoSkFmyqfNF7OsjycfjJfXpxYyhex3JCKsE5J.svg	t	2026-05-13 20:17:59.647	2026-05-16 20:17:59.647	t	2026-05-13 20:17:59.642554
60ea83d8-01d9-4761-86e7-df665ab73eee	6619857651	strng_msc	𝕤𝕥𝕠𝕦𝕟†		ru	f	f	31HAIUR0I6S	\N	0.00	2026-05-13 20:30:56.824875+00	2026-05-13 20:30:57.02138+00	https://t.me/i/userpic/320/XmGXp8-n3NiimLtqfurtYaL89OwYN1Gy_l-aKJPCgR5JMwJqda--3LXlCISQs3Pq.svg	t	2026-05-13 20:30:57.02	2026-05-16 20:30:57.02	t	2026-05-13 20:30:57.006503
6961be39-eacd-42d7-84f9-0a2a51d9741e	7068245628	Maks0sm	Максим		uk	t	f	admin1	\N	0.00	2026-04-17 13:30:26.191729+00	2026-05-13 20:48:05.31191+00	https://t.me/i/userpic/320/DgnZLAdjd0ZjKguyTz237_ahToAul5O5KFziyru-HdkgbShPtSnuDoXNYwFrK9Cx.svg	f	\N	\N	t	2026-05-13 20:48:05.29653
dca94e89-f180-487d-a366-28c42b98a1fa	5297366643	xasandef	Хасан		ru	t	f	admin2	\N	0.00	2026-04-17 13:30:26.191729+00	2026-05-13 19:25:30.105193+00	https://t.me/i/userpic/320/fQez1IGIrJkjCZ8xZSlR6BlMOiYrMv2y6uBcOxvKjuOxJXP56sotmxnFwCmcOrmi.svg	f	\N	\N	t	2026-05-13 19:25:30.09892
\.


--
-- Name: allowed_ips_id_seq; Type: SEQUENCE SET; Schema: public; Owner: x0vpn_user
--

SELECT pg_catalog.setval('public.allowed_ips_id_seq', 1, true);


--
-- Name: admin_2fa admin_2fa_pkey; Type: CONSTRAINT; Schema: public; Owner: x0vpn_user
--

ALTER TABLE ONLY public.admin_2fa
    ADD CONSTRAINT admin_2fa_pkey PRIMARY KEY (id);


--
-- Name: admin_2fa admin_2fa_user_id_key; Type: CONSTRAINT; Schema: public; Owner: x0vpn_user
--

ALTER TABLE ONLY public.admin_2fa
    ADD CONSTRAINT admin_2fa_user_id_key UNIQUE (user_id);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: x0vpn_user
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_sessions admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: x0vpn_user
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (id);


--
-- Name: admin_sessions admin_sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: x0vpn_user
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_token_key UNIQUE (token);


--
-- Name: allowed_ips allowed_ips_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: x0vpn_user
--

ALTER TABLE ONLY public.allowed_ips
    ADD CONSTRAINT allowed_ips_ip_address_key UNIQUE (ip_address);


--
-- Name: allowed_ips allowed_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: x0vpn_user
--

ALTER TABLE ONLY public.allowed_ips
    ADD CONSTRAINT allowed_ips_pkey PRIMARY KEY (id);


--
-- Name: faq faq_pkey; Type: CONSTRAINT; Schema: public; Owner: x0vpn_user
--

ALTER TABLE ONLY public.faq
    ADD CONSTRAINT faq_pkey PRIMARY KEY (id);


--
-- Name: news news_pkey; Type: CONSTRAINT; Schema: public; Owner: x0vpn_user
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_pkey PRIMARY KEY (id);


--
-- Name: notification_log notification_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: promocode_uses promocode_uses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promocode_uses
    ADD CONSTRAINT promocode_uses_pkey PRIMARY KEY (id);


--
-- Name: promocode_uses promocode_uses_promocode_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promocode_uses
    ADD CONSTRAINT promocode_uses_promocode_id_user_id_key UNIQUE (promocode_id, user_id);


--
-- Name: promocodes promocodes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promocodes
    ADD CONSTRAINT promocodes_code_key UNIQUE (code);


--
-- Name: promocodes promocodes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promocodes
    ADD CONSTRAINT promocodes_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_referrer_id_referred_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_referred_id_key UNIQUE (referrer_id, referred_id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- Name: users users_telegram_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);


--
-- Name: idx_admin_logs_action; Type: INDEX; Schema: public; Owner: x0vpn_user
--

CREATE INDEX idx_admin_logs_action ON public.admin_logs USING btree (action);


--
-- Name: idx_admin_logs_admin_id; Type: INDEX; Schema: public; Owner: x0vpn_user
--

CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs USING btree (admin_id);


--
-- Name: idx_admin_logs_created_at; Type: INDEX; Schema: public; Owner: x0vpn_user
--

CREATE INDEX idx_admin_logs_created_at ON public.admin_logs USING btree (created_at DESC);


--
-- Name: idx_admin_sessions_expires_at; Type: INDEX; Schema: public; Owner: x0vpn_user
--

CREATE INDEX idx_admin_sessions_expires_at ON public.admin_sessions USING btree (expires_at);


--
-- Name: idx_admin_sessions_token; Type: INDEX; Schema: public; Owner: x0vpn_user
--

CREATE INDEX idx_admin_sessions_token ON public.admin_sessions USING btree (token);


--
-- Name: idx_admin_sessions_user_id; Type: INDEX; Schema: public; Owner: x0vpn_user
--

CREATE INDEX idx_admin_sessions_user_id ON public.admin_sessions USING btree (user_id);


--
-- Name: idx_allowed_ips_ip; Type: INDEX; Schema: public; Owner: x0vpn_user
--

CREATE INDEX idx_allowed_ips_ip ON public.allowed_ips USING btree (ip_address);


--
-- Name: idx_faq_active; Type: INDEX; Schema: public; Owner: x0vpn_user
--

CREATE INDEX idx_faq_active ON public.faq USING btree (is_active);


--
-- Name: idx_faq_category; Type: INDEX; Schema: public; Owner: x0vpn_user
--

CREATE INDEX idx_faq_category ON public.faq USING btree (category);


--
-- Name: idx_faq_order; Type: INDEX; Schema: public; Owner: x0vpn_user
--

CREATE INDEX idx_faq_order ON public.faq USING btree (order_index);


--
-- Name: idx_news_category; Type: INDEX; Schema: public; Owner: x0vpn_user
--

CREATE INDEX idx_news_category ON public.news USING btree (category);


--
-- Name: idx_news_published; Type: INDEX; Schema: public; Owner: x0vpn_user
--

CREATE INDEX idx_news_published ON public.news USING btree (is_published);


--
-- Name: idx_news_published_at; Type: INDEX; Schema: public; Owner: x0vpn_user
--

CREATE INDEX idx_news_published_at ON public.news USING btree (published_at);


--
-- Name: idx_notification_log_subscription_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notification_log_subscription_id ON public.notification_log USING btree (subscription_id);


--
-- Name: idx_notification_log_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notification_log_type ON public.notification_log USING btree (notification_type);


--
-- Name: idx_notification_log_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notification_log_user_id ON public.notification_log USING btree (user_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_payments_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_user_id ON public.payments USING btree (user_id);


--
-- Name: idx_promocode_uses_promocode_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_promocode_uses_promocode_id ON public.promocode_uses USING btree (promocode_id);


--
-- Name: idx_promocode_uses_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_promocode_uses_user_id ON public.promocode_uses USING btree (user_id);


--
-- Name: idx_promocodes_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_promocodes_code ON public.promocodes USING btree (code);


--
-- Name: idx_referrals_referred_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_referred_id ON public.referrals USING btree (referred_id);


--
-- Name: idx_referrals_referrer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_referrer_id ON public.referrals USING btree (referrer_id);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: idx_users_referral_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_referral_code ON public.users USING btree (referral_code);


--
-- Name: idx_users_telegram_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_telegram_id ON public.users USING btree (telegram_id);


--
-- Name: faq update_faq_updated_at; Type: TRIGGER; Schema: public; Owner: x0vpn_user
--

CREATE TRIGGER update_faq_updated_at BEFORE UPDATE ON public.faq FOR EACH ROW EXECUTE FUNCTION public.update_faq_updated_at();


--
-- Name: news update_news_updated_at; Type: TRIGGER; Schema: public; Owner: x0vpn_user
--

CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION public.update_news_updated_at();


--
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: promocodes update_promocodes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_promocodes_updated_at BEFORE UPDATE ON public.promocodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscription_plans update_subscription_plans_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_settings update_system_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_2fa admin_2fa_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: x0vpn_user
--

ALTER TABLE ONLY public.admin_2fa
    ADD CONSTRAINT admin_2fa_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: admin_logs admin_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: x0vpn_user
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id);


--
-- Name: admin_sessions admin_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: x0vpn_user
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notification_log notification_log_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: notification_log notification_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id);


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: promocode_uses promocode_uses_promocode_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promocode_uses
    ADD CONSTRAINT promocode_uses_promocode_id_fkey FOREIGN KEY (promocode_id) REFERENCES public.promocodes(id) ON DELETE CASCADE;


--
-- Name: promocode_uses promocode_uses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promocode_uses
    ADD CONSTRAINT promocode_uses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referred_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

GRANT ALL ON SCHEMA public TO x0vpn_user;


--
-- Name: TABLE notification_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notification_log TO x0vpn_user;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payments TO x0vpn_user;


--
-- Name: TABLE promocode_uses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.promocode_uses TO x0vpn_user;


--
-- Name: TABLE promocodes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.promocodes TO x0vpn_user;


--
-- Name: TABLE referrals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.referrals TO x0vpn_user;


--
-- Name: TABLE subscription_plans; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subscription_plans TO x0vpn_user;


--
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subscriptions TO x0vpn_user;


--
-- Name: TABLE system_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_settings TO x0vpn_user;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO x0vpn_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO x0vpn_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO x0vpn_user;


--
-- PostgreSQL database dump complete
--

\unrestrict phQdUEhIUx82NRLMnEaAuNnZURDlAMbSHx4D9ZtVSCpqzaNhlQxs1ICjQEy9vIv

