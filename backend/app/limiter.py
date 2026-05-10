"""Rate limiter singleton with a no-op fallback when SlowAPI is unavailable."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
except ModuleNotFoundError:
    class _NoOpLimiter:
        def limit(self, _value: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
            def _decorator(func: Callable[..., Any]) -> Callable[..., Any]:
                return func

            return _decorator

    limiter: Limiter | _NoOpLimiter = _NoOpLimiter()
else:
    limiter = Limiter(key_func=get_remote_address)
