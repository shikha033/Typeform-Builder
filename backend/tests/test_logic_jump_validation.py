"""Backend tests for logic-jump-aware required-field validation in validate_and_build_answers."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"


def _create_form_with_questions(title, questions_payload):
    """Helper: POST /api/forms (title only), then PUT questions, then return (form_id, form)."""
    r = requests.post(f"{API}/forms", json={"title": title})
    assert r.status_code == 201, r.text
    form_id = r.json()["id"]
    r2 = requests.put(f"{API}/forms/{form_id}", json={"questions": questions_payload})
    assert r2.status_code == 200, r2.text
    return form_id, r2.json()


@pytest.fixture(scope="module")
def jump_form():
    """Q1 yes_no required with jump-to-end on true, Q2 short_text required, Q3 short_text optional."""
    questions = [
        {
            "type": "yes_no",
            "title": "Are you done?",
            "required": True,
            "logic_jumps": [
                {"operator": "equals", "value": True, "target": "end"}
            ],
        },
        {"type": "short_text", "title": "Your name", "required": True},
        {"type": "short_text", "title": "Comments", "required": False},
    ]
    form_id, form = _create_form_with_questions("TEST_logic_jump_form", questions)
    pr = requests.post(f"{API}/forms/{form_id}/publish")
    assert pr.status_code == 200, pr.text
    form = pr.json()
    slug = form["public_slug"]
    yield form, slug
    requests.delete(f"{API}/forms/{form_id}")


def _qid(form, title):
    return next(q["id"] for q in form["questions"] if q["title"] == title)


class TestLogicJumpValidation:
    """Verify validate_and_build_answers only enforces required on traversed questions."""

    def test_positive_jump_skips_required(self, jump_form):
        """Q1=true triggers jump-to-end, so Q2 (required) is skipped -> 201."""
        form, slug = jump_form
        q1 = _qid(form, "Are you done?")
        r = requests.post(
            f"{API}/public/forms/{slug}/responses",
            json={"answers": [{"question_id": q1, "value": True}]},
        )
        assert r.status_code == 201, r.text
        assert "id" in r.json()

    def test_negative_no_jump_still_enforces_required(self, jump_form):
        """Q1=false does NOT trigger the jump; Q2 is traversed and required -> 400."""
        form, slug = jump_form
        q1 = _qid(form, "Are you done?")
        r = requests.post(
            f"{API}/public/forms/{slug}/responses",
            json={"answers": [{"question_id": q1, "value": False}]},
        )
        assert r.status_code == 400, r.text
        detail = r.json().get("detail", "")
        assert "Your name" in detail or "required" in detail.lower()

    def test_positive_no_jump_with_required_answered(self, jump_form):
        """Q1=false, Q2 answered, Q3 omitted (optional) -> 201."""
        form, slug = jump_form
        q1 = _qid(form, "Are you done?")
        q2 = _qid(form, "Your name")
        r = requests.post(
            f"{API}/public/forms/{slug}/responses",
            json={"answers": [
                {"question_id": q1, "value": False},
                {"question_id": q2, "value": "answered"},
            ]},
        )
        assert r.status_code == 201, r.text


class TestNoLogicJumpsBehavior:
    """Regression: forms with NO logic_jumps still enforce required on all questions."""

    def test_required_still_enforced_without_jumps(self):
        questions = [
            {"type": "short_text", "title": "Q1", "required": True},
            {"type": "short_text", "title": "Q2", "required": True},
        ]
        form_id, form = _create_form_with_questions("TEST_no_jumps_form", questions)
        try:
            pr = requests.post(f"{API}/forms/{form_id}/publish")
            assert pr.status_code == 200, pr.text
            slug = pr.json()["public_slug"]
            q1 = _qid(form, "Q1")
            r2 = requests.post(
                f"{API}/public/forms/{slug}/responses",
                json={"answers": [{"question_id": q1, "value": "hello"}]},
            )
            assert r2.status_code == 400, r2.text
            detail = r2.json().get("detail", "")
            assert "Q2" in detail or "required" in detail.lower()
        finally:
            requests.delete(f"{API}/forms/{form_id}")
