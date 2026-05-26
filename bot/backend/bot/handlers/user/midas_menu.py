"""
MidasVPN-style main menu handler.

Показывает:
  • ID пользователя
  • Баланс
  • Подписка активна до
  • Статус
  • План устройств
  • Пакет ГБ

Кнопки:
  ⚡ Авто-импорт
  🛒 Оформить подписку
  ⚙️ Управление подпиской
  💳 Пополнить
  🎟 Промокод
  🔗 Реферальная система
  🛟 Поддержка
  📖 Инструкция
  🚀 Открыть приложение
"""
from __future__ import annotations

import logging
from typing import Optional, Union

from aiogram import F, Router, types
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder
from sqlalchemy.ext.asyncio import AsyncSession

from bot.services.subscription_service import SubscriptionService
from config.settings import Settings
from db.dal import user_billing_dal

router = Router(name="midas_menu_router")

# ─── helpers ──────────────────────────────────────────────────────────────────


def _fmt_rub(kopecks: int) -> str:
    rub = kopecks / 100
    if rub == int(rub):
        return f"{int(rub)} ₽"
    return f"{rub:.2f} ₽"


def _fmt_gb(limit_bytes: Optional[int], used_bytes: Optional[int] = None) -> str:
    if limit_bytes is None:
        return "∞ ГБ"
    limit_gb = limit_bytes / (1024 ** 3)
    if used_bytes is not None:
        used_gb = used_bytes / (1024 ** 3)
        return f"{used_gb:.1f} / {limit_gb:.0f} ГБ"
    return f"{limit_gb:.0f} ГБ"


def _status_emoji(status: Optional[str]) -> str:
    if not status:
        return "⚫ Нет"
    s = status.upper()
    if s in {"ACTIVE", "ENABLED"}:
        return "🟢 Активна"
    if s in {"EXPIRED", "DISABLED"}:
        return "🔴 Истекла"
    if s in {"LIMITED", "THROTTLED"}:
        return "🟡 Ограничена"
    return f"⚪ {status}"


def build_midas_main_menu_text(
    user_id: int,
    balance_kopecks: int,
    active: Optional[dict],
) -> str:
    if active:
        end_date_str = "—"
        end_date = active.get("end_date")
        if end_date:
            try:
                end_date_str = end_date.strftime("%d.%m.%Y")
            except Exception:
                end_date_str = str(end_date)

        status_str = _status_emoji(active.get("status"))
        max_dev = active.get("max_devices")
        devices_str = str(max_dev) if max_dev and max_dev > 0 else "∞"
        traffic_str = _fmt_gb(
            active.get("traffic_limit_bytes"),
            active.get("traffic_used_bytes"),
        )
    else:
        end_date_str = "—"
        status_str = "⚫ Нет подписки"
        devices_str = "—"
        traffic_str = "—"

    lines = [
        "━━━━━━━━━━━━━━━━━━━━━",
        f"🆔 <b>Ваш ID:</b> <code>{user_id}</code>",
        f"💰 <b>Баланс:</b> {_fmt_rub(balance_kopecks)}",
        "━━━━━━━━━━━━━━━━━━━━━",
        f"📅 <b>Подписка до:</b> {end_date_str}",
        f"📶 <b>Статус:</b> {status_str}",
        f"📱 <b>Устройств:</b> {devices_str}",
        f"📦 <b>Трафик:</b> {traffic_str}",
        "━━━━━━━━━━━━━━━━━━━━━",
    ]
    return "\n".join(lines)


def build_midas_main_menu_kb(
    settings: Settings,
    has_active_sub: bool,
) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()

    # Row 1: Auto-import (only if active subscription)
    if has_active_sub:
        builder.row(
            InlineKeyboardButton(
                text="⚡ Авто-импорт",
                callback_data="midas:auto_import",
            )
        )

    # Row 2: Subscribe
    builder.row(
        InlineKeyboardButton(
            text="🛒 Оформить подписку",
            callback_data="midas:purchase_start",
        )
    )

    # Row 3: Manage subscription
    if has_active_sub:
        builder.row(
            InlineKeyboardButton(
                text="⚙️ Управление подпиской",
                callback_data="midas:manage",
            )
        )

    # Row 4: Top-up balance
    builder.row(
        InlineKeyboardButton(
            text="💳 Пополнить",
            callback_data="midas:topup",
        )
    )

    # Row 5: Promo + Referral side by side
    builder.row(
        InlineKeyboardButton(text="🎟 Промокод", callback_data="midas:promo"),
        InlineKeyboardButton(text="🔗 Реферальная система", callback_data="midas:referral"),
    )

    # Row 6: Support + Instructions side by side
    support_btn = (
        InlineKeyboardButton(text="🛟 Поддержка", url=settings.SUPPORT_LINK)
        if settings.SUPPORT_LINK
        else InlineKeyboardButton(text="🛟 Поддержка", callback_data="midas:support")
    )
    builder.row(
        support_btn,
        InlineKeyboardButton(text="📖 Инструкция", callback_data="midas:instructions"),
    )

    # Row 7: Open WebApp
    if settings.SUBSCRIPTION_MINI_APP_URL:
        builder.row(
            InlineKeyboardButton(
                text="🚀 Открыть приложение",
                web_app=WebAppInfo(url=settings.SUBSCRIPTION_MINI_APP_URL),
            )
        )
    else:
        builder.row(
            InlineKeyboardButton(
                text="🚀 Открыть приложение",
                callback_data="midas:webapp_unavailable",
            )
        )

    return builder.as_markup()


