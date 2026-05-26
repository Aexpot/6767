"""
MidasVPN-style purchase flow.

Шаги:
  1. Выбор срока:     1 / 3 / 6 / 12 месяцев
  2. Выбор устройств: 3 (базовые) / +1 / +2 / +3 / +4 / +5 / +10
  3. Выбор трафика:   50 ГБ / +10 / +25 / +50 / +100 ГБ
  4. Подтверждение:   сумма, кол-во устройств, ГБ → кнопка оплаты
  5. Ошибка нехватки средств: красный текст + кнопка пополнить

Хранение промежуточного состояния — FSMContext (MidasPurchaseStates).
"""
from __future__ import annotations

import logging
from typing import Optional

from aiogram import F, Router, types
from aiogram.fsm.context import FSMContext
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder
from sqlalchemy.ext.asyncio import AsyncSession

from bot.states.user_states import MidasPurchaseStates
from config.settings import Settings
from db.dal import user_billing_dal

router = Router(name="midas_purchase_router")

# ─── constants ────────────────────────────────────────────────────────────────

BASE_DEVICES = 3
BASE_TRAFFIC_GB = 50

# Extra device options and their price per month (RUB)
DEVICE_EXTRA_OPTIONS = [0, 1, 2, 3, 4, 5, 10]          # 0 = базовые 3
DEVICE_EXTRA_PRICE_PER_MONTH = 30                         # руб. за каждое доп. устройство в месяц

# Extra traffic options in GB
TRAFFIC_EXTRA_OPTIONS = [0, 10, 25, 50, 100]             # 0 = базовые 50 ГБ
TRAFFIC_EXTRA_PRICE_PER_GB = 1.5                          # руб. за каждый доп. ГБ в месяц

# ─── helpers ──────────────────────────────────────────────────────────────────

PERIOD_LABELS = {1: "1 месяц", 3: "3 месяца", 6: "6 месяцев", 12: "12 месяцев"}
PERIOD_DISCOUNT = {1: 0, 3: 5, 6: 10, 12: 20}   # % скидки за длинный срок


def _calc_price(
    months: int,
    extra_devices: int,
    extra_gb: int,
    base_monthly_rub: float,
) -> float:
    """Calculate total price in RUB."""
    monthly = (
        base_monthly_rub
        + extra_devices * DEVICE_EXTRA_PRICE_PER_MONTH
        + extra_gb * TRAFFIC_EXTRA_PRICE_PER_GB
    )
    total = monthly * months
    discount = PERIOD_DISCOUNT.get(months, 0)
    return round(total * (1 - discount / 100), 2)


def _get_base_monthly_price(settings: Settings, months: int) -> Optional[float]:
    prices = {
        1: settings.RUB_PRICE_1_MONTH,
        3: settings.RUB_PRICE_3_MONTHS,
        6: settings.RUB_PRICE_6_MONTHS,
        12: settings.RUB_PRICE_12_MONTHS,
    }
    val = prices.get(months)
    return float(val) if val is not None else None


# ─── Step 1: Choose period ────────────────────────────────────────────────────

def _period_kb(settings: Settings) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for months in [1, 3, 6, 12]:
        price = _get_base_monthly_price(settings, months)
        if price is None:
            continue
        total = _calc_price(months, 0, 0, price)
        disc = PERIOD_DISCOUNT.get(months, 0)
        label = PERIOD_LABELS[months]
        if disc:
            btn_text = f"{label} — {int(total)} ₽ (−{disc}%)"
        else:
            btn_text = f"{label} — {int(total)} ₽"
        builder.row(
            InlineKeyboardButton(
                text=btn_text,
                callback_data=f"midas_buy:period:{months}",
            )
        )
    builder.row(
        InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:main_menu")
    )
    return builder.as_markup()


@router.callback_query(F.data == "midas:purchase_start")
async def purchase_start(
    callback: types.CallbackQuery,
    state: FSMContext,
    settings: Settings,
    **kwargs,
):
    await callback.answer()
    await state.clear()
    await state.set_state(MidasPurchaseStates.choosing_period)

    text = (
        "🛒 <b>Оформление подписки</b>\n\n"
        "<b>Шаг 1 из 3</b> — Выберите срок подписки:"
    )
    kb = _period_kb(settings)
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── Step 2: Choose devices ───────────────────────────────────────────────────

