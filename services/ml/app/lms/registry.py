"""Finds every adapter module in `adapters/` and indexes it by `university_id`. No core change is needed to add one."""
from __future__ import annotations

import importlib
import inspect
import pkgutil

from . import adapters
from .base import UniversityLMSAdapter

_REGISTRY: dict[str, UniversityLMSAdapter] | None = None


def discover() -> dict[str, UniversityLMSAdapter]:
    global _REGISTRY
    if _REGISTRY is None:
        found: dict[str, UniversityLMSAdapter] = {}
        for m in pkgutil.iter_modules(adapters.__path__):
            mod = importlib.import_module(f"{adapters.__name__}.{m.name}")
            for _, cls in inspect.getmembers(mod, inspect.isclass):
                if cls.__module__ == mod.__name__ and issubclass(cls, UniversityLMSAdapter) and getattr(cls, "university_id", None):
                    inst = cls()
                    if inst.university_id in found:
                        raise RuntimeError(f"duplicate university_id {inst.university_id}")
                    found[inst.university_id] = inst
        _REGISTRY = dict(sorted(found.items()))
    return _REGISTRY


def get(university_id: str) -> UniversityLMSAdapter | None:
    return discover().get(university_id)
