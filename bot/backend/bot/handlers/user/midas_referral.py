"""
MidasVPN-style referral system handler.

Экран реферальной системы:
  • Реферальная ссылка
  • Количество приглашённых
  • Заработано (в ₽ и бонусных днях)
  • Бонусные дни
  • Вывод дохода

Кнопки:
  ✉️ Пригласить
  💰 Вывести доход
"""
from __future__ import annotations

import logging
from typing import Optional

from aiogram import Bot, F, Router, types
from aiogram.fsm.context import FSMContext
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy.ext.asyncio import AsyncSession

from bot.services.referral_service import ReferralService
from bot.states.user_states import MidasWithdrawStates
from config.settings import Settings
from db.dal import user_billing_dal

router = Router(name="midas_referral_router")


# ─── Main referral screen ─────────────────────────────────────────────────────

@router.callback_query(F.data == "midas:referral")
async def referral_menu(
    callback: types.CallbackQuery,
    settings: Settings,
    referral_service: ReferralService,
    bot: Bot,
    session: AsyncSession,
    state: FSMContext,
    **kwargs,
):
    await callback.answer()
    await state.clear()

    user_id = callback.from_user.id

    # Get bot username for link
    try:
        bot_info = await bot.get_me()
        bot_username = bot_info.username or "bot"
    except Exception:
        bot_username = "bot"

    referral_link = await referral_service.generate_referral_link(
        session, bot_username, user_id
    )

    # Get stats
    try:
        stats = await referral_service.get_referral_stats(session, user_id)
        invited_count = stats.get("invited_count", 0)
        purchased_count = stats.get("purchased_count", 0)
    except Exception:
        invited_count = 0
        purchased_count = 0

    # Get earnings from billing
    try:
        billing = await user_billing_dal.get_user_billing(session, user_id)
        earned_kopecks = billing.referral_earned_kopecks if billing else 0
        pending_withdrawal = billing.referral_withdrawal_pending_kopecks if billing else 0
    except Exception:
        earned_kopecks = 0
        pending_withdrawal = 0

    earned_rub = earned_kopecks / 100
    pending_rub = pending_withdrawal / 100

    # Build bonus days info from settings
    bonus_lines = []
    if settings.subscription_options:
        for months in sorted(settings.subscription_options.keys()):
            inv = settings.referral_bonus_inviter.get(months)
            ref = settings.referral_bonus_referee.get(months)
            if inv or ref:
                bonus_lines.append(
                    f"  За {months} мес.: вы +{inv or 0} дн., друг +{ref or 0} дн."
                )

    bonus_text = "\n".join(bonus_lines) if bonus_lines else "  Бонусная программа не настроена"

    link_display = referral_link or "недоступна"
    text = (
        f"🔗 <b>Реферальная система</b>\n\n"
        f"👥 Приглашено: <b>{invited_count}</b>\n"
        f"💳 Купили подписку: <b>{purchased_count}</b>\n"
        f"💰 Заработано: <b>{earned_rub:.2f} ₽</b>\n"
        f"⏳ Ожидает вывода: <b>{pending_rub:.2f} ₽</b>\n\n"
        f"🔗 Ваша ссылка:\n<code>{link_display}</code>\n\n"
        f"🎁 <b>Бонусы за приглашения:</b>\n{bonus_text}"
    )

    can_withdraw = earned_kopecks > 0 and earned_kopecks > pending_withdrawal

    kb_rows = [
        [InlineKeyboardButton(text="✉️ Пригласить", callback_data="midas_ref:invite")],
    ]
    if can_withdraw:
        kb_rows.append([InlineKeyboardButton(text="💰 Вывести доход", callback_data="midas_ref:withdraw")])
    kb_rows.append([InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:main_menu")])
    kb = InlineKeyboardMarkup(inline_keyboard=kb_rows)

    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


# ─── Invite ───────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "midas_ref:invite")
async def referral_invite(
    callback: types.CallbackQuery,
    settings: Settings,
    referral_service: ReferralService,
    bot: Bot,
    session: AsyncSession,
    **kwargs,
):
    await callback.answer()
    user_id = callback.from_user.id

    try:
        bot_info = await bot.get_me()
        bot_username = bot_info.username or "bot"
    except Exception:
        bot_username = "bot"

    referral_link = await referral_service.generate_referral_link(session, bot_username, user_id)
    if not referral_link:
        await callback.answer("Не удалось сгенерировать ссылку.", show_alert=True)
        return

    friend_text = (
        f"🚀 Привет! Попробуй этот VPN-сервис — быстрый, надёжный и доступный!\n\n"
        f"🎁 По моей ссылке тебе дадут бонусные дни к подписке!\n\n"
        f"{referral_link}"
    )

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="midas:referral")],
    ])

    await callback.message.answer(friend_text, reply_markup=kb, disable_web_page_preview=True)


