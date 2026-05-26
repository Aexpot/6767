"""
MidasVPN-style promo code handler.

Экран промокодов:
  🔑 Ввести промокод
  🎁 Получить бонусные дни

При активации показывает все бонусы:
  • Бонусные дни
  • Скидка %
  • Бонус на баланс
  • Дополнительный трафик
"""
from __future__ import annotations

import logging
import re
from typing import Optional

from aiogram import F, Router, types
from aiogram.fsm.context import FSMContext
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy.ext.asyncio import AsyncSession

from bot.services.promo_code_service import PromoCodeService
from bot.states.user_states import UserPromoStates
from config.settings import Settings

router = Router(name="midas_promo_router")

SUSPICIOUS_SQL_RE = re.compile(
    r"\b(DROP\s*TABLE|DELETE\s*FROM|ALTER\s*TABLE|TRUNCATE\s*TABLE|UNION\s*SELECT|"
    r";\s*SELECT|;\s*INSERT|;\s*UPDATE|;\s*DELETE|xp_cmdshell|sysdatabases|sysobjects|INFORMATION_SCHEMA)\b",
    re.IGNORECASE,
)
SUSPICIOUS_CHARS_RE = re.compile(r"(--|#\s|;|\*\/|\/\*)")
MAX_CODE_LEN = 64


def _promo_menu_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔑 Ввести промокод",    callback_data="midas_promo:enter")],
        [InlineKeyboardButton(text="🎁 Получить бонусные дни", callback_data="midas_promo:bonus_days_info")],
        [InlineKeyboardButton(text="⬅️ Назад",              callback_data="midas:main_menu")],
    ])


def _cancel_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ Отмена", callback_data="midas:promo")],
    ])


# ─── Promo main screen ────────────────────────────────────────────────────────

@router.callback_query(F.data == "midas:promo")
async def promo_menu(
    callback: types.CallbackQuery,
    state: FSMContext,
    **kwargs,
):
    await callback.answer()
    await state.clear()
    text = (
        "🎟 <b>Промокоды</b>\n\n"
        "Активируйте промокод и получите:\n"
        "  • Бонусные дни к подписке\n"
        "  • Скидку на следующую покупку\n"
        "  • Пополнение баланса\n"
        "  • Дополнительный трафик"
    )
    try:
        await callback.message.edit_text(text, reply_markup=_promo_menu_kb(), parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=_promo_menu_kb(), parse_mode="HTML")


# ─── Enter promo code ─────────────────────────────────────────────────────────

@router.callback_query(F.data == "midas_promo:enter")
async def promo_enter_prompt(
    callback: types.CallbackQuery,
    state: FSMContext,
    **kwargs,
):
    await callback.answer()
    await state.set_state(UserPromoStates.waiting_for_promo_code)
    text = "🔑 <b>Введите промокод:</b>"
    try:
        await callback.message.edit_text(text, reply_markup=_cancel_kb(), parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=_cancel_kb(), parse_mode="HTML")


@router.message(UserPromoStates.waiting_for_promo_code, F.text)
async def promo_code_input(
    message: types.Message,
    state: FSMContext,
    settings: Settings,
    promo_code_service: PromoCodeService,
    session: AsyncSession,
    i18n_data: dict,
    **kwargs,
):
    code = (message.text or "").strip()
    current_lang = i18n_data.get("current_language", settings.DEFAULT_LANGUAGE)

    # Basic sanity check
    if (
        not code
        or len(code) > MAX_CODE_LEN
        or SUSPICIOUS_SQL_RE.search(code)
        or SUSPICIOUS_CHARS_RE.search(code)
    ):
        kb = _cancel_kb()
        await message.answer(
            "⚠️ Некорректный промокод. Попробуйте ещё раз.",
            reply_markup=kb,
        )
        return

    # Use extended method for MidasVPN-style result
    if hasattr(promo_code_service, "apply_promo_extended"):
        result = await promo_code_service.apply_promo_extended(
            session, message.from_user.id, code, current_lang
        )
        await session.commit()

        if result.success:
            end_str = result.new_end_date.strftime("%d.%m.%Y") if result.new_end_date else None
            header = "✅ <b>Промокод активирован!</b>\n\n"
            footer = ""
            if end_str:
                footer = f"\n\n📅 Подписка активна до: <b>{end_str}</b>"
            text = header + result.message + footer
        else:
            text = f"❌ {result.message}"
    else:
        # Fallback to original method
        success, result_raw = await promo_code_service.apply_promo_code(
            session, message.from_user.id, code, current_lang
        )
        await session.commit()
        if success:
            end_str = result_raw.strftime("%d.%m.%Y") if hasattr(result_raw, "strftime") else str(result_raw)
            text = f"✅ <b>Промокод активирован!</b>\n\n📅 Подписка до: <b>{end_str}</b>"
        else:
            text = f"❌ {result_raw}"

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="midas:main_menu")],
        [InlineKeyboardButton(text="🎟 Ещё промокод",  callback_data="midas:promo")],
    ])
    await state.clear()
    await message.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── Bonus days info ──────────────────────────────────────────────────────────

@router.callback_query(F.data == "midas_promo:bonus_days_info")
async def promo_bonus_days_info(
    callback: types.CallbackQuery,
    **kwargs,
):
    await callback.answer()
    text = (
        "🎁 <b>Бонусные дни</b>\n\n"
        "Бонусные дни добавляются к текущей или следующей подписке автоматически при активации промокода.\n\n"
        "Промокоды бывают:\n"
        "  🎁 <b>Бонусные дни</b> — продлевают срок\n"
        "  💸 <b>Скидка %</b>     — снижают стоимость\n"
        "  💰 <b>Баланс</b>       — пополняют кошелёк\n"
        "  📦 <b>Трафик</b>       — добавляют ГБ\n\n"
        "Используйте кнопку <b>🔑 Ввести промокод</b> для активации."
    )
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔑 Ввести промокод", callback_data="midas_promo:enter")],
        [InlineKeyboardButton(text="⬅️ Назад",          callback_data="midas:promo")],
    ])
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")
