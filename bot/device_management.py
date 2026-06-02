from __future__ import annotations

from datetime import datetime
from html import escape
from typing import Any, Dict, List, Optional

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from bot.keyboards import DEVICE_BASE, btn, rows


Device = Dict[str, Any]


def _fmt_date(value: Optional[str]) -> str:
    if not value:
        return "-"
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).strftime("%d.%m.%Y")
    except Exception:
        return value[:10]


def _short_hwid(hwid: str) -> str:
    if len(hwid) <= 18:
        return hwid
    return f"{hwid[:8]}...{hwid[-6:]}"


def _device_name(device: Device, index: int) -> str:
    return (
        device.get("device_model")
        or device.get("deviceModel")
        or device.get("platform")
        or f"Устройство {index}"
    )


def render_devices_caption(sub: Optional[Dict[str, Any]], devices: List[Device]) -> str:
    caption = "📱 <b>Управление устройствами</b>\n\n"

    if not sub and not devices:
        return (
            caption
            + "Подключенные устройства пока не найдены.\n\n"
            + "Если устройство уже подключено к VPN, нажмите «Обновить» через минуту."
        )

    max_devices = int((sub or {}).get("hwid_device_limit") or DEVICE_BASE)
    caption += f"Устройства: <b>{len(devices)} / {max_devices}</b>\n\n"

    if not devices:
        return (
            caption
            + "Пока ни одно устройство не зарегистрировано.\n"
            + "Откройте подписку в VPN-клиенте, и устройство появится автоматически."
        )

    caption += "Активные устройства:\n"
    for index, device in enumerate(devices, 1):
        name = escape(str(_device_name(device, index)))
        platform = escape(str(device.get("platform") or "неизвестно"))
        os_version = escape(str(device.get("os_version") or device.get("osVersion") or ""))
        created_at = _fmt_date(device.get("created_at") or device.get("createdAt"))
        hwid = escape(_short_hwid(str(device.get("hwid") or "")))
        details = platform if not os_version else f"{platform} {os_version}"
        caption += (
            f"{index}. <b>{name}</b>\n"
            f"   Платформа: {details}\n"
            f"   HWID: <code>{hwid}</code>\n"
            f"   Добавлено: {created_at}\n"
        )

    caption += "\nНажмите кнопку ниже, чтобы отключить устройство от подписки."
    return caption


def devices_management_menu(devices: List[Device]) -> InlineKeyboardMarkup:
    menu_rows: list[list[InlineKeyboardButton]] = []
    for index, device in enumerate(devices, 1):
        name = _device_name(device, index)
        if len(name) > 24:
            name = f"{name[:21]}..."
        menu_rows.append([btn(f"Отключить #{index}: {name}", f"device_disconnect:{index}")])

    menu_rows.extend(
        [
            [btn("🔄 Обновить", "devices")],
            [btn("← Назад", "subscription")],
        ]
    )
    return rows(*menu_rows)


async def load_user_devices(rw: Any, telegram_id: int) -> tuple[Optional[Dict[str, Any]], List[Device]]:
    sub = await rw.check_subscription(telegram_id)
    return sub, await rw.get_user_devices(telegram_id)


async def disconnect_user_device(rw: Any, telegram_id: int, index: int) -> tuple[bool, str]:
    sub, devices = await load_user_devices(rw, telegram_id)
    if index < 1 or index > len(devices):
        return False, "Устройство не найдено. Обновите список и попробуйте снова."

    device = devices[index - 1]
    hwid = str(device.get("hwid") or "")
    if not hwid:
        return False, "У этого устройства нет HWID."

    ok = await rw.disconnect_device(telegram_id, hwid)
    if not ok:
        return False, "Не удалось отключить устройство. Попробуйте позже."
    return True, "Устройство отключено."