def _devices_kb(months: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    options = [
        (0,  f"📱 {BASE_DEVICES} устройства (базовые)"),
        (1,  f"📱 {BASE_DEVICES+1} устройства (+1) — +{DEVICE_EXTRA_PRICE_PER_MONTH * months} ₽"),
        (2,  f"📱 {BASE_DEVICES+2} устройства (+2) — +{DEVICE_EXTRA_PRICE_PER_MONTH*2 * months} ₽"),
        (3,  f"📱 {BASE_DEVICES+3} устройств (+3)  — +{DEVICE_EXTRA_PRICE_PER_MONTH*3 * months} ₽"),
        (4,  f"📱 {BASE_DEVICES+4} устройств (+4)  — +{DEVICE_EXTRA_PRICE_PER_MONTH*4 * months} ₽"),
        (5,  f"📱 {BASE_DEVICES+5} устройств (+5)  — +{DEVICE_EXTRA_PRICE_PER_MONTH*5 * months} ₽"),
        (10, f"📱 {BASE_DEVICES+10} устройств (+10) — +{DEVICE_EXTRA_PRICE_PER_MONTH*10 * months} ₽"),
    ]
    for extra, label in options:
        builder.row(
            InlineKeyboardButton(
                text=label,
                callback_data=f"midas_buy:devices:{extra}",
            )
        )
    builder.row(
        InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:purchase_start")
    )
    return builder.as_markup()


@router.callback_query(F.data.startswith("midas_buy:period:"))
async def purchase_period_chosen(
    callback: types.CallbackQuery,
    state: FSMContext,
    settings: Settings,
    **kwargs,
):
    await callback.answer()
    months = int(callback.data.split(":")[2])
    price = _get_base_monthly_price(settings, months)
    if price is None:
        await callback.answer("Этот период недоступен.", show_alert=True)
        return

    await state.update_data(months=months, base_monthly=price)
    await state.set_state(MidasPurchaseStates.choosing_devices)

    text = (
        f"🛒 <b>Оформление подписки</b>\n\n"
        f"Срок: <b>{PERIOD_LABELS[months]}</b>\n\n"
        f"<b>Шаг 2 из 3</b> — Выберите количество устройств:"
    )
    kb = _devices_kb(months)
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── Step 3: Choose traffic ───────────────────────────────────────────────────

def _traffic_kb(months: int, extra_devices: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    options = [
        (0,   f"📦 {BASE_TRAFFIC_GB} ГБ (базовые)"),
        (10,  f"📦 {BASE_TRAFFIC_GB+10} ГБ (+10 ГБ) — +{round(TRAFFIC_EXTRA_PRICE_PER_GB*10 * months)} ₽"),
        (25,  f"📦 {BASE_TRAFFIC_GB+25} ГБ (+25 ГБ) — +{round(TRAFFIC_EXTRA_PRICE_PER_GB*25 * months)} ₽"),
        (50,  f"📦 {BASE_TRAFFIC_GB+50} ГБ (+50 ГБ) — +{round(TRAFFIC_EXTRA_PRICE_PER_GB*50 * months)} ₽"),
        (100, f"📦 {BASE_TRAFFIC_GB+100} ГБ (+100 ГБ) — +{round(TRAFFIC_EXTRA_PRICE_PER_GB*100 * months)} ₽"),
    ]
    for extra_gb, label in options:
        builder.row(
            InlineKeyboardButton(
                text=label,
                callback_data=f"midas_buy:traffic:{extra_gb}",
            )
        )
    builder.row(
        InlineKeyboardButton(
            text="⬅️ Назад",
            callback_data=f"midas_buy:period:{months}",
        )
    )
    return builder.as_markup()


@router.callback_query(F.data.startswith("midas_buy:devices:"))
async def purchase_devices_chosen(
    callback: types.CallbackQuery,
    state: FSMContext,
    **kwargs,
):
    await callback.answer()
    extra_devices = int(callback.data.split(":")[2])
    data = await state.get_data()
    months = data.get("months", 1)
    base_monthly = data.get("base_monthly", 0)

    await state.update_data(extra_devices=extra_devices)
    await state.set_state(MidasPurchaseStates.choosing_traffic)

    total_devices = BASE_DEVICES + extra_devices
    text = (
        f"🛒 <b>Оформление подписки</b>\n\n"
        f"Срок: <b>{PERIOD_LABELS[months]}</b>\n"
        f"Устройств: <b>{total_devices}</b>\n\n"
        f"<b>Шаг 3 из 3</b> — Выберите пакет трафика:"
    )
    kb = _traffic_kb(months, extra_devices)
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── Step 4: Confirmation ─────────────────────────────────────────────────────

def _confirm_kb(total_rub: float, has_enough: bool, balance_rub: float) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    if has_enough:
        builder.row(
            InlineKeyboardButton(
                text=f"✅ Оплатить с баланса ({total_rub:.0f} ₽)",
                callback_data="midas_buy:pay_balance",
            )
        )
    else:
        needed = total_rub - balance_rub
        builder.row(
            InlineKeyboardButton(
                text=f"💳 Пополнить баланс (+{needed:.0f} ₽)",
                callback_data="midas:topup",
            )
        )
        builder.row(
            InlineKeyboardButton(
                text=f"💳 Оплатить картой ({total_rub:.0f} ₽)",
                callback_data="midas_buy:pay_card",
            )
        )
    builder.row(
        InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:purchase_start")
    )
    return builder.as_markup()


@router.callback_query(F.data.startswith("midas_buy:traffic:"))
async def purchase_traffic_chosen(
    callback: types.CallbackQuery,
    state: FSMContext,
    settings: Settings,
    session: AsyncSession,
    **kwargs,
):
    await callback.answer()
    extra_gb = int(callback.data.split(":")[2])
    data = await state.get_data()
    months = data.get("months", 1)
    base_monthly = data.get("base_monthly", 0.0)
    extra_devices = data.get("extra_devices", 0)

    await state.update_data(extra_gb=extra_gb)
    await state.set_state(MidasPurchaseStates.confirming)

    total_price = _calc_price(months, extra_devices, extra_gb, base_monthly)
    total_devices = BASE_DEVICES + extra_devices
    total_gb = BASE_TRAFFIC_GB + extra_gb

    user_id = callback.from_user.id
    balance_kopecks = await user_billing_dal.get_balance_kopecks(session, user_id)
    balance_rub = balance_kopecks / 100
    has_enough = balance_rub >= total_price

    await state.update_data(total_price=total_price)

    if has_enough:
        balance_note = f"💰 Баланс: {balance_rub:.2f} ₽ — достаточно для оплаты"
        balance_style = ""
    else:
        needed = total_price - balance_rub
        balance_note = (
            f"❌ <b>Недостаточно средств!</b>\n"
            f"На балансе: {balance_rub:.2f} ₽\n"
            f"Не хватает: <b>{needed:.2f} ₽</b>"
        )
        balance_style = "\n\n" + balance_note

    text = (
        f"🛒 <b>Подтверждение заказа</b>\n\n"
        f"📅 Срок: <b>{PERIOD_LABELS[months]}</b>\n"
        f"📱 Устройств: <b>{total_devices}</b>\n"
        f"📦 Трафик: <b>{total_gb} ГБ</b>\n"
        f"💵 Стоимость: <b>{total_price:.0f} ₽</b>"
        f"{balance_style}"
    )
    kb = _confirm_kb(total_price, has_enough, balance_rub)
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── Step 5: Pay from balance ─────────────────────────────────────────────────

@router.callback_query(F.data == "midas_buy:pay_balance", MidasPurchaseStates.confirming)
async def purchase_pay_balance(
    callback: types.CallbackQuery,
    state: FSMContext,
    settings: Settings,
    session: AsyncSession,
    subscription_service,
    **kwargs,
):
    await callback.answer()
    data = await state.get_data()
    total_price = data.get("total_price", 0.0)
    months = data.get("months", 1)
    extra_devices = data.get("extra_devices", 0)
    extra_gb = data.get("extra_gb", 0)
    user_id = callback.from_user.id

    amount_kopecks = int(total_price * 100)
    success = await user_billing_dal.deduct_balance_kopecks(session, user_id, amount_kopecks)

    if not success:
        balance_kopecks = await user_billing_dal.get_balance_kopecks(session, user_id)
        needed = total_price - balance_kopecks / 100
        text = (
            f"❌ <b>Недостаточно средств на балансе.</b>\n\n"
            f"Требуется: <b>{total_price:.0f} ₽</b>\n"
            f"На балансе: <b>{balance_kopecks/100:.2f} ₽</b>\n"
            f"Не хватает: <b>{needed:.2f} ₽</b>\n\n"
            f"Пополните баланс и попробуйте снова."
        )
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="💳 Пополнить баланс", callback_data="midas:topup")],
            [InlineKeyboardButton(text="⬅️ В главное меню", callback_data="midas:main_menu")],
        ])
        try:
            await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
        except Exception:
            await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")
        return

    # Activate subscription via subscription_service
    try:
        total_devices = BASE_DEVICES + extra_devices
        total_gb_bytes = (BASE_TRAFFIC_GB + extra_gb) * 1024 ** 3
        result = await subscription_service.create_or_extend_subscription(
            session,
            user_id=user_id,
            months=months,
            traffic_limit_bytes=total_gb_bytes,
            hwid_device_limit=total_devices,
            provider="balance",
            amount=total_price,
        )
        await session.commit()
        config_link = result.get("config_link") if result else None
        connect_url = result.get("connect_button_url") if result else config_link
        end_date = result.get("end_date") if result else None
        end_str = end_date.strftime("%d.%m.%Y") if end_date else "—"

        kb_rows = []
        if connect_url:
            kb_rows.append([InlineKeyboardButton(text="🔗 Подключиться", url=connect_url)])
        kb_rows.append([InlineKeyboardButton(text="🏠 Главное меню", callback_data="midas:main_menu")])
        kb = InlineKeyboardMarkup(inline_keyboard=kb_rows)

        text = (
            f"✅ <b>Подписка активирована!</b>\n\n"
            f"📅 До: <b>{end_str}</b>\n"
            f"📱 Устройств: <b>{total_devices}</b>\n"
            f"📦 Трафик: <b>{BASE_TRAFFIC_GB + extra_gb} ГБ</b>\n\n"
            f"Ключ подключения:\n"
            f"<code>{config_link or 'обратитесь в поддержку'}</code>"
        )
    except Exception as exc:
        logging.error("midas pay_balance: subscription activation error for %s: %s", user_id, exc)
        # Refund if activation failed
        await user_billing_dal.add_balance_kopecks(session, user_id, amount_kopecks)
        await session.commit()
        text = (
            "❌ Ошибка активации подписки. Средства возвращены на баланс.\n"
            "Обратитесь в поддержку."
        )
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🛟 Поддержка", callback_data="midas:support")],
            [InlineKeyboardButton(text="🏠 Главное меню", callback_data="midas:main_menu")],
        ])

    await state.clear()
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data == "midas_buy:pay_card", MidasPurchaseStates.confirming)
async def purchase_pay_card(
    callback: types.CallbackQuery,
    state: FSMContext,
    settings: Settings,
    **kwargs,
):
    """Redirect to existing payment flow via existing providers."""
    await callback.answer()
    data = await state.get_data()
    months = data.get("months", 1)

    # Delegate to existing subscribe flow for card payment
    # We pass the period and clear our state
    await state.clear()
    text = (
        "💳 <b>Оплата картой</b>\n\n"
        "Для оплаты картой используйте раздел <b>🛒 Купить</b> в основном меню.\n"
        "Или воспользуйтесь <b>🚀 Открыть приложение</b> для удобной оплаты."
    )
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🛒 Купить (стандартный поток)", callback_data="main_action:subscribe")],
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:main_menu")],
    ])
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")
