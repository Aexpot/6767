from __future__ import annotations

"""VPN activation after successful payment — shared between main.py and handlers.py."""

import asyncio
import json
import logging

log = logging.getLogger(__name__)


async def activate_vpn_and_notify(bot, payment_id: str) -> None:
    """Activate VPN for a confirmed payment and notify the user."""
    from bot import db, remnawave as rw_mod
    from bot.keyboards import auto_import_menu
    from bot.handlers import _fmt_months

    payment = await db.get_payment(payment_id)
    if not payment:
        log.warning("activate_vpn_and_notify: payment %s not found", payment_id)
        return
    if payment.get("status") == "completed":
        return  # already processed

    user = await db.get_user_by_id(str(payment["user_id"]))
    if not user:
        return
    user_telegram_id = user["telegram_id"]

    metadata = payment.get("metadata") or {}
    if isinstance(metadata, str):
        metadata = json.loads(metadata)
    months = metadata.get("months", 1)
    devices = metadata.get("devices", 1)
    bypass_gb = metadata.get("bypass_gb", 15)

    sub_url = ""
    vpn_error = False
    now_ts = int(__import__("datetime").datetime.now(__import__("datetime").timezone.utc).timestamp())
    try:
        rw = rw_mod.get_remnawave()
        vpn_user = await rw.create_vpn_user(
            user_telegram_id, months, device_limit=devices, data_limit_gb=0,
        )
        sub_url = vpn_user.subscription_url or await rw.get_subscription_url(user_telegram_id)
        panel_uuid = vpn_user.uuid
        end_ts = now_ts + months * 30 * 24 * 3600

        plan = await db.get_plan_by_months(months)
        if plan:
            sub_rec = await db.upsert_subscription(
                user_telegram_id, str(plan["id"]), months, devices,
                vpn_username=vpn_user.username, config_url=sub_url,
            )
            await db.confirm_payment(payment_id, str(sub_rec["id"]))
        else:
            await db.confirm_payment(payment_id)

        await db.webapp_sync_user(user_telegram_id, panel_user_uuid=panel_uuid, is_banned=False)
        await db.webapp_sync_subscription(
            telegram_id=user_telegram_id, panel_user_uuid=panel_uuid,
            months=months, bypass_gb=bypass_gb, devices=devices,
            start_ts=now_ts, end_ts=end_ts,
        )
    except Exception:
        log.exception("activate_vpn_and_notify: VPN creation failed for payment %s", payment_id)
        await db.confirm_payment(payment_id)
        vpn_error = True

    bypass_str = "♾ Безлимит" if bypass_gb == 0 else f"{bypass_gb} ГБ"

    if vpn_error or not sub_url:
        await bot.send_message(
            user_telegram_id,
            "✅ <b>Оплата принята!</b>\n\n"
            "⚠️ При активации VPN произошла ошибка. "
            "Наш менеджер выдаст подписку вручную в течение 15 минут.",
        )
    else:
        await bot.send_message(
            user_telegram_id,
            f"🎉 <b>Подписка активирована!</b>\n\n"
            f"🗓 Срок подписки: <b>{_fmt_months(months)}</b>\n"
            f"⚙️ Кол-во устройств: <b>{devices}</b>\n"
            f"☁️ Трафик обходов: <b>{bypass_str}</b>\n\n"
            f"🔗 <b>Ваша ссылка подписки:</b>\n"
            f"<code>{sub_url}</code>\n\n"
            "Нажмите кнопку ниже — приложение откроется и автоматически импортирует подписку.",
            reply_markup=auto_import_menu(sub_url),
        )
