from __future__ import annotations

from urllib.parse import quote

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo


# ── pricing knobs ─────────────────────────────────────────────────────────────

DEVICE_BASE = 1                  # включено в цену тарифа
DEVICE_EXTRA_PRICE = 90          # ₽ за каждое доп. устройство

TRAFFIC_BASE_GB = 15             # базово (весь трафик)
# (доп. ГБ, цена ₽)  — -1 = безлимит
TRAFFIC_EXTRAS: list[tuple[int, int]] = [
    (0, 0),       # 15 ГБ (базово, без доплат)
    (15, 50),     # +15 ГБ
    (50, 120),    # +50 ГБ
    (100, 200),   # +100 ГБ
    (-1, 300),    # безлимит
]

BYPASS_BASE_GB = 15              # базово (трафик белых списков)
BYPASS_PRICE_PER_GB = 10         # ₽ за 1 ГБ
# (доп. ГБ, цена ₽)
BYPASS_EXTRAS: list[tuple[int, int]] = [
    (0,   0),    # 15 ГБ базово — бесплатно
    (15,  150),  # +15 ГБ = 150 ₽
    (50,  500),  # +50 ГБ = 500 ₽
    (100, 1000), # +100 ГБ = 1000 ₽
]


def rows(*rows_: list[InlineKeyboardButton]) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=list(rows_))


def btn(text: str, callback_data: str | None = None, url: str | None = None,
        web_app: WebAppInfo | None = None) -> InlineKeyboardButton:
    return InlineKeyboardButton(text=text, callback_data=callback_data, url=url, web_app=web_app)


# ── user menus ────────────────────────────────────────────────────────────────

def main_menu(support_url: str, instruction_url: str, channel_url: str,
              mini_app_url: str = "", has_subscription: bool = False) -> InlineKeyboardMarkup:
    open_app_btn = (
        btn("🚀 Открыть приложение", web_app=WebAppInfo(url=mini_app_url))
        if mini_app_url else btn("🚀 Открыть приложение", "open_app")
    )
    instruction_btn = (
        btn("📘 Инструкция", web_app=WebAppInfo(url=mini_app_url))
        if mini_app_url else btn("📘 Инструкция", url=instruction_url)
    )
    menu_rows = [
        [btn("🛒 Оформить подписку", "buy")],
        [btn("🎟 Промокод", "promos")],
        [btn("🔗 Реферальная система", "referral")],
        [btn("💬 Поддержка", url=support_url), instruction_btn],
        [btn("📣 Канал", url=channel_url)],
        [open_app_btn],
    ]
    if has_subscription:
        menu_rows.insert(1, [btn("💻 Управление подпиской", "subscription")])
    return rows(*menu_rows)


def subscription_menu() -> InlineKeyboardMarkup:
    return rows(
        [btn("🛒 Продлить подписку", "buy")],
        [btn("📱 Устройства", "devices")],
        [btn("☁️ Трафик", "traffic")],
        [btn("🔑 Перевыпустить ссылку", "reset_link")],
        [btn("← Назад", "home")],
    )


def buy_menu() -> InlineKeyboardMarkup:
    return rows(
        [btn("1 месяц — 149 ₽", "plan:1")],
        [btn("3 месяца — 399 ₽", "plan:3")],
        [btn("6 месяцев — 699 ₽", "plan:6")],
        [btn("12 месяцев — 1190 ₽", "plan:12")],
        [btn("← Назад", "home")],
    )


def devices_count_menu() -> InlineKeyboardMarkup:
    """База — 1 устройство в цене тарифа, каждое доп. — +90 ₽."""
    return rows(
        [btn("1 устройство (базово)", "devices_count:1")],
        [btn("2 устройства (+90 ₽)", "devices_count:2"),
         btn("3 (+180 ₽)", "devices_count:3")],
        [btn("5 (+360 ₽)", "devices_count:5"),
         btn("10 (+810 ₽)", "devices_count:10")],
        [btn("← Назад", "buy")],
    )


def traffic_pack_menu() -> InlineKeyboardMarkup:
    """Базовый трафик 15 ГБ; пакеты — доплата сверху."""
    rows_: list[list[InlineKeyboardButton]] = []
    for extra_gb, price in TRAFFIC_EXTRAS:
        if extra_gb == 0:
            label = f"{TRAFFIC_BASE_GB} ГБ (базово)"
        elif extra_gb == -1:
            label = f"♾ Безлимит (+{price} ₽)"
        else:
            label = f"+{extra_gb} ГБ (+{price} ₽)"
        rows_.append([btn(label, f"traffic_pack:{extra_gb}:{price}")])
    rows_.append([btn("← Назад", "buy")])
    return rows(*rows_)


