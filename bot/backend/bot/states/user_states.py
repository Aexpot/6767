from aiogram.fsm.state import State, StatesGroup


class UserPromoStates(StatesGroup):
    waiting_for_promo_code = State()


class MidasPurchaseStates(StatesGroup):
    """Multi-step purchase flow: period → devices → traffic → confirm."""
    choosing_period = State()
    choosing_devices = State()
    choosing_traffic = State()
    confirming = State()


class MidasTopupStates(StatesGroup):
    """Balance top-up flow."""
    choosing_amount = State()
    waiting_payment = State()


class MidasWithdrawStates(StatesGroup):
    """Referral income withdrawal flow."""
    entering_details = State()
