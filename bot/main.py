from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from bot import db, remnawave as rw_module
from bot.config import load_config
from bot.handlers import setup_handlers

log = logging.getLogger(__name__)
# YooMoney webhooks are handled by the mini-app (Next.js)
# at https://app.championvpn.fun/api/payment/yoomoney/webhook
# The mini-app checks bot-DB when not found in its own DB and notifies the user.


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s:%(name)s:%(message)s",
        handlers=[
            logging.FileHandler(Path("bot.runtime.log"), encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )
    config = load_config()

    # Init bot DB
    if config.database_url:
        try:
            await db.init_db(config.database_url)
        except Exception:
            logging.exception("Failed to init DB; continuing without DB.")

    # Init webapp DB (for syncing user/subscription data to mini-app)
    if config.webapp_database_url:
        try:
            await db.init_webapp_db(config.webapp_database_url)
        except Exception:
            logging.exception("Failed to init webapp DB; sync will be disabled.")

    # Init Remnawave
    if config.remnawave_url and config.remnawave_token:
        rw_module.init_remnawave(
            url=config.remnawave_url,
            token=config.remnawave_token,
            auth_query=config.remnawave_auth_query,
            squad_uuid=config.remnawave_squad_uuid,
            sub_url=config.remnawave_sub_url,
        )
        logging.info("Remnawave client initialized for %s", config.remnawave_url)

    bot = Bot(
        token=config.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dispatcher = Dispatcher(storage=MemoryStorage())
    dispatcher.include_router(setup_handlers(config))

    # Drop any leftover webhook so long-polling works
    try:
        await bot.delete_webhook(drop_pending_updates=True)
    except Exception:
        logging.exception("Failed to delete webhook")

    try:
        await dispatcher.start_polling(bot)
    finally:
        await db.close_db()
        try:
            await rw_module.get_remnawave().close()
        except Exception:
            pass


if __name__ == "__main__":
    asyncio.run(main())
