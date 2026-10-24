"""Self-hosted visual captcha for the demo sandbox.

The text is drawn as scattered pixel blocks from a 5x7 bitmap font, never as SVG text, so the answer is not present in the
markup. It is a demonstration of the challenge lifecycle (single use, regenerated after every attempt), not a defence
against a determined bot; real portal captchas belong to the portal and are never solved or bypassed by this service."""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

ALPHABET = "23456789ACEFHJKLMNPRTUXY"

FONT = {
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    "J": ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
}
assert set(ALPHABET) == set(FONT), "every captcha character needs a glyph"
LENGTH = 5


def new_text() -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(LENGTH))


def render(text: str) -> str:
    """SVG data URI for `text`."""
    rnd = secrets.SystemRandom()
    cell, gap = 5, 12
    w, h = LENGTH * (5 * cell + gap) + gap, 7 * cell + 34
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="Captcha image">',
             f'<rect width="{w}" height="{h}" fill="#f4f1ea"/>']
    for _ in range(6):                                          # distractor strokes
        x1, x2 = rnd.randint(0, w), rnd.randint(0, w)
        parts.append(f'<line x1="{x1}" y1="{rnd.randint(0, h)}" x2="{x2}" y2="{rnd.randint(0, h)}" stroke="#b9b2a4" stroke-width="{rnd.choice([1, 2])}"/>')
    for i, ch in enumerate(text):
        ox = gap + i * (5 * cell + gap) + rnd.randint(-2, 2)
        oy = 14 + rnd.randint(-5, 5)
        shade = rnd.choice(["#1d3b2f", "#23405a", "#5a2a2a", "#3b2a5a"])
        for r, row in enumerate(FONT[ch]):
            for c, bit in enumerate(row):
                if bit == "1":
                    jx, jy = rnd.uniform(-0.8, 0.8), rnd.uniform(-0.8, 0.8)
                    parts.append(f'<rect x="{ox + c * cell + jx:.1f}" y="{oy + r * cell + jy:.1f}" width="{cell - 0.6}" height="{cell - 0.6}" fill="{shade}"/>')
    for _ in range(40):                                         # speckle
        parts.append(f'<circle cx="{rnd.randint(0, w)}" cy="{rnd.randint(0, h)}" r="{rnd.choice([0.8, 1.2])}" fill="#8f877a"/>')
    parts.append("</svg>")
    return "data:image/svg+xml;base64," + base64.b64encode("".join(parts).encode()).decode()


def digest(text: str, salt: bytes) -> str:
    return hmac.new(salt, text.strip().upper().encode(), hashlib.sha256).hexdigest()


def matches(attempt: str, salt: bytes, expected_digest: str) -> bool:
    return hmac.compare_digest(digest(attempt or "", salt), expected_digest)
