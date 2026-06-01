from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, FSInputFile, Message

from bot.config import Config
from bot.keyboards import (
    BYPASS_BASE_GB,
    BYPASS_PRICE_PER_GB,
    DEVICE_BASE,
    DEVICE_EXTRA_PRICE,
    admin_main_menu,
    admin_users_menu,
    auto_import_menu,
    buy_menu,
    bypass_traffic_menu,
    cancel_menu,
    devices_count_menu,
    devices_menu,
    main_menu,
    payment_choice_menu,
    promo_menu,
    referral_menu,
    reset_link_confirm_menu,
    subscription_menu,
    topup_device_menu,
    topup_gb_menu,
    traffic_menu,
)

log = logging.getLogger(__name__)

ASSETS = Path(__file__).resolve().parent / "assets"
router = Router()
config: Config | None = None


# ── helpers ───────────────────────────────────────────────────────────────────

def _cfg() -> Config:
    assert config is not None
    return config


async def _send(message: Message, image: str, caption: str, markup=None) -> None:
    img = ASSETS / image
    if img.exists():
        await message.answer_photo(FSInputFile(img), caption=caption, reply_markup=markup)
    else:
        await message.answer(caption, reply_markup=markup)


async def _edit(callback: CallbackQuery, image: str, caption: str, markup=None) -> None:
    if callback.message:
        await callback.message.delete()
    await _send(callback.message or callback, image, caption, markup)
    await callback.answer()


async def stub(callback: CallbackQuery, text: str = "Раздел в разработке.") -> None:
    await callback.answer(text, show_alert=True)


def _is_admin(user_id: int) -> bool:
    return user_id in _cfg().admin_ids


def _fmt_months(n: int) -> str:
    if n % 10 == 1 and n % 100 != 11:
        return f"{n} месяц"
    if n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14):
        return f"{n} месяца"
    return f"{n} месяцев"


def _fmt_bytes(b: int) -> str:
    if b == 0:
        return "0 Б"
    for unit, div in (("ТБ", 1 << 40), ("ГБ", 1 << 30), ("МБ", 1 << 20), ("КБ", 1 << 10)):
        if b >= div:
            return f"{b / div:.1f} {unit}"
    return f"{b} Б"


def _fmt_expire(ts: int | None) -> str:
    if not ts:
        return "не задан"
    dt = datetime.fromtimestamp(ts, tz=timezone.utc)
    return dt.strftime("%d.%m.%Y")


def _payment_description(kind: str, months: int, topup_gb: int, topup_devices: int) -> str:
    if kind == "topup_gb":
        return f"ChampionVPN +{topup_gb} ГБ белых списков"
    if kind == "topup_device":
        return f"ChampionVPN +{topup_devices} устройств"
    return f"ChampionVPN {months} мес."


# ── states ────────────────────────────────────────────────────────────────────

class PromoState(StatesGroup):
    waiting_code = State()


class AdminState(StatesGroup):
    broadcast = State()
    find_user = State()
    add_days_id = State()
    add_days_count = State()
    ban_id = State()
    promo_create = State()


class BuyState(StatesGroup):
    waiting_months = State()
    waiting_devices = State()
    waiting_traffic = State()
    waiting_bypass = State()
    waiting_payment = State()


# ── setup ─────────────────────────────────────────────────────────────────────

def setup_handlers(app_config: Config) -> Router:
    global config
    config = app_config
    return router


# ── /start ────────────────────────────────────────────────────────────────────

@router.message(CommandStart())
async def start(message: Message) -> None:
    from bot import db, remnawave as rw_module
    user_id = message.from_user.id
    username = message.from_user.username or ""
    first_name = message.from_user.first_name or ""
    last_name = message.from_user.last_name or ""

    try:
        user = await db.ensure_user(user_id, username, first_name, last_name)
    except Exception:
        log.exception("DB ensure_user failed")
        user = {"balance_rub": 0, "is_banned": False}

    if user.get("is_banned"):
        await message.answer("🚫 Ваш аккаунт заблокирован.")
        return

    try:
        rw = rw_module.get_remnawave()
        sub = await rw.check_subscription(user_id)
    except Exception:
        sub = None

    # Sync user to webapp DB so mini-app can see them
    panel_uuid = (sub or {}).get("uuid", "")  # real Remnawave UUID
    try:
        await db.webapp_sync_user(
            user_id, username, first_name, last_name,
            panel_user_uuid=panel_uuid,
            is_banned=bool(user.get("is_banned")),
        )
    except Exception:
        log.exception("webapp_sync_user failed silently")

    balance = float(user.get("balance_rub") or 0)
    if sub and sub["active"]:
        status_line = f"✅ Активна до {_fmt_expire(int(sub['expires_at'].timestamp()) if sub.get('expires_at') else None)}"
    elif sub:
        status_line = "⏳ Истекла"
    else:
        status_line = "❌ Нет подписки"

    caption = (
        f"👤 <b>Ваш ID:</b> <code>{user_id}</code>\n"
        f"💰 <b>Баланс:</b> {balance:g} ₽\n\n"
        f"❝\n"
        f"Статус: <b>{status_line}</b>\n"
        f"❞"
    )

    await _send(message, "account.png", caption,
                main_menu(_cfg().support_url, _cfg().instruction_url, _cfg().channel_url,
                          _cfg().mini_app_url))


# ── home ──────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "home")
async def home(callback: CallbackQuery) -> None:
    from bot import db, remnawave as rw_module
    user_id = callback.from_user.id
    try:
        user = await db.ensure_user(user_id)
    except Exception:
        user = {"balance_rub": 0}

    try:
        rw = rw_module.get_remnawave()
        sub = await rw.check_subscription(user_id)
    except Exception:
        sub = None

    balance = float(user.get("balance_rub") or 0)
    if sub and sub["active"]:
        status_line = f"✅ Активна до {_fmt_expire(int(sub['expires_at'].timestamp()) if sub.get('expires_at') else None)}"
    elif sub:
        status_line = "⏳ Истекла"
    else:
        status_line = "❌ Нет подписки"

    caption = (
        f"👤 <b>Ваш ID:</b> <code>{user_id}</code>\n"
        f"💰 <b>Баланс:</b> {balance:g} ₽\n\n"
        f"❝\n"
        f"Статус: <b>{status_line}</b>\n"
        f"❞"
    )
    await _edit(callback, "account.png", caption,
                main_menu(_cfg().support_url, _cfg().instruction_url, _cfg().channel_url,
                          _cfg().mini_app_url))


