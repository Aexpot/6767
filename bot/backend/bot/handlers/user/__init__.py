from aiogram import Router

from . import (
    midas_manage,
    midas_menu,
    midas_promo,
    midas_purchase,
    midas_referral,
    midas_topup,
    promo_user,
    referral,
    start,
    subscription_management,
    trial_handler,
)

# TODO: after splitting subscription into a package, replace this import
from .subscription import router as subscription_router

user_router_aggregate = Router(name="user_router_aggregate")

# MidasVPN main menu & sections (high priority — placed first)
user_router_aggregate.include_router(midas_menu.router)
user_router_aggregate.include_router(midas_purchase.router)
user_router_aggregate.include_router(midas_manage.router)
user_router_aggregate.include_router(midas_promo.router)
user_router_aggregate.include_router(midas_referral.router)
user_router_aggregate.include_router(midas_topup.router)

# Legacy / original routers (kept for backwards-compatibility)
user_router_aggregate.include_router(promo_user.router)
user_router_aggregate.include_router(trial_handler.router)
user_router_aggregate.include_router(start.router)
user_router_aggregate.include_router(subscription_router)
user_router_aggregate.include_router(subscription_management.router)
user_router_aggregate.include_router(referral.router)
