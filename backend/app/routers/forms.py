"""Creator-facing form management routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import csv
import io

from app.database import get_db
from app import models, schemas
from app.services.form_service import (
    replace_questions,
    generate_unique_slug,
    compute_form_stats,
    ALLOWED_TYPES,
)

router = APIRouter(prefix="/forms", tags=["forms"])


def get_default_creator(db: Session) -> models.Creator:
    c = db.query(models.Creator).first()
    if not c:
        c = models.Creator(name="Default User", email="user@example.com")
        db.add(c)
        db.commit()
        db.refresh(c)
    return c


def _summarize(form: models.Form) -> schemas.FormSummary:
    return schemas.FormSummary(
        id=form.id,
        title=form.title,
        description=form.description,
        is_published=form.is_published,
        public_slug=form.public_slug,
        theme=form.theme,
        created_at=form.created_at,
        updated_at=form.updated_at,
        response_count=len(form.responses),
        question_count=len(form.questions),
    )


@router.get("", response_model=List[schemas.FormSummary])
def list_forms(db: Session = Depends(get_db)):
    creator = get_default_creator(db)
    forms = (
        db.query(models.Form)
        .filter_by(creator_id=creator.id)
        .order_by(models.Form.updated_at.desc())
        .all()
    )
    return [_summarize(f) for f in forms]


@router.post("", response_model=schemas.FormOut, status_code=status.HTTP_201_CREATED)
def create_form(payload: schemas.FormCreate, db: Session = Depends(get_db)):
    creator = get_default_creator(db)
    form = models.Form(
        creator_id=creator.id,
        title=payload.title or "Untitled form",
        description=payload.description,
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return form


@router.get("/{form_id}", response_model=schemas.FormOut)
def get_form(form_id: str, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter_by(id=form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


@router.put("/{form_id}", response_model=schemas.FormOut)
def update_form(form_id: str, payload: schemas.FormUpdate, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter_by(id=form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    if payload.title is not None:
        form.title = payload.title
    if payload.description is not None:
        form.description = payload.description
    if payload.thank_you_message is not None:
        form.thank_you_message = payload.thank_you_message
    if payload.theme is not None:
        form.theme = payload.theme.model_dump(exclude_none=True)

    if payload.questions is not None:
        # validate types first
        for q in payload.questions:
            if q.type not in ALLOWED_TYPES:
                raise HTTPException(status_code=400, detail=f"Invalid question type: {q.type}")
        try:
            replace_questions(db, form, payload.questions)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    db.commit()
    db.refresh(form)
    return form


@router.delete("/{form_id}", status_code=204)
def delete_form(form_id: str, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter_by(id=form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    db.delete(form)
    db.commit()
    return None


@router.post("/{form_id}/duplicate", response_model=schemas.FormOut)
def duplicate_form(form_id: str, db: Session = Depends(get_db)):
    original = db.query(models.Form).filter_by(id=form_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Form not found")

    copy = models.Form(
        creator_id=original.creator_id,
        title=f"{original.title} (copy)",
        description=original.description,
        thank_you_message=original.thank_you_message,
        is_published=False,
        public_slug=None,
    )
    db.add(copy)
    db.flush()

    for q in original.questions:
        new_q = models.Question(
            form_id=copy.id,
            type=q.type,
            title=q.title,
            description=q.description,
            required=q.required,
            order_index=q.order_index,
            rating_scale=q.rating_scale,
        )
        db.add(new_q)
        db.flush()
        for o in q.options:
            db.add(models.QuestionOption(
                question_id=new_q.id,
                label=o.label,
                order_index=o.order_index,
            ))
    db.commit()
    db.refresh(copy)
    return copy


@router.post("/{form_id}/publish", response_model=schemas.FormOut)
def publish_form(form_id: str, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter_by(id=form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    if not form.questions:
        raise HTTPException(status_code=400, detail="Add at least one question before publishing")
    form.is_published = True
    if not form.public_slug:
        form.public_slug = generate_unique_slug(db, form.title)
    db.commit()
    db.refresh(form)
    return form


@router.post("/{form_id}/unpublish", response_model=schemas.FormOut)
def unpublish_form(form_id: str, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter_by(id=form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    form.is_published = False
    db.commit()
    db.refresh(form)
    return form


# -------- Responses --------
@router.get("/{form_id}/responses", response_model=List[schemas.ResponseSummary])
def list_responses(form_id: str, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter_by(id=form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    results = []
    for r in sorted(form.responses, key=lambda x: x.submitted_at, reverse=True):
        results.append(schemas.ResponseSummary(
            id=r.id,
            submitted_at=r.submitted_at,
            answer_count=len(r.answers),
        ))
    return results


@router.get("/{form_id}/responses/{response_id}", response_model=schemas.ResponseOut)
def get_response(form_id: str, response_id: str, db: Session = Depends(get_db)):
    r = db.query(models.Response).filter_by(id=response_id, form_id=form_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Response not found")
    return r


@router.get("/{form_id}/stats", response_model=schemas.FormStats)
def get_stats(form_id: str, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter_by(id=form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return compute_form_stats(form)


@router.get("/{form_id}/responses.csv")
def export_responses_csv(form_id: str, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter_by(id=form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    # Build option_id → label map
    option_label = {o.id: o.label for q in form.questions for o in q.options}
    question_cols = [(q.id, q.title or "Untitled", q.type) for q in form.questions]

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Response ID", "Submitted At"] + [t for _, t, _ in question_cols])

    for r in sorted(form.responses, key=lambda x: x.submitted_at, reverse=True):
        ans_by_q = {a.question_id: a for a in r.answers}
        row = [r.id, r.submitted_at.isoformat()]
        for qid, _title, qtype in question_cols:
            a = ans_by_q.get(qid)
            if not a:
                row.append("")
                continue
            if qtype in ("multiple_choice", "dropdown"):
                row.append(option_label.get(a.value_option_id, "") if a.value_option_id else "")
            elif qtype == "yes_no":
                row.append("Yes" if a.value_bool else "No" if a.value_bool is False else "")
            elif qtype in ("rating", "number"):
                row.append("" if a.value_number is None else str(a.value_number))
            else:
                row.append(a.value_text or "")
        writer.writerow(row)

    buf.seek(0)
    safe_name = (form.title or "form").replace(" ", "_").replace("/", "_")[:60]
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_responses.csv"'},
    )
