from __future__ import annotations

"""Payment provider integrations: CryptoPay, YooMoney, Telegram Stars."""

import hashlib
import hmac
import json
import logging
import time
from typing import Optional
from urllib.parse import urlencode

import aiohttp

log = logging.getLogger(__name__)


# ── CryptoPay ──────────────────────────────────────────────────────────────────

CRYPTOPAY_API = "https://pay.crypt.bot/api"


async def cryptopay_create_invoice(token: str, amount: float, description: str, payload: str = "") -> Optional[dict]:
    """Create a CryptoPay invoice (USDT). Returns invoice dict or None."""
    # Convert RUB to USDT roughly — CryptoPay works in crypto.
    # We create invoice in USDT. Rate: ~90 RUB/USDT approximate.
    usdt_amount = round(amount / 90, 2)
    if usdt_amount < 0.01:
        usdt_amount = 0.01
    params = {
        "asset": "USDT",
        "amount": usdt_amount,
        "description": description,
        "payload": payload,
        "allow_comments": False,
        "allow_anonymous": False,
        "expires_in": 3600,
    }
    headers = {"Crypto-Pay-API-Token": token}
    try:
        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.post(f"{CRYPTOPAY_API}/createInvoice", json=params) as resp:
                data = await resp.json()
                if data.get("ok"):
                    return data["result"]
    except Exception:
        log.exception("CryptoPay create invoice failed")
    return None


async def cryptopay_get_invoice(token: str, invoice_id: int) -> Optional[dict]:
    """Check invoice status."""
    headers = {"Crypto-Pay-API-Token": token}
    try:
        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.get(
                f"{CRYPTOPAY_API}/getInvoices",
                params={"invoice_ids": invoice_id},
                headers=headers,
            ) as resp:
                data = await resp.json()
                if data.get("ok") and data["result"].get("items"):
                    return data["result"]["items"][0]
    except Exception:
        log.exception("CryptoPay get invoice failed")
    return None


# ── YooMoney ───────────────────────────────────────────────────────────────────

def yoomoney_payment_url(wallet: str, amount: float, label: str, description: str) -> str:
    """Build a YooMoney quick-pay link."""
    params = {
        "receiver": wallet,
        "quickpay-form": "shop",
        "targets": description,
        "paymentType": "AC",
        "sum": amount,
        "label": label,
        "successURL": "",
    }
    return "https://yoomoney.ru/quickpay/confirm?" + urlencode(params)


def yoomoney_verify_notification(secret: str, params: dict) -> bool:
    """Verify YooMoney HTTP-notification signature."""
    keys = [
        "notification_type", "operation_id", "amount", "currency",
        "datetime", "sender", "codepro", "notification_secret", "label",
    ]
    values = [str(params.get(k, "")) for k in keys]
    values[keys.index("notification_secret")] = secret
    string = "&".join(values)
    expected = hashlib.sha1(string.encode()).hexdigest()
    received = params.get("sha1_hash", "")
    return hmac.compare_digest(expected, received)
