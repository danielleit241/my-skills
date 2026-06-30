"""UTF-8 stdio helpers for hook entrypoints.

Windows can default Python stdin/stdout to the active console code page. Hook
payloads are JSON bytes from the host runtime and may contain raw Unicode, so
entrypoints should opt into UTF-8 before reading or writing.
"""

import json
import sys
from typing import Any


def configure_utf8_stdio() -> None:
    for stream_name in ("stdin", "stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            try:
                reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass


def read_stdin(max_chars: int) -> str:
    configure_utf8_stdio()
    return sys.stdin.read(max_chars)


def write_json(payload: Any) -> None:
    configure_utf8_stdio()
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))
    sys.stdout.flush()