# ── subscription ──────────────────────────────────────────────────────────────

@router.callback_query(F.data == "subscription")
async def subscription(callback: CallbackQuery) -> None:
    from bot import remnawave as rw_module
    user_id = callback.from_user.id
    try:
        rw = rw_module.get_remnawave()
        sub = await rw.check_subscription(user_id)
    except Exception:
        sub = None

    if sub and (sub["active"] or sub.get("subscription_url")):
        used = _fmt_bytes(sub.get("used_traffic", 0))
        limit = _fmt_bytes(sub["data_limit"]) if sub.get("data_limit") else "∞"
        exp = _fmt_expire(int(sub["expires_at"].timestamp()) if sub.get("expires_at") else None)
        status_icon = "✅" if sub["active"] else "⏳"
        sub_url = sub.get("subscription_url", "")
        caption = (
            f"❝\n"
            f"• Статус: <b>{status_icon}</b>\n"
            f"• Активна до: <b>{exp}</b>\n"
            f"• Трафик: <b>{used} / {limit}</b>\n"
            f"❞\n\n"
            f"🔗 <b>Ссылка подписки:</b>\n"
            f"<code>{sub_url}</code>"
        )
    else:
        caption = (
            "❌ <b>Подписка не найдена.</b>\n\n"
            "Оформите подписку через кнопку ниже."
        )

    await _edit(callback, "subscription.png", caption, subscription_menu())


# ── buy ───────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "buy")
async def buy(callback: CallbackQuery) -> None:
    caption = (
        "⚡ <b>Покупка подписки ChampionVPN</b>\n\n"
        "— Свободный доступ ко всем ресурсам\n"
        "— Большое количество стран на выбор\n"
        "— Без авто-списаний\n"
        "— Работает на всех устройствах\n\n"
        "Выберите срок подписки:"
    )
    await _edit(callback, "subscription.png", caption, buy_menu())


@router.callback_query(F.data.startswith("plan:"))
async def choose_plan(callback: CallbackQuery, state: FSMContext) -> None:
    months = int(callback.data.split(":", 1)[1])
    await state.update_data(months=months)
    await _edit(callback, "subscription.png", "📱 Выберите количество устройств:", devices_count_menu())


@router.callback_query(F.data.startswith("devices_count:"))
async def choose_devices(callback: CallbackQuery, state: FSMContext) -> None:
    from bot import db
    devices = int(callback.data.split(":", 1)[1])
    data = await state.get_data()
    months = data.get("months", 1)

    plan = await db.get_plan_by_months(months)
    base = float(plan["price_rub"]) if plan else 149.0 * months
    device_extra = max(0, devices - DEVICE_BASE) * DEVICE_EXTRA_PRICE
    subtotal = int(base + device_extra)

    # Общий трафик — всегда безлимит (бесплатно)
    await state.update_data(
        devices=devices,
        plan_id=str(plan["id"]) if plan else None,
        subtotal=subtotal,
        traffic_gb=0,        # 0 = безлимит
        traffic_label="♾ Безлимит",
    )
    caption = (
        f"Выберите количество ГБ трафика\n"
        f"для белых списков (обычные сервера — безлимит)\n\n"
        f"🗓 Срок подписки: <b>{_fmt_months(months)}</b>\n"
        f"⚙️ Кол-во устройств: <b>{devices}</b>\n\n"
        f"Базово включено <b>15 ГБ</b> (1 ГБ = 10 ₽):"
    )
    await _edit(callback, "subscription.png", caption, bypass_traffic_menu())



@router.callback_query(F.data.startswith("bypass_pack:"))
async def choose_bypass(callback: CallbackQuery, state: FSMContext) -> None:
    _, extra_gb_str, price_str = callback.data.split(":", 2)
    extra_gb = int(extra_gb_str)
    pack_price = int(price_str)

    data = await state.get_data()
    months = data.get("months", 1)
    devices = data.get("devices", DEVICE_BASE)
    subtotal = int(data.get("subtotal", 149))
    traffic_label = data.get("traffic_label", "♾ Безлимит")
    total = subtotal + pack_price

    if extra_gb == -1:
        bypass_gb = 0
        bypass_label = "♾ Безлимит"
    else:
        bypass_gb = BYPASS_BASE_GB + extra_gb
        bypass_label = f"{bypass_gb} ГБ"

    await state.update_data(total=total, bypass_gb=bypass_gb, bypass_label=bypass_label)
    caption = (
        f"📋 <b>Ваш заказ</b>\n\n"
        f"🗓 Срок подписки: <b>{_fmt_months(months)}</b>\n"
        f"⚙️ Кол-во устройств: <b>{devices}</b>\n"
        f"☁️ Кол-во ГБ: <b>{bypass_label}</b>\n\n"
        f"Цена: <b>{total} ₽</b>\n\n"
        f"Выберите способ оплаты:"
    )
    await _edit(callback, "subscription.png", caption, payment_choice_menu(total))


# ── payment via CryptoPay ─────────────────────────────────────────────────────

