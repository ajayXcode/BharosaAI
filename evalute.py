"""Deterministic financial calculations for the Bharosa AI project.

All monetary inputs and outputs are integer paise. Rates are annual percentages
unless a function says otherwise. This module is intentionally dependency-free
so it can be imported by tests or run directly.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, localcontext
from typing import Any, Iterable


_ZERO = Decimal("0")
_ONE = Decimal("1")
_HUNDRED = Decimal("100")
_MONTHS_PER_YEAR = Decimal("12")
_PRECISION = 40


def _decimal(value: Any, name: str) -> Decimal:
    if isinstance(value, bool):
        raise ValueError(f"{name} must be a finite number")
    try:
        result = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError(f"{name} must be a finite number") from None
    if not result.is_finite():
        raise ValueError(f"{name} must be a finite number")
    return result


def _money(value: Any, name: str, *, allow_zero: bool = True) -> int:
    number = _decimal(value, name)
    if number != number.to_integral_value():
        raise ValueError(f"{name} must be an integer number of paise")
    result = int(number)
    if result < 0 or (not allow_zero and result == 0):
        qualifier = "positive" if not allow_zero else "non-negative"
        raise ValueError(f"{name} must be {qualifier}")
    return result


def _rate(value: Any, name: str = "annual_pct") -> Decimal:
    result = _decimal(value, name)
    if result < 0:
        raise ValueError(f"{name} must be non-negative")
    return result


def _count(value: Any, name: str, *, minimum: int = 1) -> int:
    number = _decimal(value, name)
    if number != number.to_integral_value():
        raise ValueError(f"{name} must be an integer")
    result = int(number)
    if result < minimum:
        raise ValueError(f"{name} must be at least {minimum}")
    return result


def _round_paise(value: Decimal) -> int:
    return int(value.quantize(_ONE, rounding=ROUND_HALF_UP))


def _monthly_rate(annual_pct: Any) -> Decimal:
    return _rate(annual_pct) / _HUNDRED / _MONTHS_PER_YEAR


def calculate_emi(principal_paise: int, annual_pct: float, months: int) -> int:
    """Return rounded monthly EMI in paise using a fixed-rate reducing balance."""
    principal = _money(principal_paise, "principal_paise", allow_zero=False)
    term = _count(months, "months")
    rate = _monthly_rate(annual_pct)
    with localcontext() as context:
        context.prec = _PRECISION
        if rate == 0:
            return _round_paise(Decimal(principal) / term)
        factor = (_ONE + rate) ** term
        return _round_paise(Decimal(principal) * rate * factor / (factor - _ONE))


def calculate_total_repayment(
    principal_paise: int,
    annual_pct: float,
    months: int,
    fees_paise: int = 0,
) -> int:
    """Return total instalments plus upfront fees, in paise."""
    fees = _money(fees_paise, "fees_paise")
    return calculate_emi(principal_paise, annual_pct, months) * _count(
        months, "months"
    ) + fees


def calculate_interest(
    principal_paise: int,
    annual_pct: float,
    months: int,
) -> int:
    """Return scheduled interest in paise, excluding fees."""
    principal = _money(principal_paise, "principal_paise", allow_zero=False)
    total_installments = calculate_emi(principal, annual_pct, months) * _count(
        months, "months"
    )
    return max(0, total_installments - principal)


def _present_value(monthly_rate: Decimal, payment_paise: int, months: int) -> Decimal:
    if monthly_rate == 0:
        return Decimal(payment_paise * months)
    with localcontext() as context:
        context.prec = _PRECISION
        return (
            Decimal(payment_paise)
            * (_ONE - (_ONE + monthly_rate) ** (-months))
            / monthly_rate
        )


def calculate_effective_cost(
    net_disbursal_paise: int, payment_paise: int, months: int
) -> float:
    """Solve monthly cash-flow IRR and return the annual effective rate in percent."""
    net = _money(net_disbursal_paise, "net_disbursal_paise", allow_zero=False)
    payment = _money(payment_paise, "payment_paise", allow_zero=False)
    term = _count(months, "months")
    if payment * term < net:
        raise ValueError("payment_paise * months must cover the disbursed amount")
    if payment * term == net:
        return 0.0
    low, high = _ZERO, _ONE
    for _ in range(160):
        mid = (low + high) / 2
        if _present_value(mid, payment, term) > net:
            low = mid
        else:
            high = mid
    monthly = (low + high) / 2
    with localcontext() as context:
        context.prec = _PRECISION
        annual_effective = ((_ONE + monthly) ** 12 - _ONE) * _HUNDRED
    return float(annual_effective)


def calculate_loan(
    principal_paise: int,
    annual_pct: float,
    months: int,
    fees_paise: int = 0,
    other_fees_paise: int = 0,
    prepay_pct: float = 0,
    prepay_fee_paise: int = 0,
) -> dict[str, int | float]:
    """Calculate an offer summary, including fee-adjusted effective APR."""
    principal = _money(principal_paise, "principal_paise", allow_zero=False)
    fees = _money(fees_paise, "fees_paise") + _money(
        other_fees_paise, "other_fees_paise"
    )
    if fees >= principal:
        raise ValueError("total fees must be less than principal")
    prepay_rate = _rate(prepay_pct, "prepay_pct")
    fixed_prepay_fee = _money(prepay_fee_paise, "prepay_fee_paise")
    term = _count(months, "months")
    payment = calculate_emi(principal, annual_pct, term)
    net_disbursal = principal - fees
    year_month = min(term, 12)
    balance_after_year = calculate_outstanding_balance(
        principal, annual_pct, term, year_month
    )
    prepayment_charge = _round_paise(
        Decimal(balance_after_year) * prepay_rate / _HUNDRED
        + fixed_prepay_fee
    )
    return {
        "principal_paise": principal,
        "emi_paise": payment,
        "months": term,
        "total_paise": payment * term + fees,
        "interest_paise": max(0, payment * term - principal),
        "fees_paise": fees,
        "net_disbursal_paise": net_disbursal,
        "apr_pct": calculate_effective_cost(net_disbursal, payment, term),
        "prepay_paise": prepayment_charge,
        "outstanding_after_year_paise": balance_after_year,
    }


def calculate_outstanding_balance(
    principal_paise: int, annual_pct: float, months: int, paid_months: int
) -> int:
    """Return the loan balance after the requested number of paid instalments."""
    principal = _money(principal_paise, "principal_paise", allow_zero=False)
    term = _count(months, "months")
    paid = _count(paid_months, "paid_months", minimum=0)
    if paid > term:
        raise ValueError("paid_months cannot exceed months")
    if paid == term:
        return 0
    rate = _monthly_rate(annual_pct)
    with localcontext() as context:
        context.prec = _PRECISION
        if rate == 0:
            return max(0, _round_paise(Decimal(principal) * (term - paid) / term))
        factor = (_ONE + rate) ** paid
        payment = Decimal(calculate_emi(principal, annual_pct, term))
        balance = Decimal(principal) * factor - payment * (factor - _ONE) / rate
        return max(0, _round_paise(balance))


@dataclass(frozen=True)
class Installment:
    """One monthly amortization row; amounts are integer paise."""

    month: int
    opening_balance_paise: int
    payment_paise: int
    interest_paise: int
    principal_paise: int
    closing_balance_paise: int

    def as_dict(self) -> dict[str, int]:
        return {
            "month": self.month,
            "opening_balance_paise": self.opening_balance_paise,
            "payment_paise": self.payment_paise,
            "interest_paise": self.interest_paise,
            "principal_paise": self.principal_paise,
            "closing_balance_paise": self.closing_balance_paise,
        }


def generate_amortization_schedule(
    principal_paise: int, annual_pct: float, months: int
) -> list[dict[str, int]]:
    """Generate a full fixed-rate schedule and adjust the final payment to zero."""
    principal = _money(principal_paise, "principal_paise", allow_zero=False)
    term = _count(months, "months")
    rate = _monthly_rate(annual_pct)
    scheduled_payment = calculate_emi(principal, annual_pct, term)
    balance = principal
    rows: list[dict[str, int]] = []
    with localcontext() as context:
        context.prec = _PRECISION
        for month in range(1, term + 1):
            opening = balance
            interest = _round_paise(Decimal(opening) * rate)
            amount_due = opening + interest
            payment = min(scheduled_payment, amount_due)
            if month == term:
                payment = amount_due
            principal_paid = min(opening, max(0, payment - interest))
            balance = max(0, opening - principal_paid)
            row = Installment(
                month=month,
                opening_balance_paise=opening,
                payment_paise=payment,
                interest_paise=interest,
                principal_paise=principal_paid,
                closing_balance_paise=balance,
            )
            rows.append(row.as_dict())
            if balance == 0:
                break
    return rows


def run_affordability_scenario(
    monthly_income_paise: int,
    monthly_expenses_paise: int,
    existing_emi_paise: int,
    proposed_emi_paise: int,
    *,
    max_debt_to_income_pct: float = 50,
) -> dict[str, int | float | bool]:
    """Assess monthly cash flow and debt-to-income ratio; not a lending decision."""
    income = _money(monthly_income_paise, "monthly_income_paise", allow_zero=False)
    expenses = _money(monthly_expenses_paise, "monthly_expenses_paise")
    existing = _money(existing_emi_paise, "existing_emi_paise")
    proposed = _money(proposed_emi_paise, "proposed_emi_paise")
    threshold = _rate(max_debt_to_income_pct, "max_debt_to_income_pct")
    if threshold > 100:
        raise ValueError("max_debt_to_income_pct cannot exceed 100")
    total_debt = existing + proposed
    dti = Decimal(total_debt) * _HUNDRED / Decimal(income)
    remaining = income - expenses - total_debt
    return {
        "monthly_income_paise": income,
        "monthly_expenses_paise": expenses,
        "existing_emi_paise": existing,
        "proposed_emi_paise": proposed,
        "total_debt_payment_paise": total_debt,
        "remaining_after_obligations_paise": remaining,
        "debt_to_income_pct": float(dti),
        "within_dti_limit": dti <= threshold,
        "cash_flow_positive": remaining >= 0,
        "affordable_under_assumptions": dti <= threshold and remaining >= 0,
    }


def evaluate_prepayment(
    principal_paise: int,
    annual_pct: float,
    months: int,
    paid_months: int,
    prepay_pct: float = 0,
    prepay_fee_paise: int = 0,
) -> dict[str, int | bool]:
    """Compare remaining scheduled interest with the prepayment charge."""
    term = _count(months, "months")
    paid = _count(paid_months, "paid_months", minimum=0)
    if paid >= term:
        raise ValueError("paid_months must be less than months for prepayment")
    balance = calculate_outstanding_balance(principal_paise, annual_pct, term, paid)
    payment = calculate_emi(principal_paise, annual_pct, term)
    charge = _round_paise(
        Decimal(balance) * _rate(prepay_pct, "prepay_pct") / _HUNDRED
        + _money(prepay_fee_paise, "prepay_fee_paise")
    )
    remaining_interest = max(0, payment * (term - paid) - balance)
    net_saving = remaining_interest - charge
    return {
        "paid_months": paid,
        "outstanding_paise": balance,
        "prepayment_charge_paise": charge,
        "remaining_interest_if_continued_paise": remaining_interest,
        "net_saving_paise": net_saving,
        "prepayment_saves_money": net_saving >= 0,
    }


def compare_loan_offers(
    offers: Iterable[dict[str, Any]],
) -> dict[str, Any]:
    """Compare at least two loan offers by total cost and effective APR."""
    calculated: list[dict[str, Any]] = []
    for index, offer in enumerate(offers):
        if not isinstance(offer, dict):
            raise ValueError(f"offer {index} must be a dictionary")
        name = str(offer.get("name", f"Offer {index + 1}"))
        result = calculate_loan(
            principal_paise=offer.get("principal_paise"),
            annual_pct=offer.get("annual_pct"),
            months=offer.get("months"),
            fees_paise=offer.get("fees_paise", 0),
            other_fees_paise=offer.get("other_fees_paise", 0),
            prepay_pct=offer.get("prepay_pct", 0),
            prepay_fee_paise=offer.get("prepay_fee_paise", 0),
        )
        calculated.append({"name": name, **result})
    if len(calculated) < 2:
        raise ValueError("at least two loan offers are required")
    cheaper = min(calculated, key=lambda offer: offer["total_paise"])
    lower_apr = min(calculated, key=lambda offer: offer["apr_pct"])
    return {
        "offers": calculated,
        "cheaper_offer": cheaper["name"],
        "lower_apr_offer": lower_apr["name"],
        "difference_paise": abs(
            int(calculated[0]["total_paise"]) - int(calculated[1]["total_paise"])
        ),
    }


def calculate_health_claim(
    claim_paise: int,
    room_per_day_paise: int,
    room_cap_paise: int,
    room_days: int,
    copay_pct: float = 0,
) -> dict[str, int]:
    """Estimate insurer payment after room-cap deduction and co-pay."""
    claim = _money(claim_paise, "claim_paise")
    room_rate = _money(room_per_day_paise, "room_per_day_paise")
    room_cap = _money(room_cap_paise, "room_cap_paise")
    days = _count(room_days, "room_days", minimum=0)
    copay = _rate(copay_pct, "copay_pct")
    if copay > 100:
        raise ValueError("copay_pct cannot exceed 100")
    room_deduction = min(claim, max(0, room_rate - room_cap) * days)
    admissible = max(0, claim - room_deduction)
    copay_amount = _round_paise(Decimal(admissible) * copay / _HUNDRED)
    insurer_pays = max(0, admissible - copay_amount)
    return {
        "claim_paise": claim,
        "room_deduction_paise": room_deduction,
        "admissible_paise": admissible,
        "copay_paise": copay_amount,
        "insurer_pays_paise": insurer_pays,
        "out_of_pocket_paise": claim - insurer_pays,
    }


def calculate_card_minimum_due(
    balance_paise: int, minimum_due_pct: float, floor_paise: int
) -> int:
    """Return the greater of the percentage minimum due and its floor."""
    balance = _money(balance_paise, "balance_paise")
    percentage = _rate(minimum_due_pct, "minimum_due_pct")
    floor = _money(floor_paise, "floor_paise")
    return min(balance, max(floor, _round_paise(Decimal(balance) * percentage / _HUNDRED)))


def evaluate_credit_card_revolving(
    balance_paise: int,
    annual_pct: float,
    minimum_due_pct: float = 5,
    minimum_due_floor_paise: int = 20_000,
    *,
    max_months: int = 120,
) -> dict[str, int | bool]:
    """Estimate minimum-due repayment with monthly compounding and no new spend."""
    balance = _money(balance_paise, "balance_paise")
    rate = _monthly_rate(annual_pct)
    min_pct = _rate(minimum_due_pct, "minimum_due_pct")
    if min_pct > 100:
        raise ValueError("minimum_due_pct cannot exceed 100")
    floor = _money(minimum_due_floor_paise, "minimum_due_floor_paise")
    limit = _count(max_months, "max_months")
    if balance == 0:
        return {
            "starting_balance_paise": 0,
            "monthly_interest_paise": 0,
            "minimum_due_paise": 0,
            "months_at_minimum_due": 0,
            "interest_at_minimum_due_paise": 0,
            "paid_within_limit": True,
        }
    monthly_interest = _round_paise(Decimal(balance) * rate)
    first_minimum = calculate_card_minimum_due(balance, min_pct, floor)
    current = Decimal(balance)
    total_interest = _ZERO
    months = 0
    with localcontext() as context:
        context.prec = _PRECISION
        while current > 0 and months < limit:
            charge = current * rate
            due = max(current * min_pct / _HUNDRED, Decimal(floor))
            payment = min(current + charge, due)
            current = max(_ZERO, current + charge - payment)
            total_interest += charge
            months += 1
    return {
        "starting_balance_paise": balance,
        "monthly_interest_paise": monthly_interest,
        "minimum_due_paise": first_minimum,
        "months_at_minimum_due": months,
        "interest_at_minimum_due_paise": _round_paise(total_interest),
        "paid_within_limit": current == 0,
    }


def _self_test() -> None:
    assert calculate_emi(10_000_000, 0, 10) == 1_000_000
    assert calculate_emi(10_000_000, 12, 12) == 888_488
    assert calculate_interest(10_000_000, 0, 10) == 0
    schedule = generate_amortization_schedule(10_000_000, 0, 10)
    assert len(schedule) == 10
    assert schedule[-1]["closing_balance_paise"] == 0
    scenario = run_affordability_scenario(500_000, 200_000, 50_000, 100_000)
    assert scenario["remaining_after_obligations_paise"] == 150_000
    claim = calculate_health_claim(1_000_000, 50_000, 30_000, 2, 10)
    assert claim["out_of_pocket_paise"] == 136_000
    card = evaluate_credit_card_revolving(0, 36)
    assert card["months_at_minimum_due"] == 0


if __name__ == "__main__":
    _self_test()
    print("evalute.py self-tests passed")
