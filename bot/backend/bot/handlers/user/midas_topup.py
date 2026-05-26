"""
MidasVPN-style balance top-up handler.

💳 Пополнить баланс:
  Шаг 1 — выбор суммы (100, 300, 500, 1000, 2000 ₽ или произвольная)
  Шаг 2 — выбор метода оплаты (YouMoney / CryptoBot / другие)
  Шаг 3 — ссылка на оплату

После успешной оплаты — баланс пополняется автоматически (через webhook).
"""
from __future__ import annotations

import logging
import uuid
from typing import Optional

from aiogram import F, Router, types
from aiogram.fsm.context import FSMContext
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy.ext.asyncio import AsyncSession

from bot.states.user_states import MidasTopupStates
from config.settings import Settings
from db.dal import user_billing_dal

router = Router(name="midas_topup_router")

TOPUP_AMOUNTS = [100, 300, 500, 1000, 2000]


def _topup_amounts_kb() -> InlineKeyboardMarkup:
    builder_rows = []
    # Two amounts per row
    for i in range(0, len(TOPUP_AMOUNTS), 2):
        row = []
        for amount in TOPUP_AMOUNTS[i:i+2]:
            row.append(InlineKeyboardButton(
                text=f"{amount} ₽",
                callback_data=f"midas_topup:amount:{amount}",
            ))
        builder_rows.append(row)
    builder_rows.append([InlineKeyboardButton(text="✏️ Другая сумма", callback_data="midas_topup:custom")])
    builder_rows.append([InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:main_menu")])
    return InlineKeyboardMarkup(inline_keyboard=builder_rows)


def _payment_method_kb(amount: int, settings: Settings) -> InlineKeyboardMarkup:
    rows = []

    # YouMoney
    try:
        from bot.payment_providers.youmoney import YouMoneyConfig
        ym_cfg = YouMoneyConfig()
        if ym_cfg.ENABLED and ym_cfg.WALLET:
            from urllib.parse import urlencode
            label = f"topup_{uuid.uuid4().hex[:12]}"
            params = {
                "receiver": ym_cfg.WALLET,
                "quickpay-form": "shop",
                "targets": "Пополнение баланса VPN",
                "paymentType": "AC",
                "sum": str(amount),
                "label": label,
            }
            url = f"https://yoomoney.ru/quickpay/confirm?{urlencode(params)}"
            rows.append([InlineKeyboardButton(text="💛 ЮMoney", url=url)])
    except Exception:
        pass

    # CryptoBot (inline — no direct URL, handled by bot)
    try:
        from bot.payment_providers.cryptopay import CryptoPayConfig
        cp_cfg = CryptoPayConfig()
        if cp_cfg.ENABLED and cp_cfg.TOKEN:
            rows.append([InlineKeyboardButton(
                text="₿ CryptoBot",
                callback_data=f"midas_topup:pay_crypto:{amount}",
            )])
    except Exception:
        pass

    rows.append([InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:topup")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


# ─── Topup main screen ────────────────────────────────────────────────────────

@router.callback_query(F.data == "midas:topup")
async def topup_menu(
    callback: types.CallbackQuery,
    state: FSMContext,
    session: AsyncSession,
    **kwargs,
):
    await callback.answer()
    await state.clear()

    user_id = callback.from_user.id
    balance_kopecks = await user_billing_dal.get_balance_kopecks(session, user_id)
    balance_rub = balance_kopecks / 100

    text = (
        f"💳 <b>Пополнение баланса</b>\n\n"
        f"Текущий баланс: <b>{balance_rub:.2f} ₽</b>\n\n"
        f"Выберите сумму пополнения:"
    )
    try:
        await callback.message.edit_text(text, reply_markup=_topup_amounts_kb(), parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=_topup_amounts_kb(), parse_mode="HTML")


# ─── Choose amount ────────────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("midas_topup:amount:"))
async def topup_amount_chosen(
    callback: types.CallbackQuery,
    state: FSMContext,
    settings: Settings,
    **kwargs,
):
    await callback.answer()
    amount = int(callback.data.split(":")[2])
    await state.update_data(topup_amount=amount)
    await state.set_state(MidasTopupStates.waiting_payment)

    text = (
        f"💳 <b>Пополнение баланса</b>\n\n"
        f"Сумма: <b>{amount} ₽</b>\n\n"
        f"Выберите способ оплаты:"
    )
    kb = _payment_method_kb(amount, settings)
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data == "midas_topup:custom")
async def topup_custom_prompt(
    callback: types.CallbackQuery,
    state: FSMContext,
    **kwargs,
):
    await callback.answer()
    await state.set_state(MidasTopupStates.choosing_amount)
    text = "✏️ Введите сумму пополнения в рублях (минимум 50 ₽):"
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ Отмена", callback_data="midas:topup")],
    ])
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


@router.message(MidasTopupStates.choosing_amount, F.text)
async def topup_custom_amount_input(
    message: types.Message,
    state: FSMContext,
    settings: Settings,
    **kwargs,
):
    text_input = (message.text or "").strip().replace(",", ".")
    try:
        amount = int(float(text_input))
    except ValueError:
        await message.answer(
            "❌ Введите число (например: 500)",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="❌ Отмена", callback_data="midas:topup")],
            ]),
        )
        return

    if amount < 50:
        await message.answer(
            "❌ Минимальная сумма пополнения — 50 ₽",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:topup")],
            ]),
        )
        return

    await state.update_data(topup_amount=amount)
    await state.set_state(MidasTopupStates.waiting_payment)

    text = (
        f"💳 <b>Пополнение баланса</b>\n\n"
        f"Сумма: <b>{amount} ₽</b>\n\n"
        f"Выберите способ оплаты:"
    )
    kb = _payment_method_kb(amount, settings)
    await message.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── CryptoBot topup (simple flow via invoice) ────────────────────────────────

@router.callback_query(F.data.startswith("midas_topup:pay_crypto:"))
async def topup_cryptobot(
    callback: types.CallbackQuery,
    state: FSMContext,
    session: AsyncSession,
    **kwargs,
):
    await callback.answer()
    amount = int(callback.data.split(":")[2])
    user_id = callback.from_user.id

    text = (
        f"₿ <b>Оплата через CryptoBot</b>\n\n"
        f"Сумма: <b>{amount} ₽</b>\n\n"
        f"Для оплаты через криптовалюту используйте стандартный способ оплаты в разделе подписок.\n\n"
        f"<i>Прямые crypto-платежи для пополнения баланса будут доступны в следующей версии.</i>"
    )
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🛒 Купить подписку (с криптой)", callback_data="main_action:subscribe")],
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:topup")],
    ])
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── Manual credit (for admin-issued or webhook-confirmed top-ups) ─────────────

async def credit_balance_topup(
    session: AsyncSession,
    user_id: int,
    amount_rub: float,
) -> int:
    """Credit balance after successful payment. Returns new balance in kopecks."""
    kopecks = int(amount_rub * 100)
    return await user_billing_dal.add_balance_kopecks(session, user_id, kopecks)
