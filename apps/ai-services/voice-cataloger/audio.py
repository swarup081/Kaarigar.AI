"""Audio inspection.

Deliberately thin. Gemini accepts phone recordings as they come, including the
m4a that expo-audio produces, so there is no transcoding step. All this module
does is refuse recordings that cannot produce a useful listing, which is the
cheapest possible way to avoid burning a model call.
"""

from __future__ import annotations

import json
import shutil
import subprocess

# Extension to MIME type. Gemini accepts all of these directly.
MIME_TYPES = {
    "m4a": "audio/m4a",
    "mp4": "audio/m4a",
    "aac": "audio/aac",
    "wav": "audio/wav",
    "mp3": "audio/mp3",
    "ogg": "audio/ogg",
    "opus": "audio/opus",
    "flac": "audio/flac",
    "webm": "audio/webm",
}


def mime_for(filename: str | None, fallback: str | None = None) -> str | None:
    """Best guess at the MIME type, preferring the extension over the browser's claim."""
    if filename and "." in filename:
        extension = filename.rsplit(".", 1)[-1].lower()
        if extension in MIME_TYPES:
            return MIME_TYPES[extension]

    if fallback and fallback.startswith("audio/"):
        return fallback
    return None


def duration_seconds(path: str) -> float | None:
    """Duration via ffprobe.

    Returns None when ffprobe is not installed rather than failing the request.
    The duration gate is a courtesy, not a correctness requirement, and refusing
    to run without ffmpeg on the host would be a worse trade.
    """
    if shutil.which("ffprobe") is None:
        return None

    try:
        output = subprocess.run(
            [
                "ffprobe",
                "-v",
                "quiet",
                "-print_format",
                "json",
                "-show_format",
                path,
            ],
            capture_output=True,
            text=True,
            timeout=15,
            check=True,
        )
        payload = json.loads(output.stdout)
        return float(payload["format"]["duration"])
    except (subprocess.SubprocessError, KeyError, ValueError, json.JSONDecodeError):
        return None
