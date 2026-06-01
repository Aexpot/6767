# Repository Guidelines

## Project Structure & Module Organization
This repository follows a dual-architecture pattern, combining a web frontend and a Telegram bot backend.
- **Web Application (`.\app`)**: A Next.js 15+ application using the App Router. Components are split between `.\components\ui` (base elements) and `.\components\vpn` (feature-specific screens).
- **Telegram Bot (`.\bot`)**: A Python-based bot using the `aiogram 3.x` framework. Core logic for VPN interaction is in `.\bot\remnawave.py`, which is a Python port of the TypeScript `.\lib\remnawave.ts`.
- **Shared Libraries (`.\lib`)**: Contains shared TypeScript utilities for Supabase, payment integrations (CryptoPay, CrystalPay), and Remnawave API.
- **Database (`.\scripts`, `.\migrations`)**: SQL scripts for table creation and data migration, with JavaScript runners for Supabase integration.

## Build, Test, and Development Commands

### Web (Next.js)
- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Start**: `npm run start`
- **Lint**: `npm run lint`

### Telegram Bot (Python)
- **Install Dependencies**: `pip install -r .\bot\requirements.txt`
- **Run Bot**: `python -m bot.main`
- **Configuration**: Copy `.\bot\.env.example` to `.\bot\.env` and set `BOT_TOKEN`.

## Coding Style & Naming Conventions
- **TypeScript**: Uses TypeScript 5.7+ with strict type safety. Follows Next.js and Radix UI patterns for components.
- **Python**: Uses `aiogram 3.7+`, emphasizing asynchronous handlers and dataclasses for data mapping (`RemnawaveUser`, `SystemStats`).
- **Styling**: Uses Tailwind CSS 4.0 and `lucide-react` for iconography. UI components are based on `shadcn/ui` patterns.

## Database Management
- Database operations are primarily managed via scripts in `.\scripts`.
- To apply migrations: `node .\scripts\run_migration.js`
- Initial setup: `.\scripts\001_create_tables.sql` and `.\scripts\002_seed_plans.sql`.

## Testing Guidelines
No formal test suite is currently configured. Ad-hoc testing scripts are available in the root:
- **Payment Webhook**: `node .\test-webhook-payment.js`
- **Subscription Check**: `npm exec ts-node .\test-check-subscription.ts`
