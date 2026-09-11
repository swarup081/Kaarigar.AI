"""Retry for transient upstream failures.

Gemini returns 503 "high demand" and 429 "quota" as ordinary, temporary
conditions. Observed in practice: a pricing call failed with 503 and the
identical request succeeded four seconds later, the difference being a
floor-only answer of Rs 1,188 versus a fully reasoned Rs 1,723.

Giving up on the first 503 throws away a much better answer for the artisan,
so retry briefly before falling back.

Deliberately short. The artisan is standing there holding the product, and a
listing that arrives a minute late is its own kind of failure. Two retries at
roughly 1.5s and 4s adds about six seconds in the worst case, which stays
inside the latency budget.
"""

from __future__ import annotations

import logging
import random
import time
from typing import Callable, TypeVar

log = logging.getLogger(__name__)

T = TypeVar("T")

# Substrings that mark a failure as worth retrying. Matching on the message
# keeps this independent of which exception class the SDK raises.
TRANSIENT_MARKERS = (
    "503",
    "unavailable",
    "high demand",
    "429",
    "resource_exhausted",
    "rate limit",
    "deadline",
    "timeout",
    "internal error",
    "500",
)

MAX_ATTEMPTS = 3
BASE_DELAY_SECONDS = 1.5


def is_transient(error: BaseException) -> bool:
    """Whether the same request could plausibly succeed if sent again."""
    text = str(error).lower()
    return any(marker in text for marker in TRANSIENT_MARKERS)


def with_retry(operation: Callable[[], T], *, label: str = "model call") -> T:
    """Runs `operation`, retrying only failures that look transient.

    A permanent error, a bad key or a retired model, raises on the first
    attempt. Retrying those wastes the artisan's time and changes nothing.
    """
    last_error: BaseException | None = None

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            return operation()
        except Exception as error:  # noqa: BLE001
            last_error = error

            if not is_transient(error):
                raise

            if attempt == MAX_ATTEMPTS:
                log.warning("%s failed after %d attempts: %s", label, attempt, error)
                raise

            # Jitter so that several phones failing together do not retry in
            # lockstep and reproduce the spike that caused the 503.
            delay = BASE_DELAY_SECONDS * (2 ** (attempt - 1))
            delay *= 0.75 + random.random() * 0.5
            log.info("%s hit a transient error, retry %d in %.1fs: %s",
                     label, attempt, delay, str(error)[:120])
            time.sleep(delay)

    assert last_error is not None
    raise last_error