@router.callback_query(F.data == "pay_crypto")
async def pay_crypto(callback: CallbackQuery, state: FSMContext) -> None:
    from bot import db, payments as pay_mod
    data = await state.get_data()
    months = data.get("months", 1)
    devices = data.get("devices", 3)
    total = data.get("total", 149)
    user_id = callback.from_user.id

    traffic_gb = data.get("traffic_gb", 0)
    bypass_gb = data.get("bypass_gb", BYPASS_BASE_GB)
    kind = data.get("kind", "subscription")
    topup_gb = data.get("topup_gb", 0)
    topup_devices = data.get("topup_devices", 0)
    description = _payment_description(kind, months, topup_gb, topup_devices)

    await callback.answer("⏳ Создаю счёт...")
    invoice = await pay_mod.cryptopay_create_invoice(
        _cfg().cryptopay_token,
        total,
        description,
        payload=str(user_id),
    )
    if not invoice:
        await callback.message.answer("❌ Не удалось создать счёт. Попробуйте позже.")
        return

    payment = await db.create_payment(
        user_id, float(total), "cryptopay",
        provider_payment_id=str(invoice["invoice_id"]),
        months=months, devices=devices, method="crypto",
        traffic_gb=traffic_gb, bypass_gb=bypass_gb,
        kind=kind, topup_gb=topup_gb, topup_devices=topup_devices,
    )

    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="💳 Оплатить", url=invoice["bot_invoice_url"]),
        InlineKeyboardButton(text="✅ Проверить оплату", callback_data=f"check_payment:{payment['id']}"),
    ]])
    await callback.message.answer(
        f"💳 <b>Счёт создан</b>\n\n"
        f"Сумма: <b>{invoice.get('amount', '?')} USDT</b>\n"
        f"Действует 1 час.\n\n"
        f"После оплаты нажмите «Проверить оплату».",
        reply_markup=kb,
    )


# ── payment via YooMoney ──────────────────────────────────────────────────────

@router.callback_query(F.data == "pay_yoo")
async def pay_yoo(callback: CallbackQuery, state: FSMContext) -> None:
    from bot import db, payments as pay_mod
    data = await state.get_data()
    months = data.get("months", 1)
    devices = data.get("devices", 3)
    total = data.get("total", 149)
    user_id = callback.from_user.id

    traffic_gb = data.get("traffic_gb", 0)
    bypass_gb = data.get("bypass_gb", BYPASS_BASE_GB)
    kind = data.get("kind", "subscription")
    topup_gb = data.get("topup_gb", 0)
    topup_devices = data.get("topup_devices", 0)
    description = _payment_description(kind, months, topup_gb, topup_devices)

    payment = await db.create_payment(
        user_id, float(total), "yoomoney",
        months=months, devices=devices, method="card",
        traffic_gb=traffic_gb, bypass_gb=bypass_gb,
        kind=kind, topup_gb=topup_gb, topup_devices=topup_devices,
    )
    pay_url = pay_mod.yoomoney_payment_url(
        _cfg().yoomoney_wallet,
        total,
        label=str(payment["id"]),
        description=f"{description} | tg:{user_id}",
    )

    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="💳 Оплатить", url=pay_url),
        InlineKeyboardButton(text="✅ Проверить оплату", callback_data=f"check_payment:{payment['id']}"),
    ]])
    await callback.answer()
    await callback.message.answer(
        f"💳 <b>Оплата через ЮMoney</b>\n\n"
        f"Сумма: <b>{total} ₽</b>\n\n"
        f"После оплаты нажмите «Проверить оплату».",
        reply_markup=kb,
    )


