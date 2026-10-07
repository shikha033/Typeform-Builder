"""Backend API tests for Typeform clone.

Covers:
- Health & seed data
- Form CRUD (create, update, duplicate, publish/unpublish, delete)
- Question types & reorder (replace_questions via PUT)
- Public form fetch & submit (success + validation errors)
- Stats computation
"""
import os
import time
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE}/api"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def seeded_forms(session):
    r = session.get(f"{API}/forms")
    assert r.status_code == 200
    return r.json()


# ---------------- Health & seed ----------------
class TestHealth:
    def test_health(self, session):
        r = session.get(f"{API}/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_seed_forms_present(self, seeded_forms):
        titles = [f["title"] for f in seeded_forms]
        assert "Customer Feedback" in titles
        assert "Product Survey" in titles
        for f in seeded_forms:
            if f["title"] in ("Customer Feedback", "Product Survey"):
                assert f["is_published"] is True
                assert f["public_slug"]
                assert f["question_count"] >= 1


# ---------------- Form CRUD ----------------
class TestFormCRUD:
    def test_create_update_get_delete(self, session):
        # CREATE
        r = session.post(f"{API}/forms", json={"title": "TEST_Form_A", "description": "desc"})
        assert r.status_code == 201
        form = r.json()
        fid = form["id"]
        assert form["title"] == "TEST_Form_A"
        assert form["is_published"] is False
        assert form["questions"] == []

        # UPDATE with questions (all 8 types)
        questions = [
            {"type": "short_text", "title": "Name", "required": True, "order_index": 0},
            {"type": "long_text", "title": "Bio", "order_index": 1},
            {"type": "multiple_choice", "title": "Color", "order_index": 2,
             "options": [{"label": "Red", "order_index": 0}, {"label": "Blue", "order_index": 1}]},
            {"type": "dropdown", "title": "Country", "order_index": 3,
             "options": [{"label": "US", "order_index": 0}, {"label": "UK", "order_index": 1}]},
            {"type": "email", "title": "Email", "order_index": 4},
            {"type": "number", "title": "Age", "order_index": 5},
            {"type": "yes_no", "title": "Agree?", "order_index": 6},
            {"type": "rating", "title": "Rate", "order_index": 7, "rating_scale": 7},
        ]
        r = session.put(f"{API}/forms/{fid}", json={"questions": questions})
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data["questions"]) == 8
        types = [q["type"] for q in data["questions"]]
        assert types == ["short_text", "long_text", "multiple_choice", "dropdown",
                         "email", "number", "yes_no", "rating"]
        assert data["questions"][7]["rating_scale"] == 7
        assert len(data["questions"][2]["options"]) == 2

        # GET verifies persistence
        r = session.get(f"{API}/forms/{fid}")
        assert r.status_code == 200
        assert len(r.json()["questions"]) == 8

        # REORDER: swap order of first two
        reordered = list(questions)
        reordered[0], reordered[1] = reordered[1], reordered[0]
        # re-set order_index
        for i, q in enumerate(reordered):
            q["order_index"] = i
        r = session.put(f"{API}/forms/{fid}", json={"questions": reordered})
        assert r.status_code == 200
        got = r.json()["questions"]
        assert got[0]["type"] == "long_text"
        assert got[1]["type"] == "short_text"

        # DELETE
        r = session.delete(f"{API}/forms/{fid}")
        assert r.status_code == 204
        r = session.get(f"{API}/forms/{fid}")
        assert r.status_code == 404

    def test_duplicate(self, session):
        r = session.post(f"{API}/forms", json={"title": "TEST_Dup"})
        fid = r.json()["id"]
        session.put(f"{API}/forms/{fid}", json={"questions": [
            {"type": "short_text", "title": "Q1", "order_index": 0}
        ]})
        r = session.post(f"{API}/forms/{fid}/duplicate")
        assert r.status_code == 200
        copy = r.json()
        assert copy["title"] == "TEST_Dup (copy)"
        assert copy["is_published"] is False
        assert copy["public_slug"] is None
        assert len(copy["questions"]) == 1
        # cleanup
        session.delete(f"{API}/forms/{fid}")
        session.delete(f"{API}/forms/{copy['id']}")

    def test_publish_requires_questions(self, session):
        r = session.post(f"{API}/forms", json={"title": "TEST_Empty"})
        fid = r.json()["id"]
        r = session.post(f"{API}/forms/{fid}/publish")
        assert r.status_code == 400
        session.delete(f"{API}/forms/{fid}")

    def test_publish_unpublish_flow(self, session):
        r = session.post(f"{API}/forms", json={"title": "TEST_Pub"})
        fid = r.json()["id"]
        session.put(f"{API}/forms/{fid}", json={"questions": [
            {"type": "short_text", "title": "Q1", "order_index": 0}
        ]})
        r = session.post(f"{API}/forms/{fid}/publish")
        assert r.status_code == 200
        data = r.json()
        assert data["is_published"] is True
        assert data["public_slug"]
        slug = data["public_slug"]

        # public GET works
        r = session.get(f"{API}/public/forms/{slug}")
        assert r.status_code == 200

        # unpublish
        r = session.post(f"{API}/forms/{fid}/unpublish")
        assert r.status_code == 200
        assert r.json()["is_published"] is False

        r = session.get(f"{API}/public/forms/{slug}")
        assert r.status_code == 404
        session.delete(f"{API}/forms/{fid}")

    def test_invalid_question_type(self, session):
        r = session.post(f"{API}/forms", json={"title": "TEST_Invalid"})
        fid = r.json()["id"]
        r = session.put(f"{API}/forms/{fid}", json={"questions": [
            {"type": "bogus_type", "title": "x", "order_index": 0}
        ]})
        assert r.status_code in (400, 422)
        session.delete(f"{API}/forms/{fid}")


