"""
Subscription management handler — Devices & Whitelist Traffic sub-sections.
Triggered by callback_data="main_action:subscription_management"
"""
import logging
from aiogram import Router, F, types
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from config.settings import Settings
from bot.services.subscription_service import SubscriptionService
from bot.services.panel_api_service import PanelApiService

router = Router(name="subscription_management_router")


# ─── helpers ────────────────────────────────────────────────────────────────

def _sub_mgmt_menu_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📱 Мои устройства",        callback_data="sub_mgmt:devices")],
        [InlineKeyboardButton(text="📊 Трафик белых списков",  callback_data="sub_mgmt:whitelist_traffic")],
        [InlineKeyboardButton(text="🔙 Назад",                 callback_data="main_action:back_to_main")],
    ])


def _back_to_mgmt_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Назад", callback_data="main_action:subscription_management")],
    ])


def _text_progress_bar(used: float, total: float, width: int = 12) -> str:
    if total <= 0:
        return "░" * width
    pct = min(1.0, used / total)
    filled = round(pct * width)
    return "█" * filled + "░" * (width - filled)


# ─── main menu ───────────────────────────────────────────────────────────────

@router.callback_query(F.data == "main_action:subscription_management")
async def subscription_management_menu(
    callback: types.CallbackQuery,
    **kwargs,
):
    await callback.answer()
    text = "🔧 <b>Управление подпиской</b>\n\nВыберите раздел:"
    try:
        await callback.message.edit_text(text, reply_markup=_sub_mgmt_menu_kb(), parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=_sub_mgmt_menu_kb(), parse_mode="HTML")


# ─── devices ─────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "sub_mgmt:devices")
async def devices_section(
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
    except Exception as exc:
        logging.warning("sub_mgmt devices: error fetching subscription: %s", exc)
        active = None

    if not active:
        text = "📱 <b>Устройства</b>\n\nАктивная подписка не найдена."
        await callback.message.edit_text(text, reply_markup=_back_to_mgmt_kb(), parse_mode="HTML")
        return

    panel_uuid = active.get("user_id")  # this is the panel user UUID
    # max_devices is already the effective limit (base + extras, 0 = unlimited)
    max_devices = active.get("max_devices") or settings.USER_HWID_DEVICE_LIMIT or 0
    devices = []
    kb_rows = []

    if panel_uuid:
        try:
            devices = await panel_service.get_user_devices(panel_uuid) or []
        except Exception as exc:
            logging.warning("sub_mgmt devices: panel error: %s", exc)

    current_count = len(devices)
    limit_label = str(max_devices) if max_devices and max_devices > 0 else "∞"

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
                callback_data=f"sub_mgmt:disc:{hwid[:40]}"
            )])

        text = (
            f"📱 <b>Мои устройства</b>\n\n"
            f"Подключено: <b>{current_count}</b> из <b>{limit_label}</b>\n\n"
            + "\n".join(device_lines)
        )
    else:
        text = (
            f"📱 <b>Мои устройства</b>\n\n"
            f"Подключено: <b>0</b> из <b>{limit_label}</b>\n\n"
            f"Нет подключённых устройств.\n"
            f"Они появятся здесь после подключения по ссылке подписки."
        )

    kb_rows.append([InlineKeyboardButton(text="💳 Докупить слот (+90 ₽)",  callback_data="main_action:bot_subscribe")])
    kb_rows.append([InlineKeyboardButton(text="🔙 Назад",                  callback_data="main_action:subscription_management")])
    kb = InlineKeyboardMarkup(inline_keyboard=kb_rows)

    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data.startswith("sub_mgmt:disc:"))
async def disconnect_device_handler(
    callback: types.CallbackQuery,
    settings: Settings,
    panel_service: PanelApiService,
    subscription_service: SubscriptionService,
    session: AsyncSession,
    **kwargs,
):
    hwid = callback.data[len("sub_mgmt:disc:"):]
    user_id = callback.from_user.id
    await callback.answer("Отключение…")

    try:
        active = await subscription_service.get_active_subscription_details(session, user_id)
        if not active:
            await callback.answer("Нет активной подписки", show_alert=True)
            return
        panel_uuid = active.get("user_id")
        success = await panel_service.disconnect_device(panel_uuid, hwid)
        if success:
            await callback.answer("✅ Устройство отключено", show_alert=True)
        else:
            await callback.answer("⚠️ Не удалось отключить. Попробуйте позже.", show_alert=True)
    except Exception as exc:
        logging.warning("sub_mgmt:disc error: %s", exc)
        await callback.answer("Ошибка. Попробуйте позже.", show_alert=True)

    # Refresh devices screen
    await devices_section(
        callback,
        settings=settings,
        panel_service=panel_service,
        subscription_service=subscription_service,
        session=session,
        **kwargs,
    )


