"""Nothing that identifies a student leaves for the external LLM."""
from app.insights import llm


def test_identifiers_are_redacted_before_any_llm_call(monkeypatch, tmp_path):
    sent = []
    monkeypatch.setattr(llm, "provider", lambda: "azure-openai")
    monkeypatch.setattr(llm, "_cache", {})                         # isolated: never read or write the real cache
    monkeypatch.setattr(llm, "CACHE_FILE", tmp_path / "llm_cache.json")
    monkeypatch.setattr(llm, "_azure", lambda prompt, json_mode, timeout_s: sent.append(prompt) or "{}")
    llm.generate("Why is CU25CSE0042 (asha.v@cumail.in, +91 98765 43210, 9876543210) flagged? Also cu24aiml0007")
    assert sent, "the LLM was not called"
    p = sent[0]
    for leaked in ("CU25CSE0042", "cu24aiml0007", "asha.v@cumail.in", "98765 43210", "9876543210"):
        assert leaked not in p, leaked
    assert "[student-id]" in p and "[email]" in p and "[phone]" in p


def test_redaction_keeps_ordinary_numbers():
    assert llm.redact("ECE year 2 students with attendance under 70% and 3 backlogs") == \
        "ECE year 2 students with attendance under 70% and 3 backlogs"


def test_kill_switch_stops_all_external_calls(monkeypatch, tmp_path):
    monkeypatch.setenv("ASCORA_LLM", "off")
    monkeypatch.setattr(llm, "_cache", {})
    monkeypatch.setattr(llm, "CACHE_FILE", tmp_path / "c.json")
    called = []
    monkeypatch.setattr(llm, "_azure", lambda *a, **k: called.append(1) or "x")
    assert llm.provider() == "none"
    assert llm.generate("anything") is None and not called
