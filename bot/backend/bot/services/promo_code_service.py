import logging
from dataclasses import dataclass, field
from datetime import datetime
from html import escape as html_escape
from typing import Any, Dict, Optional, Tuple

from aiogram import Bot
from sqlalchemy.ext.asyncio import AsyncSession

from bot.middlewares.i18n import JsonI18n
from config.settings import Settings
from db.dal import promo_code_dal, security_dal, user_billing_dal, user_dal

from .notification_service import NotificationService
from .subscription_service import SubscriptionService


@dataclass
class PromoApplyResult:
    """Extended result of promo code application (MidasVPN-style)."""
    success: bool
    message: str
    bonus_days: int = 0
    discount_percent: float = 0.0
    bonus_balance_rub: float = 0.0
    bonus_traffic_gb: float = 0.0
    new_end_date: Optional[datetime] = None
    # Raw extras for the caller
    extras: Dict[str, Any] = field(default_factory=dict)


class PromoCodeService:
    def __init__(
        self,
        settings: Settings,
        subscription_service: SubscriptionService,
        bot: Bot,
        i18n: JsonI18n,
    ):
        self.settings = settings
        self.subscription_service = subscription_service
        self.bot = bot
        self.i18n = i18n

    def _throttle_identifier(self, user_id: int) -> str:
        return f"user:{int(user_id)}"

    async def apply_promo_code(
        self,
        session: AsyncSession,
        user_id: int,
        code_input: str,
        user_lang: str,
    ) -> Tuple[bool, datetime | str]:
        _ = lambda k, **kw: self.i18n.gettext(user_lang, k, **kw)
        code_input_upper = (code_input or "").strip().upper()[:100]
        code_display = html_escape(code_input_upper[:100], quote=False)
        throttle_identifier = self._throttle_identifier(user_id)

        throttle = await security_dal.check_throttle(
            session,
            scope=security_dal.PROMO_CODE_APPLY_SCOPE,
            identifier=throttle_identifier,
        )
        if throttle.locked:
            return False, _(
                "promo_code_too_many_attempts",
                seconds=throttle.retry_after or max(1, int(self.settings.BRUTE_FORCE_LOCK_SECONDS)),
            )

        promo_data = await promo_code_dal.get_active_promo_code_by_code_str(
            session, code_input_upper
        )

        if not promo_data:
            throttle_result = await security_dal.record_throttle_failure(
                session,
                scope=security_dal.PROMO_CODE_APPLY_SCOPE,
                identifier=throttle_identifier,
                max_failures=self.settings.BRUTE_FORCE_MAX_FAILURES,
                window_seconds=self.settings.BRUTE_FORCE_WINDOW_SECONDS,
                lock_seconds=self.settings.BRUTE_FORCE_LOCK_SECONDS,
            )
            if throttle_result.locked:
                return False, _(
                    "promo_code_too_many_attempts",
                    seconds=throttle_result.retry_after
                    or max(1, int(self.settings.BRUTE_FORCE_LOCK_SECONDS)),
                )
            return False, _("promo_code_not_found", code=code_display)

        existing_activation = await promo_code_dal.get_user_activation_for_promo(
            session, promo_data.promo_code_id, user_id
        )
        if existing_activation:
            return False, _("promo_code_already_used_by_user", code=code_display)

        bonus_days = promo_data.bonus_days

        new_end_date = await self.subscription_service.extend_active_subscription_days(
            session=session,
            user_id=user_id,
            bonus_days=bonus_days,
            reason=f"promo code {code_input_upper}",
        )

        if new_end_date:
            activation_recorded = await promo_code_dal.record_promo_activation(
                session, promo_data.promo_code_id, user_id, payment_id=None
            )
            promo_incremented = await promo_code_dal.increment_promo_code_usage(
                session, promo_data.promo_code_id
            )

            if activation_recorded and promo_incremented:
                await security_dal.clear_throttle_state(
                    session,
                    scope=security_dal.PROMO_CODE_APPLY_SCOPE,
                    identifier=throttle_identifier,
                )
                # Send notification about promo activation
                try:
                    notification_service = NotificationService(self.bot, self.settings, self.i18n)
                    user = await user_dal.get_user_by_id(session, user_id)
                    await notification_service.notify_promo_activation(
                        user_id=user_id,
                        promo_code=code_input_upper,
                        bonus_days=bonus_days,
                        username=user.username if user else None,
                    )
                except Exception as e:
                    logging.error(f"Failed to send promo activation notification: {e}")

                return True, new_end_date
            else:
                logging.error(
                    f"Failed to record activation or increment usage for promo {promo_data.code} by user {user_id}"  # noqa: E501
                )
                return False, _("error_applying_promo_bonus")
        else:
            return False, _("error_applying_promo_bonus")

    async def apply_promo_extended(
        self,
        session: AsyncSession,
        user_id: int,
        code_input: str,
        user_lang: str,
    ) -> "PromoApplyResult":
        """
        MidasVPN-style promo application that handles:
         • bonus_days  → extend subscription
         • discount_percent → returned for caller to apply to next payment
         • bonus_balance_kopecks → credited to user balance
         • bonus_traffic_bytes → added to active subscription traffic
        """
        _ = lambda k, **kw: self.i18n.gettext(user_lang, k, **kw)
        code_input_upper = (code_input or "").strip().upper()[:100]
        code_display = html_escape(code_input_upper[:100], quote=False)
        throttle_identifier = self._throttle_identifier(user_id)

        throttle = await security_dal.check_throttle(
            session,
            scope=security_dal.PROMO_CODE_APPLY_SCOPE,
            identifier=throttle_identifier,
        )
        if throttle.locked:
            msg = _("promo_code_too_many_attempts",
                    seconds=throttle.retry_after or max(1, int(self.settings.BRUTE_FORCE_LOCK_SECONDS)))
            return PromoApplyResult(success=False, message=msg)

        promo_data = await promo_code_dal.get_active_promo_code_by_code_str(
            session, code_input_upper
        )
        if not promo_data:
            throttle_result = await security_dal.record_throttle_failure(
                session,
                scope=security_dal.PROMO_CODE_APPLY_SCOPE,
                identifier=throttle_identifier,
                max_failures=self.settings.BRUTE_FORCE_MAX_FAILURES,
                window_seconds=self.settings.BRUTE_FORCE_WINDOW_SECONDS,
                lock_seconds=self.settings.BRUTE_FORCE_LOCK_SECONDS,
            )
            if throttle_result.locked:
                msg = _("promo_code_too_many_attempts",
                        seconds=throttle_result.retry_after
                        or max(1, int(self.settings.BRUTE_FORCE_LOCK_SECONDS)))
                return PromoApplyResult(success=False, message=msg)
            return PromoApplyResult(
                success=False,
                message=_("promo_code_not_found", code=code_display),
            )

        existing = await promo_code_dal.get_user_activation_for_promo(
            session, promo_data.promo_code_id, user_id
        )
        if existing:
            return PromoApplyResult(
                success=False,
                message=_("promo_code_already_used_by_user", code=code_display),
            )

        bonus_days = promo_data.bonus_days or 0
        discount_pct = promo_data.discount_percent or 0.0
        bonus_balance_kopecks = promo_data.bonus_balance_kopecks or 0
        bonus_traffic_bytes = promo_data.bonus_traffic_bytes or 0

        new_end_date = None
        if bonus_days > 0:
            new_end_date = await self.subscription_service.extend_active_subscription_days(
                session=session,
                user_id=user_id,
                bonus_days=bonus_days,
                reason=f"promo code {code_input_upper}",
            )

        if bonus_balance_kopecks > 0:
            await user_billing_dal.add_balance_kopecks(session, user_id, bonus_balance_kopecks)

        if bonus_traffic_bytes > 0:
            try:
                if hasattr(self.subscription_service, "add_traffic_bonus"):
                    await self.subscription_service.add_traffic_bonus(
                        session, user_id, bonus_traffic_bytes
                    )
            except Exception as exc:
                logging.warning("promo: failed to add traffic bonus for user %s: %s", user_id, exc)

        activation_recorded = await promo_code_dal.record_promo_activation(
            session, promo_data.promo_code_id, user_id, payment_id=None
        )
        await promo_code_dal.increment_promo_code_usage(session, promo_data.promo_code_id)

        if activation_recorded:
            await security_dal.clear_throttle_state(
                session,
                scope=security_dal.PROMO_CODE_APPLY_SCOPE,
                identifier=throttle_identifier,
            )

        # Build result summary
        parts = []
        if bonus_days:
            parts.append(f"🎁 <b>+{bonus_days} дн.</b> к подписке")
        if discount_pct:
            parts.append(f"💸 <b>{discount_pct:.0f}%</b> скидка на следующую покупку")
        if bonus_balance_kopecks:
            rub = bonus_balance_kopecks / 100
            parts.append(f"💰 <b>+{rub:.0f} ₽</b> на баланс")
        if bonus_traffic_bytes:
            gb = bonus_traffic_bytes / 1024 ** 3
            parts.append(f"📦 <b>+{gb:.0f} ГБ</b> трафика")

        summary = "\n".join(parts) if parts else "Промокод активирован!"

        return PromoApplyResult(
            success=True,
            message=summary,
            bonus_days=bonus_days,
            discount_percent=discount_pct,
            bonus_balance_rub=bonus_balance_kopecks / 100,
            bonus_traffic_gb=bonus_traffic_bytes / 1024 ** 3,
            new_end_date=new_end_date,
        )