# ── check payment ─────────────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("check_payment:"))
async def check_payment(callback: CallbackQuery, state: FSMContext) -> None:
    from bot import db, payments as pay_mod, remnawave as rw_module
    payment_id = callback.data.split(":", 1)[1]
    payment = await db.get_payment(payment_id)
    if not payment:
        await callback.answer("❌ Платёж не найден.", show_alert=True)
        return
    if payment["status"] == "completed":
        await callback.answer("✅ Уже оплачено!", show_alert=True)
        return

    # Get user telegram_id from user_id
    user = await db.get_user_by_id(str(payment["user_id"]))
    if not user:
        await callback.answer("❌ Пользователь не найден.", show_alert=True)
        return
    user_telegram_id = user["telegram_id"]

    metadata = payment.get("metadata") or {}
    if isinstance(metadata, str):
        import json
        metadata = json.loads(metadata)
    months = metadata.get("months", 1)
    devices = metadata.get("devices", DEVICE_BASE)
    traffic_gb = metadata.get("traffic_gb", 0)
    bypass_gb = metadata.get("bypass_gb", BYPASS_BASE_GB)
    kind = metadata.get("kind", "subscription")
    topup_gb = metadata.get("topup_gb", 0)
    topup_devices = metadata.get("topup_devices", 0)

    # Check provider
    paid = False
    if payment["payment_provider"] == "cryptopay" and payment.get("provider_payment_id"):
        invoice = await pay_mod.cryptopay_get_invoice(_cfg().cryptopay_token, int(payment["provider_payment_id"]))
        if invoice and invoice.get("status") == "paid":
            paid = True

    if not paid:
        if payment["payment_provider"] == "yoomoney":
            await callback.answer(
                "⏳ ЮMoney подтверждается автоматически в течение 1-2 минут после оплаты. "
                "Если уже оплатили — подождите немного.",
                show_alert=True,
            )
        else:
            await callback.answer("⏳ Оплата ещё не поступила. Попробуйте через минуту.", show_alert=True)
        return

    # ── Top-up (докупка ГБ / устройств) ───────────────────────────────────────
    if kind in ("topup_gb", "topup_device"):
        try:
            rw = rw_module.get_remnawave()
            if kind == "topup_gb":
                new_limit = await rw.add_traffic_limit(user_telegram_id, topup_gb)
                await db.confirm_payment(payment_id)
                await callback.answer("✅ Оплата подтверждена!", show_alert=True)
                if new_limit == 0:
                    extra = "У вас безлимитный трафик белых списков — докупка не требуется."
                else:
                    extra = f"Новый лимит белых списков: <b>{_fmt_bytes(new_limit)}</b>."
                await callback.message.answer(
                    f"✅ <b>Трафик докуплен!</b>\n\n"
                    f"🏳️ Добавлено: <b>+{topup_gb} ГБ</b> белых списков.\n"
                    f"{extra}"
                )
            else:
                new_limit = await rw.add_device_limit(user_telegram_id, topup_devices)
                await db.confirm_payment(payment_id)
                await callback.answer("✅ Оплата подтверждена!", show_alert=True)
                await callback.message.answer(
                    f"✅ <b>Устройства докуплены!</b>\n\n"
                    f"📱 Добавлено: <b>+{topup_devices}</b>.\n"
                    f"Новый лимит устройств: <b>{new_limit}</b>."
                )
        except Exception:
            log.exception("Failed to apply top-up after payment")
            await db.confirm_payment(payment_id)
            await callback.answer("✅ Оплата подтверждена!", show_alert=True)
            for admin_id in _cfg().admin_ids:
                try:
                    await callback.bot.send_message(
                        admin_id,
                        f"⚠️ <b>Ошибка применения докупки!</b>\n\n"
                        f"Пользователь: <code>{user_telegram_id}</code>\n"
                        f"Платёж: <code>{payment_id}</code>\n"
                        f"Тип: {kind} | ГБ: {topup_gb} | Устройств: {topup_devices}",
                    )
                except Exception:
                    pass
            await callback.message.answer(
                "✅ <b>Оплата принята!</b>\n\n"
                "⚠️ При применении докупки произошла ошибка. "
                "Менеджер применит её вручную в течение 15 минут."
            )
        await state.clear()
        return

    # Activate VPN in Remnawave
    sub_url = ""
    vpn_error = False
    now_ts = int(__import__("datetime").datetime.now(__import__("datetime").timezone.utc).timestamp())
    try:
        rw = rw_module.get_remnawave()
        # bypass_gb — лимит трафика белых списков в Remnawave (0 = безлимит)
        vpn_user = await rw.create_vpn_user(
            user_telegram_id, months,
            device_limit=devices,
            data_limit_gb=bypass_gb,
        )
        sub_url = vpn_user.subscription_url
        # Фоллбэк если Remnawave не вернул URL
        if not sub_url:
            sub_url = await rw.get_subscription_url(user_telegram_id)
        panel_uuid = vpn_user.uuid
        end_ts = now_ts + months * 30 * 24 * 3600

        # Sync to bot DB
        plan = await db.get_plan_by_months(months)
        if plan:
            sub_rec = await db.upsert_subscription(
                user_telegram_id, str(plan["id"]), months, devices,
                vpn_username=vpn_user.username, config_url=sub_url,
            )
            await db.confirm_payment(payment_id, str(sub_rec["id"]))
        else:
            await db.confirm_payment(payment_id)

        # Sync user + subscription to webapp DB (mini-app)
        await db.webapp_sync_user(
            user_telegram_id, panel_user_uuid=panel_uuid, is_banned=False,
        )
        await db.webapp_sync_subscription(
            telegram_id=user_telegram_id,
            panel_user_uuid=panel_uuid,
            months=months,
            bypass_gb=bypass_gb,
            devices=devices,
            start_ts=now_ts,
            end_ts=end_ts,
        )
    except Exception:
        log.exception("Failed to create VPN user after payment")
        await db.confirm_payment(payment_id)
        vpn_error = True

    await callback.answer("✅ Оплата подтверждена!", show_alert=True)

    bypass_str = "♾ Безлимит" if bypass_gb == 0 else f"{bypass_gb} ГБ"

    if vpn_error or not sub_url:
        # Оплата принята, но VPN не выдан — уведомим админов
        for admin_id in _cfg().admin_ids:
            try:
                await callback.bot.send_message(
                    admin_id,
                    f"⚠️ <b>Ошибка выдачи VPN после оплаты!</b>\n\n"
                    f"Пользователь: <code>{user_telegram_id}</code>\n"
                    f"Платёж: <code>{payment_id}</code>\n"
                    f"Срок: {months} мес. | Устройств: {devices}",
                )
            except Exception:
                pass
        await callback.message.answer(
            f"✅ <b>Оплата принята!</b>\n\n"
            f"⚠️ При активации VPN произошла ошибка. "
            f"Наш менеджер выдаст подписку вручную в течение 15 минут.\n\n"
            f"Если вопросы — обратитесь в поддержку.",
        )
    else:
        await callback.message.answer(
            f"🎉 <b>Подписка активирована!</b>\n\n"
            f"🗓 Срок подписки: <b>{_fmt_months(months)}</b>\n"
            f"⚙️ Кол-во устройств: <b>{devices}</b>\n"
            f"☁️ Трафик обходов: <b>{bypass_str}</b>\n\n"
            f"🔗 <b>Ваша ссылка подписки:</b>\n"
            f"<code>{sub_url}</code>\n\n"
            f"Нажмите кнопку ниже — приложение откроется и автоматически импортирует подписку.",
            reply_markup=auto_import_menu(sub_url),
        )
    await state.clear()


# ── auto-import ───────────────────────────────────────────────────────────────

@router.callback_query(F.data == "auto_import")
async def auto_import(callback: CallbackQuery) -> None:
    from bot import remnawave as rw_module
    user_id = callback.from_user.id
    try:
        rw = rw_module.get_remnawave()
        sub = await rw.check_subscription(user_id)
    except Exception:
        sub = None

    sub_url = (sub or {}).get("subscription_url")
    if not sub_url:
        await callback.answer("❌ У вас нет активной подписки. Сначала оформите её.", show_alert=True)
        return

    text = (
        "⚡ <b>Авто-импорт подписки</b>\n\n"
        "Нажмите кнопку — приложение откроется на телефоне и сразу подхватит подписку:"
    )
    await callback.answer()
    await callback.message.answer(text, reply_markup=auto_import_menu(sub_url))


# ── top_up (balance) ──────────────────────────────────────────────────────────

@router.callback_query(F.data == "top_up")
async def top_up(callback: CallbackQuery) -> None:
    await stub(callback, "Пополнение баланса через платёжные системы — скоро!")


