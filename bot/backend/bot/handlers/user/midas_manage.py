"""
MidasVPN-style subscription management.

Разделы:
  • Продлить подписку
  • Устройства (список + добавить место)
  • Трафик
  • Перевыпустить ссылку
  • Subscription URL
  • Информация о подписке
"""
from __future__ import annotations

import logging
from typing import Optional

from aiogram import F, Router, types
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy.ext.asyncio import AsyncSession

from bot.services.panel_api_service import PanelApiService
from bot.services.subscription_service import SubscriptionService
from config.settings import Settings

router = Router(name="midas_manage_router")


# ─── helpers ──────────────────────────────────────────────────────────────────

def _back_to_manage_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:manage")],
    ])


def _manage_menu_kb(has_config_link: bool) -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text="🔄 Продлить подписку", callback_data="midas_mgmt:renew")],
        [InlineKeyboardButton(text="📱 Устройства",        callback_data="midas_mgmt:devices")],
        [InlineKeyboardButton(text="📦 Трафик",            callback_data="midas_mgmt:traffic")],
    ]
    if has_config_link:
        rows.append([InlineKeyboardButton(text="🔁 Перевыпустить ссылку", callback_data="midas_mgmt:reissue")])
        rows.append([InlineKeyboardButton(text="🔗 Subscription URL",     callback_data="midas_mgmt:show_url")])
    rows.append([InlineKeyboardButton(text="ℹ️ Информация о подписке",    callback_data="midas_mgmt:info")])
    rows.append([InlineKeyboardButton(text="⬅️ Главное меню",             callback_data="midas:main_menu")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


# ─── Main management menu ─────────────────────────────────────────────────────

@router.callback_query(F.data == "midas:manage")
async def manage_menu(
    callback: types.CallbackQuery,
    subscription_service: SubscriptionService,
    session: AsyncSession,
    **kwargs,
):
    await callback.answer()
    user_id = callback.from_user.id

    try:
        active = await subscription_service.get_active_subscription_details(session, user_id)
    except Exception:
        active = None

    if not active:
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🛒 Оформить подписку", callback_data="midas:purchase_start")],
            [InlineKeyboardButton(text="⬅️ Назад",            callback_data="midas:main_menu")],
        ])
        text = (
            "⚙️ <b>Управление подпиской</b>\n\n"
            "У вас нет активной подписки."
        )
        try:
            await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
        except Exception:
            await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")
        return

    end_date = active.get("end_date")
    end_str = end_date.strftime("%d.%m.%Y") if end_date else "—"
    config_link = active.get("config_link") or active.get("subscription_url")

    text = (
        f"⚙️ <b>Управление подпиской</b>\n\n"
        f"📅 Активна до: <b>{end_str}</b>\n"
        f"📶 Статус: <b>{active.get('status', '—')}</b>"
    )
    kb = _manage_menu_kb(bool(config_link))
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── Renew ────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "midas_mgmt:renew")
async def manage_renew(
    callback: types.CallbackQuery,
    **kwargs,
):
    await callback.answer()
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🛒 Продлить (выбор срока)", callback_data="midas:purchase_start")],
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:manage")],
    ])
    text = (
        "🔄 <b>Продление подписки</b>\n\n"
        "Выберите срок и оформите продление как новую подписку. "
        "Дни будут добавлены к текущей дате окончания."
    )
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── Devices ──────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "midas_mgmt:devices")
async def manage_devices(
    callback: types.CallbackQuery,
    settings: Settings,
    panel_service: PanelApiService,
    subscription_service: SubscriptionService,
    session: AsyncSession,
    **kwargs,
):
    await callback.answer()
    user_id = callback.from_user.id

    try:
        active = await subscription_service.get_active_subscription_details(session, user_id)
    except Exception:
        active = None

    if not active:
        await callback.answer("Нет активной подписки.", show_alert=True)
        return

    panel_uuid = active.get("user_id")
    max_devices = active.get("max_devices") or settings.USER_HWID_DEVICE_LIMIT or 0
    devices = []

    if panel_uuid:
        try:
            devices = await panel_service.get_user_devices(panel_uuid) or []
        except Exception as exc:
            logging.warning("midas devices: panel error: %s", exc)

    current_count = len(devices)
    limit_label = str(max_devices) if max_devices and max_devices > 0 else "∞"

    kb_rows = []
    if devices:
        device_lines = []
        for i, dev in enumerate(devices, start=1):
            hwid = dev.get("hwid") or str(dev.get("id", ""))
            model = dev.get("deviceModel") or dev.get("device_model") or dev.get("platform") or f"Устройство {i}"
            os_ver = dev.get("osVersion") or ""
            label = f"{model} {os_ver}".strip()
            device_lines.append(f"  {i}. {label}")
            short = hwid[:8] + "…" if len(hwid) > 12 else hwid
            kb_rows.append([InlineKeyboardButton(
                text=f"✖ Откл. #{i} ({short})",
                callback_data=f"midas_dev:disc:{hwid[:40]}",
            )])
        device_text = "\n".join(device_lines)
    else:
        device_text = "Нет подключённых устройств."

    text = (
        f"📱 <b>Мои устройства</b>\n\n"
        f"Подключено: <b>{current_count}</b> из <b>{limit_label}</b>\n\n"
        f"{device_text}"
    )
    kb_rows.append([InlineKeyboardButton(text="➕ Добавить слот", callback_data="midas_dev:add_slot")])
    kb_rows.append([InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:manage")])
    kb = InlineKeyboardMarkup(inline_keyboard=kb_rows)

    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data.startswith("midas_dev:disc:"))
async def manage_disconnect_device(
    callback: types.CallbackQuery,
    settings: Settings,
    panel_service: PanelApiService,
    subscription_service: SubscriptionService,
    session: AsyncSession,
    **kwargs,
):
    hwid = callback.data[len("midas_dev:disc:"):]
    user_id = callback.from_user.id
    await callback.answer("Отключение…")

    try:
        active = await subscription_service.get_active_subscription_details(session, user_id)
        if active:
            panel_uuid = active.get("user_id")
            ok = await panel_service.disconnect_device(panel_uuid, hwid)
            if ok:
                await callback.answer("✅ Устройство отключено", show_alert=True)
            else:
                await callback.answer("⚠️ Не удалось отключить.", show_alert=True)
    except Exception as exc:
        logging.warning("midas disconnect: %s", exc)
        await callback.answer("Ошибка. Попробуйте позже.", show_alert=True)

    await manage_devices(
        callback,
        settings=settings,
        panel_service=panel_service,
        subscription_service=subscription_service,
        session=session,
        **kwargs,
    )


@router.callback_query(F.data == "midas_dev:add_slot")
async def manage_add_slot(
    callback: types.CallbackQuery,
    **kwargs,
):
    await callback.answer()
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🛒 Добавить слот (покупка)", callback_data="midas:purchase_start")],
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="midas_mgmt:devices")],
    ])
    text = (
        "➕ <b>Добавить место для устройства</b>\n\n"
        "Чтобы добавить слот, оформите подписку с увеличенным числом устройств."
    )
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── Traffic ──────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "midas_mgmt:traffic")
async def manage_traffic(
    callback: types.CallbackQuery,
    subscription_service: SubscriptionService,
    session: AsyncSession,
    **kwargs,
):
    await callback.answer()
    user_id = callback.from_user.id

    try:
        active = await subscription_service.get_active_subscription_details(session, user_id)
    except Exception:
        active = None

    if not active:
        await callback.answer("Нет активной подписки.", show_alert=True)
        return

    limit_bytes = active.get("traffic_limit_bytes")
    used_bytes = active.get("traffic_used_bytes") or 0

    if limit_bytes:
        limit_gb = limit_bytes / 1024 ** 3
        used_gb = used_bytes / 1024 ** 3
        free_gb = max(0, limit_gb - used_gb)
        pct = min(100, int(used_gb / limit_gb * 100)) if limit_gb else 0
        filled = round(pct / 10)
        bar = "█" * filled + "░" * (10 - filled)
        traffic_text = (
            f"Использовано: <b>{used_gb:.2f} / {limit_gb:.0f} ГБ</b>\n"
            f"Свободно: <b>{free_gb:.2f} ГБ</b>\n"
            f"[{bar}] {pct}%"
        )
    else:
        traffic_text = "Трафик: <b>∞ (безлимитный)</b>"

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="➕ Докупить трафик", callback_data="main_action:subscribe")],
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:manage")],
    ])
    text = f"📦 <b>Трафик</b>\n\n{traffic_text}"
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── Reissue link ─────────────────────────────────────────────────────────────

