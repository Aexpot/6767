from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from bot import db, remnawave as rw_module
from bot.activation import activate_vpn_and_notify
from bot.config import load_config
from bot.handlers import setup_handlers
from bot.payments import yoomoney_verify_notification

log = logging.getLogger(__name__)


async def build_webhook_app(bot: Bot, yoomoney_secret: str) -> web.Application:
    """Lightweight aiohttp app for YooMoney payment notifications."""
    app = web.Application()

    async def yoomoney_notify(request: web.Request) -> web.Response:
        try:
            data = await request.post()
            params = dict(data)
            if not yoomoney_verify_notification(yoomoney_secret, params):
                log.warning("YooMoney notification: invalid signature")
                return web.Response(status=400, text="bad signature")

            label = params.get("label", "")
            amount = float(params.get("amount", 0))
            log.info("YooMoney notify: label=%s amount=%s", label, amount)

            # label is the payment_id stored in our DB
            payment = await db.get_payment(label)
            if payment and payment.get("status") != "completed":
                asyncio.create_task(activate_vpn_and_notify(bot, label))
            return web.Response(text="ok")
        except Exception:
            log.exception("yoomoney_notify error")
            return web.Response(status=500)

    app.router.add_post("/yoomoney-notify", yoomoney_notify)
    app.router.add_get("/health", lambda r: web.Response(text="ok"))
    return app


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

    # Start YooMoney webhook server on port 8088
    webhook_app = await build_webhook_app(bot, config.yoomoney_secret)
    runner = web.AppRunner(webhook_app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", 8088)
    await site.start()
    logging.info("YooMoney webhook server started on :8088/yoomoney-notify")

    try:
        await dispatcher.start_polling(bot)
    finally:
        await runner.cleanup()
        await db.close_db()
        try:
            await rw_module.get_remnawave().close()
        except Exception:
            pass


if __name__ == "__main__":
    asyncio.run(main())
