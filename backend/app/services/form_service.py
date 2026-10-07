"""Service helpers for form & response operations."""
import re
import random
import string
from typing import List, Dict, Any

from sqlalchemy.orm import Session

from app import models, schemas


ALLOWED_TYPES = {
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
}

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


def slugify(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text or "form").strip("-").lower()
    return text[:40] or "form"


def random_suffix(n: int = 6) -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))


def generate_unique_slug(db: Session, title: str) -> str:
    base = slugify(title)
    for _ in range(10):
        candidate = f"{base}-{random_suffix()}"
        exists = db.query(models.Form).filter_by(public_slug=candidate).first()
        if not exists:
            return candidate
    # fallback
    return f"{base}-{random_suffix(10)}"


def replace_questions(db: Session, form: models.Form, questions: List[schemas.QuestionIn]) -> None:
    """Upsert questions on a form.

    Preserves existing question/option IDs (and therefore historical answers) when
    the client sends back the same ID. Any questions/options missing from the
    payload are deleted (which cascades to their answers).
    """
    existing_q = {q.id: q for q in form.questions}
    seen_q_ids: set = set()

    for idx, qin in enumerate(questions):
        if qin.type not in ALLOWED_TYPES:
            raise ValueError(f"Invalid question type: {qin.type}")

        q = existing_q.get(qin.id) if qin.id else None
        if q is None:
            q = models.Question(form_id=form.id)
            db.add(q)
        # Update fields
        q.type = qin.type
        q.title = qin.title or ""
        q.description = qin.description
        q.required = bool(qin.required)
        q.order_index = idx
        q.rating_scale = qin.rating_scale or 5
        q.logic_jumps = [j.model_dump() for j in qin.logic_jumps] if qin.logic_jumps else None
        db.flush()
        seen_q_ids.add(q.id)

        # Upsert options
        existing_opts = {o.id: o for o in q.options}
        seen_opt_ids: set = set()
        if qin.type in ("multiple_choice", "dropdown"):
            for oi, opt in enumerate(qin.options or []):
                existing_opt = existing_opts.get(opt.id) if opt.id else None
                if existing_opt is None:
                    new_opt = models.QuestionOption(
                        question_id=q.id,
                        label=opt.label,
                        order_index=oi,
                    )
                    db.add(new_opt)
                    db.flush()
                    seen_opt_ids.add(new_opt.id)
                else:
                    existing_opt.label = opt.label
                    existing_opt.order_index = oi
                    seen_opt_ids.add(existing_opt.id)
            # Delete removed options
            for oid, opt in existing_opts.items():
                if oid not in seen_opt_ids:
                    db.delete(opt)
        else:
            # Non-choice types: wipe any lingering options
            for opt in list(q.options):
                db.delete(opt)

    # Delete removed questions (cascades to answers)
    for qid, q in existing_q.items():
        if qid not in seen_q_ids:
            db.delete(q)
    db.flush()


def _coerce_for_compare(val, expected):
    """Coerce actual to match expected's type for loose equality."""
    if isinstance(expected, bool):
        if isinstance(val, bool):
            return val
        if isinstance(val, str):
            return val.lower() in ("yes", "true", "1")
    if isinstance(expected, (int, float)):
        try:
            return float(val)
        except (TypeError, ValueError):
            return None
    return str(val) if val is not None else None


def _rule_matches(rule: dict, value) -> bool:
    op = rule.get("operator")
    exp = rule.get("value")
    actual = _coerce_for_compare(value, exp)
    if actual is None:
        return False
    try:
        if op == "equals":
            return actual == exp
        if op == "not_equals":
            return actual != exp
        if op == "greater_than":
            return float(actual) > float(exp)
        if op == "less_than":
            return float(actual) < float(exp)
    except (TypeError, ValueError):
        return False
    return False


def _traversed_question_ids(form, provided_map):
    """Walk through the form respecting logic_jumps, return set of visited question ids."""
    questions = form.questions
    if not questions:
        return set()
    visited = []
    idx = 0
    guard = 0
    while 0 <= idx < len(questions) and guard < 1000:
        guard += 1
        q = questions[idx]
        visited.append(q.id)
        v = provided_map.get(q.id)
        v = v.value if v is not None else None
        # Evaluate rules in order
        jumped = False
        for rule in (q.logic_jumps or []):
            if _rule_matches(rule, v):
                target = rule.get("target")
                if target == "end":
                    return set(visited)
                nxt = next((i for i, qq in enumerate(questions) if qq.id == target), None)
                if nxt is not None and nxt > idx:
                    idx = nxt
                    jumped = True
                    break
        if not jumped:
            idx += 1
    return set(visited)


