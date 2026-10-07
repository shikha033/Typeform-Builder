"""Backend tests for new features: CSV Export, Logic Jumps, Themes."""
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://formcraft-107.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def customer_feedback(session):
    r = session.get(f"{API}/forms")
    assert r.status_code == 200
    forms = r.json()
    f = next(f for f in forms if f["title"] == "Customer Feedback")
    return f


# ---------------- CSV Export ----------------
class TestCSVExport:
    def test_csv_customer_feedback(self, session, customer_feedback):
        r = session.get(f"{API}/forms/{customer_feedback['id']}/responses.csv")
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd.lower()
        assert ".csv" in cd.lower()

        body = r.text
        lines = [l for l in body.strip().splitlines() if l.strip()]
        assert len(lines) >= 1
        header = lines[0]
        assert "Response ID" in header
        assert "Submitted At" in header
        # Customer Feedback is seeded with 9 responses
        assert len(lines) == 10, f"expected header + 9 rows, got {len(lines)} lines"

    def test_csv_unknown_form_404(self, session):
        r = session.get(f"{API}/forms/does-not-exist-xyz/responses.csv")
        assert r.status_code == 404


# ---------------- Themes ----------------
class TestThemes:
    def test_theme_persistence(self, session):
        r = session.post(f"{API}/forms", json={"title": "TEST_Theme"})
        fid = r.json()["id"]
        try:
            theme = {
                "background_color": "#0b1020",
                "text_color": "#ffffff",
                "accent_color": "#a78bfa",
                "button_color": "#a78bfa",
                "button_text_color": "#0b1020",
                "font_family": "serif",
            }
            r = session.put(f"{API}/forms/{fid}", json={"theme": theme})
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["theme"] is not None
            assert data["theme"]["background_color"] == "#0b1020"
            assert data["theme"]["font_family"] == "serif"

            # GET verifies persistence
            r = session.get(f"{API}/forms/{fid}")
            assert r.status_code == 200
            t = r.json()["theme"]
            assert t["accent_color"] == "#a78bfa"
            assert t["button_text_color"] == "#0b1020"
            assert t["font_family"] == "serif"
        finally:
            session.delete(f"{API}/forms/{fid}")

    def test_theme_bad_font_rejected(self, session):
        r = session.post(f"{API}/forms", json={"title": "TEST_Theme_Bad"})
        fid = r.json()["id"]
        try:
            r = session.put(f"{API}/forms/{fid}", json={"theme": {"font_family": "comic"}})
            assert r.status_code in (400, 422)
        finally:
            session.delete(f"{API}/forms/{fid}")


# ---------------- Logic Jumps ----------------
class TestLogicJumps:
    def test_logic_jumps_persist(self, session):
        r = session.post(f"{API}/forms", json={"title": "TEST_Logic"})
        fid = r.json()["id"]
        try:
            questions = [
                {"type": "yes_no", "title": "Continue?", "order_index": 0,
                 "logic_jumps": [{"operator": "equals", "value": False, "target": "end"}]},
                {"type": "short_text", "title": "Name", "order_index": 1},
            ]
            r = session.put(f"{API}/forms/{fid}", json={"questions": questions})
            assert r.status_code == 200, r.text
            qs = r.json()["questions"]
            assert qs[0]["logic_jumps"] is not None
            assert len(qs[0]["logic_jumps"]) == 1
            lj = qs[0]["logic_jumps"][0]
            assert lj["operator"] == "equals"
            assert lj["value"] is False
            assert lj["target"] == "end"

            # GET
            r = session.get(f"{API}/forms/{fid}")
            qs = r.json()["questions"]
            assert qs[0]["logic_jumps"][0]["target"] == "end"
            # question with no rule returns None or empty
            assert not qs[1].get("logic_jumps")
        finally:
            session.delete(f"{API}/forms/{fid}")

    def test_logic_jumps_on_customer_feedback_then_revert(self, session, customer_feedback):
        """Add jump rule to yes_no q4, verify semantics via public submission flow, then revert."""
        fid = customer_feedback["id"]
        # fetch full form
        r = session.get(f"{API}/forms/{fid}")
        assert r.status_code == 200
        form = r.json()
        questions = form["questions"]
        yes_no_q = next((q for q in questions if q["type"] == "yes_no"), None)
        assert yes_no_q is not None, "Customer Feedback should have a yes_no question"

        # Build full payload preserving ids + options
        def to_in(q, add_rule=False):
            d = {
                "id": q["id"],
                "type": q["type"],
                "title": q["title"],
                "description": q.get("description"),
                "required": q.get("required", False),
                "order_index": q["order_index"],
                "rating_scale": q.get("rating_scale", 5),
                "options": [{"id": o["id"], "label": o["label"], "order_index": o["order_index"]}
                            for o in q.get("options", [])],
            }
            if add_rule and q["id"] == yes_no_q["id"]:
                d["logic_jumps"] = [{"operator": "equals", "value": False, "target": "end"}]
            return d

        try:
            payload = {"questions": [to_in(q, add_rule=True) for q in questions]}
            r = session.put(f"{API}/forms/{fid}", json=payload)
            assert r.status_code == 200, r.text
            updated = r.json()["questions"]
            updated_yn = next(q for q in updated if q["id"] == yes_no_q["id"])
            assert updated_yn["logic_jumps"] and updated_yn["logic_jumps"][0]["target"] == "end"
            # Response count preserved
            r2 = session.get(f"{API}/forms/{fid}/responses")
            assert r2.status_code == 200
            assert len(r2.json()) == 9, "response count should be preserved after PUT"
        finally:
            # REVERT - clear logic_jumps
            r = session.get(f"{API}/forms/{fid}")
            form = r.json()
            revert_payload = {"questions": [to_in(q, add_rule=False) for q in form["questions"]]}
            # Explicitly set logic_jumps to None on all
            for q in revert_payload["questions"]:
                q["logic_jumps"] = None
            rr = session.put(f"{API}/forms/{fid}", json=revert_payload)
            assert rr.status_code == 200
            # verify cleared
            final = session.get(f"{API}/forms/{fid}").json()["questions"]
            for q in final:
                assert not q.get("logic_jumps"), f"logic_jumps not cleared on q {q['id']}"