async def send_midas_main_menu(
    event: Union[types.Message, types.CallbackQuery],
    settings: Settings,
    subscription_service: SubscriptionService,
    session: AsyncSession,
    is_edit: bool = False,
) -> None:
    user_id = event.from_user.id

    # Fetch subscription details
    try:
        active = await subscription_service.get_active_subscription_details(session, user_id)
    except Exception as exc:
        logging.warning("midas_menu: failed to fetch subscription for %s: %s", user_id, exc)
        active = None

    has_active_sub = active is not None

    # Fetch balance
    try:
        balance_kopecks = await user_billing_dal.get_balance_kopecks(session, user_id)
    except Exception:
        balance_kopecks = 0

    text = build_midas_main_menu_text(user_id, balance_kopecks, active)
    markup = build_midas_main_menu_kb(settings, has_active_sub)

    target_msg: Optional[types.Message] = (
        event.message if isinstance(event, types.CallbackQuery) else event
    )
    if not target_msg:
        return

    try:
        if is_edit:
            await target_msg.edit_text(text, reply_markup=markup, parse_mode="HTML")
        else:
            await target_msg.answer(text, reply_markup=markup, parse_mode="HTML")
    except Exception:
        try:
            await target_msg.answer(text, reply_markup=markup, parse_mode="HTML")
        except Exception as exc2:
            logging.error("midas_menu: could not send menu to %s: %s", user_id, exc2)

    if isinstance(event, types.CallbackQuery):
        try:
            await event.answer()
        except Exception:
            pass


# ─── Callbacks: instructions, webapp unavailable, support fallback ─────────

@router.callback_query(F.data == "midas:instructions")
async def midas_instructions(
    callback: types.CallbackQuery,
    settings: Settings,
    subscription_service: SubscriptionService,
    session: AsyncSession,
    **kwargs,
):
    await callback.answer()
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:main_menu")],
    ])
    text = (
        "📖 <b>Инструкция по подключению</b>\n\n"
        "1. Нажмите <b>⚡ Авто-импорт</b> или скопируйте ссылку подписки\n"
        "2. Установите приложение (Hiddify / v2rayNG / Shadowrocket)\n"
        "3. Вставьте ссылку в приложение\n"
        "4. Выберите сервер и подключитесь\n\n"
        "Если возникли проблемы — обратитесь в <b>🛟 Поддержку</b>."
    )
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data == "midas:support")
async def midas_support_fallback(
    callback: types.CallbackQuery,
    **kwargs,
):
    await callback.answer("Обратитесь в поддержку через кнопку.", show_alert=True)


@router.callback_query(F.data == "midas:webapp_unavailable")
async def midas_webapp_unavailable(
    callback: types.CallbackQuery,
    **kwargs,
):
    await callback.answer("Web-приложение временно недоступно.", show_alert=True)


@router.callback_query(F.data == "midas:main_menu")
async def midas_back_to_main(
    callback: types.CallbackQuery,
    settings: Settings,
    subscription_service: SubscriptionService,
    session: AsyncSession,
    **kwargs,
):
    await send_midas_main_menu(callback, settings, subscription_service, session, is_edit=True)


@router.callback_query(F.data == "midas:auto_import")
async def midas_auto_import(
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
    except Exception:
        active = None

    if not active:
        await callback.answer("Нет активной подписки для авто-импорта.", show_alert=True)
        return

    config_link = active.get("config_link") or active.get("subscription_url")
    connect_url = active.get("connect_button_url") or config_link

    if not config_link:
        await callback.answer("Ссылка подписки недоступна. Обратитесь в поддержку.", show_alert=True)
        return

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔗 Открыть в приложении", url=connect_url)] if connect_url else [],
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:main_menu")],
    ])
    text = (
        f"⚡ <b>Авто-импорт</b>\n\n"
        f"Ваша ссылка подписки:\n"
        f"<code>{config_link}</code>\n\n"
        f"Нажмите кнопку ниже или скопируйте ссылку вручную."
    )
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")
