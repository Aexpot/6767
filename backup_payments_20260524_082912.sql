--
-- PostgreSQL database dump
--

\restrict jcnFBtdZD396clkDYHY6xRWPjIPuaqyypSzG4a3eNbdhK2aSji80e0ko9W3ys1U

-- Dumped from database version 14.23 (Ubuntu 14.23-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.23 (Ubuntu 14.23-0ubuntu0.22.04.1)

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
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: championvpn_user
--

COPY public.payments (id, user_id, subscription_id, amount_rub, payment_method, payment_provider, provider_payment_id, status, metadata, created_at, updated_at) FROM stdin;
eb9c726c-6052-484b-b258-4bdd3b82e884	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	sbp	manual	\N	pending	{"plan_name": "6 месяцев", "devices_count": 1, "duration_months": 6}	2026-05-20 14:59:37.110885+00	2026-05-24 08:27:30.421424+00
86711ee7-e988-4d75-a45c-62c4318033c6	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	yoomoney	yoomoney	9065b233-29d0-4fca-aa19-5676d0b4c496_1779357200747	pending	{"plan_name": "6 месяцев", "payment_url": "https://yoomoney.ru/quickpay/confirm?receiver=4100119011187485&quickpay-form=shop&targets=ChampionVPN 6 месяцев&paymentType=SB&sum=949.00&label=9065b233-29d0-4fca-aa19-5676d0b4c496_1779357200747", "promocode_id": null, "devices_count": 1, "discount_amount": 0, "duration_months": 6}	2026-05-21 09:53:20.74786+00	2026-05-24 08:27:30.421424+00
99ca3ff7-3216-4839-8d6e-e60cabb66666	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	sbp	manual	\N	pending	{"plan_name": "6 месяцев", "devices_count": 1, "duration_months": 6}	2026-05-20 14:59:37.595454+00	2026-05-24 08:27:30.421424+00
658c18e2-8360-4d0a-847e-6f44bf590806	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	sbp	manual	\N	pending	{"plan_name": "6 месяцев", "devices_count": 1, "duration_months": 6}	2026-05-20 14:59:37.881711+00	2026-05-24 08:27:30.421424+00
2fad1678-1fcb-4d22-95f5-7f83ab079e3d	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	sbp	manual	\N	pending	{"plan_name": "6 месяцев", "devices_count": 1, "duration_months": 6}	2026-05-20 15:00:16.567491+00	2026-05-24 08:27:30.421424+00
142c770d-2bc0-46bc-8d3a-f5dd9ac9ff13	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	sbp	manual	\N	pending	{"plan_name": "6 месяцев", "devices_count": 1, "duration_months": 6}	2026-05-20 15:00:17.481145+00	2026-05-24 08:27:30.421424+00
f39d3314-706f-46f8-8910-ab8fa8dda2a8	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	sbp	manual	\N	pending	{"plan_name": "1 месяц", "devices_count": 1, "duration_months": 1}	2026-05-20 15:01:06.199063+00	2026-05-24 08:27:30.421424+00
0f2522db-d41c-468a-81c1-3ffc5c910edd	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	sbp	manual	\N	pending	{"plan_name": "1 месяц", "devices_count": 1, "duration_months": 1}	2026-05-20 15:01:16.585561+00	2026-05-24 08:27:30.421424+00
13cf93f9-ca32-4340-b4ff-88e2007d1536	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	sbp	manual	\N	pending	{"plan_name": "1 месяц", "devices_count": 1, "duration_months": 1}	2026-05-20 15:02:15.299737+00	2026-05-24 08:27:30.421424+00
ab547693-849a-4d6e-b204-53c1dafbaf36	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	sbp	manual	\N	pending	{"plan_name": "1 месяц", "devices_count": 1, "duration_months": 1}	2026-05-20 15:02:26.956846+00	2026-05-24 08:27:30.421424+00
aff0f3af-03a0-4614-8dce-dca229632cb7	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	sbp	manual	\N	pending	{"plan_name": "6 месяцев", "devices_count": 1, "duration_months": 6}	2026-05-20 15:02:51.401639+00	2026-05-24 08:27:30.421424+00
f5b5c8d7-ac10-4338-bca5-85cdfe5b9682	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	sbp	manual	\N	pending	{"plan_name": "6 месяцев", "devices_count": 1, "duration_months": 6}	2026-05-20 15:03:12.784869+00	2026-05-24 08:27:30.421424+00
6dfc00bb-a119-4e5f-be5d-a6787e850519	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	sbp	manual	\N	pending	{"plan_name": "6 месяцев", "devices_count": 1, "duration_months": 6}	2026-05-20 15:38:35.965444+00	2026-05-24 08:27:30.421424+00
cd7ffee5-c3bc-40c7-9c03-27fa219f449b	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	sbp	manual	\N	pending	{"plan_name": "6 месяцев", "devices_count": 1, "duration_months": 6}	2026-05-20 15:39:53.342654+00	2026-05-24 08:27:30.421424+00
636cb9fd-56e0-4ac2-81b2-2565f5a19103	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	sbp	manual	\N	pending	{"plan_name": "1 месяц", "devices_count": 1, "duration_months": 1}	2026-05-20 15:40:05.756699+00	2026-05-24 08:27:30.421424+00
942b1e1f-739d-463c-89ef-78e54acd20da	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	sbp	manual	\N	pending	{"plan_name": "1 месяц", "devices_count": 1, "duration_months": 1}	2026-05-20 15:40:52.791893+00	2026-05-24 08:27:30.421424+00
7242d516-0725-41ee-9d2c-d3c9fa464b88	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	sbp	manual	\N	pending	{"plan_name": "6 месяцев", "devices_count": 1, "duration_months": 6}	2026-05-20 15:43:44.326205+00	2026-05-24 08:27:30.421424+00
2ee67986-11c2-43af-94f9-3c7931bcdb32	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	sbp	manual	\N	pending	{"plan_name": "6 месяцев", "devices_count": 1, "duration_months": 6}	2026-05-20 15:45:03.404278+00	2026-05-24 08:27:30.421424+00
ed648624-861a-4a79-a347-0fe10bab0252	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	sbp	manual	\N	pending	{"plan_name": "6 месяцев", "devices_count": 1, "duration_months": 6}	2026-05-20 15:45:12.378829+00	2026-05-24 08:27:30.421424+00
b30a175c-d0c7-466c-9c09-8dc7424feebc	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	sbp	manual	\N	pending	{"plan_name": "1 месяц", "devices_count": 1, "duration_months": 1}	2026-05-20 15:47:33.700348+00	2026-05-24 08:27:30.421424+00
2e6ce8ca-88e6-4b6f-a4f2-2ace988e510d	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	sbp	manual	\N	pending	{"plan_name": "1 месяц", "devices_count": 1, "duration_months": 1}	2026-05-20 15:50:41.190886+00	2026-05-24 08:27:30.421424+00
7480fc99-f8fc-4890-8fb5-0fd6e0f22ce0	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	sbp	manual	\N	pending	{"plan_name": "1 месяц", "devices_count": 1, "duration_months": 1}	2026-05-20 15:51:12.266738+00	2026-05-24 08:27:30.421424+00
bb704996-4c7d-4b5a-9996-60b1c691cd68	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	sbp	manual	\N	pending	{"plan_name": "1 месяц", "devices_count": 1, "duration_months": 1}	2026-05-20 15:52:52.56569+00	2026-05-24 08:27:30.421424+00
82caa2a0-8dc9-40bd-8364-d7c93352c44b	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	sbp	manual	\N	pending	{"plan_name": "6 месяцев", "devices_count": 1, "duration_months": 6}	2026-05-20 15:53:52.28373+00	2026-05-24 08:27:30.421424+00
0626a973-b3bf-49e9-9bfe-7af9f2d99275	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	crypto	cryptopay	52009711	pending	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "2.09", "devices_count": 1, "duration_months": 1}	2026-05-20 15:57:25.105624+00	2026-05-24 08:27:30.421424+00
775d1774-d9f6-49ca-b4f1-f30456cc856d	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	crypto	cryptopay	52009757	pending	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "2.09", "devices_count": 1, "duration_months": 1}	2026-05-20 15:57:59.359401+00	2026-05-24 08:27:30.421424+00
1f104dda-6715-43b7-a636-0293aa2ebb0e	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	crypto	cryptopay	52010121	pending	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "2.09", "devices_count": 1, "duration_months": 1}	2026-05-20 16:02:26.940493+00	2026-05-24 08:27:30.421424+00
7d942402-3b4b-4ccc-bd2c-b599aedfcc10	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	crypto	cryptopay	52010312	pending	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "2.09", "devices_count": 1, "duration_months": 1}	2026-05-20 16:04:38.738077+00	2026-05-24 08:27:30.421424+00
12df2292-7ed9-493f-908b-be5d112ebd6c	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	crypto	cryptopay	52010516	pending	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "2.09", "devices_count": 1, "duration_months": 1}	2026-05-20 16:07:25.212489+00	2026-05-24 08:27:30.421424+00
de22ee50-c392-469a-bec5-e86c7fa785da	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	crypto	cryptopay	52010999	pending	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "2.09", "devices_count": 1, "duration_months": 1}	2026-05-20 16:13:13.943008+00	2026-05-24 08:27:30.421424+00
5da1f1da-5fb9-4097-8480-4f71b3e684ec	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	499.00	crypto	cryptopay	52011013	pending	{"plan_name": "3 месяца", "crypto_asset": "USDT", "crypto_amount": "5.25", "devices_count": 1, "duration_months": 3}	2026-05-20 16:13:22.623168+00	2026-05-24 08:27:30.421424+00
3c6ee576-4588-4654-bc20-6878ef829f49	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	crypto	cryptopay	52063771	pending	{"plan_name": "6 месяцев", "crypto_asset": "USDT", "crypto_amount": "9.99", "devices_count": 1, "duration_months": 6}	2026-05-21 09:45:42.532804+00	2026-05-24 08:27:30.421424+00
f1e3fadf-79d3-4842-8611-271d4d38b052	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	1699.00	crypto	cryptopay	52064128	pending	{"plan_name": "1 год", "crypto_asset": "USDT", "crypto_amount": "17.88", "devices_count": 1, "duration_months": 12}	2026-05-21 09:51:01.395575+00	2026-05-24 08:27:30.421424+00
a519a920-ae08-4784-b1ed-09a2f863862f	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	949.00	crypto	cryptopay	52064387	pending	{"plan_name": "6 месяцев", "crypto_asset": "USDT", "crypto_amount": "9.99", "devices_count": 1, "duration_months": 6}	2026-05-21 09:54:41.743181+00	2026-05-24 08:27:30.421424+00
3bcb2133-ae4c-4568-b797-7975ed337a3a	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	yoomoney	yoomoney	7a93218c-0162-4fd0-b14a-d61b414d77b9_1779357851516	pending	{"plan_name": "1 месяц", "payment_url": "https://yoomoney.ru/quickpay/confirm?receiver=4100119011187485&quickpay-form=shop&targets=ChampionVPN 1 месяц&paymentType=SB&sum=199.00&label=7a93218c-0162-4fd0-b14a-d61b414d77b9_1779357851516", "promocode_id": null, "devices_count": 1, "discount_amount": 0, "duration_months": 1}	2026-05-21 10:04:11.517375+00	2026-05-24 08:27:30.421424+00
b804d971-2e0e-437c-b2f8-168179eab8ba	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	crypto	cryptopay	52065313	pending	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "2.09", "devices_count": 1, "duration_months": 1}	2026-05-21 10:07:29.677138+00	2026-05-24 08:27:30.421424+00
e4211492-f45d-44f3-87f2-7e78fb433651	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	crypto	cryptopay	52065380	pending	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "2.09", "devices_count": 1, "duration_months": 1}	2026-05-21 10:08:39.51922+00	2026-05-24 08:27:30.421424+00
dab1473f-698c-44a6-bb49-a45efb1850a1	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	crypto	cryptopay	52065392	pending	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "2.09", "devices_count": 1, "duration_months": 1}	2026-05-21 10:08:47.726902+00	2026-05-24 08:27:30.421424+00
d13e5ec0-d16a-476a-96b3-dce132e7f0f1	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	199.00	crypto	cryptopay	52065431	pending	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "2.09", "devices_count": 1, "duration_months": 1}	2026-05-21 10:09:10.859907+00	2026-05-24 08:27:30.421424+00
d404571a-7ae0-439f-b000-a6b7249cc967	211f4b44-42e2-4ff3-9626-457f7b23163f	\N	149.00	crypto	cryptopay	52080823	completed	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "1.57", "devices_count": 1, "crypto_payment": {"crypto_hash": "TEST", "crypto_asset": "USDT", "crypto_amount": "1.57", "crypto_paid_at": "2026-05-21T17:00:00.000Z", "crypto_invoice_id": 52080823}, "duration_months": 1}	2026-05-21 13:48:29.550462+00	2026-05-24 08:27:30.421424+00
49497ad3-11e0-41a4-b523-ac7c7751b8aa	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	149.00	crypto	cryptopay	52099527	pending	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "1.57", "devices_count": 1, "duration_months": 1}	2026-05-21 17:49:11.65546+00	2026-05-24 08:27:30.421424+00
653c4be7-c78d-46fa-8944-7117e2b96cd4	211f4b44-42e2-4ff3-9626-457f7b23163f	\N	149.00	crypto	cryptopay	52099671	completed	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "1.57", "devices_count": 1, "duration_months": 1}	2026-05-21 17:51:14.421208+00	2026-05-24 08:27:30.421424+00
68dc5edb-fbff-49b8-bb94-d90ac80b17ac	211f4b44-42e2-4ff3-9626-457f7b23163f	\N	149.00	crypto	cryptopay	52100510	completed	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "1.57", "devices_count": 1, "crypto_payment": {"crypto_hash": "IVlmcAbH7Hs3", "crypto_asset": "USDT", "crypto_amount": "1.57", "crypto_paid_at": "2026-05-21T18:03:09.555Z", "crypto_invoice_id": 52100510}, "duration_months": 1}	2026-05-21 18:03:00.698958+00	2026-05-24 08:27:30.421424+00
45a26b9a-a625-4241-b730-af3fdfa720b0	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	149.00	crypto	cryptopay	52101263	pending	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "1.57", "devices_count": 1, "duration_months": 1}	2026-05-21 18:12:06.110963+00	2026-05-24 08:27:30.421424+00
5131b20c-a4af-431f-9a7f-b6c615260dee	211f4b44-42e2-4ff3-9626-457f7b23163f	\N	149.00	crypto	cryptopay	52101357	completed	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "1.57", "devices_count": 1, "crypto_payment": {"crypto_hash": "IV59UAuv0M96", "crypto_asset": "USDT", "crypto_amount": "1.57", "crypto_paid_at": "2026-05-21T18:13:30.274Z", "crypto_invoice_id": 52101357}, "duration_months": 1}	2026-05-21 18:13:21.55759+00	2026-05-24 08:27:30.421424+00
aa4cfbec-3250-4161-9604-1270a9476c2d	8527a102-b020-46d6-b579-eaf4cc8264e1	\N	149.00	crypto	cryptopay	52101381	pending	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "1.57", "devices_count": 1, "duration_months": 1}	2026-05-21 18:13:40.778534+00	2026-05-24 08:27:30.421424+00
ddd56996-9bf4-488c-a4be-7c77123fc4ed	211f4b44-42e2-4ff3-9626-457f7b23163f	\N	149.00	crypto	cryptopay	52100836	completed	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "1.57", "devices_count": 1, "crypto_payment": {"crypto_hash": "IV2YUtPARLCM", "crypto_asset": "USDT", "crypto_amount": "1.57", "crypto_paid_at": "2026-05-21T18:06:57.790Z", "crypto_invoice_id": 52100836}, "duration_months": 1}	2026-05-21 18:06:49.115599+00	2026-05-24 08:27:30.421424+00
2697ce75-2793-4494-ac00-85fed12f82a8	211f4b44-42e2-4ff3-9626-457f7b23163f	\N	149.00	crypto	cryptopay	52128480	completed	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "1.57", "devices_count": 1, "crypto_payment": {"crypto_hash": "IVKN00Zl4ae3", "crypto_asset": "USDT", "crypto_amount": "1.57", "crypto_paid_at": "2026-05-22T04:56:12.981Z", "crypto_invoice_id": 52128480}, "duration_months": 1}	2026-05-22 04:56:03.203793+00	2026-05-24 08:27:30.421424+00
7654ac2f-6042-4eba-88a0-7b39cec7af95	33c52e0f-06b7-4770-af0f-b8c3246126b4	\N	149.00	yoomoney	yoomoney	11803e7c-d364-471d-ad78-aed4610aa74a_1779447397871	pending	{"plan_name": "1 месяц", "payment_url": "https://yoomoney.ru/quickpay/confirm?receiver=4100119011187485&quickpay-form=shop&targets=ChampionVPN 1 месяц&paymentType=SB&sum=149.00&label=11803e7c-d364-471d-ad78-aed4610aa74a_1779447397871", "promocode_id": null, "devices_count": 1, "discount_amount": 0, "duration_months": 1}	2026-05-22 10:56:37.871968+00	2026-05-24 08:27:30.421424+00
53dcc4cd-958e-43a8-b24a-26f4b89acc79	211f4b44-42e2-4ff3-9626-457f7b23163f	\N	149.00	crypto	cryptopay	52149516	completed	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "1.57", "devices_count": 1, "crypto_payment": {"crypto_hash": "IV15TCGLu8ns", "crypto_asset": "USDT", "crypto_amount": "1.57", "crypto_paid_at": "2026-05-22T11:00:38.655Z", "crypto_invoice_id": 52149516}, "duration_months": 1}	2026-05-22 11:00:22.524176+00	2026-05-24 08:27:30.421424+00
0086585c-beef-43e3-bf0c-76d381c2de1e	211f4b44-42e2-4ff3-9626-457f7b23163f	\N	149.00	crypto	cryptopay	52236414	completed	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "1.57", "devices_count": 1, "crypto_payment": {"crypto_hash": "IVckshfALdnA", "crypto_asset": "USDT", "crypto_amount": "1.57", "crypto_paid_at": "2026-05-23T12:41:29.263Z", "crypto_invoice_id": 52236414}, "duration_months": 1}	2026-05-23 12:41:17.867576+00	2026-05-24 08:27:30.421424+00
11cec1d6-fbac-4402-996c-1615f804d1c2	211f4b44-42e2-4ff3-9626-457f7b23163f	\N	149.00	crypto	cryptopay	52236561	completed	{"plan_name": "1 месяц", "crypto_asset": "USDT", "crypto_amount": "1.57", "devices_count": 1, "crypto_payment": {"crypto_hash": "IVaKC4vUylSZ", "crypto_asset": "USDT", "crypto_amount": "1.57", "crypto_paid_at": "2026-05-23T12:43:48.768Z", "crypto_invoice_id": 52236561}, "duration_months": 1}	2026-05-23 12:43:39.361578+00	2026-05-24 08:27:30.421424+00
\.


--
-- PostgreSQL database dump complete
--

\unrestrict jcnFBtdZD396clkDYHY6xRWPjIPuaqyypSzG4a3eNbdhK2aSji80e0ko9W3ys1U

