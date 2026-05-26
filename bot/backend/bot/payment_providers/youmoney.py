"""
YouMoney (ЮMoney) HTTP-form payment provider.

Использует HTTP-форму перевода: пользователь переходит по ссылке,
оплачивает через ЮMoney, система получает уведомление через HTTP-notification.

Env vars (prefix YOUMONEY_):
  YOUMONEY_WALLET       — номер кошелька получателя
  YOUMONEY_SECRET_KEY   — ключо для проверки подписи уведомлений
  YOUMONEY_NOTIFICATION_URL — URL для webhook уведомлений (необязательно, если совпадает с WEBHOOK_BASE_URL)
  YOUMONEY_ENABLED      — bool, включить провайдер (default False)
"""
from __future__ import annotations

import hashlib
import logging
import uuid
from typing import Any, Optional
from urllib.parse import urlencode

from aiohttp import web
from pydantic import Field
from pydantic_settings import SettingsConfigDict
from sqlalchemy.orm import sessionmaker

from .base import (
    PaymentProviderSpec,
    ProviderEnvConfig,
    ProviderManifestField,
    ServiceFactoryContext,
    WebAppPaymentContext,
    provider_env_file,
)
from .shared import (
    HttpClientMixin,
    build_payment_record_payload,
    create_webapp_payment_record,
    decimal_amounts_equal,
    finalize_successful_payment,
    format_decimal_amount,
    make_translator,
    notify_service_unavailable,
    payment_failed,
    payment_unavailable,
)

_LOG = "youmoney"
_YOUMONEY_FORM_URL = "https://yoomoney.ru/quickpay/confirm"


class YouMoneyConfig(ProviderEnvConfig):
    model_config = SettingsConfigDict(
        env_file=provider_env_file(),
        env_file_encoding="utf-8",
        env_prefix="YOUMONEY_",
        extra="ignore",
    )

    WALLET: Optional[str] = Field(default=None, description="ЮMoney wallet number (receiver)")
    SECRET_KEY: Optional[str] = Field(default=None, description="Secret key for notification validation")
    NOTIFICATION_URL: Optional[str] = Field(default=None, description="Override webhook URL")
    ENABLED: bool = Field(default=False)


def _is_configured(config: Optional[YouMoneyConfig]) -> bool:
    return bool(config and config.ENABLED and config.WALLET)


def _make_payment_url(
    wallet: str,
    amount: float,
    label: str,
    return_url: Optional[str] = None,
) -> str:
    params = {
        "receiver": wallet,
        "quickpay-form": "shop",
        "targets": "Оплата VPN-подписки",
        "paymentType": "AC",   # card (AC) or wallet (PC)
        "sum": f"{amount:.2f}",
        "label": label,
        "successURL": return_url or "",
    }
    return f"{_YOUMONEY_FORM_URL}?{urlencode(params)}"


def _verify_notification(data: dict, secret: str) -> bool:
    """Verify ЮMoney HTTP-notification signature."""
    keys = [
        "notification_type",
        "operation_id",
        "amount",
        "currency",
        "datetime",
        "sender",
        "codepro",
        secret,
        "label",
    ]
    values = []
    for k in keys:
        values.append(str(data.get(k, "")))
    check_str = "&".join(values)
    expected = hashlib.sha1(check_str.encode("utf-8")).hexdigest()
    return expected == data.get("sha1_hash", "")


# ─── SPEC ─────────────────────────────────────────────────────────────────────

async def create_payment(
    ctx: ServiceFactoryContext,
    session_factory: sessionmaker,
    user_id: int,
    amount: float,
    currency: str,
    sale_mode: str,
    months_or_value: Any,
    back_callback: Optional[str] = None,
    **kwargs,
) -> web.Response:
    config: Optional[YouMoneyConfig] = ctx.provider_config

    if not _is_configured(config):
        return await notify_service_unavailable(ctx, "youmoney")

    label = f"user{user_id}_{uuid.uuid4().hex[:12]}"
    payment_url = _make_payment_url(
        wallet=config.WALLET,
        amount=amount,
        label=label,
        return_url=None,
    )

    async with session_factory() as session:
        payload = build_payment_record_payload(
            user_id=user_id,
            amount=amount,
            currency=currency,
            status="pending",
            description=f"YouMoney payment {label}",
            months=months_or_value,
            provider="youmoney",
            sale_mode=sale_mode,
        )
        payload["provider_payment_id"] = label
        from db.dal import payment_dal
        from db.models import Payment
        record = Payment(**payload)
        session.add(record)
        await session.commit()

    return web.json_response({
        "status": "ok",
        "payment_url": payment_url,
        "label": label,
    })


async def handle_webhook(
    request: web.Request,
    ctx: ServiceFactoryContext,
    session_factory: sessionmaker,
) -> web.Response:
    """Handle ЮMoney HTTP-notification POST."""
    config: Optional[YouMoneyConfig] = ctx.provider_config

    if not _is_configured(config):
        return web.Response(status=404)

    try:
        data = dict(await request.post())
    except Exception as exc:
        logging.error("[%s] failed to parse notification: %s", _LOG, exc)
        return web.Response(status=400)

    # Verify signature if secret is configured
    if config.SECRET_KEY:
        if not _verify_notification(data, config.SECRET_KEY):
            logging.warning("[%s] invalid signature in notification", _LOG)
            return web.Response(status=403)

    label = data.get("label", "")
    amount_str = data.get("amount", "0")
    operation_id = data.get("operation_id", "")

    try:
        amount = float(amount_str)
    except ValueError:
        return web.Response(status=400)

    logging.info("[%s] received payment notification: label=%s amount=%s", _LOG, label, amount)

    async with session_factory() as session:
        from db.dal import payment_dal
        payment = await payment_dal.get_payment_by_provider_id(session, label)
        if not payment:
            logging.warning("[%s] payment not found for label=%s", _LOG, label)
            return web.Response(status=200)  # return 200 to stop retries

        if payment.status == "succeeded":
            return web.Response(status=200)

        if not decimal_amounts_equal(amount, payment.amount):
            logging.warning("[%s] amount mismatch: got %s expected %s", _LOG, amount, payment.amount)
            return web.Response(status=200)

        await finalize_successful_payment(
            session=session,
            payment=payment,
            ctx=ctx,
            provider_payment_id=operation_id,
        )
        await session.commit()

    return web.Response(status=200)


MANIFEST_FIELDS = [
    ProviderManifestField(
        key="YOUMONEY_WALLET",
        type="string",
        label="ЮMoney кошелёк",
        description="Номер кошелька получателя (например 4100118XXXXXXXXX)",
        placeholder="4100118XXXXXXXXX",
        secret=False,
        optional=True,
        subsection="YouMoney",
    ),
    ProviderManifestField(
        key="YOUMONEY_SECRET_KEY",
        type="string",
        label="Секретный ключ ЮMoney",
        description="Ключ для проверки подписи уведомлений",
        placeholder="your_secret_key",
        secret=True,
        optional=True,
        subsection="YouMoney",
    ),
    ProviderManifestField(
        key="YOUMONEY_ENABLED",
        type="bool",
        label="Включить ЮMoney",
        description="Активировать приём платежей через ЮMoney",
        optional=True,
        subsection="YouMoney",
    ),
]


SPEC = PaymentProviderSpec(
    id="youmoney",
    service_key="youmoney",
    method_ids={"youmoney", "yoomoney"},
    display_name="ЮMoney",
    config_class=YouMoneyConfig,
    manifest_fields=MANIFEST_FIELDS,
    create_payment_fn=create_payment,
    webhook_handler_fn=handle_webhook,
)
