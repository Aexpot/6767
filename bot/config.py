from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    bot_token: str
    bot_username: str
    admin_ids: set[int]
    support_url: str
    instruction_url: str
    channel_url: str
    # Remnawave
    remnawave_url: str
    remnawave_token: str
    remnawave_auth_query: str
    remnawave_squad_uuid: str
    remnawave_sub_url: str
    # DB
    database_url: str
    webapp_database_url: str
    # CryptoPay
    cryptopay_token: str
    # YooMoney
    yoomoney_wallet: str
    yoomoney_secret: str
    # Mini-App (Next.js webapp)
    mini_app_url: str


def load_config() -> Config:
    token = os.getenv("BOT_TOKEN", "").strip()
    if not token:
        raise RuntimeError("Set BOT_TOKEN in .env before starting the bot.")

    admin_ids = {
        int(item.strip())
        for item in os.getenv("ADMIN_IDS", "").split(",")
        if item.strip().isdigit()
    }

    return Config(
        bot_token=token,
        bot_username=os.getenv("BOT_USERNAME", "ChampionVPN_bot").strip().lstrip("@"),
        admin_ids=admin_ids,
        support_url=os.getenv("SUPPORT_URL", "https://t.me/djeskk").strip(),
        instruction_url=os.getenv("INSTRUCTION_URL", "").strip(),
        channel_url=os.getenv("CHANNEL_URL", "https://t.me/ChampionVPN_8").strip(),
        remnawave_url=os.getenv("REMNAWAVE_URL", "").strip().rstrip("/"),
        remnawave_token=os.getenv("REMNAWAVE_TOKEN", "").strip(),
        remnawave_auth_query=os.getenv("REMNAWAVE_AUTH_QUERY", "").strip(),
        remnawave_squad_uuid=os.getenv("REMNAWAVE_SQUAD_UUID", "").strip(),
        remnawave_sub_url=os.getenv("REMNAWAVE_SUB_URL", "").strip().rstrip("/"),
        database_url=os.getenv("DATABASE_URL", "").strip(),
        webapp_database_url=os.getenv("WEBAPP_DATABASE_URL", "").strip(),
        cryptopay_token=os.getenv("CRYPTOPAY_TOKEN", "").strip(),
        yoomoney_wallet=os.getenv("YOOMONEY_WALLET", "").strip(),
        yoomoney_secret=os.getenv("YOOMONEY_SECRET", "").strip(),
        mini_app_url=os.getenv("MINI_APP_URL", "https://app.championvpn.fun").strip().rstrip("/"),
    )
