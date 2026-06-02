from __future__ import annotations

"""PostgreSQL storage — uses the same schema as the championvpn webapp.

Tables: users, subscriptions, subscription_plans, payments, promocodes,
promocode_uses. So data created in the bot is visible in the mini-app.
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import asyncpg

log = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None
_webapp_pool: Optional[asyncpg.Pool] = None


async def init_db(database_url: str) -> None:
    global _pool
    _pool = await asyncpg.create_pool(database_url, min_size=1, max_size=10)
    log.info("DB pool initialized (shared schema with webapp)")


async def init_webapp_db(database_url: str) -> None:
    global _webapp_pool
    _webapp_pool = await asyncpg.create_pool(database_url, min_size=1, max_size=5)
    log.info("Webapp DB pool initialized (port 5433)")


async def close_db() -> None:
    if _pool:
        await _pool.close()
    if _webapp_pool:
        await _webapp_pool.close()


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB not initialized")
    return _pool


def get_webapp_pool() -> Optional[asyncpg.Pool]:
    return _webapp_pool


# ── webapp sync helpers ────────────────────────────────────────────────────────

async def webapp_sync_user(
    telegram_id: int,
    username: str = "",
    first_name: str = "",
    last_name: str = "",
    panel_user_uuid: str = "",
    is_banned: bool = False,
) -> Optional[int]:
    """Upsert user in the webapp DB (port 5433). Returns webapp user_id or None."""
    pool = get_webapp_pool()
    if not pool:
        return None
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """INSERT INTO users (telegram_id, username, first_name, last_name, panel_user_uuid, is_banned)
                   VALUES ($1, $2, $3, $4, $5, $6)
                   ON CONFLICT (telegram_id) DO UPDATE
                     SET username      = EXCLUDED.username,
                         first_name    = EXCLUDED.first_name,
                         last_name     = EXCLUDED.last_name,
                         is_banned     = EXCLUDED.is_banned,
                         panel_user_uuid = CASE
                             WHEN EXCLUDED.panel_user_uuid <> '' THEN EXCLUDED.panel_user_uuid
                             ELSE users.panel_user_uuid
                         END
                   RETURNING user_id""",
                telegram_id,
                username or "",
                first_name or "",
                last_name or "",
                panel_user_uuid or "",
                is_banned,
            )
            return row["user_id"] if row else None
    except Exception:
        log.exception("webapp_sync_user failed for telegram_id=%s", telegram_id)
        return None


async def webapp_sync_subscription(
    telegram_id: int,
    panel_user_uuid: str,
    months: int,
    bypass_gb: int,
    devices: int,
    start_ts: int,
    end_ts: int,
) -> None:
    """Create or update subscription in the webapp DB so mini-app sees it."""
    pool = get_webapp_pool()
    if not pool:
        return
    try:
        async with pool.acquire() as conn:
            # Get webapp user_id by telegram_id
            uid_row = await conn.fetchrow(
                "SELECT user_id FROM users WHERE telegram_id=$1", telegram_id
            )
            if not uid_row:
                log.warning("webapp_sync_subscription: user not found for tg=%s", telegram_id)
                return
            webapp_user_id = uid_row["user_id"]

            from datetime import datetime, timezone
            start_dt = datetime.fromtimestamp(start_ts, tz=timezone.utc)
            end_dt = datetime.fromtimestamp(end_ts, tz=timezone.utc)

            # bypass_gb=0 means unlimited → premium_unlimited_override=True
            premium_unlimited = bypass_gb == 0
            premium_baseline = int(bypass_gb) * (1 << 30) if bypass_gb > 0 else 0

            await conn.execute(
                """INSERT INTO subscriptions (
                       user_id, panel_user_uuid, start_date, end_date,
                       duration_months, is_active, status_from_panel,
                       traffic_limit_bytes, traffic_used_bytes,
                       provider, tariff_key, hwid_device_limit,
                       topup_balance_bytes, premium_baseline_bytes,
                       premium_topup_balance_bytes, premium_topup_used_bytes,
                       premium_used_bytes, premium_is_limited,
                       premium_unlimited_override, regular_unlimited_override,
                       premium_bonus_bytes, regular_bonus_bytes,
                       is_throttled, extra_hwid_devices
                   ) VALUES (
                       $1, $2, $3, $4,
                       $5, TRUE, 'ACTIVE',
                       0, 0,
                       'bot', 'bot_plan', $6,
                       0, $7,
                       0, 0,
                       0, $8,
                       $9, TRUE,
                       0, 0,
                       FALSE, 0
                   )
                   ON CONFLICT (panel_user_uuid) DO UPDATE
                     SET end_date               = EXCLUDED.end_date,
                         is_active              = TRUE,
                         status_from_panel      = 'ACTIVE',
                         duration_months        = EXCLUDED.duration_months,
                         hwid_device_limit      = EXCLUDED.hwid_device_limit,
                         premium_baseline_bytes = EXCLUDED.premium_baseline_bytes,
                         premium_is_limited     = EXCLUDED.premium_is_limited,
                         premium_unlimited_override = EXCLUDED.premium_unlimited_override,
                         traffic_limit_bytes    = EXCLUDED.traffic_limit_bytes
                   """,
                webapp_user_id, panel_user_uuid, start_dt, end_dt,
                months, devices,
                premium_baseline,
                not premium_unlimited,  # premium_is_limited = True when limited
                premium_unlimited,      # premium_unlimited_override
            )
            log.info("webapp_sync_subscription OK tg=%s uuid=%s exp=%s", telegram_id, panel_user_uuid, end_dt)
    except Exception:
        log.exception("webapp_sync_subscription failed for telegram_id=%s", telegram_id)


async def get_webapp_whitelist_traffic(telegram_id: int) -> Optional[Dict[str, Any]]:
    """Read white-list bypass traffic counters from the webapp subscription table."""
    pool = get_webapp_pool()
    if not pool:
        return None
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """SELECT
                     COALESCE(s.premium_used_bytes, 0) AS used,
                     COALESCE(s.premium_baseline_bytes, 0) AS baseline,
                     COALESCE(s.premium_topup_balance_bytes, 0) AS topup,
                     COALESCE(s.premium_bonus_bytes, 0) AS bonus,
                     COALESCE(s.premium_unlimited_override, false) AS unlimited
                   FROM subscriptions s
                   JOIN users u ON u.user_id = s.user_id
                   WHERE u.telegram_id = $1 AND s.is_active = TRUE AND s.end_date > NOW()
                   ORDER BY s.end_date DESC LIMIT 1""",
                telegram_id,
            )
            if not row:
                return None
            limit = 0 if row["unlimited"] else int(row["baseline"] or 0) + int(row["topup"] or 0) + int(row["bonus"] or 0)
            return {
                "used": int(row["used"] or 0),
                "limit": limit,
                "unlimited": bool(row["unlimited"]),
            }
    except Exception:
        log.exception("get_webapp_whitelist_traffic failed for telegram_id=%s", telegram_id)
        return None


# ── users ──────────────────────────────────────────────────────────────────────

async def ensure_user(telegram_id: int, username: str = "", first_name: str = "", last_name: str = "") -> Dict[str, Any]:
    """Get or create user. Only updates non-empty profile fields, never overwrites with empty strings."""
    async with get_pool().acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE telegram_id = $1", telegram_id)
        if row is None:
            referral_code = secrets.token_hex(4).upper()
            row = await conn.fetchrow(
                """INSERT INTO users (telegram_id, username, first_name, last_name, referral_code, language_code)
                   VALUES ($1, $2, $3, $4, $5, 'ru')
                   ON CONFLICT (telegram_id) DO UPDATE SET username = EXCLUDED.username
                   RETURNING *""",
                telegram_id, username, first_name, last_name, referral_code,
            )
            return dict(row)

        # Update only non-empty fields, return refreshed row
        if username or first_name or last_name:
            row = await conn.fetchrow(
                """UPDATE users SET
                       username   = COALESCE(NULLIF($2,''), username),
                       first_name = COALESCE(NULLIF($3,''), first_name),
                       last_name  = COALESCE(NULLIF($4,''), last_name),
                       updated_at = NOW()
                   WHERE telegram_id=$1
                   RETURNING *""",
                telegram_id, username, first_name, last_name,
            )
        return dict(row)


async def get_user(telegram_id: int) -> Optional[Dict[str, Any]]:
    async with get_pool().acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE telegram_id = $1", telegram_id)
        return dict(row) if row else None


async def get_user_by_id(user_uuid: str) -> Optional[Dict[str, Any]]:
    async with get_pool().acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_uuid)
        return dict(row) if row else None


async def get_all_users(limit: int = 200, offset: int = 0) -> List[Dict[str, Any]]:
    async with get_pool().acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2", limit, offset
        )
        return [dict(r) for r in rows]


async def find_user(query: str) -> Optional[Dict[str, Any]]:
    """Find user by telegram_id (numeric) or username (case-insensitive)."""
    async with get_pool().acquire() as conn:
        # Try numeric telegram_id first
        try:
            tid = int(query)
            row = await conn.fetchrow("SELECT * FROM users WHERE telegram_id=$1", tid)
            if row:
                return dict(row)
        except ValueError:
            pass
        row = await conn.fetchrow("SELECT * FROM users WHERE LOWER(username)=LOWER($1) LIMIT 1", query)
        return dict(row) if row else None


async def iter_users(batch_size: int = 500):
    """Yield users in batches (for broadcasting). Async generator."""
    async with get_pool().acquire() as conn:
        offset = 0
        while True:
            rows = await conn.fetch(
                "SELECT telegram_id, is_banned FROM users ORDER BY created_at LIMIT $1 OFFSET $2",
                batch_size, offset,
            )
            if not rows:
                break
            for r in rows:
                yield dict(r)
            offset += batch_size


async def count_users() -> int:
    async with get_pool().acquire() as conn:
        return await conn.fetchval("SELECT COUNT(*) FROM users")


async def ban_user(telegram_id: int) -> None:
    async with get_pool().acquire() as conn:
        await conn.execute("UPDATE users SET is_banned=TRUE WHERE telegram_id=$1", telegram_id)


async def unban_user(telegram_id: int) -> None:
    async with get_pool().acquire() as conn:
        await conn.execute("UPDATE users SET is_banned=FALSE WHERE telegram_id=$1", telegram_id)


async def add_balance(telegram_id: int, amount: float) -> float:
    async with get_pool().acquire() as conn:
        return float(await conn.fetchval(
            "UPDATE users SET balance_rub=balance_rub+$2 WHERE telegram_id=$1 RETURNING balance_rub",
            telegram_id, amount,
        ))


async def get_referrals_count(user_uuid: str) -> int:
    async with get_pool().acquire() as conn:
        return await conn.fetchval("SELECT COUNT(*) FROM users WHERE referred_by=$1", user_uuid)


# ── subscription plans ────────────────────────────────────────────────────────

async def get_plan_by_months(months: int) -> Optional[Dict[str, Any]]:
    async with get_pool().acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM subscription_plans WHERE duration_months=$1 AND is_active=TRUE ORDER BY price_rub LIMIT 1",
            months,
        )
        return dict(row) if row else None


async def list_plans() -> List[Dict[str, Any]]:
    async with get_pool().acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM subscription_plans WHERE is_active=TRUE ORDER BY duration_months"
        )
        return [dict(r) for r in rows]


# ── subscriptions ─────────────────────────────────────────────────────────────

async def get_active_subscription(telegram_id: int) -> Optional[Dict[str, Any]]:
    async with get_pool().acquire() as conn:
        row = await conn.fetchrow(
            """SELECT s.* FROM subscriptions s
               JOIN users u ON u.id = s.user_id
               WHERE u.telegram_id = $1 AND s.status IN ('active', 'trial')
                 AND (s.expires_at IS NULL OR s.expires_at > NOW())
               ORDER BY s.created_at DESC LIMIT 1""",
            telegram_id,
        )
        return dict(row) if row else None


async def upsert_subscription(
    telegram_id: int,
    plan_id: str,
    months: int,
    devices_count: int,
    vpn_username: str,
    config_url: str,
) -> Dict[str, Any]:
    """Create or extend subscription. If active sub exists — extend; else create."""
    async with get_pool().acquire() as conn:
        user = await conn.fetchrow("SELECT id FROM users WHERE telegram_id=$1", telegram_id)
        if not user:
            raise RuntimeError("User not found")
        user_id = user["id"]

        existing = await conn.fetchrow(
            """SELECT * FROM subscriptions
               WHERE user_id=$1 AND status IN ('active','trial','pending')
               ORDER BY expires_at DESC NULLS LAST LIMIT 1""",
            user_id,
        )
        now = datetime.now(tz=timezone.utc)
        add = timedelta(days=months * 30)

        if existing:
            base = existing["expires_at"] if existing["expires_at"] and existing["expires_at"] > now else now
            new_exp = base + add
            row = await conn.fetchrow(
                """UPDATE subscriptions
                   SET status='active', expires_at=$2, plan_id=$3,
                       vpn_username=$4, config_url=$5, devices_count=$6, updated_at=NOW()
                   WHERE id=$1 RETURNING *""",
                existing["id"], new_exp, plan_id, vpn_username, config_url, devices_count,
            )
        else:
            row = await conn.fetchrow(
                """INSERT INTO subscriptions
                   (user_id, plan_id, status, started_at, expires_at, vpn_username, config_url, devices_count)
                   VALUES ($1, $2, 'active', NOW(), $3, $4, $5, $6) RETURNING *""",
                user_id, plan_id, now + add, vpn_username, config_url, devices_count,
            )
        return dict(row)


async def count_active_subscriptions() -> int:
    async with get_pool().acquire() as conn:
        return await conn.fetchval(
            "SELECT COUNT(*) FROM subscriptions WHERE status='active' AND expires_at > NOW()"
        )


# ── payments ─────────────────────────────────────────────────────────────────

async def create_payment(
    telegram_id: int,
    amount_rub: float,
    provider: str,
    provider_payment_id: str = "",
    months: int = 1,
    devices: int = 1,
    method: str = "card",
    traffic_gb: int = 15,
    bypass_gb: int = 5,
) -> Dict[str, Any]:
    async with get_pool().acquire() as conn:
        user = await conn.fetchrow("SELECT id FROM users WHERE telegram_id=$1", telegram_id)
        if not user:
            raise RuntimeError("User not found")
        metadata = {
            "months": months,
            "devices": devices,
            "traffic_gb": traffic_gb,
            "bypass_gb": bypass_gb,
        }
        row = await conn.fetchrow(
            """INSERT INTO payments (user_id, amount_rub, payment_method, payment_provider,
                                     provider_payment_id, status, metadata)
               VALUES ($1, $2, $3, $4, $5, 'pending', $6::jsonb) RETURNING *""",
            user["id"], amount_rub, method, provider, provider_payment_id,
            __import__("json").dumps(metadata),
        )
        return dict(row)


async def get_payment(payment_id: str) -> Optional[Dict[str, Any]]:
    async with get_pool().acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM payments WHERE id=$1", payment_id)
        return dict(row) if row else None


async def get_payment_by_provider_id(provider_payment_id: str) -> Optional[Dict[str, Any]]:
    async with get_pool().acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM payments WHERE provider_payment_id=$1 ORDER BY created_at DESC LIMIT 1",
            provider_payment_id,
        )
        return dict(row) if row else None


async def confirm_payment(payment_id: str, subscription_id: str | None = None) -> None:
    async with get_pool().acquire() as conn:
        if subscription_id:
            await conn.execute(
                "UPDATE payments SET status='completed', subscription_id=$2, updated_at=NOW() WHERE id=$1",
                payment_id, subscription_id,
            )
        else:
            await conn.execute(
                "UPDATE payments SET status='completed', updated_at=NOW() WHERE id=$1",
                payment_id,
            )


async def count_payments(status: str = "completed") -> int:
    async with get_pool().acquire() as conn:
        return await conn.fetchval("SELECT COUNT(*) FROM payments WHERE status=$1", status)


async def sum_payments(status: str = "completed") -> float:
    async with get_pool().acquire() as conn:
        val = await conn.fetchval(
            "SELECT COALESCE(SUM(amount_rub),0) FROM payments WHERE status=$1", status
        )
        return float(val)


# ── promocodes ────────────────────────────────────────────────────────────────

async def create_promo(code: str, discount_type: str, discount_value: float, max_uses: int = 0) -> None:
    """discount_type: 'percentage' or 'fixed'."""
    async with get_pool().acquire() as conn:
        await conn.execute(
            """INSERT INTO promocodes (code, discount_type, discount_value, max_uses, is_active)
               VALUES ($1, $2, $3, $4, TRUE)
               ON CONFLICT (code) DO UPDATE
               SET discount_type=$2, discount_value=$3, max_uses=$4, is_active=TRUE""",
            code.upper(), discount_type, discount_value, max_uses if max_uses > 0 else None,
        )


async def use_promo(telegram_id: int, code: str, discount_amount: float = 0) -> Optional[Dict[str, Any]]:
    code = code.upper()
    async with get_pool().acquire() as conn:
        promo = await conn.fetchrow(
            """SELECT * FROM promocodes
               WHERE code=$1 AND is_active=TRUE
                 AND (expires_at IS NULL OR expires_at > NOW())""",
            code,
        )
        if not promo:
            return None
        if promo["max_uses"] and promo["current_uses"] >= promo["max_uses"]:
            return None
        user = await conn.fetchrow("SELECT id FROM users WHERE telegram_id=$1", telegram_id)
        if not user:
            return None
        used = await conn.fetchrow(
            "SELECT 1 FROM promocode_uses WHERE promocode_id=$1 AND user_id=$2",
            promo["id"], user["id"],
        )
        if used:
            return None
        await conn.execute(
            "UPDATE promocodes SET current_uses=current_uses+1 WHERE id=$1", promo["id"]
        )
        await conn.execute(
            """INSERT INTO promocode_uses (promocode_id, user_id, discount_amount)
               VALUES ($1, $2, $3)""",
            promo["id"], user["id"], discount_amount,
        )
        return dict(promo)


async def list_promos() -> List[Dict[str, Any]]:
    async with get_pool().acquire() as conn:
        rows = await conn.fetch("SELECT * FROM promocodes ORDER BY created_at DESC")
        return [dict(r) for r in rows]