@router.callback_query(F.data == "midas_mgmt:reissue")
async def manage_reissue(
    callback: types.CallbackQuery,
    subscription_service: SubscriptionService,
    session: AsyncSession,
    **kwargs,
):
    await callback.answer()
    user_id = callback.from_user.id

    try:
        active = await subscription_service.get_active_subscription_details(session, user_id)
    except Exception:
        active = None

    if not active:
        await callback.answer("Нет активной подписки.", show_alert=True)
        return

    # Attempt to regenerate subscription URL via panel service (if supported)
    try:
        if hasattr(subscription_service, "reissue_subscription_link"):
            new_link = await subscription_service.reissue_subscription_link(session, user_id)
        else:
            new_link = active.get("config_link")
    except Exception as exc:
        logging.warning("midas reissue: %s", exc)
        new_link = active.get("config_link")

    if not new_link:
        await callback.answer("Не удалось перевыпустить ссылку.", show_alert=True)
        return

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:manage")],
    ])
    text = (
        "🔁 <b>Ссылка перевыпущена</b>\n\n"
        f"Новый ключ подключения:\n<code>{new_link}</code>"
    )
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── Show URL ─────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "midas_mgmt:show_url")
async def manage_show_url(
    callback: types.CallbackQuery,
    subscription_service: SubscriptionService,
    session: AsyncSession,
    **kwargs,
):
    await callback.answer()
    user_id = callback.from_user.id

    try:
        active = await subscription_service.get_active_subscription_details(session, user_id)
    except Exception:
        active = None

    config_link = active.get("config_link") if active else None
    if not config_link:
        await callback.answer("Ссылка недоступна.", show_alert=True)
        return

    connect_url = active.get("connect_button_url") if active else config_link
    kb_rows = []
    if connect_url:
        kb_rows.append([InlineKeyboardButton(text="🔗 Открыть в приложении", url=connect_url)])
    kb_rows.append([InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:manage")])
    kb = InlineKeyboardMarkup(inline_keyboard=kb_rows)
    text = (
        "🔗 <b>Subscription URL</b>\n\n"
        f"<code>{config_link}</code>\n\n"
        "Скопируйте ссылку и вставьте в приложение (Hiddify, v2rayNG, Shadowrocket и др.)"
    )
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── Info ─────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "midas_mgmt:info")
async def manage_info(
    callback: types.CallbackQuery,
    subscription_service: SubscriptionService,
    session: AsyncSession,
    **kwargs,
):
    await callback.answer()
    user_id = callback.from_user.id

    try:
        active = await subscription_service.get_active_subscription_details(session, user_id)
    except Exception:
        active = None

    if not active:
        await callback.answer("Нет активной подписки.", show_alert=True)
        return

    end_date = active.get("end_date")
    start_date = active.get("start_date")
    end_str = end_date.strftime("%d.%m.%Y %H:%M") if end_date else "—"
    start_str = start_date.strftime("%d.%m.%Y") if start_date else "—"
    status = active.get("status") or "—"
    max_dev = active.get("max_devices")
    dev_str = str(max_dev) if max_dev and max_dev > 0 else "∞"
    limit_bytes = active.get("traffic_limit_bytes")
    used_bytes = active.get("traffic_used_bytes") or 0
    if limit_bytes:
        limit_gb = limit_bytes / 1024 ** 3
        used_gb = used_bytes / 1024 ** 3
        traffic_str = f"{used_gb:.2f} / {limit_gb:.0f} ГБ"
    else:
        traffic_str = "∞ ГБ"

    kb = _back_to_manage_kb()
    text = (
        f"ℹ️ <b>Информация о подписке</b>\n\n"
        f"📅 Начало: <b>{start_str}</b>\n"
        f"📅 Окончание: <b>{end_str}</b>\n"
        f"📶 Статус: <b>{status}</b>\n"
        f"📱 Устройств: <b>{dev_str}</b>\n"
        f"📦 Трафик: <b>{traffic_str}</b>"
    )
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")