# ─── whitelist traffic ───────────────────────────────────────────────────────

@router.callback_query(F.data == "sub_mgmt:whitelist_traffic")
async def whitelist_traffic_section(
    callback: types.CallbackQuery,
    settings: Settings,
    subscription_service: SubscriptionService,
    session: AsyncSession,
    **kwargs,
):
    await callback.answer()
    user_id = callback.from_user.id

    try:
        active = await subscription_service.get_active_subscription_details(session, user_id)
    except Exception as exc:
        logging.warning("sub_mgmt wl traffic: error: %s", exc)
        active = None

    if not active:
        text = "📊 <b>Обход белых списков РКН</b>\n\nАктивная подписка не найдена."
        await callback.message.edit_text(text, reply_markup=_back_to_mgmt_kb(), parse_mode="HTML")
        return

    # "Белые списки" = обход режима белых списков РКН (ограничения мобильного интернета).
    # В Remnawave реализовано через "premium" серверы с "белым" IP, пропускаемым ТСПУ.
    # premium_used_bytes  — использованный трафик через эти серверы
    # premium_limit_bytes — эффективный лимит (baseline + topup + bonus)
    # 0 / None            — лимит не задан (тариф без premium squad)
    wl_used  = int(active.get("premium_used_bytes")  or 0)
    wl_limit = int(active.get("premium_limit_bytes") or 0)
    wl_unlimited = bool(active.get("premium_unlimited_override"))

    has_wl = wl_unlimited or wl_limit > 0

    if not has_wl:
        text = (
            "📊 <b>Обход белых списков РКН</b>\n\n"
            "Ваш тариф не включает обход белых списков.\n\n"
            "ℹ️ <i>Белые списки — режим мобильного интернета в РФ, при котором операторы "
            "блокируют всё кроме одобренных сайтов. ChampionVPN обходит это через серверы "
            "с «белым» IP.</i>"
        )
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Назад", callback_data="main_action:subscription_management")],
        ])
        try:
            await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
        except Exception:
            await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")
        return

    if wl_unlimited:
        text = (
            "📊 <b>Обход белых списков РКН</b>\n\n"
            "Безлимитный трафик обхода белых списков ✅\n\n"
            "ℹ️ <i>ChampionVPN обходит режим белых списков операторов через серверы "
            "с «белым» IP (пропускается ТСПУ), маскируя трафик под легальный HTTPS.</i>"
        )
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Назад", callback_data="main_action:subscription_management")],
        ])
        try:
            await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
        except Exception:
            await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")
        return

    wl_left  = max(0, wl_limit - wl_used)
    used_gb  = wl_used  / (1024 ** 3)
    limit_gb = wl_limit / (1024 ** 3)
    left_gb  = wl_left  / (1024 ** 3)
    pct      = (wl_used / wl_limit * 100) if wl_limit > 0 else 0
    bar      = _text_progress_bar(wl_used, wl_limit)

    warn = ""
    if pct > 85:
        warn = "\n\n⚠️ <b>Трафик заканчивается!</b>"

    text = (
        f"📊 <b>Обход белых списков РКН</b>\n\n"
        f"Использовано: <b>{used_gb:.2f} ГБ</b> из <b>{limit_gb:.0f} ГБ</b>\n"
        f"Осталось: <b>{left_gb:.2f} ГБ</b>\n\n"
        f"{bar} {pct:.0f}%"
        f"{warn}\n\n"
        f"ℹ️ <i>Трафик через серверы с «белым» IP — обходит ограничения мобильного интернета "
        f"операторов РФ (МТС, Мегафон, Билайн и др.).</i>"
    )

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💳 Докупить трафик",  callback_data="sub_mgmt:buy_wl")],
        [InlineKeyboardButton(text="🔙 Назад",             callback_data="main_action:subscription_management")],
    ])

    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data == "sub_mgmt:buy_wl")
async def buy_whitelist_traffic(callback: types.CallbackQuery, **kwargs):
    await callback.answer()
    text = (
        "💳 <b>Докупить трафик белых списков</b>\n\n"
        "Пакеты:\n"
        "  • 5 ГБ — 49 ₽\n"
        "  • 15 ГБ — 99 ₽  ⭐ популярно\n"
        "  • 50 ГБ — 249 ₽\n\n"
        "Для покупки перейдите в MiniApp ChampionVPN → раздел «Трафик белых списков»."
    )
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 Назад", callback_data="sub_mgmt:whitelist_traffic")],
    ])
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")