def bypass_traffic_menu() -> InlineKeyboardMarkup:
    """Трафик белых списков (заблокированные сайты). Обычные серверы — безлимит."""
    rows_: list[list[InlineKeyboardButton]] = []
    for extra_gb, price in BYPASS_EXTRAS:
        total_gb = BYPASS_BASE_GB + extra_gb
        if extra_gb == 0:
            label = f"{total_gb} ГБ — базово (бесплатно)"
        else:
            label = f"{total_gb} ГБ (+{price} ₽)"
        rows_.append([btn(label, f"bypass_pack:{extra_gb}:{price}")])
    rows_.append([btn("← Назад", "buy")])
    return rows(*rows_)


def payment_choice_menu(amount: int) -> InlineKeyboardMarkup:
    return rows(
        [btn(f"₿ CryptoPay (USDT) — {amount} ₽", "pay_crypto")],
        [btn(f"💛 ЮMoney — {amount} ₽", "pay_yoo")],
        [btn("← Назад", "buy")],
    )


def traffic_menu() -> InlineKeyboardMarkup:
    return rows(
        [btn("➕ Докупить ГБ белых списков", "buy_bypass_traffic")],
        [btn("← Назад", "subscription")],
    )


def reset_link_confirm_menu() -> InlineKeyboardMarkup:
    return rows(
        [btn("Да, перевыпустить", "reset_link_confirm")],
        [btn("← Вернуться назад", "subscription")],
    )


def auto_import_menu(sub_url: str) -> InlineKeyboardMarkup:
    """Универсальные deeplink-кнопки для автоматического импорта подписки."""
    enc = quote(sub_url, safe=":/?=&%")
    return rows(
        [btn("📲 v2RayTun (iOS / Android)", url=f"v2raytun://import/{enc}")],
        [btn("🍏 Streisand (iOS)", url=f"streisand://import/{enc}")],
        [btn("⭐ Happ (iOS / Android)", url=f"happ://add/{enc}")],
        [btn("🤖 v2rayNG (Android)", url=f"v2rayng://install-sub?url={enc}")],
        [btn("🖥 Hiddify (PC)", url=f"hiddify://install-config?url={enc}")],
        [btn("← Назад", "home")],
    )


def referral_menu() -> InlineKeyboardMarkup:
    return rows(
        [btn("🔗 Пригласить", "invite")],
        [btn("💳 Вывести доход", "withdraw")],
        [btn("← Назад", "home")],
    )


def promo_menu() -> InlineKeyboardMarkup:
    return rows(
        [btn("🎟 Ввести промокод", "enter_promo")],
        [btn("⚡ Получить 7 бонусных дней", "bonus_days")],
        [btn("← Назад", "home")],
    )


def cancel_menu() -> InlineKeyboardMarkup:
    return rows([btn("← Отмена", "promos")])


def devices_menu() -> InlineKeyboardMarkup:
    return rows(
        [btn("iPhone (iOS)", "device:ios"), btn("Android", "device:android")],
        [btn("Windows", "device:windows"), btn("Mac OS", "device:macos")],
        [btn("➕ Докупить устройство — 90 ₽", "buy")],
        [btn("← Назад", "subscription")],
    )


# ── admin menus ───────────────────────────────────────────────────────────────

def admin_main_menu() -> InlineKeyboardMarkup:
    return rows(
        [btn("📊 Статистика", "admin_stats")],
        [btn("👥 Пользователи", "admin_users"), btn("🔍 Найти юзера", "admin_find_user")],
        [btn("🚫 Бан / Разбан", "admin_ban"), btn("🎁 Выдать дни", "admin_add_days")],
        [btn("📢 Рассылка", "admin_broadcast")],
        [btn("🎟 Создать промокод", "admin_promo")],
    )


def admin_users_menu() -> InlineKeyboardMarkup:
    return rows(
        [btn("🔍 Найти юзера", "admin_find_user")],
        [btn("🚫 Бан / Разбан", "admin_ban")],
        [btn("← Назад", "admin_home")],
    )