# ---------------- Public submission ----------------
class TestPublicSubmission:
    @pytest.fixture(scope="class")
    def published_form(self, session):
        r = session.post(f"{API}/forms", json={"title": "TEST_Public"})
        fid = r.json()["id"]
        questions = [
            {"type": "short_text", "title": "Name", "required": True, "order_index": 0},
            {"type": "email", "title": "Email", "order_index": 1},
            {"type": "multiple_choice", "title": "Pick", "order_index": 2,
             "options": [{"label": "A", "order_index": 0}, {"label": "B", "order_index": 1}]},
            {"type": "rating", "title": "Rate", "order_index": 3, "rating_scale": 5},
            {"type": "yes_no", "title": "OK?", "order_index": 4},
        ]
        session.put(f"{API}/forms/{fid}", json={"questions": questions})
        r = session.post(f"{API}/forms/{fid}/publish")
        slug = r.json()["public_slug"]
        pub = session.get(f"{API}/public/forms/{slug}").json()
        yield {"id": fid, "slug": slug, "public": pub}
        session.delete(f"{API}/forms/{fid}")

    def test_submit_success(self, session, published_form):
        slug = published_form["slug"]
        qs = published_form["public"]["questions"]
        qmap = {q["type"]: q for q in qs}
        payload = {"answers": [
            {"question_id": qmap["short_text"]["id"], "value": "Alice"},
            {"question_id": qmap["email"]["id"], "value": "a@b.com"},
            {"question_id": qmap["multiple_choice"]["id"], "value": qmap["multiple_choice"]["options"][0]["id"]},
            {"question_id": qmap["rating"]["id"], "value": 4},
            {"question_id": qmap["yes_no"]["id"], "value": True},
        ]}
        r = session.post(f"{API}/public/forms/{slug}/responses", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert len(data["answers"]) == 5

    def test_required_missing(self, session, published_form):
        slug = published_form["slug"]
        r = session.post(f"{API}/public/forms/{slug}/responses", json={"answers": []})
        assert r.status_code == 400

    def test_invalid_email(self, session, published_form):
        slug = published_form["slug"]
        qs = published_form["public"]["questions"]
        qmap = {q["type"]: q for q in qs}
        payload = {"answers": [
            {"question_id": qmap["short_text"]["id"], "value": "Bob"},
            {"question_id": qmap["email"]["id"], "value": "not-an-email"},
        ]}
        r = session.post(f"{API}/public/forms/{slug}/responses", json=payload)
        assert r.status_code == 400

    def test_invalid_option(self, session, published_form):
        slug = published_form["slug"]
        qs = published_form["public"]["questions"]
        qmap = {q["type"]: q for q in qs}
        payload = {"answers": [
            {"question_id": qmap["short_text"]["id"], "value": "Bob"},
            {"question_id": qmap["multiple_choice"]["id"], "value": "nonexistent-option-id"},
        ]}
        r = session.post(f"{API}/public/forms/{slug}/responses", json=payload)
        assert r.status_code == 400

    def test_rating_out_of_range(self, session, published_form):
        slug = published_form["slug"]
        qs = published_form["public"]["questions"]
        qmap = {q["type"]: q for q in qs}
        payload = {"answers": [
            {"question_id": qmap["short_text"]["id"], "value": "Bob"},
            {"question_id": qmap["rating"]["id"], "value": 99},
        ]}
        r = session.post(f"{API}/public/forms/{slug}/responses", json=payload)
        assert r.status_code == 400

    def test_nonexistent_slug(self, session):
        r = session.get(f"{API}/public/forms/does-not-exist-xyz")
        assert r.status_code == 404
        r = session.post(f"{API}/public/forms/does-not-exist-xyz/responses", json={"answers": []})
        assert r.status_code == 404


# ---------------- Stats ----------------
class TestStats:
    def test_seed_stats_shape(self, session, seeded_forms):
        f = next(f for f in seeded_forms if f["title"] == "Customer Feedback")
        r = session.get(f"{API}/forms/{f['id']}/stats")
        assert r.status_code == 200
        data = r.json()
        assert data["form_id"] == f["id"]
        assert data["total_responses"] >= 0
        assert isinstance(data["questions"], list)
        assert len(data["questions"]) >= 1
        # Check each stat has expected keys
        for q in data["questions"]:
            assert "question_type" in q
            assert "response_count" in q

    def test_responses_list_and_get(self, session, seeded_forms):
        f = next(f for f in seeded_forms if f["title"] == "Customer Feedback")
        r = session.get(f"{API}/forms/{f['id']}/responses")
        assert r.status_code == 200
        responses = r.json()
        if responses:
            rid = responses[0]["id"]
            r = session.get(f"{API}/forms/{f['id']}/responses/{rid}")
            assert r.status_code == 200
            assert r.json()["id"] == rid


# ---------------- Not-found cases ----------------
class TestNotFound:
    def test_get_missing_form(self, session):
        r = session.get(f"{API}/forms/{uuid.uuid4()}")
        assert r.status_code == 404

    def test_delete_missing_form(self, session):
        r = session.delete(f"{API}/forms/{uuid.uuid4()}")
        assert r.status_code == 404
