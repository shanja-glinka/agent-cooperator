"""Reprice the sanitized request lines using Python's standard library."""
import hashlib
import json
from collections import Counter, defaultdict
from decimal import Decimal
from pathlib import Path

directory = Path(__file__).resolve().parent
ledger = directory / "interrupted-requests.jsonl"
million = Decimal(1_000_000)
codex_rates = {
    "gpt-6.2-sol": ("50", "2.5", "250"),
    "gpt-6-luna": ("2.5", "0.25", "12.5"),
}
claude_rates = {
    "claude-opus-5-5": ("4", "5", "8", "0.2", "20"),
    "claude-haiku-5-5": ("0.1", "0.125", "0.2", "0.01", "0.5"),
}
haiku_long = ("0.5", "0.625", "1", "0.05", "2.5")


def priced(tokens, rates):
    return sum(count * Decimal(rate) for count, rate in zip(tokens, rates, strict=True)) / million


totals = defaultdict(Counter)
attempts = defaultdict(Counter)
billed = Counter()
for row in map(json.loads, ledger.read_text().splitlines()):
    model = row["model"]
    subtotal = totals[model]
    if model in codex_rates:
        if row["cacheWrite"] or not 0 <= row["reasoning"] <= row["output"]:
            raise ValueError("Unexpected accounting for reasoning or cache writes")
        tokens = [row["input"] - row["cached"], row["cached"], row["output"]]
        amounts = dict(zip(("fresh", "cached", "output"), tokens, strict=True))
        amounts["reasoningSubset"] = row["reasoning"]
        cost = priced(tokens, codex_rates[model])
        unit = "standardCredits"
    else:
        tokens = [row[key] for key in ("in", "w5", "w1", "cr", "out")]
        amounts = dict(zip(("fresh", "cacheWrite5m", "cacheWrite1h", "cached", "output"), tokens, strict=True))
        long_haiku = model == "claude-haiku-5-5" and sum(tokens[:4]) > 100_000
        rates = haiku_long if long_haiku else claude_rates[model]
        cost = priced(tokens, rates)
        unit = "listUsd"
        subtotal["longHaikuRequests"] += int(long_haiku)
    if min(tokens) < 0:
        raise ValueError("Negative token count")
    subtotal.update(amounts)
    subtotal["requests"] += 1
    subtotal[unit] += cost
    attempts[row["cell"]]["requests"] += 1
    attempts[row["cell"]][unit] += cost
    billed[unit] += cost

assert billed["standardCredits"] == Decimal("98.2093385")
assert billed["listUsd"] == Decimal("1.31505664")
assert sum(x["requests"] for x in totals.values()) == 459
assert sum(totals[m]["requests"] for m in codex_rates) == 343
report = {
    "requestLedgerSha256": hashlib.sha256(ledger.read_bytes()).hexdigest(),
    "requestRows": 459,
    "byModel": dict(sorted(totals.items())),
    "byAttempt": dict(sorted(attempts.items())),
    "totals": billed,
}
print(json.dumps(report, indent=2, default=str))