# ── referral ──────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "referral")
async def referral(callback: CallbackQuery) -> None:
    from bot import db
    user_id = callback.from_user.id
    user = await db.ensure_user(user_id)
    ref_code = user.get("referral_code") or "—"
    bot_username = _cfg().bot_username
    link = f"https://t.me/{bot_username}?start=ref_{ref_code}"
    refs = await db.get_referrals_count(str(user["id"])) if user.get("id") else 0
    caption = (
        f"📣 <b>Реферальная система</b>\n\n"
        f"🔗 Ваша ссылка:\n<code>{link}</code>\n\n"
        f"👥 Приведено: <b>{refs}</b>\n\n"
        "Приглашай друзей — получай 25% от их платежей!"
    )
    await _edit(callback, "referral.png", caption, referral_menu())


@router.callback_query(F.data.in_({"invite", "withdraw"}))
async def referral_stubs(callback: CallbackQuery) -> None:
    await stub(callback)


# ── promos ────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "promos")
async def promos(callback: CallbackQuery) -> None:
    caption = (
        "🎟 <b>Промокоды</b>\n\n"
        "Введите промокод для получения скидки или бонусных дней.\n\n"
        "Промокоды публикуются в нашем канале."
    )
    await _edit(callback, "promo.png", caption, promo_menu())