# ─── Withdraw ─────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "midas_ref:withdraw")
async def referral_withdraw_menu(
    callback: types.CallbackQuery,
    session: AsyncSession,
    state: FSMContext,
    **kwargs,
):
    await callback.answer()

    user_id = callback.from_user.id
    try:
        billing = await user_billing_dal.get_user_billing(session, user_id)
        earned_kopecks = billing.referral_earned_kopecks if billing else 0
        pending_kopecks = billing.referral_withdrawal_pending_kopecks if billing else 0
    except Exception:
        earned_kopecks = 0
        pending_kopecks = 0

    available_kopecks = max(0, earned_kopecks - pending_kopecks)
    available_rub = available_kopecks / 100

    if available_kopecks <= 0:
        await callback.answer("Нет доступных средств для вывода.", show_alert=True)
        return

    await state.set_state(MidasWithdrawStates.entering_details)
    await state.update_data(withdraw_kopecks=available_kopecks)

    text = (
        f"💰 <b>Вывод реферального дохода</b>\n\n"
        f"Доступно для вывода: <b>{available_rub:.2f} ₽</b>\n\n"
        f"Введите реквизиты для перевода\n"
        f"(номер карты, СБП или кошелёк):\n\n"
        f"<i>Выплаты обрабатываются вручную в течение 1-3 рабочих дней.</i>"
    )
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ Отмена", callback_data="midas:referral")],
    ])
    try:
        await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        await callback.message.answer(text, reply_markup=kb, parse_mode="HTML")


@router.message(MidasWithdrawStates.entering_details, F.text)
async def referral_withdraw_details(
    message: types.Message,
    state: FSMContext,
    session: AsyncSession,
    bot: Bot,
    settings: Settings,
    **kwargs,
):
    data = await state.get_data()
    withdraw_kopecks = data.get("withdraw_kopecks", 0)
    details = (message.text or "").strip()
    user_id = message.from_user.id

    await state.clear()

    if not details or len(details) < 5:
        await message.answer(
            "❌ Некорректные реквизиты. Попробуйте снова.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🏠 Главное меню", callback_data="midas:main_menu")],
            ]),
        )
        return

    # Mark pending withdrawal
    try:
        billing = await user_billing_dal.ensure_user_billing(session, user_id)
        billing.referral_withdrawal_pending_kopecks = (
            (billing.referral_withdrawal_pending_kopecks or 0) + withdraw_kopecks
        )
        await session.flush()
        await session.commit()
    except Exception as exc:
        logging.error("withdraw: DB error for user %s: %s", user_id, exc)
        await message.answer("❌ Ошибка. Попробуйте позже.")
        return

    withdraw_rub = withdraw_kopecks / 100

    # Notify admins
    for admin_id in settings.ADMIN_IDS:
        try:
            await bot.send_message(
                admin_id,
                f"💰 <b>Запрос на вывод реферального дохода</b>\n\n"
                f"Пользователь: <code>{user_id}</code>\n"
                f"Сумма: <b>{withdraw_rub:.2f} ₽</b>\n"
                f"Реквизиты: <code>{details}</code>",
                parse_mode="HTML",
            )
        except Exception:
            pass

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="midas:main_menu")],
    ])
    await message.answer(
        f"✅ <b>Заявка на вывод принята!</b>\n\n"
        f"Сумма: <b>{withdraw_rub:.2f} ₽</b>\n"
        f"Реквизиты: <code>{details}</code>\n\n"
        f"Выплата будет произведена в течение 1-3 рабочих дней.",
        reply_markup=kb,
        parse_mode="HTML",
    )