def validate_and_build_answers(
    db: Session, form: models.Form, payload: List[schemas.AnswerIn]
) -> List[Dict[str, Any]]:
    """Validate submitted answers against form questions. Returns list of model dicts."""
    questions_by_id = {q.id: q for q in form.questions}
    provided = {a.question_id: a for a in payload}

    # Determine which questions were actually traversed given logic_jumps + answers.
    traversed = _traversed_question_ids(form, provided)

    # Required-field check only for traversed questions
    for q in form.questions:
        if q.required and q.id in traversed:
            a = provided.get(q.id)
            if a is None or a.value is None or (isinstance(a.value, str) and a.value.strip() == ""):
                raise ValueError(f"Question '{q.title or q.id}' is required")

    built: List[Dict[str, Any]] = []
    for a in payload:
        q = questions_by_id.get(a.question_id)
        if q is None:
            raise ValueError(f"Unknown question_id: {a.question_id}")
        if a.value is None or (isinstance(a.value, str) and a.value.strip() == ""):
            continue  # skip empty optional answers

        row: Dict[str, Any] = {"question_id": q.id}

        if q.type in ("short_text", "long_text"):
            row["value_text"] = str(a.value).strip()
        elif q.type == "email":
            v = str(a.value).strip()
            if not EMAIL_RE.match(v):
                raise ValueError(f"Invalid email for question '{q.title}'")
            row["value_text"] = v
        elif q.type == "number":
            try:
                row["value_number"] = int(float(a.value))
            except (ValueError, TypeError):
                raise ValueError(f"Invalid number for question '{q.title}'")
        elif q.type == "yes_no":
            if isinstance(a.value, bool):
                row["value_bool"] = a.value
            elif isinstance(a.value, str):
                row["value_bool"] = a.value.lower() in ("yes", "true", "1")
            else:
                row["value_bool"] = bool(a.value)
        elif q.type == "rating":
            try:
                n = int(a.value)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid rating for '{q.title}'")
            scale = q.rating_scale or 5
            if n < 1 or n > scale:
                raise ValueError(f"Rating out of range for '{q.title}'")
            row["value_number"] = n
        elif q.type in ("multiple_choice", "dropdown"):
            option_id = str(a.value)
            valid_ids = {o.id for o in q.options}
            if option_id not in valid_ids:
                raise ValueError(f"Invalid option for '{q.title}'")
            row["value_option_id"] = option_id

        built.append(row)
    return built


def compute_form_stats(form: models.Form) -> schemas.FormStats:
    total = len(form.responses)
    q_stats: List[schemas.QuestionStats] = []

    for q in form.questions:
        answers = [a for a in q.answers]
        qs = schemas.QuestionStats(
            question_id=q.id,
            question_title=q.title,
            question_type=q.type,
            response_count=len(answers),
        )

        if q.type in ("multiple_choice", "dropdown"):
            opt_label = {o.id: o.label for o in q.options}
            counts: Dict[str, int] = {o.label: 0 for o in q.options}
            for a in answers:
                if a.value_option_id and a.value_option_id in opt_label:
                    counts[opt_label[a.value_option_id]] += 1
            qs.option_counts = counts
        elif q.type == "yes_no":
            yes = sum(1 for a in answers if a.value_bool is True)
            no = sum(1 for a in answers if a.value_bool is False)
            qs.yes_count = yes
            qs.no_count = no
        elif q.type == "rating":
            nums = [a.value_number for a in answers if a.value_number is not None]
            qs.average = round(sum(nums) / len(nums), 2) if nums else None
            dist: Dict[str, int] = {str(i): 0 for i in range(1, (q.rating_scale or 5) + 1)}
            for n in nums:
                dist[str(n)] = dist.get(str(n), 0) + 1
            qs.distribution = dist
        elif q.type == "number":
            nums = [a.value_number for a in answers if a.value_number is not None]
            qs.average = round(sum(nums) / len(nums), 2) if nums else None
        else:  # text / email
            qs.text_answers = [a.value_text for a in answers if a.value_text]

        q_stats.append(qs)

    return schemas.FormStats(form_id=form.id, total_responses=total, questions=q_stats)