@router.callback_query(F.data == "enter_promo")
async def enter_promo(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(PromoState.waiting_code)
    await _edit(callback, "promo.png", "🎟 <b>Введите промокод:</b>", cancel_menu())


@router.message(PromoState.waiting_code)
async def apply_promo(message: Message, state: FSMContext) -> None:
    from bot import db
    await state.clear()
    code = (message.text or "").strip()
    promo = await db.use_promo(message.from_user.id, code)
    if not promo:
        await message.answer("❌ Промокод недействителен или уже использован.")
        return
    if promo["discount_type"] == "percentage":
        info = f"скидка {float(promo['discount_value']):g}%"
    else:
        info = f"скидка {float(promo['discount_value']):g} ₽"
    await message.answer(f"✅ Промокод применён! Вы получили: {info}.")


@router.callback_query(F.data == "bonus_days")
async def bonus_days(callback: CallbackQuery) -> None:
    await stub(callback, "Бонусные дни за промокоды и рефералов — скоро!")


# ── devices ───────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "devices")
async def devices(callback: CallbackQuery) -> None:
    from bot import remnawave as rw_module
    user_id = callback.from_user.id
    try:
        rw = rw_module.get_remnawave()
        sub = await rw.check_subscription(user_id)
    except Exception:
        sub = None

    if not sub:
        await _edit(callback, "subscription.png",
                    "📱 <b>Устройства</b>\n\nДля просмотра оформите подписку.",
                    devices_menu())
        return

    try:
        device_list = await rw.get_user_devices(user_id)
    except Exception:
        device_list = []

    limit = int(sub.get("device_limit") or 0)
    active = len(device_list)
    limit_str = str(limit) if limit > 0 else "∞"

    caption = (
        f"📱 <b>Устройства</b>\n\n"
        f"<b>Устройства: {active} / {limit_str}</b>\n\n"
    )
    if active == 0:
        caption += (
            "Пока ни одно устройство не зарегистрировано.\n"
            "Откройте подписку в Happ и устройство появится автоматически."
        )
    else:
        lines = []
        for i, d in enumerate(device_list, 1):
            name = d.get("device_model") or d.get("platform") or d.get("user_agent") or "Устройство"
            lines.append(f"{i}. {name}")
        caption += "\n".join(lines)

    await _edit(callback, "subscription.png", caption, devices_menu())


@router.callback_query(F.data.startswith("device:"))
async def device_install(callback: CallbackQuery) -> None:
    from bot import remnawave as rw_module
    platform = callback.data.split(":", 1)[1]
    user_id = callback.from_user.id

    instructions = {
        "ios": (
            "📱 <b>iPhone / iPad (iOS)</b>\n\n"
            "1. Скачайте <a href='https://apps.apple.com/app/streisand/id6450534064'>Streisand</a> из App Store\n"
            "2. Откройте приложение → «Добавить сервер» → «Импорт из буфера обмена»\n"
            "3. Вставьте вашу ссылку подписки\n"
            "4. Подключитесь!"
        ),
        "android": (
            "🤖 <b>Android</b>\n\n"
            "1. Скачайте <a href='https://play.google.com/store/apps/details?id=com.v2ray.ang'>v2rayNG</a> из Google Play\n"
            "2. Нажмите «+» → «Импорт из URL»\n"
            "3. Вставьте вашу ссылку подписки\n"
            "4. Подключитесь!"
        ),
        "windows": (
            "🖥 <b>Windows</b>\n\n"
            "1. Скачайте <a href='https://github.com/2dust/v2rayN/releases/latest'>v2rayN</a>\n"
            "2. Серверы → Добавить → Импорт из буфера обмена\n"
            "3. Вставьте ссылку подписки\n"
            "4. Подключитесь!"
        ),
        "macos": (
            "🍎 <b>Mac OS</b>\n\n"
            "1. Скачайте <a href='https://apps.apple.com/app/streisand/id6450534064'>Streisand</a> из Mac App Store\n"
            "2. Добавьте сервер → Импорт из буфера обмена\n"
            "3. Вставьте вашу ссылку подписки\n"
            "4. Подключитесь!"
        ),
    }

    text = instructions.get(platform, "Инструкция скоро.")

    try:
        rw = rw_module.get_remnawave()
        sub = await rw.check_subscription(user_id)
        if sub and sub.get("subscription_url"):
            text += f"\n\n🔗 <b>Ваша ссылка:</b>\n<code>{sub['subscription_url']}</code>"
    except Exception:
        pass

    await callback.answer()
    await callback.message.answer(text, disable_web_page_preview=True)


# ── traffic ───────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "traffic")
async def traffic(callback: CallbackQuery) -> None:
    from bot import remnawave as rw_module
    user_id = callback.from_user.id
    try:
        rw = rw_module.get_remnawave()
        sub = await rw.check_subscription(user_id)
    except Exception:
        sub = None

    if sub:
        used = _fmt_bytes(sub.get("used_traffic", 0))
        limit = _fmt_bytes(sub["data_limit"]) if sub.get("data_limit") else "∞"
        caption = (
            f"☁️ <b>Трафик</b>\n\n"
            f"<b>Использовано:</b>\n"
            f"🌐 Обычные сервера: <b>∞</b>\n"
            f"🏳️ Белые списки: <b>{used} / {limit}</b>\n\n"
            f"• Обычный трафик — безлимитный.\n"
            f"• Обход белых списков ограничен купленным объёмом."
        )
    else:
        caption = "☁️ <b>Трафик</b>\n\nДля просмотра оформите подписку."

    await _edit(callback, "subscription.png", caption, traffic_menu())


@router.callback_query(F.data == "buy_bypass_gb")
async def buy_bypass_gb(callback: CallbackQuery) -> None:
    caption = (
        f"🏳️ <b>Докупка ГБ белых списков</b>\n\n"
        f"Дополнительные ГБ добавляются к текущему лимиту обхода.\n"
        f"Цена: <b>{BYPASS_PRICE_PER_GB} ₽ за 1 ГБ</b>.\n\n"
        f"Выберите объём:"
    )
    await _edit(callback, "subscription.png", caption, topup_gb_menu())


@router.callback_query(F.data == "buy_device")
async def buy_device(callback: CallbackQuery) -> None:
    caption = (
        f"📱 <b>Докупка устройств</b>\n\n"
        f"Дополнительные устройства добавляются к текущему лимиту.\n"
        f"Цена: <b>{DEVICE_EXTRA_PRICE} ₽ за устройство</b>.\n\n"
        f"Выберите количество:"
    )
    await _edit(callback, "subscription.png", caption, topup_device_menu())


@router.callback_query(F.data.startswith("topup_gb:"))
async def topup_gb(callback: CallbackQuery, state: FSMContext) -> None:
    _, gb_str, price_str = callback.data.split(":", 2)
    gb = int(gb_str)
    price = int(price_str)
    await state.update_data(kind="topup_gb", topup_gb=gb, topup_devices=0, total=price)
    caption = (
        f"📋 <b>Докупка трафика</b>\n\n"
        f"🏳️ Белые списки: <b>+{gb} ГБ</b>\n"
        f"Цена: <b>{price} ₽</b>\n\n"
        f"Выберите способ оплаты:"
    )
    await _edit(callback, "subscription.png", caption, payment_choice_menu(price))


@router.callback_query(F.data.startswith("topup_device:"))
async def topup_device(callback: CallbackQuery, state: FSMContext) -> None:
    _, count_str, price_str = callback.data.split(":", 2)
    count = int(count_str)
    price = int(price_str)
    await state.update_data(kind="topup_device", topup_devices=count, topup_gb=0, total=price)
    caption = (
        f"📋 <b>Докупка устройств</b>\n\n"
        f"📱 Устройства: <b>+{count}</b>\n"
        f"Цена: <b>{price} ₽</b>\n\n"
        f"Выберите способ оплаты:"
    )
    await _edit(callback, "subscription.png", caption, payment_choice_menu(price))


@router.callback_query(F.data.startswith("traffic_count:"))
async def choose_traffic(callback: CallbackQuery) -> None:
    await stub(callback, "Докупка трафика — скоро!")


# ── open_app / reset_link ─────────────────────────────────────────────────────

@router.callback_query(F.data == "open_app")
async def open_app(callback: CallbackQuery) -> None:
    from bot import remnawave as rw_module
    user_id = callback.from_user.id
    try:
        rw = rw_module.get_remnawave()
        sub_url = await rw.get_subscription_url(user_id)
    except Exception:
        sub_url = ""

    if sub_url:
        await callback.answer()
        await callback.message.answer(
            f"🚀 <b>Ваша ссылка подписки:</b>\n\n<code>{sub_url}</code>\n\n"
            "Импортируйте её в ваш VPN-клиент."
        )
    else:
        await stub(callback, "Сначала оформите подписку.")


@router.callback_query(F.data == "reset_link")
async def reset_link(callback: CallbackQuery) -> None:
    caption = (
        "⚠️ <b>Перевыпуск ссылки подписки</b>\n\n"
        "После подтверждения:\n"
        "• Текущая ссылка перестанет работать\n"
        "• Все устройства с текущим ключом потеряют доступ\n"
        "• Будет выдана новая ссылка с новыми credentials\n"
        "• Срок подписки не изменится\n"
        "• Нужно будет заново импортировать подписку\n\n"
        "Вы уверены?"
    )
    await _edit(callback, "subscription.png", caption, reset_link_confirm_menu())


@router.callback_query(F.data == "reset_link_confirm")
async def reset_link_confirm(callback: CallbackQuery) -> None:
    from bot import remnawave as rw_module
    user_id = callback.from_user.id
    try:
        rw = rw_module.get_remnawave()
        raw_username = f"tg_{user_id}"
        raw = await rw._get_raw_by_username(raw_username)
        updated = await rw._request("POST", f"/api/users/{raw['uuid']}/actions/revoke")
        new_url = updated.get("subscriptionUrl", "")
        if not new_url:
            new_url = await rw.get_subscription_url(user_id)
        await callback.answer()
        await callback.message.answer(
            "✅ <b>Ссылка подписки успешно перевыпущена!</b>\n\n"
            "Все предыдущие подключения отозваны.\n\n"
            "💎 <b>Новая ссылка:</b>\n"
            f"<code>{new_url}</code>\n\n"
            "Импортируйте новую ссылку на ваших устройствах.",
            reply_markup=auto_import_menu(new_url),
        )
    except Exception:
        await stub(callback, "Не удалось перевыпустить ссылку.")


# ── ADMIN ─────────────────────────────────────────────────────────────────────

@router.message(Command("admin"))
async def admin_cmd(message: Message) -> None:
    if not _is_admin(message.from_user.id):
        return
    await message.answer("🛠 <b>Панель администратора</b>", reply_markup=admin_main_menu())


@router.callback_query(F.data == "admin_home")
async def admin_home(callback: CallbackQuery) -> None:
    if not _is_admin(callback.from_user.id):
        return await callback.answer("Нет доступа.", show_alert=True)
    await callback.answer()
    await callback.message.answer("🛠 <b>Панель администратора</b>", reply_markup=admin_main_menu())


@router.callback_query(F.data == "admin_stats")
async def admin_stats(callback: CallbackQuery) -> None:
    if not _is_admin(callback.from_user.id):
        return await callback.answer("Нет доступа.", show_alert=True)
    from bot import db, remnawave as rw_module
    await callback.answer("⏳ Загружаю...")
    total_users = await db.count_users()
    total_paid = await db.count_payments("completed")
    total_revenue = await db.sum_payments("completed")

    try:
        rw = rw_module.get_remnawave()
        stats = await rw.get_system_stats()
        panel_text = (
            f"\n\n📡 <b>Панель Remnawave:</b>\n"
            f"• Версия: <b>{stats.version}</b>\n"
            f"• Всего юзеров: <b>{stats.total_user}</b>\n"
            f"• Активных: <b>{stats.users_active}</b>\n"
            f"• CPU: <b>{stats.cpu_usage:.1f}%</b> ({stats.cpu_cores} ядер)\n"
            f"• RAM: <b>{_fmt_bytes(stats.mem_used)} / {_fmt_bytes(stats.mem_total)}</b>"
        )
    except Exception:
        panel_text = "\n\n⚠️ Не удалось получить статистику панели."

    text = (
        f"📊 <b>Статистика ChampionVPN</b>\n\n"
        f"👥 Пользователей в боте: <b>{total_users}</b>\n"
        f"💳 Оплаченных заказов: <b>{total_paid}</b>\n"
        f"💰 Общий доход: <b>{total_revenue} ₽</b>"
        f"{panel_text}"
    )
    await callback.message.answer(text, reply_markup=admin_main_menu())


@router.callback_query(F.data == "admin_users")
async def admin_users(callback: CallbackQuery) -> None:
    if not _is_admin(callback.from_user.id):
        return await callback.answer("Нет доступа.", show_alert=True)
    from bot import db
    await callback.answer()
    users = await db.get_all_users(limit=20)
    if not users:
        await callback.message.answer("Нет пользователей.", reply_markup=admin_main_menu())
        return
    lines = []
    for u in users:
        banned = " 🚫" if u.get("is_banned") else ""
        lines.append(f"<code>{u['telegram_id']}</code> @{u.get('username','—')}{banned} | {float(u.get('balance_rub') or 0):g}₽")
    text = "👥 <b>Последние 20 пользователей:</b>\n\n" + "\n".join(lines)
    await callback.message.answer(text, reply_markup=admin_users_menu())


@router.callback_query(F.data == "admin_ban")
async def admin_ban_prompt(callback: CallbackQuery, state: FSMContext) -> None:
    if not _is_admin(callback.from_user.id):
        return await callback.answer("Нет доступа.", show_alert=True)
    await state.set_state(AdminState.ban_id)
    await callback.answer()
    await callback.message.answer("🚫 Введите Telegram ID для бана (или unban:<id> для разбана):")


@router.message(AdminState.ban_id)
async def admin_ban_do(message: Message, state: FSMContext) -> None:
    from bot import db
    await state.clear()
    text = (message.text or "").strip()
    if text.startswith("unban:"):
        uid = int(text.split(":", 1)[1].strip())
        await db.unban_user(uid)
        await message.answer(f"✅ Пользователь {uid} разбанен.")
    else:
        try:
            uid = int(text)
            await db.ban_user(uid)
            await message.answer(f"🚫 Пользователь {uid} заблокирован.")
        except ValueError:
            await message.answer("❌ Неверный ID.")


@router.callback_query(F.data == "admin_add_days")
async def admin_add_days_prompt(callback: CallbackQuery, state: FSMContext) -> None:
    if not _is_admin(callback.from_user.id):
        return await callback.answer("Нет доступа.", show_alert=True)
    await state.set_state(AdminState.add_days_id)
    await callback.answer()
    await callback.message.answer("🎁 Введите Telegram ID пользователя:")


@router.message(AdminState.add_days_id)
async def admin_add_days_id(message: Message, state: FSMContext) -> None:
    try:
        uid = int((message.text or "").strip())
        await state.update_data(target_id=uid)
        await state.set_state(AdminState.add_days_count)
        await message.answer(f"Пользователь: <code>{uid}</code>\nВведите количество дней:")
    except ValueError:
        await state.clear()
        await message.answer("❌ Неверный ID.")


@router.message(AdminState.add_days_count)
async def admin_add_days_count(message: Message, state: FSMContext) -> None:
    from bot import remnawave as rw_module
    data = await state.get_data()
    await state.clear()
    try:
        days = int((message.text or "").strip())
        if days <= 0:
            await message.answer("❌ Количество дней должно быть положительным.")
            return
        target_id = data["target_id"]
        rw = rw_module.get_remnawave()
        await rw.extend_days(target_id, days)
        await message.answer(f"✅ Пользователю {target_id} добавлено {days} дн.")
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")


@router.callback_query(F.data == "admin_broadcast")
async def admin_broadcast_prompt(callback: CallbackQuery, state: FSMContext) -> None:
    if not _is_admin(callback.from_user.id):
        return await callback.answer("Нет доступа.", show_alert=True)
    await state.set_state(AdminState.broadcast)
    await callback.answer()
    await callback.message.answer("📢 Введите текст рассылки (HTML поддерживается):")


@router.message(AdminState.broadcast)
async def admin_broadcast_do(message: Message, state: FSMContext) -> None:
    import asyncio
    from bot import db
    await state.clear()
    text = message.text or ""
    bot = message.bot
    sent = 0
    total = 0
    async for user in db.iter_users(batch_size=500):
        total += 1
        if user.get("is_banned"):
            continue
        try:
            await bot.send_message(user["telegram_id"], text)
            sent += 1
            # rate-limit: ~25 msg/sec to avoid Telegram flood
            if sent % 25 == 0:
                await asyncio.sleep(1)
        except Exception:
            pass
    await message.answer(f"✅ Рассылка завершена. Отправлено: {sent}/{total}")


@router.callback_query(F.data == "admin_promo")
async def admin_promo_prompt(callback: CallbackQuery, state: FSMContext) -> None:
    if not _is_admin(callback.from_user.id):
        return await callback.answer("Нет доступа.", show_alert=True)
    await state.set_state(AdminState.promo_create)
    await callback.answer()
    await callback.message.answer(
        "🎟 Создать промокод.\n\n"
        "Формат: <code>КОД ТИП ЗНАЧЕНИЕ ИСПОЛЬЗОВАНИЙ</code>\n"
        "ТИП: <code>percentage</code> (скидка %) или <code>fixed</code> (скидка ₽)\n\n"
        "Пример: <code>SALE20 percentage 20 100</code> — −20%, 100 использований\n"
        "Пример: <code>SAVE100 fixed 100 50</code> — −100 ₽, 50 использований"
    )


@router.message(AdminState.promo_create)
async def admin_promo_create(message: Message, state: FSMContext) -> None:
    from bot import db
    await state.clear()
    parts = (message.text or "").strip().split()
    if len(parts) < 4:
        await message.answer("❌ Неверный формат.")
        return
    code = parts[0]
    dtype = parts[1].lower()
    if dtype not in ("percentage", "fixed"):
        await message.answer("❌ Тип должен быть percentage или fixed.")
        return
    value = float(parts[2])
    max_uses = int(parts[3])
    await db.create_promo(code, dtype, value, max_uses)
    await message.answer(f"✅ Промокод <code>{code.upper()}</code> создан.")


@router.callback_query(F.data == "admin_find_user")
async def admin_find_user_prompt(callback: CallbackQuery, state: FSMContext) -> None:
    if not _is_admin(callback.from_user.id):
        return await callback.answer("Нет доступа.", show_alert=True)
    await state.set_state(AdminState.find_user)
    await callback.answer()
    await callback.message.answer("🔍 Введите Telegram ID или @username:")


@router.message(AdminState.find_user)
async def admin_find_user_do(message: Message, state: FSMContext) -> None:
    from bot import db, remnawave as rw_module
    await state.clear()
    query = (message.text or "").strip().lstrip("@")

    found = await db.find_user(query)
    if not found:
        await message.answer("❌ Пользователь не найден в базе.")
        return

    uid = found["telegram_id"]
    try:
        rw = rw_module.get_remnawave()
        sub = await rw.check_subscription(uid)
    except Exception:
        sub = None

    status_panel = "нет данных"
    if sub:
        status_panel = f"{'✅ активна' if sub['active'] else '❌ неактивна'}, до {_fmt_expire(int(sub['expires_at'].timestamp()) if sub.get('expires_at') else None)}"

    refs = await db.get_referrals_count(str(found["id"])) if found.get("id") else 0
    text = (
        f"👤 <b>Пользователь</b>\n\n"
        f"ID: <code>{uid}</code>\n"
        f"Username: @{found.get('username', '—')}\n"
        f"Баланс: {float(found.get('balance_rub') or 0):g} ₽\n"
        f"Забанен: {'🚫 да' if found.get('is_banned') else '✅ нет'}\n"
        f"Подписка: {status_panel}\n"
        f"Рефералов: {refs}\n"
        f"Зарегистрирован: {str(found.get('created_at', ''))[:10]}"
    )
    await message.answer(text)


# ── confirm_order fallback ────────────────────────────────────────────────────

@router.callback_query(F.data == "confirm_order")
async def confirm_order(callback: CallbackQuery, state: FSMContext) -> None:
    data = await state.get_data()
    months = data.get("months", 1)
    devices = data.get("devices", 3)
    total = data.get("total", 199)
    caption = (
        f"📋 <b>Ваш заказ:</b>\n\n"
        f"🗓 Срок: <b>{months} мес.</b>\n"
        f"📱 Устройств: <b>{devices}</b>\n"
        f"💰 Стоимость: <b>{total} ₽</b>\n\n"
        f"Выберите способ оплаты:"
    )
    await _edit(callback, "subscription.png", caption, payment_choice_menu(total))


# ── admin: ручное подтверждение платежа ──────────────────────────────────────

@router.message(Command("confirm_pay"))
async def admin_confirm_pay(message: Message) -> None:
    """Ручное подтверждение оплаты: /confirm_pay <payment_id>"""
    from bot import db
    from bot.activation import activate_vpn_and_notify as _activate_vpn_and_notify

    if not _is_admin(message.from_user.id):
        return

    parts = (message.text or "").strip().split()
    if len(parts) < 2:
        await message.answer("Использование: /confirm_pay <payment_id>")
        return

    payment_id = parts[1].strip()
    payment = await db.get_payment(payment_id)
    if not payment:
        await message.answer(f"❌ Платёж <code>{payment_id}</code> не найден.")
        return
    if payment.get("status") == "completed":
        await message.answer("✅ Этот платёж уже подтверждён.")
        return

    await message.answer(f"⏳ Активирую VPN для платежа <code>{payment_id}</code>...")
    try:
        await _activate_vpn_and_notify(message.bot, payment_id)
        await message.answer("✅ Готово — VPN выдан и пользователь уведомлён.")
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")


# ── catch-all ─────────────────────────────────────────────────────────────────

@router.callback_query()
async def unknown_button(callback: CallbackQuery) -> None:
    await stub(callback)
